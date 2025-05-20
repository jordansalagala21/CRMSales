import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  Avatar,
  Chip,
  Box,
} from "@mui/material";
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  WatchLater as WatchLaterIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  status: "completed" | "pending" | "cancelled";
  avatar?: string;
}

const CustomerTable = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

  // Sample data
  const customers: Customer[] = [
    {
      id: "1",
      name: "John Smith",
      email: "john.smith@example.com",
      phone: "+1 (555) 123-4567",
      service: "Haircut & Styling",
      date: "2023-06-15",
      time: "10:00 AM",
      status: "completed",
      avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      phone: "+1 (555) 987-6543",
      service: "Manicure & Pedicure",
      date: "2023-06-15",
      time: "11:30 AM",
      status: "pending",
      avatar: "https://randomuser.me/api/portraits/women/2.jpg",
    },
    {
      id: "3",
      name: "Michael Brown",
      email: "michael.b@example.com",
      phone: "+1 (555) 456-7890",
      service: "Beard Trim",
      date: "2023-06-16",
      time: "2:15 PM",
      status: "pending",
      avatar: "https://randomuser.me/api/portraits/men/3.jpg",
    },
    {
      id: "4",
      name: "Emily Davis",
      email: "emily.d@example.com",
      phone: "+1 (555) 789-0123",
      service: "Hair Coloring",
      date: "2023-06-16",
      time: "4:00 PM",
      status: "cancelled",
      avatar: "https://randomuser.me/api/portraits/women/4.jpg",
    },
    {
      id: "5",
      name: "Robert Wilson",
      email: "robert.w@example.com",
      phone: "+1 (555) 234-5678",
      service: "Massage Therapy",
      date: "2023-06-17",
      time: "9:00 AM",
      status: "completed",
      avatar: "https://randomuser.me/api/portraits/men/5.jpg",
    },
  ];

  const getStatusChip = (status: Customer["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Chip
            icon={<CheckCircleIcon fontSize="small" />}
            label="Completed"
            color="success"
            size="small"
            variant="outlined"
          />
        );
      case "pending":
        return (
          <Chip
            icon={<WatchLaterIcon fontSize="small" />}
            label="Pending"
            color="warning"
            size="small"
            variant="outlined"
          />
        );
      case "cancelled":
        return (
          <Chip
            icon={<CancelIcon fontSize="small" />}
            label="Cancelled"
            color="error"
            size="small"
            variant="outlined"
          />
        );
      default:
        return null;
    }
  };

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
      <Table aria-label="customer table">
        <TableHead sx={{ backgroundColor: theme.palette.grey[100] }}>
          <TableRow>
            {!isSmallScreen && (
              <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
            )}
            <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
            {!isSmallScreen && (
              <TableCell sx={{ fontWeight: 600 }}>Service</TableCell>
            )}
            <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {customers.map((customer) => (
            <TableRow
              key={customer.id}
              sx={{
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              {!isSmallScreen ? (
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar
                      alt={customer.name}
                      src={customer.avatar}
                      sx={{ width: 40, height: 40 }}
                    />
                    <Box>
                      <Typography fontWeight={500}>{customer.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {customer.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
              ) : (
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar
                      alt={customer.name}
                      src={customer.avatar}
                      sx={{ width: 32, height: 32 }}
                    />
                    <Typography fontWeight={500}>
                      {customer.name.split(" ")[0]}
                    </Typography>
                  </Box>
                </TableCell>
              )}

              <TableCell>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Tooltip title={customer.phone}>
                    <IconButton size="small" color="primary">
                      <PhoneIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!isSmallScreen && (
                    <Tooltip title={customer.email}>
                      <IconButton size="small" color="secondary">
                        <EmailIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </TableCell>

              {!isSmallScreen && (
                <TableCell>
                  <Typography>{customer.service}</Typography>
                </TableCell>
              )}

              <TableCell>
                <Typography>
                  {new Date(customer.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {customer.time}
                </Typography>
              </TableCell>

              <TableCell>{getStatusChip(customer.status)}</TableCell>

              <TableCell>
                <IconButton size="small">
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CustomerTable;
