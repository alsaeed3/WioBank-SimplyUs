// AI-powered Bank Detection and Password Intelligence
class BankIntelligenceProcessor {
  constructor() {
    this.bankPatterns = {
      FAB: {
        identifiers: [
          /first abu dhabi bank/i,
          /\bfab\b/i,
          /statement of fab card/i,
          /ending with \d{4}/i,
          /year of birth.*followed by.*last four digits/i
        ],
        passwordPattern: 'yearMobile',
        mobileFormats: [/0[56]\d\s?\d{3}\s?\d{4}/g],
        yearFormats: [/\b(19[5-9]\d|20[01]\d)\b/g],
        cardExtraction: /ending\s+(?:with|in)\s+(\d{4})/i
      },
      ADCB: {
        identifiers: [
          /abu dhabi commercial bank/i,
          /\badcb\b/i,
          /adcb credit card/i
        ],
        passwordPattern: 'dateOfBirth',
        formats: [/\d{8}/]
      },
      ENBD: {
        identifiers: [
          /emirates nbd/i,
          /\benbd\b/i,
          /emirates islamic/i
        ],
        passwordPattern: 'cardNumber',
        formats: [/last \d+ digits/i]
      },
      HSBC: {
        identifiers: [
          /hsbc/i,
          /hong kong shanghai/i
        ],
        passwordPattern: 'mixed',
        formats: [/\d{6,8}/]
      },
      RAKBANK: {
        identifiers: [
          /rak bank/i,
          /\brak\b.*bank/i
        ],
        passwordPattern: 'dateCard',
        formats: [/\d{8}/]
      }
    };
    
    this.contextualKeywords = {
      password: [
        'password', 'passcode', 'access code', 'security code',
        'enter your', 'prompted to enter', 'year of birth',
        'mobile number', 'date of birth', 'card number'
      ],
      banking: [
        'statement', 'credit card', 'e-statement', 'billing',
        'account', 'transaction', 'payment due', 'balance'
      ],
      security: [
        'protected', 'encrypted', 'secure', 'confidential',
        'authorized', 'verification'
      ]
    };
  }

  /**
   * Automatically detect bank type from email content
   */
  detectBankType(emailContent) {
    const content = emailContent.toLowerCase();
    
    for (const [bankName, config] of Object.entries(this.bankPatterns)) {
      const matches = config.identifiers.filter(pattern => pattern.test(content));
      if (matches.length > 0) {
        return {
          bank: bankName,
          confidence: matches.length / config.identifiers.length,
          config: config
        };
      }
    }
    
    return { bank: 'UNKNOWN', confidence: 0, config: null };
  }

  /**
   * Extract all relevant information from email using NLP patterns
   */
  extractEmailIntelligence(emailContent) {
    const intelligence = {
      bankDetection: this.detectBankType(emailContent),
      cardNumbers: this.extractCardNumbers(emailContent),
      passwords: this.extractPasswordHints(emailContent),
      personalInfo: this.extractPersonalInfo(emailContent),
      contextualClues: this.analyzeContext(emailContent),
      confidence: 0
    };
    
    // Calculate overall confidence score
    intelligence.confidence = this.calculateConfidence(intelligence);
    
    return intelligence;
  }

  /**
   * Extract card numbers from email content
   */
  extractCardNumbers(content) {
    const patterns = [
      /ending\s+(?:with|in)\s+(\d{4})/gi,
      /card\s+(?:number\s+)?ending\s+(\d{4})/gi,
      /\*{4,}\s*(\d{4})/gi,
      /xxxx\s*(\d{4})/gi
    ];
    
    const cardNumbers = [];
    patterns.forEach(pattern => {
      const matches = [...content.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1] && !cardNumbers.includes(match[1])) {
          cardNumbers.push(match[1]);
        }
      });
    });
    
    return cardNumbers;
  }

  /**
   * Extract password hints and patterns from email content
   */
  extractPasswordHints(content) {
    const hints = {
      explicit: [],
      patterns: [],
      examples: [],
      instructions: []
    };
    
    // Extract explicit password mentions
    const passwordRegex = /password\s+(?:is|will be|format)[\s:]*([^\n.!?]+)/gi;
    const passwordMatches = [...content.matchAll(passwordRegex)];
    passwordMatches.forEach(match => {
      hints.explicit.push(match[1].trim());
    });
    
    // Extract pattern instructions
    const patternRegex = /(year of birth.*mobile|mobile.*year of birth|date of birth.*digits)/gi;
    const patternMatches = [...content.matchAll(patternRegex)];
    patternMatches.forEach(match => {
      hints.patterns.push(match[1].trim());
    });
    
    // Extract examples
    const exampleRegex = /example[:\s]*.*?(\d{8})/gi;
    const exampleMatches = [...content.matchAll(exampleRegex)];
    exampleMatches.forEach(match => {
      hints.examples.push(match[1]);
    });
    
    return hints;
  }

  /**
   * Extract personal information that might be used in passwords
   */
  extractPersonalInfo(content) {
    const info = {
      names: [],
      years: [],
      mobileNumbers: [],
      dates: []
    };
    
    // Extract names
    const nameRegex = /(?:dear|mr|mrs|ms)\s+([a-z\s]+)/gi;
    const nameMatches = [...content.matchAll(nameRegex)];
    nameMatches.forEach(match => {
      info.names.push(match[1].trim());
    });
    
    // Extract years
    const yearRegex = /\b(19[5-9]\d|20[01]\d)\b/g;
    const yearMatches = [...content.matchAll(yearRegex)];
    yearMatches.forEach(match => {
      if (!info.years.includes(match[1])) {
        info.years.push(match[1]);
      }
    });
    
    // Extract mobile numbers (UAE format)
    const mobileRegex = /0[56]\d\s?\d{3}\s?\d{4}/g;
    const mobileMatches = [...content.matchAll(mobileRegex)];
    mobileMatches.forEach(match => {
      const mobile = match[0].replace(/\s/g, '');
      info.mobileNumbers.push({
        full: mobile,
        lastFour: mobile.slice(-4)
      });
    });
    
    return info;
  }

  /**
   * Analyze contextual clues in the email
   */
  analyzeContext(content) {
    const context = {
      isPasswordProtected: false,
      securityLevel: 'low',
      urgency: 'normal',
      keywords: []
    };
    
    // Check for password protection indicators
    const protectionIndicators = [
      'password protected', 'encrypted', 'secure access',
      'enter password', 'access code required'
    ];
    
    context.isPasswordProtected = protectionIndicators.some(indicator => 
      content.toLowerCase().includes(indicator)
    );
    
    // Analyze security level
    const securityKeywords = this.contextualKeywords.security;
    const securityMatches = securityKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    );
    
    if (securityMatches.length > 2) {
      context.securityLevel = 'high';
    } else if (securityMatches.length > 0) {
      context.securityLevel = 'medium';
    }
    
    // Extract relevant keywords
    Object.values(this.contextualKeywords).flat().forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) {
        context.keywords.push(keyword);
      }
    });
    
    return context;
  }

  /**
   * Calculate confidence score based on extracted information
   */
  calculateConfidence(intelligence) {
    let score = 0;
    
    // Bank detection confidence
    score += intelligence.bankDetection.confidence * 30;
    
    // Card number extraction
    if (intelligence.cardNumbers.length > 0) score += 20;
    
    // Password hints
    if (intelligence.passwords.explicit.length > 0) score += 25;
    if (intelligence.passwords.patterns.length > 0) score += 15;
    
    // Personal information
    if (intelligence.personalInfo.years.length > 0) score += 10;
    if (intelligence.personalInfo.mobileNumbers.length > 0) score += 10;
    
    // Contextual clues
    if (intelligence.contextualClues.isPasswordProtected) score += 5;
    
    return Math.min(score, 100) / 100;
  }

  /**
   * Generate smart password candidates based on extracted intelligence
   */
  generateSmartPasswords(intelligence) {
    const passwords = new Set();
    const { bankDetection, personalInfo, passwords: hints } = intelligence;
    
    // Add explicit password examples
    hints.examples.forEach(example => passwords.add(example));
    
    if (bankDetection.bank === 'FAB') {
      // FAB specific: year + mobile last 4 digits
      personalInfo.years.forEach(year => {
        personalInfo.mobileNumbers.forEach(mobile => {
          passwords.add(year + mobile.lastFour);
        });
      });
      
      // Common UAE patterns if no specific info found
      if (personalInfo.years.length === 0 || personalInfo.mobileNumbers.length === 0) {
        this.generateFABFallbackPasswords().forEach(pwd => passwords.add(pwd));
      }
    }
    
    // Add card-based patterns
    intelligence.cardNumbers.forEach(cardNum => {
      passwords.add(cardNum + '2024');
      passwords.add(cardNum + '2025');
      passwords.add('2024' + cardNum);
      passwords.add('2025' + cardNum);
    });
    
    // Add date-based patterns
    personalInfo.years.forEach(year => {
      passwords.add(year + '0101'); // Year + Jan 1st
      passwords.add('0101' + year); // Jan 1st + Year
    });
    
    return Array.from(passwords);
  }

  /**
   * Generate fallback FAB passwords for common patterns
   */
  generateFABFallbackPasswords() {
    const passwords = [];
    const commonYears = ['1980', '1985', '1990', '1995'];
    const commonMobileEndings = ['4567', '7890', '1234', '5678'];
    
    commonYears.forEach(year => {
      commonMobileEndings.forEach(mobile => {
        passwords.push(year + mobile);
      });
    });
    
    return passwords;
  }
}

module.exports = BankIntelligenceProcessor;
