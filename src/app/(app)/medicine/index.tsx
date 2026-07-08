import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays } from 'date-fns';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';

const TODAY = new Date();
const CALENDAR_DAYS = Array.from({ length: 14 }).map((_, i) => addDays(subDays(TODAY, 7), i));

const INITIAL_MEDS = [
  { id: '1', name: 'Birth Control', dosage: '1 Pill', time: '09:00 AM', taken: true, icon: 'medical' },
  { id: '2', name: 'Vitamin D', dosage: '2000 IU', time: '10:00 AM', taken: false, icon: 'sunny' },
  { id: '3', name: 'Iron Supplement', dosage: '65mg', time: '08:00 PM', taken: false, icon: 'water' },
];

export default function MedicineDashboard() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [meds, setMeds] = useState(INITIAL_MEDS);

  const toggleMed = (id: string) => {
    setMeds(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
  };

  const takenCount = meds.filter(m => m.taken).length;
  const progress = takenCount / meds.length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={[styles.header, { paddingTop: Spacing.two }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={28} color={theme.text} />
          </Pressable>
          <ThemedText type="titleLarge" style={{ color: theme.text }}>Medication</ThemedText>
          <View style={{ width: 44 }} /> 
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Calendar Strip */}
          <Animated.View entering={FadeInDown.duration(400).delay(100).springify()} style={styles.calendarStrip}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.calendarScroll}
              contentOffset={{ x: 7 * 56 - Dimensions.get('window').width / 2 + 28, y: 0 }} // rough centering
            >
              {CALENDAR_DAYS.map((date) => {
                const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                return (
                  <Pressable 
                    key={date.toISOString()} 
                    onPress={() => setSelectedDate(date)}
                    style={[styles.calendarDay, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  >
                    <ThemedText type="labelSmall" style={{ color: isSelected ? theme.onPrimary : theme.textSecondary, marginBottom: 4 }}>
                      {format(date, 'EE').charAt(0)}
                    </ThemedText>
                    <ThemedText type="titleMedium" style={{ color: isSelected ? theme.onPrimary : theme.text }}>
                      {format(date, 'd')}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* Progress Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(200).springify()} style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <ThemedText type="titleMedium" style={{ color: theme.text }}>Today's Compliance</ThemedText>
              <ThemedText type="labelMedium" style={{ color: theme.primary }}>{takenCount} of {meds.length} taken</ThemedText>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundElement }]}>
              <Animated.View style={[styles.progressBarFill, { backgroundColor: theme.primary, width: `${progress * 100}%` }]} />
            </View>
          </Animated.View>

          {/* Meds List */}
          <Animated.View entering={FadeInDown.duration(400).delay(300).springify()} style={styles.medsList}>
             {meds.map((med, index) => (
                <Animated.View key={med.id} entering={FadeInDown.duration(400).delay(350 + (index * 50)).springify()}>
                  <Pressable onPress={() => toggleMed(med.id)}>
                    <Card variant={med.taken ? 'filled' : 'elevated'} style={[styles.medCard, med.taken && { backgroundColor: theme.primaryContainer }]}>
                      <View style={[styles.medIconWrap, { backgroundColor: med.taken ? theme.primary : theme.backgroundElement }]}>
                        <Ionicons name={med.icon as any} size={24} color={med.taken ? theme.onPrimary : theme.textSecondary} />
                      </View>
                      <View style={styles.medContent}>
                        <ThemedText type="titleMedium" style={{ color: med.taken ? theme.primary : theme.text }}>
                          {med.name}
                        </ThemedText>
                        <ThemedText type="labelMedium" style={{ color: med.taken ? theme.primary : theme.textSecondary, opacity: 0.8 }}>
                          {med.dosage} • {med.time}
                        </ThemedText>
                      </View>
                      <View style={[styles.checkbox, med.taken && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                        {med.taken && <Ionicons name="checkmark" size={16} color={theme.onPrimary} />}
                      </View>
                    </Card>
                  </Pressable>
                </Animated.View>
             ))}
          </Animated.View>

        </ScrollView>
      </SafeAreaView>

      {/* Floating Action Button */}
      <Animated.View 
        entering={FadeIn.duration(800).delay(600)} 
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

import { Dimensions } from 'react-native';

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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  backBtn: {
    padding: Spacing.one,
    width: 44,
  },
  scrollContent: {
    paddingBottom: Spacing.six + 80, // Space for FAB
  },
  calendarStrip: {
    marginBottom: Spacing.six,
  },
  calendarScroll: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  calendarDay: {
    width: 48,
    height: 64,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    paddingHorizontal: Spacing.four,
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
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
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
    right: Spacing.four,
    zIndex: 100,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});
