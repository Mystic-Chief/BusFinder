import React from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import BusSearch from "./components/BusSearch";
import AdminUpload from "./components/AdminUpload";
import TemporaryEdits from "./components/TemporaryEdits";
import "./App.css";

function App() {
    return (
        <Router>
            <div className="app-container">
                <h1>🚌 Bus Finder</h1>
                
                {/* Navigation Bar */}
                <nav className="navbar">
                    <Link to="/" className="nav-link">Bus Search</Link>
                    <Link to="/admin" className="nav-link">Admin Upload</Link>
                    <Link to="/temporary-edits" className="nav-link">Temporary Edits</Link>
                </nav>

                <div className="card">
                    <Routes>
                        <Route path="/" element={<BusSearch />} />
                        <Route path="/admin" element={<AdminUpload />} />
                        <Route path="/temporary-edits" element={<TemporaryEdits />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;