import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, useColorScheme } from 'react-native';
import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function AppLayout() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          safeAreaInsets: { bottom: 0, top: 0, left: 0, right: 0 },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarShowLabel: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 16,
            left: 16,
            right: 16,
            height: 74,
            borderRadius: 24,
            backgroundColor: isDark ? 'rgba(22, 24, 34, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderTopWidth: 0,
            elevation: 12,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.35 : 0.08,
            shadowRadius: 18,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            paddingBottom: 0,
          },
          tabBarItemStyle: {
            height: 74,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 0,
            margin: 0,
          }
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} theme={theme} title="Today" />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} theme={theme} title="Calendar" />
            ),
          }}
        />
        <Tabs.Screen
          name="medicine"
          options={{
            title: 'Medications',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'medical' : 'medical-outline'} focused={focused} theme={theme} title="Meds" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} theme={theme} title="Profile" />
            ),
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}

function TabIcon({ name, focused, theme, title }: { name: any, focused: boolean, theme: any, title: string }) {
  const scale = useSharedValue(focused ? 1.05 : 1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.05 : 1, { damping: 15, stiffness: 200 });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View 
      style={[
        styles.tabIconWrapper, 
        focused && { backgroundColor: theme.primaryContainer },
        animatedStyle
      ]}
    >
      <Ionicons name={name} size={22} color={focused ? theme.primary : theme.textSecondary} />
      <ThemedText 
        type="labelSmall" 
        style={[
          styles.tabLabel, 
          { color: focused ? theme.primary : theme.textSecondary }
        ]}
      >
        {title}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 56,
    borderRadius: 18,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});
