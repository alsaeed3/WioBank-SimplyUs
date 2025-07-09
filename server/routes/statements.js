const express = require('express');
const router = express.Router();
const db = require('../database/db');

/**
 * Get all statements
 * GET /api/statements
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, accountNumber } = req.query;
    
    let sql = 'SELECT * FROM statements';
    const params = [];
    
    if (accountNumber) {
      sql += ' WHERE account_number = ?';
      params.push(accountNumber);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    const statements = await db.getRows(sql, params);
    
    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM statements';
    const countParams = [];
    
    if (accountNumber) {
      countSql += ' WHERE account_number = ?';
      countParams.push(accountNumber);
    }
    
    const { total } = await db.getRow(countSql, countParams);
    
    res.json({
      success: true,
      data: {
        statements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching statements:', error);
    res.status(500).json({ error: 'Failed to fetch statements' });
  }
});

/**
 * Get statement by ID with transactions
 * GET /api/statements/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const statement = await db.getStatement(id);
    
    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }
    
    res.json({
      success: true,
      data: statement
    });
    
  } catch (error) {
    console.error('Error fetching statement:', error);
    res.status(500).json({ error: 'Failed to fetch statement' });
  }
});

/**
 * Get transactions for a statement
 * GET /api/statements/:id/transactions
 */
router.get('/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, category } = req.query;
    
    let sql = `
      SELECT * FROM transactions 
      WHERE statement_id = ?
    `;
    const params = [id];
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    sql += ' ORDER BY transaction_date DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    const transactions = await db.getRows(sql, params);
    
    const { total } = await db.getRow(
      'SELECT COUNT(*) as total FROM transactions WHERE statement_id = ?',
      [id]
    );
    
    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * Get statement summary
 * GET /api/statements/:id/summary
 */
router.get('/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    
    const statement = await db.getRow('SELECT * FROM statements WHERE id = ?', [id]);
    
    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }
    
    // Get transaction summary
    const transactionSummary = await db.getRows(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount
      FROM transactions 
      WHERE statement_id = ?
      GROUP BY category
      ORDER BY total_amount DESC
    `, [id]);
    
    // Get daily spending
    const dailySpending = await db.getRows(`
      SELECT 
        transaction_date,
        SUM(amount) as daily_total,
        COUNT(*) as transaction_count
      FROM transactions 
      WHERE statement_id = ?
      GROUP BY transaction_date
      ORDER BY transaction_date
    `, [id]);
    
    const summary = {
      statement,
      categoryBreakdown: transactionSummary,
      dailySpending,
      totalTransactions: transactionSummary.reduce((sum, cat) => sum + cat.count, 0),
      totalAmount: transactionSummary.reduce((sum, cat) => sum + cat.total_amount, 0)
    };
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('Error fetching statement summary:', error);
    res.status(500).json({ error: 'Failed to fetch statement summary' });
  }
});

/**
 * Compare statements
 * GET /api/statements/compare
 */
router.get('/compare', async (req, res) => {
  try {
    const { statement1, statement2 } = req.query;
    
    if (!statement1 || !statement2) {
      return res.status(400).json({ error: 'Two statement IDs are required' });
    }
    
    const [stmt1, stmt2] = await Promise.all([
      db.getStatement(statement1),
      db.getStatement(statement2)
    ]);
    
    if (!stmt1 || !stmt2) {
      return res.status(404).json({ error: 'One or both statements not found' });
    }
    
    // Get category comparison
    const [cat1, cat2] = await Promise.all([
      db.getRows(`
        SELECT category, SUM(amount) as total_amount
        FROM transactions 
        WHERE statement_id = ?
        GROUP BY category
      `, [statement1]),
      db.getRows(`
        SELECT category, SUM(amount) as total_amount
        FROM transactions 
        WHERE statement_id = ?
        GROUP BY category
      `, [statement2])
    ]);
    
    // Create comparison object
    const comparison = {
      statements: {
        statement1: stmt1,
        statement2: stmt2
      },
      totalAmountChange: stmt2.total_amount - stmt1.total_amount,
      categoryComparison: this.compareCategoriesparation(cat1, cat2),
      insights: this.generateComparisonInsights(stmt1, stmt2, cat1, cat2)
    };
    
    res.json({
      success: true,
      data: comparison
    });
    
  } catch (error) {
    console.error('Error comparing statements:', error);
    res.status(500).json({ error: 'Failed to compare statements' });
  }
});

/**
 * Get statement statistics
 * GET /api/statements/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { accountNumber, months = 6 } = req.query;
    
    let sql = `
      SELECT 
        COUNT(*) as total_statements,
        AVG(total_amount) as avg_total_amount,
        AVG(minimum_payment) as avg_minimum_payment,
        SUM(CASE WHEN is_password_protected = 1 THEN 1 ELSE 0 END) as password_protected_count
      FROM statements
      WHERE created_at >= date('now', '-${months} months')
    `;
    
    const params = [];
    
    if (accountNumber) {
      sql += ' AND account_number = ?';
      params.push(accountNumber);
    }
    
    const stats = await db.getRow(sql, params);
    
    // Get monthly statement counts
    const monthlyCounts = await db.getRows(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as count
      FROM statements
      WHERE created_at >= date('now', '-${months} months')
      ${accountNumber ? 'AND account_number = ?' : ''}
      GROUP BY month
      ORDER BY month
    `, accountNumber ? [accountNumber] : []);
    
    res.json({
      success: true,
      data: {
        ...stats,
        monthlyStatements: monthlyCounts
      }
    });
    
  } catch (error) {
    console.error('Error fetching statement stats:', error);
    res.status(500).json({ error: 'Failed to fetch statement statistics' });
  }
});

/**
 * Delete statement
 * DELETE /api/statements/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete transactions first
    await db.runQuery('DELETE FROM transactions WHERE statement_id = ?', [id]);
    
    // Delete statement
    await db.runQuery('DELETE FROM statements WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Statement deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting statement:', error);
    res.status(500).json({ error: 'Failed to delete statement' });
  }
});

/**
 * Helper function to compare categories
 */
function compareCategories(cat1, cat2) {
  const comparison = {};
  
  // Create a map of category amounts for easy comparison
  const cat1Map = cat1.reduce((map, cat) => {
    map[cat.category] = cat.total_amount;
    return map;
  }, {});
  
  const cat2Map = cat2.reduce((map, cat) => {
    map[cat.category] = cat.total_amount;
    return map;
  }, {});
  
  // Get all unique categories
  const allCategories = new Set([...Object.keys(cat1Map), ...Object.keys(cat2Map)]);
  
  allCategories.forEach(category => {
    const amount1 = cat1Map[category] || 0;
    const amount2 = cat2Map[category] || 0;
    const change = amount2 - amount1;
    const percentChange = amount1 > 0 ? (change / amount1) * 100 : 0;
    
    comparison[category] = {
      statement1: amount1,
      statement2: amount2,
      change,
      percentChange
    };
  });
  
  return comparison;
}

/**
 * Helper function to generate comparison insights
 */
function generateComparisonInsights(stmt1, stmt2, cat1, cat2) {
  const insights = [];
  
  // Overall spending change
  const totalChange = stmt2.total_amount - stmt1.total_amount;
  const percentChange = (totalChange / stmt1.total_amount) * 100;
  
  if (Math.abs(percentChange) > 20) {
    insights.push({
      type: percentChange > 0 ? 'warning' : 'positive',
      message: `Total spending ${percentChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(percentChange).toFixed(1)}%`
    });
  }
  
  // Category changes
  const categoryComparison = compareCategories(cat1, cat2);
  
  Object.entries(categoryComparison).forEach(([category, data]) => {
    if (Math.abs(data.percentChange) > 50) {
      insights.push({
        type: data.percentChange > 0 ? 'warning' : 'positive',
        message: `${category} spending ${data.percentChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(data.percentChange).toFixed(1)}%`
      });
    }
  });
  
  return insights;
}

module.exports = router;
