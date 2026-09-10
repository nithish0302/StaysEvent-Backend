// Test-only Express app: identical to app.js but WITHOUT the rate limiter
// (which would throttle a fast test suite) and without requiring
// process.env.CLIENT_URL to be set for CORS.
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.NODE_ENV = "test";

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");

require("../config/passport");

const authRoutes = require("../routes/authRoutes");
const hotelRoutes = require("../routes/hotelRoutes");
const eventRoutes = require("../routes/eventRoutes");
const bookingRoutes = require("../routes/bookingRoutes");
const userRoutes = require("../routes/userRoutes");
const reviewRoutes = require("../routes/reviewRoutes");
const adminRoutes = require("../routes/adminRoutes");
const searchRoutes = require("../routes/searchRoutes");
const { notFound, errorHandler } = require("../middleware/errorMiddleware");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api/auth", authRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/search", searchRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
