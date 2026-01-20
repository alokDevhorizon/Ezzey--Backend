const express = require('express');
const {
  createBatch,
  getBatches,
  updateBatch,
  deleteBatch,
  seedFullBatch
} = require('../controllers/batchController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getBatches);
router.post('/', protect, authorize('admin', 'coordinator'), createBatch);
// SEED ROUTE (Dev Only)
router.get('/seed-full', seedFullBatch);

router.patch('/:id', protect, authorize('admin', 'coordinator'), updateBatch);
router.delete('/:id', protect, authorize('admin', 'coordinator'), deleteBatch);

module.exports = router;