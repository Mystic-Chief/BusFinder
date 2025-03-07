const express = require("express");
const busController = require("../controllers/busController");

const router = express.Router();

// Get stops
router.get("/stops", busController.getStops);

// Get buses for a stop
router.get("/buses/:stopName", busController.getBuses);

module.exports = router;