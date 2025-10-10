import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure Cloudinary
const configureCloudinary = () => {
  if (process.env.NODE_ENV === 'production' && 
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET) {
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    
    console.log('✅ Cloudinary configured for production');
    return true;
  } else {
    // local storage used in development (no noisy log)
    return false;
  }
};

// Check if Cloudinary is configured
const isCloudinaryConfigured = configureCloudinary();

// Local storage configuration (for development)
const createLocalStorage = () => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const materialsDir = path.join(uploadsDir, 'materials');
  const assignmentsDir = path.join(uploadsDir, 'assignments');
  const profilesDir = path.join(uploadsDir, 'profiles');

  // Create directories if they don't exist
  [uploadsDir, materialsDir, assignmentsDir, profilesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  return multer.diskStorage({
    destination: (req, file, cb) => {
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
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const extname = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${extname}`);
    }
  });
};

// Cloudinary storage configuration (for production)
const createCloudinaryStorage = () => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
      const uploadType = req.query.type || 'materials';
      
      return {
        folder: `remora/${uploadType}`, // Organize files in folders
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'zip', 'rar', 'mp4', 'mov', 'mp3', 'wav'],
        resource_type: 'auto', // Automatically detect file type
        public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`, // Unique filename
      };
    },
  });
};

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || 
    ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'zip', 'rar', 'jpg', 'jpeg', 'png', 'mp4', 'mov', 'mp3', 'wav'];
  
  const extname = path.extname(file.originalname).toLowerCase().substring(1);
  const mimetype = file.mimetype;
  
  // Check file extension
  if (allowedTypes.includes(extname) || 
      allowedTypes.some(type => mimetype.includes(type))) {
    return cb(null, true);
  }
  
  cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
};

// Create multer instance based on environment
const createUploadMiddleware = () => {
  const storage = isCloudinaryConfigured ? createCloudinaryStorage() : createLocalStorage();
  
  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '25') * 1024 * 1024; // Convert MB to bytes
  
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxFileSize,
      files: 5 // Max 5 files per upload
    }
  });
};

// Process uploaded file data for database storage
const processUploadedFile = (file, uploadType = 'materials') => {
  if (isCloudinaryConfigured) {
    // Cloudinary file
    return {
      filename: file.filename || file.public_id,
      originalName: file.originalname,
      filePath: file.path, // Cloudinary URL
      fileSize: file.bytes || file.size,
      mimeType: file.mimetype || file.format,
      cloudinaryId: file.public_id, // Store Cloudinary ID for deletion
      isCloudinary: true
    };
  } else {
    // Local file
    const relativePath = `uploads/${uploadType === 'assignment' ? 'assignments' : 
      uploadType === 'profile' ? 'profiles' : 'materials'}/${file.filename}`;
    
    return {
      filename: file.filename,
      originalName: file.originalname,
      filePath: relativePath,
      fileSize: file.size,
      mimeType: file.mimetype,
      isCloudinary: false
    };
  }
};

// Delete file (works for both local and Cloudinary)
const deleteFile = async (fileData) => {
  try {
    if (fileData.isCloudinary && fileData.cloudinaryId) {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(fileData.cloudinaryId);
      console.log(`Deleted file from Cloudinary: ${fileData.cloudinaryId}`);
    } else if (!fileData.isCloudinary && fileData.filePath) {
      // Delete local file
      const fullPath = path.join(process.cwd(), fileData.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`Deleted local file: ${fullPath}`);
      }
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

export {
  createUploadMiddleware,
  processUploadedFile,
  deleteFile,
  isCloudinaryConfigured
};