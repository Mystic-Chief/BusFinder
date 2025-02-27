const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

// Define paths relative to this file's location
const UPLOADS_DIR = path.join(__dirname, "../uploads");
const SCRIPTS_DIR = path.join(__dirname, "../scripts");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Map file fields to MongoDB collections
const collectionMap = {
    firstShiftIncoming: "firstshift_incoming",
    firstShiftOutgoing: "firstshift_outgoing",
    adminIncoming: "admin_incoming",
    adminOutgoing: "admin_outgoing",
    generalIncoming: "general_incoming"
};

/**
 * Process an uploaded file using a Python script.
 * @param {Object} file - The uploaded file object.
 * @param {string} collectionName - The MongoDB collection name.
 * @returns {Promise<void>}
 */
const processFile = (file, collectionName) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(UPLOADS_DIR, file.filename);
        const scriptPath = path.join(SCRIPTS_DIR, "process_pdf.py");

        console.log(`🚀 Processing file: ${filePath} for collection: ${collectionName}`);

        const process = exec(`python "${scriptPath}" "${filePath}" "${collectionName}"`);

        process.stdout.on("data", (data) => {
            console.log(`📝 Script Output: ${data.trim()}`);
        });

        process.stderr.on("data", (data) => {
            console.error(`❌ Script Error: ${data.trim()}`);
        });

        process.on("close", (code) => {
            if (code === 0) {
                console.log(`✅ Script completed successfully for ${collectionName}`);
                resolve();
            } else {
                console.error(`❌ Script failed with exit code ${code}`);
                reject(new Error(`Script failed for ${collectionName}. Check logs above.`));
            }
        });
    });
};

/**
 * Clean up old files from the uploads directory.
 */
const cleanupOldFiles = () => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    fs.readdir(UPLOADS_DIR, (err, files) => {
        if (err) {
            console.error("⚠️ Error reading uploads directory:", err);
            return;
        }

        files.forEach((file) => {
            const filePath = path.join(UPLOADS_DIR, file);
            const stats = fs.statSync(filePath);

            if (now - stats.mtimeMs > maxAge) {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error("⚠️ Error deleting old file:", err);
                    } else {
                        console.log(`✅ Deleted old file: ${file}`);
                    }
                });
            }
        });
    });
};

/**
 * Map a file field to a MongoDB collection.
 * @param {string} field - The file field name.
 * @returns {string|null} - The corresponding collection name or null if not found.
 */
const mapFieldToCollection = (field) => {
    return collectionMap[field] || null;
};

module.exports = {
    processFile,
    cleanupOldFiles,
    mapFieldToCollection
};