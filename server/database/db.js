const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../data/wiobank.db');
  }
  
  /**
   * Initialize database and create tables
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      // Create data directory if it doesn't exist
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }
  
  /**
   * Create database tables
   */
  async createTables() {
    const tables = [
      // SMS Messages table
      `CREATE TABLE IF NOT EXISTS sms_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_text TEXT NOT NULL,
        sender TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        message_type TEXT,
        bank TEXT,
        card_number TEXT,
        due_date DATE,
        total_amount REAL,
        minimum_amount REAL,
        payment_amount REAL,
        payment_date DATE,
        available_limit REAL,
        late_fee REAL,
        statement_date DATE,
        confidence REAL,
        is_valid BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Emails table
      `CREATE TABLE IF NOT EXISTS emails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_id TEXT UNIQUE NOT NULL,
        subject TEXT,
        sender TEXT,
        email_date DATETIME,
        snippet TEXT,
        body TEXT,
        has_attachments BOOLEAN DEFAULT 0,
        processed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Statements table
      `CREATE TABLE IF NOT EXISTS statements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        account_number TEXT,
        statement_date DATE,
        due_date DATE,
        total_amount REAL,
        minimum_payment REAL,
        available_credit REAL,
        is_password_protected BOOLEAN DEFAULT 0,
        password TEXT,
        raw_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Transactions table
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        statement_id INTEGER,
        transaction_date DATE,
        description TEXT,
        currency TEXT DEFAULT 'AED',
        amount REAL,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (statement_id) REFERENCES statements (id)
      )`,
      
      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        card_number TEXT,
        due_date DATE,
        amount REAL,
        is_read BOOLEAN DEFAULT 0,
        is_sent BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // User settings table
      `CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    
    for (const table of tables) {
      await this.runQuery(table);
    }
    
    // Create indexes
    await this.createIndexes();
  }
  
  /**
   * Create database indexes for better performance
   */
  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_sms_card_number ON sms_messages(card_number)',
      'CREATE INDEX IF NOT EXISTS idx_sms_due_date ON sms_messages(due_date)',
      'CREATE INDEX IF NOT EXISTS idx_sms_message_type ON sms_messages(message_type)',
      'CREATE INDEX IF NOT EXISTS idx_emails_email_id ON emails(email_id)',
      'CREATE INDEX IF NOT EXISTS idx_statements_account ON statements(account_number)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_statement ON transactions(statement_id)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_due_date ON notifications(due_date)'
    ];
    
    for (const index of indexes) {
      await this.runQuery(index);
    }
  }
  
  /**
   * Helper method to run SQL queries
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }
  
  /**
   * Helper method to get single row
   */
  getRow(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
  
  /**
   * Helper method to get multiple rows
   */
  getRows(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  /**
   * Save SMS message to database
   */
  async saveSMS(smsData) {
    const sql = `INSERT INTO sms_messages (
      original_text, sender, timestamp, message_type, bank, card_number,
      due_date, total_amount, minimum_amount, payment_amount, payment_date,
      available_limit, late_fee, statement_date, confidence, is_valid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      smsData.originalText,
      smsData.sender,
      smsData.timestamp,
      smsData.messageType,
      smsData.bank,
      smsData.cardNumber,
      smsData.dueDate,
      smsData.totalAmount,
      smsData.minimumAmount,
      smsData.paymentAmount,
      smsData.paymentDate,
      smsData.availableLimit,
      smsData.lateFee,
      smsData.statementDate,
      smsData.confidence,
      smsData.isValid
    ];
    
    const result = await this.runQuery(sql, params);
    return result.id;
  }
  
  /**
   * Get SMS messages with pagination and filters
   */
  async getSMSMessages(options = {}) {
    const { page = 1, limit = 50, type, bank } = options;
    const offset = (page - 1) * limit;
    
    let sql = 'SELECT * FROM sms_messages WHERE 1=1';
    const params = [];
    
    if (type) {
      sql += ' AND message_type = ?';
      params.push(type);
    }
    
    if (bank) {
      sql += ' AND bank LIKE ?';
      params.push(`%${bank}%`);
    }
    
    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const messages = await this.getRows(sql, params);
    
    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM sms_messages WHERE 1=1';
    const countParams = [];
    
    if (type) {
      countSql += ' AND message_type = ?';
      countParams.push(type);
    }
    
    if (bank) {
      countSql += ' AND bank LIKE ?';
      countParams.push(`%${bank}%`);
    }
    
    const { total } = await this.getRow(countSql, countParams);
    
    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get upcoming due dates
   */
  async getUpcomingDueDates() {
    const sql = `SELECT * FROM sms_messages 
                 WHERE due_date > date('now') 
                 AND message_type IN ('statement', 'reminder')
                 ORDER BY due_date ASC`;
    
    return await this.getRows(sql);
  }
  
  /**
   * Get recent payments
   */
  async getRecentPayments() {
    const sql = `SELECT * FROM sms_messages 
                 WHERE payment_amount IS NOT NULL 
                 AND payment_date >= date('now', '-30 days')
                 ORDER BY payment_date DESC`;
    
    return await this.getRows(sql);
  }
  
  /**
   * Get SMS statistics
   */
  async getSMSStats() {
    const queries = [
      'SELECT COUNT(*) as total FROM sms_messages',
      'SELECT COUNT(*) as valid FROM sms_messages WHERE is_valid = 1',
      'SELECT message_type, COUNT(*) as count FROM sms_messages GROUP BY message_type',
      'SELECT bank, COUNT(*) as count FROM sms_messages WHERE bank IS NOT NULL GROUP BY bank',
      'SELECT AVG(confidence) as avg_confidence FROM sms_messages WHERE confidence > 0'
    ];
    
    const [
      { total },
      { valid },
      messageTypes,
      banks,
      { avg_confidence }
    ] = await Promise.all([
      this.getRow(queries[0]),
      this.getRow(queries[1]),
      this.getRows(queries[2]),
      this.getRows(queries[3]),
      this.getRow(queries[4])
    ]);
    
    return {
      total,
      valid,
      averageConfidence: avg_confidence,
      messageTypes: messageTypes.reduce((acc, row) => {
        acc[row.message_type] = row.count;
        return acc;
      }, {}),
      banks: banks.reduce((acc, row) => {
        acc[row.bank] = row.count;
        return acc;
      }, {})
    };
  }
  
  /**
   * Save email to database
   */
  async saveEmail(emailData) {
    const sql = `INSERT OR REPLACE INTO emails (
      email_id, subject, sender, email_date, snippet, body, has_attachments
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      emailData.id,
      emailData.subject,
      emailData.from,
      emailData.date,
      emailData.snippet,
      emailData.body,
      emailData.attachments && emailData.attachments.length > 0
    ];
    
    const result = await this.runQuery(sql, params);
    return result.id;
  }
  
  /**
   * Save statement to database
   */
  async saveStatement(statementData) {
    const sql = `INSERT INTO statements (
      filename, account_number, statement_date, due_date, total_amount,
      minimum_payment, available_credit, is_password_protected, password, raw_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      statementData.filename,
      statementData.parsed.accountNumber,
      statementData.parsed.statementDate,
      statementData.parsed.dueDate,
      statementData.parsed.totalAmount,
      statementData.parsed.minimumPayment,
      statementData.parsed.availableCredit,
      statementData.isPasswordProtected,
      statementData.password,
      statementData.rawText
    ];
    
    const result = await this.runQuery(sql, params);
    const statementId = result.id;
    
    // Save transactions
    if (statementData.parsed.transactions) {
      for (const transaction of statementData.parsed.transactions) {
        await this.saveTransaction(statementId, transaction);
      }
    }
    
    return statementId;
  }
  
  /**
   * Save transaction to database
   */
  async saveTransaction(statementId, transactionData) {
    const sql = `INSERT INTO transactions (
      statement_id, transaction_date, description, currency, amount, category
    ) VALUES (?, ?, ?, ?, ?, ?)`;
    
    const params = [
      statementId,
      transactionData.date,
      transactionData.description,
      transactionData.currency,
      transactionData.amount,
      this.categorizeTransaction(transactionData.description)
    ];
    
    const result = await this.runQuery(sql, params);
    return result.id;
  }
  
  /**
   * Categorize transaction based on description
   */
  categorizeTransaction(description) {
    const categoryKeywords = {
      'Food & Dining': ['restaurant', 'cafe', 'food', 'dining', 'burger', 'pizza', 'noon food'],
      'Shopping': ['mall', 'store', 'shop', 'retail', 'amazon', 'noon', 'shein', 'lulu'],
      'Transportation': ['taxi', 'uber', 'careem', 'metro', 'bus', 'parking', 'fuel'],
      'Entertainment': ['cinema', 'movie', 'game', 'sport', 'gym', 'club'],
      'Healthcare': ['hospital', 'clinic', 'pharmacy', 'medical', 'doctor'],
      'Utilities': ['electric', 'water', 'gas', 'internet', 'phone', 'telecom']
    };
    
    const desc = description.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        return category;
      }
    }
    
    return 'Other';
  }
  
  /**
   * Get statements with pagination
   */
  async getStatements(options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    
    const sql = `SELECT * FROM statements ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const statements = await this.getRows(sql, [limit, offset]);
    
    const { total } = await this.getRow('SELECT COUNT(*) as total FROM statements');
    
    return {
      statements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get statement by ID
   */
  async getStatement(id) {
    const statement = await this.getRow('SELECT * FROM statements WHERE id = ?', [id]);
    
    if (statement) {
      // Get associated transactions
      const transactions = await this.getRows(
        'SELECT * FROM transactions WHERE statement_id = ? ORDER BY transaction_date DESC',
        [id]
      );
      
      statement.transactions = transactions;
    }
    
    return statement;
  }
  
  /**
   * Get spending insights
   */
  async getSpendingInsights(options = {}) {
    const { cardNumber, dateRange = '3m' } = options;
    
    // Calculate date range
    const dateCondition = dateRange === '3m' ? "date('now', '-3 months')" : 
                         dateRange === '6m' ? "date('now', '-6 months')" : 
                         "date('now', '-1 month')";
    
    let sql = `
      SELECT 
        t.category,
        SUM(t.amount) as total_amount,
        COUNT(*) as transaction_count,
        AVG(t.amount) as avg_amount
      FROM transactions t
      JOIN statements s ON t.statement_id = s.id
      WHERE t.transaction_date >= ${dateCondition}
    `;
    
    const params = [];
    
    if (cardNumber) {
      sql += ' AND s.account_number = ?';
      params.push(cardNumber);
    }
    
    sql += ' GROUP BY t.category ORDER BY total_amount DESC';
    
    const categoryInsights = await this.getRows(sql, params);
    
    // Get monthly trends
    const trendSql = `
      SELECT 
        strftime('%Y-%m', t.transaction_date) as month,
        SUM(t.amount) as total_amount
      FROM transactions t
      JOIN statements s ON t.statement_id = s.id
      WHERE t.transaction_date >= ${dateCondition}
      ${cardNumber ? 'AND s.account_number = ?' : ''}
      GROUP BY month
      ORDER BY month
    `;
    
    const monthlyTrends = await this.getRows(trendSql, cardNumber ? [cardNumber] : []);
    
    return {
      categoryInsights,
      monthlyTrends,
      totalSpending: categoryInsights.reduce((sum, cat) => sum + cat.total_amount, 0),
      totalTransactions: categoryInsights.reduce((sum, cat) => sum + cat.transaction_count, 0)
    };
  }
  
  /**
   * Get transaction categories
   */
  async getTransactionCategories(options = {}) {
    const { cardNumber, month } = options;
    
    let sql = `
      SELECT 
        t.category,
        SUM(t.amount) as total_amount,
        COUNT(*) as count
      FROM transactions t
      JOIN statements s ON t.statement_id = s.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (cardNumber) {
      sql += ' AND s.account_number = ?';
      params.push(cardNumber);
    }
    
    if (month) {
      sql += ' AND strftime("%Y-%m", t.transaction_date) = ?';
      params.push(month);
    }
    
    sql += ' GROUP BY t.category ORDER BY total_amount DESC';
    
    return await this.getRows(sql, params);
  }
  
  /**
   * Delete SMS message
   */
  async deleteSMS(id) {
    const sql = 'DELETE FROM sms_messages WHERE id = ?';
    return await this.runQuery(sql, [id]);
  }
  
  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = new Database();
