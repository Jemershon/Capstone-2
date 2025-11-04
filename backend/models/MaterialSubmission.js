import mongoose from "mongoose";

const materialSubmissionSchema = new mongoose.Schema({
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Material", required: true },
  class: { type: String, required: true },
  student: { type: String, required: true }, // student username
  studentName: { type: String }, // student display name
  fileName: { type: String, required: true },
  filePath: { type: String, required: true }, // file storage path or URL
  fileSize: { type: Number },
  mimeType: { type: String },
  submittedAt: { type: Date, default: Date.now },
  feedback: { type: String }, // teacher feedback on submission
  score: { type: Number }, // grade/score if applicable
  gradedAt: { type: Date }, // when teacher graded this submission
  status: { 
    type: String, 
    enum: ["submitted", "graded", "returned"], 
    default: "submitted" 
  }
}, { timestamps: true });

export default mongoose.model("MaterialSubmission", materialSubmissionSchema);
