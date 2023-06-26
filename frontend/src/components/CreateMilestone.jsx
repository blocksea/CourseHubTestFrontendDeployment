import * as React from "react";
import Timeline from "./Timeline";
import ApexTimeline from "./ApexTimeline";
import ApexTimelineScatter from "./ApexTimelineScatter";
import {
  Grid,
  Box,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  DialogContentText,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  TextField,
  Checkbox,
  Typography,
  Card,
} from "@mui/material";
import AssignmentList from "./AssignmentList";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useState } from "react";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { DemoItem } from "@mui/x-date-pickers/internals/demo";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import CreateTask from "./CreateTask";

// Function for Showing the Add Milestone button
function CreateMileStone({ isOwner }) {
  const [open, setOpen] = useState(false);
  const [milestoneType, setMilestoneType] = useState("");
  const [date, setDate] = useState(dayjs());

  // Function for opening the dialog
  const handleClickOpen = () => {
    setOpen(true);
  };

  // Function for canceling the milestone creation
  const handleClickCancel = () => {
    setOpen(false);
    setMilestoneType("");
    setDate(dayjs());
  };

  // Function for saving the milestone
  // TODO: Connection to backend
  const handleClickSave = () => {};

  // Function for selecting milestone type
  const handleChange = (event) => {
    setMilestoneType(event.target.value);
  };

  // Show MileStone Button only when user is owner of course
  if (isOwner) {
    return (
      <>
        <Button variant="outlined" onClick={handleClickOpen}>
          Add Milestone
        </Button>
        {/* Dialog for adding a new Milestone */}
        <Dialog open={open}>
          <DialogTitle>Add a milestone</DialogTitle>
          <DialogContent>
            {/* Dropdown Menu for selecting the Milestone Type */}
            <FormControl fullWidth>
              <InputLabel>Milestone Type</InputLabel>
              <Select
                value={milestoneType}
                label="MileStone Type"
                onChange={handleChange}
              >
                <MenuItem value={"Lecture"}>Lecture</MenuItem>
                <MenuItem value={"Exercise"}>Exercise</MenuItem>
                <MenuItem value={"Exam"}>Exam</MenuItem>
              </Select>
            </FormControl>
            {/* DatePicker for Selecting Milestone Date */}
            <FormControl fullWidth>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={date}
                  onChange={(date) => setDate(date)}
                ></DatePicker>
              </LocalizationProvider>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClickSave}>Save</Button>
            <Button onClick={handleClickCancel}>Cancel</Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
}

export default CreateMileStone;