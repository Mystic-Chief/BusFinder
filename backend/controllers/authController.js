const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const dotenv = require("dotenv");

dotenv.config();
const secretKey = process.env.JWT_SECRET;

const handleLogin = async (req, res) => {
    try {
        const user = await Admin.findOne({ username: req.body.username });
        if (!user || req.body.password !== user.password) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user._id, role: user.role }, secretKey, { expiresIn: "1h" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        res.json({ success: true, role: user.role });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const handleLogout = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict"
    });
    res.json({ success: true, message: "Logged out successfully" });
};

const validateToken = async (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(200).json({ success: false, message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        const user = await Admin.findById(decoded.userId);

        if (!user) {
            return res.status(200).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, role: user.role });
    } catch (error) {
        console.error("Token validation error:", error);
        res.clearCookie("token");
        res.status(200).json({ success: false, message: "Invalid token" });
    }
};

module.exports = { handleLogin,handleLogout, validateToken  };