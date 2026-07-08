import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function InsightsLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right', // Fluid native-like transition
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="[id]" 
        options={{
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
