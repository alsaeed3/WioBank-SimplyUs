import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Button,
  Surface,
  Text,
  Chip,
  Avatar,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

import { gradientColors, categoryColors } from '../theme';
import { apiService } from '../services/apiService';

const StatementsScreen = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState(null);
  const [statements, setStatements] = useState([]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      
      if (result.type === 'success') {
        setSelectedFile(result);
        setProcessedResult(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
      console.error('Document picker error:', error);
    }
  };

  const processStatement = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a PDF file first');
      return;
    }

    setProcessing(true);
    try {
      // Simulate PDF processing since we can't actually process files in mobile demo
      setTimeout(() => {
        const mockResult = {
          filename: selectedFile.name,
          account_number: '1234',
          statement_date: '2024-11-01',
          due_date: '2024-11-26',
          total_amount: 610.86,
          minimum_payment: 100.00,
          available_credit: 41389.14,
          transactions: [
            {
              date: '2024-10-05',
              description: 'LULU CENTER ABU DHABI',
              amount: 248.90,
              category: 'Shopping'
            },
            {
              date: '2024-10-08',
              description: 'Meat mart butchery',
              amount: 34.00,
              category: 'Food & Dining'
            },
            {
              date: '2024-10-12',
              description: 'www.shein.com',
              amount: 23.96,
              category: 'Shopping'
            },
            {
              date: '2024-10-23',
              description: 'NOON FOOD DELIVERY',
              amount: 46.32,
              category: 'Food & Dining'
            }
          ],
          insights: {
            topCategories: [
              { category: 'Shopping', amount: 272.86, percentage: 44.7 },
              { category: 'Food & Dining', amount: 80.32, percentage: 13.1 },
              { category: 'Other', amount: 257.68, percentage: 42.2 }
            ],
            totalTransactions: 12,
            averageTransaction: 50.91
          }
        };
        
        setProcessedResult(mockResult);
        setProcessing(false);
      }, 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to process statement');
      console.error('Statement processing error:', error);
      setProcessing(false);
    }
  };

  const StatementCard = ({ statement }) => (
    <Card style={styles.statementCard}>
      <Card.Content>
        <View style={styles.statementHeader}>
          <Avatar.Icon size={48} icon="file-document" style={styles.statementIcon} />
          <View style={styles.statementInfo}>
            <Text style={styles.statementTitle}>{statement.filename}</Text>
            <Text style={styles.statementDate}>
              Statement Date: {new Date(statement.statement_date).toLocaleDateString()}
            </Text>
            <Text style={styles.statementDue}>
              Due Date: {new Date(statement.due_date).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.statementDetails}>
          <Surface style={styles.amountCard}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValue}>AED {statement.total_amount}</Text>
          </Surface>
          <Surface style={styles.amountCard}>
            <Text style={styles.amountLabel}>Minimum Payment</Text>
            <Text style={styles.amountValue}>AED {statement.minimum_payment}</Text>
          </Surface>
        </View>
      </Card.Content>
    </Card>
  );

  const TransactionItem = ({ transaction }) => (
    <Surface style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <View style={[styles.categoryDot, { backgroundColor: categoryColors[transaction.category] }]} />
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDesc}>{transaction.description}</Text>
          <Text style={styles.transactionDate}>{new Date(transaction.date).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.transactionAmount}>AED {transaction.amount}</Text>
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
          <Title style={styles.headerTitle}>Statements</Title>
          <Text style={styles.headerSubtitle}>
            Upload and analyze PDF statements
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Upload Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Upload PDF Statement</Title>
            
            {selectedFile && (
              <Surface style={styles.selectedFile}>
                <View style={styles.fileInfo}>
                  <Ionicons name="document" size={24} color="#667eea" />
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName}>{selectedFile.name}</Text>
                    <Text style={styles.fileSize}>
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </Text>
                  </View>
                </View>
                <Button
                  mode="outlined"
                  onPress={() => setSelectedFile(null)}
                  compact
                  icon="close"
                >
                  Remove
                </Button>
              </Surface>
            )}
            
            <View style={styles.uploadButtons}>
              <Button
                mode="outlined"
                onPress={pickDocument}
                icon="file-upload"
                style={styles.uploadButton}
              >
                Select PDF
              </Button>
              <Button
                mode="contained"
                onPress={processStatement}
                loading={processing}
                disabled={!selectedFile || processing}
                icon="magic-wand"
                style={styles.processButton}
              >
                Process Statement
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Processing Results */}
        {processedResult && (
          <>
            <Card style={styles.card}>
              <Card.Content>
                <Title>Statement Summary</Title>
                <View style={styles.summaryGrid}>
                  <Surface style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Account</Text>
                    <Text style={styles.summaryValue}>****{processedResult.account_number}</Text>
                  </Surface>
                  <Surface style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Amount</Text>
                    <Text style={styles.summaryValue}>AED {processedResult.total_amount}</Text>
                  </Surface>
                  <Surface style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Due Date</Text>
                    <Text style={styles.summaryValue}>
                      {new Date(processedResult.due_date).toLocaleDateString()}
                    </Text>
                  </Surface>
                  <Surface style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Available Credit</Text>
                    <Text style={styles.summaryValue}>AED {processedResult.available_credit}</Text>
                  </Surface>
                </View>
              </Card.Content>
            </Card>

            {/* Category Breakdown */}
            <Card style={styles.card}>
              <Card.Content>
                <Title>Spending Categories</Title>
                {processedResult.insights.topCategories.map((category, index) => (
                  <Surface key={index} style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <View style={[styles.categoryColor, { backgroundColor: categoryColors[category.category] }]} />
                      <Text style={styles.categoryName}>{category.category}</Text>
                      <Text style={styles.categoryPercentage}>{category.percentage}%</Text>
                    </View>
                    <Text style={styles.categoryAmount}>AED {category.amount}</Text>
                  </Surface>
                ))}
              </Card.Content>
            </Card>

            {/* Recent Transactions */}
            <Card style={styles.card}>
              <Card.Content>
                <Title>Recent Transactions</Title>
                {processedResult.transactions.map((transaction, index) => (
                  <TransactionItem key={index} transaction={transaction} />
                ))}
              </Card.Content>
            </Card>
          </>
        )}

        {/* Demo Statement */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Sample Statement</Title>
            <Text style={styles.demoText}>
              This is a demo of processed statement data. In a real implementation, 
              this would show your actual uploaded and processed statements.
            </Text>
            <StatementCard
              statement={{
                filename: 'sample_statement.pdf',
                statement_date: '2024-11-01',
                due_date: '2024-11-26',
                total_amount: 610.86,
                minimum_payment: 100.00,
              }}
            />
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
  selectedFile: {
    padding: 15,
    marginVertical: 10,
    borderRadius: 8,
    elevation: 2,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  fileDetails: {
    marginLeft: 10,
    flex: 1,
  },
  fileName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  fileSize: {
    color: '#666',
    fontSize: 12,
  },
  uploadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  uploadButton: {
    flex: 1,
    marginRight: 10,
  },
  processButton: {
    flex: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  summaryItem: {
    width: '48%',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryItem: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  categoryName: {
    flex: 1,
    fontWeight: 'bold',
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#666',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionItem: {
    padding: 15,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  transactionAmount: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  statementCard: {
    marginTop: 10,
  },
  statementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statementIcon: {
    backgroundColor: '#667eea',
  },
  statementInfo: {
    marginLeft: 15,
    flex: 1,
  },
  statementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statementDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statementDue: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 2,
  },
  statementDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountCard: {
    padding: 15,
    borderRadius: 8,
    width: '48%',
    elevation: 2,
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  demoText: {
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
});

export default StatementsScreen;
