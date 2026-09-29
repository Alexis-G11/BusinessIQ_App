import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.neutral[50] } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="customer-detail" />
      <Stack.Screen name="customer-edit" />
      <Stack.Screen name="suppliers" />
      <Stack.Screen name="supplier-detail" />
      <Stack.Screen name="supplier-edit" />
      <Stack.Screen name="ai-assistant" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="help-center" />
    </Stack>
  );
}
