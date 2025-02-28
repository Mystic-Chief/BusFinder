const mongoose = require("mongoose");

/**
 * Fetches unique stops from the specified collection.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const getStops = async (req, res) => {
    try {
        const collectionName = req.query.collection;
        if (!collectionName) {
            return res.status(400).json({ error: "Collection parameter is required" });
        }

        const collection = mongoose.connection.db.collection(req.query.collection);
        // Aggregate stops and sort them alphabetically
        const stops = await collection.aggregate([
            { $unwind: "$Stops" }, // Unwind the Stops array
            { $group: { _id: "$Stops" } }, // Group by stop names
            { $sort: { _id: 1 } } // Sort alphabetically
        ]).toArray();

        console.log(`🔍 Fetched ${stops.length} stops from collection: ${collectionName}`);
        res.json({ stops: stops.map(s => s._id) }); // Return only the stop names
    } catch (error) {
        console.error("❌ Stops fetch error:", error);
        res.status(500).json({ error: "Failed to fetch stops" });
    }
};

/**
 * Fetches buses for a specific stop, including temporary changes.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const getBuses = async (req, res) => {
    try {
        const collectionName = req.query.collection;
        const stopName = req.params.stopName.toLowerCase();

        if (!collectionName) {
            return res.status(400).json({ error: "Collection parameter is required" });
        }

        const collection = mongoose.connection.db.collection(collectionName);
        const tempCollection = mongoose.connection.db.collection("temp_changes");

        console.log(`🔍 Searching for buses at stop: "${stopName}" in collection: ${collectionName}`);

        // Fetch original buses with this stop
        const originalBuses = await collection.find({ Stops: stopName }).toArray();
        console.log(`🔍 Found ${originalBuses.length} original buses for stop: "${stopName}"`);

        // Fetch active temporary changes for these buses
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

        // Merge original buses with temporary changes
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

            // Use the most recent change
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
                    ? `Bus: ${finalBusNumber} instead of ${bus["Bus Code"]} until ${expiresAt.toLocaleDateString()}`
                    : `Bus: ${bus["Bus Code"]}`
            };

            console.log(`🔍 Bus ${bus["Bus Code"]} -> ${finalBusNumber} (${changes.length} changes applied)`);
            return result;
        });

        console.log(`✅ Returning ${results.length} buses for stop: "${stopName}"`);
        res.json({ buses: results });
    } catch (error) {
        console.error("❌ Buses fetch error:", error);
        res.status(500).json({ error: "Failed to fetch buses" });
    }
};

module.exports = { getStops, getBuses };