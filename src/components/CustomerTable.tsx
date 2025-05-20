import React, { useState, useMemo } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
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
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  CalendarMonth as CalendarIcon,
  Timer as TimerIcon,
  Category as CategoryIcon,
  AttachMoney as MoneyIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";

// Define customer data interface
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  status: "completed" | "scheduled" | "cancelled" | "in-progress";
  amount: number;
  avatarUrl?: string;
}

// Status configurations for different statuses
const statusConfig = {
  completed: { color: "success", icon: "✓" },
  scheduled: { color: "info", icon: "⏱" },
  cancelled: { color: "error", icon: "✕" },
  "in-progress": { color: "warning", icon: "↻" },
};

interface CustomerTableProps {
  customers?: Customer[];
  loading?: boolean;
  onRefresh?: () => void;
}

const CustomerTable = ({
  customers = [],
  loading = false,
  onRefresh,
}: CustomerTableProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  // State for search, pagination and sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortBy, setSortBy] = useState<keyof Customer>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page on search
  };

  // Handle sort column click
  const handleSort = (column: keyof Customer) => {
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
          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone.includes(searchTerm)
      )
      .sort((a, b) => {
        const valueA = a[sortBy] ?? "";
        const valueB = b[sortBy] ?? "";

        if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
        if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [customers, searchTerm, sortBy, sortDirection]);

  // Get current page data
  const currentPageData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredCustomers, page, rowsPerPage]);

  // Handle pagination changes
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Render sort icon
  const renderSortIcon = (column: keyof Customer) => {
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

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Determine which columns to show based on screen size
  const getVisibleColumns = () => {
    if (isMobile) {
      return ["name", "service", "status"];
    } else if (isTablet) {
      return ["name", "service", "date", "status", "amount"];
    }
    return [
      "name",
      "phone",
      "email",
      "service",
      "date",
      "time",
      "status",
      "amount",
    ];
  };

  const visibleColumns = getVisibleColumns();

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
      {/* Header with search and refresh */}
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
          Customers
        </Typography>
        <Box
          sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" } }}
        >
          <TextField
            size="small"
            placeholder="Search customers..."
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
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Table Container */}
      <TableContainer
        sx={{
          position: "relative",
          minHeight: "300px",
        }}
      >
        <Table sx={{ minWidth: 350 }}>
          <TableHead>
            <TableRow>
              {visibleColumns.includes("name") && (
                <TableCell
                  onClick={() => handleSort("name")}
                  sx={{
                    cursor: "pointer",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    color:
                      sortBy === "name"
                        ? theme.palette.primary.main
                        : undefined,
                    "&:hover": { color: theme.palette.primary.main },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    Customer Name
                    {renderSortIcon("name")}
                  </Box>
                </TableCell>
              )}

              {visibleColumns.includes("phone") && (
                <TableCell
                  onClick={() => handleSort("phone")}
                  sx={{
                    cursor: "pointer",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    color:
                      sortBy === "phone"
                        ? theme.palette.primary.main
                        : undefined,
                    "&:hover": { color: theme.palette.primary.main },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <PhoneIcon
                      fontSize="small"
                      sx={{ mr: 0.5, fontSize: "1rem" }}
                    />
                    Phone
                    {renderSortIcon("phone")}
                  </Box>
                </TableCell>
              )}

              {visibleColumns.includes("email") && (
                <TableCell
                  onClick={() => handleSort("email")}
                  sx={{
                    cursor: "pointer",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    color:
                      sortBy === "email"
                        ? theme.palette.primary.main
                        : undefined,
                    "&:hover": { color: theme.palette.primary.main },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    Email
                    {renderSortIcon("email")}
                  </Box>
                </TableCell>
              )}

              {visibleColumns.includes("service") && (
                <TableCell
                  onClick={() => handleSort("service")}
                  sx={{
                    cursor: "pointer",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    color:
                      sortBy === "service"
                        ? theme.palette.primary.main
                        : undefined,
                    "&:hover": { color: theme.palette.primary.main },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CategoryIcon
                      fontSize="small"
                      sx={{ mr: 0.5, fontSize: "1rem" }}
                    />
                    Service
                    {renderSortIcon("service")}
                  </Box>
                </TableCell>
              )}

              {visibleColumns.includes("date") && (
                <TableCell
                  onClick={() => handleSort("date")}
                  sx={{
                    cursor: "pointer",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    color:
                      sortBy === "date"
                        ? theme.palette.primary.main
                        : undefined,
                    "&:hover": { color: theme.palette.primary.main },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CalendarIcon
                      fontSize="small"
                      sx={{ mr: 0.5, fontSize: "1rem" }}
                    />
                    Date
                    {renderSortIcon("date")}
                  </Box>
                </TableCell>
              )}

              {visibleColumns.includes("time") && (
                <TableCell
                  onClick={() => handleSort("time")}
                  sx={{
                    cursor: "pointer",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    color:
                      sortBy === "time"
                        ? theme.palette.primary.main
                        : undefined,
                    "&:hover": { color: theme.palette.primary.main },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <TimerIcon
                      fontSize="small"
                      sx={{ mr: 0.5, fontSize: "1rem" }}
                    />
                    Time
                    {renderSortIcon("time")}
                  </Box>
                </TableCell>
              )}

              {visibleColumns.includes("status") && (
                <TableCell
                  onClick={() => handleSort("status")}
                  sx={{
                    cursor: "pointer",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    color:
                      sortBy === "status"
                        ? theme.palette.primary.main
                        : undefined,
                    "&:hover": { color: theme.palette.primary.main },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    Status
                    {renderSortIcon("status")}
                  </Box>
                </TableCell>
              )}

              {visibleColumns.includes("amount") && (
                <TableCell
                  align="right"
                  onClick={() => handleSort("amount")}
                  sx={{
                    cursor: "pointer",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    color:
                      sortBy === "amount"
                        ? theme.palette.primary.main
                        : undefined,
                    "&:hover": { color: theme.palette.primary.main },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}
                  >
                    <MoneyIcon
                      fontSize="small"
                      sx={{ mr: 0.5, fontSize: "1rem" }}
                    />
                    Amount
                    {renderSortIcon("amount")}
                  </Box>
                </TableCell>
              )}

              {!isMobile && (
                <TableCell align="center" sx={{ width: 50 }}>
                  <Tooltip title="Options">
                    <IconButton size="small" disabled>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              // Loading skeletons
              Array.from(new Array(rowsPerPage)).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {Array.from(
                    new Array(visibleColumns.length + (isMobile ? 0 : 1))
                  ).map((_, cellIndex) => (
                    <TableCell key={`cell-skeleton-${cellIndex}`}>
                      <Skeleton animation="wave" height={30} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : currentPageData.length > 0 ? (
              // Actual data rows
              currentPageData.map((customer) => (
                <TableRow
                  key={customer.id}
                  hover
                  sx={{
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      cursor: "pointer",
                    },
                    transition: "background-color 0.2s ease-in-out",
                  }}
                >
                  {visibleColumns.includes("name") && (
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
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
                          {!customer.avatarUrl && customer.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {customer.name}
                          </Typography>
                          {isMobile && (
                            <Typography
                              variant="caption"
                              sx={{ color: theme.palette.text.secondary }}
                            >
                              {customer.email}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                  )}

                  {visibleColumns.includes("phone") && (
                    <TableCell>{customer.phone}</TableCell>
                  )}

                  {visibleColumns.includes("email") && (
                    <TableCell>{customer.email}</TableCell>
                  )}

                  {visibleColumns.includes("service") && (
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          display: "inline-block",
                          maxWidth: { xs: "120px", sm: "180px" },
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {customer.service}
                      </Typography>
                    </TableCell>
                  )}

                  {visibleColumns.includes("date") && (
                    <TableCell>{customer.date}</TableCell>
                  )}

                  {visibleColumns.includes("time") && (
                    <TableCell>{customer.time}</TableCell>
                  )}

                  {visibleColumns.includes("status") && (
                    <TableCell>
                      <Chip
                        size="small"
                        label={customer.status}
                        color={
                          statusConfig[customer.status].color as
                            | "success"
                            | "error"
                            | "warning"
                            | "info"
                        }
                        sx={{
                          height: 24,
                          "& .MuiChip-label": { px: 1, py: 0.5 },
                          fontWeight: 500,
                          textTransform: "capitalize",
                        }}
                      />
                    </TableCell>
                  )}

                  {visibleColumns.includes("amount") && (
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          fontFamily: "monospace",
                          color: theme.palette.text.primary,
                        }}
                      >
                        {formatCurrency(customer.amount)}
                      </Typography>
                    </TableCell>
                  )}

                  {!isMobile && (
                    <TableCell align="center">
                      <IconButton size="small">
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              // Empty state
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + (isMobile ? 0 : 1)}
                  align="center"
                  sx={{ py: 8 }}
                >
                  <Typography variant="body1" color="text.secondary">
                    {searchTerm
                      ? "No customers match your search"
                      : "No customers found"}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredCustomers.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        }}
      />
    </Card>
  );
};

// Sample data for demonstration
export const sampleCustomers: Customer[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "(555) 123-4567",
    service: "Hair Cut & Styling",
    date: "2025-05-15",
    time: "10:30 AM",
    status: "completed",
    amount: 45.0,
    avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    phone: "(555) 987-6543",
    service: "Full Body Massage",
    date: "2025-05-18",
    time: "2:00 PM",
    status: "scheduled",
    amount: 85.0,
  },
  {
    id: "3",
    name: "Michael Brown",
    email: "mbrown@example.com",
    phone: "(555) 456-7890",
    service: "Facial Treatment",
    date: "2025-05-12",
    time: "11:15 AM",
    status: "completed",
    amount: 65.0,
    avatarUrl: "https://randomuser.me/api/portraits/men/46.jpg",
  },
  {
    id: "4",
    name: "Emily Davis",
    email: "emily.d@example.com",
    phone: "(555) 789-1234",
    service: "Manicure & Pedicure",
    date: "2025-05-20",
    time: "3:45 PM",
    status: "in-progress",
    amount: 55.0,
    avatarUrl: "https://randomuser.me/api/portraits/women/26.jpg",
  },
  {
    id: "5",
    name: "David Wilson",
    email: "david.w@example.com",
    phone: "(555) 234-5678",
    service: "Beard Trim",
    date: "2025-05-11",
    time: "9:00 AM",
    status: "cancelled",
    amount: 25.0,
  },
  {
    id: "6",
    name: "Jennifer Taylor",
    email: "jennifer.t@example.com",
    phone: "(555) 345-6789",
    service: "Hair Coloring",
    date: "2025-05-19",
    time: "1:30 PM",
    status: "scheduled",
    amount: 120.0,
    avatarUrl: "https://randomuser.me/api/portraits/women/65.jpg",
  },
  {
    id: "7",
    name: "Robert Miller",
    email: "robert.m@example.com",
    phone: "(555) 876-5432",
    service: "Spa Package Deluxe",
    date: "2025-05-21",
    time: "10:00 AM",
    status: "scheduled",
    amount: 175.0,
    avatarUrl: "https://randomuser.me/api/portraits/men/62.jpg",
  },
  {
    id: "8",
    name: "Lisa Anderson",
    email: "lisa.a@example.com",
    phone: "(555) 654-3210",
    service: "Eyebrow Threading",
    date: "2025-05-14",
    time: "4:15 PM",
    status: "completed",
    amount: 35.0,
  },
];

export default CustomerTable;
