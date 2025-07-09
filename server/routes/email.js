const express = require('express');
const router = express.Router();
const multer = require('multer');
const EmailProcessor = require('../utils/emailProcessor');
const db = require('../database/db');

const emailProcessor = new EmailProcessor();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

/**
 * Initialize email service (Gmail/Outlook)
 * POST /api/email/init
 */
router.post('/init', async (req, res) => {
  try {
    const { service, credentials } = req.body;
    
    if (!service || !credentials) {
      return res.status(400).json({ error: 'Service and credentials are required' });
    }
    
    let result;
    
    switch (service.toLowerCase()) {
      case 'gmail':
        result = await emailProcessor.initializeGmail(credentials);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported email service' });
    }
    
    if (result.success) {
      res.json({
        success: true,
        message: `${service} initialized successfully`,
        service: result.service
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error initializing email service:', error);
    res.status(500).json({ error: 'Failed to initialize email service' });
  }
});

/**
 * Search for credit card emails
 * POST /api/email/search
 */
router.post('/search', async (req, res) => {
  try {
    const { query, maxResults = 50, dateRange = '1m' } = req.body;
    
    const result = await emailProcessor.searchCreditCardEmails({
      query,
      maxResults,
      dateRange
    });
    
    if (result.success) {
      // Save email data to database
      for (const email of result.data) {
        await db.saveEmail(email);
      }
      
      res.json({
        success: true,
        data: result.data,
        total: result.total
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error searching emails:', error);
    res.status(500).json({ error: 'Failed to search emails' });
  }
});

/**
 * Process PDF statement from email attachment
 * POST /api/email/process-statement
 */
router.post('/process-statement', upload.single('statement'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }
    
    const { cardNumber } = req.body;
    
    const result = await emailProcessor.processPDFStatement(
      req.file.buffer,
      req.file.originalname,
      cardNumber
    );
    
    if (result.success) {
      // Save statement data to database
      await db.saveStatement(result.data);
      
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error processing statement:', error);
    res.status(500).json({ error: 'Failed to process statement' });
  }
});

/**
 * Process statement from email ID
 * POST /api/email/process-email-statement
 */
router.post('/process-email-statement', async (req, res) => {
  try {
    const { emailId, cardNumber } = req.body;
    
    if (!emailId) {
      return res.status(400).json({ error: 'Email ID is required' });
    }
    
    // Get email details
    const emailDetails = await emailProcessor.getEmailDetails(emailId);
    
    if (!emailDetails) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Find PDF attachments
    const pdfAttachments = emailDetails.attachments.filter(att => att.isPDF);
    
    if (pdfAttachments.length === 0) {
      return res.status(400).json({ error: 'No PDF attachments found' });
    }
    
    const results = [];
    
    // Process each PDF attachment
    for (const attachment of pdfAttachments) {
      const result = await emailProcessor.processPDFStatement(
        attachment.data,
        attachment.filename,
        cardNumber
      );
      
      if (result.success) {
        await db.saveStatement(result.data);
        results.push(result.data);
      }
    }
    
    res.json({
      success: true,
      data: results
    });
    
  } catch (error) {
    console.error('Error processing email statement:', error);
    res.status(500).json({ error: 'Failed to process email statement' });
  }
});

/**
 * Get processed statements
 * GET /api/email/statements
 */
router.get('/statements', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const statements = await db.getStatements({
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: statements
    });
    
  } catch (error) {
    console.error('Error fetching statements:', error);
    res.status(500).json({ error: 'Failed to fetch statements' });
  }
});

/**
 * Get statement by ID
 * GET /api/email/statements/:id
 */
router.get('/statements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const statement = await db.getStatement(id);
    
    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }
    
    res.json({
      success: true,
      data: statement
    });
    
  } catch (error) {
    console.error('Error fetching statement:', error);
    res.status(500).json({ error: 'Failed to fetch statement' });
  }
});

/**
 * Get spending insights from statements
 * GET /api/email/insights
 */
router.get('/insights', async (req, res) => {
  try {
    const { cardNumber, dateRange = '3m' } = req.query;
    
    const insights = await db.getSpendingInsights({
      cardNumber,
      dateRange
    });
    
    res.json({
      success: true,
      data: insights
    });
    
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

/**
 * Get transaction categories
 * GET /api/email/categories
 */
router.get('/categories', async (req, res) => {
  try {
    const { cardNumber, month } = req.query;
    
    const categories = await db.getTransactionCategories({
      cardNumber,
      month
    });
    
    res.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * Test email processing with sample data
 * POST /api/email/test
 */
router.post('/test', async (req, res) => {
  try {
    // Sample statement text (extracted from the provided sample)
    const sampleStatementText = `
      MR MOHAMMED MAAZ SHAIKH
      Main Card Product: BLUE FAB SIGNAT
      Statement Date: 01-11-2024
      Payment Due Date: 26-11-2024
      Main Card Number: 4937 50** **** 6109
      Current Balance: 610.86
      Minimum Payment Due: 100.00
      
      Transaction Details:
      07-10-2024 Meat mart butchery and Abu Dhabi AED 16.20
      10-10-2024 Meat mart butchery and Abu Dhabi AED 34.00
      10-10-2024 LULU CENTER ABU DHABI AED 248.90
      12-10-2024 www.shein.com Dubai AED 23.96
      12-10-2024 Meat mart butchery and Abu Dhabi AED 23.00
      13-10-2024 Meat mart butchery and Abu Dhabi AED 18.31
      15-10-2024 WONDER ISLAND GIFTS LL ABU DHABI AED 93.19
      23-10-2024 NOON FOOD FOOD DELIVER DUBAI AED 46.32
      25-10-2024 PAYMENT RECEIVED - THANK YOU AED 827.50
      26-10-2024 Meat mart butchery and Abu Dhabi AED 15.50
      26-10-2024 LULU CENTER ABU DHABI AED 58.00
      30-10-2024 THE BLUE MOON GROCERY ABU DHABI AED 7.00
      01-11-2024 LULU CENTER ABU DHABI AED 74.40
    `;
    
    const parsed = emailProcessor.parseStatementText(sampleStatementText);
    
    res.json({
      success: true,
      data: {
        sampleText: sampleStatementText,
        parsed: parsed
      }
    });
    
  } catch (error) {
    console.error('Error testing email processing:', error);
    res.status(500).json({ error: 'Failed to test email processing' });
  }
});

module.exports = router;
