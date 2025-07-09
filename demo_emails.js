// Demo script for email processing demonstration
// This script simulates email processing with credit card statements for the presentation
// Run with: node demo_emails.js

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');

// Sample email data for demonstration
const demoEmails = [
  {
    id: 'demo-email-1',
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
            <p><strong>Available Credit Limit:</strong> AED 8,088.31</p>
          </div>
          <p>Please find your detailed statement attached as a PDF.</p>
          <p>To access your password-protected statement, please use your year of birth followed by the last four digits of your registered mobile number.</p>
          <p>For any assistance, please contact our 24/7 customer service at 600 52 3322.</p>
          <p>Thank you for banking with FAB.</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px;">
          <p>This is a system generated email. Please do not reply to this email.</p>
        </div>
      </div>
    `,
    hasAttachment: true,
    bankType: 'FAB',
    password: '19804567'
  },
  {
    id: 'demo-email-2',
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
            <p><strong>Available Credit Limit:</strong> AED 5,479.99</p>
          </div>
          <p>Please find your detailed statement attached as a PDF.</p>
          <p>To access your e-statement, please use the last 6 digits of your card number.</p>
          <p>For any assistance, please contact our 24/7 customer service at 600 54 0000.</p>
          <p>Thank you for banking with Emirates NBD.</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px;">
          <p>This is a system generated email. Please do not reply to this email.</p>
        </div>
      </div>
    `,
    hasAttachment: true,
    bankType: 'Emirates NBD',
    password: '556889'
  },
  {
    id: 'demo-email-3',
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
            <p><strong>Available Credit Limit:</strong> AED 6,700.43</p>
          </div>
          <p>Please find your detailed statement attached as a PDF.</p>
          <p>To access your password-protected statement, please use your date of birth in DDMMYYYY format.</p>
          <p>For any assistance, please contact our customer service at 600 50 2030.</p>
          <p>Thank you for banking with ADCB.</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px;">
          <p>This is a system generated email. Please do not reply to this email.</p>
        </div>
      </div>
    `,
    hasAttachment: true,
    bankType: 'ADCB',
    password: '01011990'
  }
];

// Sample FAB credit card statement
const fabStatementData = {
  filename: 'FAB_Statement_July_2025.pdf',
  accountNumber: '1122',
  statementDate: '2025-07-05',
  dueDate: '2025-07-25',
  totalAmount: 1911.69,
  minimumPayment: 200.00,
  availableCredit: 8088.31,
  isPasswordProtected: true,
  password: '19804567',
  rawText: 'FAB Credit Card Statement - July 2025\nCard Number: **** **** **** 1122\nStatement Date: July 5, 2025\nDue Date: July 25, 2025\nTotal Amount Due: AED 1,911.69\nMinimum Payment Due: AED 200.00\n',
  transactions: [
    { date: '2025-06-10', description: 'CARREFOUR MALL OF EMIRATES', currency: 'AED', amount: 243.75 },
    { date: '2025-06-12', description: 'AMAZON.AE', currency: 'AED', amount: 354.20 },
    { date: '2025-06-15', description: 'NOON FOOD', currency: 'AED', amount: 89.45 },
    { date: '2025-06-18', description: 'ETISALAT', currency: 'AED', amount: 499.00 },
    { date: '2025-06-20', description: 'ADNOC FUEL STATION', currency: 'AED', amount: 175.25 },
    { date: '2025-06-25', description: 'VOX CINEMAS', currency: 'AED', amount: 135.00 },
    { date: '2025-06-28', description: 'NOON.COM', currency: 'AED', amount: 415.04 }
  ]
};

// Sample Emirates NBD credit card statement
const enbdStatementData = {
  filename: 'ENBD_Statement_July_2025.pdf',
  accountNumber: '6889',
  statementDate: '2025-07-01',
  dueDate: '2025-07-22',
  totalAmount: 4520.01,
  minimumPayment: 229.11,
  availableCredit: 5479.99,
  isPasswordProtected: true,
  password: '556889',
  rawText: 'Emirates NBD Credit Card Statement - July 2025\nCard Number: **** **** **** 6889\nStatement Date: July 1, 2025\nDue Date: July 22, 2025\nTotal Amount Due: AED 4,520.01\nMinimum Payment Due: AED 229.11\n',
  transactions: [
    { date: '2025-06-05', description: 'IKEA DUBAI', currency: 'AED', amount: 1245.75 },
    { date: '2025-06-08', description: 'APPLE STORE', currency: 'AED', amount: 1899.00 },
    { date: '2025-06-12', description: 'SPINNEYS', currency: 'AED', amount: 312.40 },
    { date: '2025-06-15', description: 'CAREEM', currency: 'AED', amount: 78.50 },
    { date: '2025-06-18', description: 'DU TELECOM', currency: 'AED', amount: 350.26 },
    { date: '2025-06-22', description: 'SHEIN.COM', currency: 'AED', amount: 289.00 },
    { date: '2025-06-25', description: 'STARBUCKS', currency: 'AED', amount: 45.10 },
    { date: '2025-06-28', description: 'AMAZON.AE', currency: 'AED', amount: 300.00 }
  ]
};

// Sample ADCB credit card statement
const adcbStatementData = {
  filename: 'ADCB_Statement_July_2025.pdf',
  accountNumber: '7033',
  statementDate: '2025-07-03',
  dueDate: '2025-07-27',
  totalAmount: 3299.57,
  minimumPayment: 165.00,
  availableCredit: 6700.43,
  isPasswordProtected: true,
  password: '01011990',
  rawText: 'ADCB Credit Card Statement - July 2025\nCard Number: **** **** **** 7033\nStatement Date: July 3, 2025\nDue Date: July 27, 2025\nTotal Amount Due: AED 3,299.57\nMinimum Payment Due: AED 165.00\n',
  transactions: [
    { date: '2025-06-07', description: 'SHARAF DG', currency: 'AED', amount: 879.50 },
    { date: '2025-06-10', description: 'CARREFOUR', currency: 'AED', amount: 230.75 },
    { date: '2025-06-14', description: 'DEWA', currency: 'AED', amount: 450.00 },
    { date: '2025-06-17', description: 'NETFLIX', currency: 'AED', amount: 39.99 },
    { date: '2025-06-20', description: 'LULU HYPERMARKET', currency: 'AED', amount: 345.65 },
    { date: '2025-06-24', description: 'ADNOC', currency: 'AED', amount: 153.68 },
    { date: '2025-06-27', description: 'H&M', currency: 'AED', amount: 420.00 },
    { date: '2025-06-30', description: 'UBER', currency: 'AED', amount: 80.00 },
    { date: '2025-07-01', description: 'NOON.COM', currency: 'AED', amount: 700.00 }
  ]
};

// Function to demonstrate email processing
async function demonstrateEmailProcessing() {
  try {
    console.log('🚀 Starting WioBank Email Processing Demonstration');
    console.log('------------------------------------------------');
    console.log(`Processing ${demoEmails.length} bank emails...`);
    
    // Store emails in database
    for (let i = 0; i < demoEmails.length; i++) {
      const email = demoEmails[i];
      console.log(`\nProcessing email ${i+1}/${demoEmails.length}:`);
      console.log(`From: ${email.sender}`);
      console.log(`Subject: ${email.subject}`);
      
      try {
        // Add email to database
        const emailResponse = await axios.post('http://localhost:3000/api/email/demo', {
          email: {
            id: email.id,
            subject: email.subject,
            from: email.sender,
            date: email.date,
            snippet: email.snippet,
            body: email.body,
            attachments: email.hasAttachment ? [{ filename: `statement_${email.bankType.toLowerCase().replace(/\s+/g, '_')}.pdf` }] : []
          }
        });
        
        console.log(`✅ Email saved: ${emailResponse.data.success ? 'Success' : 'Failed'}`);
        
        // Process statement based on bank type
        let statementData;
        switch (email.bankType) {
          case 'FAB':
            statementData = fabStatementData;
            break;
          case 'Emirates NBD':
            statementData = enbdStatementData;
            break;
          case 'ADCB':
            statementData = adcbStatementData;
            break;
          default:
            statementData = fabStatementData; // Default to FAB
        }
        
        // Process statement
        console.log(`Processing ${email.bankType} statement...`);
        const statementResponse = await axios.post('http://localhost:3000/api/email/demo/process-statement', {
          emailId: email.id,
          pdfData: {
            filename: statementData.filename,
            isPasswordProtected: statementData.isPasswordProtected,
            password: statementData.password,
            rawText: statementData.rawText,
            parsed: {
              accountNumber: statementData.accountNumber,
              statementDate: statementData.statementDate,
              dueDate: statementData.dueDate,
              totalAmount: statementData.totalAmount,
              minimumPayment: statementData.minimumPayment,
              availableCredit: statementData.availableCredit,
              transactions: statementData.transactions
            }
          }
        });
        
        console.log(`✅ Statement processing: ${statementResponse.data.success ? 'Success' : 'Failed'}`);
        console.log(`📊 Extracted ${statementData.transactions.length} transactions`);
      } catch (error) {
        console.error(`❌ Error processing email: ${error.message}`);
      }
      
      // Add a small delay between emails for better demonstration flow
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Demonstrate AI intelligence on bank detection
    console.log('\n🧠 Demonstrating Bank Intelligence...');
    try {
      const aiResponse = await axios.post('http://localhost:3000/api/email/demo/intelligence', {
        emailContent: demoEmails[0].body
      });
      
      if (aiResponse.data.success) {
        const result = aiResponse.data.result;
        console.log(`✅ Bank detected: ${result.bank} (${Math.round(result.confidence * 100)}% confidence)`);
        console.log(`📋 Password pattern detected: ${result.passwordPattern}`);
        console.log(`🔐 Generated password candidates: ${result.passwordCandidates.length}`);
        console.log(`💳 Card number detected: ${result.cardNumbers[0] || 'None'}`);
      }
    } catch (error) {
      console.error(`❌ Error with AI intelligence: ${error.message}`);
    }
    
    // Final report
    console.log('\n📝 Email Processing Report:');
    console.log(`- Total emails processed: ${demoEmails.length}`);
    console.log(`- Total statements processed: ${demoEmails.filter(e => e.hasAttachment).length}`);
    console.log(`- Total transactions extracted: ${fabStatementData.transactions.length + enbdStatementData.transactions.length + adcbStatementData.transactions.length}`);
    
    console.log('\n✨ Demo completed successfully!');
    console.log('💡 Navigate to the dashboard to see the processed data and analytics.');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Run the demonstration
demonstrateEmailProcessing();
