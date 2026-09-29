import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send, Bot, User, Database, Calculator, TrendingUp, Lightbulb, Sparkles } from 'lucide-react-native';
import { Card, LoadingState } from '@/components/ui';
import { Colors, Spacing, Typography } from '@/lib/theme';
import type { AIMessage, AIAnswerType } from '@/lib/types';
import * as aiApi from '@/api/ai';

const ANSWER_TYPE_CONFIG: Record<AIAnswerType, { label: string; color: string; bgColor: string; icon: typeof Database }> = {
  fact: { label: 'Recorded Fact', color: Colors.primary[700], bgColor: Colors.primary[50], icon: Database },
  calculation: { label: 'Calculation', color: Colors.secondary[700], bgColor: Colors.secondary[50], icon: Calculator },
  forecast: { label: 'Forecast', color: Colors.accent[700], bgColor: Colors.accent[50], icon: TrendingUp },
  recommendation: { label: 'Recommendation', color: '#8b5cf6', bgColor: '#f5f3ff', icon: Lightbulb },
};

export default function AIAssistantScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showStarters, setShowStarters] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    aiApi.getChatHistory().then((history) => {
      setMessages(history);
      setLoading(false);
      if (history.length > 0) setShowStarters(false);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const content = text ?? input;
    if (!content.trim() || sending) return;

    const userMsg: AIMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setShowStarters(false);
    setSending(true);

    try {
      const response = await aiApi.sendMessage(content);
      setMessages((prev) => [...prev, response]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I could not process your question right now. Please try again.',
        answer_type: 'recommendation',
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  };

  const starters = aiApi.getStarterQuestions();

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <View style={styles.aiIcon}>
            <Sparkles size={18} color={Colors.primary[600]} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.topTitle}>AI Assistant</Text>
            <Text style={styles.topSub}>Powered by your business data</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={styles.chatScroll} contentContainerStyle={styles.chatContent}>
          {loading ? (
            <LoadingState label="Loading conversation..." />
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {sending && (
                <View style={styles.typingWrap}>
                  <View style={styles.typingBubble}>
                    <Text style={styles.typingText}>Thinking...</Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {showStarters && !loading && (
          <View style={styles.startersWrap}>
            <Text style={styles.startersLabel}>Try asking:</Text>
            {starters.map((q, i) => (
              <TouchableOpacity key={i} onPress={() => handleSend(q)} style={styles.starterBtn}>
                <Text style={styles.starterText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your business..."
            placeholderTextColor={Colors.neutral[400]}
            multiline
          />
          <TouchableOpacity onPress={() => handleSend()} disabled={sending || !input.trim()} style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}>
            <Send size={18} color={Colors.neutral[0]} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user';
  const config = message.answer_type ? ANSWER_TYPE_CONFIG[message.answer_type] : null;
  const AnswerIcon = config?.icon;

  return (
    <View style={[styles.messageWrap, isUser ? styles.userWrap : styles.assistantWrap]}>
      <View style={[styles.avatar, isUser ? styles.userAvatar : styles.assistantAvatar]}>
        {isUser ? <User size={16} color={Colors.neutral[0]} strokeWidth={2} /> : <Bot size={16} color={Colors.primary[600]} strokeWidth={2} />}
      </View>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {config && AnswerIcon && (
          <View style={[styles.answerTypeBadge, { backgroundColor: config.bgColor }]}>
            <AnswerIcon size={12} color={config.color} strokeWidth={2} />
            <Text style={[styles.answerTypeText, { color: config.color }]}>{config.label}</Text>
          </View>
        )}
        <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>
        {message.sources && message.sources.length > 0 && (
          <View style={styles.sourcesRow}>
            {message.sources.map((src, i) => (
              <View key={i} style={styles.sourcePill}>
                <Database size={10} color={Colors.neutral[500]} strokeWidth={2} />
                <Text style={styles.sourceText}>{src}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  aiIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: Typography.fontFamilyBold, fontSize: Typography.sizes.lg, color: Colors.neutral[900] },
  topSub: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.xs, color: Colors.neutral[500] },
  chatScroll: { flex: 1 },
  chatContent: { padding: Spacing.lg, paddingBottom: Spacing.sm },
  messageWrap: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, maxWidth: '92%' },
  userWrap: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  assistantWrap: { alignSelf: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userAvatar: { backgroundColor: Colors.primary[600] },
  assistantAvatar: { backgroundColor: Colors.primary[50] },
  bubble: { borderRadius: 16, padding: Spacing.md, flexShrink: 1 },
  userBubble: { backgroundColor: Colors.primary[600] },
  assistantBubble: { backgroundColor: Colors.neutral[0], borderWidth: 1, borderColor: Colors.neutral[200] },
  answerTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: 8, marginBottom: Spacing.sm, alignSelf: 'flex-start' },
  answerTypeText: { fontFamily: Typography.fontFamilySemiBold, fontSize: 10 },
  messageText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, lineHeight: Typography.sizes.sm * 1.5 },
  userText: { color: Colors.neutral[0] },
  assistantText: { color: Colors.neutral[800] },
  sourcesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm },
  sourcePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.neutral[100], borderRadius: 6, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  sourceText: { fontFamily: Typography.fontFamilyRegular, fontSize: 10, color: Colors.neutral[500] },
  typingWrap: { alignSelf: 'flex-start', flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  typingBubble: { backgroundColor: Colors.neutral[0], borderWidth: 1, borderColor: Colors.neutral[200], borderRadius: 16, padding: Spacing.md },
  typingText: { fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[400] },
  startersWrap: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  startersLabel: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.neutral[500], marginBottom: Spacing.sm },
  starterBtn: { backgroundColor: Colors.neutral[0], borderWidth: 1, borderColor: Colors.neutral[200], borderRadius: 12, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, marginBottom: Spacing.sm },
  starterText: { fontFamily: Typography.fontFamilyMedium, fontSize: Typography.sizes.sm, color: Colors.primary[700] },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.neutral[0], borderTopWidth: 1, borderTopColor: Colors.neutral[200] },
  input: { flex: 1, borderWidth: 1, borderColor: Colors.neutral[300], borderRadius: 20, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontFamily: Typography.fontFamilyRegular, fontSize: Typography.sizes.sm, color: Colors.neutral[900], backgroundColor: Colors.neutral[50], maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.neutral[300] },
});
