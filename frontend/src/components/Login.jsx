import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import "../components/Login.css"

const Login = ({ setLoggedInUser }) => {
 
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

            try {
                // Call the backend API to validate credentials
                const response = await axios.post('http://localhost:5000/api/auth/login', {
                    username,
                    password
                });

                if (response.data.success) {
                    // Set the logged-in user and navigate
                    setLoggedInUser({ role: response.data.role });
                    navigate(response.data.role === 'admin' ? '/admin' : '/temporary-edits');
                } else {
                    setError('Invalid admin credentials');
                }
            } catch (error) {
                console.error('❌ Error validating credentials:', error);
                setError('Failed to validate credentials. Please try again.');
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
                        />
                    </div>
                    <button type="submit" className="login-button">
                        Login
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </form>
               
            </div>
            
        </div>

    );
};

export default Login;