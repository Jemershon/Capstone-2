import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import classRoutes from "./routes/classes.js";

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://localhost:27017/notetify", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

app.use("/api", authRoutes);
app.use("/api", classRoutes);

const PORT = 4000;
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));