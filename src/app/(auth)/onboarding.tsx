import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, TextInput, Pressable, Platform, Switch, ActivityIndicator, KeyboardAvoidingView, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GlassView } from '@/components/ui/glass-view';
import { registerForPushNotificationsAsync } from '@/utils/notifications';

const { width, height } = Dimensions.get('window');
const TOTAL_STEPS = 5;

const PRESET_AVATARS = ['🌸', '🌿', '✨', '🦋', '🌙', '☀️', '💖', '🍀'];

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const user = session?.user;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // STEP 1: Personal Details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0]);

  // STEP 2: Body Metrics
  const [dob, setDob] = useState('1998-06-15'); // YYYY-MM-DD format
  const [heightCm, setHeightCm] = useState(165);
  const [weightKg, setWeightKg] = useState(60);

  // STEP 3: Cycle Tracking
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [lastPeriodDate, setLastPeriodDate] = useState('2026-07-01'); // YYYY-MM-DD

  // STEP 4: Health Conditions
  const [pregnancyStatus, setPregnancyStatus] = useState<'not_pregnant' | 'trying' | 'pregnant' | 'postpartum'>('not_pregnant');
  const [pcos, setPcos] = useState(false);
  const [conditions, setConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');

  // STEP 5: Goals & Notifications
  const [waterGoal, setWaterGoal] = useState(8); // in glasses
  const [notifications, setNotifications] = useState(true);

  // Set default values from Google OAuth metadata if available
  useEffect(() => {
    if (user?.user_metadata) {
      const meta = user.user_metadata;
      if (meta.full_name) {
        const parts = meta.full_name.split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
      }
      if (meta.avatar_url) {
        // Can use URL, but we also support predefined emoji avatar
      }
    }
    // Set default last period date to one week ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    setLastPeriodDate(oneWeekAgo.toISOString().split('T')[0]);
  }, [user]);

  // Calculate age based on DOB
  const calculateAge = (dobString: string) => {
    try {
      const birthDate = new Date(dobString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return isNaN(age) ? 25 : age;
    } catch {
      return 25;
    }
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      scrollRef.current?.scrollTo({ x: width * step, animated: true });
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 1) {
      setStep(step - 1);
      scrollRef.current?.scrollTo({ x: width * (step - 2), animated: true });
    }
  };

  const toggleCondition = (cond: string) => {
    setConditions(prev => prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]);
  };

  const addCustomCondition = () => {
    if (customCondition.trim() && !conditions.includes(customCondition.trim())) {
      setConditions(prev => [...prev, customCondition.trim()]);
      setCustomCondition('');
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const userAge = calculateAge(dob);
      const fullName = `${firstName} ${lastName}`.trim() || 'Aura User';

      // 1. Update Auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          nickname: nickname || firstName,
          age: userAge,
          height: heightCm,
          weight: weightKg,
          pregnancy_status: pregnancyStatus,
          pcos,
          health_conditions: conditions,
          water_goal: waterGoal,
          avatar_emoji: avatar,
        }
      });
      if (authError) throw authError;

      // 2. Upsert profile table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          avatar_url: avatar,
          dob: dob,
        });
      if (profileError) throw profileError;

      // 3. Upsert settings table
      const { error: settingsError } = await supabase
        .from('settings')
        .upsert({
          id: user.id,
          cycle_length_days: cycleLength,
          period_length_days: periodLength,
          notifications_enabled: notifications,
        });
      if (settingsError) throw settingsError;

      // 4. Create initial cycle and logs
      const lastPeriodStart = new Date(lastPeriodDate);
      const lastPeriodEnd = new Date(lastPeriodStart);
      lastPeriodEnd.setDate(lastPeriodStart.getDate() + periodLength - 1);

      const { data: cycleData, error: cycleErr } = await supabase
        .from('cycles')
        .insert({
          user_id: user.id,
          start_date: lastPeriodStart.toISOString().split('T')[0],
          end_date: lastPeriodEnd.toISOString().split('T')[0],
          expected_end_date: lastPeriodEnd.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (cycleErr) console.warn('Cycle setup warning:', cycleErr);

      if (cycleData) {
        const logs = [];
        for (let i = 0; i < periodLength; i++) {
          const logDate = new Date(lastPeriodStart);
          logDate.setDate(lastPeriodStart.getDate() + i);
          logs.push({
            user_id: user.id,
            cycle_id: cycleData.id,
            date: logDate.toISOString().split('T')[0],
            flow_level: 'medium',
          });
        }
        const { error: logsError } = await supabase.from('period_logs').insert(logs);
        if (logsError) console.warn('Period logs setup warning:', logsError);
      }

      // Add a water log record for today
      await supabase.from('water_logs').insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        amount_ml: 0,
      });

      // Register push notifications
      if (notifications) {
        await registerForPushNotificationsAsync().catch(console.error);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Update session locally by refreshing router
      router.replace('/(app)');
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      alert(err.message || 'Something went wrong saving your profile.');
    } finally {
      setSaving(false);
    }
  };

  const progressWidth = useSharedValue(1 / TOTAL_STEPS);
  useEffect(() => {
    progressWidth.value = withTiming(step / TOTAL_STEPS, { duration: 300 });
  }, [step]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const renderStepIndicator = () => (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundElement }]}>
        <Animated.View style={[styles.progressBarFill, { backgroundColor: theme.primary }, barStyle]} />
      </View>
      <View style={styles.stepLabels}>
        <ThemedText type="labelMedium" style={{ color: theme.textSecondary }}>
          Step {step} of {TOTAL_STEPS}
        </ThemedText>
        <ThemedText type="labelMedium" style={{ color: theme.primary, fontWeight: '700' }}>
          {Math.round((step / TOTAL_STEPS) * 100)}% Complete
        </ThemedText>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient 
        colors={isDark ? ['#2D1520', '#181213'] : ['#FFF2F5', '#FCF8F9']} 
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={styles.header}>
          {step > 1 ? (
            <Pressable onPress={handleBack} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </Pressable>
          ) : (
            <View style={styles.headerBtnPlaceholder} />
          )}
          <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '700' }}>
            Set Up Your Aura
          </ThemedText>
          <View style={styles.headerBtnPlaceholder} />
        </View>

        {renderStepIndicator()}

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.wizardScroll}
          >
            {/* STEP 1: Personal Details */}
            <View style={styles.slide}>
              <GlassView intensity="high" borderRadius={24} style={[styles.card, { borderColor: theme.outlineVariant }]}>
                <ThemedText type="headlineSmall" style={[styles.cardTitle, { color: theme.text }]}>
                  Tell us about yourself
                </ThemedText>

                <ThemedText type="bodyMedium" style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  Customize your health card so we can welcome you properly.
                </ThemedText>

                {/* Avatar Picker */}
                <ThemedText type="labelMedium" style={{ color: theme.textSecondary, alignSelf: 'flex-start', marginBottom: Spacing.two }}>
                  Choose Your Emblem
                </ThemedText>
                <View style={styles.avatarPicker}>
                  <View style={[styles.avatarPreview, { backgroundColor: theme.primaryContainer }]}>
                    <ThemedText type="titleLarge" style={{ fontSize: 44 }}>{avatar}</ThemedText>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarList}>
                    {PRESET_AVATARS.map(item => (
                      <Pressable 
                        key={item} 
                        style={[styles.avatarItem, avatar === item && { borderColor: theme.primary, backgroundColor: theme.primaryContainer }]} 
                        onPress={() => setAvatar(item)}
                      >
                        <ThemedText style={{ fontSize: 24 }}>{item}</ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Text Inputs */}
                <View style={styles.inputGroup}>
                  <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.one }}>First Name</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                    placeholder="e.g. Sarah"
                    placeholderTextColor={theme.textSecondary}
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.one }}>Last Name</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                    placeholder="e.g. Jenkins"
                    placeholderTextColor={theme.textSecondary}
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.one }}>Nickname (Optional)</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                    placeholder="e.g. Sari"
                    placeholderTextColor={theme.textSecondary}
                    value={nickname}
                    onChangeText={setNickname}
                  />
                </View>
              </GlassView>
            </View>

            {/* STEP 2: Body Metrics */}
            <View style={styles.slide}>
              <GlassView intensity="high" borderRadius={24} style={[styles.card, { borderColor: theme.outlineVariant }]}>
                <ThemedText type="headlineSmall" style={[styles.cardTitle, { color: theme.text }]}>
                  Your Biology
                </ThemedText>

                <ThemedText type="bodyMedium" style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  Metrics to calculate your energy profiles and cycle predictions.
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.one }}>Date of Birth (YYYY-MM-DD)</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textSecondary}
                    value={dob}
                    onChangeText={setDob}
                  />
                  <ThemedText type="labelSmall" style={{ color: theme.primary, marginTop: 4 }}>
                    Calculated Age: {calculateAge(dob)} years old
                  </ThemedText>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.one }}>Height (cm)</ThemedText>
                  <View style={styles.sliderValueRow}>
                    <Pressable style={styles.valueAdjustBtn} onPress={() => setHeightCm(Math.max(100, heightCm - 1))}>
                      <Ionicons name="remove" size={20} color={theme.text} />
                    </Pressable>
                    <ThemedText type="titleLarge" style={{ color: theme.text }}>{heightCm} cm</ThemedText>
                    <Pressable style={styles.valueAdjustBtn} onPress={() => setHeightCm(Math.min(250, heightCm + 1))}>
                      <Ionicons name="add" size={20} color={theme.text} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.one }}>Weight (kg)</ThemedText>
                  <View style={styles.sliderValueRow}>
                    <Pressable style={styles.valueAdjustBtn} onPress={() => setWeightKg(Math.max(30, weightKg - 1))}>
                      <Ionicons name="remove" size={20} color={theme.text} />
                    </Pressable>
                    <ThemedText type="titleLarge" style={{ color: theme.text }}>{weightKg} kg</ThemedText>
                    <Pressable style={styles.valueAdjustBtn} onPress={() => setWeightKg(Math.min(200, weightKg + 1))}>
                      <Ionicons name="add" size={20} color={theme.text} />
                    </Pressable>
                  </View>
                </View>
              </GlassView>
            </View>

            {/* STEP 3: Cycle Tracking */}
            <View style={styles.slide}>
              <GlassView intensity="high" borderRadius={24} style={[styles.card, { borderColor: theme.outlineVariant }]}>
                <ThemedText type="headlineSmall" style={[styles.cardTitle, { color: theme.text }]}>
                  Your menstrual cycle
                </ThemedText>

                <ThemedText type="bodyMedium" style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  Knowing these averages allows our AI model to predict your ovulation and PMS phases.
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.one }}>Typical Cycle Length (Days)</ThemedText>
                  <View style={styles.sliderValueRow}>
                    <Pressable style={styles.valueAdjustBtn} onPress={() => setCycleLength(Math.max(15, cycleLength - 1))}>
                      <Ionicons name="remove" size={20} color={theme.text} />
                    </Pressable>
                    <ThemedText type="titleLarge" style={{ color: theme.primary }}>{cycleLength} days</ThemedText>
                    <Pressable style={styles.valueAdjustBtn} onPress={() => setCycleLength(Math.min(60, cycleLength + 1))}>
                      <Ionicons name="add" size={20} color={theme.text} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.one }}>Typical Period Length (Days)</ThemedText>
                  <View style={styles.sliderValueRow}>
                    <Pressable style={styles.valueAdjustBtn} onPress={() => setPeriodLength(Math.max(2, periodLength - 1))}>
                      <Ionicons name="remove" size={20} color={theme.text} />
                    </Pressable>
                    <ThemedText type="titleLarge" style={{ color: theme.primary }}>{periodLength} days</ThemedText>
                    <Pressable style={styles.valueAdjustBtn} onPress={() => setPeriodLength(Math.min(15, periodLength + 1))}>
                      <Ionicons name="add" size={20} color={theme.text} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.one }}>Last Period Start Date (YYYY-MM-DD)</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textSecondary}
                    value={lastPeriodDate}
                    onChangeText={setLastPeriodDate}
                  />
                </View>
              </GlassView>
            </View>

            {/* STEP 4: Health Metrics */}
            <View style={styles.slide}>
              <GlassView intensity="high" borderRadius={24} style={[styles.card, { borderColor: theme.outlineVariant }]}>
                <ThemedText type="headlineSmall" style={[styles.cardTitle, { color: theme.text }]}>
                  Health status & conditions
                </ThemedText>

                <ThemedText type="bodyMedium" style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  This allows Aura to adjust widgets, pregnancy trackers, or hormone insights.
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.two }}>Pregnancy Mode</ThemedText>
                  <View style={styles.pregnancyOptions}>
                    {[
                      { key: 'not_pregnant', label: 'Not Pregnant' },
                      { key: 'trying', label: 'Trying' },
                      { key: 'pregnant', label: 'Pregnant 🤰' },
                      { key: 'postpartum', label: 'Postpartum' },
                    ].map(opt => (
                      <Pressable
                        key={opt.key}
                        style={[styles.pregnancyBtn, pregnancyStatus === opt.key ? { backgroundColor: theme.primary } : { backgroundColor: theme.backgroundElement }]}
                        onPress={() => setPregnancyStatus(opt.key as any)}
                      >
                        <ThemedText type="labelMedium" style={{ color: pregnancyStatus === opt.key ? '#fff' : theme.text }}>
                          {opt.label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={[styles.switchRow, { borderBottomColor: theme.backgroundElement }]}>
                  <View>
                    <ThemedText type="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>Polycystic Ovary Syndrome (PCOS)</ThemedText>
                    <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>Adjust predictions for ovulation irregularities</ThemedText>
                  </View>
                  <Switch value={pcos} onValueChange={setPcos} trackColor={{ true: theme.primary }} />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.two }}>Other Health Conditions</ThemedText>
                  <View style={styles.chipRow}>
                    {['Endometriosis', 'Thyroid issues', 'Diabetes', 'Anemia', 'PMDD'].map(cond => {
                      const selected = conditions.includes(cond);
                      return (
                        <Pressable
                          key={cond}
                          style={[styles.conditionChip, selected ? { backgroundColor: theme.primary } : { backgroundColor: theme.backgroundElement }]}
                          onPress={() => toggleCondition(cond)}
                        >
                          <ThemedText type="labelSmall" style={{ color: selected ? '#fff' : theme.textSecondary }}>{cond}</ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.customConditionInput}>
                    <TextInput
                      style={[styles.miniInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                      placeholder="Add other condition..."
                      placeholderTextColor={theme.textSecondary}
                      value={customCondition}
                      onChangeText={setCustomCondition}
                    />
                    <Pressable style={[styles.miniAddBtn, { backgroundColor: theme.primaryContainer }]} onPress={addCustomCondition}>
                      <Ionicons name="add" size={20} color={theme.primary} />
                    </Pressable>
                  </View>
                </View>
              </GlassView>
            </View>

            {/* STEP 5: Goals & Notifications */}
            <View style={styles.slide}>
              <GlassView intensity="high" borderRadius={24} style={[styles.card, { borderColor: theme.outlineVariant }]}>
                <ThemedText type="headlineSmall" style={[styles.cardTitle, { color: theme.text }]}>
                  Daily goals & notifications
                </ThemedText>

                <ThemedText type="bodyMedium" style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  Almost finished! Let's align on notifications and hydration targets.
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.one }}>Daily Hydration Goal</ThemedText>
                  <View style={styles.sliderValueRow}>
                    <Pressable style={styles.valueAdjustBtn} onPress={() => setWaterGoal(Math.max(2, waterGoal - 1))}>
                      <Ionicons name="remove" size={20} color={theme.text} />
                    </Pressable>
                    <ThemedText type="titleLarge" style={{ color: theme.primary }}>{waterGoal} glasses ({waterGoal * 250} ml)</ThemedText>
                    <Pressable style={styles.valueAdjustBtn} onPress={() => setWaterGoal(Math.min(24, waterGoal + 1))}>
                      <Ionicons name="add" size={20} color={theme.text} />
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.switchRow, { borderBottomColor: theme.backgroundElement }]}>
                  <View style={{ flex: 1, marginRight: Spacing.three }}>
                    <ThemedText type="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>Reminders & Alerts</ThemedText>
                    <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>Get notifications for cycle starts, medicine times, and water checks</ThemedText>
                  </View>
                  <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: theme.primary }} />
                </View>

                <View style={styles.summaryBox}>
                  <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                  <ThemedText type="bodyMedium" style={{ color: theme.text, flex: 1, marginLeft: 8 }}>
                    Your details will be stored securely on Supabase. You can export or delete your account data at any time from your settings.
                  </ThemedText>
                </View>
              </GlassView>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Button
            label={step === TOTAL_STEPS ? (saving ? "Saving..." : "Start Journey ✨") : "Continue"}
            variant="filled"
            onPress={handleNext}
            disabled={saving || !firstName.trim()}
            style={[styles.nextBtn, { backgroundColor: theme.primary }]}
            labelStyle={{ color: theme.onPrimary, fontWeight: '700' }}
          >
            {saving && <ActivityIndicator color={theme.onPrimary} />}
          </Button>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    height: 56,
  },
  headerBtn: {
    padding: Spacing.two,
  },
  headerBtnPlaceholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: Spacing.five,
    marginVertical: Spacing.two,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  wizardScroll: {
    height: '100%',
  },
  slide: {
    width: width,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    paddingVertical: Spacing.two,
  },
  card: {
    padding: Spacing.five,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  cardTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  cardSubtitle: {
    textAlign: 'center',
    marginBottom: Spacing.five,
    lineHeight: 18,
    opacity: 0.8,
  },
  inputGroup: {
    width: '100%',
    marginBottom: Spacing.four,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: Spacing.four,
    fontSize: 16,
  },
  sliderValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 52,
  },
  valueAdjustBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
    gap: Spacing.three,
  },
  avatarPreview: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarList: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  avatarItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pregnancyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pregnancyBtn: {
    flex: 1,
    minWidth: 110,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.four,
    borderBottomWidth: 1,
    marginBottom: Spacing.four,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  conditionChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 16,
  },
  customConditionInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  miniInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  miniAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryBox: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  nextBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
  },
});
