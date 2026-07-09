import React, { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming, interpolate } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GlassView } from '@/components/ui/glass-view';
import { INSIGHTS } from './index';

const { height, width } = Dimensions.get('window');

export default function InsightDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const article = INSIGHTS.find(i => i.id === id);

  if (!article) return <View style={styles.container} />;

  const imageProps: any = {
    source: { uri: article.image },
    style: styles.heroImage,
    sharedTransitionTag: `insight-img-${article.id}`
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };

  const headerStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, 100], [0, 1]),
    };
  });

  return (
    <ThemedView style={styles.container}>
      {/* Floating Header */}
      <Animated.View style={[styles.floatingHeader, { paddingTop: insets.top, backgroundColor: theme.background }, headerStyle]}>
        <View style={styles.floatingHeaderInner}>
          <ThemedText type="titleMedium" numberOfLines={1} style={{ flex: 1, textAlign: 'center', color: theme.text, fontWeight: '700' }}>
            {article.title}
          </ThemedText>
        </View>
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: Spacing.six }}
      >
        <View style={styles.heroContainer}>
          <Animated.Image {...imageProps} />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent']}
            style={[styles.topGradient, { height: insets.top + 60 }]}
          />
          <LinearGradient
            colors={['transparent', theme.background]}
            style={styles.bottomGradient}
          />
        </View>

        <Animated.View entering={FadeInDown.duration(600).delay(100).springify()} style={styles.contentContainer}>
          <View style={[styles.badge, { backgroundColor: theme.primaryContainer }]}>
            <ThemedText type="labelSmall" style={{ color: theme.primary, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' }}>
              {article.category}
            </ThemedText>
          </View>
          
          <ThemedText type="displaySmall" style={{ color: theme.text, marginTop: Spacing.three, marginBottom: Spacing.three, fontWeight: '800', lineHeight: 40 }}>
            {article.title}
          </ThemedText>
          
          <View style={styles.authorRow}>
            <View style={[styles.authorAvatar, { backgroundColor: theme.primaryContainer }]}>
              <ThemedText style={{ fontSize: 16 }}>👩‍⚕️</ThemedText>
            </View>
            <View>
              <ThemedText type="labelMedium" style={{ color: theme.text, fontWeight: '600' }}>Dr. Sarah Jenkins</ThemedText>
              <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>5 min read</ThemedText>
            </View>
          </View>
          
          <View style={[styles.summaryBox, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="sparkles" size={20} color={theme.primary} style={{ marginBottom: Spacing.two }} />
            <ThemedText type="bodyMedium" style={{ color: theme.text, fontSize: 18, lineHeight: 28, fontStyle: 'italic' }}>
              {article.summary}
            </ThemedText>
          </View>

          <View style={styles.articleBody}>
            {article.content.split('\n\n').map((paragraph, idx) => (
              <Animated.View key={idx} entering={FadeInDown.duration(600).delay(200 + (idx * 50)).springify()}>
                <ThemedText type="bodyMedium" style={{ color: theme.textSecondary, fontSize: 17, lineHeight: 28, marginBottom: Spacing.four }}>
                  {paragraph}
                </ThemedText>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Back Button */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)} style={[styles.backBtn, { top: insets.top + Spacing.two }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtnInner}>
          <GlassView style={StyleSheet.absoluteFillObject} intensity="medium" />
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
      </Animated.View>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  floatingHeaderInner: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.six,
    justifyContent: 'center',
  },
  heroContainer: {
    width: '100%',
    height: height * 0.5,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 100,
  },
  backBtn: {
    position: 'absolute',
    left: Spacing.four,
    zIndex: 30,
  },
  backBtnInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 12,
  },
  contentContainer: {
    paddingHorizontal: Spacing.five,
    marginTop: -Spacing.four,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  authorAvatar: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  summaryBox: {
    padding: Spacing.four,
    borderRadius: 16,
    marginBottom: Spacing.five,
    borderLeftWidth: 4,
    borderLeftColor: '#B64B74',
  },
  articleBody: {
    marginTop: Spacing.two,
  },
});
