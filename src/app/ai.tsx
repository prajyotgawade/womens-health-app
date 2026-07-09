import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Skeleton } from '@/components/ui/skeleton';
import { askAI } from '@/utils/ai';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

type Message = { id: string; text: string; isUser: boolean };

const QUICK_PROMPTS = [
  "Explain luteal phase energy levels?",
  "How to naturally relieve cramps?",
  "Is cycle irregularity linked to PCOS?",
  "What is seed cycling?"
];

export default function AIChatScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const user = session?.user;
  
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', text: 'Hi! I am your AI Health Assistant. Ask me anything about your cycle, symptoms, or general wellness. \n\n*Note: I cannot provide medical diagnoses.*', isUser: false }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchAIChatHistory();
  }, [user]);

  const fetchAIChatHistory = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('ai_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        const historyMsgs: Message[] = [];
        data.forEach(chat => {
          historyMsgs.push({ id: `${chat.id}-q`, text: chat.prompt, isUser: true });
          historyMsgs.push({ id: `${chat.id}-a`, text: chat.response, isUser: false });
        });
        setMessages(prev => [...prev, ...historyMsgs]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 200);
      }
    } catch (e) {
      console.warn('Error loading AI history:', e);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = { id: Date.now().toString(), text, isUser: true };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await askAI(text);
      
      // Save prompt-response log to Supabase
      const { error } = await supabase.from('ai_history').insert({
        user_id: user.id,
        prompt: text,
        response: response,
      });

      if (error) console.warn('History save warning:', error);

      setIsTyping(false);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), text: response, isUser: false };
      setMessages(prev => [...prev, aiMsg]);
      
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.error(e);
      setIsTyping(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={theme.text} />
          </Pressable>
          <View style={styles.headerTitle}>
            <Ionicons name="sparkles" size={18} color={theme.primary} style={{ marginRight: 6 }} />
            <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '800' }}>
              Aura AI Health Companion
            </ThemedText>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Safety Disclaimer Banner */}
        <View style={[styles.disclaimer, { backgroundColor: theme.errorContainer }]}>
          <Ionicons name="warning" size={16} color={theme.error} style={{ marginRight: 8 }} />
          <ThemedText type="labelSmall" style={{ color: theme.error, flex: 1, fontWeight: '700' }}>
            Aura AI does not provide clinical diagnoses.
          </ThemedText>
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardView} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Chat Feed */}
          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={styles.chatScroll}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => (
              <Animated.View 
                key={msg.id} 
                layout={Layout.springify()}
                entering={FadeInDown.duration(300)}
                style={[
                  styles.messageBubble,
                  msg.isUser ? styles.userBubble : styles.aiBubble,
                  { backgroundColor: msg.isUser ? theme.primary : theme.backgroundElement }
                ]}
              >
                {!msg.isUser && msg.id !== 'welcome' && (
                  <Ionicons name="sparkles" size={14} color={theme.primary} style={{ marginBottom: 4 }} />
                )}
                <ThemedText type="bodyMedium" style={{ color: msg.isUser ? '#fff' : theme.text, lineHeight: 20 }}>
                  {msg.text}
                </ThemedText>
              </Animated.View>
            ))}

            {isTyping && (
              <Animated.View entering={FadeIn.duration(400)} style={[styles.messageBubble, styles.aiBubble, styles.typingBubble, { backgroundColor: theme.backgroundElement }]}>
                <Skeleton width={120} height={16} borderRadius={8} />
              </Animated.View>
            )}
          </ScrollView>

          {/* Quick Prompts */}
          <View style={styles.promptsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptsScroll}>
              {QUICK_PROMPTS.map((prompt, i) => (
                <Pressable 
                  key={i} 
                  style={[styles.promptChip, { borderColor: theme.primary }]}
                  onPress={() => sendMessage(prompt)}
                >
                  <ThemedText type="labelMedium" style={{ color: theme.primary, fontWeight: '600' }}>{prompt}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Input Area */}
          <View style={[styles.inputContainer, { borderTopColor: theme.backgroundElement }]}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="Ask about cycle phases, symptoms..."
              placeholderTextColor={theme.textSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage(input)}
              returnKeyType="send"
            />
            <Pressable 
              style={[styles.sendBtn, { backgroundColor: input.trim() ? theme.primary : theme.backgroundElement }]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim()}
            >
              <Ionicons name="arrow-up" size={24} color={input.trim() ? '#fff' : theme.textSecondary} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  closeBtn: {
    padding: Spacing.one,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  keyboardView: {
    flex: 1,
  },
  chatScroll: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: Spacing.four,
    borderRadius: 20,
    marginBottom: Spacing.four,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  promptsContainer: {
    marginBottom: Spacing.three,
  },
  promptsScroll: {
    paddingHorizontal: Spacing.four,
    paddingRight: Spacing.six + 40, // Ensure last chip is fully scrollable and not cut off
    gap: Spacing.three,
  },
  promptChip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    borderWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.four,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: Spacing.four,
    fontSize: 16,
    marginRight: Spacing.three,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
