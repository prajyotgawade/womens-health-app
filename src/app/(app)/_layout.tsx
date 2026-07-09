import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, useColorScheme } from 'react-native';
import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function AppLayout() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarShowLabel: false, // Hidden for a clean, premium floating icon-only look
          tabBarStyle: {
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 24 : 16,
            left: 20,
            right: 20,
            height: 68,
            borderRadius: 34,
            backgroundColor: isDark ? 'rgba(21, 15, 17, 0.88)' : 'rgba(255, 248, 248, 0.88)',
            borderTopWidth: 0,
            elevation: 8,
            shadowColor: '#B64B74',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isDark ? 0.3 : 0.08,
            shadowRadius: 24,
            paddingBottom: 0,
            overflow: 'hidden',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'home' : 'home-outline'} color={focused ? theme.primary : theme.textSecondary} focused={focused} theme={theme} label="Today" />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'calendar' : 'calendar-outline'} color={focused ? theme.primary : theme.textSecondary} focused={focused} theme={theme} label="Calendar" />
            ),
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: 'Insights',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'bulb' : 'bulb-outline'} color={focused ? theme.primary : theme.textSecondary} focused={focused} theme={theme} label="Insights" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'person' : 'person-outline'} color={focused ? theme.primary : theme.textSecondary} focused={focused} theme={theme} label="Profile" />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

function TabIcon({ name, color, focused, theme, label }: { name: any, color: string, focused: boolean, theme: any, label: string }) {
  const scale = useSharedValue(1);
  const activeDotScale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.12 : 1, { damping: 12, stiffness: 200 });
    activeDotScale.value = withSpring(focused ? 1 : 0, { damping: 10, stiffness: 150 });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: activeDotScale.value }],
    opacity: activeDotScale.value,
  }));

  return (
    <Animated.View style={[styles.iconContainer, animatedStyle]}>
      <View style={[styles.iconWrap, focused && { backgroundColor: theme.primaryContainer }]}>
        <Ionicons name={name} size={22} color={color} />
      </View>
      <Animated.View style={[styles.activeDot, { backgroundColor: theme.primary }, dotStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: 60,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 2,
  },
});
