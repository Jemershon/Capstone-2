# 📧 Email Setup Guide - Prevent Spam & Ensure Delivery

## Why Emails Go to Spam & How to Prevent It

Emails can be marked as spam due to:
1. ❌ No email authentication (SPF, DKIM, DMARC)
2. ❌ Poor sender reputation
3. ❌ Missing plain-text version
4. ❌ Suspicious content/formatting
5. ❌ No unsubscribe option
6. ❌ "From" address doesn't match domain

---

## ✅ What We Implemented (Anti-Spam Best Practices)

### 1. **Proper Email Structure**
- ✅ **Plain text version** - Required by spam filters
- ✅ **HTML table-based layout** - Best compatibility
- ✅ **Proper DOCTYPE and meta tags**
- ✅ **Alt text for images** (if used)
- ✅ **Clear unsubscribe reason** in footer

### 2. **Email Headers**
- ✅ **Priority headers** - Marks as important
- ✅ **From name** - "CCS Goals Classroom" (recognizable)
- ✅ **Reply-To** - Allows responses
- ✅ **Subject line** - Clear, includes emoji 📢

### 3. **Content Best Practices**
- ✅ **HTML escaping** - Prevents broken emails
- ✅ **Responsive design** - Works on mobile
- ✅ **Clear CTA button** - Easy to click
- ✅ **Professional branding** - School colors
- ✅ **No spam trigger words** - Avoided "FREE", "URGENT", etc.

### 4. **SendGrid Features**
- ✅ **Click tracking** - Improves sender reputation
- ✅ **Open tracking** - Shows engagement
- ✅ **Categories** - Organizes emails
- ✅ **Custom args** - For analytics

### 5. **User Experience**
- ✅ **Clear sender** - "CCS Goals Classroom"
- ✅ **Context in footer** - Why they're receiving this
- ✅ **Direct link** - View in Stream button
- ✅ **No suspicious links** - Only your domain

---

## 🔧 SendGrid Setup (CRITICAL for Deliverability)

### Step 1: Get SendGrid API Key
1. Go to https://app.sendgrid.com
2. Sign up for free (100 emails/day)
3. Go to Settings → API Keys
4. Create new API key with "Full Access"
5. Copy the key (starts with "SG.")

### Step 2: Verify Your Domain (MOST IMPORTANT!)
**This is crucial to avoid spam!**

1. Go to Settings → Sender Authentication
2. Click "Authenticate Your Domain"
3. Choose your DNS host (Namecheap, GoDaddy, etc.)
4. Add these DNS records:

```
Type: TXT
Host: em1234.ccsgoals.me
Value: v=spf1 include:sendgrid.net ~all

Type: CNAME
Host: s1._domainkey.ccsgoals.me
Value: s1.domainkey.u12345.wl123.sendgrid.net

Type: CNAME
Host: s2._domainkey.ccsgoals.me
Value: s2.domainkey.u12345.wl123.sendgrid.net
```

**Note:** SendGrid will give you the exact values. Add them to your domain registrar.

5. Wait 24-48 hours for verification
6. Check status in SendGrid dashboard

### Step 3: Set Up Sender Identity
1. Go to Settings → Sender Authentication → Single Sender Verification
2. Add your email: `no-reply@ccsgoals.me`
3. Verify the email address
4. Use this exact email in your code

### Step 4: Add Environment Variables to Render
1. Go to Render dashboard → Your backend service
2. Click "Environment" tab
3. Add these variables:

```bash
SENDGRID_API_KEY=SG.your_actual_key_here
EMAIL_USER=no-reply@ccsgoals.me
FRONTEND_URL=https://ccsgoals.me
```

4. Click "Save Changes"
5. Render will auto-redeploy

---

## 🎯 Email Deliverability Checklist

### Before Going Live:
- [ ] SendGrid account created
- [ ] API key generated and added to Render
- [ ] Domain authenticated (SPF, DKIM records added)
- [ ] Sender email verified
- [ ] Test email sent successfully
- [ ] Check Gmail inbox (not spam)
- [ ] Check spam score at mail-tester.com

### Testing Email Deliverability:
1. Send a test announcement
2. Check recipient's inbox
3. Look for email headers (Gmail: Show Original)
4. Verify SPF, DKIM pass
5. Check sender reputation

### If Emails Go to Spam:
1. **Check domain authentication** - Most common issue
2. **Verify sender email** - Must match domain
3. **Wait 2-3 days** - New domains need reputation
4. **Send consistently** - Don't send in bursts
5. **Monitor bounce rate** - Keep under 5%

---

## 📊 SendGrid Free Tier Limits

| Feature | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Emails/day | 100 | Unlimited |
| Contacts | 2,000 | Unlimited |
| Domain Auth | ✅ Yes | ✅ Yes |
| Analytics | ✅ Basic | ✅ Advanced |
| Support | Email | Priority |

**For a school:** Free tier is enough to start. If you have 100+ students, consider upgrading.

---

## 🔍 How to Test Email Spam Score

### Method 1: Mail-Tester
1. Send a test announcement to: test-xxxxx@mail-tester.com
2. Go to https://mail-tester.com
3. Check your score (aim for 8/10+)
4. Follow recommendations

### Method 2: Gmail
1. Send announcement to your Gmail
2. Click "Show original" (⋮ menu)
3. Look for:
   - ✅ SPF: PASS
   - ✅ DKIM: PASS
   - ✅ DMARC: PASS

---

## 📈 Improving Sender Reputation

### Do's:
- ✅ Send regular, expected emails
- ✅ Have clear "from" name
- ✅ Include physical address (optional)
- ✅ Monitor bounce/complaint rates
- ✅ Clean invalid emails from list

### Don'ts:
- ❌ Buy email lists
- ❌ Send to unengaged users
- ❌ Use misleading subject lines
- ❌ Hide unsubscribe link
- ❌ Send too frequently

---

## 🚨 Troubleshooting Common Issues

### Issue 1: "Email not delivered"
**Solution:**
- Check SendGrid activity feed
- Verify email address is valid
- Check bounce/block list

### Issue 2: "Goes to spam folder"
**Solution:**
- Authenticate domain (SPF/DKIM)
- Ask students to mark as "Not Spam"
- Check spam score at mail-tester.com

### Issue 3: "SendGrid API key error"
**Solution:**
- Verify key starts with "SG."
- Check key permissions (Full Access)
- Regenerate if compromised

### Issue 4: "Slow delivery"
**Solution:**
- Normal: 1-5 minutes
- Check SendGrid status page
- Upgrade plan if needed

---

## 📧 Alternative: Using School Email Server

If you want to use your school's SMTP server instead of SendGrid:

```javascript
// Use nodemailer instead of SendGrid
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.yourschool.edu',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
```

**Pros:** No third-party, school branding
**Cons:** May have stricter limits, harder to set up

---

## ✅ Final Checklist for Production

Before deploying email notifications:

1. [ ] SendGrid API key configured
2. [ ] Domain authenticated (SPF/DKIM)
3. [ ] Sender email verified
4. [ ] Test announcement sent
5. [ ] Email appears in inbox (not spam)
6. [ ] Headers show SPF/DKIM PASS
7. [ ] Environment variables set on Render
8. [ ] Code pushed to GitHub
9. [ ] Render deployed successfully
10. [ ] Monitoring set up (SendGrid dashboard)

---

## 📊 Monitoring Email Performance

After launching, monitor:
- **Delivery rate** - Should be 95%+
- **Open rate** - Should be 30-50%
- **Click rate** - Should be 10-20%
- **Bounce rate** - Should be <5%
- **Spam complaints** - Should be <0.1%

Access these metrics in SendGrid dashboard.

---

## 🎉 You're All Set!

With proper SendGrid configuration, your emails will:
- ✅ Land in inbox (not spam)
- ✅ Display properly on all devices
- ✅ Load instantly
- ✅ Track engagement
- ✅ Maintain professional appearance

**Students will never miss important announcements!** 📧
