import express from "express";
import { authenticateToken } from "../middlewares/auth.js";
import { createUploadMiddleware, processUploadedFile } from "../services/uploadService.js";

const router = express.Router();

// Create upload middleware
const upload = createUploadMiddleware();

// Single file upload endpoint
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      console.error('No file received in upload request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('File received:', {
      originalname: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      path: req.file.path
    });
    
    const uploadType = req.query.type || 'materials';
    const processedFile = processUploadedFile(req.file, uploadType);
    
    console.log('Processed file:', processedFile);
    
    // Return success response with file info
    res.status(201).json({ 
      message: 'File uploaded successfully',
      file: {
        filename: processedFile.filename,
        originalname: processedFile.originalName,
        size: processedFile.fileSize,
        mimetype: processedFile.mimeType
      },
      filePath: processedFile.filePath
    });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'Failed to upload file: ' + err.message });
  }
});

// Multiple file upload endpoint
router.post('/upload/multiple', authenticateToken, upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const uploadType = req.query.type || 'materials';
    const uploadedFiles = req.files.map(file => {
      const processedFile = processUploadedFile(file, uploadType);
      
      return {
        originalname: processedFile.originalName,
        filename: processedFile.filename,
        filePath: processedFile.filePath,
        size: processedFile.fileSize
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