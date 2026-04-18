import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash:   { type: String, required: true },
  name:           { type: String, required: true, trim: true },
  role:           { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  status:         { type: String, enum: ['active', 'inactive'], default: 'active' },
  profilePicture: { type: String, default: null },
  isOnline:       { type: Boolean, default: false },
  lastSeen:       { type: Date, default: Date.now },
}, { timestamps: true });

userSchema.index({ role: 1 });
userSchema.index({ email: 1 });

export default mongoose.model('User', userSchema);
