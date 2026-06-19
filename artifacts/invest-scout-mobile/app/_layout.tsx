import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function RootLayoutNav() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#171717" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="opportunity/[id]" options={{ headerShown: true, title: "Opportunity", headerBackTitle: "Back" }} />
          <Stack.Screen name="hub/[slug]" options={{ headerShown: true, title: "Hub", headerBackTitle: "Back" }} />
          <Stack.Screen name="forum/[id]" options={{ headerShown: true, title: "Discussion", headerBackTitle: "Back" }} />
          <Stack.Screen name="notifications" options={{ headerShown: true, title: "Notifications", headerBackTitle: "Back" }} />
          <Stack.Screen name="settings" options={{ headerShown: true, title: "Settings", headerBackTitle: "Back" }} />
          <Stack.Screen name="user/[id]" options={{ headerShown: true, title: "Profile", headerBackTitle: "Back" }} />
          <Stack.Screen name="conversation/[id]" options={{ headerShown: true, title: "Chat", headerBackTitle: "Back" }} />
          <Stack.Screen name="dashboard" options={{ headerShown: true, title: "Dashboard", headerBackTitle: "Back" }} />
          <Stack.Screen name="headlines" options={{ headerShown: true, title: "Headlines", headerBackTitle: "Back" }} />
          <Stack.Screen name="activity" options={{ headerShown: true, title: "Activity", headerBackTitle: "Back" }} />
          <Stack.Screen name="interests" options={{ headerShown: true, title: "Interests", headerBackTitle: "Back" }} />
          <Stack.Screen name="users" options={{ headerShown: true, title: "Investors", headerBackTitle: "Back" }} />
          <Stack.Screen name="follow-requests" options={{ headerShown: true, title: "Follow Requests", headerBackTitle: "Back" }} />
          <Stack.Screen name="portfolio" options={{ headerShown: true, title: "Portfolio", headerBackTitle: "Back" }} />
          <Stack.Screen name="cashflow" options={{ headerShown: true, title: "Cash Flow", headerBackTitle: "Back" }} />
          <Stack.Screen name="goals" options={{ headerShown: true, title: "Goals", headerBackTitle: "Back" }} />
          <Stack.Screen name="journal" options={{ headerShown: true, title: "Journal", headerBackTitle: "Back" }} />
          <Stack.Screen name="ratios" options={{ headerShown: true, title: "Ratios", headerBackTitle: "Back" }} />
          <Stack.Screen name="tools/index" options={{ headerShown: true, title: "Tools", headerBackTitle: "Back" }} />
          <Stack.Screen name="tools/[slug]" options={{ headerShown: true, title: "Tool", headerBackTitle: "Back" }} />
        </>
      ) : (
        <>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" redirect />
        </>
      )}
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
