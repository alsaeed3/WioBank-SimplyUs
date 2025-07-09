const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const db = require('../database/db');

/**
 * Get all notifications
 * GET /api/notifications
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, type, isRead } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];
    
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    
    if (isRead !== undefined) {
      sql += ' AND is_read = ?';
      params.push(isRead === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const notifications = await db.getRows(sql, params);
    
    const { total } = await db.getRow('SELECT COUNT(*) as total FROM notifications');
    
    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * Create notification
 * POST /api/notifications
 */
router.post('/', async (req, res) => {
  try {
    const { type, title, message, cardNumber, dueDate, amount } = req.body;
    
    if (!type || !title || !message) {
      return res.status(400).json({ error: 'Type, title, and message are required' });
    }
    
    const sql = `INSERT INTO notifications (
      type, title, message, card_number, due_date, amount
    ) VALUES (?, ?, ?, ?, ?, ?)`;
    
    const params = [type, title, message, cardNumber, dueDate, amount];
    
    const result = await db.runQuery(sql, params);
    
    res.json({
      success: true,
      data: { id: result.id }
    });
    
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sql = 'UPDATE notifications SET is_read = 1 WHERE id = ?';
    await db.runQuery(sql, [id]);
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sql = 'DELETE FROM notifications WHERE id = ?';
    await db.runQuery(sql, [id]);
    
    res.json({
      success: true,
      message: 'Notification deleted'
    });
    
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * Get notification settings
 * GET /api/notifications/settings
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await db.getRows(`
      SELECT setting_key, setting_value 
      FROM user_settings 
      WHERE setting_key LIKE 'notification_%'
    `);
    
    const notificationSettings = settings.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: notificationSettings
    });
    
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

/**
 * Update notification settings
 * PUT /api/notifications/settings
 */
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      await db.runQuery(`
        INSERT OR REPLACE INTO user_settings (setting_key, setting_value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [key, value]);
    }
    
    res.json({
      success: true,
      message: 'Notification settings updated'
    });
    
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

/**
 * Generate due date reminders
 * POST /api/notifications/generate-reminders
 */
router.post('/generate-reminders', async (req, res) => {
  try {
    const upcomingDueDates = await db.getUpcomingDueDates();
    const notificationsCreated = [];
    
    for (const due of upcomingDueDates) {
      const dueDate = new Date(due.due_date);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      let notificationType = '';
      let title = '';
      let message = '';
      
      if (daysUntilDue <= 1) {
        notificationType = 'urgent';
        title = 'Payment Due Today!';
        message = `Your credit card payment of AED ${due.total_amount} is due today. Pay now to avoid late fees.`;
      } else if (daysUntilDue <= 3) {
        notificationType = 'warning';
        title = 'Payment Due Soon';
        message = `Your credit card payment of AED ${due.total_amount} is due in ${daysUntilDue} days.`;
      } else if (daysUntilDue <= 7) {
        notificationType = 'reminder';
        title = 'Upcoming Payment';
        message = `Your credit card payment of AED ${due.total_amount} is due in ${daysUntilDue} days.`;
      }
      
      if (notificationType) {
        // Check if similar notification already exists
        const existingNotification = await db.getRow(`
          SELECT id FROM notifications 
          WHERE type = ? AND card_number = ? AND due_date = ?
          AND created_at >= date('now', '-1 day')
        `, [notificationType, due.card_number, due.due_date]);
        
        if (!existingNotification) {
          const sql = `INSERT INTO notifications (
            type, title, message, card_number, due_date, amount
          ) VALUES (?, ?, ?, ?, ?, ?)`;
          
          const result = await db.runQuery(sql, [
            notificationType, title, message, due.card_number, due.due_date, due.total_amount
          ]);
          
          notificationsCreated.push({
            id: result.id,
            type: notificationType,
            title,
            message,
            cardNumber: due.card_number,
            dueDate: due.due_date,
            amount: due.total_amount
          });
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        notificationsCreated: notificationsCreated.length,
        notifications: notificationsCreated
      }
    });
    
  } catch (error) {
    console.error('Error generating reminders:', error);
    res.status(500).json({ error: 'Failed to generate reminders' });
  }
});

// Schedule automatic reminder generation
cron.schedule('0 9 * * *', async () => {
  console.log('Running scheduled reminder generation...');
  
  try {
    const upcomingDueDates = await db.getUpcomingDueDates();
    
    for (const due of upcomingDueDates) {
      const dueDate = new Date(due.due_date);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue <= 7) {
        let notificationType = '';
        let title = '';
        let message = '';
        
        if (daysUntilDue <= 1) {
          notificationType = 'urgent';
          title = 'Payment Due Today!';
          message = `Your credit card payment of AED ${due.total_amount} is due today. Pay now to avoid late fees.`;
        } else if (daysUntilDue <= 3) {
          notificationType = 'warning';
          title = 'Payment Due Soon';
          message = `Your credit card payment of AED ${due.total_amount} is due in ${daysUntilDue} days.`;
        } else {
          notificationType = 'reminder';
          title = 'Upcoming Payment';
          message = `Your credit card payment of AED ${due.total_amount} is due in ${daysUntilDue} days.`;
        }
        
        // Check if similar notification already exists
        const existingNotification = await db.getRow(`
          SELECT id FROM notifications 
          WHERE type = ? AND card_number = ? AND due_date = ?
          AND created_at >= date('now', '-1 day')
        `, [notificationType, due.card_number, due.due_date]);
        
        if (!existingNotification) {
          await db.runQuery(`INSERT INTO notifications (
            type, title, message, card_number, due_date, amount
          ) VALUES (?, ?, ?, ?, ?, ?)`, [
            notificationType, title, message, due.card_number, due.due_date, due.total_amount
          ]);
        }
      }
    }
    
    console.log('Scheduled reminder generation completed');
  } catch (error) {
    console.error('Error in scheduled reminder generation:', error);
  }
});

module.exports = router;
