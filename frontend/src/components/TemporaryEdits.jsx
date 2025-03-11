import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../components/TemporaryEdits.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TemporaryEdits = ({ userRole }) => {
    const [shift, setShift] = useState('');
    const [direction, setDirection] = useState('');
    const [selectedTime, setSelectedTime] = useState(''); // For Saturday's outgoing times
    const [buses, setBuses] = useState([]);
    const [selectedStops, setSelectedStops] = useState({});
    const [newBusNumbers, setNewBusNumbers] = useState({});
    const [refreshKey, setRefreshKey] = useState(0);
    const [searchType, setSearchType] = useState('busNumber');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // Automatically determine if today is Saturday
    const today = new Date();
    const isSaturday = false // 0 = Sunday, 6 = Saturday

    // Collection mapping with Saturday support
    const collectionMap = {
        firstShift: {
            incoming: isSaturday ? 'firstshift_incoming_saturday' : 'firstshift_incoming',
            outgoing: isSaturday ? 'firstshift_outgoing_saturday' : 'firstshift_outgoing'
        },
        adminMedical: {
            incoming: isSaturday ? 'admin_incoming_saturday' : 'admin_incoming',
            outgoing1: 'admin_outgoing_1_15_saturday',
            outgoing2: 'admin_outgoing_4_45_saturday'
        },
        general: {
            incoming: 'general_incoming',
            outgoing: 'admin_outgoing'
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!shift || !direction) return;

            setLoading(true);

            try {
                let collection;
                if (isSaturday && shift === 'adminMedical' && direction === 'outgoing') {
                    collection = selectedTime === '1:15 PM'
                        ? collectionMap.adminMedical.outgoing1
                        : collectionMap.adminMedical.outgoing2;
                } else {
                    collection = collectionMap[shift][direction];
                }

                const response = await axios.get(`${API_BASE_URL}/api/temp-edit/editable-data?collection=${collection}`);
                let fetchedBuses = response.data.buses;

                // Role-based filtering
                if (userRole && userRole.includes('supervisor')) {
                    const busType = userRole.split('-')[0].toUpperCase(); // "kt" => "KT"

                    fetchedBuses = fetchedBuses.filter(bus => {
                        const busPrefix = bus['Bus Code'].split(' ')[0].toUpperCase();

                        // KT supervisors see both KT and PU buses
                        if (busType === 'KT') {
                            return busPrefix === 'KT' || busPrefix === 'PU';
                        }

                        // Other supervisors see only their type
                        return busPrefix === busType;
                    });
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
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [shift, direction, refreshKey, searchTerm, selectedTime, isSaturday, userRole]);

    // Normalize bus number input
    const normalizeBusNumber = (input) => {
        // Remove all spaces and hyphens, then split into parts
        const cleaned = input.replace(/[\s-]/g, '');
        const match = cleaned.match(/^([a-zA-Z]+)(\d+)$/);

        if (match) {
            const prefix = match[1].toUpperCase();
            const number = match[2];
            return `${prefix} - ${number}`;
        }
        return input; // Return original if pattern doesn't match
    };

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

    const resetBusNumberInput = (busId) => {
        setNewBusNumbers(prev => ({
            ...prev,
            [busId]: '' // Reset the input field for this bus
        }));
    };

    const handleBulkChange = async (busId) => {
        const rawNumber = newBusNumbers[busId]?.trim();
        const newNumber = normalizeBusNumber(rawNumber);
        if (!newNumber) return;

        try {
            let collection;
            if (isSaturday && shift === 'adminMedical' && direction === 'outgoing') {
                collection = selectedTime === '1:15 PM'
                    ? collectionMap.adminMedical.outgoing1
                    : collectionMap.adminMedical.outgoing2;
            } else {
                collection = collectionMap[shift][direction];
            }

            await axios.post(`${API_BASE_URL}/api/temp-edit/temp-edit`, {
                type: 'bulk',
                busId,
                newBusNumber: newNumber,
                collection: collection
            });
            toast.success('Bulk change saved');
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            toast.error('Failed to save bulk change');
        }

        resetBusNumberInput(busId);
    };

    const handlePartialChange = async (busId) => {
        const rawNumber = newBusNumbers[busId]?.trim();
        const newNumber = normalizeBusNumber(rawNumber);
        if (!newNumber || !selectedStops[busId]?.length) return;

        try {
            const bus = buses.find(b => b._id === busId);

            let collection;
            if (isSaturday && shift === 'adminMedical' && direction === 'outgoing') {
                collection = selectedTime === '1:15 PM'
                    ? collectionMap.adminMedical.outgoing1
                    : collectionMap.adminMedical.outgoing2;
            } else {
                collection = collectionMap[shift][direction];
            }

            await axios.post(`${API_BASE_URL}/api/temp-edit/temp-edit`, {
                type: 'partial',
                busId,
                newBusNumber: newNumber,
                stops: bus.Stops.filter((_, i) => selectedStops[busId].includes(i)),
                collection: collection
            });
            toast.success('Partial changes saved');
            setSelectedStops(prev => ({ ...prev, [busId]: [] }));
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            toast.error('Failed to save partial changes');
        }

        resetBusNumberInput(busId);
    };

    // Helper function to check if a stop is added to a bus
    const isAddedToBus = (bus, stop) => {
        // For partial changes - check if this stop was added TO this bus
        const addedViaPartial = bus.partialChanges?.some(pc => 
            // This bus is the DESTINATION (new bus number matches this bus)
            // AND this stop is in the stops array
            pc.newBusNumber === bus['Bus Code'] && 
            pc.stops?.includes(stop)
        ) || false;

        // For bulk changes - check if this stop was added TO this bus
        const addedViaBulk = bus.bulkChanges?.some(bc => 
            // This bus is the DESTINATION (new bus number matches this bus)
            // AND this stop is in the stops array
            bc.newBusNumber === bus['Bus Code'] && 
            bc.stops?.includes(stop)
        ) || false;

        return addedViaPartial || addedViaBulk;
    };

    // Helper function to check if a stop is removed from a bus
    const isRemovedFromBus = (bus, stop) => {
        // For partial changes - check if this stop was removed FROM this bus
        const removedViaPartial = bus.partialChanges?.some(pc => 
            // This bus is the SOURCE (busId matches this bus)
            // AND the destination is different (newBusNumber doesn't match)
            // AND this stop is in the stops array
            pc.busId === bus._id.toString() && 
            pc.newBusNumber !== bus['Bus Code'] && 
            pc.stops?.includes(stop)
        ) || false;

        // For bulk changes - check if this stop was removed FROM this bus
        const removedViaBulk = bus.bulkChanges?.some(bc => 
            // This bus is the SOURCE (busId matches this bus)
            // AND the destination is different (newBusNumber doesn't match)
            // AND this stop is in the stops array (or all stops implied)
            bc.busId === bus._id.toString() && 
            bc.newBusNumber !== bus['Bus Code'] && 
            (Array.isArray(bc.stops) ? bc.stops.includes(stop) : true)
        ) || false;

        return removedViaPartial || removedViaBulk;
    };

    return (
        <div className="temp-edit-container">
            <h2>Temporary Bus Number Changes</h2>
            <h3>{isSaturday ? "Only For Saturday" : "For Monday to Friday"}</h3>

            {/* Shift/Direction Selector */}
            <div className="selector-container">
                <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="shift-select"
                >
                    <option value="">Select Shift</option>
                    {isSaturday ? (
                        <>
                            <option value="firstShift">First Shift</option>
                            <option value="adminMedical">ADM/Medical</option>
                        </>
                    ) : (
                        <>
                            <option value="firstShift">First Shift</option>
                            <option value="adminMedical">ADM/Medical</option>
                            <option value="general">General</option>
                        </>
                    )}
                </select>

                <div className="direction-radio">
                    <label>
                        <input
                            type="radio"
                            value="incoming"
                            checked={direction === 'incoming'}
                            onChange={() => setDirection('incoming')}
                        />
                        <span>Incoming</span>
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="outgoing"
                            checked={direction === 'outgoing'}
                            onChange={() => setDirection('outgoing')}
                        />
                        <span>Outgoing</span>
                    </label>
                </div>

                {/* Show time selection only for Saturday's Admin Outgoing */}
                {isSaturday && shift === 'adminMedical' && direction === 'outgoing' && (
                    <div className="time-radio">
                        <label>
                            <input
                                type="radio"
                                value="1:15 PM"
                                checked={selectedTime === '1:15 PM'}
                                onChange={() => setSelectedTime('1:15 PM')}
                            />
                            <span>1:15 PM</span>
                        </label>
                        <label>
                            <input
                                type="radio"
                                value="4:45 PM"
                                checked={selectedTime === '4:45 PM'}
                                onChange={() => setSelectedTime('4:45 PM')}
                            />
                            <span>4:45 PM</span>
                        </label>
                    </div>
                )}
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

            {/* Loading state */}
            {loading && (
                <div className="loading-message">
                    <div className="loading-spinner"></div>
                    <p>Loading bus data...</p>
                </div>
            )}

            {/* No data message */}
            {!loading && shift && direction && buses.length === 0 && (
                <div className="no-data-message">No buses found for the selected criteria.</div>
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
                .filter(bus => bus.Stops.length > 0) // Filter out buses with no stops
                .map(bus => {
                    // Calculate stats
                    const totalStops = bus.Stops.length;

                    // Calculate added stops
                    const tempStops = bus.Stops.filter(stop => isAddedToBus(bus, stop)).length;

                    // Calculate removed stops
                    const removedStops = bus.Stops.filter(stop => isRemovedFromBus(bus, stop)).length;

                    const selectedCount = selectedStops[bus._id]?.length || 0;

                    // Determine bus card classes based on status
                    const busCardClasses = ['bus-card'];
                    if (bus.isTemporary) busCardClasses.push('temporary');
                    if (tempStops > 0) busCardClasses.push('added');
                    if (removedStops > 0) busCardClasses.push('removed');

                    return (
                        <div key={`${bus['Bus Code']}-${bus._id}`} className={busCardClasses.join(' ')}>
                            <div className="bus-header">
                                <h3>
                                    <span className="bus-icon">🚌</span> {bus['Bus Code']}
                                    <div className="badge-container">
                                        {/* Always show temporary tag if bus has any modifications */}
                                        {(bus.isTemporary || tempStops > 0 || removedStops > 0) && 
                                            <span className="temp-badge">Temporary</span>}
                                        {tempStops > 0 && <span className="added-badge">Added</span>}
                                        {removedStops > 0 && <span className="removed-badge">Removed</span>}
                                    </div>
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
                                        className="bulk-button"
                                    >
                                        Change All
                                    </button>
                                </div>
                            </div>

                            {/* Stats display */}
                            <div className="stops-stats">
                                <span className="stat">
                                    <span className="stat-value">{totalStops}</span>
                                    <span className="stat-label">Total Stops</span>
                                </span>
                                {tempStops > 0 && (
                                    <span className="stat">
                                        <span className="stat-value temp-value">{tempStops}</span>
                                        <span className="stat-label">Added</span>
                                    </span>
                                )}
                                {removedStops > 0 && (
                                    <span className="stat">
                                        <span className="stat-value removed-value">{removedStops}</span>
                                        <span className="stat-label">Removed</span>
                                    </span>
                                )}
                                {selectedCount > 0 && (
                                    <span className="stat">
                                        <span className="stat-value selected-value">{selectedCount}</span>
                                        <span className="stat-label">Selected</span>
                                    </span>
                                )}
                            </div>

                            <div className="stops-list">
                                {bus.Stops.map((stop, index) => {
                                    // Determine if this stop is added to this bus or removed from it
                                    const isAdded = isAddedToBus(bus, stop);
                                    const isRemoved = isRemovedFromBus(bus, stop);
                                    
                                    // Determine stop item classes based on status
                                    const stopItemClasses = ['stop-item'];
                                    if (isAdded) stopItemClasses.push('added-stop');
                                    if (isRemoved) stopItemClasses.push('removed-stop');
                                    if (selectedStops[bus._id]?.includes(index)) stopItemClasses.push('selected-stop');

                                    return (
                                        <div
                                            key={`${bus._id}-${index}`}
                                            className={stopItemClasses.join(' ')}
                                            onClick={() => !isAdded && !isRemoved && handleStopSelect(bus._id, index)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedStops[bus._id]?.includes(index)}
                                                readOnly
                                                disabled={isAdded || isRemoved}
                                            />
                                            <div className="stop-name">
                                                <span>{stop}</span>
                                                {isRemoved && (
                                                    <span className="removed-badge">Removed</span>
                                                )}
                                                {isAdded && (
                                                    <span className="added-badge">Added</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {selectedStops[bus._id]?.length > 0 && (
                                <button
                                    className={`partial-save ${!newBusNumbers[bus._id]?.trim() ? 'needs-input' : ''}`}
                                    onClick={() => handlePartialChange(bus._id)}
                                    disabled={!newBusNumbers[bus._id]?.trim()}
                                >
                                    {newBusNumbers[bus._id]?.trim()
                                        ? `Change ${selectedStops[bus._id].length} selected stops to ${newBusNumbers[bus._id].trim()}`
                                        : `Enter a new bus number for ${selectedStops[bus._id].length} selected stops`}
                                </button>
                            )}
                        </div>
                    );
                })}

            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
};

export default TemporaryEdits;