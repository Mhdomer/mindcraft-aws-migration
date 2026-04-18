import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  type:        { type: String, enum: ['mcq', 'short_answer', 'coding'] },
  prompt:      { type: String },
  options:     [String],
  answer:      { type: String },
  explanation: { type: String },
  points:      { type: Number, default: 1 },
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title:      { type: String, required: true, trim: true },
  description:{ type: String, default: '' },
  questions:  [questionSchema],
  status:     { type: String, enum: ['draft', 'published'], default: 'draft' },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

assessmentSchema.index({ courseId: 1 });

export default mongoose.model('Assessment', assessmentSchema);
