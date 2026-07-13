import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, addDays, subDays } from 'date-fns';
import * as Haptics from 'expo-haptics';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const TODAY = new Date();
const CALENDAR_DAYS = Array.from({ length: 14 }).map((_, i) => addDays(subDays(TODAY, 7), i));
const { width } = Dimensions.get('window');

const MED_ICONS = ['💊', '💉', '🧴', '🌿', '🫁', '🩺', '🩹', '💆'];
const MED_COLORS = ['#6E56CF', '#E91E63', '#2A9D8F', '#FF9800', '#4FC3F7', '#AB47BC', '#66BB6A', '#EF5350'];

export default function MedicineDashboard() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const user = session?.user;

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [meds, setMeds] = useState<any[]>([]);
  const [takenMeds, setTakenMeds] = useState<string[]>([]);

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
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
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
  const isComplete = meds.length > 0 && takenCount === meds.length;

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
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
          <View>
            <ThemedText style={{ color: theme.primary, fontWeight: '900', letterSpacing: -1, fontSize: 28 }}>
              Medications
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500', marginTop: 2 }}>
              {format(selectedDate, 'EEEE, MMMM d')}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => router.push('/medicine/add')}
            style={[styles.addBtn, { backgroundColor: theme.primaryContainer }]}
          >
            <Ionicons name="add" size={22} color={theme.primary} />
          </Pressable>
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Calendar Strip */}
          <Animated.View entering={FadeInDown.duration(400).delay(80).springify()} style={styles.calendarStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.calendarScroll}
            >
              {CALENDAR_DAYS.map((date) => {
                const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                const isToday = format(date, 'yyyy-MM-dd') === format(TODAY, 'yyyy-MM-dd');
                return (
                  <Pressable
                    key={date.toISOString()}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedDate(date);
                    }}
                    style={[
                      styles.calendarDay,
                      { backgroundColor: theme.surface },
                      isSelected && { backgroundColor: theme.primary },
                    ]}
                  >
                    <ThemedText style={{
                      color: isSelected ? 'rgba(255,255,255,0.8)' : theme.textSecondary,
                      fontSize: 10,
                      fontWeight: '700',
                      marginBottom: 4,
                      textTransform: 'uppercase',
                    }}>
                      {format(date, 'EEE').charAt(0)}
                    </ThemedText>
                    <ThemedText style={{
                      color: isSelected ? '#fff' : (isToday ? theme.primary : theme.text),
                      fontWeight: '800',
                      fontSize: 15,
                    }}>
                      {format(date, 'd')}
                    </ThemedText>
                    {isToday && !isSelected && (
                      <View style={[styles.todayDot, { backgroundColor: theme.primary }]} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>

          {meds.length > 0 ? (
            <>
              {/* Progress Banner */}
              <Animated.View entering={FadeInDown.duration(400).delay(160).springify()} style={styles.progressSection}>
                <LinearGradient
                  colors={isComplete ? ['#66BB6A', '#43A047'] : [theme.primary, theme.tertiary || theme.secondary || theme.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.progressCard}
                >
                  <View style={styles.progressLeft}>
                    <ThemedText style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Today's Compliance
                    </ThemedText>
                    <ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 26, letterSpacing: -1, marginTop: 4 }}>
                      {takenCount}/{meds.length}
                    </ThemedText>
                    <ThemedText style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
                      {isComplete ? 'All medications taken! 🎉' : `${meds.length - takenCount} remaining`}
                    </ThemedText>
                  </View>
                  <View style={styles.progressRingWrap}>
                    <View style={[styles.progressRing, { borderColor: 'rgba(255,255,255,0.3)' }]}>
                      <ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>
                        {Math.round(progress * 100)}%
                      </ThemedText>
                    </View>
                  </View>
                </LinearGradient>

                {/* Progress Bar */}
                <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundElement }]}>
                  <View style={[
                    styles.progressBarFill,
                    { backgroundColor: isComplete ? '#66BB6A' : theme.primary, width: `${progress * 100}%` }
                  ]} />
                </View>
              </Animated.View>

              {/* Meds List */}
              <View style={styles.medsListHeader}>
                <ThemedText style={styles.listSectionTitle}>Today's Medications</ThemedText>
              </View>
              <Animated.View entering={FadeInDown.duration(400).delay(240).springify()} style={styles.medsList}>
                {meds.map((med, index) => {
                  const isTaken = takenMeds.includes(med.id);
                  const medColor = MED_COLORS[index % MED_COLORS.length];
                  const medEmoji = MED_ICONS[index % MED_ICONS.length];
                  return (
                    <Animated.View key={med.id} entering={FadeInDown.duration(400).delay(280 + (index * 60)).springify()}>
                      <Pressable onPress={() => toggleMed(med.id)} style={[
                        styles.medCard,
                        {
                          backgroundColor: isTaken ? `${medColor}12` : theme.surface,
                          borderColor: isTaken ? `${medColor}30` : 'transparent',
                        }
                      ]}>
                        <View style={[styles.medIconWrap, { backgroundColor: isTaken ? medColor : `${medColor}18` }]}>
                          <ThemedText style={{ fontSize: 18 }}>{medEmoji}</ThemedText>
                        </View>
                        <View style={styles.medContent}>
                          <ThemedText style={{ color: isTaken ? medColor : theme.text, fontWeight: '800', fontSize: 15 }}>
                            {med.name}
                          </ThemedText>
                          <ThemedText style={{ color: isTaken ? `${medColor}99` : theme.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                            {med.dosage} · {med.frequency}
                          </ThemedText>
                        </View>
                        <View style={[
                          styles.checkbox,
                          {
                            backgroundColor: isTaken ? medColor : 'transparent',
                            borderColor: isTaken ? medColor : theme.backgroundElement,
                          }
                        ]}>
                          {isTaken && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </Animated.View>
            </>
          ) : (
            <Animated.View entering={FadeInDown.duration(400).delay(160).springify()} style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.primaryContainer }]}>
                <ThemedText style={{ fontSize: 40 }}>💊</ThemedText>
              </View>
              <ThemedText style={{ color: theme.text, fontWeight: '900', fontSize: 20, marginTop: Spacing.four, marginBottom: Spacing.two }}>
                No Medications Yet
              </ThemedText>
              <ThemedText style={{ color: theme.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.six, marginBottom: Spacing.five, fontSize: 14, lineHeight: 20 }}>
                Keep track of vitamins, supplements, and prescriptions in one place.
              </ThemedText>
              <Pressable
                style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/medicine/add')}
              >
                <Ionicons name="add-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                <ThemedText style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                  Add First Medication
                </ThemedText>
              </Pressable>
            </Animated.View>
          )}

        </ScrollView>
      </SafeAreaView>

      {meds.length > 0 && (
        <Animated.View
          entering={FadeIn.duration(600).delay(500)}
          style={[styles.fabContainer, { bottom: BottomTabInset + 12 }]}
        >
          <Pressable
            style={[styles.fab, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/medicine/add')}
          >
            <Ionicons name="add" size={28} color={theme.onPrimary} />
          </Pressable>
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: { paddingBottom: BottomTabInset + Spacing.six },

  calendarStrip: { marginBottom: Spacing.four },
  calendarScroll: { paddingHorizontal: Spacing.five, gap: Spacing.two + 2 },
  calendarDay: {
    width: 50,
    height: 68,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },

  progressSection: {
    paddingHorizontal: Spacing.five,
    marginBottom: Spacing.five,
    gap: Spacing.two + 2,
  },
  progressCard: {
    borderRadius: 24,
    padding: Spacing.four + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#6E56CF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  progressLeft: { flex: 1 },
  progressRingWrap: { marginLeft: Spacing.three },
  progressRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  medsListHeader: {
    paddingHorizontal: Spacing.five,
    marginBottom: Spacing.two + 4,
  },
  listSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.6,
  },

  medsList: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.two + 4,
    marginBottom: Spacing.four,
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 22,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  medIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  medContent: { flex: 1 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: Spacing.five,
  },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: 30,
  },

  fabContainer: {
    position: 'absolute',
    right: Spacing.five,
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6E56CF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
