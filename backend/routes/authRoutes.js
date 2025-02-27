const express = require("express");
const { handleLogin, handleLogout, validateToken } = require("../controllers/authController");

const router = express.Router();

router.post("/login", handleLogin);
router.post("/logout", handleLogout);
router.get("/validate-token", validateToken); // Add this route

module.exports = router;