import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function ReportsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.neutral[50] } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="income-statement" />
      <Stack.Screen name="balance-sheet" />
      <Stack.Screen name="cash-flow" />
      <Stack.Screen name="trial-balance" />
      <Stack.Screen name="journal" />
    </Stack>
  );
}
