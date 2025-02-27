import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../components/TemporaryEdits.css';

const TemporaryEdits = ({ userRole }) => {
    const [shift, setShift] = useState('');
    const [direction, setDirection] = useState('');
    const [buses, setBuses] = useState([]);
    const [selectedStops, setSelectedStops] = useState({});
    const [newBusNumbers, setNewBusNumbers] = useState({});
    const [refreshKey, setRefreshKey] = useState(0);
    const [searchType, setSearchType] = useState('busNumber');
    const [searchTerm, setSearchTerm] = useState('');

    const collectionMap = {
        firstShift: { incoming: 'firstshift', outgoing: 'firstshift' },
        adminMedical: { incoming: 'admin_incoming', outgoing: 'admin_outgoing' },
        general: { incoming: 'general_incoming', outgoing: 'admin_outgoing' }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!shift || !direction) return;

            try {
                const collection = collectionMap[shift][direction];
                const response = await axios.get(`http://localhost:5000/editable-data?collection=${collection}`);
                let fetchedBuses = response.data.buses;

                // Role-based filtering
                if (userRole.includes('supervisor')) {
                    const busType = userRole.split('-')[0].toUpperCase();
                    fetchedBuses = fetchedBuses.filter(bus =>
                        bus['Bus Code'].startsWith(busType)
                    );
                }

                // Search filtering
                if (searchTerm) {
                    const lowerSearch = searchTerm.toLowerCase();
                    fetchedBuses = fetchedBuses.filter(bus => {
                        if (searchType === 'busNumber') {
                            return bus['Bus Code'].toLowerCase().includes(lowerSearch);
                        }
                        return bus.Stops.some(stop => stop.toLowerCase().includes(lowerSearch));
                    });
                }

                setBuses(fetchedBuses);
            } catch (error) {
                toast.error('Failed to load bus data');
            }
        };

        fetchData();
    }, [shift, direction, refreshKey, searchTerm]);

    const handleStopSelect = (busId, stopIndex) => {
        setSelectedStops(prev => ({
            ...prev,
            [busId]: prev[busId]?.includes(stopIndex)
                ? prev[busId].filter(i => i !== stopIndex)
                : [...(prev[busId] || []), stopIndex]
        }));
    };

    const handleBusNumberChange = (busId, value) => {
        setNewBusNumbers(prev => ({
            ...prev,
            [busId]: value || ''
        }));
    };

    const handleBulkChange = async (busId) => {
        const newNumber = newBusNumbers[busId]?.trim();
        if (!newNumber) return;

        try {
            await axios.post('http://localhost:5000/temp-edit', {
                type: 'bulk',
                busId,
                newBusNumber: newNumber,
                collection: collectionMap[shift][direction]
            });
            toast.success('Bulk change saved');
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            toast.error('Failed to save bulk change');
        }
    };

    const handlePartialChange = async (busId) => {
        const newNumber = newBusNumbers[busId]?.trim();
        if (!newNumber || !selectedStops[busId]?.length) return;

        try {
            const bus = buses.find(b => b._id === busId);

            await axios.post('http://localhost:5000/temp-edit', {
                type: 'partial',
                busId,
                newBusNumber: newNumber,
                stops: bus.Stops.filter((_, i) => selectedStops[busId].includes(i)),
                collection: collectionMap[shift][direction]
            });
            toast.success('Partial changes saved');
            setSelectedStops(prev => ({ ...prev, [busId]: [] }));
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            toast.error('Failed to save partial changes');
        }
    };

    return (
        <div className="temp-edit-container">
            <h2>Temporary Bus Number Changes</h2>

            {/* Shift/Direction Selector */}
            <div className="selector-container">
                <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="shift-select"
                >
                    <option value="">Select Shift</option>
                    <option value="firstShift">First Shift</option>
                    <option value="adminMedical">ADM/Medical</option>
                    <option value="general">General</option>
                </select>

                <div className="direction-radio">
                    <label>
                        <input
                            type="radio"
                            value="incoming"
                            checked={direction === 'incoming'}
                            onChange={() => setDirection('incoming')}
                        />
                        Incoming
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="outgoing"
                            checked={direction === 'outgoing'}
                            onChange={() => setDirection('outgoing')}
                        />
                        Outgoing
                    </label>
                </div>
            </div>

            {/* Conditional Search Controls */}
            {shift && direction && (
                <div className="search-controls">
                    <select
                        value={searchType}
                        onChange={(e) => setSearchType(e.target.value)}
                        className="search-select"
                    >
                        <option value="busNumber">Search by Bus Number</option>
                        <option value="busStop">Search by Bus Stop</option>
                    </select>

                    <input
                        type="text"
                        placeholder={`Search ${searchType === 'busNumber' ? 'bus numbers' : 'stops'}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            )}

            {/* Bus List */}
            {buses
                .reduce((merged, bus) => {
                    const existing = merged.find(b => b['Bus Code'] === bus['Bus Code']);
                    if (existing) {
                        // Merge stops and preserve temporary status
                        existing.Stops = [...new Set([...existing.Stops, ...bus.Stops])];
                        existing.isTemporary = existing.isTemporary || bus.isTemporary;
                        existing.partialChanges = [...(existing.partialChanges || []), ...(bus.partialChanges || [])];
                        existing.bulkChanges = [...(existing.bulkChanges || []), ...(bus.bulkChanges || [])];
                    } else {
                        merged.push(bus);
                    }
                    return merged;
                }, [])
                .map(bus => (
                    <div key={bus['Bus Code']} className={`bus-card ${bus.isTemporary ? 'temporary' : ''}`}>
                        <div className="bus-header">
                            <h3>
                                {bus['Bus Code']}
                                {bus.isTemporary && ' (Temporary Changes)'}
                            </h3>
                            <div className="bus-actions">
                                <input
                                    type="text"
                                    placeholder="New Bus #"
                                    value={newBusNumbers[bus._id] || ''}
                                    onChange={(e) => handleBusNumberChange(bus._id, e.target.value)}
                                />
                                <button
                                    onClick={() => handleBulkChange(bus._id)}
                                    disabled={selectedStops[bus._id]?.length > 0 || !newBusNumbers[bus._id]?.trim()}
                                >
                                    Change All
                                </button>
                            </div>
                        </div>
                        <div className="stops-list">
                            {bus.Stops.map((stop, index) => {
                                // Check if the stop is part of a partial change
                                const isTempStop = bus.partialChanges?.some(pc =>
                                    pc.stops.includes(stop)
                                );

                                // Check if the stop is part of a bulk change
                                const isBulkChange = bus.bulkChanges?.length > 0;

                                return (
                                    <div
                                        key={`${bus._id}-${index}`}
                                        className={`stop-item ${isTempStop || isBulkChange ? 'temp-stop' : ''}`}
                                        onClick={() => !isTempStop && !isBulkChange && handleStopSelect(bus._id, index)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedStops[bus._id]?.includes(index)}
                                            readOnly
                                            disabled={isTempStop || isBulkChange}
                                        />
                                        <span>{stop}</span>
                                        {(isTempStop || isBulkChange) && (
                                            <span className="temp-badge">Temporary</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {selectedStops[bus._id]?.length > 0 && (
                            <button
                                className="partial-save"
                                onClick={() => handlePartialChange(bus._id)}
                                disabled={!newBusNumbers[bus._id]?.trim()}
                            >
                                Save for {selectedStops[bus._id].length} selected stops
                            </button>
                        )}
                    </div>
                ))}

            <ToastContainer />
        </div>
    );
};

export default TemporaryEdits;