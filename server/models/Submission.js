import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  studentId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName:     { type: String },
  studentEmail:    { type: String },
  // One of assignmentId or assessmentId must be set
  assignmentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', default: null },
  assessmentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', default: null },
  content:         { type: String, default: '' },
  submittedAt:     { type: Date, default: Date.now },
  grade:           { type: Number, default: null },
  draftGrade:      { type: Number, default: null },
  feedback:        { type: String, default: null },
  draftFeedback:   { type: String, default: null },
  lastSavedAt:     { type: Date, default: null },
  gradedAt:        { type: Date, default: null },
  gradedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  feedbackReleased:{ type: Boolean, default: false },
  allowRegrading:  { type: Boolean, default: true },
}, { timestamps: true });

submissionSchema.index({ studentId: 1, assignmentId: 1 });
submissionSchema.index({ studentId: 1, assessmentId: 1 });
submissionSchema.index({ assignmentId: 1 });
submissionSchema.index({ assessmentId: 1 });

export default mongoose.model('Submission', submissionSchema);
