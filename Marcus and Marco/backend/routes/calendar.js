const express = require('express');
const router = express.Router();
const { getCalendarData, getDateTasks } = require('../controllers/calendarController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getCalendarData);
router.get('/date', getDateTasks);

module.exports = router;
