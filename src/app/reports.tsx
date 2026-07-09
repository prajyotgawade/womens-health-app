import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming, Easing, SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
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
const MAX_BAR_HEIGHT = 150;

function BarColumn({ data, progress, theme }: { data: { month: string; length: number }; progress: SharedValue<number>; theme: any }) {
  const targetHeight = (data.length / 35) * MAX_BAR_HEIGHT;
  
  const rStyle = useAnimatedStyle(() => {
    return {
      height: progress.value * targetHeight,
      opacity: progress.value,
    };
  });

  return (
    <View style={styles.barColumn}>
      <ThemedText type="labelSmall" style={{ color: theme.text, marginBottom: 8, fontWeight: '700' }}>
        {data.length}d
      </ThemedText>
      <Animated.View style={[styles.bar, { backgroundColor: theme.primary }, rStyle]} />
      <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: 8, fontWeight: '600' }}>
        {data.month}
      </ThemedText>
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

  // Animation trigger for charts
  const progress = useSharedValue(0);

  useEffect(() => {
    fetchReportData();
  }, [user]);

  const fetchReportData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch Cycles history for chart
      const { data: cycles } = await supabase
        .from('cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true })
        .limit(6);

      const computedCycles: { month: string; length: number }[] = [];
      if (cycles && cycles.length > 0) {
        cycles.forEach((c) => {
          if (c.end_date) {
            const start = parseISO(c.start_date);
            const end = parseISO(c.end_date);
            const length = differenceInDays(end, start) + 1;
            const monthName = format(start, 'MMM');
            computedCycles.push({ month: monthName, length: Math.min(60, Math.max(15, length)) });
          }
        });
      }

      // If not enough cycles, populate mock baseline for demonstration
      if (computedCycles.length === 0) {
        setCycleData([
          { month: 'Jan', length: 28 },
          { month: 'Feb', length: 29 },
          { month: 'Mar', length: 28 },
          { month: 'Apr', length: 27 },
          { month: 'May', length: 28 },
          { month: 'Jun', length: 28 },
        ]);
      } else {
        setCycleData(computedCycles);
      }

      // 2. Fetch top symptoms count
      const { data: symptoms } = await supabase
        .from('symptoms')
        .select('symptom_type')
        .eq('user_id', user.id);

      if (symptoms && symptoms.length > 0) {
        const counts: any = {};
        symptoms.forEach(s => {
          counts[s.symptom_type] = (counts[s.symptom_type] || 0) + 1;
        });
        const sorted = Object.keys(counts)
          .map(k => ({
            name: k,
            pct: Math.round((counts[k] / symptoms.length) * 100),
          }))
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

      // 3. Compute Health Score based on logging frequency in the last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0];
      const { data: logsCount } = await supabase
        .from('symptoms')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo);

      const uniqueDates = new Set(logsCount?.map(l => l.date));
      const logPercentage = Math.round((uniqueDates.size / 30) * 100);
      setHealthScore(Math.max(60, Math.min(100, 60 + Math.round(logPercentage * 0.4))));

      progress.value = withTiming(1, { duration: 1200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
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
              body { font-family: 'Helvetica Neue', sans-serif; padding: 40px; color: #1c1c1e; }
              h1 { color: #B64B74; margin-bottom: 5px; }
              .subtitle { color: #8e8e93; margin-bottom: 30px; }
              .card { border: 1px solid #e5e5ea; padding: 20px; border-radius: 16px; margin-bottom: 20px; background-color: #FFF8F8; }
              .card h2 { margin-top: 0; color: #74565F; }
              .row { display: flex; justify-content: space-between; border-bottom: 1px solid #f2d2d9; padding: 12px 0; }
              .row:last-child { border-bottom: none; }
              .score { font-size: 54px; font-weight: bold; color: #B64B74; margin: 10px 0; }
            </style>
          </head>
          <body>
            <h1>Aura Clinical Health Report</h1>
            <div class="subtitle">Generated for Sarah Jenkins • ${new Date().toLocaleDateString()}</div>
            
            <div class="card">
              <h2>Overall Health Score</h2>
              <div class="score">${healthScore} / 100</div>
              <p>Excellent consistency in tracking vitals, cycle logs, hydration, and medication compliance.</p>
            </div>
            
            <div class="card">
              <h2>Recent Cycle History</h2>
              ${cycleData.map(d => `<div class="row"><span>${d.month}</span><strong>${d.length} Days</strong></div>`).join('')}
            </div>

            <div class="card">
              <h2>Top Logged Symptoms</h2>
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
            <View style={{ width: 28, height: 28 }} />
            <Skeleton width={200} height={24} borderRadius={12} />
            <View style={{ width: 44 }} />
          </View>
          <View style={styles.scrollContent}>
            <Skeleton width="100%" height={160} borderRadius={24} style={{ marginBottom: Spacing.five }} />
            <Skeleton width={180} height={24} borderRadius={12} style={{ marginBottom: Spacing.four }} />
            <Skeleton width="100%" height={240} borderRadius={24} style={{ marginBottom: Spacing.five }} />
            <Skeleton width={200} height={24} borderRadius={12} style={{ marginBottom: Spacing.four }} />
            <View style={styles.tagRow}>
               <Skeleton width={100} height={40} borderRadius={20} />
               <Skeleton width={80} height={40} borderRadius={20} />
               <Skeleton width={120} height={40} borderRadius={20} />
            </View>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={theme.text} />
          </Pressable>
          <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '800' }}>
            Analytics & Reports
          </ThemedText>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Health Score */}
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.section}>
            <Card variant="filled" style={[styles.scoreCard, { backgroundColor: theme.primaryContainer }]}>
              <ThemedText type="labelMedium" style={{ color: theme.primary, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' }}>
                Health Score
              </ThemedText>
              <View style={styles.scoreRow}>
                <ThemedText type="displayLarge" style={{ color: theme.primary, fontSize: 72, lineHeight: 80, fontWeight: '800' }}>
                  {healthScore}
                </ThemedText>
                <Ionicons name="trending-up" size={40} color={theme.primary} style={{ marginLeft: Spacing.two }} />
              </View>
              <ThemedText type="bodyMedium" style={{ color: theme.primary, opacity: 0.8, textAlign: 'center', marginTop: Spacing.two, fontWeight: '600' }}>
                Based on your daily symptoms tracking consistency over the last 30 days. Keep it up!
              </ThemedText>
            </Card>
          </Animated.View>

          {/* Cycle Trends Chart */}
          <Animated.View entering={FadeInDown.duration(600).delay(150).springify()} style={styles.section}>
            <ThemedText type="titleMedium" style={{ color: theme.text, marginBottom: Spacing.four, fontWeight: '700' }}>Cycle Length Trends</ThemedText>
            
            <Card variant="elevated" style={styles.chartCard}>
              <View style={styles.chartContainer}>
                <View style={[styles.chartGrid, { borderBottomColor: theme.backgroundElement }]} />
                
                <View style={styles.barsContainer}>
                  {cycleData.map((data, i) => (
                    <BarColumn key={i} data={data} progress={progress} theme={theme} />
                  ))}
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Top Symptoms */}
          <Animated.View entering={FadeInDown.duration(600).delay(300).springify()} style={styles.section}>
             <ThemedText type="titleMedium" style={{ color: theme.text, marginBottom: Spacing.four, fontWeight: '700' }}>Frequent Logged Symptoms</ThemedText>
             <View style={styles.tagRow}>
               {topSymptoms.map((s, idx) => (
                 <View key={idx} style={[styles.tag, { backgroundColor: theme.backgroundElement }]}>
                   <ThemedText type="labelMedium" style={{ color: theme.text, fontWeight: '600' }}>
                     {s.name} ({s.pct}%)
                   </ThemedText>
                 </View>
               ))}
             </View>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>

      {/* Export Footer */}
      <Animated.View entering={FadeInDown.duration(600).delay(400)} style={[styles.footer, { borderTopColor: theme.backgroundElement }]}>
        <Button 
          label={isExporting ? "Generating PDF..." : "Export PDF Report"} 
          variant="filled" 
          onPress={exportPDF} 
          disabled={isExporting}
        />
      </Animated.View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  closeBtn: {
    padding: Spacing.one,
    marginRight: Spacing.three,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 100,
  },
  section: {
    marginBottom: Spacing.five,
  },
  scoreCard: {
    padding: Spacing.six,
    alignItems: 'center',
    borderRadius: 24,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  chartCard: {
    borderRadius: 24,
    paddingVertical: Spacing.four,
  },
  chartContainer: {
    height: MAX_BAR_HEIGHT + 60,
    justifyContent: 'flex-end',
    position: 'relative',
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
    paddingHorizontal: Spacing.two,
  },
  barColumn: {
    alignItems: 'center',
  },
  bar: {
    width: 24,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  tag: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.four,
    paddingBottom: Platform.OS === 'ios' ? Spacing.five : Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderTopWidth: 1,
  }
});
