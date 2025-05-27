import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Avatar, // Added for an icon
  CssBaseline, // Added for baseline styling and background
  useTheme, // To access theme properties
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined"; // Login icon

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const theme = useTheme(); // Access theme

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    try {
      await login(email, password);
      // Navigation will be handled by AuthContext/ProtectedRoute
    } catch (err: any) {
      // More specific error handling if possible
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password. Please try again.");
      } else {
        setError("Failed to log in. Please try again later.");
      }
      console.error("Login error:", err);
    }
  };

  return (
    <>
      <CssBaseline /> {/* Ensures consistent baseline and background */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh", // Full viewport height
          backgroundColor:
            theme.palette.mode === "dark"
              ? theme.palette.grey[900]
              : theme.palette.grey[100], // Subtle background
          py: 4, // Padding for very small screens if content overflows
        }}
      >
        <Container component="main" maxWidth="xs">
          {" "}
          {/* 'xs' for a more compact form */}
          <Paper
            elevation={6} // Slightly more pronounced shadow
            sx={{
              p: { xs: 3, sm: 4 }, // Responsive padding
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderRadius: 2, // Softer corners
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5" sx={{ mb: 1 }}>
              Admin Login
            </Typography>
            {error && (
              <Typography
                color="error"
                variant="body2"
                align="center"
                sx={{ mb: 2, width: "100%" }}
              >
                {error}
              </Typography>
            )}
            <Box
              component="form"
              onSubmit={handleSubmit}
              noValidate // Let Firebase handle validation feedback via error state
              sx={{ mt: 1, width: "100%" }} // Ensure form takes full width of Paper
            >
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!error} // Highlight field if there's a general login error
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!error} // Highlight field if there's a general login error
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.2 }} // More padding for button height
              >
                Login
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </>
  );
};

export default Login;
