import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    class: { type: String, required: true },
    sender: { type: String, required: true },
    senderName: { type: String },
    recipient: { type: String, required: true },
    recipientName: { type: String },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index for efficient queries
MessageSchema.index({ class: 1, sender: 1, recipient: 1 });
MessageSchema.index({ class: 1, recipient: 1, read: 1 });

const Message = mongoose.model("Message", MessageSchema);

export default Message;
