const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a subject name'],
      trim: true,
    },
    course: {
      type: String,
      trim: true,
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
    },
    section: {
      type: String,
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Please provide a subject code'],
      unique: true,
      uppercase: true,
    },
    hoursPerWeek: {
      type: Number,
      required: [true, 'Please provide hours per week'],
      min: 1,
    },
    department: {
      type: String,
      required: [true, 'Please provide department'],
    },
    type: {
      type: String,
      enum: ['theory', 'lab', 'practical', 'seminar'],
      default: 'theory',
    },
    isElective: {
      type: Boolean,
      default: false,
    },
    prerequisites: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subject', subjectSchema);