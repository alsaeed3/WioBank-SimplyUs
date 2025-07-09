const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing API endpoints...');
    
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('Health status:', healthResponse.data);
    
    // Test API info endpoint
    console.log('2. Testing API info endpoint...');
    const apiResponse = await axios.get('http://localhost:3000/api');
    console.log('API info:', apiResponse.data);
    
    // Test SMS messages endpoint
    console.log('3. Testing SMS messages endpoint...');
    const smsResponse = await axios.get('http://localhost:3000/api/sms/messages');
    console.log('SMS messages:', smsResponse.data);
    
    // Test analytics endpoint
    console.log('4. Testing analytics endpoint...');
    const analyticsResponse = await axios.get('http://localhost:3000/api/analytics/dashboard');
    console.log('Analytics:', analyticsResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAPI();
