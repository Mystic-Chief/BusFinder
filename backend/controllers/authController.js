const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

const secretKey = process.env.JWT_SECRET;

const createDefaultAdmin = async () => {
    // Security configuration
    const SALT_ROUNDS = 12;
    try {
        // Function to create or update a user safely
        const createUser = async (username, password, role) => {
            if (!username || !password) {
                console.warn(`⚠️ Skipping ${role} creation due to missing env variables.`);
                return;
            }

            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            const result = await Admin.findOneAndUpdate(
                { username }, // Search for existing user
                { $setOnInsert: { username, password: hashedPassword, role } }, // Only set on insert
                { upsert: true, new: false } // Create only if not found
            );

            if (result) {
                console.log(`⚠️ ${role} account already exists: ${username}`);
            } else {
                console.log(`✅ Default ${role} account created: ${username}`);
            }
        };

        // Create default users safely
        await createUser(process.env.DEFAULT_ADMIN_USERNAME, process.env.DEFAULT_ADMIN_PASSWORD, "admin");
        await createUser(process.env.DEFAULT_PT_SUPERVISOR_USERNAME, process.env.DEFAULT_PT_SUPERVISOR_PASSWORD, "pt-supervisor");
        await createUser(process.env.DEFAULT_KT_SUPERVISOR_USERNAME, process.env.DEFAULT_KT_SUPERVISOR_PASSWORD, "kt-supervisor");

    } catch (error) {
        console.error("❌ Error creating default users:", error);
        process.exit(1); // Exit with failure
    }
};

const handleLogin = async (req, res) => {
    try {
        const user = await Admin.findOne({ username: req.body.username });
        
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Secure password comparison
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
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

module.exports = { handleLogin, handleLogout, validateToken, createDefaultAdmin };