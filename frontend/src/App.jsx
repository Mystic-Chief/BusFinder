import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import BusSearch from './components/BusSearch';
import AdminUpload from './components/AdminUpload';
import TemporaryEdits from './components/TemporaryEdits';
import Login from './components/Login';
import './App.css';

const App = () => {
    const [loggedInUser, setLoggedInUser] = useState(null);

    const handleLogout = () => {
        setLoggedInUser(null);
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
                <Route path="/login" element={
                    loggedInUser ? <Navigate to="/" /> : <Login setLoggedInUser={setLoggedInUser} />
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

                <Route path="/" element={
                    <ProtectedRoute user={loggedInUser}>
                        <BusSearch />
                    </ProtectedRoute>
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