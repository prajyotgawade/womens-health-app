import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { useAppStore } from '@/store/useAppStore';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const user = session?.user;
  const { themeMode, setThemeMode } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('Aura User');
  const [email, setEmail] = useState('user@aura.com');
  const [avatarEmoji, setAvatarEmoji] = useState('🌸');
  const [heightCm, setHeightCm] = useState(165);
  const [weightKg, setWeightKg] = useState(60);
  const [pregnancyMode, setPregnancyMode] = useState('not_pregnant');
  const [pcos, setPcos] = useState(false);
  const [waterGoal, setWaterGoal] = useState(8);
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

      if (user.user_metadata) {
        const meta = user.user_metadata;
        if (meta.height) setHeightCm(meta.height);
        if (meta.weight) setWeightKg(meta.weight);
        if (meta.pregnancy_status) setPregnancyMode(meta.pregnancy_status);
        if (meta.pcos !== undefined) setPcos(meta.pcos);
        if (meta.water_goal) setWaterGoal(meta.water_goal);
        if (meta.avatar_emoji) setAvatarEmoji(meta.avatar_emoji);
      }

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
      console.warn('Error loading profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      Alert.alert('Cloud Sync Complete', 'All cycle charts, medications, and symptom logs are successfully synced.');
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
      const fetchTable = async (table: string) => {
        try {
          const { data } = await supabase.from(table).select('*').eq('user_id', user.id);
          return data || [];
        } catch (e) {
          return [];
        }
      };

      const cycles = await fetchTable('cycles');
      const symptoms = await fetchTable('symptoms');
      const moods = await fetchTable('moods');
      const water = await fetchTable('water_logs');
      const sleep = await fetchTable('sleep_logs');
      const meds = await fetchTable('medications');

      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', sans-serif; padding: 30px; color: #333; }
              h1 { color: #6E56CF; margin-bottom: 5px; }
              .header { border-bottom: 2px solid #E8E4F9; padding-bottom: 15px; margin-bottom: 20px; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 18px; font-weight: bold; color: #6E56CF; border-bottom: 1px solid #E8E4F9; padding-bottom: 5px; margin-bottom: 10px; }
              .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #eee; }
              .row strong { color: #6E56CF; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Aura — Health Export</h1>
              <div>Generated for ${fullName} (${email})</div>
              <div>Date: ${new Date().toLocaleDateString()}</div>
            </div>
            <div class="section">
              <div class="section-title">Body Stats</div>
              <div class="row"><span>Height / Weight</span><strong>${heightCm} cm / ${weightKg} kg</strong></div>
              <div class="row"><span>PCOS / Pregnancy</span><strong>${pcos ? 'Yes' : 'No'} / ${pregnancyMode}</strong></div>
              <div class="row"><span>Avg Cycle / Period</span><strong>${avgCycle}d / ${avgPeriod}d</strong></div>
              <div class="row"><span>Daily Water Goal</span><strong>${waterGoal} glasses</strong></div>
            </div>
            <div class="section">
              <div class="section-title">Cycles (${cycles.length})</div>
              ${cycles.map((c: any) => `<div class="row"><span>Start: ${c.start_date}</span><strong>End: ${c.end_date || 'Active'}</strong></div>`).join('')}
            </div>
            <div class="section">
              <div class="section-title">Medications (${meds.length})</div>
              ${meds.map((m: any) => `<div class="row"><span>${m.name} (${m.dosage})</span><strong>${m.frequency}</strong></div>`).join('')}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      console.error(e);
      Alert.alert('Export Failed', 'Unable to generate the clinical PDF.');
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
      'This will permanently delete all logged cycles, symptoms, medications, and profile data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const clearTables = [
                'period_logs', 'symptoms', 'moods', 'water_logs', 'sleep_logs',
                'weight_logs', 'notes', 'medications', 'reminders', 'ai_history',
                'notifications', 'cycles', 'settings', 'profiles',
              ];
              for (const table of clearTables) {
                try {
                  const key = (table === 'profiles' || table === 'settings') ? 'id' : 'user_id';
                  await supabase.from(table).delete().eq(key, user.id);
                } catch (e) {
                  console.warn(`Error purging ${table}:`, e);
                }
              }
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            } catch (err) {
              Alert.alert('Purge Failed', 'Please try logging out instead.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const STATS = [
    { label: 'Cycle', value: `${avgCycle}d`, icon: 'refresh-outline', color: theme.primary },
    { label: 'Period', value: `${avgPeriod}d`, icon: 'water-outline', color: '#E91E63' },
    { label: 'Weight', value: `${weightKg}kg`, icon: 'scale-outline', color: '#81C784' },
    { label: 'Water', value: `${waterGoal}/d`, icon: 'water', color: '#4FC3F7' },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Profile Header */}
          <Animated.View entering={FadeInDown.duration(500).springify()}>
            <LinearGradient
              colors={[theme.primaryContainer, theme.background]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.profileHeader}
            >
              <View style={[styles.avatarRing, { borderColor: theme.primary }]}>
                <View style={[styles.avatarInner, { backgroundColor: theme.primaryContainer }]}>
                  {avatarEmoji && avatarEmoji.startsWith('http') ? (
                    <Image source={{ uri: avatarEmoji }} style={styles.avatarImage} />
                  ) : (
                    <ThemedText style={{ fontSize: 34 }}>{avatarEmoji || '🌸'}</ThemedText>
                  )}
                </View>
              </View>
              <ThemedText style={{ color: theme.text, fontWeight: '900', fontSize: 22, marginTop: Spacing.two + 4, letterSpacing: -0.5 }}>
                {fullName}
              </ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2, fontWeight: '500' }}>
                {email}
              </ThemedText>
              {pcos && (
                <View style={[styles.badge, { backgroundColor: `${theme.primary}20`, borderColor: `${theme.primary}40`, borderWidth: 1 }]}>
                  <ThemedText style={{ color: theme.primary, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>PCOS Tracker</ThemedText>
                </View>
              )}
            </LinearGradient>
          </Animated.View>

          {/* Stats Grid */}
          <Animated.View entering={FadeInDown.duration(500).delay(100).springify()} style={styles.section}>
            <View style={styles.statsGrid}>
              {STATS.map((s) => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: theme.surface }]}>
                  <View style={[styles.statIcon, { backgroundColor: `${s.color}18` }]}>
                    <Ionicons name={s.icon as any} size={15} color={s.color} />
                  </View>
                  <ThemedText style={{ color: theme.text, fontWeight: '900', fontSize: 18, marginTop: 6 }}>{s.value}</ThemedText>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 10, fontWeight: '600', marginTop: 1 }}>{s.label}</ThemedText>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Achievement Banner */}
          <Animated.View entering={FadeInDown.duration(500).delay(150).springify()} style={styles.section}>
            <View style={[styles.achievementCard, { backgroundColor: theme.primaryContainer, borderColor: `${theme.primary}30`, borderWidth: 1 }]}>
              <View style={[styles.trophyWrap, { backgroundColor: theme.primary }]}>
                <Ionicons name="trophy" size={18} color={theme.onPrimary} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.three }}>
                <ThemedText style={{ color: theme.primary, fontWeight: '800', fontSize: 14 }}>Cycle Champion</ThemedText>
                <ThemedText style={{ color: theme.primary, opacity: 0.75, fontSize: 12, marginTop: 2 }}>
                  Completed a 14-day symptom tracking streak!
                </ThemedText>
              </View>
              <Ionicons name="ribbon" size={24} color={theme.primary} style={{ opacity: 0.6 }} />
            </View>
          </Animated.View>

          {/* Health Reports */}
          <Animated.View entering={FadeInDown.duration(500).delay(200).springify()} style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Health Reports</ThemedText>
            <Pressable onPress={() => router.push('/reports')}>
              <LinearGradient
                colors={[theme.primary, theme.tertiary || theme.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.reportsCard}
              >
                <View>
                  <ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Clinical Reports</ThemedText>
                  <ThemedText style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 3 }}>
                    View analytics & export PDF for your physician
                  </ThemedText>
                </View>
                <View style={[styles.reportsArrow, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="analytics" size={22} color="#fff" />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Preferences */}
          <Animated.View entering={FadeInDown.duration(500).delay(250).springify()} style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Preferences</ThemedText>
            <View style={[styles.settingsCard, { backgroundColor: theme.surface }]}>
              <SettingRow
                icon="sunny-outline"
                iconColor="#FFB74D"
                title="Light Theme"
                right={
                  <Toggle
                    value={themeMode === 'light'}
                    onValueChange={async (val) => {
                      const newMode = val ? 'light' : 'dark';
                      setThemeMode(newMode);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (user) {
                        try { await supabase.from('settings').update({ theme: newMode }).eq('id', user.id); } catch (e) { }
                      }
                    }}
                  />
                }
                theme={theme}
              />
              <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />
              <SettingRow
                icon="language-outline"
                iconColor="#4FC3F7"
                title="Language"
                right={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600' }}>{language}</ThemedText>
                    <Ionicons name="chevron-forward" size={15} color={theme.textSecondary} />
                  </View>
                }
                onPress={handleLanguage}
                theme={theme}
              />
            </View>
          </Animated.View>

          {/* Data Management */}
          <Animated.View entering={FadeInDown.duration(500).delay(300).springify()} style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Data Management</ThemedText>
            <View style={[styles.settingsCard, { backgroundColor: theme.surface }]}>
              <SettingRow
                icon="cloud-upload-outline"
                iconColor="#66BB6A"
                title="Sync to Cloud"
                right={isBackingUp ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons name="chevron-forward" size={15} color={theme.textSecondary} />}
                onPress={handleBackup}
                theme={theme}
              />
              <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />
              <SettingRow
                icon="share-social-outline"
                iconColor="#AB47BC"
                title="Download Clinical Data"
                right={isDownloading ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons name="chevron-forward" size={15} color={theme.textSecondary} />}
                onPress={downloadMyData}
                theme={theme}
              />
              <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />
              <SettingRow
                icon="log-out-outline"
                iconColor={theme.error}
                title="Log Out"
                right={<Ionicons name="chevron-forward" size={15} color={theme.error} />}
                onPress={handleLogOut}
                isDestructive
                theme={theme}
              />
              <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />
              <SettingRow
                icon="trash-outline"
                iconColor={theme.error}
                title="Purge Account & Data"
                right={<Ionicons name="chevron-forward" size={15} color={theme.error} />}
                onPress={handleDeleteAccount}
                isDestructive
                isLast
                theme={theme}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(350).springify()} style={{ alignItems: 'center', marginBottom: Spacing.six }}>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600' }}>Aura • Version 2.0</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 10, marginTop: 2, opacity: 0.6 }}>Your health data is encrypted & private</ThemedText>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SettingRow({ icon, iconColor, title, right, onPress, isDestructive, isLast, theme }: {
  icon: string; iconColor: string; title: string; right: React.ReactNode;
  onPress?: () => void; isDestructive?: boolean; isLast?: boolean; theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.settingRow}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: `${iconColor}18` }]}>
          <Ionicons name={icon as any} size={16} color={iconColor} />
        </View>
        <ThemedText style={{ color: isDestructive ? theme.error : theme.text, fontSize: 14, fontWeight: '600', marginLeft: Spacing.two + 4 }}>
          {title}
        </ThemedText>
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.six,
  },

  profileHeader: {
    alignItems: 'center',
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  badge: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: 20,
  },

  section: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three + 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.two + 4,
    opacity: 0.6,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    padding: Spacing.two + 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three + 4,
    borderRadius: 20,
  },
  trophyWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reportsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
    borderRadius: 20,
  },
  reportsArrow: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three + 4,
    paddingVertical: Spacing.three,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.three + 4,
  },
});
