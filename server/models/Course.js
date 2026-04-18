import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status:      { type: String, enum: ['draft', 'published'], default: 'draft' },
  modules:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName:  { type: String },
  authorEmail: { type: String },
}, { timestamps: true });

courseSchema.index({ createdBy: 1 });
courseSchema.index({ status: 1 });

export default mongoose.model('Course', courseSchema);
