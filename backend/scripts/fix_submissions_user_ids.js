/*
  Run this script to populate studentId in existing ExamSubmission documents
  and respondent.userId in FormResponse documents based on username matching.
  Usage: NODE_ENV=development node scripts/fix_submissions_user_ids.js
*/

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/User.js';
import fs from 'fs';

// Use the models defined in server if available, otherwise import here
import ExamSubmissionModel from '../server.js';

(async function run() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/mydb';
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB', uri);

    // Update ExamSubmissions
    const ExamSubmission = mongoose.model('ExamSubmission');
    const FormResponse = mongoose.model('FormResponse');

    const examSubs = await ExamSubmission.find({ studentId: { $in: [null, undefined] } }).limit(1000);
    console.log(`Found ${examSubs.length} exam submissions without studentId`);

    for (const sub of examSubs) {
      if (!sub.student) continue;
      const user = await User.findOne({ username: sub.student }).select('_id');
      if (user) {
        sub.studentId = user._id;
        await sub.save();
        console.log('Updated exam submission', sub._id.toString(), '-> studentId', user._id.toString());
      }
    }

    const formSubs = await FormResponse.find({ 'respondent.userId': { $in: [null, undefined] }, 'respondent.username': { $exists: true } }).limit(1000);
    console.log(`Found ${formSubs.length} form responses without respondent.userId`);

    for (const resp of formSubs) {
      const respondentUsername = resp.respondent?.username;
      if (!respondentUsername) continue;
      const user = await User.findOne({ username: respondentUsername }).select('_id');
      if (user) {
        resp.respondent.userId = user._id;
        await resp.save();
        console.log('Updated form response', resp._id.toString(), '-> respondent.userId', user._id.toString());
      }
    }

    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error('Error in migration script:', err);
    process.exit(1);
  }
})();
