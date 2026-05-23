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
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../utils/authValidateSchema");

//POST METHOD
router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.post("/refresh", refreshToken);

router.post("/logout", authMiddleware, logout);

//GET METHOD
router.get("/me", authMiddleware, getMe);
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  googleCallback,
);

//PUT method

router.put("/update-role", authMiddleware, updateRole);
router.put("/update-vendor-details", authMiddleware, updateVendorDetails);
module.exports = router;
