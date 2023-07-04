import Courses from "./Courses";
import Navbar from "./Navbar";
import {
  TextField,
  Card,
  CardContent,
  Grid,
  Typography,
  Paper,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  DialogContentText,
} from "@mui/material";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useState } from "react";
import { useContext } from "react";
import { UserContext } from "../App";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { courses } from "../data/courses";

// Function to create a course in database (parsed for frontend)
async function CreateCourse(courseName, courseDescription, ownerID) {
  // make API call to get all courses
  try {
    // send get request to REST API
    let res = await fetch(`${import.meta.env.VITE_API_URL}/courses/create`, {
      method: "POST",
      body: JSON.stringify({
        name: courseName,
        description: courseDescription,
        owner: ownerID,
      }),
      // header neccessary for correct sending of information
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
      credentials: "include",
    });

    // parse return statement from backend
    let resJson = await res.json();

    if (res.status === 200) {
      alert(resJson.msg);
      return resJson.newCourse;
    }
    if (res.status === 401 && resJson.msg === "Unauthorized") {
      return { status: 401, msg: "Unauthorized" };
    }
    return { status: 500, msg: "Not successful and authorized" };
  } catch (err) {
    console.log("Frontend error. Get request could not be sent. Check API!");
  }
}

// Function to return all courses in database (parsed for frontend)
async function GetAllCourseIdDescs() {
  // make API call to get all courses
  try {
    // send get request to REST API
    let res = await fetch(`${import.meta.env.VITE_API_URL}/courseIdDescs`, {
      method: "GET",
      // header neccessary for correct sending of information
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
      credentials: "include",
    });

    // parse return statement from backend
    let resJson = await res.json();

    if (res.status === 200) {
      return resJson;
    }
    if (res.status === 401 && resJson.msg === "Unauthorized") {
      return { status: 401, msg: "Unauthorized" };
    }
    return { status: 500, msg: "Not successful and authorized" };
  } catch (err) {
    console.log("Frontend error. Get request could not be sent. Check API!");
  }
}

function HomePage() {
  // use existing session
  const [userSession, setUserSession] = useContext(UserContext);
  const navigate = useNavigate();

  // setting the initial loading state to false
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [courseIdDescs, setCourseIdDescs] = useState();

  // useEffect first time it is rendering
  useEffect(() => {
    // get all courses
    GetAllCourseIdDescs()
      .then((res) => {
        if (res.status === 401 && res.msg === "Unauthorized") {
          alert(res.msg);
          setUserSession(false);
          navigate("/");
        } else {
          // use promise to set courses
          setCourseIdDescs(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        setLoading(false);
        setError(true);
      });
  }, []);
  // console.log("courseIdDescs in homepage: ", courseIdDescs);

  // take user information from global context
  // TODO: remove the prop, since userSession is global OR make it all one prop
  const user = userSession;

  const [open, setOpen] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");

  // Function for setting the course title
  const handleNewCourse = (e) => {
    setCourseName(e.target.value);
  };

  // Function for setting the course description
  const handleCourseDescription = (e) => {
    setCourseDescription(e.target.value);
  };

  // Function for opening the Dialog
  const handleClickOpen = () => {
    setOpen(true);
  };

  // Function for canceling te creation of a new course
  const handleClickCancel = () => {
    setOpen(false);
    setCourseName("");
    setCourseDescription("");
  };

  // Function for saving a new course
  const handleClickSave = () => {
    // create new course in db
    CreateCourse(courseName, courseDescription, userSession.id)
      .then((newCourse) => {
        if (newCourse.status === 401 && newCourse.msg === "Unauthorized") {
          alert(newCourse.msg);
          setUserSession(false);
          navigate("/");
        } else {
          // use promise to add new course to list of all courses
          setCourseIdDescs([...courseIdDescs, newCourse]);
          setLoading(false);
        }
      })
      .catch((err) => {
        navigate("/");
        setLoading(false);
        setError(true);
      });
    setOpen(false);
  };

  return (
    <>
      <Grid container spacing={2} sx={{ justifyContent: "center" }}>
        {/* Grid for the NavigationBar */}
        <Grid item xs={12}>
          <Navbar />
        </Grid>
        <Grid item xs={10}>
          <Grid container>
            {/* Grid for showing the title of the page */}
            <Grid item xs={10.7}>
              <Typography variant="h5">All Courses</Typography>
            </Grid>
            <Grid item xs={1.3}>
              <Button variant="contained" onClick={handleClickOpen}>
                Create New
              </Button>
              {/* Dialog for creating a new course */}
              <Dialog open={open}>
                <DialogContent>
                  <Grid container spacing={2}>
                    <DialogContentText>Create a new course</DialogContentText>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Course name"
                        variant="outlined"
                        sx={{ flexGrow: 1 }}
                        onChange={handleNewCourse}
                        value={courseName}
                      ></TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Course description"
                        variant="outlined"
                        sx={{ flexGrow: 1 }}
                        onChange={handleCourseDescription}
                        value={courseDescription}
                      ></TextField>
                    </Grid>
                  </Grid>
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleClickSave}>Save</Button>
                  <Button onClick={handleClickCancel}>Cancel</Button>
                </DialogActions>
              </Dialog>
            </Grid>
          </Grid>
        </Grid>
        {/* Grid for showing all Course Cards and Searchbar*/}
        <Grid item xs={10}>
          {/* allow backend to do its magic */}
          {loading && <></>}
          {error && <></>}
          {courseIdDescs && (
            <>
              <Courses user={user} courseIdDescs={courseIdDescs}></Courses>
            </>
          )}
        </Grid>
      </Grid>
    </>
  );
}
export default HomePage;
