const { app, request, createUser } = require("./helpers");
const Hotel = require("../models/Hotel");

describe("Unified search", () => {
  it("finds hotels by name across the unified endpoint", async () => {
    const vendor = await createUser({ role: "vendor", vendorStatus: "approved" });
    await Hotel.create({
      vendorId: vendor.id,
      name: "Sunrise Beach Resort",
      description: "A resort used to test the unified search endpoint.",
      location: { city: "Goa", state: "Goa", address: "1 Beach Rd", pinCode: "403001" },
      pricePerNight: 4000,
      totalRooms: 5,
      availableRooms: 5,
      isActive: true,
    });

    const res = await request(app).get("/api/search").query({ q: "Sunrise" });
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThanOrEqual(1);
    expect(res.body.results[0].itemType).toBe("HOTEL");
  });

  it("returns an empty result set for no matches", async () => {
    const res = await request(app).get("/api/search").query({ q: "NoSuchListingXYZ" });
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBe(0);
  });
});
