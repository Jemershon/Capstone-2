#!/usr/bin/env node
import axios from 'axios';

const BASE = process.env.BASE_URL || 'http://localhost:4000';
const client = axios.create({ baseURL: BASE, timeout: 10000 });

async function run() {
  try {
    console.log('1) Seeding database (creates teacher1/student1 and Math 101)');
    await client.post('/api/seed');
    console.log(' → Seed complete');

    // Login teacher and student (seed uses password 'password456')
    console.log('2) Logging in teacher and student');
    const teacherLogin = await client.post('/api/login', { username: 'teacher1', password: 'password456' });
    const studentLogin = await client.post('/api/login', { username: 'student1', password: 'password456' });
    const teacherToken = teacherLogin.data.token;
    const studentToken = studentLogin.data.token;
    console.log(' → Logged in: teacher1, student1');

    // Create a manual exam
    console.log('3) Creating a manual exam as teacher1');
    const examPayload = {
      title: 'SMOKE TEST - Manual Exam',
      description: 'Auto-created by smoke test',
      class: 'Math 101',
      questions: [
        { text: 'What is 5+5?', type: 'short', options: [], correctAnswer: '10' },
        { text: 'Select Paris', type: 'multiple', options: ['Paris','London','Berlin'], correctAnswer: 'Paris' }
      ],
      manualGrading: true
    };
    const createRes = await client.post('/api/exams', examPayload, { headers: { Authorization: `Bearer ${teacherToken}` } });
    const exam = createRes.data.exam;
    console.log(' → Exam created:', exam._id);

    // Student submits answers
    console.log('4) Student submits answers');
    const answers = [ { questionIndex: 0, answer: '10' }, { questionIndex: 1, answer: 'Paris' } ];
    const submitRes = await client.post(`/api/exams/${exam._id}/submit`, { answers }, { headers: { Authorization: `Bearer ${studentToken}` } });
    console.log(' → Submission response:', submitRes.data.message || submitRes.data);

    // Teacher fetches submissions for manual grading
    console.log('5) Teacher fetches submissions for manual exam');
    const subsRes = await client.get(`/api/exams/manual/${exam._id}/submissions`, { headers: { Authorization: `Bearer ${teacherToken}` } });
    const submissions = subsRes.data;
    if (!Array.isArray(submissions) || submissions.length === 0) {
      throw new Error('No submissions returned for manual exam');
    }
    const submission = submissions[0];
    console.log(` → Found submission ${submission._id} by ${submission.student}. Graded? ${submission.graded}`);

    // Teacher grades the submission
    console.log('6) Teacher assigns grade');
    const finalScore = 2; // full marks
    const feedback = 'Good work (smoke test)';
    await client.post(`/api/exams/manual/${exam._id}/submissions/${submission._id}/grade`, { finalScore, feedback }, { headers: { Authorization: `Bearer ${teacherToken}` } });
    console.log(' → Grade saved');

    // Verify submission shows graded
    const subsRes2 = await client.get(`/api/exams/manual/${exam._id}/submissions`, { headers: { Authorization: `Bearer ${teacherToken}` } });
    const updated = subsRes2.data.find(s => s._id === submission._id);
    if (!updated) throw new Error('Submission missing after grading');
    if (!updated.graded && typeof updated.finalScore !== 'number') {
      throw new Error('Submission not marked graded');
    }
    console.log(` → Submission ${updated._id} is graded: finalScore=${updated.finalScore}, feedback=${updated.feedback}`);

    console.log('SMOKE TEST PASSED');
    process.exit(0);
  } catch (err) {
    console.error('SMOKE TEST FAILED:', err.response?.data || err.message || err);
    process.exit(2);
  }
}

run();
