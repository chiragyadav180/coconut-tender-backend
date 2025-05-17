const express = require("express");
const router = express.Router();
const { protect, vendorOnly } = require("../middleware/authMiddleware");

const { 
  placeOrder, 
  getVendorOrders, 
  makePayment,
  verifyPayment,
  getAvailableCoconuts,
  createCheckoutSession 
} = require("../controllers/vendorController");


// Protected vendor routes
router.get("/coconuts", protect, vendorOnly(), getAvailableCoconuts);

router.post("/order", protect, vendorOnly(), placeOrder);

router.get("/orders/:vendorId", protect, vendorOnly(), (req, res, next) => {
  if (req.params.vendorId !== req.user._id.toString()) {
    return res.status(403).json({ error: "Unauthorized access" });
  }
  next();
}, getVendorOrders);

router.post("/pay", protect, vendorOnly(), makePayment);

// Add Razorpay checkout session endpoint
router.post("/create-checkout-session", protect, vendorOnly(), createCheckoutSession);

// Add Razorpay payment verification endpoint
router.post("/verify-payment", protect, vendorOnly(), verifyPayment);

module.exports = router;
