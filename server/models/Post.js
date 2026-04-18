import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  authorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName:   { type: String },
  role:         { type: String, enum: ['student', 'teacher', 'admin'] },
  content:      { type: String, required: true },
  votes:        { type: Map, of: String, default: {} }, // userId -> 'upvote'|'downvote'
  score:        { type: Number, default: 0 },
  parentReplyId:{ type: mongoose.Schema.Types.ObjectId, default: null },
  editedAt:     { type: Date, default: null },
  isAccepted:   { type: Boolean, default: false },
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  title:            { type: String, required: true, trim: true, maxlength: 300 },
  content:          { type: String, required: true },
  authorId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName:       { type: String },
  role:             { type: String, enum: ['student', 'teacher', 'admin'] },
  isPinned:         { type: Boolean, default: false },
  isLocked:         { type: Boolean, default: false },
  reactions:        { type: Map, of: String, default: {} }, // userId -> emoji
  votes:            { type: Map, of: String, default: {} }, // userId -> 'upvote'|'downvote'
  score:            { type: Number, default: 0 },
  tags:             [String],
  images:           [String],
  videos:           [String],
  resolutionStatus: { type: String, enum: ['unanswered', 'in_progress', 'solved'], default: 'unanswered' },
  acceptedReplyId:  { type: mongoose.Schema.Types.ObjectId, default: null },
  context:          { type: mongoose.Schema.Types.Mixed, default: null },
  replies:          [replySchema],
  postType:         { type: String, enum: ['text', 'poll'], default: 'text' },
  pollOptions:      [String],
  nsfw:             { type: Boolean, default: false },
  flair:            { type: String, default: null },
  isExamRelevant:   { type: Boolean, default: false },
  isInKnowledgeBase:{ type: Boolean, default: false },
  searchTokens:     [String],
  searchBigrams:    [String],
}, { timestamps: true });

postSchema.index({ createdAt: -1 });
postSchema.index({ isPinned: -1, createdAt: -1 });
postSchema.index({ searchTokens: 1 });
postSchema.index({ authorId: 1 });

export default mongoose.model('Post', postSchema);
