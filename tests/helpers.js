// Shared test helpers: register a user of a given role and return their
// access token + id, so other test files don't repeat this boilerplate.
const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("./testApp");
const User = require("../models/User");

let counter = 0;

const createUser = async ({ role = "customer", vendorStatus } = {}) => {
  counter += 1;
  const email = `${role}${counter}@test.com`;
  // /api/auth/register only accepts role "customer" | "vendor" (Zod-enforced
  // — see utils/authValidateSchema.js) — sending "admin" there 400s and
  // res.body.user is undefined. Register as a customer instead when an
  // admin is wanted, then promote in the DB below.
  const registerRole = role === "admin" ? "customer" : role;
  const res = await request(app).post("/api/auth/register").send({
    name: `Test ${role} ${counter}`,
    email,
    password: "password123",
    role: registerRole,
  });
  let user = res.body.user;
  let token = res.body.accessToken;
  if (role === "vendor" && vendorStatus) {
    await User.findByIdAndUpdate(user.id, { vendorStatus });
  }
  if (role === "admin") {
    await User.findByIdAndUpdate(user.id, { role: "admin" });
    // The token issued at registration still encodes role: "customer" (JWT
    // payload is fixed at sign time, authMiddleware trusts it as-is — see
    // middleware/authMiddleware.js). Mint a fresh token carrying the
    // promoted role, mirroring authController.js's register payload shape.
    token = jwt.sign({ id: user.id, role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "20m",
    });
  }
  return { token, id: user.id, email };
};

module.exports = { createUser, app, request };
