import React from 'react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
    borderBottom: '1px solid #2563eb',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 5,
  },
  receiptCard: {
    marginBottom: 20,
    padding: 15,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottom: '1px solid #d1d5db',
    paddingBottom: 5,
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  receiptCode: {
    fontSize: 12,
    fontFamily: 'Courier',
    color: '#059669',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 100,
    fontSize: 10,
    color: '#6b7280',
  },
  value: {
    flex: 1,
    fontSize: 10,
    color: '#1f2937',
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10,
  },
  qrCode: {
    width: 60,
    height: 60,
    marginTop: 5,
  },
});

const ReceiptsPDFDocument = ({ receipts, user, election }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>ICAN Voting System</Text>
        <Text style={styles.subtitle}>Official Voting Receipts</Text>
        <Text style={styles.subtitle}>Generated on: {new Date().toLocaleString()}</Text>
      </View>

      <View>
        <View style={styles.row}>
          <Text style={styles.label}>Voter Name:</Text>
          <Text style={styles.value}>{user?.full_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Membership Number:</Text>
          <Text style={styles.value}>{user?.membership_number}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>District:</Text>
          <Text style={styles.value}>{user?.district}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Election:</Text>
          <Text style={styles.value}>{election?.title || 'ICAN Election'}</Text>
        </View>
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Voting Details</Text>
        {receipts.map((receipt, index) => (
          <View key={index} style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptTitle}>{receipt.position_title}</Text>
              <Text style={styles.receiptCode}>Receipt: {receipt.receipt_code}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Voted For:</Text>
              <Text style={styles.value}>{receipt.candidate_name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Vote Cast:</Text>
              <Text style={styles.value}>{new Date(receipt.voted_at).toLocaleString()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Verification Hash:</Text>
              <Text style={styles.value}>{receipt.verification_hash?.substring(0, 32)}...</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Verify at:</Text>
              <Text style={styles.value}>http://localhost:3000/verify/{receipt.receipt_code}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text>This is an electronically generated document. Verify authenticity at the official ICAN Voting System portal.</Text>
        <Text>© ICAN Voting System - All rights reserved.</Text>
      </View>
    </Page>
  </Document>
);

export const ReceiptsPDFButton = ({ receipts, user, election, children }) => (
  <PDFDownloadLink
    document={<ReceiptsPDFDocument receipts={receipts} user={user} election={election} />}
    fileName={`voting_receipts_${user?.membership_number}_${new Date().toISOString().split('T')[0]}.pdf`}
  >
    {({ blob, url, loading, error }) =>
      loading ? 'Generating PDF...' : children
    }
  </PDFDownloadLink>
);