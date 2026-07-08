import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { GlassView } from '@/components/ui/glass-view';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="displaySmall" style={{ color: theme.primary, marginBottom: Spacing.four }}>
          Profile
        </ThemedText>
        
        <GlassView intensity="low" borderRadius={24} style={styles.card}>
          <View style={[styles.avatar, { backgroundColor: theme.primaryContainer }]}>
             <Ionicons name="person" size={40} color={theme.primary} />
          </View>
          <ThemedText type="titleLarge" style={{ textAlign: 'center', marginBottom: Spacing.one }}>
            Your Account
          </ThemedText>
          <ThemedText type="bodyMedium" style={{ textAlign: 'center', color: theme.textSecondary, marginBottom: Spacing.six }}>
            Manage your settings and personal health data.
          </ThemedText>
          
          <Button 
            label="Sign Out" 
            variant="outlined" 
            onPress={signOut} 
            icon={<Ionicons name="log-out-outline" size={20} color={theme.text} />}
          />
        </GlassView>
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
    padding: Spacing.four,
  },
  card: {
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
});
