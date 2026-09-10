const { app, request, createUser } = require("./helpers");
const Hotel = require("../models/Hotel");

describe("Bookings", () => {
  const makeHotel = async (vendorId) =>
    Hotel.create({
      vendorId,
      name: "Booking Test Hotel",
      description: "A hotel used purely for booking flow tests.",
      location: { city: "Chennai", state: "Tamil Nadu", address: "1 Test St", pinCode: "600001" },
      pricePerNight: 1000,
      totalRooms: 5,
      availableRooms: 5,
    });

  it("lets a customer create a booking and reserves rooms", async () => {
    const vendor = await createUser({ role: "vendor", vendorStatus: "approved" });
    const hotel = await makeHotel(vendor.id);
    const customer = await createUser({ role: "customer" });

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        bookingCategory: "hotel",
        hotelId: hotel._id.toString(),
        checkIn: new Date(Date.now() + 86400000).toISOString(),
        checkOut: new Date(Date.now() + 3 * 86400000).toISOString(),
        rooms: 2,
        guestName: "Test Guest",
        guestEmail: "guest@test.com",
        guestPhone: "9876543210",
      });

    expect(res.status).toBe(201);
    expect(res.body.booking.totalAmount).toBeGreaterThan(0);

    const updated = await Hotel.findById(hotel._id);
    expect(updated.availableRooms).toBe(3);
  });

  it("rejects booking more rooms than available", async () => {
    const vendor = await createUser({ role: "vendor", vendorStatus: "approved" });
    const hotel = await makeHotel(vendor.id);
    const customer = await createUser({ role: "customer" });

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        bookingCategory: "hotel",
        hotelId: hotel._id.toString(),
        checkIn: new Date(Date.now() + 86400000).toISOString(),
        checkOut: new Date(Date.now() + 2 * 86400000).toISOString(),
        rooms: 99,
        guestName: "Test Guest",
        guestEmail: "guest@test.com",
        guestPhone: "9876543210",
      });
    expect(res.status).toBe(400);
  });

  it("lets a vendor mark a booking completed and restores review-eligibility", async () => {
    const vendor = await createUser({ role: "vendor", vendorStatus: "approved" });
    const hotel = await makeHotel(vendor.id);
    const customer = await createUser({ role: "customer" });

    const create = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        bookingCategory: "hotel",
        hotelId: hotel._id.toString(),
        checkIn: new Date(Date.now() + 86400000).toISOString(),
        checkOut: new Date(Date.now() + 2 * 86400000).toISOString(),
        rooms: 1,
        guestName: "Test Guest",
        guestEmail: "guest@test.com",
        guestPhone: "9876543210",
      });
    const bookingId = create.body.booking._id;

    const complete = await request(app)
      .patch(`/api/bookings/vendor/${bookingId}/status`)
      .set("Authorization", `Bearer ${vendor.token}`)
      .send({ status: "completed" });
    expect(complete.status).toBe(200);
    expect(complete.body.booking.status).toBe("completed");

    const pending = await request(app)
      .get("/api/bookings/customer/pending-review")
      .set("Authorization", `Bearer ${customer.token}`);
    expect(pending.status).toBe(200);
    expect(pending.body.bookings.length).toBe(1);
  });
});
