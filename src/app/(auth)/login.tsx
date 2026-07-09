import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image as RNImage,
  ScrollView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { GlassView } from '@/components/ui/glass-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

// Load local assets for a premium, immersive feel
const bgImage = require('@/assets/images/login-bg.png');
const logoGlow = require('@/assets/images/logo-glow.png');

// Medical-focused onboarding slides
const slides = [
  {
    icon: 'heart-outline',
    title: 'Clinically Guided Sync',
    desc: 'Understand your biological phases, hormones, and health trends using medically focused insights.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Privacy First Encryption',
    desc: 'Your logs are fully encrypted. We prioritize user privacy and secure medical data practices.',
  },
  {
    icon: 'document-attach-outline',
    title: 'Export Diagnostic Journals',
    desc: 'Share detailed PDF cycle history directly with your physician during clinical consultations.',
  }
];

// Floating Ambient Orb Component (Calm medical slate/teal/amethyst colors)
function FloatingOrb({ delay = 0, color = '#6E56CF', startX = 0, startY = 0, size = 220 }) {
  const tx = useSharedValue(startX);
  const ty = useSharedValue(startY);
  const scale = useSharedValue(1);

  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(startX + 40, { duration: 8000 + delay, easing: Easing.inOut(Easing.ease) }),
        withTiming(startX - 40, { duration: 10000 + delay, easing: Easing.inOut(Easing.ease) }),
        withTiming(startX, { duration: 8000 + delay, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    ty.value = withRepeat(
      withSequence(
        withTiming(startY - 45, { duration: 9000 + delay, easing: Easing.inOut(Easing.ease) }),
        withTiming(startY + 45, { duration: 11000 + delay, easing: Easing.inOut(Easing.ease) }),
        withTiming(startY, { duration: 9000 + delay, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 6000 + delay, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.85, { duration: 6000 + delay, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value }
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle
      ]}
    />
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Logo floating animation
  const floatAnim = useSharedValue(0);

  // Logo backing glow breathing animation (Inhale 4s / Exhale 4s)
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.7);

  // Carousel slide state & animations
  const [activeSlide, setActiveSlide] = useState(0);
  const slideOpacity = useSharedValue(1);
  const slideTranslateX = useSharedValue(0);
  const activeIndex = useSharedValue(0);

  useEffect(() => {
    // Logo float
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 3200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Glowing circle breath simulation
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // Slide autoplay rotation
  useEffect(() => {
    const timer = setInterval(() => {
      // Smooth fade out + slide left transition
      slideOpacity.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) });
      slideTranslateX.value = withTiming(-20, { duration: 250, easing: Easing.out(Easing.ease) }, (finished) => {
        if (finished) {
          activeIndex.value = (activeIndex.value + 1) % slides.length;
          runOnJS(setActiveSlide)(activeIndex.value);

          // Reset position to right and fade back in
          slideTranslateX.value = 20;
          slideOpacity.value = withTiming(1, { duration: 300, easing: Easing.in(Easing.ease) });
          slideTranslateX.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) });
        }
      });
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  // Manual dot tab selection trigger
  const handleSelectSlide = (index: number) => {
    if (index === activeSlide) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const direction = index > activeSlide ? -20 : 20;
    slideOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        activeIndex.value = index;
        runOnJS(setActiveSlide)(index);

        slideTranslateX.value = -direction;
        slideOpacity.value = withTiming(1, { duration: 200 });
        slideTranslateX.value = withTiming(0, { duration: 200 });
      }
    });
  };

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }]
  }));

  const breathingGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value
  }));

  const slideStyle = useAnimatedStyle(() => ({
    opacity: slideOpacity.value,
    transform: [{ translateX: slideTranslateX.value }]
  }));

  // Time-aware personalization greeting
  const [greeting, setGreeting] = useState({ title: 'Welcome', subtitle: 'Sync with your nature' });

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) {
      setGreeting({ title: 'Good morning', subtitle: 'Begin your day with conscious clinical care' });
    } else if (hours < 17) {
      setGreeting({ title: 'Good afternoon', subtitle: 'Stay aligned with your natural biological state' });
    } else {
      setGreeting({ title: 'Good evening', subtitle: 'Reflect and restore your mental & hormonal balance' });
    }
  }, []);

  useEffect(() => {
    const handleDeepLink = async (event: Linking.EventType) => {
      if (event.url) {
        try {
          const parsedUrl = Linking.parse(event.url);
          if (parsedUrl.queryParams?.error_description) {
            setError(parsedUrl.queryParams.error_description as string);
          }
        } catch { }
      }
    };
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  // Google Authentication Flow
  const signInWithGoogle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);

    try {
      const redirectUrl = Linking.createURL('/(auth)/login');
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });

      if (oauthError) throw oauthError;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success' && result.url) {
          const url = result.url;
          const hashMatch = url.match(/#(.+)/);

          if (hashMatch) {
            const hash = hashMatch[1];
            const params = hash.split('&').reduce((acc: any, item: string) => {
              const [key, value] = item.split('=');
              acc[key] = decodeURIComponent(value);
              return acc;
            }, {});

            if (params.access_token && params.refresh_token) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: params.access_token,
                refresh_token: params.refresh_token,
              });

              if (sessionError) throw sessionError;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google sign in.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

      {/* Immersive Background Image with soft opacity */}
      <ImageBackground source={bgImage} style={styles.bgImage} imageStyle={{ opacity: isDark ? 0.35 : 0.15 }} resizeMode="cover">

        {/* Soft Ambient Floating Orbs - Trustworthy Amethyst and Calm Ocean Teal */}
        <FloatingOrb color={isDark ? '#3D2D68' : '#E6E1F7'} startX={-width * 0.3} startY={-height * 0.15} delay={0} size={260} />
        <FloatingOrb color={isDark ? '#144641' : '#DFF7F4'} startX={width * 0.25} startY={height * 0.15} delay={1500} size={220} />
        <FloatingOrb color={isDark ? '#2D3250' : '#E8EBF8'} startX={-width * 0.15} startY={height * 0.4} delay={3000} size={200} />

        {/* Soft Gradient Overlay for clinical visual clarity */}
        <LinearGradient
          colors={isDark ? ['rgba(17,18,24,0.45)', 'rgba(17,18,24,0.75)', 'rgba(17,18,24,0.98)'] : ['rgba(251,251,254,0.3)', 'rgba(251,251,254,0.7)', 'rgba(251,251,254,0.98)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topSection}>
              {/* Glowing animated logo stack (Medical theme breathing aura) */}
              <Animated.View style={[styles.logoStack, floatingStyle]}>
                <Animated.View style={[styles.logoGlowAbsolute, breathingGlowStyle]}>
                  <RNImage source={logoGlow} style={styles.logoGlowImage} resizeMode="contain" />
                </Animated.View>
                <Animated.View
                  entering={FadeInUp.duration(1200).springify()}
                  style={[
                    styles.logoMainView,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.outlineVariant
                    }
                  ]}
                >
                  <RNImage source={require('@/assets/images/expo-logo.png')} style={styles.logoIconImage} resizeMode="contain" />
                </Animated.View>
              </Animated.View>

              <Animated.View entering={FadeInUp.duration(1200).delay(150).springify()} style={styles.titleContainer}>
                <ThemedText type="displayLarge" style={[styles.titleText, { color: theme.text }]}>
                  Aura.
                </ThemedText>
                <ThemedText type="titleMedium" style={[styles.subtitleText, { color: theme.textSecondary }]}>
                  Sync with your true nature.
                </ThemedText>
              </Animated.View>
            </View>

            {/* Premium Trustworthy Action Card */}
            <Animated.View
              entering={FadeInDown.duration(1000).delay(300).springify()}
              style={styles.bottomSection}
            >
              <GlassView
                intensity="medium"
                borderRadius={32}
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: isDark ? 'rgba(24, 26, 35, 0.75)' : 'rgba(255, 255, 255, 0.85)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'
                  }
                ]}
              >
                <View style={styles.dragIndicator} />

                <View style={styles.greetingHeader}>
                  <ThemedText type="headlineSmall" style={[styles.welcomeText, { color: theme.text }]}>
                    {greeting.title}
                  </ThemedText>
                  <ThemedText type="bodyMedium" style={[styles.instructionText, { color: theme.textSecondary }]}>
                    {greeting.subtitle}
                  </ThemedText>
                </View>

                {/* Animated Feature Onboarding Carousel (Google/Adobe UX standard) */}
                <View style={styles.carouselContainer}>
                  <Animated.View style={[styles.carouselSlide, slideStyle]}>
                    <View style={[styles.slideIconWrap, { backgroundColor: theme.primaryContainer }]}>
                      <Ionicons name={slides[activeSlide].icon as any} size={22} color={theme.primary} />
                    </View>
                    <ThemedText type="titleMedium" style={[styles.slideTitle, { color: theme.text }]}>
                      {slides[activeSlide].title}
                    </ThemedText>
                    <ThemedText type="bodyMedium" style={[styles.slideDesc, { color: theme.textSecondary }]}>
                      {slides[activeSlide].desc}
                    </ThemedText>
                  </Animated.View>

                  {/* Interactive Pagination Dots (Tap to navigate) */}
                  <View style={styles.dotsContainer}>
                    {slides.map((_, index) => {
                      const isActive = index === activeSlide;
                      return (
                        <Pressable
                          key={index}
                          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                          onPress={() => handleSelectSlide(index)}
                          style={[
                            styles.dot,
                            {
                              width: isActive ? 18 : 6,
                              opacity: isActive ? 1 : 0.35,
                              backgroundColor: isActive ? theme.primary : theme.textSecondary
                            }
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>

                {error && (
                  <Animated.View entering={FadeInDown.duration(400)} style={styles.feedbackContainer}>
                    <ErrorState title="Authentication Error" message={error} onRetry={() => setError(null)} />
                  </Animated.View>
                )}

                <View style={styles.buttonContainer}>
                  <Button
                    label="Continue with Google"
                    variant="filled"
                    onPress={signInWithGoogle}
                    icon={
                      <RNImage
                        source={{ uri: 'https://img.icons8.com/color/48/google-logo.png' }}
                        style={styles.googleIcon}
                        resizeMode="contain"
                      />
                    }
                    loading={loading}
                    style={[
                      styles.authBtn,
                      {
                        backgroundColor: isDark ? '#2D3250' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
                      }
                    ]}
                    labelStyle={{ color: theme.text, fontWeight: '700', fontSize: 16 }}
                  />
                </View>

                {/* HIPAA Compliant Trusted Badges (Clinical UX Design detail) */}
                <View style={styles.badgeContainer}>
                  <View style={[styles.badgeItem, { backgroundColor: isDark ? 'rgba(0, 159, 143, 0.08)' : '#E6FAF8' }]}>
                    <Ionicons name="lock-closed" size={12} color={theme.tertiary} style={{ marginRight: 4 }} />
                    <ThemedText style={[styles.badgeText, { color: theme.tertiary }]}>HIPAA Encrypted</ThemedText>
                  </View>
                  <View style={[styles.badgeItem, { backgroundColor: isDark ? 'rgba(110, 86, 207, 0.08)' : '#F1ECFF' }]}>
                    <Ionicons name="medical" size={12} color={theme.primary} style={{ marginRight: 4 }} />
                    <ThemedText style={[styles.badgeText, { color: theme.primary }]}>Physician Export</ThemedText>
                  </View>
                </View>

                <View style={styles.footerLinks}>
                  <ThemedText type="labelMedium" style={[styles.footerText, { color: theme.textSecondary }]}>
                    By continuing, you agree to Aura's{'\n'}
                    <ThemedText type="labelMedium" style={{ color: theme.primary, fontWeight: '800' }}>Terms of Service</ThemedText> and <ThemedText type="labelMedium" style={{ color: theme.primary, fontWeight: '800' }}>Privacy Policy</ThemedText>
                  </ThemedText>
                </View>
              </GlassView>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgImage: {
    flex: 1,
    width: width,
    height: height,
  },
  orb: {
    position: 'absolute',
    opacity: 0.22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 60,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: height * 0.06,
    paddingHorizontal: Spacing.six,
  },
  logoStack: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.half,
    position: 'relative',
  },
  logoGlowAbsolute: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  logoGlowImage: {
    width: '100%',
    height: '100%',
  },
  logoMainView: {
    zIndex: 2,
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
  },
  logoIconImage: {
    width: 48,
    height: 48,
  },
  titleContainer: {
    alignItems: 'center',
  },
  titleText: {
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitleText: {
    textAlign: 'center',
    marginTop: Spacing.one,
    fontWeight: '500',
  },
  bottomSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  actionCard: {
    padding: Spacing.six,
    paddingTop: Spacing.four,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,150,0.2)',
    marginBottom: Spacing.four,
  },
  greetingHeader: {
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  welcomeText: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.half,
  },
  instructionText: {
    textAlign: 'center',
    opacity: 0.85,
    fontSize: 14,
  },
  carouselContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: Spacing.four,
    paddingHorizontal: Spacing.two,
  },
  carouselSlide: {
    alignItems: 'center',
    width: '100%',
    minHeight: 125,
  },
  slideIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  slideTitle: {
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  slideDesc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    opacity: 0.75,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.three,
    height: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  feedbackContainer: {
    width: '100%',
    marginBottom: Spacing.four,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  authBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  googleIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.five,
    width: '100%',
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footerLinks: {
    marginTop: Spacing.five,
  },
  footerText: {
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 11,
    opacity: 0.65,
  }
});
