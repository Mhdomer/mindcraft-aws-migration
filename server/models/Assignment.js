import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  courseId:             { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title:                { type: String, required: true, trim: true },
  description:          { type: String, default: '' },
  deadline:             { type: Date },
  status:               { type: String, enum: ['draft', 'published'], default: 'draft' },
  createdBy:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  allowLateSubmissions: { type: Boolean, default: false },
}, { timestamps: true });

assignmentSchema.index({ courseId: 1 });
assignmentSchema.index({ createdBy: 1 });

export default mongoose.model('Assignment', assignmentSchema);
