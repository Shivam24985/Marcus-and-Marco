const express = require('express');
const router = express.Router();
const {
  getPageByDate,
  savePage,
  addDailyGoal,
  updateDailyGoal,
  deleteDailyGoal
} = require('../controllers/notebookController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getPageByDate)
  .put(savePage);

router.post('/daily-goals', addDailyGoal);
router.route('/daily-goals/:goalId')
  .put(updateDailyGoal)
  .delete(deleteDailyGoal);

module.exports = router;
