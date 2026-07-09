import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Dimensions, StatusBar, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { GlassView } from '@/components/ui/glass-view';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animated background elements
  const floatAnim = useSharedValue(0);
  const floatAnim2 = useSharedValue(0);

  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 6000 }),
        withTiming(0, { duration: 6000 })
      ),
      -1,
      true
    );
    floatAnim2.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 8000 }),
        withTiming(0, { duration: 8000 })
      ),
      -1,
      true
    );
  }, []);

  const floatStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }, { translateX: floatAnim.value / 2 }],
  }));

  const floatStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim2.value }, { translateX: -floatAnim2.value / 2 }],
  }));

  // Deep Link listener for Google OAuth Return
  useEffect(() => {
    const handleDeepLink = async (event: Linking.EventType) => {
      if (event.url) {
        try {
          const parsedUrl = Linking.parse(event.url);
          if (parsedUrl.queryParams?.error_description) {
            setError(parsedUrl.queryParams.error_description as string);
          }
        } catch {
          // ignore
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  const signInWithGoogle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);
    
    try {
      const redirectUrl = Linking.createURL('/(auth)/login');
      
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
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
              
              if (sessionError) {
                throw sessionError;
              }
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      
      {/* Background Gradients */}
      <LinearGradient 
        colors={isDark ? ['#2D1520', '#181213', '#110D0E'] : ['#FFF2F5', '#F5E6EC', '#FCF8F9']} 
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative Blur Blobs */}
      <Animated.View style={[styles.glowBlob1, floatStyle1, { backgroundColor: theme.primaryContainer, opacity: isDark ? 0.15 : 0.4 }]} />
      <Animated.View style={[styles.glowBlob2, floatStyle2, { backgroundColor: theme.tertiaryContainer, opacity: isDark ? 0.12 : 0.3 }]} />

      <View style={styles.contentWrap}>
        <Animated.View 
          entering={FadeInUp.duration(1000).springify()}
          style={styles.logoContainer}
        >
          <View style={[styles.logoIconBg, { backgroundColor: theme.primary }]}>
            <Ionicons name="sparkles" size={36} color={theme.onPrimary} />
          </View>
          <ThemedText type="displaySmall" style={[styles.appName, { color: theme.text }]}>
            Aura
          </ThemedText>
          <ThemedText type="bodyLarge" style={[styles.tagline, { color: theme.textSecondary }]}>
            Flow into your natural rhythm
          </ThemedText>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.duration(1000).delay(200).springify()}
          style={styles.cardContainer}
        >
          <GlassView intensity="high" borderRadius={32} style={[styles.glassCard, { borderColor: theme.outlineVariant }]}>
            <ThemedText type="headlineSmall" style={[styles.welcomeTitle, { color: theme.text }]}>
              Begin Your Journey
            </ThemedText>
            
            <ThemedText type="bodyMedium" style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
              Track cycles, analyze symptoms, and gain AI-powered health insights tailored specifically to you.
            </ThemedText>

            {error && (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.errorWrap}>
                <ErrorState 
                  title="Sign In Failed" 
                  message={error} 
                  onRetry={() => setError(null)} 
                />
              </Animated.View>
            )}

            <Button 
              label="Continue with Google" 
              variant="filled" 
              onPress={signInWithGoogle} 
              icon={<Ionicons name="logo-google" size={20} color={theme.onPrimary} />}
              loading={loading}
              style={[styles.googleBtn, { backgroundColor: theme.primary }]}
              labelStyle={{ color: theme.onPrimary, fontWeight: '700', fontSize: 16 }}
            />

            <ThemedText type="bodySmall" style={[styles.termsText, { color: theme.textSecondary }]}>
              By signing in, you agree to our Terms of Service & Privacy Policy.
            </ThemedText>
          </GlassView>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrap: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'space-between',
    height: height * 0.85,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: height * 0.1,
  },
  logoIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B64B74',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: Spacing.four,
  },
  appName: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: Spacing.one,
    fontWeight: '500',
    opacity: 0.8,
  },
  cardContainer: {
    width: '100%',
    marginBottom: height * 0.05,
  },
  glassCard: {
    padding: Spacing.six,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 5,
  },
  welcomeTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  welcomeSubtitle: {
    textAlign: 'center',
    marginBottom: Spacing.five,
    lineHeight: 20,
    opacity: 0.8,
  },
  googleBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  errorWrap: {
    width: '100%',
    marginBottom: Spacing.four,
  },
  termsText: {
    textAlign: 'center',
    marginTop: Spacing.five,
    opacity: 0.6,
    fontSize: 12,
  },
  glowBlob1: {
    position: 'absolute',
    top: height * 0.1,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  glowBlob2: {
    position: 'absolute',
    bottom: height * 0.2,
    right: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
});
