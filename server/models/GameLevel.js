import mongoose from 'mongoose';

const paletteItemSchema = new mongoose.Schema({
  id:    { type: String },
  label: { type: String },
  type:  { type: String },
}, { _id: false });

const gameLevelSchema = new mongoose.Schema({
  title:         { type: String, required: true, trim: true },
  description:   { type: String, default: '' },
  type:          { type: String, enum: ['puzzle', 'drag-drop', 'code-preview'], default: 'puzzle' },
  topic:         { type: String, default: '' },
  instructions:  { type: String, default: '' },
  difficulty:    { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
  points:        { type: Number, default: 50 },
  estimatedTime: { type: String, default: '3 min' },
  published:     { type: Boolean, default: true },
  createdBy:     { type: String, default: null }, // stores user _id as string
  order:         { type: Number, default: 0 },

  // Puzzle game data
  puzzle: {
    parts:        { type: [String], default: undefined },
    correctOrder: { type: [Number], default: undefined },
  },

  // Drag-drop game data
  dragDrop: {
    goal:     { type: String, default: '' },
    palette:  { type: [paletteItemSchema], default: undefined },
    solution: { type: [String], default: undefined },
  },

  // Code-preview game data
  codePreview: {
    table:         { type: String, default: '' },
    sampleData:    { type: [mongoose.Schema.Types.Mixed], default: undefined },
    expectedQuery: { type: String, default: '' },
    hint:          { type: String, default: '' },
  },
}, { timestamps: true });

export default mongoose.model('GameLevel', gameLevelSchema);
