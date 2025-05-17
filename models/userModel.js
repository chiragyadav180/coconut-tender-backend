// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true }, // Store as plain text for now, hash later
//   role: { 
//     type: String, 
//     enum: ["vendor", "driver", "admin"], 
//     required: true 
//   },
//   location: { type: String, required: function() { return this.role !== "admin"; } }, 
//   balanceDue: { type: Number, default: 0 } // Only for vendors
// }, { timestamps: true });

// module.exports = mongoose.model("User", userSchema);


const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, 
  role: { 
    type: String, 
    enum: ["vendor", "driver", "admin"], 
    required: true 
  },
  phone: { type: String, unique: true, sparse: true },
  location: { type: String, required: function() { return this.role !== "admin"; } },
  balanceDue: { type: Number, default: 0 } 
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
