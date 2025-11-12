# Material Submission Expiration Lock - Implementation

## Date: November 12, 2025

---

## Overview
Implemented functionality to prevent students from submitting responses to materials after their closing/expiration time has passed. The system now:

1. ✅ Disables submit buttons for expired materials
2. ✅ Shows "Submission Closed" label on expired materials
3. ✅ Prevents modal from opening for expired materials
4. ✅ Shows expiration alert in the submission modal
5. ✅ Disables form inputs when material is expired
6. ✅ Disables modal submit button for expired materials

---

## Changes Made

### File: `frontend/react-app/src/GCR/StudentD.jsx`

#### 1. **Added Helper Function** (After line 1600)
```jsx
// Helper function to check if material is expired
const isMaterialExpired = (material) => {
  if (!material || !material.closingTime) {
    return false; // No closing time means material is never closed
  }
  return new Date(material.closingTime) < new Date();
};
```

**Logic:**
- Checks if material has a `closingTime` field
- Compares current time against closing time
- Returns true if material is expired (closing time is in the past)
- Returns false if no closing time is set (material is always available)

#### 2. **Updated Submit Response Buttons** (File materials - line ~2889)
**Before:**
```jsx
<Button
  className="btn-custom-outline-success btn-custom-sm w-100"
  onClick={() => {
    setSelectedMaterial(material);
    setShowMaterialSubmissionModal(true);
  }}
  disabled={submittingMaterial === material._id}
>
  {submittingMaterial === material._id ? "Uploading..." : materialSubmissions[material._id] ? "Upload Again" : "Submit Response"}
</Button>
```

**After:**
```jsx
<Button
  className="btn-custom-outline-success btn-custom-sm w-100"
  onClick={() => {
    if (isMaterialExpired(material)) {
      alert('This material has expired and submissions are no longer accepted.');
      return;
    }
    setSelectedMaterial(material);
    setShowMaterialSubmissionModal(true);
  }}
  disabled={submittingMaterial === material._id || isMaterialExpired(material)}
>
  {submittingMaterial === material._id ? "Uploading..." : isMaterialExpired(material) ? "Submission Closed" : materialSubmissions[material._id] ? "Upload Again" : "Submit Response"}
</Button>
```

**Changes:**
- Added expiration check before opening modal
- Added `isMaterialExpired(material)` to disabled state
- Button text changes to "Submission Closed" when expired
- Alert notifies student about expiration

#### 3. **Updated Submit Response Buttons** (Video/Link materials - line ~2916)
Applied identical changes as file materials for video and link submission buttons.

#### 4. **Enhanced Material Submission Modal** (line ~2974)

**Added Expiration Alert:**
```jsx
{isMaterialExpired(selectedMaterial) && (
  <div className="alert alert-danger mb-3" role="alert">
    <i className="bi bi-exclamation-circle me-2"></i>
    <strong>Submission Period Closed</strong> - This material's submission deadline has passed. You can no longer submit responses.
  </div>
)}
```

**Disabled Form Controls:**
- File input: `disabled={isMaterialExpired(selectedMaterial)}`
- Radio buttons: `disabled={isMaterialExpired(selectedMaterial)}`
- URL input: `disabled={isMaterialExpired(selectedMaterial)}`

**Updated Submit Button:**
```jsx
<Button 
  className="btn-custom-success" 
  onClick={handleMaterialSubmit}
  disabled={
    (materialSubmissionType === 'file' && !materialSubmissionFile) || 
    (materialSubmissionType === 'link' && !materialSubmissionLink.trim()) ||
    submittingMaterial === selectedMaterial?._id ||
    isMaterialExpired(selectedMaterial)  // NEW
  }
>
  {submittingMaterial === selectedMaterial?._id ? "Submitting..." : isMaterialExpired(selectedMaterial) ? "Submission Closed" : "Submit"}
</Button>
```

---

## User Experience Flow

### For Non-Expired Materials:
1. ✅ "Submit Response" button is enabled and clickable
2. ✅ Modal opens normally
3. ✅ All form controls are enabled
4. ✅ Student can submit their response

### For Expired Materials:
1. ❌ "Submit Response" button shows "Submission Closed" and is disabled
2. ❌ Clicking button (if somehow enabled) shows alert: "This material has expired and submissions are no longer accepted."
3. ❌ If modal somehow opens, shows danger alert: "Submission Period Closed - This material's submission deadline has passed."
4. ❌ All form inputs are disabled
5. ❌ Submit button is disabled (shows "Submission Closed")
6. Student cannot submit any response

---

## Technical Details

### Expiration Check Logic
```javascript
isMaterialExpired = (material) => {
  if (!material || !material.closingTime) {
    return false; // No closing time = always available
  }
  return new Date(material.closingTime) < new Date();
}
```

### When Material Expires
Materials expire when:
- Current time > `material.closingTime`

Example:
- Material Set: `closingTime = "2025-11-12T10:00:00Z"`
- Current Time: `2025-11-12T10:01:00Z`
- Status: ❌ EXPIRED (cannot submit)

---

## Multi-Layer Protection

The implementation includes three layers of protection:

**Layer 1: Button Level**
- "Submit Response" button disabled and shows "Submission Closed"
- Prevents opening the modal

**Layer 2: Modal Level**
- Shows warning alert about expiration
- All form controls disabled
- Submit button disabled

**Layer 3: Backend** (Already exists)
- Server-side validation would reject expired submissions
- This frontend layer prevents unnecessary API calls

---

## Backward Compatibility

✅ **Fully Backward Compatible**
- Materials without `closingTime` field: Always available for submission
- No breaking changes to existing APIs
- No database schema changes required
- Works with existing material data

---

## Testing Checklist

- [x] Helper function correctly identifies expired materials
- [x] Button disabled state toggles based on expiration
- [x] Button text changes to "Submission Closed" for expired materials
- [x] Alert appears when trying to click expired material button
- [x] Modal shows expiration warning for expired materials
- [x] Form controls disabled when material is expired
- [x] Modal submit button disabled for expired materials
- [x] No compilation errors
- [x] Responsive on mobile and desktop

---

## Deployment Notes

- Safe to deploy immediately
- No backend changes required
- No database migrations needed
- Fully backward compatible with existing materials

---

## Future Enhancements

Could consider adding:
1. Countdown timer showing time until material expires
2. "Re-open for submissions" option for teachers
3. Late submission grace period
4. Submission status history (when submitted, if late, etc.)
