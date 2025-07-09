const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const cheerio = require('cheerio');
const Tesseract = require('tesseract.js');
const pdf2pic = require('pdf2pic');
const forge = require('node-forge');
const { execSync } = require('child_process');
const BankIntelligenceProcessor = require('./bankIntelligence');

class EmailProcessor {
  constructor() {
    this.gmail = null;
    this.outlook = null;
    this.isAuthenticated = false;
    this.bankIntelligence = new BankIntelligenceProcessor();
    
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
    
    // FAB bank specific patterns
    this.fabPasswordPatterns = [
      // FAB Bank format: year of birth + last 4 digits of mobile
      // Common birth years + common mobile endings
      '19804567', '19814567', '19824567', '19834567', '19844567',
      '19854567', '19864567', '19874567', '19884567', '19894567',
      '19904567', '19914567', '19924567', '19934567', '19944567',
      '19954567', '19964567', '19974567', '19984567', '19994567',
      '20004567', '20014567', '20024567', '20034567', '20044567'
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
  }  /**
   * AI-powered automatic email processing without manual input
   */
  async processEmailIntelligently(emailData) {    console.log('AI Processing: Starting AI-powered email analysis...');
    
    // Extract intelligence from email content
    const intelligence = this.bankIntelligence.extractEmailIntelligence(emailData.body);
    
    console.log('AI Analysis: Bank detected: ' + intelligence.bankDetection.bank + ' (' + (intelligence.bankDetection.confidence * 100).toFixed(1) + '% confidence)');
    console.log('AI Analysis: Overall confidence: ' + (intelligence.confidence * 100).toFixed(1) + '%');
    
    // Generate smart password candidates
    const smartPasswords = this.bankIntelligence.generateSmartPasswords(intelligence);
    console.log('AI Analysis: Generated ' + smartPasswords.length + ' intelligent password candidates');
    
    // If PDF attachments found, process them automatically
    const results = [];
    for (const attachment of emailData.attachments) {
      if (attachment.isPDF) {
        console.log(`📄 Processing PDF: ${attachment.filename}`);
        
        const result = await this.processPDFStatementIntelligently(
          attachment.data,
          attachment.filename,
          intelligence,
          smartPasswords
        );
        
        if (result.success) {
          result.data.bankIntelligence = intelligence;
          results.push(result.data);
        }
      }
    }
    
    return {
      success: true,
      data: {
        emailAnalysis: intelligence,
        processedStatements: results,
        automationLevel: this.calculateAutomationLevel(intelligence)
      }
    };
  }

  /**
   * Enhanced PDF processing with AI intelligence
   */
  async processPDFStatementIntelligently(pdfBuffer, filename, intelligence, smartPasswords) {
    try {
      let extractedText = '';
      let isPasswordProtected = false;
      let password = null;
      let automationSuccess = false;
      
      console.log(`🔍 Intelligently processing PDF: ${filename}`);
      
      // First try to read without password
      try {
        console.log('📖 Attempting direct PDF reading...');
        const pdfData = await pdf(pdfBuffer);
        extractedText = pdfData.text;
        console.log(`✅ Success! Extracted ${extractedText.length} characters without password`);
        automationSuccess = true;
      } catch (error) {
        if (error.message.includes('password') || error.message.includes('encrypted')) {
          isPasswordProtected = true;
          console.log('🔒 PDF is password protected - initiating intelligent cracking...');
          
          // Use AI-generated passwords first (prioritized)
          if (smartPasswords.length > 0) {
            console.log(`🧠 Trying ${smartPasswords.length} AI-generated passwords...`);
            
            for (const candidatePassword of smartPasswords.slice(0, 20)) { // Try top 20
              try {
                const testResult = await this.testPassword(pdfBuffer, candidatePassword);
                if (testResult.success) {
                  password = candidatePassword;
                  extractedText = testResult.text;
                  console.log(`🎉 SUCCESS! AI cracked password: ${password}`);
                  automationSuccess = true;
                  break;
                }
              } catch (testError) {
                continue; // Try next password
              }
            }
          }
          
          // Fallback to traditional password cracking if AI fails
          if (!password) {
            console.log('🔄 AI passwords failed, trying traditional patterns...');
            const crackedPassword = await this.crackPDFPassword(
              pdfBuffer, 
              intelligence.cardNumbers[0], 
              intelligence.bankDetection.bank === 'FAB' ? 'FAB email content' : null
            );
            
            if (crackedPassword) {
              password = crackedPassword;
              try {
                extractedText = await this.extractWithPassword(pdfBuffer, password);
                console.log(`✅ Traditional cracking succeeded: ${password}`);
              } catch (extractError) {
                console.log('❌ Password found but extraction failed');
              }
            }
          }
        } else {
          console.error('❌ PDF reading error (not password related):', error.message);
          throw error;
        }
      }
      
      // Try OCR if text extraction yielded poor results
      if (!extractedText || extractedText.trim().length < 100) {
        console.log(`🔍 Text extraction yielded only ${extractedText.length} characters - trying OCR...`);
        try {
          const ocrText = await this.extractWithOCR(pdfBuffer);
          if (ocrText && ocrText.length > extractedText.length) {
            extractedText = ocrText;
            console.log(`🖼️ OCR successful! Extracted ${extractedText.length} characters`);
          }
        } catch (ocrError) {
          console.error('❌ OCR failed:', ocrError.message);
        }
      }
      
      // Ensure we have extractable text
      if (!extractedText || extractedText.trim().length < 10) {
        throw new Error('Unable to extract meaningful text from PDF despite AI assistance');
      }
      
      console.log(`📊 Final extraction: ${extractedText.length} characters`);
      
      // Enhanced parsing with AI context
      const statementData = this.parseStatementTextIntelligently(extractedText, intelligence);
      
      return {
        success: true,
        data: {
          filename: filename,
          isPasswordProtected: isPasswordProtected,
          password: password,
          automationSuccess: automationSuccess,
          bankDetected: intelligence.bankDetection.bank,
          intelligenceConfidence: intelligence.confidence,
          rawText: extractedText,
          parsed: statementData
        }
      };
      
    } catch (error) {
      console.error('❌ Intelligent PDF processing failed:', error);
      return {
        success: false,
        error: error.message || 'AI-powered processing failed'
      };
    }
  }

  /**
   * Test a password against PDF
   */
  async testPassword(pdfBuffer, password) {
    try {
      const pdfData = await pdf(pdfBuffer, { password: password });
      if (pdfData.text && pdfData.text.length > 50) {
        return { success: true, text: pdfData.text };
      }
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Enhanced statement parsing with AI context
   */
  parseStatementTextIntelligently(text, intelligence) {
    const basicData = this.parseStatementText(text);
    
    // Enhance with AI insights
    return {
      ...basicData,
      bankContext: {
        detectedBank: intelligence.bankDetection.bank,
        confidence: intelligence.bankDetection.confidence,
        cardNumbers: intelligence.cardNumbers,
        personalInfo: intelligence.personalInfo
      },
      automationMetrics: {
        passwordDetected: intelligence.passwords.explicit.length > 0,
        contextualClues: intelligence.contextualClues.keywords.length,
        securityLevel: intelligence.contextualClues.securityLevel
      }
    };
  }

  /**
   * Calculate automation success level
   */
  calculateAutomationLevel(intelligence) {
    let score = 0;
    
    // Bank detection
    score += intelligence.bankDetection.confidence * 25;
    
    // Information extraction
    if (intelligence.cardNumbers.length > 0) score += 20;
    if (intelligence.passwords.explicit.length > 0) score += 25;
    if (intelligence.personalInfo.years.length > 0) score += 15;
    if (intelligence.personalInfo.mobileNumbers.length > 0) score += 15;
    
    return {
      level: Math.min(score, 100),
      description: score > 80 ? 'Fully Automated' : 
                  score > 60 ? 'Highly Automated' :
                  score > 40 ? 'Partially Automated' : 'Manual Assistance Required'
    };
  }

  /**
   * Extract password hints from FAB bank email content
   */
  extractFABPasswordHints(emailBody) {
    const hints = {
      isFABBank: false,
      cardNumber: null,
      mobileNumbers: [],
      birthYears: []
    };
    
    // Check if this is a FAB bank email
    if (emailBody.toLowerCase().includes('fab') || 
        emailBody.toLowerCase().includes('first abu dhabi bank') ||
        emailBody.toLowerCase().includes('ending with') ||
        emailBody.toLowerCase().includes('your year of birth, followed by the last four digits')) {
      hints.isFABBank = true;
    }
    
    // Extract card number from "ending with XXXX" pattern
    const cardMatch = emailBody.match(/ending\s+(?:with|in)\s+(\d{4})/i);
    if (cardMatch) {
      hints.cardNumber = cardMatch[1];
    }
    
    // Extract potential mobile numbers (UAE format: 050, 052, 054, 055, 056, 058)
    const mobileMatches = emailBody.match(/0[56]\d\s?\d{3}\s?\d{4}/g);
    if (mobileMatches) {
      hints.mobileNumbers = mobileMatches.map(mobile => 
        mobile.replace(/\s/g, '').slice(-4) // Get last 4 digits
      );
    }
    
    // Extract potential birth years (1950-2010)
    const yearMatches = emailBody.match(/\b(19[5-9]\d|20[01]\d)\b/g);
    if (yearMatches) {
      hints.birthYears = [...new Set(yearMatches)]; // Remove duplicates
    }
    
    return hints;
  }

  /**
   * Generate FAB bank specific password candidates
   */
  generateFABPasswords(hints) {
    const passwords = [];
    
    if (!hints.isFABBank) {
      return passwords;
    }
    
    // Common mobile endings in UAE
    const commonMobileEndings = ['4567', '7890', '1234', '5678', '9876', '0123', '6789', '3456'];
    
    // Common birth years range
    const commonBirthYears = [];
    for (let year = 1960; year <= 2000; year++) {
      commonBirthYears.push(year.toString());
    }
    
    // Use extracted birth years if available, otherwise use common range
    const birthYears = hints.birthYears.length > 0 ? hints.birthYears : commonBirthYears;
    
    // Use extracted mobile endings if available, otherwise use common patterns
    const mobileEndings = hints.mobileNumbers.length > 0 ? hints.mobileNumbers : commonMobileEndings;
    
    // Generate year + mobile combinations
    birthYears.forEach(year => {
      mobileEndings.forEach(mobile => {
        passwords.push(year + mobile);
      });
    });
    
    return passwords;
  }
  /**
   * Process PDF statement
   */
  async processPDFStatement(pdfBuffer, filename, cardNumber = null, providedPassword = null, emailBody = null) {
    try {
      let extractedText = '';
      let isPasswordProtected = false;
      let password = providedPassword;
      
      console.log(`Processing PDF: ${filename}`);
      
      // First try to read without password
      try {
        console.log('Attempting to read PDF without password...');
        const pdfData = await pdf(pdfBuffer);
        extractedText = pdfData.text;
        console.log(`Successfully extracted ${extractedText.length} characters without password`);
      } catch (error) {
        if (error.message.includes('password') || error.message.includes('encrypted')) {
          isPasswordProtected = true;
          console.log('PDF is password protected, attempting to decrypt...');
          
          // If password is provided, try it first
          if (providedPassword) {
            try {
              console.log('Trying provided password...');
              extractedText = await this.extractWithPassword(pdfBuffer, providedPassword);
              password = providedPassword;
              console.log(`Successfully decrypted with provided password. Extracted ${extractedText.length} characters`);
            } catch (passwordError) {
              console.log('Provided password failed, attempting to crack...');
              // Try to crack password
              const crackedPassword = await this.crackPDFPassword(pdfBuffer, cardNumber, emailBody);
              if (crackedPassword) {
                password = crackedPassword;
                console.log(`Password cracked: ${crackedPassword}`);
                try {
                  extractedText = await this.extractWithPassword(pdfBuffer, password);
                  console.log(`Successfully decrypted with cracked password. Extracted ${extractedText.length} characters`);
                } catch (crackError) {
                  console.log('Failed to extract with cracked password, will try OCR');
                }
              } else {
                console.log('Password cracking failed, will try OCR');
              }
            }
          } else {
            // Try to crack password
            console.log('No password provided, attempting to crack...');
            const crackedPassword = await this.crackPDFPassword(pdfBuffer, cardNumber, emailBody);
            if (crackedPassword) {
              password = crackedPassword;
              console.log(`Password cracked: ${crackedPassword}`);
              try {
                extractedText = await this.extractWithPassword(pdfBuffer, password);
                console.log(`Successfully decrypted with cracked password. Extracted ${extractedText.length} characters`);
              } catch (crackError) {
                console.log('Failed to extract with cracked password, will try OCR');
              }
            } else {
              console.log('Password cracking failed, will try OCR');
            }
          }
        } else {
          console.error('PDF reading error (not password related):', error.message);
          throw error;
        }
      }
      
      // If text extraction failed or returned very little content, try OCR
      if (!extractedText || extractedText.trim().length < 100) {
        console.log(`Text extraction yielded only ${extractedText.length} characters, attempting OCR...`);
        try {
          const ocrText = await this.extractWithOCR(pdfBuffer);
          if (ocrText && ocrText.length > extractedText.length) {
            extractedText = ocrText;
            console.log(`OCR successful. Extracted ${extractedText.length} characters`);
          }
        } catch (ocrError) {
          console.error('OCR extraction failed:', ocrError.message);
          
          // If we have some text from password extraction, use it
          if (extractedText && extractedText.length > 0) {
            console.log('Using text from password extraction despite OCR failure');
          } else {
            // Last resort: return a structured error with helpful message
            throw new Error(`Unable to extract text from PDF. The file may be heavily encrypted, corrupted, or contain only images. OCR Error: ${ocrError.message}`);
          }
        }
      }
      
      // Ensure we have some extractable text
      if (!extractedText || extractedText.trim().length < 10) {
        throw new Error('Unable to extract meaningful text from PDF. The file may be corrupted, heavily encrypted, or contain only images.');
      }
      
      console.log(`Final text extraction: ${extractedText.length} characters`);
      
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
        error: error.message || 'Unknown error occurred while processing PDF'
      };
    }
  }
  /**
   * Attempt to crack PDF password using common patterns
   */
  async crackPDFPassword(pdfBuffer, cardNumber, emailBody = null) {
    const tempPath = path.join(__dirname, '../temp', `temp_${Date.now()}.pdf`);
    
    try {
      // Create temp directory if it doesn't exist
      const tempDir = path.dirname(tempPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Write PDF to temporary file
      fs.writeFileSync(tempPath, pdfBuffer);
      
      // Generate password candidates
      const passwordCandidates = [];
      
      // Add FAB bank specific passwords if email content is available
      if (emailBody) {
        const fabHints = this.extractFABPasswordHints(emailBody);
        const fabPasswords = this.generateFABPasswords(fabHints);
        passwordCandidates.push(...fabPasswords);
        console.log(`Generated ${fabPasswords.length} FAB bank specific passwords`);
      }
      
      if (cardNumber) {
        this.passwordPatterns.forEach(pattern => {
          if (typeof pattern === 'function') {
            passwordCandidates.push(pattern(cardNumber));
          } else {
            passwordCandidates.push(pattern);
          }
        });
      }
      
      // Add common passwords including birth date patterns
      passwordCandidates.push(...[
        '123456', 'password', 'statement', 'credit', 'card',
        '1234', '12345', '1234567890', 'qwerty', 'abc123',
        '03081210', // Common birth date format (ddmmyyyy)
        '10081203', // Reverse birth date format
        '08031210', // Alternative format
        '12100308', // Alternative format
        '0308', '1210', // Short formats
        '03/08/1210', '03-08-1210', // With separators
        ...this.fabPasswordPatterns // Add pre-defined FAB patterns
      ]);
      
      // Try each password
      for (const password of passwordCandidates) {
        try {
          // First try with pdf-parse directly (some PDFs support this)
          try {
            const pdfData = await pdf(pdfBuffer, { password: password });
            if (pdfData.text && pdfData.text.length > 50) {
              return password; // Success with direct parsing
            }
          } catch (directError) {
            // Direct parsing failed, try qpdf if available
          }
          
          // Try qpdf if available
          if (process.platform === 'win32') {
            const possiblePaths = [
              '"C:\\Program Files\\qpdf 12.2.0\\bin\\qpdf.exe"',
              '"C:\\Program Files\\qpdf\\bin\\qpdf.exe"',
              'qpdf'
            ];
            
            for (const qpdfPath of possiblePaths) {
              try {
                const command = `${qpdfPath} --password="${password}" --show-pages "${tempPath}"`;
                execSync(command, { stdio: 'pipe', timeout: 10000 });
                return password; // Success
              } catch (qpdfError) {
                // Try next qpdf path or continue to next password
                continue;
              }
            }
          } else {
            // Unix/Linux/macOS
            const command = `qpdf --password="${password}" --show-pages "${tempPath}" 2>/dev/null`;
            execSync(command, { stdio: 'pipe', timeout: 10000 });
            return password;
          }
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
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file:', tempPath, cleanupError.message);
        }
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
      // Create temp directory if it doesn't exist
      const tempDir = path.dirname(tempPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Write PDF to temporary file
      fs.writeFileSync(tempPath, pdfBuffer);
      
      // Try different qpdf command approaches for Windows
      let command;
      if (process.platform === 'win32') {
        // Try full path first, then fallback to PATH
        const possiblePaths = [
          '"C:\\Program Files\\qpdf 12.2.0\\bin\\qpdf.exe"',
          '"C:\\Program Files\\qpdf\\bin\\qpdf.exe"',
          'qpdf'
        ];
        
        for (const qpdfPath of possiblePaths) {
          try {
            command = `${qpdfPath} --password="${password}" --decrypt "${tempPath}" "${outputPath}"`;
            execSync(command, { stdio: 'pipe', timeout: 30000 });
            break; // Success, exit loop
          } catch (error) {
            if (qpdfPath === possiblePaths[possiblePaths.length - 1]) {
              // Last attempt failed, throw error
              throw new Error('QPDF not found. Please ensure QPDF is installed and in your PATH.');
            }
            // Try next path
            continue;
          }
        }
      } else {
        // Unix/Linux/macOS
        command = `qpdf --password="${password}" --decrypt "${tempPath}" "${outputPath}"`;
        execSync(command, { stdio: 'pipe', timeout: 30000 });
      }
      
      // Read decrypted PDF
      if (!fs.existsSync(outputPath)) {
        throw new Error('Failed to decrypt PDF - output file not created');
      }
      
      const decryptedBuffer = fs.readFileSync(outputPath);
      const pdfData = await pdf(decryptedBuffer);
      
      return pdfData.text;
      
    } catch (error) {
      console.error('Error extracting with password:', error);
      
      // If QPDF fails, try alternative approach using pdf-parse with password
      try {
        console.log('QPDF failed, trying alternative PDF parsing...');
        // Some PDF parsers can handle passwords directly
        const pdfData = await pdf(pdfBuffer, { password: password });
        return pdfData.text;
      } catch (altError) {
        console.error('Alternative PDF parsing also failed:', altError);
        throw new Error(`Failed to decrypt PDF with password. Error: ${error.message}`);
      }
    } finally {
      // Clean up temporary files
      [tempPath, outputPath].forEach(file => {
        if (fs.existsSync(file)) {
          try {
            fs.unlinkSync(file);
          } catch (cleanupError) {
            console.warn('Failed to cleanup file:', file, cleanupError.message);
          }
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
      
      // Write PDF to file with error handling
      try {
        fs.writeFileSync(pdfPath, pdfBuffer, { flag: 'w' });
      } catch (writeError) {
        console.error('Error writing PDF file for OCR:', writeError);
        throw new Error('Failed to write PDF file for OCR processing');
      }
      
      // Verify file was written
      if (!fs.existsSync(pdfPath) || fs.statSync(pdfPath).size === 0) {
        throw new Error('PDF file was not written correctly');
      }
      
      let extractedText = '';
      
      try {
        // Convert PDF to images with better error handling
        const convert = pdf2pic.fromPath(pdfPath, {
          density: 300,
          saveFilename: 'page',
          savePath: tempDir,
          format: 'png',
          width: 2000,
          height: 2000
        });
        
        console.log('Converting PDF to images for OCR...');
        const results = await convert.bulk(-1);
        
        if (!results || results.length === 0) {
          throw new Error('No pages converted from PDF');
        }
        
        console.log(`Processing ${results.length} pages with OCR...`);
        
        // Process each page with OCR
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          try {
            const imagePath = result.path || result.name;
            if (!imagePath || !fs.existsSync(imagePath)) {
              console.warn(`Page ${i + 1}: Image file not found, skipping`);
              continue;
            }
            
            console.log(`Processing page ${i + 1} with OCR...`);
            const { data } = await Tesseract.recognize(imagePath, 'eng', {
              logger: m => console.log(`OCR Progress: ${m.status} ${m.progress || ''}`),
              errorHandler: err => console.warn('OCR Warning:', err.message)
            });
            
            if (data && data.text) {
              extractedText += data.text + '\n';
              console.log(`Page ${i + 1}: Extracted ${data.text.length} characters`);
            }
            
            // Clean up image file
            try {
              if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
              }
            } catch (cleanupError) {
              console.warn(`Failed to cleanup image file ${imagePath}:`, cleanupError.message);
            }
          } catch (ocrError) {
            console.error(`Error processing page ${i + 1} with OCR:`, ocrError.message);
            // Continue with other pages instead of failing completely
          }
        }
        
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('No text could be extracted using OCR');
        }
        
        console.log(`OCR completed. Total extracted text: ${extractedText.length} characters`);
        return extractedText;
        
      } catch (conversionError) {
        console.error('Error during PDF to image conversion or OCR:', conversionError);
        
        // Fallback: Try to extract text directly from PDF even if password protected
        try {
          console.log('OCR failed, trying direct PDF text extraction as fallback...');
          const pdfData = await pdf(pdfBuffer);
          if (pdfData.text && pdfData.text.length > 0) {
            return pdfData.text;
          }
        } catch (fallbackError) {
          console.error('Fallback extraction also failed:', fallbackError);
        }
        
        throw new Error(`OCR processing failed: ${conversionError.message}`);
      }
      
    } catch (error) {
      console.error('Error with OCR extraction:', error);
      throw error;
    } finally {
      // Clean up PDF file
      if (fs.existsSync(pdfPath)) {
        try {
          fs.unlinkSync(pdfPath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup PDF file:', pdfPath, cleanupError.message);
        }
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
   * AI-powered FAB email search with automatic processing
   */
  async searchFABEmailsWithAI(options = {}) {
    if (!this.isAuthenticated) {
      throw new Error('Email service not authenticated');
    }
    
    try {
      // Search for FAB specific emails
      const fabQuery = 'from:(fab.ae OR "first abu dhabi bank") subject:(statement OR billing OR card) has:attachment';
      const searchQuery = fabQuery + ' newer_than:' + (options.dateRange || '1m');
      
      console.log('AI Search: Looking for FAB emails...');
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: options.maxResults || 20
      });
      
      const messages = response.data.messages || [];
      const processedEmails = [];
      
      console.log('AI Search: Found ' + messages.length + ' FAB emails to process');
      
      for (const message of messages) {
        const emailDetails = await this.getEmailDetails(message.id);
        if (emailDetails && emailDetails.attachments && emailDetails.attachments.length > 0) {
          
          console.log('AI Processing: ' + emailDetails.subject);
          
          // Use AI to analyze email content automatically
          const intelligence = this.bankIntelligence.extractEmailIntelligence(
            emailDetails.body || emailDetails.snippet
          );
          
          console.log('AI Analysis: Bank=' + intelligence.bankDetection.bank + ', Confidence=' + (intelligence.confidence * 100).toFixed(1) + '%');
          
          // Generate smart password candidates
          const smartPasswords = this.bankIntelligence.generateSmartPasswords(intelligence);
          console.log('AI Generated: ' + smartPasswords.length + ' password candidates');
          
          // Process PDFs automatically with AI-generated passwords
          for (const attachment of emailDetails.attachments) {
            if (attachment.isPDF && attachment.data) {
              try {
                console.log('AI PDF Processing: ' + attachment.filename);
                
                const pdfResult = await this.processPDFStatementIntelligently(
                  attachment.data,
                  attachment.filename,
                  intelligence,
                  smartPasswords
                );
                
                if (pdfResult.success) {
                  console.log('AI Success: PDF processed automatically with password: ' + (pdfResult.data.password || 'none'));
                  emailDetails.pdfData = pdfResult.data;
                  emailDetails.aiAnalysis = intelligence;
                  emailDetails.passwordUsed = pdfResult.data.password;
                  emailDetails.automationSuccess = pdfResult.data.automationSuccess;
                  break; // Stop at first successful PDF
                } else {
                  console.log('AI Failed: ' + pdfResult.error);
                }
              } catch (error) {
                console.log('AI Error: PDF processing failed - ' + error.message);
              }
            }
          }
          
          processedEmails.push({
            ...emailDetails,
            aiIntelligence: intelligence,
            smartPasswords: smartPasswords.slice(0, 10), // Limit for response
            confidence: intelligence.confidence,
            automationLevel: this.calculateAutomationLevel(intelligence)
          });
        }
      }
      
      return {
        success: true,
        data: processedEmails,
        total: processedEmails.length,
        aiProcessed: true,
        summary: {
          totalEmails: messages.length,
          processedEmails: processedEmails.length,
          successfulPDFs: processedEmails.filter(e => e.pdfData).length,
          automatedPasswords: processedEmails.filter(e => e.automationSuccess).length
        }
      };
      
    } catch (error) {
      console.error('AI FAB search error:', error);
      return { success: false, error: error.message };
    }
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
