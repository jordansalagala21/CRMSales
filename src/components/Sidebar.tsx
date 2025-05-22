import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  useMediaQuery,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  QueryStats as QueryStatsIcon, // Icon for Analytics
  // Add other icons as needed e.g. Settings as SettingsIcon
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext"; // Assuming path is correct
import { useNavigate, useLocation } from "react-router-dom";

const drawerWidth = 240;

const getActiveStyles = (isActive: boolean, theme: any) => ({
  backgroundColor: isActive
    ? theme.palette.mode === "dark"
      ? theme.palette.action.hover // Slightly darker/different for dark mode active
      : alpha(theme.palette.primary.main, 0.08) // Use alpha for primary color
    : "transparent",
  color: isActive
    ? theme.palette.mode === "dark"
      ? theme.palette.primary.light // Lighter primary for text in dark mode
      : theme.palette.primary.main
    : theme.palette.text.primary, // Use theme's primary text color
  "& .MuiListItemIcon-root": {
    color: isActive
      ? theme.palette.mode === "dark"
        ? theme.palette.primary.light // Lighter primary for icon in dark mode
        : theme.palette.primary.main
      : alpha(theme.palette.text.primary, 0.7), // Slightly muted icon color for inactive
  },
  "&:hover": {
    backgroundColor: isActive
      ? theme.palette.mode === "dark"
        ? theme.palette.action.selected // Consistent hover for active
        : alpha(theme.palette.primary.main, 0.12) // Slightly darker hover for active
      : theme.palette.action.hover, // Default hover
  },
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(0.5),
  paddingLeft: theme.spacing(2.5),
  paddingRight: theme.spacing(2.5),
  transition: "background-color 0.2s ease-in-out, color 0.2s ease-in-out", // Smooth transitions
});

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

const Sidebar = ({ mobileOpen, handleDrawerToggle }: SidebarProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const location = useLocation();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));

  const handleLogout = async () => {
    if (isMobileOrTablet && handleDrawerToggle) {
      handleDrawerToggle();
    }
    await logout();
    // navigate("/login"); // AuthContext already navigates to /home, ProtectedRoute handles /login
    // Keeping user's original navigate call here for explicit redirection if desired.
    navigate("/login");
  };

  const handleNavigation = (path: string) => {
    if (isMobileOrTablet && handleDrawerToggle) {
      handleDrawerToggle();
    }
    navigate(path);
  };

  const menuItems = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/dashboard", // Changed from /admin/dashboard to match your App.tsx
    },
    // --- New Analytics Menu Item ---
    {
      text: "Analytics",
      icon: <QueryStatsIcon />,
      path: "/analytics", // Example path, ensure you create this route in App.tsx
    },
    {
      text: "Payroll",
      icon: <QueryStatsIcon />,
      path: "/payroll", // Example path, ensure you create this route in App.tsx
    },
    // Add more items here, e.g.:
    // {
    //   text: "Settings",
    //   icon: <SettingsIcon />,
    //   path: "/admin/settings", // If using an /admin prefix, ensure consistency
    // },
  ];

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // borderBottom: `1px solid ${theme.palette.divider}`, // Optional
          // backgroundColor: theme.palette.background.default, // Optional
        }}
      >
        <Typography
          variant="h6"
          noWrap
          component="div"
          color="primary"
          fontWeight="bold"
        >
          Admin Menu
        </Typography>
      </Toolbar>
      <List sx={{ flexGrow: 1, px: 1.5, py: 1 }}>
        {menuItems.map((item) => {
          // Improved active path matching for nested routes:
          // Exact match for dashboard, startsWith for others unless it's just "/"
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/");

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive}
                sx={getActiveStyles(isActive, theme)}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? "medium" : "regular",
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ p: 1.5, mt: "auto" }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              ...getActiveStyles(false, theme), // Apply base non-active styling
              color: theme.palette.text.secondary, // Softer color for logout
              "& .MuiListItemIcon-root": {
                color: alpha(theme.palette.text.primary, 0.7), // Match inactive icon color
              },
              "&:hover": {
                backgroundColor: alpha(theme.palette.error.main, 0.08), // Subtle error color on hover
                color: theme.palette.error.main,
                "& .MuiListItemIcon-root": {
                  color: theme.palette.error.main,
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobileOrTablet ? "temporary" : "permanent"}
      open={isMobileOrTablet ? mobileOpen : true}
      onClose={isMobileOrTablet ? handleDrawerToggle : undefined}
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
          // borderRight: isMobileOrTablet ? 'none' : `1px solid ${theme.palette.divider}`, // Optional border
          // backgroundColor: theme.palette.background.default, // Optional: if different from body
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
