import mongoose from "mongoose";

const topicSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  color: { 
    type: String, 
    default: "#6c757d" // Default gray color
  },
  class: { 
    type: String, 
    required: true 
  },
  teacher: { 
    type: String, 
    required: true 
  },
  order: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Ensure unique topic names per class
topicSchema.index({ class: 1, name: 1 }, { unique: true });

export default mongoose.model("Topic", topicSchema);
