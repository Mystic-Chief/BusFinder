import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../components/BusSearch.css";

const BusSearch = () => {
    const [stop, setStop] = useState("");
    const [buses, setBuses] = useState([]);
    const [stopsList, setStopsList] = useState([]);
    const [filteredStops, setFilteredStops] = useState([]);
    const [selectedStop, setSelectedStop] = useState(null);

    // Contact details for different bus types
    const contactDetails = {
        KT: [
            { name: "Maheshbhai", phone: "8200591172" },
            { name: "Shaileshbhai", phone: "9979206491" }
        ],
        PT: [
            { name: "Chetanbhai", phone: "9979720733" }
        ]
    };

    // Fetch all stops from the backend on component mount
    useEffect(() => {
        const fetchStops = async () => {
            try {
                const response = await axios.get("http://localhost:5000/stops");
                setStopsList(response.data.stops);
            } catch (error) {
                console.error("❌ Error fetching stops:", error);
                toast.error("Failed to fetch stops. Please try again later.");
            }
        };

        fetchStops();
    }, []);

    // Handle input change and show matching stops
    const handleInputChange = (e) => {
        const value = e.target.value.toLowerCase();
        setStop(value);
        setSelectedStop(null);

        if (value.length > 1) {
            const filtered = stopsList.filter((stop) =>
                stop.toLowerCase().includes(value)
            );
            setFilteredStops(filtered);
        } else {
            setFilteredStops([]);
        }
    };

    // Handle selection of a stop
    const handleStopSelection = (selected) => {
        setStop(selected);
        setSelectedStop(selected);
        setFilteredStops([]);
    };

    // Search for buses only if a stop is selected
    const searchBuses = async () => {
        if (!selectedStop) {
            toast.error("Please select a stop from the suggestions.");
            return;
        }

        try {
            console.log(`🔍 Sending request to backend: /buses/${selectedStop}`);
            const response = await axios.get(
                `http://localhost:5000/buses/${encodeURIComponent(selectedStop)}`
            );

            console.log("✅ Response from backend:", response.data);
            setBuses(response.data.buses || []);

            if (response.data.buses && response.data.buses.length === 0) {
                toast.warn("No buses found for this stop.");
            }

            setSelectedStop(null);
        } catch (error) {
            console.error("❌ Error fetching data from backend:", error);
            toast.error("Error fetching data. Check the backend!");
        }
    };

    return (
        <div className="search-container">
            <h2>🚏 Find Buses by Stop Name</h2>
            <div className="search-input-container">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Enter stop name..."
                    value={stop}
                    onChange={handleInputChange}
                    autoComplete="off"
                />
                {filteredStops.length > 0 && (
                    <ul className="autocomplete-dropdown">
                        {filteredStops.map((suggestion, index) => (
                            <li
                                key={index}
                                onClick={() => handleStopSelection(suggestion)}
                                className="suggestion-item"
                            >
                                {suggestion}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <button
                className="search-button"
                onClick={searchBuses}
                disabled={!selectedStop}
            >
                Search Buses
            </button>

            {/* Display search results */}
            <div className="search-results">
                {buses.length > 0 ? (
                    buses.map((bus, index) => {
                        // Extract bus type (e.g., PT or KT)
                        const busType = bus.split(" - ")[0]; // Extracts 'PT' or 'KT'
                        const contacts = contactDetails[busType] || [];

                        return (
                            <div key={index} className="result-item">
                                <h3>🚌 Bus: {bus}</h3>
                                {contacts.length > 0 && (
                                    <div className="contact-info">
                                        <h4>📞 Contact:</h4>
                                        <ul>
                                            {contacts.map((contact, idx) => (
                                                <li key={idx}>
                                                    {contact.name}: <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <p className="no-results">No buses found for this stop.</p>
                )}
            </div>

            <ToastContainer />
        </div>
    );
};

export default BusSearch;
