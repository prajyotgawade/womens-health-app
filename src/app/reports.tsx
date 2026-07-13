import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming, Easing, SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { format, differenceInDays, parseISO, subDays } from 'date-fns';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const { width } = Dimensions.get('window');
const MAX_BAR_HEIGHT = 130;

function BarColumn({ data, progress, theme }: { data: { month: string; length: number }; progress: SharedValue<number>; theme: any }) {
  const targetHeight = (data.length / 35) * MAX_BAR_HEIGHT;

  const rStyle = useAnimatedStyle(() => ({
    height: progress.value * targetHeight,
    opacity: 0.4 + progress.value * 0.6,
  }));

  return (
    <View style={styles.barColumn}>
      <ThemedText style={{ color: theme.text, marginBottom: 6, fontWeight: '800', fontSize: 11 }}>
        {data.length}d
      </ThemedText>
      <Animated.View style={[styles.bar, { backgroundColor: theme.primary }, rStyle]} />
      <ThemedText style={{ color: theme.textSecondary, marginTop: 6, fontWeight: '600', fontSize: 10 }}>
        {data.month}
      </ThemedText>
    </View>
  );
}

function SymptomBar({ symptom, index, theme }: { symptom: { name: string; pct: number }; index: number; theme: any }) {
  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withTiming(symptom.pct / 100, { duration: 1000 + index * 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
  }, [symptom.pct]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }));

  const colors = [theme.primary, '#E91E63', '#2A9D8F'];
  const color = colors[index % colors.length];

  return (
    <View style={styles.symptomRow}>
      <View style={styles.symptomLabelRow}>
        <ThemedText style={{ color: theme.text, fontWeight: '700', fontSize: 13, flex: 1 }}>{symptom.name}</ThemedText>
        <ThemedText style={{ color: color, fontWeight: '800', fontSize: 13 }}>{symptom.pct}%</ThemedText>
      </View>
      <View style={[styles.symptomBg, { backgroundColor: `${color}15` }]}>
        <Animated.View style={[styles.symptomFill, { backgroundColor: color }, barStyle]} />
      </View>
    </View>
  );
}

export default function ReportsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const user = session?.user;

  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [healthScore, setHealthScore] = useState(90);
  const [cycleData, setCycleData] = useState<{ month: string; length: number }[]>([]);
  const [topSymptoms, setTopSymptoms] = useState<{ name: string; pct: number }[]>([]);
  const [avgCycleLen, setAvgCycleLen] = useState(28);
  const [logStreak, setLogStreak] = useState(14);

  const progress = useSharedValue(0);

  useEffect(() => {
    fetchReportData();
  }, [user]);

  const fetchReportData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: cycles } = await supabase
        .from('cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true })
        .limit(6);

      const computedCycles: { month: string; length: number }[] = [];
      let totalLen = 0;
      if (cycles && cycles.length > 0) {
        cycles.forEach((c) => {
          if (c.end_date) {
            const start = parseISO(c.start_date);
            const end = parseISO(c.end_date);
            const length = differenceInDays(end, start) + 1;
            totalLen += length;
            computedCycles.push({ month: format(start, 'MMM'), length: Math.min(60, Math.max(15, length)) });
          }
        });
        if (computedCycles.length > 0) setAvgCycleLen(Math.round(totalLen / computedCycles.length));
      }

      if (computedCycles.length === 0) {
        setCycleData([
          { month: 'Feb', length: 28 }, { month: 'Mar', length: 29 },
          { month: 'Apr', length: 27 }, { month: 'May', length: 28 },
          { month: 'Jun', length: 28 }, { month: 'Jul', length: 28 },
        ]);
      } else {
        setCycleData(computedCycles);
      }

      const { data: symptoms } = await supabase.from('symptoms').select('symptom_type').eq('user_id', user.id);

      if (symptoms && symptoms.length > 0) {
        const counts: any = {};
        symptoms.forEach(s => { counts[s.symptom_type] = (counts[s.symptom_type] || 0) + 1; });
        const sorted = Object.keys(counts)
          .map(k => ({ name: k, pct: Math.round((counts[k] / symptoms.length) * 100) }))
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 3);
        setTopSymptoms(sorted);
      } else {
        setTopSymptoms([
          { name: 'Cramps', pct: 45 },
          { name: 'Bloating', pct: 30 },
          { name: 'Fatigue', pct: 25 },
        ]);
      }

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0];
      const { data: logsCount } = await supabase.from('symptoms').select('date').eq('user_id', user.id).gte('date', thirtyDaysAgo);

      const uniqueDates = new Set(logsCount?.map(l => l.date));
      const logPct = Math.round((uniqueDates.size / 30) * 100);
      setHealthScore(Math.max(60, Math.min(100, 60 + Math.round(logPct * 0.4))));
      setLogStreak(Math.max(1, uniqueDates.size));

      progress.value = withTiming(1, { duration: 1400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    } catch (e) {
      console.warn('Error loading reports analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsExporting(true);
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', sans-serif; padding: 40px; color: #1c1c1e; background: #fafafa; }
              .header { border-bottom: 3px solid #6E56CF; padding-bottom: 20px; margin-bottom: 30px; }
              h1 { color: #6E56CF; margin: 0; font-size: 26px; }
              .subtitle { color: #8e8e93; margin-top: 8px; font-size: 14px; }
              .card { border: 1px solid #e5e5ea; padding: 24px; border-radius: 20px; margin-bottom: 20px; background: #fff; }
              .card h2 { margin: 0 0 16px; color: #6E56CF; font-size: 18px; }
              .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f2f2f7; }
              .row:last-child { border: none; }
              .score { font-size: 64px; font-weight: 900; color: #6E56CF; }
              .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
              .stat { background: #F3F0FF; padding: 16px; border-radius: 14px; text-align: center; }
              .stat-val { font-size: 28px; font-weight: 900; color: #6E56CF; }
              .stat-lbl { font-size: 11px; color: #8e8e93; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Aura Clinical Report</h1>
              <div class="subtitle">Generated on ${new Date().toLocaleDateString()} · Confidential Health Data</div>
            </div>
            <div class="stats-grid">
              <div class="stat"><div class="stat-val">${healthScore}</div><div class="stat-lbl">Health Score</div></div>
              <div class="stat"><div class="stat-val">${avgCycleLen}d</div><div class="stat-lbl">Avg Cycle</div></div>
              <div class="stat"><div class="stat-val">${logStreak}</div><div class="stat-lbl">Days Logged</div></div>
              <div class="stat"><div class="stat-val">${cycleData.length}</div><div class="stat-lbl">Cycles Tracked</div></div>
            </div>
            <div class="card">
              <h2>Cycle Length History</h2>
              ${cycleData.map(d => `<div class="row"><span>${d.month}</span><strong>${d.length} Days</strong></div>`).join('')}
            </div>
            <div class="card">
              <h2>Top Reported Symptoms</h2>
              ${topSymptoms.map(s => `<div class="row"><span>${s.name}</span><strong>${s.pct}% of logs</strong></div>`).join('')}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={{ width: 44 }} />
            <Skeleton width={200} height={24} borderRadius={12} />
            <View style={{ width: 44 }} />
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Skeleton width="100%" height={180} borderRadius={24} style={{ marginBottom: Spacing.five }} />
            <Skeleton width="100%" height={200} borderRadius={24} style={{ marginBottom: Spacing.five }} />
            <Skeleton width="100%" height={160} borderRadius={24} />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const scoreColor = healthScore >= 85 ? '#66BB6A' : healthScore >= 70 ? '#FFA726' : '#EF5350';
  const scoreLabel = healthScore >= 85 ? 'Excellent' : healthScore >= 70 ? 'Good' : 'Needs Attention';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <ThemedText style={{ color: theme.text, fontWeight: '800', fontSize: 17 }}>Analytics & Reports</ThemedText>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Health Score Card */}
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.section}>
            <LinearGradient
              colors={[theme.primary, theme.tertiary || theme.secondary || theme.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scoreCard}
            >
              <View style={styles.scoreInner}>
                <View>
                  <ThemedText style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    Health Score
                  </ThemedText>
                  <ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 64, lineHeight: 72, letterSpacing: -2, marginTop: 4 }}>
                    {healthScore}
                  </ThemedText>
                  <View style={[styles.scoreBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <ThemedText style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{scoreLabel}</ThemedText>
                  </View>
                </View>
                <View style={styles.scoreRight}>
                  <View style={[styles.scoreRing, { borderColor: 'rgba(255,255,255,0.3)' }]}>
                    <Ionicons name="trending-up" size={28} color="rgba(255,255,255,0.9)" />
                  </View>
                  <ThemedText style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 8 }}>
                    30-day{'\n'}tracking
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 12, lineHeight: 17 }}>
                Based on symptom logging consistency. Log daily to improve your score.
              </ThemedText>
            </LinearGradient>
          </Animated.View>

          {/* Quick Stats */}
          <Animated.View entering={FadeInDown.duration(600).delay(100).springify()} style={[styles.section, styles.statsRow]}>
            {[
              { label: 'Avg Cycle', value: `${avgCycleLen}d`, icon: 'refresh-outline', color: theme.primary },
              { label: 'Days Logged', value: `${logStreak}`, icon: 'calendar-outline', color: '#2A9D8F' },
              { label: 'Cycles', value: `${cycleData.length}`, icon: 'analytics-outline', color: '#E91E63' },
            ].map((stat) => (
              <View key={stat.label} style={[styles.statBox, { backgroundColor: theme.surface }]}>
                <View style={[styles.statIcon, { backgroundColor: `${stat.color}18` }]}>
                  <Ionicons name={stat.icon as any} size={14} color={stat.color} />
                </View>
                <ThemedText style={{ color: theme.text, fontWeight: '900', fontSize: 20, marginTop: 6 }}>{stat.value}</ThemedText>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 10, fontWeight: '600', marginTop: 2 }}>{stat.label}</ThemedText>
              </View>
            ))}
          </Animated.View>

          {/* Cycle Trends Chart */}
          <Animated.View entering={FadeInDown.duration(600).delay(200).springify()} style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Cycle Length Trends</ThemedText>
            <View style={[styles.chartCard, { backgroundColor: theme.surface }]}>
              <View style={styles.chartContainer}>
                <View style={[styles.chartGrid, { borderBottomColor: theme.backgroundElement }]} />
                <View style={styles.barsContainer}>
                  {cycleData.map((data, i) => (
                    <BarColumn key={i} data={data} progress={progress} theme={theme} />
                  ))}
                </View>
              </View>
              <View style={[styles.chartFooter, { borderTopColor: theme.backgroundElement }]}>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600' }}>
                  Average: {avgCycleLen} days per cycle
                </ThemedText>
              </View>
            </View>
          </Animated.View>

          {/* Top Symptoms */}
          <Animated.View entering={FadeInDown.duration(600).delay(300).springify()} style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Frequent Symptoms</ThemedText>
            <View style={[styles.symptomsCard, { backgroundColor: theme.surface }]}>
              {topSymptoms.map((s, idx) => (
                <SymptomBar key={idx} symptom={s} index={idx} theme={theme} />
              ))}
            </View>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      <Animated.View entering={FadeInDown.duration(600).delay(400)} style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.backgroundElement }]}>
        <Button
          label={isExporting ? "Generating PDF..." : "Export Clinical PDF"}
          variant="filled"
          onPress={exportPDF}
          disabled={isExporting}
          style={{ borderRadius: 18 }}
        />
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three + 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 100,
  },
  section: {
    marginBottom: Spacing.four + 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.6,
    marginBottom: Spacing.three,
  },

  scoreCard: {
    borderRadius: 28,
    padding: Spacing.five,
    shadowColor: '#6E56CF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  scoreInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  scoreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  scoreRight: {
    alignItems: 'center',
  },
  scoreRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
  statBox: {
    flex: 1,
    borderRadius: 20,
    padding: Spacing.three,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chartCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  chartContainer: {
    height: MAX_BAR_HEIGHT + 60,
    justifyContent: 'flex-end',
    paddingTop: Spacing.four,
  },
  chartGrid: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    borderBottomWidth: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.three,
  },
  barColumn: { alignItems: 'center' },
  bar: {
    width: 28,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  chartFooter: {
    padding: Spacing.four,
    borderTopWidth: 1,
  },

  symptomsCard: {
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  symptomRow: { gap: 8 },
  symptomLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  symptomBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  symptomFill: {
    height: '100%',
    borderRadius: 4,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.four,
    paddingBottom: Platform.OS === 'ios' ? Spacing.six : Spacing.four,
    borderTopWidth: 1,
  },
});
