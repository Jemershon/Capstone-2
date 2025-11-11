import express from "express";
import Form from "../models/Form.js";
import FormResponse from "../models/FormResponse.js";
import { authenticateToken, requireTeacherOrAdmin } from "../middlewares/auth.js";

const router = express.Router();

// ============== FORM CRUD ==============

// DEBUG: Get all forms (no auth, for debugging only - REMOVE IN PRODUCTION)
router.get("/debug/all", async (req, res) => {
  try {
    const forms = await Form.find({}).sort({ createdAt: -1 });
    console.log("=== ALL FORMS IN DATABASE ===");
    console.log("Total forms:", forms.length);
    forms.forEach(f => {
      console.log(`- ${f.title} (${f.status}) by ${f.owner}`);
    });
    res.json(forms.map(f => ({
      id: f._id,
      title: f.title,
      status: f.status,
      owner: f.owner,
      questions: f.questions.length,
      createdAt: f.createdAt
    })));
  } catch (err) {
    console.error("Debug all forms error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all forms (for current user)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { role, username } = req.user;
    let query = {};
    
    console.log("=== GET FORMS REQUEST ===");
    console.log("User:", username);
    console.log("Role:", role);
    console.log("Full user object:", req.user);
    
    // Case-insensitive role check
    const userRole = role.toLowerCase();
    
    if (userRole === "teacher" || userRole === "admin") {
      // Teachers see forms they own or collaborate on
      query = {
        $or: [
          { owner: username },
          { collaborators: username }
        ]
      };
    } else {
      // Students see forms from their classes
      // First, get the classes the student is enrolled in
      const Class = (await import("../models/Class.js")).default;
      const studentClasses = await Class.find({ students: username });
      const classNames = studentClasses.map(c => c.name);
      
      console.log("Student enrolled in classes:", classNames);
      
      query = {
        status: "published", // Only show published forms
        $or: [
          { className: { $in: classNames } }, // Forms assigned to student's classes
          { "settings.requireLogin": false }  // Public forms
        ]
      };
    }
    
    console.log("Query:", JSON.stringify(query));
    
    const forms = await Form.find(query).sort({ createdAt: -1 });
    
    console.log("Found forms:", forms.length);
    if (forms.length > 0) {
      console.log("Sample form:", {
        id: forms[0]._id,
        title: forms[0].title,
        status: forms[0].status,
        owner: forms[0].owner,
        className: forms[0].className
      });
    } else {
      console.log("No forms found. Checking if any forms exist in DB...");
      const allForms = await Form.find({}).limit(5);
      console.log("Total forms in DB:", await Form.countDocuments());
      if (allForms.length > 0) {
        console.log("Sample form from DB:", {
          title: allForms[0].title,
          owner: allForms[0].owner,
          status: allForms[0].status,
          className: allForms[0].className
        });
      }
    }
    
    res.json(forms);
  } catch (err) {
    console.error("Get forms error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single form
router.get("/:id", async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    
    // Add availability status
    const now = new Date();
    let availabilityStatus = 'available';
    
    if (form.settings.openAt && now < new Date(form.settings.openAt)) {
      availabilityStatus = 'not_yet_open';
    } else if (form.settings.closeAt && now > new Date(form.settings.closeAt)) {
      availabilityStatus = 'closed';
    } else if (form.settings.deadline && now > new Date(form.settings.deadline)) {
      availabilityStatus = 'closed';
    } else if (!form.settings.acceptingResponses) {
      availabilityStatus = 'closed';
    }
    
    res.json({ ...form.toObject(), availabilityStatus });
  } catch (err) {
    console.error("Get form error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create form
router.post("/", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { username } = req.user;
    console.log("=== CREATE FORM REQUEST ===");
    console.log("User:", username);
    console.log("User object:", req.user);
    console.log("Form title:", req.body.title);
    console.log("Form status:", req.body.status);
    
    const formData = {
      ...req.body,
      owner: username,
    };
    
    const form = new Form(formData);
    await form.save();
    
    console.log("Form created successfully:");
    console.log("  ID:", form._id);
    console.log("  Title:", form.title);
    console.log("  Status:", form.status);
    console.log("  Owner:", form.owner);
    
    res.status(201).json(form);
  } catch (err) {
    console.error("Create form error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update form
router.put("/:id", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { username } = req.user;
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    
    // Check if user is owner or collaborator
    if (form.owner !== username && !form.collaborators.includes(username)) {
      return res.status(403).json({ error: "Not authorized to edit this form" });
    }
    
    console.log("Updating form status from", form.status, "to", req.body.status);
    
    Object.assign(form, req.body);
    await form.save();
    
    console.log("Form saved with status:", form.status);
    
    res.json(form);
  } catch (err) {
    console.error("Update form error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete form
router.delete("/:id", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { username } = req.user;
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    
    if (form.owner !== username) {
      return res.status(403).json({ error: "Only the owner can delete this form" });
    }
    
    // Delete all responses
    await FormResponse.deleteMany({ formId: req.params.id });
    
    await Form.findByIdAndDelete(req.params.id);
    
    res.json({ message: "Form and all responses deleted successfully" });
  } catch (err) {
    console.error("Delete form error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============== COLLABORATORS ==============

// Add collaborator
router.post("/:id/collaborators", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { username } = req.user;
    const { collaboratorUsername } = req.body;
    
    const form = await Form.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    
    if (form.owner !== username) {
      return res.status(403).json({ error: "Only the owner can add collaborators" });
    }
    
    if (!form.collaborators.includes(collaboratorUsername)) {
      form.collaborators.push(collaboratorUsername);
      await form.save();
    }
    
    res.json(form);
  } catch (err) {
    console.error("Add collaborator error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Remove collaborator
router.delete("/:id/collaborators/:username", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { username } = req.user;
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    
    if (form.owner !== username) {
      return res.status(403).json({ error: "Only the owner can remove collaborators" });
    }
    
    form.collaborators = form.collaborators.filter(c => c !== req.params.username);
    await form.save();
    
    res.json(form);
  } catch (err) {
    console.error("Remove collaborator error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============== TEMPLATES ==============

// Get all templates
router.get("/templates/all", async (req, res) => {
  try {
    const templates = await Form.find({ isTemplate: true }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    console.error("Get templates error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create form from template
router.post("/templates/:id/use", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { username } = req.user;
    const template = await Form.findById(req.params.id);
    
    if (!template || !template.isTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const newForm = new Form({
      ...template.toObject(),
      _id: undefined,
      owner: username,
      isTemplate: false,
      status: "draft",
      responseCount: 0,
      collaborators: [],
      createdAt: undefined,
      updatedAt: undefined,
    });
    
    await newForm.save();
    res.status(201).json(newForm);
  } catch (err) {
    console.error("Use template error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============== RESPONSES ==============

// Submit response (public or authenticated)
router.post("/:id/responses", async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    
    if (!form.settings.acceptingResponses) {
      return res.status(400).json({ error: "Form is no longer accepting responses" });
    }
    
    // Check if form has opened yet
    const now = new Date();
    if (form.settings.openAt && now < new Date(form.settings.openAt)) {
      return res.status(400).json({ 
        error: "Form is not yet available",
        openAt: form.settings.openAt 
      });
    }
    
    // Check if form has closed (use closeAt or fall back to deadline)
    const closingTime = form.settings.closeAt || form.settings.deadline;
    if (closingTime && now > new Date(closingTime)) {
      return res.status(400).json({ error: "Form has closed" });
    }
    
    // Legacy deadline check (kept for backward compatibility)
    if (form.settings.deadline && now > new Date(form.settings.deadline)) {
      return res.status(400).json({ error: "Form deadline has passed" });
    }
    
    // Check if login required
    if (form.settings.requireLogin && !req.headers.authorization) {
      return res.status(401).json({ error: "Login required to submit this form" });
    }
    
    // Check for duplicate submissions (only if user is logged in and form doesn't allow multiple responses)
    if (req.headers.authorization && !form.settings.allowMultipleResponses) {
      const token = req.headers.authorization.replace("Bearer ", "");
      try {
        // Decode token to get username
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        const username = decoded.username;
        
        // Check if this user has already submitted
        const existingResponse = await FormResponse.findOne({
          formId: req.params.id,
          respondentUsername: username
        });
        
        if (existingResponse) {
          return res.status(409).json({ 
            error: "You have already submitted this form. Multiple submissions are not allowed." 
          });
        }
      } catch (jwtErr) {
        console.log("Could not verify token for duplicate check:", jwtErr.message);
        // If token is invalid, allow submission anyway
      }
    }
    
    const { answers, respondent, startTime } = req.body;
    
    // Auto-grade if quiz mode
    let score = { total: 0, maxScore: 0, percentage: 0, autoGraded: false };
    const gradedAnswers = answers.map(answer => {
      const question = form.questions.find(q => q._id.toString() === answer.questionId);
      
      // Check if this is a gradable question
      const isGradable = form.settings.isQuiz && question && (
        question.correctAnswer !== undefined || 
        (question.enumerationAnswers && question.enumerationAnswers.length > 0) ||
        (question.matchingPairs && question.matchingPairs.length > 0)
      );
      
      if (isGradable) {
        // Add to max score for all quiz questions
        score.maxScore += question.points || 0;
        
        let isCorrect = false;
        let pointsAwarded = 0;
        let partialCredit = 0;
        
        // Original Question Types
        if (question.type === "multiple_choice" || question.type === "dropdown") {
          isCorrect = answer.answer === question.correctAnswer;
          pointsAwarded = isCorrect ? (question.points || 0) : 0;
        } else if (question.type === "checkboxes") {
          const correct = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
          const studentAnswer = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
          isCorrect = JSON.stringify(correct.sort()) === JSON.stringify(studentAnswer.sort());
          pointsAwarded = isCorrect ? (question.points || 0) : 0;
        }
        
        // Philippine Question Types
        else if (question.type === "true_false") {
          // Case-insensitive comparison for True/False
          isCorrect = answer.answer.toLowerCase() === question.correctAnswer.toLowerCase();
          pointsAwarded = isCorrect ? (question.points || 0) : 0;
        }
        else if (question.type === "identification") {
          // Case-insensitive trim comparison for identification
          const studentAns = (answer.answer || '').toString().trim().toLowerCase();
          const correctAns = (question.correctAnswer || '').toString().trim().toLowerCase();
          isCorrect = studentAns === correctAns;
          pointsAwarded = isCorrect ? (question.points || 0) : 0;
        }
        else if (question.type === "enumeration") {
          // Check if student enumerated correct items
          if (question.enumerationAnswers && question.enumerationAnswers.length > 0) {
            const studentAnswers = Array.isArray(answer.answer) 
              ? answer.answer.map(a => a.trim().toLowerCase()) 
              : answer.answer.split(',').map(a => a.trim().toLowerCase());
            const correctAnswers = question.enumerationAnswers.map(a => a.trim().toLowerCase());
            
            // Count how many correct answers student got
            const correctCount = studentAnswers.filter(a => correctAnswers.includes(a)).length;
            
            // Award partial credit
            partialCredit = correctAnswers.length > 0 
              ? correctCount / correctAnswers.length 
              : 0;
            
            isCorrect = partialCredit === 1; // Full credit only if all correct
            pointsAwarded = (question.points || 0) * partialCredit;
          }
        }
        else if (question.type === "matching_type") {
          // Check if all pairs are correctly matched
          if (question.matchingPairs && question.matchingPairs.length > 0) {
            const studentMatches = Array.isArray(answer.answer) ? answer.answer : [];
            const correctPairs = question.matchingPairs;
            
            let correctCount = 0;
            correctPairs.forEach((pair, idx) => {
              if (studentMatches[idx] === pair.right) {
                correctCount++;
              }
            });
            
            // Award partial credit
            partialCredit = correctPairs.length > 0 
              ? correctCount / correctPairs.length 
              : 0;
            
            isCorrect = partialCredit === 1; // Full credit only if all correct
            pointsAwarded = (question.points || 0) * partialCredit;
          }
        }
        
        // Add points to total score
        score.total += pointsAwarded;
        
        // Return graded answer with all info
        return {
          ...answer,
          isCorrect,
          pointsAwarded,
          partialCredit: partialCredit > 0 ? partialCredit : undefined,
        };
      }
      
      return answer;
    });
    
    if (form.settings.isQuiz) {
      score.percentage = score.maxScore > 0 ? (score.total / score.maxScore) * 100 : 0;
      score.autoGraded = form.settings.autoGrade;
    }
    
    const response = new FormResponse({
      formId: req.params.id,
      respondent,
      answers: gradedAnswers,
      score,
      submittedAt: new Date(),
      startTime: startTime ? new Date(startTime) : new Date(),
      completionTime: startTime ? Math.floor((Date.now() - new Date(startTime).getTime()) / 1000) : 0,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      status: form.settings.autoGrade ? "graded" : "submitted",
    });
    
    await response.save();
    
    // Update response count
    form.responseCount += 1;
    await form.save();
    
    res.status(201).json({
      message: form.settings.confirmationMessage,
      responseId: response._id,
      score: form.settings.showCorrectAnswers ? score : undefined,
    });
  } catch (err) {
    console.error("Submit response error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all responses for a form
router.get("/:id/responses", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { username } = req.user;
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    
    if (form.owner !== username && !form.collaborators.includes(username)) {
      return res.status(403).json({ error: "Not authorized to view responses" });
    }
    
    const responses = await FormResponse.find({ formId: req.params.id }).sort({ submittedAt: -1 });
    res.json(responses);
  } catch (err) {
    console.error("Get responses error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get response analytics/summary
router.get("/:id/analytics", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { username } = req.user;
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    
    if (form.owner !== username && !form.collaborators.includes(username)) {
      return res.status(403).json({ error: "Not authorized to view analytics" });
    }
    
    const responses = await FormResponse.find({ formId: req.params.id });
    
    // Build analytics
    const analytics = {
      totalResponses: responses.length,
      averageCompletionTime: responses.reduce((sum, r) => sum + (r.completionTime || 0), 0) / responses.length || 0,
      questionAnalytics: [],
    };
    
    // Analyze each question
    form.questions.forEach(question => {
      const questionResponses = responses.map(r => 
        r.answers.find(a => a.questionId === question._id.toString())
      ).filter(Boolean);
      
      const analysis = {
        questionId: question._id,
        questionTitle: question.title,
        questionType: question.type,
        totalAnswers: questionResponses.length,
        answers: {},
      };
      
      if (question.type === "multiple_choice" || question.type === "dropdown" || question.type === "checkboxes") {
        // Count each option
        questionResponses.forEach(qr => {
          const answers = Array.isArray(qr.answer) ? qr.answer : [qr.answer];
          answers.forEach(ans => {
            analysis.answers[ans] = (analysis.answers[ans] || 0) + 1;
          });
        });
      } else if (question.type === "linear_scale") {
        // Calculate average
        const sum = questionResponses.reduce((s, qr) => s + Number(qr.answer || 0), 0);
        analysis.average = sum / questionResponses.length || 0;
        analysis.answers = questionResponses.reduce((acc, qr) => {
          acc[qr.answer] = (acc[qr.answer] || 0) + 1;
          return acc;
        }, {});
      } else {
        // Text responses
        analysis.responses = questionResponses.map(qr => qr.answer);
      }
      
      // Quiz analytics
      if (form.settings.isQuiz && question.correctAnswer !== undefined) {
        const correct = questionResponses.filter(qr => qr.isCorrect).length;
        analysis.correctCount = correct;
        analysis.incorrectCount = questionResponses.length - correct;
        analysis.correctPercentage = (correct / questionResponses.length) * 100 || 0;
      }
      
      analytics.questionAnalytics.push(analysis);
    });
    
    // Quiz score analytics
    if (form.settings.isQuiz) {
      const scores = responses.map(r => r.score.percentage);
      analytics.quizAnalytics = {
        averageScore: scores.reduce((sum, s) => sum + s, 0) / scores.length || 0,
        highestScore: Math.max(...scores, 0),
        lowestScore: Math.min(...scores, 100),
        passRate: scores.filter(s => s >= 60).length / scores.length * 100 || 0,
      };
    }
    
    res.json(analytics);
  } catch (err) {
    console.error("Get analytics error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Export responses to CSV
router.get("/:id/export", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { username } = req.user;
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    
    if (form.owner !== username && !form.collaborators.includes(username)) {
      return res.status(403).json({ error: "Not authorized to export responses" });
    }
    
    const responses = await FormResponse.find({ formId: req.params.id }).sort({ submittedAt: 1 });
    
    // Build CSV
    let csv = "Timestamp,Respondent Name,Respondent Email";
    
    // Add question headers
    form.questions.forEach(q => {
      csv += `,"${q.title.replace(/"/g, '""')}"`;
    });
    
    if (form.settings.isQuiz) {
      csv += ",Score,Max Score,Percentage";
    }
    
    csv += "\n";
    
    // Add data rows
    responses.forEach(response => {
      const row = [
        new Date(response.submittedAt).toLocaleString(),
        response.respondent.name || "Anonymous",
        response.respondent.email || "N/A",
      ];
      
      // Add answers
      form.questions.forEach(q => {
        const answer = response.answers.find(a => a.questionId === q._id.toString());
        if (answer) {
          const answerText = Array.isArray(answer.answer) 
            ? answer.answer.join(", ") 
            : String(answer.answer || "");
          row.push(`"${answerText.replace(/"/g, '""')}"`);
        } else {
          row.push("");
        }
      });
      
      if (form.settings.isQuiz) {
        row.push(response.score.total, response.score.maxScore, response.score.percentage.toFixed(2));
      }
      
      csv += row.join(",") + "\n";
    });
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="form-responses-${form._id}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error("Export responses error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update response with manual grades
router.put("/:formId/responses/:responseId/grade", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { username } = req.user;
    const { formId, responseId } = req.params;
    const { manualScores, feedback, score } = req.body;
    
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    
    if (form.owner !== username && !form.collaborators.includes(username)) {
      return res.status(403).json({ error: "Not authorized to grade this form" });
    }
    
    const response = await FormResponse.findById(responseId);
    if (!response) {
      return res.status(404).json({ error: "Response not found" });
    }
    
    // Update manual scores in answers
    if (manualScores) {
      response.answers.forEach(answer => {
        if (manualScores[answer.questionId] !== undefined) {
          answer.manualScore = manualScores[answer.questionId];
        }
      });
    }
    
    // Update overall feedback and score
    if (feedback !== undefined) response.feedback = feedback;
    if (score !== undefined) {
      // Update score properly (it should be an object with total, maxScore, percentage)
      if (typeof score === 'object') {
        response.score = {
          total: score.total || response.score.total || 0,
          maxScore: score.maxScore || response.score.maxScore || 0,
          percentage: score.percentage || score,
          autoGraded: response.score.autoGraded || false
        };
      } else {
        // If score is just a number (percentage), update only the percentage
        response.score.percentage = score;
      }
    }
    response.status = "graded";
    
    await response.save();
    res.json({ message: "Grades saved successfully", response });
  } catch (err) {
    console.error("Grade response error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============== FORM REUSE ==============

// Copy/Send form to another class (or multiple classes)
router.post("/:id/send-to-class", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { username } = req.user;
    const { targetClasses, newDeadline } = req.body; // targetClasses can be single string or array
    
    if (!targetClasses || (Array.isArray(targetClasses) && targetClasses.length === 0)) {
      return res.status(400).json({ error: "Target class(es) required" });
    }
    
    // Get original form
    const originalForm = await Form.findById(req.params.id);
    if (!originalForm) {
      return res.status(404).json({ error: "Form not found" });
    }
    
    // Verify user owns the form
    if (originalForm.owner !== username && !originalForm.collaborators.includes(username)) {
      return res.status(403).json({ error: "You can only copy your own forms" });
    }
    
    // Normalize to array
    const classArray = Array.isArray(targetClasses) ? targetClasses : [targetClasses];
    
    const createdForms = [];
    
    // Create copy for each target class
    for (const targetClass of classArray) {
      const newForm = new Form({
        title: originalForm.title,
        description: originalForm.description,
        owner: username,
        className: targetClass,
        questions: originalForm.questions,
        sections: originalForm.sections,
        examHeader: originalForm.examHeader,
        settings: {
          ...originalForm.settings,
          deadline: newDeadline ? new Date(newDeadline) : originalForm.settings.deadline,
        },
        theme: originalForm.theme,
        status: "published", // Auto-publish when sent to class
      });
      
      await newForm.save();
      createdForms.push(newForm);
    }
    
    res.json({ 
      message: `Form sent to ${createdForms.length} class(es) successfully`,
      forms: createdForms
    });
  } catch (err) {
    console.error("Send to class error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
