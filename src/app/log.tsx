import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export default function DailyLogScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const user = session?.user;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // States
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [flow, setFlow] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [pain, setPain] = useState<number>(1);
  const [water, setWater] = useState<number>(0);
  const [sleep, setSleep] = useState<number>(7);
  const [exercise, setExercise] = useState<string | null>(null);
  const [weight, setWeight] = useState<string>('');
  const [temp, setTemp] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    fetchExistingLog();
  }, [user]);

  const fetchExistingLog = async () => {
    if (!user) return;
    setLoading(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      // Query database for logs on this date
      const [
        { data: period },
        { data: moodLog },
        { data: sympLog },
        { data: waterLog },
        { data: sleepLog },
        { data: noteLog },
        { data: weightLog },
      ] = await Promise.all([
        supabase.from('period_logs').select('*').eq('user_id', user.id).eq('date', dateStr).maybeSingle(),
        supabase.from('moods').select('*').eq('user_id', user.id).eq('date', dateStr).maybeSingle(),
        supabase.from('symptoms').select('*').eq('user_id', user.id).eq('date', dateStr),
        supabase.from('water_logs').select('*').eq('user_id', user.id).eq('date', dateStr),
        supabase.from('sleep_logs').select('*').eq('user_id', user.id).eq('date', dateStr).maybeSingle(),
        supabase.from('notes').select('*').eq('user_id', user.id).eq('date', dateStr).maybeSingle(),
        supabase.from('weight_logs').select('*').eq('user_id', user.id).eq('date', dateStr).maybeSingle(),
      ]);

      if (period) setFlow(period.flow_level ? period.flow_level.charAt(0).toUpperCase() + period.flow_level.slice(1) : null);
      if (moodLog) setMood(moodLog.mood_type);
      if (sympLog) {
        setSymptoms(sympLog.map(s => s.symptom_type));
        if (sympLog.length > 0 && sympLog[0].severity) setPain(sympLog[0].severity);
      }
      if (waterLog) {
        const sum = waterLog.reduce((acc, w) => acc + w.amount_ml, 0);
        setWater(Math.round(sum / 250));
      }
      if (sleepLog) setSleep(Number(sleepLog.hours));
      if (noteLog) setNotes(noteLog.content);
      if (weightLog) setWeight(String(weightLog.weight_kg));
    } catch (e) {
      console.warn('Error fetching daily logs:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSymptom = (s: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSymptoms(prev => prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s]);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      // 1. Wipe existing entries for this date
      await Promise.all([
        supabase.from('period_logs').delete().eq('user_id', user.id).eq('date', dateStr),
        supabase.from('symptoms').delete().eq('user_id', user.id).eq('date', dateStr),
        supabase.from('moods').delete().eq('user_id', user.id).eq('date', dateStr),
        supabase.from('water_logs').delete().eq('user_id', user.id).eq('date', dateStr),
        supabase.from('sleep_logs').delete().eq('user_id', user.id).eq('date', dateStr),
        supabase.from('notes').delete().eq('user_id', user.id).eq('date', dateStr),
        supabase.from('weight_logs').delete().eq('user_id', user.id).eq('date', dateStr),
      ]);

      // 2. Insert new entries
      const queries = [];

      if (flow) {
        // Find latest cycle to associate
        const { data: cycles } = await supabase
          .from('cycles')
          .select('id')
          .eq('user_id', user.id)
          .order('start_date', { ascending: false })
          .limit(1);

        queries.push(
          supabase.from('period_logs').insert({
            user_id: user.id,
            date: dateStr,
            flow_level: flow.toLowerCase(),
            cycle_id: cycles && cycles.length > 0 ? cycles[0].id : null,
          })
        );
      }

      if (mood) {
        queries.push(
          supabase.from('moods').insert({
            user_id: user.id,
            date: dateStr,
            mood_type: mood,
            intensity: pain,
          })
        );
      }

      if (symptoms.length > 0) {
        const rows = symptoms.map(s => ({
          user_id: user.id,
          date: dateStr,
          symptom_type: s,
          severity: pain,
        }));
        queries.push(supabase.from('symptoms').insert(rows));
      }

      if (water > 0) {
        queries.push(
          supabase.from('water_logs').insert({
            user_id: user.id,
            date: dateStr,
            amount_ml: water * 250,
          })
        );
      }

      if (sleep > 0) {
        queries.push(
          supabase.from('sleep_logs').insert({
            user_id: user.id,
            date: dateStr,
            hours: sleep,
            quality: 'good',
          })
        );
      }

      if (weight.trim()) {
        queries.push(
          supabase.from('weight_logs').insert({
            user_id: user.id,
            date: dateStr,
            weight_kg: parseFloat(weight) || 60,
          })
        );
      }

      if (notes.trim()) {
        queries.push(
          supabase.from('notes').insert({
            user_id: user.id,
            date: dateStr,
            content: notes,
          })
        );
      }

      await Promise.all(queries);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      console.error('Error saving daily log:', e);
      alert('Failed to save daily records.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
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
          <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '700' }}>
            Daily Log • {format(selectedDate, 'MMM d')}
          </ThemedText>
          <Pressable onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <ThemedText type="titleMedium" style={{ color: theme.primary, fontWeight: '700' }}>
                Save
              </ThemedText>
            )}
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >

            {/* 1. Flow */}
            <Animated.View entering={FadeInDown.duration(400).delay(50).springify()} style={styles.section}>
              <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Menstrual Flow</ThemedText>
              <View style={styles.chipRow}>
                {['Spotting', 'Light', 'Medium', 'Heavy'].map(f => (
                  <Pressable 
                    key={f}
                    style={[
                      styles.chip, 
                      { backgroundColor: theme.backgroundElement },
                      flow === f && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFlow(flow === f ? null : f);
                    }}
                  >
                    <ThemedText type="labelMedium" style={{ color: flow === f ? '#fff' : theme.textSecondary, fontWeight: '600' }}>{f}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </Animated.View>

            {/* 2. Mood */}
            <Animated.View entering={FadeInDown.duration(400).delay(100).springify()} style={styles.section}>
              <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Mood Ring</ThemedText>
              <View style={styles.chipRow}>
                {[
                  { label: 'Happy', icon: 'happy-outline', color: '#FFD54F' },
                  { label: 'Calm', icon: 'leaf-outline', color: '#81C784' },
                  { label: 'Sad', icon: 'sad-outline', color: '#64B5F6' },
                  { label: 'Anxious', icon: 'pulse-outline', color: '#FFB74D' },
                  { label: 'Tired', icon: 'moon-outline', color: '#9575CD' },
                ].map(m => (
                  <Pressable 
                    key={m.label}
                    style={[
                      styles.iconChip, 
                      { borderColor: theme.backgroundElement },
                      mood === m.label && { backgroundColor: theme.primaryContainer, borderColor: theme.primary }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMood(mood === m.label ? null : m.label);
                    }}
                  >
                    <Ionicons name={m.icon as any} size={24} color={mood === m.label ? theme.primary : theme.textSecondary} />
                    <ThemedText type="labelSmall" style={{ color: mood === m.label ? theme.primary : theme.textSecondary, marginTop: 4, fontWeight: '600' }}>{m.label}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </Animated.View>

            {/* 3. Symptoms */}
            <Animated.View entering={FadeInDown.duration(400).delay(150).springify()} style={styles.section}>
              <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Symptom Check</ThemedText>
              <View style={styles.chipGrid}>
                {['Cramps', 'Headache', 'Bloating', 'Nausea', 'Fatigue', 'Acne', 'Backache', 'Cravings'].map(s => {
                  const active = symptoms.includes(s);
                  return (
                    <Pressable 
                      key={s}
                      style={[
                        styles.chip, 
                        { backgroundColor: theme.backgroundElement },
                        active && { backgroundColor: theme.primary }
                      ]}
                      onPress={() => toggleSymptom(s)}
                    >
                      <ThemedText type="labelMedium" style={{ color: active ? '#fff' : theme.textSecondary, fontWeight: '600' }}>{s}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            {/* 4. Pain/Severity Level */}
            <Animated.View entering={FadeInDown.duration(400).delay(200).springify()} style={styles.section}>
              <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Pain Severity ({pain}/5)</ThemedText>
              <View style={styles.segmentedControl}>
                {[1, 2, 3, 4, 5].map(level => (
                  <Pressable 
                    key={level}
                    style={[
                      styles.segmentBtn, 
                      { backgroundColor: theme.backgroundElement },
                      pain === level && { backgroundColor: theme.primaryContainer }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPain(level);
                    }}
                  >
                    <ThemedText type="titleMedium" style={{ color: pain === level ? theme.primary : theme.textSecondary, fontWeight: '700' }}>{level}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </Animated.View>

            {/* 5. Water & 6. Sleep Row */}
            <View style={styles.row}>
              <Animated.View entering={FadeInDown.duration(400).delay(250).springify()} style={[styles.section, { flex: 1, marginRight: Spacing.two }]}>
                <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Water (Glasses)</ThemedText>
                <View style={[styles.counter, { backgroundColor: theme.backgroundElement }]}>
                  <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWater(Math.max(0, water - 1)); }} style={styles.counterBtn}>
                    <Ionicons name="remove" size={20} color={theme.text} />
                  </Pressable>
                  <ThemedText type="titleLarge" style={{ color: theme.primary, fontWeight: '800' }}>{water}</ThemedText>
                  <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWater(water + 1); }} style={styles.counterBtn}>
                    <Ionicons name="add" size={20} color={theme.text} />
                  </Pressable>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(250).springify()} style={[styles.section, { flex: 1, marginLeft: Spacing.two }]}>
                <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Sleep (Hours)</ThemedText>
                <View style={[styles.counter, { backgroundColor: theme.backgroundElement }]}>
                  <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSleep(Math.max(0, sleep - 1)); }} style={styles.counterBtn}>
                    <Ionicons name="remove" size={20} color={theme.text} />
                  </Pressable>
                  <ThemedText type="titleLarge" style={{ color: theme.tertiary, fontWeight: '800' }}>{sleep}</ThemedText>
                  <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSleep(sleep + 1); }} style={styles.counterBtn}>
                    <Ionicons name="add" size={20} color={theme.text} />
                  </Pressable>
                </View>
              </Animated.View>
            </View>

            {/* 8. Vitals & Weight */}
            <View style={styles.row}>
              <Animated.View entering={FadeInDown.duration(400).delay(300).springify()} style={[styles.section, { flex: 1, marginRight: Spacing.two }]}>
                <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Weight (kg)</ThemedText>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                  placeholder="e.g. 60.5"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(300).springify()} style={[styles.section, { flex: 1, marginLeft: Spacing.two }]}>
                <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Basal Temp (°C)</ThemedText>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                  placeholder="e.g. 36.6"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={temp}
                  onChangeText={setTemp}
                />
              </Animated.View>
            </View>

            {/* 9. Notes */}
            <Animated.View entering={FadeInDown.duration(400).delay(350).springify()} style={styles.section}>
              <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Notes & Diary</ThemedText>
              <TextInput 
                style={[styles.textArea, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder="Write down any notes about your cycle, moods, symptoms, or cravings..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={notes}
                onChangeText={setNotes}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(400).springify()}>
               <Button label={saving ? "Saving Logs..." : "Save Daily Logs"} variant="filled" onPress={handleSave} disabled={saving} style={{ marginBottom: Spacing.six }} />
            </Animated.View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  closeBtn: {
    padding: Spacing.one,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 32,
  },
  section: {
    marginBottom: Spacing.five,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 20,
  },
  iconChip: {
    width: 68,
    height: 68,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  segmentBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 52,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
  },
  counterBtn: {
    padding: Spacing.two,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: Spacing.four,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
    borderRadius: 14,
    padding: Spacing.four,
    fontSize: 16,
    lineHeight: 20,
  },
});
