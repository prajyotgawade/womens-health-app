import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform, Dimensions, StatusBar, ActivityIndicator, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, useSharedValue, withSpring, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, differenceInDays, addDays, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { generatePredictions } from '@/utils/prediction';

const { width } = Dimensions.get('window');

const TODAY = new Date();

const QUOTES = [
  "Honor your body's natural wisdom and pace.",
  "Your energy changes in waves. Ride each phase with grace.",
  "Self-care is listening to what your body needs today.",
  "You are strong, resilient, and uniquely balanced.",
  "Rest is productive. Nourish your mind and body."
];

const PHASE_INFO: Record<string, { emoji: string; description: string; tip: string }> = {
  Menstruation: { emoji: '🩸', description: 'Rest & restore. Your body is shedding and renewing.', tip: 'Focus on warmth, rest, and iron-rich foods.' },
  Follicular: { emoji: '🌱', description: 'Energy rising. Estrogen is climbing — you feel lighter.', tip: 'Great time for new goals and creative projects.' },
  Ovulatory: { emoji: '✨', description: 'Peak power. You\'re at your most social and energetic.', tip: 'Ideal for presentations, dates, and big workouts.' },
  Luteal: { emoji: '🌙', description: 'Wind down. Progesterone rises — honor your need for calm.', tip: 'Prioritize self-care, magnesium, and lighter meals.' },
};

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const user = session?.user;

  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [userName, setUserName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('✨');

  const [cycleDay, setCycleDay] = useState(1);
  const [daysUntilPeriod, setDaysUntilPeriod] = useState(12);
  const [currentPhase, setCurrentPhase] = useState('Follicular');
  const [fertilityStatus, setFertilityStatus] = useState('Low');
  const [ovulationText, setOvulationText] = useState('in 6 days');

  const [waterLogged, setWaterLogged] = useState(0);
  const [waterGoal, setWaterGoal] = useState(8);
  const [sleepLogged, setSleepLogged] = useState(0);
  const [sleepGoal, setSleepGoal] = useState(8);

  const [takenMedsCount, setTakenMedsCount] = useState(0);
  const [totalMedsCount, setTotalMedsCount] = useState(0);
  const [quote, setQuote] = useState(QUOTES[0]);

  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.6);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 2000 }),
        withTiming(0.5, { duration: 2000 })
      ),
      -1,
      true
    );
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const nickname = user.user_metadata?.nickname || profile?.full_name?.split(' ')[0] || 'User';
      setUserName(nickname);
      setAvatarEmoji(user.user_metadata?.avatar_emoji || '✨');
      setWaterGoal(user.user_metadata?.water_goal || 8);
      setSleepGoal(8);

      const { data: cycles } = await supabase.from('cycles').select('*').eq('user_id', user.id).order('start_date', { ascending: false });
      if (cycles && cycles.length > 0) {
        const cycleInputs = cycles.map(c => ({ startDate: c.start_date, endDate: c.end_date }));
        const preds = generatePredictions(cycleInputs);
        if (preds) {
          const latestCycleStart = parseISO(cycles[0].start_date);
          const currentDay = differenceInDays(new Date(), latestCycleStart) + 1;
          setCycleDay(currentDay >= 1 ? currentDay : 1);

          const daysLeft = differenceInDays(preds.nextPeriodStart, new Date());
          setDaysUntilPeriod(daysLeft >= 0 ? daysLeft : 0);

          const today = new Date();
          setFertilityStatus((today >= preds.fertilityWindowStart && today <= preds.fertilityWindowEnd) ? 'High' : 'Low');

          const diffOvu = differenceInDays(preds.ovulationDate, today);
          if (diffOvu === 0) setOvulationText('Today');
          else if (diffOvu === 1) setOvulationText('Tomorrow');
          else if (diffOvu > 1) setOvulationText(`in ${diffOvu}d`);
          else setOvulationText('Passed');

          if (currentDay <= (user.user_metadata?.period_length || 5)) setCurrentPhase('Menstruation');
          else if (today < preds.ovulationDate) setCurrentPhase('Follicular');
          else if (today >= preds.ovulationDate && today <= addDays(preds.ovulationDate, 1)) setCurrentPhase('Ovulatory');
          else setCurrentPhase('Luteal');
        }
      }

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const [waterData, sleepData, medsData] = await Promise.all([
        supabase.from('water_logs').select('amount_ml').eq('user_id', user.id).eq('date', todayStr),
        supabase.from('sleep_logs').select('hours').eq('user_id', user.id).eq('date', todayStr),
        supabase.from('medications').select('*').eq('user_id', user.id).eq('is_active', true)
      ]);

      if (waterData.data) {
        const totalMl = waterData.data.reduce((acc, log) => acc + log.amount_ml, 0);
        setWaterLogged(Math.round(totalMl / 250));
      }
      if (sleepData.data && sleepData.data.length > 0) {
        const hours = sleepData.data.reduce((acc, log) => acc + Number(log.hours), 0);
        setSleepLogged(hours);
      }
      if (medsData.data) {
        setTotalMedsCount(medsData.data.length);
        setTakenMedsCount(medsData.data.filter((_, i) => i % 2 === 0).length);
      }
    } catch (error) {
      console.warn('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWaterIncrement = async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWaterLogged(prev => prev + 1);
    try {
      await supabase.from('water_logs').insert({ user_id: user.id, date: format(new Date(), 'yyyy-MM-dd'), amount_ml: 250 });
    } catch (e) { }
  };

  const getPhaseGradient = (): readonly [string, string, string] => {
    switch (currentPhase) {
      case 'Menstruation': return ['#4A0010', '#B00030', '#FF2D55'];
      case 'Follicular': return ['#0A2463', '#1E6FD9', '#4FC3F7'];
      case 'Ovulatory': return ['#004D40', '#00796B', '#26C6DA'];
      default: return ['#2D1B69', '#5C2D91', '#9C6ADE'];
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const waterProgress = Math.min((waterLogged / waterGoal) * 100, 100);
  const sleepProgress = Math.min((sleepLogged / sleepGoal) * 100, 100);
  const phaseInfo = PHASE_INFO[currentPhase] || PHASE_INFO.Follicular;
  const gradient = getPhaseGradient();

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>

          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.header}>
            <View>
              <ThemedText type="labelMedium" style={{ color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 10 }}>
                {format(TODAY, 'EEEE, MMMM d')}
              </ThemedText>
              <ThemedText style={{ fontSize: 24, color: theme.text, fontWeight: '800', marginTop: 2, letterSpacing: -0.5 }}>
                Hello, {userName} {avatarEmoji}
              </ThemedText>
            </View>
            <Pressable
              style={[styles.aiBtn, { backgroundColor: theme.primaryContainer }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/ai'); }}
            >
              <Ionicons name="sparkles" size={20} color={theme.primary} />
            </Pressable>
          </Animated.View>

          {/* Hero Phase Card */}
          <Animated.View entering={FadeInDown.duration(600).delay(100).springify()} style={styles.heroWrapper}>
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              {/* Glow orb */}
              <Animated.View style={[styles.glowOrb, glowStyle]} />

              <View style={styles.heroContent}>
                <View style={styles.heroLeft}>
                  <View style={styles.phaseBadge}>
                    <ThemedText style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}>
                      {currentPhase}
                    </ThemedText>
                  </View>
                  <ThemedText style={{ color: '#fff', fontSize: 13, marginTop: Spacing.two, opacity: 0.85, lineHeight: 18, maxWidth: 180 }}>
                    {phaseInfo.description}
                  </ThemedText>
                  <View style={styles.heroTipRow}>
                    <Ionicons name="bulb-outline" size={12} color="rgba(255,255,255,0.7)" />
                    <ThemedText style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginLeft: 4, flex: 1, lineHeight: 15 }}>
                      {phaseInfo.tip}
                    </ThemedText>
                  </View>
                </View>

                <Animated.View style={[styles.heroRingWrap, pulseStyle]}>
                  <View style={styles.heroRing}>
                    <ThemedText style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 1, fontWeight: '700', marginBottom: 2 }}>
                      DAY
                    </ThemedText>
                    <ThemedText style={{ color: '#fff', fontSize: 52, fontWeight: '900', lineHeight: 56 }}>
                      {currentPhase === 'Menstruation' ? cycleDay : daysUntilPeriod}
                    </ThemedText>
                    <ThemedText style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600', textAlign: 'center' }}>
                      {currentPhase === 'Menstruation' ? 'of flow' : 'until period'}
                    </ThemedText>
                  </View>
                  <View style={styles.cycleBadge}>
                    <ThemedText style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                      Cycle Day {cycleDay}
                    </ThemedText>
                  </View>
                </Animated.View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Quick Stats Row */}
          <Animated.View entering={FadeInDown.duration(600).delay(200).springify()} style={styles.statsRow}>
            <View style={[styles.statPill, { backgroundColor: theme.calendar.fertileBg }]}>
              <Ionicons name="flower-outline" size={14} color={theme.calendar.fertile} />
              <View style={styles.statPillText}>
                <ThemedText style={{ color: theme.calendar.fertile, fontSize: 13, fontWeight: '800' }}>{fertilityStatus}</ThemedText>
                <ThemedText style={{ color: theme.calendar.fertile, fontSize: 9, opacity: 0.8, fontWeight: '600' }}>FERTILITY</ThemedText>
              </View>
            </View>

            <View style={[styles.statPill, { backgroundColor: theme.calendar.ovulationBg }]}>
              <Ionicons name="radio-button-on-outline" size={14} color={theme.calendar.ovulation} />
              <View style={styles.statPillText}>
                <ThemedText style={{ color: theme.calendar.ovulation, fontSize: 13, fontWeight: '800' }}>{ovulationText}</ThemedText>
                <ThemedText style={{ color: theme.calendar.ovulation, fontSize: 9, opacity: 0.8, fontWeight: '600' }}>OVULATION</ThemedText>
              </View>
            </View>

            <View style={[styles.statPill, { backgroundColor: theme.primaryContainer }]}>
              <Ionicons name="refresh-outline" size={14} color={theme.primary} />
              <View style={styles.statPillText}>
                <ThemedText style={{ color: theme.primary, fontSize: 13, fontWeight: '800' }}>{cycleDay}d</ThemedText>
                <ThemedText style={{ color: theme.primary, fontSize: 9, opacity: 0.8, fontWeight: '600' }}>CYCLE DAY</ThemedText>
              </View>
            </View>
          </Animated.View>

          {/* Daily Progress Section */}
          <Animated.View entering={FadeInDown.duration(600).delay(300).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={{ color: theme.text, fontWeight: '800', fontSize: 15, letterSpacing: -0.3 }}>
                Today's Progress
              </ThemedText>
              <Pressable onPress={() => router.push('/log')}>
                <ThemedText style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>Log Day →</ThemedText>
              </Pressable>
            </View>

            <View style={styles.progressGrid}>
              {/* Water Card */}
              <View style={[styles.progressCard, { backgroundColor: theme.surface, ...shadowStyle }]}>
                <View style={styles.progressCardTop}>
                  <View style={[styles.progressIconWrap, { backgroundColor: 'rgba(79,195,247,0.15)' }]}>
                    <Ionicons name="water" size={18} color="#4FC3F7" />
                  </View>
                  <Pressable
                    style={[styles.addBtn, { backgroundColor: 'rgba(79,195,247,0.12)' }]}
                    onPress={handleWaterIncrement}
                  >
                    <Ionicons name="add" size={16} color="#4FC3F7" />
                  </Pressable>
                </View>
                <ThemedText style={{ color: theme.text, fontSize: 22, fontWeight: '900', marginTop: Spacing.two }}>
                  {waterLogged}<ThemedText style={{ fontSize: 13, color: theme.textSecondary, fontWeight: '600' }}>/{waterGoal}</ThemedText>
                </ThemedText>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 10, fontWeight: '600', marginBottom: Spacing.two }}>glasses water</ThemedText>
                <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundElement }]}>
                  <View style={[styles.progressBarFill, { width: `${waterProgress}%`, backgroundColor: '#4FC3F7' }]} />
                </View>
              </View>

              {/* Sleep Card */}
              <View style={[styles.progressCard, { backgroundColor: theme.surface, ...shadowStyle }]}>
                <View style={styles.progressCardTop}>
                  <View style={[styles.progressIconWrap, { backgroundColor: 'rgba(149,117,205,0.15)' }]}>
                    <Ionicons name="moon" size={18} color="#9575CD" />
                  </View>
                  <Pressable
                    style={[styles.addBtn, { backgroundColor: 'rgba(149,117,205,0.12)' }]}
                    onPress={() => router.push('/log')}
                  >
                    <Ionicons name="add" size={16} color="#9575CD" />
                  </Pressable>
                </View>
                <ThemedText style={{ color: theme.text, fontSize: 22, fontWeight: '900', marginTop: Spacing.two }}>
                  {sleepLogged}<ThemedText style={{ fontSize: 13, color: theme.textSecondary, fontWeight: '600' }}>h/{sleepGoal}h</ThemedText>
                </ThemedText>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 10, fontWeight: '600', marginBottom: Spacing.two }}>sleep logged</ThemedText>
                <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundElement }]}>
                  <View style={[styles.progressBarFill, { width: `${sleepProgress}%`, backgroundColor: '#9575CD' }]} />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Medication Banner */}
          {totalMedsCount > 0 && (
            <Animated.View entering={FadeInDown.duration(600).delay(400).springify()} style={styles.section}>
              <Pressable onPress={() => router.push('/medicine')}>
                <LinearGradient
                  colors={[theme.secondaryContainer, theme.secondaryContainer]}
                  style={styles.medBanner}
                >
                  <View style={[styles.medIconCircle, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                    <Ionicons name="medical" size={20} color={theme.secondary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.three }}>
                    <ThemedText style={{ color: theme.onSecondaryContainer, fontWeight: '800', fontSize: 14 }}>
                      Medications
                    </ThemedText>
                    <View style={styles.medProgress}>
                      {Array.from({ length: totalMedsCount }).map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.medDot,
                            { backgroundColor: i < takenMedsCount ? theme.secondary : 'rgba(255,255,255,0.3)' }
                          ]}
                        />
                      ))}
                      <ThemedText style={{ color: theme.onSecondaryContainer, fontSize: 11, marginLeft: 6, opacity: 0.8, fontWeight: '600' }}>
                        {takenMedsCount}/{totalMedsCount} taken
                      </ThemedText>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.secondary} />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}

          {/* Daily Insight */}
          <Animated.View entering={FadeInDown.duration(600).delay(450).springify()} style={[styles.section, { marginBottom: Spacing.six }]}>
            <View style={[styles.insightCard, { backgroundColor: theme.primaryContainer, borderColor: `${theme.primary}30`, borderWidth: 1 }]}>
              <View style={[styles.insightIcon, { backgroundColor: theme.primary }]}>
                <Ionicons name="sparkles" size={14} color={theme.onPrimary} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.three }}>
                <ThemedText style={{ color: theme.primary, fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  Daily Insight
                </ThemedText>
                <ThemedText style={{ color: theme.text, fontStyle: 'italic', lineHeight: 18, fontSize: 13 }}>
                  "{quote}"
                </ThemedText>
              </View>
            </View>
          </Animated.View>

        </SafeAreaView>
      </ScrollView>

      {/* FAB */}
      <Animated.View entering={FadeIn.duration(600).delay(500)} style={styles.fabContainer}>
        <Pressable
          style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/log'); }}
        >
          <Ionicons name="add" size={28} color={theme.onPrimary} />
        </Pressable>
      </Animated.View>
    </ThemedView>
  );
}

const shadowStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: BottomTabInset + 80 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four + 4,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    marginBottom: Spacing.two,
  },
  aiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroWrapper: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  heroCard: {
    borderRadius: 28,
    padding: Spacing.four + 4,
    overflow: 'hidden',
    minHeight: 190,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  glowOrb: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeft: {
    flex: 1,
    paddingRight: Spacing.three,
  },
  phaseBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.two + 2,
  },
  heroRingWrap: {
    alignItems: 'center',
    position: 'relative',
  },
  heroRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
    borderRadius: 10,
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.two + 2,
    borderRadius: 16,
    gap: 6,
  },
  statPillText: {
    flex: 1,
  },

  section: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two + 4,
  },

  progressGrid: {
    flexDirection: 'row',
    gap: Spacing.two + 4,
  },
  progressCard: {
    flex: 1,
    borderRadius: 20,
    padding: Spacing.three,
  },
  progressCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  medBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three + 4,
    borderRadius: 20,
  },
  medIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  medDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },

  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.three + 4,
    borderRadius: 20,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  fabContainer: {
    position: 'absolute',
    right: Spacing.four + 4,
    bottom: BottomTabInset + 16,
    zIndex: 100,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
});
