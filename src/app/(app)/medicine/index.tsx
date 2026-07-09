import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays } from 'date-fns';
import * as Haptics from 'expo-haptics';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const TODAY = new Date();
const CALENDAR_DAYS = Array.from({ length: 14 }).map((_, i) => addDays(subDays(TODAY, 7), i));

export default function MedicineDashboard() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const user = session?.user;
  
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [meds, setMeds] = useState<any[]>([]);
  const [takenMeds, setTakenMeds] = useState<string[]>([]); // Array of taken med IDs for selected day

  useEffect(() => {
    fetchMedications();
  }, [user, selectedDate]);

  const fetchMedications = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (data) {
        setMeds(data);
        // Simulate or load completed status for selected date from MMKV/local state
        // For prototype purposes, initialize some as taken randomly or load from memory
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        // Let's generate a stable mock completed list based on the date and med ID
        const completed = data
          .filter((m, idx) => (idx + dateKey.length) % 2 === 0)
          .map(m => m.id);
        setTakenMeds(completed);
      }
    } catch (e) {
      console.warn('Error loading medications:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleMed = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTakenMeds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const takenCount = meds.filter(m => takenMeds.includes(m.id)).length;
  const progress = meds.length > 0 ? takenCount / meds.length : 0;

  if (loading && meds.length === 0) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={[styles.header, { paddingTop: Spacing.two }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={28} color={theme.text} />
          </Pressable>
          <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '800' }}>Medications</ThemedText>
          <View style={{ width: 44 }} /> 
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Calendar Strip */}
          <Animated.View entering={FadeInDown.duration(400).delay(100).springify()} style={styles.calendarStrip}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.calendarScroll}
              contentOffset={{ x: 7 * 56 - Dimensions.get('window').width / 2 + 28, y: 0 }}
            >
              {CALENDAR_DAYS.map((date) => {
                const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                return (
                  <Pressable 
                    key={date.toISOString()} 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedDate(date);
                    }}
                    style={[
                      styles.calendarDay, 
                      { backgroundColor: theme.backgroundElement },
                      isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                  >
                    <ThemedText type="labelSmall" style={{ color: isSelected ? theme.onPrimary : theme.textSecondary, marginBottom: 4 }}>
                      {format(date, 'EE').charAt(0)}
                    </ThemedText>
                    <ThemedText type="titleMedium" style={{ color: isSelected ? theme.onPrimary : theme.text, fontWeight: '700' }}>
                      {format(date, 'd')}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>

          {meds.length > 0 ? (
            <>
              {/* Progress Section */}
              <Animated.View entering={FadeInDown.duration(400).delay(200).springify()} style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <ThemedText type="titleMedium" style={{ color: theme.text, fontWeight: '700' }}>Today's Compliance</ThemedText>
                  <ThemedText type="labelMedium" style={{ color: theme.primary, fontWeight: '700' }}>{takenCount} of {meds.length} taken</ThemedText>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundElement }]}>
                  <View style={[styles.progressBarFill, { backgroundColor: theme.primary, width: `${progress * 100}%` }]} />
                </View>
              </Animated.View>

              {/* Meds List */}
              <Animated.View entering={FadeInDown.duration(400).delay(300).springify()} style={styles.medsList}>
                {meds.map((med, index) => {
                  const isTaken = takenMeds.includes(med.id);
                  return (
                    <Animated.View key={med.id} entering={FadeInDown.duration(400).delay(350 + (index * 50)).springify()}>
                      <Pressable onPress={() => toggleMed(med.id)}>
                        <Card variant={isTaken ? 'filled' : 'elevated'} style={[styles.medCard, isTaken && { backgroundColor: theme.primaryContainer }]}>
                          <View style={[styles.medIconWrap, { backgroundColor: isTaken ? theme.primary : theme.backgroundElement }]}>
                            <Ionicons name="medical" size={24} color={isTaken ? theme.onPrimary : theme.textSecondary} />
                          </View>
                          <View style={styles.medContent}>
                            <ThemedText type="titleMedium" style={{ color: isTaken ? theme.primary : theme.text, fontWeight: '700' }}>
                              {med.name}
                            </ThemedText>
                            <ThemedText type="labelMedium" style={{ color: isTaken ? theme.primary : theme.textSecondary, opacity: 0.8 }}>
                              {med.dosage} • {med.frequency}
                            </ThemedText>
                          </View>
                          <View style={[styles.checkbox, isTaken && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                            {isTaken && <Ionicons name="checkmark" size={16} color={theme.onPrimary} />}
                          </View>
                        </Card>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </Animated.View>
            </>
          ) : (
            <Animated.View entering={FadeInDown.duration(400).delay(200).springify()} style={styles.emptyContainer}>
              <View style={[styles.medIconWrap, { backgroundColor: theme.backgroundElement, width: 80, height: 80, borderRadius: 40, marginBottom: Spacing.four }]}>
                <Ionicons name="medical" size={40} color={theme.textSecondary} style={{ opacity: 0.5 }} />
              </View>
              <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '800', marginBottom: Spacing.two }}>
                No Medications
              </ThemedText>
              <ThemedText type="bodyMedium" style={{ color: theme.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.six, marginBottom: Spacing.six }}>
                Keep track of your vitamins, supplements, and prescriptions in one place.
              </ThemedText>
              <Pressable 
                style={[styles.calendarDay, { backgroundColor: theme.primary, width: 'auto', paddingHorizontal: Spacing.six, height: 50, borderRadius: 25 }]}
                onPress={() => router.push('/medicine/add')}
              >
                <ThemedText type="titleMedium" style={{ color: theme.onPrimary, fontWeight: '700' }}>
                  Add First Medication
                </ThemedText>
              </Pressable>
            </Animated.View>
          )}

        </ScrollView>
      </SafeAreaView>

      {/* Floating Action Button */}
      <Animated.View 
        entering={FadeIn.duration(600).delay(500)} 
        style={[styles.fabContainer, { bottom: insets.bottom + Spacing.four }]}
      >
        <Pressable 
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/medicine/add')}
        >
          <Ionicons name="add" size={32} color={theme.onPrimary} />
        </Pressable>
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
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.four,
  },
  backBtn: {
    padding: Spacing.one,
    width: 44,
  },
  scrollContent: {
    paddingBottom: Spacing.six + 80,
  },
  calendarStrip: {
    marginBottom: Spacing.six,
  },
  calendarScroll: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  calendarDay: {
    width: 48,
    height: 64,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    paddingHorizontal: Spacing.five,
    marginBottom: Spacing.six,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  medsList: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.four,
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  medIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.four,
  },
  medContent: {
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabContainer: {
    position: 'absolute',
    right: Spacing.five,
    bottom: BottomTabInset + 16,
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B64B74',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});
