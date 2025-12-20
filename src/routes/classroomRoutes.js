const express = require('express');
const {
  createClassroom,
  getClassrooms,
  updateClassroom,
  deleteClassroom,
  bulkUploadClassrooms,
} = require('../controllers/classroomController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes (if any)

// Protected routes
router.get('/', protect, getClassrooms);
router.post('/', protect, authorize('admin', 'coordinator'), createClassroom);
router.post('/bulk-upload', protect, authorize('admin', 'coordinator'), bulkUploadClassrooms);
router.patch('/:id', protect, authorize('admin', 'coordinator'), updateClassroom);
router.delete('/:id', protect, authorize('admin', 'coordinator'), deleteClassroom);

module.exports = router;