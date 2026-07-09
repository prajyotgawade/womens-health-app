import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Pressable, ActivityIndicator, Dimensions, useColorScheme } from 'react-native';
import { CalendarProvider, ExpandableCalendar, AgendaList } from 'react-native-calendars';
import { format, addDays, parseISO, isSameDay, differenceInDays } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

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
const todayStr = format(new Date(), 'yyyy-MM-dd');

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
  
  const [stats, setStats] = useState({ avgCycle: 28, avgPeriod: 5, isIrregular: false, nextPeriod: 'None' });

  useEffect(() => {
    fetchCalendarData();
  }, [user]);

  const fetchCalendarData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: cyclesData } = await supabase.from('cycles').select('*').eq('user_id', user.id).order('start_date', { ascending: false });
      if (cyclesData) setCycles(cyclesData);

      const [s, m, n, w, sl] = await Promise.all([
        supabase.from('symptoms').select('*').eq('user_id', user.id),
        supabase.from('moods').select('*').eq('user_id', user.id),
        supabase.from('notes').select('*').eq('user_id', user.id),
        supabase.from('water_logs').select('*').eq('user_id', user.id),
        supabase.from('sleep_logs').select('*').eq('user_id', user.id),
      ]);

      if (s.data) setSymptomLogs(s.data);
      if (m.data) setMoodLogs(m.data);
      if (n.data) setNoteLogs(n.data);
      if (w.data) setWaterLogs(w.data);
      if (sl.data) setSleepLogs(sl.data);

      if (cyclesData && cyclesData.length > 0) {
        const preds = generatePredictions(cyclesData.map(c => ({ startDate: c.start_date, endDate: c.end_date })));
        if (preds) {
          setStats({
            avgCycle: preds.averageCycleLength,
            avgPeriod: preds.averagePeriodLength,
            isIrregular: preds.isIrregular,
            nextPeriod: format(preds.nextPeriodStart, 'MMM dd'),
          });
        }
      }
    } catch (e) { } finally { setLoading(false); }
  };

  const markedDates = useMemo(() => {
    const dates: any = {};
    dates[todayStr] = { marked: true, dotColor: theme.calendar.period };

    if (cycles && cycles.length > 0) {
      const preds = generatePredictions(cycles.map(c => ({ startDate: c.start_date, endDate: c.end_date })));

      cycles.forEach(c => {
        const start = parseISO(c.start_date);
        const end = c.end_date ? parseISO(c.end_date) : new Date();
        const diff = differenceInDays(end, start) + 1;
        for (let i = 0; i < diff; i++) {
          const dStr = format(addDays(start, i), 'yyyy-MM-dd');
          dates[dStr] = { startingDay: i === 0, endingDay: i === diff - 1, color: theme.calendar.period, textColor: '#fff', marked: true, dotColor: 'rgba(255, 255, 255, 0.5)' };
        }
      });

      if (preds) {
        const pDiff = differenceInDays(preds.nextPeriodEnd, preds.nextPeriodStart) + 1;
        for (let i = 0; i < pDiff; i++) {
          const dStr = format(addDays(preds.nextPeriodStart, i), 'yyyy-MM-dd');
          dates[dStr] = { ...dates[dStr], startingDay: i === 0, endingDay: i === pDiff - 1, color: theme.calendar.predictedBg, textColor: theme.calendar.predicted };
        }

        const oStr = format(preds.ovulationDate, 'yyyy-MM-dd');
        dates[oStr] = { ...dates[oStr], color: theme.calendar.ovulation, textColor: '#fff', marked: true, dotColor: '#fff' };

        const fDiff = differenceInDays(preds.fertilityWindowEnd, preds.fertilityWindowStart) + 1;
        for (let i = 0; i < fDiff; i++) {
          const dStr = format(addDays(preds.fertilityWindowStart, i), 'yyyy-MM-dd');
          if (!dates[dStr]) dates[dStr] = { color: theme.calendar.fertileBg, textColor: theme.calendar.fertile };
        }
      }
    }
    return dates;
  }, [cycles, theme, isDark]);

  const selectedDaySummary = useMemo(() => {
    const day = parseISO(selectedDate);
    return {
      symptoms: symptomLogs.filter(s => isSameDay(parseISO(s.date), day)).map(s => s.symptom_type),
      moods: moodLogs.filter(m => isSameDay(parseISO(m.date), day)).map(m => m.mood_type),
      notes: noteLogs.filter(n => isSameDay(parseISO(n.date), day)).map(n => n.content),
      water: waterLogs.filter(w => isSameDay(parseISO(w.date), day)).reduce((acc, w) => acc + w.amount_ml, 0) / 250,
      sleep: sleepLogs.filter(s => isSameDay(parseISO(s.date), day)).reduce((acc, s) => acc + Number(s.hours), 0),
      hasData: false
    };
  }, [selectedDate, symptomLogs, moodLogs, noteLogs, waterLogs, sleepLogs]);

  selectedDaySummary.hasData = selectedDaySummary.symptoms.length > 0 || selectedDaySummary.moods.length > 0 || selectedDaySummary.notes.length > 0 || selectedDaySummary.water > 0 || selectedDaySummary.sleep > 0;

  const themeConfig = useMemo(() => ({
    calendarBackground: 'transparent',
    textSectionTitleColor: theme.textSecondary,
    selectedDayBackgroundColor: theme.primary,
    selectedDayTextColor: theme.onPrimary,
    todayTextColor: theme.primary,
    dayTextColor: theme.text,
    textDisabledColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    dotColor: theme.primary,
    selectedDotColor: '#ffffff',
    arrowColor: theme.primary,
    monthTextColor: theme.text,
    textMonthFontWeight: '800' as const,
    textDayFontFamily: 'PlusJakartaSans_600SemiBold',
    textMonthFontFamily: 'PlusJakartaSans_800ExtraBold',
    textDayHeaderFontFamily: 'PlusJakartaSans_700Bold',
  }), [theme, isDark]);

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
        <ThemedText type="displaySmall" style={{ color: theme.primary, paddingHorizontal: Spacing.five, fontWeight: '900', letterSpacing: -1 }}>
          Calendar
        </ThemedText>
        
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.calendar.period }]} />
            <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700' }}>Period</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.calendar.predicted }]} />
            <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700' }}>Predicted</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.calendar.ovulation }]} />
            <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700' }}>Ovulation</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.calendar.fertile }]} />
            <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700' }}>Fertile</ThemedText>
          </View>
        </View>
      </View>

      <CalendarProvider
        date={selectedDate}
        onDateChanged={(date) => { setSelectedDate(date); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        showTodayButton
        theme={{ todayButtonTextColor: theme.primary }}
      >
        <View style={[styles.calendarWrap, { backgroundColor: theme.surface }]}>
          <ExpandableCalendar
            theme={themeConfig}
            firstDay={1}
            markedDates={markedDates}
            markingType="period"
            animateScroll
            closeOnDayPress={false}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.agendaHeader}>
            <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '800' }}>
              {format(parseISO(selectedDate), 'MMMM d, yyyy')}
            </ThemedText>
          </View>

          <Animated.View layout={Layout.springify()} style={styles.summaryContainer}>
            {selectedDaySummary.hasData ? (
              <View style={styles.summaryGrid}>
                {selectedDaySummary.moods.map((m, idx) => (
                  <Card key={`mood-${idx}`} variant="elevated" style={[styles.summaryCard, { borderColor: theme.outlineVariant }]}>
                    <Ionicons name="happy" size={28} color={theme.primary} style={styles.cardIcon} />
                    <View>
                      <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700' }}>MOOD</ThemedText>
                      <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '800' }}>{m}</ThemedText>
                    </View>
                  </Card>
                ))}

                {selectedDaySummary.symptoms.map((s, idx) => (
                  <Card key={`symp-${idx}`} variant="elevated" style={[styles.summaryCard, { borderColor: theme.outlineVariant }]}>
                    <Ionicons name="medical" size={28} color={theme.tertiary} style={styles.cardIcon} />
                    <View>
                      <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700' }}>SYMPTOM</ThemedText>
                      <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '800' }}>{s}</ThemedText>
                    </View>
                  </Card>
                ))}

                {selectedDaySummary.water > 0 && (
                  <Card variant="elevated" style={[styles.summaryCard, { borderColor: theme.outlineVariant }]}>
                    <Ionicons name="water" size={28} color="#4FC3F7" style={styles.cardIcon} />
                    <View>
                      <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700' }}>HYDRATION</ThemedText>
                      <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '800' }}>{Math.round(selectedDaySummary.water)} glasses</ThemedText>
                    </View>
                  </Card>
                )}

                {selectedDaySummary.sleep > 0 && (
                  <Card variant="elevated" style={[styles.summaryCard, { borderColor: theme.outlineVariant }]}>
                    <Ionicons name="moon" size={28} color="#9575CD" style={styles.cardIcon} />
                    <View>
                      <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700' }}>SLEEP</ThemedText>
                      <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '800' }}>{selectedDaySummary.sleep} hours</ThemedText>
                    </View>
                  </Card>
                )}

                {selectedDaySummary.notes.map((n, idx) => (
                  <Card key={`note-${idx}`} variant="elevated" style={[styles.noteCard, { width: '100%', borderColor: theme.outlineVariant }]}>
                    <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginBottom: 6, fontWeight: '700' }}>NOTES</ThemedText>
                    <ThemedText type="bodyMedium" style={{ color: theme.text, lineHeight: 22 }}>{n}</ThemedText>
                  </Card>
                ))}
              </View>
            ) : (
              <GlassView intensity="low" borderRadius={28} style={[styles.emptySummaryCard, { borderColor: theme.outlineVariant }]}>
                <Ionicons name="add-circle" size={40} color={theme.textSecondary} style={{ opacity: 0.3, marginBottom: 12 }} />
                <ThemedText type="titleMedium" style={{ color: theme.textSecondary, textAlign: 'center', fontWeight: '700' }}>
                  No logs for this day.
                </ThemedText>
                <Pressable style={[styles.quickLogBtn, { backgroundColor: theme.primaryContainer }]} onPress={() => router.push('/log')}>
                  <ThemedText type="labelMedium" style={{ color: theme.primary, fontWeight: '800' }}>Log Details</ThemedText>
                </Pressable>
              </GlassView>
            )}
          </Animated.View>

          <View style={styles.statsSection}>
            <ThemedText type="titleLarge" style={{ color: theme.text, paddingHorizontal: Spacing.five, fontWeight: '800', marginBottom: Spacing.four }}>
              Cycle Insights
            </ThemedText>
            
            <View style={styles.statsGrid}>
              <Card variant="filled" style={[styles.statBox, { backgroundColor: theme.surface }]}>
                <ThemedText type="displaySmall" style={{ color: theme.primary, fontWeight: '900' }}>{stats.avgCycle}d</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: 4, fontWeight: '700' }}>Cycle Length</ThemedText>
              </Card>

              <Card variant="filled" style={[styles.statBox, { backgroundColor: theme.surface }]}>
                <ThemedText type="displaySmall" style={{ color: theme.primary, fontWeight: '900' }}>{stats.avgPeriod}d</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: 4, fontWeight: '700' }}>Period Length</ThemedText>
              </Card>

              <Card variant="filled" style={[styles.statBox, { backgroundColor: theme.surface }]}>
                <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '800' }}>{stats.isIrregular ? 'Irregular' : 'Regular'}</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: 4, fontWeight: '700' }}>Consistency</ThemedText>
              </Card>

              <Card variant="filled" style={[styles.statBox, { backgroundColor: theme.surface }]}>
                <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '800' }}>{stats.nextPeriod}</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: 4, fontWeight: '700' }}>Next Period</ThemedText>
              </Card>
            </View>
          </View>
        </ScrollView>
      </CalendarProvider>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingBottom: Spacing.three },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.five, marginTop: Spacing.three, gap: Spacing.four },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  calendarWrap: { paddingBottom: Spacing.two, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  scrollContent: { paddingBottom: BottomTabInset + Spacing.six },
  agendaHeader: { paddingHorizontal: Spacing.five, paddingTop: Spacing.five, paddingBottom: Spacing.three },
  summaryContainer: { paddingHorizontal: Spacing.five, marginBottom: Spacing.six },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  summaryCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.four, borderRadius: 24, width: (width - Spacing.five * 2 - Spacing.three) / 2, borderWidth: 1 },
  noteCard: { padding: Spacing.five, borderRadius: 24, borderWidth: 1 },
  cardIcon: { marginRight: Spacing.three },
  emptySummaryCard: { padding: Spacing.six, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed' },
  quickLogBtn: { marginTop: Spacing.four, paddingHorizontal: Spacing.five, paddingVertical: Spacing.three, borderRadius: 24 },
  statsSection: { marginTop: Spacing.two },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.five, gap: Spacing.three },
  statBox: { width: (width - (Spacing.five * 2) - Spacing.three) / 2, padding: Spacing.five, borderRadius: 28, justifyContent: 'center' },
});
