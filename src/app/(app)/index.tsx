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
  const [userName, setUserName] = useState('Sarah');
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
      case 'Menstruation': return ['#FF88A5', '#E63946']; // Reds
      case 'Follicular': return ['#4FC3F7', '#1E88E5']; // Blues
      case 'Ovulatory': return ['#81C784', '#388E3C']; // Greens
      default: return [theme.primary, theme.secondary]; // Luteal (Amethyst Theme default)
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Calculate rings
  const waterProgress = Math.min((waterLogged / waterGoal) * 100, 100);
  const sleepProgress = Math.min((sleepLogged / sleepGoal) * 100, 100);

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SafeAreaView edges={['top']}>
          
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.header}>
            <View>
              <ThemedText type="labelMedium" style={{ color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
                {format(TODAY, 'EEEE, MMM d')}
              </ThemedText>
              <ThemedText type="displaySmall" style={{ fontSize: 32, color: theme.text, fontWeight: '800', marginTop: Spacing.one }}>
                Hello, {userName} {avatarEmoji}
              </ThemedText>
            </View>
            <Pressable 
              style={[styles.aiShortcut, { backgroundColor: theme.primaryContainer }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/ai'); }}
            >
              <Ionicons name="sparkles" size={20} color={theme.primary} />
            </Pressable>
          </Animated.View>

          {/* Calendar Strip */}
          <Animated.View entering={FadeInDown.duration(600).delay(100).springify()} style={styles.calendarStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
              {CALENDAR_DAYS.map((date, index) => {
                const isSelected = index === 3;
                return (
                  <View key={date.toISOString()} style={[styles.calendarDay, { backgroundColor: isSelected ? theme.primary : theme.backgroundElement }]}>
                    <ThemedText type="labelSmall" style={{ color: isSelected ? theme.onPrimary : theme.textSecondary, marginBottom: 4 }}>
                      {format(date, 'EE').charAt(0)}
                    </ThemedText>
                    <ThemedText type="titleMedium" style={{ color: isSelected ? theme.onPrimary : theme.text, fontWeight: '800' }}>
                      {format(date, 'd')}
                    </ThemedText>
                    {isSelected && <View style={styles.calendarDot} />}
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* Hero Smart Cycle visualizer */}
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
                  <ThemedText type="labelSmall" style={{ color: '#fff', fontWeight: '800' }}>Cycle Day {cycleDay}</ThemedText>
                </View>
              </Animated.View>
            </LinearGradient>
          </Animated.View>

          {/* Daily Rings Widget */}
          <Animated.View entering={FadeInDown.duration(600).delay(300).springify()} style={styles.sectionContainer}>
            <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '800', marginBottom: Spacing.three }}>
              Daily Rings
            </ThemedText>
            <View style={styles.ringsGrid}>
              <Card variant="elevated" style={[styles.ringWidget, { borderColor: theme.outlineVariant }]}>
                <Ionicons name="water" size={28} color="#4FC3F7" style={{ marginBottom: Spacing.two }} />
                <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '800' }}>{waterLogged}/{waterGoal}</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>Glasses Water</ThemedText>
                
                {/* Progress bar simulation */}
                <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundElement, marginTop: Spacing.three }]}>
                  <View style={[styles.progressBarFill, { width: `${waterProgress}%`, backgroundColor: '#4FC3F7' }]} />
                </View>
                
                <Pressable style={[styles.addRingBtn, { backgroundColor: 'rgba(79, 195, 247, 0.15)' }]} onPress={handleWaterIncrement}>
                  <Ionicons name="add" size={20} color="#4FC3F7" />
                </Pressable>
              </Card>
              
              <Card variant="elevated" style={[styles.ringWidget, { borderColor: theme.outlineVariant }]}>
                <Ionicons name="moon" size={28} color="#9575CD" style={{ marginBottom: Spacing.two }} />
                <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '800' }}>{sleepLogged}h</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>Logged Sleep</ThemedText>

                <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundElement, marginTop: Spacing.three }]}>
                  <View style={[styles.progressBarFill, { width: `${sleepProgress}%`, backgroundColor: '#9575CD' }]} />
                </View>
                
                <Pressable style={[styles.addRingBtn, { backgroundColor: 'rgba(149, 117, 205, 0.15)' }]} onPress={() => router.push('/log')}>
                  <Ionicons name="add" size={20} color="#9575CD" />
                </Pressable>
              </Card>
            </View>
          </Animated.View>

          {/* Quick Insights Row */}
          <Animated.View entering={FadeInDown.duration(600).delay(400).springify()} style={styles.vitalsRow}>
            <Card variant="filled" style={[styles.vitalCard, { flex: 1, backgroundColor: theme.primaryContainer }]}>
              <View style={[styles.vitalIconWrap, { backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                <Ionicons name="flower" size={20} color={theme.primary} />
              </View>
              <ThemedText type="titleMedium" style={{ color: theme.primary, marginTop: Spacing.two, fontWeight: '800' }}>{fertilityStatus}</ThemedText>
              <ThemedText type="labelSmall" style={{ color: theme.primary, opacity: 0.8 }}>Fertility Window</ThemedText>
            </Card>

            <Card variant="filled" style={[styles.vitalCard, { flex: 1, backgroundColor: theme.tertiaryContainer }]}>
              <View style={[styles.vitalIconWrap, { backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                <Ionicons name="radio-button-on" size={20} color={theme.tertiary} />
              </View>
              <ThemedText type="titleMedium" style={{ color: theme.tertiary, marginTop: Spacing.two, fontWeight: '800' }}>{ovulationText}</ThemedText>
              <ThemedText type="labelSmall" style={{ color: theme.tertiary, opacity: 0.8 }}>Predicted Ovulation</ThemedText>
            </Card>
          </Animated.View>

          {/* Medication Module */}
          {totalMedsCount > 0 && (
            <Animated.View entering={FadeInDown.duration(600).delay(450).springify()} style={styles.sectionContainer}>
              <Pressable onPress={() => router.push('/medicine')}>
                <Card variant="filled" style={[styles.medicationCard, { backgroundColor: theme.secondaryContainer }]}>
                  <View style={[styles.vitalIconWrap, { backgroundColor: 'rgba(255,255,255,0.4)', marginRight: Spacing.three }]}>
                    <Ionicons name="medical" size={20} color={theme.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="titleMedium" style={{ color: theme.onSecondaryContainer, fontWeight: '800' }}>Medications</ThemedText>
                    <ThemedText type="labelMedium" style={{ color: theme.onSecondaryContainer, opacity: 0.8 }}>
                      {takenMedsCount}/{totalMedsCount} taken today
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
                </Card>
              </Pressable>
            </Animated.View>
          )}

          {/* Daily Insight / Quote */}
          <Animated.View entering={FadeInDown.duration(600).delay(500).springify()} style={styles.tipContainer}>
            <GlassView intensity="low" borderRadius={24} style={[styles.tipCard, { borderColor: theme.outlineVariant }]}>
              <Ionicons name="book" size={24} color={theme.primary} style={{ marginRight: Spacing.three }} />
              <View style={{ flex: 1 }}>
                <ThemedText type="titleSmall" style={{ color: theme.text, fontWeight: '800' }}>Daily Insight</ThemedText>
                <ThemedText type="bodyMedium" style={{ color: theme.textSecondary, marginTop: 2, fontStyle: 'italic', lineHeight: 20 }}>"{quote}"</ThemedText>
              </View>
            </GlassView>
          </Animated.View>

        </SafeAreaView>
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View entering={FadeIn.duration(600).delay(600)} style={styles.fabContainer}>
        <Pressable style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={() => router.push('/log')}>
          <Ionicons name="add" size={36} color={theme.onPrimary} />
        </Pressable>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: BottomTabInset + Spacing.six },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.five, paddingTop: Spacing.two, marginBottom: Spacing.four },
  aiShortcut: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  calendarStrip: { marginBottom: Spacing.six },
  calendarScroll: { paddingHorizontal: Spacing.five, gap: Spacing.three },
  calendarDay: { width: 50, height: 68, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  calendarDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff', marginTop: 4 },
  heroContainer: { paddingHorizontal: Spacing.five, marginBottom: Spacing.six, alignItems: 'center' },
  heroRingCard: { width: width - (Spacing.five * 2), aspectRatio: 1.15, borderRadius: 36, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 30, elevation: 10, overflow: 'hidden' },
  ringInner: { width: '78%', height: '78%', borderRadius: 300, borderWidth: 8, borderColor: 'rgba(255, 255, 255, 0.4)', backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  ringContent: { alignItems: 'center' },
  ringLabel: { color: '#fff', fontSize: 11, letterSpacing: 2, fontWeight: '900', opacity: 0.9 },
  ringNumber: { color: '#fff', fontSize: 80, fontWeight: '900', lineHeight: 84 },
  ringPeriodText: { color: '#fff', fontSize: 16, opacity: 0.9, fontWeight: '700' },
  ringSubBadge: { position: 'absolute', bottom: -12, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.35)' },
  sectionContainer: { paddingHorizontal: Spacing.five, marginBottom: Spacing.six },
  ringsGrid: { flexDirection: 'row', gap: Spacing.four },
  ringWidget: { flex: 1, padding: Spacing.four, borderRadius: 28, position: 'relative' },
  progressBarBg: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  addRingBtn: { position: 'absolute', top: Spacing.four, right: Spacing.four, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  vitalsRow: { flexDirection: 'row', paddingHorizontal: Spacing.five, gap: Spacing.four, marginBottom: Spacing.six },
  vitalCard: { padding: Spacing.four, borderRadius: 28 },
  vitalIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  medicationCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.four, borderRadius: 28 },
  tipContainer: { paddingHorizontal: Spacing.five, marginBottom: Spacing.four },
  tipCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.five, borderWidth: 1 },
  fabContainer: { position: 'absolute', right: Spacing.five, bottom: BottomTabInset + 10, zIndex: 100 },
  fab: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 12 },
});
