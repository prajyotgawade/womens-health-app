import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { CalendarProvider, ExpandableCalendar, AgendaList } from 'react-native-calendars';
import { format, subDays, addDays } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';

const TODAY = new Date();
const todayStr = format(TODAY, 'yyyy-MM-dd');

// Mock Daily Logs
const AGENDA_ITEMS = [
  {
    title: format(subDays(TODAY, 1), 'yyyy-MM-dd'),
    data: [
      { type: 'mood', icon: 'happy', value: 'Calm', color: '#FFD54F' },
      { type: 'water', icon: 'water', value: '1.5L', color: '#4FC3F7' },
    ]
  },
  {
    title: todayStr,
    data: [
      { type: 'symptom', icon: 'medkit', value: 'Cramps', color: '#E57373' },
      { type: 'note', icon: 'document-text', value: 'Felt very energetic in the morning.', color: '#81C784' },
    ]
  },
  {
    title: format(addDays(TODAY, 1), 'yyyy-MM-dd'),
    data: [
      { type: 'ovulation', icon: 'radio-button-on', value: 'Predicted Ovulation', color: '#9575CD' },
    ]
  }
];

export default function CalendarScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const markedDates = useMemo(() => {
    const dates: any = {};
    
    // Today
    dates[todayStr] = { marked: true, dotColor: theme.primary };
    
    // Ovulation Day
    dates[format(addDays(TODAY, 1), 'yyyy-MM-dd')] = { marked: true, dotColor: theme.tertiary, startingDay: true, endingDay: true, color: theme.tertiaryContainer, textColor: theme.tertiary };

    // Past Period (5 days)
    for (let i = 0; i < 5; i++) {
      const pDate = format(subDays(TODAY, 14 - i), 'yyyy-MM-dd');
      dates[pDate] = { 
        startingDay: i === 0, 
        endingDay: i === 4, 
        color: theme.error, 
        textColor: '#FFFFFF',
        marked: true,
        dotColor: 'rgba(255,255,255,0.5)'
      };
    }
    return dates;
  }, [theme]);

  const themeConfig = useMemo(() => {
    return {
      calendarBackground: theme.background,
      textSectionTitleColor: theme.textSecondary,
      selectedDayBackgroundColor: theme.primary,
      selectedDayTextColor: theme.onPrimary,
      todayTextColor: theme.primary,
      dayTextColor: theme.text,
      textDisabledColor: 'rgba(150,150,150,0.2)',
      dotColor: theme.primary,
      selectedDotColor: '#ffffff',
      arrowColor: theme.primary,
      monthTextColor: theme.text,
      textMonthFontWeight: 'bold' as const,
      textDayFontFamily: 'PlusJakartaSans_500Medium',
      textMonthFontFamily: 'PlusJakartaSans_700Bold',
      textDayHeaderFontFamily: 'PlusJakartaSans_600SemiBold',
      'stylesheet.calendar.header': {
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingLeft: 10,
          paddingRight: 10,
          marginTop: 6,
          alignItems: 'center'
        },
      }
    };
  }, [theme]);

  const renderItem = ({ item }: { item: any }) => {
    return (
      <Animated.View entering={FadeInDown.duration(400).springify()}>
        <Card variant="elevated" style={styles.logCard}>
          <View style={[styles.logIcon, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon} size={20} color={item.color} />
          </View>
          <View style={styles.logContent}>
            <ThemedText type="labelMedium" style={{ color: theme.textSecondary, textTransform: 'capitalize' }}>
              {item.type}
            </ThemedText>
            <ThemedText type="titleMedium" style={{ color: theme.text }}>
              {item.value}
            </ThemedText>
          </View>
        </Card>
      </Animated.View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <ThemedText type="displaySmall" style={{ color: theme.primary, paddingHorizontal: Spacing.four, fontWeight: '700' }}>
          Calendar
        </ThemedText>
        
        {/* Premium Visual Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.error }]} />
            <ThemedText type="labelMedium" style={{ color: theme.textSecondary }}>Period</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.tertiary }]} />
            <ThemedText type="labelMedium" style={{ color: theme.textSecondary }}>Ovulation</ThemedText>
          </View>
        </View>
      </View>

      <CalendarProvider
        date={todayStr}
        showTodayButton
        theme={{ todayButtonTextColor: theme.primary }}
      >
        <ExpandableCalendar
          theme={themeConfig}
          firstDay={1}
          markedDates={markedDates}
          markingType="period"
          animateScroll
          closeOnDayPress={false}
          style={styles.calendar}
        />
        
        <View style={[styles.agendaHeader, { backgroundColor: theme.background }]}>
          <ThemedText type="titleMedium" style={{ color: theme.textSecondary }}>Daily Logs</ThemedText>
        </View>

        <AgendaList
          sections={AGENDA_ITEMS}
          renderItem={renderItem}
          sectionStyle={{ ...styles.sectionHeader, backgroundColor: theme.background }}
          theme={{
            backgroundColor: theme.background,
            calendarBackground: theme.background,
          }}
          // @ts-ignore
          renderSectionHeader={(section: string) => {
             return (
               <ThemedText type="labelMedium" style={[styles.sectionTitle, { color: theme.primary }]}>
                 {format(new Date(section), 'EEEE, MMM d')}
               </ThemedText>
             )
          }}
        />
      </CalendarProvider>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: Spacing.four,
  },
  legendContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.two,
    gap: Spacing.four,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  agendaHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.two,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.four,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    fontWeight: '600',
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.two,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.four,
  },
  logContent: {
    flex: 1,
  },
});
