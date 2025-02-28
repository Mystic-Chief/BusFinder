import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Link, useLocation } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import "../components/BusSearch.css";

const BusSearch = () => {
    const [stop, setStop] = useState("");
    const [buses, setBuses] = useState([]);
    const [stopsList, setStopsList] = useState([]);
    const [filteredStops, setFilteredStops] = useState([]);
    const [selectedStop, setSelectedStop] = useState(null);
    const [selectedShift, setSelectedShift] = useState("");
    const [selectedDirection, setSelectedDirection] = useState("");
    const [selectedTime, setSelectedTime] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Automatically determine if today is Saturday
    const today = new Date();
    const isSaturday = today.getDay() === 6; // 0 = Sunday, 6 = Saturday
    //const isSaturday = true

    const location = useLocation();
    const showAdmin = ['/admin', '/temporary-edits'].includes(location.pathname);

    const collectionMap = {
        firstShift: {
            incoming: isSaturday ? "firstshift_incoming_saturday" : "firstshift_incoming",
            outgoing: isSaturday ? "firstshift_outgoing_saturday" : "firstshift_outgoing"
        },
        adminMedical: {
            incoming: isSaturday ? "admin_incoming_saturday" : "admin_incoming",
            outgoing: isSaturday ? "admin_outgoing_saturday" : "admin_outgoing", // Default outgoing for non-Saturday
            outgoing1: "admin_outgoing_1_15_saturday", // Saturday-specific outgoing 1
            outgoing2: "admin_outgoing_4_45_saturday"  // Saturday-specific outgoing 2
        },
        general: {
            incoming: "general_incoming",
            outgoing: "admin_outgoing"
        }
    };

    const contactDetails = {
        KT: [{ name: "Maheshbhai", phone: "8200591172" }, { name: "Shaileshbhai", phone: "9979206491" }],
        PT: [{ name: "Chetanbhai", phone: "9979720733" }]
    };

    // Function to get the correct contact key
    function getContactKey(input) {
        input = input.toUpperCase();
        if (input.startsWith("PU")) {
            return "KT";
        }
        return input;
    }

    // Fetch stops logic
    useEffect(() => {
        const fetchStops = async () => {
            if (!selectedShift || !selectedDirection) return;

            try {
                let collection;
                if (isSaturday && selectedShift === "adminMedical" && selectedDirection === "outgoing") {
                    // Handle Saturday's Admin Outgoing with two options
                    collection = selectedTime === "1:15 PM"
                        ? collectionMap.adminMedical.outgoing1
                        : collectionMap.adminMedical.outgoing2;
                } else {
                    // Handle all other cases
                    collection = collectionMap[selectedShift][selectedDirection];
                }

                const response = await axios.get(`http://localhost:5000/api/bus/stops?collection=${collection}`);
                setStopsList(response.data.stops);
            } catch (error) {
                console.error("❌ Error fetching stops:", error);
                toast.error("Failed to fetch stops. Please try again later.");
            }
        };

        fetchStops();
    }, [selectedShift, selectedDirection, selectedTime, isSaturday]);

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

    const handleStopSelection = (selected) => {
        setStop(selected);
        setSelectedStop(selected);
        setFilteredStops([]);
    };

    const searchBuses = async () => {
        if (!selectedStop || !selectedShift || !selectedDirection) {
            toast.error("Please select all filters and a stop");
            return;
        }

        try {
            let collection;
            if (isSaturday && selectedShift === "adminMedical" && selectedDirection === "outgoing") {
                // Handle Saturday's Admin Outgoing with two options
                collection = selectedTime === "1:15 PM"
                    ? collectionMap.adminMedical.outgoing1
                    : collectionMap.adminMedical.outgoing2;
            } else {
                // Handle all other cases
                collection = collectionMap[selectedShift][selectedDirection];
            }

            const response = await axios.get(`http://localhost:5000/api/bus/buses/${encodeURIComponent(selectedStop)}?collection=${collection}`);
            setBuses(response.data.buses || []);
            setStop("");

            if (response.data.buses && response.data.buses.length === 0) {
                toast.warn("No buses found for this stop.");
            }
        } catch (error) {
            console.error("❌ Error fetching data from backend:", error);
            toast.error("Error fetching data. Check the backend!");
        }
    };

    return (
        <>
            {showAdmin && (
                <div className="btn">
                    <Link to="/login"><button>Admin Login</button></Link>
                </div>
            )}
            <div className="search-container">
                <h2>🚏 Find Buses by Stop Name</h2>
                <h3>{isSaturday ? "Only For Saturday" : "For Monday to Friday"}</h3>

                {/* Custom Dropdown for Shift Selection */}
                <div className="filter-section">
                    <div className="filter-group">
                        <label>Select Shift:</label>
                        <div
                            className="custom-dropdown"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                        >
                            {selectedShift ? selectedShift : "Choose Shift"}
                            <ul className={`dropdown-options ${dropdownOpen ? "show" : ""}`}>
                                {/* Show different shifts based on day */}
                                {isSaturday ? (
                                    <>
                                        <li onClick={() => setSelectedShift("firstShift")}>
                                            First Shift
                                        </li>
                                        <li onClick={() => setSelectedShift("adminMedical")}>
                                            ADM/Medical Shift
                                        </li>
                                    </>
                                ) : (
                                    <>
                                        <li onClick={() => setSelectedShift("firstShift")}>
                                            First Shift
                                        </li>
                                        <li onClick={() => setSelectedShift("adminMedical")}>
                                            ADM/Medical Shift
                                        </li>
                                        <li onClick={() => setSelectedShift("general")}>
                                            General Shift
                                        </li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Direction Selection */}
                    <div className="filter-group">
                        <label>Direction:</label>
                        <div className="radio-group">
                            <label>
                                <input
                                    type="radio"
                                    value="incoming"
                                    checked={selectedDirection === "incoming"}
                                    onChange={() => setSelectedDirection("incoming")}
                                    disabled={!selectedShift}
                                />
                                Incoming
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    value="outgoing"
                                    checked={selectedDirection === "outgoing"}
                                    onChange={() => setSelectedDirection("outgoing")}
                                    disabled={!selectedShift}
                                />
                                Outgoing
                            </label>
                        </div>
                    </div>

                    {/* Show time selection only for Saturday's Admin Outgoing */}
                    {isSaturday && selectedShift === "adminMedical" && selectedDirection === "outgoing" && (
                        <div className="filter-group">
                            <label>Select Time:</label>
                            <div className="radio-group">
                                <label>
                                    <input
                                        type="radio"
                                        value="1:15 PM"
                                        checked={selectedTime === "1:15 PM"}
                                        onChange={() => setSelectedTime("1:15 PM")}
                                    />
                                    1:15 PM
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        value="4:45 PM"
                                        checked={selectedTime === "4:45 PM"}
                                        onChange={() => setSelectedTime("4:45 PM")}
                                    />
                                    4:45 PM
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Search Input */}
                <div className="search-input-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Enter stop name..."
                        value={stop}
                        onChange={handleInputChange}
                        disabled={!selectedShift || !selectedDirection}
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
                    disabled={!selectedStop || !selectedShift || !selectedDirection}
                >
                    Search Buses
                </button>

                {/* Display search results */}
                <div className="search-results">
                    {buses.length > 0 ? (
                        buses.map((bus, index) => {
                            const busType = bus.originalBusNumber.split(" - ")[0];
                            const contactKey = getContactKey(busType);
                            const contacts = contactDetails[contactKey] || [];

                            return (
                                <div key={index} className="result-item">
                                    <h3>🚌 {bus.message}</h3>
                                    {contacts.length > 0 && (
                                        <div className="contact-info">
                                            <h4>📞 Contact:</h4>
                                            <ul>
                                                {contacts.map((contact, idx) => (
                                                    <li key={idx}>
                                                        {contact.name}:{" "}
                                                        <a href={`tel:${contact.phone}`}>{contact.phone}</a>
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
        </>
    );
};

export default BusSearch;