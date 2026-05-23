const { z } = require("zod");

const registerSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .min(5, "Minimum length of the name should be 5"),
  email: z.string({ error: "Email is required" }).email("Invalid email format"),
  password: z
    .string({ error: "Password is required" })
    .min(6, "The minimum length of the password should be 6"),
  role: z.enum(["customer", "vendor"]).optional(),
});

const loginSchema = z.object({
  email: z.string({ error: "Email is required" }).email("Invalid email format"),
  password: z
    .string({ error: "Password is required" })
    .min(6, "The minimum length of the password should be 6"),
});

module.exports = { registerSchema, loginSchema };
