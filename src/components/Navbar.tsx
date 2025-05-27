import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  useMediaQuery,
  type AppBarProps, // Import AppBarProps for the position prop
} from "@mui/material";
import {
  Brightness4,
  Brightness7,
  AdminPanelSettings,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useThemeContext } from "../context/ThemeContext";

interface NavbarProps {
  handleDrawerToggle?: () => void;
  position?: AppBarProps["position"]; // Allow AppBar position prop to be passed
}

const Navbar: React.FC<NavbarProps> = ({
  handleDrawerToggle,
  position = "fixed", // Default to "fixed" if not provided
}) => {
  const { toggleTheme, mode } = useThemeContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const showMenuIcon = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <AppBar
      position={position} // Use the passed position prop
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background:
          mode === "dark"
            ? "linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%)"
            : "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
        boxShadow: theme.shadows[3],
        transition: theme.transitions.create(
          ["background", "box-shadow", "top", "transform"],
          {
            duration: theme.transitions.duration.short,
          }
        ),
        // If you were implementing hide-on-scroll, transform/top would go here
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: { xs: 1.5, sm: 2, md: 3 },
          minHeight: { xs: 56, sm: 64 }, // Defined heights
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {showMenuIcon && handleDrawerToggle && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{
                mr: { xs: 1, sm: 1.5 },
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <AdminPanelSettings
            sx={{
              mr: isMobile ? 0.5 : 1.5,
              fontSize: isMobile ? "1.5rem" : "1.75rem",
              color: mode === "dark" ? "#e0f2fe" : "#ffffff",
            }}
          />
          <Typography
            variant={isMobile ? "h6" : "h5"}
            noWrap
            component="div"
            sx={{
              fontWeight: 600,
              letterSpacing: isMobile ? 0.5 : 1,
              color: mode === "dark" ? "#e0f2fe" : "#ffffff",
            }}
          >
            {isMobile ? "Admin" : "Admin Dashboard"}
          </Typography>
        </Box>
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
