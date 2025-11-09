import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "short_answer",
      "paragraph",
      "multiple_choice",
      "checkboxes",
      "dropdown",
      "linear_scale",
      "date",
      "time",
      "file_upload",
      "identification",
      "true_false",
      "enumeration",
      "matching_type"
    ],
    required: true,
  },
  title: { type: String, required: true },
  description: String,
  required: { type: Boolean, default: false },
  
  // For multiple choice, checkboxes, dropdown
  options: [{ type: String }],
  
  // For matching type
  matchingPairs: [{ 
    left: String, 
    right: String 
  }],
  
  // For enumeration
  enumerationAnswers: [{ type: String }],
  expectedCount: { type: Number }, // How many items to enumerate
  
  // For linear scale
  scaleMin: { type: Number, default: 1 },
  scaleMax: { type: Number, default: 5 },
  scaleMinLabel: String,
  scaleMaxLabel: String,
  
  // For quiz mode
  correctAnswer: mongoose.Schema.Types.Mixed, // String for single, Array for multiple
  points: { type: Number, default: 0 },
  
  // Section assignment (Philippine style)
  sectionId: { type: String }, // Which section this question belongs to
  
  // Conditional logic
  conditionalLogic: {
    enabled: { type: Boolean, default: false },
    showIf: {
      questionId: String,
      operator: { type: String, enum: ["equals", "contains", "greater_than", "less_than"] },
      value: mongoose.Schema.Types.Mixed,
    },
  },
  
  order: { type: Number, default: 0 },
});

const sectionSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g., "Part I: Multiple Choice"
  instructions: { type: String }, // e.g., "Choose the best answer"
  pointsPerItem: { type: Number }, // e.g., "Each item is worth 2 points"
  order: { type: Number, default: 0 },
});

const formSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    
    // Owner and class association
    owner: { type: String, required: true }, // username
    className: String, // optional - can be assigned to a class
    
    // Collaborators (for collaborative editing)
    collaborators: [{ type: String }], // usernames
    
    // Questions
    questions: [questionSchema],
    
    // Sections (Philippine-style exam structure)
    sections: [sectionSchema],
    
    // Exam header information (Philippine style)
    examHeader: {
      subject: String,
      teacher: String,
      semester: String,
      schoolYear: String,
      examDate: Date,
      duration: Number, // in minutes
      totalItems: Number,
      totalPoints: Number,
      passingScore: Number,
    },
    
    // Form settings
    settings: {
      isQuiz: { type: Boolean, default: false }, // Quiz mode
      autoGrade: { type: Boolean, default: false },
      showCorrectAnswers: { type: Boolean, default: false },
      allowMultipleSubmissions: { type: Boolean, default: false },
      collectEmail: { type: Boolean, default: true },
      requireLogin: { type: Boolean, default: true }, // If false, anonymous submissions allowed
      shuffleQuestions: { type: Boolean, default: false }, // Randomize question order per student
      shuffleAnswers: { type: Boolean, default: false }, // Randomize answer options (for MC, checkboxes, dropdown)
      usePhilippineStyle: { type: Boolean, default: false }, // Enable Philippine exam format
      
      // Access control and scheduling
      acceptingResponses: { type: Boolean, default: true },
      openAt: Date, // When the form becomes available to students
      closeAt: Date, // When the form closes (replaces deadline)
      deadline: Date, // Legacy field - kept for backward compatibility
      
      // Confirmation message
      confirmationMessage: {
        type: String,
        default: "Your response has been recorded.",
      },
    },
    
    // Custom branding/theme
    theme: {
      primaryColor: { type: String, default: "#a30c0c" },
      backgroundColor: { type: String, default: "#ffffff" },
      headerImage: String,
      logo: String,
    },
    
    // Template info
    isTemplate: { type: Boolean, default: false },
    templateCategory: {
      type: String,
      enum: ["feedback", "quiz", "survey", "registration", "custom"],
    },
    
    // Status
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
    },
    
    // Response count
    responseCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes
formSchema.index({ owner: 1, createdAt: -1 });
formSchema.index({ className: 1 });
formSchema.index({ isTemplate: 1 });
formSchema.index({ status: 1 });

const Form = mongoose.model("Form", formSchema);

export default Form;
