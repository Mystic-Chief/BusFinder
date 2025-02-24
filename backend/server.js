const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const UPLOADS_DIR = path.join(__dirname, "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Configure Multer to handle file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage });

// API to handle file upload and process with Python script
app.post("/upload", upload.single("excelFile"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const filePath = path.join(UPLOADS_DIR, req.file.filename);
    console.log(`📂 File uploaded: ${filePath}`);

    // Run the Python script with the uploaded file
    const scriptPath = path.join(__dirname, "scripts", "process_pdf.py");
    exec(`set PYTHONIOENCODING=utf-8 && python "${scriptPath}" "${filePath}"`, (error, stdout, stderr) => {

        // Delete the file after processing
        fs.unlink(filePath, (err) => {
            if (err) console.error("⚠️ Error deleting file:", err);
            else console.log("✅ File deleted after processing.");
        });

        if (error) {
            console.error("❌ Python Script Error:", stderr);
            return res.status(500).json({ success: false, message: "Error processing file.", error: stderr });
        }

        console.log("✅ Python Script Output:", stdout);
        return res.json({ success: true, message: "File processed successfully.", output: stdout });
    });
});

const MONGO_URI = "mongodb://localhost:27017/";
const DATABASE_NAME = "BusFinder";
const COLLECTION_NAME = "bus_routes";

// Connect to MongoDB
let db;
MongoClient.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db(DATABASE_NAME);
        console.log("✅ Connected to MongoDB");
    })
    .catch(error => console.error("❌ MongoDB Connection Error:", error));

// API to get buses by stop name (Case Insensitive)
app.get("/buses/:stopName", async (req, res) => {
    const stopName = req.params.stopName.toLowerCase(); // Convert input to lowercase

    console.log(`🔍 Received request for stop: "${stopName}"`);

    try {
        const collection = db.collection(COLLECTION_NAME);
        console.log(`🔎 Running MongoDB query: { "Stops": "${stopName}" }`);

        const buses = await collection.find(
            { Stops: stopName } // Exact match search
        ).toArray();

        console.log("✅ MongoDB Query Result:", buses);

        if (buses.length > 0) {
            res.json({ buses: buses.map(bus => bus["Bus Code"]) });
        } else {
            res.json({ message: "No buses found for this stop." });
        }
    } catch (error) {
        console.error("❌ MongoDB Query Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/stops", async (req, res) => {
    try {
        const collection = db.collection(COLLECTION_NAME);

        // Aggregate all stops and return unique values
        const stops = await collection.aggregate([
            { $unwind: "$Stops" }, // Flatten stops array
            { $group: { _id: "$Stops" } }, // Get unique stops
            { $sort: { _id: 1 } } // Sort alphabetically
        ]).toArray();

        // Send the unique stops list
        res.json({ stops: stops.map(s => s._id) });
    } catch (error) {
        console.error("❌ Error fetching stops:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
