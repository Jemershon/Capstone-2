import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  name: String,
  teacher: String,
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

export default mongoose.model("Class", classSchema);