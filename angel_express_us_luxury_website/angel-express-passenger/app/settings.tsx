import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Accessibility,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Eye,
  Fingerprint,
  Languages,
  Lock,
  MoonStar,
  Save,
  ScanFace,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Type,
  Volume2,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

type SettingsSection =
  | "general"
  | "accessibility"
  | "biometrics"
  | "face-id"
  | "preferences";

type PassengerSettings = {
  notificationsEnabled: boolean;
  tripUpdates: boolean;
  paymentAlerts: boolean;
  safetyAlerts: boolean;
  marketingUpdates: boolean;
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  screenReaderHints: boolean;
  soundFeedback: boolean;
  biometricsEnabled: boolean;
  faceIdEnabled: boolean;
  rememberLogin: boolean;
  quietRideDefault: boolean;
  allowDriverCalls: boolean;
  allowDriverMessages: boolean;
  autoShareTrip: boolean;
};

const DEFAULT_SETTINGS: PassengerSettings = {
  notificationsEnabled: true,
  tripUpdates: true,
  paymentAlerts: true,
  safetyAlerts: true,
  marketingUpdates: false,
  largeText: false,
  highContrast: false,
  reduceMotion: false,
  screenReaderHints: true,
  soundFeedback: true,
  biometricsEnabled: false,
  faceIdEnabled: false,
  rememberLogin: true,
  quietRideDefault: false,
  allowDriverCalls: true,
  allowDriverMessages: true,
  autoShareTrip: false,
};

export default function PassengerSettingsScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [settings, setSettings] =
    useState<PassengerSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const requested = String(params.section || "").trim().toLowerCase();

    if (
      ["accessibility", "biometrics", "face-id", "preferences"].includes(
        requested
      )
    ) {
      setActiveSection(requested as SettingsSection);
    } else {
      setActiveSection("general");
    }
  }, [params.section]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(bgScale, {
          toValue: 1.04,
          duration: 8500,
          useNativeDriver: true,
        }),
        Animated.timing(bgScale, {
          toValue: 1,
          duration: 8500,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();

    loadSettings();

    return () => animation.stop();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;

      if (!user) {
        router.replace("/login" as any);
        return;
      }

      const stored =
        (user.user_metadata?.passenger_settings as
          | Partial<PassengerSettings>
          | undefined) || {};

      setSettings({
        ...DEFAULT_SETTINGS,
        ...stored,
      });
    } catch (error: any) {
      Alert.alert(
        "Settings Error",
        error.message || "Unable to load your settings."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateSetting<K extends keyof PassengerSettings>(
    key: K,
    value: PassengerSettings[K]
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveSettings() {
    try {
      setSaving(true);

      const { error } = await supabase.auth.updateUser({
        data: {
          passenger_settings: settings,
        },
      });

      if (error) throw error;

      Alert.alert(
        "Settings Saved",
        "Your Angel Express settings have been updated."
      );
    } catch (error: any) {
      Alert.alert(
        "Save Error",
        error.message || "Unable to save your settings."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetSettings() {
    Alert.alert(
      "Reset Settings",
      "Restore all Passenger App settings to their defaults?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => setSettings(DEFAULT_SETTINGS),
        },
      ]
    );
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading Settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}>
        <ImageBackground
          source={require("../assets/images/dashboard-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <Text style={styles.kicker}>PASSENGER APP SETTINGS</Text>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>
              Manage appearance, notifications, language, privacy, accessibility,
              biometrics, Face ID, and passenger preferences.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Settings size={30} color={colors.onGold || colors.navy} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Your App, Your Way</Text>
                <Text style={styles.heroText}>
                  Personalize Angel Express without changing your booking profile.
                </Text>
              </View>
            </View>

            <View style={styles.sectionTabs}>
              <SectionTab
                title="General"
                active={activeSection === "general"}
                onPress={() => setActiveSection("general")}
                styles={styles}
              />
              <SectionTab
                title="Accessibility"
                active={activeSection === "accessibility"}
                onPress={() => setActiveSection("accessibility")}
                styles={styles}
              />
              <SectionTab
                title="Security"
                active={
                  activeSection === "biometrics" ||
                  activeSection === "face-id"
                }
                onPress={() => setActiveSection("biometrics")}
                styles={styles}
              />
              <SectionTab
                title="Preferences"
                active={activeSection === "preferences"}
                onPress={() => setActiveSection("preferences")}
                styles={styles}
              />
            </View>

            {activeSection === "general" ? (
              <>
                <SettingsCard
                  title="Theme"
                  icon={
                    themeMode === "dark" ? (
                      <MoonStar size={21} color={colors.gold} />
                    ) : (
                      <Sun size={21} color={colors.gold} />
                    )
                  }
                  styles={styles}
                >
                  <ActionRow
                    title="Appearance"
                    subtitle={
                      themeMode === "dark"
                        ? "Dark mode is currently active"
                        : "Light mode is currently active"
                    }
                    onPress={toggleTheme}
                    styles={styles}
                  />
                </SettingsCard>

                <SettingsCard
                  title="Notifications"
                  icon={<Bell size={21} color={colors.gold} />}
                  styles={styles}
                >
                  <SwitchRow
                    title="Enable Notifications"
                    subtitle="Allow Angel Express notifications on this account."
                    value={settings.notificationsEnabled}
                    onValueChange={(value) =>
                      updateSetting("notificationsEnabled", value)
                    }
                    styles={styles}
                    colors={colors}
                  />
                  <SwitchRow
                    title="Trip Updates"
                    subtitle="Driver assignment, arrival, pickup, and completion."
                    value={settings.tripUpdates}
                    onValueChange={(value) =>
                      updateSetting("tripUpdates", value)
                    }
                    styles={styles}
                    colors={colors}
                  />
                  <SwitchRow
                    title="Payment Alerts"
                    subtitle="Payment confirmations, receipts, and fare updates."
                    value={settings.paymentAlerts}
                    onValueChange={(value) =>
                      updateSetting("paymentAlerts", value)
                    }
                    styles={styles}
                    colors={colors}
                  />
                  <SwitchRow
                    title="Safety Alerts"
                    subtitle="Safety Share, SOS, and important ride notices."
                    value={settings.safetyAlerts}
                    onValueChange={(value) =>
                      updateSetting("safetyAlerts", value)
                    }
                    styles={styles}
                    colors={colors}
                  />
                  <SwitchRow
                    title="Offers & Updates"
                    subtitle="Optional promotions and service announcements."
                    value={settings.marketingUpdates}
                    onValueChange={(value) =>
                      updateSetting("marketingUpdates", value)
                    }
                    styles={styles}
                    colors={colors}
                  />

                  <ActionRow
                    title="Open Notification Center"
                    subtitle="Review messages and notification preferences."
                    onPress={() =>
                      router.push("/passenger-notifications" as any)
                    }
                    styles={styles}
                  />
                </SettingsCard>

                <SettingsCard
                  title="Language"
                  icon={<Languages size={21} color={colors.gold} />}
                  styles={styles}
                >
                  <ActionRow
                    title="Language Assistant"
                    subtitle="Translation and travel-language support."
                    onPress={() => router.push("/language-assistant" as any)}
                    styles={styles}
                  />
                </SettingsCard>

                <SettingsCard
                  title="Privacy"
                  icon={<Lock size={21} color={colors.gold} />}
                  styles={styles}
                >
                  <ActionRow
                    title="Privacy & Account"
                    subtitle="Privacy controls, account information, and deletion."
                    onPress={() => router.push("/privacy-account" as any)}
                    styles={styles}
                  />
                </SettingsCard>
              </>
            ) : null}

            {activeSection === "accessibility" ? (
              <SettingsCard
                title="Accessibility"
                icon={<Accessibility size={21} color={colors.gold} />}
                styles={styles}
              >
                <SwitchRow
                  title="Large Text"
                  subtitle="Use larger text in supported Passenger App screens."
                  value={settings.largeText}
                  onValueChange={(value) =>
                    updateSetting("largeText", value)
                  }
                  styles={styles}
                  colors={colors}
                />
                <SwitchRow
                  title="High Contrast"
                  subtitle="Increase visual contrast for supported controls."
                  value={settings.highContrast}
                  onValueChange={(value) =>
                    updateSetting("highContrast", value)
                  }
                  styles={styles}
                  colors={colors}
                />
                <SwitchRow
                  title="Reduce Motion"
                  subtitle="Reduce optional animations and background movement."
                  value={settings.reduceMotion}
                  onValueChange={(value) =>
                    updateSetting("reduceMotion", value)
                  }
                  styles={styles}
                  colors={colors}
                />
                <SwitchRow
                  title="Screen Reader Hints"
                  subtitle="Keep additional accessibility guidance enabled."
                  value={settings.screenReaderHints}
                  onValueChange={(value) =>
                    updateSetting("screenReaderHints", value)
                  }
                  styles={styles}
                  colors={colors}
                />
                <SwitchRow
                  title="Sound Feedback"
                  subtitle="Use sound feedback for supported safety actions."
                  value={settings.soundFeedback}
                  onValueChange={(value) =>
                    updateSetting("soundFeedback", value)
                  }
                  styles={styles}
                  colors={colors}
                />

                <View style={styles.infoBox}>
                  <Type size={19} color={colors.gold} />
                  <Text style={styles.infoText}>
                    These preferences are stored on your Angel Express account.
                    Individual screens can adopt them as each module is upgraded.
                  </Text>
                </View>
              </SettingsCard>
            ) : null}

            {activeSection === "biometrics" ||
            activeSection === "face-id" ? (
              <>
                <SettingsCard
                  title="Biometrics"
                  icon={<Fingerprint size={21} color={colors.gold} />}
                  styles={styles}
                >
                  <SwitchRow
                    title="Enable Biometrics"
                    subtitle="Allow supported biometric sign-in on this device."
                    value={settings.biometricsEnabled}
                    onValueChange={(value) =>
                      updateSetting("biometricsEnabled", value)
                    }
                    styles={styles}
                    colors={colors}
                  />
                  <SwitchRow
                    title="Remember Login"
                    subtitle="Keep your account ready for faster secure sign-in."
                    value={settings.rememberLogin}
                    onValueChange={(value) =>
                      updateSetting("rememberLogin", value)
                    }
                    styles={styles}
                    colors={colors}
                  />
                </SettingsCard>

                <SettingsCard
                  title="Face ID"
                  icon={<ScanFace size={21} color={colors.gold} />}
                  styles={styles}
                >
                  <SwitchRow
                    title="Use Face ID"
                    subtitle="Enable Face ID preference on supported Apple devices."
                    value={settings.faceIdEnabled}
                    onValueChange={(value) =>
                      updateSetting("faceIdEnabled", value)
                    }
                    styles={styles}
                    colors={colors}
                  />

                  <View style={styles.securityNotice}>
                    <ShieldCheck size={20} color={colors.gold} />
                    <Text style={styles.securityNoticeText}>
                      This screen stores your security preference. Device-level
                      biometric authentication must also be implemented on the login
                      screen before it can unlock the app.
                    </Text>
                  </View>
                </SettingsCard>
              </>
            ) : null}

            {activeSection === "preferences" ? (
              <SettingsCard
                title="Passenger Preferences"
                icon={<SlidersHorizontal size={21} color={colors.gold} />}
                styles={styles}
              >
                <SwitchRow
                  title="Quiet Ride by Default"
                  subtitle="Prefer a quiet chauffeur experience when possible."
                  value={settings.quietRideDefault}
                  onValueChange={(value) =>
                    updateSetting("quietRideDefault", value)
                  }
                  styles={styles}
                  colors={colors}
                />
                <SwitchRow
                  title="Allow Driver Calls"
                  subtitle="Let assigned drivers call the number on your profile."
                  value={settings.allowDriverCalls}
                  onValueChange={(value) =>
                    updateSetting("allowDriverCalls", value)
                  }
                  styles={styles}
                  colors={colors}
                />
                <SwitchRow
                  title="Allow Driver Messages"
                  subtitle="Let assigned drivers send trip-related messages."
                  value={settings.allowDriverMessages}
                  onValueChange={(value) =>
                    updateSetting("allowDriverMessages", value)
                  }
                  styles={styles}
                  colors={colors}
                />
                <SwitchRow
                  title="Auto-Prepare Safety Share"
                  subtitle="Prepare your primary emergency contact for active rides."
                  value={settings.autoShareTrip}
                  onValueChange={(value) =>
                    updateSetting("autoShareTrip", value)
                  }
                  styles={styles}
                  colors={colors}
                />

                <ActionRow
                  title="Edit Travel Preferences"
                  subtitle="Update luggage, music, climate, and conversation choices."
                  onPress={() => router.push("/profile" as any)}
                  styles={styles}
                />
              </SettingsCard>
            ) : null}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={saveSettings}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.onGold || colors.navy} />
              ) : (
                <>
                  <Save size={19} color={colors.onGold || colors.navy} />
                  <Text style={styles.saveButtonText}>Save Settings</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetButton} onPress={resetSettings}>
              <Sparkles size={18} color={colors.gold} />
              <Text style={styles.resetButtonText}>Restore Default Settings</Text>
            </TouchableOpacity>

            <View style={styles.savedNotice}>
              <CheckCircle2 size={18} color={colors.gold} />
              <Text style={styles.savedNoticeText}>
                Settings are saved to your authenticated Angel Express account.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function SectionTab({
  title,
  active,
  onPress,
  styles,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
  styles: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.sectionTab, active && styles.sectionTabActive]}
      onPress={onPress}
    >
      <Text
        style={[styles.sectionTabText, active && styles.sectionTabTextActive]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function SettingsCard({
  title,
  icon,
  children,
  styles,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  styles: any;
}) {
  return (
    <View style={styles.settingsCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>{icon}</View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function SwitchRow({
  title,
  subtitle,
  value,
  onValueChange,
  styles,
  colors,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  styles: any;
  colors: any;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.borderSoft || colors.lightBorder,
          true: colors.gold,
        }}
        thumbColor={value ? "#FFFFFF" : "#CBD5E1"}
      />
    </View>
  );
}

function ActionRow({
  title,
  subtitle,
  onPress,
  styles,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  styles: any;
}) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color={styles.__gold || "#D4AF37"} />
    </TouchableOpacity>
  );
}

function createStyles(c: any) {
  const styles: any = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
      overflow: "hidden",
    },
    bgWrap: {
      ...StyleSheet.absoluteFillObject,
    },
    background: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
    },
    container: {
      flex: 1,
    },
    content: {
      padding: 22,
      paddingTop: 58,
      paddingBottom: 54,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.bg,
    },
    loadingText: {
      color: c.text,
      marginTop: 12,
      fontSize: 15,
      fontWeight: "800",
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    backText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
    },
    themePill: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    kicker: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 9,
    },
    title: {
      color: c.text,
      fontSize: 38,
      fontWeight: "900",
      marginBottom: 10,
    },
    subtitle: {
      color: c.text2 || c.textSecondary,
      fontSize: 15.5,
      lineHeight: 23,
      fontWeight: "700",
      marginBottom: 22,
    },
    heroCard: {
      minHeight: 124,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.28)",
    },
    heroTitle: {
      color: c.onGold || c.navy,
      fontSize: 23,
      fontWeight: "900",
      marginBottom: 5,
    },
    heroText: {
      color: c.onGold || c.navy,
      fontSize: 14.5,
      lineHeight: 20,
      fontWeight: "800",
      opacity: 0.82,
    },
    sectionTabs: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 9,
      marginBottom: 18,
    },
    sectionTab: {
      minWidth: "47%",
      flex: 1,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      backgroundColor: c.card,
      paddingVertical: 13,
      paddingHorizontal: 12,
      alignItems: "center",
    },
    sectionTabActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    sectionTabText: {
      color: c.text,
      fontSize: 12.5,
      fontWeight: "900",
    },
    sectionTabTextActive: {
      color: c.onGold || c.navy,
    },
    settingsCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    cardIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: {
      color: c.gold,
      fontSize: 21,
      fontWeight: "900",
      flex: 1,
    },
    settingRow: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: c.borderSoft || c.lightBorder,
      paddingVertical: 13,
    },
    actionRow: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: c.borderSoft || c.lightBorder,
      paddingVertical: 13,
    },
    settingCopy: {
      flex: 1,
    },
    settingTitle: {
      color: c.text,
      fontSize: 15.5,
      fontWeight: "900",
      marginBottom: 4,
    },
    settingSubtitle: {
      color: c.text2 || c.textSecondary,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      padding: 13,
      marginTop: 10,
    },
    infoText: {
      color: c.text,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
      flex: 1,
    },
    securityNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      padding: 13,
      marginTop: 10,
    },
    securityNoticeText: {
      color: c.text,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
      flex: 1,
    },
    saveButton: {
      minHeight: 56,
      borderRadius: 16,
      backgroundColor: c.gold,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      ...v5Shadow(c),
    },
    saveButtonText: {
      color: c.onGold || c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    disabledButton: {
      opacity: 0.65,
    },
    resetButton: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 13,
    },
    resetButtonText: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
    },
    savedNotice: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 15,
    },
    savedNoticeText: {
      color: c.text2 || c.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
    },
  });

  styles.__gold = c.gold;
  return styles;
}
