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

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'https://storied-cendol-0d74fc.netlify.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middlewares
app.use(express.json());

// API Endpoints
app.use("/users", userRoutes);
app.use("/vendor", vendorRoutes);
app.use("/admin", adminRoutes);
app.use("/driver", driverRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(" MongoDB Connected"))
  .catch(err => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1); // Exit if DB connection fails
  });

// Health Check Route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    dbState: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

// Root Route
app.get("/", (req, res) => {
  res.send("Mart Enterprises API is Running...");
});

// HTTP Server & Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Reuse the same CORS origins
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true
  }
});

// Expose io to routes/controllers
app.set("io", io);

// Track user socket connections by userId
const socketUsers = {};
global.socketUsers = socketUsers;

// Socket.IO logic with improved error handling
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id} from ${socket.handshake.headers.origin}`);

  socket.onAny((event, payload) => {
    console.log(`Event received: ${event}`, payload);
  });

  socket.on("joinRoom", (data) => {
    try {
      const { userId, role } = typeof data === "string" ? JSON.parse(data) : data;
      
      if (!userId || !role) {
        throw new Error("Missing userId or role");
      }

      const room = role === "admin" ? "admin" : `${role}:${userId}`;
      socket.join(room);
      socketUsers[userId] = socket.id;
      
      console.log(`${role} ${userId} joined room ${room}`);
    } catch (err) {
      console.error("JoinRoom error:", err.message);
      socket.emit("error", { message: "Invalid joinRoom request" });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected (${reason}): ${socket.id}`);
    
    for (const [userId, sockId] of Object.entries(socketUsers)) {
      if (sockId === socket.id) {
        delete socketUsers[userId];
        break;
      }
    }
  });

  socket.on("error", (err) => {
    console.error(`Socket error (${socket.id}):`, err);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});