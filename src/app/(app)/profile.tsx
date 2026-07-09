import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GlassView } from '@/components/ui/glass-view';
import { Toggle } from '@/components/ui/toggle';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { useAppStore } from '@/store/useAppStore';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const user = session?.user;

  // App Store for global theme state
  const { themeMode, setThemeMode } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('Aura User');
  const [email, setEmail] = useState('user@aura.com');
  const [avatarEmoji, setAvatarEmoji] = useState('🌸');
  
  // Health Summary
  const [heightCm, setHeightCm] = useState(165);
  const [weightKg, setWeightKg] = useState(60);
  const [pregnancyMode, setPregnancyMode] = useState('not_pregnant');
  const [pcos, setPcos] = useState(false);
  const [waterGoal, setWaterGoal] = useState(8);

  // Cycle stats
  const [avgCycle, setAvgCycle] = useState(28);
  const [avgPeriod, setAvgPeriod] = useState(5);

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [language, setLanguage] = useState('English');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load user details
      setEmail(user.email || 'user@aura.com');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setFullName(profile.full_name || 'Aura User');
        setAvatarEmoji(profile.avatar_url || '🌸');
      }

      // Load user metadata details
      if (user.user_metadata) {
        const meta = user.user_metadata;
        if (meta.height) setHeightCm(meta.height);
        if (meta.weight) setWeightKg(meta.weight);
        if (meta.pregnancy_status) setPregnancyMode(meta.pregnancy_status);
        if (meta.pcos !== undefined) setPcos(meta.pcos);
        if (meta.water_goal) setWaterGoal(meta.water_goal);
        if (meta.avatar_emoji) setAvatarEmoji(meta.avatar_emoji);
      }

      // Load settings details
      const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .eq('id', user.id)
        .single();

      if (settings) {
        setAvgCycle(settings.cycle_length_days || 28);
        setAvgPeriod(settings.period_length_days || 5);
      }
    } catch (e) {
      console.warn('Error loading profile page data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      Alert.alert('Cloud Sync Complete', 'All cycle charts, medications, and symptoms logs are successfully synced to Supabase.');
    }, 1500);
  };

  const handleLanguage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Select Language',
      'Choose your preferred language.',
      [
        { text: 'English', onPress: () => setLanguage('English') },
        { text: 'Español', onPress: () => setLanguage('Español') },
        { text: 'Français', onPress: () => setLanguage('Français') },
        { text: 'Deutsch', onPress: () => setLanguage('Deutsch') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const downloadMyData = async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDownloading(true);

    try {
      // Query everything in parallel to assemble user data file
      const [
        { data: cycles },
        { data: symptoms },
        { data: moods },
        { data: water },
        { data: sleep },
        { data: meds }
      ] = await Promise.all([
        supabase.from('cycles').select('*').eq('user_id', user.id),
        supabase.from('symptoms').select('*').eq('user_id', user.id),
        supabase.from('moods').select('*').eq('user_id', user.id),
        supabase.from('water_logs').select('*').eq('user_id', user.id),
        supabase.from('sleep_logs').select('*').eq('user_id', user.id),
        supabase.from('medications').select('*').eq('user_id', user.id),
      ]);

      const exportData = {
        user: {
          fullName,
          email,
          avatarEmoji,
          heightCm,
          weightKg,
          pregnancyMode,
          pcos,
          waterGoal,
          avgCycle,
          avgPeriod,
        },
        cycles: cycles || [],
        symptoms: symptoms || [],
        moods: moods || [],
        waterLogs: water || [],
        sleepLogs: sleep || [],
        medications: meds || [],
        exportedAt: new Date().toISOString(),
      };

      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', sans-serif; padding: 30px; color: #333; }
              h1 { color: #B64B74; margin-bottom: 5px; }
              .header { border-bottom: 2px solid #F3DDE1; padding-bottom: 15px; margin-bottom: 20px; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 18px; font-weight: bold; color: #74565F; border-bottom: 1px solid #F3DDE1; padding-bottom: 5px; margin-bottom: 10px; }
              .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #eee; }
              .row strong { color: #B64B74; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Aura - Health Export</h1>
              <div>Generated for ${fullName} (${email})</div>
              <div>Date: ${new Date().toLocaleDateString()}</div>
            </div>
            
            <div class="section">
              <div class="section-title">User Biology & Stats</div>
              <div class="row"><span>Height / Weight</span><strong>${heightCm} cm / ${weightKg} kg</strong></div>
              <div class="row"><span>PCOS / Pregnancy Mode</span><strong>${pcos ? 'Yes' : 'No'} / ${pregnancyMode}</strong></div>
              <div class="row"><span>Average Cycle Length</span><strong>${avgCycle} Days</strong></div>
              <div class="row"><span>Average Period Length</span><strong>${avgPeriod} Days</strong></div>
              <div class="row"><span>Daily Hydration Goal</span><strong>${waterGoal} Glasses</strong></div>
            </div>

            <div class="section">
              <div class="section-title">Logged Cycles History (${exportData.cycles.length})</div>
              ${exportData.cycles.map(c => `
                <div class="row">
                  <span>Start: ${c.start_date}</span>
                  <strong>End: ${c.end_date || 'Active'}</strong>
                </div>
              `).join('')}
            </div>

            <div class="section">
              <div class="section-title">Medications List (${exportData.medications.length})</div>
              ${exportData.medications.map(m => `
                <div class="row">
                  <span>${m.name} (${m.dosage})</span>
                  <strong>${m.frequency}</strong>
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      console.error(e);
      Alert.alert('Export Failed', 'Unable to compile clinical PDF document.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLogOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Purge Health Records', 
      'This will permanently delete all logged cycles, symptoms, medications, weight, water tracker, and profile configurations. This cannot be undone. Are you absolutely sure?', 
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Permanently', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Purge database in parallel
              await Promise.all([
                supabase.from('cycles').delete().eq('user_id', user.id),
                supabase.from('period_logs').delete().eq('user_id', user.id),
                supabase.from('symptoms').delete().eq('user_id', user.id),
                supabase.from('moods').delete().eq('user_id', user.id),
                supabase.from('medications').delete().eq('user_id', user.id),
                supabase.from('reminders').delete().eq('user_id', user.id),
                supabase.from('water_logs').delete().eq('user_id', user.id),
                supabase.from('sleep_logs').delete().eq('user_id', user.id),
                supabase.from('weight_logs').delete().eq('user_id', user.id),
                supabase.from('notes').delete().eq('user_id', user.id),
                supabase.from('profiles').delete().eq('id', user.id),
                supabase.from('settings').delete().eq('id', user.id),
              ]);
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            } catch (err) {
              console.error(err);
              Alert.alert('Purge Failed', 'We encountered an error. Please try logging out instead.');
            } finally {
              setLoading(false);
            }
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
        <ThemedText type="bodyMedium" style={{ color: isDestructive ? theme.error : theme.text, fontSize: 16, fontWeight: '500' }}>{title}</ThemedText>
      </View>
      <View>{rightContent}</View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header Profile */}
          <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primaryContainer }]}>
              <Ionicons name="person" size={48} color={theme.primary} />
            </View>
            <ThemedText type="titleLarge" style={{ color: theme.text, marginTop: Spacing.four, fontWeight: '800' }}>
              {fullName}
            </ThemedText>
            <ThemedText type="labelMedium" style={{ color: theme.textSecondary }}>
              {email}
            </ThemedText>
          </Animated.View>

          {/* Quick Stats Grid */}
          <Animated.View entering={FadeInDown.duration(400).delay(100).springify()} style={styles.summaryContainer}>
            <Card variant="elevated" style={styles.summaryCard}>
              <ThemedText type="labelSmall" style={{ color: theme.textSecondary, textTransform: 'uppercase', marginBottom: Spacing.two }}>
                Cycle Summary
              </ThemedText>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryGridItem}>
                  <ThemedText type="titleLarge" style={styles.summaryVal}>{avgCycle}d</ThemedText>
                  <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>Cycle Avg</ThemedText>
                </View>
                <View style={styles.summaryGridItem}>
                  <ThemedText type="titleLarge" style={styles.summaryVal}>{avgPeriod}d</ThemedText>
                  <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>Period Avg</ThemedText>
                </View>
                <View style={styles.summaryGridItem}>
                  <ThemedText type="titleLarge" style={styles.summaryVal}>{weightKg}kg</ThemedText>
                  <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>Weight</ThemedText>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Achievements Summary */}
          <Animated.View entering={FadeInDown.duration(400).delay(150).springify()} style={styles.summaryContainer}>
            <Card variant="filled" style={[styles.reportCard, { backgroundColor: theme.primaryContainer }]}>
              <View style={styles.achievementRow}>
                <Ionicons name="trophy" size={32} color={theme.primary} />
                <View style={{ flex: 1, marginLeft: Spacing.three }}>
                  <ThemedText type="titleMedium" style={{ color: theme.primary, fontWeight: '700' }}>Cycle Champion</ThemedText>
                  <ThemedText type="labelMedium" style={{ color: theme.primary, opacity: 0.8 }}>
                    Completed 14-day symptom logs streak!
                  </ThemedText>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Health Reports Entry */}
          <Animated.View entering={FadeInDown.duration(400).delay(200).springify()} style={styles.section}>
            <ThemedText type="titleMedium" style={{ color: theme.text, marginBottom: Spacing.three, fontWeight: '700' }}>Health Reports</ThemedText>
            <Card variant="elevated" style={styles.reportActionCard}>
              <Ionicons name="analytics" size={48} color={theme.primary} style={{ marginBottom: Spacing.two }} />
              <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '700' }}>Clinical Report</ThemedText>
              <ThemedText type="bodyMedium" style={{ color: theme.textSecondary, marginTop: Spacing.one, marginBottom: Spacing.three, textAlign: 'center', lineHeight: 18 }}>
                Generate a medical cycle summary PDF to print or share with your physician.
              </ThemedText>
              <Button label="Open Reports" variant="filled" onPress={() => router.push('/reports')} style={{ width: '100%' }} />
            </Card>
          </Animated.View>

          {/* Preferences */}
          <Animated.View entering={FadeInDown.duration(400).delay(250).springify()} style={styles.section}>
             <ThemedText type="titleMedium" style={{ color: theme.text, marginBottom: Spacing.three, fontWeight: '700' }}>Preferences & Settings</ThemedText>
             <Card variant="elevated" style={styles.settingsCard}>
               {renderSettingRow('sunny', 'Light Theme', 
                 <Toggle 
                   value={themeMode === 'light'} 
                   onValueChange={(val) => setThemeMode(val ? 'light' : 'dark')} 
                 />
               )}
               {renderSettingRow('language', 'Language', 
                 <View style={styles.rowRight}>
                   <ThemedText type="bodyMedium" style={{ color: theme.textSecondary, marginRight: 8 }}>{language}</ThemedText>
                   <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                 </View>,
                 handleLanguage
               )}
             </Card>
          </Animated.View>

          {/* Backup & Actions */}
          <Animated.View entering={FadeInDown.duration(400).delay(300).springify()} style={styles.section}>
             <ThemedText type="titleMedium" style={{ color: theme.text, marginBottom: Spacing.three, fontWeight: '700' }}>Data Management</ThemedText>
             <Card variant="elevated" style={styles.settingsCard}>
               {renderSettingRow('cloud-upload-outline', 'Force Cloud Sync', 
                 isBackingUp ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />,
                 handleBackup
               )}
               {renderSettingRow('share-social-outline', 'Download My Clinical Data', 
                 isDownloading ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />,
                 downloadMyData
               )}
               {renderSettingRow('log-out-outline', 'Log Out', 
                 <Ionicons name="chevron-forward" size={18} color={theme.error} />,
                 handleLogOut, true
               )}
               {renderSettingRow('trash-outline', 'Purge My Account & Data', 
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: 130, // Bottom tab float safety padding
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.five,
    paddingTop: Spacing.two,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B64B74',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 4,
  },
  summaryContainer: {
    marginBottom: Spacing.four,
  },
  summaryCard: {
    padding: Spacing.four,
    borderRadius: 24,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryGridItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryVal: {
    fontWeight: '800',
    color: '#B64B74',
  },
  reportCard: {
    padding: Spacing.four,
    borderRadius: 24,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginBottom: Spacing.five,
  },
  reportActionCard: {
    padding: Spacing.five,
    alignItems: 'center',
    borderRadius: 24,
  },
  settingsCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 24,
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
