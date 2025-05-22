// src/pages/Home.tsx
import React, { useState, type ChangeEvent } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Avatar,
  useTheme,
  Stack,
  Container,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Fade,
  Zoom,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase"; // Ensure this path is correct
import {
  CalendarToday,
  PhoneAndroid,
  EmailOutlined,
  NotesOutlined,
  BuildOutlined, // Using this for Service Type Icon, can be changed
  PersonOutline,
  EventNote,
  CheckCircleOutline,
  ErrorOutline,
  TimelapseOutlined, // Icon for time slots
} from "@mui/icons-material";

interface CustomerDetails {
  name: string;
  email: string; // Now optional
  phone: string;
  serviceType: string;
  appointmentDate: string;
  appointmentTime: string; // Now time slot string, optional
  notes: string;
}

// Define which fields are strictly required for form submission/step progression
const REQUIRED_FIELDS: (keyof CustomerDetails)[] = [
  "name",
  "phone",
  "serviceType",
  "appointmentDate",
];

const Home: React.FC = () => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: "",
    email: "",
    phone: "",
    serviceType: "",
    appointmentDate: "",
    appointmentTime: "", // Default to empty string for "Any Time / Not Specified"
    notes: "",
  });
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {}
  );

  const steps = ["Your Info", "Service Details", "Confirm & Book"];

  const getFieldsForStep = (step: number): (keyof CustomerDetails)[] => {
    if (step === 0) return ["name", "email", "phone"];
    if (step === 1)
      return ["serviceType", "appointmentDate", "appointmentTime", "notes"];
    return [];
  };

  const validateStep = (step: number): boolean => {
    let isValid = true;
    const fieldsInStep = getFieldsForStep(step);

    fieldsInStep.forEach((field) => {
      const value = customerDetails[field]?.trim();
      if (REQUIRED_FIELDS.includes(field) && !value) {
        isValid = false;
      }
      if (
        field === "email" &&
        value &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        isValid = false;
      }
    });
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    } else {
      // Mark all fields in the current step as touched to show potential errors
      const currentStepFields = getFieldsForStep(activeStep);
      const updatedTouchedFields = { ...touchedFields };
      currentStepFields.forEach((field) => {
        if (!updatedTouchedFields[field]) {
          // Only mark if not already touched by onBlur
          updatedTouchedFields[field] = true;
        }
      });
      setTouchedFields(updatedTouchedFields);
    }
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCustomerDetails((prev) => ({ ...prev, [name]: value as string }));
    if (!touchedFields[name]) {
      // Mark as touched on first change
      setTouchedFields((prev) => ({ ...prev, [name]: true }));
    }
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setCustomerDetails((prev) => ({ ...prev, [name]: value }));
    if (!touchedFields[name]) {
      setTouchedFields((prev) => ({ ...prev, [name]: true }));
    }
  };

  const handleSubmit = async () => {
    // Final validation before submission (optional, as steps should ensure this)
    if (!validateStep(0) || !validateStep(1)) {
      setSubmissionStatus("error");
      setSubmissionMessage(
        "Please ensure all required fields are correctly filled out."
      );
      // Optionally, navigate to the first invalid step
      if (!validateStep(0)) setActiveStep(0);
      else if (!validateStep(1)) setActiveStep(1);
      return;
    }

    setSubmissionStatus("loading");
    setSubmissionMessage("");
    try {
      await addDoc(collection(db, "appointments"), {
        ...customerDetails,
        createdAt: serverTimestamp(),
        status: "scheduled",
      });
      setSubmissionStatus("success");
      setSubmissionMessage(
        "Appointment successfully scheduled! We'll be in touch soon."
      );
      setActiveStep(0);
      setCustomerDetails({
        name: "",
        email: "",
        phone: "",
        serviceType: "",
        appointmentDate: "",
        appointmentTime: "",
        notes: "",
      });
      setTouchedFields({});
      setTimeout(() => setSubmissionStatus("idle"), 6000);
    } catch (error) {
      console.error("Submission error:", error);
      setSubmissionStatus("error");
      setSubmissionMessage(
        "Failed to book appointment. Please try again or contact support."
      );
      setTimeout(() => setSubmissionStatus("idle"), 7000);
    }
  };

  const isFieldInvalid = (fieldName: keyof CustomerDetails): boolean => {
    const isTouched = touchedFields[fieldName];
    const value = customerDetails[fieldName]?.trim();

    if (fieldName === "email") {
      return !!(
        isTouched &&
        value &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      );
    }
    if (REQUIRED_FIELDS.includes(fieldName)) {
      return !!(isTouched && !value);
    }
    return false; // Optional non-email fields are not "invalid" if empty
  };

  const getFieldLabel = (fieldName: keyof CustomerDetails): string => {
    const labels: Partial<Record<keyof CustomerDetails, string>> = {
      name: "Full Name",
      email: "Email Address",
      phone: "Phone Number",
      serviceType: "Service Type",
      appointmentDate: "Preferred Date",
      appointmentTime: "Preferred Time Slot",
    };
    return labels[fieldName] || fieldName;
  };

  const getHelperText = (fieldName: keyof CustomerDetails): string => {
    const label = getFieldLabel(fieldName);
    if (isFieldInvalid(fieldName)) {
      if (fieldName === "email") {
        return "Please enter a valid email address.";
      }
      if (REQUIRED_FIELDS.includes(fieldName)) {
        return `${label} is required.`;
      }
    }
    return "";
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Customer Info
        return (
          <Stack spacing={3} mt={2}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: theme.palette.text.secondary }}
            >
              Tell us about yourself
            </Typography>
            <TextField // NAME - REQUIRED
              required
              label="Full Name"
              name="name"
              value={customerDetails.name}
              onChange={handleInputChange}
              onBlur={() =>
                setTouchedFields((prev) => ({ ...prev, name: true }))
              }
              error={isFieldInvalid("name")}
              helperText={getHelperText("name")}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline />
                  </InputAdornment>
                ),
              }}
            />
            <TextField // EMAIL - OPTIONAL
              label="Email Address (Optional)"
              name="email"
              type="email"
              value={customerDetails.email}
              onChange={handleInputChange}
              onBlur={() =>
                setTouchedFields((prev) => ({ ...prev, email: true }))
              }
              error={isFieldInvalid("email")} // Only error if value is present and invalid
              helperText={getHelperText("email")}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined />
                  </InputAdornment>
                ),
              }}
            />
            <TextField // PHONE - REQUIRED
              required
              label="Phone Number"
              name="phone"
              type="tel"
              value={customerDetails.phone}
              onChange={handleInputChange}
              onBlur={() =>
                setTouchedFields((prev) => ({ ...prev, phone: true }))
              }
              error={isFieldInvalid("phone")}
              helperText={getHelperText("phone")}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneAndroid />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        );
      case 1: // Service Details
        return (
          <Stack spacing={3} mt={2}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: theme.palette.text.secondary }}
            >
              What service do you need?
            </Typography>
            <FormControl // SERVICE TYPE - REQUIRED
              fullWidth
              required
              error={isFieldInvalid("serviceType")}
            >
              <InputLabel id="service-type-label">Service Type</InputLabel>
              <Select
                labelId="service-type-label"
                name="serviceType"
                value={customerDetails.serviceType}
                onChange={handleSelectChange}
                onBlur={() =>
                  setTouchedFields((prev) => ({ ...prev, serviceType: true }))
                }
                label="Service Type" // Important for InputLabel animation
                startAdornment={
                  <InputAdornment
                    position="start"
                    sx={{ mr: 1, color: theme.palette.action.active }}
                  >
                    <BuildOutlined />
                  </InputAdornment>
                }
              >
                <MenuItem value="">
                  <em>Select a service...</em>
                </MenuItem>
                <MenuItem value="consultation">Consultation</MenuItem>
                <MenuItem value="repair">Repair</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="installation">Installation</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
              {isFieldInvalid("serviceType") && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ ml: 1.5, mt: 0.5 }}
                >
                  {getHelperText("serviceType")}
                </Typography>
              )}
            </FormControl>

            <Typography
              variant="subtitle1"
              sx={{ color: theme.palette.text.secondary, mt: 2 }}
            >
              Preferred Date & Time
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField // APPOINTMENT DATE - REQUIRED
                required
                name="appointmentDate"
                label="Preferred Date"
                type="date"
                value={customerDetails.appointmentDate}
                onChange={handleInputChange}
                onBlur={() =>
                  setTouchedFields((prev) => ({
                    ...prev,
                    appointmentDate: true,
                  }))
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
                error={isFieldInvalid("appointmentDate")}
                helperText={getHelperText("appointmentDate")}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl fullWidth>
                {" "}
                {/* APPOINTMENT TIME - OPTIONAL (SELECT) */}
                <InputLabel id="appointment-time-label">
                  Preferred Time Slot (Optional)
                </InputLabel>
                <Select
                  labelId="appointment-time-label"
                  name="appointmentTime"
                  value={customerDetails.appointmentTime}
                  onChange={handleSelectChange}
                  onBlur={() =>
                    setTouchedFields((prev) => ({
                      ...prev,
                      appointmentTime: true,
                    }))
                  }
                  label="Preferred Time Slot (Optional)" // Important for InputLabel animation
                  startAdornment={
                    <InputAdornment
                      position="start"
                      sx={{ mr: 1, color: theme.palette.action.active }}
                    >
                      <TimelapseOutlined />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="">
                    <em>Any Time / Flexible</em>
                  </MenuItem>
                  <MenuItem value="Morning (9 AM - 12 PM)">
                    Morning (9 AM - 12 PM)
                  </MenuItem>
                  <MenuItem value="Afternoon (12 PM - 3 PM)">
                    Afternoon (12 PM - 3 PM)
                  </MenuItem>
                  <MenuItem value="Late Afternoon (3 PM - 5 PM)">
                    Late Afternoon (3 PM - 5 PM)
                  </MenuItem>
                </Select>
                {/* No helper text for invalid state as it's optional and a select */}
              </FormControl>
            </Stack>

            <TextField // NOTES - OPTIONAL
              label="Additional Notes"
              name="notes"
              value={customerDetails.notes}
              onChange={handleInputChange}
              multiline
              rows={3}
              fullWidth
              placeholder="Any specific details or requests? (Optional)"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <NotesOutlined />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        );
      case 2: // Confirm
        return (
          <Fade in={true} timeout={500}>
            <Box mt={2}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ color: theme.palette.text.secondary, mb: 2 }}
              >
                Please review your details
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  background: theme.palette.background.default,
                }}
              >
                <List disablePadding>
                  <ListItem disableGutters>
                    <ListItemIcon
                      sx={{ minWidth: 40, color: theme.palette.primary.main }}
                    >
                      <PersonOutline />
                    </ListItemIcon>
                    <ListItemText
                      primary="Full Name"
                      secondary={customerDetails.name || "Not provided"}
                    />
                  </ListItem>
                  <Divider component="li" sx={{ my: 1 }} />
                  <ListItem disableGutters>
                    <ListItemIcon
                      sx={{ minWidth: 40, color: theme.palette.primary.main }}
                    >
                      <EmailOutlined />
                    </ListItemIcon>
                    <ListItemText
                      primary="Email"
                      secondary={customerDetails.email || "Not provided"}
                    />
                  </ListItem>
                  <Divider component="li" sx={{ my: 1 }} />
                  <ListItem disableGutters>
                    <ListItemIcon
                      sx={{ minWidth: 40, color: theme.palette.primary.main }}
                    >
                      <PhoneAndroid />
                    </ListItemIcon>
                    <ListItemText
                      primary="Phone"
                      secondary={customerDetails.phone || "Not provided"}
                    />
                  </ListItem>
                  <Divider
                    variant="middle"
                    component="li"
                    sx={{ my: 2, borderColor: theme.palette.primary.light }}
                  />
                  <ListItem disableGutters>
                    <ListItemIcon
                      sx={{ minWidth: 40, color: theme.palette.secondary.main }}
                    >
                      <BuildOutlined /> {/* Icon for Service Type */}
                    </ListItemIcon>
                    <ListItemText
                      primary="Service Type"
                      secondary={customerDetails.serviceType || "Not selected"}
                    />
                  </ListItem>
                  <Divider component="li" sx={{ my: 1 }} />
                  <ListItem disableGutters>
                    <ListItemIcon
                      sx={{ minWidth: 40, color: theme.palette.secondary.main }}
                    >
                      <CalendarToday />
                    </ListItemIcon>
                    <ListItemText
                      primary="Appointment Date"
                      secondary={customerDetails.appointmentDate || "N/A"}
                    />
                  </ListItem>
                  <Divider component="li" sx={{ my: 1 }} />
                  <ListItem disableGutters>
                    <ListItemIcon
                      sx={{ minWidth: 40, color: theme.palette.secondary.main }}
                    >
                      <TimelapseOutlined />
                    </ListItemIcon>
                    <ListItemText
                      primary="Preferred Time Slot"
                      secondary={
                        customerDetails.appointmentTime || "Any Time / Flexible"
                      }
                    />
                  </ListItem>
                  {customerDetails.notes && (
                    <>
                      <Divider component="li" sx={{ my: 1 }} />
                      <ListItem disableGutters>
                        <ListItemIcon
                          sx={{
                            minWidth: 40,
                            color: theme.palette.secondary.main,
                          }}
                        >
                          <NotesOutlined />
                        </ListItemIcon>
                        <ListItemText
                          primary="Notes"
                          secondary={customerDetails.notes}
                          sx={{ whiteSpace: "pre-wrap" }}
                        />
                      </ListItem>
                    </>
                  )}
                </List>
              </Paper>
            </Box>
          </Fade>
        );
      default:
        return <Typography>Unknown Step</Typography>;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={6}
        sx={{
          p: { xs: 2, sm: 3, md: 5 },
          borderRadius: 3,
          transition: "box-shadow 0.3s ease-in-out",
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} mb={4}>
          <Avatar
            sx={{ bgcolor: theme.palette.primary.main, width: 56, height: 56 }}
          >
            <EventNote fontSize="large" />
          </Avatar>
          <Typography
            variant="h3"
            component="h1"
            fontWeight="bold"
            color="primary"
          >
            Book Your Appointment
          </Typography>
        </Stack>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
          Fill in the details below to schedule your service with us. It only
          takes a few minutes!
        </Typography>

        {(submissionStatus === "success" ||
          submissionStatus === "error" ||
          submissionStatus === "loading") && (
          <Zoom
            in={
              submissionStatus === "success" ||
              submissionStatus === "error" ||
              submissionStatus === "loading"
            }
            timeout={300}
          >
            <Alert
              severity={
                submissionStatus === "success"
                  ? "success"
                  : submissionStatus === "error"
                  ? "error"
                  : "info"
              }
              iconMapping={{
                success: <CheckCircleOutline fontSize="inherit" />,
                error: <ErrorOutline fontSize="inherit" />,
              }}
              sx={{ mb: 3, alignItems: "center" }}
              action={
                (submissionStatus === "success" ||
                  submissionStatus === "error") && (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => setSubmissionStatus("idle")}
                  >
                    CLOSE
                  </Button>
                )
              }
            >
              {submissionMessage}
            </Alert>
          </Zoom>
        )}

        {submissionStatus !== "success" && (
          <>
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
              {steps.map((label, index) => (
                <Step key={label} completed={activeStep > index}>
                  <StepLabel
                    StepIconProps={{
                      style: {
                        color:
                          activeStep >= index
                            ? theme.palette.primary.main
                            : theme.palette.grey[400],
                      },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            <Box minHeight={350}>
              {" "}
              {/* Adjusted minHeight for potentially taller content */}
              {renderStepContent(activeStep)}
            </Box>

            <Stack
              direction="row"
              justifyContent="space-between"
              mt={5}
              pt={2}
              borderTop={1}
              borderColor="divider"
            >
              <Button
                variant="outlined"
                color="secondary"
                disabled={activeStep === 0 || submissionStatus === "loading"}
                onClick={handleBack}
                sx={{ borderRadius: 2, textTransform: "none", px: 3 }}
              >
                Back
              </Button>
              {activeStep < steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={submissionStatus === "loading"}
                  sx={{ borderRadius: 2, textTransform: "none", px: 4 }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  color="primary"
                  disabled={submissionStatus === "loading"}
                  startIcon={
                    submissionStatus === "loading" ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <CheckCircleOutline />
                    )
                  }
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    px: 4,
                    minWidth: 220,
                  }}
                >
                  {submissionStatus === "loading"
                    ? "Booking..."
                    : "Confirm & Book Appointment"}
                </Button>
              )}
            </Stack>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default Home;
