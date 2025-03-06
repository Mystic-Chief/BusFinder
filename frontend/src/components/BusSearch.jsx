import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Link, useLocation } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import "../components/BusSearch.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
    const [examSchedules, setExamSchedules] = useState([]);
    const [selectedExam, setSelectedExam] = useState(null);
    const [examAvailable, setExamAvailable] = useState(false);

    // Automatically determine if today is Saturday
    const today = new Date();
    const isSaturday = today.getDay() === 6; // 0 = Sunday, 6 = Saturday

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
        },
        exam: {
            incoming: "exam_schedules",
            outgoing: "exam_schedules"
        }
    };

    const contactDetails = {
        KT: [{ name: "Maheshbhai", phone: "8200591172" }, { name: "Shaileshbhai", phone: "9979206491" }],
        PT: [{ name: "Chetanbhai", phone: "9979720733" }]
    };

    // Helper function to check if an exam is available for searching
    const isExamAvailable = (exam) => {
        if (!exam) return false;

        const now = new Date();
        const startDate = new Date(exam.startDate);
        const endDate = new Date(exam.endDate);

        // Exam schedule is available from one day before the start date
        const availableFrom = new Date(startDate);
        availableFrom.setDate(startDate.getDate() - 1);

        return now >= availableFrom && now <= endDate;
    };

    // Fetch all exam schedules, not just active ones
    useEffect(() => {
        const fetchExamSchedules = async () => {
            try {
                // Using the new endpoint to get all exams
                const response = await axios.get(`${API_BASE_URL}/api/exam/all`);
                setExamSchedules(response.data);
            } catch (error) {
                console.error("❌ Error fetching exam schedules:", error);
                toast.error("Failed to fetch exam schedules.");
            }
        };

        fetchExamSchedules();
    }, []);

    // Check if the selected exam schedule is available - date check for availability
    useEffect(() => {
        if (selectedExam) {
            setExamAvailable(isExamAvailable(selectedExam));
        }
    }, [selectedExam]);

    // Fetch stops logic
    useEffect(() => {
        const fetchStops = async () => {
            if (!selectedShift || !selectedDirection) return;

            try {
                let collection;

                // Use simple logic - if shift is "exam", use exam collection
                if (selectedShift === "exam") {
                    collection = collectionMap.exam[selectedDirection];
                } else if (isSaturday && selectedShift === "adminMedical" && selectedDirection === "outgoing") {
                    // Handle Saturday's Admin Outgoing with two options
                    collection = selectedTime === "1:15 PM"
                        ? collectionMap.adminMedical.outgoing1
                        : collectionMap.adminMedical.outgoing2;
                } else {
                    // Handle all other cases
                    collection = collectionMap[selectedShift][selectedDirection];
                }

                const response = await axios.get(`${API_BASE_URL}/api/bus/stops?collection=${collection}`);
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

    // Handle selection of a regular shift
    const handleRegularShiftSelection = (shift) => {
        setSelectedShift(shift);
        setSelectedExam(null);
        setDropdownOpen(false);
    };

    // Handle selection of an exam
    const handleExamSelection = (exam) => {
        setSelectedExam(exam);
        setSelectedShift("exam"); // Keep using "exam" as the shift value for backend compatibility
        setDropdownOpen(false);
    };

    const searchBuses = async () => {
        if (!selectedStop || !selectedShift || !selectedDirection) {
            toast.error("Please select all filters and a stop");
            return;
        }

        // If exam is selected but not available, show a warning
        if (selectedShift === "exam" && !examAvailable) {
            toast.warn("Selected exam schedule is not yet available");
            return;
        }

        try {
            let collection;
            if (selectedShift === "exam") {
                collection = collectionMap.exam[selectedDirection];
            } else if (isSaturday && selectedShift === "adminMedical" && selectedDirection === "outgoing") {
                // Handle Saturday's Admin Outgoing with two options
                collection = selectedTime === "1:15 PM"
                    ? collectionMap.adminMedical.outgoing1
                    : collectionMap.adminMedical.outgoing2;
            } else {
                // Handle all other cases
                collection = collectionMap[selectedShift][selectedDirection];
            }

            const response = await axios.get(`${API_BASE_URL}/api/bus/buses/${encodeURIComponent(selectedStop)}?collection=${collection}`);
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

    // Helper function to get the display name for the selected shift
    const getShiftDisplayName = () => {
        if (!selectedShift) return "Choose Shift";

        if (selectedShift === "exam" && selectedExam) {
            return `Exam: ${selectedExam.examTitle}`;
        }

        const shiftNames = {
            firstShift: "First Shift",
            adminMedical: "ADM/Medical Shift",
            general: "General Shift"
        };

        return shiftNames[selectedShift] || selectedShift;
    };

    // Helper function to determine contact key
    const getContactKey = (busType) => {
        if (busType && busType.includes("KT")) return "KT";
        if (busType && busType.includes("PT")) return "PT";
        return null;
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

                {/* Filters Section */}
                <div className="filter-section">
                    {/* Integrated Dropdown for Shift Selection */}
                    <div className="filter-group">
                        <label>Select Shift:</label>
                        <div
                            className="custom-dropdown"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                        >
                            {getShiftDisplayName()}
                            <ul className={`dropdown-options ${dropdownOpen ? "show" : ""}`}>
                                {/* Standard shifts */}
                                {isSaturday ? (
                                    <>
                                        <li onClick={() => handleRegularShiftSelection("firstShift")}>
                                            First Shift
                                        </li>
                                        <li onClick={() => handleRegularShiftSelection("adminMedical")}>
                                            ADM/Medical Shift
                                        </li>
                                    </>
                                ) : (
                                    <>
                                        <li onClick={() => handleRegularShiftSelection("firstShift")}>
                                            First Shift
                                        </li>
                                        <li onClick={() => handleRegularShiftSelection("adminMedical")}>
                                            ADM/Medical Shift
                                        </li>
                                        <li onClick={() => handleRegularShiftSelection("general")}>
                                            General Shift
                                        </li>
                                    </>
                                )}

                                {/* Exam options integrated directly into the dropdown */}
                                {examSchedules.length > 0 && (
                                    <>
                                        <li className="dropdown-divider">Exam Schedules</li>
                                        {examSchedules.map((exam) => {
                                            const examIsAvailable = isExamAvailable(exam);
                                            return (
                                                <li
                                                    key={exam._id}
                                                    onClick={() => handleExamSelection(exam)}
                                                    className={`exam-option ${examIsAvailable ? 'available-exam' : 'upcoming-exam'}`}
                                                >
                                                    {exam.examTitle}
                                                    {!examIsAvailable && <span className="availability-indicator"> (Upcoming)</span>}
                                                </li>
                                            );
                                        })}
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Show exam availability warning if exam is selected but not available */}
                    {selectedExam && !examAvailable && (
                        <div className="exam-not-available">
                            <p>
                                <i className="fas fa-info-circle"></i> Exam schedule will be available for searching from{" "}
                                <strong>{selectedExam.availableFromFormatted}</strong>.
                                The bus search will be disabled until then.
                            </p>
                        </div>
                    )}

                    {/* Direction Selection - Only show if no unavailable exam is selected */}
                    {(!selectedExam || examAvailable) && (
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
                    )}

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
                        disabled={!selectedShift || !selectedDirection || (selectedExam && !examAvailable)}
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
                    disabled={!selectedStop || !selectedShift || !selectedDirection || (selectedExam && !examAvailable)}
                >
                    Search Buses
                </button>

                {/* Display search results */}
                <div className="search-results">
                    {buses.length > 0 ? (
                        buses.map((bus, index) => {
                            const busType = bus.originalBusNumber?.split(" - ")[0] || "";
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