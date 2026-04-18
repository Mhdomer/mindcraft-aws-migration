import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action:         { type: String, required: true },
  postId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  replyId:        { type: mongoose.Schema.Types.ObjectId, default: null },
  deletedContent: { type: String },
  deletedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason:         { type: String, default: null },
}, { timestamps: true });

auditLogSchema.index({ postId: 1 });
auditLogSchema.index({ deletedBy: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
