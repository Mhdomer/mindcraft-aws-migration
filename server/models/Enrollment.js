import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
  completedModules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
  completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  overallProgress:  { type: Number, default: 0, min: 0, max: 100 },
}, { _id: false });

const enrollmentSchema = new mongoose.Schema({
  studentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrolledAt: { type: Date, default: Date.now },
  progress:   { type: progressSchema, default: () => ({}) },
}, { timestamps: true });

enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
enrollmentSchema.index({ courseId: 1 });

export default mongoose.model('Enrollment', enrollmentSchema);
