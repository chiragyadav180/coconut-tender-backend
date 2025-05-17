const mongoose = require("mongoose");

const coconutSchema = new mongoose.Schema({
  variety: { type: String, required: true },
  size: { type: String, required: true },
  rate: { type: Number, required: true },
  available: { type: Boolean, default: true },
  imageUrl: { type: String, default: "" } // 🆕 Image URL field
});

module.exports = mongoose.model("Coconut", coconutSchema);
