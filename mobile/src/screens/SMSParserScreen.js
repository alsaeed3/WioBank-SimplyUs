import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Card,
  Title,
  TextInput,
  Button,
  Chip,
  Surface,
  Text,
  Divider,
  Avatar,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { gradientColors } from '../theme';
import { apiService } from '../services/apiService';

const SMSParserScreen = () => {
  const [smsText, setSmsText] = useState('');
  const [sender, setSender] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const sampleSMS = [
    {
      text: "Your statement of the card ending with 1122 dated 11Jun25 has been sent to you. The total amount due is AED 911.69. Minimum due is AED 100.00. Due date is 07Jul25",
      sender: "FAB",
      label: "Statement SMS"
    },
    {
      text: "Dear Customer, Your Payment of AED 911.69 for card 4727XXXXXXXX1122 has been processed on 07/07/2025",
      sender: "FAB",
      label: "Payment Confirmation"
    },
    {
      text: "Emirates NBD Credit Card Mini Stmt for Card ending 6889: Total Amt Due AED 8820.01, Due Date 22/07/25. Min Amt Due AED 229.11",
      sender: "Emirates NBD",
      label: "Emirates NBD Statement"
    }
  ];

  const parseSMS = async () => {
    if (!smsText.trim()) {
      Alert.alert('Error', 'Please enter SMS text to parse');
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.parseSMS({
        text: smsText,
        sender: sender || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      
      setParseResult(result);
    } catch (error) {
      Alert.alert('Error', 'Failed to parse SMS. Please try again.');
      console.error('SMS parsing error:', error);
    } finally {
      setLoading(false);
    }
  };

  const useSampleSMS = (sample) => {
    setSmsText(sample.text);
    setSender(sample.sender);
    setParseResult(null);
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setSmsText(text);
        setParseResult(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to paste from clipboard');
    }
  };

  const clearForm = () => {
    setSmsText('');
    setSender('');
    setParseResult(null);
  };

  const ResultCard = ({ title, value, icon, color }) => (
    <Surface style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Avatar.Icon size={32} icon={icon} style={{ backgroundColor: color }} />
        <Text style={styles.resultTitle}>{title}</Text>
      </View>
      <Text style={styles.resultValue}>{value || 'Not found'}</Text>
    </Surface>
  );

  const ConfidenceBar = ({ confidence }) => (
    <View style={styles.confidenceContainer}>
      <Text style={styles.confidenceLabel}>Confidence Score</Text>
      <View style={styles.confidenceBar}>
        <LinearGradient
          colors={confidence > 0.7 ? ['#27ae60', '#2ecc71'] : confidence > 0.5 ? ['#f39c12', '#e67e22'] : ['#e74c3c', '#c0392b']}
          style={[styles.confidenceFill, { width: `${confidence * 100}%` }]}
        />
      </View>
      <Text style={styles.confidenceValue}>{(confidence * 100).toFixed(1)}%</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.container}>
        <LinearGradient
          colors={gradientColors}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Title style={styles.headerTitle}>SMS Parser</Title>
            <Text style={styles.headerSubtitle}>
              Parse credit card SMS messages with AI
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* SMS Input Section */}
          <Card style={styles.card}>
            <Card.Content>
              <Title>Parse SMS Message</Title>
              <TextInput
                label="SMS Text"
                value={smsText}
                onChangeText={setSmsText}
                multiline
                numberOfLines={6}
                style={styles.textInput}
                mode="outlined"
                placeholder="Paste your SMS message here..."
              />
              <TextInput
                label="Sender"
                value={sender}
                onChangeText={setSender}
                style={styles.textInput}
                mode="outlined"
                placeholder="Bank name or sender"
              />
              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={parseSMS}
                  loading={loading}
                  disabled={loading}
                  style={styles.parseButton}
                  icon="magic-wand"
                >
                  Parse SMS
                </Button>
                <Button
                  mode="outlined"
                  onPress={pasteFromClipboard}
                  style={styles.utilityButton}
                  icon="clipboard"
                >
                  Paste
                </Button>
                <Button
                  mode="outlined"
                  onPress={clearForm}
                  style={styles.utilityButton}
                  icon="close"
                >
                  Clear
                </Button>
              </View>
            </Card.Content>
          </Card>

          {/* Sample SMS Section */}
          <Card style={styles.card}>
            <Card.Content>
              <Title>Sample SMS Messages</Title>
              <Text style={styles.sampleDescription}>
                Try these sample messages to see the parser in action:
              </Text>
              {sampleSMS.map((sample, index) => (
                <Surface key={index} style={styles.sampleCard}>
                  <View style={styles.sampleHeader}>
                    <Chip icon="bank" style={styles.sampleChip}>
                      {sample.sender}
                    </Chip>
                    <Text style={styles.sampleLabel}>{sample.label}</Text>
                  </View>
                  <Text style={styles.sampleText} numberOfLines={3}>
                    {sample.text}
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={() => useSampleSMS(sample)}
                    style={styles.sampleButton}
                    compact
                  >
                    Use This Sample
                  </Button>
                </Surface>
              ))}
            </Card.Content>
          </Card>

          {/* Results Section */}
          {parseResult && (
            <Card style={styles.card}>
              <Card.Content>
                <Title>Parsing Results</Title>
                
                <ConfidenceBar confidence={parseResult.confidence} />
                
                <Divider style={styles.divider} />
                
                <View style={styles.resultsGrid}>
                  <ResultCard
                    title="Message Type"
                    value={parseResult.messageType}
                    icon="message-text"
                    color="#3498db"
                  />
                  <ResultCard
                    title="Bank"
                    value={parseResult.bank}
                    icon="bank"
                    color="#9b59b6"
                  />
                  <ResultCard
                    title="Card Number"
                    value={parseResult.cardNumber}
                    icon="credit-card"
                    color="#e74c3c"
                  />
                  <ResultCard
                    title="Total Amount"
                    value={parseResult.totalAmount ? `AED ${parseResult.totalAmount}` : null}
                    icon="currency-usd"
                    color="#27ae60"
                  />
                  <ResultCard
                    title="Minimum Amount"
                    value={parseResult.minimumAmount ? `AED ${parseResult.minimumAmount}` : null}
                    icon="cash"
                    color="#f39c12"
                  />
                  <ResultCard
                    title="Due Date"
                    value={parseResult.dueDate ? new Date(parseResult.dueDate).toLocaleDateString() : null}
                    icon="calendar"
                    color="#e67e22"
                  />
                  <ResultCard
                    title="Payment Amount"
                    value={parseResult.paymentAmount ? `AED ${parseResult.paymentAmount}` : null}
                    icon="cash-check"
                    color="#2ecc71"
                  />
                  <ResultCard
                    title="Available Limit"
                    value={parseResult.availableLimit ? `AED ${parseResult.availableLimit}` : null}
                    icon="credit-card-outline"
                    color="#34495e"
                  />
                </View>
              </Card.Content>
            </Card>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  textInput: {
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  parseButton: {
    flex: 2,
    marginRight: 5,
  },
  utilityButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  sampleDescription: {
    marginBottom: 15,
    color: '#666',
  },
  sampleCard: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  sampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sampleChip: {
    marginRight: 10,
  },
  sampleLabel: {
    fontWeight: 'bold',
    flex: 1,
  },
  sampleText: {
    marginBottom: 10,
    color: '#444',
  },
  sampleButton: {
    alignSelf: 'flex-end',
  },
  confidenceContainer: {
    marginBottom: 20,
  },
  confidenceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceValue: {
    textAlign: 'right',
    marginTop: 5,
    fontWeight: 'bold',
    fontSize: 16,
  },
  divider: {
    marginVertical: 20,
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resultCard: {
    width: '48%',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultValue: {
    fontSize: 16,
    color: '#333',
  },
});

export default SMSParserScreen;
