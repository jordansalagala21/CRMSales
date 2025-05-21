import React, { useState, useEffect, useMemo } from "react";
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
  ShoppingCart, // Kept for example, but can be replaced by new icons
  AccessTime, // Kept for example, but can be replaced by new icons
  BarChart,
  CalendarMonth,
  MonetizationOn, // New Icon for Average Sale Value
  EventBusy, // New Icon for Cancellation Rate
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
const formatDateTick = (tickItem: string): string => {
  const date = new Date(tickItem + "T00:00:00Z");
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
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
              try {
                appointmentDateStr = new Date(data.appointmentDate)
                  .toISOString()
                  .split("T")[0];
              } catch (e) {
                console.warn(
                  `Invalid date string from Firestore: ${data.appointmentDate}`
                );
                appointmentDateStr = "";
              }
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

  const completedSalesData = useMemo(() => {
    const salesByDate: { [date: string]: number } = {};
    bookings.forEach((booking) => {
      if (
        booking.status === "completed" &&
        booking.appointmentDate &&
        typeof booking.amount === "number"
      ) {
        salesByDate[booking.appointmentDate] =
          (salesByDate[booking.appointmentDate] || 0) + booking.amount;
      }
    });
    return Object.keys(salesByDate)
      .map((date) => ({
        date: date,
        sales: salesByDate[date],
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [bookings]);

  // Calculate Average Sale Value (ARPA)
  const averageSaleValue = useMemo(() => {
    const completedBookings = bookings.filter(
      (b) => b.status === "completed" && typeof b.amount === "number"
    );
    if (completedBookings.length === 0) {
      return 0;
    }
    const totalRevenueFromCompleted = completedBookings.reduce(
      (sum, b) => sum + (b.amount || 0),
      0
    );
    return totalRevenueFromCompleted / completedBookings.length;
  }, [bookings]);

  // Calculate Cancellation Rate
  const cancellationRate = useMemo(() => {
    if (bookings.length === 0) {
      return 0;
    }
    const cancelledBookings = bookings.filter((b) => b.status === "cancelled");
    return (cancelledBookings.length / bookings.length) * 100;
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

      Object.keys(rawDataFromUpdatedBooking).forEach((key) => {
        const K = key as keyof Omit<BookingCustomer, "id">;
        if (rawDataFromUpdatedBooking[K] !== undefined) {
          dataToUpdate[K] = rawDataFromUpdatedBooking[K];
        }
      });

      if (dataToUpdate.hasOwnProperty("amount")) {
        if (
          dataToUpdate.amount === null ||
          dataToUpdate.amount === "" ||
          dataToUpdate.amount === undefined
        ) {
          dataToUpdate.amount = null;
        } else {
          const parsedAmount = parseFloat(String(dataToUpdate.amount));
          dataToUpdate.amount = isNaN(parsedAmount) ? null : parsedAmount;
        }
      }

      if (Object.keys(dataToUpdate).length === 0 && updatedBooking.id) {
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
      console.log("Booking updated:", updatedBooking.id, dataToUpdate);
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  };

  const handleRefresh = () => {
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
              try {
                appointmentDateStr = new Date(data.appointmentDate)
                  .toISOString()
                  .split("T")[0];
              } catch (e) {
                console.warn(
                  `Invalid date string from Firestore on refresh: ${data.appointmentDate}`
                );
                appointmentDateStr = "";
              }
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
      variant: "filled" as "filled" | "outlined" | "subtle",
      trend: "up" as "up" | "down" | "neutral", // Example trend
      changePercentage: bookings.length > 10 ? 5.2 : 1.1, // Example percentage
      periodDescription: "since last week",
    },
    {
      title: "Total Revenue",
      value: `$${bookings
        .reduce((sum, b) => sum + (b.amount || 0), 0)
        .toFixed(2)}`,
      icon: AttachMoney,
      color: theme.palette.success.main,
      variant: "outlined" as "filled" | "outlined" | "subtle",
      trend: "up" as "up" | "down" | "neutral", // Example trend
      changePercentage: 12.5, // Example percentage
      periodDescription: "since last month",
    },
    {
      title: "Avg. Sale Value",
      value: `$${averageSaleValue.toFixed(2)}`,
      icon: MonetizationOn,
      color: theme.palette.info.main, // Choose a color
      variant: "subtle" as "filled" | "outlined" | "subtle",
      trend:
        averageSaleValue > 50 ? "up" : ("down" as "up" | "down" | "neutral"), // Example trend
      changePercentage: parseFloat(
        (averageSaleValue > 50 ? 2.1 : -1.5).toFixed(1)
      ), // Example, calculate actual change
      periodDescription: "avg. per sale",
    },
    {
      title: "Cancellation Rate",
      value: `${cancellationRate.toFixed(1)}%`,
      icon: EventBusy,
      color: theme.palette.error.main, // Choose a color
      variant: "subtle" as "filled" | "outlined" | "subtle",
      // Trend: lower is better for cancellation rate
      trend:
        cancellationRate < 10 ? "down" : ("up" as "up" | "down" | "neutral"),
      changePercentage: parseFloat(
        (cancellationRate < 10 ? -0.5 : 1.2).toFixed(1)
      ), // Example, calculate actual change
      periodDescription: "of all bookings",
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        width: "100vw",
        bgcolor:
          theme.palette.mode === "dark"
            ? alpha(theme.palette.common.black, 0.3)
            : theme.palette.grey[50],
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
        }}
      >
        <Navbar handleDrawerToggle={handleDrawerToggle} />
        <Container
          maxWidth="xl"
          sx={{ mt: { xs: 3, sm: 4 }, px: { xs: 1.5, sm: 2, md: 3 } }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
              mb: { xs: 3, sm: 4 },
            }}
          >
            <Box>
              <Typography
                variant={isMobile ? "h5" : "h4"}
                sx={{ fontWeight: 700, color: theme.palette.text.primary }}
                marginTop={5} // Added margin if needed for spacing below Navbar
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
          </Box>
          <Stack
            direction="row"
            flexWrap="wrap"
            gap={{ xs: 2, sm: 2, md: 3 }}
            sx={{
              mb: { xs: 3, sm: 4 },
              "& > *": {
                flex: {
                  xs: "1 1 100%",
                  sm: "1 1 calc(50% - 12px)",
                  md: "1 1 calc(25% - 18px)",
                },
                minWidth: { xs: "100%", sm: "calc(50% - 12px)", md: 200 },
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
                variant={metric.variant}
                trend={metric.trend}
                changePercentage={metric.changePercentage}
                periodDescription={metric.periodDescription}
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
              mb: { xs: 3, sm: 4 },
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
                    px: { xs: 1.5, sm: 2, md: 3 },
                    fontSize: { xs: "0.875rem", sm: "0.95rem" },
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
              <CustomerTable
                customers={bookings}
                loading={loading}
                onRefresh={handleRefresh}
                onUpdateCustomer={handleUpdateBooking}
              />
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
              <CustomerTable
                customers={bookings.filter((b) => b.status === "in-progress")}
                loading={loading}
                onRefresh={handleRefresh}
                onUpdateCustomer={handleUpdateBooking}
              />
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
              <CustomerTable
                customers={bookings.filter((b) => b.status === "scheduled")}
                loading={loading}
                onRefresh={handleRefresh}
                onUpdateCustomer={handleUpdateBooking}
              />
            </TabPanel>
            <TabPanel value={activeTab} index={3}>
              <CustomerTable
                customers={bookings.filter(
                  (b) => b.status === "completed" || b.status === "cancelled"
                )}
                loading={loading}
                onRefresh={handleRefresh}
                onUpdateCustomer={handleUpdateBooking}
              />
            </TabPanel>
          </Card>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", lg: "row" },
              gap: { xs: 2, sm: 3 },
            }}
          >
            <Box sx={{ flex: { xs: "1 1 100%", lg: "2 1 0%" }, minWidth: 0 }}>
              <Card
                sx={{
                  borderRadius: theme.shape.borderRadius * 2,
                  p: { xs: 1.5, sm: 2, md: 3 },
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
                    flexDirection: { xs: "column", sm: "row" },
                    gap: { xs: 1, sm: 0 },
                  }}
                >
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    sx={{
                      fontWeight: 600,
                      textAlign: { xs: "center", sm: "left" },
                    }}
                  >
                    Completed Sales Trend
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<BarChart />}
                    sx={{ textTransform: "none" }}
                  >
                    View Reports
                  </Button>
                </Box>
                <Divider sx={{ mb: { xs: 2, sm: 3 } }} />
                <Box sx={{ height: { xs: 250, sm: 300 } }}>
                  {completedSalesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={completedSalesData}
                        margin={{
                          top: 5,
                          right: isMobile ? 5 : isTablet ? 15 : 30,
                          left: isMobile ? -30 : isTablet ? -20 : 0,
                          bottom: isMobile ? 20 : 5,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={theme.palette.divider}
                        />
                        <XAxis
                          dataKey="date"
                          stroke={theme.palette.text.secondary}
                          tickFormatter={formatDateTick}
                          angle={isMobile ? -45 : 0}
                          textAnchor={isMobile ? "end" : "middle"}
                          height={isMobile ? 60 : 30}
                          dy={isMobile ? 10 : 0}
                          interval={isMobile ? "preserveStartEnd" : 0}
                          tick={{ fontSize: isMobile ? 10 : 12 }}
                        />
                        <YAxis
                          stroke={theme.palette.text.secondary}
                          tickFormatter={(value) =>
                            `$${value >= 1000 ? value / 1000 + "k" : value}`
                          }
                          tick={{ fontSize: isMobile ? 10 : 12 }}
                          width={isMobile ? 45 : 60}
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
                            new Date(label + "T00:00:00Z").toLocaleDateString(
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
                          name="Completed Sales"
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
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        textAlign="center"
                        p={2}
                      >
                        No completed sales data available to display chart.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Card>
            </Box>

            <Box sx={{ flex: { xs: "1 1 100%", lg: "1 1 0%" }, minWidth: 0 }}>
              <Card
                sx={{
                  borderRadius: theme.shape.borderRadius * 2,
                  p: { xs: 1.5, sm: 2, md: 3 },
                  height: "100%",
                  boxShadow: `0 4px 20px ${alpha(
                    theme.palette.common.black,
                    0.05
                  )}`,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                    flexDirection: { xs: "column", sm: "row" },
                    gap: { xs: 1, sm: 0 },
                  }}
                >
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    sx={{
                      fontWeight: 600,
                      textAlign: { xs: "center", sm: "left" },
                    }}
                  >
                    Upcoming
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<CalendarMonth />}
                    sx={{ textTransform: "none" }}
                  >
                    View Calendar
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box
                  sx={{
                    flexGrow: 1,
                    height: { xs: 220, sm: 260 },
                    overflowY: "auto",
                    pr: 0.5,
                  }}
                >
                  {bookings
                    .filter(
                      (b) =>
                        b.status === "scheduled" &&
                        b.appointmentDate &&
                        new Date(b.appointmentDate + "T00:00:00Z") >=
                          new Date(new Date().toDateString())
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
                            alignItems: "center",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 600,
                              color: theme.palette.text.primary,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: {
                                xs: "calc(100% - 70px)",
                                sm: "calc(100% - 80px)",
                              },
                            }}
                            title={appointment.name}
                          >
                            {appointment.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: theme.palette.text.secondary,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {appointment.appointmentTime}
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
                            maxWidth: "100%",
                          }}
                          title={appointment.serviceType}
                        >
                          {appointment.serviceType}
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
                            <CalendarMonth
                              fontSize="small"
                              sx={{ fontSize: "0.9rem", mr: 0.5 }}
                            />
                            {new Date(
                              appointment.appointmentDate + "T00:00:00Z"
                            ).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </Typography>
                          {appointment.amount !== undefined && (
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: theme.palette.primary.dark,
                              }}
                            >
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                              }).format(appointment.amount)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  {bookings.filter(
                    (b) =>
                      b.status === "scheduled" &&
                      b.appointmentDate &&
                      new Date(b.appointmentDate + "T00:00:00Z") >=
                        new Date(new Date().toDateString())
                  ).length === 0 && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      textAlign="center"
                      sx={{ mt: 4 }}
                    >
                      No upcoming appointments.
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
                    mt: "auto",
                  }}
                >
                  View All Appointments
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
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 2.5 } }}>{children}</Box>
      )}
    </div>
  );
}

export default Dashboard;
