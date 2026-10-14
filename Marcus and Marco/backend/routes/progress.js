const express = require('express');
const router = express.Router();
const { getProgressAnalytics, resetBaseline } = require('../controllers/progressController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getProgressAnalytics);
router.post('/reset-baseline', protect, resetBaseline);

module.exports = router;
