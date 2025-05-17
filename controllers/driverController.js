const Order = require("../models/orderModel");
const Delivery = require("../models/deliveryModel");

// Get all orders assigned 
const getAssignedOrders = async (req, res) => {
  try {
    const driverId = req.user._id;
    const { history } = req.query;

    let statusFilter;
    if (history === "true") {
      statusFilter = "delivered";
    } else {
      statusFilter = { $ne: "delivered" }; 
    }

    const orders = await Order.find({
      driverId,
      status: statusFilter,
    }).populate("vendorId", "name");

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error("Failed to fetch assigned orders:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update delivery status with validation
const updateDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { orderId } = req.params;

    const validStatuses = ["out-for-delivery", "delivered"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const order = await Order.findOne({
      _id: orderId,
      driverId: req.user._id
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found or not assigned to you" });
    }

    order.status = status;
    await order.save();

    const deliveryUpdates = { status };
    let deliveredAtTime = null;

    if (status === "delivered") {
      deliveredAtTime = new Date();
      deliveryUpdates.deliveredAt = deliveredAtTime;
    }

    const delivery = await Delivery.findOneAndUpdate(
      { orderId },
      deliveryUpdates,
      { new: true }
    );


    const io = req.app.get("io");
    if (io) {
      io.to("admin").emit("deliveryStatusUpdated", {
        orderId: order._id,
        status,
        driverId: req.user._id,
        vendorId: order.vendorId,
        deliveredAt: deliveredAtTime,
        message: `Order ${order._id} updated to ${status}`
      });

      io.to(`vendor:${order.vendorId.toString()}`).emit("deliveryStatusUpdated", {
        orderId: order._id,
        status,
        driverId: req.user._id,
        deliveredAt: deliveredAtTime,
        message: `Your order ${order._id} is now ${status}`
      });
    }

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      data: { order, delivery }
    });

  } catch (error) {
    res.status(500).json({ error: "Status update failed: " + error.message });
  }
};

module.exports = { getAssignedOrders, updateDeliveryStatus };