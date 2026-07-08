import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useDriverTheme, v5Shadow } from "../lib/driverTheme";

export default function DriverNotificationsScreen() {
  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [driver, setDriver] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [tripUpdates, setTripUpdates] = useState(true);
  const [earningsUpdates, setEarningsUpdates] = useState(true);
  const [safetyUpdates, setSafetyUpdates] = useState(true);
  const [promoUpdates, setPromoUpdates] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();

      const interval = setInterval(() => {
        loadNotifications(false);
      }, 10000);

      return () => clearInterval(interval);
    }, [])
  );

  async function loadNotifications(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/driver-login");
        return;
      }

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select(
          "id,push_notifications_enabled,trip_updates_enabled,earnings_updates_enabled,safety_updates_enabled,promo_updates_enabled"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (driverError) throw driverError;

      setDriver(driverData);

      if (driverData) {
        setPushEnabled(driverData.push_notifications_enabled ?? true);
        setTripUpdates(driverData.trip_updates_enabled ?? true);
        setEarningsUpdates(driverData.earnings_updates_enabled ?? true);
        setSafetyUpdates(driverData.safety_updates_enabled ?? true);
        setPromoUpdates(driverData.promo_updates_enabled ?? false);
      }

      const { data, error } = await supabase
        .from("driver_notifications")
        .select("*")
        .eq("driver_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (err: any) {
      Alert.alert(
        "Notification Error",
        err.message || "Unable to load notifications."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadNotifications(false);
  }

  async function savePreferences() {
    try {
      if (!driver?.id) return;

      setSaving(true);

      const { error } = await supabase
        .from("drivers")
        .update({
          push_notifications_enabled: pushEnabled,
          trip_updates_enabled: tripUpdates,
          earnings_updates_enabled: earningsUpdates,
          safety_updates_enabled: safetyUpdates,
          promo_updates_enabled: promoUpdates,
        })
        .eq("id", driver.id);

      if (error) throw error;

      Alert.alert("Saved", "Your notification preferences have been updated.");
    } catch (err: any) {
      Alert.alert(
        "Save Error",
        err.message || "Unable to save notification preferences."
      );
    } finally {
      setSaving(false);
    }
  }

async function markAsRead(notification: any) {
  try {
    if (notification.is_read) {
      if (
        notification.action_route &&
        notification.action_route !== "/driver-dashboard" &&
        notification.action_route !== "/driver-notifications"
      ) {
        router.push(notification.action_route as any);
      }

      return;
    }

    const { error } = await supabase
      .from("driver_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notification.id);

    if (error) throw error;

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, is_read: true, read_at: new Date().toISOString() }
          : item
      )
    );

    if (
      notification.action_route &&
      notification.action_route !== "/driver-dashboard" &&
      notification.action_route !== "/driver-notifications"
    ) {
      router.push(notification.action_route as any);
    }
  } catch (err: any) {
    Alert.alert("Update Error", err.message || "Unable to mark as read.");
  }
}

  async function markAllRead() {
    try {
      if (!driver?.id) return;

      const { error } = await supabase
        .from("driver_notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("driver_id", driver.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at || new Date().toISOString(),
        }))
      );
    } catch (err: any) {
      Alert.alert("Update Error", err.message || "Unable to mark all read.");
    }
  }

  function getNotificationIcon(type: string) {
    const clean = String(type || "").toLowerCase();

    if (clean === "welcome") return "👋";
    if (clean === "trip") return "🚘";
    if (clean === "earnings") return "💳";
    if (clean === "safety") return "🛡️";
    if (clean === "promo") return "🎁";
    if (clean === "system") return "🔔";

    return "🔔";
  }

  function formatTime(value: string) {
    if (!value) return "";

    try {
      return new Date(value).toLocaleString();
    } catch {
      return "";
    }
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Loading update center...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/driver-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.kicker}>ANGEL EXPRESS DRIVER APP</Text>
          <Text style={styles.title}>Update Center</Text>

          <Text style={styles.subtitle}>
            Driver notifications, app updates, trip alerts, earnings notices,
            safety messages, and owner announcements will appear here.
          </Text>

          <View style={styles.heroCard}>
            <View>
              <Text style={styles.heroLabel}>Unread Notifications</Text>
              <Text style={styles.heroCount}>{unreadCount}</Text>
            </View>

            <View style={styles.heroBell}>
              <Text style={styles.heroBellText}>🔔</Text>
            </View>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllButton} onPress={markAllRead}>
              <Text style={styles.markAllText}>Mark All As Read</Text>
            </TouchableOpacity>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Push & Notification Preferences</Text>

            <PreferenceRow
              title="Push Notifications"
              text="Allow Angel Express to send important driver alerts."
              value={pushEnabled}
              onValueChange={setPushEnabled}
              styles={styles}
              colors={colors}
            />

            <PreferenceRow
              title="Trip Updates"
              text="New trips, assigned trips, schedule changes, cancellations, and active trip updates."
              value={tripUpdates}
              onValueChange={setTripUpdates}
              styles={styles}
              colors={colors}
            />

            <PreferenceRow
              title="Earnings Updates"
              text="Weekly earnings, payout notices, Stripe updates, and payment reminders."
              value={earningsUpdates}
              onValueChange={setEarningsUpdates}
              styles={styles}
              colors={colors}
            />

            <PreferenceRow
              title="Safety Updates"
              text="Emergency alerts, route safety, support updates, and owner safety announcements."
              value={safetyUpdates}
              onValueChange={setSafetyUpdates}
              styles={styles}
              colors={colors}
            />

            <PreferenceRow
              title="Promotions & Rewards"
              text="Driver rewards, bonus opportunities, premium trip campaigns, and announcements."
              value={promoUpdates}
              onValueChange={setPromoUpdates}
              styles={styles}
              colors={colors}
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={savePreferences}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.saveText}>Save Preferences</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notifications & Updates</Text>

            {notifications.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptyText}>
                  Updates from Angel Express will appear here.
                </Text>
              </View>
            ) : (
              notifications.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.notificationCard,
                    !item.is_read && styles.unreadCard,
                  ]}
                  onPress={() => markAsRead(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.notificationTop}>
                    <Text style={styles.notificationIcon}>
                      {getNotificationIcon(item.type)}
                    </Text>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.notificationTitle}>{item.title}</Text>
                      <Text style={styles.notificationTime}>
                        {formatTime(item.created_at)}
                      </Text>
                    </View>

                    {!item.is_read && <View style={styles.unreadDot} />}
                  </View>

                  <Text style={styles.notificationMessage}>{item.message}</Text>

                  <View style={styles.notificationFooter}>
                    <Text style={styles.notificationType}>
                      {String(item.type || "general").toUpperCase()}
                    </Text>

                    <Text
                      style={[
                        styles.readStatus,
                        !item.is_read && styles.unreadStatus,
                      ]}
                    >
                      {item.is_read ? "Read" : "Unread"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

function PreferenceRow({
  title,
  text,
  value,
  onValueChange,
  styles,
  colors,
}: any) {
  return (
    <View style={styles.preferenceRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.preferenceTitle}>{title}</Text>
        <Text style={styles.preferenceText}>{text}</Text>
        <Text style={[styles.preferenceStatus, value && styles.preferenceStatusOn]}>
          {value ? "Enabled" : "Disabled"}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#64748B", true: colors.gold }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    background: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      color: colors.text2,
      marginTop: 14,
      fontWeight: "800",
    },
    container: {
      padding: 22,
      paddingTop: 60,
      paddingBottom: 50,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    backText: {
      color: colors.gold,
      fontWeight: "900",
      fontSize: 14,
    },
    themePill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    kicker: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 8,
    },
    title: {
      color: colors.text,
      fontSize: 36,
      fontWeight: "900",
      marginBottom: 8,
    },
    subtitle: {
      color: colors.text2,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "700",
      marginBottom: 20,
    },
    heroCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 26,
      padding: 22,
      marginBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      ...v5Shadow(colors),
    },
    heroLabel: {
      color: colors.text2,
      fontSize: 13,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 5,
    },
    heroCount: {
      color: colors.gold,
      fontSize: 42,
      fontWeight: "900",
    },
    heroBell: {
      width: 68,
      height: 68,
      borderRadius: 24,
      backgroundColor:
        colors.mode === "dark" ? "rgba(212,175,55,0.16)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    heroBellText: {
      fontSize: 34,
    },
    markAllButton: {
      backgroundColor: colors.gold,
      borderRadius: 16,
      padding: 15,
      marginBottom: 18,
      alignItems: "center",
    },
    markAllText: {
      color: colors.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(colors),
    },
    sectionTitle: {
      color: colors.gold,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 14,
    },
    preferenceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 15,
      borderRadius: 18,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      marginBottom: 12,
    },
    preferenceTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 5,
    },
    preferenceText: {
      color: colors.text2,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
      marginBottom: 7,
    },
    preferenceStatus: {
      color: colors.muted2,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    preferenceStatusOn: {
      color: colors.success,
    },
    saveButton: {
      backgroundColor: colors.gold,
      borderRadius: 16,
      padding: 15,
      alignItems: "center",
      marginTop: 4,
    },
    saveText: {
      color: colors.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    disabledButton: {
      opacity: 0.55,
    },
    emptyBox: {
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 18,
      padding: 18,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 6,
    },
    emptyText: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
    },
    notificationCard: {
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
    },
    unreadCard: {
      borderColor: colors.gold,
      backgroundColor:
        colors.mode === "dark" ? "rgba(212,175,55,0.10)" : "#FFF8E8",
    },
    notificationTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 10,
    },
    notificationIcon: {
      fontSize: 28,
    },
    notificationTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 3,
    },
    notificationTime: {
      color: colors.muted2,
      fontSize: 12,
      fontWeight: "700",
    },
    unreadDot: {
      width: 13,
      height: 13,
      borderRadius: 7,
      backgroundColor: colors.gold,
    },
    notificationMessage: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
      marginBottom: 12,
    },
    notificationFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    notificationType: {
      color: colors.gold,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.8,
    },
    readStatus: {
      color: colors.muted2,
      fontSize: 12,
      fontWeight: "900",
    },
    unreadStatus: {
      color: colors.gold,
    },
  });
}