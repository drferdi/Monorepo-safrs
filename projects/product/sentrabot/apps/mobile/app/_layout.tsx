import { I18nProvider } from "@lingui/react";
import { useLingui } from "@lingui/react/macro";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AvatarStyleProvider } from "../components/avatar-style";
import { currentApiBase, loadApiBase, loadSessionToken } from "../lib/api";
import { activateLocale, i18n } from "../lib/i18n";
import {
  configureForegroundNotifications,
  resumeLiveNotifications,
} from "../lib/live-notifications";
import { applyMobileUiDirection } from "../lib/ui-direction";
import { loadUiLocale } from "../lib/ui-locale";

applyMobileUiDirection();
configureForegroundNotifications();

export default function Layout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.allSettled([
      loadApiBase().then(async () =>
        resumeLiveNotifications(currentApiBase(), await loadSessionToken()),
      ),
      loadUiLocale().then(activateLocale),
    ]).then(() => setReady(true));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        {ready ? (
          <I18nProvider i18n={i18n}>
            <AvatarStyleProvider>
              <ThemeProvider value={DarkTheme}>
                <StatusBar style="light" />
                <RootStack />
              </ThemeProvider>
            </AvatarStyleProvider>
          </I18nProvider>
        ) : (
          <View style={{ flex: 1, backgroundColor: "#000" }} />
        )}
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

// Rendered under I18nProvider so header titles follow the active locale.
function RootStack() {
  const { t } = useLingui();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#000" },
        headerTintColor: "#ECECEE",
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: "#000" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: "Sentra Bot" }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="account" options={{ title: t`Account` }} />
      <Stack.Screen name="models" options={{ title: t`Models` }} />
      <Stack.Screen name="voice" options={{ title: t`Voice` }} />
      <Stack.Screen name="integrations" options={{ title: t`Integrations` }} />
      <Stack.Screen
        name="new"
        options={{
          title: t`New bot`,
          presentation: "modal",
          gestureEnabled: true,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="new-group"
        options={{
          title: t`New group`,
          presentation: "modal",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen name="group-thread" options={{ title: t`Group` }} />
      <Stack.Screen name="group-settings" options={{ title: t`Group settings` }} />
      <Stack.Screen name="bot-settings" options={{ title: t`Chat settings` }} />
      <Stack.Screen name="thread" options={{ title: t`Thread` }} />
      <Stack.Screen name="routine" options={{ title: t`Routine` }} />
      <Stack.Screen name="computer" options={{ title: t`Computer` }} />
    </Stack>
  );
}
