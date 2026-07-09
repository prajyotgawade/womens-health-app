import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, StatusBar, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GlassView } from '@/components/ui/glass-view';
import { ErrorState } from '@/components/ui/error-state';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mesh Gradient Animations
  const blob1Rot = useSharedValue(0);
  const blob2Rot = useSharedValue(0);
  const blob3Rot = useSharedValue(0);

  useEffect(() => {
    blob1Rot.value = withRepeat(withTiming(360, { duration: 25000, easing: Easing.linear }), -1, false);
    blob2Rot.value = withRepeat(withTiming(-360, { duration: 30000, easing: Easing.linear }), -1, false);
    blob3Rot.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );
  }, []);

  const b1Style = useAnimatedStyle(() => ({ transform: [{ rotate: `${blob1Rot.value}deg` }] }));
  const b2Style = useAnimatedStyle(() => ({ transform: [{ rotate: `${blob2Rot.value}deg` }] }));
  const b3Style = useAnimatedStyle(() => ({ transform: [{ scale: blob3Rot.value }] }));

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
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Deep Mesh Background */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? '#08080C' : '#F4F2FA' }]} />

      <Animated.View style={[styles.blob1, b1Style, { backgroundColor: isDark ? theme.primaryContainer : theme.primary }]} />
      <Animated.View style={[styles.blob2, b2Style, { backgroundColor: theme.tertiary }]} />
      <Animated.View style={[styles.blob3, b3Style, { backgroundColor: isDark ? theme.secondary : theme.primaryContainer }]} />

      {/* Massive blurring layer over the blobs to create the "Mesh Gradient" effect */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? 'rgba(8,8,12,0.4)' : 'rgba(244,242,250,0.5)' }]} />
      <GlassView intensity="high" style={StyleSheet.absoluteFillObject} borderRadius={0} />

      <View style={styles.contentWrap}>
        <View style={styles.topSection}>
          <Animated.View entering={FadeInUp.duration(1000).springify()} style={styles.logoBadge}>
            <Ionicons name="moon" size={32} color={theme.onPrimary} style={{ position: 'absolute' }} />
            <Ionicons name="sparkles" size={16} color={theme.onPrimary} style={{ position: 'absolute', top: 12, right: 12 }} />
          </Animated.View>
          <Animated.View entering={FadeInUp.duration(1000).delay(100).springify()}>
            <ThemedText type="displayLarge" style={{ color: theme.text, fontWeight: '900', letterSpacing: -2, textAlign: 'center' }}>
              Aura.
            </ThemedText>
            <ThemedText type="titleMedium" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.two, fontWeight: '500' }}>
              Sync with your true nature.
            </ThemedText>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.duration(1000).delay(300).springify()} style={styles.bottomSection}>
          <GlassView intensity="high" borderRadius={40} style={styles.loginSheet}>
            <View style={styles.sheetHandle} />
            
            <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.four }}>
              Welcome back
            </ThemedText>

            {error && (
              <Animated.View entering={FadeInDown.duration(400)} style={{ width: '100%', marginBottom: Spacing.four }}>
                <ErrorState title="Sign In Failed" message={error} onRetry={() => setError(null)} />
              </Animated.View>
            )}

            <Button
              label="Continue with Google"
              variant="filled"
              onPress={signInWithGoogle}
              icon={<Ionicons name="logo-google" size={20} color="#fff" />}
              loading={loading}
              style={[styles.authBtn, { backgroundColor: theme.primary }]}
              labelStyle={{ color: '#fff', fontWeight: '800', fontSize: 17 }}
            />

            <View style={styles.footerLinks}>
              <ThemedText type="labelMedium" style={{ color: theme.textSecondary, textAlign: 'center', opacity: 0.7 }}>
                By continuing, you agree to Aura's{'\n'}
                <ThemedText type="labelMedium" style={{ color: theme.primary, fontWeight: '800' }}>Terms of Service</ThemedText> and <ThemedText type="labelMedium" style={{ color: theme.primary, fontWeight: '800' }}>Privacy Policy</ThemedText>.
              </ThemedText>
            </View>
          </GlassView>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob1: { position: 'absolute', top: -100, left: -100, width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75, opacity: 0.5 },
  blob2: { position: 'absolute', bottom: -200, right: -150, width: width * 1.8, height: width * 1.8, borderRadius: width * 0.9, opacity: 0.4 },
  blob3: { position: 'absolute', top: '30%', left: '10%', width: width * 1, height: width * 1, borderRadius: width * 0.5, opacity: 0.3 },
  contentWrap: { flex: 1, justifyContent: 'space-between' },
  topSection: { alignItems: 'center', paddingTop: height * 0.15, paddingHorizontal: Spacing.six },
  logoBadge: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6E56CF', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.five, shadowColor: '#6E56CF', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  bottomSection: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  loginSheet: { padding: Spacing.six, paddingTop: Spacing.four, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(150,150,150,0.3)', marginBottom: Spacing.six },
  authBtn: { width: '100%', height: 60, borderRadius: 30, shadowColor: '#6E56CF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 6 },
  footerLinks: { marginTop: Spacing.six }
});
