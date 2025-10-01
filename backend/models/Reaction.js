import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema({
  // User who reacted
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  userRole: {
    type: String,
    enum: ["Student", "Teacher", "Admin"],
    required: true,
  },
  
  // What they reacted to
  referenceType: {
    type: String,
    enum: ["assignment", "announcement", "material", "exam", "comment"],
    required: true,
  },
  referenceId: {
    type: String,
    required: true,
  },
  
  // Type of reaction
  reactionType: {
    type: String,
    enum: ["heart", "like", "thumbs_up", "thumbs_down"],
    default: "heart",
    required: true,
  },
  
  // Class context
  class: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// Compound index to ensure one reaction per user per item
reactionSchema.index({ userId: 1, referenceType: 1, referenceId: 1 }, { unique: true });

const Reaction = mongoose.model("Reaction", reactionSchema);

export default Reaction;