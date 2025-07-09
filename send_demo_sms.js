// Simple SMS demo sender for presentation
// This script allows you to quickly send individual SMS messages for demo purposes
// Run with: node send_demo_sms.js "Your SMS message here" "Sender Name"

const axios = require('axios');

async function sendDemoSMS() {
  try {
    // Get SMS text from command line arguments
    const smsText = process.argv[2] || "Your statement of the card ending with 1122 dated 14Jun2025 has been sent to you. The total amount due is AED 1,911.69. Minimum due is AED 200.00. Due date is 25Jul2025";
    const smsSender = process.argv[3] || "FAB";
    
    console.log(`Sending demo SMS from "${smsSender}"...`);
    console.log(`Text: ${smsText}`);
    console.log('');
    
    // Send the SMS to the parsing endpoint
    const response = await axios.post('http://localhost:3000/api/sms/parse', {
      text: smsText,
      sender: smsSender,
      timestamp: new Date().toISOString()
    });
    
    if (response.data.success) {
      console.log('✅ SMS successfully parsed!');
      console.log('');
      console.log('📊 Parsing Results:');
      
      const result = response.data.data;
      
      console.log(`  - Bank: ${result.bank || 'Unknown Bank'}`);
      console.log(`  - Card Number: ${result.cardNumber || 'Not detected'}`);
      console.log(`  - Message Type: ${result.messageType || 'Unknown'}`);
      console.log(`  - Total Amount: AED ${result.totalAmount || 'Not detected'}`);
      console.log(`  - Minimum Amount: AED ${result.minimumAmount || 'Not detected'}`);
      
      if (result.dueDate) {
        console.log(`  - Due Date: ${new Date(result.dueDate).toDateString()}`);
      } else {
        console.log(`  - Due Date: Not detected`);
      }
      
      if (result.paymentDate) {
        console.log(`  - Payment Date: ${new Date(result.paymentDate).toDateString()}`);
      }
      
      if (result.paymentAmount) {
        console.log(`  - Payment Amount: AED ${result.paymentAmount}`);
      }
      
      console.log(`  - Confidence: ${Math.round(result.confidence * 100)}%`);
    } else {
      console.log('❌ SMS parsing failed');
      console.log(response.data);
    }
  } catch (error) {
    console.error('❌ Error sending demo SMS:', error.response?.data?.error || error.message);
  }
}

sendDemoSMS();
