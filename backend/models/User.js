import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  email: { type: String, unique: true, sparse: true },
  password: String,
  role: { type: String, enum: ["Student", "Teacher", "Admin"], default: "Student" },
  googleId: { type: String, index: true, sparse: true },
  picture: String,
  creditPoints: { type: Number, default: 0, min: 0, max: 10 }, // Max 10 credit points
  resetToken: String,
  resetTokenExpiry: Date,
  // OTP reset fields (email-based)
  resetOTPHash: String,
  resetOTPExpiry: Date,
  resetOTPAttempts: { type: Number, default: 0 },
}, {
  timestamps: true // This adds createdAt and updatedAt fields automatically
});

export default mongoose.model("User", userSchema);