import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["Student", "Teacher", "Admin"], default: "Student" },
  resetCode: String,
  resetCodeExpiry: Date,
}, {
  timestamps: true // This adds createdAt and updatedAt fields automatically
});

export default mongoose.model("User", userSchema);