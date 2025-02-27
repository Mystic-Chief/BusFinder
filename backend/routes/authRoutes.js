const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

// Login route
router.post("/login", authController.handleLogin);

module.exports = router;