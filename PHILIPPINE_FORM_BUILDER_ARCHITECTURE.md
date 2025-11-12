# Philippine Form Builder - Visual Architecture

## Component Hierarchy

```
FormBuilder Component
│
├── Form Settings Card
│   ├── Form Name
│   ├── Form Type (Quiz/Survey)
│   ├── Philippine Style Toggle ← KEY TOGGLE
│   └── Other Settings
│
├── Sections Card (When Philippine Style Enabled)
│   ├── Part I: Multiple Choice [2 pts each] ✏️ 🗑️
│   ├── Part II: Identification [1 pt each] ✏️ 🗑️
│   └── Part III: Essay [5 pts each] ✏️ 🗑️
│
└── Questions Card ← MAJOR IMPROVEMENT
    │
    ├── IF usePhilippineStyle && sections.length > 0:
    │   │
    │   ├── Section Group 1
    │   │   ├── Section Header: "Part I: Multiple Choice [2 pts each]"
    │   │   │   (bordered left, indented, blue accent)
    │   │   │
    │   │   ├── Q1. Question Title
    │   │   │   └── Buttons: [Duplicate] [Edit] [Delete]
    │   │   │
    │   │   ├── Q2. Another Question
    │   │   │   └── Buttons: [Duplicate] [Edit] [Delete]
    │   │   │
    │   │   └── (If empty) ➕ Add Question to Part I
    │   │
    │   ├── Section Group 2
    │   │   ├── Section Header: "Part II: Identification [1 pt each]"
    │   │   │
    │   │   ├── Q3. Question
    │   │   │
    │   │   └── Q4. Question
    │   │
    │   ├── Section Group 3
    │   │   ├── Section Header: "Part III: Essay [5 pts each]"
    │   │   └── Q5. Question
    │   │
    │   └── Unassigned Questions (if any)
    │       ├── Q6. Question without section
    │       └── Q7. Another unassigned question
    │
    └── ELSE (traditional form):
        │
        ├── Q1. Question Title [Move↑] [Move↓] [Duplicate] [Edit] [Delete]
        ├── Q2. Question Title [Move↑] [Move↓] [Duplicate] [Edit] [Delete]
        ├── Q3. Question Title [Move↑] [Move↓] [Duplicate] [Edit] [Delete]
        └── Q4. Question Title [Move↑] [Move↓] [Duplicate] [Edit] [Delete]
```

---

## Data Flow Diagram

```
Teacher Interaction Flow (Philippine Style)
===========================================

1. CREATE SECTIONS
   └─→ User clicks "Add Section"
       └─→ Modal opens (Title, Instructions, Points)
           └─→ Section saved: { _id, title, instructions, pointsPerItem, order }

2. ADD QUESTIONS TO SECTION
   └─→ User clicks "➕ Add Question to [Section Name]"
       └─→ Modal opens with sectionId PRE-SELECTED
           └─→ Question saved: { type, title, sectionId, ... }

3. DISPLAY ORGANIZED
   └─→ Form renders in grouped view
       └─→ For each section:
           ├─→ Filter: questions where sectionId === section._id
           ├─→ Display under section header
           └─→ Show "Add Question" button if empty

4. MANAGE & ORGANIZE
   └─→ Questions can be:
       ├─→ Edited (change content, section assignment)
       ├─→ Duplicated (copies with same section)
       ├─→ Deleted (removed from form)
       └─→ Moved (edit to change section)
```

---

## State Management Flow

```
Form State Structure
===================

{
  form: {
    _id: "form123",
    title: "Biology Exam",
    settings: {
      usePhilippineStyle: true,      ← Controls which view to show
      isQuiz: true,
      ...
    },
    
    sections: [                       ← Array of section definitions
      {
        _id: "sec1" || order: 1,
        title: "Part I: Multiple Choice",
        instructions: "Select best answer",
        pointsPerItem: 2,
        order: 1
      },
      {
        _id: "sec2" || order: 2,
        title: "Part II: Identification",
        instructions: "Write the answer",
        pointsPerItem: 1,
        order: 2
      }
    ],
    
    questions: [                      ← Array of all questions
      {
        type: "multiple_choice",
        title: "What is ATP?",
        sectionId: "sec1",            ← Links to section
        options: [...],
        points: 2
      },
      {
        type: "identification",
        title: "Define osmosis",
        sectionId: "sec2",            ← Links to section
        points: 1
      },
      {
        type: "true_false",
        title: "Plants need water",
        sectionId: "",                ← No section = Unassigned
        points: 1
      }
    ]
  }
}
```

---

## Conditional Rendering Logic

```jsx
// Main Questions Display Logic
if (form.questions.length === 0) {
  // Show: "No questions yet"
  
} else if (form.settings.usePhilippineStyle && form.sections?.length > 0) {
  // Show: GROUPED VIEW
  form.sections.map(section => {
    const sectionQuestions = form.questions.filter(q => 
      q.sectionId === section._id
    );
    
    if (sectionQuestions.length === 0) {
      // Show: "No questions assigned"
      // Show: "➕ Add Question to [Section]"
    } else {
      // Show: Questions under section
      sectionQuestions.map(question => {
        // Display with question details
      });
    }
  });
  
  // Also show: Unassigned questions area
  
} else {
  // Show: TRADITIONAL FLAT LIST VIEW
  form.questions.map(question => {
    // Display with move up/down buttons
  });
}
```

---

## UI Components Used

```
FormBuilder Component
│
├── React Bootstrap Components:
│   ├── Card (outer containers)
│   ├── Card.Header (title bars)
│   ├── Card.Body (content)
│   ├── ListGroup (question lists)
│   ├── ListGroup.Item (individual items)
│   ├── Badge (points, required)
│   ├── Button (actions)
│   ├── Form.Select (section dropdown in modal)
│   ├── Form.Group (form fields)
│   └── Modal (edit dialogs)
│
├── Bootstrap CSS Classes:
│   ├── mb-4 (margin bottom spacing)
│   ├── border-start (left border)
│   ├── border-4 (thick border)
│   ├── border-primary (blue color)
│   ├── ps-3 (padding start/left)
│   ├── d-flex (flexbox display)
│   ├── gap-2 (spacing between flex items)
│   ├── fw-bold (font weight bold)
│   ├── text-muted (gray text)
│   └── py-2 (vertical padding)
│
└── Icons (Unicode):
    ├── ➕ (Add)
    ├── ✏️ (Edit)
    ├── 🗑️ (Delete)
    └── 📋 (Duplicate)
```

---

## Data Flow: Creating a Question in Section

```
User Flow
=========

1. User sees: "➕ Add Question to Part I: Multiple Choice"
            ↓
2. User clicks button
            ↓
3. onClick handler fires:
   {
     setCurrentQuestion({
       ...currentQuestion,
       sectionId: section._id  ← Pre-fill with section ID
     });
     setShowQuestionModal(true);
   }
            ↓
4. Modal opens with:
   - Question type selector
   - Title field
   - Description field
   - Section assignment: ALREADY SET TO "Part I"
   - Other question properties
            ↓
5. User fills in question details
            ↓
6. User clicks "Save Question"
            ↓
7. handleSaveQuestion() runs:
   - Adds question to form.questions array
   - sectionId already set
   - Form updates and re-renders
            ↓
8. UI automatically shows question under "Part I" section
   (no additional step needed)
```

---

## Comparison: Old vs New Workflow

### OLD WORKFLOW (Flat List)
```
Create Form
  ↓
Add Question #1
  ↓
Add Question #2
  ↓
Add Question #3
  ↓
Open Form Settings → Switch to Philippine Style
  ↓
Add Sections
  ↓
Edit Q1 → Assign to Section A
  ↓
Edit Q2 → Assign to Section B
  ↓
Edit Q3 → Assign to Section B
  ↓
Now see organized form
```

### NEW WORKFLOW (Grouped from Start)
```
Create Form → Enable Philippine Style
  ↓
Add Section A
  ↓
Add Section B
  ↓
Click "➕ Add Question to Section A"
  ↓
Create Q1 (auto-assigned)
  ↓
Click "➕ Add Question to Section A"
  ↓
Create Q2 (auto-assigned)
  ↓
Click "➕ Add Question to Section B"
  ↓
Create Q3 (auto-assigned)
  ↓
Form already organized!
```

---

## Key Differences in Code

### Question Numbering - GLOBAL (Not per section)
```jsx
{sectionQuestions.map(q => {
  const qIndex = form.questions.indexOf(q);  // Global index
  return <span>Q{qIndex + 1}.</span>;        // Q1, Q2, Q3... across all sections
})}
```

### Section Filtering
```jsx
const sectionQuestions = form.questions.filter(q => 
  q.sectionId === (section._id || section.order)  // Handles both _id and order
);
```

### Pre-selection Button
```jsx
onClick={() => {
  const newQuestion = {
    ...currentQuestion,
    sectionId: section._id || section.order  // Pre-fill sectionId
  };
  setCurrentQuestion(newQuestion);
  setShowQuestionModal(true);
}}
```

---

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Organization** | All questions in one list | Grouped by section |
| **Clarity** | Hard to see section-question relationship | Crystal clear visual hierarchy |
| **Speed** | Multi-step process to organize | One-click "Add to Section" |
| **Discoverability** | Where does this question go? | Obvious - it's under its section |
| **Completeness** | Easy to miss unassigned questions | Unassigned area highlights them |
| **Professional** | Generic list | Matches exam structure |
| **Scalability** | Hard with many questions | Scales well with grouped view |

---

## Browser Compatibility

✅ All modern browsers supported:
- Chrome/Edge (Chromium-based)
- Firefox
- Safari
- Mobile browsers

✅ Responsive design included:
- Desktop: Full section grouping visible
- Tablet: Responsive layout maintained
- Mobile: Vertical stacking of sections

---

## Accessibility Features

✅ Semantic HTML with proper elements
✅ Buttons have descriptive aria-labels
✅ Color not sole indicator (icons + text)
✅ Keyboard navigation supported
✅ Screen reader friendly structure
✅ Sufficient color contrast maintained
