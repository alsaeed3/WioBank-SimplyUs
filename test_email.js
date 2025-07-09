const axios = require('axios');

async function testEmailFeatures() {
  console.log('Testing Email Processing Features...\n');
  
  // Test email search simulation (without real Gmail API)
  console.log('1. Testing email search simulation...');
  try {
    const response = await axios.get('http://localhost:3000/api/email/search?query=credit card statement');
    console.log('Email search results:', response.data);
  } catch (error) {
    console.log('Email search error (expected without Gmail auth):', error.response?.data || error.message);
  }
  
  // Test statement processing
  console.log('\n2. Testing statement processing...');
  try {
    const response = await axios.get('http://localhost:3000/api/statements');
    console.log('Statements:', response.data);
  } catch (error) {
    console.log('Statements error:', error.response?.data || error.message);
  }
  
  // Test notifications
  console.log('\n3. Testing notifications...');
  try {
    const response = await axios.get('http://localhost:3000/api/notifications');
    console.log('Notifications:', response.data);
  } catch (error) {
    console.log('Notifications error:', error.response?.data || error.message);
  }
}

testEmailFeatures();
