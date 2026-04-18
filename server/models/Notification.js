import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:     { type: String, enum: ['risk_alert', 'feedback_released', 'custom'], required: true },
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  read:     { type: Boolean, default: false },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  itemId:   { type: mongoose.Schema.Types.ObjectId, default: null },
  guidance: { type: String, default: null },
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
