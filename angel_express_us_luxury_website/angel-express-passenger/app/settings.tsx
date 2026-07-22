import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  DeviceEventEmitter,
  ImageBackground,
  Platform,
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
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as Speech from "expo-speech";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

type SettingsSection =
  | "general"
  | "accessibility"
  | "biometrics"
  | "face-id"
  | "preferences";

type LanguageCode =
  | "en"
  | "pidgin"
  | "yo"
  | "ig"
  | "ha"
  | "sw"
  | "es"
  | "fr"
  | "ar"
  | "pt"
  | "hi"
  | "zh";

type PassengerSettings = {
  preferredLanguage: LanguageCode;
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
  wheelchairSupport: boolean;
  extraBoardingTime: boolean;
  hearingAssistance: boolean;
  visionAssistance: boolean;
  serviceAnimalNotice: boolean;
};

const DEFAULT_SETTINGS: PassengerSettings = {
  preferredLanguage: "en",
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
  wheelchairSupport: false,
  extraBoardingTime: false,
  hearingAssistance: false,
  visionAssistance: false,
  serviceAnimalNotice: false,
};

const APP_LANGUAGES: Array<{
  key: LanguageCode;
  name: string;
}> = [
  { key: "en", name: "English" },
  { key: "pidgin", name: "Nigerian Pidgin" },
  { key: "yo", name: "Yoruba" },
  { key: "ig", name: "Igbo" },
  { key: "ha", name: "Hausa" },
  { key: "sw", name: "Swahili" },
  { key: "es", name: "Spanish" },
  { key: "fr", name: "French" },
  { key: "ar", name: "Arabic" },
  { key: "pt", name: "Portuguese" },
  { key: "hi", name: "Hindi" },
  { key: "zh", name: "Chinese" },
];

const SETTINGS_STORAGE_KEY = "angel_passenger_settings";
const REMEMBER_LOGIN_KEY = "angel_remember_login";
const BIOMETRICS_KEY = "angel_biometrics_enabled";
const FACE_ID_KEY = "angel_face_id_enabled";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function PassengerSettingsScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const { colors, themeMode, toggleTheme } = usePassengerTheme();

  const [activeSection, setActiveSection] =
    useState<SettingsSection>("general");
  const [settings, setSettings] =
    useState<PassengerSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [screenReaderActive, setScreenReaderActive] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<
    LocalAuthentication.AuthenticationType[]
  >([]);

  const styles = useMemo(
    () => createStyles(colors, settings),
    [colors, settings.largeText, settings.highContrast]
  );

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const backgroundAnimation = useRef<Animated.CompositeAnimation | null>(null);

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
    loadSettings();
    inspectDeviceCapabilities();

    const readerSubscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setScreenReaderActive
    );

    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderActive);

    return () => {
      readerSubscription.remove();
      backgroundAnimation.current?.stop();
    };
  }, []);

  useEffect(() => {
    backgroundAnimation.current?.stop();

    if (settings.reduceMotion) {
      bgScale.setValue(1);
      pageFade.setValue(1);
      return;
    }

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

    backgroundAnimation.current = animation;
    animation.start();

    pageFade.setValue(0);
    Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();

    return () => animation.stop();
  }, [settings.reduceMotion]);

  async function inspectDeviceCapabilities() {
    try {
      const supported =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      setBiometricTypes(supported);
    } catch {
      setBiometricTypes([]);
    }
  }

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

      const metadataSettings =
        (user.user_metadata?.passenger_settings as
          | Partial<PassengerSettings>
          | undefined) || {};

      const localSettingsRaw = await SecureStore.getItemAsync(
        SETTINGS_STORAGE_KEY
      );

      const localSettings = localSettingsRaw
        ? (JSON.parse(localSettingsRaw) as Partial<PassengerSettings>)
        : {};

      const { data: rideProfile, error: rideProfileError } = await supabase
        .from("passenger_profiles")
        .select(
          "preferred_language, wheelchair_support, extra_boarding_time, hearing_assistance, vision_assistance, service_animal_notice"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (rideProfileError) {
        console.log(
          "Accessibility ride profile could not be loaded:",
          rideProfileError.message
        );
      }

      const merged = {
        ...DEFAULT_SETTINGS,
        ...metadataSettings,
        ...localSettings,
        preferredLanguage:
          (rideProfile?.preferred_language as LanguageCode | undefined) ||
          localSettings.preferredLanguage ||
          metadataSettings.preferredLanguage ||
          "en",
        wheelchairSupport: Boolean(
          rideProfile?.wheelchair_support ??
            localSettings.wheelchairSupport ??
            metadataSettings.wheelchairSupport
        ),
        extraBoardingTime: Boolean(
          rideProfile?.extra_boarding_time ??
            localSettings.extraBoardingTime ??
            metadataSettings.extraBoardingTime
        ),
        hearingAssistance: Boolean(
          rideProfile?.hearing_assistance ??
            localSettings.hearingAssistance ??
            metadataSettings.hearingAssistance
        ),
        visionAssistance: Boolean(
          rideProfile?.vision_assistance ??
            localSettings.visionAssistance ??
            metadataSettings.visionAssistance
        ),
        serviceAnimalNotice: Boolean(
          rideProfile?.service_animal_notice ??
            localSettings.serviceAnimalNotice ??
            metadataSettings.serviceAnimalNotice
        ),
      };

      setSettings(merged);
      DeviceEventEmitter.emit("angel:settings-changed", merged);
    } catch (error: any) {
      Alert.alert(
        "Settings Error",
        error?.message || "Unable to load your settings."
      );
    } finally {
      setLoading(false);
    }
  }

  async function feedback(message?: string) {
    if (!settings.soundFeedback) return;

    try {
      await Haptics.selectionAsync();

      if (message && settings.screenReaderHints && screenReaderActive) {
        AccessibilityInfo.announceForAccessibility(message);
      } else if (message && !screenReaderActive) {
        Speech.stop();
        Speech.speak(message, {
          rate: 1,
          pitch: 1,
          volume: 0.65,
        });
      }
    } catch {
      // Feedback must never block the settings action.
    }
  }

  async function persistLocal(next: PassengerSettings) {
    await SecureStore.setItemAsync(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(next)
    );
    await SecureStore.setItemAsync(
      REMEMBER_LOGIN_KEY,
      String(next.rememberLogin)
    );
    await SecureStore.setItemAsync(
      BIOMETRICS_KEY,
      String(next.biometricsEnabled)
    );
    await SecureStore.setItemAsync(
      FACE_ID_KEY,
      String(next.faceIdEnabled)
    );

    DeviceEventEmitter.emit("angel:settings-changed", next);
  }

  async function setAndPersist(next: PassengerSettings, message?: string) {
    setSettings(next);
    await persistLocal(next);
    await feedback(message);
  }

  async function updateSetting<K extends keyof PassengerSettings>(
    key: K,
    value: PassengerSettings[K]
  ) {
    const next = {
      ...settings,
      [key]: value,
    };

    await setAndPersist(next, `${settingLabel(key)} ${value ? "enabled" : "disabled"}`);
  }

  async function handleMasterNotifications(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermission();

      if (!granted) {
        Alert.alert(
          "Notifications Not Enabled",
          "Please allow notifications in your device settings to receive Angel Express alerts."
        );
        return;
      }
    }

    const next: PassengerSettings = value
      ? {
          ...settings,
          notificationsEnabled: true,
        }
      : {
          ...settings,
          notificationsEnabled: false,
          tripUpdates: false,
          paymentAlerts: false,
          safetyAlerts: false,
          marketingUpdates: false,
        };

    await setAndPersist(
      next,
      value ? "Notifications enabled" : "All notifications disabled"
    );
  }

  async function handleNotificationCategory(
    key:
      | "tripUpdates"
      | "paymentAlerts"
      | "safetyAlerts"
      | "marketingUpdates",
    value: boolean
  ) {
    if (value) {
      const granted = await requestNotificationPermission();

      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Enable notifications in your device settings before turning on this alert."
        );
        return;
      }
    }

    const next = {
      ...settings,
      notificationsEnabled: value ? true : settings.notificationsEnabled,
      [key]: value,
    };

    await setAndPersist(
      next,
      `${settingLabel(key)} ${value ? "enabled" : "disabled"}`
    );
  }

  async function requestNotificationPermission() {
    const current = await Notifications.getPermissionsAsync();

    if (
      current.granted ||
      current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return (
      requested.granted ||
      requested.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  }

  async function handleBiometrics(value: boolean) {
    if (!value) {
      const next = {
        ...settings,
        biometricsEnabled: false,
        faceIdEnabled: false,
      };

      await setAndPersist(next, "Biometric login disabled");
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware) {
      Alert.alert(
        "Biometrics Unavailable",
        "This device does not support biometric authentication."
      );
      return;
    }

    if (!isEnrolled) {
      Alert.alert(
        "Biometrics Not Set Up",
        "Add a fingerprint or Face ID in your device settings first."
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Enable Angel Express biometric login",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (!result.success) {
      Alert.alert(
        "Authentication Not Completed",
        "Biometric login was not enabled."
      );
      return;
    }

    const next = {
      ...settings,
      biometricsEnabled: true,
      rememberLogin: true,
    };

    await setAndPersist(next, "Biometric login enabled");
  }

  async function handleFaceId(value: boolean) {
    if (!value) {
      await updateSetting("faceIdEnabled", false);
      return;
    }

    const supportsFace =
      Platform.OS === "ios" &&
      biometricTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      );

    if (!supportsFace) {
      Alert.alert(
        "Face ID Unavailable",
        "Face ID is only available on a supported Apple device with Face ID configured."
      );
      return;
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!isEnrolled) {
      Alert.alert(
        "Face ID Not Set Up",
        "Configure Face ID in your iPhone settings first."
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Enable Face ID for Angel Express",
      fallbackLabel: "Use Passcode",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (!result.success) {
      return;
    }

    const next = {
      ...settings,
      biometricsEnabled: true,
      faceIdEnabled: true,
      rememberLogin: true,
    };

    await setAndPersist(next, "Face ID enabled");
  }

  async function handleRememberLogin(value: boolean) {
    if (!value && (settings.biometricsEnabled || settings.faceIdEnabled)) {
      Alert.alert(
        "Turn Off Secure Login?",
        "Disabling Remember Login will also turn off biometric and Face ID login.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            style: "destructive",
            onPress: async () => {
              const next = {
                ...settings,
                rememberLogin: false,
                biometricsEnabled: false,
                faceIdEnabled: false,
              };

              await setAndPersist(next, "Remember login disabled");
            },
          },
        ]
      );
      return;
    }

    await updateSetting("rememberLogin", value);
  }

  async function handleAutoShare(value: boolean) {
    if (!value) {
      await updateSetting("autoShareTrip", false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile, error } = await supabase
        .from("passenger_profiles")
        .select("emergency_name, emergency_phone, emergency_contact_email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const hasEmergencyContact = Boolean(
        profile?.emergency_name &&
          (profile?.emergency_phone || profile?.emergency_contact_email)
      );

      if (!hasEmergencyContact) {
        Alert.alert(
          "Emergency Contact Required",
          "Add an emergency contact before enabling automatic Safety Share.",
          [
            { text: "Not Now", style: "cancel" },
            {
              text: "Open Profile",
              onPress: () => router.push("/profile" as any),
            },
          ]
        );
        return;
      }

      await updateSetting("autoShareTrip", true);
    } catch (error: any) {
      Alert.alert(
        "Safety Share Error",
        error?.message || "Could not verify your emergency contact."
      );
    }
  }

  async function updateLanguage(language: LanguageCode) {
    const next = {
      ...settings,
      preferredLanguage: language,
    };

    await setAndPersist(next, `Language changed to ${
      APP_LANGUAGES.find((item) => item.key === language)?.name || language
    }`);

    DeviceEventEmitter.emit("angel:language-changed", language);
  }

  async function saveSettings() {
    try {
      setSaving(true);

      await persistLocal(settings);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const { error } = await supabase.auth.updateUser({
        data: {
          passenger_settings: settings,
          preferred_language: settings.preferredLanguage,
        },
      });

      if (error) throw error;

      const { error: profileError } = await supabase
        .from("passenger_profiles")
        .upsert(
          {
            user_id: user.id,
            preferred_language: settings.preferredLanguage,
            wheelchair_support: settings.wheelchairSupport,
            extra_boarding_time: settings.extraBoardingTime,
            hearing_assistance: settings.hearingAssistance,
            vision_assistance: settings.visionAssistance,
            service_animal_notice: settings.serviceAnimalNotice,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (profileError) throw profileError;

      await feedback("Settings saved");

      Alert.alert(
        "Settings Saved",
        "Your Angel Express settings are active on this device and synced to your account."
      );
    } catch (error: any) {
      Alert.alert(
        "Save Error",
        error?.message || "Unable to save your settings."
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
          onPress: async () => {
            await setAndPersist(DEFAULT_SETTINGS, "Settings restored");
          },
        },
      ]
    );
  }

  const pageTranslate = settings.reduceMotion
    ? 0
    : pageFade.interpolate({
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
    <View
      style={styles.root}
      accessible
      accessibilityLabel="Angel Express passenger settings"
    >
      <Animated.View
        style={[
          styles.bgWrap,
          {
            transform: [{ scale: settings.reduceMotion ? 1 : bgScale }],
          },
        ]}
      >
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint={
                settings.screenReaderHints
                  ? "Returns to the previous screen"
                  : undefined
              }
            >
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.themePill}
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel="Change app appearance"
            >
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: settings.reduceMotion ? 1 : pageFade,
              transform: [{ translateY: pageTranslate as any }],
            }}
          >
            <Text style={styles.kicker}>PASSENGER APP SETTINGS</Text>
            <Text style={styles.title}>Settings+</Text>
            <Text style={styles.subtitle}>
              Control notifications, accessibility, security, and passenger
              preferences across your Angel Express account.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Settings size={30} color={colors.onGold || colors.navy} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Your App, Your Way</Text>
                <Text style={styles.heroText}>
                  Changes apply immediately on this device and sync when you
                  press Save Settings.
                </Text>
              </View>
            </View>

            <View style={styles.sectionTabs}>
              <SectionTab
                title="General"
                active={activeSection === "general"}
                onPress={() => setActiveSection("general")}
                styles={styles}
                settings={settings}
              />
              <SectionTab
                title="Accessibility"
                active={activeSection === "accessibility"}
                onPress={() => setActiveSection("accessibility")}
                styles={styles}
                settings={settings}
              />
              <SectionTab
                title="Security"
                active={
                  activeSection === "biometrics" ||
                  activeSection === "face-id"
                }
                onPress={() => setActiveSection("biometrics")}
                styles={styles}
                settings={settings}
              />
              <SectionTab
                title="Preferences"
                active={activeSection === "preferences"}
                onPress={() => setActiveSection("preferences")}
                styles={styles}
                settings={settings}
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
                    colors={colors}
                    settings={settings}
                  />
                </SettingsCard>

                <SettingsCard
                  title="Notifications"
                  icon={<Bell size={21} color={colors.gold} />}
                  styles={styles}
                >
                  <SwitchRow
                    title="Enable All Notifications"
                    subtitle="Master control for every Angel Express alert."
                    value={settings.notificationsEnabled}
                    onValueChange={handleMasterNotifications}
                    styles={styles}
                    colors={colors}
                    settings={settings}
                  />
                  <SwitchRow
                    title="Trip Updates"
                    subtitle="Driver assignment, arrival, pickup, and completion."
                    value={settings.tripUpdates}
                    onValueChange={(value) =>
                      handleNotificationCategory("tripUpdates", value)
                    }
                    disabled={!settings.notificationsEnabled}
                    styles={styles}
                    colors={colors}
                    settings={settings}
                  />
                  <SwitchRow
                    title="Payment Alerts"
                    subtitle="Payment confirmations, receipts, and fare updates."
                    value={settings.paymentAlerts}
                    onValueChange={(value) =>
                      handleNotificationCategory("paymentAlerts", value)
                    }
                    disabled={!settings.notificationsEnabled}
                    styles={styles}
                    colors={colors}
                    settings={settings}
                  />
                  <SwitchRow
                    title="Safety Alerts"
                    subtitle="Safety Share, SOS, and urgent ride notices."
                    value={settings.safetyAlerts}
                    onValueChange={(value) =>
                      handleNotificationCategory("safetyAlerts", value)
                    }
                    disabled={!settings.notificationsEnabled}
                    styles={styles}
                    colors={colors}
                    settings={settings}
                  />
                  <SwitchRow
                    title="Offers & Updates"
                    subtitle="Promotions and service announcements."
                    value={settings.marketingUpdates}
                    onValueChange={(value) =>
                      handleNotificationCategory("marketingUpdates", value)
                    }
                    disabled={!settings.notificationsEnabled}
                    styles={styles}
                    colors={colors}
                    settings={settings}
                  />

                  <ActionRow
                    title="Open Notification Center"
                    subtitle="Review your received Angel Express messages."
                    onPress={() =>
                      router.push("/passenger-notifications" as any)
                    }
                    styles={styles}
                    colors={colors}
                    settings={settings}
                  />
                </SettingsCard>

                <SettingsCard
                  title="App Language"
                  icon={<Languages size={21} color={colors.gold} />}
                  styles={styles}
                >
                  <Text style={styles.languageHelp}>
                    Choose the passenger app language. The global app provider
                    uses this selection across supported screens.
                  </Text>

                  <View style={styles.languageGrid}>
                    {APP_LANGUAGES.map((language) => {
                      const selected =
                        settings.preferredLanguage === language.key;

                      return (
                        <TouchableOpacity
                          key={language.key}
                          style={[
                            styles.languagePill,
                            selected && styles.languagePillActive,
                          ]}
                          onPress={() => updateLanguage(language.key)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                        >
                          <Text
                            style={[
                              styles.languagePillText,
                              selected && styles.languagePillTextActive,
                            ]}
                          >
                            {language.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <ActionRow
                    title="Open Language Assistant"
                    subtitle="Use ready-made travel phrases and translations."
                    onPress={() => router.push("/language-assistant" as any)}
                    styles={styles}
                    colors={colors}
                    settings={settings}
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
                    colors={colors}
                    settings={settings}
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
                  subtitle="Immediately increases text size on this settings screen."
                  value={settings.largeText}
                  onValueChange={(value) => updateSetting("largeText", value)}
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />
                <SwitchRow
                  title="High Contrast"
                  subtitle="Strengthens borders and contrast immediately."
                  value={settings.highContrast}
                  onValueChange={(value) =>
                    updateSetting("highContrast", value)
                  }
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />
                <SwitchRow
                  title="Reduce Motion"
                  subtitle="Stops the background and page animations."
                  value={settings.reduceMotion}
                  onValueChange={(value) =>
                    updateSetting("reduceMotion", value)
                  }
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />
                <SwitchRow
                  title="Screen Reader Hints"
                  subtitle="Adds spoken guidance to supported controls."
                  value={settings.screenReaderHints}
                  onValueChange={(value) =>
                    updateSetting("screenReaderHints", value)
                  }
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />
                <SwitchRow
                  title="Sound Feedback"
                  subtitle="Provides audible and haptic confirmation for settings."
                  value={settings.soundFeedback}
                  onValueChange={(value) =>
                    updateSetting("soundFeedback", value)
                  }
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />

                <Text style={styles.subsectionTitle}>
                  Accessibility Ride Profile
                </Text>

                <SwitchRow
                  title="Wheelchair Support"
                  subtitle="Tell Operations and the assigned driver that wheelchair support may be required."
                  value={settings.wheelchairSupport}
                  onValueChange={(value) =>
                    updateSetting("wheelchairSupport", value)
                  }
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />

                <SwitchRow
                  title="Extra Boarding Time"
                  subtitle="Request additional time for safe boarding and vehicle entry."
                  value={settings.extraBoardingTime}
                  onValueChange={(value) =>
                    updateSetting("extraBoardingTime", value)
                  }
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />

                <SwitchRow
                  title="Hearing Assistance Preference"
                  subtitle="Ask drivers to prefer written or visual communication where possible."
                  value={settings.hearingAssistance}
                  onValueChange={(value) =>
                    updateSetting("hearingAssistance", value)
                  }
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />

                <SwitchRow
                  title="Vision Assistance"
                  subtitle="Request clear verbal pickup, boarding, and arrival guidance."
                  value={settings.visionAssistance}
                  onValueChange={(value) =>
                    updateSetting("visionAssistance", value)
                  }
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />

                <SwitchRow
                  title="Service-Animal Notice"
                  subtitle="Tell Operations and the assigned driver that a service animal may travel with you."
                  value={settings.serviceAnimalNotice}
                  onValueChange={(value) =>
                    updateSetting("serviceAnimalNotice", value)
                  }
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />

                <View style={styles.infoBox}>
                  <Type size={19} color={colors.gold} />
                  <Text style={styles.infoText}>
                    Screen reader is currently{" "}
                    {screenReaderActive ? "active" : "not active"}. These choices
                    are stored locally and synced to your account.
                  </Text>
                </View>
              </SettingsCard>
            ) : null}

            {activeSection === "biometrics" ||
            activeSection === "face-id" ? (
              <>
                <SettingsCard
                  title="Biometric Security"
                  icon={<Fingerprint size={21} color={colors.gold} />}
                  styles={styles}
                >
                  <SwitchRow
                    title="Enable Biometrics"
                    subtitle="Authenticates before biometric login is enabled."
                    value={settings.biometricsEnabled}
                    onValueChange={handleBiometrics}
                    styles={styles}
                    colors={colors}
                    settings={settings}
                  />
                  <SwitchRow
                    title="Remember Login"
                    subtitle="Securely keeps this account ready for faster sign-in."
                    value={settings.rememberLogin}
                    onValueChange={handleRememberLogin}
                    styles={styles}
                    colors={colors}
                    settings={settings}
                  />
                </SettingsCard>

                <SettingsCard
                  title="Face ID"
                  icon={<ScanFace size={21} color={colors.gold} />}
                  styles={styles}
                >
                  <SwitchRow
                    title="Use Face ID"
                    subtitle={
                      Platform.OS === "ios"
                        ? "Authenticates with Face ID before enabling."
                        : "Face ID is available on supported Apple devices."
                    }
                    value={settings.faceIdEnabled}
                    onValueChange={handleFaceId}
                    styles={styles}
                    colors={colors}
                    settings={settings}
                  />

                  <View style={styles.securityNotice}>
                    <ShieldCheck size={20} color={colors.gold} />
                    <Text style={styles.securityNoticeText}>
                      Biometric preferences are saved in secure device storage.
                      Your fingerprint or face data never leaves the device.
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
                  subtitle="Marks quiet conversation as your preferred ride style."
                  value={settings.quietRideDefault}
                  onValueChange={(value) =>
                    updateSetting("quietRideDefault", value)
                  }
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />
                <SwitchRow
                  title="Allow Driver Calls"
                  subtitle="Lets assigned drivers call your profile number."
                  value={settings.allowDriverCalls}
                  onValueChange={(value) =>
                    updateSetting("allowDriverCalls", value)
                  }
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />
                <SwitchRow
                  title="Allow Driver Messages"
                  subtitle="Lets assigned drivers send trip-related messages."
                  value={settings.allowDriverMessages}
                  onValueChange={(value) =>
                    updateSetting("allowDriverMessages", value)
                  }
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />
                <SwitchRow
                  title="Auto-Prepare Safety Share"
                  subtitle="Requires a saved emergency contact before activation."
                  value={settings.autoShareTrip}
                  onValueChange={handleAutoShare}
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />

                <ActionRow
                  title="Edit Travel Preferences"
                  subtitle="Update luggage, music, climate, and conversation choices."
                  onPress={() => router.push("/profile" as any)}
                  styles={styles}
                  colors={colors}
                  settings={settings}
                />
              </SettingsCard>
            ) : null}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={saveSettings}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Save settings"
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

            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetSettings}
              accessibilityRole="button"
              accessibilityLabel="Restore default settings"
            >
              <Sparkles size={18} color={colors.gold} />
              <Text style={styles.resetButtonText}>
                Restore Default Settings
              </Text>
            </TouchableOpacity>

            <View style={styles.savedNotice}>
              <CheckCircle2 size={18} color={colors.gold} />
              <Text style={styles.savedNoticeText}>
                Changes are applied locally immediately and synced to your
                authenticated Angel Express account when saved.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function settingLabel(key: keyof PassengerSettings) {
  const labels: Record<keyof PassengerSettings, string> = {
    preferredLanguage: "Language",
    notificationsEnabled: "Notifications",
    tripUpdates: "Trip updates",
    paymentAlerts: "Payment alerts",
    safetyAlerts: "Safety alerts",
    marketingUpdates: "Offers and updates",
    largeText: "Large text",
    highContrast: "High contrast",
    reduceMotion: "Reduce motion",
    screenReaderHints: "Screen reader hints",
    soundFeedback: "Sound feedback",
    biometricsEnabled: "Biometrics",
    faceIdEnabled: "Face ID",
    rememberLogin: "Remember login",
    quietRideDefault: "Quiet ride",
    allowDriverCalls: "Driver calls",
    allowDriverMessages: "Driver messages",
    autoShareTrip: "Automatic safety share",
    wheelchairSupport: "Wheelchair support",
    extraBoardingTime: "Extra boarding time",
    hearingAssistance: "Hearing assistance",
    visionAssistance: "Vision assistance",
    serviceAnimalNotice: "Service-animal notice",
  };

  return labels[key];
}

function SectionTab({
  title,
  active,
  onPress,
  styles,
  settings,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
  styles: any;
  settings: PassengerSettings;
}) {
  return (
    <TouchableOpacity
      style={[styles.sectionTab, active && styles.sectionTabActive]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${title} settings`}
      accessibilityHint={
        settings.screenReaderHints
          ? `Shows the ${title.toLowerCase()} settings section`
          : undefined
      }
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
  disabled = false,
  styles,
  colors,
  settings,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void | Promise<void>;
  disabled?: boolean;
  styles: any;
  colors: any;
  settings: PassengerSettings;
}) {
  return (
    <View
      style={[styles.settingRow, disabled && styles.disabledRow]}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={
        settings.screenReaderHints ? subtitle : undefined
      }
      accessibilityState={{ checked: value, disabled }}
    >
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>

      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.borderSoft || colors.lightBorder,
          true: colors.gold,
        }}
        thumbColor={value ? "#FFFFFF" : "#CBD5E1"}
        accessibilityLabel={title}
      />
    </View>
  );
}

function ActionRow({
  title,
  subtitle,
  onPress,
  styles,
  colors,
  settings,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  styles: any;
  colors: any;
  settings: PassengerSettings;
}) {
  return (
    <TouchableOpacity
      style={styles.actionRow}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={
        settings.screenReaderHints ? subtitle : undefined
      }
    >
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color={colors.gold} />
    </TouchableOpacity>
  );
}

function createStyles(
  c: any,
  settings: PassengerSettings
) {
  const textScale = settings.largeText ? 1.16 : 1;
  const borderWidth = settings.highContrast ? 2 : 1;
  const strongBorder = settings.highContrast ? c.gold : c.border;
  const softBorder = settings.highContrast
    ? c.gold
    : c.borderSoft || c.lightBorder;

  return StyleSheet.create({
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
      fontSize: 15 * textScale,
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
      borderWidth,
      borderColor: strongBorder,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    backText: {
      color: c.gold,
      fontSize: 15 * textScale,
      fontWeight: "900",
    },
    themePill: {
      borderWidth,
      borderColor: strongBorder,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: {
      color: c.gold,
      fontSize: 12 * textScale,
      fontWeight: "900",
    },
    kicker: {
      color: c.gold,
      fontSize: 12 * textScale,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 9,
    },
    title: {
      color: c.text,
      fontSize: 38 * textScale,
      fontWeight: "900",
      marginBottom: 10,
    },
    subtitle: {
      color: c.text2 || c.textSecondary,
      fontSize: 15.5 * textScale,
      lineHeight: 23 * textScale,
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
      fontSize: 23 * textScale,
      fontWeight: "900",
      marginBottom: 5,
    },
    heroText: {
      color: c.onGold || c.navy,
      fontSize: 14.5 * textScale,
      lineHeight: 20 * textScale,
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
      borderWidth,
      borderColor: softBorder,
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
      fontSize: 12.5 * textScale,
      fontWeight: "900",
    },
    sectionTabTextActive: {
      color: c.onGold || c.navy,
    },
    settingsCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth,
      borderColor: softBorder,
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
      borderWidth,
      borderColor: strongBorder,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: {
      color: c.gold,
      fontSize: 21 * textScale,
      fontWeight: "900",
      flex: 1,
    },
    settingRow: {
      minHeight: settings.largeText ? 92 : 76,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderTopWidth: borderWidth,
      borderTopColor: softBorder,
      paddingVertical: 13,
    },
    disabledRow: {
      opacity: 0.48,
    },
    actionRow: {
      minHeight: settings.largeText ? 92 : 76,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderTopWidth: borderWidth,
      borderTopColor: softBorder,
      paddingVertical: 13,
    },
    settingCopy: {
      flex: 1,
    },
    settingTitle: {
      color: c.text,
      fontSize: 15.5 * textScale,
      fontWeight: "900",
      marginBottom: 4,
    },
    settingSubtitle: {
      color: c.text2 || c.textSecondary,
      fontSize: 12.5 * textScale,
      lineHeight: 18 * textScale,
      fontWeight: "700",
    },
    languageHelp: {
      color: c.text2 || c.textSecondary,
      fontSize: 12.5 * textScale,
      lineHeight: 18 * textScale,
      fontWeight: "700",
      marginBottom: 12,
    },
    languageGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    languagePill: {
      borderWidth,
      borderColor: softBorder,
      backgroundColor: c.soft,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    languagePillActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    languagePillText: {
      color: c.text,
      fontSize: 12 * textScale,
      fontWeight: "900",
    },
    languagePillTextActive: {
      color: c.onGold || c.navy,
    },
    subsectionTitle: {
      color: c.gold,
      fontSize: 16 * textScale,
      fontWeight: "900",
      marginTop: 18,
      marginBottom: 6,
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      borderRadius: 15,
      borderWidth,
      borderColor: strongBorder,
      backgroundColor: c.soft,
      padding: 13,
      marginTop: 10,
    },
    infoText: {
      color: c.text,
      fontSize: 12.5 * textScale,
      lineHeight: 18 * textScale,
      fontWeight: "700",
      flex: 1,
    },
    securityNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      borderRadius: 15,
      borderWidth,
      borderColor: strongBorder,
      backgroundColor: c.soft,
      padding: 13,
      marginTop: 10,
    },
    securityNoticeText: {
      color: c.text,
      fontSize: 12.5 * textScale,
      lineHeight: 18 * textScale,
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
      fontSize: 15 * textScale,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    disabledButton: {
      opacity: 0.65,
    },
    resetButton: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth,
      borderColor: strongBorder,
      backgroundColor: c.card,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 13,
    },
    resetButtonText: {
      color: c.gold,
      fontSize: 14 * textScale,
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
      fontSize: 12 * textScale,
      lineHeight: 18 * textScale,
      fontWeight: "700",
      textAlign: "center",
      flex: 1,
    },
  });
}
