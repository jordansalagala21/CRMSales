import React, { useState, useMemo, type ChangeEvent } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Skeleton,
  Card,
  alpha,
  Stack,
  Select,
  MenuItem,
  FormControl,
  type SelectChangeEvent,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  // Email as EmailIcon, // No longer needed for direct column
  CalendarMonth as CalendarIcon,
  AccessTime as TimerIcon,
  Category as CategoryIcon,
  AttachMoney as MoneyIcon,
  Notes as NotesIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  DirectionsCar as CarIcon, // Icon for Car Make & Model
} from "@mui/icons-material";

// Updated BookingCustomer Interface
export interface BookingCustomer {
  id: string;
  name: string;
  carMakeAndModel?: string; // Changed from email
  phone: string;
  serviceType: string; // Assuming this is a string (e.g., comma-separated if multiple)
  appointmentDate: string;
  appointmentTime: string;
  status: "completed" | "scheduled" | "cancelled" | "in-progress";
  amount?: number;
  notes?: string;
  avatarUrl?: string;
}

const statusConfig: Record<
  BookingCustomer["status"],
  { color: "success" | "info" | "error" | "warning" | "default"; icon?: string }
> = {
  completed: { color: "success", icon: "✓" },
  scheduled: { color: "info", icon: "⏱" },
  cancelled: { color: "error", icon: "✕" },
  "in-progress": { color: "warning", icon: "↻" },
};
const availableStatuses = Object.keys(
  statusConfig
) as BookingCustomer["status"][];

interface CustomerTableProps {
  customers?: BookingCustomer[];
  loading?: boolean;
  onRefresh?: () => void;
  onUpdateCustomer?: (updatedCustomer: BookingCustomer) => Promise<void> | void;
}

const CustomerTable = ({
  customers = [],
  loading = false,
  onRefresh,
  onUpdateCustomer,
}: CustomerTableProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortBy, setSortBy] =
    useState<keyof BookingCustomer>("appointmentDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editedRowData, setEditedRowData] =
    useState<Partial<BookingCustomer> | null>(null);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleSort = (column: keyof BookingCustomer) => {
    if (column === ("actions" as any)) return;

    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers
      .filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          // Updated to search by carMakeAndModel
          (customer.carMakeAndModel &&
            customer.carMakeAndModel
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          customer.serviceType
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          customer.phone.includes(searchTerm) ||
          customer.status.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const valA = a[sortBy];
        const valB = b[sortBy];
        if (sortBy === "amount") {
          const numA = typeof valA === "number" ? valA : -Infinity;
          const numB = typeof valB === "number" ? valB : -Infinity;
          return sortDirection === "asc" ? numA - numB : numB - numA;
        }
        const valueA = String(valA ?? "").toLowerCase();
        const valueB = String(valB ?? "").toLowerCase();
        if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
        if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [customers, searchTerm, sortBy, sortDirection]);

  const currentPageData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredCustomers, page, rowsPerPage]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEditClick = (customer: BookingCustomer) => {
    setEditingRowId(customer.id);
    setEditedRowData({ ...customer });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditedRowData(null);
  };

  const handleSaveEdit = async () => {
    if (editedRowData && editingRowId && onUpdateCustomer) {
      const originalCustomer = customers.find((c) => c.id === editingRowId);
      if (originalCustomer) {
        const finalData = {
          ...originalCustomer,
          ...editedRowData,
        } as BookingCustomer; // Ensure all required fields are present
        if (
          finalData.amount !== undefined &&
          typeof finalData.amount === "string"
        ) {
          finalData.amount = parseFloat(finalData.amount) || 0; // Default to 0 if parsing fails
        } else if (
          finalData.amount === undefined ||
          finalData.amount === null ||
          finalData.amount === ("" as any)
        ) {
          finalData.amount = undefined; // Or 0, depending on how you want to handle empty amount
        }
        await onUpdateCustomer(finalData);
      }
    }
    setEditingRowId(null);
    setEditedRowData(null);
  };

  const handleEditInputChange = (
    e:
      | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | SelectChangeEvent<BookingCustomer["status"]>
  ) => {
    const { name, value } = e.target;
    setEditedRowData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const renderSortIcon = (column: keyof BookingCustomer) => {
    if (sortBy !== column) return null;
    return sortDirection === "asc" ? (
      <ArrowUpwardIcon fontSize="small" sx={{ ml: 0.5, fontSize: "0.9rem" }} />
    ) : (
      <ArrowDownwardIcon
        fontSize="small"
        sx={{ ml: 0.5, fontSize: "0.9rem" }}
      />
    );
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Updated getVisibleColumns
  const getVisibleColumns = (): (keyof BookingCustomer | "actions")[] => {
    if (isMobile) {
      return ["name", "serviceType", "status", "actions"];
    } else if (isTablet) {
      return [
        "name",
        "carMakeAndModel", // Added for tablet view
        "serviceType",
        "appointmentDate",
        "status",
        "actions",
      ];
    }
    return [
      "name",
      "phone",
      "carMakeAndModel", // Replaced email
      "serviceType",
      "appointmentDate",
      "appointmentTime",
      "status",
      "amount",
      "notes",
      "actions",
    ];
  };

  const visibleColumns = getVisibleColumns();

  const tableCellSx = {
    fontWeight: 600,
    whiteSpace: "nowrap",
    userSelect: "none",
    px: { xs: 1, sm: 2 },
    "&:hover": { color: theme.palette.primary.main },
  };

  // Updated columnMeta
  const columnMeta: {
    [key in keyof BookingCustomer | "actions"]?: {
      label: string;
      icon: React.ReactNode | null;
      align?: "left" | "right" | "center";
      minWidth?: string | number;
    };
  } = {
    name: {
      label: "Customer Name",
      icon: null,
      align: "left",
      minWidth: isMobile ? 120 : 180,
    },
    phone: {
      label: "Phone",
      icon: <PhoneIcon fontSize="small" sx={{ mr: 0.5, fontSize: "1rem" }} />,
      align: "left",
      minWidth: 130,
    },
    carMakeAndModel: {
      label: "Car Make & Model",
      icon: <CarIcon fontSize="small" sx={{ mr: 0.5, fontSize: "1rem" }} />,
      align: "left",
      minWidth: 180,
    },
    serviceType: {
      label: "Service(s)",
      icon: (
        <CategoryIcon fontSize="small" sx={{ mr: 0.5, fontSize: "1rem" }} />
      ),
      align: "left",
      minWidth: 150,
    },
    appointmentDate: {
      label: "Date",
      icon: (
        <CalendarIcon fontSize="small" sx={{ mr: 0.5, fontSize: "1rem" }} />
      ),
      align: "left",
      minWidth: 120,
    },
    appointmentTime: {
      label: "Time",
      icon: <TimerIcon fontSize="small" sx={{ mr: 0.5, fontSize: "1rem" }} />,
      align: "left",
      minWidth: 100,
    },
    status: { label: "Status", icon: null, align: "left", minWidth: 100 },
    amount: {
      label: "Amount",
      icon: <MoneyIcon fontSize="small" sx={{ mr: 0.5, fontSize: "1rem" }} />,
      align: "right",
      minWidth: 100,
    },
    notes: {
      label: "Notes",
      icon: <NotesIcon fontSize="small" sx={{ mr: 0.5, fontSize: "1rem" }} />,
      align: "left",
      minWidth: 150,
    },
  };

  // Updated renderCellContent
  const renderCellContent = (
    customer: BookingCustomer,
    column: keyof BookingCustomer
  ) => {
    const isEditingCurrentRow = editingRowId === customer.id;

    if (isEditingCurrentRow && editedRowData) {
      switch (column) {
        case "name":
        case "carMakeAndModel": // Added for editing
        case "phone":
        case "serviceType":
        case "appointmentDate":
        case "appointmentTime":
        case "notes":
          return (
            <TextField
              size="small"
              name={column}
              value={String(editedRowData[column] ?? "")}
              onChange={handleEditInputChange}
              variant="outlined"
              fullWidth={
                column === "notes" ||
                column === "serviceType" ||
                column === "carMakeAndModel"
              }
              multiline={column === "notes"}
              rows={column === "notes" ? 2 : 1}
              type={
                column === "appointmentDate"
                  ? "date"
                  : column === "appointmentTime"
                  ? "time"
                  : "text"
              }
              InputLabelProps={
                column === "appointmentDate" || column === "appointmentTime"
                  ? { shrink: true }
                  : {}
              }
              sx={{
                minWidth:
                  column === "notes"
                    ? 150
                    : column === "carMakeAndModel"
                    ? 160
                    : 120,
              }}
            />
          );
        case "amount":
          return (
            <TextField
              size="small"
              name="amount"
              type="number"
              value={editedRowData.amount ?? ""}
              onChange={handleEditInputChange}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
              sx={{ width: 120 }}
            />
          );
        case "status":
          return (
            <FormControl size="small" fullWidth variant="outlined">
              {" "}
              <Select
                name="status"
                value={editedRowData.status || "scheduled"}
                onChange={handleEditInputChange as any}
              >
                {" "}
                {availableStatuses.map((stat) => (
                  <MenuItem
                    key={stat}
                    value={stat}
                    sx={{ textTransform: "capitalize" }}
                  >
                    {" "}
                    {stat.replace("-", " ")}{" "}
                  </MenuItem>
                ))}{" "}
              </Select>{" "}
            </FormControl>
          );
        default:
          return String(
            editedRowData[column as keyof BookingCustomer] ??
              customer[column as keyof BookingCustomer] ??
              ""
          );
      }
    }

    const cellTextStyle = {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    };

    switch (column) {
      case "name":
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              src={customer.avatarUrl}
              alt={customer.name}
              sx={{
                width: 32,
                height: 32,
                backgroundColor: !customer.avatarUrl
                  ? alpha(theme.palette.primary.main, 0.2)
                  : undefined,
                color: theme.palette.primary.main,
              }}
            >
              {!customer.avatarUrl && customer.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  ...cellTextStyle,
                  fontWeight: 600,
                  maxWidth: isMobile ? 100 : isTablet ? 130 : 180,
                }}
                title={customer.name}
              >
                {customer.name}
              </Typography>
              {/* Updated to show Car Make & Model on mobile under name */}
              {isMobile && customer.carMakeAndModel && (
                <Typography
                  variant="caption"
                  sx={{
                    ...cellTextStyle,
                    color: theme.palette.text.secondary,
                    maxWidth: 100,
                  }}
                  title={customer.carMakeAndModel}
                >
                  {customer.carMakeAndModel}
                </Typography>
              )}
            </Box>
          </Box>
        );
      case "carMakeAndModel": // New case for displaying Car Make & Model
        return (
          <Typography
            variant="body2"
            sx={{ ...cellTextStyle, maxWidth: isTablet ? 120 : 180 }}
            title={customer.carMakeAndModel}
          >
            {customer.carMakeAndModel || "N/A"}
          </Typography>
        );
      case "serviceType":
        return (
          <Typography
            variant="body2"
            sx={{
              ...cellTextStyle,
              maxWidth: isMobile ? 90 : isTablet ? 110 : 150,
            }}
            title={customer.serviceType}
          >
            {" "}
            {customer.serviceType || "N/A"}{" "}
          </Typography>
        );
      case "status":
        return (
          <Chip
            size="small"
            label={customer.status.replace("-", " ")}
            color={statusConfig[customer.status]?.color || "default"}
            sx={{
              height: 24,
              "& .MuiChip-label": { px: 1 },
              fontWeight: 500,
              textTransform: "capitalize",
            }}
          />
        );
      case "amount":
        return (
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, fontFamily: "monospace" }}
          >
            {" "}
            {formatCurrency(customer.amount)}{" "}
          </Typography>
        );
      case "notes":
        return (
          <Typography
            variant="body2"
            sx={{ ...cellTextStyle, maxWidth: 120 }}
            title={customer.notes}
          >
            {" "}
            {customer.notes || "N/A"}{" "}
          </Typography>
        );
      case "phone":
        return (
          <Typography variant="body2" sx={{ ...cellTextStyle, maxWidth: 110 }}>
            {" "}
            {customer.phone || "N/A"}{" "}
          </Typography>
        );
      default:
        return (
          <Typography variant="body2" sx={{ ...cellTextStyle, maxWidth: 100 }}>
            {" "}
            {String(customer[column as keyof BookingCustomer] ?? "N/A")}{" "}
          </Typography>
        );
    }
  };

  // Updated columnMetaForAlign
  const columnMetaForAlign = {
    name: { align: "left" },
    phone: { align: "left" },
    carMakeAndModel: { align: "left" as const }, // Added
    serviceType: { align: "left" },
    appointmentDate: { align: "left" },
    appointmentTime: { align: "left" },
    status: { align: "left" },
    amount: { align: "right" as const },
    notes: { align: "left" },
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: theme.shape.borderRadius * 2,
        overflow: "hidden",
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: `0px 4px 20px ${alpha(theme.palette.common.black, 0.05)}`,
      }}
    >
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          gap: 2,
        }}
      >
        <Typography
          variant="h6"
          component="h2"
          sx={{
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            color: theme.palette.text.primary,
          }}
        >
          <PersonIcon sx={{ mr: 1, color: theme.palette.primary.main }} />{" "}
          Appointments
        </Typography>
        <Box
          sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" } }}
        >
          <TextField
            size="small"
            placeholder="Search appointments..."
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{
              minWidth: { xs: "100%", sm: 220 },
              ".MuiOutlinedInput-root": {
                borderRadius: theme.shape.borderRadius * 1.5,
                backgroundColor: alpha(theme.palette.background.paper, 0.8),
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {" "}
                  <SearchIcon fontSize="small" />{" "}
                </InputAdornment>
              ),
            }}
          />
          {onRefresh && (
            <Tooltip title="Refresh data">
              <IconButton
                onClick={onRefresh}
                color="primary"
                sx={{
                  ml: 1,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <TableContainer
        sx={{ position: "relative", minHeight: "300px", overflowX: "auto" }}
      >
        <Table sx={{ minWidth: { xs: "100%", md: 700 } }}>
          <TableHead>
            <TableRow>
              {visibleColumns.map((colKey) => {
                if (colKey === "actions") {
                  return (
                    <TableCell
                      key="actions-header"
                      align="center"
                      sx={{
                        ...tableCellSx,
                        width: { xs: 80, sm: 100 },
                        position: "sticky",
                        right: 0,
                        background: theme.palette.background.paper,
                        zIndex: 1,
                      }}
                    >
                      {" "}
                      Actions{" "}
                    </TableCell>
                  );
                }
                const meta = columnMeta[colKey as keyof typeof columnMeta];
                if (!meta) return null;
                return (
                  <TableCell
                    key={colKey}
                    align={meta.align || "left"}
                    onClick={() => handleSort(colKey as keyof BookingCustomer)}
                    sx={{
                      ...tableCellSx,
                      cursor: "pointer",
                      ...(sortBy === colKey && {
                        color: theme.palette.primary.main,
                      }),
                      ...(meta.minWidth !== undefined && {
                        minWidth: meta.minWidth,
                      }),
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          meta.align === "right" ? "flex-end" : "flex-start",
                      }}
                    >
                      {meta.icon} {meta.label}{" "}
                      {renderSortIcon(colKey as keyof BookingCustomer)}
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from(new Array(rowsPerPage)).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {" "}
                  {Array.from(new Array(visibleColumns.length)).map(
                    (_, cellIndex) => (
                      <TableCell
                        key={`cell-skeleton-${cellIndex}`}
                        sx={{ px: { xs: 1, sm: 2 } }}
                      >
                        {" "}
                        <Skeleton animation="wave" height={40} />{" "}
                      </TableCell>
                    )
                  )}{" "}
                </TableRow>
              ))
            ) : currentPageData.length > 0 ? (
              currentPageData.map((customer) => {
                const isEditingCurrentRow = editingRowId === customer.id;
                return (
                  <TableRow
                    key={customer.id}
                    hover={!isEditingCurrentRow}
                    sx={
                      !isEditingCurrentRow
                        ? {
                            "&:hover": {
                              backgroundColor: alpha(
                                theme.palette.primary.main,
                                0.04
                              ),
                            },
                            transition: "background-color 0.2s ease-in-out",
                          }
                        : {
                            backgroundColor: alpha(
                              theme.palette.action.hover,
                              0.08
                            ),
                          }
                    }
                  >
                    {visibleColumns.map((colKey) => {
                      if (colKey === "actions") {
                        return (
                          <TableCell
                            key="actions-cell"
                            align="center"
                            sx={{
                              px: { xs: 1, sm: 2 },
                              position: "sticky",
                              right: 0,
                              background: theme.palette.background.paper,
                              zIndex: 1,
                            }}
                          >
                            {" "}
                            {isEditingCurrentRow ? (
                              <Stack
                                direction="row"
                                spacing={isMobile ? 0.5 : 1}
                                justifyContent="center"
                              >
                                {" "}
                                <Tooltip title="Save">
                                  <IconButton
                                    onClick={handleSaveEdit}
                                    color="primary"
                                    size="small"
                                  >
                                    <SaveIcon />
                                  </IconButton>
                                </Tooltip>{" "}
                                <Tooltip title="Cancel">
                                  <IconButton
                                    onClick={handleCancelEdit}
                                    color="default"
                                    size="small"
                                  >
                                    <CancelIcon />
                                  </IconButton>
                                </Tooltip>{" "}
                              </Stack>
                            ) : (
                              <Tooltip title="Edit">
                                <IconButton
                                  onClick={() => handleEditClick(customer)}
                                  color="secondary"
                                  size="small"
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            )}{" "}
                          </TableCell>
                        );
                      }
                      const meta =
                        columnMetaForAlign[
                          colKey as keyof typeof columnMetaForAlign
                        ];
                      return (
                        <TableCell
                          key={`${customer.id}-${colKey}`}
                          align={
                            (meta?.align || "left") as
                              | "left"
                              | "right"
                              | "center"
                              | "inherit"
                              | "justify"
                          }
                          sx={{
                            px: { xs: 1, sm: 2 },
                            minWidth:
                              columnMeta[colKey as keyof typeof columnMeta]
                                ?.minWidth,
                          }}
                        >
                          {" "}
                          {renderCellContent(
                            customer,
                            colKey as keyof BookingCustomer
                          )}{" "}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                {" "}
                <TableCell
                  colSpan={visibleColumns.length}
                  align="center"
                  sx={{ py: 8 }}
                >
                  {" "}
                  <Typography variant="body1" color="text.secondary">
                    {" "}
                    {searchTerm
                      ? "No appointments match your search"
                      : "No appointments found"}{" "}
                  </Typography>{" "}
                </TableCell>{" "}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredCustomers.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{ borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}` }}
      />
    </Card>
  );
};

export default CustomerTable;
