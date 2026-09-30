import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.neutral[0] } }}>
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="email-confirm" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="trial" />
    </Stack>
  );
}
