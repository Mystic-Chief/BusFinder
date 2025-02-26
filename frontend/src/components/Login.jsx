import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../components/Login.css";

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            toast.error("Please fill in all fields.");
            return;
        }

        try {
            
            const response = await axios.post("http://localhost:5000/admin/login", {
                username,
                password,
            });

            if (response.data.success) {
                toast.success("Login successful!");
                navigate("/admin"); 
            } else {
                toast.error("Invalid credentials. Please try again.");
            }
        } catch (error) {
            console.error(" Error during login:", error);
            toast.error("Login failed. Please try again later.");
        }
    };

    return (
        <div className="login-container">
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
                </form>
               
            </div>
            <ToastContainer />
        </div>
    );
};

export default Login;