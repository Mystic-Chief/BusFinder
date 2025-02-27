const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");

const handleLogin = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find the user in the database
        const user = await Admin.findOne({ username });

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid username or password" });
        }

        // Compare the provided password with the hashed password in the database
        const isPasswordValid = password === user.password; // For now, using plain text comparison

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Invalid username or password" });
        }

        // If credentials are valid, return the user's role
        res.json({ success: true, role: user.role });
    } catch (error) {
        console.error("❌ Error validating credentials:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = { handleLogin };