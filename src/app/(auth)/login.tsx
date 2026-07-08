import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ImageBackground, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { GlassView } from '@/components/ui/glass-view';

// Ensure the WebBrowser closes automatically after Auth flow
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
           // Session handled automatically by Supabase Auth Context and _layout.tsx
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={require('@/assets/images/login-bg.png')} 
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeInDown.duration(800).springify()} 
          style={styles.contentContainer}
        >
          <GlassView intensity="high" borderRadius={32} style={styles.glassCard}>
            <View style={styles.header}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.primaryContainer }]}>
                <Ionicons name="leaf" size={32} color={theme.primary} />
              </View>
              <ThemedText type="displaySmall" style={{ color: theme.text, marginBottom: Spacing.two, fontWeight: '700' }}>
                Aura
              </ThemedText>
              <ThemedText type="bodyLarge" style={{ color: theme.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.four }}>
                Your personal journey to balanced health and wellness.
              </ThemedText>
            </View>

            {error && (
              <Animated.View entering={FadeIn.duration(400)}>
                <ErrorState 
                  title="Sign In Failed" 
                  message={error} 
                  onRetry={() => setError(null)} 
                  style={{ marginBottom: Spacing.four }} 
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
              labelStyle={{ color: theme.onPrimary, fontWeight: '600' }}
            />
            
            <ThemedText type="labelSmall" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.five, opacity: 0.8 }}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </ThemedText>
          </GlassView>
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)', // Slight dark overlay for text readability
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 420,
  },
  glassCard: {
    padding: Spacing.six,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  googleBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
  },
});
