import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  BellRing,
  CarFront,
  CheckCheck,
  CreditCard,
  Gift,
  Megaphone,
  MessageCircle,
  Search,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

export default function PassengerNotificationsScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [passengerId, setPassengerId] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const [savingPrefs, setSavingPrefs] = useState(false);
  const [rideAlerts, setRideAlerts] = useState(true);
  const [familyAlerts, setFamilyAlerts] = useState(true);
  const [promoAlerts, setPromoAlerts] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!passengerId) return;

    const channel = supabase
      .channel(`passenger-notifications-live-${passengerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "passenger_notifications",
          filter: `passenger_id=eq.${passengerId}`,
        },
        () => {
          loadNotifications(false, passengerId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [passengerId]);

  async function loadPage() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/login" as any);
        return;
      }

      setPassengerId(user.id);

      await ensureWelcomeNotification(user.id);
      await loadPreferences(user.id);
      await loadNotifications(false, user.id);
    } catch (error: any) {
      Alert.alert(
        "Notification Error",
        error.message || "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }

  async function ensureWelcomeNotification(currentPassengerId: string) {
    const { count, error: countError } = await supabase
      .from("passenger_notifications")
      .select("id", { count: "exact", head: true })
      .eq("passenger_id", currentPassengerId)
      .eq("type", "welcome");

    if (countError) return;

    if ((count || 0) > 0) return;

    await supabase.from("passenger_notifications").insert({
      passenger_id: currentPassengerId,
      title: "Welcome to Angel Express",
      message:
        "Welcome to the Angel Express Passenger App. Ride updates, driver assignments, payment reminders, rewards, safety alerts, and owner announcements will appear here.",
      type: "welcome",
      priority: "normal",
      sent_by: "system",
      action_route: null,
    });
  }

  async function loadPreferences(currentPassengerId = passengerId) {
    if (!currentPassengerId) return;

    const { data, error } = await supabase
      .from("passenger_profiles")
      .select("ride_alerts_enabled,family_alerts_enabled,promo_alerts_enabled")
      .eq("user_id", currentPassengerId)
      .maybeSingle();

    if (error) return;

    if (data) {
      setRideAlerts(data.ride_alerts_enabled ?? true);
      setFamilyAlerts(data.family_alerts_enabled ?? true);
      setPromoAlerts(data.promo_alerts_enabled ?? false);
    }
  }

  async function loadNotifications(isRefresh = false, currentPassengerId = passengerId) {
    try {
      if (isRefresh) setRefreshing(true);

      if (!currentPassengerId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        currentPassengerId = user.id;
        setPassengerId(user.id);
      }

      const { data, error } = await supabase
        .from("passenger_notifications")
        .select("*")
        .eq("passenger_id", currentPassengerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (error: any) {
      Alert.alert(
        "Load Error",
        error.message || "Unable to load notifications."
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function savePreferences() {
    try {
      setSavingPrefs(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const { error } = await supabase
        .from("passenger_profiles")
        .upsert(
          {
            user_id: user.id,
            ride_alerts_enabled: rideAlerts,
            family_alerts_enabled: familyAlerts,
            promo_alerts_enabled: promoAlerts,
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      Alert.alert("Saved", "Your notification preferences were updated.");
    } catch (error: any) {
      Alert.alert(
        "Save Error",
        error.message || "Unable to save notification preferences."
      );
    } finally {
      setSavingPrefs(false);
    }
  }

  async function markAsRead(notification: any) {
    try {
      if (!notification?.id) return;

      if (!notification.is_read) {
        const { error } = await supabase
          .from("passenger_notifications")
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq("id", notification.id);

        if (error) throw error;

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  is_read: true,
                  read_at: new Date().toISOString(),
                }
              : item
          )
        );
      }

      const destination = resolveNotificationRoute(notification);

      if (destination) {
        router.push(destination as any);
      }
    } catch (error: any) {
      Alert.alert("Update Error", error.message || "Unable to mark as read.");
    }
  }

  async function markAllAsRead() {
    try {
      if (!passengerId) return;

      const { error } = await supabase
        .from("passenger_notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("passenger_id", passengerId)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at || new Date().toISOString(),
        }))
      );
    } catch (error: any) {
      Alert.alert("Update Error", error.message || "Unable to mark all as read.");
    }
  }

  function cleanType(value: any) {
    return String(value || "general").trim().toLowerCase();
  }

  function notificationCategory(notification: any) {
    const haystack = [
      notification?.type,
      notification?.title,
      notification?.message,
    ]
      .map(cleanType)
      .join(" ");

    if (
      haystack.includes("payment") ||
      haystack.includes("fare") ||
      haystack.includes("refund") ||
      haystack.includes("invoice")
    ) {
      return "payments";
    }

    if (
      haystack.includes("safety") ||
      haystack.includes("family") ||
      haystack.includes("emergency") ||
      haystack.includes("sos")
    ) {
      return "safety";
    }

    if (
      haystack.includes("support") ||
      haystack.includes("message") ||
      haystack.includes("reply")
    ) {
      return "support";
    }

    if (
      haystack.includes("trip") ||
      haystack.includes("ride") ||
      haystack.includes("driver") ||
      haystack.includes("booking")
    ) {
      return "trips";
    }

    return "general";
  }

  function resolveNotificationRoute(notification: any) {
    const explicitRoute = String(notification?.action_route || "").trim();
    if (
      explicitRoute &&
      explicitRoute !== "/dashboard" &&
      explicitRoute !== "/passenger-notifications"
    ) {
      return explicitRoute;
    }

    const type = cleanType(notification?.type);
    const bookingId = String(
      notification?.booking_id ||
        notification?.bookingId ||
        notification?.metadata?.booking_id ||
        ""
    );

    if (
      type.includes("driver") ||
      type.includes("trip") ||
      type.includes("ride_started") ||
      type.includes("arrived") ||
      type.includes("onboard")
    ) {
      return bookingId
        ? {
            pathname: "/live-trip" as any,
            params: {
              booking_id: bookingId,
              bookingId,
            },
          }
        : "/my-trips";
    }

    if (
      type.includes("change_approved") ||
      type.includes("change_rejected") ||
      type.includes("booking_change")
    ) {
      return bookingId
        ? {
            pathname: "/manage-booking" as any,
            params: {
              booking_id: bookingId,
              bookingId,
            },
          }
        : "/my-trips";
    }

    if (
      type.includes("payment") ||
      type.includes("fare") ||
      type.includes("invoice")
    ) {
      return bookingId
        ? {
            pathname: "/pay-ride" as any,
            params: {
              booking_id: bookingId,
              bookingId,
            },
          }
        : "/my-trips";
    }

    if (type.includes("support") || type.includes("reply")) {
      return bookingId
        ? {
            pathname: "/support" as any,
            params: {
              booking_id: bookingId,
            },
          }
        : "/support";
    }

    return null;
  }

  function priorityLabel(priority: any) {
    const value = cleanType(priority);
    if (["urgent", "critical", "high"].includes(value)) {
      return value === "critical" ? "Critical" : value === "urgent" ? "Urgent" : "High";
    }
    return "";
  }

  function notificationIcon(type: string) {
    const cleanType = String(type || "").toLowerCase();

    if (cleanType.includes("trip") || cleanType.includes("ride")) {
      return <CarFront size={22} color={colors.gold} />;
    }

    if (cleanType.includes("driver")) {
      return <BadgeCheck size={22} color={colors.gold} />;
    }

    if (cleanType.includes("payment")) {
      return <CreditCard size={22} color={colors.gold} />;
    }

    if (cleanType.includes("reward") || cleanType.includes("promo")) {
      return <Gift size={22} color={colors.gold} />;
    }

    if (cleanType.includes("safety") || cleanType.includes("family")) {
      return <ShieldCheck size={22} color={colors.gold} />;
    }

    if (cleanType.includes("announcement")) {
      return <Megaphone size={22} color={colors.gold} />;
    }

    if (cleanType.includes("welcome")) {
      return <Sparkles size={22} color={colors.gold} />;
    }

    return <Bell size={22} color={colors.gold} />;
  }

  function formatDate(value: string) {
    if (!value) return "Just now";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Just now";

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const filteredNotifications = notifications.filter((item) => {
    const matchesFilter =
      activeFilter === "all" ||
      notificationCategory(item) === activeFilter;

    const searchable = [
      item?.title,
      item?.message,
      item?.type,
      item?.priority,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");

    const matchesSearch =
      !searchText.trim() ||
      searchable.includes(searchText.trim().toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const filterCounts = {
    all: notifications.length,
    trips: notifications.filter(
      (item) => notificationCategory(item) === "trips"
    ).length,
    payments: notifications.filter(
      (item) => notificationCategory(item) === "payments"
    ).length,
    safety: notifications.filter(
      (item) => notificationCategory(item) === "safety"
    ).length,
    support: notifications.filter(
      (item) => notificationCategory(item) === "support"
    ).length,
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Loading updates...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/dashboard-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              tintColor={colors.gold}
            />
          }
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

          <Text style={styles.kicker}>PASSENGER UPDATE CENTER</Text>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            Ride updates, driver assignment alerts, safety updates, rewards,
            payment reminders, and Angel Express announcements appear here.
          </Text>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <BellRing size={31} color={colors.onGold || colors.navy} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>
                {unreadCount > 0
                  ? `${unreadCount} Unread Update${unreadCount === 1 ? "" : "s"}`
                  : "All Caught Up"}
              </Text>
              <Text style={styles.heroText}>
                Stay connected to your Angel Express ride experience.
              </Text>
            </View>
          </View>

          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickButton} onPress={() => loadNotifications(true)}>
              <RefreshCcw size={18} color={colors.gold} />
              <Text style={styles.quickText}>Refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickButton} onPress={markAllAsRead}>
              <CheckCheck size={18} color={colors.gold} />
              <Text style={styles.quickText}>Mark All Read</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchCard}>
            <Search size={19} color={colors.gold} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search notifications"
              placeholderTextColor={colors.placeholder || colors.muted}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <View style={styles.filterHeader}>
            <SlidersHorizontal size={18} color={colors.gold} />
            <Text style={styles.filterHeaderText}>Filter Updates</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {[
              ["all", "All"],
              ["trips", "Trips"],
              ["payments", "Payments"],
              ["safety", "Safety"],
              ["support", "Support"],
            ].map(([key, label]) => {
              const active = activeFilter === key;
              const count = filterCounts[key as keyof typeof filterCounts];

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.filterPill,
                    active && styles.filterPillActive,
                  ]}
                  onPress={() => setActiveFilter(key)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      active && styles.filterPillTextActive,
                    ]}
                  >
                    {label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.prefCard}>
            <PreferenceRow
              icon={<CarFront size={21} color={colors.gold} />}
              title="Ride Alerts"
              text="Driver assigned, ride confirmed, arriving, started, completed, and payment reminders."
              value={rideAlerts}
              onValueChange={setRideAlerts}
              styles={styles}
              colors={colors}
            />

            <PreferenceRow
              icon={<ShieldCheck size={21} color={colors.gold} />}
              title="Family & Safety Alerts"
              text="Family Check-In+, Safety Share, trip status, and important safety messages."
              value={familyAlerts}
              onValueChange={setFamilyAlerts}
              styles={styles}
              colors={colors}
            />

            <PreferenceRow
              icon={<Gift size={21} color={colors.gold} />}
              title="Rewards & Promotions"
              text="Rewards, referral updates, student deals, event transportation, and offers."
              value={promoAlerts}
              onValueChange={setPromoAlerts}
              styles={styles}
              colors={colors}
            />

            <TouchableOpacity
              style={[styles.savePrefsButton, savingPrefs && styles.disabledButton]}
              onPress={savePreferences}
              disabled={savingPrefs}
            >
              {savingPrefs ? (
                <ActivityIndicator color={colors.onGold || colors.navy} />
              ) : (
                <Text style={styles.savePrefsText}>Save Preferences</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Recent Updates</Text>

          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Star size={31} color={colors.gold} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>
                {notifications.length === 0
                  ? "Your ride updates, payment reminders, rewards, and Angel Express announcements will appear here."
                  : "No notifications match the selected filter or search."}
              </Text>
            </View>
          ) : (
            filteredNotifications.map((notification) => {
              const unread = !notification.is_read;

              return (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    unread && styles.notificationCardUnread,
                  ]}
                  onPress={() => markAsRead(notification)}
                  activeOpacity={0.85}
                >
                  <View style={styles.notificationIcon}>
                    {notificationIcon(notification.type)}
                  </View>

                  <View style={styles.notificationBody}>
                    <View style={styles.notificationTopRow}>
                      <Text style={styles.notificationTitle}>
                        {notification.title}
                      </Text>

                      {unread ? <View style={styles.unreadDot} /> : null}
                    </View>

                    <Text style={styles.notificationMessage}>
                      {notification.message}
                    </Text>

                    {priorityLabel(notification.priority) ? (
                      <View
                        style={[
                          styles.priorityBadge,
                          cleanType(notification.priority) === "critical" ||
                          cleanType(notification.priority) === "urgent"
                            ? styles.priorityBadgeCritical
                            : styles.priorityBadgeHigh,
                        ]}
                      >
                        <Text style={styles.priorityBadgeText}>
                          {priorityLabel(notification.priority)}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.notificationMetaRow}>
                      <Text style={styles.notificationType}>
                        {String(notification.type || "general").replace(/_/g, " ")}
                      </Text>

                      <Text style={styles.notificationDate}>
                        {formatDate(notification.created_at)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

function PreferenceRow({
  icon,
  title,
  text,
  value,
  onValueChange,
  styles,
  colors,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  styles: any;
  colors: any;
}) {
  return (
    <View style={styles.prefRow}>
      <View style={styles.prefIcon}>{icon}</View>

      <View style={styles.prefCopy}>
        <Text style={styles.prefTitle}>{title}</Text>
        <Text style={styles.prefText}>{text}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.borderSoft || colors.lightBorder, true: colors.gold }}
        thumbColor={value ? "#FFFFFF" : "#CBD5E1"}
      />
    </View>
  );
}

function createStyles(c: any) {
  return StyleSheet.create({
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
    center: {
      flex: 1,
      backgroundColor: c.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      color: c.text,
      marginTop: 12,
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
      marginBottom: 8,
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
      marginBottom: 22,
      fontWeight: "700",
    },
    heroCard: {
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 17,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: {
      color: c.onGold || c.navy,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 4,
    },
    heroText: {
      color: c.onGold || c.navy,
      fontSize: 14,
      fontWeight: "800",
      lineHeight: 20,
      opacity: 0.82,
    },
    quickRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 22,
    },
    quickButton: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    quickText: {
      color: c.gold,
      fontWeight: "900",
      fontSize: 13,
    },
    searchCard: {
      minHeight: 54,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      borderRadius: 16,
      paddingHorizontal: 15,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      color: c.text,
      fontSize: 15,
      fontWeight: "700",
      paddingVertical: 12,
    },
    filterHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
    },
    filterHeaderText: {
      color: c.text,
      fontSize: 15,
      fontWeight: "900",
    },
    filterRow: {
      gap: 8,
      paddingBottom: 6,
      paddingRight: 8,
    },
    filterPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },
    filterPillActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    filterPillText: {
      color: c.gold,
      fontSize: 12.5,
      fontWeight: "900",
    },
    filterPillTextActive: {
      color: c.onGold || c.navy,
    },
    sectionTitle: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 13,
      marginTop: 8,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    prefCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      padding: 16,
      marginBottom: 22,
      ...v5Shadow(c),
    },
    prefRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft || c.lightBorder,
    },
    prefIcon: {
      width: 42,
      height: 42,
      borderRadius: 15,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    prefCopy: {
      flex: 1,
    },
    prefTitle: {
      color: c.text,
      fontSize: 15.5,
      fontWeight: "900",
      marginBottom: 4,
    },
    prefText: {
      color: c.text2 || c.textSecondary,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
    },
    savePrefsButton: {
      backgroundColor: c.gold,
      borderRadius: 15,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 16,
    },
    savePrefsText: {
      color: c.onGold || c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    disabledButton: {
      opacity: 0.65,
    },
    emptyCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      padding: 24,
      alignItems: "center",
      ...v5Shadow(c),
    },
    emptyTitle: {
      color: c.text,
      fontSize: 21,
      fontWeight: "900",
      marginTop: 12,
      marginBottom: 7,
      textAlign: "center",
    },
    emptyText: {
      color: c.text2 || c.textSecondary,
      fontSize: 14.5,
      lineHeight: 22,
      textAlign: "center",
      fontWeight: "700",
    },
    notificationCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      borderRadius: 22,
      padding: 16,
      marginBottom: 13,
      flexDirection: "row",
      gap: 13,
      ...v5Shadow(c),
    },
    notificationCardUnread: {
      borderColor: c.border,
      backgroundColor: c.mode === "dark" ? "rgba(212,175,55,0.10)" : "#FFF8E8",
    },
    notificationIcon: {
      width: 48,
      height: 48,
      borderRadius: 17,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    notificationBody: {
      flex: 1,
    },
    notificationTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
    },
    notificationTitle: {
      color: c.text,
      fontSize: 16.5,
      fontWeight: "900",
      flex: 1,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.danger,
    },
    notificationMessage: {
      color: c.text2 || c.textSecondary,
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: "700",
      marginBottom: 10,
    },
    priorityBadge: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
      marginBottom: 9,
      borderWidth: 1,
    },
    priorityBadgeCritical: {
      backgroundColor: "rgba(220,38,38,0.12)",
      borderColor: "rgba(220,38,38,0.45)",
    },
    priorityBadgeHigh: {
      backgroundColor: "rgba(245,158,11,0.12)",
      borderColor: "rgba(245,158,11,0.45)",
    },
    priorityBadgeText: {
      color: c.text,
      fontSize: 10.5,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    notificationMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    notificationType: {
      color: c.gold,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    notificationDate: {
      color: c.muted,
      fontSize: 11.5,
      fontWeight: "800",
    },
  });
}