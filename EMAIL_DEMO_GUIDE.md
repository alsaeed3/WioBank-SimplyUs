# WioBank SimplyUs - Live Email Demo Guide

This guide explains how to use the Live Email Demo for your hackathon presentation. The demo allows you to simulate receiving emails from banks, processing statements, and generating notifications in real-time during your presentation.

## 1. Running the Demo

There are two ways to run the email demo:

### Option 1: Using the Shell Script (Recommended)

Run the following command in your terminal:

```bash
bash run_live_email_demo.sh
```

This script will:
- Check if the WioBank server is running and start it if needed
- Install any missing dependencies
- Launch the live email demo

### Option 2: Manual Method

1. First, make sure the WioBank server is running:
   ```bash
   node server/index.js
   ```
   
2. In a separate terminal, run the live email demo:
   ```bash
   node live_email_demo.js
   ```

## 2. Using the Demo during Presentation

Once the demo is running, you'll see a menu with several options:

```
========== WioBank Live Email Demo ==========
1. Receive FAB Bank Statement
2. Receive Emirates NBD Statement
3. Receive ADCB Statement
4. Receive Urgent Payment Reminder
5. Receive Special Offer Email
6. Display All Notifications
7. Clear Demo Data
8. Exit Demo
===========================================
```

### Step-by-Step Demo Script

Here's a suggested script for your presentation:

1. **Start with a clean slate:**
   - Select option 7 to clear any previous demo data

2. **Show the Notification Badge:**
   - Point out that the notification badge in the app is at zero

3. **Simulate receiving a statement email:**
   - Select option 1, 2, or 3 to receive a bank statement
   - Explain how the system processes emails in real-time
   - Note how the notification badge has updated

4. **Show the processed data:**
   - Go to the Statements page in the app to see the new statement
   - Go to the Dashboard to see updated analytics with the new transactions

5. **Demonstrate special email types:**
   - Select option 4 to simulate a payment reminder
   - Point out the urgent notification that appears

6. **View all notifications:**
   - Select option 6 to display all notifications in the system
   - In the app, click the notification badge to see the notifications page

## 3. Features Demonstrated

This demo showcases:

- **Real-time Email Processing:** Simulates receiving emails with bank statements
- **Statement Parsing:** Extracts key information from statements
- **Transaction Analysis:** Processes transaction data for analytics
- **Notification System:** Generates and manages notifications
- **Integration with Dashboard:** Updates analytics based on processed statements

## 4. Demo Email Details

The demo includes the following pre-configured emails:

### Bank Statements
- **FAB Bank:** Credit card ending in 1122, due date July 25, amount: AED 1,911.69
- **Emirates NBD:** Credit card ending in 6889, due date July 22, amount: AED 4,520.01
- **ADCB:** Credit card ending in 7033, due date July 27, amount: AED 3,299.57

### Special Emails
- **Payment Reminder:** Urgent notification about payment due tomorrow
- **Special Offer:** 0% balance transfer offer from Emirates NBD

## 5. Troubleshooting

If you encounter any issues:

1. **Server not running:**
   - Make sure the WioBank server is running on port 3000
   - Run `node server/index.js` in a separate terminal

2. **Database errors:**
   - Check the server/data/wiobank.db file exists
   - If needed, restart the server to reinitialize the database

3. **Demo not working:**
   - Try clearing all demo data (option 7)
   - Restart both the server and the demo

For any other issues, check the terminal output for error messages.
