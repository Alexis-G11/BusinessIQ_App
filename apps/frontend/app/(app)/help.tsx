import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Modal } from 'react-native';
import { Card } from '@/components/ui/Card';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { Book, Mail, ShoppingCart, Receipt, FileText, Package, Users, ChevronRight, ChevronLeft } from 'lucide-react-native';

interface HelpTopic {
  title: string;
  desc: string;
  topics: { title: string; content: string }[];
}

export default function HelpScreen() {
  const [selectedArticle, setSelectedArticle] = useState<{ title: string; content: string } | null>(null);

  const helpCategories: HelpTopic[] = [
    { title: 'Getting Started', desc: 'Learn the basics of BusinessIQ', topics: [
      { title: 'Setting up your business', content: 'After signing up, the onboarding wizard will ask for your business name, currency, and timezone. Once completed, you can start adding products and recording sales right away.' },
      { title: 'Adding products', content: 'Go to Products & Services and tap "Add Product". You can add a single product, bulk import multiple products via comma-separated text, or use barcode scanning to quickly add items.' },
      { title: 'Recording your first sale', content: 'Go to Sales & POS and tap "New Sale". Search for products to add them to the cart, select a customer (optional), choose a payment method, and complete the sale. Stock levels update automatically.' },
      { title: 'Understanding the dashboard', content: 'The Business Overview page shows your revenue, expenses, profit, cash position, and key charts. The Today page focuses on today\'s activity only.' },
    ]},
    { title: 'Sales & POS', desc: 'Making sales and managing transactions', topics: [
      { title: 'Creating a sale', content: 'Tap "New Sale" on the Sales page. Add products to the cart by searching or tapping them. Apply discounts or tax as needed, select a payment method, and complete the transaction.' },
      { title: 'Applying discounts', content: 'In the sale cart, enter a discount amount before completing the sale. The discount is subtracted from the subtotal before tax is applied.' },
      { title: 'Processing payments', content: 'Choose from cash, card, bank transfer, or mobile money. If the customer pays less than the total, the sale is marked as pending. You can record additional payments later.' },
      { title: 'Handling refunds', content: 'Currently, refunds can be tracked by recording a payment to the customer. A dedicated refund flow is coming in a future update.' },
    ]},
    { title: 'Expenses', desc: 'Tracking and managing expenses', topics: [
      { title: 'Recording an expense', content: 'Go to Expenses and tap "Add Expense". Enter a description, category, amount, payment method, and date. The expense will appear on your dashboard and reports immediately.' },
      { title: 'Expense categories', content: 'Expenses are organized into categories: rent, utilities, salaries, supplies, marketing, transport, maintenance, professional fees, insurance, taxes, and other. This helps with reporting and analysis.' },
      { title: 'Recurring expenses', content: 'Recurring expense tracking is available for viewing on the expense detail. Setting up recurring expenses will be available in a future update.' },
      { title: 'Expense reports', content: 'Go to Reports and open the Expense Summary report to see all expenses broken down by category with totals.' },
    ]},
    { title: 'Invoices', desc: 'Creating and managing invoices', topics: [
      { title: 'Creating an invoice', content: 'Go to Invoices and tap "New Invoice". Select a customer, add line items with quantities and prices, set issue and due dates, and add any tax or discount. The invoice is saved as a draft.' },
      { title: 'Sending invoices', content: 'Invoices start as drafts. Mark an invoice as "sent" to indicate it has been delivered to the customer. This can be done from the invoice list.' },
      { title: 'Recording payments', content: 'Go to Payments and tap "Record Payment". Choose the customer or supplier, enter the amount, select a payment method, and save. The payment is logged immediately.' },
      { title: 'Tracking overdue invoices', content: 'The Invoices page automatically marks invoices as overdue if the due date has passed and the invoice is not fully paid. Check the Receivables page for all outstanding amounts.' },
    ]},
    { title: 'Products & Inventory', desc: 'Managing your product catalog', topics: [
      { title: 'Adding products', content: 'Tap "Add Product" on the Products page. Choose from single product entry, bulk import (paste comma-separated rows), or barcode scanning (camera or manual entry).' },
      { title: 'Setting reorder levels', content: 'When adding or editing a product, set a reorder threshold. The system will alert you on the dashboard when stock falls to or below this level.' },
      { title: 'Tracking stock', content: 'Stock updates automatically when you complete a sale. The Inventory page shows current stock levels, low stock alerts, and total inventory value.' },
      { title: 'Importing products', content: 'Use the Bulk Add feature: paste lines in the format "name, selling price, stock, [cost price], [SKU], [unit]". The system validates each line and imports all products at once.' },
    ]},
    { title: 'Customers & Suppliers', desc: 'Managing contacts', topics: [
      { title: 'Adding customers', content: 'Go to Customers and tap "Add Customer". Enter their name, email, phone, and opening balance. Customers can be linked to sales and invoices.' },
      { title: 'Tracking purchase history', content: 'Each customer can be associated with sales and invoices. View the Receivables page to see which customers owe you money.' },
      { title: 'Managing suppliers', content: 'Go to Suppliers and tap "Add Supplier". Suppliers can be linked to purchase orders and payments. View the Payables page to see what you owe suppliers.' },
      { title: 'Contact balances', content: 'Opening balances can be set when creating a customer or supplier. These represent amounts already owed at the time of setup. The Receivables and Payables pages track ongoing balances.' },
    ]},
  ];

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Help Center</Text>
          <Text style={styles.pageSubtitle}>Find answers and learn how to use BusinessIQ</Text>
        </View>

        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL('mailto:support@businessiq.app')}>
            <Mail size={22} color={colors.blue} />
            <Text style={styles.contactLabel}>Email Support</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Browse by Topic</Text>
        {helpCategories.map((cat) => (
          <Card key={cat.title}>
            <View style={styles.catHeader}>
              <View style={styles.catIcon}>
                {cat.title === 'Getting Started' && <Book size={20} color={colors.blue} />}
                {cat.title === 'Sales & POS' && <ShoppingCart size={20} color={colors.blue} />}
                {cat.title === 'Expenses' && <Receipt size={20} color={colors.blue} />}
                {cat.title === 'Invoices' && <FileText size={20} color={colors.blue} />}
                {cat.title === 'Products & Inventory' && <Package size={20} color={colors.blue} />}
                {cat.title === 'Customers & Suppliers' && <Users size={20} color={colors.blue} />}
              </View>
              <View style={styles.catInfo}>
                <Text style={styles.catTitle}>{cat.title}</Text>
                <Text style={styles.catDesc}>{cat.desc}</Text>
              </View>
            </View>
            {cat.topics.map((topic, i) => (
              <TouchableOpacity key={topic.title} style={[styles.topicRow, i < cat.topics.length - 1 && styles.topicBorder]} onPress={() => setSelectedArticle(topic)}>
                <Text style={styles.topicText}>{topic.title}</Text>
                <ChevronRight size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </Card>
        ))}
      </ScrollView>

      <Modal visible={selectedArticle !== null} animationType="slide" onRequestClose={() => setSelectedArticle(null)}>
        <View style={styles.articleContainer}>
          <View style={styles.articleHeader}>
            <TouchableOpacity onPress={() => setSelectedArticle(null)} style={styles.backBtn}>
              <ChevronLeft size={22} color={colors.blue} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.articleContent}>
            <Text style={styles.articleTitle}>{selectedArticle?.title}</Text>
            <Text style={styles.articleBody}>{selectedArticle?.content}</Text>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as any,
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: 720 } as any,
  header: { marginBottom: spacing.sm } as any,
  pageTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: 4 } as any,
  contactRow: { flexDirection: 'row', gap: spacing.md } as any,
  contactBtn: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.lg, alignItems: 'center', gap: spacing.sm } as any,
  contactLabel: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text } as any,
  contactBadge: { fontSize: fontSizes.xs, color: colors.textSecondary } as any,
  sectionTitle: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm } as any,
  catHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.md } as any,
  catIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#E0EAFB', alignItems: 'center', justifyContent: 'center' } as any,
  catInfo: { flex: 1 } as any,
  catTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text } as any,
  catDesc: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 } as any,
  topicRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, paddingHorizontal: spacing.sm } as any,
  topicBorder: { borderBottomWidth: 1, borderBottomColor: colors.border } as any,
  topicText: { fontSize: fontSizes.sm, color: colors.text } as any,
  articleContainer: { flex: 1, backgroundColor: colors.background } as any,
  articleHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border } as any,
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs } as any,
  backText: { fontSize: fontSizes.md, color: colors.blue, fontWeight: fontWeights.semibold } as any,
  articleContent: { padding: spacing.xl } as any,
  articleTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, color: colors.text, marginBottom: spacing.lg } as any,
  articleBody: { fontSize: fontSizes.md, color: colors.text, lineHeight: 24 } as any,
});
