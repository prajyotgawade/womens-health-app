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
        
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={theme.text} />
          </Pressable>
          <ThemedText type="titleLarge" style={{ color: theme.text, fontWeight: '700' }}>
            Add Medication
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

            {/* Details */}
            <Animated.View entering={FadeInDown.duration(400).delay(50).springify()} style={styles.section}>
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
            <Animated.View entering={FadeInDown.duration(400).delay(100).springify()} style={styles.section}>
              <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Repeat Schedule</ThemedText>
              <View style={styles.chipRow}>
                {['Every Day', 'Specific Days', 'As Needed'].map(opt => (
                  <Pressable 
                    key={opt}
                    style={[
                      styles.chip, 
                      { backgroundColor: theme.backgroundElement },
                      schedule === opt && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSchedule(opt);
                    }}
                  >
                    <ThemedText type="labelMedium" style={{ color: schedule === opt ? '#fff' : theme.textSecondary, fontWeight: '600' }}>{opt}</ThemedText>
                  </Pressable>
                ))}
              </View>
              
              {schedule === 'Specific Days' && (
                <View style={[styles.chipRow, { marginTop: Spacing.three }]}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <View key={i} style={[styles.circleChip, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="labelMedium" style={{ color: theme.textSecondary, fontWeight: '600' }}>{day}</ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>

            {/* Reminder Time */}
            <Animated.View entering={FadeInDown.duration(400).delay(150).springify()} style={styles.section}>
              <ThemedText type="titleMedium" style={[styles.sectionTitle, { color: theme.text }]}>Reminder Time</ThemedText>
              
              <View style={[styles.timeSelector, { backgroundColor: theme.backgroundElement }]}>
                 <Ionicons name="notifications-outline" size={24} color={theme.textSecondary} />
                 <ThemedText type="titleLarge" style={{ color: theme.text, flex: 1, marginLeft: Spacing.three, fontWeight: '700' }}>
                   {time}
                 </ThemedText>
                 <Pressable 
                   style={[styles.editTimeBtn, { backgroundColor: theme.primaryContainer }]}
                   onPress={() => {
                     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                     // Simulate updating time
                     const hours = ['08', '09', '10', '11', '12', '18', '20', '21'];
                     const randomHour = hours[Math.floor(Math.random() * hours.length)];
                     setTime(`${randomHour}:00 AM`);
                   }}
                 >
                   <ThemedText type="labelMedium" style={{ color: theme.primary, fontWeight: '700' }}>Simulate Edit</ThemedText>
                 </Pressable>
              </View>
              <ThemedText type="labelSmall" style={{ color: theme.textSecondary, marginTop: Spacing.two }}>
                You will receive a push notification reminder when it's time.
              </ThemedText>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(200).springify()}>
               <Button 
                 label={saving ? "Saving Medication..." : "Save Medication"} 
                 variant="filled" 
                 onPress={handleSave} 
                 disabled={saving} 
                 style={{ marginBottom: Spacing.six }} 
               />
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
    marginBottom: Spacing.three,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: Spacing.four,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: Spacing.four,
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 20,
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
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
  }
});
