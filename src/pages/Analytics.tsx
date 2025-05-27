import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  useTheme,
  alpha,
  CircularProgress,
  useMediaQuery, // Import useMediaQuery
} from "@mui/material";
import // BarChart as RechartsBarChart, // Not explicitly used as a type, RechartsLineChart etc. are used directly
// PieChart as RechartsPieChart,
// LineChart as RechartsLineChart,
"recharts"; // Grouping imports like this is fine if not using the specific types
import {
  LineChart, // Explicitly named import
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart, // Explicitly named import
  Bar,
  PieChart, // Explicitly named import
  Pie,
  Cell,
  Sector,
} from "recharts";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

// Firestore imports
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

import { type BookingCustomer } from "../components/CustomerTable";

// MUI Theme extension (ensure this is correctly defined globally or per usage)
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

const formatMonthYearTick = (tickItem: string): string => {
  if (!tickItem || typeof tickItem !== "string" || !tickItem.includes("-"))
    return "N/A";
  const [year, month] = tickItem.split("-");
  if (!year || !month) return "N/A";
  const date = new Date(parseInt(year), parseInt(month) - 1);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
};

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

const BASE_CHART_HEIGHT = 380; // Base height for larger screens

// Custom Bar shape for rounded corners on vertical bars
const RoundedBar = (props: any) => {
  const { fill, x, y, width, height } = props;
  const radius = Math.min(width, height) > 20 ? 6 : 3; // Smaller radius for smaller bars

  // Ensure radius doesn't exceed half of width or height for vertical bars
  const R = Math.min(radius, width / 2, height / 2);

  if (height === 0) return null; // Don't render if height is 0

  return (
    <path
      d={`M${x},${y + R}
         A${R},${R} 0 0 1 ${x + R},${y}
         L${x + width - R},${y}
         A${R},${R} 0 0 1 ${x + width},${y + R}
         L${x + width},${y + height}
         L${x},${y + height}
         Z`} // Simplified for top-rounded vertical bars
      fill={fill}
    />
  );
};

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
    theme: muiTheme,
    isMobilePie, // Pass muiTheme and isMobilePie
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  // Adjustments for mobile to make callouts less cluttered
  const outerRadiusOffset = isMobilePie ? 4 : 6;
  const labelLineOffset = isMobilePie ? 12 : 18;
  const labelTextOffset = isMobilePie ? 8 : 15;
  const valueFontSize = isMobilePie ? "0.7rem" : "0.8rem";
  const percentFontSize = isMobilePie ? "0.7rem" : "0.75rem";

  const sx = cx + (outerRadius + outerRadiusOffset) * cos;
  const sy = cy + (outerRadius + outerRadiusOffset) * sin;
  const mx = cx + (outerRadius + labelLineOffset) * cos;
  const my = cy + (outerRadius + labelLineOffset) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * labelTextOffset;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      {/* Removed text from the center of the pie chart */}
      {/* <text x={cx} y={cy} dy={4} textAnchor="middle" fill={fill} fontWeight="bold" fontSize="1rem">
        {payload.name}
      </text> */}
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
        innerRadius={outerRadius + (isMobilePie ? 2 : 4)}
        outerRadius={outerRadius + (isMobilePie ? 4 : 8)}
        fill={fill}
        opacity={0.7}
      />
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle
        cx={ex}
        cy={ey}
        r={isMobilePie ? 2 : 3}
        fill={fill}
        stroke="none"
      />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * (isMobilePie ? 6 : 10)}
        y={ey}
        textAnchor={textAnchor}
        fill={muiTheme.palette.text.primary}
        fontSize={valueFontSize}
        fontWeight="500"
      >{`${payload.name}: ${value}`}</text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * (isMobilePie ? 6 : 10)}
        y={ey}
        dy={isMobilePie ? 12 : 16}
        textAnchor={textAnchor}
        fill={muiTheme.palette.text.secondary}
        fontSize={percentFontSize}
      >
        {`(Rate: ${(percent * 100).toFixed(1)}%)`}
      </text>
    </g>
  );
};

const Analytics: React.FC = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm")); // For phone-specific adjustments
  const isMediumScreen = useMediaQuery(theme.breakpoints.down("md")); // For tablet and phone adjustments

  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookings, setBookings] = useState<BookingCustomer[]>([]);
  const [activePieIndex, setActivePieIndex] = useState<number>(0);

  // Responsive chart height
  const dynamicChartHeight = isMediumScreen ? 320 : BASE_CHART_HEIGHT;

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const appointmentsCollectionRef = collection(db, "appointments");
        const q = query(
          appointmentsCollectionRef,
          orderBy("appointmentDate", "desc") // Fetching all, filtering client-side
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
                if (!isNaN(parsedDate.getTime())) {
                  appointmentDateStr = parsedDate.toISOString().split("T")[0];
                } else {
                  // Try appending T00:00:00Z for "YYYY-MM-DD" strings
                  const dateWithTime = new Date(
                    data.appointmentDate + "T00:00:00Z"
                  );
                  if (!isNaN(dateWithTime.getTime())) {
                    appointmentDateStr = dateWithTime
                      .toISOString()
                      .split("T")[0];
                  } else {
                    console.warn(
                      `Invalid date string for analytics: ${data.appointmentDate}`
                    );
                    appointmentDateStr = ""; // Fallback
                  }
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

  const monthlyRevenueData = useMemo(() => {
    const revenueByMonth: { [monthYear: string]: number } = {};
    bookings
      .filter((b) => b.status === "completed" && b.amount && b.appointmentDate)
      .forEach((booking) => {
        if (!booking.appointmentDate) return;
        try {
          const date = new Date(booking.appointmentDate + "T00:00:00Z"); // Ensure UTC for consistency
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
          new Date(a.month + "-01T00:00:00Z").getTime() -
          new Date(b.month + "-01T00:00:00Z").getTime()
      )
      .slice(-12); // Show last 12 months
  }, [bookings]);

  const serviceTypeDistributionData = useMemo(() => {
    const countByServiceType: { [service: string]: number } = {};
    bookings.forEach((booking) => {
      const service = booking.serviceType || "Unknown Service";
      countByServiceType[service] = (countByServiceType[service] || 0) + 1;
    });
    return Object.keys(countByServiceType)
      .map((service) => ({ name: service, value: countByServiceType[service] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Show top 10 service types
  }, [bookings]);

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
      .sort((a, b) => b.count - a.count);
  }, [bookings]);

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
      .map((service) => ({ name: service, revenue: revenueByService[service] }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Show top 10 revenue generating services
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
        <CircularProgress size={50} />
        <Typography variant="h6" sx={{ mt: 2.5, color: "text.secondary" }}>
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
        p: { xs: 1.5, sm: 2, md: 2.5 }, // Responsive padding
        borderRadius: theme.shape.borderRadius * 2, // Consistent rounding
        height: "100%", // Fill available height from flex item
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow:
          theme.palette.mode === "dark"
            ? `0 6px 16px ${alpha(theme.palette.common.black, 0.25)}` // Enhanced shadow for dark mode
            : `0 6px 16px ${alpha(theme.palette.grey[400], 0.15)}`, // Softer shadow for light mode
        transition: theme.transitions.create(["box-shadow", "transform"], {
          duration: theme.transitions.duration.short,
        }),
        "&:hover": !isMediumScreen
          ? {
              // Disable hover transform on touch devices potentially
              boxShadow:
                theme.palette.mode === "dark"
                  ? `0 10px 24px ${alpha(theme.palette.common.black, 0.3)}`
                  : `0 10px 24px ${alpha(theme.palette.grey[500], 0.2)}`,
              transform: "translateY(-3px)",
            }
          : {},
      }}
    >
      <Typography
        variant={isSmallScreen ? "subtitle1" : "h6"}
        sx={{
          fontWeight: 600,
          color: theme.palette.text.primary,
          mb: 2,
          textAlign: "center",
        }}
      >
        {title}
      </Typography>
      {dataAvailable ? (
        <Box
          sx={{
            flexGrow: 1,
            height: dynamicChartHeight,
            minHeight: dynamicChartHeight,
          }}
        >
          {" "}
          {/* Use dynamicChartHeight */}
          {chartContent}
        </Box>
      ) : (
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: dynamicChartHeight,
            minHeight: dynamicChartHeight,
            color: theme.palette.text.secondary,
            p: 2,
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: isSmallScreen ? 30 : 40, mb: 1 }} />
          <Typography
            variant={isSmallScreen ? "body2" : "body1"}
            textAlign="center"
          >
            No data available for this chart.
          </Typography>
        </Box>
      )}
    </Paper>
  );

  const commonTooltipStyle = {
    backgroundColor: alpha(theme.palette.background.paper, 0.95),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
    boxShadow: theme.shadows[2],
    fontSize: isSmallScreen ? "0.8rem" : "0.9rem",
  };
  const commonItemStyle = {
    color: theme.palette.text.primary,
    fontWeight: 500,
  };
  const commonLegendStyle = {
    paddingTop: isSmallScreen ? "8px" : "15px",
    fontSize: isSmallScreen ? "0.75rem" : "0.85rem",
  };

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
          pb: { xs: 3, sm: 4, md: 6 }, // Adjusted padding bottom
          overflowY: "auto",
          width: { sm: `calc(100% - ${theme.custom?.drawerWidth || 240}px)` },
          // Removed fixed marginTop: 6, will handle with Container's mt
        }}
      >
        <Navbar handleDrawerToggle={handleDrawerToggle} />
        <Container
          maxWidth={false} // Use full width available
          sx={{
            // Consistent spacing from Navbar, assuming Navbar height around 64px
            mt: {
              xs: `calc(56px + ${theme.spacing(2)})`, // Navbar height on mobile might be 56px
              sm: `calc(64px + ${theme.spacing(2.5)})`, // Standard Navbar height + gap
            },
            px: { xs: 1.5, sm: 2.5, md: 3.5 }, // Responsive padding
          }}
        >
          <Typography
            variant={isSmallScreen ? "h5" : "h4"}
            sx={{
              mb: { xs: 2.5, sm: 3, md: 4 },
              fontWeight: 700,
              color: theme.palette.text.primary,
              textAlign: { xs: "center", sm: "left" },
            }}
          >
            Analytics Overview
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: { xs: 2, sm: 2.5, md: 3 },
            }}
          >
            {" "}
            {/* Grid-like layout */}
            {/* Monthly Revenue Trend */}
            <Box
              sx={{
                flex: { xs: "1 1 100%", md: "1 1 calc(50% - 12px)" },
                minWidth: { xs: "100%", sm: 300 },
              }}
            >
              {renderChartContainer(
                "Monthly Revenue Trend",
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyRevenueData}
                    margin={{
                      top: 10,
                      right: isSmallScreen ? 15 : 30,
                      left: isSmallScreen ? 5 : 20,
                      bottom: 5,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="revenueGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={theme.palette.primary.main}
                          stopOpacity={0.7}
                        />
                        <stop
                          offset="95%"
                          stopColor={theme.palette.primary.main}
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={alpha(theme.palette.divider, 0.5)}
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonthYearTick}
                      stroke={theme.palette.text.secondary}
                      dy={5}
                      tick={{ fontSize: isSmallScreen ? "0.7rem" : "0.8rem" }}
                      interval={
                        isSmallScreen
                          ? Math.floor(monthlyRevenueData.length / 4)
                          : undefined
                      }
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        `$${value >= 1000 ? `${value / 1000}k` : value}`
                      }
                      stroke={theme.palette.text.secondary}
                      dx={-5}
                      tick={{ fontSize: isSmallScreen ? "0.7rem" : "0.8rem" }}
                      width={isSmallScreen ? 45 : 60}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `$${value.toFixed(2)}`,
                        "Revenue",
                      ]}
                      contentStyle={commonTooltipStyle}
                      itemStyle={{
                        color: theme.palette.primary.main,
                        fontWeight: "bold",
                      }}
                      cursor={{
                        fill: alpha(theme.palette.text.secondary, 0.05),
                      }}
                    />
                    <Legend wrapperStyle={commonLegendStyle} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke={theme.palette.primary.main}
                      strokeWidth={2.5}
                      activeDot={{ r: 7, strokeWidth: 1.5 }}
                      dot={{ r: 4 }}
                      fill="url(#revenueGradient)"
                    />
                  </LineChart>
                </ResponsiveContainer>,
                monthlyRevenueData.length > 0
              )}
            </Box>
            {/* Bookings by Service Type */}
            <Box
              sx={{
                flex: { xs: "1 1 100%", md: "1 1 calc(50% - 12px)" },
                minWidth: { xs: "100%", sm: 300 },
              }}
            >
              {renderChartContainer(
                "Bookings by Service Type",
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart
                    margin={{
                      top: isSmallScreen ? 35 : 20,
                      right: 5,
                      // Increased bottom margin for small screens to give legend more space
                      bottom: isSmallScreen ? 25 : 15,
                      left: 5,
                    }}
                  >
                    <Pie
                      activeIndex={activePieIndex}
                      activeShape={(props: any) =>
                        renderActiveShape({
                          ...props,
                          theme: theme,
                          isMobilePie: isSmallScreen,
                        })
                      }
                      data={serviceTypeDistributionData}
                      cx="50%"
                      cy="50%"
                      // Adjusted radii for a slightly smaller pie on mobile to fit better
                      innerRadius={
                        dynamicChartHeight * (isSmallScreen ? 0.2 : 0.25)
                      }
                      outerRadius={
                        dynamicChartHeight * (isSmallScreen ? 0.3 : 0.35)
                      }
                      fill={theme.palette.secondary.main}
                      dataKey="value"
                      onMouseEnter={onPieEnter}
                      paddingAngle={1.5}
                    >
                      {serviceTypeDistributionData.map((_entry, index) => (
                        <Cell
                          key={`cell-service-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          stroke={theme.palette.background.paper}
                          strokeWidth={1}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const totalForPercentage =
                          serviceTypeDistributionData.reduce(
                            (sum, item) => sum + item.value,
                            0
                          );
                        const percentage =
                          totalForPercentage > 0
                            ? ((value / totalForPercentage) * 100).toFixed(1)
                            : 0;
                        return [`Count: ${value} (${percentage}%)`, name];
                      }}
                      contentStyle={commonTooltipStyle}
                      itemStyle={commonItemStyle}
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={commonLegendStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>,
                serviceTypeDistributionData.length > 0
              )}
            </Box>
            {/* Booking Status Distribution */}
            <Box
              sx={{
                flex: { xs: "1 1 100%", md: "1 1 calc(50% - 12px)" },
                minWidth: { xs: "100%", sm: 300 },
              }}
            >
              {renderChartContainer(
                "Booking Status Distribution",
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={bookingStatusData}
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: isSmallScreen ? 15 : 30,
                      left: isSmallScreen ? 70 : 90,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={alpha(theme.palette.divider, 0.5)}
                    />
                    <XAxis
                      type="number"
                      stroke={theme.palette.text.secondary}
                      tick={{ fontSize: isSmallScreen ? "0.7rem" : "0.8rem" }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={isSmallScreen ? 60 : 80}
                      stroke={theme.palette.text.secondary}
                      tick={{
                        fontSize: isSmallScreen ? "0.7rem" : "0.8rem",
                        width: isSmallScreen ? 55 : 75,
                      }}
                      style={{ textOverflow: "ellipsis" }}
                    />
                    <Tooltip
                      formatter={(value: number) => [value, "Bookings"]}
                      contentStyle={commonTooltipStyle}
                      itemStyle={commonItemStyle}
                      cursor={{
                        fill: alpha(theme.palette.text.secondary, 0.05),
                      }}
                    />
                    <Legend wrapperStyle={commonLegendStyle} />
                    <Bar
                      dataKey="count"
                      name="Bookings"
                      shape={<RoundedBar />}
                      barSize={isSmallScreen ? 12 : 18}
                    >
                      {bookingStatusData.map((_entry, index) => (
                        <Cell
                          key={`cell-status-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>,
                bookingStatusData.length > 0
              )}
            </Box>
            {/* Revenue by Service Type */}
            <Box
              sx={{
                flex: { xs: "1 1 100%", md: "1 1 calc(50% - 12px)" },
                minWidth: { xs: "100%", sm: 300 },
              }}
            >
              {renderChartContainer(
                "Revenue by Service Type",
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={revenueByServiceTypeData}
                    margin={{
                      top: 10,
                      right: isSmallScreen ? 15 : 30,
                      left: isSmallScreen ? 5 : 20,
                      bottom: isSmallScreen ? 65 : 75,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={alpha(theme.palette.divider, 0.5)}
                    />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-40}
                      textAnchor="end"
                      height={isSmallScreen ? 60 : 70}
                      stroke={theme.palette.text.secondary}
                      tick={{ fontSize: isSmallScreen ? "0.7rem" : "0.8rem" }}
                      dy={5}
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        `$${value >= 1000 ? `${value / 1000}k` : value}`
                      }
                      stroke={theme.palette.text.secondary}
                      dx={-5}
                      tick={{ fontSize: isSmallScreen ? "0.7rem" : "0.8rem" }}
                      width={isSmallScreen ? 45 : 60}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `$${value.toFixed(2)}`,
                        "Revenue",
                      ]}
                      contentStyle={commonTooltipStyle}
                      itemStyle={commonItemStyle}
                      cursor={{
                        fill: alpha(theme.palette.text.secondary, 0.05),
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{
                        ...commonLegendStyle,
                        lineHeight: "30px",
                        paddingTop: "5px",
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      barSize={isSmallScreen ? 20 : 30}
                      radius={[4, 4, 0, 0]}
                    >
                      {revenueByServiceTypeData.map((_entry, index) => (
                        <Cell
                          key={`cell-rev-service-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
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
