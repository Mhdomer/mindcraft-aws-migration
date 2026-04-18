import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
  type: { type: String },
  url:  { type: String },
  name: { type: String },
}, { _id: false });

const lessonSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  moduleId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
  contentHtml: { type: String, default: '' },
  materials:   [materialSchema],
  order:       { type: Number, default: 0 },
  aiGenerated: { type: Boolean, default: false },
}, { timestamps: true });

lessonSchema.index({ moduleId: 1, order: 1 });

export default mongoose.model('Lesson', lessonSchema);
