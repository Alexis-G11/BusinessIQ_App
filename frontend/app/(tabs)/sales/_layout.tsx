import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function SalesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.neutral[50] } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="record" />
      <Stack.Screen name="history" />
      <Stack.Screen name="sale-detail" />
      <Stack.Screen name="products" />
      <Stack.Screen name="product-edit" />
    </Stack>
  );
}
