const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const cheerio = require('cheerio');
const Tesseract = require('tesseract.js');
const { convert } = require('pdf2pic');
const forge = require('node-forge');
const { execSync } = require('child_process');

class EmailProcessor {
  constructor() {
    this.gmail = null;
    this.outlook = null;
    this.isAuthenticated = false;
    
    // Common password patterns for credit card statements
    this.passwordPatterns = [
      // Date-based patterns
      (cardNumber) => cardNumber.slice(-4) + '2024',
      (cardNumber) => cardNumber.slice(-4) + '2025',
      (cardNumber) => '2024' + cardNumber.slice(-4),
      (cardNumber) => '2025' + cardNumber.slice(-4),
      
      // Card-based patterns
      (cardNumber) => cardNumber.slice(-4),
      (cardNumber) => cardNumber.slice(-6),
      (cardNumber) => cardNumber.slice(-8),
      
      // Common formats
      (cardNumber) => 'stmt' + cardNumber.slice(-4),
      (cardNumber) => 'statement' + cardNumber.slice(-4),
      (cardNumber) => cardNumber.slice(-4) + 'stmt',
      
      // Birth date patterns (require additional data)
      'ddmmyyyy',
      'ddmmyy',
      'mmddyyyy',
      'mmddyy',
      
      // Common passwords
      '123456',
      'password',
      'statement',
      'credit',
      'card'
    ];
  }
  
  /**
   * Initialize Gmail API
   */
  async initializeGmail(credentials) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        credentials.clientId,
        credentials.clientSecret,
        credentials.redirectUri
      );
      
      oauth2Client.setCredentials(credentials.tokens);
      
      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      this.isAuthenticated = true;
      
      return { success: true, service: 'gmail' };
    } catch (error) {
      console.error('Gmail initialization error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Search for credit card emails
   */
  async searchCreditCardEmails(options = {}) {
    if (!this.isAuthenticated) {
      throw new Error('Email service not authenticated');
    }
    
    const {
      query = 'subject:(statement OR billing OR credit card) OR from:(bank OR card)',
      maxResults = 50,
      dateRange = '1m' // 1 month
    } = options;
    
    try {
      const searchQuery = `${query} newer_than:${dateRange}`;
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: maxResults
      });
      
      const messages = response.data.messages || [];
      const emailData = [];
      
      for (const message of messages) {
        const emailDetails = await this.getEmailDetails(message.id);
        if (emailDetails) {
          emailData.push(emailDetails);
        }
      }
      
      return {
        success: true,
        data: emailData,
        total: messages.length
      };
      
    } catch (error) {
      console.error('Error searching emails:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get detailed email information
   */
  async getEmailDetails(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });
      
      const message = response.data;
      const headers = message.payload.headers;
      
      const emailData = {
        id: messageId,
        subject: this.getHeaderValue(headers, 'Subject'),
        from: this.getHeaderValue(headers, 'From'),
        date: this.getHeaderValue(headers, 'Date'),
        snippet: message.snippet,
        attachments: [],
        body: ''
      };
      
      // Extract body content
      emailData.body = this.extractEmailBody(message.payload);
      
      // Extract attachments
      emailData.attachments = await this.extractAttachments(message.payload, messageId);
      
      return emailData;
      
    } catch (error) {
      console.error('Error getting email details:', error);
      return null;
    }
  }
  
  /**
   * Extract email body content
   */
  extractEmailBody(payload) {
    let body = '';
    
    if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
          const htmlContent = Buffer.from(part.body.data, 'base64').toString('utf-8');
          body += this.extractTextFromHtml(htmlContent);
        }
      }
    }
    
    return body;
  }
  
  /**
   * Extract text from HTML content
   */
  extractTextFromHtml(html) {
    const $ = cheerio.load(html);
    return $.text();
  }
  
  /**
   * Extract attachments from email
   */
  async extractAttachments(payload, messageId) {
    const attachments = [];
    
    const processPayload = async (part) => {
      if (part.filename && part.filename.length > 0) {
        const attachment = {
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
          attachmentId: part.body.attachmentId
        };
        
        // Download attachment if it's a PDF
        if (part.mimeType === 'application/pdf') {
          try {
            const attachmentData = await this.downloadAttachment(messageId, part.body.attachmentId);
            attachment.data = attachmentData;
            attachment.isPDF = true;
          } catch (error) {
            console.error('Error downloading attachment:', error);
          }
        }
        
        attachments.push(attachment);
      }
      
      if (part.parts) {
        for (const subPart of part.parts) {
          await processPayload(subPart);
        }
      }
    };
    
    await processPayload(payload);
    return attachments;
  }
  
  /**
   * Download email attachment
   */
  async downloadAttachment(messageId, attachmentId) {
    try {
      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId
      });
      
      return Buffer.from(response.data.data, 'base64');
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw error;
    }
  }
  
  /**
   * Process PDF statement
   */
  async processPDFStatement(pdfBuffer, filename, cardNumber = null) {
    try {
      let extractedText = '';
      let isPasswordProtected = false;
      let password = null;
      
      // First try to read without password
      try {
        const pdfData = await pdf(pdfBuffer);
        extractedText = pdfData.text;
      } catch (error) {
        if (error.message.includes('password') || error.message.includes('encrypted')) {
          isPasswordProtected = true;
          console.log('PDF is password protected, attempting to crack...');
          
          // Try to crack password
          const crackedPassword = await this.crackPDFPassword(pdfBuffer, cardNumber);
          if (crackedPassword) {
            password = crackedPassword;
            // Try to read with password (Note: pdf-parse doesn't support passwords directly)
            // You would need to use a different library like pdf2pic or similar
            extractedText = await this.extractWithPassword(pdfBuffer, password);
          }
        } else {
          throw error;
        }
      }
      
      // If text extraction failed, try OCR
      if (!extractedText || extractedText.length < 100) {
        console.log('Attempting OCR extraction...');
        extractedText = await this.extractWithOCR(pdfBuffer);
      }
      
      // Parse the extracted text
      const statementData = this.parseStatementText(extractedText);
      
      return {
        success: true,
        data: {
          filename: filename,
          isPasswordProtected: isPasswordProtected,
          password: password,
          rawText: extractedText,
          parsed: statementData
        }
      };
      
    } catch (error) {
      console.error('Error processing PDF statement:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Attempt to crack PDF password using common patterns
   */
  async crackPDFPassword(pdfBuffer, cardNumber) {
    const tempPath = path.join(__dirname, '../temp', `temp_${Date.now()}.pdf`);
    
    try {
      // Write PDF to temporary file
      fs.writeFileSync(tempPath, pdfBuffer);
      
      // Generate password candidates
      const passwordCandidates = [];
      
      if (cardNumber) {
        this.passwordPatterns.forEach(pattern => {
          if (typeof pattern === 'function') {
            passwordCandidates.push(pattern(cardNumber));
          } else {
            passwordCandidates.push(pattern);
          }
        });
      }
      
      // Add common passwords
      passwordCandidates.push(...[
        '123456', 'password', 'statement', 'credit', 'card',
        '1234', '12345', '1234567890', 'qwerty', 'abc123'
      ]);
      
      // Try each password
      for (const password of passwordCandidates) {
        try {
          // Using qpdf to test password
          const command = `qpdf --password="${password}" --show-pages "${tempPath}" 2>/dev/null`;
          execSync(command);
          
          // If no error, password is correct
          return password;
        } catch (error) {
          // Password failed, try next
          continue;
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('Error cracking PDF password:', error);
      return null;
    } finally {
      // Clean up temporary file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }
  
  /**
   * Extract text from password-protected PDF
   */
  async extractWithPassword(pdfBuffer, password) {
    const tempPath = path.join(__dirname, '../temp', `temp_${Date.now()}.pdf`);
    const outputPath = path.join(__dirname, '../temp', `output_${Date.now()}.pdf`);
    
    try {
      // Write PDF to temporary file
      fs.writeFileSync(tempPath, pdfBuffer);
      
      // Decrypt PDF using qpdf
      const command = `qpdf --password="${password}" --decrypt "${tempPath}" "${outputPath}"`;
      execSync(command);
      
      // Read decrypted PDF
      const decryptedBuffer = fs.readFileSync(outputPath);
      const pdfData = await pdf(decryptedBuffer);
      
      return pdfData.text;
      
    } catch (error) {
      console.error('Error extracting with password:', error);
      throw error;
    } finally {
      // Clean up temporary files
      [tempPath, outputPath].forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    }
  }
  
  /**
   * Extract text using OCR
   */
  async extractWithOCR(pdfBuffer) {
    const tempDir = path.join(__dirname, '../temp');
    const pdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
    
    try {
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Write PDF to file
      fs.writeFileSync(pdfPath, pdfBuffer);
      
      // Convert PDF to images
      const convert = require('pdf2pic')({
        density: 300,
        saveFilename: 'page',
        savePath: tempDir,
        format: 'png',
        width: 2000,
        height: 2000
      });
      
      const results = await convert(pdfPath);
      let extractedText = '';
      
      // Process each page with OCR
      for (const result of results) {
        const { data } = await Tesseract.recognize(result.path, 'eng');
        extractedText += data.text + '\n';
        
        // Clean up image file
        fs.unlinkSync(result.path);
      }
      
      return extractedText;
      
    } catch (error) {
      console.error('Error with OCR extraction:', error);
      throw error;
    } finally {
      // Clean up PDF file
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }
  }
  
  /**
   * Parse statement text and extract key information
   */
  parseStatementText(text) {
    const data = {
      accountNumber: null,
      statementDate: null,
      dueDate: null,
      totalAmount: null,
      minimumPayment: null,
      availableCredit: null,
      transactions: [],
      merchantCategories: {},
      insights: {}
    };
    
    // Extract account number
    const accountMatch = text.match(/(?:card|account)\s+(?:number|ending)\s+(?:with\s+)?[\*\d\s]{4,}/i);
    if (accountMatch) {
      data.accountNumber = accountMatch[0].replace(/[^\d]/g, '').slice(-4);
    }
    
    // Extract dates
    const dateMatches = text.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/g);
    if (dateMatches) {
      data.statementDate = dateMatches[0];
      data.dueDate = dateMatches[1];
    }
    
    // Extract amounts
    const amountMatches = text.match(/(?:AED|USD|EUR)\s*([\d,]+\.?\d*)/gi);
    if (amountMatches) {
      data.totalAmount = parseFloat(amountMatches[0].replace(/[^\d.]/g, ''));
      data.minimumPayment = parseFloat(amountMatches[1]?.replace(/[^\d.]/g, '') || 0);
    }
    
    // Extract transactions
    data.transactions = this.extractTransactions(text);
    
    // Categorize transactions
    data.merchantCategories = this.categorizeTransactions(data.transactions);
    
    // Generate insights
    data.insights = this.generateInsights(data);
    
    return data;
  }
  
  /**
   * Extract individual transactions from statement text
   */
  extractTransactions(text) {
    const transactions = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      // Look for transaction patterns
      const transactionMatch = line.match(/(\d{2}[-\/]\d{2}[-\/]\d{2,4})\s+(.+?)\s+(AED|USD|EUR)\s*([\d,]+\.?\d*)/i);
      
      if (transactionMatch) {
        transactions.push({
          date: transactionMatch[1],
          description: transactionMatch[2].trim(),
          currency: transactionMatch[3],
          amount: parseFloat(transactionMatch[4].replace(/,/g, ''))
        });
      }
    }
    
    return transactions;
  }
  
  /**
   * Categorize transactions by merchant type
   */
  categorizeTransactions(transactions) {
    const categories = {
      'Food & Dining': 0,
      'Shopping': 0,
      'Transportation': 0,
      'Entertainment': 0,
      'Healthcare': 0,
      'Utilities': 0,
      'Other': 0
    };
    
    const categoryKeywords = {
      'Food & Dining': ['restaurant', 'cafe', 'food', 'dining', 'burger', 'pizza', 'starbucks', 'mcdonalds', 'kfc', 'noon food'],
      'Shopping': ['mall', 'store', 'shop', 'retail', 'amazon', 'noon', 'shein', 'zara', 'lulu'],
      'Transportation': ['taxi', 'uber', 'careem', 'metro', 'bus', 'parking', 'fuel', 'petrol'],
      'Entertainment': ['cinema', 'movie', 'game', 'sport', 'gym', 'club', 'netflix', 'spotify'],
      'Healthcare': ['hospital', 'clinic', 'pharmacy', 'medical', 'doctor', 'health'],
      'Utilities': ['electric', 'water', 'gas', 'internet', 'phone', 'telecom', 'etisalat', 'du']
    };
    
    transactions.forEach(transaction => {
      const description = transaction.description.toLowerCase();
      let categorized = false;
      
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => description.includes(keyword))) {
          categories[category] += transaction.amount;
          categorized = true;
          break;
        }
      }
      
      if (!categorized) {
        categories['Other'] += transaction.amount;
      }
    });
    
    return categories;
  }
  
  /**
   * Generate insights from statement data
   */
  generateInsights(data) {
    const insights = {
      totalTransactions: data.transactions.length,
      averageTransaction: 0,
      topCategories: [],
      spendingTrends: {},
      recommendations: []
    };
    
    if (data.transactions.length > 0) {
      insights.averageTransaction = data.transactions.reduce((sum, t) => sum + t.amount, 0) / data.transactions.length;
      
      // Top spending categories
      const sortedCategories = Object.entries(data.merchantCategories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      
      insights.topCategories = sortedCategories.map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / data.totalAmount) * 100
      }));
      
      // Generate recommendations
      if (insights.topCategories[0]?.category === 'Food & Dining') {
        insights.recommendations.push('Consider cooking at home more often to reduce dining expenses');
      }
      
      if (insights.averageTransaction > 500) {
        insights.recommendations.push('Monitor large transactions and consider setting spending alerts');
      }
    }
    
    return insights;
  }
  
  /**
   * Helper function to get header value
   */
  getHeaderValue(headers, name) {
    const header = headers.find(h => h.name === name);
    return header ? header.value : null;
  }
}

module.exports = EmailProcessor;
