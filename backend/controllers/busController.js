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
        
        let pipeline = [];
        
        // For exam schedules, apply more specific filters
        if (collectionName === "exam_schedules") {
            let match = {};
            
            // Filter by examId if provided
            if (req.query.examId) {
                match._id = mongoose.Types.ObjectId(req.query.examId);
            }
            
            // Filter by examTitle if provided
            if (req.query.examTitle) {
                match.examTitle = req.query.examTitle;
            }
            
            // Filter by direction if provided
            if (req.query.direction) {
                match.direction = req.query.direction;
            }
            
            // Only add match stage if there are filters
            if (Object.keys(match).length > 0) {
                pipeline.push({ $match: match });
            }
        }
        
        // Add the standard pipeline steps with a composite key for uniqueness
        if (collectionName === "exam_schedules") {
            pipeline = pipeline.concat([
                { $unwind: "$Stops" },
                // Create a composite key for grouping to ensure uniqueness
                { 
                    $group: { 
                        _id: {
                            stop: "$Stops",
                            direction: "$direction",
                            examTitle: "$examTitle"
                        }
                    } 
                },
                // Sort by stop name
                { $sort: { "_id.stop": 1 } },
                // Project back to just the stop name for backward compatibility
                { $project: { _id: "$_id.stop" } }
            ]);
        } else {
            // For regular collections, use standard pipeline
            pipeline = pipeline.concat([
                { $unwind: "$Stops" },
                { $group: { _id: "$Stops" } },
                { $sort: { _id: 1 } }
            ]);
        }
        
        const stops = await collection.aggregate(pipeline).toArray();

        console.log(`🔍 Fetched ${stops.length} unique stops from collection: ${collectionName}`);
        
        // For ALL collections, return just the stop names to maintain backward compatibility
        res.json({ stops: stops.map(s => s._id) });
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
        const stopName = req.params.stopName; // Changed from req.params.stop
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
            // For exam schedules, use exact match
            query = { 
                Stops: stopName // Changed from "Stop" to "Stops" for consistency
            };
            
            // If exam title is provided, add it to the query
            if (req.query.examTitle) {
                query.examTitle = req.query.examTitle;
            }
            
            // If direction is provided in the request, filter by direction too
            if (req.query.direction) {
                query.direction = req.query.direction;
            }
        } else {
            // For regular bus schedules, use exact match
            query = { 
                Stops: stopName
            };
        }

        // Fetch original buses with this stop
        const originalBuses = await collection.find(query).toArray();
        console.log(`🔍 Found ${originalBuses.length} original buses for stop: "${stopName}"`);

        // Skip temporary changes handling for exam schedules
        if (collectionName === "exam_schedules") {
            // Simplified: No need for regex filtering since we're using exact match in query
            const results = originalBuses.map(bus => ({
                message: `Bus: ${bus["Bus Code"]}`,
                originalBusNumber: bus["Bus Code"],
                direction: bus.direction
            }));
            
            console.log(`✅ Returning ${results.length} exam buses for stop: "${stopName}"`);
            return res.json({ buses: results });
        }

        // For regular bus schedules, handle temporary changes with exact stop matching
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
                    stops: stopName, // Exact match
                    originalCollection: collectionName,
                    expiresAt: { $gt: new Date() }
                }
            ]
        }).toArray();

        console.log(`🔍 Found ${activeChanges.length} active temporary changes for stop: "${stopName}"`);

        // Simplified: No need for regex filtering since we're using exact match in query
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

            return {
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
        });

        console.log(`✅ Returning ${results.length} buses for stop: "${stopName}"`);
        res.json({ buses: results });
    } catch (error) {
        console.error("❌ Buses fetch error:", error);
        res.status(500).json({ error: "Failed to fetch buses" });
    }
};

module.exports = { getStops, getBuses };