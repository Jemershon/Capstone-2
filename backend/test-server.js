import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

app.post("/api/auth/forgot-password", (req, res) => {
  console.log("Forgot password request:", req.body);
  res.json({ message: "Test response" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});