const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// Routes
const adminRoutes = require("./routes/adminRoute");
const userRoutes = require("./routes/userRoute");
const vendorRoutes = require("./routes/vendorRoute");
const driverRoutes = require("./routes/driverRoute");

dotenv.config();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Endpoints
app.use("/users", userRoutes);
app.use("/vendor", vendorRoutes);
app.use("/admin", adminRoutes);
app.use("/driver", driverRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(" MongoDB Connected"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// Root Route
app.get("/", (req, res) => {
  res.send("Mart Enterprises API is Running...");
});

// HTTP Server & Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", 
    methods: ["GET", "POST", "PUT"]
  }
});

// Expose io to routes/controllers
app.set("io", io);

// Track user socket connections by userId
const socketUsers = {};
global.socketUsers = socketUsers;

// Socket.IO logic
io.on("connection", (socket) => {
  console.log(" New client connected:", socket.id);

  // Debug all events
  socket.onAny((event, payload) => {
    console.log(`Event received: ${event}`, payload);
  });

  // Register client to rooms
  socket.on("joinRoom", (data) => {
    let userId, role;

    // Safely parse payload (string or object)
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        userId = parsed.userId;
        role = parsed.role;
      } catch (err) {
        console.error(" Failed to parse joinRoom payload:", data);
        return;
      }
    } else {
      userId = data.userId;
      role = data.role;
    }

    if (!userId || !role) {
      console.warn(" Missing userId or role in joinRoom payload");
      return;
    }

    if (role === "admin") {
      socket.join("admin");
      console.log(` Admin ${userId} joined room 'admin'`);
    } else if (role === "vendor") {
      socket.join(`vendor:${userId}`);
      console.log(` Vendor ${userId} joined room vendor:${userId}`);
    } else if (role === "driver") {
      socket.join(`driver:${userId}`);
      console.log(` Driver ${userId} joined room driver:${userId}`);
    }

    // Track socket ID
    socketUsers[userId] = socket.id;
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(" Client disconnected:", socket.id);

    for (const [userId, sockId] of Object.entries(socketUsers)) {
      if (sockId === socket.id) {
        delete socketUsers[userId];
        break;
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(` Server running on port ${PORT}`));
