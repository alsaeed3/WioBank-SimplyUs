const express = require('express');
const router = express.Router();
const SMSParser = require('../utils/smsParser');
const db = require('../database/db');

const smsParser = new SMSParser();

/**
 * Parse a single SMS message
 * POST /api/sms/parse
 */
router.post('/parse', async (req, res) => {
  try {
    const { text, sender, timestamp } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'SMS text is required' });
    }
    
    const parsedSMS = smsParser.parseSMS(
      text, 
      sender || 'unknown', 
      timestamp ? new Date(timestamp) : new Date()
    );
    
    // Save to database
    const smsId = await db.saveSMS(parsedSMS);
    parsedSMS.id = smsId;
    
    res.json({
      success: true,
      data: parsedSMS
    });
    
  } catch (error) {
    console.error('Error parsing SMS:', error);
    res.status(500).json({ error: 'Failed to parse SMS' });
  }
});

/**
 * Parse multiple SMS messages
 * POST /api/sms/parse-batch
 */
router.post('/parse-batch', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages must be an array' });
    }
    
    const parsedMessages = smsParser.batchParse(messages);
    
    // Save all to database
    const savedMessages = [];
    for (const parsed of parsedMessages) {
      const smsId = await db.saveSMS(parsed);
      parsed.id = smsId;
      savedMessages.push(parsed);
    }
    
    // Get insights
    const insights = smsParser.getInsights(savedMessages);
    
    res.json({
      success: true,
      data: {
        messages: savedMessages,
        insights: insights
      }
    });
    
  } catch (error) {
    console.error('Error parsing SMS batch:', error);
    res.status(500).json({ error: 'Failed to parse SMS batch' });
  }
});

/**
 * Get all parsed SMS messages
 * GET /api/sms/messages
 */
router.get('/messages', async (req, res) => {
  try {
    const { page = 1, limit = 50, type, bank } = req.query;
    
    const messages = await db.getSMSMessages({
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      bank
    });
    
    res.json({
      success: true,
      data: messages
    });
    
  } catch (error) {
    console.error('Error fetching SMS messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * Get upcoming due dates from SMS data
 * GET /api/sms/due-dates
 */
router.get('/due-dates', async (req, res) => {
  try {
    const dueDates = await db.getUpcomingDueDates();
    
    res.json({
      success: true,
      data: dueDates
    });
    
  } catch (error) {
    console.error('Error fetching due dates:', error);
    res.status(500).json({ error: 'Failed to fetch due dates' });
  }
});

/**
 * Get recent payments from SMS data
 * GET /api/sms/payments
 */
router.get('/payments', async (req, res) => {
  try {
    const payments = await db.getRecentPayments();
    
    res.json({
      success: true,
      data: payments
    });
    
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

/**
 * Test SMS parsing with sample data
 * POST /api/sms/test
 */
router.post('/test', async (req, res) => {
  try {
    const sampleSMS = [
      {
        text: "Your statement of the card ending with 1122 dated 11Jun25 has been sent to you and can also be viewed in the new FAB mobile banking app. The total amount due is AED 911.69. Minimum due is AED 100.00. Due date is 07Jul25",
        sender: "FAB",
        timestamp: new Date()
      },
      {
        text: "Dear Customer, Your Payment of AED 911.69 for card 4727XXXXXXXX1122 has been processed on 07/07/2025",
        sender: "FAB",
        timestamp: new Date()
      },
      {
        text: "Emirates NBD Credit Card Mini Stmt for Card ending 6889: Statement date 27/06/25. Total Amt Due AED 8820.01, Due Date 22/07/25. Min Amt Due AED 229.11",
        sender: "Emirates NBD",
        timestamp: new Date()
      },
      {
        text: "This is to confirm receipt of your payment of AED 2010.00 towards your Credit Card ending with 6889 on 10/07/2025. Available limit is AED 4,042.45.",
        sender: "Emirates NBD",
        timestamp: new Date()
      },
      {
        text: "Cr.Card XXX7033 Billing alert: Total due to avoid fin. charges: AED1999.57. Due date Jul 5 2025; Pay min. AED100.00 by due date to avoid AED241.50 late fees.",
        sender: "Bank",
        timestamp: new Date()
      }
    ];
    
    const parsedMessages = smsParser.batchParse(sampleSMS);
    const insights = smsParser.getInsights(parsedMessages);
    
    res.json({
      success: true,
      data: {
        messages: parsedMessages,
        insights: insights
      }
    });
    
  } catch (error) {
    console.error('Error testing SMS parsing:', error);
    res.status(500).json({ error: 'Failed to test SMS parsing' });
  }
});

/**
 * Get SMS parsing statistics
 * GET /api/sms/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.getSMSStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching SMS stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * Delete SMS message
 * DELETE /api/sms/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.deleteSMS(id);
    
    res.json({
      success: true,
      message: 'SMS deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting SMS:', error);
    res.status(500).json({ error: 'Failed to delete SMS' });
  }
});

module.exports = router;
