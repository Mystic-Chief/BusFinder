const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
    examTitle: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    direction: { type: String, enum: ["incoming", "outgoing"], required: true },
    stops: [{ type: String }], // List of bus stops for the exam schedule
});

module.exports = mongoose.model("exam_schedules", examSchema);