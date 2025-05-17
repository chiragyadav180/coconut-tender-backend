const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  coconutId: { type: mongoose.Schema.Types.ObjectId, ref: "Coconut", required: true },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true }, 
  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "assigned", "out-for-delivery", "delivered"],
    default: "pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
