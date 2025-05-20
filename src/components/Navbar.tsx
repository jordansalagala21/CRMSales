import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  useMediaQuery,
} from "@mui/material";
import {
  Brightness4,
  Brightness7,
  AdminPanelSettings,
  Menu as MenuIcon, // Import the Menu icon
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useThemeContext } from "../context/ThemeContext"; // Assuming this path is correct

// Define the props for the Navbar component
interface NavbarProps {
  handleDrawerToggle?: () => void; // Optional prop for toggling the sidebar
}

const Navbar: React.FC<NavbarProps> = ({ handleDrawerToggle }) => {
  const { toggleTheme, mode } = useThemeContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // For title and icon responsiveness

  // Determine if the menu icon should be shown (when sidebar is temporary)
  // This should match the breakpoint used in your Sidebar component (e.g., "md")
  const showMenuIcon = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background:
          mode === "dark"
            ? "linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%)"
            : "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
        boxShadow: theme.shadows[3],
        transition: theme.transitions.create(["background", "box-shadow"], {
          duration: theme.transitions.duration.short,
        }),
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: { xs: 1.5, sm: 2, md: 3 },
          minHeight: { xs: 56, sm: 64 },
        }}
      >
        {/* Container for Menu Icon (mobile/tablet), Admin Icon, and Title */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {/* Menu Icon to toggle sidebar on smaller screens */}
          {showMenuIcon && handleDrawerToggle && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{
                // Conditionally apply margin if AdminPanelSettings is also visible or based on layout needs
                mr: { xs: 1, sm: 1.5 }, // Margin to separate from the next icon or title
                // display: { md: 'none' } // This would hide it on 'md' and up, matching 'showMenuIcon' logic
              }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Admin Panel Icon */}
          <AdminPanelSettings
            sx={{
              // Adjust margin if MenuIcon is present or not.
              // If MenuIcon is shown, this 'mr' might be slightly less or the same.
              mr: isMobile ? 0.5 : 1.5,
              fontSize: isMobile ? "1.5rem" : "1.75rem",
              color: mode === "dark" ? "#e0f2fe" : "#ffffff",
              // Hide this icon if the title is also hidden and MenuIcon is primary focus on very small screens
              // display: showMenuIcon ? { xs: 'none', sm: 'inline-flex'} : 'inline-flex' // Example
            }}
          />

          {/* Title Text */}
          <Typography
            variant={isMobile ? "h6" : "h5"}
            noWrap
            component="div"
            sx={{
              fontWeight: 600,
              letterSpacing: isMobile ? 0.5 : 1,
              color: mode === "dark" ? "#e0f2fe" : "#ffffff",
              // On very small screens where MenuIcon is present, you might want to hide the title
              // display: isMobile && showMenuIcon ? 'none' : 'block', // Example: hide title if menu icon is shown on mobile
            }}
          >
            {isMobile ? "Admin" : "Admin Dashboard"}
          </Typography>
        </Box>

        {/* Theme Toggle IconButton */}
        <IconButton
          color="inherit"
          onClick={toggleTheme}
          aria-label="toggle theme"
          sx={{
            transition:
              "transform 0.2s ease-in-out, background-color 0.2s ease-in-out",
            p: { xs: 0.75, sm: 1 },
            "&:hover": {
              transform: "scale(1.15)",
              backgroundColor:
                mode === "dark"
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.08)",
            },
          }}
        >
          {mode === "dark" ? (
            <Brightness7 fontSize="medium" />
          ) : (
            <Brightness4 fontSize="medium" />
          )}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
