import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../components/TemporaryEdits.css';

const TemporaryEdits = () => {
    const [shift, setShift] = useState('');
    const [direction, setDirection] = useState('');
    const [buses, setBuses] = useState([]);
    const [selectedStops, setSelectedStops] = useState({});
    const [newBusNumbers, setNewBusNumbers] = useState({}); // Initialize as empty object

    const collectionMap = {
        firstShift: { incoming: 'firstshift', outgoing: 'firstshift' },
        adminMedical: { incoming: 'admin_incoming', outgoing: 'admin_outgoing' },
        general: { incoming: 'general_incoming', outgoing: 'admin_outgoing' }
    };

    // Fetch buses and stops when shift/direction changes
    useEffect(() => {
        const fetchData = async () => {
            if (!shift || !direction) return;

            try {
                const collection = collectionMap[shift][direction];
                const response = await axios.get(`http://localhost:5000/editable-data?collection=${collection}`);
                setBuses(response.data.buses);
            } catch (error) {
                toast.error('Failed to load bus data');
            }
        };

        fetchData();
    }, [shift, direction]);

    // Handle stop selection
    const handleStopSelect = (busId, stopIndex) => {
        setSelectedStops(prev => ({
            ...prev,
            [busId]: prev[busId]?.includes(stopIndex)
                ? prev[busId].filter(i => i !== stopIndex)
                : [...(prev[busId] || []), stopIndex]
        }));
    };

    // Handle bus number input change
    const handleBusNumberChange = (busId, value) => {
        setNewBusNumbers(prev => ({
            ...prev,
            [busId]: value || '' // Ensure value is never undefined
        }));
    };

    // Handle bulk change for entire bus
    const handleBulkChange = async (busId) => {
        const newNumber = newBusNumbers[busId];
        if (!newNumber) {
            toast.error('Please enter a new bus number');
            return;
        }

        try {
            await axios.post('http://localhost:5000/temp-edit', {
                type: 'bulk',
                busId,
                newBusNumber: newNumber,
                collection: collectionMap[shift][direction]
            });
            toast.success('Bulk change saved temporarily');
        } catch (error) {
            toast.error('Failed to save bulk change');
        }
    };

    // Handle partial changes for selected stops
    const handlePartialChange = async (busId) => {
        const newNumber = newBusNumbers[busId];
        if (!newNumber || !selectedStops[busId]?.length) {
            toast.error('Please select stops and enter a new bus number');
            return;
        }

        try {
            const bus = buses.find(b => b._id === busId);
            await axios.post('http://localhost:5000/temp-edit', {
                type: 'partial',
                busId,
                newBusNumber: newNumber,
                stops: bus.Stops.filter((_, i) => selectedStops[busId].includes(i)),
                collection: collectionMap[shift][direction]
            });
            toast.success('Partial changes saved temporarily');
            setSelectedStops(prev => ({ ...prev, [busId]: [] })); // Clear selection
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
                    <option value="adminMedical">ADM/Medical Shift</option>
                    <option value="general">General Shift</option>
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

            {/* Bus List */}
            {buses.map(bus => (
                <div key={bus._id} className="bus-card">
                    <div className="bus-header">
                        <h3>Original Bus: {bus['Bus Code']}</h3>
                        <div className="bus-actions">
                            <input
                                type="text"
                                placeholder="New Bus #"
                                value={newBusNumbers[bus._id] || ''} // Fallback to empty string
                                onChange={(e) => handleBusNumberChange(bus._id, e.target.value)}
                            />
                            <button onClick={() => handleBulkChange(bus._id)}>
                                Change All
                            </button>
                        </div>
                    </div>

                    {/* Stops List */}
                    <div className="stops-list">
                        {bus.Stops.map((stop, index) => (
                            <div
                                key={index}
                                className="stop-item"
                                onClick={() => handleStopSelect(bus._id, index)}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedStops[bus._id]?.includes(index)}
                                    readOnly
                                />
                                <span>{stop}</span>
                            </div>
                        ))}
                    </div>

                    {/* Partial Save Button */}
                    {selectedStops[bus._id]?.length > 0 && (
                        <button
                            className="partial-save"
                            onClick={() => handlePartialChange(bus._id)}
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