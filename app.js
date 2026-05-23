const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const cookieParser = require("cookie-parser");
const passport = require("passport");

require("./config/passport");

const authRoutes = require("./routes/authRoutes");
const hotelRoutes = require("./routes/hotelRoutes");
const eventRoutes = require("./routes/eventRoutes");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cookieParser());

app.use(passport.initialize());

app.get("/", (req, res) => res.json({ message: "Server is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/events", eventRoutes);

module.exports = app;
