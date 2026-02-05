import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, loading, segments]);

  if (loading) return null;

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: '#fff' },
      headerShadowVisible: false
    }}>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="login" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Register' }} />
      <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
