import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema({
  lessonId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  type:        { type: String, enum: ['mcq', 'short_answer', 'coding'], required: true },
  prompt:      { type: String, required: true },
  options:     [String],
  answer:      { type: String },
  explanation: { type: String },
  difficulty:  { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
}, { timestamps: true });

exerciseSchema.index({ lessonId: 1 });

export default mongoose.model('LessonExercise', exerciseSchema);
