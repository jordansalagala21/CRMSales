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
  useMediaQuery,
  alpha,
  IconButton,
  Tooltip,
  Avatar,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase"; // Ensure this path is correct
import {
  CalendarToday,
  PhoneAndroid,
  EmailOutlined,
  NotesOutlined,
  BuildOutlined,
  PersonOutline,
  EventNote,
  CheckCircleOutline,
  ErrorOutline,
  TimelapseOutlined,
  Edit as EditIcon,
  ArrowBackIosNew as ArrowBackIcon,
  ArrowForwardIos as ArrowForwardIcon,
} from "@mui/icons-material";

interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  serviceType: string;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
}

const REQUIRED_FIELDS: (keyof CustomerDetails)[] = [
  "name",
  "phone",
  "serviceType",
  "appointmentDate",
];

const Home: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isMediumScreen = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const [activeStep, setActiveStep] = useState(0);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: "",
    email: "",
    phone: "",
    serviceType: "",
    appointmentDate: "",
    appointmentTime: "",
    notes: "",
  });
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {}
  );

  const steps = ["Your Details", "Service Info", "Review & Book"];

  const getFieldsForStep = (step: number): (keyof CustomerDetails)[] => {
    if (step === 0) return ["name", "email", "phone"];
    if (step === 1)
      return ["serviceType", "appointmentDate", "appointmentTime", "notes"];
    return [];
  };

  const validateStep = (currentStep: number): boolean => {
    let isValid = true;
    const fieldsInStep = getFieldsForStep(currentStep);

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
      window.scrollTo(0, 0); // Scroll to top on step change
    } else {
      const currentStepFields = getFieldsForStep(activeStep);
      const updatedTouchedFields = { ...touchedFields };
      currentStepFields.forEach((field) => {
        // Only mark as touched if it's required and empty OR if it's email and invalid
        const value = customerDetails[field]?.trim();
        if (REQUIRED_FIELDS.includes(field) && !value) {
          updatedTouchedFields[field] = true;
        } else if (
          field === "email" &&
          value &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
          updatedTouchedFields[field] = true;
        } else if (
          !updatedTouchedFields[field] &&
          REQUIRED_FIELDS.includes(field)
        ) {
          updatedTouchedFields[field] = true; // Touch required fields if not already
        }
      });
      setTouchedFields(updatedTouchedFields);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    window.scrollTo(0, 0); // Scroll to top on step change
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCustomerDetails((prev) => ({ ...prev, [name]: value as string }));
    if (!touchedFields[name]) {
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
    // Validate all steps before submitting
    if (!validateStep(0) || !validateStep(1)) {
      setSubmissionStatus("error");
      setSubmissionMessage(
        "Please ensure all required fields are correctly filled out."
      );
      // Mark all fields as touched to reveal errors
      const allFields = [...getFieldsForStep(0), ...getFieldsForStep(1)];
      const updatedTouchedFields = { ...touchedFields };
      allFields.forEach((field) => (updatedTouchedFields[field] = true));
      setTouchedFields(updatedTouchedFields);

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
    if (!touchedFields[fieldName]) return false;
    const value = customerDetails[fieldName]?.trim();
    if (fieldName === "email")
      return !!(value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
    if (REQUIRED_FIELDS.includes(fieldName)) return !value;
    return false;
  };

  const getFieldLabel = (fieldName: keyof CustomerDetails): string => {
    const labels: Partial<Record<keyof CustomerDetails, string>> = {
      name: "Full Name",
      email: "Email Address",
      phone: "Phone Number",
      serviceType: "Service Type",
      appointmentDate: "Preferred Date",
      appointmentTime: "Preferred Time",
      notes: "Additional Notes",
    };
    return labels[fieldName] || fieldName;
  };

  const getHelperText = (fieldName: keyof CustomerDetails): string => {
    if (isFieldInvalid(fieldName)) {
      if (fieldName === "email") return "Please enter a valid email.";
      return `${getFieldLabel(fieldName)} is required.`;
    }
    return "";
  };

  const renderStepContent = (step: number) => {
    const commonTextFieldProps = {
      variant: "outlined" as const, // Using outlined variant for a cleaner look
      fullWidth: true,
      onChange: handleInputChange,
      onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setTouchedFields((prev) => ({ ...prev, [e.target.name]: true })),
    };

    const commonFormControlProps = {
      variant: "outlined" as const,
      fullWidth: true,
    };

    switch (step) {
      case 0: // Your Details
        return (
          <Stack spacing={isMobile ? 2.5 : 3} sx={{ mt: 2 }}>
            <Typography
              variant={isMobile ? "h6" : "h5"}
              sx={{ mb: 1, fontWeight: 500, color: "text.secondary" }}
            >
              Contact Information
            </Typography>
            <TextField
              {...commonTextFieldProps}
              required
              name="name"
              label="Full Name"
              value={customerDetails.name}
              error={isFieldInvalid("name")}
              helperText={getHelperText("name")}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              {...commonTextFieldProps}
              name="email"
              type="email"
              label="Email Address (Optional)"
              value={customerDetails.email}
              error={isFieldInvalid("email")}
              helperText={getHelperText("email")}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              {...commonTextFieldProps}
              required
              name="phone"
              type="tel"
              label="Phone Number"
              value={customerDetails.phone}
              error={isFieldInvalid("phone")}
              helperText={getHelperText("phone")}
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
      case 1: // Service Info
        return (
          <Stack spacing={isMobile ? 2.5 : 3} sx={{ mt: 2 }}>
            <Typography
              variant={isMobile ? "h6" : "h5"}
              sx={{ mb: 1, fontWeight: 500, color: "text.secondary" }}
            >
              Service & Scheduling
            </Typography>
            <FormControl
              {...commonFormControlProps}
              required
              error={isFieldInvalid("serviceType")}
            >
              <InputLabel id="service-type-label">Service Type</InputLabel>
              <Select
                name="serviceType"
                labelId="service-type-label"
                label="Service Type"
                value={customerDetails.serviceType}
                onChange={handleSelectChange}
                onBlur={() =>
                  setTouchedFields((prev) => ({ ...prev, serviceType: true }))
                }
                startAdornment={
                  <InputAdornment position="start" sx={{ mr: 0.5 }}>
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
                  sx={{ ml: 2, mt: 0.5 }}
                >
                  {getHelperText("serviceType")}
                </Typography>
              )}
            </FormControl>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={isMobile ? 2.5 : 2}
            >
              <TextField
                {...commonTextFieldProps} // Assuming this doesn't include the deprecated props
                required
                name="appointmentDate"
                label="Preferred Date"
                type="date"
                value={customerDetails.appointmentDate}
                error={isFieldInvalid("appointmentDate")}
                helperText={getHelperText("appointmentDate")}
                // --- Updated way using slotProps ---
                slotProps={{
                  inputLabel: {
                    // Replaces InputLabelProps
                    shrink: true,
                  },
                  input: {
                    // Replaces InputProps (applies to OutlinedInput, FilledInput, or Input)
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday />
                      </InputAdornment>
                    ),
                    // Apply sx styling for height directly to the input slot
                    sx: isMobile
                      ? {
                          minHeight: theme.spacing(7.5), // e.g., 60px. Adjust as needed.
                          // fontSize: '1.1rem', // Optional: if you want to increase font size too
                        }
                      : {},
                  },
                }}
                // --- End of slotProps usage ---
              />
              <FormControl {...commonFormControlProps}>
                <InputLabel id="appointment-time-label">
                  Preferred Time (Optional)
                </InputLabel>
                <Select
                  name="appointmentTime"
                  labelId="appointment-time-label"
                  label="Preferred Time (Optional)"
                  value={customerDetails.appointmentTime}
                  onChange={handleSelectChange}
                  startAdornment={
                    <InputAdornment position="start" sx={{ mr: 0.5 }}>
                      <TimelapseOutlined />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="">
                    <em>Any Time / Flexible</em>
                  </MenuItem>
                  <MenuItem value="Morning (9AM-12PM)">
                    Morning (9 AM - 12 PM)
                  </MenuItem>
                  <MenuItem value="Afternoon (12PM-3PM)">
                    Afternoon (12 PM - 3 PM)
                  </MenuItem>
                  <MenuItem value="Late Afternoon (3PM-5PM)">
                    Late Afternoon (3 PM - 5 PM)
                  </MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField
              {...commonTextFieldProps}
              name="notes"
              label="Additional Notes (Optional)"
              multiline
              rows={isMobile ? 3 : 4}
              value={customerDetails.notes}
              placeholder="Any specific details or requests?"
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
      case 2: // Review & Book
        const detailItems = [
          {
            icon: <PersonOutline />,
            label: "Name",
            value: customerDetails.name,
            field: "name",
            step: 0,
          },
          {
            icon: <EmailOutlined />,
            label: "Email",
            value: customerDetails.email || "Not provided",
            field: "email",
            step: 0,
          },
          {
            icon: <PhoneAndroid />,
            label: "Phone",
            value: customerDetails.phone,
            field: "phone",
            step: 0,
          },
          {
            icon: <BuildOutlined />,
            label: "Service",
            value: customerDetails.serviceType,
            field: "serviceType",
            step: 1,
          },
          {
            icon: <CalendarToday />,
            label: "Date",
            value: customerDetails.appointmentDate,
            field: "appointmentDate",
            step: 1,
          },
          {
            icon: <TimelapseOutlined />,
            label: "Time",
            value: customerDetails.appointmentTime || "Any Time",
            field: "appointmentTime",
            step: 1,
          },
        ];
        return (
          <Fade in={true} timeout={500}>
            <Box sx={{ mt: 2 }}>
              <Typography
                variant={isMobile ? "h6" : "h5"}
                sx={{ mb: 2, fontWeight: 500, color: "text.secondary" }}
              >
                Confirm Your Appointment
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  background: alpha(theme.palette.background.default, 0.5),
                }}
              >
                <List disablePadding>
                  {detailItems.map((item, _index) => (
                    <ListItem
                      key={item.field}
                      disableGutters
                      secondaryAction={
                        <Tooltip title={`Edit ${item.label}`}>
                          <IconButton
                            size="small"
                            onClick={() => setActiveStep(item.step)}
                            sx={{ color: "text.secondary" }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      }
                      sx={{
                        py: 0.75,
                        "&:not(:last-child)": {
                          borderBottom: `1px dashed ${theme.palette.divider}`,
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 36,
                          color: theme.palette.primary.main,
                          mr: 1,
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        secondary={item.value}
                        primaryTypographyProps={{
                          fontWeight: 500,
                          variant: "body2",
                        }}
                        secondaryTypographyProps={{
                          variant: "body1",
                          color: "text.primary",
                          sx: { wordBreak: "break-word" },
                        }}
                      />
                    </ListItem>
                  ))}
                  {customerDetails.notes && (
                    <ListItem
                      disableGutters
                      secondaryAction={
                        <Tooltip title="Edit Notes">
                          <IconButton
                            size="small"
                            onClick={() => setActiveStep(1)}
                            sx={{ color: "text.secondary" }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      }
                      sx={{ py: 0.75, pt: 1.5, alignItems: "flex-start" }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 36,
                          color: theme.palette.primary.main,
                          mr: 1,
                          mt: 0.5,
                        }}
                      >
                        <NotesOutlined />
                      </ListItemIcon>
                      <ListItemText
                        primary="Notes"
                        secondary={customerDetails.notes}
                        primaryTypographyProps={{
                          fontWeight: 500,
                          variant: "body2",
                        }}
                        secondaryTypographyProps={{
                          variant: "body1",
                          color: "text.primary",
                          whiteSpace: "pre-wrap",
                          sx: { wordBreak: "break-word" },
                        }}
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            </Box>
          </Fade>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
      {" "}
      {/* Changed to md for better form width */}
      <Paper
        elevation={isMobile ? 0 : 3}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: theme.shape.borderRadius * (isMobile ? 1.5 : 2),
          border: isMobile ? `1px solid ${theme.palette.divider}` : "none",
          bgcolor:
            theme.palette.mode === "dark"
              ? alpha(theme.palette.background.paper, 0.9)
              : alpha(theme.palette.background.paper, 0.95),
          backdropFilter:
            theme.palette.mode === "dark" || isMobile ? "none" : "blur(8px)", // Blur on desktop for non-dark mode
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ mb: { xs: 2, sm: 3 } }}
        >
          <Avatar
            sx={{
              bgcolor: "primary.main",
              width: { xs: 36, sm: 40 },
              height: { xs: 36, sm: 40 },
            }}
          >
            <EventNote fontSize={isMobile ? "small" : "medium"} />
          </Avatar>
          <Typography
            variant={isMobile ? "h6" : "h5"}
            component="h1"
            fontWeight="bold"
            color="primary.main"
          >
            Book an Appointment
          </Typography>
        </Stack>
        <Typography
          variant={isMobile ? "body2" : "body1"}
          color="text.secondary"
          sx={{ mb: { xs: 2.5, sm: 3.5 } }}
        >
          Complete the steps below to schedule your service.
        </Typography>

        {(submissionStatus === "success" ||
          submissionStatus === "error" ||
          submissionStatus === "loading") && (
          <Zoom in={submissionStatus !== ("idle" as any)} timeout={300}>
            <Alert
              severity={
                submissionStatus === "loading" ? "info" : submissionStatus
              }
              iconMapping={{
                info: <CircularProgress size={20} color="inherit" />,
                success: <CheckCircleOutline />,
                error: <ErrorOutline />,
              }}
              sx={{ mb: 3, alignItems: "center", borderRadius: 1.5 }}
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
              {submissionMessage ||
                (submissionStatus === "loading" &&
                  "Processing your request...")}
            </Alert>
          </Zoom>
        )}

        {submissionStatus !== "success" && (
          <Box
            component="form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              activeStep === steps.length - 1 ? handleSubmit() : handleNext();
            }}
          >
            <Stepper
              activeStep={activeStep}
              alternativeLabel={!isMobile && !isMediumScreen} // Only alternative on large screens
              orientation={
                isMobile || isMediumScreen ? "vertical" : "horizontal"
              }
              sx={{ mb: { xs: 2.5, sm: 4 } }}
            >
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel
                    StepIconProps={{
                      style: { color: theme.palette.primary.main },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            <Box sx={{ minHeight: { xs: "auto", sm: 380 }, py: 2 }}>
              {" "}
              {/* Auto height on xs, fixed on sm+ */}
              {renderStepContent(activeStep)}
            </Box>

            <Stack
              direction={{ xs: "column-reverse", sm: "row" }}
              spacing={isMobile ? 1.5 : 2}
              justifyContent={activeStep === 0 ? "flex-end" : "space-between"}
              alignItems="center"
              sx={{
                mt: { xs: 3, sm: 4 },
                pt: { xs: 1.5, sm: 2 },
                borderTop: `1px solid ${theme.palette.divider}`,
              }}
            >
              {activeStep > 0 && (
                <Button
                  variant="text" // Text button for back for less emphasis
                  color="secondary"
                  disabled={submissionStatus === "loading"}
                  onClick={handleBack}
                  startIcon={<ArrowBackIcon />}
                  sx={{
                    width: isMobile ? "100%" : "auto",
                    textTransform: "none",
                    fontWeight: 500,
                  }}
                >
                  Back
                </Button>
              )}
              <Button
                type={activeStep === steps.length - 1 ? "button" : "submit"} // Submit form on next, specific handler for final book
                onClick={
                  activeStep === steps.length - 1 ? handleSubmit : handleNext
                }
                variant="contained"
                color="primary"
                disabled={submissionStatus === "loading"}
                startIcon={
                  activeStep === steps.length - 1 &&
                  submissionStatus === "loading" ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : activeStep === steps.length - 1 ? (
                    <CheckCircleOutline />
                  ) : null
                }
                endIcon={
                  activeStep < steps.length - 1 ? <ArrowForwardIcon /> : null
                }
                sx={{
                  width: isMobile ? "100%" : "auto",
                  textTransform: "none",
                  fontWeight: 500,
                }}
              >
                {submissionStatus === "loading" &&
                activeStep === steps.length - 1
                  ? "Booking..."
                  : activeStep === steps.length - 1
                  ? "Confirm & Book"
                  : "Next"}
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Home;
