const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");

const {
  getAllUsers,
  addUser,
  updateUser,
  deleteUser,
  getAllOrders,
  assignDelivery,
  getAllPayments,
  updatePaymentStatus,
  getAllDrivers,
  addCoconut,
  getCoconuts,
  updateCoconut,
  deleteCoconut,
} = require("../controllers/adminController");

// Admin-only routes
router.get("/users", protect, adminOnly(), getAllUsers);
router.post("/users", protect, adminOnly(), addUser); 
router.put("/users/:id", protect, adminOnly(), updateUser); 
router.delete("/users/:id", protect, adminOnly(), deleteUser); 

router.get("/orders", protect, adminOnly(), getAllOrders);
router.post("/assign-delivery", protect, adminOnly(), assignDelivery);

// Payment management routes
router.get("/payments", protect, adminOnly(), getAllPayments);
router.put("/payments/:paymentId", protect, adminOnly(), updatePaymentStatus); // New route

// Driver management routes

router.get("/drivers", protect, adminOnly(), getAllDrivers);


// Coconut management routes
router.post("/coconuts", protect, adminOnly(), addCoconut);
router.get("/coconuts", protect, adminOnly(), getCoconuts);
router.put("/coconuts/:id", protect, adminOnly(), updateCoconut);
router.delete("/coconuts/:id", protect, adminOnly(), deleteCoconut);

module.exports = router;