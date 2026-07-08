import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { scheduleMedicineReminder } from '@/utils/notifications';

export default function AddMedicineScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [schedule, setSchedule] = useState('Every Day');
  const [time, setTime] = useState('09:00 AM');

  const handleSave = () => {
    // In a real app, save to Supabase here.
    scheduleMedicineReminder();
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
            Add Medication
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

          {/* Details */}
          <Animated.View entering={FadeInDown.duration(400).delay(100).springify()} style={styles.section}>
            <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Medication Details</ThemedText>
            
            <View style={styles.inputGroup}>
              <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.two }}>Name</ThemedText>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder="e.g. Birth Control"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="labelMedium" style={{ color: theme.textSecondary, marginBottom: Spacing.two }}>Dosage</ThemedText>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder="e.g. 1 Pill or 50mg"
                placeholderTextColor={theme.textSecondary}
                value={dosage}
                onChangeText={setDosage}
              />
            </View>
          </Animated.View>

          {/* Repeat Schedule */}
          <Animated.View entering={FadeInDown.duration(400).delay(200).springify()} style={styles.section}>
            <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Repeat Schedule</ThemedText>
            <View style={styles.chipRow}>
              {['Every Day', 'Specific Days', 'As Needed'].map(opt => (
                <Pressable 
                  key={opt}
                  style={[styles.chip, schedule === opt ? { backgroundColor: theme.primary } : { backgroundColor: theme.backgroundElement }]}
                  onPress={() => setSchedule(opt)}
                >
                  <ThemedText type="labelMedium" style={{ color: schedule === opt ? '#fff' : theme.textSecondary }}>{opt}</ThemedText>
                </Pressable>
              ))}
            </View>
            
            {schedule === 'Specific Days' && (
              <View style={[styles.chipRow, { marginTop: Spacing.three }]}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <View key={i} style={[styles.circleChip, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="labelMedium" style={{ color: theme.textSecondary }}>{day}</ThemedText>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Reminder Time */}
          <Animated.View entering={FadeInDown.duration(400).delay(300).springify()} style={styles.section}>
            <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Reminder Time</ThemedText>
            
            <View style={[styles.timeSelector, { backgroundColor: theme.backgroundElement }]}>
               <Ionicons name="notifications-outline" size={24} color={theme.textSecondary} />
               <ThemedText type="titleLarge" style={{ color: theme.text, flex: 1, marginLeft: Spacing.three }}>
                 {time}
               </ThemedText>
               <Pressable style={[styles.editTimeBtn, { backgroundColor: theme.primaryContainer }]}>
                 <ThemedText type="labelMedium" style={{ color: theme.primary }}>Edit</ThemedText>
               </Pressable>
            </View>
            <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: Spacing.two }}>
              You will receive a push notification when it's time.
            </ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(400).springify()}>
             <Button label="Save Medication" variant="filled" onPress={handleSave} style={{ marginBottom: Spacing.six }} />
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
    marginBottom: Spacing.four,
  },
  inputGroup: {
    marginBottom: Spacing.four,
  },
  input: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: Spacing.four,
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  chip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 24,
  },
  circleChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 16,
  },
  editTimeBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 16,
  }
});
