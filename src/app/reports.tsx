import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const { width } = Dimensions.get('window');
const MAX_BAR_HEIGHT = 150;

const CYCLE_DATA = [
  { month: 'Jan', length: 28 },
  { month: 'Feb', length: 29 },
  { month: 'Mar', length: 27 },
  { month: 'Apr', length: 28 },
  { month: 'May', length: 30 },
  { month: 'Jun', length: 28 },
];

export default function ReportsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [isExporting, setIsExporting] = useState(false);

  // Animation trigger for charts
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(1, { duration: 1200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
  }, []);

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1c1c1e; }
              h1 { color: #d81b60; margin-bottom: 5px; }
              .subtitle { color: #8e8e93; margin-bottom: 30px; }
              .card { border: 1px solid #e5e5ea; padding: 20px; border-radius: 12px; margin-bottom: 20px; background-color: #f2f2f7; }
              .card h2 { margin-top: 0; color: #1c1c1e; }
              .row { display: flex; justify-content: space-between; border-bottom: 1px solid #d1d1d6; padding: 12px 0; }
              .row:last-child { border-bottom: none; }
              .score { font-size: 48px; font-weight: bold; color: #d81b60; margin: 10px 0; }
            </style>
          </head>
          <body>
            <h1>Clinical Health Report</h1>
            <div class="subtitle">Generated for Sarah Jenkins • ${new Date().toLocaleDateString()}</div>
            
            <div class="card">
              <h2>Overall Health Score</h2>
              <div class="score">94 / 100</div>
              <p>Excellent consistency in tracking vitals, hydration, and medication compliance.</p>
            </div>
            
            <div class="card">
              <h2>Recent Cycle History</h2>
              ${CYCLE_DATA.map(d => `<div class="row"><span>${d.month}</span><strong>${d.length} Days</strong></div>`).join('')}
            </div>

            <div class="card">
              <h2>Top Symptoms Logged</h2>
              <div class="row"><span>Cramps</span><strong>45% of cycles</strong></div>
              <div class="row"><span>Bloating</span><strong>30% of cycles</strong></div>
              <div class="row"><span>Fatigue</span><strong>25% of cycles</strong></div>
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={theme.text} />
          </Pressable>
          <ThemedText type="titleLarge" style={{ color: theme.text }}>
            Analytics
          </ThemedText>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Health Score */}
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.section}>
            <Card variant="filled" style={[styles.scoreCard, { backgroundColor: theme.primaryContainer }]}>
              <ThemedText type="labelMedium" style={{ color: theme.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
                Health Score
              </ThemedText>
              <View style={styles.scoreRow}>
                <ThemedText type="displayLarge" style={{ color: theme.primary, fontSize: 72, lineHeight: 80, fontWeight: '700' }}>
                  94
                </ThemedText>
                <Ionicons name="trending-up" size={40} color={theme.primary} style={{ marginLeft: Spacing.two }} />
              </View>
              <ThemedText type="bodyMedium" style={{ color: theme.primary, opacity: 0.8, textAlign: 'center', marginTop: Spacing.two }}>
                You are in the top 10% of users for logging consistency this month!
              </ThemedText>
            </Card>
          </Animated.View>

          {/* Cycle Trends Chart */}
          <Animated.View entering={FadeInDown.duration(600).delay(150).springify()} style={styles.section}>
            <ThemedText type="titleMedium" style={{ color: theme.text, marginBottom: Spacing.four }}>Cycle Length Trends</ThemedText>
            
            <View style={styles.chartContainer}>
              <View style={[styles.chartGrid, { borderBottomColor: theme.backgroundElement }]} />
              
              <View style={styles.barsContainer}>
                {CYCLE_DATA.map((data, i) => {
                  // Calculate height ratio based on max value (30)
                  const targetHeight = (data.length / 32) * MAX_BAR_HEIGHT;
                  
                  const rStyle = useAnimatedStyle(() => {
                    return {
                      height: progress.value * targetHeight,
                      opacity: progress.value,
                    };
                  });

                  return (
                    <View key={i} style={styles.barColumn}>
                      <ThemedText type="labelSmall" style={{ color: theme.text, marginBottom: 8, opacity: 0.8 }}>
                        {data.length}
                      </ThemedText>
                      <Animated.View style={[styles.bar, { backgroundColor: theme.primary }, rStyle]} />
                      <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: 8 }}>
                        {data.month}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Top Symptoms */}
          <Animated.View entering={FadeInDown.duration(600).delay(300).springify()} style={styles.section}>
             <ThemedText type="titleMedium" style={{ color: theme.text, marginBottom: Spacing.four }}>Frequent Symptoms</ThemedText>
             <View style={styles.tagRow}>
               <View style={[styles.tag, { backgroundColor: theme.backgroundElement }]}>
                 <ThemedText type="labelMedium" style={{ color: theme.text }}>Cramps (45%)</ThemedText>
               </View>
               <View style={[styles.tag, { backgroundColor: theme.backgroundElement }]}>
                 <ThemedText type="labelMedium" style={{ color: theme.text }}>Bloating (30%)</ThemedText>
               </View>
               <View style={[styles.tag, { backgroundColor: theme.backgroundElement }]}>
                 <ThemedText type="labelMedium" style={{ color: theme.text }}>Fatigue (25%)</ThemedText>
               </View>
             </View>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>

      {/* Export Footer */}
      <Animated.View entering={FadeInDown.duration(600).delay(450)} style={[styles.footer, { borderTopColor: theme.backgroundElement }]}>
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
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingBottom: Spacing.six + 100, // Space for fixed footer
  },
  section: {
    marginBottom: Spacing.six,
  },
  scoreCard: {
    padding: Spacing.six,
    alignItems: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
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
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.two,
  },
  barColumn: {
    alignItems: 'center',
  },
  bar: {
    width: 32,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  tag: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.four,
    paddingBottom: Platform.OS === 'ios' ? Spacing.six : Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopWidth: 1,
  }
});
