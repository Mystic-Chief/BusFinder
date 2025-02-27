const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose"); // Use Mongoose
const { cleanupOldFiles } = require("./utils/fileUtils");
const authRoutes = require("./routes/authRoutes");
const busRoutes = require("./routes/busRoutes");
const fileRoutes = require("./routes/fileRoutes");
const tempEditRoutes = require("./routes/tempEditRoutes");
const cookie = require("cookie-parser");

const app = express();

const corsOptions = {
  origin: [
    "http://localhost:5173", // Development
    "https://your-frontend-domain.com" // Production
  ],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(cookie());
app.use(express.json());

// Load environment variables
require("dotenv").config();

// Database connection using Mongoose
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: process.env.DATABASE_NAME
        });
        console.log("✅ Connected to MongoDB");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        process.exit(1); // Exit the process if the connection fails
    }
};

// Start the server after connecting to the database
const startServer = async () => {
    await connectDB();

    // Routes
    app.use("/api/auth", authRoutes);
    app.use("/api/bus", busRoutes);
    app.use("/api/file", fileRoutes);
    app.use("/api/temp-edit", tempEditRoutes);

    // Background tasks
    setInterval(async () => {
        try {
            const tempCollection = mongoose.connection.db.collection("temp_changes");
            const result = await tempCollection.deleteMany({
                expiresAt: { $lt: new Date() }
            });
            console.log(`🧹 Cleaned up ${result.deletedCount} expired temporary changes`);
        } catch (error) {
            console.error("❌ Error cleaning temp changes:", error);
        }
    }, 300000); // 5 minutes

    // File cleanup every hour
    setInterval(cleanupOldFiles, 60 * 60 * 1000);

    // Start the server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();