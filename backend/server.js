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

        console.log(`🔍 Fetched ${stops.length} stops from collection: ${collectionName}`);
        res.json({ stops: stops.map(s => s._id) });
    } catch (error) {
        console.error("❌ Error fetching stops:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/buses/:stopName", async (req, res) => {
    try {
        const stopName = req.params.stopName.toLowerCase();
        const collectionName = req.query.collection;

        if (!collectionName) {
            return res.status(400).json({ error: "Collection parameter is required" });
        }

        const collection = db.collection(collectionName);
        const tempCollection = db.collection("temp_changes");

        console.log(`🔍 Searching for buses at stop: "${stopName}" in collection: ${collectionName}`);

        // 1. Fetch original buses with this stop
        const originalBuses = await collection.find({ Stops: stopName }).toArray();
        console.log(`🔍 Found ${originalBuses.length} original buses for stop: "${stopName}"`);

        // 2. Fetch active temporary changes for these buses
        const activeChanges = await tempCollection.find({
            $or: [
                {
                    type: "bulk",
                    busId: { $in: originalBuses.map(b => b._id.toString()) },
                    originalCollection: collectionName,
                    expiresAt: { $gt: new Date() }
                },
                {
                    type: "partial",
                    stops: stopName,
                    originalCollection: collectionName,
                    expiresAt: { $gt: new Date() }
                }
            ]
        }).toArray();

        console.log(`🔍 Found ${activeChanges.length} active temporary changes for stop: "${stopName}"`);

        // 3. Create merged results
        const results = originalBuses.map(bus => {
            // Find applicable changes (prioritize bulk changes)
            const bulkChange = activeChanges.find(c =>
                c.type === "bulk" && c.busId === bus._id.toString()
            );

            const partialChanges = activeChanges.filter(c =>
                c.type === "partial" &&
                c.busId === bus._id.toString() &&
                c.stops.includes(stopName)
            );

            // Use most recent change
            const changes = [bulkChange, ...partialChanges].filter(Boolean)
                .sort((a, b) => b.expiresAt - a.expiresAt);

            const finalBusNumber = changes.length > 0 ? changes[0].newBusNumber : bus["Bus Code"];
            const expiresAt = changes.length > 0 ? changes[0].expiresAt : null;

            // Format the result
            const result = {
                originalBusNumber: bus["Bus Code"],
                newBusNumber: finalBusNumber,
                expiresAt: expiresAt ? expiresAt.toISOString() : null,
                message: changes.length > 0
                    ? `Bus: ${finalBusNumber} instead of ${bus["Bus Code"]} for ${expiresAt.toLocaleDateString()}`
                    : `Bus: ${bus["Bus Code"]}`
            };

            console.log(`🔍 Bus ${bus["Bus Code"]} -> ${finalBusNumber} (${changes.length} changes applied)`);
            return result;
        });

        console.log(`✅ Returning ${results.length} buses for stop: "${stopName}"`);
        res.json({ buses: results });
    } catch (error) {
        console.error("❌ Error fetching buses:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/editable-data", async (req, res) => {
    try {
        const collection = db.collection(req.query.collection);
        const tempCollection = db.collection("temp_changes");

        const [originalBuses, tempChanges] = await Promise.all([
            collection.find().toArray(),
            tempCollection.find({
                originalCollection: req.query.collection,
                expiresAt: { $gt: new Date() }
            }).toArray()
        ]);

        // Group temp changes by new bus number
        const tempGroups = tempChanges.reduce((acc, change) => {
            if (!acc[change.newBusNumber]) {
                acc[change.newBusNumber] = [];
            }
            acc[change.newBusNumber].push(change);
            return acc;
        }, {});

        // Create final buses list
        const buses = originalBuses.map(bus => ({
            ...bus,
            isTemporary: false,
            partialChanges: []
        }));

        // Add temporary buses and modify originals
        Object.entries(tempGroups).forEach(([newBusNumber, changes]) => {
            changes.forEach(change => {
                if (change.type === 'partial') {
                    // Find original bus
                    const originalBus = buses.find(b => b._id.toString() === change.busId);
                    if (originalBus) {
                        // Remove stops from original
                        originalBus.Stops = originalBus.Stops.filter(s => !change.stops.includes(s));
                        originalBus.partialChanges.push(change);
                        
                        // Add to temporary group
                        let tempBus = buses.find(b => b['Bus Code'] === newBusNumber);
                        if (!tempBus) {
                            tempBus = {
                                _id: `temp_${newBusNumber}`,
                                'Bus Code': newBusNumber,
                                Stops: [],
                                isTemporary: true,
                                partialChanges: []
                            };
                            buses.push(tempBus);
                        }
                        tempBus.Stops.push(...change.stops);
                    }
                }
                else if (change.type === 'bulk') {
                    // Handle bulk changes
                    const originalBus = buses.find(b => b._id.toString() === change.busId);
                    if (originalBus) {
                        originalBus['Bus Code'] = newBusNumber;
                        originalBus.isTemporary = true;
                    }
                }
            });
        });

        res.json({ buses });
    } catch (error) {
        console.error("Error fetching editable data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Modify the temp-edit endpoint
app.post('/temp-edit', async (req, res) => {
    try {
        const { busId, newBusNumber, type, stops } = req.body;
        const tempCollection = db.collection('temp_changes');

        // Create unique ID for partial changes
        const changeId = type === 'partial' ?
            `${busId}-${Date.now()}` : // Unique ID for partial changes
            busId; // Bulk changes still use busId

        await tempCollection.updateOne(
            { _id: changeId },
            {
                $set: {
                    busId,
                    newBusNumber,
                    type,
                    stops,
                    expiresAt: new Date(Date.now() + 7200000),
                    originalCollection: req.body.collection
                }
            },
            { upsert: true }
        );

        console.log(`✅ Saved temporary change for bus: ${req.body.busId}, type: ${req.body.type}`);
        res.json({ success: true });
    } catch (error) {
        console.error("❌ Error saving temporary edit:", error);
        res.status(500).json({ error: 'Failed to save temporary edit' });
    }
});

// Cleanup expired temporary changes every 5 minutes
setInterval(async () => {
    try {
        const tempCollection = db.collection("temp_changes");
        const result = await tempCollection.deleteMany({
            expiresAt: { $lt: new Date() }
        });
        console.log(`🧹 Cleaned up ${result.deletedCount} expired temporary changes`);
    } catch (error) {
        console.error("❌ Error cleaning temp changes:", error);
    }
}, 300000);

// Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));