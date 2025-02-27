const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const dotenv = require("dotenv");

dotenv.config();
const secretKey = process.env.JWT_SECRET;

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

        const token = jwt.sign({userId:user._id},secretKey,{expiresIn:"1h"});

        res.cookie("token",token,{
            maxAge: 1*24*60*60*1000,
            httpOnly: true,
            sameSite: "strict",
            secure:process.env.NODE_ENV==='production'
        })

        // If credentials are valid, return the user's role
        res.json({ success: true, role: user.role });
    } catch (error) {
        console.error("❌ Error validating credentials:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const handleLogout = ()=>{
    try {
        res.clearCookie('token',{
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production'
        })
        res.status(200).json({ success: true, message: 'Logged out successfully' });
        
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }

}

module.exports = { handleLogin,handleLogout };