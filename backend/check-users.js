import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function checkUsers() {
  try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://<your-production-uri>');
    const users = await User.find({}, 'username email role');
    console.log('Users in database:');
    console.log('Total users:', users.length);
    users.forEach(user => {
      console.log(`- ${user.username}: ${user.email || 'no email'} (${user.role})`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkUsers();