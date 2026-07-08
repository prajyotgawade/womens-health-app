import React from 'react';
import { View, StyleSheet, FlatList, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';

// Mock Data
export const INSIGHTS = [
  {
    id: '1',
    title: 'Understanding Your Cycle Phases',
    summary: 'A deep dive into the follicular, ovulatory, and luteal phases.',
    image: 'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '2',
    title: 'Nutrition for Hormonal Balance',
    summary: 'Foods to embrace and avoid for a smoother cycle experience.',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '3',
    title: 'Mindfulness & Stress Management',
    summary: 'How cortisol impacts your cycle and how to manage it.',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=600&auto=format&fit=crop',
  },
];

export default function InsightsScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedText type="displaySmall" style={{ color: theme.primary, marginBottom: Spacing.four, paddingHorizontal: Spacing.four }}>
          Insights
        </ThemedText>

        <FlatList
          data={INSIGHTS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const imageProps: any = {
              source: { uri: item.image },
              style: styles.cardImage,
              sharedTransitionTag: `insight-img-${item.id}`
            };
            
            return (
              <Pressable onPress={() => router.push({ pathname: '/(app)/insights/[id]', params: { id: item.id } })}>
                <Card variant="elevated" style={styles.card}>
                  <Animated.Image {...imageProps} />
                  <View style={styles.cardText}>
                    <ThemedText type="titleMedium" style={{ marginBottom: Spacing.one, color: theme.text }}>
                      {item.title}
                    </ThemedText>
                    <ThemedText type="bodyMedium" style={{ color: theme.textSecondary }}>
                      {item.summary}
                    </ThemedText>
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
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
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  card: {
    overflow: 'hidden',
    padding: 0,
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#eee',
  },
  cardText: {
    padding: Spacing.four,
  },
});
