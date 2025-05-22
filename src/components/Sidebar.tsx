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
  Divider as MuiDivider, // Alias to avoid potential naming conflicts if you use Divider elsewhere
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  DashboardCustomizeOutlined as DashboardIcon, // More modern Dashboard icon
  ExitToAppRounded as LogoutIcon, // Clearer Logout icon
  AnalyticsOutlined as AnalyticsIcon, // Specific Analytics icon
  PaymentsOutlined as PayrollIcon, // Specific Payroll icon
  // SettingsOutlined as SettingsIcon, // Example for future use
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const drawerWidth = 250; // Slightly wider for better spacing

const getActiveStyles = (isActive: boolean, theme: any) => ({
  backgroundColor: isActive
    ? alpha(
        theme.palette.primary.main,
        theme.palette.mode === "dark" ? 0.25 : 0.12
      ) // Adjusted alpha for dark/light
    : "transparent",
  color: isActive
    ? theme.palette.primary.main // Active text color always primary for emphasis
    : theme.palette.text.secondary, // Softer color for inactive text
  borderLeft: isActive
    ? `4px solid ${theme.palette.primary.main}`
    : "4px solid transparent", // Active indicator
  paddingLeft: isActive ? theme.spacing(2.5 - 0.5) : theme.spacing(2.5), // Adjust padding for indicator
  paddingRight: theme.spacing(2.5),
  borderRadius: theme.shape.borderRadius * 1.5, // Softer corners
  marginBottom: theme.spacing(1), // Space between items
  transition: theme.transitions.create(
    ["background-color", "color", "border-left", "padding-left"],
    {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }
  ),
  "& .MuiListItemIcon-root": {
    color: isActive
      ? theme.palette.primary.main // Active icon color always primary
      : alpha(theme.palette.text.secondary, 0.8), // Slightly more visible inactive icon
    minWidth: 44, // Ensure consistent icon spacing
  },
  "&:hover": {
    backgroundColor: isActive
      ? alpha(
          theme.palette.primary.main,
          theme.palette.mode === "dark" ? 0.3 : 0.15
        )
      : alpha(theme.palette.action.hover, 0.04), // Subtle hover for inactive
    color: isActive ? theme.palette.primary.main : theme.palette.text.primary, // Text becomes primary on hover for inactive
    "& .MuiListItemIcon-root": {
      color: isActive
        ? theme.palette.primary.main
        : theme.palette.primary.light,
    },
  },
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
    try {
      await logout();
      navigate("/login"); // Explicit navigation after logout
    } catch (error) {
      console.error("Logout failed:", error);
      // Optionally show a snackbar or alert to the user
    }
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
      path: "/dashboard",
    },
    {
      text: "Analytics",
      icon: <AnalyticsIcon />,
      path: "/analytics",
    },
    {
      text: "Payroll",
      icon: <PayrollIcon />, // Updated icon
      path: "/payroll",
    },
    // {
    //   text: "Settings",
    //   icon: <SettingsIcon />,
    //   path: "/admin/settings",
    // },
  ];

  const drawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: theme.palette.background.paper,
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          height: 64, // Standard toolbar height
          borderBottom: `1px solid ${theme.palette.divider}`,
          // backgroundColor: alpha(theme.palette.background.default, 0.5), // Optional subtle background
        }}
      >
        {/* You could add a logo here */}
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{
            color: theme.palette.primary.main,
            fontWeight: "bold",
            letterSpacing: "0.5px",
          }}
        >
          Admin Panel
        </Typography>
      </Toolbar>
      <MuiDivider />
      <List sx={{ flexGrow: 1, px: 2, py: 1.5 }}>
        {" "}
        {/* Adjusted padding */}
        {menuItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/");

          return (
            <ListItem key={item.text} disablePadding sx={{ display: "block" }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive}
                sx={getActiveStyles(isActive, theme)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 400, // Bolder active text
                    fontSize: "0.95rem",
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box
        sx={{
          p: 2,
          mt: "auto",
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              ...getActiveStyles(false, theme), // Apply base non-active styling
              color: theme.palette.text.secondary,
              borderLeft: "4px solid transparent", // Ensure no active indicator
              paddingLeft: theme.spacing(2.5), // Reset padding if active style changed it
              "&:hover": {
                backgroundColor: alpha(theme.palette.error.main, 0.08),
                color: theme.palette.error.main,
                borderLeft: `4px solid ${theme.palette.error.main}`, // Error indicator on hover
                paddingLeft: theme.spacing(2.5 - 0.5),
                "& .MuiListItemIcon-root": {
                  color: theme.palette.error.main,
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 44 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{ fontSize: "0.95rem" }}
            />
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
        keepMounted: true, // Better open performance on mobile.
      }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: isMobileOrTablet
            ? "none"
            : `1px solid ${theme.palette.divider}`,
          boxShadow: isMobileOrTablet ? theme.shadows[3] : theme.shadows[1], // Subtle shadow for permanent drawer
          // backgroundColor: theme.palette.background.default, // Or theme.palette.background.paper
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
