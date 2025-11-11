import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionTitle: String,
  questionType: String,
  answer: mongoose.Schema.Types.Mixed, // Can be string, array, number, date
  
  // For auto-grading
  isCorrect: Boolean,
  pointsAwarded: { type: Number, default: 0 },
  partialCredit: { type: Number }, // For enumeration and matching type (0-1)
  
  // For manual grading
  manualScore: { type: Number, default: 0 },
});

const responseSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
    },
    
    // Respondent info
    respondent: {
      username: String, // null if anonymous
      email: String,
      name: String,
    },
    
    // Answers
    answers: [answerSchema],
    
    // Scoring (for quiz mode)
    score: {
      total: { type: Number, default: 0 },
      maxScore: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      autoGraded: { type: Boolean, default: false },
    },
    
    // Metadata
    submittedAt: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,
    
    // Time tracking
    startTime: Date,
    completionTime: Number, // in seconds
    timeSpent: Number, // in seconds (alternative field name for consistency)
    
    // Teacher feedback
    feedback: { type: String, default: "" },
    
    // Status
    status: {
      type: String,
      enum: ["submitted", "graded", "reviewed"],
      default: "submitted",
    },
  },
  { timestamps: true }
);

// Indexes
responseSchema.index({ formId: 1, createdAt: -1 });
responseSchema.index({ "respondent.username": 1 });
responseSchema.index({ submittedAt: -1 });

const Response = mongoose.model("FormResponse", responseSchema);

export default Response;
