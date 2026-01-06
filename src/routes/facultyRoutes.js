const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  createFaculty,
  getFaculties,
  updateFaculty,
  deleteFaculty,
  bulkUploadFaculties,
} = require('../controllers/facultyController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv' && ext !== '.xlsx' && ext !== '.xls') {
      return cb(new Error('Only CSV and Excel files are allowed'), false);
    }
    cb(null, true);
  },
});

router.get('/', protect, getFaculties);
router.post('/', protect, authorize('admin', 'coordinator'), createFaculty);
router.post('/bulk-upload', protect, authorize('admin', 'coordinator'), upload.single('file'), bulkUploadFaculties);
router.patch('/:id', protect, authorize('admin', 'coordinator'), updateFaculty);
router.delete('/:id', protect, authorize('admin', 'coordinator'), deleteFaculty);

module.exports = router;