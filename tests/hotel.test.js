const { app, request, createUser } = require("./helpers");

const sampleHotel = () => ({
  name: "Test Hotel",
  description: "A nice place to stay for testing purposes.",
  location: { city: "Chennai", state: "Tamil Nadu", address: "1 Test St", pinCode: "600001" },
  pricePerNight: 2000,
  totalRooms: 10,
  amenities: ["WiFi", "Pool"],
});

describe("Hotels", () => {
  it("rejects hotel creation from a customer", async () => {
    const { token } = await createUser({ role: "customer" });
    const res = await request(app)
      .post("/api/hotels")
      .set("Authorization", `Bearer ${token}`)
      .send(sampleHotel());
    expect(res.status).toBe(403);
  });

  it("lets a vendor create a hotel", async () => {
    const { token } = await createUser({ role: "vendor", vendorStatus: "approved" });
    const res = await request(app)
      .post("/api/hotels")
      .set("Authorization", `Bearer ${token}`)
      .send(sampleHotel());
    expect(res.status).toBe(201);
    expect(res.body.hotel?.name || res.body.data?.name).toBeTruthy();
  });

  it("lists hotels publicly without auth", async () => {
    const { token } = await createUser({ role: "vendor", vendorStatus: "approved" });
    await request(app).post("/api/hotels").set("Authorization", `Bearer ${token}`).send(sampleHotel());
    const res = await request(app).get("/api/hotels");
    expect(res.status).toBe(200);
  });

  it("404s for a hotel that doesn't exist", async () => {
    const res = await request(app).get("/api/hotels/507f1f77bcf86cd799439011");
    expect([404, 400]).toContain(res.status);
  });
});
