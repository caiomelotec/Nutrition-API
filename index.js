const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

// registering user endpoint
app.post("/register", (req, res) => {
  let user = req.body;
  console.log(user)
  bcrypt.genSalt(10, (err, salt) => {
    if (!err) {
      bcrypt.hash(user.password, salt, async (err, hashPass) => {
        if (!err) {
          user.password = hashPass;
          try {
            let doc = await userModel.create(user);
            res.send({ message: "User was registered" });
            console.log("User was registered");
          } catch (err) {
            console.log("error creating user", err);
            res.status(500).send({ message: "Error creating user" });
          }
        }
      });
    }
  });
});

// endpoint for login
app.post("/login", async (req, res) => {
  let userCred = req.body;
  try {
    const user = await userModel.findOne({ email: userCred.email });

    const { password, otherUserData } = user;

    if (user) {
      const passwordMatch = await bcrypt.compare(
        userCred.password,
        user.password
      );

      if (passwordMatch) {
        let token = jwt.sign(otherUserData, "jwtkey");
        // res.send({ message: "Login Successful" });
        if (token) {
          res.send({ message: "Login Successful", token: token });
        } else {
          res.send({ message: "Error by generating the token" });
        }
      } else {
        res.status(403).send({ message: "Incorrect Password" });
      }
    } else {
      res.status(404).send({ message: "User not found" });
    }
  } catch (err) {
    console.log("Error by logging the user");
    res.send({ message: "Error by logging the user" });
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
  res.send({ message: "Hello welcome"})
})

app.listen(port, () => {
  console.log("listening on port " + port);
});
