const mongoose = require("mongoose");
const { Schema, Types: { ObjectId } } = mongoose;

const ReviewSchema = new Schema({
  customerId: { type: ObjectId, ref: "User", required: true },
  itemId: { type: ObjectId, required: true },
  itemType: { type: String, enum: ["HOTEL", "EVENT"], required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
}, { timestamps: true });

// One review per customer per item
ReviewSchema.index({ customerId: 1, itemId: 1, itemType: 1 }, { unique: true });
ReviewSchema.index({ itemId: 1, itemType: 1 });

module.exports = mongoose.model("Review", ReviewSchema);
