import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["Student", "Teacher", "Admin"], default: "Student" },
});

export default mongoose.model("User", userSchema);