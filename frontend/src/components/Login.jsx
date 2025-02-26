import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ setLoggedInUser }) => {
    const [role, setRole] = useState('student');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    // Hardcoded admin credentials (replace with proper auth in production)
    const adminCredentials = {
        'kt-supervisor': { password: 'kt123', role: 'kt-supervisor' },
        'pt-supervisor': { password: 'pt123', role: 'pt-supervisor' },
        'admin': { password: 'admin123', role: 'admin' }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        
        if (role === 'admin') {
            const user = adminCredentials[username];
            if (user && user.password === password) {
                setLoggedInUser({ role: user.role });
                navigate(user.role === 'admin' ? '/admin' : '/temporary-edits');
            } else {
                alert('Invalid admin credentials');
            }
        } else {
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

                <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default Login;