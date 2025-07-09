// Test AI-Powered Automation for WioBank Credit Card Assistant
// This file tests the complete AI automation without manual input

const BankIntelligenceProcessor = require('./server/utils/bankIntelligence');

// Test data simulating FAB bank email content
const testEmailContent = `
Subject: Your FAB Credit Card Statement - Card ending 6109

Dear Valued Customer,

Your First Abu Dhabi Bank credit card statement for the period ending March 2025 is now available.

Card ending with 6109
Statement period: 01/03/2025 to 31/03/2025
Total amount due: AED 2,847.50
Minimum payment due: AED 142.38
Payment due date: 25/04/2025

To access your password-protected statement, please use your year of birth, followed by the last four digits of your registered mobile number.

For example, if you were born in 1980 and your mobile number is 050 123 4567, your password would be 19804567.

Please contact us at 600 52 3322 if you need assistance.

Best regards,
First Abu Dhabi Bank
`;

async function testAIAutomation() {
    console.log('🤖 Testing AI-Powered Bank Intelligence\n');
    
    try {
        // Initialize AI processor
        const aiProcessor = new BankIntelligenceProcessor();
        
        console.log('📧 Analyzing Email Content...');
        console.log('Email Content Length:', testEmailContent.length, 'characters\n');
        
        // Extract intelligence from email
        const intelligence = aiProcessor.extractEmailIntelligence(testEmailContent);
        
        // Display AI analysis results
        console.log('🏦 BANK DETECTION:');
        console.log('  Bank:', intelligence.bankDetection.bank);
        console.log('  Confidence:', (intelligence.bankDetection.confidence * 100).toFixed(1) + '%');
        console.log('');
        
        console.log('💳 CARD INFORMATION:');
        console.log('  Card Numbers Found:', intelligence.cardNumbers);
        console.log('');
        
        console.log('👤 PERSONAL INFORMATION:');
        console.log('  Birth Years:', intelligence.personalInfo.years);
        console.log('  Mobile Numbers:', intelligence.personalInfo.mobileNumbers);
        console.log('');
        
        console.log('🔐 PASSWORD HINTS:');
        console.log('  Explicit Hints:', intelligence.passwords.explicit);
        console.log('  Pattern Instructions:', intelligence.passwords.patterns);
        console.log('  Examples Found:', intelligence.passwords.examples);
        console.log('');
        
        console.log('🧠 CONTEXTUAL ANALYSIS:');
        console.log('  Password Protected:', intelligence.contextualClues.isPasswordProtected);
        console.log('  Security Level:', intelligence.contextualClues.securityLevel);
        console.log('  Keywords Found:', intelligence.contextualClues.keywords.slice(0, 5), '...');
        console.log('');
        
        console.log('🎯 OVERALL CONFIDENCE:', (intelligence.confidence * 100).toFixed(1) + '%');
        console.log('');
        
        // Generate smart passwords
        console.log('🔐 GENERATING SMART PASSWORDS...');
        const smartPasswords = aiProcessor.generateSmartPasswords(intelligence);
        
        console.log('Generated', smartPasswords.length, 'password candidates:');
        console.log('Top 10 passwords:', smartPasswords.slice(0, 10));
        console.log('');
        
        // Test specific FAB password pattern
        const expectedPassword = '19804567'; // From the example in email
        const containsExpected = smartPasswords.includes(expectedPassword);
        
        console.log('✅ VALIDATION:');
        console.log('  Expected Password (19804567):', containsExpected ? '✅ FOUND' : '❌ MISSING');
        console.log('  Bank Detection:', intelligence.bankDetection.bank === 'FAB' ? '✅ CORRECT' : '❌ INCORRECT');
        console.log('  Card Extraction:', intelligence.cardNumbers.includes('6109') ? '✅ CORRECT' : '❌ INCORRECT');
        console.log('');
        
        // Automation level assessment
        console.log('🎖️ AUTOMATION ASSESSMENT:');
        const automationLevel = calculateAutomationLevel(intelligence);
        console.log('  Level:', automationLevel.level + '%');
        console.log('  Description:', automationLevel.description);
        console.log('');
        
        // Success summary
        const successRate = [
            containsExpected,
            intelligence.bankDetection.bank === 'FAB',
            intelligence.cardNumbers.includes('6109'),
            intelligence.confidence > 0.7
        ].filter(Boolean).length / 4 * 100;
        
        console.log('🏆 OVERALL SUCCESS RATE:', successRate.toFixed(1) + '%');
        
        if (successRate >= 75) {
            console.log('🎉 AI AUTOMATION: EXCELLENT! Fully automated processing is ready.');
        } else if (successRate >= 50) {
            console.log('⚠️ AI AUTOMATION: GOOD! Mostly automated with some manual oversight needed.');
        } else {
            console.log('❌ AI AUTOMATION: NEEDS IMPROVEMENT! Manual intervention required.');
        }
        
    } catch (error) {
        console.error('❌ AI Automation Test Failed:', error);
    }
}

function calculateAutomationLevel(intelligence) {
    let score = 0;
    
    // Bank detection
    score += intelligence.bankDetection.confidence * 25;
    
    // Information extraction
    if (intelligence.cardNumbers.length > 0) score += 20;
    if (intelligence.passwords.explicit.length > 0) score += 25;
    if (intelligence.personalInfo.years.length > 0) score += 15;
    if (intelligence.personalInfo.mobileNumbers.length > 0) score += 15;
    
    return {
        level: Math.min(score, 100),
        description: score > 80 ? 'Fully Automated' : 
                    score > 60 ? 'Highly Automated' :
                    score > 40 ? 'Partially Automated' : 'Manual Assistance Required'
    };
}

// Run the test
if (require.main === module) {
    testAIAutomation();
}

module.exports = { testAIAutomation };
