import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Card } from '@/components/ui/card';

// Ensure the WebBrowser closes automatically after Auth flow
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const signInWithEmail = async () => {
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
    }
    setLoading(false);
  };

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
           // Session handled automatically
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[{ flex: 1, backgroundColor: theme.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <ThemedText type="displaySmall" style={{ color: theme.primary, marginBottom: Spacing.two }}>
            Welcome Back
          </ThemedText>
          <ThemedText type="bodyLarge" style={{ color: theme.textSecondary }}>
            Sign in to continue your health journey.
          </ThemedText>
        </View>

        {error && (
          <ErrorState 
            title="Sign In Failed" 
            message={error} 
            onRetry={() => setError(null)} 
            style={{ marginBottom: Spacing.four }} 
          />
        )}

        <Card variant="filled" style={styles.formCard}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Enter your email"
            style={{ marginBottom: Spacing.three }}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
            style={{ marginBottom: Spacing.five }}
          />

          <Button 
            label="Sign In" 
            onPress={signInWithEmail} 
            loading={loading} 
            style={{ marginBottom: Spacing.three }}
          />

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.backgroundElement }]} />
            <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginHorizontal: Spacing.three }}>
              OR
            </ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: theme.backgroundElement }]} />
          </View>

          <Button 
            label="Continue with Google" 
            variant="outlined" 
            onPress={signInWithGoogle} 
            icon={<Ionicons name="logo-google" size={20} color={theme.text} />}
            disabled={loading}
          />
        </Card>

        <View style={styles.footer}>
          <ThemedText type="bodyMedium" style={{ color: theme.textSecondary }}>
            Don&apos;t have an account?
          </ThemedText>
          <Button 
            label="Sign Up" 
            variant="text" 
            onPress={() => router.push('/(auth)/signup')} 
            style={{ paddingHorizontal: Spacing.two }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.five,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.six,
    alignItems: 'center',
  },
  formCard: {
    padding: Spacing.four,
    marginBottom: Spacing.five,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.four,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
