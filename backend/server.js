const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { cleanupOldFiles } = require("./utils/fileUtils");
const authRoutes = require("./routes/authRoutes");
const busRoutes = require("./routes/busRoutes");
const fileRoutes = require("./routes/fileRoutes");
const tempEditRoutes = require("./routes/tempEditRoutes");
const { createDefaultAdmin } = require("./controllers/authController");
const examRoutes = require("./routes/examRoutes")
const cookie = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const winston = require("winston");
const path = require("path");
const DailyRotateFile = require("winston-daily-rotate-file");
const https = require("https");
const fs = require("fs");
const { create } = require("./models/Admin");

// Load environment variables
require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

// Initialize Express app
const app = express();

// Create a logs directory if it doesn't exist
const logsDir = path.join(__dirname, "logs");
require("fs").mkdirSync(logsDir, { recursive: true });

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, `${process.env.NODE_ENV}-error-%DATE%.log`),
      level: "error",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    }),
    new DailyRotateFile({
      filename: path.join(logsDir, `${process.env.NODE_ENV}-combined-%DATE%.log`),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

// Log to console in development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}


// CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:5173", // Development
    "https://your-frontend-domain.com", // Production
  ],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Security middleware
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
  })
);

app.use(cors(corsOptions));
app.use(cookie());
app.use(express.json());

// Database connection using Mongoose
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    createDefaultAdmin();
    logger.info("✅ Connected to MongoDB");
  } catch (error) {
    logger.error("❌ MongoDB connection error:", error);
    process.exit(1); // Exit the process if the connection fails
  }
};

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bus", busRoutes);
app.use("/api/file", fileRoutes);
app.use("/api/temp-edit", tempEditRoutes);
app.use("/api/exam", examRoutes);

// Background tasks
setInterval(async () => {
  try {
    const tempCollection = mongoose.connection.db.collection("temp_changes");
    const result = await tempCollection.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    logger.info(`🧹 Cleaned up ${result.deletedCount} expired temporary changes`);
  } catch (error) {
    logger.error("❌ Error cleaning temp changes:", error);
  }
}, 300000); // 5 minutes

// File cleanup every hour
setInterval(cleanupOldFiles, 60 * 60 * 1000);

// Centralized error handling
app.use((err, req, res, next) => {
  logger.error(`❌ Error: ${err.message}`);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

// Start the server
const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;

//   if (process.env.NODE_ENV === "production") {
//     // HTTPS in production
//     const httpsServer = https.createServer(
//       {
//         key: fs.readFileSync("/certs/key.pem"),
//         cert: fs.readFileSync("/certs/cert.pem"),
//       },
//       app
//     );

//     httpsServer.listen(PORT, () => {
//       logger.info(`🚀 HTTPS server running on port ${PORT}`);
//     });
//   } else {
//     // HTTP in development
//     app.listen(PORT, () => {
//       logger.info(`🚀 HTTP server running on port ${PORT}`);
//     });
//   }
// };

  app.listen(PORT, "0.0.0.0", () => {
      logger.info(`🚀 Server running on port ${PORT}`);
  });

};

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("🛑 Shutting down server...");
  await mongoose.connection.close();
  logger.info("✅ MongoDB connection closed");
  process.exit(0);
});

// Start the server
startServer();