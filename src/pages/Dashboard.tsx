import React, { useState, useEffect, useMemo } from "react"; // Added useMemo
import {
  Box,
  Container,
  Typography,
  Stack,
  Tabs,
  Tab,
  useTheme,
  alpha,
  Divider,
  Button,
  useMediaQuery,
  Card,
} from "@mui/material";
import {
  People,
  AttachMoney,
  ShoppingCart,
  AccessTime,
  BarChart,
  CalendarMonth,
  // AddCircleOutline, // Not used in the header in this version
} from "@mui/icons-material";

// Recharts imports
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import MetricCard from "../components/MetricCard";

// Firestore imports
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
} from "firebase/firestore";

import CustomerTable, {
  type BookingCustomer,
} from "../components/CustomerTable";

// Helper function to format date for XAxis
const formatDateTick = (tickItem: string) => {
  // Assuming tickItem is 'YYYY-MM-DD'
  const date = new Date(tickItem + "T00:00:00"); // Ensure correct parsing by adding time part
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<BookingCustomer[]>([]);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const appointmentsCollectionRef = collection(db, "appointments");
        const q = query(
          appointmentsCollectionRef,
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
              appointmentDateStr = data.appointmentDate;
            }
          }
          return {
            id: docSnap.id,
            name: data.name || "",
            email: data.email || undefined,
            phone: data.phone || "",
            serviceType: data.serviceType || "",
            appointmentDate: appointmentDateStr,
            appointmentTime: data.appointmentTime || "",
            status: data.status || "scheduled",
            amount: data.amount !== undefined ? Number(data.amount) : undefined,
            notes: data.notes || undefined,
            avatarUrl: data.avatarUrl || undefined,
          } as BookingCustomer;
        });
        setBookings(fetchedBookings);
      } catch (error) {
        console.error("Error fetching bookings from Firestore: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  // Aggregate completed sales data for the chart
  const completedSalesData = useMemo(() => {
    const salesByDate: { [date: string]: number } = {};

    bookings.forEach((booking) => {
      if (
        booking.status === "completed" &&
        booking.appointmentDate &&
        booking.amount
      ) {
        salesByDate[booking.appointmentDate] =
          (salesByDate[booking.appointmentDate] || 0) + booking.amount;
      }
    });

    return Object.keys(salesByDate)
      .map((date) => ({
        date: date, // Keep as YYYY-MM-DD for sorting
        sales: salesByDate[date],
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date
  }, [bookings]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleUpdateBooking = async (updatedBooking: BookingCustomer) => {
    if (!updatedBooking.id) {
      console.error("Cannot update booking: Missing ID.");
      return;
    }
    try {
      const bookingDocRef = doc(db, "appointments", updatedBooking.id);
      const { id, ...rawDataFromUpdatedBooking } = updatedBooking;
      const dataToUpdate: { [key: string]: any } = {};
      for (const key in rawDataFromUpdatedBooking) {
        if (
          Object.prototype.hasOwnProperty.call(rawDataFromUpdatedBooking, key)
        ) {
          const value = (rawDataFromUpdatedBooking as any)[key];
          if (value !== undefined) {
            dataToUpdate[key] = value;
          }
        }
      }
      if (dataToUpdate.hasOwnProperty("amount")) {
        if (dataToUpdate.amount === null || dataToUpdate.amount === "") {
          dataToUpdate.amount = null;
        } else {
          const parsedAmount = parseFloat(String(dataToUpdate.amount));
          dataToUpdate.amount = isNaN(parsedAmount) ? null : parsedAmount;
        }
      }
      if (Object.keys(dataToUpdate).length === 0) {
        setBookings((prevBookings) =>
          prevBookings.map((b) =>
            b.id === updatedBooking.id ? updatedBooking : b
          )
        );
        return;
      }
      await updateDoc(bookingDocRef, dataToUpdate);
      setBookings((prevBookings) =>
        prevBookings.map((b) =>
          b.id === updatedBooking.id ? updatedBooking : b
        )
      );
      console.log("Booking updated:", dataToUpdate);
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  };

  const handleRefresh = () => {
    // Re-fetch bookings (simplified, actual fetch logic is in useEffect)
    const fetchAgain = async () => {
      setLoading(true);
      try {
        const appointmentsCollectionRef = collection(db, "appointments");
        const q = query(
          appointmentsCollectionRef,
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
              appointmentDateStr = data.appointmentDate;
            }
          }
          return {
            id: docSnap.id,
            name: data.name || "",
            email: data.email || undefined,
            phone: data.phone || "",
            serviceType: data.serviceType || "",
            appointmentDate: appointmentDateStr,
            appointmentTime: data.appointmentTime || "",
            status: data.status || "scheduled",
            amount: data.amount !== undefined ? Number(data.amount) : undefined,
            notes: data.notes || undefined,
            avatarUrl: data.avatarUrl || undefined,
          } as BookingCustomer;
        });
        setBookings(fetchedBookings);
      } catch (error) {
        console.error("Error refreshing bookings: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAgain();
  };

  const metrics = [
    {
      title: "Total Appointments",
      value: bookings.length.toString(),
      icon: People,
      color: theme.palette.primary.main,
      variant: "filled",
      trend: "up",
      changePercentage: parseFloat(
        (
          (bookings.filter((b) => b.status === "scheduled").length /
            (bookings.length || 1)) *
          10
        ).toFixed(1)
      ),
    },
    {
      title: "Total Revenue",
      value: `$${bookings
        .reduce((sum, b) => sum + (b.amount || 0), 0)
        .toFixed(2)}`,
      icon: AttachMoney,
      color: theme.palette.success.main,
      variant: "outlined",
      trend: "up",
      changePercentage: 12.5,
    },
    {
      title: "Completed Today",
      value: bookings
        .filter(
          (b) =>
            b.status === "completed" &&
            b.appointmentDate === new Date().toISOString().split("T")[0]
        )
        .length.toString(),
      icon: ShoppingCart,
      color: theme.palette.warning.main,
      variant: "subtle",
      trend: "down",
      changePercentage: 3.7,
    },
    {
      title: "Upcoming Today",
      value: bookings
        .filter(
          (b) =>
            b.status === "scheduled" &&
            b.appointmentDate === new Date().toISOString().split("T")[0]
        )
        .length.toString(),
      icon: AccessTime,
      color: theme.palette.info.main,
      variant: "subtle",
      trend: "up",
      changePercentage: 5.3,
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        bgcolor:
          theme.palette.mode === "dark"
            ? alpha(theme.palette.common.black, 0.3)
            : theme.palette.grey[50],
      }}
    >
      <Sidebar
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
      />
      <Box component="main" sx={{ flexGrow: 1, minHeight: "100vh", pb: 8 }}>
        <Navbar handleDrawerToggle={handleDrawerToggle} />
        <Container
          maxWidth="xl"
          sx={{ mt: { xs: 8, sm: 9 }, px: { xs: 2, sm: 3 } }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
              mb: 4,
            }}
          >
            <Box>
              <Typography
                variant={isMobile ? "h5" : "h4"}
                sx={{ fontWeight: 700, color: theme.palette.text.primary }}
              >
                Dashboard Overview
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Welcome back! Here's what's happening with your appointments.
              </Typography>
            </Box>
            {/* "New Appointment" button was removed in user's last code block, keeping it that way */}
          </Box>
          <Stack
            direction="row"
            flexWrap="wrap"
            gap={{ xs: 2, sm: 3 }}
            sx={{
              mb: 4,
              "& > *": {
                flex: {
                  xs: "1 1 100%",
                  sm: "1 1 calc(50% - 12px)",
                  md: "1 1 calc(25% - 18px)",
                },
                minWidth: { xs: "calc(100% - 16px)", sm: 200 },
              },
            }}
          >
            {metrics.map((metric, index) => (
              <MetricCard
                key={index}
                title={metric.title}
                value={metric.value}
                icon={metric.icon}
                color={metric.color}
                variant={metric.variant as "filled" | "outlined" | "subtle"}
                trend={metric.trend as "up" | "down" | "neutral"}
                changePercentage={metric.changePercentage}
              />
            ))}
          </Stack>
          <Card
            sx={{
              borderRadius: theme.shape.borderRadius * 2,
              overflow: "hidden",
              boxShadow: `0 4px 20px ${alpha(
                theme.palette.common.black,
                0.05
              )}`,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              mb: 4,
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  px: { xs: 1, sm: 2 },
                  "& .MuiTab-root": {
                    minHeight: 48,
                    px: { xs: 1.5, sm: 3 },
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    textTransform: "capitalize",
                  },
                }}
              >
                <Tab label="All Appointments" />
                <Tab label="In Progress" />
                <Tab label="Scheduled" />
                <Tab label="History" />
              </Tabs>
            </Box>
            <TabPanel value={activeTab} index={0}>
              {" "}
              <CustomerTable
                customers={bookings}
                loading={loading}
                onRefresh={handleRefresh}
                onUpdateCustomer={handleUpdateBooking}
              />{" "}
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
              {" "}
              <CustomerTable
                customers={bookings.filter((b) => b.status === "in-progress")}
                loading={loading}
                onRefresh={handleRefresh}
                onUpdateCustomer={handleUpdateBooking}
              />{" "}
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
              {" "}
              <CustomerTable
                customers={bookings.filter((b) => b.status === "scheduled")}
                loading={loading}
                onRefresh={handleRefresh}
                onUpdateCustomer={handleUpdateBooking}
              />{" "}
            </TabPanel>
            <TabPanel value={activeTab} index={3}>
              {" "}
              <CustomerTable
                customers={bookings.filter(
                  (b) => b.status === "completed" || b.status === "cancelled"
                )}
                loading={loading}
                onRefresh={handleRefresh}
                onUpdateCustomer={handleUpdateBooking}
              />{" "}
            </TabPanel>
          </Card>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", lg: "row" },
              gap: 3,
            }}
          >
            {/* Analytics Overview - MODIFIED SECTION with Line Graph */}
            <Box sx={{ flex: { xs: "1 1 100%", lg: "2 1 0%" }, minWidth: 0 }}>
              <Card
                sx={{
                  borderRadius: theme.shape.borderRadius * 2,
                  p: { xs: 2, sm: 3 },
                  height: "100%",
                  boxShadow: `0 4px 20px ${alpha(
                    theme.palette.common.black,
                    0.05
                  )}`,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {" "}
                    Completed Sales Trend{" "}
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<BarChart />}
                    sx={{ textTransform: "none" }}
                  >
                    {" "}
                    View Reports{" "}
                  </Button>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Box sx={{ height: 300 }}>
                  {completedSalesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={completedSalesData}
                        margin={{
                          top: 5,
                          right: isMobile ? 10 : 30,
                          left: isMobile ? -20 : 0,
                          bottom: 5,
                        }} // Adjusted margins
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={theme.palette.divider}
                        />
                        <XAxis
                          dataKey="date"
                          stroke={theme.palette.text.secondary}
                          tickFormatter={formatDateTick}
                          angle={isMobile ? -30 : 0} // Angle ticks on mobile for better fit
                          textAnchor={isMobile ? "end" : "middle"}
                          height={isMobile ? 50 : 30} // Adjust height for angled labels
                          dy={isMobile ? 5 : 0} // Adjust vertical position of angled labels
                        />
                        <YAxis
                          stroke={theme.palette.text.secondary}
                          tickFormatter={(value) => `$${value / 1000}k`}
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(value),
                            "Sales",
                          ]}
                          labelFormatter={(label: string) =>
                            new Date(label + "T00:00:00").toLocaleDateString(
                              undefined,
                              { year: "numeric", month: "long", day: "numeric" }
                            )
                          }
                          contentStyle={{
                            backgroundColor: alpha(
                              theme.palette.background.paper,
                              0.9
                            ),
                            borderRadius: theme.shape.borderRadius,
                          }}
                          itemStyle={{ color: theme.palette.primary.main }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 20 }} />
                        <Line
                          type="monotone"
                          dataKey="sales"
                          stroke={theme.palette.primary.main}
                          strokeWidth={2}
                          activeDot={{ r: 6 }}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box
                      sx={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 1,
                        background: alpha(theme.palette.grey[500], 0.05),
                      }}
                    >
                      <Typography variant="body1" color="text.secondary">
                        No completed sales data available to display chart.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Card>
            </Box>

            {/* Upcoming Appointments Section (remains the same as your last provided code) */}
            <Box sx={{ flex: { xs: "1 1 100%", lg: "1 1 0%" }, minWidth: 0 }}>
              <Card
                sx={{
                  borderRadius: theme.shape.borderRadius * 2,
                  p: { xs: 2, sm: 3 },
                  height: "100%",
                  boxShadow: `0 4px 20px ${alpha(
                    theme.palette.common.black,
                    0.05
                  )}`,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {" "}
                    Upcoming{" "}
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<CalendarMonth />}
                    sx={{ textTransform: "none" }}
                  >
                    {" "}
                    View Calendar{" "}
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ height: 260, overflowY: "auto", pr: 0.5 }}>
                  {bookings
                    .filter(
                      (b) =>
                        b.status === "scheduled" &&
                        new Date(b.appointmentDate) >= new Date()
                    )
                    .sort(
                      (a, b) =>
                        new Date(a.appointmentDate).getTime() -
                        new Date(b.appointmentDate).getTime()
                    )
                    .slice(0, 4)
                    .map((appointment) => (
                      <Box
                        key={appointment.id}
                        sx={{
                          p: 1.5,
                          mb: 1.5,
                          borderRadius: theme.shape.borderRadius,
                          bgcolor: alpha(theme.palette.primary.main, 0.04),
                          "&:hover": {
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            boxShadow: theme.shadows[2],
                          },
                          cursor: "pointer",
                          transition: "all 0.2s ease-in-out",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 600,
                              color: theme.palette.text.primary,
                            }}
                          >
                            {" "}
                            {appointment.name}{" "}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: theme.palette.text.secondary }}
                          >
                            {" "}
                            {appointment.appointmentTime}{" "}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            color: theme.palette.text.secondary,
                            mb: 0.5,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {" "}
                          {appointment.serviceType}{" "}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              color: theme.palette.text.disabled,
                            }}
                          >
                            {" "}
                            <CalendarMonth
                              fontSize="small"
                              sx={{ fontSize: "0.9rem", mr: 0.5 }}
                            />{" "}
                            {new Date(
                              appointment.appointmentDate
                            ).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                          </Typography>
                          {appointment.amount !== undefined && (
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: theme.palette.primary.dark,
                              }}
                            >
                              {" "}
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                              }).format(appointment.amount)}{" "}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  {bookings.filter(
                    (b) =>
                      b.status === "scheduled" &&
                      new Date(b.appointmentDate) >= new Date()
                  ).length === 0 && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      textAlign="center"
                      sx={{ mt: 4 }}
                    >
                      {" "}
                      No upcoming appointments.{" "}
                    </Typography>
                  )}
                </Box>
                <Divider sx={{ my: 2 }} />
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  sx={{
                    borderRadius: theme.shape.borderRadius * 1.5,
                    textTransform: "none",
                  }}
                >
                  {" "}
                  View All Appointments{" "}
                </Button>
              </Card>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 1, sm: 2, md: 2.5 } }}>{children}</Box>
      )}
    </div>
  );
}

export default Dashboard;
