const express = require('express');
const router = express.Router();
const { getSessions, createSession, deleteSession, getSessionSummary } = require('../controllers/studySessionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/summary', getSessionSummary);

router.route('/')
  .get(getSessions)
  .post(createSession);

router.route('/:id')
  .delete(deleteSession);

module.exports = router;
