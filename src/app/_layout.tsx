import { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Stack, useRouter, useSegments, ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { 
  useFonts, 
  PlusJakartaSans_400Regular, 
  PlusJakartaSans_500Medium, 
  PlusJakartaSans_600SemiBold, 
  PlusJakartaSans_700Bold 
} from '@expo-google-fonts/plus-jakarta-sans';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { AnimatedSplashOverlay } from '@/components/animated-icon';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>Connection Lost</Text>
      <Text style={{ color: '#a1a1aa', textAlign: 'center', marginBottom: 24, fontSize: 16 }}>
        {error.message || "We encountered an unexpected error. Please check your connection and try again."}
      </Text>
      <Pressable 
        onPress={retry} 
        style={{ paddingHorizontal: 24, paddingVertical: 14, backgroundColor: '#d81b60', borderRadius: 30 }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Try Again</Text>
      </Pressable>
    </View>
  );
}

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (loading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isOnboardingPage = segments[1] === 'onboarding';

    if (!session) {
      if (!inAuthGroup) {
        // Redirect to the login page.
        router.replace('/(auth)/login' as any);
      }
    } else {
      const isCompleted = !!session.user?.user_metadata?.onboarding_completed;
      if (!isCompleted) {
        if (!isOnboardingPage) {
          // Redirect to profile completion onboarding.
          router.replace('/(auth)/onboarding' as any);
        }
      } else {
        if (inAuthGroup) {
          // Redirect to the main app dashboard.
          router.replace('/(app)' as any);
        }
      }
    }

    SplashScreen.hideAsync();
  }, [session, loading, fontsLoaded, segments, router]);

  if (loading || !fontsLoaded) return null;

  return (
    <>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(app)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="log" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="reports" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ai" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
