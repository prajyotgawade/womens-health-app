import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const FLOW_OPTIONS = [
  { label: 'Spotting', color: '#FFB3BA' },
  { label: 'Light', color: '#FF6B8A' },
  { label: 'Medium', color: '#E91E63' },
  { label: 'Heavy', color: '#880E4F' },
];

const MOOD_OPTIONS = [
  { label: 'Happy', icon: 'happy-outline', color: '#FFD54F' },
  { label: 'Calm', icon: 'leaf-outline', color: '#81C784' },
  { label: 'Sad', icon: 'sad-outline', color: '#64B5F6' },
  { label: 'Anxious', icon: 'pulse-outline', color: '#FFB74D' },
  { label: 'Tired', icon: 'moon-outline', color: '#9575CD' },
  { label: 'Irritable', icon: 'flash-outline', color: '#FF7043' },
];

const SYMPTOM_OPTIONS = [
  { label: 'Cramps', icon: 'body-outline' },
  { label: 'Headache', icon: 'medical-outline' },
  { label: 'Bloating', icon: 'ellipse-outline' },
  { label: 'Nausea', icon: 'thermometer-outline' },
  { label: 'Fatigue', icon: 'battery-dead-outline' },
  { label: 'Acne', icon: 'sparkles-outline' },
  { label: 'Backache', icon: 'accessibility-outline' },
  { label: 'Cravings', icon: 'restaurant-outline' },
];

const PAIN_LEVELS = [
  { level: 1, label: 'None', color: '#81C784' },
  { level: 2, label: 'Mild', color: '#AED581' },
  { level: 3, label: 'Moderate', color: '#FFD54F' },
  { level: 4, label: 'Strong', color: '#FF8A65' },
  { level: 5, label: 'Severe', color: '#E53935' },
];

function SectionHeader({ icon, title, color }: { icon: string; title: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={sectionHeaderStyle.row}>
      <View style={[sectionHeaderStyle.icon, { backgroundColor: color ? `${color}20` : `${theme.primary}15` }]}>
        <Ionicons name={icon as any} size={15} color={color || theme.primary} />
      </View>
      <ThemedText style={{ color: theme.text, fontWeight: '800', fontSize: 14, letterSpacing: -0.2 }}>{title}</ThemedText>
    </View>
  );
}

const sectionHeaderStyle = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.three, gap: 8 },
  icon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

export default function DailyLogScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const user = session?.user;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate] = useState(new Date());
  const [flow, setFlow] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [pain, setPain] = useState<number>(1);
  const [water, setWater] = useState<number>(0);
  const [sleep, setSleep] = useState<number>(7);
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
        setSymptoms(sympLog.map((s: any) => s.symptom_type));
        if (sympLog.length > 0 && sympLog[0].severity) setPain(sympLog[0].severity);
      }
      if (waterLog) {
        const sum = waterLog.reduce((acc: number, w: any) => acc + w.amount_ml, 0);
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
      await Promise.all([
        supabase.from('period_logs').delete().eq('user_id', user.id).eq('date', dateStr),
        supabase.from('symptoms').delete().eq('user_id', user.id).eq('date', dateStr),
        supabase.from('moods').delete().eq('user_id', user.id).eq('date', dateStr),
        supabase.from('water_logs').delete().eq('user_id', user.id).eq('date', dateStr),
        supabase.from('sleep_logs').delete().eq('user_id', user.id).eq('date', dateStr),
        supabase.from('notes').delete().eq('user_id', user.id).eq('date', dateStr),
        supabase.from('weight_logs').delete().eq('user_id', user.id).eq('date', dateStr),
      ]);

      const queries: any[] = [];

      if (flow) {
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
        queries.push(supabase.from('moods').insert({ user_id: user.id, date: dateStr, mood_type: mood, intensity: pain }));
      }

      if (symptoms.length > 0) {
        const rows = symptoms.map(s => ({ user_id: user.id, date: dateStr, symptom_type: s, severity: pain }));
        queries.push(supabase.from('symptoms').insert(rows));
      }

      if (water > 0) {
        queries.push(supabase.from('water_logs').insert({ user_id: user.id, date: dateStr, amount_ml: water * 250 }));
      }

      if (sleep > 0) {
        queries.push(supabase.from('sleep_logs').insert({ user_id: user.id, date: dateStr, hours: sleep, quality: 'good' }));
      }

      if (weight.trim()) {
        queries.push(supabase.from('weight_logs').insert({ user_id: user.id, date: dateStr, weight_kg: parseFloat(weight) || 60 }));
      }

      if (notes.trim()) {
        queries.push(supabase.from('notes').insert({ user_id: user.id, date: dateStr, content: notes }));
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
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <ThemedText style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Daily Log</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '500', marginTop: 1 }}>
              {format(selectedDate, 'EEEE, MMMM d')}
            </ThemedText>
          </View>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: theme.primary }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Save</ThemedText>
            )}
          </Pressable>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Flow */}
            <Animated.View entering={FadeInDown.duration(400).delay(50).springify()} style={styles.section}>
              <SectionHeader icon="water-outline" title="Menstrual Flow" color="#E91E63" />
              <View style={styles.chipRow}>
                {FLOW_OPTIONS.map(f => {
                  const isActive = flow === f.label;
                  return (
                    <Pressable
                      key={f.label}
                      style={[
                        styles.flowChip,
                        { backgroundColor: isActive ? f.color : theme.backgroundElement, borderColor: isActive ? f.color : 'transparent', borderWidth: 1.5 }
                      ]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFlow(flow === f.label ? null : f.label); }}
                    >
                      <View style={[styles.flowDot, { backgroundColor: isActive ? '#fff' : f.color }]} />
                      <ThemedText style={{ color: isActive ? '#fff' : theme.text, fontWeight: '700', fontSize: 13 }}>{f.label}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            {/* Mood */}
            <Animated.View entering={FadeInDown.duration(400).delay(100).springify()} style={styles.section}>
              <SectionHeader icon="happy-outline" title="How Are You Feeling?" color="#FFB74D" />
              <View style={styles.moodRow}>
                {MOOD_OPTIONS.map(m => {
                  const isActive = mood === m.label;
                  return (
                    <Pressable
                      key={m.label}
                      style={[
                        styles.moodChip,
                        {
                          backgroundColor: isActive ? `${m.color}25` : theme.backgroundElement,
                          borderColor: isActive ? m.color : 'transparent',
                          borderWidth: 2,
                        }
                      ]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMood(mood === m.label ? null : m.label); }}
                    >
                      <Ionicons name={m.icon as any} size={22} color={isActive ? m.color : theme.textSecondary} />
                      <ThemedText style={{ color: isActive ? m.color : theme.textSecondary, marginTop: 4, fontWeight: '700', fontSize: 10 }}>{m.label}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            {/* Symptoms */}
            <Animated.View entering={FadeInDown.duration(400).delay(150).springify()} style={styles.section}>
              <SectionHeader icon="medical-outline" title="Symptom Check" color="#9575CD" />
              <View style={styles.symptomGrid}>
                {SYMPTOM_OPTIONS.map(s => {
                  const isActive = symptoms.includes(s.label);
                  return (
                    <Pressable
                      key={s.label}
                      style={[
                        styles.symptomChip,
                        {
                          backgroundColor: isActive ? theme.primaryContainer : theme.backgroundElement,
                          borderColor: isActive ? theme.primary : 'transparent',
                          borderWidth: 1.5,
                        }
                      ]}
                      onPress={() => toggleSymptom(s.label)}
                    >
                      <Ionicons name={s.icon as any} size={14} color={isActive ? theme.primary : theme.textSecondary} style={{ marginRight: 4 }} />
                      <ThemedText style={{ color: isActive ? theme.primary : theme.text, fontWeight: '700', fontSize: 12 }}>{s.label}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            {/* Pain Level */}
            <Animated.View entering={FadeInDown.duration(400).delay(200).springify()} style={styles.section}>
              <SectionHeader icon="thermometer-outline" title="Pain Severity" color="#FF7043" />
              <View style={styles.painRow}>
                {PAIN_LEVELS.map(p => {
                  const isActive = pain === p.level;
                  return (
                    <Pressable
                      key={p.level}
                      style={[
                        styles.painBtn,
                        {
                          backgroundColor: isActive ? p.color : theme.backgroundElement,
                          borderColor: isActive ? p.color : 'transparent',
                          borderWidth: 1.5,
                        }
                      ]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPain(p.level); }}
                    >
                      <ThemedText style={{ color: isActive ? '#fff' : theme.text, fontWeight: '800', fontSize: 16 }}>{p.level}</ThemedText>
                      <ThemedText style={{ color: isActive ? 'rgba(255,255,255,0.8)' : theme.textSecondary, fontSize: 9, fontWeight: '600', marginTop: 2 }}>{p.label}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            {/* Water & Sleep */}
            <Animated.View entering={FadeInDown.duration(400).delay(250).springify()} style={styles.section}>
              <SectionHeader icon="partly-sunny-outline" title="Vitals" color="#26C6DA" />
              <View style={styles.vitalsRow}>
                {/* Water */}
                <View style={[styles.vitalCard, { backgroundColor: theme.surface }]}>
                  <View style={[styles.vitalIcon, { backgroundColor: 'rgba(79,195,247,0.15)' }]}>
                    <Ionicons name="water" size={16} color="#4FC3F7" />
                  </View>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 6 }}>Water</ThemedText>
                  <View style={styles.counterRow}>
                    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWater(Math.max(0, water - 1)); }} style={[styles.counterBtn, { backgroundColor: theme.backgroundElement }]}>
                      <Ionicons name="remove" size={16} color={theme.text} />
                    </Pressable>
                    <ThemedText style={{ color: '#4FC3F7', fontSize: 22, fontWeight: '900', minWidth: 36, textAlign: 'center' }}>{water}</ThemedText>
                    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWater(water + 1); }} style={[styles.counterBtn, { backgroundColor: theme.backgroundElement }]}>
                      <Ionicons name="add" size={16} color={theme.text} />
                    </Pressable>
                  </View>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 10 }}>glasses</ThemedText>
                </View>

                {/* Sleep */}
                <View style={[styles.vitalCard, { backgroundColor: theme.surface }]}>
                  <View style={[styles.vitalIcon, { backgroundColor: 'rgba(149,117,205,0.15)' }]}>
                    <Ionicons name="moon" size={16} color="#9575CD" />
                  </View>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 6 }}>Sleep</ThemedText>
                  <View style={styles.counterRow}>
                    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSleep(Math.max(0, sleep - 1)); }} style={[styles.counterBtn, { backgroundColor: theme.backgroundElement }]}>
                      <Ionicons name="remove" size={16} color={theme.text} />
                    </Pressable>
                    <ThemedText style={{ color: '#9575CD', fontSize: 22, fontWeight: '900', minWidth: 36, textAlign: 'center' }}>{sleep}</ThemedText>
                    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSleep(sleep + 1); }} style={[styles.counterBtn, { backgroundColor: theme.backgroundElement }]}>
                      <Ionicons name="add" size={16} color={theme.text} />
                    </Pressable>
                  </View>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 10 }}>hours</ThemedText>
                </View>

                {/* Weight */}
                <View style={[styles.vitalCard, { backgroundColor: theme.surface }]}>
                  <View style={[styles.vitalIcon, { backgroundColor: 'rgba(129,199,132,0.15)' }]}>
                    <Ionicons name="scale-outline" size={16} color="#81C784" />
                  </View>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 6 }}>Weight</ThemedText>
                  <TextInput
                    style={[styles.vitalInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                    placeholder="kg"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={setWeight}
                  />
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 10 }}>kg</ThemedText>
                </View>
              </View>
            </Animated.View>

            {/* Notes */}
            <Animated.View entering={FadeInDown.duration(400).delay(300).springify()} style={styles.section}>
              <SectionHeader icon="create-outline" title="Notes & Diary" color="#78909C" />
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: `${theme.primary}20`, borderWidth: 1 }]}
                placeholder="Write anything — how you feel, cravings, reflections..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={notes}
                onChangeText={setNotes}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(350).springify()}>
              <Button
                label={saving ? "Saving..." : "Save Today's Log"}
                variant="filled"
                onPress={handleSave}
                disabled={saving}
                style={{ marginBottom: Spacing.five }}
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
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three + 4,
    paddingVertical: Spacing.two + 6,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: 80,
  },
  section: {
    marginBottom: Spacing.four + 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  flowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 20,
    gap: 6,
  },
  flowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  moodChip: {
    width: 68,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 20,
  },
  painRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  painBtn: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalsRow: {
    flexDirection: 'row',
    gap: Spacing.two + 4,
  },
  vitalCard: {
    flex: 1,
    borderRadius: 20,
    padding: Spacing.three,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  vitalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalInput: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    height: 36,
    width: '100%',
    borderRadius: 10,
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  textArea: {
    minHeight: 110,
    borderRadius: 16,
    padding: Spacing.three + 4,
    fontSize: 14,
    lineHeight: 22,
  },
});
