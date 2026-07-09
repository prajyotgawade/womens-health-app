import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform, Dimensions, StatusBar, ActivityIndicator, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, differenceInDays, addDays, subDays, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { GlassView } from '@/components/ui/glass-view';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { generatePredictions } from '@/utils/prediction';

const { width } = Dimensions.get('window');

const TODAY = new Date();
const CALENDAR_DAYS = Array.from({ length: 7 }).map((_, i) => addDays(subDays(TODAY, 3), i));

const QUOTES = [
  "Honor your body's natural wisdom and pace.",
  "Your energy changes in waves. Ride each phase with grace.",
  "Self-care is listening to what your body needs today.",
  "You are strong, resilient, and uniquely balanced.",
  "Rest is productive. Nourish your mind and body."
];

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const user = session?.user;

  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [userName, setUserName] = useState(' Sarah');
  const [avatarEmoji, setAvatarEmoji] = useState('✨');
  
  // Predictions state
  const [cycleDay, setCycleDay] = useState(1);
  const [daysUntilPeriod, setDaysUntilPeriod] = useState(12);
  const [currentPhase, setCurrentPhase] = useState('Follicular');
  const [fertilityStatus, setFertilityStatus] = useState('Medium');
  const [ovulationText, setOvulationText] = useState('in 6 days');

  // Logs state
  const [waterLogged, setWaterLogged] = useState(0);
  const [waterGoal, setWaterGoal] = useState(8);
  const [sleepLogged, setSleepLogged] = useState(0);
  const [sleepGoal, setSleepGoal] = useState(8);
  
  const [takenMedsCount, setTakenMedsCount] = useState(0);
  const [totalMedsCount, setTotalMedsCount] = useState(0);
  const [quote, setQuote] = useState(QUOTES[0]);

  // Ring Animations
  const ringScale = useSharedValue(0.9);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  useEffect(() => {
    ringScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch Profile
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const nickname = user.user_metadata?.nickname || profile?.full_name?.split(' ')[0] || 'User';
      setUserName(nickname);
      setAvatarEmoji(user.user_metadata?.avatar_emoji || '✨');
      setWaterGoal(user.user_metadata?.water_goal || 8);
      setSleepGoal(8); // Default sleep goal

      // 2. Fetch Cycle data & calculate predictions
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
          else if (diffOvu > 1) setOvulationText(`in ${diffOvu} days`);
          else setOvulationText('Passed');

          if (currentDay <= (user.user_metadata?.period_length || 5)) setCurrentPhase('Menstruation');
          else if (today < preds.ovulationDate) setCurrentPhase('Follicular');
          else if (today >= preds.ovulationDate && today <= addDays(preds.ovulationDate, 1)) setCurrentPhase('Ovulatory');
          else setCurrentPhase('Luteal');
        }
      }

      // 3. Fetch logs for today (Water + Sleep)
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
        setTakenMedsCount(medsData.data.filter((_, i) => i % 2 === 0).length); // Mock taken
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

  const getPhaseColors = (): readonly [string, string] => {
    switch (currentPhase) {
      case 'Menstruation': return [theme.calendar.periodBg, theme.calendar.period];
      case 'Follicular': return ['#4FC3F7', '#1E88E5']; // Blues
      case 'Ovulatory': return [theme.calendar.ovulationBg, theme.calendar.ovulation];
      default: return [theme.calendar.predictedBg, theme.calendar.predicted];
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Calculate progress
  const waterProgress = Math.min((waterLogged / waterGoal) * 100, 100);
  const sleepProgress = Math.min((sleepLogged / sleepGoal) * 100, 100);

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.header}>
            <View>
              <ThemedText type="labelMedium" style={{ color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
                {format(TODAY, 'EEEE, MMM d')}
              </ThemedText>
              <ThemedText type="displaySmall" style={{ fontSize: 26, color: theme.text, fontWeight: '800', marginTop: Spacing.half }}>
                Hello, {userName} {avatarEmoji}
              </ThemedText>
            </View>
            <Pressable 
              style={[styles.aiShortcut, { backgroundColor: theme.primaryContainer }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/ai'); }}
            >
              <Ionicons name="sparkles" size={18} color={theme.primary} />
            </Pressable>
          </Animated.View>

          {/* Calendar Strip */}
          <Animated.View entering={FadeInDown.duration(600).delay(100).springify()} style={styles.calendarStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
              {CALENDAR_DAYS.map((date, index) => {
                const isSelected = index === 3;
                return (
                  <View key={date.toISOString()} style={[styles.calendarDay, { backgroundColor: isSelected ? theme.primary : theme.backgroundElement }]}>
                    <ThemedText type="labelSmall" style={{ color: isSelected ? theme.onPrimary : theme.textSecondary, marginBottom: 2, fontSize: 10 }}>
                      {format(date, 'EE').charAt(0)}
                    </ThemedText>
                    <ThemedText type="titleMedium" style={{ color: isSelected ? theme.onPrimary : theme.text, fontWeight: '800', fontSize: 14 }}>
                      {format(date, 'd')}
                    </ThemedText>
                    {isSelected && <View style={styles.calendarDot} />}
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* Hero Smart Cycle visualizer (re-scaled dynamically) */}
          <Animated.View entering={FadeInDown.duration(600).delay(200).springify()} style={styles.heroContainer}>
            <LinearGradient colors={getPhaseColors()} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroRingCard, { shadowColor: getPhaseColors()[1] }]}>
              <Animated.View style={[styles.ringInner, pulseStyle]}>
                <View style={styles.ringContent}>
                  <ThemedText type="labelMedium" style={styles.ringLabel}>{currentPhase.toUpperCase()} PHASE</ThemedText>
                  <ThemedText type="displayLarge" style={styles.ringNumber}>
                    {currentPhase === 'Menstruation' ? cycleDay : daysUntilPeriod}
                  </ThemedText>
                  <ThemedText type="bodyMedium" style={styles.ringPeriodText}>
                    {currentPhase === 'Menstruation' ? 'Flow Day' : 'Days until period'}
                  </ThemedText>
                </View>
                <View style={styles.ringSubBadge}>
                  <ThemedText type="labelSmall" style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>Cycle Day {cycleDay}</ThemedText>
                </View>
              </Animated.View>
            </LinearGradient>
          </Animated.View>

          {/* Grid visualizers: Daily Rings & Vitals combined into clean 2-column grid cards */}
          <Animated.View entering={FadeInDown.duration(600).delay(300).springify()} style={styles.sectionContainer}>
            <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '800', marginBottom: Spacing.three }}>
              Daily Progress & Vitals
            </ThemedText>
            
            <View style={styles.gridContainer}>
              <Card variant="elevated" style={[styles.gridCard, { borderColor: theme.outlineVariant }]}>
                <Ionicons name="water" size={24} color="#4FC3F7" style={{ marginBottom: Spacing.one }} />
                <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '800' }}>{waterLogged}/{waterGoal}</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontSize: 10 }}>Glasses Water</ThemedText>
                <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundElement, marginTop: Spacing.two }]}>
                  <View style={[styles.progressBarFill, { width: `${waterProgress}%`, backgroundColor: '#4FC3F7' }]} />
                </View>
                <Pressable style={[styles.addRingBtn, { backgroundColor: 'rgba(79, 195, 247, 0.12)' }]} onPress={handleWaterIncrement}>
                  <Ionicons name="add" size={16} color="#4FC3F7" />
                </Pressable>
              </Card>
              
              <Card variant="elevated" style={[styles.gridCard, { borderColor: theme.outlineVariant }]}>
                <Ionicons name="moon" size={24} color="#9575CD" style={{ marginBottom: Spacing.one }} />
                <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '800' }}>{sleepLogged}h</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontSize: 10 }}>Logged Sleep</ThemedText>
                <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundElement, marginTop: Spacing.two }]}>
                  <View style={[styles.progressBarFill, { width: `${sleepProgress}%`, backgroundColor: '#9575CD' }]} />
                </View>
                <Pressable style={[styles.addRingBtn, { backgroundColor: 'rgba(149, 117, 205, 0.12)' }]} onPress={() => router.push('/log')}>
                  <Ionicons name="add" size={16} color="#9575CD" />
                </Pressable>
              </Card>

              <Card variant="filled" style={[styles.gridCard, { backgroundColor: theme.calendar.fertileBg, paddingBottom: Spacing.four }]}>
                <View style={[styles.vitalIconWrap, { backgroundColor: 'rgba(255,255,255,0.45)' }]}>
                  <Ionicons name="flower" size={16} color={theme.calendar.fertile} />
                </View>
                <ThemedText type="titleMedium" style={{ color: theme.calendar.fertile, marginTop: Spacing.two, fontWeight: '800' }}>{fertilityStatus}</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.calendar.fertile, opacity: 0.8, fontSize: 10 }}>Fertility</ThemedText>
              </Card>

              <Card variant="filled" style={[styles.gridCard, { backgroundColor: theme.calendar.ovulationBg, paddingBottom: Spacing.four }]}>
                <View style={[styles.vitalIconWrap, { backgroundColor: 'rgba(255,255,255,0.45)' }]}>
                  <Ionicons name="radio-button-on" size={16} color={theme.calendar.ovulation} />
                </View>
                <ThemedText type="titleMedium" style={{ color: theme.calendar.ovulation, marginTop: Spacing.two, fontWeight: '800' }}>{ovulationText}</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.calendar.ovulation, opacity: 0.8, fontSize: 10 }}>Ovulation</ThemedText>
              </Card>
            </View>
          </Animated.View>

          {/* Medication Module */}
          {totalMedsCount > 0 && (
            <Animated.View entering={FadeInDown.duration(600).delay(400).springify()} style={styles.sectionContainer}>
              <Pressable onPress={() => router.push('/medicine')}>
                <Card variant="filled" style={[styles.medicationCard, { backgroundColor: theme.secondaryContainer }]}>
                  <View style={[styles.vitalIconWrap, { backgroundColor: 'rgba(255,255,255,0.4)', marginRight: Spacing.three }]}>
                    <Ionicons name="medical" size={18} color={theme.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="titleMedium" style={{ color: theme.onSecondaryContainer, fontWeight: '800', fontSize: 14 }}>Medications</ThemedText>
                    <ThemedText type="labelMedium" style={{ color: theme.onSecondaryContainer, opacity: 0.8, fontSize: 12 }}>
                      {takenMedsCount}/{totalMedsCount} taken today
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.secondary} />
                </Card>
              </Pressable>
            </Animated.View>
          )}

          {/* Daily Insight / Quote */}
          <Animated.View entering={FadeInDown.duration(600).delay(450).springify()} style={styles.tipContainer}>
            <Card variant="filled" style={[styles.tipCard, { backgroundColor: theme.primaryContainer, borderColor: theme.outlineVariant, borderWidth: 1, flexDirection: 'row', alignItems: 'center' }]}>
              <Ionicons name="book" size={20} color={theme.primary} style={{ marginRight: Spacing.three }} />
              <View style={{ flex: 1 }}>
                <ThemedText type="titleSmall" style={{ color: theme.primary, fontWeight: '800', fontSize: 14 }}>Daily Insight</ThemedText>
                <ThemedText type="bodyMedium" style={{ color: theme.text, marginTop: 2, fontStyle: 'italic', lineHeight: 18, fontSize: 12 }}>"{quote}"</ThemedText>
              </View>
            </Card>
          </Animated.View>

        </SafeAreaView>
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View entering={FadeIn.duration(600).delay(500)} style={styles.fabContainer}>
        <Pressable style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={() => router.push('/log')}>
          <Ionicons name="add" size={28} color={theme.onPrimary} />
        </Pressable>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: BottomTabInset + Spacing.six },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.five, paddingTop: Spacing.two, marginBottom: Spacing.three },
  aiShortcut: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  calendarStrip: { marginBottom: Spacing.four },
  calendarScroll: { paddingHorizontal: Spacing.five, gap: Spacing.two },
  calendarDay: { width: 44, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  calendarDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#fff', position: 'absolute', bottom: 6 },
  heroContainer: { paddingHorizontal: Spacing.five, marginBottom: Spacing.five, alignItems: 'center' },
  heroRingCard: { width: width - (Spacing.five * 2), height: 180, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 6, overflow: 'hidden' },
  ringInner: { width: 140, height: 140, borderRadius: 70, borderWidth: 6, borderColor: 'rgba(255, 255, 255, 0.35)', backgroundColor: 'rgba(255, 255, 255, 0.08)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  ringContent: { alignItems: 'center' },
  ringLabel: { color: '#fff', fontSize: 9, letterSpacing: 1.5, fontWeight: '900', opacity: 0.9 },
  ringNumber: { color: '#fff', fontSize: 48, fontWeight: '900', lineHeight: 52 },
  ringPeriodText: { color: '#fff', fontSize: 12, opacity: 0.9, fontWeight: '700' },
  ringSubBadge: { position: 'absolute', bottom: -8, paddingHorizontal: Spacing.three, paddingVertical: Spacing.half, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.35)' },
  sectionContainer: { paddingHorizontal: Spacing.five, marginBottom: Spacing.five },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  gridCard: { width: '48%', padding: Spacing.three, borderRadius: 20, position: 'relative', minHeight: 110, justifyContent: 'space-between' },
  progressBarBg: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2 },
  addRingBtn: { position: 'absolute', top: Spacing.three, right: Spacing.three, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  vitalIconWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start' },
  medicationCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three + 2, borderRadius: 24 },
  tipContainer: { paddingHorizontal: Spacing.five, marginBottom: Spacing.four },
  tipCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.four, borderWidth: 1, borderRadius: 20 },
  fabContainer: { position: 'absolute', right: Spacing.five, bottom: BottomTabInset + 12, zIndex: 100 },
  fab: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 8 },
});
