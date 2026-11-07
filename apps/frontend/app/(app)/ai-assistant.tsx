import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useBusiness } from '@/context/BusinessContext';
import { useDashboardStats, useSales, useProducts, useContacts, useInvoices } from '@/hooks/useBusinessData';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import { formatCurrency, formatCompactCurrency } from '@/lib/format';
import { Sparkles, Send, User } from 'lucide-react-native';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  'What is my current profit?',
  'How much revenue have I earned?',
  'Which expenses are highest?',
  'How many customers do I have?',
  'Are there any overdue invoices?',
];

export default function AIAssistantScreen() {
  const { currentBusiness } = useBusiness();
  const { stats } = useDashboardStats();
  const { data: sales } = useSales();
  const { data: products } = useProducts();
  const { data: customers } = useContacts('customer');
  const { data: invoices } = useInvoices();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your BusinessIQ assistant${currentBusiness ? ` for ${currentBusiness.name}` : ''}. Ask me about your revenue, expenses, profit, customers, or inventory.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const generateResponse = (question: string): string => {
    if (!stats || !currentBusiness) return 'I need some business data first. Try recording some sales and expenses.';
    const currency = currentBusiness.currency;
    const currencyExponent = currentBusiness.currency_exponent;
    const q = question.toLowerCase();

    if (q.includes('profit') || q.includes('net')) {
      const profit = stats.revenue - stats.expenses;
      const margin = stats.revenue > 0 ? ((profit / stats.revenue) * 100).toFixed(1) : '0';
      return `Your net profit is ${formatCurrency(profit, currency, currencyExponent)}. That's a ${margin}% profit margin on ${formatCurrency(stats.revenue, currency, currencyExponent)} in total revenue.`;
    }
    if (q.includes('revenue') || q.includes('sales') || q.includes('income')) {
      const completedSales = sales.filter((s) => s.status === 'completed');
      return `Your total revenue from ${completedSales.length} completed sales is ${formatCurrency(stats.revenue, currency, currencyExponent)}. This month you've earned ${formatCompactCurrency(stats.monthRevenue, currency, currencyExponent)}.`;
    }
    if (q.includes('expense') || q.includes('cost')) {
      if (stats.expenseByCategory.length === 0) return 'You have no recorded expenses yet.';
      const sorted = [...stats.expenseByCategory].sort((a, b) => b.value - a.value);
      const top = sorted.slice(0, 3);
      return `Your total expenses are ${formatCurrency(stats.expenses, currency, currencyExponent)}. Your highest spending categories are: ${top.map((e) => `${e.label} (${formatCurrency(e.value, currency, currencyExponent)})`).join(', ')}.`;
    }
    if (q.includes('customer')) {
      return `You have ${customers.length} customers in your contact list.`;
    }
    if (q.includes('product') || q.includes('inventory') || q.includes('stock')) {
      const lowStock = products.filter((p) => Number(p.stock_quantity) <= Number(p.reorder_threshold));
      const outOfStock = products.filter((p) => Number(p.stock_quantity) <= 0);
      return `You have ${products.length} products. ${lowStock.length} are below their reorder threshold and ${outOfStock.length} are out of stock.`;
    }
    if (q.includes('overdue') || q.includes('invoice') || q.includes('receivable')) {
      const overdue = invoices.filter((i) => i.status !== 'paid' && i.status !== 'void' && new Date(i.due_date) < new Date());
      const totalOverdue = overdue.reduce((sum, i) => sum + Number(i.total - i.paid_amount), 0);
      if (overdue.length === 0) return 'You have no overdue invoices. All your receivables are current.';
      return `You have ${overdue.length} overdue invoice${overdue.length !== 1 ? 's' : ''} totaling ${formatCurrency(totalOverdue, currency, currencyExponent)} in outstanding payments.`;
    }
    if (q.includes('cash')) {
      const cashFlow = stats.revenue - stats.expenses;
      return `Your net cash position is ${formatCurrency(cashFlow, currency, currencyExponent)} based on ${formatCurrency(stats.revenue, currency, currencyExponent)} in revenue minus ${formatCurrency(stats.expenses, currency, currencyExponent)} in expenses.`;
    }
    return `I can help with questions about your revenue (${formatCurrency(stats.revenue, currency, currencyExponent)}), expenses (${formatCurrency(stats.expenses, currency, currencyExponent)}), profit (${formatCurrency(stats.profit, currency, currencyExponent)}), customers (${customers.length}), products (${products.length}), or invoices. Try asking about any of these topics.`;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const response = generateResponse(text);
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
      setLoading(false);
    }, 500);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.aiIcon}><Sparkles size={20} color={colors.textInverse} /></View>
            <View>
              <Text style={styles.pageTitle}>AI Assistant</Text>
              <Text style={styles.pageSubtitle}>Ask questions about your business</Text>
            </View>
          </View>
        </View>

        {messages.length <= 1 && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsTitle}>Try asking:</Text>
            {SUGGESTED_QUESTIONS.map((q) => (
              <TouchableOpacity key={q} style={styles.suggestionChip} onPress={() => sendMessage(q)}>
                <Text style={styles.suggestionText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
          {messages.map((msg, i) => (
            <View key={i} style={[styles.message, msg.role === 'user' && styles.userMessage]}>
              {msg.role === 'assistant' ? (
                <View style={styles.assistantAvatar}>
                  <Sparkles size={16} color={colors.textInverse} />
                </View>
              ) : (
                <View style={styles.userAvatar}>
                  <User size={16} color={colors.textInverse} />
                </View>
              )}
              <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.bubbleText, msg.role === 'user' && styles.userBubbleText]}>{msg.content}</Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={[styles.message]}>
              <View style={styles.assistantAvatar}>
                <Sparkles size={16} color={colors.textInverse} />
              </View>
              <View style={[styles.bubble, styles.assistantBubble]}>
                <Text style={styles.typingText}>Analyzing your data...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your business..."
            value={input}
            onChangeText={setInput}
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage(input)} disabled={!input.trim() || loading}>
            <Send size={20} color={input.trim() ? colors.textInverse : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background } as any,
  container: { flex: 1, flexDirection: 'column' } as any,
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface } as any,
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md } as any,
  aiIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' } as any,
  pageTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text } as any,
  pageSubtitle: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 } as any,
  suggestions: { padding: spacing.xl, gap: spacing.sm } as any,
  suggestionsTitle: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textSecondary, marginBottom: spacing.xs } as any,
  suggestionChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md } as any,
  suggestionText: { fontSize: fontSizes.md, color: colors.blue } as any,
  messages: { flex: 1, paddingHorizontal: spacing.xl } as any,
  messagesContent: { paddingBottom: spacing.xl, gap: spacing.md } as any,
  message: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', maxWidth: '85%' } as any,
  userMessage: { alignSelf: 'flex-end', flexDirection: 'row-reverse' } as any,
  assistantAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' } as any,
  userAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' } as any,
  bubble: { borderRadius: 12, padding: spacing.md, flex: 1 } as any,
  assistantBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border } as any,
  userBubble: { backgroundColor: colors.blue } as any,
  bubbleText: { fontSize: fontSizes.sm, color: colors.text, lineHeight: 22 } as any,
  userBubbleText: { color: colors.textInverse } as any,
  typingText: { fontSize: fontSizes.sm, color: colors.textSecondary, fontStyle: 'italic' } as any,
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border } as any,
  input: { flex: 1, fontSize: fontSizes.md, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.md, maxHeight: 120, outlineStyle: 'none' } as any,
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' } as any,
});
