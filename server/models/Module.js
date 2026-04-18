import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  order:    { type: Number, default: 0 },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lessons:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
}, { timestamps: true });

moduleSchema.index({ courseId: 1, order: 1 });

export default mongoose.model('Module', moduleSchema);
