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

        const collection = mongoose.connection.db.collection(collectionName);
        
        // For exam schedules, filter by exam ID if provided
        let pipeline = [];
        
        if (collectionName === "exam_schedules" && req.query.examId) {
            pipeline.push({ 
                $match: { _id: mongoose.Types.ObjectId(req.query.examId) } 
            });
        }
        
        // Add the standard pipeline steps
        pipeline = pipeline.concat([
            { $unwind: "$Stops" }, // Unwind the Stops array
            { $group: { _id: "$Stops" } }, // Group by stop names
            { $sort: { _id: 1 } } // Sort alphabetically
        ]);
        
        const stops = await collection.aggregate(pipeline).toArray();

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
        const stopName = req.params.stop.toLowerCase();
        const examId = req.query.examId;

        if (!collectionName) {
            return res.status(400).json({ error: "Collection parameter is required" });
        }

        const collection = mongoose.connection.db.collection(collectionName);
        const tempCollection = mongoose.connection.db.collection("temp_changes");

        console.log(`🔍 Searching for buses at stop: "${stopName}" in collection: ${collectionName}${examId ? ` for exam ID: ${examId}` : ''}`);

        // Build the query based on collection type
        let query = {};

        if (collectionName === "exam_schedules") {
            // For exam schedules, filter by stop
            query = { 
                Stops: { $regex: new RegExp(stopName, 'i') }
            };
            
            // If exam title is provided, add it to the query instead of ID
            if (req.query.examTitle) {
                query.examTitle = req.query.examTitle;
            }
            
            // If direction is provided in the request, filter by direction too
            if (req.query.direction) {
                query.direction = req.query.direction;
            }
        } else {
            // For regular bus schedules, just filter by stop
            query = { 
                Stops: { $regex: new RegExp(stopName, 'i') }
            };
        }

        // Fetch original buses with this stop
        const originalBuses = await collection.find(query).toArray();
        console.log(`🔍 Found ${originalBuses.length} original buses for stop: "${stopName}"`);

        // Skip temporary changes handling for exam schedules
        if (collectionName === "exam_schedules") {
            // Process results for exam schedules
            const results = [];
            
            for (const bus of originalBuses) {
                // Find matching stops (case insensitive)
                const regex = new RegExp(stopName, 'i');
                const matchingStops = bus.Stops.filter(stop => regex.test(stop));
                
                if (matchingStops.length > 0) {
                    for (const stop of matchingStops) {
                        results.push({
                            message: `Bus: ${bus["Bus Code"]}`,
                            originalBusNumber: bus["Bus Code"],
                            direction: bus.direction
                        });
                    }
                }
            }
            
            console.log(`✅ Returning ${results.length} exam buses for stop: "${stopName}"`);
            return res.json({ buses: results });
        }

        // For regular bus schedules, handle temporary changes
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
        const results = [];
        
        for (const bus of originalBuses) {
            // Find matching stops (case insensitive)
            const regex = new RegExp(stopName, 'i');
            const matchingStops = bus.Stops.filter(stop => regex.test(stop));
            
            if (matchingStops.length === 0) continue;
            
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

            // Only create one result per bus, not per matching stop
            const result = {
                originalBusNumber: bus["Bus Code"],
                newBusNumber: finalBusNumber,
                expiresAt: expiresAt ? expiresAt.toISOString() : null,
                message: changes.length > 0
                    ? `Bus: ${finalBusNumber} instead of ${bus["Bus Code"]} for ${expiresAt.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    })}`
                    : `Bus: ${bus["Bus Code"]}`
            };
            
            results.push(result);
        }

        console.log(`✅ Returning ${results.length} buses for stop: "${stopName}"`);
        res.json({ buses: results });
    } catch (error) {
        console.error("❌ Buses fetch error:", error);
        res.status(500).json({ error: "Failed to fetch buses" });
    }
};

module.exports = { getStops, getBuses };