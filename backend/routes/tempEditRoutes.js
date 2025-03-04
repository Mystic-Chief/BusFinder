const express = require("express");
const tempEditController = require("../controllers/tempEditController");

const router = express.Router();

// Get editable data
router.get("/editable-data", tempEditController.getEditableData);

// Save temporary edit
router.post("/temp-edit", tempEditController.saveTempEdit);

module.exports = router;