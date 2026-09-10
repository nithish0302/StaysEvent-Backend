// Bootstraps a single, fixed admin account for the E2E suite to log in as.
//
// The public register endpoint intentionally only accepts role "customer" |
// "vendor" (see utils/authValidateSchema.js) — there is no self-service way
// to become an admin, by design. That's correct for the real app, but it
// means Playwright (a pure HTTP/browser client with no DB access) has no
// legitimate way to reach admin-only flows (approving a vendor, etc.)
// against a freshly-provisioned CI database.
//
// This script runs once before the E2E suite (see .github/workflows/
// frontend-ci.yml) using direct Mongoose access, exactly like the backend's
// own Jest test helpers do for the same problem. It is idempotent — safe to
// run against an existing database without creating duplicates or resetting
// the password of a real admin that happens to share the email.
//
// Run with:  node scripts/ensureE2EAdmin.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");

const EMAIL = process.env.E2E_ADMIN_EMAIL || "e2e-admin@stayevents-demo.test";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "E2eAdmin@1234";

const run = async () => {
  await connectDB();

  const existing = await User.findOne({ email: EMAIL });
  if (existing) {
    console.log(`ℹ️  E2E admin already exists (${EMAIL}) — leaving it as-is.`);
  } else {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    await User.create({
      name: "E2E Admin",
      email: EMAIL,
      password: passwordHash,
      role: "admin",
    });
    console.log(`✅ E2E admin created: ${EMAIL}`);
  }

  await mongoose.connection.close();
};

run().catch((err) => {
  console.error("Failed to bootstrap E2E admin:", err);
  process.exit(1);
});
