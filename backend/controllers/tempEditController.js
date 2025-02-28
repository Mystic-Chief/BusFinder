const mongoose = require("mongoose");

const getEditableData = async (req, res) => {
    try {
        const collection = mongoose.connection.db.collection(req.query.collection);
        const tempCollection = mongoose.connection.db.collection("temp_changes");

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
            partialChanges: [],
            bulkChanges: []
        }));

        // Process temporary changes
        Object.entries(tempGroups).forEach(([newBusNumber, changes]) => {
            changes.forEach(change => {
                const originalBus = buses.find(b => b._id.toString() === change.busId);
                if (!originalBus) return;

                // Inside the partial change handling block:
                if (change.type === 'partial') {
                    // Remove stops from original bus
                    originalBus.Stops = originalBus.Stops.filter(s => !change.stops.includes(s));

                    // Add to destination bus
                    let destinationBus = buses.find(b => b['Bus Code'] === newBusNumber);
                    if (!destinationBus) {
                        destinationBus = {
                            _id: `temp_${newBusNumber}_${Date.now()}`,
                            'Bus Code': newBusNumber,
                            Stops: [],
                            isTemporary: true,
                            partialChanges: [], // Initialize partialChanges for destination
                            bulkChanges: []
                        };
                        buses.push(destinationBus);
                    }

                    // Add the PARTIAL CHANGE to the DESTINATION BUS
                    destinationBus.partialChanges.push({
                        ...change,
                        stops: change.stops // Track the stops added to this bus
                    });

                    destinationBus.Stops.push(...change.stops);
                    destinationBus.isTemporary = true;
                } else if (change.type === 'bulk') {
                    // Handle bulk changes
                    const movedStops = [...originalBus.Stops];
                    originalBus.Stops = [];

                    // Add to destination bus
                    let destinationBus = buses.find(b => b['Bus Code'] === newBusNumber);
                    if (!destinationBus) {
                        destinationBus = {
                            _id: `temp_${newBusNumber}_${Date.now()}`, // Unique ID for temporary bus
                            'Bus Code': newBusNumber,
                            Stops: [],
                            isTemporary: true,
                            partialChanges: [],
                            bulkChanges: []
                        };
                        buses.push(destinationBus);
                    }
                    destinationBus.Stops.push(...movedStops);
                    destinationBus.isTemporary = true;
                    destinationBus.bulkChanges.push({
                        ...change,
                        stops: movedStops
                    });
                }
            });
        });

        res.json({ buses });
    } catch (error) {
        console.error("Error fetching editable data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const saveTempEdit = async (req, res) => {
    try {
        const { busId, newBusNumber, type, stops } = req.body;
        const tempCollection = mongoose.connection.db.collection('temp_changes');

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
                    expiresAt: new Date(Date.now() + 300000),
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
};

const allBusNumbers = async (req, res) => {
    try {
        const collections = [
            'firstshift_incoming', 'firstshift_outgoing',
            'admin_incoming', 'admin_outgoing',
            'general_incoming'
        ];

        const allNumbers = new Set();
        
        for (const collection of collections) {
            const buses = await mongoose.connection.db.collection(collection)
                .find({}, { projection: { 'Bus Code': 1 } })
                .toArray();
            
            buses.forEach(bus => allNumbers.add(bus['Bus Code']));
        }

        res.json(Array.from(allNumbers));
    } catch (error) {
        console.error("Error fetching bus numbers:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { getEditableData, saveTempEdit , allBusNumbers};