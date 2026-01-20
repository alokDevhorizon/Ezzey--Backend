const express = require('express');
const {
  generateTimetable,
  saveTimetable,
  getTimetableById,
  getTimetableByBatch,
  getTimetableByFaculty,
  generateSuggestionsForTimetable,
  deleteTimetable,
  getVisualTimetable,
  getAllTimetables,
  getTimetableList,
} = require('../controllers/timetableController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/generate', protect, authorize('admin', 'coordinator'), generateTimetable);
router.post('/save', protect, authorize('admin', 'coordinator'), saveTimetable);
router.get('/visual/:batchId', protect, getVisualTimetable);
router.post(
  '/suggestions',
  protect,
  authorize('admin', 'coordinator'),
  generateSuggestionsForTimetable
);
router.get('/', protect, getAllTimetables);
router.get('/list', protect, getTimetableList);
router.get('/:id', protect, getTimetableById);
router.get('/batch/:batchId', protect, getTimetableByBatch);
router.get('/faculty/:facultyId', protect, getTimetableByFaculty);
router.delete('/:id', protect, authorize('admin', 'coordinator'), deleteTimetable);

module.exports = router;