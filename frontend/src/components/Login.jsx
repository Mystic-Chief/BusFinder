import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = ({ setLoggedInUser }) => {
    const [role, setRole] = useState('student');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        if (role === 'admin') {
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
        } else {
            // For student/staff, no credentials are required
            setLoggedInUser({ role });
            navigate('/');
        }
    };

    return (
        <div className="login-container">
            <h2>🚌 Bus Finder Login</h2>
            <form onSubmit={handleLogin}>
                <div className="role-selection">
                    <label>
                        <input
                            type="radio"
                            value="student"
                            checked={role === 'student'}
                            onChange={() => setRole('student')}
                        />
                        Student
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="staff"
                            checked={role === 'staff'}
                            onChange={() => setRole('staff')}
                        />
                        Staff
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="admin"
                            checked={role === 'admin'}
                            onChange={() => setRole('admin')}
                        />
                        Admin/Supervisor
                    </label>
                </div>

                {role === 'admin' && (
                    <div className="admin-credentials">
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                )}

                {error && <p className="error-message">{error}</p>}

                <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default Login;