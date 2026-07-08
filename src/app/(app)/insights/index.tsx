import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';

export const CATEGORIES = ['All', 'Period', 'PCOS', 'Pregnancy', 'Nutrition', 'Exercise', 'Mental Health'];

// Expanded Mock Data
export const INSIGHTS = [
  {
    id: '1',
    category: 'Period',
    title: 'Understanding Your Cycle Phases',
    summary: 'A deep dive into the follicular, ovulatory, and luteal phases.',
    content: 'Your menstrual cycle is much more than just your period. It is a complex dance of hormones that affect your energy, mood, and metabolism. \n\n1. Follicular Phase: Estrogen rises, boosting energy. Great for learning new things.\n2. Ovulatory Phase: Peak fertility and energy. You might feel more social.\n3. Luteal Phase: Progesterone dominates. You might feel more withdrawn and require more calories.\n4. Menstrual Phase: Hormones drop. Time to rest and reflect.',
    image: 'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '2',
    category: 'Nutrition',
    title: 'Nutrition for Hormonal Balance',
    summary: 'Foods to embrace and avoid for a smoother cycle experience.',
    content: 'What you eat has a profound impact on your hormones. \n\nSeed cycling (flax, pumpkin, sesame, and sunflower seeds) can help balance estrogen and progesterone. Cruciferous vegetables like broccoli and kale help your liver process excess estrogen. \n\nTry to limit refined sugars and alcohol, especially during your luteal phase, to reduce PMS symptoms like bloating and mood swings.',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '3',
    category: 'Mental Health',
    title: 'Mindfulness & Stress Management',
    summary: 'How cortisol impacts your cycle and how to manage it.',
    content: 'Chronic stress leads to high cortisol, which can directly delay ovulation or cause you to miss a period entirely (hypothalamic amenorrhea). \n\nImplementing daily mindfulness practices—whether it is a 5-minute meditation, deep belly breathing, or simply taking a walk outside without your phone—can signal to your nervous system that you are safe, allowing your reproductive hormones to function normally.',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '4',
    category: 'PCOS',
    title: 'Managing PCOS Symptoms Naturally',
    summary: 'Actionable steps to handle insulin resistance and androgens.',
    content: 'Polycystic Ovary Syndrome (PCOS) is highly linked to insulin resistance. \n\nPrioritize a protein-heavy breakfast within 30 minutes of waking up. Pair all carbohydrates with a healthy fat or protein to prevent glucose spikes. \n\nInositol supplements and spearmint tea have also been shown in clinical studies to help lower excess androgens and restore ovulatory function.',
    image: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '5',
    category: 'Exercise',
    title: 'Cycle Syncing Your Workouts',
    summary: 'How to move your body according to your hormonal phase.',
    content: 'Stop forcing high-intensity workouts when your body is begging for rest! \n\n- Menstrual: Yoga, walking, stretching.\n- Follicular: Cardio, running, dancing.\n- Ovulatory: HIIT, heavy weight lifting.\n- Luteal: Pilates, light strength training, restorative yoga.\n\nMatching your movement to your metabolism prevents burnout and maximizes muscle growth.',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '6',
    category: 'Pregnancy',
    title: 'Preparing Your Body for Conception',
    summary: 'Essential prenatal habits to adopt before you get pregnant.',
    content: 'Preconception care should ideally start 3-6 months before trying to conceive. \n\nBegin taking a high-quality prenatal vitamin containing methylated folate, choline, and DHA. Track your basal body temperature (BBT) and cervical mucus to pinpoint your exact fertile window. \n\nFocus on a nutrient-dense diet and reducing exposure to endocrine-disrupting chemicals found in plastics and conventional cosmetics.',
    image: 'https://images.unsplash.com/photo-1555243896-c709bfa0b564?q=80&w=600&auto=format&fit=crop',
  }
];

export default function InsightsScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredInsights = activeCategory === 'All' 
    ? INSIGHTS 
    : INSIGHTS.filter(i => i.category === activeCategory);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="displaySmall" style={{ color: theme.primary, marginBottom: Spacing.four }}>
            Health Library
          </ThemedText>
        </View>

        {/* Categories Filter */}
        <View style={styles.categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat;
              return (
                <Pressable 
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[styles.categoryChip, { 
                    backgroundColor: isActive ? theme.primary : theme.backgroundElement,
                    borderColor: isActive ? theme.primary : 'transparent'
                  }]}
                >
                  <ThemedText type="labelMedium" style={{ color: isActive ? '#fff' : theme.textSecondary }}>
                    {cat}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Articles List */}
        <FlatList
          data={filteredInsights}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={true}
          renderItem={({ item }) => {
            const imageProps: any = {
              source: { uri: item.image },
              style: styles.cardImage,
              sharedTransitionTag: `insight-img-${item.id}`
            };
            
            return (
              <Pressable onPress={() => router.push({ pathname: '/(app)/insights/[id]', params: { id: item.id } } as any)}>
                <Card variant="elevated" style={styles.card}>
                  <Animated.Image {...imageProps} />
                  
                  {/* Category Badge */}
                  <View style={[styles.badge, { backgroundColor: theme.primaryContainer }]}>
                    <ThemedText type="labelSmall" style={{ color: theme.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {item.category}
                    </ThemedText>
                  </View>

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
  header: {
    paddingHorizontal: Spacing.four,
  },
  categoryContainer: {
    marginBottom: Spacing.four,
  },
  categoryScroll: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  categoryChip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    borderWidth: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  card: {
    overflow: 'hidden',
    padding: 0,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#eee',
  },
  badge: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 12,
  },
  cardText: {
    padding: Spacing.four,
  },
});
