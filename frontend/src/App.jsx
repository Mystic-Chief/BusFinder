import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import BusSearch from "./components/BusSearch";
import AdminUpload from "./components/AdminUpload";
import Login from "./components/Login";

function App() {
    return (
        <Router>
            <div className="app-container">
                <h1>🚌 Bus Finder</h1>
                <div className="card">
                    <Routes>
                        <Route path="/" element={<BusSearch />} />
                        <Route path="/login" element={<Login/>}/>
                        <Route path="/admin" element={<AdminUpload />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;