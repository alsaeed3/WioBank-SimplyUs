// Live Email Demo for WioBank SimplyUs
// This script creates a live demonstration of email processing functionality
// It simulates incoming emails, processes them, and shows notifications in real-time
// Perfect for presentations and hackathon demos
//
// Run with: node live_email_demo.js

const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');
const { parseISO, format, addDays } = require('date-fns');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const DB_PATH = path.join(__dirname, 'server/data/wiobank.db');

// Database connection setup
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the WioBank SQLite database.');
});

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Sample bank email data for demonstration
const demoEmails = [
  {
    id: 'demo-fab-email-1',
    sender: 'statements@fab.ae',
    subject: 'Your FAB Credit Card Statement - July 2025',
    date: new Date().toISOString(),
    snippet: 'Your First Abu Dhabi Bank credit card statement for the period ending July 2025 is now available...',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background-color: #004C94; color: white; padding: 20px; text-align: center;">
          <h2>First Abu Dhabi Bank</h2>
          <h3>Credit Card Statement</h3>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd;">
          <p>Dear Valued Customer,</p>
          <p>Your credit card statement for the period ending July 5, 2025 is now available.</p>
          <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0;">
            <p><strong>Card Number:</strong> **** **** **** 1122</p>
            <p><strong>Statement Date:</strong> July 5, 2025</p>
            <p><strong>Payment Due Date:</strong> July 25, 2025</p>
            <p><strong>Total Amount Due:</strong> AED 1,911.69</p>
            <p><strong>Minimum Payment Due:</strong> AED 200.00</p>
          </div>
        </div>
      </div>
    `,
    hasAttachment: true,
    bankName: 'FAB',
    statementData: {
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
    },
    transactions: [
      { transaction_date: '2025-06-10', description: 'CARREFOUR MALL OF EMIRATES', currency: 'AED', amount: 243.75, category: 'Shopping' },
      { transaction_date: '2025-06-12', description: 'AMAZON.AE', currency: 'AED', amount: 354.20, category: 'Shopping' },
      { transaction_date: '2025-06-15', description: 'NOON FOOD', currency: 'AED', amount: 89.45, category: 'Food & Dining' },
      { transaction_date: '2025-06-18', description: 'ETISALAT', currency: 'AED', amount: 499.00, category: 'Utilities' },
      { transaction_date: '2025-06-20', description: 'ADNOC FUEL STATION', currency: 'AED', amount: 175.25, category: 'Transportation' },
      { transaction_date: '2025-06-25', description: 'VOX CINEMAS', currency: 'AED', amount: 135.00, category: 'Entertainment' },
      { transaction_date: '2025-06-28', description: 'NOON.COM', currency: 'AED', amount: 415.04, category: 'Shopping' }
    ]
  },
  {
    id: 'demo-enbd-email-1',
    sender: 'notifications@emiratesnbd.com',
    subject: 'Emirates NBD Credit Card Statement - July 2025',
    date: new Date().toISOString(),
    snippet: 'Your Emirates NBD Credit Card Statement for July 2025 is now available...',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background-color: #D61A1F; color: white; padding: 20px; text-align: center;">
          <h2>Emirates NBD</h2>
          <h3>Credit Card Statement</h3>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd;">
          <p>Dear Customer,</p>
          <p>Your credit card statement for the period ending July 1, 2025 is now available.</p>
          <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0;">
            <p><strong>Card Number:</strong> **** **** **** 6889</p>
            <p><strong>Statement Date:</strong> July 1, 2025</p>
            <p><strong>Payment Due Date:</strong> July 22, 2025</p>
            <p><strong>Total Amount Due:</strong> AED 4,520.01</p>
            <p><strong>Minimum Payment Due:</strong> AED 229.11</p>
          </div>
        </div>
      </div>
    `,
    hasAttachment: true,
    bankName: 'Emirates NBD',
    statementData: {
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
    },
    transactions: [
      { transaction_date: '2025-06-05', description: 'IKEA DUBAI', currency: 'AED', amount: 1245.75, category: 'Shopping' },
      { transaction_date: '2025-06-08', description: 'APPLE STORE', currency: 'AED', amount: 1899.00, category: 'Shopping' },
      { transaction_date: '2025-06-12', description: 'SPINNEYS', currency: 'AED', amount: 312.40, category: 'Food & Dining' },
      { transaction_date: '2025-06-15', description: 'CAREEM', currency: 'AED', amount: 78.50, category: 'Transportation' },
      { transaction_date: '2025-06-18', description: 'DU TELECOM', currency: 'AED', amount: 350.26, category: 'Utilities' },
      { transaction_date: '2025-06-22', description: 'SHEIN.COM', currency: 'AED', amount: 289.00, category: 'Shopping' },
      { transaction_date: '2025-06-25', description: 'STARBUCKS', currency: 'AED', amount: 45.10, category: 'Food & Dining' }
    ]
  },
  {
    id: 'demo-adcb-email-1',
    sender: 'statements@adcb.com',
    subject: 'ADCB Credit Card Statement - July 2025',
    date: new Date().toISOString(),
    snippet: 'Your ADCB Credit Card Statement for the month of July 2025 is now available...',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background-color: #00764C; color: white; padding: 20px; text-align: center;">
          <h2>Abu Dhabi Commercial Bank</h2>
          <h3>Credit Card Statement</h3>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd;">
          <p>Dear Customer,</p>
          <p>Your credit card statement for the period ending July 3, 2025 is now available.</p>
          <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0;">
            <p><strong>Card Number:</strong> **** **** **** 7033</p>
            <p><strong>Statement Date:</strong> July 3, 2025</p>
            <p><strong>Payment Due Date:</strong> July 27, 2025</p>
            <p><strong>Total Amount Due:</strong> AED 3,299.57</p>
            <p><strong>Minimum Payment Due:</strong> AED 165.00</p>
          </div>
        </div>
      </div>
    `,
    hasAttachment: true,
    bankName: 'ADCB',
    statementData: {
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
    },
    transactions: [
      { transaction_date: '2025-06-07', description: 'SHARAF DG', currency: 'AED', amount: 879.50, category: 'Shopping' },
      { transaction_date: '2025-06-10', description: 'CARREFOUR', currency: 'AED', amount: 230.75, category: 'Food & Dining' },
      { transaction_date: '2025-06-14', description: 'DEWA', currency: 'AED', amount: 450.00, category: 'Utilities' },
      { transaction_date: '2025-06-17', description: 'NETFLIX', currency: 'AED', amount: 39.99, category: 'Entertainment' },
      { transaction_date: '2025-06-20', description: 'LULU HYPERMARKET', currency: 'AED', amount: 345.65, category: 'Food & Dining' },
      { transaction_date: '2025-06-24', description: 'ADNOC', currency: 'AED', amount: 153.68, category: 'Transportation' },
      { transaction_date: '2025-06-27', description: 'H&M', currency: 'AED', amount: 420.00, category: 'Shopping' },
      { transaction_date: '2025-06-30', description: 'UBER', currency: 'AED', amount: 80.00, category: 'Transportation' }
    ]
  }
];

// Special emails for demo scenarios
const specialEmails = [
  {
    id: 'demo-special-email-1',
    sender: 'statements@fab.ae',
    subject: 'URGENT: Your FAB Credit Card Payment is Due Tomorrow',
    date: new Date().toISOString(),
    snippet: 'IMPORTANT REMINDER: Your payment of AED 2,500.00 is due tomorrow...',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background-color: #004C94; color: white; padding: 20px; text-align: center;">
          <h2>First Abu Dhabi Bank</h2>
          <h3>URGENT PAYMENT REMINDER</h3>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd;">
          <p>Dear Valued Customer,</p>
          <p><strong style="color: red;">IMPORTANT REMINDER:</strong> Your payment is due tomorrow.</p>
          <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0;">
            <p><strong>Card Number:</strong> **** **** **** 1122</p>
            <p><strong>Payment Due Date:</strong> ${format(addDays(new Date(), 1), 'MMMM d, yyyy')}</p>
            <p><strong>Total Amount Due:</strong> AED 2,500.00</p>
            <p><strong>Minimum Payment Due:</strong> AED 250.00</p>
          </div>
          <p>Please ensure your payment is made before the due date to avoid late fees.</p>
        </div>
      </div>
    `,
    hasAttachment: false,
    bankName: 'FAB',
    type: 'payment_reminder'
  },
  {
    id: 'demo-special-email-2',
    sender: 'offers@emirates.nbd.com',
    subject: 'Special 0% Balance Transfer Offer for Your Emirates NBD Card',
    date: new Date().toISOString(),
    snippet: 'Transfer your outstanding balances from other cards and pay 0% interest for 12 months...',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background-color: #D61A1F; color: white; padding: 20px; text-align: center;">
          <h2>Emirates NBD</h2>
          <h3>Special Offer</h3>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd;">
          <p>Dear Customer,</p>
          <p>We are pleased to offer you a special 0% interest balance transfer offer for your Emirates NBD Credit Card.</p>
          <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0;">
            <p><strong>Offer:</strong> 0% interest for 12 months on balance transfers</p>
            <p><strong>Processing Fee:</strong> Just 1%</p>
            <p><strong>Minimum Transfer:</strong> AED 2,500</p>
            <p><strong>Offer Valid Until:</strong> ${format(addDays(new Date(), 30), 'MMMM d, yyyy')}</p>
          </div>
          <p>Take advantage of this limited-time offer to consolidate your credit card debts and save on interest payments.</p>
        </div>
      </div>
    `,
    hasAttachment: false,
    bankName: 'Emirates NBD',
    type: 'special_offer'
  }
];

// Function to clear all demo data first
async function clearDemoData() {
  console.log('Clearing previous demo data...');
  
  try {
    // Delete demo emails that start with 'demo-'
    await runQuery('DELETE FROM emails WHERE email_id LIKE "demo-%"');
    console.log('Cleared demo emails');
    
    // Delete demo statements and associated transactions
    const statements = await getRows('SELECT id FROM statements WHERE filename LIKE "%_Statement_July_2025.pdf"');
    if (statements.length > 0) {
      for (const statement of statements) {
        await runQuery('DELETE FROM transactions WHERE statement_id = ?', [statement.id]);
      }
      await runQuery('DELETE FROM statements WHERE filename LIKE "%_Statement_July_2025.pdf"');
      console.log('Cleared demo statements and transactions');
    }
    
    // Delete demo notifications related to statements
    await runQuery('DELETE FROM notifications WHERE title LIKE "%Statement Available%"');
    console.log('Cleared demo notifications');
    
    console.log('All demo data cleared successfully!\n');
  } catch (error) {
    console.error('Error clearing demo data:', error);
    process.exit(1);
  }
}

// Helper function to run database query
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Helper function to get rows from database
function getRows(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Function to save email to database
async function saveEmail(email) {
  console.log(`\nReceiving new email: "${email.subject}" from ${email.sender}`);
  
  try {
    // Save email to database
    await runQuery(`
      INSERT INTO emails (email_id, subject, sender, email_date, snippet, body, has_attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      email.id,
      email.subject,
      email.sender,
      email.date,
      email.snippet,
      email.body,
      email.hasAttachment ? 1 : 0
    ]);
    
    console.log(`Email saved to database: ${email.id}`);
    return true;
  } catch (error) {
    console.error('Error saving email:', error);
    return false;
  }
}

// Function to process statement from email
async function processStatement(email) {
  if (!email.statementData) {
    console.log('No statement data to process');
    return null;
  }
  
  console.log(`Processing statement for email: ${email.subject}`);
  
  try {
    // Save statement to database
    const result = await runQuery(`
      INSERT INTO statements (
        filename, account_number, statement_date, due_date, total_amount,
        minimum_payment, available_credit, is_password_protected, password, raw_text
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      email.statementData.filename,
      email.statementData.account_number,
      email.statementData.statement_date,
      email.statementData.due_date,
      email.statementData.total_amount,
      email.statementData.minimum_payment,
      email.statementData.available_credit,
      email.statementData.is_password_protected ? 1 : 0,
      email.statementData.password,
      email.statementData.raw_text
    ]);
    
    const statementId = result.id;
    console.log(`Statement saved to database with ID: ${statementId}`);
    
    // Process transactions if available
    if (email.transactions && email.transactions.length > 0) {
      console.log(`Processing ${email.transactions.length} transactions...`);
      
      for (const transaction of email.transactions) {
        await runQuery(`
          INSERT INTO transactions (
            statement_id, transaction_date, description, currency, amount, category
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          statementId,
          transaction.transaction_date,
          transaction.description,
          transaction.currency,
          transaction.amount,
          transaction.category
        ]);
      }
      
      console.log('Transactions processed successfully');
    }
    
    // Create notification for statement
    await runQuery(`
      INSERT INTO notifications (type, title, message, card_number, due_date, amount, is_read, is_sent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'statement',
      `New ${email.bankName} Statement Available`,
      `Your ${email.bankName} credit card statement for **** ${email.statementData.account_number} is ready. Amount due: AED ${email.statementData.total_amount.toLocaleString('en-US', {minimumFractionDigits: 2})}`,
      email.statementData.account_number,
      email.statementData.due_date,
      email.statementData.total_amount,
      0,
      1
    ]);
    
    console.log('Statement notification created');
    
    // Update email as processed
    await runQuery(`
      UPDATE emails 
      SET processed = 1, processed_at = datetime('now')
      WHERE email_id = ?
    `, [email.id]);
    
    console.log(`Statement processing completed for email: ${email.id}`);
    return statementId;
  } catch (error) {
    console.error('Error processing statement:', error);
    return null;
  }
}

// Function to process special emails (like reminders or offers)
async function processSpecialEmail(email) {
  console.log(`Processing special email: ${email.subject}`);
  
  try {
    let notificationType, notificationTitle, notificationMessage;
    
    if (email.type === 'payment_reminder') {
      notificationType = 'reminder';
      notificationTitle = `URGENT: Payment Due Tomorrow`;
      notificationMessage = `Your ${email.bankName} card payment of AED 2,500.00 is due tomorrow. Please make your payment to avoid late fees.`;
    } else if (email.type === 'special_offer') {
      notificationType = 'offer';
      notificationTitle = `Special Offer from ${email.bankName}`;
      notificationMessage = `0% interest balance transfer offer available for your ${email.bankName} credit card. Valid for 30 days.`;
    } else {
      notificationType = 'info';
      notificationTitle = `Information from ${email.bankName}`;
      notificationMessage = `New information available from your bank. Check your email for details.`;
    }
    
    // Create notification for special email
    await runQuery(`
      INSERT INTO notifications (type, title, message, is_read, is_sent)
      VALUES (?, ?, ?, ?, ?)
    `, [
      notificationType,
      notificationTitle,
      notificationMessage,
      0,
      1
    ]);
    
    console.log('Special email notification created');
    
    // Update email as processed
    await runQuery(`
      UPDATE emails 
      SET processed = 1, processed_at = datetime('now')
      WHERE email_id = ?
    `, [email.id]);
    
    console.log(`Special email processing completed: ${email.id}`);
    return true;
  } catch (error) {
    console.error('Error processing special email:', error);
    return false;
  }
}

// Function to display the main menu
function displayMenu() {
  console.log('\n========== WioBank Live Email Demo ==========');
  console.log('1. Receive FAB Bank Statement');
  console.log('2. Receive Emirates NBD Statement');
  console.log('3. Receive ADCB Statement');
  console.log('4. Receive Urgent Payment Reminder');
  console.log('5. Receive Special Offer Email');
  console.log('6. Display All Notifications');
  console.log('7. Clear Demo Data');
  console.log('8. Exit Demo');
  console.log('===========================================');
  rl.question('Select an option (1-8): ', handleMenuSelection);
}

// Function to handle menu selection
async function handleMenuSelection(choice) {
  try {
    switch (choice) {
      case '1':
        await demonstrateEmailProcess(demoEmails[0]);
        break;
      case '2':
        await demonstrateEmailProcess(demoEmails[1]);
        break;
      case '3':
        await demonstrateEmailProcess(demoEmails[2]);
        break;
      case '4':
        await demonstrateSpecialEmailProcess(specialEmails[0]);
        break;
      case '5':
        await demonstrateSpecialEmailProcess(specialEmails[1]);
        break;
      case '6':
        await displayNotifications();
        break;
      case '7':
        await clearDemoData();
        break;
      case '8':
        console.log('Exiting demo. Thank you!');
        db.close();
        rl.close();
        return;
      default:
        console.log('Invalid option. Please try again.');
    }
  } catch (error) {
    console.error('Error handling selection:', error);
  }
  
  displayMenu();
}

// Function to demonstrate email with statement processing
async function demonstrateEmailProcess(email) {
  console.log('\n===== LIVE EMAIL DEMONSTRATION =====');
  console.log(`Simulating incoming ${email.bankName} statement email...`);
  
  // Step 1: Save the email
  const emailSaved = await saveEmail(email);
  if (!emailSaved) {
    console.log('Failed to save email. Demonstration stopped.');
    return;
  }
  
  // Small delay to simulate real-world processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 2: Process the statement
  console.log('\nExtracting statement information...');
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Process the statement
  const statementId = await processStatement(email);
  if (!statementId) {
    console.log('Failed to process statement. Demonstration stopped.');
    return;
  }
  
  console.log('\nStatement processed successfully!');
  console.log('Notification has been generated and badge count updated.');
  console.log('\nDemonstration complete. You can now check the notifications in the app.');
}

// Function to demonstrate special email processing
async function demonstrateSpecialEmailProcess(email) {
  console.log('\n===== LIVE SPECIAL EMAIL DEMONSTRATION =====');
  console.log(`Simulating incoming ${email.type} email from ${email.bankName}...`);
  
  // Step 1: Save the email
  const emailSaved = await saveEmail(email);
  if (!emailSaved) {
    console.log('Failed to save email. Demonstration stopped.');
    return;
  }
  
  // Small delay to simulate real-world processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 2: Process the special email
  console.log('\nAnalyzing email content...');
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Process the special email
  const processed = await processSpecialEmail(email);
  if (!processed) {
    console.log('Failed to process special email. Demonstration stopped.');
    return;
  }
  
  console.log('\nSpecial email processed successfully!');
  console.log('Notification has been generated and badge count updated.');
  console.log('\nDemonstration complete. You can now check the notifications in the app.');
}

// Function to display all notifications in the system
async function displayNotifications() {
  console.log('\n===== CURRENT NOTIFICATIONS =====');
  
  try {
    const notifications = await getRows('SELECT * FROM notifications ORDER BY created_at DESC');
    
    if (notifications.length === 0) {
      console.log('No notifications found in the system.');
    } else {
      console.log(`Found ${notifications.length} notifications:\n`);
      
      notifications.forEach((notification, index) => {
        console.log(`${index + 1}. ${notification.title}`);
        console.log(`   ${notification.message}`);
        console.log(`   Type: ${notification.type} | Read: ${notification.is_read === 1 ? 'Yes' : 'No'}`);
        if (notification.due_date) {
          console.log(`   Due Date: ${notification.due_date}`);
        }
        if (notification.amount) {
          console.log(`   Amount: AED ${notification.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
        }
        console.log('-----------------------------------');
      });
    }
  } catch (error) {
    console.error('Error displaying notifications:', error);
  }
}

// Main function to start the demo
async function startDemo() {
  console.log('\n========================================');
  console.log('  Welcome to WioBank Live Email Demo');
  console.log('========================================');
  console.log('This tool simulates receiving and processing bank emails in real-time');
  console.log('Perfect for demonstrating the email functionality during your presentation');
  
  // Check if server is running
  try {
    await axios.get(`${API_BASE_URL}/notifications?limit=1`);
    console.log('\n✅ Server is running and accessible');
  } catch (error) {
    console.error('\n❌ Error: Cannot connect to the server. Please make sure the WioBank server is running on port 3000.');
    console.error('   Start the server with: node server/index.js');
    db.close();
    rl.close();
    return;
  }
  
  displayMenu();
}

// Start the demo
startDemo();
