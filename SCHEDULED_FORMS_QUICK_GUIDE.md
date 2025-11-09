# Scheduled Forms - Quick Reference Guide 🕐

## For Teachers

### How to Schedule a Form to Open Later

1. **Create your form** in the Forms section
2. Go to **Settings** → **General** tab
3. Fill in these fields:
   - **Open Date & Time**: When students can start accessing the form
   - **Close Date & Time**: When the form stops accepting responses
4. **Save** the form
5. **Publish** when ready

**Example:**
- Today is Wednesday
- Set Open Date: Friday, 8:00 AM
- Set Close Date: Friday, 10:00 AM
- Students can only take the exam between 8-10 AM on Friday

### Form States

| Status | What Students See |
|--------|-------------------|
| **Not Yet Open** | "⏰ Form will open on [date/time]" |
| **Open** | Form is accessible and can be filled out |
| **Closed** | "🔒 Form is no longer accepting responses" |

### Important Notes

✅ **Both dates are optional** - Leave blank for always-available forms  
✅ **Uses local timezone** - Time shows in your timezone  
✅ **Exact timing** - Form opens/closes at the exact minute you set  
✅ **Can be changed** - Edit scheduling anytime before publishing  

## For Students

### What You'll See

**Before the form opens:**
```
⏰ Form Not Yet Available
This form will open on:
Friday, November 15, 2025, 8:00 AM

Please check back at the scheduled time.
```

**After the form closes:**
```
🔒 Form Closed
This form is no longer accepting responses.
```

**When form is available:**
- You can fill out and submit the form normally

## Common Scenarios

### Scenario 1: Timed Exam
```
Teacher creates exam on Monday
Opens: Wednesday 2:00 PM
Closes: Wednesday 3:00 PM
→ 1-hour exam window
```

### Scenario 2: Weekend Assignment
```
Opens: Friday 5:00 PM
Closes: Sunday 11:59 PM
→ Students have the whole weekend
```

### Scenario 3: Multi-Day Survey
```
Opens: November 10, 8:00 AM
Closes: November 15, 5:00 PM
→ 5-day collection period
```

### Scenario 4: No Scheduling (Always Open)
```
Open Date: (empty)
Close Date: (empty)
→ Available immediately and stays open
```

## Where to Find Things

### Teachers:
- Create forms: **Forms** section (sidebar)
- Set schedule: Form Builder → **Settings** → **General** tab
- Old exam button: ❌ Removed from class stream (use Forms instead)

### Students:
- View forms: **Forms/Surveys** section
- Old exam section: ❌ Removed from class stream (use Forms instead)

## API Endpoints

For developers:

**Create/Update Form with Scheduling:**
```javascript
POST /api/forms
PUT /api/forms/:id

{
  // ... form data
  settings: {
    openAt: "2025-11-15T08:00:00Z",  // ISO string
    closeAt: "2025-11-15T17:00:00Z", // ISO string
    // ... other settings
  }
}
```

**Get Form (includes availability status):**
```javascript
GET /api/forms/:id

Response:
{
  // ... form data
  availabilityStatus: "not_yet_open" | "available" | "closed"
}
```

## Migration Guide

### Old Way (Exams):
1. Go to class stream
2. Click "+ Exam" button
3. Create exam inline
4. Exam appears immediately

### New Way (Forms):
1. Go to **Forms** section
2. Create form with full builder
3. Set **schedule** in settings
4. **Send to class** or share link
5. Form appears at scheduled time

## Tips & Best practices

✅ **Test the timing** - Create a test form and check the display  
✅ **Give notice** - Tell students when the form will open  
✅ **Set reminders** - Forms won't send notifications (yet)  
✅ **Check timezones** - Make sure you're using the correct local time  
✅ **Buffer time** - Add 5-10 minutes for students joining late  

## Troubleshooting

**Problem:** Students say form is not available yet  
**Solution:** Check the Open Date & Time - might be set in the future

**Problem:** Form closed too early  
**Solution:** Check Close Date & Time - might be set incorrectly

**Problem:** Can't find exam button in class stream  
**Solution:** Exam button removed - use Forms section instead

**Problem:** Students can't see my form  
**Solution:** Make sure you've "Send to Class" or shared the link

## Quick Command Reference

**Setting Open Time:**
```
Settings → General → Open Date & Time → Pick date/time
```

**Setting Close Time:**
```
Settings → General → Close Date & Time → Pick date/time
```

**Removing Schedule:**
```
Clear both date/time fields → Form stays always open
```

---

**Need Help?** Check the full documentation in `SCHEDULED_FORMS_FEATURE.md`
