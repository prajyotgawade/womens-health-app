import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';

export default function DailyLogScreen() {
  const router = useRouter();
  const theme = useTheme();

  // State Management for all 10 fields
  const [flow, setFlow] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [pain, setPain] = useState<number>(0);
  const [water, setWater] = useState<number>(0);
  const [sleep, setSleep] = useState<number>(8);
  const [exercise, setExercise] = useState<string | null>(null);
  const [weight, setWeight] = useState<string>('');
  const [temp, setTemp] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const toggleSymptom = (s: string) => {
    setSymptoms(prev => prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s]);
  };

  const handleSave = () => {
    // This is where we would save to Supabase.
    // For now, simply dismiss the modal.
    router.back();
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
            Log for {format(new Date(), 'MMM d')}
          </ThemedText>
          <Pressable onPress={handleSave}>
            <ThemedText type="titleMedium" style={{ color: theme.primary, fontWeight: '700' }}>
              Save
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* 1. Flow */}
          <Animated.View entering={FadeInDown.duration(400).delay(100).springify()} style={styles.section}>
            <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Flow</ThemedText>
            <View style={styles.chipRow}>
              {['Light', 'Medium', 'Heavy'].map(f => (
                <Pressable 
                  key={f}
                  style={[styles.chip, flow === f ? { backgroundColor: theme.error } : { backgroundColor: theme.backgroundElement }]}
                  onPress={() => setFlow(f)}
                >
                  <ThemedText type="labelMedium" style={{ color: flow === f ? '#fff' : theme.textSecondary }}>{f}</ThemedText>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* 2. Mood */}
          <Animated.View entering={FadeInDown.duration(400).delay(150).springify()} style={styles.section}>
            <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Mood</ThemedText>
            <View style={styles.chipRow}>
              {[
                { label: 'Happy', icon: 'happy-outline' },
                { label: 'Calm', icon: 'leaf-outline' },
                { label: 'Sad', icon: 'sad-outline' },
                { label: 'Angry', icon: 'flame-outline' },
              ].map(m => (
                <Pressable 
                  key={m.label}
                  style={[styles.iconChip, mood === m.label ? { backgroundColor: theme.tertiary, borderColor: theme.tertiary } : { borderColor: theme.backgroundElement }]}
                  onPress={() => setMood(m.label)}
                >
                  <Ionicons name={m.icon as any} size={24} color={mood === m.label ? '#fff' : theme.textSecondary} />
                  <ThemedText type="labelSmall" style={{ color: mood === m.label ? '#fff' : theme.textSecondary, marginTop: 4 }}>{m.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* 3. Symptoms (Multi-select) */}
          <Animated.View entering={FadeInDown.duration(400).delay(200).springify()} style={styles.section}>
            <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Symptoms</ThemedText>
            <View style={styles.chipGrid}>
              {['Cramps', 'Headache', 'Bloating', 'Nausea', 'Fatigue', 'Acne'].map(s => {
                const active = symptoms.includes(s);
                return (
                  <Pressable 
                    key={s}
                    style={[styles.chip, active ? { backgroundColor: theme.primary } : { backgroundColor: theme.backgroundElement }]}
                    onPress={() => toggleSymptom(s)}
                  >
                    <ThemedText type="labelMedium" style={{ color: active ? '#fff' : theme.textSecondary }}>{s}</ThemedText>
                  </Pressable>
                )
              })}
            </View>
          </Animated.View>

          {/* 4. Pain Level */}
          <Animated.View entering={FadeInDown.duration(400).delay(250).springify()} style={styles.section}>
            <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Pain Level</ThemedText>
            <View style={styles.segmentedControl}>
              {[1, 2, 3, 4, 5].map(level => (
                <Pressable 
                  key={level}
                  style={[styles.segmentBtn, pain === level ? { backgroundColor: theme.errorContainer } : { backgroundColor: theme.backgroundElement }]}
                  onPress={() => setPain(level)}
                >
                  <ThemedText type="titleMedium" style={{ color: pain === level ? theme.error : theme.textSecondary }}>{level}</ThemedText>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* 5. Water & 6. Sleep */}
          <View style={styles.row}>
            <Animated.View entering={FadeInDown.duration(400).delay(300).springify()} style={[styles.section, { flex: 1, marginRight: Spacing.two }]}>
              <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Water (Glasses)</ThemedText>
              <View style={[styles.counter, { backgroundColor: theme.backgroundElement }]}>
                <Pressable onPress={() => setWater(Math.max(0, water - 1))} style={styles.counterBtn}>
                  <Ionicons name="remove" size={24} color={theme.text} />
                </Pressable>
                <ThemedText type="titleLarge" style={{ color: theme.primary }}>{water}</ThemedText>
                <Pressable onPress={() => setWater(water + 1)} style={styles.counterBtn}>
                  <Ionicons name="add" size={24} color={theme.text} />
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(350).springify()} style={[styles.section, { flex: 1, marginLeft: Spacing.two }]}>
              <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Sleep (Hrs)</ThemedText>
              <View style={[styles.counter, { backgroundColor: theme.backgroundElement }]}>
                <Pressable onPress={() => setSleep(Math.max(0, sleep - 1))} style={styles.counterBtn}>
                  <Ionicons name="remove" size={24} color={theme.text} />
                </Pressable>
                <ThemedText type="titleLarge" style={{ color: theme.tertiary }}>{sleep}</ThemedText>
                <Pressable onPress={() => setSleep(sleep + 1)} style={styles.counterBtn}>
                  <Ionicons name="add" size={24} color={theme.text} />
                </Pressable>
              </View>
            </Animated.View>
          </View>

          {/* 7. Exercise */}
          <Animated.View entering={FadeInDown.duration(400).delay(400).springify()} style={styles.section}>
            <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Exercise</ThemedText>
            <View style={styles.chipRow}>
              {['Rest', 'Walking', 'Running', 'Yoga', 'Weights'].map(e => (
                <Pressable 
                  key={e}
                  style={[styles.chip, exercise === e ? { backgroundColor: theme.primary } : { backgroundColor: theme.backgroundElement }]}
                  onPress={() => setExercise(e)}
                >
                  <ThemedText type="labelMedium" style={{ color: exercise === e ? '#fff' : theme.textSecondary }}>{e}</ThemedText>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* 8. Vitals */}
          <View style={styles.row}>
            <Animated.View entering={FadeInDown.duration(400).delay(450).springify()} style={[styles.section, { flex: 1, marginRight: Spacing.two }]}>
              <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Weight</ThemedText>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder="0.0 lbs"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(500).springify()} style={[styles.section, { flex: 1, marginLeft: Spacing.two }]}>
              <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Temperature</ThemedText>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder="00.0 °F"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={temp}
                onChangeText={setTemp}
              />
            </Animated.View>
          </View>

          {/* 9. Notes */}
          <Animated.View entering={FadeInDown.duration(400).delay(550).springify()} style={styles.section}>
            <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Notes</ThemedText>
            <TextInput 
              style={[styles.textArea, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="How are you feeling today?"
              placeholderTextColor={theme.textSecondary}
              multiline
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(600).springify()}>
             <Button label="Save Log" variant="filled" onPress={handleSave} style={{ marginBottom: Spacing.six }} />
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
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
    marginBottom: Spacing.six,
  },
  sectionTitle: {
    marginBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  chip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 24,
  },
  iconChip: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  segmentBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    borderRadius: 28,
    paddingHorizontal: Spacing.four,
  },
  counterBtn: {
    padding: Spacing.two,
  },
  input: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: Spacing.four,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
    borderRadius: 16,
    padding: Spacing.four,
    fontSize: 16,
  },
});
