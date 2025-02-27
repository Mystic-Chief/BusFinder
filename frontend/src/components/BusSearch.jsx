import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Link } from "react-router-dom";
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
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const collectionMap = {
    firstShift: {
      incoming: "firstshift_incoming",
      outgoing: "firstshift_outgoing",
    },
    adminMedical: { incoming: "admin_incoming", outgoing: "admin_outgoing" },
    general: { incoming: "general_incoming", outgoing: "admin_outgoing" },
  };

  const contactDetails = {
    KT: [
      { name: "Maheshbhai", phone: "8200591172" },
      { name: "Shaileshbhai", phone: "9979206491" },
    ],
    PT: [{ name: "Chetanbhai", phone: "9979720733" }],
  };

  // Function to get the correct contact key
  function getContactKey(input) {
    input = input.toUpperCase();
    if (input.startsWith("PU")) {
      return "KT";
    }
    return input;
  }

  useEffect(() => {
    const fetchStops = async () => {
      if (!selectedShift || !selectedDirection) return;
      try {
        const collection = collectionMap[selectedShift][selectedDirection];
        const response = await axios.get(
          `http://localhost:5000/api/bus/stops?collection=${collection}`
        );
        setStopsList(response.data.stops);
      } catch (error) {
        console.error("❌ Error fetching stops:", error);
        toast.error("Failed to fetch stops. Please try again later.");
      }
    };
    fetchStops();
  }, [selectedShift, selectedDirection]);

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
      const collection = collectionMap[selectedShift][selectedDirection];
      const response = await axios.get(
        `http://localhost:5000/api/bus/buses/${encodeURIComponent(
          selectedStop
        )}?collection=${collection}`
      );
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
     <div className="btn">
        <Link to="/login"><button>Admin Login</button></Link>
     </div>
      <div className="search-container">
        <h2>🚏 Find Buses by Stop Name</h2>

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
                <li
                  onClick={() => {
                    setSelectedShift("firstShift");
                    setDropdownOpen(false);
                  }}
                >
                  First Shift
                </li>
                <li
                  onClick={() => {
                    setSelectedShift("adminMedical");
                    setDropdownOpen(false);
                  }}
                >
                  ADM/Medical Shift
                </li>
                <li
                  onClick={() => {
                    setSelectedShift("general");
                    setDropdownOpen(false);
                  }}
                >
                  General Shift
                </li>
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
              // Extract bus type from the original bus number
              const busType = bus.originalBusNumber.split(" - ")[0];
              const contactKey = getContactKey(busType); // Use getContactKey to handle "PU" case
              const contacts = contactDetails[contactKey] || [];

              return (
                <div key={index} className="result-item">
                  {/* Display the formatted message */}
                  <h3>🚌 {bus.message}</h3>

                  {/* Display contact information if available */}
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
