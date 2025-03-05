const express = require("express");
const { check, validationResult } = require("express-validator");
const { handleLogin, handleLogout, validateToken } = require("../controllers/authController");
const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Block after 5 failed attempts
    message: { success: false, message: "Too many login attempts. Try again later." }
});

const router = express.Router();

router.post(
    "/login",
    loginLimiter, // 🔒 Apply rate limit to prevent brute-force attacks
    [
        check("username").isString().trim().escape().notEmpty().withMessage("Username is required"),
        check("password").isString().trim().notEmpty().withMessage("Password is required")
    ],
    async (req, res, next) => {
        // Validate input before calling `handleLogin`
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    },
    handleLogin
);

router.post("/logout", handleLogout);
router.get("/validate-token", validateToken); 

module.exports = router;