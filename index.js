const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const MongoDbStore = require("connect-mongodb-session")(session);
const { format, parse } = require("date-fns");
const app = express();
const port = 8080;
const verifytoken = require("./verifyToken");
const cors = require("cors");

// importing models
const userModel = require("./models/userModel");
const foodModel = require("./models/foodModel");
const trackingModel = require("./models/trackingModel");

mongoose
  .connect(process.env.CONNECTION_STRING)
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((err) => {
    console.log("error connecting to DB");
  });

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: [
      "Access-Control-Allow-Headers",
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "token",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
      "Access-Control-Allow-Credentials",
    ],
    credentials: true,
  })
);
// save session in db
const store = new MongoDbStore({
  uri: process.env.CONNECTION_STRING,
  collections: "sessions",
});

app.use(
  session({
    secret: "mysecret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

// registering user endpoint
app.post("/register", async (req, res) => {
  try {
    let user = req.body;

    // Check if the user with the given email already exists
    const userFound = await userModel.findOne({ email: user.email });

    if (userFound) {
      return res.status(409).json({ message: "User already registered" });
    }

    // Hash the password
    const hashPass = await bcrypt.hash(user.password, 10);

    // Update user's password with the hashed password
    user.password = hashPass;

    // Create the user
    const createdUser = await userModel.create(user);

    res.send({ message: "User was registered" });
    console.log("User was registered");
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).send({ message: "Error creating user" });
  }
});

// endpoint for login
app.post("/login", async (req, res) => {
  let userCred = req.body;
  try {
    const user = await userModel.findOne({ email: userCred.email });

    if (user) {
      const { password, _id, name, age, email } = user;
      const passwordMatch = await bcrypt.compare(userCred.password, password);

      if (passwordMatch) {
        let token = jwt.sign({ id: _id.toString() }, "jwtkey");

        if (token) {
          req.session.login = { token: token, userId: _id.toString() };
          return res.status(200).send({
            message: "Login successful",
            userInfo: { userId: _id.toString(), name, age, email },
          });
        } else {
          return res.status(500).send({
            message: "Unable to generate token",
          });
        }
      } else {
        return res.status(401).send({ message: "Password is incorrect" });
      }
    } else {
      return res.status(404).send({ message: "User not found" });
    }
  } catch (err) {
    console.error("Error by logging the user", err);
    return res.status(500).send({ message: "Error by logging the user" });
  }
});

//  endpoint to see all foods
app.get("/foods", verifytoken, async (req, res) => {
  let foods = await foodModel.find();

  try {
    res.send({ data: foods, message: "All foods fetched successfully" });
  } catch (err) {
    console.log("Error  by fetching all the foods", err);
    res.status(500).send({ message: "Error fetching all the foods" });
  }
});

// endpoint to search food by name
app.get("/food/:name", verifytoken, async (req, res) => {
  let foodName = req.params.name;

  try {
    let food = await foodModel.find({
      name: { $regex: foodName, $options: "i" },
    });
    if (food) {
      res.send({ message: "Food was found", data: food });
    } else {
      res.status(404).send({ message: "Food was not found" });
    }
  } catch (err) {
    console.log("Error by fetching food by name", err);
    res.status(500).send({ message: "Error by fetching food by name" });
  }
});

//  endpoint to track a food
app.post("/track", verifytoken, async (req, res) => {
  let trackData = req.body;

  try {
    let data = trackingModel.create(trackData);
    res.send({ message: "Food added" });
  } catch (err) {
    console.log("Error by tracking food", err);
    res.status(500).send({ message: "Error by tracking food" });
  }
});

// endpoint to fetch all foods eaten by a person

app.get("/track/:userId/:date", verifytoken, async (req, res) => {
  let userId = req.params.userId;

  let inputDate = req.params.date;
  let parsedDate = parse(inputDate, "dd-MM-yyyy", new Date());
  let strDate = format(parsedDate, "d.M.yyyy");

  console.log(strDate);
  try {
    const trackedFoods = await trackingModel
      .find({ userId: userId, eatenDate: strDate })
      .populate("userId")
      .populate("foodId");
    if (trackedFoods) {
      res.send({ message: "Foods tracked by user id", trackedFoods });
    } else {
      res.status(404).send({
        message: "NoFoods tracked by this user, try to eat something :)",
      });
    }
  } catch (err) {
    console.log("Error by tracking food by userId", err);
    res.status(500).send({ message: "Error by tracking food by userId" });
  }
});

app.get("/", (req, res) => {
  res.send({ message: "Hello welcome" });
});

app.post("/addfood", async (req, res) => {
  const admId = "65b55ce0ef83a5b883760033";
  const userId = req.session.login.userId;
  const { name, calories, carbohydrates, fat, protein, fiber } = req.body;

  if (userId !== admId) {
    return res.status(401).send({ message: "User not Authorized to add food" });
  }

  try {
    const existingFood = await foodModel.findOne({
      name: { $regex: name, $options: "i" },
    });

    if (existingFood) {
      return res
        .status(400)
        .send({ message: "Food with this name already exists." });
    }

    const food = await foodModel.create({
      name,
      calories,
      carbohydrates,
      fat,
      protein,
      fiber,
    });

    res.send({ message: "Food added successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Error by adding food" });
  }
});

app.listen(port, () => {
  console.log("listening on port " + port);
});
