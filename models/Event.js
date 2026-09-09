const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Description is needed"],

      trim: true,
    },

    category: {
      type: String,
      enum: [
        "Wedding",
        "Conference",
        "Concert",
        "Birthday",
        "Corporate",
        "Exhibition",
        "Other",
      ],
      required: [true, "Category is needed"],
    },

    otherCategoryName: { type: String, default: null },

    bookingType: {
      type: String,
      enum: ["hall", "ticket"],
      required: [true, "Booking Type is needed"],
    },

    hallDetails: {
      pricePerDay: { type: Number, default: null },
      totalHalls: { type: Number, default: null },
      availableHalls: { type: Number, default: null },
    },
    hallEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },

    ticketDetails: {
      price: { type: Number, default: null },
      totalSeats: { type: Number, default: null },
      availableSeats: { type: Number, default: null },
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

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    registrationDeadline: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },

    // No enum restriction — matches the Hotel model fix. Keeping this open
    // avoids the same class of 500 error if the vendor form's amenity list
    // ever grows without this schema being updated in lockstep.
    amenities: {
      type: [String],
      default: [],
    },

    isPublic: { type: Boolean, default: true },

    nearbyHotels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hotel",
      },
    ],

    avgRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
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

module.exports = mongoose.model("Event", EventSchema);
