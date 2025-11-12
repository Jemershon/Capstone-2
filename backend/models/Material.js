import mongoose from "mongoose";

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  type: { 
    type: String, 
    enum: ["link", "file", "video", "document"], 
    required: true 
  },
  content: { type: String, required: true }, // URL for links/videos, file path for uploads
  class: { type: String, required: true },
  teacher: { type: String, required: true },
  openingTime: { type: Date },
  closingTime: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Material", materialSchema);