// @ts-nocheck
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register fonts if needed, or use defaults.
// Using standard fonts for reliability, but in production we'd load Inter or Roboto.

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    borderBottomColor: '#312e81', // indigo-900
    paddingBottom: 20,
    marginBottom: 30,
  },
  logoBox: {
    width: 40,
    height: 40,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  companyName: {
    fontSize: 20,
    color: '#312e81',
    fontWeight: 'bold',
  },
  headerRight: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  metaText: {
    fontSize: 10,
    color: '#111827',
  },
  metaLabel: {
    fontWeight: 'bold',
  },
  content: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#1f2937',
    marginBottom: 20,
  },
  bold: {
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#312e81',
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
    marginBottom: 10,
    marginTop: 15,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  tableColLeft: {
    width: '30%',
    color: '#6b7280',
    fontSize: 10,
  },
  tableColRight: {
    width: '70%',
    color: '#111827',
    fontSize: 10,
    fontWeight: 'bold',
  },
  signatureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 60,
  },
  signatureBlock: {
    width: '40%',
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
    marginBottom: 5,
  },
  signatureName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  signatureRole: {
    fontSize: 9,
    color: '#6b7280',
  }
});

interface OfferPDFProps {
  data: any;
  settings: any;
}

const OfferPDF: React.FC<OfferPDFProps> = ({ data, settings }) => {
  const { candidate_details, position_details, compensation_details, issue_date } = data;
  const companyName = settings?.company_name || 'Digital Twin Verse';
  
  const today = issue_date 
    ? new Date(issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) 
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const joinDate = position_details.joining_date 
    ? new Date(position_details.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '[Joining Date]';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Image src="/img/dtv-logo.jpg" style={{ width: 60, height: 60, marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#0f172a', paddingHorizontal: 6, paddingVertical: 2, marginRight: 6, borderRadius: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: 'extrabold', color: 'white' }}>DIGITAL</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: 'extrabold', color: '#f97316' }}>TWIN VERSE</Text>
          </View>
          <Text style={styles.companySubtitle}>Offer of Employment</Text>
          </View>
          <View style={styles.headerRight}>
            <Text>{settings?.website || 'https://digitaltwinvrs.com/'}</Text>
            <Text>{settings?.company_email || 'contactdigitaltwinverse@gmail.com'}</Text>
            <Text>digitaltwinverse@gmail.com</Text>
            <Text>{settings?.company_address || 'India'}</Text>
          </View>
        </View>

        {/* Meta Info */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}><Text style={styles.metaLabel}>Offer No: </Text>{data.offer_id || 'DTV-OFR-[Auto]'}</Text>
          <Text style={styles.metaText}><Text style={styles.metaLabel}>Date: </Text>{today}</Text>
        </View>

        {/* Salutation */}
        <View style={styles.content}>
          <Text>To,</Text>
          <Text style={styles.bold}>{candidate_details.name || '[Candidate Name]'}</Text>
          <Text style={{ marginBottom: 15 }}>{candidate_details.email || '[Email]'}</Text>
          
          <Text style={{ fontWeight: 'bold', marginBottom: 15 }}>Subject: Offer of Employment as {position_details.designation || '[Designation]'}</Text>
          
          <Text style={{ marginBottom: 10 }}>Dear {candidate_details.name?.split(' ')[0] || '[First Name]'},</Text>
          
          <Text style={{ marginBottom: 10 }}>
            We are pleased to offer you the position of <Text style={styles.bold}>{position_details.designation || '[Designation]'}</Text> at {companyName}.
          </Text>
          
          <Text>
            Based on your profile, skills, experience, and interaction with our team, we believe you can contribute meaningfully to our mission and organization.
          </Text>
        </View>

        {/* Position Details */}
        <View>
          <Text style={styles.sectionTitle}>Position Details</Text>
          <View style={styles.tableRow}>
            <Text style={styles.tableColLeft}>Designation</Text>
            <Text style={styles.tableColRight}>{position_details.designation || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColLeft}>Employment Type</Text>
            <Text style={styles.tableColRight}>{position_details.employment_type || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColLeft}>Work Mode</Text>
            <Text style={styles.tableColRight}>{position_details.work_mode || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColLeft}>Joining Date</Text>
            <Text style={styles.tableColRight}>{joinDate}</Text>
          </View>
        </View>

        {/* Compensation */}
        <View style={{ marginTop: 10 }}>
          <Text style={styles.sectionTitle}>Compensation</Text>
          <View style={styles.tableRow}>
            <Text style={styles.tableColLeft}>Salary Type</Text>
            <Text style={styles.tableColRight}>{compensation_details.salary_type || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColLeft}>Amount</Text>
            <Text style={styles.tableColRight}>{compensation_details.currency} {compensation_details.amount || '0'}</Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureContainer}>
          <View style={styles.signatureBlock}>
            <Text style={{ fontSize: 24, fontStyle: 'italic', color: '#1f2937', marginBottom: 10 }}>Kumar Kartikey</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Kumar Kartikey</Text>
            <Text style={styles.signatureRole}>Founder & CEO</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={{ height: 24, marginBottom: 10 }} />
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{candidate_details.name}</Text>
            <Text style={styles.signatureRole}>Accepted & Signed</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
};

export default OfferPDF;
