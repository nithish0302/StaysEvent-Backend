const mongoose = require("mongoose");

const HotelSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Vendor ID is needed"],
    },
    name: {
      type: String,
      required: [true, "Hotel Name is needed"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is needed"],
      trim: true,
    },
    location: {
      city: {
        type: String,
        required: [true, "City is needed"],
        trim: true,
      },
      state: {
        type: String,
        required: [true, "State is needed"],
        trim: true,
      },
      address: {
        type: String,
        required: [true, "Address is needed"],
        trim: true,
      },
      pinCode: {
        type: String,
        required: [true, "Pincode is needed"],
        trim: true,
      },
      coordinates: {
        longitude: { type: Number },
        latitude: { type: Number },
      },
    },
    photos: {
      type: [String],
      default: [],
      validate: {
        validator: function (value) {
          return value.length <= 10;
        },
        message: "Maximum 10 photos allowed",
      },
    },
    starRating: {
      type: Number,
      default: 1,
      validate: {
        validator: function (value) {
          return value === null || (value >= 1 && value <= 5);
        },
        message: "Star rating must be between 1 and 5",
      },
    },
    // No enum restriction here — the vendor form offers more preset options
    // than this list (TV, Laundry, Security, etc.) plus free-text custom
    // amenities, so an enum here caused hotel creation to fail with a 500
    // whenever a vendor picked anything outside the old fixed list.
    amenities: {
      type: [String],
      default: [],
    },
    pricePerNight: {
      type: Number,
      required: [true, "Price per night is required"],
      min: [1, "Price must be at least 1"],
    },
    totalRooms: {
      type: Number,
      required: [true, "Total rooms is required"],
      min: [1, "Total rooms must be at least 1"],
    },
    availableRooms: {
      type: Number,
      min: [0, "Available rooms cannot be negative"],
      validate: {
        validator: function (value) {
          return value <= this.totalRooms;
        },
        message: "Available rooms cannot exceed total rooms",
      },
    },
    bookedDates: {
      type: [Date],
      default: [],
    },
    avgRating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be below 0"],
      max: [5, "Rating cannot exceed 5"],
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Hotel", HotelSchema);
