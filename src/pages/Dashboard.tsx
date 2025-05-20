import { Box, Container, Typography, Paper, Stack } from "@mui/material";
import {
  People,
  AttachMoney,
  ShoppingCart,
  AccessTime,
} from "@mui/icons-material";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import MetricCard from "../components/MetricCard";
import React from "react";

const Dashboard = () => {
  const metrics = [
    { title: "Total Users", value: "12,345", icon: People, color: "#3b82f6" },
    { title: "Revenue", value: "$54,321", icon: AttachMoney, color: "#10b981" },
    { title: "Orders", value: "1,234", icon: ShoppingCart, color: "#f59e0b" },
    {
      title: "Active Sessions",
      value: "567",
      icon: AccessTime,
      color: "#ec4899",
    },
  ];

  // State for mobile sidebar
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
      />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Navbar handleDrawerToggle={handleDrawerToggle} />
        <Container sx={{ mt: 8 }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
            Welcome to the Admin Dashboard
          </Typography>
          <Stack
            direction="row"
            flexWrap="wrap"
            gap={3}
            sx={{
              justifyContent: "space-between",
              "& > *": {
                flex: { xs: "1 1 100%", sm: "1 1 45%", md: "1 1 23%" },
                minWidth: 200,
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
                trend="up"
                changePercentage={12.5}
              />
            ))}
          </Stack>
          <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Overview
            </Typography>
            <Typography variant="body1">
              This is a sample dashboard. You can add charts, tables, or other
              admin features here.
            </Typography>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default Dashboard;
