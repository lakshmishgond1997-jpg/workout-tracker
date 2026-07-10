import express from 'express';
import {
  searchByEmail,
  sendRequest,
  getRequests,
  respondToRequest,
  removeBuddy,
  getPrivacy,
  updatePrivacy,
  setNotifyPrs,
  getMyBuddies,
  getLeaderboard,
  getCompare,
  getBuddyProfile,
  getBuddyOverloadChart,
} from '../controllers/buddy.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/search', searchByEmail);
router.get('/requests', getRequests);
router.get('/leaderboard', getLeaderboard);
router.get('/', getMyBuddies);
router.post('/request', sendRequest);
router.get('/privacy', getPrivacy);
router.patch('/privacy', updatePrivacy);
router.patch('/:id/respond', respondToRequest);
router.patch('/:id/notify-prs', setNotifyPrs);
router.get('/:id/compare', getCompare);
router.get('/:id/profile', getBuddyProfile);
router.get('/:id/overload/:exerciseId', getBuddyOverloadChart);
router.delete('/:id', removeBuddy);

export default router;
