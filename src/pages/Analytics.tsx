import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  useTheme,
  alpha,
  CircularProgress,
} from "@mui/material";
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
  Sector, // For custom bar shape
} from "recharts";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"; // For "No Data" message

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

// Extend MUI Theme to include custom property (if not already in a global .d.ts file)
// This was already in your provided code, ensuring it's here for completeness.
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
  const [year, month] = tickItem.split("-");
  if (!year || !month) return "Invalid Date";
  const date = new Date(parseInt(year), parseInt(month) - 1);
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

const CHART_HEIGHT = 380;

// Custom Bar shape for rounded corners on vertical bars
const RoundedBar = (props: any) => {
  const { fill, x, y, width, height, radius = [6, 6, 0, 0] } = props; // Top-left, top-right, bottom-right, bottom-left

  return (
    <path
      d={`M${x},${y + radius[0]}
         A${radius[0]},${radius[0]} 0 0 1 ${x + radius[0]},${y}
         L${x + width - radius[1]},${y}
         A${radius[1]},${radius[1]} 0 0 1 ${x + width},${y + radius[1]}
         L${x + width},${y + height - radius[2]}
         A${radius[2]},${radius[2]} 0 0 1 ${x + width - radius[2]},${y + height}
         L${x + radius[3]},${y + height}
         A${radius[3]},${radius[3]} 0 0 1 ${x},${y + height - radius[3]}
         Z`}
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
  } = props; // Pass muiTheme
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 6) * cos;
  const sy = cy + (outerRadius + 6) * sin;
  const mx = cx + (outerRadius + 18) * cos;
  const my = cy + (outerRadius + 18) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 15;
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
        fontSize="1rem"
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
        style={{ filter: `drop-shadow(0px 3px 5px ${alpha(fill, 0.6)})` }}
      />
      <Sector
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
        fill={muiTheme.palette.text.primary}
        fontSize="0.8rem"
      >{`Count: ${value}`}</text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 10}
        y={ey}
        dy={16}
        textAnchor={textAnchor}
        fill={muiTheme.palette.text.secondary}
        fontSize="0.75rem"
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
                const parsedDate = new Date(data.appointmentDate);
                if (!isNaN(parsedDate.getTime())) {
                  appointmentDateStr = parsedDate.toISOString().split("T")[0];
                } else {
                  console.warn(
                    `Invalid date string for analytics: ${data.appointmentDate}`
                  );
                  appointmentDateStr = "";
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
          const date = new Date(booking.appointmentDate + "T00:00:00Z");
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
      );
  }, [bookings]);

  const serviceTypeDistributionData = useMemo(() => {
    const countByServiceType: { [service: string]: number } = {};
    bookings.forEach((booking) => {
      const service = booking.serviceType || "Unknown Service";
      countByServiceType[service] = (countByServiceType[service] || 0) + 1;
    });
    return Object.keys(countByServiceType)
      .map((service) => ({ name: service, value: countByServiceType[service] }))
      .sort((a, b) => b.value - a.value);
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
      .sort((a, b) => b.revenue - a.revenue);
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
      elevation={2} // Slightly softer base elevation
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 }, // Adjusted padding
        borderRadius: theme.shape.borderRadius * 2.5, // More rounded
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.palette.background.paper,
        border:
          theme.palette.mode === "light"
            ? `1px solid ${theme.palette.divider}`
            : `1px solid ${alpha(theme.palette.divider, 0.3)}`,
        boxShadow:
          theme.palette.mode === "dark"
            ? `0 4px 12px ${alpha(theme.palette.common.black, 0.2)}`
            : `0 4px 12px ${alpha(theme.palette.grey[500], 0.1)}`,
        transition: theme.transitions.create(["box-shadow", "transform"], {
          duration: theme.transitions.duration.short,
        }),
        "&:hover": {
          boxShadow:
            theme.palette.mode === "dark"
              ? `0 8px 20px ${alpha(theme.palette.common.black, 0.25)}`
              : `0 8px 20px ${alpha(theme.palette.grey[500], 0.15)}`,
          transform: "translateY(-4px)",
        },
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          color: theme.palette.text.primary,
          mb: 2.5,
          textAlign: "center",
        }}
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
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: CHART_HEIGHT,
            minHeight: CHART_HEIGHT,
            color: theme.palette.text.secondary,
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 40, mb: 1 }} />
          <Typography>No data available for this chart.</Typography>
        </Box>
      )}
    </Paper>
  );

  const commonTooltipStyle = {
    backgroundColor: alpha(theme.palette.background.paper, 0.92),
    borderRadius: theme.shape.borderRadius * 1.5,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[3],
  };
  const commonItemStyle = { color: theme.palette.text.primary };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        width: "100vw",
        bgcolor:
          theme.palette.mode === "dark"
            ? theme.palette.grey[900]
            : theme.palette.grey[50], // Adjusted background
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
          marginTop: 6,
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
              textAlign: { xs: "center", sm: "left" },
            }}
          >
            Analytics Overview
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: { xs: 2.5, sm: 3, md: 3.5 },
            }}
          >
            <Box
              sx={{
                flexBasis: { xs: "100%", md: "calc(50% - 14px)" },
                flexGrow: 1,
                minWidth: { xs: "100%", sm: 320 },
              }}
            >
              {renderChartContainer(
                "Monthly Revenue Trend",
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={monthlyRevenueData}
                    margin={{ top: 10, right: 30, left: 25, bottom: 10 }}
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
                      stroke={alpha(theme.palette.divider, 0.7)}
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonthYearTick}
                      stroke={theme.palette.text.secondary}
                      dy={5}
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        `$${value >= 1000 ? `${value / 1000}k` : value}`
                      }
                      stroke={theme.palette.text.secondary}
                      dx={-5}
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
                        fill: alpha(theme.palette.text.secondary, 0.1),
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "10px" }} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke={theme.palette.primary.main}
                      strokeWidth={3}
                      activeDot={{
                        r: 8,
                        strokeWidth: 2,
                        stroke: alpha(theme.palette.primary.dark, 0.5),
                      }}
                      dot={{ r: 5, fill: theme.palette.primary.light }}
                      fill="url(#revenueGradient)"
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>,
                monthlyRevenueData.length > 0
              )}
            </Box>

            <Box
              sx={{
                flexBasis: { xs: "100%", md: "calc(50% - 14px)" },
                flexGrow: 1,
                minWidth: { xs: "100%", sm: 320 },
              }}
            >
              {renderChartContainer(
                "Bookings by Service Type",
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart
                    margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  >
                    <Pie
                      activeIndex={activePieIndex}
                      activeShape={(props: any) =>
                        renderActiveShape({ ...props, theme: theme })
                      }
                      data={serviceTypeDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={CHART_HEIGHT * 0.24} // Adjusted for better proportion
                      outerRadius={CHART_HEIGHT * 0.32} // Adjusted for better proportion
                      fill={theme.palette.secondary.main}
                      dataKey="value"
                      onMouseEnter={onPieEnter}
                      paddingAngle={2}
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
                      formatter={(value: number, name: string, _props) => {
                        const totalBookings = bookings.length;
                        const percentage =
                          totalBookings > 0
                            ? ((value / totalBookings) * 100).toFixed(1)
                            : 0;
                        return [`${value} (${percentage}%)`, name];
                      }}
                      contentStyle={commonTooltipStyle}
                      itemStyle={commonItemStyle}
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ paddingTop: "15px" }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>,
                serviceTypeDistributionData.length > 0
              )}
            </Box>

            <Box
              sx={{
                flexBasis: { xs: "100%", md: "calc(50% - 14px)" },
                flexGrow: 1,
                minWidth: { xs: "100%", sm: 320 },
              }}
            >
              {renderChartContainer(
                "Booking Status Distribution",
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={bookingStatusData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 50, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={alpha(theme.palette.divider, 0.7)}
                    />
                    <XAxis
                      type="number"
                      stroke={theme.palette.text.secondary}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={110}
                      stroke={theme.palette.text.secondary}
                      tick={{ fontSize: "0.8rem" }}
                    />
                    <Tooltip
                      formatter={(value: number) => [value, "Bookings"]}
                      contentStyle={commonTooltipStyle}
                      itemStyle={commonItemStyle}
                      cursor={{
                        fill: alpha(theme.palette.text.secondary, 0.1),
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "10px" }} />
                    <Bar
                      dataKey="count"
                      name="Number of Bookings"
                      shape={<RoundedBar />}
                      barSize={20}
                    >
                      {bookingStatusData.map((_entry, index) => (
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

            <Box
              sx={{
                flexBasis: { xs: "100%", md: "calc(50% - 14px)" },
                flexGrow: 1,
                minWidth: { xs: "100%", sm: 320 },
              }}
            >
              {renderChartContainer(
                "Revenue by Service Type",
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={revenueByServiceTypeData}
                    margin={{ top: 20, right: 30, left: 25, bottom: 90 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={alpha(theme.palette.divider, 0.7)}
                    />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      stroke={theme.palette.text.secondary}
                      tick={{ fontSize: "0.8rem" }}
                      dy={5}
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        `$${value >= 1000 ? `${value / 1000}k` : value}`
                      }
                      stroke={theme.palette.text.secondary}
                      dx={-5}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `$${value.toFixed(2)}`,
                        "Revenue",
                      ]}
                      contentStyle={commonTooltipStyle}
                      itemStyle={commonItemStyle}
                      cursor={{
                        fill: alpha(theme.palette.text.secondary, 0.1),
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{ lineHeight: "40px", paddingTop: "10px" }}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Total Revenue"
                      barSize={35}
                      radius={[6, 6, 0, 0]}
                    >
                      {" "}
                      {/* radius for horizontal bars */}
                      {revenueByServiceTypeData.map((_entry, index) => (
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
