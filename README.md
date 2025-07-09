# WioBank Credit Card Assistant

## 🏆 Hackathon Solution: AI-Powered Credit Card Management

A comprehensive AI-powered solution for managing credit card payments through SMS parsing and email statement analysis.

## 🎯 Features

### Part 1: SMS Parsing & Due Date Reminders (100 Points)
- **Advanced SMS Parsing**: Handles multiple SMS formats from different banks
- **NLP Processing**: Extracts due dates, amounts, card numbers, and payment confirmations
- **Payment Detection**: Identifies and tracks payment confirmations
- **Multi-Bank Support**: Works with FAB, Emirates NBD, and other UAE banks
- **Confidence Scoring**: Provides accuracy assessment for each parsing

### Part 2: Email Statement Processing (100 Points)
- **Gmail API Integration**: Secure OAuth-based email access
- **PDF Statement Processing**: Extracts data from PDF statements
- **Password-Protected PDFs**: Automated password cracking using heuristics
- **OCR Support**: Handles scanned documents with Tesseract
- **Transaction Categorization**: ML-driven spending category analysis

### Additional Features
- **Analytics Dashboard**: Comprehensive spending insights
- **Smart Notifications**: Intelligent payment reminders
- **Modern Web Interface**: Responsive Bootstrap UI
- **RESTful API**: Complete API for mobile/web integration
- **Security**: JWT authentication, rate limiting, input validation
- **Privacy-First**: On-device processing, secure data handling

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **NLP**: Natural.js, Compromise.js
- **Email**: Gmail API, Nodemailer
- **PDF Processing**: PDF-parse, PDFtk, Tesseract.js
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5, Chart.js
- **Security**: Helmet, Rate Limiting, JWT Authentication

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/wiobank-simplyus.git
   cd wiobank-simplyus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Install system dependencies** (for PDF processing)
   ```bash
   # Ubuntu/Debian
   sudo apt-get install qpdf tesseract-ocr

   # macOS
   brew install qpdf tesseract

   # Windows 11/10
   # Download and install Tesseract OCR from:
   # https://github.com/UB-Mannheim/tesseract/releases
   # Download and install QPDF from:
   # https://github.com/qpdf/qpdf/releases
   # Make sure to add both tools to your Windows PATH environment variable
   ```

### Windows Installation Details

For Windows users, after downloading and installing both tools, you need to add them to your PATH:

1. **Find installation directories**:
   - Tesseract OCR: Usually `C:\Program Files\Tesseract-OCR`
   - QPDF: Usually `C:\Program Files\qpdf\bin` or wherever you extracted it

2. **Add to PATH**:
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Click "Environment Variables" button
   - Under "System Variables", find and select "Path", click "Edit"
   - Click "New" and add the Tesseract OCR directory
   - Click "New" and add the QPDF bin directory
   - Click "OK" to save all changes

3. **Verify installation**:
   ```bash
   # Restart PowerShell and test:
   tesseract --version
   qpdf --version
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Access the application**
   Open your browser and go to `http://localhost:3000`

## 🔧 Configuration

### Gmail API Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create credentials (OAuth 2.0 Client ID)
5. Add credentials to your `.env` file

### Environment Variables
```bash
# Server
PORT=3000
NODE_ENV=development

# Gmail API
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Database
DATABASE_URL=./server/data/wiobank.db

# Security
JWT_SECRET=your-jwt-secret
```

## 📱 API Endpoints

### SMS Processing
- `POST /api/sms/parse` - Parse single SMS message
- `POST /api/sms/parse-batch` - Parse multiple SMS messages
- `GET /api/sms/messages` - Get all SMS messages
- `GET /api/sms/due-dates` - Get upcoming due dates
- `GET /api/sms/payments` - Get recent payments

### Email Processing
- `POST /api/email/init` - Initialize email service
- `POST /api/email/search` - Search credit card emails
- `POST /api/email/process-statement` - Process PDF statement
- `GET /api/email/statements` - Get processed statements
- `GET /api/email/insights` - Get spending insights

### Analytics
- `GET /api/analytics/dashboard` - Dashboard data
- `GET /api/analytics/spending` - Spending analytics
- `GET /api/analytics/payments` - Payment analytics
- `GET /api/analytics/trends` - Category trends

### Notifications
- `GET /api/notifications` - Get notifications
- `POST /api/notifications/generate-reminders` - Generate reminders
- `PUT /api/notifications/:id/read` - Mark as read

## 🧪 Testing

### SMS Parsing Test
```bash
curl -X POST http://localhost:3000/api/sms/test
```

### Email Processing Test
```bash
curl -X POST http://localhost:3000/api/email/test
```

### Sample SMS Messages
The application includes sample SMS messages for testing:
- Statement notifications
- Payment confirmations
- Billing alerts
- Due date reminders

## 🔒 Security Features

- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Validates all inputs
- **SQL Injection Protection**: Parameterized queries
- **CORS Protection**: Configurable CORS policies
- **Helmet Security**: Security headers
- **JWT Authentication**: Secure authentication

## 🎯 Scoring Criteria

### Part 1: SMS Parsing (100 Points)
- ✅ **50 Points**: Reading/Parsing different SMS formats
  - Due date extraction
  - Total amount identification
  - Remaining amount detection
- ✅ **50 Points**: Payment detection and confirmation

### Part 2: Email Statement Processing (100 Points)
- ✅ **50 Points**: Accessing credit card emails
- ✅ **20 Points**: Password-protected statement access
- ✅ **30 Points**: Statement reading and parsing

### Additional Features
- ✅ **Privacy & Security**: On-device processing capabilities
- ✅ **AI/ML Integration**: Natural language processing
- ✅ **User Experience**: Modern, responsive interface
- ✅ **Innovation**: Smart reminder system

## 📊 Demo Data

The application includes sample data for demonstration:
- Sample SMS messages from UAE banks
- Sample credit card statement
- Transaction categorization examples
- Spending insights and analytics

## 🚦 Getting Started

1. **Quick Test**: Use the "Test SMS Parsing" button in Settings
2. **Parse SMS**: Copy-paste SMS messages in the SMS Parser section
3. **Upload Statement**: Upload PDF statements in the Statements section
4. **View Analytics**: Check the Analytics section for insights
5. **Set Reminders**: Configure notifications in Settings

## 🔮 Future Enhancements

- **Machine Learning**: Advanced transaction categorization
- **Multi-language Support**: Arabic language support
- **Mobile App**: Native mobile application
- **Bank Integration**: Direct API integration with banks
- **Expense Tracking**: Comprehensive expense management
- **Budget Planning**: AI-powered budget recommendations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please contact:
- Email: support@wiobank.com
- GitHub Issues: [Create an issue](https://github.com/yourusername/wiobank-simplyus/issues)

## 🏆 Hackathon Submission

This project was developed for the WioBank Hackathon 2025 - "Smarter Credit Card Management with AI: From SMS Alerts to Email Insights"

### Team Information
- **Team Name**: SimplyUs
- **Challenge**: AI-Powered Credit Card Bill Pay Assistant
- **Technologies**: Node.js, AI/ML, NLP, PDF Processing, Email Integration

### Demonstration Video
[Link to demonstration video]

### Live Demo
[Link to live demo]

---

Built with ❤️ by Team SimplyUs for WioBank Hackathon 2025