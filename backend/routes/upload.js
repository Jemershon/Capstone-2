import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create subdirectories for different upload types
const assignmentsDir = path.join(uploadsDir, "assignments");
const materialsDir = path.join(uploadsDir, "materials");
const profilesDir = path.join(uploadsDir, "profiles");

// Create directories if they don't exist
[assignmentsDir, materialsDir, profilesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine destination folder based on the upload type
    const uploadType = req.query.type || 'materials';
    let destDir;
    
    switch(uploadType) {
      case 'assignment':
        destDir = assignmentsDir;
        break;
      case 'profile':
        destDir = profilesDir;
        break;
      case 'material':
      default:
        destDir = materialsDir;
    }
    
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extname = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extname}`);
  }
});

// Configure file filter
const fileFilter = (req, file, cb) => {
  // Get file type from query parameter
  const uploadType = req.query.type || 'materials';
  
  // Define allowed file types per upload type
  const allowedTypes = {
    assignment: /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|rar|jpg|jpeg|png/,
    profile: /jpg|jpeg|png/,
    material: /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|rar|jpg|jpeg|png|mp4|mov|mp3|wav/,
  };
  
  // Check if file extension is allowed
  const extname = path.extname(file.originalname).toLowerCase().substring(1);
  const mimetype = file.mimetype;
  
  const allowedPattern = allowedTypes[uploadType] || allowedTypes.material;
  
  if (allowedPattern.test(extname) || allowedPattern.test(mimetype.split('/')[1])) {
    return cb(null, true);
  }
  
  cb(new Error(`Only ${allowedPattern.toString().replace(/\//g, '')} files are allowed for ${uploadType} uploads`));
};

// Configure upload limits
const limits = {
  fileSize: 25 * 1024 * 1024, // 25MB default
  files: 5 // Max 5 files per upload
};

// Create multer instance with the configuration
const upload = multer({ 
  storage,
  fileFilter,
  limits
});

// Single file upload endpoint
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Determine the file's relative path for the response
    const uploadType = req.query.type || 'materials';
    const relativePath = `uploads/${uploadType === 'assignment' ? 'assignments' : 
      uploadType === 'profile' ? 'profiles' : 'materials'}/${req.file.filename}`;
    
    // Return success response with file info
    res.status(201).json({ 
      message: 'File uploaded successfully',
      file: req.file,
      filePath: relativePath
    });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Multiple file upload endpoint
router.post('/upload/multiple', authenticateToken, upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Determine the files' relative paths for the response
    const uploadType = req.query.type || 'materials';
    const uploadedFiles = req.files.map(file => {
      return {
        originalname: file.originalname,
        filename: file.filename,
        filePath: `uploads/${uploadType === 'assignment' ? 'assignments' : 
          uploadType === 'profile' ? 'profiles' : 'materials'}/${file.filename}`,
        size: file.size
      };
    });
    
    // Return success response with files info
    res.status(201).json({ 
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (err) {
    console.error('Files upload error:', err);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

export default router;