import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import BusSearch from './components/BusSearch';
import AdminUpload from './components/AdminUpload';
import TemporaryEdits from './components/TemporaryEdits';
import Navbar from './components/NavBar';
import Login from './components/Login';
import './App.css';
import axios from 'axios';

const App = () => {
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const validateToken = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/auth/validate-token', {
                    withCredentials: true
                });

                if (response.data.success) {
                    setLoggedInUser({ role: response.data.role });
                } else {
                    setLoggedInUser(null); // No valid token
                }
            } catch (error) {
                console.error("Token validation error:", error);
                setLoggedInUser(null);
            } finally {
                setLoading(false);
            }
        };

        validateToken();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Router>
            <Navbar loggedInUser={loggedInUser} setLoggedInUser={setLoggedInUser} /> {/* ✅ Use Navbar component */}

            <Routes>
                <Route path="/" element={<BusSearch />} />
                <Route path="/admin" element={<ProtectedRoute user={loggedInUser} allowedRoles={['admin']}><AdminUpload /></ProtectedRoute>} />
                <Route path="/temporary-edits" element={<ProtectedRoute user={loggedInUser} allowedRoles={['admin', 'kt-supervisor', 'pt-supervisor']}><TemporaryEdits userRole={loggedInUser?.role} /></ProtectedRoute>} />
                <Route path="/login" element={<Login setLoggedInUser={setLoggedInUser} />} />
            </Routes>
        </Router>
    );
};

const ProtectedRoute = ({ user, children, allowedRoles = [] }) => {
    if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }
    return children;
};

axios.defaults.withCredentials = true;

export default App;