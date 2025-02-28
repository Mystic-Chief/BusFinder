const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const UPLOADS_DIR = path.join(__dirname, "../uploads");
const SCRIPTS_DIR = path.join(__dirname, "../scripts");

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Updated collection mapping with Saturday support
const collectionMap = {
    // Weekday collections
    firstShiftIncoming: "firstshift_incoming",
    firstShiftOutgoing: "firstshift_outgoing",
    adminIncoming: "admin_incoming",
    adminOutgoing: "admin_outgoing",
    generalIncoming: "general_incoming",
    
    // Saturday-specific collections
    firstShiftIncomingSaturday: "firstshift_incoming_saturday",
    firstShiftOutgoingSaturday: "firstshift_outgoing_saturday",
    adminIncomingSaturday: "admin_incoming_saturday",
    adminOutgoing1Saturday: "admin_outgoing_1_15_saturday",
    adminOutgoing2Saturday: "admin_outgoing_4_45_saturday"
};

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
            if (code === 0) resolve();
            else reject(new Error(`Script failed for ${collectionName}`));
        });
    });
};

const cleanupOldFiles = () => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;

    fs.readdir(UPLOADS_DIR, (err, files) => {
        if (err) return console.error("⚠️ Error reading uploads directory:", err);
        
        files.forEach((file) => {
            const filePath = path.join(UPLOADS_DIR, file);
            const stats = fs.statSync(filePath);

            if (now - stats.mtimeMs > maxAge) {
                fs.unlink(filePath, (err) => {
                    err ? console.error("⚠️ Error deleting old file:", err)
                        : console.log(`✅ Deleted old file: ${file}`);
                });
            }
        });
    });
};

// Updated mapper with day parameter
const mapFieldToCollection = (field, day) => {
    const isSaturday = day === "Saturday";
    
    const saturdayMappings = {
        firstShiftIncoming: collectionMap.firstShiftIncomingSaturday,
        firstShiftOutgoing: collectionMap.firstShiftOutgoingSaturday,
        adminIncoming: collectionMap.adminIncomingSaturday,
        adminOutgoing1: collectionMap.adminOutgoing1Saturday,
        adminOutgoing2: collectionMap.adminOutgoing2Saturday
    };

    return isSaturday ? saturdayMappings[field] : collectionMap[field];
};

module.exports = {
    processFile,
    cleanupOldFiles,
    mapFieldToCollection
};