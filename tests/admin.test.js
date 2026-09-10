const { app, request, createUser } = require("./helpers");
const Hotel = require("../models/Hotel");

describe("Admin", () => {
  it("blocks non-admins from admin stats", async () => {
    const { token } = await createUser({ role: "customer" });
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("lets an admin view stats", async () => {
    const { token } = await createUser({ role: "admin" });
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.stats).toBeDefined();
  });

  it("lets an admin approve a pending vendor", async () => {
    const admin = await createUser({ role: "admin" });
    const vendor = await createUser({ role: "vendor" }); // defaults to pending
    const res = await request(app)
      .patch(`/api/admin/vendors/${vendor.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "approved" });
    expect(res.status).toBe(200);
    expect(res.body.vendor.vendorStatus).toBe("approved");
  });

  it("lets an admin toggle a hotel's featured flag", async () => {
    const admin = await createUser({ role: "admin" });
    const vendor = await createUser({ role: "vendor", vendorStatus: "approved" });
    const hotel = await Hotel.create({
      vendorId: vendor.id,
      name: "Feature Toggle Hotel",
      description: "Used to test the admin featured-listing toggle.",
      location: { city: "Chennai", state: "Tamil Nadu", address: "1 Test St", pinCode: "600001" },
      pricePerNight: 1000,
      totalRooms: 5,
      availableRooms: 5,
    });

    const res = await request(app)
      .patch(`/api/admin/listings/hotel/${hotel._id}/feature`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.isFeatured).toBe(true);
  });
});
