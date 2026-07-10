import { getNotifications, getUnreadCount, markRead, markAllRead } from '../models/notification.model.js';

export const listNotifications = async (req, res) => {
  try {
    const notifications = await getNotifications(req.user.id);
    return res.status(200).json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const unreadCount = async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.id);
    return res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    await markRead(req.params.id, req.user.id);
    return res.status(200).json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await markAllRead(req.user.id);
    return res.status(200).json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
