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

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: OverridableComponent<SvgIconTypeMap<{}, "svg">>;
  color?: string;
  variant?: "filled" | "outlined" | "subtle";
  trend?: "up" | "down" | "neutral";
  changePercentage?: number;
}

const MetricCard = ({
  title,
  value,
  icon: Icon,
  color,
  variant = "subtle",
  trend,
  changePercentage,
}: MetricCardProps) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const isDarkMode = theme.palette.mode === "dark";

  // Use theme primary color if no color is provided
  const baseColor = color || theme.palette.primary.main;

  // Generate card styles based on variant
  const getCardStyles = () => {
    switch (variant) {
      case "filled":
        return {
          background: isDarkMode ? baseColor : baseColor,
          color: theme.palette.getContrastText(baseColor),
          boxShadow: `0 4px 14px ${alpha(baseColor, isDarkMode ? 0.25 : 0.35)}`,
        };
      case "outlined":
        return {
          background: isDarkMode ? theme.palette.background.paper : "#fff",
          color: theme.palette.text.primary,
          border: `1px solid ${alpha(baseColor, isDarkMode ? 0.5 : 0.4)}`,
          boxShadow: `0 3px 10px ${alpha(theme.palette.common.black, 0.07)}`,
        };
      case "subtle":
      default:
        return {
          background: alpha(baseColor, isDarkMode ? 0.15 : 0.12),
          color: theme.palette.text.primary,
          boxShadow: `0 3px 10px ${alpha(theme.palette.common.black, 0.05)}`,
        };
    }
  };

  const cardStyles = getCardStyles();

  // Icon styles based on variant
  const getIconStyles = () => {
    switch (variant) {
      case "filled":
        return {
          background: alpha(theme.palette.common.white, 0.25),
          color: theme.palette.common.white,
        };
      case "outlined":
        return {
          background: alpha(baseColor, isDarkMode ? 0.2 : 0.15),
          color: baseColor,
        };
      case "subtle":
      default:
        return {
          background: alpha(baseColor, isDarkMode ? 0.3 : 0.25),
          color: isDarkMode ? alpha(baseColor, 0.9) : baseColor,
        };
    }
  };

  const iconStyles = getIconStyles();

  // Trend indicator colors
  const trendColors = {
    up: isDarkMode ? theme.palette.success.main : theme.palette.success.dark,
    down: isDarkMode ? theme.palette.error.main : theme.palette.error.dark,
    neutral: isDarkMode
      ? theme.palette.text.secondary
      : theme.palette.text.primary,
  };

  return (
    <Card
      sx={{
        minWidth: 150,
        maxWidth: 300,
        width: "100%",
        ...cardStyles,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: theme.shadows[variant === "filled" ? 8 : 3],
        },
        borderRadius: theme.shape.borderRadius * 2,
        overflow: "hidden",
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: isSmallScreen ? "16px 12px" : "20px 16px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: isSmallScreen ? 40 : 48,
            height: isSmallScreen ? 40 : 48,
            bgcolor: iconStyles.background,
            color: iconStyles.color,
            borderRadius: theme.shape.borderRadius,
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: isSmallScreen ? 22 : 26 }} />
        </Box>
        <Box sx={{ overflow: "hidden" }}>
          <Typography
            variant={isSmallScreen ? "subtitle2" : "subtitle1"}
            sx={{
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color:
                variant === "filled"
                  ? alpha(theme.palette.common.white, 0.9)
                  : theme.palette.text.primary,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant={isSmallScreen ? "h6" : "h5"}
            sx={{
              fontWeight: 700,
              lineHeight: 1.2,
              mt: 0.5,
            }}
          >
            {value}
          </Typography>
          {changePercentage !== undefined && trend && (
            <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  color:
                    variant === "filled"
                      ? alpha(theme.palette.common.white, 0.9)
                      : trendColors[trend],
                }}
              >
                {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}{" "}
                {changePercentage}%
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  ml: 0.5,
                  color:
                    variant === "filled"
                      ? alpha(theme.palette.common.white, 0.7)
                      : theme.palette.text.secondary,
                }}
              >
                vs previous
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
