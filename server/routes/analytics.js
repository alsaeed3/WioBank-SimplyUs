const express = require('express');
const router = express.Router();
const db = require('../database/db');

/**
 * Get dashboard analytics
 * GET /api/analytics/dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [
      smsStats,
      upcomingDueDates,
      recentPayments,
      spendingInsights
    ] = await Promise.all([
      db.getSMSStats(),
      db.getUpcomingDueDates(),
      db.getRecentPayments(),
      db.getSpendingInsights()
    ]);
    
    const dashboardData = {
      smsStats,
      upcomingPayments: upcomingDueDates.length,
      recentPayments: recentPayments.length,
      totalSpending: spendingInsights.totalSpending,
      topCategories: spendingInsights.categoryInsights.slice(0, 5),
      monthlyTrends: spendingInsights.monthlyTrends
    };
    
    res.json({
      success: true,
      data: dashboardData
    });
    
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

/**
 * Get spending analytics
 * GET /api/analytics/spending
 */
router.get('/spending', async (req, res) => {
  try {
    const { cardNumber, dateRange = '3m' } = req.query;
    
    const insights = await db.getSpendingInsights({
      cardNumber,
      dateRange
    });
    
    res.json({
      success: true,
      data: insights
    });
    
  } catch (error) {
    console.error('Error fetching spending analytics:', error);
    res.status(500).json({ error: 'Failed to fetch spending analytics' });
  }
});

/**
 * Get payment analytics
 * GET /api/analytics/payments
 */
router.get('/payments', async (req, res) => {
  try {
    const { cardNumber } = req.query;
    
    // Get payment history
    let sql = `
      SELECT 
        payment_date,
        payment_amount,
        total_amount,
        minimum_amount,
        card_number,
        bank
      FROM sms_messages 
      WHERE payment_amount IS NOT NULL 
      AND payment_date >= date('now', '-6 months')
    `;
    
    const params = [];
    
    if (cardNumber) {
      sql += ' AND card_number = ?';
      params.push(cardNumber);
    }
    
    sql += ' ORDER BY payment_date DESC';
    
    const payments = await db.getRows(sql, params);
    
    // Calculate payment statistics
    const totalPayments = payments.reduce((sum, p) => sum + p.payment_amount, 0);
    const avgPayment = payments.length > 0 ? totalPayments / payments.length : 0;
    
    // Payment timeliness analysis
    const onTimePayments = payments.filter(p => {
      // This would require more complex logic to determine if payment was on time
      return true; // Placeholder
    }).length;
    
    const analytics = {
      totalPayments: payments.length,
      totalAmount: totalPayments,
      averagePayment: avgPayment,
      onTimePayments,
      paymentHistory: payments,
      paymentsByMonth: this.groupPaymentsByMonth(payments)
    };
    
    res.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    res.status(500).json({ error: 'Failed to fetch payment analytics' });
  }
});

/**
 * Get card analytics
 * GET /api/analytics/cards
 */
router.get('/cards', async (req, res) => {
  try {
    // Get card usage statistics
    const cardStats = await db.getRows(`
      SELECT 
        card_number,
        bank,
        COUNT(*) as message_count,
        SUM(CASE WHEN payment_amount IS NOT NULL THEN 1 ELSE 0 END) as payment_count,
        AVG(total_amount) as avg_balance,
        MAX(timestamp) as last_activity
      FROM sms_messages 
      WHERE card_number IS NOT NULL
      GROUP BY card_number, bank
      ORDER BY message_count DESC
    `);
    
    res.json({
      success: true,
      data: cardStats
    });
    
  } catch (error) {
    console.error('Error fetching card analytics:', error);
    res.status(500).json({ error: 'Failed to fetch card analytics' });
  }
});

/**
 * Get category trends
 * GET /api/analytics/trends
 */
router.get('/trends', async (req, res) => {
  try {
    const { category, months = 6 } = req.query;
    
    let sql = `
      SELECT 
        strftime('%Y-%m', t.transaction_date) as month,
        t.category,
        SUM(t.amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions t
      JOIN statements s ON t.statement_id = s.id
      WHERE t.transaction_date >= date('now', '-${months} months')
    `;
    
    const params = [];
    
    if (category) {
      sql += ' AND t.category = ?';
      params.push(category);
    }
    
    sql += ' GROUP BY month, t.category ORDER BY month, total_amount DESC';
    
    const trends = await db.getRows(sql, params);
    
    res.json({
      success: true,
      data: trends
    });
    
  } catch (error) {
    console.error('Error fetching category trends:', error);
    res.status(500).json({ error: 'Failed to fetch category trends' });
  }
});

/**
 * Helper function to group payments by month
 */
function groupPaymentsByMonth(payments) {
  const grouped = {};
  
  payments.forEach(payment => {
    const month = new Date(payment.payment_date).toISOString().substring(0, 7);
    if (!grouped[month]) {
      grouped[month] = {
        month,
        totalAmount: 0,
        count: 0
      };
    }
    
    grouped[month].totalAmount += payment.payment_amount;
    grouped[month].count += 1;
  });
  
  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
}

module.exports = router;
