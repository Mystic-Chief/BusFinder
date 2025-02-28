const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { processFile, mapFieldToCollection } = require("../utils/fileUtils");

const UPLOADS_DIR = path.join(__dirname, "../uploads");

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const fileFilter = (req, file, cb) => {
    if (path.extname(file.originalname) !== ".xlsx") {
        return cb(new Error("Only .xlsx files allowed"), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter
}).fields([
    { name: "firstShiftIncoming", maxCount: 1 },
    { name: "firstShiftOutgoing", maxCount: 1 },
    { name: "adminIncoming", maxCount: 1 },
    { name: "adminOutgoing", maxCount: 1 },
    { name: "generalIncoming", maxCount: 1 },
    { name: "adminOutgoing1", maxCount: 1 }, // For Saturday's 1:15 PM Outgoing
    { name: "adminOutgoing2", maxCount: 1 }  // For Saturday's 4:45 PM Outgoing
]);

const handleFileUpload = async (req, res) => {
    // Wrap Multer middleware in a Promise
    const multerUpload = (req, res) => {
        return new Promise((resolve, reject) => {
            upload(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    };

    try {
        // Execute Multer middleware first
        await multerUpload(req, res);

        // Check if files exist
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files were uploaded"
            });
        }

        // Get the selected day from the request body
        const day = req.body.day || "Monday-Friday"; // Default to Monday-Friday
        const isSaturday = day === "Saturday";

        const filesToDelete = new Set();
        const processingResults = [];

        for (const [field, files] of Object.entries(req.files)) {
            const file = files[0];
            const collection = mapFieldToCollection(field, day); // Pass the day parameter
            
            if (!collection) {
                console.warn(`⚠️ No collection mapped for field: ${field}`);
                continue;
            }

            await processFile(file, collection);
            processingResults.push({ 
                field, 
                collection, 
                status: "Processed", 
                day 
            });
            filesToDelete.add(file.filename);
        }

        // Cleanup files
        for (const filename of filesToDelete) {
            fs.unlink(path.join(UPLOADS_DIR, filename), err => {
                if (err) console.error("⚠️ File deletion error:", err);
            });
        }

        res.json({ 
            success: true, 
            message: "Files processed successfully",
            results: processingResults 
        });

    } catch (error) {
        console.error("❌ File processing error:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

module.exports = { handleFileUpload };