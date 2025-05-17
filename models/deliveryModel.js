const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { 
    type: String, 
    enum: ["assigned", "out-for-delivery", "delivered"], 
    default: "assigned" 
  },
  deliveredAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model("Delivery", deliverySchema);
