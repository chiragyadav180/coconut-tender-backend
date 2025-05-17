const express = require("express");
const router = express.Router();
const { protect, driverOnly } = require("../middleware/authMiddleware");
const {
  getAssignedOrders,
  updateDeliveryStatus
} = require("../controllers/driverController");

// Protected driver routes
router.get("/assigned-orders", protect, driverOnly(),getAssignedOrders
);

router.put(
  "/update-status/:orderId",protect,driverOnly(),updateDeliveryStatus
);

module.exports = router;