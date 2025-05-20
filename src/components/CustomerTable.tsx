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
  Email as EmailIcon, // Added for consistency
  CalendarMonth as CalendarIcon,
  AccessTime as TimerIcon, // Changed from Timer
  Category as CategoryIcon,
  AttachMoney as MoneyIcon,
  Notes as NotesIcon, // Added for Notes
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  // FilterList as FilterListIcon, // Not used currently, can be added later
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon, // Kept for potential future actions menu
} from "@mui/icons-material";

// Updated Customer data interface to match booking form + amount and notes
export interface BookingCustomer {
  id: string;
  name: string;
  email?: string; // Optional as per previous form
  phone: string;
  serviceType: string; // Was 'service'
  appointmentDate: string; // Was 'date'
  appointmentTime: string; // Was 'time', now time slot or specific time
  status: "completed" | "scheduled" | "cancelled" | "in-progress"; // Add more as needed
  amount?: number; // Price/Amount, optional initially
  notes?: string; // Optional
  avatarUrl?: string; // Kept for display
  // Add other fields from your form if necessary, e.g., createdAt
}

// Status configurations for different statuses
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
  onUpdateCustomer?: (updatedCustomer: BookingCustomer) => Promise<void> | void; // Callback for saving changes
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

  // State for search, pagination, sorting, and editing
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortBy, setSortBy] =
    useState<keyof BookingCustomer>("appointmentDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editedRowData, setEditedRowData] =
    useState<Partial<BookingCustomer> | null>(null);

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  // Handle sort column click
  const handleSort = (column: keyof BookingCustomer) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  // Filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (customer.email &&
            customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          customer.serviceType
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          customer.phone.includes(searchTerm) ||
          customer.status.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const valA = a[sortBy];
        const valB = b[sortBy];

        // Handle undefined or null values, and numbers specifically for amount
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

  // --- Editing Logic ---
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
      // Ensure all required fields from original data are present if not edited
      const originalCustomer = customers.find((c) => c.id === editingRowId);
      if (originalCustomer) {
        const finalData = {
          ...originalCustomer,
          ...editedRowData,
        } as BookingCustomer;
        // Convert amount to number if it's a string from TextField
        if (
          finalData.amount !== undefined &&
          typeof finalData.amount === "string"
        ) {
          finalData.amount = parseFloat(finalData.amount) || 0;
        } else if (finalData.amount === undefined) {
          finalData.amount = 0; // Default to 0 if undefined
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
  // --- End Editing Logic ---

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
      currency: "USD", // Or your desired currency
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getVisibleColumns = (): (keyof BookingCustomer | "actions")[] => {
    if (isMobile) {
      return ["name", "serviceType", "status", "actions"];
    } else if (isTablet) {
      return [
        "name",
        "serviceType",
        "appointmentDate",
        "status",
        "amount",
        "actions",
      ];
    }
    return [
      "name",
      "phone",
      "email",
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
    "&:hover": { color: theme.palette.primary.main },
  };

  const renderCellContent = (
    customer: BookingCustomer,
    column: keyof BookingCustomer
  ) => {
    const isEditingCurrentRow = editingRowId === customer.id;
    const value =
      isEditingCurrentRow && editedRowData
        ? editedRowData[column]
        : customer[column];

    if (isEditingCurrentRow && editedRowData) {
      switch (column) {
        case "name":
        case "email":
        case "phone":
        case "serviceType":
        case "appointmentDate": // Consider using DatePicker here for better UX
        case "appointmentTime": // Consider TimePicker or pre-defined slots Select
        case "notes":
          return (
            <TextField
              size="small"
              name={column}
              value={String(editedRowData[column] ?? "")}
              onChange={handleEditInputChange}
              variant="outlined"
              fullWidth={column === "notes"} // Notes can be wider
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
              <Select
                name="status"
                value={editedRowData.status || "scheduled"}
                onChange={handleEditInputChange as any} // Cast needed due to SelectChangeEvent signature
              >
                {availableStatuses.map((stat) => (
                  <MenuItem
                    key={stat}
                    value={stat}
                    sx={{ textTransform: "capitalize" }}
                  >
                    {stat.replace("-", " ")}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        default:
          return String(value ?? "");
      }
    }

    // Display mode
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
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {customer.name}
              </Typography>
              {isMobile && customer.email && (
                <Typography
                  variant="caption"
                  sx={{ color: theme.palette.text.secondary }}
                >
                  {customer.email}
                </Typography>
              )}
            </Box>
          </Box>
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
            {formatCurrency(customer.amount)}
          </Typography>
        );
      case "notes":
        return (
          <Typography
            variant="body2"
            sx={{
              maxWidth: 150,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "inline-block",
            }}
            title={customer.notes}
          >
            {customer.notes || "N/A"}
          </Typography>
        );
      case "email":
        return customer.email || "N/A";
      default:
        return String(customer[column] ?? "N/A");
    }
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
          <PersonIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
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
                  <SearchIcon fontSize="small" />
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
                {" "}
                <RefreshIcon />{" "}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <TableContainer sx={{ position: "relative", minHeight: "300px" }}>
        <Table sx={{ minWidth: 350 }}>
          <TableHead>
            <TableRow>
              {/* Dynamically create headers based on visibleColumns */}
              {visibleColumns.map((colKey) => {
                if (colKey === "actions") {
                  return (
                    <TableCell
                      key="actions-header"
                      align="center"
                      sx={{ width: { xs: 80, sm: 120 } }}
                    >
                      Actions
                    </TableCell>
                  );
                }
                const columnMeta: {
                  [key in keyof BookingCustomer | "actions"]?: {
                    label: string;
                    icon: React.ReactNode | null;
                    align?: "left" | "right" | "center";
                  };
                } = {
                  name: { label: "Customer Name", icon: null, align: "left" },
                  phone: {
                    label: "Phone",
                    icon: (
                      <PhoneIcon
                        fontSize="small"
                        sx={{ mr: 0.5, fontSize: "1rem" }}
                      />
                    ),
                    align: "left",
                  },
                  email: {
                    label: "Email",
                    icon: (
                      <EmailIcon
                        fontSize="small"
                        sx={{ mr: 0.5, fontSize: "1rem" }}
                      />
                    ),
                    align: "left",
                  },
                  serviceType: {
                    label: "Service",
                    icon: (
                      <CategoryIcon
                        fontSize="small"
                        sx={{ mr: 0.5, fontSize: "1rem" }}
                      />
                    ),
                    align: "left",
                  },
                  appointmentDate: {
                    label: "Date",
                    icon: (
                      <CalendarIcon
                        fontSize="small"
                        sx={{ mr: 0.5, fontSize: "1rem" }}
                      />
                    ),
                    align: "left",
                  },
                  appointmentTime: {
                    label: "Time",
                    icon: (
                      <TimerIcon
                        fontSize="small"
                        sx={{ mr: 0.5, fontSize: "1rem" }}
                      />
                    ),
                    align: "left",
                  },
                  status: { label: "Status", icon: null, align: "left" },
                  amount: {
                    label: "Amount",
                    icon: (
                      <MoneyIcon
                        fontSize="small"
                        sx={{ mr: 0.5, fontSize: "1rem" }}
                      />
                    ),
                    align: "right",
                  },
                  notes: {
                    label: "Notes",
                    icon: (
                      <NotesIcon
                        fontSize="small"
                        sx={{ mr: 0.5, fontSize: "1rem" }}
                      />
                    ),
                    align: "left",
                  },
                };
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
                  {Array.from(new Array(visibleColumns.length)).map(
                    (_, cellIndex) => (
                      <TableCell key={`cell-skeleton-${cellIndex}`}>
                        <Skeleton animation="wave" height={40} />
                      </TableCell>
                    )
                  )}
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
                              cursor: "pointer",
                            },
                            transition: "background-color 0.2s ease-in-out",
                          }
                        : {
                            backgroundColor: alpha(
                              theme.palette.action.hover,
                              0.08
                            ), // Highlight editing row
                          }
                    }
                  >
                    {visibleColumns.map((colKey) => {
                      if (colKey === "actions") {
                        return (
                          <TableCell key="actions-cell" align="center">
                            {isEditingCurrentRow ? (
                              <Stack
                                direction="row"
                                spacing={1}
                                justifyContent="center"
                              >
                                <Tooltip title="Save">
                                  <IconButton
                                    onClick={handleSaveEdit}
                                    color="primary"
                                    size="small"
                                  >
                                    {" "}
                                    <SaveIcon />{" "}
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancel">
                                  <IconButton
                                    onClick={handleCancelEdit}
                                    color="default"
                                    size="small"
                                  >
                                    {" "}
                                    <CancelIcon />{" "}
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            ) : (
                              <Tooltip title="Edit">
                                <IconButton
                                  onClick={() => handleEditClick(customer)}
                                  color="secondary"
                                  size="small"
                                >
                                  {" "}
                                  <EditIcon />{" "}
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell
                          key={`${customer.id}-${colKey}`}
                          align={
                            (
                              columnMetaForAlign[
                                colKey as keyof typeof columnMetaForAlign
                              ] as any
                            )?.align || "left"
                          }
                        >
                          {renderCellContent(
                            customer,
                            colKey as keyof BookingCustomer
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  align="center"
                  sx={{ py: 8 }}
                >
                  <Typography variant="body1" color="text.secondary">
                    {searchTerm
                      ? "No appointments match your search"
                      : "No appointments found"}
                  </Typography>
                </TableCell>
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

// Helper for cell alignment (used in TableRow mapping)
const columnMetaForAlign = {
  name: { align: "left" },
  phone: { align: "left" },
  email: { align: "left" },
  serviceType: { align: "left" },
  appointmentDate: { align: "left" },
  appointmentTime: { align: "left" },
  status: { align: "left" },
  amount: { align: "right" as const },
  notes: { align: "left" },
};

// Updated Sample data for demonstration
export const sampleBookings: BookingCustomer[] = [
  {
    id: "1",
    name: "Alice Wonderland",
    email: "alice.w@example.com",
    phone: "(555) 111-2222",
    serviceType: "Tea Party Setup",
    appointmentDate: "2025-06-10",
    appointmentTime: "2:00 PM",
    status: "scheduled",
    amount: 150.0,
    notes: "Extra sugar cubes requested.",
    avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    id: "2",
    name: "Bob The Builder",
    phone: "(555) 333-4444",
    serviceType: "Heavy Duty Construction Consultation",
    appointmentDate: "2025-06-12",
    appointmentTime: "Morning (9 AM - 12 PM)",
    status: "completed",
    amount: 300.5,
    email: "bob.b@example.net",
    avatarUrl: "https://randomuser.me/api/portraits/men/56.jpg",
  },
  {
    id: "3",
    name: "Charlie Chaplin",
    email: "charlie.c@example.com",
    phone: "(555) 555-6666",
    serviceType: "Silent Film Screening",
    appointmentDate: "2025-06-15",
    appointmentTime: "7:30 PM",
    status: "in-progress",
    amount: 75.2,
    notes: "Needs vintage projector.",
  },
  {
    id: "4",
    name: "Diana Prince",
    phone: "(555) 777-8888",
    serviceType: "Amazonian Training Session",
    appointmentDate: "2025-06-05",
    appointmentTime: "Any Time / Flexible",
    status: "cancelled",
    amount: 200.0,
    notes: "Rescheduled due to world saving.",
    avatarUrl: "https://randomuser.me/api/portraits/women/60.jpg",
  },
  {
    id: "5",
    name: "Edward Scissorhands",
    email: "edward.s@example.org",
    phone: "(555) 000-9999",
    serviceType: "Topiary Design",
    appointmentDate: "2025-06-20",
    appointmentTime: "Afternoon (12 PM - 3 PM)",
    status: "scheduled",
    amount: 95.0,
  },
];

export default CustomerTable;
