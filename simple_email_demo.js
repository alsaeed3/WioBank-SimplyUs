// Demo script for showing emails in presentation
// This simplified script adds demo email data directly to the database
// Run with: node simple_email_demo.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { parseISO, format, addDays, subMonths, startOfMonth, eachDayOfInterval, subDays } = require('date-fns');

// Database connection setup
const DB_PATH = path.join(__dirname, 'server/data/wiobank.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Sample FAB credit card statement
const fabStatementData = {
  filename: 'FAB_Statement_July_2025.pdf',
  account_number: '1122',
  statement_date: '2025-07-05',
  due_date: '2025-07-25',
  total_amount: 1911.69,
  minimum_payment: 200.00,
  available_credit: 8088.31,
  is_password_protected: true,
  password: '19804567',
  raw_text: 'FAB Credit Card Statement - July 2025\nCard Number: **** **** **** 1122\nStatement Date: July 5, 2025\nDue Date: July 25, 2025\nTotal Amount Due: AED 1,911.69\nMinimum Payment Due: AED 200.00\n'
};

// Sample Emirates NBD credit card statement
const enbdStatementData = {
  filename: 'ENBD_Statement_July_2025.pdf',
  account_number: '6889',
  statement_date: '2025-07-01',
  due_date: '2025-07-22',
  total_amount: 4520.01,
  minimum_payment: 229.11,
  available_credit: 5479.99,
  is_password_protected: true,
  password: '556889',
  raw_text: 'Emirates NBD Credit Card Statement - July 2025\nCard Number: **** **** **** 6889\nStatement Date: July 1, 2025\nDue Date: July 22, 2025\nTotal Amount Due: AED 4,520.01\nMinimum Payment Due: AED 229.11\n'
};

// Sample ADCB credit card statement
const adcbStatementData = {
  filename: 'ADCB_Statement_July_2025.pdf',
  account_number: '7033',
  statement_date: '2025-07-03',
  due_date: '2025-07-27',
  total_amount: 3299.57,
  minimum_payment: 165.00,
  available_credit: 6700.43,
  is_password_protected: true,
  password: '01011990',
  raw_text: 'ADCB Credit Card Statement - July 2025\nCard Number: **** **** **** 7033\nStatement Date: July 3, 2025\nDue Date: July 27, 2025\nTotal Amount Due: AED 3,299.57\nMinimum Payment Due: AED 165.00\n'
};

// Sample transactions for FAB statement
const fabTransactions = [
  { statement_id: null, transaction_date: '2025-06-10', description: 'CARREFOUR MALL OF EMIRATES', currency: 'AED', amount: 243.75, category: 'Shopping' },
  { statement_id: null, transaction_date: '2025-06-12', description: 'AMAZON.AE', currency: 'AED', amount: 354.20, category: 'Shopping' },
  { statement_id: null, transaction_date: '2025-06-15', description: 'NOON FOOD', currency: 'AED', amount: 89.45, category: 'Food & Dining' },
  { statement_id: null, transaction_date: '2025-06-18', description: 'ETISALAT', currency: 'AED', amount: 499.00, category: 'Utilities' },
  { statement_id: null, transaction_date: '2025-06-20', description: 'ADNOC FUEL STATION', currency: 'AED', amount: 175.25, category: 'Transportation' },
  { statement_id: null, transaction_date: '2025-06-25', description: 'VOX CINEMAS', currency: 'AED', amount: 135.00, category: 'Entertainment' },
  { statement_id: null, transaction_date: '2025-06-28', description: 'NOON.COM', currency: 'AED', amount: 415.04, category: 'Shopping' }
];

// Sample transactions for ENBD statement
const enbdTransactions = [
  { statement_id: null, transaction_date: '2025-06-05', description: 'IKEA DUBAI', currency: 'AED', amount: 1245.75, category: 'Shopping' },
  { statement_id: null, transaction_date: '2025-06-08', description: 'APPLE STORE', currency: 'AED', amount: 1899.00, category: 'Shopping' },
  { statement_id: null, transaction_date: '2025-06-12', description: 'SPINNEYS', currency: 'AED', amount: 312.40, category: 'Food & Dining' },
  { statement_id: null, transaction_date: '2025-06-15', description: 'CAREEM', currency: 'AED', amount: 78.50, category: 'Transportation' },
  { statement_id: null, transaction_date: '2025-06-18', description: 'DU TELECOM', currency: 'AED', amount: 350.26, category: 'Utilities' },
  { statement_id: null, transaction_date: '2025-06-22', description: 'SHEIN.COM', currency: 'AED', amount: 289.00, category: 'Shopping' },
  { statement_id: null, transaction_date: '2025-06-25', description: 'STARBUCKS', currency: 'AED', amount: 45.10, category: 'Food & Dining' },
  { statement_id: null, transaction_date: '2025-06-28', description: 'AMAZON.AE', currency: 'AED', amount: 300.00, category: 'Shopping' }
];

// Sample transactions for ADCB statement
const adcbTransactions = [
  { statement_id: null, transaction_date: '2025-06-07', description: 'SHARAF DG', currency: 'AED', amount: 879.50, category: 'Shopping' },
  { statement_id: null, transaction_date: '2025-06-10', description: 'CARREFOUR', currency: 'AED', amount: 230.75, category: 'Food & Dining' },
  { statement_id: null, transaction_date: '2025-06-14', description: 'DEWA', currency: 'AED', amount: 450.00, category: 'Utilities' },
  { statement_id: null, transaction_date: '2025-06-17', description: 'NETFLIX', currency: 'AED', amount: 39.99, category: 'Entertainment' },
  { statement_id: null, transaction_date: '2025-06-20', description: 'LULU HYPERMARKET', currency: 'AED', amount: 345.65, category: 'Food & Dining' },
  { statement_id: null, transaction_date: '2025-06-24', description: 'ADNOC', currency: 'AED', amount: 153.68, category: 'Transportation' },
  { statement_id: null, transaction_date: '2025-06-27', description: 'H&M', currency: 'AED', amount: 420.00, category: 'Shopping' },
  { statement_id: null, transaction_date: '2025-06-30', description: 'UBER', currency: 'AED', amount: 80.00, category: 'Transportation' },
  { statement_id: null, transaction_date: '2025-07-01', description: 'NOON.COM', currency: 'AED', amount: 700.00, category: 'Shopping' }
];

// Demo emails to add
const demoEmails = [
  {
    email_id: 'demo-email-1',
    subject: 'Your FAB Credit Card Statement - July 2025',
    sender: 'statements@fab.ae',
    email_date: new Date().toISOString(),
    snippet: 'Your First Abu Dhabi Bank credit card statement for the period ending July 2025 is now available...',
    body: 'Your FAB Credit Card statement is ready. Card ending 1122. Due date: 25Jul2025',
    has_attachments: 1
  },
  {
    email_id: 'demo-email-2',
    subject: 'Emirates NBD Credit Card Statement - July 2025',
    sender: 'notifications@emiratesnbd.com',
    email_date: new Date().toISOString(),
    snippet: 'Your Emirates NBD Credit Card Statement for July 2025 is now available...',
    body: 'Your ENBD Credit Card statement is ready. Card ending 6889. Due date: 22Jul2025',
    has_attachments: 1
  },
  {
    email_id: 'demo-email-3',
    subject: 'ADCB Credit Card Statement - July 2025',
    sender: 'statements@adcb.com',
    email_date: new Date().toISOString(),
    snippet: 'Your ADCB Credit Card Statement for the month of July 2025 is now available...',
    body: 'Your ADCB Credit Card statement is ready. Card ending 7033. Due date: 27Jul2025',
    has_attachments: 1
  }
];

// Helper function to run a SQL query
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Helper function to get rows from a SQL query
function getRows(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Insert statement and get ID
async function insertStatement(data) {
  const result = await runQuery(`
    INSERT INTO statements (
      filename, account_number, statement_date, due_date, total_amount,
      minimum_payment, available_credit, is_password_protected, password, raw_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.filename,
    data.account_number,
    data.statement_date,
    data.due_date,
    data.total_amount,
    data.minimum_payment,
    data.available_credit,
    data.is_password_protected ? 1 : 0,
    data.password,
    data.raw_text
  ]);
  
  return result.id;
}

// Insert transactions
async function insertTransactions(transactions, statementId) {
  for (const transaction of transactions) {
    await runQuery(`
      INSERT INTO transactions (
        statement_id, transaction_date, description, currency, amount, category
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      statementId,
      transaction.transaction_date,
      transaction.description,
      transaction.currency,
      transaction.amount,
      transaction.category
    ]);
  }
}

// Insert email
async function insertEmail(email) {
  const result = await runQuery(`
    INSERT INTO emails (
      email_id, subject, sender, email_date, snippet, body, has_attachments, processed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    email.email_id,
    email.subject,
    email.sender,
    email.email_date,
    email.snippet,
    email.body,
    email.has_attachments,
    1 // Processed
  ]);
  
  return result.id;
}

// Create notification
async function createNotification(statementData) {
  await runQuery(`
    INSERT INTO notifications (
      type, title, message, card_number, due_date, amount, is_read, is_sent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'statement',
    'New Statement Available',
    `Your credit card statement for ${statementData.account_number} is ready. Amount due: AED ${statementData.total_amount}`,
    statementData.account_number,
    statementData.due_date,
    statementData.total_amount,
    0, // Not read
    1  // Sent
  ]);
}

// Run the demo
async function runEmailDemo() {
  try {
    console.log('🚀 Starting WioBank Email Demo');
    
    // Start a transaction
    await runQuery('BEGIN TRANSACTION');
    
    // Insert FAB statement and transactions
    console.log('\nProcessing FAB statement...');
    const fabId = await insertStatement(fabStatementData);
    await insertTransactions(fabTransactions.map(t => ({...t, statement_id: fabId})), fabId);
    await createNotification(fabStatementData);
    await insertEmail(demoEmails[0]);
    console.log(`✅ Added FAB statement with ID ${fabId} and ${fabTransactions.length} transactions`);
    
    // Insert ENBD statement and transactions
    console.log('\nProcessing Emirates NBD statement...');
    const enbdId = await insertStatement(enbdStatementData);
    await insertTransactions(enbdTransactions.map(t => ({...t, statement_id: enbdId})), enbdId);
    await createNotification(enbdStatementData);
    await insertEmail(demoEmails[1]);
    console.log(`✅ Added Emirates NBD statement with ID ${enbdId} and ${enbdTransactions.length} transactions`);
    
    // Insert ADCB statement and transactions
    console.log('\nProcessing ADCB statement...');
    const adcbId = await insertStatement(adcbStatementData);
    await insertTransactions(adcbTransactions.map(t => ({...t, statement_id: adcbId})), adcbId);
    await createNotification(adcbStatementData);
    await insertEmail(demoEmails[2]);
    console.log(`✅ Added ADCB statement with ID ${adcbId} and ${adcbTransactions.length} transactions`);
    
    // Commit the transaction
    await runQuery('COMMIT');
    
    console.log('\n📊 Email Processing Summary:');
    console.log(`- Total emails added: ${demoEmails.length}`);
    console.log(`- Total statements added: 3`);
    console.log(`- Total transactions added: ${fabTransactions.length + enbdTransactions.length + adcbTransactions.length}`);
    console.log(`- Total notifications created: 3`);
    
    console.log('\n✨ Demo completed successfully!');
    console.log('💡 Navigate to the dashboard to see the processed data and analytics.');
    
  } catch (error) {
    // Rollback on error
    await runQuery('ROLLBACK');
    console.error('❌ Error in email demo:', error.message);
  } finally {
    // Close database
    db.close();
  }
}

// Run the demo
runEmailDemo();
