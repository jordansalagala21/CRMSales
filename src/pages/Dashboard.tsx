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
  BarChart,
  CalendarMonth,
  MonetizationOn,
  EventBusy,
  Download as DownloadIcon, // Icon for export
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

// --- Export Libraries ---
// Make sure to install papaparse: npm install papaparse
import Papa from "papaparse";
// --- End Export Libraries ---

// Helper function to format date for XAxis
const formatDateTick = (tickItem: string): string => {
  const date = new Date(tickItem + "T00:00:00Z"); // Ensure UTC interpretation
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
                const dateObj = new Date(data.appointmentDate);
                if (!isNaN(dateObj.getTime())) {
                  appointmentDateStr = dateObj.toISOString().split("T")[0];
                } else {
                  const tryAgainDateObj = new Date(
                    data.appointmentDate + "T00:00:00Z" // Ensure UTC parsing attempt
                  );
                  if (!isNaN(tryAgainDateObj.getTime())) {
                    appointmentDateStr = tryAgainDateObj
                      .toISOString()
                      .split("T")[0];
                  } else {
                    console.warn(
                      `Invalid date string from Firestore: ${data.appointmentDate}`
                    );
                    appointmentDateStr = "";
                  }
                }
              } catch (e) {
                console.warn(
                  `Error parsing date string from Firestore: ${data.appointmentDate}`,
                  e
                );
                appointmentDateStr = "";
              }
            }
          }
          return {
            id: docSnap.id,
            name: data.name || "",
            carMakeAndModel: data.carMakeAndModel || undefined,
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
      .sort(
        (a, b) =>
          new Date(a.date + "T00:00:00Z").getTime() -
          new Date(b.date + "T00:00:00Z").getTime()
      );
  }, [bookings]);

  const averageSaleValue = useMemo(() => {
    const completedBookings = bookings.filter(
      (b) => b.status === "completed" && typeof b.amount === "number"
    );
    if (completedBookings.length === 0) return 0;
    const totalRevenueFromCompleted = completedBookings.reduce(
      (sum, b) => sum + (b.amount || 0),
      0
    );
    return totalRevenueFromCompleted / completedBookings.length;
  }, [bookings]);

  const cancellationRate = useMemo(() => {
    if (bookings.length === 0) return 0;
    const cancelledBookings = bookings.filter((b) => b.status === "cancelled");
    return (cancelledBookings.length / bookings.length) * 100;
  }, [bookings]);

  // Data for the currently active table
  const currentTableData = useMemo(() => {
    if (activeTab === 0) return bookings;
    if (activeTab === 1)
      return bookings.filter((b) => b.status === "in-progress");
    if (activeTab === 2)
      return bookings.filter((b) => b.status === "scheduled");
    if (activeTab === 3)
      return bookings.filter(
        (b) => b.status === "completed" || b.status === "cancelled"
      );
    return [];
  }, [activeTab, bookings]);

  const tabTitles = useMemo(
    () => ["All Appointments", "In Progress", "Scheduled", "History"],
    []
  );

  // --- Export Functions ---
  const handleExportCSV = (
    data: BookingCustomer[],
    filenamePrefix: string = "appointments"
  ) => {
    if (!data || data.length === 0) {
      alert("No data to export for the current view.");
      return;
    }
    const sanitizedFilename = filenamePrefix.toLowerCase().replace(/\s+/g, "_");
    const filename = `${sanitizedFilename}_${
      new Date().toISOString().split("T")[0]
    }.csv`;

    // Define headers and map data
    const csvData = data.map((row) => ({
      ID: row.id,
      Name: row.name,
      "Car Make & Model": row.carMakeAndModel || "",
      Phone: row.phone,
      "Service Type": row.serviceType,
      "Appointment Date": row.appointmentDate,
      "Appointment Time": row.appointmentTime,
      Status: row.status,
      Amount: row.amount !== undefined ? row.amount.toString() : "",
      Notes: row.notes || "",
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };
  // --- End Export Functions ---

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

      if (dataToUpdate.hasOwnProperty("appointmentDate")) {
        if (
          dataToUpdate.appointmentDate &&
          typeof dataToUpdate.appointmentDate === "string"
        ) {
          try {
            const dateObj = new Date(dataToUpdate.appointmentDate);
            if (!isNaN(dateObj.getTime())) {
              dataToUpdate.appointmentDate = dateObj
                .toISOString()
                .split("T")[0];
            } else {
              const tryAgainDateObj = new Date(
                dataToUpdate.appointmentDate + "T00:00:00Z"
              );
              if (!isNaN(tryAgainDateObj.getTime())) {
                dataToUpdate.appointmentDate = tryAgainDateObj
                  .toISOString()
                  .split("T")[0];
              } else {
                console.warn(
                  `Invalid appointmentDate for update: ${dataToUpdate.appointmentDate}`
                );
                delete dataToUpdate.appointmentDate; // Don't update if invalid
              }
            }
          } catch (e) {
            console.warn(
              `Error parsing appointmentDate for update: ${dataToUpdate.appointmentDate}`
            );
            delete dataToUpdate.appointmentDate; // Don't update if error
          }
        } else if (!dataToUpdate.appointmentDate) {
          dataToUpdate.appointmentDate = null;
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

      if (Object.keys(dataToUpdate).length > 0) {
        await updateDoc(bookingDocRef, dataToUpdate);
      }

      setBookings((prevBookings) =>
        prevBookings.map((b) =>
          b.id === updatedBooking.id ? updatedBooking : b
        )
      );
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
                const dateObj = new Date(data.appointmentDate);
                if (!isNaN(dateObj.getTime())) {
                  appointmentDateStr = dateObj.toISOString().split("T")[0];
                } else {
                  const tryAgainDateObj = new Date(
                    data.appointmentDate + "T00:00:00Z"
                  );
                  if (!isNaN(tryAgainDateObj.getTime())) {
                    appointmentDateStr = tryAgainDateObj
                      .toISOString()
                      .split("T")[0];
                  } else {
                    console.warn(
                      `Invalid date string from Firestore on refresh: ${data.appointmentDate}`
                    );
                    appointmentDateStr = "";
                  }
                }
              } catch (e) {
                console.warn(
                  `Error parsing date string from Firestore on refresh: ${data.appointmentDate}`,
                  e
                );
                appointmentDateStr = "";
              }
            }
          }
          return {
            id: docSnap.id,
            name: data.name || "",
            carMakeAndModel: data.carMakeAndModel || undefined,
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
      trend: "up" as "up" | "down" | "neutral",
      changePercentage: bookings.length > 10 ? 5.2 : 1.1,
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
      trend: "up" as "up" | "down" | "neutral",
      changePercentage: 12.5,
      periodDescription: "since last month",
    },
    {
      title: "Avg. Sale Value",
      value: `$${averageSaleValue.toFixed(2)}`,
      icon: MonetizationOn,
      color: theme.palette.info.main,
      variant: "subtle" as "filled" | "outlined" | "subtle",
      trend:
        averageSaleValue > 50 ? "up" : ("down" as "up" | "down" | "neutral"),
      changePercentage: parseFloat(
        (averageSaleValue > 50 ? 2.1 : -1.5).toFixed(1)
      ),
      periodDescription: "avg. per sale",
    },
    {
      title: "Cancellation Rate",
      value: `${cancellationRate.toFixed(1)}%`,
      icon: EventBusy,
      color: theme.palette.error.main,
      variant: "subtle" as "filled" | "outlined" | "subtle",
      trend:
        cancellationRate < 10 ? "down" : ("up" as "up" | "down" | "neutral"),
      changePercentage: parseFloat(
        (cancellationRate < 10 ? -0.5 : 1.2).toFixed(1)
      ),
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
          sx={{
            mt: {
              xs: `calc(64px + ${theme.spacing(2)})`,
              sm: `calc(64px + ${theme.spacing(2)})`,
              md: `calc(64px + ${theme.spacing(2)})`,
            },
            px: { xs: 1.5, sm: 2, md: 3 },
          }}
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
                sx={{
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  mt: theme.spacing(0),
                }}
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
              overflow: "visible",
              boxShadow: `0 4px 20px ${alpha(
                theme.palette.common.black,
                0.05
              )}`,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              mb: { xs: 3, sm: 4 },
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: "space-between",
                alignItems: { xs: "stretch", sm: "center" },
                borderBottom: 1,
                borderColor: "divider",
                p: { xs: 1, sm: 0 },
              }}
            >
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  px: { xs: 0, sm: 2 },
                  flexGrow: 1,
                  "& .MuiTab-root": {
                    minHeight: 48,
                    px: { xs: 1.5, sm: 2, md: 3 },
                    fontSize: { xs: "0.875rem", sm: "0.95rem" },
                    fontWeight: 500,
                    textTransform: "capitalize",
                  },
                }}
              >
                {tabTitles.map((title, index) => (
                  <Tab key={index} label={title} />
                ))}
              </Tabs>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: { xs: "stretch", sm: "flex-end" },
                  p: { xs: 1, sm: 1.5 },
                  gap: 1,
                }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() =>
                    handleExportCSV(currentTableData, tabTitles[activeTab])
                  }
                  disabled={loading || currentTableData.length === 0}
                  fullWidth={isMobile}
                >
                  CSV
                </Button>
                {/* PDF Button Removed */}
              </Box>
            </Box>

            <TabPanel value={activeTab} index={0}>
              <CustomerTable
                customers={currentTableData}
                loading={loading}
                onRefresh={handleRefresh}
                onUpdateCustomer={handleUpdateBooking}
              />
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
              <CustomerTable
                customers={currentTableData}
                loading={loading}
                onRefresh={handleRefresh}
                onUpdateCustomer={handleUpdateBooking}
              />
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
              <CustomerTable
                customers={currentTableData}
                loading={loading}
                onRefresh={handleRefresh}
                onUpdateCustomer={handleUpdateBooking}
              />
            </TabPanel>
            <TabPanel value={activeTab} index={3}>
              <CustomerTable
                customers={currentTableData}
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
                    {" "}
                    View Reports{" "}
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
                          interval={
                            isMobile && completedSalesData.length > 7
                              ? "preserveStartEnd"
                              : 0
                          }
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
                          labelFormatter={(label: string) => {
                            const date = new Date(label + "T00:00:00Z");
                            return date.toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            });
                          }}
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
                    {" "}
                    View Calendar{" "}
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
                        new Date(a.appointmentDate + "T00:00:00Z").getTime() -
                        new Date(b.appointmentDate + "T00:00:00Z").getTime()
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
                          cursor: "pointer",
                          transition: "all 0.2s ease-in-out",
                          [theme.breakpoints.up("md")]: {
                            "&:hover": {
                              bgcolor: alpha(theme.palette.primary.main, 0.08),
                              boxShadow: theme.shadows[2],
                            },
                          },
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
                            {" "}
                            {appointment.name}{" "}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: theme.palette.text.secondary,
                              whiteSpace: "nowrap",
                            }}
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
                            maxWidth: "100%",
                          }}
                          title={appointment.serviceType}
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
                            <CalendarMonth
                              fontSize="small"
                              sx={{ fontSize: "0.9rem", mr: 0.5 }}
                            />
                            {appointment.appointmentDate
                              ? new Date(
                                  appointment.appointmentDate + "T00:00:00Z"
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "N/A"}
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
