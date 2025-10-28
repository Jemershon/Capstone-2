// Script to delete the "MIDTERM" exam from MongoDB directly
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Exam schema definition
const ExamSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    class: String,
    due: Date,
    questions: [
      {
        text: { type: String, required: true },
        type: { type: String, enum: ["short", "multiple"], default: "short" },
        options: { type: [String], default: [] },
        correctAnswer: { type: String, default: "" },
      },
    ],
    createdBy: String,
  },
  { timestamps: true }
);

// Create the model using the schema
const Exam = mongoose.model('Exam', ExamSchema);

async function deleteMidtermExam() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://<your-production-uri>", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully');

    // Find and list all exams with title "MIDTERM" (case insensitive)
    console.log('Searching for MIDTERM exams...');
    const exams = await Exam.find({ title: { $regex: /^MIDTERM$/i } });
    
    if (exams.length === 0) {
      console.log('No exams found with title "MIDTERM"');
      // Try a broader search
      const allMidtermExams = await Exam.find({ title: { $regex: /midterm/i } });
      if (allMidtermExams.length > 0) {
        console.log(`Found ${allMidtermExams.length} exams containing "midterm" in title:`);
        allMidtermExams.forEach((exam, index) => {
          console.log(`${index + 1}. ID: ${exam._id}, Title: ${exam.title}, Class: ${exam.class}, Created by: ${exam.createdBy}`);
        });
      } else {
        console.log('No exams found containing "midterm" in the title');
      }
    } else {
      console.log(`Found ${exams.length} exams with title "MIDTERM":`);
      
      for (const exam of exams) {
        console.log(`ID: ${exam._id}, Title: ${exam.title}, Class: ${exam.class}, Created by: ${exam.createdBy}`);
        
        // Delete the exam
        await Exam.deleteOne({ _id: exam._id });
        console.log(`Deleted exam with ID: ${exam._id}`);
      }
      
      console.log('All MIDTERM exams deleted successfully');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
deleteMidtermExam();