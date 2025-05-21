import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  type SvgIconTypeMap,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import type { OverridableComponent } from "@mui/material/OverridableComponent";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward"; // MUI icon for up trend
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward"; // MUI icon for down trend

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: OverridableComponent<SvgIconTypeMap<{}, "svg">>; // Material-UI Icon component
  color?: string;
  variant?: "filled" | "outlined" | "subtle";
  trend?: "up" | "down" | "neutral";
  changePercentage?: number;
  periodDescription?: string; // e.g., "vs last month"
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  variant = "subtle",
  trend,
  changePercentage,
  periodDescription = "since last period", // Default period description
}: MetricCardProps) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const isDarkMode = theme.palette.mode === "dark";

  const baseColor = color || theme.palette.primary.main;

  const getCardStyles = () => {
    switch (variant) {
      case "filled":
        return {
          background: baseColor,
          color: theme.palette.getContrastText(baseColor),
          boxShadow: `0 6px 18px ${alpha(baseColor, isDarkMode ? 0.3 : 0.4)}`,
        };
      case "outlined":
        return {
          background: theme.palette.background.paper,
          color: theme.palette.text.primary,
          border: `1.5px solid ${alpha(baseColor, isDarkMode ? 0.6 : 0.5)}`,
          boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.08)}`,
        };
      case "subtle":
      default:
        return {
          background: alpha(baseColor, isDarkMode ? 0.15 : 0.09), // Slightly adjusted alpha
          color: theme.palette.text.primary,
          boxShadow: `0 3px 10px ${alpha(theme.palette.common.black, 0.06)}`,
        };
    }
  };

  const cardStyles = getCardStyles();

  const getIconStyles = () => {
    switch (variant) {
      case "filled":
        return {
          background: alpha(theme.palette.common.white, 0.18), // Slightly less opaque
          color: theme.palette.common.white,
        };
      case "outlined":
        return {
          background: alpha(baseColor, isDarkMode ? 0.15 : 0.1),
          color: baseColor,
        };
      case "subtle":
      default:
        return {
          background: alpha(baseColor, isDarkMode ? 0.25 : 0.18),
          color: isDarkMode ? alpha(baseColor, 0.9) : baseColor,
        };
    }
  };

  const iconStyles = getIconStyles();

  const trendColors = {
    up: isDarkMode ? theme.palette.success.light : theme.palette.success.dark,
    down: isDarkMode ? theme.palette.error.light : theme.palette.error.dark,
    neutral: theme.palette.text.secondary,
  };

  const trendIconStyle = {
    fontSize: "0.9rem",
    verticalAlign: "middle",
    mr: 0.2,
  };

  return (
    <Card
      sx={{
        minWidth: { xs: 130, sm: 150 },
        maxWidth: 320, // Slightly increased max width
        width: "100%",
        mx: "auto",
        ...cardStyles,
        transition: "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
        "&:hover": {
          transform: "translateY(-4px) scale(1.02)", // Added subtle scale
          boxShadow:
            variant === "filled"
              ? `0 10px 22px ${alpha(baseColor, isDarkMode ? 0.35 : 0.5)}` // Enhanced hover shadow
              : variant === "outlined"
              ? `0 8px 20px ${alpha(theme.palette.common.black, 0.12)}`
              : `0 7px 18px ${alpha(theme.palette.common.black, 0.1)}`,
        },
        borderRadius: theme.shape.borderRadius * 2, // Slightly more rounded
        overflow: "visible",
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column", // Stack content vertically first
          justifyContent: "space-between", // Distribute space
          gap: { xs: 1, sm: 1.5 },
          padding: { xs: "12px", sm: "16px" }, // Adjusted padding
          minHeight: { xs: 110, sm: 120 }, // Slightly increased min height for better balance
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: { xs: 38, sm: 44, md: 50 },
              height: { xs: 38, sm: 44, md: 50 },
              ...iconStyles, // Apply variant-specific icon styles
              borderRadius: theme.shape.borderRadius * 1.5, // Consistent rounding with card
              flexShrink: 0,
              mr: 1.5, // Margin to separate icon from text
            }}
          >
            <Icon
              sx={{ fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" } }}
            />
          </Box>
          <Box sx={{ overflow: "hidden", flexGrow: 1 }}>
            <Typography
              variant={isSmallScreen ? "body2" : "subtitle1"}
              sx={{
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color:
                  variant === "filled"
                    ? "inherit"
                    : theme.palette.text.secondary, // Title color more distinct
                lineHeight: 1.35,
              }}
              title={title}
            >
              {title}
            </Typography>
            <Typography
              variant={isSmallScreen ? "h6" : "h5"}
              sx={{
                fontWeight: 700,
                lineHeight: 1.25,
                color: variant === "filled" ? "inherit" : cardStyles.color,
                mt: 0.25,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={String(value)}
            >
              {value}
            </Typography>
          </Box>
        </Box>

        {changePercentage !== undefined && trend && trend !== "neutral" && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mt: "auto",
              pt: 0.5,
              gap: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                color:
                  variant === "filled"
                    ? alpha(theme.palette.common.white, 0.9)
                    : trendColors[trend],
              }}
            >
              {trend === "up" ? (
                <ArrowUpwardIcon sx={trendIconStyle} />
              ) : (
                <ArrowDownwardIcon sx={trendIconStyle} />
              )}
              {changePercentage}%
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color:
                  variant === "filled"
                    ? alpha(theme.palette.common.white, 0.7)
                    : theme.palette.text.secondary,
              }}
            >
              {periodDescription}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
