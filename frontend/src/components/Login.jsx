import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import "../components/Login.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Login = ({ setLoggedInUser }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/auth/login`, 
                { username, password },
                { withCredentials: true }
            );

            if (response.data.success) {
                setLoggedInUser({ role: response.data.role });
                navigate(response.data.role === 'admin' ? '/admin' : '/temporary-edits');
            } else {
                setError(response.data.message || 'Invalid credentials');
            }
        } catch (error) {
            setError('Failed to validate credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container1">
            <div className="login-card">
                <h2>🔐 Admin Login</h2>
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </form>
            </div>
        </div>
    );
};
export default Login;