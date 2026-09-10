/**
 * One-shot admin seed script.
 * Usage: node createAdmin.js
 * Run from D:\stayevents\backend
 *
 * Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD env vars — this used to
 * hardcode "admin@stayevents.com" / "Admin@123" directly in this file, which
 * is committed to a public/shared repo. That's fine for a throwaway local
 * dev DB, but if this script is ever run against the production database
 * without someone remembering to change the password first, that password
 * is sitting in git history forever. Set ADMIN_EMAIL/ADMIN_PASSWORD in your
 * shell (or a local, gitignored .env) before running it against anything
 * that matters. The old hardcoded values still work as a local-dev fallback
 * so this doesn't break existing workflows.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@stayevents.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";

if (!process.env.ADMIN_PASSWORD && process.env.NODE_ENV === "production") {
  console.error(
    "❌ Refusing to run with the default fallback password against NODE_ENV=production. " +
      "Set ADMIN_EMAIL and ADMIN_PASSWORD explicitly first.",
  );
  process.exit(1);
}

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
    console.log("   Password: (the one you set via ADMIN_PASSWORD)");
    console.log("   Change this password after first login.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  }
})();
