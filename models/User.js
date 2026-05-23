const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is needed"],
      minlength: [2, "Name must be at least 2 characters"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is needed"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      default: null,
    },
    googleId: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["customer", "vendor", "admin"],
      default: "customer",
    },
    avatar: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
      validate: {
        validator: function (value) {
          return value === null || /^[6-9]\d{9}$/.test(value);
        },
        message: "Invalid Indian phone number",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    vendorStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: null,
    },
    vendorBio: {
      type: String,
      default: null,
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    vendorDetails: {
      businessName: { type: String, default: null },
      businessType: {
        type: String,
        enum: ["hotel", "event", "both"],
        default: null,
      },
      gstNumber: {
        type: String,
        default: null,
        validate: {
          validator: function (value) {
            return (
              value === null ||
              /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
                value,
              )
            );
          },
          message: "Invalid GST Number format",
        },
      },
      panNumber: {
        type: String,
        default: null,
        validate: {
          validator: function (value) {
            return value === null || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value);
          },
          message: "Invalid PAN Number format",
        },
      },
      businessAddress: { type: String, default: null },
      city: { type: String, default: null },
      idProofUrl: { type: String, default: null },
      businessDocUrl: { type: String, default: null },
      submittedAt: { type: Date, default: null },
    },
    wishlist: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "wishlist.itemType",
        },
        itemType: {
          type: String,
          enum: ["HOTEL", "EVENT"],
        },
      },
    ],
    refreshToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);
