require("dotenv").config();
const express = require("express");
const cors = require("cors");
// file storage stuff
const path = require("path");
const fs = require("fs");
const multer = require("multer"); // for parsing FormData which is type multipart-bodies
// storage configuration for multer
let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    var path = "./public";
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: function (req, file, cb) {
    // extract type of data
    let extArray = file.mimetype.split("/");
    let extension = extArray[extArray.length - 1];

    var filename = file.fieldname + "_" + Date.now() + "." + extension;
    // use id of assignment and extension type to save the file
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
});
// user authentification stuff
const bcrypt = require("bcrypt");
const session = require("express-session");
const MongoDBstore = require("connect-mongodb-session")(session);
// db models
const UserModel = require("./models/dbUsers.js");
const CourseModel = require("./models/dbCourses.js");
const TaskModel = require("./models/dbTasks.js");
const CourseUserModel = require("./models/dbCourseUser.js");
// const checkAuth = require("./middleware/checkAuth.js");
// const isAuth = require("./middleware/isAuth.js");
const TimelineModel = require("./models/dbTimeline.js");
const MilestoneModel = require("./models/dbMilestones.js");
const TimelineUserModel = require("./models/dbTimelineUser.js");

// Define port
const port = 3600;

// Create Express app
const app = express();

// CORS configuration
const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD"],
  credentials: true, // needed to allow cookies to be sent between frontend/backend
};

// Add CORS to all routes and methods
app.use(cors(corsOptions));

// Enable parsing of JSON bodies
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

// enable static content content
app.use("/public", express.static(path.join(__dirname, "..", "public")));

// allow connect-mongodb-session library to save sessions under mySessions collection
const mongoDBstore = new MongoDBstore({
  uri: process.env.MONGODB_URL,
  databaseName: process.env.DB_NAME,
  collection: "userSessions",
});

// Add express-session to all routes
app.use(
  session({
    secret: process.env.COOKIE_SECRET,
    name: "session-id", // name of the cookies (key field)
    store: mongoDBstore,
    cookie: {
      maxAge: parseInt(process.env.SESSION_MAX_LENGTH), // Max. session length
      sameSite: false, // same-site and cross-site(diff. schemes, domain or sub-domain) requests
      secure: parseInt(process.env.PROD) === 0 ? false : true, // need an HTTPS enabled browser (true-> in prod.)
    },
    resave: true, // !!! true - force session to be saved in session store, even if it was not modified during a request
    saveUninitialized: false, // dont save session if it was not modified (i.e. no login yet)
    unset: "destroy", // delete cookie from db when it is null(completes task in a few minutes)
  })
);

// start listening to the port
app.listen(port, () => {
  console.log("Listening on " + port + ".");
});

// Function to check auth
const checkAuth = function (req, res, next) {
  // console.log(
  //   "checkAuth Called, userSession in session-store: ",
  //   req.session.user
  // );
  if (req.session.user) {
    // console.log("session exists");
    next();
  } else {
    return res.status(401).json({ msg: "Unauthorized" });
  }
};

// Route to check auth and return user info in cookie
app.route("/isAuth").get((req, res) => {
  // console.log(
  //   "isAuth Called, userSession(req.session.user) in session-store: ",
  //   req.session.user
  // );
  // console.log("isAuth Called, req.session in session-store: ", req.session);
  if (req.session.user) {
    return res.status(200).json(req.session.user);
  } else {
    return res.status(401).json({ msg: "Unauthorized" });
  }
});

//////////////////////// below are tested and working routes

// Create Task
app
  .route("/courseAddTask/:timelineId")
  .post(checkAuth, upload.array("allFiles"), async (req, res) => {
    let taskData = {
      type: req.body.type,
      title: req.body.title,
      description: req.body.description,
      data: new Date(req.body.data),
      timeline: req.params.timelineId,
    };
    if (req.body.type === "Quiz") {
      taskData.description = "quizDesc";
      taskData.questions = req.body.text;
      if (Array.isArray(req.body.answers)) {
        taskData.answers = req.body.answers.map((answer) => {
          return JSON.parse(answer);
        });
      } else {
        taskData.answers = [JSON.parse(req.body.answers)];
      }
      if (Array.isArray(req.body.answers)) {
        taskData.correctAnswers = req.body.correctAnswerIndices.map(
          (correctIndex) => {
            return JSON.parse(correctIndex);
          }
        );
      } else {
        taskData.correctAnswers = [JSON.parse(req.body.correctAnswerIndices)];
      }
    }
    let newTask;
    let subscriberTimelines = req.body.subscriberTimelines.split(",");
    console.log("req.files: ", req.files);
    console.log("req.body: ", req.body);
    // console.log("taskData: ", taskData);
    // console.log("req.body.answers: ", req.body.answers);
    // var test = req.body.answers.map((answer) => {
    //   return JSON.parse(answer);
    // });
    // console.log("JSON.parse(req.body.answers) in a map: ", test);
    try {
      // create new task
      newTask = new TaskModel(taskData);

      // save task in db
      const resultNewTask = await newTask.save();

      if (!resultNewTask) {
        res.status(400).json({ msg: "New Task not created" });
      }
      // console.log("resultNewTask: ", resultNewTask);
      // let newFileNames = [];
      // let originalFileNames = [];
      let toPush = [];
      // extract names of saved files
      const currFileNames = req.files.map((file) => file.filename);

      // console.log("currFileNames: ", currFileNames);

      // console.log("currFileNames: ", currFileNames);
      currFileNames.forEach((fileName, idx) => {
        var oldFileNameArr = fileName.split("_");
        // console.log("oldFileName: ", `./public/${fileName}`);
        // console.log(
        //   "newFileName: ",
        //   `./public/${resultNewTask._id}_${oldFileNameArr[1]}`
        // );
        // newFileNames = [
        //   ...newFileNames,
        //   `${resultNewTask._id}_${oldFileNameArr[1]}`,
        // ];

        toPush = [
          ...toPush,
          {
            originalFileName: req.files[idx].originalname,
            fileName: `${resultNewTask._id}_${oldFileNameArr[1]}`,
          },
        ];
        fs.rename(
          `./public/${fileName}`,
          `./public/${resultNewTask._id}_${oldFileNameArr[1]}`,
          function (err) {
            if (err) console.log("ERROR: " + err);
          }
        );
      });
      // console.log("done");
      // console.log("original filenames: ", originalFileNames);
      // console.log("toPush: ", toPush);
      // find task model and update the list of filenames
      const resultUpdateTask = await TaskModel.findByIdAndUpdate(newTask._id, {
        $push: {
          files: {
            $each: toPush,
          },
        },
      });

      if (!resultUpdateTask) {
        res
          .status(400)
          .json({ msg: "Taskmodel not updated (filenames were not added)" });
      }
      console.log("resultUpdateTask: ", resultUpdateTask);

      // find timeline and add the new task to it
      const result = await TimelineModel.findByIdAndUpdate(
        req.params.timelineId,
        {
          $push: {
            tasks: newTask,
          },
        }
      );
      if (!result) {
        res
          .status(400)
          .json({ msg: "Timeline not updated (assignment was not added)" });
      }

      // console.log(resultUpdateTask);
      // console.log(result);
      // console.log("subscriberTimelines: ", subscriberTimelines);
      let subscriberTimelineId;
      // parse each subscriber's timeline
      for (var subscriberTimeline in subscriberTimelines) {
        // get id of each subscriberTimelineId (if-statement needed for the case of only 1 subscriber)
        if (Array.isArray(subscriberTimelines)) {
          subscriberTimelineId = subscriberTimelines[subscriberTimeline];
        } else {
          subscriberTimelineId = subscriberTimelines;
        }
        if (subscriberTimelineId === "") {
          break;
        }

        // console.log("subscriberTimelineId: ", subscriberTimelineId);

        // add new task status to the user's timeline
        const result = await TimelineUserModel.findByIdAndUpdate(
          subscriberTimelineId,
          {
            $push: {
              userTasksStats: {
                originalTaskId: newTask._id,
                userTaskSatus: newTask.status,
                userTaskScore: 0,
              },
            },
          }
        );
        if (!result) {
          res.status(400).json({
            msg: "User Timeline not updated (assignment was not added)",
          });
        }
      }
      res.status(200).json({ msg: "Task created" });
    } catch (err) {
      console.log(err);
      res.status(500).send("Server error. Request could not be fulfilled.");
    }
  });

// Create milestone
app
  .route("/courseAddMilestone/:timelineId")
  .post(checkAuth, async (req, res) => {
    let milestoneData = {
      type: req.body.type,
      data: req.body.data,
      timeline: req.params.timelineId,
    };
    let subscriberTimelines = req.body.subscriberTimelines;
    let newMilestone;
    try {
      // create new task
      newMilestone = new MilestoneModel(milestoneData);

      // save task in db
      await newMilestone.save();

      // find timeline of the course and add milestone to it
      const result = await TimelineModel.findByIdAndUpdate(
        req.params.timelineId,
        {
          $push: {
            milestones: newMilestone,
          },
        }
      );

      if (!result) {
        res
          .status(400)
          .json({ msg: "Timeline not updated (milestone was not added)" });
      }

      let subscriberTimelineId;
      // parse each subscriber's timeline
      for (var subscriberTimeline in subscriberTimelines) {
        if (Array.isArray(subscriberTimelines)) {
          subscriberTimelineId = subscriberTimelines[subscriberTimeline];
        } else {
          subscriberTimelineId = subscriberTimelines;
        }

        // add new milestone status to the user's timeline
        const result = await TimelineUserModel.findByIdAndUpdate(
          subscriberTimelineId,
          {
            $push: {
              userMilestonesStats: {
                originalMilestoneId: newMilestone._id,
                userMilestoneSatus: newMilestone.status,
              },
            },
          }
        );
        if (!result) {
          res.status(400).json({
            msg: "User Timeline not updated (milestone was not added)",
          });
        }
      }
      res.status(200).json({ msg: "New milestone added to DB" });
    } catch (err) {
      res.status(500).send("Server error. Request could not be fulfilled.");
    }
  });

// Take course
app.route("/takeCourse/:courseId").post(checkAuth, async (req, res) => {
  // IMPROVEMENT: user data could be received from req.session.user directly (to check)
  // IMPROVEMENT: would be better if we send timeline id directly
  let currTaskStats = [];
  let currMilestioneStats = [];
  try {
    // find the course user is trying to subscribe to
    const course = await CourseModel.findOne({ _id: req.params.courseId });

    // extract timeline id of the course
    const courseTimelineId = course.timeline;

    // find timeline of the course
    const timeline = await TimelineModel.findOne({ _id: courseTimelineId });

    // extract task ids of the timeline
    const timelineTaskIds = timeline.tasks;

    // find timeline of the course
    const tasks = await TaskModel.find({ _id: timelineTaskIds });

    // create new array of tasks for user based-on timeline's array of tasks
    tasks.forEach((task) => {
      currTaskStats = [
        ...currTaskStats,
        {
          originalTaskId: task._id,
          userTaskSatus: task.status,
          userTaskScore: 0,
        },
      ];
    });
    // console.log("current Task stats: ", currTaskStats);

    // extract task ids of the timeline
    const milestoneTaskIds = timeline.milestones;

    // find timeline of the course
    const milestones = await MilestoneModel.find({ _id: milestoneTaskIds });

    // create new array of tasks for user based-on timeline's array of tasks
    milestones.forEach((milestone) => {
      currMilestioneStats = [
        ...currMilestioneStats,
        {
          originalMilestoneId: milestone._id,
          userMilestoneSatus: milestone.status,
        },
      ];
    });
    // console.log("current milestones: ", currMilestioneStats);

    // create user timeline based on existing timeline
    const newTimelineUser = TimelineUserModel({
      origin: courseTimelineId,
      userTasksStats: currTaskStats,
      userMilestonesStats: currMilestioneStats,
      userId: req.body.userId,
    });
    // console.log(newTimelineUser);

    // save new user timeline
    await newTimelineUser.save();

    // create new subscriber-course-usertimeline relation
    const newSubscriberAndCourse = CourseUserModel({
      subscriber: req.body.userId,
      course: req.params.courseId,
      usertimeline: newTimelineUser._id,
    });
    // console.log(newSubscriberAndCourse);

    // save new subscriber-course-usertimeline relation
    await newSubscriberAndCourse.save();

    res.status(200).json({ msg: "User subscribed to the course" });
  } catch (err) {
    res.status(500).send("Server error. Request could not be fulfilled.");
  }
});

// Get all subscriber data of a course
app.route("/allSubscriberData/:courseId").get(checkAuth, async (req, res) => {
  let subscribers = [];
  try {
    // find all subscribers of the course
    subscribers = await CourseUserModel.find({
      course: req.params.courseId,
    }).lean();

    // parse and edit subscribers to ready them for frontend
    // for loop as such neccessary due to async. functions inside (alternative: forEach with promise -> not working)
    for (var subscriberId in subscribers) {
      let subscriber = subscribers[subscriberId];

      // extract user timeline's id
      const userTimelineID = subscriber.usertimeline;

      // get timeline of user for this course
      const userTimeline = await TimelineUserModel.findOne({
        _id: userTimelineID,
      });

      // extract user id
      const userID = subscriber.subscriber;

      // get timeline of user for this course
      const user = await UserModel.findOne({
        _id: userID,
      });

      // replace timeline field with tasks
      subscriber.usertimeline = { usertimeline: userTimeline };

      // add username as a new field
      subscriber.username = user.username;
    }
    res
      .status(200)
      .json({ msg: "all subscriber data returned", subscribers: subscribers });
  } catch (err) {
    res
      .status(500)
      .json({ msg: "Server error. Request could not be fulfilled." });
  }
});

// Create course
app.route("/courses/create").post(checkAuth, async (req, res) => {
  let newCourse;
  try {
    // create empty timeline
    const newTimeline = new TimelineModel();

    // save new empty timeline
    await newTimeline.save();

    // add new timeline's id to the course
    req.body["timeline"] = newTimeline._id;

    // create new course
    newCourse = new CourseModel(req.body);

    // create new course
    await newCourse.save();

    // convert document to JSON object (to make it editable)
    let newCourseJSON = newCourse.toJSON();

    // remove unnecessary fields
    delete newCourse.timeline;
    delete newCourse.owner;

    res.status(200).json({ msg: "New course added", newCourse: newCourseJSON });
  } catch (err) {
    res.status(500).send("Server error. Request could not be fulfilled.");
  }
});

// Get all courses (returns only id, name and descriptions)
app.route("/courseIdDescs").get(checkAuth, async (req, res) => {
  let courses = [];
  try {
    // find all courses
    courses = await CourseModel.find({}).lean(); // lean neccessary to make courses editable(for replacing timeline with real tasks and milestones)

    // parse and edit courses to ready them for frontend
    // for loop as such neccessary due to async. functions inside (alternative: forEach with promise -> not working)
    for (var courseIdx in courses) {
      let course = courses[courseIdx];

      // remove unnecessary fields
      delete course.timeline;
      delete course.owner;
    }
    // console.log("backend sends: ", courses);
    res.status(200).json(courses);
  } catch (err) {
    res.status(500).send("Server error. Request could not be fulfilled.");
  }
});

// Get all information of a course (parsed to the needs of a frontend)
app.route("/courseAllInfo/:courseId").get(checkAuth, async (req, res) => {
  let course = [];
  try {
    // find all courses
    course = await CourseModel.findOne({ _id: req.params.courseId }).lean(); // lean neccessary to make courses editable(for replacing timeline with real tasks and milestones)

    //// parse and edit course to ready them for frontend
    // extract course's timeline id
    const timelineID = course.timeline;

    // get timeline of a course
    const timeline = await TimelineModel.findOne({ _id: timelineID });

    // extract task ids of timeline
    const taskIds = timeline.tasks;

    // extract milestone ids of timeline
    const milestoneIds = timeline.milestones;

    let tasks = [];
    // if there are any tasks in the course, parse them
    if (taskIds) {
      // for each taskId
      for (var taskId in taskIds) {
        // find task itself
        let task = await TaskModel.findOne({ _id: taskIds[taskId] });

        // append to list
        tasks = [...tasks, task];
      }
    }

    let milestones = [];
    // if there are any tasks in the course, parse them
    if (milestoneIds) {
      // for each taskId
      for (var milestoneId in milestoneIds) {
        // find task itself
        let milestone = await MilestoneModel.findOne({
          _id: milestoneIds[milestoneId],
        });

        // append to list
        milestones = [...milestones, milestone];
      }
    }

    // replace timeline field with tasks
    course.timeline = { _id: timelineID, tasks: tasks, milestones: milestones };
    // console.log(course);
    res.status(200).json(course);
  } catch (err) {
    res.status(500).send("Server error. Request could not be fulfilled.");
  }
});

// Simple route to destory session
app.route("/logout").get(async (req, res) => {
  try {
    // delete user's specific session
    delete req.session.user;

    // destroy session all together
    req.session.destroy();

    // delete session from db
    req.session = null;

    res.status(200).json({ msg: "Logged out." });
  } catch (err) {
    res.status(500).send("Server error. Request could not be fulfilled.");
  }
});

// Get a specific user
app.route("/login").post(async (req, res) => {
  try {
    // check if user exists
    const user = await UserModel.findOne({ email: req.body.email });

    if (!user) {
      res.status(400).json({ msg: "User not found" });
      return;
    }

    // check if passwords match
    const matchPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (matchPassword) {
      // create a new session for the user (email and id used to identify user)
      const userSession = { id: user._id };

      // attach new session to express-session
      req.session.user = userSession;
      // console.log("Session in store after login: ", req.session);

      // status, message and new session (as a cookie) sent to frontend
      return res.status(200).json({
        msg: "login done",
        userInfo: req.session.user,
      });
    } else {
      return res.status(400).json({ msg: "Invalid credential" });
    }
  } catch (err) {
    res.status(500).send("Server error. Request could not be fulfilled.");
  }
});

// Create a new user
app.route("/register").post(async (req, res) => {
  try {
    // check if there is a user with the same email
    const user = await UserModel.findOne({ email: req.body.email });

    if (user) {
      res.status(400).json({ msg: "A user with that email already exists" });
      return;
    }

    // create new user
    const newUser = new UserModel(req.body);

    // hash the password
    bcrypt.hash(req.body.password, 7, async (err, hash) => {
      if (err) {
        return res.status(400).json({ msg: "Error while saving the password" });
      }
      // change the password to hash
      newUser.password = hash;

      // save user to database
      const addedUser = await newUser.save();

      if (addedUser) {
        res.status(200).json({ msg: "New user created" });
      }
    });
  } catch (err) {
    res.status(500).send("Server error. Request could not be fulfilled.");
  }
});

//////////////////////// below are to-be-tested/to-be-implemented routes

// Update Task Info of User
app
  .route("/courseTakeTask/:taskId")
  .post(checkAuth, upload.array("allFiles"), async (req, res) => {
    if (req.files && req.files.length > 0) {
      console.log("req.files: ", req.files);
      console.log("req.files.length > 0: ", req.files.length > 0);
      fs.rename(
        `./public/${req.files[0].filename}`,
        `./public/${req.params.taskId}_${
          req.files[0].filename.split("_")[1].split(".")[0]
        }_uploaded`,
        function (err) {
          if (err) console.log("ERROR: " + err);
        }
      );
    }
    const setParams = req.files
      ? {
          "userTasksStats.$.userTaskSatus": "done",
          "userTasksStats.$.userTaskScore": req.body.score,
          "userTasksStats.$.uploadedFile": {
            originalFileName:
              req.files.length > 0 ? req.files[0].originalname : undefined,
            fileName:
              req.files.length > 0
                ? `${req.params.taskId}_${
                    req.files[0].filename.split("_")[1].split(".")[0]
                  }_uploaded`
                : undefined,
          },
          "userTasksStats.$.uploadedAssignmentDescription":
            req.body.uploadedAssignmentDescription,
        }
      : {
          "userTasksStats.$.userTaskSatus": "done",
          "userTasksStats.$.userTaskScore": req.body.score,
        };
    const taskId = req.params.taskId;
    console.log("setParams: ", setParams);
    // const dataToUpdate = { userTaskSatus: "done" };
    // console.log("dataToUpdate: ", dataToUpdate);
    console.log("req.body: ", req.body);
    console.log("userID: ", req.session.user.id);
    try {
      const userTimeline = await TimelineUserModel.findOneAndUpdate(
        {
          userId: req.session.user.id,
          origin: req.body.timelineId,
          "userTasksStats.originalTaskId": taskId,
        },
        {
          $set: setParams,
        }
      );
      // console.log(userTimeline);
      if (!userTimeline) {
        res.status(400).json({ msg: "Timeline could not be updated" });
        return;
      }
      res.status(200).json({ msg: "User took the task" });
    } catch (err) {
      res.status(500).send("Something really bad happened");
    }
  });

// Get Task Info
app.route("/courseGetTask/:taskId").get(checkAuth, async (req, res) => {
  var taskToReturn = {};
  const taskId = req.params.taskId;
  try {
    // get task from db
    const task = await TaskModel.findOne({ _id: taskId });

    if (!task) {
      res.status(400).json({ msg: "A task with that id doesn't exist yet" });
      return;
    }
    console.log("task: ", task);
    // set common task fields
    taskToReturn._id = task._id;
    taskToReturn.title = task.title;
    taskToReturn.deadline = task.data;

    // set different fields
    if (task.type === "Assignment") {
      taskToReturn.description = task.description;
      taskToReturn.files = task.files;
    } else {
      // meaning task has a Quiz type
      taskToReturn.questions = [];
      console.log("task.correctAnswers: ", task.correctAnswers);
      for (let i = 0; i < task.questions.length; i++) {
        console.log("task.correctAnswers[i]: ", task.correctAnswers[i]);
        taskToReturn.questions = [
          ...taskToReturn.questions,
          {
            // possible option: JSON.stringfy array values
            // current: naive solution
            text: task.questions[i],
            answers: task.answers[i],
            correctAnswerIndices: task.correctAnswers[i],
            image: i >= task.files.length ? null : task.files[i],
          },
        ];
      }
    }
    res
      .status(200)
      .json({ task: taskToReturn, msg: "Task returned successfully" });
  } catch (err) {
    res.status(500).send("Something really bad happened");
  }
});

// Download File
app
  .route("/download/:filename/:originalfilename")
  .get(checkAuth, async (req, res) => {
    const filePath = path.join(__dirname, "..", "public", req.params.filename);
    res.download(
      filePath,
      req.params.originalfilename, // alternate name for the file when user downloads it
      (err) => {
        if (err) {
          res.status(500).send("Problem downloading the file");
        }
      }
    );
  });

// // Create task (POSTMAN checked)
// app.route("/courses/:id/createtask").post(checkAuth, async (req, res) => {
//   // IMPROVEMENT: Currently works with sending only the course id, but would be better if we send timeline id directly
//   // MAKE-SURE: req.body has type, desc and data
//   // EXAMPLE: {
//   //     "type": "Quiz",
//   //     "description": "test",
//   //     "data": "2023-07-15",
//   //     "questions": ["What is the capital of Germany?", "What does the fox say?"],
//   //     "answers": [["Berlin", "Berlin", "Berlin", "Berlin"], ["No idea", "No idea", "No idea", "No idea"]],
//   //     "correctAnswers": [[0,3], [1]],
//   //     "timeline": "64993b0b326b752cc8f3e421"
//   // }
//   let newTask;
//   try {
//     // create new task
//     newTask = new TaskModel(req.body);

//     // save task in db
//     await newTask.save();

//     console.log(req.params.id);
//     // find the course the task belongs to
//     const course = await CourseModel.find({ _id: req.params.id });

//     // extract timeline of the course
//     const courseTimelineId = course[0].timeline;

//     // find timeline and add task to it
//     const result = await TimelineModel.findByIdAndUpdate(courseTimelineId, {
//       $push: {
//         tasks: newTask,
//       },
//     });

//     if (!result) {
//       res
//         .status(400)
//         .json({ msg: "Timeline not updated (task was not added)" });
//     }

//     // TODO: update all subs timelines

//     res.status(200).json(result);
//   } catch (err) {
//     res.status(500).send("Server error. Request could not be fulfilled.");
//   }
// });

// For debugging user authentification
// TODO: delete later
// app.route("/rando").get((req, res) => {
//   req.session.user = { userId: req.id };
//   console.log(
//     "rando Called, userSession(req.session.user) in session-store: ",
//     req.session.user
//   );
//   console.log("rando Called, req.session in session-store: ", req.session);
//   return res.status(200).json({ test: "abc", lol: req.session });
// });

// Express-session without store capabilities (still there for auth. debugging)
// TODO: delete later
// app.use(
//   session({
//     secret: "kekw",
//     resave: true, // true - force session to be saved in session store, even if it was not modified during a request
//     saveUninitialized: false, // save session if it was not modified (i.e. no login yet)
//   })
// );
