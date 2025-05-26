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
  AlertTitle,
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
  Chip,
  OutlinedInput,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase"; // Ensure this path is correct
import {
  CalendarToday,
  PhoneAndroid,
  NotesOutlined,
  PersonOutline,
  EventNote,
  CheckCircleOutline,
  ErrorOutline,
  TimelapseOutlined,
  Edit as EditIcon,
  ArrowBackIosNew as ArrowBackIcon,
  ArrowForwardIos as ArrowForwardIcon,
  WarningAmberOutlined,
  DirectionsCar as CarIcon,
  LocalCarWash as CarWashIcon,
} from "@mui/icons-material";

// --- Updated Interfaces ---
interface CustomerDetails {
  name: string;
  carMakeAndModel: string; // Combined field
  phone: string;
  serviceType: string[];
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
}

interface AppointmentDataFromFirestore
  extends Omit<CustomerDetails, "appointmentDate" | "serviceType"> {
  appointmentDate: string | { seconds: number; nanoseconds: number };
  serviceType: string[];
  // Ensure carMakeAndModel is expected if data structure in Firestore changes
  // If Firestore has old separate fields, conversion logic would be needed in checkExistingAppointment or handleEdit
  carMakeAndModel: string; // Assuming Firestore will store the combined field
  createdAt?: any;
  updatedAt?: any;
  status?: string;
}

// --- Updated REQUIRED_FIELDS ---
const REQUIRED_FIELDS: (keyof CustomerDetails)[] = [
  "name",
  "phone",
  "carMakeAndModel", // Updated
  "serviceType",
  "appointmentDate",
];

const carDetailingServices = [
  "Exterior Wash & Dry",
  "Interior Vacuum & Wipe Down",
  "Rim Restoration",
  "Wax & Polish",
  "Full Interior Detail",
  "Engine Bay Cleaning",
  "Headlight Restoration",
  "Ceramic Coating Application",
];

const checkExistingAppointment = async (
  phone: string
): Promise<{ id: string; data: AppointmentDataFromFirestore } | null> => {
  if (!phone || phone.length !== 10) return null;
  const appointmentsRef = collection(db, "appointments");
  const q = query(
    appointmentsRef,
    where("phone", "==", phone),
    where("status", "in", ["scheduled", "in progress"]),
    limit(1)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    return {
      id: docSnap.id,
      data: docSnap.data() as AppointmentDataFromFirestore,
    };
  }
  return null;
};

const steps = ["Contact & Vehicle", "Service Selection", "Review & Confirm"];

const Home: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isMediumScreen = useMediaQuery(theme.breakpoints.between("sm", "md"));

  // --- Updated initialCustomerDetails ---
  const initialCustomerDetails: CustomerDetails = {
    name: "",
    carMakeAndModel: "", // Updated
    phone: "",
    serviceType: [],
    appointmentDate: "",
    appointmentTime: "",
    notes: "",
  };

  const [activeStep, setActiveStep] = useState(0);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>(
    initialCustomerDetails
  );
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "loading" | "success" | "error" | "warning"
  >("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {}
  );
  const [existingAppointmentId, setExistingAppointmentId] = useState<
    string | null
  >(null);
  const [dataToEdit, setDataToEdit] =
    useState<AppointmentDataFromFirestore | null>(null);

  // --- Updated getFieldsForStep ---
  const getFieldsForStep = (step: number): (keyof CustomerDetails)[] => {
    if (step === 0) return ["name", "phone", "carMakeAndModel"]; // Updated
    if (step === 1)
      return ["serviceType", "appointmentDate", "appointmentTime", "notes"];
    return [];
  };

  const validateStep = (currentStep: number): boolean => {
    let isValid = true;
    const fieldsInStep = getFieldsForStep(currentStep);
    fieldsInStep.forEach((field) => {
      const value = customerDetails[field];
      if (field === "serviceType") {
        if (!Array.isArray(value) || value.length === 0) isValid = false;
      } else {
        const trimmedValue =
          typeof value === "string" ? (value as string).trim() : "";
        if (REQUIRED_FIELDS.includes(field) && !trimmedValue) isValid = false;
        if (field === "phone" && trimmedValue && trimmedValue.length !== 10)
          isValid = false;
      }
    });
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
      window.scrollTo(0, 0);
    } else {
      const currentStepFields = getFieldsForStep(activeStep);
      const updatedTouchedFields = { ...touchedFields };
      currentStepFields.forEach((field) => {
        const value = customerDetails[field];
        let fieldIsInvalid = false;
        if (field === "serviceType") {
          if (!Array.isArray(value) || value.length === 0)
            fieldIsInvalid = true;
        } else {
          const trimmedValue =
            typeof value === "string" ? (value as string).trim() : "";
          if (
            (REQUIRED_FIELDS.includes(field) && !trimmedValue) ||
            (field === "phone" && trimmedValue && trimmedValue.length !== 10)
          ) {
            fieldIsInvalid = true;
          }
        }
        if (
          fieldIsInvalid ||
          (!updatedTouchedFields[field] && REQUIRED_FIELDS.includes(field))
        ) {
          updatedTouchedFields[field] = true;
        }
      });
      setTouchedFields(updatedTouchedFields);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    window.scrollTo(0, 0);
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    let { name, value } = e.target;
    let processedValue = value;
    if (name === "phone") {
      processedValue = value.replace(/\D/g, "").slice(0, 10);
    }
    setCustomerDetails((prev) => ({ ...prev, [name]: processedValue }));
    if (!touchedFields[name]) {
      setTouchedFields((prev) => ({ ...prev, [name]: true }));
    }
  };

  const handleServiceChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    setCustomerDetails((prev) => ({
      ...prev,
      serviceType: typeof value === "string" ? value.split(",") : value,
    }));
    if (!touchedFields.serviceType) {
      setTouchedFields((prev) => ({ ...prev, serviceType: true }));
    }
  };

  const handleEditExistingAppointment = () => {
    if (dataToEdit) {
      let formReadyDate = dataToEdit.appointmentDate as string;
      if (
        typeof dataToEdit.appointmentDate === "object" &&
        dataToEdit.appointmentDate?.seconds
      ) {
        formReadyDate = new Date(dataToEdit.appointmentDate.seconds * 1000)
          .toISOString()
          .split("T")[0];
      }
      setCustomerDetails({
        name: dataToEdit.name || "",
        carMakeAndModel: dataToEdit.carMakeAndModel || "", // Updated
        phone: dataToEdit.phone || "",
        serviceType: Array.isArray(dataToEdit.serviceType)
          ? dataToEdit.serviceType
          : [],
        appointmentDate: formReadyDate,
        appointmentTime: dataToEdit.appointmentTime || "",
        notes: dataToEdit.notes || "",
      });
      setActiveStep(0);
      setSubmissionStatus("idle");
      setTouchedFields({});
      setDataToEdit(null);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    if (activeStep === steps.length - 1) {
      const allRelevantFields = [
        ...getFieldsForStep(0),
        ...getFieldsForStep(1),
      ];
      const updatedTouchedFields = { ...touchedFields };
      allRelevantFields.forEach((field) => {
        if (REQUIRED_FIELDS.includes(field) || field === "phone") {
          updatedTouchedFields[field] = true;
        }
      });
      setTouchedFields(updatedTouchedFields);
    }

    if (!validateStep(0) || !validateStep(1)) {
      setSubmissionStatus("error");
      setSubmissionMessage(
        "Please ensure all required fields are correctly filled out."
      );
      if (!validateStep(0)) setActiveStep(0);
      else if (!validateStep(1)) setActiveStep(1);
      return;
    }

    setSubmissionStatus("loading");

    if (existingAppointmentId) {
      setSubmissionMessage("Updating your appointment...");
      try {
        const appointmentRef = doc(db, "appointments", existingAppointmentId);
        await updateDoc(appointmentRef, {
          ...customerDetails,
          updatedAt: serverTimestamp(),
          status: "scheduled",
        });
        setSubmissionStatus("success");
        setSubmissionMessage("Appointment successfully updated!");
        setActiveStep(0);
        setCustomerDetails(initialCustomerDetails);
        setTouchedFields({});
        setExistingAppointmentId(null);
        setTimeout(() => setSubmissionStatus("idle"), 6000);
      } catch (error) {
        console.error("Update error:", error);
        setSubmissionStatus("error");
        setSubmissionMessage("Failed to update appointment. Please try again.");
      }
      return;
    }

    setSubmissionMessage("Checking for existing appointments...");
    try {
      const existingAppt = await checkExistingAppointment(
        customerDetails.phone
      );
      if (existingAppt) {
        setDataToEdit(existingAppt.data);
        setExistingAppointmentId(existingAppt.id);
        setSubmissionStatus("warning");
        setSubmissionMessage(
          "An appointment with this phone number already exists."
        );
        return;
      }
    } catch (error) {
      console.error("Error checking existing appointment:", error);
      setSubmissionStatus("error");
      setSubmissionMessage(
        "Could not verify existing appointments. Please try again."
      );
      return;
    }

    setSubmissionMessage("Booking your appointment...");
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
      setCustomerDetails(initialCustomerDetails);
      setTouchedFields({});
      setExistingAppointmentId(null);
      setDataToEdit(null);
      setTimeout(() => setSubmissionStatus("idle"), 6000);
    } catch (error) {
      console.error("Submission error:", error);
      setSubmissionStatus("error");
      setSubmissionMessage("Failed to book appointment. Please try again.");
    }
  };

  const isFieldInvalid = (fieldName: keyof CustomerDetails): boolean => {
    if (!touchedFields[fieldName]) return false;
    const value = customerDetails[fieldName];
    if (fieldName === "serviceType")
      return !Array.isArray(value) || value.length === 0;
    const trimmedValue =
      typeof value === "string" ? (value as string).trim() : "";
    if (REQUIRED_FIELDS.includes(fieldName) && !trimmedValue) return true;
    if (fieldName === "phone" && trimmedValue && trimmedValue.length !== 10)
      return true;
    return false;
  };

  // --- Updated getFieldLabel ---
  const getFieldLabel = (fieldName: keyof CustomerDetails): string => {
    const labels: Partial<Record<keyof CustomerDetails, string>> = {
      name: "Full Name",
      carMakeAndModel: "Car Make & Model", // Updated
      phone: "Phone Number",
      serviceType: "Services",
      appointmentDate: "Preferred Date",
      appointmentTime: "Preferred Time",
      notes: "Additional Notes",
    };
    return labels[fieldName] || fieldName;
  };

  const getHelperText = (fieldName: keyof CustomerDetails): string => {
    if (touchedFields[fieldName]) {
      const value = customerDetails[fieldName];
      if (fieldName === "serviceType") {
        if (!Array.isArray(value) || value.length === 0)
          return "Please select at least one service.";
      } else {
        const trimmedValue =
          typeof value === "string" ? (value as string).trim() : "";
        if (REQUIRED_FIELDS.includes(fieldName) && !trimmedValue)
          return `${getFieldLabel(fieldName)} is required.`;
        if (fieldName === "phone" && trimmedValue && trimmedValue.length !== 10)
          return "Phone number must be 10 digits.";
      }
    }
    return "";
  };

  const renderStepContent = (step: number) => {
    const commonTextFieldProps = {
      variant: "outlined" as const,
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
      case 0: // Contact & Vehicle
        return (
          <Stack spacing={isMobile ? 2.5 : 3} sx={{ mt: 2 }}>
            <Typography
              variant={isMobile ? "h6" : "h5"}
              sx={{ mb: 1, fontWeight: 500, color: "text.secondary" }}
            >
              Your Information
            </Typography>
            <TextField
              {...commonTextFieldProps}
              required
              name="name"
              label="Full Name"
              value={customerDetails.name}
              error={isFieldInvalid("name")}
              helperText={getHelperText("name")}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutline />
                    </InputAdornment>
                  ),
                },
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
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneAndroid />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Typography
              variant={isMobile ? "h6" : "h5"}
              sx={{ mt: 2.5, mb: 1, fontWeight: 500, color: "text.secondary" }}
            >
              Vehicle Information
            </Typography>
            {/* --- Combined Car Make and Model Field --- */}
            <TextField
              {...commonTextFieldProps}
              required
              name="carMakeAndModel"
              label="Car Make & Model"
              value={customerDetails.carMakeAndModel}
              error={isFieldInvalid("carMakeAndModel")}
              helperText={getHelperText("carMakeAndModel")}
              placeholder="e.g., Toyota Camry"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <CarIcon />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Stack>
        );
      case 1: // Service Selection
        return (
          <Stack spacing={isMobile ? 2.5 : 3} sx={{ mt: 2 }}>
            <Typography
              variant={isMobile ? "h6" : "h5"}
              sx={{ mb: 1, fontWeight: 500, color: "text.secondary" }}
            >
              Select Services & Scheduling
            </Typography>
            <FormControl
              {...commonFormControlProps}
              required
              error={isFieldInvalid("serviceType")}
            >
              <InputLabel id="service-type-label">
                Services (select one or more)
              </InputLabel>
              <Select
                multiple
                name="serviceType"
                labelId="service-type-label"
                value={customerDetails.serviceType}
                onChange={handleServiceChange}
                onBlur={() =>
                  setTouchedFields((prev) => ({ ...prev, serviceType: true }))
                }
                input={<OutlinedInput label="Services (select one or more)" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {carDetailingServices.map((service) => (
                  <MenuItem key={service} value={service}>
                    {service}
                  </MenuItem>
                ))}
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
                {...commonTextFieldProps}
                required
                name="appointmentDate"
                label="Preferred Date"
                type="date"
                value={customerDetails.appointmentDate}
                error={isFieldInvalid("appointmentDate")}
                helperText={getHelperText("appointmentDate")}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday />
                      </InputAdornment>
                    ),
                    sx: isMobile ? { minHeight: theme.spacing(7.5) } : {},
                  },
                }}
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
                  onChange={(e) => handleInputChange(e as any)}
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
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <NotesOutlined />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Stack>
        );
      case 2: // Review & Confirm
        const detailItems = [
          {
            icon: <PersonOutline />,
            label: "Name",
            value: customerDetails.name,
            field: "name",
            step: 0,
          },
          {
            icon: <PhoneAndroid />,
            label: "Phone",
            value: customerDetails.phone,
            field: "phone",
            step: 0,
          },
          // --- Updated to show combined Car Make & Model ---
          {
            icon: <CarIcon />,
            label: "Car Make & Model",
            value: customerDetails.carMakeAndModel,
            field: "carMakeAndModel",
            step: 0,
          },
          {
            icon: <CarWashIcon />,
            label: "Services",
            value: customerDetails.serviceType.join(", ") || "Not selected",
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
                  {detailItems.map((item) => (
                    <ListItem
                      key={item.field}
                      disableGutters
                      secondaryAction={
                        !existingAppointmentId && (
                          <Tooltip title={`Edit ${item.label}`}>
                            <IconButton
                              size="small"
                              onClick={() => setActiveStep(item.step)}
                              sx={{ color: "text.secondary" }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )
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
                        !existingAppointmentId && (
                          <Tooltip title="Edit Notes">
                            <IconButton
                              size="small"
                              onClick={() => setActiveStep(1)}
                              sx={{ color: "text.secondary" }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )
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
            theme.palette.mode === "dark" || isMobile ? "none" : "blur(8px)",
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
            Book Car Detailing
          </Typography>
        </Stack>
        <Typography
          variant={isMobile ? "body2" : "body1"}
          color="text.secondary"
          sx={{ mb: { xs: 2.5, sm: 3.5 } }}
        >
          Complete the steps below to schedule your car detailing service.
        </Typography>

        {submissionStatus !== "idle" && (
          <Zoom in={(submissionStatus as string) !== "idle"} timeout={300}>
            <Alert
              severity={
                submissionStatus === "loading" ? "info" : submissionStatus
              }
              iconMapping={{
                info: <CircularProgress size={20} color="inherit" />,
                success: <CheckCircleOutline fontSize="inherit" />,
                error: <ErrorOutline fontSize="inherit" />,
                warning: <WarningAmberOutlined fontSize="inherit" />,
              }}
              sx={{
                mb: 3,
                p: 2,
                borderRadius: "12px",
                alignItems: "flex-start",
                "& .MuiAlert-icon": { fontSize: "1.75rem", mr: 1.5, mt: 0.5 },
                "& .MuiAlert-message": {
                  fontSize: "1rem",
                  lineHeight: 1.5,
                  textAlign: "left",
                  paddingRight: { sm: theme.spacing(1) },
                },
                "& .MuiAlert-action": {
                  mt: { xs: 1, sm: 0.5 },
                  mr: { xs: 0, sm: -0.5 },
                  alignSelf: { xs: "stretch", sm: "center" },
                },
              }}
              action={
                submissionStatus === "warning" ? (
                  <Stack
                    spacing={1}
                    direction={{ xs: "column", sm: "row" }}
                    sx={{
                      width: { xs: "100%", sm: "auto" },
                      alignItems: { xs: "stretch", sm: "center" },
                    }}
                  >
                    {" "}
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleEditExistingAppointment}
                      sx={{ boxShadow: "none", flexGrow: { xs: 1, sm: 0 } }}
                    >
                      {" "}
                      Edit Existing{" "}
                    </Button>{" "}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setSubmissionStatus("idle");
                        setExistingAppointmentId(null);
                        setDataToEdit(null);
                      }}
                      sx={{ flexGrow: { xs: 1, sm: 0 } }}
                    >
                      {" "}
                      Cancel New Booking{" "}
                    </Button>{" "}
                  </Stack>
                ) : (
                  (submissionStatus === "success" ||
                    submissionStatus === "error") && (
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => setSubmissionStatus("idle")}
                    >
                      {" "}
                      CLOSE{" "}
                    </Button>
                  )
                )
              }
            >
              {submissionStatus === "warning" && (
                <AlertTitle sx={{ fontWeight: 600, mb: 0.5 }}>
                  {" "}
                  Existing Appointment Found{" "}
                </AlertTitle>
              )}
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
              alternativeLabel={!isMobile && !isMediumScreen}
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
                  variant="text"
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
                type={activeStep === steps.length - 1 ? "button" : "submit"}
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
                  ) : activeStep === steps.length - 1 &&
                    !existingAppointmentId ? (
                    <CheckCircleOutline />
                  ) : activeStep === steps.length - 1 &&
                    existingAppointmentId ? (
                    <EditIcon fontSize="small" />
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
                {existingAppointmentId && activeStep === steps.length - 1
                  ? "Update Appointment"
                  : submissionStatus === "loading" &&
                    activeStep === steps.length - 1
                  ? existingAppointmentId
                    ? "Updating..."
                    : "Booking..."
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
