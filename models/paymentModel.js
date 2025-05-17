const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  amountPaid: { type: Number, required: true },
  amountDue: { type: Number, required: true }, 
  paymentMethod: { type: String, enum: ["cash", "upi", "razorpay"], required: true },
  status: { type: String, enum: ["pending", "completed"], default: "pending" },
  razorpayOrderId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);