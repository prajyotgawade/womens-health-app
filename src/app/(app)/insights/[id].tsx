import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { INSIGHTS } from './index';

const { height } = Dimensions.get('window');

export default function InsightDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const article = INSIGHTS.find(i => i.id === id);

  if (!article) return <View />;

  const imageProps: any = {
    source: { uri: article.image },
    style: styles.heroImage,
    sharedTransitionTag: `insight-img-${article.id}`
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.six }}>
        <View style={styles.heroContainer}>
          <Animated.Image {...imageProps} />
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={[styles.backBtn, { top: insets.top + Spacing.two }]}>
            <Pressable onPress={() => router.back()} style={[styles.backBtnInner, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.duration(600).delay(100).springify()} style={styles.contentContainer}>
          <View style={[styles.badge, { backgroundColor: theme.primaryContainer }]}>
            <ThemedText type="labelSmall" style={{ color: theme.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
              {article.category}
            </ThemedText>
          </View>
          
          <ThemedText type="displaySmall" style={{ color: theme.text, marginTop: Spacing.three, marginBottom: Spacing.two }}>
            {article.title}
          </ThemedText>
          
          <ThemedText type="bodyMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.six, fontSize: 18, lineHeight: 26, fontStyle: 'italic' }}>
            {article.summary}
          </ThemedText>

          <ThemedText type="bodyMedium" style={{ color: theme.text, fontSize: 16, lineHeight: 26 }}>
            {article.content}
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
  heroContainer: {
    width: '100%',
    height: height * 0.45,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backBtn: {
    position: 'absolute',
    left: Spacing.four,
    zIndex: 10,
  },
  backBtnInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 12,
  },
  contentContainer: {
    padding: Spacing.six,
  },
});
