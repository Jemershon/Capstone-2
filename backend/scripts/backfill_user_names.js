import mongoose from 'mongoose';
import User from '../models/User.js';
import Comment from '../models/Comment.js';
import Reaction from '../models/Reaction.js';
import Notification from '../models/Notification.js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/classroom';

// Announcement schema (since it's defined in server.js)
const AnnouncementSchema = new mongoose.Schema(
  {
    teacher: String,
    teacherName: String,
    class: String,
    date: Date,
    message: String,
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },
    materialRef: { type: mongoose.Schema.Types.Mixed },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
    likes: { type: Number, default: 0 },
    attachments: [{
      filename: String,
      originalName: String,
      filePath: String,
      fileSize: Number,
      mimeType: String
    }]
  },
  { timestamps: true }
);

async function backfillUserNames() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Register the Announcement model
    const Announcement = mongoose.model('Announcement', AnnouncementSchema);

    // Get all users to create a username -> name mapping
    console.log('📋 Fetching all users...');
    const users = await User.find({}, 'username name').lean();
    const userMap = {};
    users.forEach(user => {
      userMap[user.username] = user.name || user.username;
    });
    console.log(`📊 Found ${users.length} users`);

    // Update Comments
    console.log('💬 Updating comments...');
    const comments = await Comment.find({ authorName: { $exists: false } });
    let commentsUpdated = 0;
    for (const comment of comments) {
      const authorName = userMap[comment.author] || comment.author;
      await Comment.findByIdAndUpdate(comment._id, { authorName });
      commentsUpdated++;
    }
    console.log(`✅ Updated ${commentsUpdated} comments`);

    // Update Reactions
    console.log('👍 Updating reactions...');
    const reactions = await Reaction.find({ userName: { $exists: false } });
    let reactionsUpdated = 0;
    for (const reaction of reactions) {
      const userName = userMap[reaction.username] || reaction.username;
      await Reaction.findByIdAndUpdate(reaction._id, { userName });
      reactionsUpdated++;
    }
    console.log(`✅ Updated ${reactionsUpdated} reactions`);

    // Update Notifications
    console.log('🔔 Updating notifications...');
    const notifications = await Notification.find({ senderName: { $exists: false } });
    let notificationsUpdated = 0;
    for (const notification of notifications) {
      const senderName = userMap[notification.sender] || notification.sender;
      await Notification.findByIdAndUpdate(notification._id, { senderName });
      notificationsUpdated++;
    }
    console.log(`✅ Updated ${notificationsUpdated} notifications`);

    // Update Announcements
    console.log('📢 Updating announcements...');
    const announcements = await Announcement.find({ teacherName: { $exists: false } });
    let announcementsUpdated = 0;
    for (const announcement of announcements) {
      const teacherName = userMap[announcement.teacher] || announcement.teacher;
      await Announcement.findByIdAndUpdate(announcement._id, { teacherName });
      announcementsUpdated++;
    }
    console.log(`✅ Updated ${announcementsUpdated} announcements`);

    console.log('\n🎉 Backfill completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Comments: ${commentsUpdated}`);
    console.log(`   - Reactions: ${reactionsUpdated}`);
    console.log(`   - Notifications: ${notificationsUpdated}`);
    console.log(`   - Announcements: ${announcementsUpdated}`);

  } catch (error) {
    console.error('❌ Error during backfill:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the backfill
backfillUserNames();