import express from "express";
import multer from "multer";
import { authenticateToken, requireTeacherOrAdmin } from "../middlewares/auth.js";
import Class from "../models/Class.js";
import Exam from "../models/Exam.js";

const router = express.Router();

// Configure multer for CSV file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Define Grade schema inline (assuming it exists in server.js)
let Grade;

export function setupGradeExportModels(gradeModel) {
  Grade = gradeModel;
}

// Export grades as CSV
router.get("/grades/export", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { class: className } = req.query;
    
    let grades;
    let filename;
    
    if (className) {
      // Export for a specific class
      const cls = await Class.findOne({ name: className });
      if (!cls) {
        return res.status(404).json({ error: "Class not found" });
      }
      
      if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
        return res.status(403).json({ error: "You are not authorized to export grades for this class" });
      }
      
      grades = await Grade.find({ class: className }).sort({ student: 1 });
      filename = `grades-${className}-${Date.now()}.csv`;
    } else {
      // Export all grades for all teacher's classes
      const classes = await Class.find({ teacher: req.user.username }).select("name");
      const classNames = classes.map(cls => cls.name);
      
      grades = await Grade.find({ class: { $in: classNames } }).sort({ class: 1, student: 1 });
      filename = `grades-all-${Date.now()}.csv`;
    }
    
    // Create CSV including class section/course and exam title when available
    const csvRows = [];
    csvRows.push('Class,Section,Course,Student,Grade,Feedback,Exam ID,Exam Title,Created At');

    // Cache class and exam lookups to reduce DB queries
    const classCache = {};
    const examCache = {};

    for (const grade of grades) {
      const className = grade.class || '';
      let cls = classCache[className];
      if (className && !cls) {
        cls = await Class.findOne({ name: className }).select('section course');
        classCache[className] = cls;
      }

      const section = cls && cls.section ? cls.section : '';
      const course = cls && cls.course ? cls.course : '';

      let examTitle = '';
      if (grade.examId) {
        const examIdStr = grade.examId.toString();
        if (examCache[examIdStr]) {
          examTitle = examCache[examIdStr];
        } else {
          try {
            const examDoc = await Exam.findById(grade.examId).select('title');
            examTitle = examDoc ? examDoc.title : '';
          } catch (e) {
            examTitle = '';
          }
          examCache[examIdStr] = examTitle;
        }
      }

      const row = [
        className,
        section,
        course,
        grade.student || '',
        grade.grade || '',
        (grade.feedback || '').replace(/,/g, ';').replace(/\n/g, ' '),
        grade.examId || '',
        (examTitle || '').replace(/,/g, ';'),
        grade.createdAt ? new Date(grade.createdAt).toISOString() : ''
      ];
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error("Export grades error:", err);
    res.status(500).json({ error: "Failed to export grades" });
  }
});

// Import grades from CSV
router.post("/grades/import", authenticateToken, requireTeacherOrAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required" });
    }
    
    const csvData = req.file.buffer.toString('utf-8');
    
    // Parse CSV (skip header row)
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      return res.status(400).json({ error: "CSV file is empty or invalid" });
    }
    
    const header = lines[0];
    const dataLines = lines.slice(1);
    
    let imported = 0;
    let errors = [];
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length < 3) {
        errors.push(`Line ${i + 2}: Invalid format (expected: Class,Student,Grade,Feedback,ExamID,CreatedAt)`);
        continue;
      }
      
      const [className, student, grade, feedback, examId] = parts;
      
      if (!className || !student || !grade) {
        errors.push(`Line ${i + 2}: Class, student, and grade are required`);
        continue;
      }
      
      // Verify teacher owns the class
      const cls = await Class.findOne({ name: className });
      if (!cls) {
        errors.push(`Line ${i + 2}: Class "${className}" not found`);
        continue;
      }
      
      if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
        errors.push(`Line ${i + 2}: Not authorized to import grades for class "${className}"`);
        continue;
      }
      
      // Check if student is in the class
      if (!cls.students.includes(student)) {
        errors.push(`Line ${i + 2}: Student "${student}" not in class "${className}"`);
        continue;
      }
      
      // Create or update grade
      const existingGrade = await Grade.findOne({ 
        class: className, 
        student, 
        examId: examId || null 
      });
      
      if (existingGrade) {
        existingGrade.grade = grade;
        existingGrade.feedback = feedback || '';
        await existingGrade.save();
      } else {
        const newGrade = new Grade({
          class: className,
          student,
          grade,
          feedback: feedback || '',
          examId: examId || null
        });
        await newGrade.save();
      }
      
      imported++;
    }
    
    res.json({ 
      message: `Successfully imported ${imported} grades`, 
      imported,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error("Import grades error:", err);
    res.status(500).json({ error: "Failed to import grades" });
  }
});

export default router;
