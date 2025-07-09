import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from './src/screens/DashboardScreen';
import SMSParserScreen from './src/screens/SMSParserScreen';
import StatementsScreen from './src/screens/StatementsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

import { theme } from './src/theme';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#667eea" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              
              switch (route.name) {
                case 'Dashboard':
                  iconName = focused ? 'home' : 'home-outline';
                  break;
                case 'SMS Parser':
                  iconName = focused ? 'chatbubble' : 'chatbubble-outline';
                  break;
                case 'Statements':
                  iconName = focused ? 'document-text' : 'document-text-outline';
                  break;
                case 'Analytics':
                  iconName = focused ? 'bar-chart' : 'bar-chart-outline';
                  break;
                case 'Notifications':
                  iconName = focused ? 'notifications' : 'notifications-outline';
                  break;
                default:
                  iconName = 'home-outline';
              }
              
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#667eea',
            tabBarInactiveTintColor: 'gray',
            headerStyle: {
              backgroundColor: '#667eea',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          })}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="SMS Parser" component={SMSParserScreen} />
          <Tab.Screen name="Statements" component={StatementsScreen} />
          <Tab.Screen name="Analytics" component={AnalyticsScreen} />
          <Tab.Screen name="Notifications" component={NotificationsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
