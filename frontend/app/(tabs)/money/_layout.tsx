import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function MoneyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.neutral[50] } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="expense-add" />
      <Stack.Screen name="purchases" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="payment-add" />
      <Stack.Screen name="receivables" />
      <Stack.Screen name="payables" />
    </Stack>
  );
}
