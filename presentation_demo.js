// Quick SMS demo script for presentation
// This script adds a batch of demonstration SMS messages to the database
// Run with: node presentation_demo.js

const axios = require('axios');
const { addDays } = require('date-fns');

// Demo SMS messages with different formats and banks
const demoSMSMessages = [
  {
    text: "Your statement of the card ending with 1122 dated 14Jun2025 has been sent to you and can also be viewed in the new FAB mobile banking app, download it from the App Store or Google Play. The total amount due is AED 1,911.69. Minimum due is AED 200.00. Due date is 25Jul2025",
    sender: "FAB",
    timestamp: new Date().toISOString()
  },
  {
    text: "Emirates NBD Credit Card Mini Stmt for Card ending 6889: Statement date 27/06/25. Total Amt Due AED 4,520.01, Due Date 22/07/25. Min Amt Due AED 229.11. Avoid late payment fees by paying on time.",
    sender: "Emirates NBD",
    timestamp: new Date().toISOString()
  },
  {
    text: "ADCB: Your ADCB Credit Card statement for ****7033 is ready. Total due: AED 3,299.57. Min due: AED 165.00. Due date: 12Jul2025. Log in to ADCB mobile app to view your statement.",
    sender: "ADCB",
    timestamp: new Date().toISOString()
  },
  {
    text: "Dear Customer, Your Payment of AED 1,911.69 for card 4727XXXXXXXX1122 has been processed on 10/07/2025. Your available credit limit is AED 8,088.31. Thank you for banking with FAB.",
    sender: "FAB",
    timestamp: new Date().toISOString()
  },
  {
    text: "This is to confirm receipt of your payment of AED 2,010.00 towards your Credit Card ending with 6889 on 10/07/2025. Available limit is AED 4,042.45. Thank you for banking with Emirates NBD.",
    sender: "Emirates NBD",
    timestamp: new Date().toISOString()
  },
  {
    text: "FAB: Reminder for your credit card ending 1122. Your payment of AED 1,911.69 (min AED 200.00) is due on 25Jul2025. Please ensure sufficient funds to avoid late payment charges.",
    sender: "FAB",
    timestamp: new Date().toISOString()
  },
  {
    text: "Emirates NBD: Your payment for card ending 6889 is due on 22Jul2025. Total due: AED 4,520.01. Min due: AED 229.11. Avoid AED 241.50 late fees by paying on time.",
    sender: "Emirates NBD",
    timestamp: new Date().toISOString()
  },
  {
    text: "FAB:CreditCardStmt*1122 dated 14JUN25. TotalDue:AED1911.69 MinDue:AED200.00 DueDate:25JUL25 AvlBal:AED8088.31 ViewFABApp StmtTxns:Noon.com:AED550.25,CarrefourUAE:AED245.70,DEWA:AED422.14",
    sender: "FAB",
    timestamp: new Date().toISOString()
  },
  {
    text: "ADCB Summary: Cards due - Card1(7033):AED3299.57 due 12Jul25, Card2(8044):AED1455.20 due 15Jul25. Total due: AED4754.77. Pay via ADCB mobile app.",
    sender: "ADCB",
    timestamp: new Date().toISOString()
  },
  {
    text: "Mashreq: Your credit card statement for card ending 5566 is now available. Statement date: 05Jul2025. Total due: AED 2,765.25. Min due: AED 138.26. Due date: 28Jul2025. Avoid late fees by paying on time.",
    sender: "Mashreq",
    timestamp: new Date().toISOString()
  }
];

async function runDemoPresentation() {
  try {
    console.log('🚀 Starting WioBank SMS Parser Presentation Demo');
    console.log('------------------------------------------------');
    
    // Process messages one by one instead of using batch endpoint
    console.log(`Processing ${demoSMSMessages.length} demonstration SMS messages...`);
    console.log('');
    
    const parsedMessages = [];
    
    // Process each message individually
    for (const message of demoSMSMessages) {
      try {
        const response = await axios.post('http://localhost:3000/api/sms/parse', {
          text: message.text,
          sender: message.sender,
          timestamp: message.timestamp
        });
        
        if (response.data.success && response.data.data) {
          parsedMessages.push(response.data.data);
          console.log(`✅ Parsed SMS from ${message.sender}: ${message.text.substring(0, 50)}...`);
        }
      } catch (error) {
        console.log(`❌ Failed to parse SMS from ${message.sender}`);
      }
      
      // Small delay to avoid overloading the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('');
    console.log(`✅ Successfully processed ${parsedMessages.length} SMS messages`);
    console.log('');
    
    // Summary of parsed SMS messages
    console.log('📊 Parsing Results Summary:');
    
    // Count by bank
    const bankCounts = {};
    // Count by message type
    const typeCounts = {};
    
    parsedMessages.forEach(sms => {
      if (sms.bank) {
        bankCounts[sms.bank] = (bankCounts[sms.bank] || 0) + 1;
      }
      
      if (sms.messageType) {
        typeCounts[sms.messageType] = (typeCounts[sms.messageType] || 0) + 1;
      }
    });
    
    // Print statistics
    console.log('');
    console.log('Banks detected:');
    Object.entries(bankCounts).forEach(([bank, count]) => {
      console.log(`  - ${bank}: ${count} messages`);
    });
    
    console.log('');
    console.log('Message types detected:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} messages`);
    });
    
    // Print upcoming payments
    const upcomingDueDates = parsedMessages
      .filter(sms => sms.dueDate && new Date(sms.dueDate) > new Date())
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    console.log('');
    console.log('📅 Upcoming Payments Detected:');
    if (upcomingDueDates.length > 0) {
      upcomingDueDates.forEach(sms => {
        const dueDate = new Date(sms.dueDate).toLocaleDateString();
        console.log(`  - ${sms.bank || 'Unknown Bank'} card ending ${sms.cardNumber}: AED ${sms.totalAmount} due on ${dueDate}`);
      });
    } else {
      console.log('  No upcoming payments detected');
    }
    
    console.log('');
    console.log('✨ Demo completed successfully! The SMS parsing data is now available in the dashboard.');
    console.log('💡 TIP: Navigate to the SMS page in the web interface to see all parsed messages.');
    
  } catch (error) {
    console.error('❌ Error running demo presentation:', error.response?.data?.error || error.message);
  }
}

runDemoPresentation();
