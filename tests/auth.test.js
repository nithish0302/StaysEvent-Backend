const request = require("supertest");
const app = require("./testApp");

describe("Auth", () => {
  const customer = { name: "Test Customer", email: "customer1@test.com", password: "password123", role: "customer" };

  it("registers a new customer", async () => {
    const res = await request(app).post("/api/auth/register").send(customer);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(customer.email);
  });

  it("rejects duplicate email registration", async () => {
    await request(app).post("/api/auth/register").send(customer);
    const res = await request(app).post("/api/auth/register").send(customer);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects registration with a short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...customer, email: "short@test.com", password: "123" });
    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials", async () => {
    await request(app).post("/api/auth/register").send(customer);
    const res = await request(app).post("/api/auth/login").send({
      email: customer.email,
      password: customer.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it("rejects login with wrong password", async () => {
    await request(app).post("/api/auth/register").send(customer);
    const res = await request(app).post("/api/auth/login").send({
      email: customer.email,
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
  });

  it("returns the current user with a valid token", async () => {
    const reg = await request(app).post("/api/auth/register").send(customer);
    const token = reg.body.accessToken;
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("rejects /me without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
