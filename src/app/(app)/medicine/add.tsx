import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { scheduleMedicineReminder } from '@/utils/notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const SCHEDULE_OPTIONS = ['Every Day', 'Weekdays', 'Specific Days', 'As Needed'];
const REMINDER_TIMES = ['06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '12:00 PM', '06:00 PM', '08:00 PM', '10:00 PM'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AddMedicineScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const user = session?.user;

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [schedule, setSchedule] = useState('Every Day');
  const [time, setTime] = useState('09:00 AM');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);

  const toggleDay = (day: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      alert('Please enter the medication name.');
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error } = await supabase.from('medications').insert({
        user_id: user.id,
        name: name.trim(),
        dosage: dosage.trim() || '1 pill',
        frequency: schedule,
        is_active: true,
      });

      if (error) throw error;

      await scheduleMedicineReminder();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      console.error(e);
      alert('Failed to add medication.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <ThemedText style={{ color: theme.text, fontWeight: '800', fontSize: 17 }}>Add Medication</ThemedText>
          <Pressable onPress={handleSave} disabled={saving} style={styles.saveBtn}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <ThemedText style={{ color: theme.primary, fontWeight: '800', fontSize: 15 }}>Save</ThemedText>
            )}
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Medication Details */}
            <Animated.View entering={FadeInDown.duration(400).delay(50).springify()} style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Medication Details</ThemedText>
              <View style={[styles.inputCard, { backgroundColor: theme.surface }]}>
                <View style={styles.inputRow}>
                  <View style={[styles.inputIcon, { backgroundColor: `${theme.primary}15` }]}>
                    <Ionicons name="medical-outline" size={16} color={theme.primary} />
                  </View>
                  <View style={styles.inputContent}>
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                      Name *
                    </ThemedText>
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="e.g. Vitamin D, Birth Control"
                      placeholderTextColor={theme.textSecondary}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />

                <View style={styles.inputRow}>
                  <View style={[styles.inputIcon, { backgroundColor: '#E91E6315' }]}>
                    <Ionicons name="flask-outline" size={16} color="#E91E63" />
                  </View>
                  <View style={styles.inputContent}>
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                      Dosage
                    </ThemedText>
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="e.g. 1 Pill, 50mg, 1 tsp"
                      placeholderTextColor={theme.textSecondary}
                      value={dosage}
                      onChangeText={setDosage}
                    />
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Repeat Schedule */}
            <Animated.View entering={FadeInDown.duration(400).delay(100).springify()} style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Repeat Schedule</ThemedText>
              <View style={styles.chipRow}>
                {SCHEDULE_OPTIONS.map(opt => (
                  <Pressable
                    key={opt}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.surface },
                      schedule === opt && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSchedule(opt);
                    }}
                  >
                    <ThemedText style={{
                      color: schedule === opt ? '#fff' : theme.textSecondary,
                      fontWeight: '700',
                      fontSize: 13,
                    }}>
                      {opt}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              {schedule === 'Specific Days' && (
                <View style={[styles.chipRow, { marginTop: Spacing.three }]}>
                  {DAYS.map((day) => (
                    <Pressable
                      key={day}
                      onPress={() => toggleDay(day)}
                      style={[
                        styles.dayChip,
                        {
                          backgroundColor: selectedDays.includes(day) ? theme.primary : theme.surface,
                        }
                      ]}
                    >
                      <ThemedText style={{
                        color: selectedDays.includes(day) ? '#fff' : theme.textSecondary,
                        fontWeight: '700',
                        fontSize: 11,
                      }}>
                        {day.charAt(0)}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}
            </Animated.View>

            {/* Reminder Time */}
            <Animated.View entering={FadeInDown.duration(400).delay(150).springify()} style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Reminder Time</ThemedText>
              <View style={styles.timesGrid}>
                {REMINDER_TIMES.map(t => (
                  <Pressable
                    key={t}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTime(t);
                    }}
                    style={[
                      styles.timeChip,
                      {
                        backgroundColor: time === t ? theme.primary : theme.surface,
                        borderColor: time === t ? theme.primary : 'transparent',
                      }
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={12}
                      color={time === t ? 'rgba(255,255,255,0.7)' : theme.textSecondary}
                    />
                    <ThemedText style={{
                      color: time === t ? '#fff' : theme.text,
                      fontWeight: '700',
                      fontSize: 12,
                      marginLeft: 4,
                    }}>
                      {t}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              <View style={[styles.noticeBox, { backgroundColor: theme.primaryContainer }]}>
                <Ionicons name="notifications-outline" size={14} color={theme.primary} />
                <ThemedText style={{ color: theme.primary, fontSize: 12, fontWeight: '600', marginLeft: 6, flex: 1 }}>
                  You'll receive a push notification at {time}
                </ThemedText>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(200).springify()} style={{ marginHorizontal: Spacing.four }}>
              <Button
                label={saving ? "Saving..." : "Save Medication"}
                variant="filled"
                onPress={handleSave}
                disabled={saving}
                style={{ borderRadius: 18, marginBottom: Spacing.six }}
              />
            </Animated.View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    width: 60,
    height: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 32,
  },

  section: { marginBottom: Spacing.five },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.6,
    marginBottom: Spacing.three,
  },

  inputCard: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  inputIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  inputContent: { flex: 1 },
  input: {
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
  },
  separator: {
    height: 1,
    marginHorizontal: Spacing.four,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 4,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    borderWidth: 1.5,
  },

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    marginTop: Spacing.two,
  },
});
