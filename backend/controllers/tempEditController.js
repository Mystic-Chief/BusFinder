const mongoose = require("mongoose");

const getEditableData = async (req, res) => {
    try {
        const collection = mongoose.connection.db.collection(req.query.collection);
        const tempCollection = mongoose.connection.db.collection("temp_changes");

        // Fetch original buses and active temporary changes
        const [originalBuses, tempChanges] = await Promise.all([
            collection.find().toArray(),
            tempCollection.find({
                originalCollection: req.query.collection,
                expiresAt: { $gt: new Date() }
            }).toArray()
        ]);

        // Create a map of original buses for quick lookup
        const busesMap = new Map(originalBuses.map(bus => [bus._id.toString(), bus]));

        // Process temporary changes
        const processedBuses = new Map(); // Track processed buses
        const tempBuses = []; // Temporary buses created by changes

        tempChanges.forEach(change => {
            const originalBus = busesMap.get(change.busId);
            if (!originalBus) return;

            // Initialize change tracking if not already present
            if (!originalBus.partialChanges) originalBus.partialChanges = [];
            if (!originalBus.bulkChanges) originalBus.bulkChanges = [];

            if (change.type === 'partial') {
                // Add the change to the original bus's partialChanges
                // IMPORTANT: No longer removing stops from original bus
                originalBus.partialChanges.push(change);

                // Create or update the destination bus
                let destinationBus = processedBuses.get(change.newBusNumber);
                if (!destinationBus) {
                    destinationBus = {
                        _id: `temp_${change.newBusNumber}_${Date.now()}`, // Unique ID for temporary bus
                        'Bus Code': change.newBusNumber,
                        Stops: [],
                        isTemporary: true,
                        partialChanges: [],
                        bulkChanges: []
                    };
                    processedBuses.set(change.newBusNumber, destinationBus);
                    tempBuses.push(destinationBus);
                }

                // Add the stops to the destination bus
                destinationBus.Stops.push(...change.stops);
                destinationBus.partialChanges.push(change);
            } else if (change.type === 'bulk') {
                // Instead of removing stops, mark the change for display purposes
                // IMPORTANT: No longer emptying original bus's stops
                change.stops = [...originalBus.Stops]; // Store all stops in the change
                
                // Add the change to the original bus's bulkChanges
                originalBus.bulkChanges.push(change);

                // Create or update the destination bus
                let destinationBus = processedBuses.get(change.newBusNumber);
                if (!destinationBus) {
                    destinationBus = {
                        _id: `temp_${change.newBusNumber}_${Date.now()}`, // Unique ID for temporary bus
                        'Bus Code': change.newBusNumber,
                        Stops: [],
                        isTemporary: true,
                        partialChanges: [],
                        bulkChanges: []
                    };
                    processedBuses.set(change.newBusNumber, destinationBus);
                    tempBuses.push(destinationBus);
                }

                // Add the stops to the destination bus
                destinationBus.Stops.push(...originalBus.Stops);
                destinationBus.bulkChanges.push(change);
            }
        });

        // Combine original and temporary buses
        const buses = [...originalBuses, ...tempBuses];

        res.json({ buses });
    } catch (error) {
        console.error("❌ Error fetching editable data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const saveTempEdit = async (req, res) => {
    try {
        const { busId, newBusNumber, type, stops, collection } = req.body;
        const tempCollection = mongoose.connection.db.collection('temp_changes');

        // Create a unique ID for the change
        const changeId = type === 'partial' ?
            `${busId}-${Date.now()}` : // Unique ID for partial changes
            busId; // Bulk changes use the bus ID

        // Save the temporary change
        await tempCollection.updateOne(
            { _id: changeId },
            {
                $set: {
                    busId,
                    newBusNumber,
                    type,
                    stops,
                    expiresAt: new Date(Date.now() + 300000), // 5 minutes from now
                    originalCollection: collection
                }
            },
            { upsert: true }
        );

        console.log(`✅ Saved temporary change for bus: ${busId}, type: ${type}`);
        res.json({ success: true });
    } catch (error) {
        console.error("❌ Error saving temporary edit:", error);
        res.status(500).json({ error: 'Failed to save temporary edit' });
    }
};

module.exports = { getEditableData, saveTempEdit };