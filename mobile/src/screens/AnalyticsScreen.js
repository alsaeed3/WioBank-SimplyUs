import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Text,
  Surface,
  Chip,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';

import { gradientColors, categoryColors } from '../theme';
import { apiService } from '../services/apiService';

const { width } = Dimensions.get('window');

const AnalyticsScreen = () => {
  const [analyticsData, setAnalyticsData] = useState({
    spendingTrends: [],
    categoryBreakdown: [],
    monthlyComparison: [],
    paymentHistory: [],
    insights: {
      totalSpending: 0,
      averageTransaction: 0,
      topCategory: '',
      savingsOpportunity: 0,
    },
  });

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      // Mock analytics data for demo
      const mockData = {
        spendingTrends: [
          { month: 'Jan', amount: 1200 },
          { month: 'Feb', amount: 1450 },
          { month: 'Mar', amount: 1100 },
          { month: 'Apr', amount: 1800 },
          { month: 'May', amount: 1600 },
          { month: 'Jun', amount: 1350 },
        ],
        categoryBreakdown: [
          { category: 'Food & Dining', amount: 450, percentage: 30 },
          { category: 'Shopping', amount: 380, percentage: 25 },
          { category: 'Transportation', amount: 240, percentage: 16 },
          { category: 'Entertainment', amount: 180, percentage: 12 },
          { category: 'Healthcare', amount: 120, percentage: 8 },
          { category: 'Utilities', amount: 90, percentage: 6 },
          { category: 'Other', amount: 60, percentage: 4 },
        ],
        monthlyComparison: [
          { month: 'Jan', current: 1200, previous: 1100 },
          { month: 'Feb', current: 1450, previous: 1200 },
          { month: 'Mar', current: 1100, previous: 1450 },
          { month: 'Apr', current: 1800, previous: 1100 },
          { month: 'May', current: 1600, previous: 1800 },
          { month: 'Jun', current: 1350, previous: 1600 },
        ],
        paymentHistory: [
          { date: '2024-06-25', amount: 1200, status: 'Paid' },
          { date: '2024-05-25', amount: 1450, status: 'Paid' },
          { date: '2024-04-25', amount: 1100, status: 'Paid' },
          { date: '2024-03-25', amount: 1800, status: 'Late' },
          { date: '2024-02-25', amount: 1600, status: 'Paid' },
        ],
        insights: {
          totalSpending: 1520,
          averageTransaction: 76,
          topCategory: 'Food & Dining',
          savingsOpportunity: 150,
        },
      };
      
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
  };

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
    propsForLabels: {
      fontSize: 12,
    },
  };

  const pieData = analyticsData.categoryBreakdown.map((item, index) => ({
    name: item.category,
    amount: item.amount,
    color: Object.values(categoryColors)[index % Object.values(categoryColors).length],
    legendFontColor: '#7F7F7F',
    legendFontSize: 10,
  }));

  const InsightCard = ({ title, value, subtitle, icon, color }) => (
    <Surface style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <View style={[styles.insightIcon, { backgroundColor: color }]}>
          <Text style={styles.insightIconText}>{icon}</Text>
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightTitle}>{title}</Text>
          <Text style={styles.insightValue}>{value}</Text>
          {subtitle && <Text style={styles.insightSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </Surface>
  );

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Title style={styles.headerTitle}>Analytics</Title>
          <Text style={styles.headerSubtitle}>
            Detailed spending insights and trends
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Key Insights */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Key Insights</Title>
            <View style={styles.insightsGrid}>
              <InsightCard
                title="Total Spending"
                value={`AED ${analyticsData.insights.totalSpending}`}
                subtitle="This month"
                icon="💰"
                color="#667eea"
              />
              <InsightCard
                title="Average Transaction"
                value={`AED ${analyticsData.insights.averageTransaction}`}
                subtitle="Per transaction"
                icon="📊"
                color="#27ae60"
              />
              <InsightCard
                title="Top Category"
                value={analyticsData.insights.topCategory}
                subtitle="Highest spending"
                icon="🏆"
                color="#f39c12"
              />
              <InsightCard
                title="Savings Opportunity"
                value={`AED ${analyticsData.insights.savingsOpportunity}`}
                subtitle="Potential savings"
                icon="💡"
                color="#e74c3c"
              />
            </View>
          </Card.Content>
        </Card>

        {/* Spending Trends */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Spending Trends</Title>
            <Text style={styles.chartDescription}>
              Monthly spending over the last 6 months
            </Text>
            <LineChart
              data={{
                labels: analyticsData.spendingTrends.map(item => item.month),
                datasets: [{
                  data: analyticsData.spendingTrends.map(item => item.amount),
                  color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
                  strokeWidth: 3,
                }],
              }}
              width={width - 60}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </Card.Content>
        </Card>

        {/* Category Breakdown */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Category Breakdown</Title>
            <Text style={styles.chartDescription}>
              Spending distribution by category
            </Text>
            <PieChart
              data={pieData}
              width={width - 60}
              height={220}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              style={styles.chart}
            />
            <View style={styles.categoryLegend}>
              {analyticsData.categoryBreakdown.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[
                    styles.legendColor,
                    { backgroundColor: Object.values(categoryColors)[index % Object.values(categoryColors).length] }
                  ]} />
                  <Text style={styles.legendText}>{item.category}</Text>
                  <Text style={styles.legendAmount}>AED {item.amount}</Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Monthly Comparison */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Monthly Comparison</Title>
            <Text style={styles.chartDescription}>
              Current vs previous month spending
            </Text>
            <BarChart
              data={{
                labels: analyticsData.monthlyComparison.map(item => item.month),
                datasets: [{
                  data: analyticsData.monthlyComparison.map(item => item.current),
                }],
              }}
              width={width - 60}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              showValuesOnTopOfBars
            />
          </Card.Content>
        </Card>

        {/* Payment History */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Payment History</Title>
            <Text style={styles.chartDescription}>
              Recent payment records
            </Text>
            {analyticsData.paymentHistory.map((payment, index) => (
              <Surface key={index} style={styles.paymentItem}>
                <View style={styles.paymentHeader}>
                  <Text style={styles.paymentDate}>
                    {new Date(payment.date).toLocaleDateString()}
                  </Text>
                  <Chip
                    style={[
                      styles.paymentStatus,
                      payment.status === 'Paid' ? styles.paidStatus : styles.lateStatus
                    ]}
                    textStyle={styles.paymentStatusText}
                  >
                    {payment.status}
                  </Chip>
                </View>
                <Text style={styles.paymentAmount}>AED {payment.amount}</Text>
              </Surface>
            ))}
          </Card.Content>
        </Card>

        {/* Recommendations */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Smart Recommendations</Title>
            <View style={styles.recommendationList}>
              <Surface style={styles.recommendationItem}>
                <View style={styles.recommendationIcon}>
                  <Text style={styles.recommendationEmoji}>🍽️</Text>
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>Reduce Dining Out</Text>
                  <Text style={styles.recommendationText}>
                    You spent 30% on dining. Consider cooking at home more often.
                  </Text>
                </View>
              </Surface>
              
              <Surface style={styles.recommendationItem}>
                <View style={styles.recommendationIcon}>
                  <Text style={styles.recommendationEmoji}>🛍️</Text>
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>Monitor Shopping</Text>
                  <Text style={styles.recommendationText}>
                    Shopping expenses increased by 15% this month.
                  </Text>
                </View>
              </Surface>
              
              <Surface style={styles.recommendationItem}>
                <View style={styles.recommendationIcon}>
                  <Text style={styles.recommendationEmoji}>💳</Text>
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>Early Payment</Text>
                  <Text style={styles.recommendationText}>
                    Pay bills 3 days early to avoid late fees.
                  </Text>
                </View>
              </Surface>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 5,
  },
  content: {
    padding: 20,
    marginTop: -20,
  },
  card: {
    marginBottom: 20,
  },
  chartDescription: {
    color: '#666',
    marginBottom: 15,
    fontSize: 14,
  },
  chart: {
    marginVertical: 10,
    borderRadius: 16,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  insightCard: {
    width: '48%',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  insightIconText: {
    fontSize: 18,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  insightSubtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  categoryLegend: {
    marginTop: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  paymentItem: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  paymentDate: {
    fontSize: 14,
    color: '#666',
  },
  paymentStatus: {
    height: 24,
  },
  paymentStatusText: {
    fontSize: 12,
    color: '#fff',
  },
  paidStatus: {
    backgroundColor: '#27ae60',
  },
  lateStatus: {
    backgroundColor: '#e74c3c',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  recommendationList: {
    marginTop: 15,
  },
  recommendationItem: {
    flexDirection: 'row',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  recommendationIcon: {
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationEmoji: {
    fontSize: 24,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default AnalyticsScreen;
