const express = require("express");
const router = express.Router();
const passport = require("passport");
const {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  googleCallback,
  updateRole,
  updateVendorDetails,
  updateProfile,
  changePassword,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../utils/authValidateSchema");
const { googleOAuthConfigured } = require("../config/passport");

// Without GOOGLE_CLIENT_ID/SECRET set, config/passport.js never registers
// the "google" strategy, and passport.authenticate("google", ...) throws
// Passport's generic "Unknown authentication strategy" error if hit. This
// returns a clear, on-topic message instead.
const requireGoogleOAuth = (req, res, next) => {
  if (!googleOAuthConfigured) {
    return res.status(503).json({
      success: false,
      message: "Google login is not configured on this server.",
    });
  }
  next();
};

//POST METHOD
router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.post("/refresh", refreshToken);

router.post("/logout", authMiddleware, logout);

//GET METHOD
router.get("/me", authMiddleware, getMe);
router.get(
  "/google",
  requireGoogleOAuth,
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
router.get(
  "/google/callback",
  requireGoogleOAuth,
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  googleCallback,
);

//PUT method

router.put("/update-role", authMiddleware, updateRole);
router.put("/update-vendor-details", authMiddleware, updateVendorDetails);
router.put("/profile", authMiddleware, updateProfile);
router.put("/change-password", authMiddleware, changePassword);
module.exports = router;
