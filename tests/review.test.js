const { app, request, createUser } = require("./helpers");
const Hotel = require("../models/Hotel");
const Booking = require("../models/Booking");

describe("Reviews", () => {
  const setupCompletedBooking = async () => {
    const vendor = await createUser({ role: "vendor", vendorStatus: "approved" });
    const hotel = await Hotel.create({
      vendorId: vendor.id,
      name: "Review Test Hotel",
      description: "A hotel used purely for review flow tests.",
      location: { city: "Chennai", state: "Tamil Nadu", address: "1 Test St", pinCode: "600001" },
      pricePerNight: 1000,
      totalRooms: 5,
      availableRooms: 5,
    });
    const customer = await createUser({ role: "customer" });
    await Booking.create({
      customerId: customer.id,
      vendorId: vendor.id,
      bookingCategory: "hotel",
      hotelId: hotel._id,
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 86400000),
      rooms: 1,
      pricePerUnit: 1000,
      units: 1,
      totalAmount: 1000,
      guestName: "Guest",
      guestEmail: "guest@test.com",
      guestPhone: "9876543210",
      status: "completed",
      paymentStatus: "paid",
    });
    return { vendor, hotel, customer };
  };

  it("lets a customer review an item they completed a booking for", async () => {
    const { hotel, customer } = await setupCompletedBooking();
    const res = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ itemId: hotel._id.toString(), itemType: "HOTEL", rating: 5, comment: "Great stay!" });
    expect(res.status).toBe(201);

    const updatedHotel = await Hotel.findById(hotel._id);
    expect(updatedHotel.avgRating).toBe(5);
    expect(updatedHotel.reviewCount).toBe(1);
  });

  it("blocks a review with no completed booking", async () => {
    const vendor = await createUser({ role: "vendor", vendorStatus: "approved" });
    const hotel = await Hotel.create({
      vendorId: vendor.id,
      name: "No Booking Hotel",
      description: "No completed booking exists for this hotel.",
      location: { city: "Chennai", state: "Tamil Nadu", address: "1 Test St", pinCode: "600001" },
      pricePerNight: 1000,
      totalRooms: 5,
      availableRooms: 5,
    });
    const customer = await createUser({ role: "customer" });
    const res = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ itemId: hotel._id.toString(), itemType: "HOTEL", rating: 4 });
    expect(res.status).toBe(403);
  });

  it("blocks a second review from the same customer for the same item", async () => {
    const { hotel, customer } = await setupCompletedBooking();
    await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ itemId: hotel._id.toString(), itemType: "HOTEL", rating: 5 });

    const res = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ itemId: hotel._id.toString(), itemType: "HOTEL", rating: 3 });
    expect(res.status).toBe(400);
  });

  it("lets the listing's vendor reply to a review", async () => {
    const { hotel, customer, vendor } = await setupCompletedBooking();
    const review = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ itemId: hotel._id.toString(), itemType: "HOTEL", rating: 4 });
    const reviewId = review.body.review._id;

    const reply = await request(app)
      .patch(`/api/reviews/${reviewId}/reply`)
      .set("Authorization", `Bearer ${vendor.token}`)
      .send({ text: "Thanks for staying with us!" });
    expect(reply.status).toBe(200);
    expect(reply.body.review.vendorReply.text).toBe("Thanks for staying with us!");
  });

  it("blocks a different vendor from replying to someone else's listing review", async () => {
    const { hotel, customer } = await setupCompletedBooking();
    const otherVendor = await createUser({ role: "vendor", vendorStatus: "approved" });
    const review = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ itemId: hotel._id.toString(), itemType: "HOTEL", rating: 4 });
    const reviewId = review.body.review._id;

    const reply = await request(app)
      .patch(`/api/reviews/${reviewId}/reply`)
      .set("Authorization", `Bearer ${otherVendor.token}`)
      .send({ text: "Not my hotel!" });
    expect(reply.status).toBe(403);
  });
});
