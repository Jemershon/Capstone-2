import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  teacher: { type: String, required: true },
  teacherName: { type: String },
  class: { type: String, required: true },
  date: { type: Date, default: Date.now },
  message: { type: String, required: true },
  attachments: { type: Array, default: [] },
  materialRef: { type: mongoose.Schema.Types.Mixed },
  examId: mongoose.Schema.Types.ObjectId,
  // Optional topic reference for organizing announcements into topics/folders
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },
  createdAt: { type: Date, default: Date.now }
});

const AnnouncementModel = mongoose.models && mongoose.models.Announcement
  ? mongoose.models.Announcement
  : mongoose.model("Announcement", announcementSchema);

export default AnnouncementModel;
