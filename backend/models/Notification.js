import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: String, required: true }, // Username of the recipient
  sender: { type: String, required: true }, // Username of the sender
  type: { 
    type: String, 
    enum: ["assignment", "announcement", "grade", "comment", "material", "exam"], 
    required: true 
  },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  referenceId: mongoose.Schema.Types.ObjectId,
  class: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Notification", notificationSchema);