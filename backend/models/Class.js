import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  name: String,
  section: String,
  course: String, // e.g., BSIT
  year: String,   // e.g., 4-2
  code: { type: String, unique: true },
  teacher: String,
  students: [{ type: String }],
  bg: { type: String, default: "#FFF0D8" },
});

export default mongoose.model("Class", classSchema);