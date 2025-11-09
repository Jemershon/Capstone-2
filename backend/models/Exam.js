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
  allowResubmission: { type: Boolean, default: true },
  returned: { type: Boolean, default: false }, // Whether teacher has returned scores to students
  },
  { timestamps: true }
);

const Exam = mongoose.model("Exam", ExamSchema);

export default Exam;