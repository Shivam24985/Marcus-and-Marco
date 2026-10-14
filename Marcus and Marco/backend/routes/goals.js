const express = require('express');
const router = express.Router();
const { getGoals, getGoal, createGoal, updateGoal, deleteGoal, recalculateProgress } = require('../controllers/goalController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getGoals)
  .post(createGoal);

router.route('/:id')
  .get(getGoal)
  .put(updateGoal)
  .delete(deleteGoal);

router.put('/:id/recalculate', recalculateProgress);

module.exports = router;
