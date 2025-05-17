const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const Order = require("../models/orderModel");
const Delivery = require("../models/deliveryModel");
const Payment = require("../models/paymentModel.js");
const Coconut = require("../models/coconutModel");


// Get all users 
const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const { name, email, password, role, location } = req.body;


    if (!name || !email || !password || !role || !location) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      location,
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    res.status(201).json({ success: true, user: userObj });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update existing user 
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, email, role },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete user 
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all orders
const getAllOrders = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const orders = await Order.find()
      .populate("vendorId", "name")
      .populate("coconutId", "variety size")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Assign delivery to driver
const assignDelivery = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const { orderId, driverId } = req.body;

    if (!orderId || !driverId) {
      return res.status(400).json({ error: "Missing orderId or driverId" });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { driverId, status: "assigned" },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const delivery = await Delivery.create({
      orderId,
      driverId,
      status: "assigned",
    });

    const io = req.app.get("io");
    if (io) {
      const room = `driver:${driverId}`;
      io.to(room).emit("deliveryAssigned", {
        message: "A new delivery has been assigned to you.",
        orderId: order._id,
      });
    }

    res.json({ order, delivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all payments 
const getAllPayments = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const payments = await Payment.find()
      .populate("vendorId", "name email")
      .populate("orderId", "totalPrice status createdAt");

    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: "Unable to retrieve payment records" });
  }
};

// Update payment status 
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, amountPaid } = req.body;

    if (!status || !["pending", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updateData = { status };

    if (status === "completed" && amountPaid) {
      updateData.amountPaid = amountPaid;
      updateData.amountDue = 0;
    }

    const payment = await Payment.findByIdAndUpdate(paymentId, updateData, { new: true })
      .populate("vendorId", "name email")
      .populate("orderId", "totalPrice status createdAt");

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (status === "completed") {
      await Order.findByIdAndUpdate(payment.orderId, {
        paymentStatus: "completed",
        amountPaid: payment.amountPaid + (amountPaid || 0),
        amountDue: 0,
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      payment,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update payment", message: error.message });
  }
};

// Get all drivers 
const getAllDrivers = async (req, res) => {
  try {
    const drivers = await User.find({ role: "driver" }).select("-password");
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
};

// Add new coconut
const addCoconut = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied. Admins only." });
    }

    const coconut = await Coconut.create(req.body);
    res.status(201).json({ success: true, coconut });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all coconuts
const getCoconuts = async (req, res) => {
  try {
    const coconuts = await Coconut.find();
    res.json({ success: true, coconuts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update coconut
const updateCoconut = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied. Admins only." });
    }

    const coconut = await Coconut.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!coconut) {
      return res.status(404).json({ success: false, error: "Coconut not found" });
    }

    res.json({ success: true, coconut });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete coconut
const deleteCoconut = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied. Admins only." });
    }

    const deleted = await Coconut.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: "Coconut not found" });
    }

    res.json({ success: true, message: "Coconut deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
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
};
