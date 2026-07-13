import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Pressable, ActivityIndicator, Dimensions, useColorScheme } from 'react-native';
import { CalendarProvider, ExpandableCalendar } from 'react-native-calendars';
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
import { Button } from '@/components/ui/button';
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
        <View style={{ paddingHorizontal: Spacing.five }}>
          <ThemedText style={{ color: theme.primary, fontWeight: '900', letterSpacing: -1, fontSize: 28 }}>
            Calendar
          </ThemedText>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500', marginTop: 2 }}>
            {format(new Date(), 'MMMM yyyy')}
          </ThemedText>
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
          <View style={[styles.legendContainer, { marginTop: Spacing.three, marginBottom: Spacing.two }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.calendar.period }]} />
              <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700', fontSize: 10 }}>Period</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.calendar.predicted }]} />
              <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700', fontSize: 10 }}>Predicted</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.calendar.ovulation }]} />
              <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700', fontSize: 10 }}>Ovulation</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.calendar.fertile }]} />
              <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700', fontSize: 10 }}>Fertile</ThemedText>
            </View>
          </View>

          <View style={styles.agendaHeader}>
            <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '800', fontSize: 18 }}>
              {format(parseISO(selectedDate), 'MMMM d, yyyy')}
            </ThemedText>
          </View>

          <Animated.View layout={Layout.springify()} style={styles.summaryContainer}>
            {selectedDaySummary.hasData ? (
              <View style={styles.summaryGrid}>
                {selectedDaySummary.moods.map((m, idx) => (
                  <Card key={`mood-${idx}`} variant="elevated" style={[styles.summaryCard, { borderColor: theme.outlineVariant }]}>
                    <Ionicons name="happy" size={24} color={theme.primary} style={styles.cardIcon} />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700', fontSize: 9 }}>MOOD</ThemedText>
                      <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{m}</ThemedText>
                    </View>
                  </Card>
                ))}

                {selectedDaySummary.symptoms.map((s, idx) => (
                  <Card key={`symp-${idx}`} variant="elevated" style={[styles.summaryCard, { borderColor: theme.outlineVariant }]}>
                    <Ionicons name="medical" size={24} color={theme.tertiary} style={styles.cardIcon} />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700', fontSize: 9 }}>SYMPTOM</ThemedText>
                      <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{s}</ThemedText>
                    </View>
                  </Card>
                ))}

                {selectedDaySummary.water > 0 && (
                  <Card variant="elevated" style={[styles.summaryCard, { borderColor: theme.outlineVariant }]}>
                    <Ionicons name="water" size={24} color="#4FC3F7" style={styles.cardIcon} />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700', fontSize: 9 }}>HYDRATION</ThemedText>
                      <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{Math.round(selectedDaySummary.water)} glasses</ThemedText>
                    </View>
                  </Card>
                )}

                {selectedDaySummary.sleep > 0 && (
                  <Card variant="elevated" style={[styles.summaryCard, { borderColor: theme.outlineVariant }]}>
                    <Ionicons name="moon" size={24} color="#9575CD" style={styles.cardIcon} />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="labelSmall" style={{ color: theme.textSecondary, fontWeight: '700', fontSize: 9 }}>SLEEP</ThemedText>
                      <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>{selectedDaySummary.sleep} hours</ThemedText>
                    </View>
                  </Card>
                )}

                {selectedDaySummary.notes.map((n, idx) => (
                  <Card key={`note-${idx}`} variant="elevated" style={[styles.noteCard, { width: '100%', borderColor: theme.outlineVariant }]}>
                    <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginBottom: 4, fontWeight: '700', fontSize: 9 }}>NOTES</ThemedText>
                    <ThemedText type="bodyMedium" style={{ color: theme.text, lineHeight: 18, fontSize: 13 }}>{n}</ThemedText>
                  </Card>
                ))}
              </View>
            ) : (
              <GlassView intensity="low" borderRadius={20} style={[styles.emptySummaryCard, { borderColor: theme.outlineVariant }]}>
                <Ionicons name="add-circle" size={32} color={theme.textSecondary} style={{ opacity: 0.3, marginBottom: 8 }} />
                <ThemedText type="titleMedium" style={{ color: theme.textSecondary, textAlign: 'center', fontWeight: '700', fontSize: 14, marginBottom: 12 }}>
                  No logs for this day
                </ThemedText>
                <Button 
                  label="Log Details" 
                  variant="filled" 
                  onPress={() => router.push('/log')}
                  style={{ height: 40, borderRadius: 20, paddingHorizontal: 24 }}
                  labelStyle={{ fontSize: 13, fontWeight: '700' }}
                />
              </GlassView>
            )}
          </Animated.View>

          <View style={styles.statsSection}>
            <ThemedText type="titleLarge" style={{ color: theme.text, paddingHorizontal: Spacing.five, fontWeight: '800', marginBottom: Spacing.three, fontSize: 16 }}>
              Cycle Insights
            </ThemedText>
            
            <View style={styles.statsGrid}>
              <Card variant="filled" style={[styles.statBox, { backgroundColor: theme.surface }]}>
                <ThemedText type="displaySmall" style={{ color: theme.primary, fontWeight: '900', fontSize: 22 }}>{stats.avgCycle}d</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: 2, fontWeight: '700', fontSize: 10 }}>Cycle Length</ThemedText>
              </Card>

              <Card variant="filled" style={[styles.statBox, { backgroundColor: theme.surface }]}>
                <ThemedText type="displaySmall" style={{ color: theme.primary, fontWeight: '900', fontSize: 22 }}>{stats.avgPeriod}d</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: 2, fontWeight: '700', fontSize: 10 }}>Period Length</ThemedText>
              </Card>

              <Card variant="filled" style={[styles.statBox, { backgroundColor: theme.surface }]}>
                <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>{stats.isIrregular ? 'Irregular' : 'Regular'}</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: 2, fontWeight: '700', fontSize: 10 }}>Consistency</ThemedText>
              </Card>

              <Card variant="filled" style={[styles.statBox, { backgroundColor: theme.surface }]}>
                <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>{stats.nextPeriod}</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: 2, fontWeight: '700', fontSize: 10 }}>Next Period</ThemedText>
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
  header: { paddingBottom: Spacing.two },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.five, marginTop: Spacing.two, gap: Spacing.three },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  calendarWrap: { paddingBottom: Spacing.one, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  scrollContent: { paddingBottom: BottomTabInset + Spacing.six },
  agendaHeader: { paddingHorizontal: Spacing.five, paddingTop: Spacing.four, paddingBottom: Spacing.two },
  summaryContainer: { paddingHorizontal: Spacing.five, marginBottom: Spacing.five },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, borderRadius: 20, width: (width - Spacing.five * 2 - 10) / 2, borderWidth: 1 },
  noteCard: { padding: Spacing.four, borderRadius: 20, borderWidth: 1 },
  cardIcon: { marginRight: Spacing.two },
  emptySummaryCard: { padding: Spacing.five, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed' },
  quickLogBtn: { marginTop: Spacing.three, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: 20 },
  statsSection: { marginTop: Spacing.one },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.five, gap: 10 },
  statBox: { width: (width - (Spacing.five * 2) - 10) / 2, padding: Spacing.four, borderRadius: 20, justifyContent: 'center' },
});
