import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  type:          { type: String, enum: ['mcq', 'text', 'short_answer', 'coding'], default: 'mcq' },
  question:      { type: String },
  prompt:        { type: String },  // legacy alias
  options:       [String],
  correctAnswer: { type: mongoose.Schema.Types.Mixed },
  answer:        { type: String },  // legacy alias
  expectedType:  { type: String, enum: ['string', 'number'], default: 'string' },
  explanation:   { type: String },
  points:        { type: Number, default: 1 },
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  courseId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  courseTitle:        { type: String, default: '' },
  title:              { type: String, required: true, trim: true },
  description:        { type: String, default: '' },
  type:               { type: String, enum: ['quiz', 'assignment', 'exam', 'coding'], default: 'quiz' },
  questions:          [questionSchema],
  status:             { type: String, enum: ['draft', 'published'], default: 'draft' },
  timer:              { type: Number, default: null },
  startDate:          { type: Date, default: null },
  endDate:            { type: Date, default: null },
  attempts:           { type: Number, default: 1 },
  passingPercentage:  { type: Number, default: 40 },
  allowLateSubmission:{ type: Boolean, default: false },
  createdBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

assessmentSchema.index({ courseId: 1 });
assessmentSchema.index({ status: 1 });

export default mongoose.model('Assessment', assessmentSchema);
