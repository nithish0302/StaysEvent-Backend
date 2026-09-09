/**
 * One-shot admin seed script.
 * Usage: node createAdmin.js
 * Run from D:\stayevents\backend
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const ADMIN_NAME = "Admin";
const ADMIN_EMAIL = "admin@stayevents.com";
const ADMIN_PASSWORD = "Admin@123";

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      if (existing.role !== "admin") {
        existing.role = "admin";
        await existing.save();
        console.log(`Updated existing user to admin: ${ADMIN_EMAIL}`);
      } else {
        console.log(`Admin already exists: ${ADMIN_EMAIL}`);
      }
      process.exit(0);
    }

    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashed,
      role: "admin",
      isActive: true,
    });

    console.log("✅ Admin created successfully!");
    console.log(`   Email   : ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log("   Change this password after first login.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  }
})();
