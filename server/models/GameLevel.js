import mongoose from 'mongoose';

const gameLevelSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  content:     { type: mongoose.Schema.Types.Mixed, default: {} },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('GameLevel', gameLevelSchema);
