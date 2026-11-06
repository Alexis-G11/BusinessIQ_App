import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { LoadingState } from '@/components/ui/States';
import { colors } from '@/theme';

export default function AppLayout() {
  const { session, loading: authLoading, authError } = useAuth();
  const { businesses, loading: bizLoading } = useBusiness();
  const router = useRouter();
  const segments = useSegments();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  if (authLoading) return <LoadingState message="Loading BusinessIQ..." />;
  if (!session) {
    setTimeout(() => router.replace('/sign-in'), 0);
    return <LoadingState message="Redirecting..." />;
  }
  if (authError) {
    return <LoadingState message={`Could not load your account: ${authError}`} />;
  }
  if (!bizLoading && businesses.length === 0) {
    const currentPath = '/' + segments.join('/');
    if (!currentPath.includes('onboarding')) {
      setTimeout(() => router.replace('/(app)/onboarding'), 0);
      return <LoadingState message="Setting up your workspace..." />;
    }
  }

  return (
    <View style={styles.container}>
      {/* Desktop Sidebar (always visible on web) */}
      {Platform.OS === 'web' && (
        <View style={styles.sidebarContainer}>
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        </View>
      )}

      {/* Mobile sidebar overlay */}
      {Platform.OS !== 'web' && mobileSidebarOpen && (
        <View style={styles.mobileSidebarOverlay}>
          <View style={styles.mobileSidebarBg} onTouchEnd={() => setMobileSidebarOpen(false)} />
          <View style={styles.sidebarContainer}>
            <Sidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
          </View>
        </View>
      )}

      <View style={styles.mainArea}>
        <TopBar onMobileMenu={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <View style={styles.contentArea}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  } as any,
  sidebarContainer: {
    height: '100%',
  } as any,
  mainArea: {
    flex: 1,
    flexDirection: 'column',
  } as any,
  contentArea: {
    flex: 1,
  } as any,
  mobileSidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
    flexDirection: 'row',
  } as any,
  mobileSidebarBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  } as any,
});
