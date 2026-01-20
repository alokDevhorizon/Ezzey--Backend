const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a batch name'],
      trim: true,
    },
    course: {
      type: String,
      required: [true, 'Please provide a course/degree (e.g., B.Tech, BCA)'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Please provide a batch code'],
      unique: true,
      uppercase: true,
    },
    semester: {
      type: Number,
      required: [true, 'Please provide semester'],
      min: 1,
      max: 8,
    },
    subjects: [
      {
        subject: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Subject',
          required: true,
        },
        faculty: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Faculty',
          required: true,
        },
        isElective: {
          type: Boolean,
          default: false,
        },
      },
    ],
    strength: {
      type: Number,
      required: [true, 'Please provide batch strength'],
      min: 1,
    },
    department: {
      type: String,
      required: [true, 'Please provide department'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Batch', batchSchema);