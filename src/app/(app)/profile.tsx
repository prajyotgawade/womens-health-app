import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Settings State
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [language, setLanguage] = useState('English');

  const handleBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      Alert.alert('Backup Complete', 'Your health data has been securely synced to the cloud.');
    }, 2000);
  };

  const handleLanguage = () => {
    Alert.alert(
      'Select Language',
      'Choose your preferred application language.',
      [
        { text: 'English', onPress: () => setLanguage('English') },
        { text: 'Español', onPress: () => setLanguage('Español') },
        { text: 'Français', onPress: () => setLanguage('Français') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleLogOut = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Log Out', 
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        }
      }
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account', 
      'This action is permanent. All of your health data, logs, and settings will be permanently erased. Are you absolutely sure?', 
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Everything', 
          style: 'destructive',
          onPress: async () => {
            // Mock deletion for prototype safety, but actually logs them out
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  const renderSettingRow = (icon: any, title: string, rightContent: React.ReactNode, onPress?: () => void, isDestructive = false, isLast = false) => (
    <Pressable 
      onPress={onPress} 
      disabled={!onPress}
      style={[styles.settingRow, { borderBottomColor: theme.backgroundElement }, isLast && { borderBottomWidth: 0 }]}
    >
      <View style={styles.settingRowLeft}>
        <Ionicons name={icon} size={22} color={isDestructive ? theme.error : theme.textSecondary} style={{ marginRight: Spacing.three }} />
        <ThemedText type="bodyMedium" style={{ color: isDestructive ? theme.error : theme.text, fontSize: 16 }}>{title}</ThemedText>
      </View>
      <View>{rightContent}</View>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header Profile */}
          <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="person" size={40} color={theme.textSecondary} />
            </View>
            <ThemedText type="titleLarge" style={{ color: theme.text, marginTop: Spacing.four }}>Sarah Jenkins</ThemedText>
            <ThemedText type="labelMedium" style={{ color: theme.textSecondary }}>sarah.jenkins@example.com</ThemedText>
          </Animated.View>

          {/* Analytics Entry Point */}
          <Animated.View entering={FadeInDown.duration(400).delay(100).springify()} style={styles.section}>
            <ThemedText type="titleMedium" style={{ color: theme.text, marginBottom: Spacing.four }}>Health Reports</ThemedText>
            <Card variant="filled" style={[styles.reportCard, { backgroundColor: theme.primaryContainer }]}>
              <Ionicons name="analytics" size={48} color={theme.primary} style={{ marginBottom: Spacing.three }} />
              <ThemedText type="titleMedium" style={{ color: theme.primary }}>Clinical Report</ThemedText>
              <ThemedText type="bodySmall" style={{ color: theme.primary, opacity: 0.8, marginTop: Spacing.one, marginBottom: Spacing.four, textAlign: 'center' }}>
                View your cycle trends, health score, and export a PDF for your doctor.
              </ThemedText>
              <Button label="View Analytics" variant="filled" onPress={() => router.push('/reports' as any)} />
            </Card>
          </Animated.View>

          {/* Preferences */}
          <Animated.View entering={FadeInDown.duration(400).delay(200).springify()} style={styles.section}>
             <ThemedText type="titleMedium" style={{ color: theme.text, marginBottom: Spacing.four }}>Preferences</ThemedText>
             <Card variant="elevated" style={styles.settingsCard}>
               {renderSettingRow('moon', 'Dark Mode', 
                 <Switch value={isDarkMode} onValueChange={setIsDarkMode} trackColor={{ true: theme.primary }} />
               )}
               {renderSettingRow('language', 'Language', 
                 <View style={styles.rowRight}>
                   <ThemedText type="bodyMedium" style={{ color: theme.textSecondary, marginRight: 8 }}>{language}</ThemedText>
                   <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                 </View>,
                 handleLanguage
               )}
               {renderSettingRow('shield-checkmark', 'Share Analytics (Privacy)', 
                 <Switch value={isAnalyticsEnabled} onValueChange={setIsAnalyticsEnabled} trackColor={{ true: theme.primary }} />,
                 undefined, false, true
               )}
             </Card>
          </Animated.View>

          {/* Data & Account */}
          <Animated.View entering={FadeInDown.duration(400).delay(300).springify()} style={styles.section}>
             <ThemedText type="titleMedium" style={{ color: theme.text, marginBottom: Spacing.four }}>Data & Account</ThemedText>
             <Card variant="elevated" style={styles.settingsCard}>
               {renderSettingRow('cloud-upload', 'Cloud Backup', 
                 isBackingUp ? <ActivityIndicator color={theme.primary} /> : <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />,
                 handleBackup
               )}
               {renderSettingRow('log-out', 'Log Out', 
                 <Ionicons name="chevron-forward" size={18} color={theme.error} />,
                 handleLogOut, true
               )}
               {renderSettingRow('trash', 'Delete Account', 
                 <Ionicons name="chevron-forward" size={18} color={theme.error} />,
                 handleDeleteAccount, true, true
               )}
             </Card>
          </Animated.View>

        </ScrollView>
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
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.six,
    paddingTop: Spacing.four,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: Spacing.six,
  },
  reportCard: {
    padding: Spacing.six,
    alignItems: 'center',
  },
  settingsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});
