import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, Layout, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { askAI } from '@/utils/ai';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

type Message = { id: string; text: string; isUser: boolean };

const QUICK_PROMPTS = [
  { text: "Explain luteal phase?", icon: "moon-outline" },
  { text: "How to relieve cramps?", icon: "fitness-outline" },
  { text: "PCOS & irregular cycles?", icon: "pulse-outline" },
  { text: "What is seed cycling?", icon: "leaf-outline" },
  { text: "Best foods for hormones?", icon: "nutrition-outline" },
];

function TypingDots({ theme }: { theme: any }) {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    dot1.value = withRepeat(withSequence(withTiming(-4, { duration: 300 }), withTiming(0, { duration: 300 })), -1, false);
    setTimeout(() => {
      dot2.value = withRepeat(withSequence(withTiming(-4, { duration: 300 }), withTiming(0, { duration: 300 })), -1, false);
    }, 150);
    setTimeout(() => {
      dot3.value = withRepeat(withSequence(withTiming(-4, { duration: 300 }), withTiming(0, { duration: 300 })), -1, false);
    }, 300);
  }, []);

  const style1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const style2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const style3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', paddingHorizontal: 4 }}>
      <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: theme.primary, opacity: 0.6 }, style1]} />
      <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: theme.primary, opacity: 0.8 }, style2]} />
      <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: theme.primary }, style3]} />
    </View>
  );
}

export default function AIChatScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { session } = useAuth();
  const user = session?.user;

  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', text: 'Hi! I\'m your Aura AI Health Companion. Ask me anything about your cycle, symptoms, nutrition, or general wellness.\n\n*Medical disclaimer: I cannot provide clinical diagnoses.*', isUser: false }
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
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-down" size={26} color={theme.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <LinearGradient
              colors={[theme.primary, theme.tertiary || theme.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiAvatar}
            >
              <Ionicons name="sparkles" size={18} color="#fff" />
            </LinearGradient>
            <View style={{ marginLeft: 10 }}>
              <ThemedText style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>Aura AI</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '500' }}>Health Companion</ThemedText>
            </View>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: theme.errorContainer }]}>
          <Ionicons name="shield-checkmark-outline" size={14} color={theme.error} style={{ marginRight: 6 }} />
          <ThemedText style={{ color: theme.error, flex: 1, fontSize: 11, fontWeight: '700' }}>
            Not a substitute for professional medical advice.
          </ThemedText>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
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
                style={[styles.messageRow, msg.isUser ? styles.userRow : styles.aiRow]}
              >
                {!msg.isUser && (
                  <LinearGradient
                    colors={[theme.primary, theme.tertiary || theme.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aiAvatarSmall}
                  >
                    <Ionicons name="sparkles" size={11} color="#fff" />
                  </LinearGradient>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    msg.isUser ? [styles.userBubble, { backgroundColor: theme.primary }] : [styles.aiBubble, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }],
                  ]}
                >
                  <ThemedText style={{ color: msg.isUser ? '#fff' : theme.text, lineHeight: 20, fontSize: 14 }}>
                    {msg.text}
                  </ThemedText>
                </View>
              </Animated.View>
            ))}

            {isTyping && (
              <Animated.View entering={FadeIn.duration(300)} style={[styles.messageRow, styles.aiRow]}>
                <LinearGradient
                  colors={[theme.primary, theme.tertiary || theme.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.aiAvatarSmall}
                >
                  <Ionicons name="sparkles" size={11} color="#fff" />
                </LinearGradient>
                <View style={[styles.typingBubble, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                  <TypingDots theme={theme} />
                </View>
              </Animated.View>
            )}
          </ScrollView>

          {/* Quick Prompts */}
          <View style={styles.promptsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptsScroll}>
              {QUICK_PROMPTS.map((prompt, i) => (
                <Pressable
                  key={i}
                  style={[styles.promptChip, { backgroundColor: theme.primaryContainer, borderColor: `${theme.primary}40` }]}
                  onPress={() => sendMessage(prompt.text)}
                >
                  <Ionicons name={prompt.icon as any} size={13} color={theme.primary} style={{ marginRight: 4 }} />
                  <ThemedText style={{ color: theme.primary, fontWeight: '700', fontSize: 12 }}>{prompt.text}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Input */}
          <View style={[styles.inputRow, { borderTopColor: theme.backgroundElement, backgroundColor: theme.background }]}>
            <View style={[styles.inputWrap, { backgroundColor: theme.backgroundElement }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Ask about health, cycle, symptoms..."
                placeholderTextColor={theme.textSecondary}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => sendMessage(input)}
                returnKeyType="send"
                multiline
                maxLength={500}
              />
            </View>
            <Pressable
              style={[styles.sendBtn, { backgroundColor: input.trim() ? theme.primary : theme.backgroundElement }]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
            >
              {isTyping ? (
                <ActivityIndicator size="small" color={theme.textSecondary} />
              ) : (
                <Ionicons name="arrow-up" size={20} color={input.trim() ? '#fff' : theme.textSecondary} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    marginHorizontal: Spacing.three,
    marginVertical: Spacing.two,
    borderRadius: 12,
  },
  keyboardView: { flex: 1 },
  chatScroll: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  aiAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: Spacing.three + 4,
    paddingVertical: Spacing.three,
    borderRadius: 20,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },
  typingBubble: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },
  promptsWrapper: {
    paddingVertical: Spacing.two,
  },
  promptsScroll: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    paddingBottom: Platform.OS === 'ios' ? Spacing.three : Spacing.two + 4,
    borderTopWidth: 1,
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  inputWrap: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: Spacing.three + 4,
    paddingVertical: Spacing.two,
    minHeight: 46,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
