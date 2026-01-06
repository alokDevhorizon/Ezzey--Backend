const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  createClassroom,
  getClassrooms,
  updateClassroom,
  deleteClassroom,
  bulkUploadClassrooms,
} = require('../controllers/classroomController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls and .csv files are allowed'), false);
    }
  },
});

// Public routes (if any)

// Protected routes
router.get('/', protect, getClassrooms);
router.post('/', protect, authorize('admin', 'coordinator'), createClassroom);
router.post('/bulk-upload', protect, authorize('admin', 'coordinator'), upload.single('file'), bulkUploadClassrooms);
router.patch('/:id', protect, authorize('admin', 'coordinator'), updateClassroom);
router.delete('/:id', protect, authorize('admin', 'coordinator'), deleteClassroom);

module.exports = router;