const axios = require('axios');

// Test SMS parsing with sample messages from the hackathon
const sampleSMSMessages = [
  {
    text: "Your statement of the card ending with 1122 dated 11Jun25 has been sent to you and can also be viewed in the new FAB mobile banking app, download it from the App Store goo.gl/FB7qEZ or Google Play goo.gl/7dXnNc. The total amount due is AED 911.69. Minimum due is AED 100.00. Due date is 07Jul25",
    sender: "FAB",
    timestamp: new Date().toISOString()
  },
  {
    text: "Dear Customer, Your Payment of AED 911.69 for card 4727XXXXXXXX1122 has been processed on 07/07/2025",
    sender: "FAB",
    timestamp: new Date().toISOString()
  },
  {
    text: "Emirates NBD Credit Card Mini Stmt for Card ending 6889: Statement date 27/06/25. Total Amt Due AED 8820.01, Due Date 22/07/25. Min Amt Due AED 229.11",
    sender: "Emirates NBD",
    timestamp: new Date().toISOString()
  },
  {
    text: "This is to confirm receipt of your payment of AED 2010.00 towards your Credit Card ending with 6889 on 10/07/2025. Available limit is AED 4,042.45.",
    sender: "Emirates NBD",
    timestamp: new Date().toISOString()
  },
  {
    text: "Cr.Card XXX7033 Billing alert: Total due to avoid fin. charges: AED1999.57. Due date Jul 5 2025; Pay min. AED100.00 by due date to avoid AED241.50 late fees.",
    sender: "Bank",
    timestamp: new Date().toISOString()
  }
];

async function testSMSParsing() {
  try {
    console.log('Testing SMS parsing...');
    
    // Test batch parsing
    const response = await axios.post('http://localhost:3000/api/sms/parse-batch', {
      messages: sampleSMSMessages
    });
    
    console.log('Batch parsing results:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Test individual parsing
    const individualResponse = await axios.post('http://localhost:3000/api/sms/parse', {
      text: sampleSMSMessages[0].text,
      sender: sampleSMSMessages[0].sender,
      timestamp: sampleSMSMessages[0].timestamp
    });
    
    console.log('Individual parsing result:');
    console.log(JSON.stringify(individualResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error testing SMS parsing:', error.response?.data || error.message);
  }
}

testSMSParsing();
