const Order = require("../models/orderModel");
const User = require("../models/userModel");
const Payment = require("../models/paymentModel");
const Coconut = require("../models/coconutModel");
const Razorpay = require("razorpay");
const dotenv = require("dotenv");

dotenv.config();


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const getAvailableCoconuts = async (req, res) => {
  try {
    const coconuts = await Coconut.find({ available: true });
    res.json({ success: true, data: coconuts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Place order
const placeOrder = async (req, res) => {
  try {
    const { coconutId, quantity, paymentMethod } = req.body;
    const vendorId = req.user._id;

    if (!coconutId || !quantity || !paymentMethod) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const coconut = await Coconut.findById(coconutId);
    if (!coconut || !coconut.available) {
      return res.status(400).json({ error: "Invalid or unavailable coconut variety" });
    }

    const totalPrice = quantity * coconut.rate;

    // Create order
    const order = await Order.create({
      vendorId,
      coconutId,
      quantity,
      rate: coconut.rate,
      totalPrice,
      status: "pending",
      paymentMethod
    });

    // Create payment record
    const payment = await Payment.create({
      vendorId,
      coconutId,
      orderId: order._id,
      amountPaid: 0,
      amountDue: totalPrice,
      paymentMethod,
      status: "pending"
    });

    await User.findByIdAndUpdate(vendorId, {
      $inc: { balanceDue: totalPrice }
    });

    // Notify admin
    const io = req.app.get("io");
    if (io) {
      io.to("admin").emit("orderPlaced", {
        message: "A new order has been placed.",
        orderId: order._id,
        vendorId,
        quantity,
        totalPrice,
        coconut: `${coconut.variety} (${coconut.size})`
      });
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
      payment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Order placement failed: " + error.message
    });
  }
};

// Get vendor orders
const getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.user._id;

    const orders = await Order.find({ vendorId }).sort({ createdAt: -1 });
    const payments = await Payment.find({ vendorId });

    const ordersWithPaymentStatus = orders.map(order => {
      const payment = payments.find(payment => payment.orderId.toString() === order._id.toString());
      return {
        ...order.toObject(),
        paymentStatus: payment ? payment.status : "pending",
        amountPaid: payment ? payment.amountPaid : 0,
        amountDue: payment ? payment.amountDue : order.totalPrice,
      };
    });

    res.json({
      success: true,
      data: ordersWithPaymentStatus
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders: " + error.message
    });
  }
};

// Create Razorpay Checkout session
const createCheckoutSession = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    console.log("Checkout session request received:", {
      body: req.body,
      orderId: orderId,
      amount: amount,
      hasOrderId: Boolean(orderId),
      hasAmount: Boolean(amount),
      amountType: typeof amount
    });

    if (!orderId || !amount) {
      console.log("Validation failed - missing required fields");
      return res.status(400).json({
        success: false,
        error: "Missing orderId or amount"
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      console.log("Validation failed - invalid amount:", amount);
      return res.status(400).json({
        success: false,
        error: "Invalid amount"
      });
    }

    const vendor = req.user;
    if (!vendor) {
      return res.status(404).json({ success: false, error: "Vendor not found" });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, 
      currency: "INR",
      receipt: orderId,
      notes: {
        orderId,
        vendorId: vendor._id
      }
    });


    console.log("Razorpay order created:", razorpayOrder);

    res.json({
      success: true,
      orderId: razorpayOrder.id,
      message: "Checkout session created successfully"
    });

  } catch (error) {
    console.error("Error creating Razorpay checkout session:", error);
    res.status(500).json({
      success: false,
      error: "Error creating checkout session: " + error.message
    });
  }
};


// Make payment
const makePayment = async (req, res) => {
  try {
    const { orderId, amount, paymentMethod } = req.body;
    const vendorId = req.user._id;

    if (amount <= 0) {
      return res.status(400).json({ error: "Invalid payment amount" });
    }

    const payment = await Payment.findOne({
      orderId,
      vendorId
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment record not found" });
    }


    if (paymentMethod === "razorpay") {
      const razorpayOrder = await razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: orderId,
        notes: {
          orderId,
          vendorId
        }
      });

      return res.json({
        success: true,
        razorpayOrder,
        message: "Razorpay order created successfully"
      });
    }


    payment.amountPaid += amount;
    payment.amountDue -= amount;
    payment.paymentMethod = paymentMethod;

    if (payment.amountDue <= 0) {
      payment.status = "completed";
    }

    await payment.save();

    await User.findByIdAndUpdate(vendorId, {
      $inc: { balanceDue: -amount }
    });

    res.json({
      success: true,
      message: "Payment processed",
      payment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Payment failed: " + error.message
    });
  }
};

// Verify Razorpay payment
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;
    const vendorId = req.user._id;

    // Verify payment signature
    const crypto = require("crypto");
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Update payment record
    const payment = await Payment.findOne({
      orderId,
      vendorId
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    // Get payment details from Razorpay
    const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
    const amount = razorpayPayment.amount / 100;

    payment.amountPaid += amount;
    payment.amountDue -= amount;
    payment.paymentMethod = "razorpay";
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpayOrderId = razorpay_order_id;

    if (payment.amountDue <= 0) {
      payment.status = "completed";
    }

    await payment.save();

    await User.findByIdAndUpdate(vendorId, {
      $inc: { balanceDue: -amount }
    });

    res.json({
      success: true,
      message: "Payment verified and processed successfully",
      payment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Payment verification failed: " + error.message
    });
  }
};

module.exports = {
  getAvailableCoconuts,
  placeOrder,
  getVendorOrders,
  createCheckoutSession,  
  makePayment,
  verifyPayment
};
