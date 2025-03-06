const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { processFile, processExamFile, mapFieldToCollection } = require("../utils/fileUtils");

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
    { name: "adminOutgoing1", maxCount: 1 }, // Saturday 1:15 PM
    { name: "adminOutgoing2", maxCount: 1 }, // Saturday 4:45 PM
    { name: "examScheduleIncoming", maxCount: 1 }, // Exam - Incoming
    { name: "examScheduleOutgoing", maxCount: 1 }  // Exam - Outgoing
]);

const handleFileUpload = async (req, res) => {
    const multerUpload = (req, res) => {
        return new Promise((resolve, reject) => {
            upload(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    };

    try {
        await multerUpload(req, res);

        // Extract exam metadata from request body
        const { examTitle, startDate, endDate } = req.body;

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ success: false, message: "No files were uploaded" });
        }

        const filesToDelete = new Set();
        const processingResults = [];

        for (const [field, files] of Object.entries(req.files)) {
            const file = files[0];

            if (field === "examScheduleIncoming" || field === "examScheduleOutgoing") {
                if (!examTitle || !startDate || !endDate) {
                    throw new Error("Missing exam metadata (title, dates)");
                }
                
                const direction = field === "examScheduleIncoming" ? "incoming" : "outgoing";
                await processExamFile(file, direction, examTitle, startDate, endDate);
                processingResults.push({ 
                    field, 
                    collection: "exam_schedules", 
                    direction,
                    examTitle,
                    status: "Processed" 
                });
                filesToDelete.add(file.filename);
                continue;
            }

            const collection = mapFieldToCollection(field, req.body.day || "Monday-Friday");
            if (!collection) {
                console.warn(`⚠️ No collection mapped for field: ${field}`);
                continue;
            }
            
            // Explicitly set fileType to "bus" for regular bus schedules
            await processFile(file, collection, "bus");
            
            processingResults.push({ field, collection, status: "Processed" });
            filesToDelete.add(file.filename);
        }

        for (const filename of filesToDelete) {
            fs.unlink(path.join(UPLOADS_DIR, filename), err => {
                if (err) console.error("⚠️ File deletion error:", err);
            });
        }

        res.json({ success: true, message: "Files processed successfully", results: processingResults });

    } catch (error) {
        console.error("❌ File processing error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { handleFileUpload };