import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
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
  AddCircleOutline,
  BarChart,
  CalendarMonth,
} from "@mui/icons-material";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import MetricCard from "../components/MetricCard";
import CustomerTable, { sampleCustomers } from "../components/CustomerTable";

// Dashboard component
const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  // State for mobile sidebar
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  };

  // Metric data
  const metrics = [
    {
      title: "Total Customers",
      value: "12,345",
      icon: People,
      color: theme.palette.primary.main,
      variant: "filled",
      trend: "up",
      changePercentage: 8.2,
    },
    {
      title: "Revenue",
      value: "$54,321",
      icon: AttachMoney,
      color: theme.palette.success.main,
      variant: "outlined",
      trend: "up",
      changePercentage: 12.5,
    },
    {
      title: "Orders",
      value: "1,234",
      icon: ShoppingCart,
      color: theme.palette.warning.main,
      variant: "subtle",
      trend: "down",
      changePercentage: 3.7,
    },
    {
      title: "Avg. Session Time",
      value: "24m 35s",
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
            ? alpha("#000", 0.5)
            : alpha("#f5f8fa", 0.5),
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
          pb: 8,
        }}
      >
        <Navbar handleDrawerToggle={handleDrawerToggle} />

        <Container maxWidth="xl" sx={{ mt: { xs: 8, sm: 9 } }}>
          {/* Header section */}
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
                sx={{
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                }}
              >
                Dashboard Overview
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Welcome back! Here's what's happening today.
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="primary"
              startIcon={<AddCircleOutline />}
              sx={{
                borderRadius: theme.shape.borderRadius * 1.5,
                px: 3,
                py: 1,
                boxShadow: `0 4px 12px ${alpha(
                  theme.palette.primary.main,
                  0.25
                )}`,
              }}
            >
              New Customer
            </Button>
          </Box>

          {/* Metrics row */}
          <Stack
            direction="row"
            flexWrap="wrap"
            gap={3}
            sx={{
              mb: 4,
              "& > *": {
                flex: {
                  xs: "1 1 100%",
                  sm: "1 1 calc(50% - 12px)",
                  md: "1 1 calc(25% - 18px)",
                },
                minWidth: { xs: "100%", sm: 200 },
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

          {/* Tabs and main content */}
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
            {/* Tabs navigation */}
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                sx={{
                  px: { xs: 1, sm: 2 },
                  "& .MuiTab-root": {
                    minHeight: 48,
                    px: { xs: 1.5, sm: 3 },
                    fontSize: "0.95rem",
                    fontWeight: 500,
                  },
                }}
              >
                <Tab label="All Customers" />
                <Tab label="Active" />
                <Tab label="Upcoming" />
                <Tab label="Past" />
              </Tabs>
            </Box>

            {/* Tab panels */}
            <TabPanel value={activeTab} index={0}>
              <CustomerTable
                customers={sampleCustomers}
                loading={loading}
                onRefresh={handleRefresh}
              />
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
              <CustomerTable
                customers={sampleCustomers.filter(
                  (c) => c.status === "in-progress"
                )}
                loading={loading}
                onRefresh={handleRefresh}
              />
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
              <CustomerTable
                customers={sampleCustomers.filter(
                  (c) => c.status === "scheduled"
                )}
                loading={loading}
                onRefresh={handleRefresh}
              />
            </TabPanel>
            <TabPanel value={activeTab} index={3}>
              <CustomerTable
                customers={sampleCustomers.filter(
                  (c) => c.status === "completed" || c.status === "cancelled"
                )}
                loading={loading}
                onRefresh={handleRefresh}
              />
            </TabPanel>
          </Card>

          {/* Additional sections */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", lg: "row" },
              gap: 3,
            }}
          >
            {/* Analytics Overview */}
            <Box
              sx={{
                flex: { xs: "1 多元化1 100%", lg: "2 1 0" }, // 2:1 ratio for larger screens
                minWidth: 0,
              }}
            >
              <Card
                sx={{
                  borderRadius: theme.shape.borderRadius * 2,
                  overflow: "hidden",
                  boxShadow: `0 4px 20px ${alpha(
                    theme.palette.common.black,
                    0.05
                  )}`,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  p: { xs: 2, sm: 3 },
                  height: "100%",
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
                    Analytics Overview
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Button
                      size="small"
                      startIcon={<BarChart />}
                      sx={{ mr: 1 }}
                    >
                      View Reports
                    </Button>
                  </Box>
                </Box>

                <Box
                  sx={{
                    height: 300,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    Charts and analytics data would appear here
                  </Typography>
                </Box>
              </Card>
            </Box>

            {/* Calendar/Upcoming */}
            <Box
              sx={{
                flex: { xs: "1 1 100%", lg: "1 1 0" }, // 2:1 ratio for larger screens
                minWidth: 0,
              }}
            >
              <Card
                sx={{
                  borderRadius: theme.shape.borderRadius * 2,
                  overflow: "hidden",
                  boxShadow: `0 4px 20px ${alpha(
                    theme.palette.common.black,
                    0.05
                  )}`,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  p: { xs: 2, sm: 3 },
                  height: "100%",
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
                    Upcoming Appointments
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<CalendarMonth />}
                    sx={{ mr: 1 }}
                  >
                    Calendar
                  </Button>
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Box sx={{ height: 260, overflowY: "auto" }}>
                  {sampleCustomers
                    .filter((c) => c.status === "scheduled")
                    .slice(0, 3)
                    .map((appointment, index) => (
                      <Box
                        key={appointment.id}
                        sx={{
                          p: 1.5,
                          mb: 1.5,
                          borderRadius: 1,
                          bgcolor: alpha(theme.palette.primary.main, 0.04),
                          "&:hover": {
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                          },
                          cursor: "pointer",
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
                            sx={{ fontWeight: 600 }}
                          >
                            {appointment.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: theme.palette.text.secondary }}
                          >
                            {appointment.time}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ color: theme.palette.text.secondary, mb: 0.5 }}
                        >
                          {appointment.service}
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
                            sx={{ display: "flex", alignItems: "center" }}
                          >
                            <CalendarMonth
                              fontSize="small"
                              sx={{ fontSize: "0.9rem", mr: 0.5 }}
                            />
                            {appointment.date}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: theme.palette.primary.main,
                            }}
                          >
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(appointment.amount)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  sx={{ borderRadius: theme.shape.borderRadius * 1.5 }}
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

// TabPanel component for tab content
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
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default Dashboard;
