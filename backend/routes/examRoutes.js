const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");

// GET /api/exam/active - Fetch active exam schedules
router.get("/active", examController.getActiveExams);
router.get("/all", examController.getAllExams);

module.exports = router;