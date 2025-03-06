const Exam = require("../models/Exam");

// Get active exam schedules
exports.getActiveExams = async (req, res) => {
    try {
        const now = new Date();
        const activeExams = await Exam.find({
            startDate: { $lte: now },
            endDate: { $gte: now }
        });

        res.json(activeExams);
    } catch (error) {
        console.error("❌ Error fetching active exams:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get all exam schedules
exports.getAllExams = async (req, res) => {
    try {
        const currentDate = new Date();
        
        // Find all exams
        const allExams = await Exam.find().lean();
        
        // Group exams by title to eliminate duplicates
        const examsByTitle = {};
        
        allExams.forEach(exam => {
            const startDate = new Date(exam.startDate);
            const endDate = new Date(exam.endDate);
            
            // Calculate availability date (one day before exam starts)
            const availableFrom = new Date(startDate);
            availableFrom.setDate(startDate.getDate() - 1);
            
            // Determine if exam is available now
            const isAvailable = currentDate >= availableFrom && currentDate <= endDate;
            
            // Check if the exam has ended
            const hasEnded = currentDate > endDate;
            
            // If we already have this title and this exam has ended, skip it
            if (hasEnded) {
                return; // Skip ended exams
            }
            
            // If we don't have this title yet, or this instance has a more recent date, use it
            if (!examsByTitle[exam.examTitle] || 
                new Date(examsByTitle[exam.examTitle].startDate) < startDate) {
                
                examsByTitle[exam.examTitle] = {
                    ...exam,
                    isAvailable,
                    availableFrom,
                    availableFromFormatted: availableFrom.toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'}),
                    startDateFormatted: startDate.toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'}),
                    endDateFormatted: endDate.toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'})
                };
            }
        });
        
        // Convert the grouped object to an array and sort by start date
        const uniqueExams = Object.values(examsByTitle).sort((a, b) => 
            new Date(a.startDate) - new Date(b.startDate)
        );
        
        res.json(uniqueExams);
    } catch (error) {
        console.error("❌ Error fetching exams:", error);
        res.status(500).json({ 
            error: "Failed to fetch exam schedules",
            message: error.message 
        });
    }
};

// Function to clean up expired exams - can be called via a scheduled job
exports.cleanupExpiredExams = async () => {
    try {
        const currentDate = new Date();
        const result = await Exam.deleteMany({ endDate: { $lt: currentDate } });
        console.log(`Cleaned up ${result.deletedCount} expired exams`);
        return result;
    } catch (error) {
        console.error("❌ Error cleaning up expired exams:", error);
        throw error;
    }
};