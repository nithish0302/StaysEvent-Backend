const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const cookieParser = require("cookie-parser");
const passport = require("passport");

require("./config/passport");

const authRoutes = require("./routes/authRoutes");
const hotelRoutes = require("./routes/hotelRoutes");
const eventRoutes = require("./routes/eventRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const userRoutes = require("./routes/userRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const searchRoutes = require("./routes/searchRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// Most hosts (Render, Railway, Heroku, etc.) put the app behind a reverse
// proxy that terminates TLS and forwards over plain HTTP internally. Without
// this, express-rate-limit sees the proxy's IP for every request (so all
// traffic shares one rate-limit bucket) and req.protocol/req.secure report
// "http" even on a real HTTPS request. Harmless locally — there's no proxy
// to trust in dev.
app.set("trust proxy", 1);

// Security headers. crossOriginResourcePolicy relaxed so uploaded/Cloudinary
// images and the API itself can still be fetched cross-origin by the
// frontend during local dev.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cookieParser());

app.use(passport.initialize());

// General API rate limit — generous enough for normal browsing/polling
// (the app polls every 30-45s for badges/prompts) but blocks abuse/scraping.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

// Tighter limit on auth endpoints to slow down credential stuffing / brute force.
// Relaxed outside production so repeated local/E2E test runs against a
// single long-lived dev server don't exhaust the window and start
// tripping "Too many auth attempts" on legitimate register/login calls.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 30 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many auth attempts, please try again later." },
});

app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);

app.get("/", (req, res) => res.json({ message: "Server is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/search", searchRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
