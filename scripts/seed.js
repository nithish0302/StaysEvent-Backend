// Demo data seed script — populates a few vendors, hotels, events and an
// admin account for local testing. Safe to re-run: it clears its own demo
// records (by a fixed marker email domain) before reseeding, and never
// touches unrelated real data.
//
// Run with:  npm run seed   (from backend/)
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");

const User = require("../models/User");
const Hotel = require("../models/Hotel");
const Event = require("../models/Event");

const DEMO_DOMAIN = "@stayevents-demo.test";

const run = async () => {
  await connectDB();
  console.log("🌱 Seeding demo data...");

  // Wipe previous demo data only
  const demoUsers = await User.find({ email: { $regex: DEMO_DOMAIN + "$" } });
  const demoUserIds = demoUsers.map((u) => u._id);
  await Hotel.deleteMany({ vendorId: { $in: demoUserIds } });
  await Event.deleteMany({ vendorId: { $in: demoUserIds } });
  await User.deleteMany({ email: { $regex: DEMO_DOMAIN + "$" } });

  const passwordHash = await bcrypt.hash("Demo@1234", 10);

  const admin = await User.create({
    name: "Demo Admin",
    email: `admin${DEMO_DOMAIN}`,
    password: passwordHash,
    role: "admin",
  });

  const hotelVendor = await User.create({
    name: "Grand Palace Hotels",
    email: `hotelvendor${DEMO_DOMAIN}`,
    password: passwordHash,
    role: "vendor",
    vendorStatus: "approved",
    vendorDetails: {
      businessName: "Grand Palace Hotels Pvt Ltd",
      businessType: "hotel",
      city: "Chennai",
    },
  });

  const eventVendor = await User.create({
    name: "Celebration Events Co",
    email: `eventvendor${DEMO_DOMAIN}`,
    password: passwordHash,
    role: "vendor",
    vendorStatus: "approved",
    vendorDetails: {
      businessName: "Celebration Events Co",
      businessType: "event",
      city: "Bengaluru",
    },
  });

  const customer = await User.create({
    name: "Demo Customer",
    email: `customer${DEMO_DOMAIN}`,
    password: passwordHash,
    role: "customer",
  });

  const hotels = await Hotel.insertMany([
    {
      vendorId: hotelVendor._id,
      name: "Grand Palace Chennai",
      description: "A luxurious 5-star stay in the heart of Chennai with sea-facing rooms.",
      location: { city: "Chennai", state: "Tamil Nadu", address: "12 Marina Road", pinCode: "600001" },
      photos: [],
      starRating: 5,
      amenities: ["WiFi", "Pool", "Parking", "Gym", "Spa"],
      pricePerNight: 6500,
      totalRooms: 40,
      availableRooms: 40,
      isFeatured: true,
    },
    {
      vendorId: hotelVendor._id,
      name: "Palace Residency Coimbatore",
      description: "Comfortable business-friendly stay near the city center.",
      location: { city: "Coimbatore", state: "Tamil Nadu", address: "45 Race Course Rd", pinCode: "641018" },
      photos: [],
      starRating: 4,
      amenities: ["WiFi", "Parking", "Restaurant"],
      pricePerNight: 3200,
      totalRooms: 25,
      availableRooms: 25,
    },
  ]);

  const events = await Event.insertMany([
    {
      vendorId: eventVendor._id,
      name: "Bengaluru Wedding Grand Hall",
      description: "Elegant banquet hall perfect for weddings and receptions.",
      category: "Wedding",
      bookingType: "hall",
      hallDetails: { pricePerDay: 85000, totalHalls: 2, availableHalls: 2 },
      location: { city: "Bengaluru", state: "Karnataka", address: "88 MG Road", pinCode: "560001" },
      photos: [],
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
      startTime: "10:00",
      endTime: "23:00",
      amenities: ["Catering", "Decoration", "Parking"],
      isFeatured: true,
    },
    {
      vendorId: eventVendor._id,
      name: "Live Music Concert Night",
      description: "An evening of live music featuring popular regional artists.",
      category: "Concert",
      bookingType: "ticket",
      ticketDetails: { price: 999, totalSeats: 500, availableSeats: 500 },
      location: { city: "Bengaluru", state: "Karnataka", address: "Palace Grounds", pinCode: "560001" },
      photos: [],
      startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      startTime: "18:00",
      endTime: "22:00",
      amenities: ["Food Stalls", "Parking"],
    },
  ]);

  console.log("✅ Seed complete:");
  console.log(`   Admin:        admin${DEMO_DOMAIN} / Demo@1234`);
  console.log(`   Hotel vendor: hotelvendor${DEMO_DOMAIN} / Demo@1234`);
  console.log(`   Event vendor: eventvendor${DEMO_DOMAIN} / Demo@1234`);
  console.log(`   Customer:     customer${DEMO_DOMAIN} / Demo@1234`);
  console.log(`   ${hotels.length} hotels, ${events.length} events created.`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
