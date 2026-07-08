import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { INSIGHTS } from './index';

const { width } = Dimensions.get('window');

export default function InsightDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const insight = INSIGHTS.find(i => i.id === id);

  if (!insight) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText>Article not found.</ThemedText>
      </ThemedView>
    );
  }

  const imageProps: any = {
    source: { uri: insight.image },
    style: styles.heroImage,
    sharedTransitionTag: `insight-img-${insight.id}`
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Animated.Image {...imageProps} />
          
          <Pressable 
            style={[styles.backButton, { top: insets.top + Spacing.two }]}
            onPress={() => router.back()}
          >
            <View style={[styles.backButtonInner, { backgroundColor: theme.background }]}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </View>
          </Pressable>
        </View>

        <Animated.View 
          entering={FadeInDown.duration(600).delay(300).springify()}
          style={styles.content}
        >
          <ThemedText type="displaySmall" style={{ color: theme.text, marginBottom: Spacing.three }}>
            {insight.title}
          </ThemedText>
          <ThemedText type="titleMedium" style={{ color: theme.primary, marginBottom: Spacing.five }}>
            {insight.summary}
          </ThemedText>

          {/* Dummy Content */}
          <ThemedText type="bodyLarge" style={{ color: theme.textSecondary, lineHeight: 28, marginBottom: Spacing.four }}>
            Hormonal balance plays a critical role in your overall well-being. By tracking your cycle phases, you can better understand your body's unique rhythms and optimize your lifestyle accordingly.
          </ThemedText>
          <ThemedText type="bodyLarge" style={{ color: theme.textSecondary, lineHeight: 28, marginBottom: Spacing.four }}>
            The follicular phase is characterized by rising estrogen levels, which often lead to increased energy and creativity. This is an excellent time for brainstorming and starting new projects.
          </ThemedText>
          <ThemedText type="bodyLarge" style={{ color: theme.textSecondary, lineHeight: 28 }}>
            Conversely, the luteal phase, dominated by progesterone, is a natural time for inward reflection, nesting, and self-care. Prioritizing rest during this time can significantly reduce premenstrual symptoms.
          </ThemedText>
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    width: width,
    height: width * 0.9,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    left: Spacing.four,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.five,
    paddingBottom: Spacing.six,
  },
});
