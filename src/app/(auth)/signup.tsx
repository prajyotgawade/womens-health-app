import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Card } from '@/components/ui/card';

export default function SignupScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signUpWithEmail = async () => {
    setLoading(true);
    setError(null);
    
    // Basic validation
    if (!fullName || !email || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      // Session might automatically be set depending on email confirmation settings.
    }
    
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      style={[{ flex: 1, backgroundColor: theme.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <ThemedText type="displaySmall" style={{ color: theme.primary, marginBottom: Spacing.two }}>
            Create Account
          </ThemedText>
          <ThemedText type="bodyLarge" style={{ color: theme.textSecondary, textAlign: 'center' }}>
            Join us to track and manage your health seamlessly.
          </ThemedText>
        </View>

        {error && (
          <ErrorState 
            title="Registration Failed" 
            message={error} 
            onRetry={() => setError(null)} 
            style={{ marginBottom: Spacing.four }} 
          />
        )}

        <Card variant="filled" style={styles.formCard}>
          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            placeholder="Enter your full name"
            style={{ marginBottom: Spacing.three }}
          />
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
            placeholder="Create a password"
            style={{ marginBottom: Spacing.five }}
          />

          <Button 
            label="Create Account" 
            onPress={signUpWithEmail} 
            loading={loading} 
            style={{ marginBottom: Spacing.three }}
          />
        </Card>

        <View style={styles.footer}>
          <ThemedText type="bodyMedium" style={{ color: theme.textSecondary }}>
            Already have an account?
          </ThemedText>
          <Button 
            label="Sign In" 
            variant="text" 
            onPress={() => router.push('/(auth)/login')} 
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
