import mongoose from "mongoose";

const ExamSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    class: String,
    due: Date,
    questions: [
      {
        text: { type: String, required: true },
        type: { type: String, enum: ["short", "multiple"], default: "short" },
        options: { type: [String], default: [] },
        correctAnswer: { type: String, default: "" },
      },
    ],
  createdBy: String,
  manualGrading: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Exam = mongoose.model("Exam", ExamSchema);

export default Exam;