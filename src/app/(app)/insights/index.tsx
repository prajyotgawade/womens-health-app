import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInRight, useSharedValue, useAnimatedStyle, withSpring, interpolate } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GlassView } from '@/components/ui/glass-view';

const { width } = Dimensions.get('window');

export const CATEGORIES = ['All', 'Period', 'PCOS', 'Pregnancy', 'Nutrition', 'Exercise', 'Mental Health'];

export const INSIGHTS = [
  {
    id: '1', category: 'Period',
    title: 'Understanding Your Cycle Phases',
    summary: 'A deep dive into the follicular, ovulatory, and luteal phases.',
    content: 'Your menstrual cycle is much more than just your period. It is a complex dance of hormones that affect your energy, mood, and metabolism. \n\n1. Follicular Phase: Estrogen rises, boosting energy. Great for learning new things.\n2. Ovulatory Phase: Peak fertility and energy. You might feel more social.\n3. Luteal Phase: Progesterone dominates. You might feel more withdrawn and require more calories.\n4. Menstrual Phase: Hormones drop. Time to rest and reflect.',
    image: 'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?q=80&w=600&auto=format&fit=crop',
    featured: true, height: 280,
  },
  {
    id: '2', category: 'Nutrition',
    title: 'Nutrition for Hormonal Balance',
    summary: 'Foods to embrace and avoid for a smoother cycle experience.',
    content: 'What you eat has a profound impact on your hormones. \n\nSeed cycling (flax, pumpkin, sesame, and sunflower seeds) can help balance estrogen and progesterone. Cruciferous vegetables like broccoli and kale help your liver process excess estrogen. \n\nTry to limit refined sugars and alcohol, especially during your luteal phase, to reduce PMS symptoms like bloating and mood swings.',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=600&auto=format&fit=crop',
    featured: false, height: 220,
  },
  {
    id: '3', category: 'Mental Health',
    title: 'Mindfulness & Stress Management',
    summary: 'How cortisol impacts your cycle and how to manage it.',
    content: 'Chronic stress leads to high cortisol, which can directly delay ovulation or cause you to miss a period entirely (hypothalamic amenorrhea). \n\nImplementing daily mindfulness practices—whether it is a 5-minute meditation, deep belly breathing, or simply taking a walk outside without your phone—can signal to your nervous system that you are safe, allowing your reproductive hormones to function normally.',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=600&auto=format&fit=crop',
    featured: false, height: 180,
  },
  {
    id: '4', category: 'PCOS',
    title: 'Managing PCOS Symptoms Naturally',
    summary: 'Actionable steps to handle insulin resistance and androgens.',
    content: 'Polycystic Ovary Syndrome (PCOS) is highly linked to insulin resistance. \n\nPrioritize a protein-heavy breakfast within 30 minutes of waking up. Pair all carbohydrates with a healthy fat or protein to prevent glucose spikes. \n\nInositol supplements and spearmint tea have also been shown in clinical studies to help lower excess androgens and restore ovulatory function.',
    image: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?q=80&w=600&auto=format&fit=crop',
    featured: false, height: 260,
  },
  {
    id: '5', category: 'Exercise',
    title: 'Cycle Syncing Your Workouts',
    summary: 'How to move your body according to your hormonal phase.',
    content: 'Stop forcing high-intensity workouts when your body is begging for rest! \n\n- Menstrual: Yoga, walking, stretching.\n- Follicular: Cardio, running, dancing.\n- Ovulatory: HIIT, heavy weight lifting.\n- Luteal: Pilates, light strength training, restorative yoga.\n\nMatching your movement to your metabolism prevents burnout and maximizes muscle growth.',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=600&auto=format&fit=crop',
    featured: false, height: 200,
  }
];

export default function InsightsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredInsights = activeCategory === 'All' 
    ? INSIGHTS 
    : INSIGHTS.filter(i => i.category === activeCategory);

  // Simple Masonry Split
  const leftColumn = filteredInsights.filter((_, i) => i % 2 === 0);
  const rightColumn = filteredInsights.filter((_, i) => i % 2 !== 0);

  const renderCard = (item: typeof INSIGHTS[0], index: number) => {
    return (
      <Animated.View key={item.id} entering={FadeInDown.duration(600).delay(index * 100).springify()} style={{ marginBottom: Spacing.four }}>
        <Pressable 
          onPress={() => router.push({ pathname: '/(app)/insights/[id]', params: { id: item.id } } as any)}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          <View style={[styles.masonryCard, { height: item.height }]}>
            <Animated.Image 
              source={{ uri: item.image }} 
              style={styles.cardImage} 
              {...{ sharedTransitionTag: `insight-img-${item.id}` } as any}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={styles.cardGradient}
            >
              <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                <ThemedText type="labelSmall" style={{ color: '#fff', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '800', fontSize: 9 }}>
                  {item.category}
                </ThemedText>
              </View>
              <ThemedText type="titleMedium" style={{ color: '#fff', fontWeight: '800', lineHeight: 22, marginTop: Spacing.one }}>
                {item.title}
              </ThemedText>
            </LinearGradient>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.six }}>
        <View style={{ paddingTop: insets.top + Spacing.four, paddingHorizontal: Spacing.five }}>
          <Animated.View entering={FadeInDown.duration(500).springify()}>
            <ThemedText type="displaySmall" style={{ color: theme.primary, fontWeight: '900', letterSpacing: -1 }}>
              Discover
            </ThemedText>
            <ThemedText type="bodyLarge" style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
              Curated health insights for you
            </ThemedText>
          </Animated.View>
        </View>

        {/* Categories */}
        <View style={styles.categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat, index) => {
              const isActive = activeCategory === cat;
              return (
                <Animated.View key={cat} entering={FadeInRight.duration(400).delay(index * 50).springify()}>
                  <Pressable 
                    onPress={() => setActiveCategory(cat)}
                    style={[
                      styles.categoryChip, 
                      { 
                        backgroundColor: isActive ? theme.primary : theme.backgroundElement,
                        borderColor: isActive ? theme.primary : theme.outlineVariant,
                        borderWidth: isActive ? 0 : 1,
                      }
                    ]}
                  >
                    <ThemedText type="labelMedium" style={{ color: isActive ? '#fff' : theme.textSecondary, fontWeight: isActive ? '800' : '600' }}>
                      {cat}
                    </ThemedText>
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>

        {/* Masonry Grid */}
        <View style={styles.masonryContainer}>
          <View style={styles.masonryColumn}>
            {leftColumn.map((item, i) => renderCard(item, i))}
          </View>
          <View style={styles.masonryColumn}>
            {rightColumn.map((item, i) => renderCard(item, i))}
          </View>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoryContainer: {
    marginVertical: Spacing.five,
  },
  categoryScroll: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  categoryChip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 4,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masonryContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  masonryColumn: {
    flex: 1,
    gap: Spacing.four,
  },
  masonryCard: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#333',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardGradient: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: '70%',
    padding: Spacing.four,
    justifyContent: 'flex-end',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 12,
    marginBottom: Spacing.two,
  }
});
