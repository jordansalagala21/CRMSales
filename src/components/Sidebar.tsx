import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography, // Added for potential title/logo in Drawer
  Box, // Added for layout
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles"; // To use theme for breakpoints and styling
import {
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  // Add other icons as needed e.g. Settings as SettingsIcon
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom"; // useLocation for active item

const drawerWidth = 240; // Define drawer width as a constant

// Helper for active link styling
const getActiveStyles = (isActive: boolean, theme: any) => ({
  backgroundColor: isActive
    ? theme.palette.mode === "dark"
      ? theme.palette.action.hover
      : theme.palette.primary.lighter
    : "transparent",
  color: isActive
    ? theme.palette.mode === "dark"
      ? theme.palette.common.white
      : theme.palette.primary.main
    : "inherit",
  "& .MuiListItemIcon-root": {
    color: isActive
      ? theme.palette.mode === "dark"
        ? theme.palette.common.white
        : theme.palette.primary.main
      : "inherit",
  },
  "&:hover": {
    backgroundColor: isActive
      ? theme.palette.mode === "dark"
        ? theme.palette.action.selected
        : theme.palette.primary.light
      : theme.palette.action.hover,
  },
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(0.5), // Add some space between items
  paddingLeft: theme.spacing(2.5), // Indent items slightly
  paddingRight: theme.spacing(2.5),
});

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

const Sidebar = ({ mobileOpen, handleDrawerToggle }: SidebarProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const location = useLocation(); // Get current location
  // Use 'md' breakpoint: permanent for md and up, temporary for sm and down
  // You can adjust this breakpoint (e.g., theme.breakpoints.down("sm"))
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));

  const handleLogout = async () => {
    if (isMobileOrTablet && handleDrawerToggle) {
      handleDrawerToggle(); // Close drawer on mobile after action
    }
    await logout();
    navigate("/login");
  };

  interface NavigationHandler {
    (path: string): void;
  }

  const handleNavigation: NavigationHandler = (path) => {
    if (isMobileOrTablet && handleDrawerToggle) {
      handleDrawerToggle(); // Close drawer on mobile after navigation
    }
    navigate(path);
  };

  const menuItems = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/admin/dashboard", // Example: Use full paths for matching
    },
    // Add more items here, e.g.:
    // {
    //   text: "Settings",
    //   icon: <SettingsIcon />,
    //   path: "/admin/settings",
    // },
  ];

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Optional: Add a border or slightly different background for the header area
          // borderBottom: `1px solid ${theme.palette.divider}`,
          // px: 2, // Add padding if you put content here
        }}
      >
        {/* You can place a logo or a title here */}
        {/* <YourLogoOrIcon sx={{ mr: 1 }} /> */}
        <Typography variant="h6" noWrap component="div" color="primary">
          Admin Menu
        </Typography>
      </Toolbar>
      <List sx={{ flexGrow: 1, px: 1.5, py: 1 }}>
        {" "}
        {/* Padding for the list */}
        {menuItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/admin/dashboard" &&
              location.pathname.startsWith(item.path));
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive} // For accessibility and Mui's internal selected state
                sx={getActiveStyles(isActive, theme)} // Apply dynamic styles
              >
                <ListItemIcon sx={{ minWidth: 40 /* Adjust icon spacing */ }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      {/* Logout button at the bottom */}
      <Box sx={{ p: 1.5, mt: "auto" /* Pushes logout to the bottom */ }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              ...getActiveStyles(false, theme), // Apply base styling, not active
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? theme.palette.error.dark
                    : theme.palette.error.light,
                color: theme.palette.error.contrastText,
                "& .MuiListItemIcon-root": {
                  color: theme.palette.error.contrastText,
                },
              },
              color: theme.palette.error.main, // Style logout to indicate caution
              "& .MuiListItemIcon-root": {
                color: theme.palette.error.main,
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
        keepMounted: true, // Better open performance on mobile.
      }}
      sx={{
        width: drawerWidth,
        flexShrink: 0, // Important for permanent drawer not to shrink
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
          // Optional: Add a subtle border or a specific background
          // backgroundColor: theme.palette.background.paper,
          // borderRight: isMobileOrTablet ? 'none' : `1px solid ${theme.palette.divider}`,
          display: "flex",
          flexDirection: "column", // Ensure paper content also uses flex for bottom logout
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
