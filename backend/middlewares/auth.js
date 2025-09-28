import jwt from "jsonwebtoken";

// Authentication middleware
export const authenticateToken = async (req, res, next) => {
  console.log(`Authentication check for ${req.method} ${req.originalUrl}`);
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("Authentication failed: No Bearer token provided");
    return res.status(401).json({ error: "Missing or invalid authorization token" });
  }
  
  const token = authHeader.split(" ")[1];
  console.log("Token provided:", token.substring(0, 10) + "...");
  
  // Make sure JWT_SECRET is set
  const jwtSecret = process.env.JWT_SECRET || "devsecret123";
  if (!jwtSecret) {
    console.error("JWT_SECRET is not set! Using default secret");
  }
  
  try {
    const user = jwt.verify(token, jwtSecret);
    console.log(`Authentication successful for user: ${user.username}, role: ${user.role}`);
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    res.status(403).json({ error: "Invalid or expired token", details: err.message });
  }
};

// Admin role middleware
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Teacher or Admin middleware
export const requireTeacherOrAdmin = (req, res, next) => {
  if (req.user.role !== "Teacher" && req.user.role !== "Admin") {
    return res.status(403).json({ error: "Teacher or Admin access required" });
  }
  next();
};

// Student role middleware
export const requireStudent = (req, res, next) => {
  if (req.user.role !== "Student") {
    return res.status(403).json({ error: "Student access required" });
  }
  next();
};