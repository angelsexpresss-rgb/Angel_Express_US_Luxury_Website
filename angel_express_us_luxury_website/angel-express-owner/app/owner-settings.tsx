import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { useOwnerTheme } from "../lib/ownerTheme";
import { supabase } from "../lib/supabase";

type GenericRecord = Record<string, any>;

type OwnerProfile = GenericRecord & {
  id?: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  role?: string | null;
};

type OwnerSettings = {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;
  supportEmail: string;
  supportPhone: string;
  emergencyPhone: string;

  companySharePercent: string;
  driverSharePercent: string;
  studentDiscountPercent: string;
  referralRewardAmount: string;
  sharedRideDiscountPercent: string;
  cancellationFee: string;

  requireDriverApproval: boolean;
  requireBackgroundCheck: boolean;
  requireInsuranceVerification: boolean;
  requireVehicleInspection: boolean;

  allowStripe: boolean;
  allowZelle: boolean;
  allowCashApp: boolean;
  allowCash: boolean;

  zelleContact: string;
  cashAppHandle: string;

  ownerNotifications: boolean;
  bookingNotifications: boolean;
  driverNotifications: boolean;
  passengerNotifications: boolean;
  paymentNotifications: boolean;
  safetyNotifications: boolean;
  supportNotifications: boolean;
  studentNotifications: boolean;

  autoAssignDrivers: boolean;
  allowStudentSharedRides: boolean;
  allowPassengerCancellation: boolean;
  allowDriverCancellation: boolean;

  minimumBookingNoticeMinutes: string;
  driverAcceptanceMinutes: string;
  cancellationWindowMinutes: string;

  environmentLabel: string;
  appVersion: string;
};

const DEFAULT_SETTINGS: OwnerSettings = {
  companyName: "Angel Express",
  companyEmail: "",
  companyPhone: "",
  companyWebsite: "",
  supportEmail: "",
  supportPhone: "",
  emergencyPhone: "911",

  companySharePercent: "30",
  driverSharePercent: "70",
  studentDiscountPercent: "10",
  referralRewardAmount: "10",
  sharedRideDiscountPercent: "10",
  cancellationFee: "15",

  requireDriverApproval: true,
  requireBackgroundCheck: true,
  requireInsuranceVerification: true,
  requireVehicleInspection: true,

  allowStripe: true,
  allowZelle: true,
  allowCashApp: true,
  allowCash: false,

  zelleContact: "",
  cashAppHandle: "",

  ownerNotifications: true,
  bookingNotifications: true,
  driverNotifications: true,
  passengerNotifications: true,
  paymentNotifications: true,
  safetyNotifications: true,
  supportNotifications: true,
  studentNotifications: true,

  autoAssignDrivers: false,
  allowStudentSharedRides: true,
  allowPassengerCancellation: true,
  allowDriverCancellation: true,

  minimumBookingNoticeMinutes: "60",
  driverAcceptanceMinutes: "5",
  cancellationWindowMinutes: "60",

  environmentLabel: "Production",
  appVersion: "5.0.0",
};

function ownerName(owner: OwnerProfile | null) {
  if (!owner) return "Angel Express Owner";

  return (
    owner.full_name ||
    `${owner.first_name || ""} ${owner.last_name || ""}`.trim() ||
    owner.email ||
    "Angel Express Owner"
  );
}

function percentageTotal(settings: OwnerSettings) {
  return (
    Number(settings.companySharePercent || 0) +
    Number(settings.driverSharePercent || 0)
  );
}

export default function OwnerSettingsScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [settings, setSettings] =
    useState<OwnerSettings>(DEFAULT_SETTINGS);

  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  const [expandedSection, setExpandedSection] =
    useState<string>("company");

  const isTablet = width >= 700;
  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  async function loadSettings(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        Alert.alert(
          "Session Expired",
          "Please sign in again."
        );
        router.replace("/owner-login");
        return;
      }

      const ownerResponse = await supabase
        .from("owners")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!ownerResponse.error && ownerResponse.data) {
        setOwner(ownerResponse.data);
        setOwnerFullName(
          ownerResponse.data.full_name ||
            `${ownerResponse.data.first_name || ""} ${
              ownerResponse.data.last_name || ""
            }`.trim()
        );
        setOwnerPhone(ownerResponse.data.phone || "");
      } else {
        setOwner({
          id: user.id,
          email: user.email || "",
          full_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "",
          phone: user.phone || "",
          status: "active",
        });

        setOwnerFullName(
          user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            ""
        );

        setOwnerPhone(user.phone || "");
      }

      const storedSettings =
        user.user_metadata?.owner_settings;

      setSettings({
        ...DEFAULT_SETTINGS,
        ...(storedSettings || {}),
        companyEmail:
          storedSettings?.companyEmail ||
          user.email ||
          "",
      });
    } catch (error: any) {
      Alert.alert(
        "Settings Error",
        error?.message || "Unable to load owner settings."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function updateSetting<K extends keyof OwnerSettings>(
    key: K,
    value: OwnerSettings[K]
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveOwnerProfile() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("Owner session not found.");

    const profileAttempts = [
      {
        full_name: ownerFullName.trim(),
        phone: ownerPhone.trim(),
      },
      {
        full_name: ownerFullName.trim(),
      },
    ];

    let updated = false;

    for (const payload of profileAttempts) {
      const { error } = await supabase
        .from("owners")
        .update(payload)
        .eq("id", user.id);

      if (!error) {
        updated = true;
        break;
      }
    }

    const metadataResponse =
      await supabase.auth.updateUser({
        data: {
          full_name: ownerFullName.trim(),
          owner_phone: ownerPhone.trim(),
          owner_settings: settings,
        },
      });

    if (metadataResponse.error && !updated) {
      throw metadataResponse.error;
    }

    setOwner((current) => ({
      ...(current || {}),
      full_name: ownerFullName.trim(),
      phone: ownerPhone.trim(),
    }));
  }

  async function saveSettings() {
    try {
      const total = percentageTotal(settings);

      if (total !== 100) {
        Alert.alert(
          "Revenue Split Error",
          `Company and driver shares must total 100%. They currently total ${total}%.`
        );
        return;
      }

      if (
        Number(settings.companySharePercent) < 0 ||
        Number(settings.driverSharePercent) < 0
      ) {
        Alert.alert(
          "Invalid Percentage",
          "Revenue percentages cannot be negative."
        );
        return;
      }

      setSaving(true);

      await saveOwnerProfile();

      Alert.alert(
        "Settings Saved",
        "Owner profile and system preferences were saved successfully."
      );
    } catch (error: any) {
      Alert.alert(
        "Save Failed",
        error?.message || "Unable to save settings."
      );
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    Alert.alert(
      "Sign Out",
      "Sign out of the Angel Express Owner App?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace("/owner-login");
          },
        },
      ]
    );
  }

  const systemStatus = useMemo(() => {
    const paymentMethods = [
      settings.allowStripe,
      settings.allowZelle,
      settings.allowCashApp,
      settings.allowCash,
    ].filter(Boolean).length;

    const enabledNotifications = [
      settings.ownerNotifications,
      settings.bookingNotifications,
      settings.driverNotifications,
      settings.passengerNotifications,
      settings.paymentNotifications,
      settings.safetyNotifications,
      settings.supportNotifications,
      settings.studentNotifications,
    ].filter(Boolean).length;

    return {
      paymentMethods,
      enabledNotifications,
      revenueSplitValid:
        percentageTotal(settings) === 100,
      driverComplianceRules: [
        settings.requireDriverApproval,
        settings.requireBackgroundCheck,
        settings.requireInsuranceVerification,
        settings.requireVehicleInspection,
      ].filter(Boolean).length,
    };
  }, [settings]);

  function metricWidth() {
    if (isLarge) return "23.5%";
    if (isTablet) return "31.8%";
    return "48%";
  }

  function cardWidth() {
    if (isLarge) return "48.8%";
    return "100%";
  }

  function MetricCard({
    label,
    value,
    icon,
    color,
    background,
  }: {
    label: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    background: string;
  }) {
    return (
      <View
        style={[
          styles.metricCard,
          {
            width: metricWidth(),
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.cardBorder,
          },
          theme.shadows.soft,
        ]}
      >
        <View
          style={[
            styles.metricIcon,
            { backgroundColor: background },
          ]}
        >
          <Ionicons
            name={icon}
            size={21}
            color={color}
          />
        </View>

        <Text
          style={[
            styles.metricValue,
            { color: theme.colors.text },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>

        <Text
          style={[
            styles.metricLabel,
            { color: theme.colors.textMuted },
          ]}
        >
          {label}
        </Text>
      </View>
    );
  }

  function Section({
    id,
    title,
    subtitle,
    icon,
    children,
  }: {
    id: string;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    children: React.ReactNode;
  }) {
    const expanded = expandedSection === id;

    return (
      <View
        style={[
          styles.sectionCard,
          {
            width: cardWidth(),
            backgroundColor: theme.colors.card,
            borderColor: expanded
              ? theme.colors.gold
              : theme.colors.cardBorder,
          },
          theme.shadows.soft,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.sectionHeader}
          onPress={() =>
            setExpandedSection(expanded ? "" : id)
          }
        >
          <View
            style={[
              styles.sectionIcon,
              {
                backgroundColor:
                  theme.colors.goldTransparent,
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={21}
              color={theme.colors.gold}
            />
          </View>

          <View style={styles.sectionTitleArea}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text },
              ]}
            >
              {title}
            </Text>

            <Text
              style={[
                styles.sectionSubtitle,
                { color: theme.colors.textMuted },
              ]}
            >
              {subtitle}
            </Text>
          </View>

          <Ionicons
            name={
              expanded
                ? "chevron-up"
                : "chevron-down"
            }
            size={20}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>

        {expanded ? (
          <View
            style={[
              styles.sectionBody,
              {
                borderTopColor:
                  theme.colors.divider,
              },
            ]}
          >
            {children}
          </View>
        ) : null}
      </View>
    );
  }

  function Field({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
    secureTextEntry = false,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    keyboardType?: any;
    secureTextEntry?: boolean;
  }) {
    return (
      <View style={styles.fieldGroup}>
        <Text
          style={[
            styles.fieldLabel,
            { color: theme.colors.textMuted },
          ]}
        >
          {label}
        </Text>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={
            theme.colors.inputPlaceholder
          }
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          style={[
            styles.input,
            {
              backgroundColor:
                theme.colors.inputBackground,
              borderColor:
                theme.colors.inputBorder,
              color: theme.colors.text,
            },
          ]}
        />
      </View>
    );
  }

  function ToggleRow({
    label,
    description,
    value,
    onValueChange,
    tone = "gold",
  }: {
    label: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    tone?: "gold" | "success" | "warning" | "danger" | "info";
  }) {
    const color =
      tone === "success"
        ? theme.colors.success
        : tone === "warning"
          ? theme.colors.warning
          : tone === "danger"
            ? theme.colors.danger
            : tone === "info"
              ? theme.colors.info
              : theme.colors.gold;

    return (
      <View
        style={[
          styles.toggleRow,
          {
            borderBottomColor:
              theme.colors.divider,
          },
        ]}
      >
        <View style={styles.toggleTextArea}>
          <Text
            style={[
              styles.toggleLabel,
              { color: theme.colors.text },
            ]}
          >
            {label}
          </Text>

          <Text
            style={[
              styles.toggleDescription,
              { color: theme.colors.textMuted },
            ]}
          >
            {description}
          </Text>
        </View>

        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{
            false: theme.colors.surfaceSoft,
            true: color,
          }}
          thumbColor="#ffffff"
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor:
              theme.colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={theme.colors.gold}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                theme.colors.textSecondary,
            },
          ]}
        >
          Loading Owner Settings...
        </Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/owner-bg.png")}
      style={[
        styles.background,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
      resizeMode="cover"
    >
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark
              ? "rgba(3,8,17,0.94)"
              : "rgba(245,247,250,0.96)",
          },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.container,
              {
                maxWidth: isLarge
                  ? 1350
                  : 1100,
              },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  await loadSettings(false);
                }}
                tintColor={theme.colors.gold}
                colors={[theme.colors.gold]}
              />
            }
          >
            <View style={styles.topBar}>
              <TouchableOpacity
                style={[
                  styles.backButton,
                  {
                    backgroundColor:
                      theme.colors.card,
                    borderColor:
                      theme.colors.cardBorder,
                  },
                ]}
                onPress={() => router.back()}
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={theme.colors.gold}
                />
              </TouchableOpacity>

              <View style={styles.titleArea}>
                <Text
                  style={[
                    styles.eyebrow,
                    { color: theme.colors.gold },
                  ]}
                >
                  ANGEL EXPRESS SYSTEM CONTROL
                </Text>

                <Text
                  style={[
                    styles.pageTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  Owner Settings
                </Text>

                <Text
                  style={[
                    styles.pageSubtitle,
                    {
                      color:
                        theme.colors.textMuted,
                    },
                  ]}
                >
                  Configure ownership, company details,
                  payments, revenue sharing, driver rules,
                  student benefits, notifications, security,
                  and operational policies.
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.ownerSummary,
                {
                  backgroundColor:
                    theme.colors.card,
                  borderColor:
                    theme.colors.cardBorderStrong,
                },
                theme.shadows.premium,
              ]}
            >
              <View
                style={[
                  styles.ownerAvatar,
                  {
                    backgroundColor:
                      theme.colors.goldTransparent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.ownerAvatarText,
                    { color: theme.colors.gold },
                  ]}
                >
                  {ownerName(owner)
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>

              <View style={styles.ownerSummaryText}>
                <Text
                  style={[
                    styles.ownerName,
                    { color: theme.colors.text },
                  ]}
                >
                  {ownerName(owner)}
                </Text>

                <Text
                  style={[
                    styles.ownerEmail,
                    {
                      color:
                        theme.colors.textMuted,
                    },
                  ]}
                >
                  {owner?.email ||
                    "Owner email unavailable"}
                </Text>

                <View
                  style={[
                    styles.ownerStatusBadge,
                    {
                      backgroundColor:
                        theme.colors.successSoft,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.ownerStatusDot,
                      {
                        backgroundColor:
                          theme.colors.success,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.ownerStatusText,
                      {
                        color:
                          theme.colors.success,
                      },
                    ]}
                  >
                    {owner?.status || "active"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.metricGrid}>
              <MetricCard
                label="Revenue Split"
                value={
                  systemStatus.revenueSplitValid
                    ? "Valid"
                    : "Review"
                }
                icon="pie-chart-outline"
                color={
                  systemStatus.revenueSplitValid
                    ? theme.colors.success
                    : theme.colors.danger
                }
                background={
                  systemStatus.revenueSplitValid
                    ? theme.colors.successSoft
                    : theme.colors.dangerSoft
                }
              />

              <MetricCard
                label="Payment Methods"
                value={
                  systemStatus.paymentMethods
                }
                icon="card-outline"
                color={theme.colors.info}
                background={
                  theme.colors.infoSoft
                }
              />

              <MetricCard
                label="Notification Channels"
                value={
                  systemStatus.enabledNotifications
                }
                icon="notifications-outline"
                color={theme.colors.gold}
                background={
                  theme.colors.goldTransparent
                }
              />

              <MetricCard
                label="Driver Compliance Rules"
                value={
                  systemStatus.driverComplianceRules
                }
                icon="shield-checkmark-outline"
                color={theme.colors.success}
                background={
                  theme.colors.successSoft
                }
              />
            </View>

            <View style={styles.sectionGrid}>
              <Section
                id="company"
                title="Owner & Company Profile"
                subtitle="Ownership identity and Angel Express contact information."
                icon="business-outline"
              >
                <Field
                  label="Owner Full Name"
                  value={ownerFullName}
                  onChangeText={setOwnerFullName}
                  placeholder="Owner full name"
                />

                <Field
                  label="Owner Phone"
                  value={ownerPhone}
                  onChangeText={setOwnerPhone}
                  placeholder="Owner phone"
                  keyboardType="phone-pad"
                />

                <Field
                  label="Company Name"
                  value={settings.companyName}
                  onChangeText={(value) =>
                    updateSetting(
                      "companyName",
                      value
                    )
                  }
                  placeholder="Angel Express"
                />

                <Field
                  label="Company Email"
                  value={settings.companyEmail}
                  onChangeText={(value) =>
                    updateSetting(
                      "companyEmail",
                      value
                    )
                  }
                  placeholder="Company email"
                  keyboardType="email-address"
                />

                <Field
                  label="Company Phone"
                  value={settings.companyPhone}
                  onChangeText={(value) =>
                    updateSetting(
                      "companyPhone",
                      value
                    )
                  }
                  placeholder="Company phone"
                  keyboardType="phone-pad"
                />

                <Field
                  label="Company Website"
                  value={settings.companyWebsite}
                  onChangeText={(value) =>
                    updateSetting(
                      "companyWebsite",
                      value
                    )
                  }
                  placeholder="https://..."
                />
              </Section>

              <Section
                id="support"
                title="Support & Emergency Contacts"
                subtitle="Customer support and emergency escalation details."
                icon="headset-outline"
              >
                <Field
                  label="Support Email"
                  value={settings.supportEmail}
                  onChangeText={(value) =>
                    updateSetting(
                      "supportEmail",
                      value
                    )
                  }
                  placeholder="Support email"
                  keyboardType="email-address"
                />

                <Field
                  label="Support Phone"
                  value={settings.supportPhone}
                  onChangeText={(value) =>
                    updateSetting(
                      "supportPhone",
                      value
                    )
                  }
                  placeholder="Support phone"
                  keyboardType="phone-pad"
                />

                <Field
                  label="Emergency Contact"
                  value={settings.emergencyPhone}
                  onChangeText={(value) =>
                    updateSetting(
                      "emergencyPhone",
                      value
                    )
                  }
                  placeholder="Emergency phone"
                  keyboardType="phone-pad"
                />
              </Section>

              <Section
                id="finance"
                title="Revenue & Discount Rules"
                subtitle="Company share, driver share, student, referral, and shared-ride benefits."
                icon="cash-outline"
              >
                <Field
                  label="Company Share (%)"
                  value={
                    settings.companySharePercent
                  }
                  onChangeText={(value) =>
                    updateSetting(
                      "companySharePercent",
                      value
                    )
                  }
                  placeholder="30"
                  keyboardType="numeric"
                />

                <Field
                  label="Driver Share (%)"
                  value={
                    settings.driverSharePercent
                  }
                  onChangeText={(value) =>
                    updateSetting(
                      "driverSharePercent",
                      value
                    )
                  }
                  placeholder="70"
                  keyboardType="numeric"
                />

                <View
                  style={[
                    styles.splitNotice,
                    {
                      backgroundColor:
                        systemStatus.revenueSplitValid
                          ? theme.colors.successSoft
                          : theme.colors.dangerSoft,
                      borderColor:
                        systemStatus.revenueSplitValid
                          ? theme.colors.success
                          : theme.colors.danger,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      systemStatus.revenueSplitValid
                        ? "checkmark-circle-outline"
                        : "warning-outline"
                    }
                    size={19}
                    color={
                      systemStatus.revenueSplitValid
                        ? theme.colors.success
                        : theme.colors.danger
                    }
                  />

                  <Text
                    style={[
                      styles.splitNoticeText,
                      {
                        color:
                          systemStatus.revenueSplitValid
                            ? theme.colors.success
                            : theme.colors.danger,
                      },
                    ]}
                  >
                    Revenue split total:{" "}
                    {percentageTotal(settings)}%
                  </Text>
                </View>

                <Field
                  label="Student Discount (%)"
                  value={
                    settings.studentDiscountPercent
                  }
                  onChangeText={(value) =>
                    updateSetting(
                      "studentDiscountPercent",
                      value
                    )
                  }
                  placeholder="10"
                  keyboardType="numeric"
                />

                <Field
                  label="Referral Reward ($)"
                  value={
                    settings.referralRewardAmount
                  }
                  onChangeText={(value) =>
                    updateSetting(
                      "referralRewardAmount",
                      value
                    )
                  }
                  placeholder="10"
                  keyboardType="numeric"
                />

                <Field
                  label="Shared Ride Discount (%)"
                  value={
                    settings.sharedRideDiscountPercent
                  }
                  onChangeText={(value) =>
                    updateSetting(
                      "sharedRideDiscountPercent",
                      value
                    )
                  }
                  placeholder="10"
                  keyboardType="numeric"
                />

                <Field
                  label="Cancellation Fee ($)"
                  value={
                    settings.cancellationFee
                  }
                  onChangeText={(value) =>
                    updateSetting(
                      "cancellationFee",
                      value
                    )
                  }
                  placeholder="15"
                  keyboardType="numeric"
                />
              </Section>

              <Section
                id="payments"
                title="Payment Methods"
                subtitle="Configure payment channels available to Angel Express customers."
                icon="card-outline"
              >
                <ToggleRow
                  label="Stripe"
                  description="Allow card and online Stripe payments."
                  value={settings.allowStripe}
                  onValueChange={(value) =>
                    updateSetting(
                      "allowStripe",
                      value
                    )
                  }
                  tone="info"
                />

                <ToggleRow
                  label="Zelle"
                  description="Allow owner-confirmed Zelle payments."
                  value={settings.allowZelle}
                  onValueChange={(value) =>
                    updateSetting(
                      "allowZelle",
                      value
                    )
                  }
                  tone="success"
                />

                <Field
                  label="Zelle Contact"
                  value={settings.zelleContact}
                  onChangeText={(value) =>
                    updateSetting(
                      "zelleContact",
                      value
                    )
                  }
                  placeholder="Email or phone"
                />

                <ToggleRow
                  label="Cash App"
                  description="Allow owner-confirmed Cash App payments."
                  value={settings.allowCashApp}
                  onValueChange={(value) =>
                    updateSetting(
                      "allowCashApp",
                      value
                    )
                  }
                  tone="success"
                />

                <Field
                  label="Cash App Handle"
                  value={settings.cashAppHandle}
                  onChangeText={(value) =>
                    updateSetting(
                      "cashAppHandle",
                      value
                    )
                  }
                  placeholder="$AngelExpress"
                />

                <ToggleRow
                  label="Cash"
                  description="Allow cash payment during or after a trip."
                  value={settings.allowCash}
                  onValueChange={(value) =>
                    updateSetting(
                      "allowCash",
                      value
                    )
                  }
                  tone="warning"
                />
              </Section>

              <Section
                id="drivers"
                title="Driver Compliance"
                subtitle="Control approval, background, insurance, and vehicle requirements."
                icon="car-sport-outline"
              >
                <ToggleRow
                  label="Require Owner Approval"
                  description="Drivers cannot operate until approved by ownership."
                  value={
                    settings.requireDriverApproval
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "requireDriverApproval",
                      value
                    )
                  }
                  tone="success"
                />

                <ToggleRow
                  label="Require Background Check"
                  description="Driver background status must be approved."
                  value={
                    settings.requireBackgroundCheck
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "requireBackgroundCheck",
                      value
                    )
                  }
                  tone="success"
                />

                <ToggleRow
                  label="Require Insurance Verification"
                  description="Vehicle insurance must be verified."
                  value={
                    settings.requireInsuranceVerification
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "requireInsuranceVerification",
                      value
                    )
                  }
                  tone="success"
                />

                <ToggleRow
                  label="Require Vehicle Inspection"
                  description="Vehicle inspection must be completed before activation."
                  value={
                    settings.requireVehicleInspection
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "requireVehicleInspection",
                      value
                    )
                  }
                  tone="success"
                />
              </Section>

              <Section
                id="operations"
                title="Booking & Dispatch Rules"
                subtitle="Configure ride assignment, cancellation, and dispatch timing."
                icon="navigate-outline"
              >
                <ToggleRow
                  label="Automatic Driver Assignment"
                  description="Automatically match eligible drivers to bookings."
                  value={
                    settings.autoAssignDrivers
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "autoAssignDrivers",
                      value
                    )
                  }
                  tone="info"
                />

                <ToggleRow
                  label="Student Shared Rides"
                  description="Allow verified students to request shared rides."
                  value={
                    settings.allowStudentSharedRides
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "allowStudentSharedRides",
                      value
                    )
                  }
                  tone="info"
                />

                <ToggleRow
                  label="Passenger Cancellation"
                  description="Allow passengers to cancel eligible bookings."
                  value={
                    settings.allowPassengerCancellation
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "allowPassengerCancellation",
                      value
                    )
                  }
                />

                <ToggleRow
                  label="Driver Cancellation"
                  description="Allow drivers to cancel assigned trips."
                  value={
                    settings.allowDriverCancellation
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "allowDriverCancellation",
                      value
                    )
                  }
                />

                <Field
                  label="Minimum Booking Notice (minutes)"
                  value={
                    settings.minimumBookingNoticeMinutes
                  }
                  onChangeText={(value) =>
                    updateSetting(
                      "minimumBookingNoticeMinutes",
                      value
                    )
                  }
                  keyboardType="numeric"
                />

                <Field
                  label="Driver Acceptance Window (minutes)"
                  value={
                    settings.driverAcceptanceMinutes
                  }
                  onChangeText={(value) =>
                    updateSetting(
                      "driverAcceptanceMinutes",
                      value
                    )
                  }
                  keyboardType="numeric"
                />

                <Field
                  label="Cancellation Window (minutes)"
                  value={
                    settings.cancellationWindowMinutes
                  }
                  onChangeText={(value) =>
                    updateSetting(
                      "cancellationWindowMinutes",
                      value
                    )
                  }
                  keyboardType="numeric"
                />
              </Section>

              <Section
                id="notifications"
                title="Notification Preferences"
                subtitle="Choose which operational events notify ownership."
                icon="notifications-outline"
              >
                <ToggleRow
                  label="Owner Notifications"
                  description="Master owner notification control."
                  value={
                    settings.ownerNotifications
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "ownerNotifications",
                      value
                    )
                  }
                  tone="gold"
                />

                <ToggleRow
                  label="Booking Updates"
                  description="New, changed, cancelled, and completed bookings."
                  value={
                    settings.bookingNotifications
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "bookingNotifications",
                      value
                    )
                  }
                  tone="info"
                />

                <ToggleRow
                  label="Driver Updates"
                  description="Approvals, availability, status, and support."
                  value={
                    settings.driverNotifications
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "driverNotifications",
                      value
                    )
                  }
                  tone="info"
                />

                <ToggleRow
                  label="Passenger Updates"
                  description="Passenger support, changes, and service issues."
                  value={
                    settings.passengerNotifications
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "passengerNotifications",
                      value
                    )
                  }
                  tone="info"
                />

                <ToggleRow
                  label="Payment Updates"
                  description="Payments, refunds, receipts, and payouts."
                  value={
                    settings.paymentNotifications
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "paymentNotifications",
                      value
                    )
                  }
                  tone="success"
                />

                <ToggleRow
                  label="Safety Alerts"
                  description="SOS, emergency, family check-in, and intervention alerts."
                  value={
                    settings.safetyNotifications
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "safetyNotifications",
                      value
                    )
                  }
                  tone="danger"
                />

                <ToggleRow
                  label="Support Requests"
                  description="Passenger and driver support messages."
                  value={
                    settings.supportNotifications
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "supportNotifications",
                      value
                    )
                  }
                  tone="warning"
                />

                <ToggleRow
                  label="Student Operations"
                  description="Student submissions, approvals, rewards, and shared rides."
                  value={
                    settings.studentNotifications
                  }
                  onValueChange={(value) =>
                    updateSetting(
                      "studentNotifications",
                      value
                    )
                  }
                  tone="info"
                />
              </Section>

              <Section
                id="system"
                title="System Information"
                subtitle="Application environment, appearance, and configuration status."
                icon="settings-outline"
              >
                <View
                  style={[
                    styles.systemInfoRow,
                    {
                      borderBottomColor:
                        theme.colors.divider,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.systemInfoLabel,
                      {
                        color:
                          theme.colors.textMuted,
                      },
                    ]}
                  >
                    Appearance
                  </Text>

                  <Text
                    style={[
                      styles.systemInfoValue,
                      { color: theme.colors.text },
                    ]}
                  >
                    {isDark
                      ? "Dark Mode"
                      : "Light Mode"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.systemInfoRow,
                    {
                      borderBottomColor:
                        theme.colors.divider,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.systemInfoLabel,
                      {
                        color:
                          theme.colors.textMuted,
                      },
                    ]}
                  >
                    Environment
                  </Text>

                  <Text
                    style={[
                      styles.systemInfoValue,
                      { color: theme.colors.text },
                    ]}
                  >
                    {settings.environmentLabel}
                  </Text>
                </View>

                <View
                  style={[
                    styles.systemInfoRow,
                    {
                      borderBottomColor:
                        theme.colors.divider,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.systemInfoLabel,
                      {
                        color:
                          theme.colors.textMuted,
                      },
                    ]}
                  >
                    App Version
                  </Text>

                  <Text
                    style={[
                      styles.systemInfoValue,
                      { color: theme.colors.text },
                    ]}
                  >
                    {settings.appVersion}
                  </Text>
                </View>

                <View
                  style={[
                    styles.systemNotice,
                    {
                      backgroundColor:
                        theme.colors.infoSoft,
                      borderColor:
                        theme.colors.info,
                    },
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={theme.colors.info}
                  />

                  <Text
                    style={[
                      styles.systemNoticeText,
                      { color: theme.colors.info },
                    ]}
                  >
                    These preferences are stored securely in
                    the authenticated owner account metadata.
                    No additional database settings table is
                    required.
                  </Text>
                </View>
              </Section>

              <Section
                id="security"
                title="Security & Session"
                subtitle="Review account status and manage the current owner session."
                icon="lock-closed-outline"
              >
                <View
                  style={[
                    styles.systemInfoRow,
                    {
                      borderBottomColor:
                        theme.colors.divider,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.systemInfoLabel,
                      {
                        color:
                          theme.colors.textMuted,
                      },
                    ]}
                  >
                    Owner Account
                  </Text>

                  <Text
                    style={[
                      styles.systemInfoValue,
                      { color: theme.colors.text },
                    ]}
                  >
                    {owner?.email ||
                      "Unavailable"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.systemInfoRow,
                    {
                      borderBottomColor:
                        theme.colors.divider,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.systemInfoLabel,
                      {
                        color:
                          theme.colors.textMuted,
                      },
                    ]}
                  >
                    Account Status
                  </Text>

                  <Text
                    style={[
                      styles.systemInfoValue,
                      {
                        color:
                          theme.colors.success,
                      },
                    ]}
                  >
                    {owner?.status || "active"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.signOutButton,
                    {
                      backgroundColor:
                        theme.colors.dangerSoft,
                      borderColor:
                        theme.colors.danger,
                    },
                  ]}
                  onPress={signOut}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={19}
                    color={theme.colors.danger}
                  />

                  <Text
                    style={[
                      styles.signOutText,
                      {
                        color:
                          theme.colors.danger,
                      },
                    ]}
                  >
                    Sign Out of Owner App
                  </Text>
                </TouchableOpacity>
              </Section>
            </View>

            <View
              style={[
                styles.saveBar,
                {
                  backgroundColor:
                    theme.colors.card,
                  borderColor:
                    theme.colors.cardBorderStrong,
                },
                theme.shadows.premium,
              ]}
            >
              <View style={styles.saveBarTextArea}>
                <Text
                  style={[
                    styles.saveBarTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  Save System Configuration
                </Text>

                <Text
                  style={[
                    styles.saveBarText,
                    {
                      color:
                        theme.colors.textMuted,
                    },
                  ]}
                >
                  Save owner profile and all V5 operating
                  preferences.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor:
                      theme.colors.gold,
                  },
                  saving &&
                    styles.disabledButton,
                ]}
                onPress={saveSettings}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator
                    color={
                      theme.colors.textInverse
                    }
                  />
                ) : (
                  <>
                    <Ionicons
                      name="save-outline"
                      size={19}
                      color={
                        theme.colors.textInverse
                      }
                    />

                    <Text
                      style={[
                        styles.saveButtonText,
                        {
                          color:
                            theme.colors
                              .textInverse,
                        },
                      ]}
                    >
                      Save Settings
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  overlay: {
    flex: 1,
  },

  keyboardView: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "700",
  },

  container: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 70,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 28,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  titleArea: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 5,
  },

  pageTitle: {
    fontSize: 29,
    fontWeight: "900",
  },

  pageSubtitle: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 780,
  },

  ownerSummary: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },

  ownerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  ownerAvatarText: {
    fontSize: 27,
    fontWeight: "900",
  },

  ownerSummaryText: {
    flex: 1,
  },

  ownerName: {
    fontSize: 18,
    fontWeight: "900",
  },

  ownerEmail: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
  },

  ownerStatusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 9,
  },

  ownerStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 6,
  },

  ownerStatusText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "capitalize",
  },

  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  metricCard: {
    minHeight: 132,
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    marginBottom: 13,
  },

  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  metricValue: {
    fontSize: 24,
    fontWeight: "900",
  },

  metricLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: "700",
  },

  sectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  sectionCard: {
    borderWidth: 1,
    borderRadius: 22,
    marginBottom: 14,
    overflow: "hidden",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },

  sectionIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  sectionTitleArea: {
    flex: 1,
    paddingRight: 8,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
  },

  sectionBody: {
    borderTopWidth: 1,
    padding: 16,
  },

  fieldGroup: {
    marginBottom: 13,
  },

  fieldLabel: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 7,
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: "600",
  },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: 13,
  },

  toggleTextArea: {
    flex: 1,
    paddingRight: 12,
  },

  toggleLabel: {
    fontSize: 12.5,
    fontWeight: "900",
  },

  toggleDescription: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
  },

  splitNotice: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 13,
  },

  splitNoticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 10.5,
    fontWeight: "900",
  },

  systemInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingVertical: 13,
  },

  systemInfoLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
  },

  systemInfoValue: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "900",
    textAlign: "right",
  },

  systemNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 15,
    padding: 12,
    marginTop: 14,
  },

  systemNoticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 10.5,
    lineHeight: 16,
    fontWeight: "700",
  },

  signOutButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 15,
    marginTop: 16,
  },

  signOutText: {
    marginLeft: 7,
    fontSize: 11.5,
    fontWeight: "900",
  },

  saveBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginTop: 12,
  },

  saveBarTextArea: {
    flex: 1,
    paddingRight: 12,
  },

  saveBarTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  saveBarText: {
    marginTop: 4,
    fontSize: 10.5,
    lineHeight: 16,
  },

  saveButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    paddingHorizontal: 15,
  },

  saveButtonText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.6,
  },
});
