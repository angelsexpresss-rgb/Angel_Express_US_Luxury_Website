import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { useOwnerTheme } from "../lib/ownerTheme";
import { supabase } from "../lib/supabase";

type GenericRecord = Record<string, any>;

type NotificationRecord = GenericRecord & {
  id: string | number;
  created_at?: string | null;
  title?: string | null;
  message?: string | null;
  type?: string | null;
  priority?: string | null;
  is_read?: boolean | null;
  read_at?: string | null;
  sent_by?: string | null;
  driver_id?: string | null;
  passenger_id?: string | null;
  booking_id?: string | number | null;
  source_table?: "driver_notifications" | "passenger_notifications";
};

type NotificationFilter =
  | "all"
  | "unread"
  | "drivers"
  | "passengers"
  | "urgent"
  | "payments"
  | "safety"
  | "support"
  | "student";

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function isUnread(item: NotificationRecord) {
  return item.is_read === false || item.read_at == null;
}

function isUrgent(item: NotificationRecord) {
  return ["urgent", "critical", "high"].includes(
    normalize(item.priority)
  );
}

export default function OwnerNotificationsScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] =
    useState<string | number | null>(null);

  const [notifications, setNotifications] =
    useState<NotificationRecord[]>([]);
  const [filter, setFilter] =
    useState<NotificationFilter>("all");

  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  useEffect(() => {
    const channel = supabase
      .channel("owner-notifications-v5")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_notifications",
        },
        () => loadNotifications(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "passenger_notifications",
        },
        () => loadNotifications(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function safeRows(table: string) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.log(`${table} skipped:`, error.message);
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  }

  async function loadNotifications(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const [driverRows, passengerRows] = await Promise.all([
        safeRows("driver_notifications"),
        safeRows("passenger_notifications"),
      ]);

      const driverNotifications: NotificationRecord[] =
        driverRows.map((item: GenericRecord) => ({
          ...(item as NotificationRecord),
          id: item.id,
          source_table: "driver_notifications",
        }));

      const passengerNotifications: NotificationRecord[] =
        passengerRows.map((item: GenericRecord) => ({
          ...(item as NotificationRecord),
          id: item.id,
          source_table: "passenger_notifications",
        }));

      const merged: NotificationRecord[] = [
        ...driverNotifications,
        ...passengerNotifications,
      ].sort((a, b) => {
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      });

      setNotifications(merged);
    } catch (error: any) {
      Alert.alert(
        "Notifications Error",
        error?.message || "Unable to load notifications."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function markRead(item: NotificationRecord) {
    if (!item.source_table) return;

    try {
      setUpdatingId(item.id);

      const { error } = await supabase
        .from(item.source_table)
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;

      setNotifications((current) =>
        current.map((row) =>
          row.id === item.id &&
          row.source_table === item.source_table
            ? {
                ...row,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : row
        )
      );
    } catch (error: any) {
      Alert.alert(
        "Update Failed",
        error?.message || "Unable to update notification."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function markAllRead() {
    try {
      const unreadDriverIds = notifications
        .filter(
          (item) =>
            item.source_table === "driver_notifications" &&
            isUnread(item)
        )
        .map((item) => item.id);

      const unreadPassengerIds = notifications
        .filter(
          (item) =>
            item.source_table === "passenger_notifications" &&
            isUnread(item)
        )
        .map((item) => item.id);

      const now = new Date().toISOString();

      const operations = [];

      if (unreadDriverIds.length > 0) {
        operations.push(
          supabase
            .from("driver_notifications")
            .update({
              is_read: true,
              read_at: now,
            })
            .in("id", unreadDriverIds)
        );
      }

      if (unreadPassengerIds.length > 0) {
        operations.push(
          supabase
            .from("passenger_notifications")
            .update({
              is_read: true,
              read_at: now,
            })
            .in("id", unreadPassengerIds)
        );
      }

      await Promise.all(operations);

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at: now,
        }))
      );

      Alert.alert(
        "Notifications Updated",
        "All notifications were marked as read."
      );
    } catch (error: any) {
      Alert.alert(
        "Update Failed",
        error?.message || "Unable to mark all notifications as read."
      );
    }
  }

  const counts = useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter(isUnread).length,
      drivers: notifications.filter(
        (item) => item.source_table === "driver_notifications"
      ).length,
      passengers: notifications.filter(
        (item) => item.source_table === "passenger_notifications"
      ).length,
      urgent: notifications.filter(isUrgent).length,
      payments: notifications.filter((item) =>
        normalize(`${item.type} ${item.title}`).includes("payment")
      ).length,
      safety: notifications.filter((item) =>
        normalize(`${item.type} ${item.title}`).includes("safety")
      ).length,
      support: notifications.filter((item) =>
        normalize(`${item.type} ${item.title}`).includes("support")
      ).length,
      student: notifications.filter((item) =>
        normalize(`${item.type} ${item.title}`).includes("student")
      ).length,
    };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      switch (filter) {
        case "unread":
          return isUnread(item);
        case "drivers":
          return item.source_table === "driver_notifications";
        case "passengers":
          return item.source_table === "passenger_notifications";
        case "urgent":
          return isUrgent(item);
        case "payments":
          return normalize(`${item.type} ${item.title}`).includes(
            "payment"
          );
        case "safety":
          return normalize(`${item.type} ${item.title}`).includes(
            "safety"
          );
        case "support":
          return normalize(`${item.type} ${item.title}`).includes(
            "support"
          );
        case "student":
          return normalize(`${item.type} ${item.title}`).includes(
            "student"
          );
        case "all":
        default:
          return true;
      }
    });
  }, [notifications, filter]);

  function notificationColor(item: NotificationRecord) {
    if (isUrgent(item)) {
      return {
        color: theme.colors.danger,
        background: theme.colors.dangerSoft,
        icon: "warning-outline" as const,
      };
    }

    const type = normalize(`${item.type} ${item.title}`);

    if (type.includes("payment")) {
      return {
        color: theme.colors.success,
        background: theme.colors.successSoft,
        icon: "card-outline" as const,
      };
    }

    if (type.includes("student")) {
      return {
        color: theme.colors.info,
        background: theme.colors.infoSoft,
        icon: "school-outline" as const,
      };
    }

    if (type.includes("support")) {
      return {
        color: theme.colors.warning,
        background: theme.colors.warningSoft,
        icon: "headset-outline" as const,
      };
    }

    return {
      color: theme.colors.gold,
      background: theme.colors.goldTransparent,
      icon: "notifications-outline" as const,
    };
  }

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={theme.colors.gold}
        />
        <Text
          style={[
            styles.loadingText,
            { color: theme.colors.textSecondary },
          ]}
        >
          Loading Owner Notifications...
        </Text>
      </View>
    );
  }

  const filters: {
    key: NotificationFilter;
    label: string;
    count: number;
  }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "unread", label: "Unread", count: counts.unread },
    { key: "drivers", label: "Drivers", count: counts.drivers },
    {
      key: "passengers",
      label: "Passengers",
      count: counts.passengers,
    },
    { key: "urgent", label: "Urgent", count: counts.urgent },
    { key: "payments", label: "Payments", count: counts.payments },
    { key: "safety", label: "Safety", count: counts.safety },
    { key: "support", label: "Support", count: counts.support },
    { key: "student", label: "Students", count: counts.student },
  ];

  return (
    <ImageBackground
      source={require("../assets/images/owner-bg.png")}
      style={[
        styles.background,
        { backgroundColor: theme.colors.background },
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.container,
            { maxWidth: isLarge ? 1350 : 1100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadNotifications(false);
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
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
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
                ANGEL EXPRESS OWNER ALERTS
              </Text>

              <Text
                style={[
                  styles.pageTitle,
                  { color: theme.colors.text },
                ]}
              >
                Notifications Center
              </Text>

              <Text
                style={[
                  styles.pageSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Review driver, passenger, payment, safety, support,
                student, and urgent operational notifications.
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            {[
              [
                "Unread",
                counts.unread,
                "mail-unread-outline",
                theme.colors.warning,
                theme.colors.warningSoft,
              ],
              [
                "Urgent",
                counts.urgent,
                "warning-outline",
                theme.colors.danger,
                theme.colors.dangerSoft,
              ],
              [
                "Driver Alerts",
                counts.drivers,
                "car-outline",
                theme.colors.gold,
                theme.colors.goldTransparent,
              ],
              [
                "Passenger Alerts",
                counts.passengers,
                "people-outline",
                theme.colors.info,
                theme.colors.infoSoft,
              ],
            ].map(([label, value, icon, color, background]) => (
              <View
                key={String(label)}
                style={[
                  styles.statCard,
                  {
                    width: isLarge ? "23.5%" : "48%",
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.cardBorder,
                  },
                  theme.shadows.soft,
                ]}
              >
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: String(background) },
                  ]}
                >
                  <Ionicons
                    name={icon as any}
                    size={20}
                    color={String(color)}
                  />
                </View>
                <Text
                  style={[
                    styles.statValue,
                    { color: theme.colors.text },
                  ]}
                >
                  {value}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.markAllButton,
                {
                  backgroundColor: theme.colors.gold,
                },
              ]}
              onPress={markAllRead}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={19}
                color={theme.colors.textInverse}
              />
              <Text
                style={[
                  styles.markAllText,
                  { color: theme.colors.textInverse },
                ]}
              >
                Mark All Read
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.refreshButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
              onPress={() => loadNotifications(false)}
            >
              <Ionicons
                name="refresh"
                size={18}
                color={theme.colors.gold}
              />
              <Text
                style={[
                  styles.refreshText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Refresh
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.filterPanel,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorderStrong,
              },
              theme.shadows.soft,
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {filters.map((item) => {
                const selected = filter === item.key;

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selected
                          ? theme.colors.goldTransparent
                          : theme.colors.surfaceSoft,
                        borderColor: selected
                          ? theme.colors.gold
                          : theme.colors.cardBorder,
                      },
                    ]}
                    onPress={() => setFilter(item.key)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        {
                          color: selected
                            ? theme.colors.gold
                            : theme.colors.textMuted,
                        },
                      ]}
                    >
                      {item.label} ({item.count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {filteredNotifications.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Ionicons
                name="notifications-off-outline"
                size={38}
                color={theme.colors.gold}
              />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.text },
                ]}
              >
                No matching notifications
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textMuted },
                ]}
              >
                Operational alerts will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.notificationList}>
              {filteredNotifications.map((item) => {
                const visual = notificationColor(item);
                const unread = isUnread(item);

                return (
                  <View
                    key={`${item.source_table}-${item.id}`}
                    style={[
                      styles.notificationCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: unread
                          ? visual.color
                          : theme.colors.cardBorder,
                      },
                      unread ? theme.shadows.soft : undefined,
                    ]}
                  >
                    <View
                      style={[
                        styles.notificationIcon,
                        { backgroundColor: visual.background },
                      ]}
                    >
                      <Ionicons
                        name={visual.icon}
                        size={22}
                        color={visual.color}
                      />
                    </View>

                    <View style={styles.notificationBody}>
                      <View style={styles.notificationHeader}>
                        <Text
                          style={[
                            styles.notificationTitle,
                            { color: theme.colors.text },
                          ]}
                        >
                          {item.title || "Owner Notification"}
                        </Text>

                        {unread ? (
                          <View
                            style={[
                              styles.unreadDot,
                              { backgroundColor: visual.color },
                            ]}
                          />
                        ) : null}
                      </View>

                      <Text
                        style={[
                          styles.notificationMessage,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {item.message || "No message provided."}
                      </Text>

                      <View style={styles.notificationMeta}>
                        <Text
                          style={[
                            styles.metaText,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {item.source_table ===
                          "driver_notifications"
                            ? "Driver"
                            : "Passenger"}{" "}
                          • {item.type || "general"} •{" "}
                          {item.created_at
                            ? new Date(
                                item.created_at
                              ).toLocaleString()
                            : "Unknown time"}
                        </Text>

                        {unread ? (
                          <TouchableOpacity
                            style={[
                              styles.readButton,
                              {
                                backgroundColor:
                                  theme.colors.goldTransparent,
                                borderColor: theme.colors.gold,
                              },
                            ]}
                            disabled={updatingId === item.id}
                            onPress={() => markRead(item)}
                          >
                            {updatingId === item.id ? (
                              <ActivityIndicator
                                size="small"
                                color={theme.colors.gold}
                              />
                            ) : (
                              <>
                                <Ionicons
                                  name="checkmark-outline"
                                  size={16}
                                  color={theme.colors.gold}
                                />
                                <Text
                                  style={[
                                    styles.readButtonText,
                                    { color: theme.colors.gold },
                                  ]}
                                >
                                  Mark Read
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1 },
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
    paddingBottom: 60,
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
  titleArea: { flex: 1 },
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
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  statCard: {
    minHeight: 126,
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
  },
  statIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  statValue: {
    fontSize: 27,
    fontWeight: "900",
  },
  statLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  markAllButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    paddingHorizontal: 16,
  },
  markAllText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "900",
  },
  refreshButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
  },
  refreshText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "800",
  },
  filterPanel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 13,
    marginBottom: 20,
  },
  filterRow: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  notificationList: {
    gap: 12,
  },
  notificationCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
  },
  notificationIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notificationBody: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginLeft: 8,
  },
  notificationMessage: {
    marginTop: 6,
    fontSize: 11.5,
    lineHeight: 18,
    fontWeight: "600",
  },
  notificationMeta: {
    marginTop: 11,
  },
  metaText: {
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: "600",
  },
  readButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    marginTop: 9,
  },
  readButtonText: {
    marginLeft: 5,
    fontSize: 9.5,
    fontWeight: "900",
  },
  emptyState: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    padding: 30,
  },
  emptyTitle: {
    marginTop: 13,
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    textAlign: "center",
  },
});
