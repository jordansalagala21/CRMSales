import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Paper, // Changed from Card to Paper for chart containers for a slightly different feel, can be Card too
  useTheme,
  alpha,
  CircularProgress,
} from "@mui/material";

// Extend MUI Theme to include custom property
import type { Theme as MuiTheme } from "@mui/material/styles";

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
// It's good practice to alias imported components if they might conflict with standard HTML elements or other libraries
import {
  BarChart as RechartsBarChart,
  PieChart as RechartsPieChart,
  LineChart as RechartsLineChart,
} from "recharts";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  Pie,
  Cell,
  Sector,
} from "recharts";

import Sidebar from "../components/Sidebar"; // Adjust path as needed
import Navbar from "../components/Navbar"; // Adjust path as needed

// Firestore imports
import { db } from "../firebase/firebase"; // Adjust path as needed
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

// Assuming BookingCustomer type is defined in a shared location or CustomerTable export
import { type BookingCustomer } from "../components/CustomerTable"; // Adjust path for BookingCustomer type

// Helper function to format date for XAxis (Month Year)
const formatMonthYearTick = (tickItem: string): string => {
  // Assuming tickItem is "YYYY-MM"
  const [year, month] = tickItem.split("-");
  if (!year || !month) return "Invalid Date";
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
};

// Consistent colors for charts
const CHART_COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#AF19FF",
  "#FF4560",
  "#775DD0",
  "#FEB019",
  "#00E396",
  "#0090FF",
  "#FF66C3",
  "#F4A261",
];

const CHART_HEIGHT = 380; // Define a consistent height for charts

// Custom Active Shape for Pie Chart (from your previous example, slightly adapted)
const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 8) * cos; // Reduced distance for active shape line
  const sy = cy + (outerRadius + 8) * sin;
  const mx = cx + (outerRadius + 20) * cos; // Reduced distance
  const my = cy + (outerRadius + 20) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 18; // Reduced distance
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <text
        x={cx}
        y={cy}
        dy={4}
        textAnchor="middle"
        fill={fill}
        fontWeight="bold"
        fontSize="14px"
      >
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: `drop-shadow(0px 2px 4px ${alpha(fill, 0.5)})` }}
      />
      <Sector // Outer ring for active emphasis
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 4}
        outerRadius={outerRadius + 8}
        fill={fill}
      />
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={3} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 10}
        y={ey}
        textAnchor={textAnchor}
        fill={props.theme.palette.text.primary}
        fontSize="12px"
      >{`Count: ${value}`}</text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 10}
        y={ey}
        dy={16}
        textAnchor={textAnchor}
        fill={props.theme.palette.text.secondary}
        fontSize="11px"
      >
        {`(Rate: ${(percent * 100).toFixed(1)}%)`}
      </text>
    </g>
  );
};

const Analytics: React.FC = () => {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookings, setBookings] = useState<BookingCustomer[]>([]);
  const [activePieIndex, setActivePieIndex] = useState<number>(0);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const appointmentsCollectionRef = collection(db, "appointments");
        // Fetching all bookings, consider adding filters or limits if data grows large
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
                // Validate or parse date string carefully
                const parsedDate = new Date(data.appointmentDate);
                if (!isNaN(parsedDate.getTime())) {
                  appointmentDateStr = parsedDate.toISOString().split("T")[0];
                } else {
                  console.warn(
                    `Invalid date string for analytics: ${data.appointmentDate}`
                  );
                  appointmentDateStr = ""; // Fallback for invalid date string
                }
              } catch (e) {
                console.warn(
                  `Error parsing date string for analytics: ${data.appointmentDate}`,
                  e
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
            serviceType: data.serviceType || "Unknown Service",
            appointmentDate: appointmentDateStr,
            appointmentTime: data.appointmentTime || "",
            status: data.status || "Unknown",
            amount: data.amount !== undefined ? Number(data.amount) : 0,
          } as BookingCustomer;
        });
        setBookings(fetchedBookings);
      } catch (error) {
        console.error("Error fetching bookings for analytics: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  // 1. Monthly Revenue Data
  const monthlyRevenueData = useMemo(() => {
    const revenueByMonth: { [monthYear: string]: number } = {};
    bookings
      .filter((b) => b.status === "completed" && b.amount && b.appointmentDate)
      .forEach((booking) => {
        if (!booking.appointmentDate) return; // Skip if no date
        try {
          const date = new Date(booking.appointmentDate + "T00:00:00Z"); // Ensure UTC context
          const monthYear = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}`;
          revenueByMonth[monthYear] =
            (revenueByMonth[monthYear] || 0) + (booking.amount || 0);
        } catch (e) {
          console.warn(
            "Error processing date for monthly revenue: ",
            booking.appointmentDate,
            e
          );
        }
      });

    return Object.keys(revenueByMonth)
      .map((monthYear) => ({
        month: monthYear,
        revenue: revenueByMonth[monthYear],
      }))
      .sort(
        (a, b) =>
          new Date(a.month + "-01").getTime() -
          new Date(b.month + "-01").getTime()
      ); // Ensure correct date sort
  }, [bookings]);

  // 2. Bookings by Service Type Data
  const serviceTypeDistributionData = useMemo(() => {
    const countByServiceType: { [service: string]: number } = {};
    bookings.forEach((booking) => {
      const service = booking.serviceType || "Unknown Service";
      countByServiceType[service] = (countByServiceType[service] || 0) + 1;
    });
    return Object.keys(countByServiceType)
      .map((service) => ({
        name: service,
        value: countByServiceType[service],
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
  }, [bookings]);

  // 3. Booking Status Distribution Data
  const bookingStatusData = useMemo(() => {
    const countByStatus: { [status: string]: number } = {};
    bookings.forEach((booking) => {
      const status = booking.status || "Unknown";
      countByStatus[status] = (countByStatus[status] || 0) + 1;
    });
    return Object.keys(countByStatus)
      .map((status) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        count: countByStatus[status],
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [bookings]);

  // 4. Revenue by Service Type Data
  const revenueByServiceTypeData = useMemo(() => {
    const revenueByService: { [service: string]: number } = {};
    bookings
      .filter(
        (b) =>
          b.status === "completed" &&
          typeof b.amount === "number" &&
          b.amount > 0
      )
      .forEach((booking) => {
        const service = booking.serviceType || "Unknown Service";
        revenueByService[service] =
          (revenueByService[service] || 0) + (booking.amount || 0);
      });
    return Object.keys(revenueByService)
      .map((service) => ({
        name: service,
        revenue: revenueByService[service],
      }))
      .sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending
  }, [bookings]);

  const onPieEnter = (_: any, index: number) => {
    setActivePieIndex(index);
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
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading Analytics...
        </Typography>
      </Box>
    );
  }

  const renderChartContainer = (
    title: string,
    chartContent: React.ReactNode,
    dataAvailable: boolean
  ) => (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: theme.shape.borderRadius * 2, // Softer corners
        height: "100%", // Ensure paper takes full height of flex item
        display: "flex",
        flexDirection: "column",
        boxShadow: theme.shadows[3],
        "&:hover": {
          boxShadow: theme.shadows[6],
        },
      }}
    >
      <Typography
        variant="h6"
        gutterBottom
        sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}
      >
        {title}
      </Typography>
      {dataAvailable ? (
        <Box
          sx={{ flexGrow: 1, height: CHART_HEIGHT, minHeight: CHART_HEIGHT }}
        >
          {chartContent}
        </Box>
      ) : (
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: CHART_HEIGHT,
            minHeight: CHART_HEIGHT,
          }}
        >
          <Typography color="text.secondary">
            No data available for this chart.
          </Typography>
        </Box>
      )}
    </Paper>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        width: "100vw", // Ensure full viewport width
        bgcolor:
          theme.palette.mode === "dark"
            ? alpha(theme.palette.grey[900], 0.95)
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
          overflowY: "auto", // Allow vertical scroll within the main content area
          width: { sm: `calc(100% - ${theme.custom?.drawerWidth || 240}px)` },
          marginTop: 5, // Adjust width if drawer is persistent
        }}
      >
        <Navbar handleDrawerToggle={handleDrawerToggle} />
        <Container
          maxWidth={false}
          sx={{ mt: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3, md: 4 } }}
        >
          <Typography
            variant="h4"
            sx={{
              mb: { xs: 3, sm: 4 },
              fontWeight: 700,
              color: theme.palette.text.primary,
              mt: { xs: 3, sm: 0 },
            }}
          >
            Analytics Overview
          </Typography>

          {/* Flex container for charts */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: { xs: 2, sm: 3 }, // Gap between chart items
            }}
          >
            {/* Chart 1: Monthly Revenue Trend - Takes full width on small, half on medium+ */}
            <Box
              sx={{
                flexBasis: { xs: "100%", md: "calc(50% - 12px)" },
                flexGrow: 1,
                minWidth: { xs: "100%", sm: 300 },
              }}
            >
              {renderChartContainer(
                "Monthly Revenue Trend",
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={monthlyRevenueData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={theme.palette.divider}
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonthYearTick}
                      stroke={theme.palette.text.secondary}
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        `$${value >= 1000 ? `${value / 1000}k` : value}`
                      }
                      stroke={theme.palette.text.secondary}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `$${value.toFixed(2)}`,
                        "Revenue",
                      ]}
                      contentStyle={{
                        backgroundColor: alpha(
                          theme.palette.background.paper,
                          0.9
                        ),
                        borderRadius: theme.shape.borderRadius,
                      }}
                      itemStyle={{ color: theme.palette.primary.main }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke={theme.palette.primary.main}
                      strokeWidth={2.5}
                      activeDot={{ r: 7 }}
                      dot={{ r: 4 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>,
                monthlyRevenueData.length > 0
              )}
            </Box>

            {/* Chart 2: Bookings by Service Type - Takes full width on small, half on medium+ */}
            <Box
              sx={{
                flexBasis: { xs: "100%", md: "calc(50% - 12px)" },
                flexGrow: 1,
                minWidth: { xs: "100%", sm: 300 },
              }}
            >
              {renderChartContainer(
                "Bookings by Service Type",
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      activeIndex={activePieIndex}
                      activeShape={(props: any) =>
                        renderActiveShape({ ...props, theme: theme })
                      } // Pass theme to active shape
                      data={serviceTypeDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={CHART_HEIGHT * 0.15}
                      outerRadius={CHART_HEIGHT * 0.28}
                      fill={theme.palette.secondary.main}
                      dataKey="value"
                      onMouseEnter={onPieEnter}
                      paddingAngle={1}
                    >
                      {serviceTypeDistributionData.map((entry, index) => (
                        <Cell
                          key={`cell-service-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} bookings (${(
                          (value / bookings.length) *
                          100
                        ).toFixed(1)}%)`,
                        name,
                      ]}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>,
                serviceTypeDistributionData.length > 0
              )}
            </Box>

            {/* Chart 3: Booking Status Distribution - Takes full width on small, half on medium+ */}
            <Box
              sx={{
                flexBasis: { xs: "100%", md: "calc(50% - 12px)" },
                flexGrow: 1,
                minWidth: { xs: "100%", sm: 300 },
              }}
            >
              {renderChartContainer(
                "Booking Status Distribution",
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={bookingStatusData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={theme.palette.divider}
                    />
                    <XAxis
                      type="number"
                      stroke={theme.palette.text.secondary}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      stroke={theme.palette.text.secondary}
                    />
                    <Tooltip
                      formatter={(value: number) => [value, "Bookings"]}
                    />
                    <Legend />
                    <Bar dataKey="count" name="Number of Bookings" barSize={25}>
                      {bookingStatusData.map((entry, index) => (
                        <Cell
                          key={`cell-status-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>,
                bookingStatusData.length > 0
              )}
            </Box>

            {/* Chart 4: Revenue by Service Type - Takes full width on small, half on medium+ */}
            <Box
              sx={{
                flexBasis: { xs: "100%", md: "calc(50% - 12px)" },
                flexGrow: 1,
                minWidth: { xs: "100%", sm: 300 },
              }}
            >
              {renderChartContainer(
                "Revenue by Service Type",
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={revenueByServiceTypeData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={theme.palette.divider}
                    />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-40}
                      textAnchor="end"
                      height={90}
                      stroke={theme.palette.text.secondary}
                      tick={{ fontSize: "0.75rem" }}
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        `$${value >= 1000 ? `${value / 1000}k` : value}`
                      }
                      stroke={theme.palette.text.secondary}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `$${value.toFixed(2)}`,
                        "Revenue",
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{ lineHeight: "40px" }}
                    />
                    <Bar dataKey="revenue" name="Total Revenue" barSize={30}>
                      {revenueByServiceTypeData.map((entry, index) => (
                        <Cell
                          key={`cell-rev-service-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>,
                revenueByServiceTypeData.length > 0
              )}
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Analytics;
