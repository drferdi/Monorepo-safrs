import { Trans, useLingui } from "@lingui/react/macro";
import type { AvatarStyle } from "@sentrabot/contracts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAvatarStyle } from "../components/avatar-style";
import { BotAvatar } from "../components/bot-avatar";
import type { MobileBot } from "../lib/api";
import {
  currentApiBase,
  deleteAccount,
  loadSessionToken,
  type MobileMe,
  rpc,
  signOut,
} from "../lib/api";
import { confirmDeleteBot } from "../lib/bot-lifecycle";
import { activateLocale } from "../lib/i18n";
import {
  canPostPromotedNotifications,
  DEFAULT_LIVE_NOTIFICATION_SETTINGS,
  getLiveNotificationSettings,
  type LiveNotificationSettings,
  openLiveNotificationSettings,
  openPromotedNotificationSettings,
  setLiveNotificationSettings,
} from "../lib/live-notifications";
import { native } from "../lib/native";
import { registerPushToken } from "../lib/push";
import { persistUiLocale, type UiLocale } from "../lib/ui-locale";

const UI_LOCALE_OPTIONS: { locale: UiLocale; label: string }[] = [
  { locale: "id", label: "Bahasa Indonesia" },
  { locale: "en", label: "English" },
];

export default function Account() {
  const router = useRouter();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const [me, setMe] = useState<MobileMe | null>(null);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [avatarPending, setAvatarPending] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<LiveNotificationSettings>(
    DEFAULT_LIVE_NOTIFICATION_SETTINGS,
  );
  const [notificationsReady, setNotificationsReady] = useState(Platform.OS !== "android");
  const [notificationPending, setNotificationPending] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archivedBots, setArchivedBots] = useState<MobileBot[]>([]);
  const [usage, setUsage] = useState<{
    runs: number;
    inputTokens: number;
    outputTokens: number;
  } | null>(null);
  const { avatarStyle, updateAvatarStyle } = useAvatarStyle();
  const { t, i18n } = useLingui();

  useEffect(() => {
    void rpc<MobileMe>("me")
      .then(setMe)
      .catch(() => undefined);
    void rpc<MobileBot[]>("bots/listArchived")
      .then(setArchivedBots)
      .catch(() => undefined);
    void rpc<{ runs: number; inputTokens: number; outputTokens: number }>("usage/summary")
      .then(setUsage)
      .catch(() => undefined);
    if (Platform.OS === "android") {
      void getLiveNotificationSettings()
        .then(setNotifications)
        .catch(() => undefined)
        .finally(() => setNotificationsReady(true));
    }
  }, []);

  const usageBlock = (
    <View accessibilityLabel={t`Usage`} style={styles.profile}>
      <Text style={styles.settingsTitle}>
        <Trans>Usage</Trans>
      </Text>
      {usage ? (
        <Text style={styles.email}>
          <Trans>
            {usage.runs} runs · {usage.inputTokens + usage.outputTokens} tokens
          </Trans>
        </Text>
      ) : null}
      <Text style={styles.settingsExplanation}>
        <Trans>Model spend uses your provider keys.</Trans>
      </Text>
    </View>
  );

  async function restoreBot(botId: string) {
    try {
      await rpc("bots/restore", { botId });
      setArchivedBots((bots) => bots.filter((bot) => bot.id !== botId));
    } catch (restoreError) {
      Alert.alert(
        t`Could not restore bot`,
        restoreError instanceof Error ? restoreError.message : t`Try again.`,
      );
    }
  }

  async function selectAvatarStyle(next: AvatarStyle) {
    if (next === avatarStyle) return;
    setAvatarPending(true);
    setAvatarError(null);
    try {
      await updateAvatarStyle(next);
    } catch {
      setAvatarError(t`Couldn't update avatars`);
    } finally {
      setAvatarPending(false);
    }
  }

  async function selectLocale(locale: UiLocale) {
    if (i18n.locale === locale) return;
    await persistUiLocale(locale);
    await activateLocale(locale);
  }

  async function handleSignOut() {
    setPending(true);
    await signOut();
    router.dismissAll();
    router.replace("/sign-in");
  }

  async function updateNotifications(next: LiveNotificationSettings) {
    const previous = notifications;
    setNotifications(next);
    setNotificationPending(true);
    setNotificationError(null);
    try {
      await setLiveNotificationSettings(next, currentApiBase(), await loadSessionToken());
      if (next.liveConnection && !(await canPostPromotedNotifications())) {
        await openPromotedNotificationSettings();
      }
      await registerPushToken();
    } catch (cause) {
      setNotifications(previous);
      setNotificationError(
        cause instanceof Error ? cause.message : t`Could not update notifications`,
      );
    } finally {
      setNotificationPending(false);
    }
  }

  function confirmDeletion() {
    setError(null);
    Alert.alert(
      t`Delete your account?`,
      t`This permanently deletes your account, bots, conversations, memories, files, and saved connections. This cannot be undone.`,
      [
        { text: t`Cancel`, style: "cancel" },
        {
          text: t`Delete account`,
          style: "destructive",
          onPress: () => void handleDeletion(),
        },
      ],
    );
  }

  async function handleDeletion() {
    setPending(true);
    setError(null);
    try {
      await deleteAccount(password);
      router.dismissAll();
      router.replace("/sign-in");
    } catch (err) {
      setError(err instanceof Error ? err.message : t`Could not delete account`);
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {focus === "usage" ? usageBlock : null}
        <View style={styles.profile}>
          <Text style={styles.name}>{me?.name || t`Your account`}</Text>
          {me?.email ? <Text style={styles.email}>{me.email}</Text> : null}
        </View>
        {focus !== "usage" ? usageBlock : null}

        <View accessibilityLabel={t`Avatar style`} style={styles.avatarSection}>
          <Text style={styles.settingsTitle}>
            <Trans>Avatars</Trans>
          </Text>
          <View style={styles.avatarOptions}>
            {(["clay", "robot", "organic"] as const).map((style) => {
              const selected = avatarStyle === style;
              const label = style === "clay" ? t`Clay` : style === "robot" ? t`Robot` : t`Organic`;
              return (
                <Pressable
                  key={style}
                  accessibilityLabel={t`${label} avatars`}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: avatarPending }}
                  disabled={avatarPending}
                  onPress={() => void selectAvatarStyle(style)}
                  style={({ pressed }) => [
                    styles.avatarOption,
                    selected && styles.avatarOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <BotAvatar
                    color={style === "organic" ? "#D62F8B" : "#8B5CF6"}
                    identity="avatar-preview"
                    size={42}
                    variant={style}
                  />
                  <Text style={styles.avatarLabel}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          {avatarError ? <Text style={styles.error}>{avatarError}</Text> : null}
        </View>

        <View accessibilityLabel={t`Language`} style={styles.avatarSection}>
          <Text style={styles.settingsTitle}>
            <Trans>Language</Trans>
          </Text>
          <View style={styles.languageOptions}>
            {UI_LOCALE_OPTIONS.map((option) => {
              const selected = i18n.locale === option.locale;
              return (
                <Pressable
                  key={option.locale}
                  accessibilityLabel={option.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => void selectLocale(option.locale)}
                  style={({ pressed }) => [
                    styles.languageOption,
                    selected && styles.languageOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.languageLabel}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {Platform.OS === "android" ? (
          <View accessibilityLabel={t`Notifications`} style={styles.profile}>
            <Text style={styles.settingsTitle}>
              <Trans>Notifications</Trans>
            </Text>
            <NotificationSwitch
              label={t`Live working status`}
              detail={t`While agents are working`}
              value={notifications.liveConnection}
              disabled={notificationPending || !notificationsReady}
              onChange={(liveConnection) =>
                void updateNotifications({ ...notifications, liveConnection })
              }
            />
            <NotificationSwitch
              label={t`Agent messages`}
              detail={t`Replies and completed work`}
              value={notifications.messages}
              disabled={notificationPending || !notificationsReady}
              onChange={(messages) => void updateNotifications({ ...notifications, messages })}
            />
            <NotificationSwitch
              label={t`Scheduled tasks`}
              detail={t`Alerts from routines`}
              value={notifications.scheduledTasks}
              disabled={notificationPending || !notificationsReady}
              onChange={(scheduledTasks) =>
                void updateNotifications({ ...notifications, scheduledTasks })
              }
            />
            <NotificationSwitch
              label={t`Needs attention`}
              detail={t`Questions, approvals, takeover`}
              value={notifications.needsAttention}
              disabled={notificationPending || !notificationsReady}
              onChange={(needsAttention) =>
                void updateNotifications({ ...notifications, needsAttention })
              }
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => void openPromotedNotificationSettings()}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ color: "#4C8DFF", fontSize: 14 }}>
                <Trans>Live update settings</Trans>
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void openLiveNotificationSettings()}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ color: "#4C8DFF", fontSize: 14 }}>
                <Trans>Notification settings</Trans>
              </Text>
            </Pressable>
            {notificationError ? <Text style={styles.error}>{notificationError}</Text> : null}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={() => router.push("/models")}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
        >
          <View>
            <Text style={styles.settingsTitle}>
              <Trans>Models</Trans>
            </Text>
            <Text style={styles.settingsExplanation}>
              <Trans>Choose your provider and active model</Trans>
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={() => router.push("/voice")}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
        >
          <View>
            <Text style={styles.settingsTitle}>
              <Trans>Voice</Trans>
            </Text>
            <Text style={styles.settingsExplanation}>
              <Trans>Speak replies aloud with ElevenLabs, OpenAI, or Cartesia</Trans>
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={() => router.push("/integrations")}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
        >
          <View>
            <Text style={styles.settingsTitle}>
              <Trans>Integrations</Trans>
            </Text>
            <Text style={styles.settingsExplanation}>
              <Trans>Connect apps.</Trans>
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={() => void handleSignOut()}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonLabel}>
            <Trans>Sign out</Trans>
          </Text>
        </Pressable>

        {archivedBots.length > 0 ? (
          <View style={styles.archivedSection}>
            <Text style={styles.sectionTitle}>
              <Trans>Archived bots</Trans>
            </Text>
            {archivedBots.map((bot) => (
              <View key={bot.id} style={styles.archivedRow}>
                <Text numberOfLines={1} style={styles.archivedName}>
                  {bot.name}
                </Text>
                <Pressable onPress={() => void restoreBot(bot.id)} hitSlop={8}>
                  <Text style={styles.restoreLabel}>
                    <Trans>Restore</Trans>
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    confirmDeleteBot(bot, () =>
                      setArchivedBots((bots) => bots.filter((item) => item.id !== bot.id)),
                    )
                  }
                  hitSlop={8}
                >
                  <Text style={styles.archivedDeleteLabel}>
                    <Trans>Delete</Trans>
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>
            <Trans>Delete account</Trans>
          </Text>
          <Text style={styles.explanation}>
            <Trans>
              Enter your current password, then confirm permanent deletion of your account and all
              associated data.
            </Trans>
          </Text>
          <TextInput
            accessibilityLabel={t`Current password`}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!pending}
            onChangeText={(value) => {
              setPassword(value);
              setError(null);
            }}
            placeholder={t`Current password`}
            placeholderTextColor={native.tertiaryLabel}
            secureTextEntry
            style={styles.password}
            textContentType="password"
            value={password}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={pending || !password}
            onPress={confirmDeletion}
            style={({ pressed }) => [
              styles.deleteButton,
              (pending || !password) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {pending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.deleteLabel}>
                <Trans>Delete account</Trans>
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationSwitch({
  label,
  detail,
  value,
  disabled,
  onChange,
}: {
  label: string;
  detail: string;
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View
      style={{
        minHeight: 54,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: native.label, fontSize: 15 }}>{label}</Text>
        <Text style={{ color: native.secondaryLabel, fontSize: 12.5, marginTop: 2 }}>{detail}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityHint={detail}
        disabled={disabled}
        value={value}
        onValueChange={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: native.page,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    gap: 20,
  },
  profile: {
    borderRadius: 16,
    backgroundColor: native.fill,
    padding: 18,
    gap: 4,
  },
  name: {
    color: native.label,
    fontSize: 20,
    fontWeight: "600",
  },
  email: {
    color: native.secondaryLabel,
    fontSize: 15,
  },
  button: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: native.fill,
  },
  buttonLabel: {
    color: native.label,
    fontSize: 17,
    fontWeight: "600",
  },
  archivedSection: {
    borderRadius: 16,
    backgroundColor: native.fill,
    padding: 18,
    gap: 14,
  },
  sectionTitle: {
    color: native.secondaryLabel,
    fontSize: 14,
    fontWeight: "600",
  },
  archivedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  archivedName: {
    flex: 1,
    color: native.label,
    fontSize: 16,
  },
  restoreLabel: {
    color: native.label,
    fontSize: 14,
    fontWeight: "600",
  },
  archivedDeleteLabel: {
    color: "#FF6961",
    fontSize: 14,
  },
  settingsButton: {
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: native.fill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarSection: {
    borderRadius: 16,
    backgroundColor: native.fill,
    padding: 18,
    gap: 14,
  },
  avatarOptions: {
    flexDirection: "row",
    gap: 12,
  },
  avatarOption: {
    flex: 1,
    minHeight: 86,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: native.tertiaryLabel,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  avatarOptionSelected: {
    borderColor: native.label,
    backgroundColor: native.fillPressed,
  },
  languageOptions: {
    flexDirection: "row",
    gap: 12,
  },
  languageOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: native.tertiaryLabel,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  languageOptionSelected: {
    borderColor: native.label,
    backgroundColor: native.fillPressed,
  },
  languageLabel: {
    color: native.label,
    fontSize: 14,
    fontWeight: "600",
  },
  avatarLabel: {
    color: native.label,
    fontSize: 14,
    fontWeight: "600",
  },
  settingsTitle: {
    color: native.label,
    fontSize: 17,
    fontWeight: "600",
  },
  settingsExplanation: {
    color: native.secondaryLabel,
    fontSize: 13,
    marginTop: 3,
  },
  chevron: {
    color: native.secondaryLabel,
    fontSize: 28,
    fontWeight: "300",
  },
  dangerZone: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#5A2426",
    padding: 18,
  },
  dangerTitle: {
    color: "#FF6961",
    fontSize: 17,
    fontWeight: "600",
  },
  explanation: {
    color: native.secondaryLabel,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  password: {
    height: 48,
    borderRadius: 12,
    backgroundColor: native.fill,
    color: native.label,
    paddingHorizontal: 14,
    marginTop: 16,
    fontSize: 16,
  },
  error: {
    color: "#FF6961",
    fontSize: 14,
    marginTop: 10,
  },
  deleteButton: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C9363E",
    marginTop: 14,
  },
  deleteLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
});
