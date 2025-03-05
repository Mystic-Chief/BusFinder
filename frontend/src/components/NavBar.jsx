import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Navbar = ({ loggedInUser, setLoggedInUser }) => {
    const navigate = useNavigate(); // ✅ useNavigate() now works inside <Router>

    const handleLogout = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true });
            setLoggedInUser(null);
            navigate("/"); // ✅ Redirect to home page (Bus Search)
        } catch (err) {
            console.error("Logout error:", err);
        }
    };

    return (
        <nav className="navbar">
            <Link to="/" className="nav-link">Bus Search</Link>
            {loggedInUser ? (
                <>
                    {(loggedInUser.role === 'admin' || loggedInUser.role.includes('supervisor')) && (
                        <Link to="/temporary-edits" className="nav-link">Temporary Edits</Link>
                    )}
                    {loggedInUser.role === 'admin' && (
                        <Link to="/admin" className="nav-link">Admin Upload</Link>
                    )}
                    <button onClick={handleLogout} className="logout-button">Logout</button>
                </>
            ) : (
                <Link to="/login" className="nav-link">Admin Login</Link>
            )}
        </nav>
    );
};

export default Navbar;
