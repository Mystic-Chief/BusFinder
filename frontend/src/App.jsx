import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import BusSearch from './components/BusSearch';
import AdminUpload from './components/AdminUpload';
import TemporaryEdits from './components/TemporaryEdits';
import Login from './components/Login';
import './App.css';
import axios from 'axios';

const App = () => {
    const [loggedInUser, setLoggedInUser] = useState(null);

    const handleLogout = async() => {
        try{
            await axios.post("http://localhost:5000/api/auth/logout");
            setLoggedInUser(null);
        } catch(err){
            console.log(err);
            
        }
    };

    return (
        <Router>
            {loggedInUser && (
                <nav className="navbar">
                    <Link to="/" className="nav-link">Bus Search</Link>
                    {(loggedInUser.role === 'admin' || loggedInUser.role.includes('supervisor')) && (
                        <Link to="/temporary-edits" className="nav-link">Temporary Edits</Link>
                    )}
                    {loggedInUser.role === 'admin' && (
                        <Link to="/admin" className="nav-link">Admin Upload</Link>
                    )}
                    <button onClick={handleLogout} className="logout-button">Logout</button>
                </nav>
            )}

            <Routes>
                <Route path="/" element={
                    <BusSearch/>
                } />
                
                <Route path="/admin" element={
                    <ProtectedRoute user={loggedInUser} allowedRoles={['admin']}>
                        <AdminUpload />
                    </ProtectedRoute>
                } />

                <Route path="/temporary-edits" element={
                    <ProtectedRoute user={loggedInUser} allowedRoles={['admin', 'kt-supervisor', 'pt-supervisor']}>
                        <TemporaryEdits userRole={loggedInUser?.role} />
                    </ProtectedRoute>
                } />

                <Route path="/login" element={
                    <Login/>
                } />
            </Routes>
        </Router>
    );
};

const ProtectedRoute = ({ user, children, allowedRoles = [] }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }
    return children;
};

export default App;