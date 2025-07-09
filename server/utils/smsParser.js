const natural = require('natural');
const compromise = require('compromise');
const { parseISO, format, isValid, parse } = require('date-fns');

class SMSParser {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    
    // Enhanced patterns for UAE banks
    this.patterns = {
      // Bank identifiers
      bankPatterns: [
        /emirates\s+nbd/i,
        /fab/i,
        /first\s+abu\s+dhabi/i,
        /adcb/i,
        /abu\s+dhabi\s+commercial/i,
        /mashreq/i,
        /hsbc/i,
        /citibank/i,
        /standard\s+chartered/i,
        /rak\s+bank/i
      ],
      
      // Card number patterns
      cardPatterns: [
        /card\s+ending\s+with\s+(\d{4})/i,
        /card\s+(\d{4}[x*]{8,12}\d{4})/i,
        /\*{4,}\s*(\d{4})/i,
        /xxx+(\d{4})/i,
        /\d{4}\s*[x*]{4,}\s*[x*]{4,}\s*(\d{4})/i
      ],
      
      // Due date patterns
      dueDatePatterns: [
        /due\s+date\s+(?:is\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /due\s+date\s+(?:is\s+)?(\d{1,2}\s+\w+\s+\d{2,4})/i,
        /pay\s+by\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /payment\s+due\s+(?:on\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /due\s+(?:on\s+)?(\w+\s+\d{1,2}\s+\d{4})/i
      ],
      
      // Amount patterns
      amountPatterns: {
        total: [
          /total\s+(?:amt\s+)?due\s+(?:is\s+)?aed\s*([\d,]+\.?\d*)/i,
          /total\s+amount\s+due\s+(?:is\s+)?aed\s*([\d,]+\.?\d*)/i,
          /amount\s+due\s+(?:is\s+)?aed\s*([\d,]+\.?\d*)/i,
          /outstanding\s+balance\s+aed\s*([\d,]+\.?\d*)/i
        ],
        minimum: [
          /min(?:imum)?\s+(?:amt\s+)?due\s+(?:is\s+)?aed\s*([\d,]+\.?\d*)/i,
          /minimum\s+payment\s+due\s+aed\s*([\d,]+\.?\d*)/i,
          /pay\s+min\.?\s+aed\s*([\d,]+\.?\d*)/i
        ]
      },
      
      // Payment confirmation patterns
      paymentPatterns: [
        /payment\s+of\s+aed\s*([\d,]+\.?\d*)\s+.*processed/i,
        /payment\s+received.*aed\s*([\d,]+\.?\d*)/i,
        /payment\s+of\s+aed\s*([\d,]+\.?\d*)\s+.*received/i,
        /confirm\s+receipt.*payment\s+of\s+aed\s*([\d,]+\.?\d*)/i,
        /thank\s+you.*payment\s+of\s+aed\s*([\d,]+\.?\d*)/i
      ],
      
      // Statement generation patterns
      statementPatterns: [
        /statement.*dated\s+(\d{1,2}\w{3}\d{2})/i,
        /statement\s+date\s+(\d{1,2}\/\d{1,2}\/\d{2})/i,
        /billing\s+alert/i,
        /statement.*sent\s+to\s+you/i
      ]
    };
  }
  
  /**
   * Parse SMS message and extract credit card information
   * @param {string} smsText - The SMS message text
   * @param {string} sender - The sender/source of the SMS
   * @param {Date} timestamp - When the SMS was received
   * @returns {Object} Parsed SMS data
   */
  parseSMS(smsText, sender = '', timestamp = new Date()) {
    const result = {
      originalText: smsText,
      sender: sender,
      timestamp: timestamp,
      messageType: this.detectMessageType(smsText),
      bank: this.extractBank(smsText),
      cardNumber: this.extractCardNumber(smsText),
      isValid: false,
      confidence: 0
    };
    
    // Extract information based on message type
    switch (result.messageType) {
      case 'statement':
        Object.assign(result, this.parseStatementSMS(smsText));
        break;
      case 'payment':
        Object.assign(result, this.parsePaymentSMS(smsText));
        break;
      case 'reminder':
        Object.assign(result, this.parseReminderSMS(smsText));
        break;
      default:
        result.messageType = 'unknown';
    }
    
    // Calculate confidence score
    result.confidence = this.calculateConfidence(result);
    result.isValid = result.confidence > 0.6;
    
    return result;
  }
  
  /**
   * Detect the type of SMS message
   */
  detectMessageType(smsText) {
    const text = smsText.toLowerCase();
    
    if (text.includes('statement') || text.includes('billing alert')) {
      return 'statement';
    }
    
    if (text.includes('payment') && (text.includes('processed') || text.includes('received') || text.includes('confirm'))) {
      return 'payment';
    }
    
    if (text.includes('due date') || text.includes('payment due') || text.includes('minimum due')) {
      return 'reminder';
    }
    
    return 'unknown';
  }
  
  /**
   * Extract bank name from SMS
   */
  extractBank(smsText) {
    for (const pattern of this.patterns.bankPatterns) {
      const match = smsText.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }
    return null;
  }
  
  /**
   * Extract card number from SMS
   */
  extractCardNumber(smsText) {
    for (const pattern of this.patterns.cardPatterns) {
      const match = smsText.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }
    return null;
  }
  
  /**
   * Parse statement SMS
   */
  parseStatementSMS(smsText) {
    const result = {
      dueDate: this.extractDueDate(smsText),
      totalAmount: this.extractAmount(smsText, 'total'),
      minimumAmount: this.extractAmount(smsText, 'minimum'),
      statementDate: this.extractStatementDate(smsText)
    };
    
    return result;
  }
  
  /**
   * Parse payment confirmation SMS
   */
  parsePaymentSMS(smsText) {
    const result = {
      paymentAmount: this.extractPaymentAmount(smsText),
      paymentDate: this.extractPaymentDate(smsText),
      availableLimit: this.extractAvailableLimit(smsText)
    };
    
    return result;
  }
  
  /**
   * Parse reminder SMS
   */
  parseReminderSMS(smsText) {
    const result = {
      dueDate: this.extractDueDate(smsText),
      totalAmount: this.extractAmount(smsText, 'total'),
      minimumAmount: this.extractAmount(smsText, 'minimum'),
      lateFee: this.extractLateFee(smsText)
    };
    
    return result;
  }
  
  /**
   * Extract due date from SMS
   */
  extractDueDate(smsText) {
    for (const pattern of this.patterns.dueDatePatterns) {
      const match = smsText.match(pattern);
      if (match) {
        return this.parseDate(match[1]);
      }
    }
    return null;
  }
  
  /**
   * Extract amount based on type (total or minimum)
   */
  extractAmount(smsText, type) {
    const patterns = this.patterns.amountPatterns[type] || [];
    
    for (const pattern of patterns) {
      const match = smsText.match(pattern);
      if (match) {
        return parseFloat(match[1].replace(/,/g, ''));
      }
    }
    return null;
  }
  
  /**
   * Extract payment amount from payment confirmation
   */
  extractPaymentAmount(smsText) {
    for (const pattern of this.patterns.paymentPatterns) {
      const match = smsText.match(pattern);
      if (match) {
        return parseFloat(match[1].replace(/,/g, ''));
      }
    }
    return null;
  }
  
  /**
   * Extract payment date from SMS
   */
  extractPaymentDate(smsText) {
    const datePattern = /(?:on|processed\s+on)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i;
    const match = smsText.match(datePattern);
    if (match) {
      return this.parseDate(match[1]);
    }
    return null;
  }
  
  /**
   * Extract available limit from SMS
   */
  extractAvailableLimit(smsText) {
    const limitPattern = /available\s+limit\s+(?:is\s+)?aed\s*([\d,]+\.?\d*)/i;
    const match = smsText.match(limitPattern);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return null;
  }
  
  /**
   * Extract late fee from SMS
   */
  extractLateFee(smsText) {
    const lateFeePattern = /avoid\s+aed\s*([\d,]+\.?\d*)\s+late\s+fees/i;
    const match = smsText.match(lateFeePattern);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return null;
  }
  
  /**
   * Extract statement date from SMS
   */
  extractStatementDate(smsText) {
    const datePattern = /statement.*dated\s+(\d{1,2}\w{3}\d{2})/i;
    const match = smsText.match(datePattern);
    if (match) {
      return this.parseDate(match[1]);
    }
    return null;
  }
  
  /**
   * Parse various date formats
   */
  parseDate(dateString) {
    if (!dateString) return null;
    
    // Common date formats
    const formats = [
      'dd/MM/yyyy',
      'dd-MM-yyyy',
      'dd MMM yyyy',
      'dd MMM yy',
      'ddMMMyy',
      'MM/dd/yyyy',
      'yyyy-MM-dd'
    ];
    
    for (const format of formats) {
      try {
        const parsed = parse(dateString, format, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Try natural language parsing
    try {
      const doc = compromise(dateString);
      const dates = doc.dates().json();
      if (dates.length > 0) {
        return new Date(dates[0].text);
      }
    } catch (e) {
      // Fallback to simple parsing
    }
    
    return null;
  }
  
  /**
   * Calculate confidence score for parsed data
   */
  calculateConfidence(result) {
    let score = 0;
    
    // Bank identification adds confidence
    if (result.bank) score += 0.2;
    
    // Card number adds confidence
    if (result.cardNumber) score += 0.2;
    
    // Message type detection adds confidence
    if (result.messageType !== 'unknown') score += 0.3;
    
    // Specific data extraction adds confidence
    if (result.dueDate) score += 0.15;
    if (result.totalAmount) score += 0.1;
    if (result.minimumAmount) score += 0.05;
    if (result.paymentAmount) score += 0.15;
    if (result.paymentDate) score += 0.1;
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Batch process multiple SMS messages
   */
  batchParse(smsMessages) {
    return smsMessages.map(sms => this.parseSMS(sms.text, sms.sender, sms.timestamp));
  }
  
  /**
   * Get insights from parsed SMS data
   */
  getInsights(parsedMessages) {
    const insights = {
      totalMessages: parsedMessages.length,
      validMessages: parsedMessages.filter(m => m.isValid).length,
      messageTypes: {},
      banks: {},
      upcomingDueDates: [],
      recentPayments: [],
      averageConfidence: 0
    };
    
    parsedMessages.forEach(msg => {
      // Count message types
      insights.messageTypes[msg.messageType] = (insights.messageTypes[msg.messageType] || 0) + 1;
      
      // Count banks
      if (msg.bank) {
        insights.banks[msg.bank] = (insights.banks[msg.bank] || 0) + 1;
      }
      
      // Collect upcoming due dates
      if (msg.dueDate && msg.dueDate > new Date()) {
        insights.upcomingDueDates.push({
          date: msg.dueDate,
          amount: msg.totalAmount,
          minimum: msg.minimumAmount,
          cardNumber: msg.cardNumber,
          bank: msg.bank
        });
      }
      
      // Collect recent payments
      if (msg.paymentAmount && msg.paymentDate) {
        insights.recentPayments.push({
          amount: msg.paymentAmount,
          date: msg.paymentDate,
          cardNumber: msg.cardNumber,
          bank: msg.bank
        });
      }
    });
    
    // Calculate average confidence
    insights.averageConfidence = parsedMessages.reduce((sum, msg) => sum + msg.confidence, 0) / parsedMessages.length;
    
    // Sort upcoming due dates
    insights.upcomingDueDates.sort((a, b) => a.date - b.date);
    
    // Sort recent payments
    insights.recentPayments.sort((a, b) => b.date - a.date);
    
    return insights;
  }
}

module.exports = SMSParser;
