import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: String, required: true }, // Username
  authorRole: { type: String, enum: ["Student", "Teacher", "Admin"], required: true },
  referenceType: { 
    type: String, 
    enum: ["assignment", "announcement", "material"], 
    required: true 
  },
  referenceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'referenceType',
    required: true 
  },
  class: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Comment", commentSchema);