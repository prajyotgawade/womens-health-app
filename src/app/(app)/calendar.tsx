import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Pressable, ActivityIndicator, Dimensions, useColorScheme } from 'react-native';
import { CalendarProvider, ExpandableCalendar } from 'react-native-calendars';
import { format, subDays, addDays, parseISO, isSameDay, differenceInDays } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { GlassView } from '@/components/ui/glass-view';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { generatePredictions } from '@/utils/prediction';

const { width } = Dimensions.get('window');
const TODAY = new Date();
const todayStr = format(TODAY, 'yyyy-MM-dd');

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const user = session?.user;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [cycles, setCycles] = useState<any[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<any[]>([]);
  const [moodLogs, setMoodLogs] = useState<any[]>([]);
  const [noteLogs, setNoteLogs] = useState<any[]>([]);
  const [waterLogs, setWaterLogs] = useState<any[]>([]);
  const [sleepLogs, setSleepLogs] = useState<any[]>([]);
  
  // Predictions statistics
  const [stats, setStats] = useState({
    avgCycle: 28,
    avgPeriod: 5,
    isIrregular: false,
    nextPeriod: 'None',
  });

  useEffect(() => {
    fetchCalendarData();
  }, [user]);

  const fetchCalendarData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch Cycles
      const { data: cyclesData } = await supabase
        .from('cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });
      
      if (cyclesData) setCycles(cyclesData);

      // 2. Fetch all logs for visual dots/markers
      const { data: symptoms } = await supabase.from('symptoms').select('*').eq('user_id', user.id);
      if (symptoms) setSymptomLogs(symptoms);

      const { data: moods } = await supabase.from('moods').select('*').eq('user_id', user.id);
      if (moods) setMoodLogs(moods);

      const { data: notes } = await supabase.from('notes').select('*').eq('user_id', user.id);
      if (notes) setNoteLogs(notes);

      const { data: water } = await supabase.from('water_logs').select('*').eq('user_id', user.id);
      if (water) setWaterLogs(water);

      const { data: sleep } = await supabase.from('sleep_logs').select('*').eq('user_id', user.id);
      if (sleep) setSleepLogs(sleep);

      // 3. Compute stats
      if (cyclesData && cyclesData.length > 0) {
        const cycleInputs = cyclesData.map(c => ({
          startDate: c.start_date,
          endDate: c.end_date,
        }));
        const preds = generatePredictions(cycleInputs);
        if (preds) {
          setStats({
            avgCycle: preds.averageCycleLength,
            avgPeriod: preds.averagePeriodLength,
            isIrregular: preds.isIrregular,
            nextPeriod: format(preds.nextPeriodStart, 'MMM dd, yyyy'),
          });
        }
      }
    } catch (e) {
      console.warn('Error loading calendar logs:', e);
    } finally {
      setLoading(false);
    }
  };

  // Compile calendar markings dynamically
  const markedDates = useMemo(() => {
    const dates: any = {};
    
    // Default today dot
    dates[todayStr] = { marked: true, dotColor: theme.primary };

    if (cycles && cycles.length > 0) {
      const cycleInputs = cycles.map(c => ({
        startDate: c.start_date,
        endDate: c.end_date,
      }));
      const preds = generatePredictions(cycleInputs);

      // 1. Mark past periods from actual logs/cycles
      cycles.forEach(c => {
        const start = parseISO(c.start_date);
        const end = c.end_date ? parseISO(c.end_date) : new Date();
        const diff = differenceInDays(end, start) + 1;
        
        for (let i = 0; i < diff; i++) {
          const dStr = format(addDays(start, i), 'yyyy-MM-dd');
          dates[dStr] = {
            startingDay: i === 0,
            endingDay: i === diff - 1,
            color: '#B64B74', // Primary theme rose
            textColor: '#FFFFFF',
            marked: true,
            dotColor: 'rgba(255, 255, 255, 0.5)',
          };
        }
      });

      // 2. Mark future predicted periods, ovulation, fertility, PMS
      if (preds) {
        // Future Period
        const pStart = preds.nextPeriodStart;
        const pEnd = preds.nextPeriodEnd;
        const pDiff = differenceInDays(pEnd, pStart) + 1;
        for (let i = 0; i < pDiff; i++) {
          const dStr = format(addDays(pStart, i), 'yyyy-MM-dd');
          dates[dStr] = {
            ...dates[dStr],
            startingDay: i === 0,
            endingDay: i === pDiff - 1,
            color: 'rgba(182, 75, 116, 0.3)', // Semi-transparent rose
            textColor: theme.primary,
          };
        }

        // Ovulation
        const oStr = format(preds.ovulationDate, 'yyyy-MM-dd');
        dates[oStr] = {
          ...dates[oStr],
          color: theme.tertiary,
          textColor: '#FFFFFF',
          marked: true,
          dotColor: 'white',
        };

        // Fertility Window
        const fStart = preds.fertilityWindowStart;
        const fEnd = preds.fertilityWindowEnd;
        const fDiff = differenceInDays(fEnd, fStart) + 1;
        for (let i = 0; i < fDiff; i++) {
          const dStr = format(addDays(fStart, i), 'yyyy-MM-dd');
          if (!dates[dStr]) {
            dates[dStr] = {
              color: theme.tertiaryContainer,
              textColor: theme.tertiary,
            };
          }
        }

        // PMS Window
        const pmsStart = preds.pmsStart;
        const pmsEnd = preds.pmsEnd;
        const pmsDiff = differenceInDays(pmsEnd, pmsStart) + 1;
        for (let i = 0; i < pmsDiff; i++) {
          const dStr = format(addDays(pmsStart, i), 'yyyy-MM-dd');
          if (!dates[dStr]) {
            dates[dStr] = {
              color: 'rgba(239, 189, 148, 0.25)', // soft gold cream
              textColor: isDark ? '#EFBD94' : '#7C5635',
            };
          }
        }
      }
    }

    return dates;
  }, [cycles, theme, isDark]);

  // Daily log summary details for the selected date
  const selectedDaySummary = useMemo(() => {
    const day = parseISO(selectedDate);
    const symptoms = symptomLogs.filter(s => isSameDay(parseISO(s.date), day)).map(s => s.symptom_type);
    const moods = moodLogs.filter(m => isSameDay(parseISO(m.date), day)).map(m => m.mood_type);
    const notes = noteLogs.filter(n => isSameDay(parseISO(n.date), day)).map(n => n.content);
    const water = waterLogs.filter(w => isSameDay(parseISO(w.date), day)).reduce((acc, w) => acc + w.amount_ml, 0);
    const sleep = sleepLogs.filter(s => isSameDay(parseISO(s.date), day)).reduce((acc, s) => acc + Number(s.hours), 0);

    const hasData = symptoms.length > 0 || moods.length > 0 || notes.length > 0 || water > 0 || sleep > 0;

    return {
      symptoms,
      moods,
      notes,
      water: water > 0 ? Math.round(water / 250) : 0,
      sleep,
      hasData,
    };
  }, [selectedDate, symptomLogs, moodLogs, noteLogs, waterLogs, sleepLogs]);

  const themeConfig = useMemo(() => {
    return {
      calendarBackground: theme.background,
      textSectionTitleColor: theme.textSecondary,
      selectedDayBackgroundColor: theme.primary,
      selectedDayTextColor: theme.onPrimary,
      todayTextColor: theme.primary,
      dayTextColor: theme.text,
      textDisabledColor: 'rgba(150,150,150,0.15)',
      dotColor: theme.primary,
      selectedDotColor: '#ffffff',
      arrowColor: theme.primary,
      monthTextColor: theme.text,
      textMonthFontWeight: 'bold' as const,
      textDayFontFamily: 'PlusJakartaSans_500Medium',
      textMonthFontFamily: 'PlusJakartaSans_700Bold',
      textDayHeaderFontFamily: 'PlusJakartaSans_600SemiBold',
      'stylesheet.calendar.header': {
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingLeft: 10,
          paddingRight: 10,
          marginTop: 6,
          alignItems: 'center'
        },
      }
    };
  }, [theme]);

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <ThemedText type="displaySmall" style={{ color: theme.primary, paddingHorizontal: Spacing.four, fontWeight: '800' }}>
          Calendar
        </ThemedText>
        
        {/* Interactive Legends */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
            <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>Period</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.tertiary }]} />
            <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>Ovulation</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.tertiaryContainer }]} />
            <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>Fertile Window</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(239, 189, 148, 0.3)' }]} />
            <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>PMS</ThemedText>
          </View>
        </View>
      </View>

      <CalendarProvider
        date={selectedDate}
        onDateChanged={(date) => {
          setSelectedDate(date);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        showTodayButton
        theme={{ todayButtonTextColor: theme.primary }}
      >
        <ExpandableCalendar
          theme={themeConfig}
          firstDay={1}
          markedDates={markedDates}
          markingType="period"
          animateScroll
          closeOnDayPress={false}
          style={styles.calendar}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Daily Summary Sheet */}
          <View style={styles.agendaHeader}>
            <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '700' }}>
              Logged on {format(parseISO(selectedDate), 'MMMM d, yyyy')}
            </ThemedText>
          </View>

          <Animated.View layout={Layout.springify()} style={styles.summaryContainer}>
            {selectedDaySummary.hasData ? (
              <View style={styles.summaryList}>
                {selectedDaySummary.moods.map((m, idx) => (
                  <Card key={`mood-${idx}`} variant="elevated" style={styles.summaryCard}>
                    <Ionicons name="happy-outline" size={24} color={theme.tertiary} style={styles.cardIcon} />
                    <View>
                      <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>MOOD</ThemedText>
                      <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '600' }}>{m}</ThemedText>
                    </View>
                  </Card>
                ))}

                {selectedDaySummary.symptoms.map((s, idx) => (
                  <Card key={`symp-${idx}`} variant="elevated" style={styles.summaryCard}>
                    <Ionicons name="medical-outline" size={24} color={theme.primary} style={styles.cardIcon} />
                    <View>
                      <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>SYMPTOM</ThemedText>
                      <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '600' }}>{s}</ThemedText>
                    </View>
                  </Card>
                ))}

                {selectedDaySummary.water > 0 && (
                  <Card variant="elevated" style={styles.summaryCard}>
                    <Ionicons name="water-outline" size={24} color="#4FC3F7" style={styles.cardIcon} />
                    <View>
                      <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>HYDRATION</ThemedText>
                      <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '600' }}>
                        {selectedDaySummary.water} glasses ({selectedDaySummary.water * 250} ml)
                      </ThemedText>
                    </View>
                  </Card>
                )}

                {selectedDaySummary.sleep > 0 && (
                  <Card variant="elevated" style={styles.summaryCard}>
                    <Ionicons name="moon-outline" size={24} color="#9575CD" style={styles.cardIcon} />
                    <View>
                      <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>SLEEP</ThemedText>
                      <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '600' }}>
                        {selectedDaySummary.sleep} hours
                      </ThemedText>
                    </View>
                  </Card>
                )}

                {selectedDaySummary.notes.map((n, idx) => (
                  <Card key={`note-${idx}`} variant="elevated" style={styles.noteCard}>
                    <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginBottom: 4 }}>NOTES & LOGS</ThemedText>
                    <ThemedText type="bodyMedium" style={{ color: theme.text }}>{n}</ThemedText>
                  </Card>
                ))}
              </View>
            ) : (
              <GlassView intensity="low" borderRadius={24} style={[styles.emptySummaryCard, { borderColor: theme.outlineVariant }]}>
                <Ionicons name="sparkles-outline" size={32} color={theme.textSecondary} style={{ opacity: 0.6, marginBottom: 8 }} />
                <ThemedText type="titleMedium" style={{ color: theme.textSecondary, textAlign: 'center', opacity: 0.8 }}>
                  No symptoms or goals logged for this day.
                </ThemedText>
                <Pressable 
                  style={[styles.quickLogBtn, { backgroundColor: theme.primaryContainer }]}
                  onPress={() => router.push('/log')}
                >
                  <ThemedText type="labelMedium" style={{ color: theme.primary, fontWeight: '700' }}>
                    Log Daily Stats
                  </ThemedText>
                </Pressable>
              </GlassView>
            )}
          </Animated.View>

          {/* Cycle Stats Block */}
          <View style={styles.statsSection}>
            <ThemedText type="titleLarge" style={{ color: theme.text, paddingHorizontal: Spacing.four, fontWeight: '700', marginBottom: Spacing.three }}>
              Cycle Insights
            </ThemedText>
            
            <View style={styles.statsGrid}>
              <Card variant="filled" style={styles.statBox}>
                <ThemedText type="titleLarge" style={{ color: theme.primary, fontWeight: '800', fontSize: 32 }}>
                  {stats.avgCycle}d
                </ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: 4 }}>
                  Avg Cycle Length
                </ThemedText>
              </Card>

              <Card variant="filled" style={styles.statBox}>
                <ThemedText type="titleLarge" style={{ color: theme.primary, fontWeight: '800', fontSize: 32 }}>
                  {stats.avgPeriod}d
                </ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: 4 }}>
                  Avg Period Length
                </ThemedText>
              </Card>

              <Card variant="filled" style={styles.statBox}>
                <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '700' }}>
                  {stats.isIrregular ? 'Irregular' : 'Highly Regular'}
                </ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: 4 }}>
                  Cycle Consistency
                </ThemedText>
              </Card>

              <Card variant="filled" style={styles.statBox}>
                <ThemedText type="titleSmall" style={{ color: theme.text, fontWeight: '700' }}>
                  {stats.nextPeriod}
                </ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: 4 }}>
                  Predicted Start
                </ThemedText>
              </Card>
            </View>
          </View>

        </ScrollView>
      </CalendarProvider>
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
  header: {
    paddingBottom: Spacing.three,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.two,
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  scrollContent: {
    paddingBottom: 130,
  },
  agendaHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.two,
  },
  summaryContainer: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.five,
  },
  summaryList: {
    gap: Spacing.three,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  noteCard: {
    padding: Spacing.four,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardIcon: {
    marginRight: Spacing.three,
  },
  emptySummaryCard: {
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  quickLogBtn: {
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 20,
  },
  statsSection: {
    marginTop: Spacing.two,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  statBox: {
    width: (width - (Spacing.four * 2) - Spacing.three) / 2,
    padding: Spacing.four,
    borderRadius: 20,
    justifyContent: 'center',
  },
});
