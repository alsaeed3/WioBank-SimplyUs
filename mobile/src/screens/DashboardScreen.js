import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Avatar,
  Button,
  Chip,
  Surface,
  Text,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

import { gradientColors, categoryColors } from '../theme';
import { apiService } from '../services/apiService';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const [dashboardData, setDashboardData] = useState({
    totalCards: 0,
    pendingPayments: 0,
    totalSpending: 0,
    processedSMS: 0,
    upcomingPayments: [],
    spendingTrends: [],
    categoryBreakdown: [],
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Try to get analytics data
      let analytics = {};
      let smsMessages = { messages: [] };
      
      try {
        analytics = await apiService.getAnalytics();
      } catch (error) {
        console.warn('Analytics API not available, using demo data');
        // Use demo data if API is not available
        analytics = {
          totalSpending: 1250.75,
          smsStats: { total: 12 },
          upcomingPayments: 3,
          monthlyTrends: [
            { month: 'Jan', amount: 800 },
            { month: 'Feb', amount: 1200 },
            { month: 'Mar', amount: 950 },
            { month: 'Apr', amount: 1100 },
            { month: 'May', amount: 1250 }
          ],
          topCategories: [
            { category: 'Shopping', amount: 450 },
            { category: 'Dining', amount: 300 },
            { category: 'Transport', amount: 200 },
            { category: 'Entertainment', amount: 150 }
          ]
        };
      }
      
      try {
        smsMessages = await apiService.getSMSMessages();
      } catch (error) {
        console.warn('SMS API not available, using demo data');
        smsMessages = {
          messages: [
            { cardNumber: '**** 1234' },
            { cardNumber: '**** 5678' },
            { cardNumber: '**** 9012' }
          ]
        };
      }
      
      // Process data for dashboard
      const processedData = {
        totalCards: new Set(smsMessages.messages.map(msg => msg.cardNumber).filter(Boolean)).size || 3,
        pendingPayments: analytics.upcomingPayments || 0,
        totalSpending: analytics.totalSpending || 0,
        processedSMS: analytics.smsStats?.total || 0,
        upcomingPayments: analytics.upcomingPayments || [],
        spendingTrends: analytics.monthlyTrends || [],
        categoryBreakdown: analytics.topCategories || [],
      };
      
      setDashboardData(processedData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set fallback data even if everything fails
      setDashboardData({
        totalCards: 3,
        pendingPayments: 2,
        totalSpending: 1250.75,
        processedSMS: 12,
        upcomingPayments: [],
        spendingTrends: [],
        categoryBreakdown: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card style={styles.statCard}>
      <Card.Content style={styles.statContent}>
        <View style={styles.statIcon}>
          <Avatar.Icon size={48} icon={icon} style={{ backgroundColor: color }} />
        </View>
        <View style={styles.statText}>
          <Title style={styles.statValue}>{value}</Title>
          <Paragraph style={styles.statLabel}>{title}</Paragraph>
        </View>
      </Card.Content>
    </Card>
  );

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  const pieData = dashboardData.categoryBreakdown.map((category, index) => ({
    name: category.category,
    amount: category.amount,
    color: Object.values(categoryColors)[index % Object.values(categoryColors).length],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Title style={styles.headerTitle}>WioBank Assistant</Title>
          <Paragraph style={styles.headerSubtitle}>
            Your AI-powered credit card manager
          </Paragraph>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Active Cards"
            value={dashboardData.totalCards}
            icon="credit-card"
            color="#667eea"
          />
          <StatCard
            title="Pending Payments"
            value={dashboardData.pendingPayments}
            icon="clock"
            color="#f39c12"
          />
          <StatCard
            title="Total Spending"
            value={`AED ${dashboardData.totalSpending.toFixed(2)}`}
            icon="chart-line"
            color="#27ae60"
          />
          <StatCard
            title="SMS Processed"
            value={dashboardData.processedSMS}
            icon="message"
            color="#3498db"
          />
        </View>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Quick Actions</Title>
            <View style={styles.quickActions}>
              <Button
                mode="contained"
                icon="plus"
                onPress={() => {}}
                style={styles.actionButton}
              >
                Parse SMS
              </Button>
              <Button
                mode="outlined"
                icon="file-document"
                onPress={() => {}}
                style={styles.actionButton}
              >
                Upload Statement
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Spending Trends Chart */}
        {dashboardData.spendingTrends.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Spending Trends</Title>
              <LineChart
                data={{
                  labels: dashboardData.spendingTrends.map(item => item.month),
                  datasets: [{
                    data: dashboardData.spendingTrends.map(item => item.amount),
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
        )}

        {/* Category Breakdown */}
        {pieData.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Category Breakdown</Title>
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
            </Card.Content>
          </Card>
        )}

        {/* Recent Activity */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Recent Activity</Title>
            <View style={styles.activityList}>
              <View style={styles.activityItem}>
                <Ionicons name="checkmark-circle" size={24} color="#27ae60" />
                <View style={styles.activityText}>
                  <Text style={styles.activityTitle}>SMS Parsed</Text>
                  <Text style={styles.activityTime}>2 minutes ago</Text>
                </View>
              </View>
              <View style={styles.activityItem}>
                <Ionicons name="document-text" size={24} color="#3498db" />
                <View style={styles.activityText}>
                  <Text style={styles.activityTitle}>Statement Processed</Text>
                  <Text style={styles.activityTime}>1 hour ago</Text>
                </View>
              </View>
              <View style={styles.activityItem}>
                <Ionicons name="notifications" size={24} color="#f39c12" />
                <View style={styles.activityText}>
                  <Text style={styles.activityTitle}>Payment Reminder</Text>
                  <Text style={styles.activityTime}>3 hours ago</Text>
                </View>
              </View>
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
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    marginBottom: 10,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginRight: 15,
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  card: {
    marginBottom: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  chart: {
    marginVertical: 10,
    borderRadius: 16,
  },
  activityList: {
    marginTop: 15,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityText: {
    marginLeft: 15,
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default DashboardScreen;
