// Email demonstration routes for WioBank
// This file adds email demo routes for presentations
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const BankIntelligenceProcessor = require('../utils/bankIntelligence');

/**
 * Demo endpoint to add an email
 * POST /api/email/demo
 */
router.post('/demo', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email data is required' });
    }
    
    // Save to database
    await db.saveEmail(email);
    
    res.json({
      success: true,
      message: 'Demo email saved successfully',
      emailId: email.id
    });
    
  } catch (error) {
    console.error('Error processing demo email:', error);
    res.status(500).json({ success: false, error: 'Failed to process demo email' });
  }
});

/**
 * Process a statement from a demo email
 * POST /api/email/demo/process-statement
 */
router.post('/demo/process-statement', async (req, res) => {
  try {
    const { emailId, pdfData } = req.body;
    
    if (!emailId || !pdfData) {
      return res.status(400).json({ success: false, error: 'Email ID and PDF data are required' });
    }
    
    // Save statement to database
    const statementId = await db.saveStatement(pdfData);
    
    // Create a notification
    const notificationData = {
      type: 'statement',
      title: `New Statement Available`,
      message: `Your credit card statement for ${pdfData.parsed.accountNumber} is ready. Amount due: AED ${pdfData.parsed.totalAmount}`,
      card_number: pdfData.parsed.accountNumber,
      due_date: pdfData.parsed.dueDate,
      amount: pdfData.parsed.totalAmount,
      is_read: 0,
      is_sent: 1
    };
    
    await db.runQuery(`
      INSERT INTO notifications (type, title, message, card_number, due_date, amount, is_read, is_sent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      notificationData.type,
      notificationData.title,
      notificationData.message,
      notificationData.card_number,
      notificationData.due_date,
      notificationData.amount,
      notificationData.is_read,
      notificationData.is_sent
    ]);
    
    // Update the email record with statement processing info
    await db.runQuery(`
      UPDATE emails 
      SET 
        processed = 1,
        processed_at = datetime('now')
      WHERE email_id = ?
    `, [emailId]);
    
    res.json({
      success: true,
      message: 'Demo statement processed successfully',
      statementId,
      emailId
    });
    
  } catch (error) {
    console.error('Error processing demo statement:', error);
    res.status(500).json({ success: false, error: 'Failed to process demo statement' });
  }
});

/**
 * Process bank intelligence on email content
 * POST /api/email/demo/intelligence
 */
router.post('/demo/intelligence', async (req, res) => {
  try {
    const { emailContent } = req.body;
    
    if (!emailContent) {
      return res.status(400).json({ success: false, error: 'Email content is required' });
    }
    
    // Use the BankIntelligenceProcessor to analyze the email
    const bankProcessor = new BankIntelligenceProcessor();
    const intelligence = bankProcessor.extractEmailIntelligence(emailContent);
    const passwordCandidates = bankProcessor.generateSmartPasswords(intelligence);
    
    res.json({
      success: true,
      result: {
        bank: intelligence.bankDetection.bank,
        confidence: intelligence.bankDetection.confidence,
        passwordPattern: intelligence.bankDetection.config?.passwordPattern || 'unknown',
        cardNumbers: intelligence.cardNumbers || [],
        personalInfo: intelligence.personalInfo,
        passwordCandidates: passwordCandidates.slice(0, 10) // Return only top 10 candidates
      }
    });
    
  } catch (error) {
    console.error('Error processing bank intelligence:', error);
    res.status(500).json({ success: false, error: 'Failed to process bank intelligence' });
  }
});

module.exports = router;
