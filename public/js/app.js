// WioBank Credit Card Assistant - Frontend JavaScript
class WioBankApp {
    constructor() {
        this.apiBase = '/api';
        this.charts = {};
        this.init();
    }

    init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.loadDashboard();
            });
        } else {
            this.setupEventListeners();
            this.loadDashboard();
        }
    }

    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                this.showSection(section);
                
                // Update active state
                document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // SMS Form
        document.getElementById('sms-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.parseSMS();
        });

        // Statement Form
        document.getElementById('statement-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.processStatement();
        });
        
        // Notification badge click handler
        document.getElementById('notification-badge').addEventListener('click', () => {
            this.showSection('notifications');
            // Update active sidebar item
            document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
            document.querySelector('[data-section="notifications"]').classList.add('active');
        });
        
        // Test buttons
        document.getElementById('test-sms').addEventListener('click', () => this.testSMSParsing());
        document.getElementById('test-email').addEventListener('click', () => this.testEmailProcessing());
        document.getElementById('generate-reminders').addEventListener('click', () => this.generateReminders());
        
        // FAB Email Search
        document.getElementById('search-fab-emails').addEventListener('click', () => this.searchFABEmails());
    }

    showSection(section) {
        // Hide all sections
        document.querySelectorAll('[id$="-section"]').forEach(el => {
            el.style.display = 'none';
        });

        // Show selected section
        document.getElementById(`${section}-section`).style.display = 'block';

        // Load section-specific data
        switch(section) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'sms':
                this.loadSMSMessages();
                break;
            case 'statements':
                this.loadStatements();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'notifications':
                this.loadNotifications();
                break;
        }
    }

    async loadDashboard() {
        try {
            const response = await fetch(`${this.apiBase}/analytics/dashboard`);
            const data = await response.json();
            
            if (data.success) {
                this.updateDashboardStats(data.data);
                this.createCharts(data.data);
                this.loadUpcomingPayments();
                this.updateNotificationCount();
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    updateDashboardStats(data) {
        document.getElementById('total-cards').textContent = data.smsStats.banks ? Object.keys(data.smsStats.banks).length : 0;
        document.getElementById('pending-payments').textContent = data.upcomingPayments || 0;
        document.getElementById('total-spending').textContent = this.formatCurrency(data.totalSpending || 0);
        document.getElementById('processed-sms').textContent = data.smsStats.total || 0;
    }

    async updateNotificationCount() {
        try {
            const response = await fetch(`${this.apiBase}/notifications`);
            const data = await response.json();
            
            if (data.success) {
                const unreadCount = data.data.notifications.filter(n => !n.is_read).length;
                const badge = document.getElementById('notification-badge');
                badge.setAttribute('data-count', unreadCount);
            }
        } catch (error) {
            console.error('Error loading notification count:', error);
        }
    }

    createCharts(data) {
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded. Retrying in 1 second...');
            setTimeout(() => this.createCharts(data), 1000);
            return;
        }

        // Spending Trends Chart
        const spendingCtx = document.getElementById('spendingChart')?.getContext('2d');
        if (!spendingCtx) {
            console.error('Spending chart canvas not found');
            return;
        }
        
        if (this.charts.spending) {
            this.charts.spending.destroy();
        }
        
        // Filter out invalid monthly trends and provide fallback data
        const validMonthlyTrends = (data.monthlyTrends || []).filter(t => t && t.month && typeof t.month === 'string');
        
        // If no valid monthly trends, create a fallback with current month
        const trendsToUse = validMonthlyTrends.length > 0 ? validMonthlyTrends : [{
            month: new Date().toISOString().substring(0, 7), // Format: YYYY-MM
            total_amount: data.totalSpending || 0
        }];
        
        this.charts.spending = new Chart(spendingCtx, {
            type: 'line',
            data: {
                labels: trendsToUse.map(t => this.formatMonth(t.month)),
                datasets: [{
                    label: 'Monthly Spending',
                    data: trendsToUse.map(t => t.total_amount || 0),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'AED ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });

        // Category Chart
        const categoryCtx = document.getElementById('categoryChart')?.getContext('2d');
        if (!categoryCtx) {
            console.error('Category chart canvas not found');
            return;
        }
        
        if (this.charts.category) {
            this.charts.category.destroy();
        }
        
        this.charts.category = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: (data.topCategories || []).map(c => c.category || 'Unknown'),
                datasets: [{
                    data: (data.topCategories || []).map(c => c.total_amount || 0),
                    backgroundColor: [
                        '#ff6b6b',
                        '#4ecdc4',
                        '#45b7d1',
                        '#96ceb4',
                        '#ffeaa7'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    async loadUpcomingPayments() {
        try {
            const response = await fetch(`${this.apiBase}/sms/due-dates`);
            const data = await response.json();
            
            if (data.success) {
                this.displayUpcomingPayments(data.data);
            }
        } catch (error) {
            console.error('Error loading upcoming payments:', error);
        }
    }

    displayUpcomingPayments(payments) {
        const container = document.getElementById('upcoming-payments');
        container.innerHTML = '';

        if (payments.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No upcoming payments found.</div>';
            return;
        }

        payments.forEach(payment => {
            const dueDate = new Date(payment.due_date);
            const today = new Date();
            const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let urgencyClass = 'due-date-normal';
            if (daysLeft <= 1) urgencyClass = 'due-date-urgent';
            else if (daysLeft <= 3) urgencyClass = 'due-date-warning';

            const paymentCard = document.createElement('div');
            paymentCard.className = `card ${urgencyClass} mb-3`;
            paymentCard.innerHTML = `
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <h6 class="mb-0">${payment.bank || 'Unknown Bank'}</h6>
                            <small>Card ending in ${payment.card_number || 'XXXX'}</small>
                        </div>
                        <div class="col-md-3">
                            <h5 class="mb-0">${this.formatCurrency(payment.total_amount)}</h5>
                            <small>Total Due</small>
                        </div>
                        <div class="col-md-3">
                            <h5 class="mb-0">${this.formatCurrency(payment.minimum_amount)}</h5>
                            <small>Minimum Due</small>
                        </div>
                        <div class="col-md-3">
                            <h5 class="mb-0">${daysLeft} days</h5>
                            <small>Due: ${this.formatDate(dueDate)}</small>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(paymentCard);
        });
    }

    async parseSMS() {
        const text = document.getElementById('sms-text').value;
        const sender = document.getElementById('sms-sender').value;
        
        if (!text.trim()) {
            alert('Please enter SMS text');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/sms/parse`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    sender: sender,
                    timestamp: new Date().toISOString()
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.displaySMSResults(data.data);
                this.loadSMSMessages(); // Refresh the table
            } else {
                alert('Error parsing SMS: ' + data.error);
            }
        } catch (error) {
            console.error('Error parsing SMS:', error);
            alert('Error parsing SMS');
        }
    }

    displaySMSResults(result) {
        const container = document.getElementById('sms-results');
        
        const confidenceColor = result.confidence > 0.8 ? 'success' : 
                               result.confidence > 0.6 ? 'warning' : 'danger';
        
        container.innerHTML = `
            <div class="alert alert-${confidenceColor}">
                <h6>Confidence Score: ${(result.confidence * 100).toFixed(1)}%</h6>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <h6>Basic Information</h6>
                    <ul class="list-unstyled">
                        <li><strong>Message Type:</strong> ${result.messageType}</li>
                        <li><strong>Bank:</strong> ${result.bank || 'Not detected'}</li>
                        <li><strong>Card Number:</strong> ${result.cardNumber || 'Not detected'}</li>
                    </ul>
                </div>
                
                <div class="col-md-6">
                    <h6>Financial Information</h6>
                    <ul class="list-unstyled">
                        <li><strong>Total Amount:</strong> ${result.totalAmount ? this.formatCurrency(result.totalAmount) : 'Not detected'}</li>
                        <li><strong>Minimum Amount:</strong> ${result.minimumAmount ? this.formatCurrency(result.minimumAmount) : 'Not detected'}</li>
                        <li><strong>Due Date:</strong> ${result.dueDate ? this.formatDate(result.dueDate) : 'Not detected'}</li>
                        <li><strong>Payment Amount:</strong> ${result.paymentAmount ? this.formatCurrency(result.paymentAmount) : 'Not detected'}</li>
                    </ul>
                </div>
            </div>
        `;
    }

    async loadSMSMessages() {
        try {
            const response = await fetch(`${this.apiBase}/sms/messages`);
            const data = await response.json();
            
            if (data.success) {
                this.displaySMSMessages(data.data.messages);
            }
        } catch (error) {
            console.error('Error loading SMS messages:', error);
        }
    }

    displaySMSMessages(messages) {
        const tbody = document.getElementById('sms-messages-table');
        tbody.innerHTML = '';

        if (messages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No SMS messages found.</td></tr>';
            return;
        }

        messages.forEach(message => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatDate(message.timestamp)}</td>
                <td>${message.sender || 'Unknown'}</td>
                <td><span class="badge bg-${this.getMessageTypeBadge(message.message_type)}">${message.message_type}</span></td>
                <td>${message.card_number || 'N/A'}</td>
                <td>${message.total_amount ? this.formatCurrency(message.total_amount) : 'N/A'}</td>
                <td>${message.due_date ? this.formatDate(message.due_date) : 'N/A'}</td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar bg-${this.getConfidenceColor(message.confidence)}" 
                             style="width: ${(message.confidence * 100).toFixed(0)}%">
                            ${(message.confidence * 100).toFixed(0)}%
                        </div>
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="app.viewSMSDetails(${message.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }    async processStatement() {
        const fileInput = document.getElementById('statement-file');
        const cardNumber = document.getElementById('card-number').value;
        const pdfPassword = document.getElementById('pdf-password').value;
        const emailBody = document.getElementById('email-body').value;
        
        if (!fileInput.files[0]) {
            alert('Please select a PDF file');
            return;
        }

        const formData = new FormData();
        formData.append('statement', fileInput.files[0]);
        formData.append('cardNumber', cardNumber);
        if (pdfPassword) {
            formData.append('password', pdfPassword);
        }
        if (emailBody) {
            formData.append('emailBody', emailBody);
        }

        try {
            const response = await fetch(`${this.apiBase}/email/process-statement`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.success) {
                this.displayStatementResults(data.data);
                this.loadStatements(); // Refresh the list
            } else {
                // Better error handling for password-protected PDFs
                if (data.error.includes('password') || data.error.includes('encrypted')) {
                    alert('PDF appears to be password protected. Please enter the password in the password field and try again.\n\nFor FAB bank: Use format year of birth + last 4 digits of mobile (e.g., 19804567)\nOther common passwords like birth dates are automatically tried.');
                } else {
                    alert('Error processing statement: ' + data.error);
                }
            }
        } catch (error) {
            console.error('Error processing statement:', error);
            alert('Error processing statement: ' + error.message);
        }
    }    async searchFABEmails() {
        const button = document.getElementById('search-fab-emails');
        const resultsDiv = document.getElementById('fab-email-results');
        
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>AI Processing...';
        
        try {
            // Show AI processing status
            resultsDiv.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-robot me-2"></i>
                    <strong>AI-Powered Processing Started</strong><br>
                    • Searching for FAB bank emails<br>
                    • Analyzing email content with AI<br>
                    • Automatically detecting passwords<br>
                    • Processing PDF statements<br>
                    <div class="spinner-border spinner-border-sm ms-2" role="status"></div>
                </div>
            `;
            
            const response = await fetch(`${this.apiBase}/email/ai/process-fab`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    maxResults: 10,
                    dateRange: '6m'
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.displayAIProcessedResults(data, resultsDiv);
            } else {
                resultsDiv.innerHTML = `<div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>AI Processing Failed:</strong> ${data.error}
                </div>`;
            }
        } catch (error) {
            console.error('Error in AI processing:', error);
            resultsDiv.innerHTML = `<div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>AI Processing Error:</strong> ${error.message}
            </div>`;
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-robot me-2"></i>AI Process FAB Emails';
        }
    }

    displayAIProcessedResults(result, container) {
        const { data, summary, aiProcessed } = result;
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>No FAB Emails Found</strong><br>
                    Make sure Gmail is authenticated and you have FAB bank statement emails in the last 6 months.
                </div>
            `;
            return;
        }

        // Create summary section
        const summaryHtml = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle me-2"></i>
                <strong>AI Processing Complete!</strong><br>
                • Found ${summary.totalEmails} emails<br>
                • Successfully processed ${summary.processedEmails} emails<br>
                • Extracted ${summary.successfulPDFs} PDF statements<br>
                • Automatically cracked ${summary.automatedPasswords} passwords
            </div>
        `;

        // Create detailed results
        const emailsHtml = data.map(email => {
            const automationBadge = email.automationSuccess ? 
                '<span class="badge bg-success me-2"><i class="fas fa-robot"></i> Fully Automated</span>' :
                '<span class="badge bg-warning me-2"><i class="fas fa-user"></i> Partially Automated</span>';
            
            const confidenceBadge = email.confidence > 0.8 ? 'bg-success' : 
                                   email.confidence > 0.6 ? 'bg-warning' : 'bg-secondary';
            
            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${email.subject}</h6>
                            ${automationBadge}
                        </div>
                        
                        <div class="row mb-2">
                            <div class="col-md-6">
                                <small class="text-muted">From: ${email.from}</small><br>
                                <small class="text-muted">Date: ${new Date(email.date).toLocaleDateString()}</small>
                            </div>
                            <div class="col-md-6">
                                <small><strong>Bank:</strong> ${email.bankDetected}</small><br>
                                <small><strong>AI Confidence:</strong> 
                                    <span class="badge ${confidenceBadge}">${(email.confidence * 100).toFixed(1)}%</span>
                                </small>
                            </div>
                        </div>
                        
                        ${email.pdfProcessed ? `
                            <div class="alert alert-success mb-2">
                                <i class="fas fa-file-pdf me-2"></i>
                                <strong>PDF Successfully Processed</strong><br>
                                ${email.passwordCracked ? `• Password automatically detected: <code>${email.passwordCracked}</code><br>` : ''}
                                • Extracted ${email.transactionCount} transactions<br>
                                • Automation Level: ${email.automationLevel.description}
                            </div>
                        ` : `
                            <div class="alert alert-warning mb-2">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                PDF processing incomplete - may require manual intervention
                            </div>
                        `}
                        
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="app.viewEmailDetails('${email.id}')">
                                <i class="fas fa-eye me-1"></i>View Details
                            </button>
                            ${email.pdfProcessed ? `
                                <button class="btn btn-outline-success" onclick="app.viewTransactions('${email.id}')">
                                    <i class="fas fa-list me-1"></i>View Transactions
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = summaryHtml + emailsHtml;
    }

    async processFABEmail(emailId, cardNumber) {
        try {
            const response = await fetch(`${this.apiBase}/email/process-email-statement`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    emailId: emailId,
                    cardNumber: cardNumber
                })
            });

            const data = await response.json();
            
            if (data.success) {
                alert(`Successfully processed ${data.data.length} statement(s) from email`);
                this.loadStatements(); // Refresh the statements list
            } else {
                alert('Error processing email: ' + data.error);
            }
        } catch (error) {
            console.error('Error processing FAB email:', error);
            alert('Error processing email: ' + error.message);
        }
    }

    displayStatementResults(result) {
        const container = document.getElementById('statement-results');
        
        container.innerHTML = `
            <div class="alert alert-info">
                <h6>Statement Processed Successfully</h6>
                <p>File: ${result.filename}</p>
                ${result.isPasswordProtected ? `<p class="text-warning">Password protected: ${result.password ? 'Cracked' : 'Failed to crack'}</p>` : ''}
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <h6>Statement Details</h6>
                    <ul class="list-unstyled">
                        <li><strong>Account:</strong> ${result.parsed.accountNumber || 'Not found'}</li>
                        <li><strong>Statement Date:</strong> ${result.parsed.statementDate || 'Not found'}</li>
                        <li><strong>Due Date:</strong> ${result.parsed.dueDate || 'Not found'}</li>
                        <li><strong>Total Amount:</strong> ${result.parsed.totalAmount ? this.formatCurrency(result.parsed.totalAmount) : 'Not found'}</li>
                        <li><strong>Minimum Payment:</strong> ${result.parsed.minimumPayment ? this.formatCurrency(result.parsed.minimumPayment) : 'Not found'}</li>
                    </ul>
                </div>
                
                <div class="col-md-6">
                    <h6>Transaction Summary</h6>
                    <ul class="list-unstyled">
                        <li><strong>Total Transactions:</strong> ${result.parsed.transactions.length}</li>
                        <li><strong>Categories:</strong> ${Object.keys(result.parsed.merchantCategories).length}</li>
                    </ul>
                    
                    <h6>Top Categories</h6>
                    ${Object.entries(result.parsed.merchantCategories)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([category, amount]) => `
                            <div class="d-flex justify-content-between">
                                <span>${category}:</span>
                                <strong>${this.formatCurrency(amount)}</strong>
                            </div>
                        `).join('')}
                </div>
            </div>
        `;
    }

    async loadStatements() {
        try {
            const response = await fetch(`${this.apiBase}/statements`);
            const data = await response.json();
            
            if (data.success) {
                this.displayStatements(data.data.statements);
            }
        } catch (error) {
            console.error('Error loading statements:', error);
        }
    }

    displayStatements(statements) {
        const container = document.getElementById('statements-list');
        container.innerHTML = '';

        if (statements.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No statements found.</div>';
            return;
        }

        statements.forEach(statement => {
            const statementCard = document.createElement('div');
            statementCard.className = 'card mb-3';
            statementCard.innerHTML = `
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <h6 class="mb-0">${statement.filename}</h6>
                            <small class="text-muted">Account: ${statement.account_number || 'N/A'}</small>
                        </div>
                        <div class="col-md-2">
                            <strong>${this.formatCurrency(statement.total_amount)}</strong>
                            <br><small>Total Due</small>
                        </div>
                        <div class="col-md-2">
                            <strong>${this.formatCurrency(statement.minimum_payment)}</strong>
                            <br><small>Minimum</small>
                        </div>
                        <div class="col-md-2">
                            <strong>${statement.due_date ? this.formatDate(statement.due_date) : 'N/A'}</strong>
                            <br><small>Due Date</small>
                        </div>
                        <div class="col-md-2">
                            <strong>${this.formatDate(statement.created_at)}</strong>
                            <br><small>Processed</small>
                        </div>
                        <div class="col-md-1">
                            <button class="btn btn-sm btn-outline-primary" onclick="app.viewStatement(${statement.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(statementCard);
        });
    }

    async loadAnalytics() {
        try {
            const response = await fetch(`${this.apiBase}/analytics/spending`);
            const data = await response.json();
            
            if (data.success) {
                this.displayAnalytics(data.data);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    displayAnalytics(data) {
        // Create analytics chart
        const ctx = document.getElementById('analyticsChart').getContext('2d');
        if (this.charts.analytics) {
            this.charts.analytics.destroy();
        }
        
        this.charts.analytics = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.categoryInsights.map(c => c.category),
                datasets: [{
                    label: 'Spending by Category',
                    data: data.categoryInsights.map(c => c.total_amount),
                    backgroundColor: [
                        '#ff6b6b',
                        '#4ecdc4',
                        '#45b7d1',
                        '#96ceb4',
                        '#ffeaa7',
                        '#fab1a0',
                        '#a29bfe'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'AED ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });

        // Display category insights
        const categoryContainer = document.getElementById('category-insights');
        categoryContainer.innerHTML = '';

        data.categoryInsights.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'mb-3 p-3 bg-light rounded';
            categoryItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${category.category}</h6>
                        <small class="text-muted">${category.transaction_count} transactions</small>
                    </div>
                    <div class="text-end">
                        <h6 class="mb-0">${this.formatCurrency(category.total_amount)}</h6>
                        <small class="text-muted">Avg: ${this.formatCurrency(category.avg_amount)}</small>
                    </div>
                </div>
            `;
            categoryContainer.appendChild(categoryItem);
        });

        // Display payment history
        const paymentContainer = document.getElementById('payment-history');
        paymentContainer.innerHTML = '<p class="text-muted">Payment history will be displayed here based on SMS data.</p>';
    }

    async loadNotifications() {
        try {
            const response = await fetch(`${this.apiBase}/notifications`);
            const data = await response.json();
            
            if (data.success) {
                this.displayNotifications(data.data.notifications);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    displayNotifications(notifications) {
        const container = document.getElementById('notifications-list');
        container.innerHTML = '';

        if (notifications.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No notifications found.</div>';
            return;
        }

        notifications.forEach(notification => {
            const notificationCard = document.createElement('div');
            notificationCard.className = `card mb-3 ${notification.is_read ? 'bg-light' : ''}`;
            notificationCard.innerHTML = `
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-1">
                            <i class="fas fa-${this.getNotificationIcon(notification.type)} fa-2x text-${this.getNotificationColor(notification.type)}"></i>
                        </div>
                        <div class="col-md-8">
                            <h6 class="mb-1">${notification.title}</h6>
                            <p class="mb-1">${notification.message}</p>
                            <small class="text-muted">${this.formatDate(notification.created_at)}</small>
                        </div>
                        <div class="col-md-3 text-end">
                            ${notification.amount ? `<strong>${this.formatCurrency(notification.amount)}</strong><br>` : ''}
                            ${!notification.is_read ? `<button class="btn btn-sm btn-outline-primary" onclick="window.wioBankApp.markAsRead(${notification.id})">Mark as Read</button>` : '<span class="text-muted">Read</span>'}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(notificationCard);
        });
    }

    async generateReminders() {
        try {
            const response = await fetch(`${this.apiBase}/notifications/generate-reminders`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                alert(`Generated ${data.data.notificationsCreated} new reminders`);
                this.loadNotifications();
            }
        } catch (error) {
            console.error('Error generating reminders:', error);
        }
    }

    async markAsRead(notificationId) {
        try {
            await fetch(`${this.apiBase}/notifications/${notificationId}/read`, {
                method: 'PUT'
            });
            this.loadNotifications();
            this.updateNotificationCount(); // Update badge count
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async testSMSParsing() {
        try {
            const response = await fetch(`${this.apiBase}/sms/test`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                alert('SMS parsing test completed successfully');
                this.loadSMSMessages();
            }
        } catch (error) {
            console.error('Error testing SMS parsing:', error);
        }
    }

    async testEmailProcessing() {
        try {
            const response = await fetch(`${this.apiBase}/email/test`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                alert('Email processing test completed successfully');
                console.log('Test results:', data.data);
            }
        } catch (error) {
            console.error('Error testing email processing:', error);
        }
    }

    // Utility functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-AE', {
            style: 'currency',
            currency: 'AED'
        }).format(amount);
    }

    formatDate(date) {
        if (!date) return 'N/A';
        
        // Handle different input types
        let dateObj;
        
        if (date instanceof Date) {
            dateObj = date;
        } else if (typeof date === 'string') {
            dateObj = new Date(date);
        } else if (typeof date === 'number') {
            // Handle both positive and negative timestamps
            // Negative timestamps or very small numbers might be invalid
            if (date < -8640000000000000 || date > 8640000000000000) {
                return 'Invalid Date';
            }
            dateObj = new Date(date);
        } else {
            return 'Invalid Date';
        }
        
        // Check if date is valid
        if (isNaN(dateObj.getTime())) {
            return 'Invalid Date';
        }
        
        return new Intl.DateTimeFormat('en-AE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(dateObj);
    }

    formatMonth(monthStr) {
        if (!monthStr || typeof monthStr !== 'string') {
            return 'Unknown';
        }
        
        const parts = monthStr.split('-');
        if (parts.length !== 2) {
            return 'Unknown';
        }
        
        const [year, month] = parts;
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);
        
        if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return 'Unknown';
        }
        
        return new Intl.DateTimeFormat('en-AE', {
            year: 'numeric',
            month: 'short'
        }).format(new Date(yearNum, monthNum - 1));
    }

    getMessageTypeBadge(type) {
        switch(type) {
            case 'statement': return 'primary';
            case 'payment': return 'success';
            case 'reminder': return 'warning';
            default: return 'secondary';
        }
    }

    getConfidenceColor(confidence) {
        if (confidence > 0.8) return 'success';
        if (confidence > 0.6) return 'warning';
        return 'danger';
    }

    getNotificationIcon(type) {
        switch(type) {
            case 'urgent': return 'exclamation-triangle';
            case 'warning': return 'exclamation-circle';
            case 'reminder': return 'bell';
            default: return 'info-circle';
        }
    }

    getNotificationColor(type) {
        switch(type) {
            case 'urgent': return 'danger';
            case 'warning': return 'warning';
            case 'reminder': return 'info';
            default: return 'secondary';
        }
    }
}

// Note: App initialization is handled in index.html to ensure Chart.js is loaded
