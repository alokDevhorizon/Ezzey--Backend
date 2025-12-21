const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  createSubject,
  getSubjects,
  updateSubject,
  deleteSubject,
  uploadSubjects,
} = require('../controllers/subjectController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'subjects-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.csv'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx and .csv files are allowed'), false);
    }
  },
});

const router = express.Router();

router.get('/', protect, getSubjects);
router.post('/', protect, authorize('admin', 'coordinator'), createSubject);
router.post('/upload', protect, authorize('admin', 'coordinator'), upload.single('file'), uploadSubjects);
router.patch('/:id', protect, authorize('admin', 'coordinator'), updateSubject);
router.delete('/:id', protect, authorize('admin', 'coordinator'), deleteSubject);

module.exports = router;