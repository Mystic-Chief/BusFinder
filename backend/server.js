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

const MONGO_URI = "mongodb://localhost:27017/";
const DATABASE_NAME = "BusFinder";
const UPLOADS_DIR = path.join(__dirname, "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname) !== ".xlsx") {
            return cb(new Error("Only .xlsx files are allowed"));
        }
        cb(null, true);
    }
}).fields([
    { name: "firstShift", maxCount: 1 },
    { name: "adminIncoming", maxCount: 1 },
    { name: "adminOutgoing", maxCount: 1 },
    { name: "generalIncoming", maxCount: 1 }
]);

// MongoDB Connection
let db;
MongoClient.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db(DATABASE_NAME);
        console.log("✅ Connected to MongoDB");
    })
    .catch(error => console.error("❌ MongoDB Connection Error:", error));

// Helper function to map uploaded file fields to MongoDB collections
const mapFieldToCollection = (field) => {
    const collectionMap = {
        firstShift: "firstshift",
        adminIncoming: "admin_incoming",
        adminOutgoing: "admin_outgoing",
        generalIncoming: "general_incoming"
    };
    return collectionMap[field] || null;
};

// Process uploaded Excel file and update MongoDB
const processFile = (file, collectionName) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(UPLOADS_DIR, file.filename);
        const scriptPath = path.join(__dirname, "scripts", "process_pdf.py");

        exec(`python "${scriptPath}" "${filePath}" "${collectionName}"`, 
            { encoding: "utf-8" },
            (error, stdout, stderr) => {
                // Delete the uploaded file after processing
                fs.unlink(filePath, (err) => {
                    if (err) console.error("⚠️ Error deleting file:", err);
                });

                if (error) {
                    console.error(`❌ Error processing ${collectionName}:`, stderr);
                    reject(new Error(`Failed to process ${collectionName} file`));
                } else {
                    console.log(`✅ ${collectionName} processed successfully`);
                    resolve({ collection: collectionName, status: "success" });
                }
            }
        );
    });
};

// File Upload API
app.post("/upload", (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error("❌ Upload error:", err);
            return res.status(400).json({ success: false, message: err.message });
        }

        try {
            const processingResults = [];

            // Process each uploaded file
            for (const [field, uploadedFile] of Object.entries(req.files)) {
                const file = uploadedFile[0];
                const collectionName = mapFieldToCollection(field);
                if (collectionName) {
                    const result = await processFile(file, collectionName);
                    processingResults.push(result);
                }
            }

            res.json({
                success: true,
                message: "All files processed successfully",
                results: processingResults
            });
        } catch (error) {
            console.error("❌ Processing error:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    });
});

// API to get unique stops from the selected collection
app.get("/stops", async (req, res) => {
    try {
        const collectionName = req.query.collection;
        if (!collectionName) {
            return res.status(400).json({ error: "Collection parameter is required" });
        }

        const collection = db.collection(collectionName);

        const stops = await collection.aggregate([
            { $unwind: "$Stops" },
            { $group: { _id: "$Stops" } },
            { $sort: { _id: 1 } }
        ]).toArray();

        res.json({ stops: stops.map(s => s._id) });
    } catch (error) {
        console.error("❌ Error fetching stops:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// API to get buses from the selected collection for a given stop
app.get("/buses/:stopName", async (req, res) => {
    try {
        const stopName = req.params.stopName.toLowerCase();
        const collectionName = req.query.collection;

        if (!collectionName) {
            return res.status(400).json({ error: "Collection parameter is required" });
        }

        const collection = db.collection(collectionName);
        console.log(`🔎 Searching for buses at stop: "${stopName}" in collection: ${collectionName}`);

        const buses = await collection.find({ Stops: stopName }).toArray();

        if (buses.length > 0) {
            res.json({ buses: buses.map(bus => bus["Bus Code"]) });
        } else {
            res.json({ message: "No buses found for this stop." });
        }
    } catch (error) {
        console.error("❌ Error fetching buses:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
