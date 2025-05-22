import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  useTheme,
  alpha,
  CircularProgress,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Tooltip as MuiTooltip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Alert,
  Snackbar,
  Chip,
  ListItemButton,
  Stack,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  // Grid, // Grid is no longer used
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import PersonIcon from "@mui/icons-material/Person";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import EditIcon from "@mui/icons-material/Edit";
import PaymentsIcon from "@mui/icons-material/Payments";
import PercentIcon from "@mui/icons-material/Percent";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck"; // For completed tasks
import AssessmentIcon from "@mui/icons-material/Assessment"; // For average pay
import PeopleAltIcon from "@mui/icons-material/PeopleAlt"; // For active workers
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn"; // For uncompleted tasks count
import HistoryIcon from "@mui/icons-material/History"; // For Task History
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"; // For empty states

// Extend MUI Theme
declare module "@mui/material/styles" {
  interface Theme {
    custom?: {
      drawerWidth?: number;
    };
  }
  interface ThemeOptions {
    custom?: {
      drawerWidth?: number;
    };
  }
}

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

interface BaseBookingCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  serviceType: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  amount?: number;
  notes?: string;
  avatarUrl?: string;
}

export interface WorkerPaySplit {
  workerId: string;
  splitPercentage: number;
}

export interface BookingCustomer extends BaseBookingCustomer {
  assignedWorkerIds?: string[];
  assignedWorkersPay?: WorkerPaySplit[];
}

export interface Worker {
  id: string;
  name: string;
  contactNumber?: string;
  createdAt: Timestamp;
}

export interface WorkerSummary extends Worker {
  totalEarned: number;
  assignmentStatus: "Assigned" | "Free";
  assignedTaskCount: number;
  completedTaskCount: number;
  averagePayPerCompletedTask: number;
}

// Summary Stat Card Props
interface SummaryStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  color?: string;
}

const SummaryStatCard: React.FC<SummaryStatCardProps> = ({
  title,
  value,
  icon,
  color,
}) => {
  const theme = useTheme();
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2.5,
        display: "flex",
        alignItems: "center",
        borderRadius: theme.shape.borderRadius * 1.5,
        backgroundColor: theme.palette.background.paper,
        borderLeft: `5px solid ${color || theme.palette.primary.main}`,
        boxShadow: theme.shadows[2],
        transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: theme.shadows[5],
        },
        height: "100%", // Ensure cards in a row have same height
      }}
    >
      <Avatar
        sx={{
          bgcolor: alpha(color || theme.palette.primary.main, 0.15),
          color: color || theme.palette.primary.main,
          width: 50,
          height: 50,
          mr: 2,
        }}
      >
        {icon}
      </Avatar>
      <Box>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
        >
          {title}
        </Typography>
        <Typography variant="h5" fontWeight="bold" color="text.primary">
          {value}
        </Typography>
      </Box>
    </Paper>
  );
};

const Payroll: React.FC = () => {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookings, setBookings] = useState<BookingCustomer[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const [openAddWorkerDialog, setOpenAddWorkerDialog] =
    useState<boolean>(false);
  const [newWorkerName, setNewWorkerName] = useState<string>("");
  const [newWorkerContact, setNewWorkerContact] = useState<string>("");

  const [openAssignPayDialog, setOpenAssignPayDialog] =
    useState<boolean>(false);
  const [currentTaskForPay, setCurrentTaskForPay] =
    useState<BookingCustomer | null>(null);
  const [selectedWorkersForTask, setSelectedWorkersForTask] = useState<
    WorkerPaySplit[]
  >([]);
  const [paySplitError, setPaySplitError] = useState<string>("");

  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("success");

  const [tasksPage, setTasksPage] = useState(0);
  const [tasksRowsPerPage, setTasksRowsPerPage] = useState(5);
  const [workersPage, setWorkersPage] = useState(0);
  const [workersRowsPerPage, setWorkersRowsPerPage] = useState(5);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(5);

  const [workerSearchTerm, setWorkerSearchTerm] = useState<string>("");
  const [workerStatusFilter, setWorkerStatusFilter] = useState<string>("All");

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" | "warning"
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const fetchBookings = useCallback(async () => {
    try {
      const bookingsCollectionRef = collection(db, "appointments");
      const q = query(
        bookingsCollectionRef,
        orderBy("appointmentDate", "desc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedBookings = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        let appointmentDateStr = "";
        if (data.appointmentDate) {
          if (data.appointmentDate instanceof Timestamp) {
            appointmentDateStr = data.appointmentDate
              .toDate()
              .toISOString()
              .split("T")[0];
          } else if (typeof data.appointmentDate === "string") {
            try {
              const parsedDate = new Date(data.appointmentDate);
              appointmentDateStr = !isNaN(parsedDate.getTime())
                ? parsedDate.toISOString().split("T")[0]
                : "";
            } catch (e) {
              appointmentDateStr = "";
            }
          }
        }
        return {
          id: docSnap.id,
          name: data.name || "",
          serviceType: data.serviceType || "Unknown Service",
          appointmentDate: appointmentDateStr,
          appointmentTime: data.appointmentTime || "",
          status: data.status || "Unknown",
          amount: data.amount !== undefined ? Number(data.amount) : 0,
          assignedWorkerIds: data.assignedWorkerIds || [],
          assignedWorkersPay: data.assignedWorkersPay || [],
        } as BookingCustomer;
      });
      setBookings(fetchedBookings);
    } catch (error) {
      console.error("Error fetching bookings: ", error);
      showSnackbar("Failed to fetch bookings.", "error");
    }
  }, []);

  const fetchWorkers = useCallback(async () => {
    try {
      const workersCollectionRef = collection(db, "workers");
      const q = query(workersCollectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedWorkers = querySnapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Worker)
      );
      setWorkers(fetchedWorkers);
    } catch (error) {
      console.error("Error fetching workers: ", error);
      showSnackbar("Failed to fetch workers.", "error");
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBookings(), fetchWorkers()]);
      setLoading(false);
    };
    loadData();
  }, [fetchBookings, fetchWorkers]);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);
  const handleOpenAddWorkerDialog = () => setOpenAddWorkerDialog(true);
  const handleCloseAddWorkerDialog = () => {
    setOpenAddWorkerDialog(false);
    setNewWorkerName("");
    setNewWorkerContact("");
  };

  const handleAddWorker = async () => {
    if (!newWorkerName.trim()) {
      showSnackbar("Worker name cannot be empty.", "error");
      return;
    }
    try {
      await addDoc(collection(db, "workers"), {
        name: newWorkerName.trim(),
        contactNumber: newWorkerContact.trim() || null,
        createdAt: serverTimestamp(),
      });
      showSnackbar("Worker added successfully!", "success");
      handleCloseAddWorkerDialog();
      fetchWorkers();
    } catch (error) {
      console.error("Error adding worker: ", error);
      showSnackbar("Failed to add worker.", "error");
    }
  };

  const uncompletedTasks = useMemo(() => {
    return bookings.filter(
      (b) => b.status !== "completed" && b.status !== "cancelled"
    );
  }, [bookings]);

  const completedTasksHistory = useMemo(() => {
    return bookings
      .filter((b) => b.status === "completed")
      .sort(
        (a, b) =>
          new Date(b.appointmentDate).getTime() -
          new Date(a.appointmentDate).getTime()
      ); // Sort by most recent
  }, [bookings]);

  const workerSummaries = useMemo(() => {
    const completedBookings = bookings.filter((b) => b.status === "completed");
    const activeUncompletedTasks = uncompletedTasks;

    const workerDataMap = new Map<
      string,
      {
        totalEarned: number;
        completedTaskCount: number;
        assignedTaskCount: number;
      }
    >();

    workers.forEach((worker) => {
      workerDataMap.set(worker.id, {
        totalEarned: 0,
        completedTaskCount: 0,
        assignedTaskCount: 0,
      });
    });

    completedBookings.forEach((booking) => {
      if (booking.assignedWorkersPay && booking.amount) {
        const taskWorkerPortion = booking.amount * 0.4;
        booking.assignedWorkersPay.forEach((paySplit) => {
          const workerEntry = workerDataMap.get(paySplit.workerId);
          if (workerEntry) {
            const earningFromThisTask =
              taskWorkerPortion * (paySplit.splitPercentage / 100);
            workerEntry.totalEarned += earningFromThisTask;
            workerEntry.completedTaskCount += 1;
          }
        });
      }
    });

    const assignedWorkerIdsInActiveTasks = new Set<string>();
    activeUncompletedTasks.forEach((task) => {
      const uniqueWorkersInTask = new Set<string>();
      if (task.assignedWorkersPay) {
        task.assignedWorkersPay.forEach((paySplit) =>
          uniqueWorkersInTask.add(paySplit.workerId)
        );
      } else if (task.assignedWorkerIds) {
        task.assignedWorkerIds.forEach((workerId) =>
          uniqueWorkersInTask.add(workerId)
        );
      }
      uniqueWorkersInTask.forEach((workerId) => {
        assignedWorkerIdsInActiveTasks.add(workerId);
        const workerEntry = workerDataMap.get(workerId);
        if (workerEntry) {
          workerEntry.assignedTaskCount += 1;
        }
      });
    });

    return workers.map((worker) => {
      const data = workerDataMap.get(worker.id) || {
        totalEarned: 0,
        completedTaskCount: 0,
        assignedTaskCount: 0,
      };
      return {
        ...worker,
        totalEarned: data.totalEarned,
        completedTaskCount: data.completedTaskCount,
        averagePayPerCompletedTask:
          data.completedTaskCount > 0
            ? data.totalEarned / data.completedTaskCount
            : 0,
        assignmentStatus: assignedWorkerIdsInActiveTasks.has(worker.id)
          ? "Assigned"
          : "Free",
        assignedTaskCount: data.assignedTaskCount,
      } as WorkerSummary;
    });
  }, [bookings, workers, uncompletedTasks]);

  const filteredWorkerSummaries = useMemo(() => {
    return workerSummaries.filter((worker) => {
      const nameMatch = worker.name
        .toLowerCase()
        .includes(workerSearchTerm.toLowerCase());
      const statusMatch =
        workerStatusFilter === "All" ||
        worker.assignmentStatus === workerStatusFilter;
      return nameMatch && statusMatch;
    });
  }, [workerSummaries, workerSearchTerm, workerStatusFilter]);

  const overallPayrollStats = useMemo(() => {
    let totalDisbursed = 0;
    workerSummaries.forEach((ws) => (totalDisbursed += ws.totalEarned));

    const totalPotential = uncompletedTasks.reduce(
      (sum, task) => sum + (task.amount || 0) * 0.4,
      0
    );
    const activeWorkersCount = workerSummaries.filter(
      (ws) => ws.assignmentStatus === "Assigned"
    ).length;

    return {
      totalPayrollDisbursed: totalDisbursed.toFixed(2),
      totalPotentialPayroll: totalPotential.toFixed(2),
      activeWorkers: activeWorkersCount,
      totalUncompletedTasks: uncompletedTasks.length,
    };
  }, [workerSummaries, uncompletedTasks]);

  const handleOpenAssignPayDialog = (task: BookingCustomer) => {
    setCurrentTaskForPay(task);
    const initialSplits =
      task.assignedWorkersPay && task.assignedWorkersPay.length > 0
        ? task.assignedWorkersPay
        : task.assignedWorkerIds && task.assignedWorkerIds.length === 1
        ? [{ workerId: task.assignedWorkerIds[0], splitPercentage: 100 }]
        : [];
    setSelectedWorkersForTask(initialSplits);
    setPaySplitError("");
    setOpenAssignPayDialog(true);
  };

  const handleCloseAssignPayDialog = () => {
    setOpenAssignPayDialog(false);
    setCurrentTaskForPay(null);
    setSelectedWorkersForTask([]);
    setPaySplitError("");
  };

  const handleWorkerSelectionForTask = (workerId: string) => {
    setSelectedWorkersForTask((prev) => {
      const isSelected = prev.some((w) => w.workerId === workerId);
      if (isSelected) {
        return prev.filter((w) => w.workerId !== workerId);
      } else {
        return [...prev, { workerId, splitPercentage: 0 }];
      }
    });
  };

  const handlePaySplitChange = (workerId: string, value: string) => {
    const percentage = parseInt(value, 10);
    setSelectedWorkersForTask((prev) =>
      prev.map((w) =>
        w.workerId === workerId
          ? {
              ...w,
              splitPercentage:
                isNaN(percentage) || percentage < 0
                  ? 0
                  : Math.min(percentage, 100),
            }
          : w
      )
    );
  };

  const totalSplitPercentage = useMemo(() => {
    return selectedWorkersForTask.reduce(
      (sum, worker) => sum + (worker.splitPercentage || 0),
      0
    );
  }, [selectedWorkersForTask]);

  const handleSaveAssignmentAndPay = async () => {
    if (!currentTaskForPay) return;
    if (selectedWorkersForTask.length === 0) {
      try {
        const bookingDocRef = doc(db, "appointments", currentTaskForPay.id);
        await updateDoc(bookingDocRef, {
          assignedWorkerIds: [],
          assignedWorkersPay: [],
        });
        fetchBookings();
        showSnackbar("Workers unassigned successfully.", "success");
        handleCloseAssignPayDialog();
        return;
      } catch (error) {
        console.error("Error unassigning workers: ", error);
        showSnackbar("Failed to unassign workers.", "error");
        return;
      }
    }
    if (totalSplitPercentage !== 100) {
      setPaySplitError(
        `Total split percentage must be 100%. Current total: ${totalSplitPercentage}%.`
      );
      return;
    }
    setPaySplitError("");
    try {
      const bookingDocRef = doc(db, "appointments", currentTaskForPay.id);
      const workerIds = selectedWorkersForTask.map((w) => w.workerId);
      await updateDoc(bookingDocRef, {
        assignedWorkerIds: workerIds,
        assignedWorkersPay: selectedWorkersForTask,
      });
      fetchBookings();
      showSnackbar("Worker assignment and pay splits saved!", "success");
      handleCloseAssignPayDialog();
    } catch (error) {
      console.error("Error saving assignment and pay: ", error);
      showSnackbar("Failed to save assignment and pay.", "error");
    }
  };

  const handleTasksPageChange = (_event: unknown, newPage: number) =>
    setTasksPage(newPage);
  const handleTasksRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setTasksRowsPerPage(parseInt(event.target.value, 10));
    setTasksPage(0);
  };
  const handleWorkersPageChange = (_event: unknown, newPage: number) =>
    setWorkersPage(newPage);
  const handleWorkersRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setWorkersRowsPerPage(parseInt(event.target.value, 10));
    setWorkersPage(0);
  };
  const handleHistoryPageChange = (_event: unknown, newPage: number) =>
    setHistoryPage(newPage);
  const handleHistoryRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setHistoryRowsPerPage(parseInt(event.target.value, 10));
    setHistoryPage(0);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          bgcolor: theme.palette.background.default,
        }}
      >
        <CircularProgress
          size={60}
          sx={{ color: theme.palette.primary.main }}
        />
        <Typography variant="h6" sx={{ mt: 2.5, color: "text.secondary" }}>
          Loading Payroll Data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        width: "100vw",
        bgcolor:
          theme.palette.mode === "dark"
            ? theme.palette.grey[900]
            : theme.palette.grey[100],
        overflowX: "hidden",
      }}
    >
      <Sidebar
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          pb: { xs: 4, sm: 8 },
          overflowY: "auto",
          width: { sm: `calc(100% - ${theme.custom?.drawerWidth || 240}px)` },
        }}
      >
        <Navbar handleDrawerToggle={handleDrawerToggle} />
        <Container
          maxWidth={false}
          sx={{ mt: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3, md: 4 } }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            sx={{ mb: { xs: 3, sm: 4 } }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: theme.palette.text.primary,
                mb: { xs: 2, sm: 0 },
                mt: 7,
              }}
            >
              Worker Payroll & Status
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddCircleOutlineIcon />}
              onClick={handleOpenAddWorkerDialog}
              sx={{
                borderRadius: "12px",
                py: 1.25,
                px: 3,
                boxShadow: theme.shadows[3],
                "&:hover": { boxShadow: theme.shadows[5] },
                mt: 7,
              }}
            >
              Add New Worker
            </Button>
          </Stack>

          {/* Overall Payroll Summary Stats */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 4 }}>
            <Box
              sx={{
                flexGrow: 1,
                flexBasis: {
                  xs: "100%",
                  sm: "calc(50% - 12px)",
                  md: "calc(25% - 18px)",
                },
                minWidth: { xs: "100%", sm: 260 },
              }}
            >
              <SummaryStatCard
                title="Total Payroll Disbursed"
                value={`$${overallPayrollStats.totalPayrollDisbursed}`}
                icon={<PaymentsIcon />}
                color={theme.palette.success.main}
              />
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                flexBasis: {
                  xs: "100%",
                  sm: "calc(50% - 12px)",
                  md: "calc(25% - 18px)",
                },
                minWidth: { xs: "100%", sm: 260 },
              }}
            >
              <SummaryStatCard
                title="Potential Payroll (Uncompleted)"
                value={`$${overallPayrollStats.totalPotentialPayroll}`}
                icon={<AttachMoneyIcon />}
                color={theme.palette.warning.main}
              />
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                flexBasis: {
                  xs: "100%",
                  sm: "calc(50% - 12px)",
                  md: "calc(25% - 18px)",
                },
                minWidth: { xs: "100%", sm: 260 },
              }}
            >
              <SummaryStatCard
                title="Active Workers"
                value={overallPayrollStats.activeWorkers}
                icon={<PeopleAltIcon />}
                color={theme.palette.info.main}
              />
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                flexBasis: {
                  xs: "100%",
                  sm: "calc(50% - 12px)",
                  md: "calc(25% - 18px)",
                },
                minWidth: { xs: "100%", sm: 260 },
              }}
            >
              <SummaryStatCard
                title="Uncompleted Tasks"
                value={overallPayrollStats.totalUncompletedTasks}
                icon={<AssignmentTurnedInIcon />}
                color={theme.palette.secondary.main}
              />
            </Box>
          </Box>

          {/* Worker Overview Table */}
          <Paper
            elevation={5}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: theme.shape.borderRadius * 2,
              backgroundColor: theme.palette.background.paper,
              mb: 4,
              boxShadow: `0 8px 32px ${alpha(theme.palette.grey[500], 0.1)}`,
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems="center"
              spacing={{ xs: 2, md: 2 }}
              sx={{ mb: 2.5 }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: theme.palette.text.primary }}
              >
                Worker Overview
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems="center"
                sx={{ width: { xs: "100%", md: "auto" } }}
              >
                <TextField
                  fullWidth={!theme.breakpoints.up("sm")}
                  size="small"
                  variant="outlined"
                  placeholder="Search Workers..."
                  value={workerSearchTerm}
                  onChange={(e) => setWorkerSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: "10px" },
                  }}
                />
                <FormControl
                  fullWidth={!theme.breakpoints.up("sm")}
                  size="small"
                  variant="outlined"
                  sx={{ minWidth: 180, borderRadius: "10px" }}
                >
                  <InputLabel id="worker-status-filter-label">
                    Filter Status
                  </InputLabel>
                  <Select
                    labelId="worker-status-filter-label"
                    value={workerStatusFilter}
                    onChange={(e) => setWorkerStatusFilter(e.target.value)}
                    label="Filter Status"
                    startAdornment={
                      <InputAdornment position="start">
                        <FilterListIcon color="action" />
                      </InputAdornment>
                    }
                    sx={{ borderRadius: "10px" }}
                  >
                    <MenuItem value="All">All Statuses</MenuItem>
                    <MenuItem value="Assigned">Assigned</MenuItem>
                    <MenuItem value="Free">Free</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
            {filteredWorkerSummaries.length > 0 ? (
              <>
                <TableContainer
                  sx={{
                    borderRadius: theme.shape.borderRadius,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Table stickyHeader size="medium">
                    <TableHead
                      sx={{
                        backgroundColor: alpha(theme.palette.grey[500], 0.08),
                      }}
                    >
                      <TableRow>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            py: 1.5,
                          }}
                        >
                          Worker
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            py: 1.5,
                          }}
                        >
                          Contact
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            textAlign: "center",
                            py: 1.5,
                          }}
                        >
                          Status
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            textAlign: "center",
                            py: 1.5,
                          }}
                        >
                          Completed Tasks
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            textAlign: "right",
                            py: 1.5,
                          }}
                        >
                          Avg. Pay/Task
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            textAlign: "right",
                            py: 1.5,
                          }}
                        >
                          Total Earned
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredWorkerSummaries
                        .slice(
                          workersPage * workersRowsPerPage,
                          workersPage * workersRowsPerPage + workersRowsPerPage
                        )
                        .map((worker) => (
                          <TableRow
                            hover
                            key={worker.id}
                            sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                              "&:hover": {
                                backgroundColor: alpha(
                                  theme.palette.action.hover,
                                  0.04
                                ),
                              },
                            }}
                          >
                            <TableCell sx={{ py: 1 }}>
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1.5}
                              >
                                <Avatar
                                  sx={{
                                    bgcolor: alpha(
                                      theme.palette.secondary.main,
                                      0.2
                                    ),
                                    color: theme.palette.secondary.dark,
                                    width: 40,
                                    height: 40,
                                    fontSize: "1.1rem",
                                    fontWeight: "medium",
                                  }}
                                >
                                  {worker.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase() || "?"}
                                </Avatar>
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="600"
                                >
                                  {worker.name}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell
                              sx={{
                                color: theme.palette.text.secondary,
                                py: 1,
                              }}
                            >
                              {worker.contactNumber || "N/A"}
                            </TableCell>
                            <TableCell sx={{ textAlign: "center", py: 1 }}>
                              <Chip
                                icon={
                                  <WorkOutlineIcon
                                    sx={{ fontSize: "1rem", ml: "6px" }}
                                  />
                                }
                                label={
                                  worker.assignmentStatus === "Assigned"
                                    ? `${worker.assignmentStatus} (${worker.assignedTaskCount})`
                                    : worker.assignmentStatus
                                }
                                size="small"
                                color={
                                  worker.assignmentStatus === "Assigned"
                                    ? "info"
                                    : "success"
                                }
                                variant="outlined"
                                sx={{
                                  fontWeight: 500,
                                  borderRadius: "16px",
                                  px: 1,
                                  py: 0.25,
                                  borderColor:
                                    worker.assignmentStatus === "Assigned"
                                      ? theme.palette.info.main
                                      : theme.palette.success.main,
                                  color:
                                    worker.assignmentStatus === "Assigned"
                                      ? theme.palette.info.dark
                                      : theme.palette.success.dark,
                                }}
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                textAlign: "center",
                                fontWeight: "medium",
                                py: 1,
                              }}
                            >
                              <Chip
                                icon={
                                  <PlaylistAddCheckIcon
                                    sx={{ fontSize: "1rem", ml: "6px" }}
                                  />
                                }
                                label={worker.completedTaskCount}
                                size="small"
                                variant="outlined"
                                sx={{ borderRadius: "16px" }}
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                textAlign: "right",
                                fontWeight: "medium",
                                color: theme.palette.info.dark,
                                py: 1,
                              }}
                            >
                              <AssessmentIcon
                                sx={{
                                  fontSize: "1.1rem",
                                  verticalAlign: "middle",
                                  mr: 0.2,
                                  color: theme.palette.info.main,
                                }}
                              />
                              {worker.averagePayPerCompletedTask.toFixed(2)}
                            </TableCell>
                            <TableCell
                              sx={{
                                textAlign: "right",
                                fontWeight: "bold",
                                color: theme.palette.success.dark,
                                fontSize: "1rem",
                                py: 1,
                              }}
                            >
                              <AttachMoneyIcon
                                sx={{
                                  fontSize: "1.2rem",
                                  verticalAlign: "middle",
                                  mr: 0.1,
                                }}
                              />
                              {worker.totalEarned.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 15]}
                  component="div"
                  count={filteredWorkerSummaries.length}
                  rowsPerPage={workersRowsPerPage}
                  page={workersPage}
                  onPageChange={handleWorkersPageChange}
                  onRowsPerPageChange={handleWorkersRowsPerPageChange}
                />
              </>
            ) : (
              <Typography
                color="text.secondary"
                sx={{ textAlign: "center", py: 5, fontStyle: "italic" }}
              >
                No workers match the current filters or no workers added yet.
              </Typography>
            )}
          </Paper>

          {/* Uncompleted Tasks Table */}
          <Paper
            elevation={5}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: theme.shape.borderRadius * 2,
              backgroundColor: theme.palette.background.paper,
              mb: 4,
              boxShadow: `0 8px 32px ${alpha(theme.palette.grey[500], 0.1)}`,
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: 600,
                mb: 2.5,
                color: theme.palette.text.primary,
              }}
            >
              Uncompleted Tasks for Assignment
            </Typography>
            {uncompletedTasks.length > 0 ? (
              <>
                <TableContainer
                  sx={{
                    borderRadius: theme.shape.borderRadius,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Table stickyHeader size="medium">
                    <TableHead
                      sx={{
                        backgroundColor: alpha(theme.palette.grey[500], 0.08),
                      }}
                    >
                      <TableRow>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            py: 1.5,
                          }}
                        >
                          Customer
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            py: 1.5,
                          }}
                        >
                          Service
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            py: 1.5,
                          }}
                        >
                          Date
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            textAlign: "right",
                            py: 1.5,
                          }}
                        >
                          Amount
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            textAlign: "center",
                            py: 1.5,
                          }}
                        >
                          Worker Allocation
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            textAlign: "center",
                            py: 1.5,
                          }}
                        >
                          Status
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            py: 1.5,
                          }}
                        >
                          Assigned Workers & Pay
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            textAlign: "center",
                            py: 1.5,
                          }}
                        >
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uncompletedTasks
                        .slice(
                          tasksPage * tasksRowsPerPage,
                          tasksPage * tasksRowsPerPage + tasksRowsPerPage
                        )
                        .map((task) => {
                          const workerPortion = (task.amount || 0) * 0.4;
                          return (
                            <TableRow
                              hover
                              key={task.id}
                              sx={{
                                "&:last-child td, &:last-child th": {
                                  border: 0,
                                },
                                "&:hover": {
                                  backgroundColor: alpha(
                                    theme.palette.action.hover,
                                    0.04
                                  ),
                                },
                              }}
                            >
                              <TableCell sx={{ fontWeight: "medium", py: 1 }}>
                                {task.name}
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                {task.serviceType}
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                {task.appointmentDate}
                              </TableCell>
                              <TableCell
                                sx={{
                                  textAlign: "right",
                                  fontWeight: "medium",
                                  py: 1,
                                }}
                              >
                                ${(task.amount || 0).toFixed(2)}
                              </TableCell>
                              <TableCell
                                sx={{
                                  textAlign: "right",
                                  fontWeight: "medium",
                                  color: theme.palette.info.dark,
                                  py: 1,
                                }}
                              >
                                ${workerPortion.toFixed(2)}
                              </TableCell>
                              <TableCell sx={{ textAlign: "center", py: 1 }}>
                                <Chip
                                  label={task.status}
                                  size="small"
                                  color={
                                    task.status === "scheduled"
                                      ? "info"
                                      : task.status === "in-progress"
                                      ? "warning"
                                      : "default"
                                  }
                                  variant="filled"
                                  sx={{
                                    fontWeight: 500,
                                    borderRadius: "16px",
                                    px: 1,
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  flexWrap="wrap"
                                >
                                  {task.assignedWorkersPay &&
                                  task.assignedWorkersPay.length > 0 ? (
                                    task.assignedWorkersPay.map((wp) => {
                                      const worker = workers.find(
                                        (w) => w.id === wp.workerId
                                      );
                                      return (
                                        <MuiTooltip
                                          key={wp.workerId}
                                          title={`Pay for ${
                                            worker?.name || "Unknown"
                                          }: $${(
                                            workerPortion *
                                            (wp.splitPercentage / 100)
                                          ).toFixed(2)}`}
                                        >
                                          <Chip
                                            icon={
                                              <PersonIcon
                                                sx={{
                                                  fontSize: "0.9rem",
                                                  ml: "6px !important",
                                                }}
                                              />
                                            }
                                            label={`${
                                              worker?.name || "Worker"
                                            }: ${wp.splitPercentage}%`}
                                            size="small"
                                            sx={{
                                              backgroundColor: alpha(
                                                theme.palette.secondary.light,
                                                0.3
                                              ),
                                              color:
                                                theme.palette.secondary.dark,
                                              fontWeight: 500,
                                              borderRadius: "16px",
                                              cursor: "default",
                                            }}
                                          />
                                        </MuiTooltip>
                                      );
                                    })
                                  ) : (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontStyle: "italic" }}
                                    >
                                      None assigned
                                    </Typography>
                                  )}
                                </Stack>
                              </TableCell>
                              <TableCell sx={{ textAlign: "center", py: 1 }}>
                                <MuiTooltip title="Assign Workers / Edit Pay Splits">
                                  <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={() =>
                                      handleOpenAssignPayDialog(task)
                                    }
                                    size="small"
                                    sx={{
                                      borderRadius: "8px",
                                      textTransform: "none",
                                      px: 1.5,
                                    }}
                                    startIcon={
                                      <EditIcon sx={{ fontSize: "1.1rem" }} />
                                    }
                                  >
                                    Manage
                                  </Button>
                                </MuiTooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={uncompletedTasks.length}
                  rowsPerPage={tasksRowsPerPage}
                  page={tasksPage}
                  onPageChange={handleTasksPageChange}
                  onRowsPerPageChange={handleTasksRowsPerPageChange}
                />
              </>
            ) : (
              <Typography
                color="text.secondary"
                sx={{ textAlign: "center", py: 5, fontStyle: "italic" }}
              >
                No uncompleted tasks available for assignment.
              </Typography>
            )}
          </Paper>

          {/* Completed Tasks History Table */}
          <Paper
            elevation={5}
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: theme.shape.borderRadius * 2,
              backgroundColor: theme.palette.background.paper,
              mt: 4,
              boxShadow: `0 8px 32px ${alpha(theme.palette.grey[500], 0.1)}`,
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: 600,
                mb: 2.5,
                color: theme.palette.text.primary,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <HistoryIcon sx={{ color: theme.palette.primary.main }} /> Task
              Completion History
            </Typography>
            {completedTasksHistory.length > 0 ? (
              <>
                <TableContainer
                  sx={{
                    borderRadius: theme.shape.borderRadius,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Table stickyHeader size="medium">
                    <TableHead
                      sx={{
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.08
                        ),
                      }}
                    >
                      <TableRow>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            py: 1.5,
                            fontSize: "0.9rem",
                          }}
                        >
                          Customer
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            py: 1.5,
                            fontSize: "0.9rem",
                          }}
                        >
                          Service
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            py: 1.5,
                            fontSize: "0.9rem",
                          }}
                        >
                          Completion Date
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            textAlign: "right",
                            py: 1.5,
                            fontSize: "0.9rem",
                          }}
                        >
                          Amount
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            py: 1.5,
                            fontSize: "0.9rem",
                          }}
                        >
                          Workers & Pay Received
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {completedTasksHistory
                        .slice(
                          historyPage * historyRowsPerPage,
                          historyPage * historyRowsPerPage + historyRowsPerPage
                        )
                        .map((task) => {
                          const workerPortion = (task.amount || 0) * 0.4;
                          return (
                            <TableRow
                              hover
                              key={task.id}
                              sx={{
                                "&:last-child td, &:last-child th": {
                                  border: 0,
                                },
                                "&:hover": {
                                  backgroundColor: alpha(
                                    theme.palette.primary.light,
                                    0.05
                                  ),
                                },
                              }}
                            >
                              <TableCell sx={{ py: 1.25 }}>
                                <Typography variant="body2" fontWeight={500}>
                                  {task.name}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1.25 }}>
                                <Typography variant="body2">
                                  {task.serviceType}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1.25 }}>
                                <Typography variant="body2">
                                  {task.appointmentDate}
                                </Typography>
                              </TableCell>
                              <TableCell
                                sx={{
                                  textAlign: "right",
                                  fontWeight: 500,
                                  py: 1.25,
                                }}
                              >
                                <Typography variant="body2">
                                  ${(task.amount || 0).toFixed(2)}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1.25 }}>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  flexWrap="wrap"
                                  alignItems="center"
                                >
                                  {task.assignedWorkersPay &&
                                  task.assignedWorkersPay.length > 0 ? (
                                    task.assignedWorkersPay.map((wp) => {
                                      const worker = workers.find(
                                        (w) => w.id === wp.workerId
                                      );
                                      const payForThisTask =
                                        workerPortion *
                                        (wp.splitPercentage / 100);
                                      return (
                                        <Chip
                                          key={wp.workerId}
                                          avatar={
                                            <Avatar
                                              sx={{
                                                bgcolor: alpha(
                                                  theme.palette.success.dark,
                                                  0.7
                                                ),
                                                color:
                                                  theme.palette.common.white,
                                                width: 28,
                                                height: 28,
                                                fontSize: "0.8rem",
                                              }}
                                            >
                                              {worker?.name
                                                .charAt(0)
                                                .toUpperCase() || (
                                                <PersonIcon
                                                  sx={{ fontSize: "1rem" }}
                                                />
                                              )}
                                            </Avatar>
                                          }
                                          label={
                                            <Box
                                              component="span"
                                              sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.5,
                                              }}
                                            >
                                              <Typography
                                                variant="caption"
                                                fontWeight="500"
                                              >
                                                {worker?.name || "Worker"}:
                                              </Typography>
                                              <Typography
                                                variant="caption"
                                                fontWeight="bold"
                                                color="success.darker"
                                              >
                                                ${payForThisTask.toFixed(2)}
                                              </Typography>
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                              >
                                                ({wp.splitPercentage}%)
                                              </Typography>
                                            </Box>
                                          }
                                          size="small"
                                          sx={{
                                            backgroundColor: alpha(
                                              theme.palette.success.light,
                                              0.25
                                            ),
                                            color: theme.palette.success.dark,
                                            borderRadius: "16px",
                                            p: "0px 4px",
                                            height: "auto",
                                            "& .MuiChip-label": {
                                              p: "4px 6px",
                                            },
                                          }}
                                        />
                                      );
                                    })
                                  ) : (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontStyle: "italic", pl: 1 }}
                                    >
                                      No specific worker pay recorded
                                    </Typography>
                                  )}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={completedTasksHistory.length}
                  rowsPerPage={historyRowsPerPage}
                  page={historyPage}
                  onPageChange={handleHistoryPageChange}
                  onRowsPerPageChange={handleHistoryRowsPerPageChange}
                />
              </>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 6,
                  color: theme.palette.text.secondary,
                }}
              >
                <InfoOutlinedIcon
                  sx={{
                    fontSize: 48,
                    mb: 1.5,
                    color: alpha(theme.palette.text.secondary, 0.7),
                  }}
                />
                <Typography variant="subtitle1" sx={{ fontStyle: "italic" }}>
                  No completed task history available.
                </Typography>
                <Typography variant="caption">
                  Once tasks are marked as 'completed', they will appear here.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Add Worker Dialog */}
          <Dialog
            open={openAddWorkerDialog}
            onClose={handleCloseAddWorkerDialog}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: theme.shape.borderRadius * 2 } }}
          >
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderBottom: `1px solid ${theme.palette.divider}`,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              }}
            >
              <PersonIcon color="primary" />
              Add New Worker
            </DialogTitle>
            <DialogContent sx={{ pt: "20px !important", pb: 1 }}>
              <DialogContentText sx={{ mb: 2.5, fontSize: "0.95rem" }}>
                Enter the details for the new worker.
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                id="workerName"
                label="Worker Name"
                type="text"
                fullWidth
                variant="outlined"
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                id="workerContact"
                label="Contact Number (Optional)"
                type="tel"
                fullWidth
                variant="outlined"
                value={newWorkerContact}
                onChange={(e) => setNewWorkerContact(e.target.value)}
              />
            </DialogContent>
            <DialogActions
              sx={{
                p: "16px 24px",
                borderTop: `1px solid ${theme.palette.divider}`,
                bgcolor: alpha(theme.palette.grey[500], 0.05),
              }}
            >
              <Button
                onClick={handleCloseAddWorkerDialog}
                color="inherit"
                sx={{ borderRadius: "8px" }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddWorker}
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                sx={{ borderRadius: "8px" }}
              >
                Add Worker
              </Button>
            </DialogActions>
          </Dialog>

          {/* Assign Workers & Set Pay Dialog */}
          {currentTaskForPay && (
            <Dialog
              open={openAssignPayDialog}
              onClose={handleCloseAssignPayDialog}
              maxWidth="sm"
              fullWidth
              PaperProps={{
                sx: {
                  maxHeight: "95vh",
                  borderRadius: theme.shape.borderRadius * 2,
                },
              }}
            >
              <DialogTitle
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                }}
              >
                <PaymentsIcon color="primary" /> Assign & Set Pay:{" "}
                {currentTaskForPay.name} ({currentTaskForPay.serviceType})
              </DialogTitle>
              <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
                <Paper
                  variant="elevation"
                  elevation={2}
                  sx={{
                    p: 2,
                    mb: 2.5,
                    backgroundColor: alpha(theme.palette.success.light, 0.1),
                    borderColor: alpha(theme.palette.success.main, 0.4),
                    borderRadius: 1.5,
                    borderLeft: `4px solid ${theme.palette.success.main}`,
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
                    Task Amount:{" "}
                    <strong style={{ color: theme.palette.text.primary }}>
                      ${(currentTaskForPay.amount || 0).toFixed(2)}
                    </strong>
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: theme.palette.success.dark,
                      fontWeight: "bold",
                    }}
                  >
                    Worker Allocation (40%):{" "}
                    <strong>
                      ${((currentTaskForPay.amount || 0) * 0.4).toFixed(2)}
                    </strong>
                  </Typography>
                </Paper>
                <DialogContentText sx={{ mb: 2, fontSize: "0.9rem" }}>
                  Select workers and define their percentage split of the worker
                  allocation. Total split must equal 100%.
                </DialogContentText>
                {workers.length > 0 ? (
                  <List
                    dense
                    sx={{
                      maxHeight: 320,
                      overflowY: "auto",
                      mb: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                      p: 0,
                      backgroundColor: alpha(
                        theme.palette.mode === "dark"
                          ? theme.palette.grey[800]
                          : theme.palette.grey[50],
                        0.5
                      ),
                    }}
                  >
                    {workers.map((worker) => {
                      const currentSplit = selectedWorkersForTask.find(
                        (w) => w.workerId === worker.id
                      );
                      const isSelected = !!currentSplit;
                      return (
                        <ListItem
                          key={worker.id}
                          disablePadding
                          sx={{
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            "&:last-child": { borderBottom: 0 },
                            "&:hover": {
                              backgroundColor: alpha(
                                theme.palette.action.hover,
                                0.06
                              ),
                            },
                          }}
                          secondaryAction={
                            isSelected && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  width: { xs: 90, sm: 100 },
                                  pr: 1,
                                }}
                              >
                                <TextField
                                  type="number"
                                  size="small"
                                  variant="outlined"
                                  value={
                                    currentSplit.splitPercentage === 0 &&
                                    !selectedWorkersForTask.find(
                                      (w) =>
                                        w.workerId === worker.id &&
                                        w.splitPercentage !== 0
                                    )
                                      ? ""
                                      : currentSplit.splitPercentage
                                  }
                                  onChange={(e) =>
                                    handlePaySplitChange(
                                      worker.id,
                                      e.target.value
                                    )
                                  }
                                  inputProps={{ min: 0, max: 100, step: 1 }}
                                  sx={{
                                    width: { xs: 60, sm: 70 },
                                    mr: 0.5,
                                    "& .MuiInputBase-input": {
                                      textAlign: "right",
                                      p: "8px 10px",
                                      borderRadius: "6px",
                                    },
                                    "& .MuiOutlinedInput-root": {
                                      borderRadius: "6px",
                                    },
                                  }}
                                />
                                <PercentIcon fontSize="small" color="action" />
                              </Box>
                            )
                          }
                        >
                          <ListItemButton
                            onClick={() =>
                              handleWorkerSelectionForTask(worker.id)
                            }
                            sx={{ py: 1, px: 1.5 }}
                          >
                            <ListItemIcon sx={{ minWidth: 34 }}>
                              <Checkbox
                                edge="start"
                                checked={isSelected}
                                tabIndex={-1}
                                disableRipple
                                size="small"
                                sx={{ p: 0.5 }}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={worker.name}
                              secondary={worker.contactNumber}
                              primaryTypographyProps={{
                                fontSize: "0.95rem",
                                fontWeight: 500,
                              }}
                              secondaryTypographyProps={{ fontSize: "0.8rem" }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                ) : (
                  <Typography
                    color="text.secondary"
                    sx={{ py: 3, textAlign: "center" }}
                  >
                    No workers available. Add workers first.
                  </Typography>
                )}

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mt: 2,
                    p: 1.5,
                    borderRadius: 1.5,
                    background: alpha(theme.palette.info.light, 0.18),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.4)}`,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    Total Split:
                  </Typography>
                  <Chip
                    label={`${totalSplitPercentage}%`}
                    color={
                      totalSplitPercentage === 100
                        ? "success"
                        : totalSplitPercentage > 100
                        ? "error"
                        : "warning"
                    }
                    variant="filled"
                    sx={{
                      fontWeight: "bold",
                      fontSize: "1rem",
                      px: 1,
                      py: 0.5,
                      height: "auto",
                    }}
                  />
                </Box>

                {paySplitError && (
                  <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5 }}>
                    {paySplitError}
                  </Alert>
                )}
                {selectedWorkersForTask.length === 0 && (
                  <Typography
                    color="text.secondary"
                    sx={{
                      mt: 2,
                      fontStyle: "italic",
                      textAlign: "center",
                      fontSize: "0.9rem",
                    }}
                  >
                    Select workers to assign. Saving with no workers selected
                    will unassign all.
                  </Typography>
                )}
              </DialogContent>
              <DialogActions
                sx={{
                  p: "16px 24px",
                  borderTop: `1px solid ${theme.palette.divider}`,
                  bgcolor: alpha(theme.palette.grey[500], 0.05),
                }}
              >
                <Button
                  onClick={handleCloseAssignPayDialog}
                  color="inherit"
                  sx={{ borderRadius: "8px" }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAssignmentAndPay}
                  variant="contained"
                  startIcon={<AssignmentIndIcon />}
                  sx={{ borderRadius: "8px" }}
                >
                  Save Assignment & Pay
                </Button>
              </DialogActions>
            </Dialog>
          )}
        </Container>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            sx={{
              width: "100%",
              boxShadow: theme.shadows[6],
              borderRadius: theme.shape.borderRadius * 1.5,
            }}
            variant="filled"
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default Payroll;
