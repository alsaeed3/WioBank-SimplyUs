import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Text,
  Button,
  Surface,
  Chip,
  Avatar,
  Badge,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { gradientColors } from '../theme';
import { apiService } from '../services/apiService';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // Mock notifications data for demo
      const mockNotifications = [
        {
          id: 1,
          type: 'payment_due',
          title: 'Payment Due Soon',
          message: 'Your Emirates NBD credit card payment of AED 8,820.01 is due on Jul 22, 2025',
          cardNumber: '6889',
          dueDate: '2025-07-22',
          amount: 8820.01,
          isRead: false,
          createdAt: '2025-07-08T10:00:00.000Z',
          priority: 'high',
        },
        {
          id: 2,
          type: 'payment_reminder',
          title: 'Payment Reminder',
          message: 'Don\'t forget to pay your FAB credit card bill of AED 911.69 due on Jul 7, 2025',
          cardNumber: '1122',
          dueDate: '2025-07-07',
          amount: 911.69,
          isRead: false,
          createdAt: '2025-07-05T09:00:00.000Z',
          priority: 'medium',
        },
        {
          id: 3,
          type: 'payment_confirmed',
          title: 'Payment Confirmed',
          message: 'Your payment of AED 911.69 for card ending 1122 has been processed successfully',
          cardNumber: '1122',
          amount: 911.69,
          isRead: true,
          createdAt: '2025-07-07T14:30:00.000Z',
          priority: 'low',
        },
        {
          id: 4,
          type: 'spending_alert',
          title: 'High Spending Alert',
          message: 'You\'ve spent AED 2,500 this month, which is 25% higher than usual',
          isRead: false,
          createdAt: '2025-07-06T16:00:00.000Z',
          priority: 'medium',
        },
        {
          id: 5,
          type: 'statement_ready',
          title: 'Statement Ready',
          message: 'Your credit card statement for June 2025 is now available',
          cardNumber: '1122',
          isRead: true,
          createdAt: '2025-07-01T08:00:00.000Z',
          priority: 'low',
        },
      ];
      
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const generateReminders = async () => {
    try {
      Alert.alert(
        'Generate Reminders',
        'Payment reminders have been generated for upcoming due dates.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error generating reminders:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'payment_due':
        return 'alarm';
      case 'payment_reminder':
        return 'notifications';
      case 'payment_confirmed':
        return 'checkmark-circle';
      case 'spending_alert':
        return 'warning';
      case 'statement_ready':
        return 'document-text';
      default:
        return 'information-circle';
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'high') return '#e74c3c';
    if (priority === 'medium') return '#f39c12';
    
    switch (type) {
      case 'payment_due':
        return '#e74c3c';
      case 'payment_reminder':
        return '#f39c12';
      case 'payment_confirmed':
        return '#27ae60';
      case 'spending_alert':
        return '#e67e22';
      case 'statement_ready':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const NotificationItem = ({ notification }) => (
    <Surface style={[
      styles.notificationItem,
      !notification.isRead && styles.unreadNotification
    ]}>
      <View style={styles.notificationHeader}>
        <View style={styles.notificationLeft}>
          <Avatar.Icon
            size={40}
            icon={getNotificationIcon(notification.type)}
            style={{
              backgroundColor: getNotificationColor(notification.type, notification.priority)
            }}
          />
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationTime}>
              {formatTimeAgo(notification.createdAt)}
            </Text>
          </View>
        </View>
        
        <View style={styles.notificationRight}>
          {!notification.isRead && (
            <Badge style={styles.unreadBadge} />
          )}
          {notification.priority === 'high' && (
            <Chip style={styles.priorityChip} textStyle={styles.priorityText}>
              High
            </Chip>
          )}
        </View>
      </View>
      
      <Text style={styles.notificationMessage}>{notification.message}</Text>
      
      {(notification.amount || notification.cardNumber) && (
        <View style={styles.notificationDetails}>
          {notification.amount && (
            <Chip icon="currency-usd" style={styles.detailChip}>
              AED {notification.amount}
            </Chip>
          )}
          {notification.cardNumber && (
            <Chip icon="credit-card" style={styles.detailChip}>
              ****{notification.cardNumber}
            </Chip>
          )}
          {notification.dueDate && (
            <Chip icon="calendar" style={styles.detailChip}>
              Due: {new Date(notification.dueDate).toLocaleDateString()}
            </Chip>
          )}
        </View>
      )}
      
      <View style={styles.notificationActions}>
        {!notification.isRead && (
          <Button
            mode="outlined"
            onPress={() => markAsRead(notification.id)}
            compact
            style={styles.actionButton}
          >
            Mark Read
          </Button>
        )}
        <Button
          mode="outlined"
          onPress={() => deleteNotification(notification.id)}
          compact
          style={styles.actionButton}
          buttonColor="#fee"
          textColor="#e74c3c"
        >
          Delete
        </Button>
      </View>
    </Surface>
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const highPriorityCount = notifications.filter(n => n.priority === 'high' && !n.isRead).length;

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Title style={styles.headerTitle}>Notifications</Title>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </Text>
          {highPriorityCount > 0 && (
            <Chip style={styles.urgentChip} textStyle={styles.urgentText}>
              {highPriorityCount} urgent
            </Chip>
          )}
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Quick Actions</Title>
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={generateReminders}
                icon="bell-plus"
                style={styles.quickAction}
              >
                Generate Reminders
              </Button>
              <Button
                mode="outlined"
                onPress={markAllAsRead}
                icon="check-all"
                style={styles.quickAction}
                disabled={unreadCount === 0}
              >
                Mark All Read
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Notification Summary */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Summary</Title>
            <View style={styles.summaryContainer}>
              <Surface style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{notifications.length}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </Surface>
              <Surface style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{unreadCount}</Text>
                <Text style={styles.summaryLabel}>Unread</Text>
              </Surface>
              <Surface style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{highPriorityCount}</Text>
                <Text style={styles.summaryLabel}>High Priority</Text>
              </Surface>
            </View>
          </Card.Content>
        </Card>

        {/* Notifications List */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>All Notifications</Title>
            {loading ? (
              <Text style={styles.loadingText}>Loading notifications...</Text>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No notifications yet</Text>
                <Text style={styles.emptySubtext}>
                  You'll see payment reminders and alerts here
                </Text>
              </View>
            ) : (
              <View style={styles.notificationsList}>
                {notifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </View>
            )}
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
  urgentChip: {
    backgroundColor: '#e74c3c',
    marginTop: 10,
  },
  urgentText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    marginTop: -20,
  },
  card: {
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  quickAction: {
    flex: 1,
    marginHorizontal: 5,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  summaryItem: {
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  notificationsList: {
    marginTop: 15,
  },
  notificationItem: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationContent: {
    marginLeft: 15,
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  notificationRight: {
    alignItems: 'flex-end',
  },
  unreadBadge: {
    backgroundColor: '#667eea',
    marginBottom: 5,
  },
  priorityChip: {
    backgroundColor: '#e74c3c',
    height: 24,
  },
  priorityText: {
    color: '#ffffff',
    fontSize: 10,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 10,
  },
  notificationDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  detailChip: {
    marginRight: 5,
    marginBottom: 5,
    height: 28,
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    marginLeft: 10,
  },
});

export default NotificationsScreen;
