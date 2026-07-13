import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import {
  getOwnerBookingStatusStyle,
  useOwnerTheme,
} from "../lib/ownerTheme";
import { supabase } from "../lib/supabase";

type BookingRecord = {
  id: string | number;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  payment_status?: string | null;
  paid?: boolean | null;
  name?: string | null;
  passenger_name?: string | null;
  pickup?: string | null;
  pickup_address?: string | null;
  dropoff?: string | null;
  dropoff_address?: string | null;
  assigned_driver_name?: string | null;
  driver_name?: string | null;
  driver_id?: string | null;
  assigned_driver_id?: string | null;
  total?: number | string | null;
  total_price?: number | string | null;
  total_fare?: number | string | null;
  price?: number | string | null;
  source?: string | null;
  student_verified?: boolean | null;
  is_student?: boolean | null;
  student_discount?: number | string | null;
  date?: string | null;
  time?: string | null;
  user_id?: string | null;
  passenger_id?: string | null;
  email?: string | null;
  [key: string]: any;
};

type DriverRecord = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  status?: string | null;
  is_online?: boolean | null;
  rating?: number | string | null;
  current_trip_id?: string | number | null;
  [key: string]: any;
};

type Tone = "gold" | "success" | "warning" | "danger" | "info";

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  time: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
};

type DropdownKey =
  | "live"
  | "finance"
  | "people"
  | "safety"
  | "admin"
  | "activity";

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function bookingAmount(booking: BookingRecord) {
  return Number(
    booking.total_fare ??
      booking.total ??
      booking.total_price ??
      booking.price ??
      0
  );
}

function isSameDay(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  return date.toDateString() === new Date().toDateString();
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function activityTime(value?: string | null) {
  if (!value) return "Recently";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Recently";

  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function OwnerDashboardScreen() {
  const { theme, isDark, toggleTheme } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const [ownerName, setOwnerName] = useState("Owner");
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);

  const [openSections, setOpenSections] = useState<
    Record<DropdownKey, boolean>
  >({
    live: true,
    finance: false,
    people: false,
    safety: false,
    admin: false,
    activity: false,
  });

  const isTablet = width >= 700;
  const isLarge = width >= 1000;

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const bookingsChannel = supabase
      .channel("owner-dashboard-v6-bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => loadDashboard(false)
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    const driversChannel = supabase
      .channel("owner-dashboard-v6-drivers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drivers",
        },
        () => loadDashboard(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(driversChannel);
    };
  }, []);

  async function loadDashboard(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/owner-login");
        return;
      }

      const [ownerResponse, bookingsResponse, driversResponse] =
        await Promise.all([
          supabase
            .from("owners")
            .select("*")
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("bookings")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase
            .from("drivers")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

      if (ownerResponse.error) throw ownerResponse.error;

      if (!ownerResponse.data) {
        await supabase.auth.signOut();

        Alert.alert(
          "Owner Access Required",
          "This account is not registered as an Angel Express owner."
        );

        router.replace("/owner-login");
        return;
      }

      if (normalize(ownerResponse.data.status) !== "active") {
        await supabase.auth.signOut();

        Alert.alert(
          "Owner Account Inactive",
          "This owner account is not currently active."
        );

        router.replace("/owner-login");
        return;
      }

      if (bookingsResponse.error) throw bookingsResponse.error;
      if (driversResponse.error) throw driversResponse.error;

      const resolvedName =
        ownerResponse.data.first_name ||
        ownerResponse.data.full_name ||
        user.user_metadata?.full_name ||
        "Owner";

      setOwnerName(resolvedName);
      setBookings(bookingsResponse.data || []);
      setDrivers(driversResponse.data || []);
    } catch (error: any) {
      Alert.alert(
        "Dashboard Error",
        error?.message || "Unable to load the Owner Command Center."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshDashboard() {
    setRefreshing(true);
    await loadDashboard(false);
  }

  function handleLogout() {
    Alert.alert(
      "Log Out",
      "Are you sure you want to leave the Owner Command Center?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace("/owner-login");
          },
        },
      ]
    );
  }

  function toggleSection(key: DropdownKey) {
    setOpenSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  const dashboard = useMemo(() => {
    const activeStatuses = new Set([
      "inprogress",
      "driverassigned",
      "assigned",
      "driveraccepted",
      "accepted",
      "pickedup",
      "arrivedatpickup",
      "arriving",
      "active",
      "started",
    ]);

    const upcomingStatuses = new Set([
      "pending",
      "pendingconfirmation",
      "confirmed",
      "scheduled",
    ]);

    const completed = bookings.filter(
      (booking) => normalize(booking.status) === "completed"
    );

    const cancelled = bookings.filter((booking) =>
      ["cancelled", "canceled"].includes(normalize(booking.status))
    );

    const active = bookings.filter((booking) =>
      activeStatuses.has(normalize(booking.status))
    );

    const upcoming = bookings.filter((booking) =>
      upcomingStatuses.has(normalize(booking.status))
    );

    const unassigned = bookings.filter((booking) => {
      const status = normalize(booking.status);

      const hasDriver = Boolean(
        booking.driver_id ||
          booking.assigned_driver_id ||
          booking.driver_name ||
          booking.assigned_driver_name
      );

      return upcomingStatuses.has(status) && !hasDriver;
    });

    const unpaid = bookings.filter((booking) => {
      const status = normalize(booking.payment_status);

      return (
        status === "unpaid" ||
        status === "pending" ||
        booking.paid === false
      );
    });

    const todayTrips = bookings.filter((booking) => {
      if (booking.date) {
        const date = new Date(booking.date);

        if (!Number.isNaN(date.getTime())) {
          return date.toDateString() === new Date().toDateString();
        }
      }

      return isSameDay(booking.created_at);
    });

    const todayCompleted = completed.filter((booking) =>
      isSameDay(
        booking.completed_at ||
          booking.updated_at ||
          booking.created_at
      )
    );

    const todayRevenue = todayCompleted.reduce(
      (sum, booking) => sum + bookingAmount(booking),
      0
    );

    const allRevenue = completed.reduce(
      (sum, booking) => sum + bookingAmount(booking),
      0
    );

    const onlineDrivers = drivers.filter(
      (driver) => driver.is_online === true
    );

    const approvedDrivers = drivers.filter(
      (driver) => normalize(driver.status) === "approved"
    );

    const pendingDrivers = drivers.filter((driver) =>
      ["pending", "pendingapproval", "underreview"].includes(
        normalize(driver.status)
      )
    );

    const suspendedDrivers = drivers.filter(
      (driver) => normalize(driver.status) === "suspended"
    );

    const studentTrips = bookings.filter(
      (booking) =>
        booking.student_verified === true ||
        booking.is_student === true ||
        Number(booking.student_discount || 0) > 0
    );

    const activePassengers = new Set(
      active.map(
        (booking) =>
          booking.user_id ||
          booking.passenger_id ||
          booking.email ||
          booking.passenger_name ||
          booking.name ||
          booking.id
      )
    ).size;

    return {
      completed,
      cancelled,
      active,
      upcoming,
      unassigned,
      unpaid,
      todayTrips,
      todayCompleted,
      todayRevenue,
      allRevenue,
      companyShareToday: todayRevenue * 0.3,
      driverShareToday: todayRevenue * 0.7,
      onlineDrivers,
      approvedDrivers,
      pendingDrivers,
      suspendedDrivers,
      studentTrips,
      activePassengers,
    };
  }, [bookings, drivers]);

  const activities = useMemo<ActivityItem[]>(() => {
    const bookingActivities: ActivityItem[] = bookings
      .slice(0, 10)
      .map((booking) => {
        const status = normalize(booking.status);
        const passenger =
          booking.passenger_name || booking.name || "Passenger";

        if (status === "completed") {
          return {
            id: `completed-${booking.id}`,
            title: "Trip completed",
            description: `${passenger}'s ride was completed for ${formatMoney(
              bookingAmount(booking)
            )}.`,
            time:
              booking.completed_at ||
              booking.updated_at ||
              booking.created_at ||
              null,
            icon: "checkmark-done-outline",
            tone: "success",
          };
        }

        if (["cancelled", "canceled"].includes(status)) {
          return {
            id: `cancelled-${booking.id}`,
            title: "Booking cancelled",
            description: `${passenger}'s booking was cancelled.`,
            time:
              booking.updated_at ||
              booking.created_at ||
              null,
            icon: "close-circle-outline",
            tone: "danger",
          };
        }

        if (
          ["driverassigned", "assigned", "driveraccepted", "accepted"].includes(
            status
          )
        ) {
          return {
            id: `assigned-${booking.id}`,
            title: "Driver assignment updated",
            description: `${passenger}'s ride has an assigned driver.`,
            time:
              booking.updated_at ||
              booking.created_at ||
              null,
            icon: "person-add-outline",
            tone: "info",
          };
        }

        if (
          ["inprogress", "pickedup", "started", "active"].includes(status)
        ) {
          return {
            id: `active-${booking.id}`,
            title: "Trip in progress",
            description: `${passenger} is currently riding.`,
            time:
              booking.updated_at ||
              booking.created_at ||
              null,
            icon: "navigate-outline",
            tone: "success",
          };
        }

        return {
          id: `booking-${booking.id}`,
          title: "Booking received",
          description: `${passenger} submitted a ${
            booking.source || "new"
          } booking.`,
          time: booking.created_at || null,
          icon: "calendar-outline",
          tone: "warning",
        };
      });

    const driverActivities: ActivityItem[] = drivers
      .slice(0, 6)
      .map((driver) => {
        const name =
          `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
          driver.full_name ||
          driver.name ||
          "Driver";

        if (driver.is_online) {
          return {
            id: `driver-online-${driver.id}`,
            title: "Driver online",
            description: `${name} is available for assignments.`,
            time:
              driver.updated_at ||
              driver.created_at ||
              null,
            icon: "radio-outline",
            tone: "success",
          };
        }

        return {
          id: `driver-${driver.id}`,
          title: "Driver status",
          description: `${name} is ${driver.status || "registered"}.`,
          time:
            driver.updated_at ||
            driver.created_at ||
            null,
          icon: "car-outline",
          tone:
            normalize(driver.status) === "suspended"
              ? "danger"
              : "info",
        };
      });

    return [...bookingActivities, ...driverActivities]
      .sort((a, b) => {
        const aTime = a.time ? new Date(a.time).getTime() : 0;
        const bTime = b.time ? new Date(b.time).getTime() : 0;

        return bTime - aTime;
      })
      .slice(0, 10);
  }, [bookings, drivers]);

  function toneColors(tone: Tone) {
    if (tone === "success") {
      return {
        foreground: theme.colors.success,
        background: theme.colors.successSoft,
      };
    }

    if (tone === "warning") {
      return {
        foreground: theme.colors.warning,
        background: theme.colors.warningSoft,
      };
    }

    if (tone === "danger") {
      return {
        foreground: theme.colors.danger,
        background: theme.colors.dangerSoft,
      };
    }

    if (tone === "info") {
      return {
        foreground: theme.colors.info,
        background: theme.colors.infoSoft,
      };
    }

    return {
      foreground: theme.colors.gold,
      background: theme.colors.goldTransparent,
    };
  }

  function statWidth() {
    if (isLarge) return "23.5%";
    if (isTablet) return "31.8%";
    return "48%";
  }

  function actionWidth() {
    if (isLarge) return "31.8%";
    if (isTablet) return "48.5%";
    return "100%";
  }

  function StatCard({
    title,
    value,
    subtitle,
    icon,
    tone = "gold",
    onPress,
  }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    tone?: Tone;
    onPress: () => void;
  }) {
    const colors = toneColors(tone);

    return (
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={onPress}
        style={[
          styles.statCard,
          {
            width: statWidth(),
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.cardBorder,
          },
          theme.shadows.soft,
        ]}
      >
        <View style={styles.statTop}>
          <View
            style={[
              styles.statIcon,
              {
                backgroundColor: colors.background,
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={21}
              color={colors.foreground}
            />
          </View>

          <Ionicons
            name="chevron-forward"
            size={17}
            color={theme.colors.textMuted}
          />
        </View>

        <Text
          style={[
            styles.statValue,
            {
              color: theme.colors.text,
              fontSize:
                typeof value === "string" && value.length > 8
                  ? 22
                  : 29,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>

        <Text
          style={[
            styles.statTitle,
            {
              color: theme.colors.textSecondary,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.statSubtitle,
            {
              color: theme.colors.textMuted,
            },
          ]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </TouchableOpacity>
    );
  }

  function ActionCard({
    title,
    description,
    icon,
    route,
    danger = false,
  }: {
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: string;
    danger?: boolean;
  }) {
    return (
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => router.push(route as any)}
        style={[
          styles.actionCard,
          {
            width: actionWidth(),
            backgroundColor: danger
              ? theme.colors.dangerSoft
              : theme.colors.card,
            borderColor: danger
              ? theme.colors.danger
              : theme.colors.cardBorder,
          },
          theme.shadows.soft,
        ]}
      >
        <View
          style={[
            styles.actionIcon,
            {
              backgroundColor: danger
                ? theme.colors.dangerSoft
                : theme.colors.goldTransparent,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={23}
            color={
              danger
                ? theme.colors.danger
                : theme.colors.gold
            }
          />
        </View>

        <View style={styles.actionTextArea}>
          <Text
            style={[
              styles.actionTitle,
              {
                color: theme.colors.text,
              },
            ]}
          >
            {title}
          </Text>

          <Text
            style={[
              styles.actionDescription,
              {
                color: theme.colors.textMuted,
              },
            ]}
            numberOfLines={2}
          >
            {description}
          </Text>
        </View>

        <Ionicons
          name="arrow-forward"
          size={19}
          color={
            danger
              ? theme.colors.danger
              : theme.colors.gold
          }
        />
      </TouchableOpacity>
    );
  }

  function DropdownSection({
    sectionKey,
    eyebrow,
    title,
    subtitle,
    icon,
    badge,
    danger = false,
    children,
  }: {
    sectionKey: DropdownKey;
    eyebrow: string;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    badge?: string | number;
    danger?: boolean;
    children: React.ReactNode;
  }) {
    const open = openSections[sectionKey];

    return (
      <View
        style={[
          styles.dropdownCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: danger
              ? theme.colors.danger
              : open
                ? theme.colors.gold
                : theme.colors.cardBorder,
          },
          theme.shadows.soft,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.82}
          style={styles.dropdownHeader}
          onPress={() => toggleSection(sectionKey)}
        >
          <View
            style={[
              styles.dropdownIcon,
              {
                backgroundColor: danger
                  ? theme.colors.dangerSoft
                  : theme.colors.goldTransparent,
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={22}
              color={
                danger
                  ? theme.colors.danger
                  : theme.colors.gold
              }
            />
          </View>

          <View style={styles.dropdownTitleArea}>
            <Text
              style={[
                styles.dropdownEyebrow,
                {
                  color: danger
                    ? theme.colors.danger
                    : theme.colors.gold,
                },
              ]}
            >
              {eyebrow}
            </Text>

            <Text
              style={[
                styles.dropdownTitle,
                {
                  color: theme.colors.text,
                },
              ]}
            >
              {title}
            </Text>

            <Text
              style={[
                styles.dropdownSubtitle,
                {
                  color: theme.colors.textMuted,
                },
              ]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          </View>

          {badge !== undefined ? (
            <View
              style={[
                styles.dropdownBadge,
                {
                  backgroundColor: danger
                    ? theme.colors.dangerSoft
                    : theme.colors.goldTransparent,
                },
              ]}
            >
              <Text
                style={[
                  styles.dropdownBadgeText,
                  {
                    color: danger
                      ? theme.colors.danger
                      : theme.colors.gold,
                  },
                ]}
              >
                {badge}
              </Text>
            </View>
          ) : null}

          <Ionicons
            name={
              open
                ? "chevron-up"
                : "chevron-down"
            }
            size={21}
            color={theme.colors.textMuted}
          />
        </TouchableOpacity>

        {open ? (
          <View
            style={[
              styles.dropdownBody,
              {
                borderTopColor: theme.colors.divider,
              },
            ]}
          >
            {children}
          </View>
        ) : null}
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <View
          style={[
            styles.loadingLogo,
            {
              backgroundColor: theme.colors.goldTransparent,
              borderColor: theme.colors.cardBorderStrong,
            },
          ]}
        >
          <Text
            style={[
              styles.loadingLogoText,
              {
                color: theme.colors.gold,
              },
            ]}
          >
            A
          </Text>
        </View>

        <ActivityIndicator
          size="large"
          color={theme.colors.gold}
        />

        <Text
          style={[
            styles.loadingText,
            {
              color: theme.colors.textSecondary,
            },
          ]}
        >
          Loading Operations Command Center...
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
          backgroundColor: theme.colors.background,
        },
      ]}
      resizeMode="cover"
    >
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark
              ? "rgba(3,8,17,0.92)"
              : "rgba(245,247,250,0.95)",
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.container,
            {
              maxWidth: isLarge ? 1320 : 1100,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshDashboard}
              tintColor={theme.colors.gold}
              colors={[theme.colors.gold]}
            />
          }
        >
          <View style={styles.topHeader}>
            <View style={styles.headerBrand}>
              <View
                style={[
                  styles.headerLogo,
                  {
                    backgroundColor:
                      theme.colors.goldTransparent,
                    borderColor:
                      theme.colors.cardBorderStrong,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.headerLogoText,
                    {
                      color: theme.colors.gold,
                    },
                  ]}
                >
                  A
                </Text>
              </View>

              <View style={styles.headerBrandText}>
                <Text
                  style={[
                    styles.brandTitle,
                    {
                      color: theme.colors.text,
                    },
                  ]}
                >
                  ANGEL EXPRESS
                </Text>

                <Text
                  style={[
                    styles.brandSubtitle,
                    {
                      color: theme.colors.gold,
                    },
                  ]}
                >
                  OPERATIONS COMMAND CENTER
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[
                  styles.headerButton,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                onPress={toggleTheme}
              >
                <Ionicons
                  name={
                    isDark
                      ? "sunny-outline"
                      : "moon-outline"
                  }
                  size={20}
                  color={theme.colors.gold}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.headerButton,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                onPress={() =>
                  router.push("/owner-notifications")
                }
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />

                {dashboard.unassigned.length > 0 ? (
                  <View
                    style={[
                      styles.notificationDot,
                      {
                        backgroundColor: theme.colors.danger,
                      },
                    ]}
                  />
                ) : null}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.headerButton,
                  {
                    backgroundColor: theme.colors.dangerSoft,
                    borderColor: theme.colors.danger,
                  },
                ]}
                onPress={handleLogout}
              >
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={theme.colors.danger}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorderStrong,
              },
              theme.shadows.premium,
            ]}
          >
            <View style={styles.heroTop}>
              <View style={styles.heroTextArea}>
                <Text
                  style={[
                    styles.greeting,
                    {
                      color: theme.colors.textSecondary,
                    },
                  ]}
                >
                  {greeting()},
                </Text>

                <Text
                  style={[
                    styles.ownerName,
                    {
                      color: theme.colors.text,
                    },
                  ]}
                >
                  {ownerName}
                </Text>

                <Text
                  style={[
                    styles.heroDescription,
                    {
                      color: theme.colors.textMuted,
                    },
                  ]}
                >
                  Monitor rides, drivers, revenue, safety, and
                  operational priorities from one organized command center.
                </Text>
              </View>

              <View
                style={[
                  styles.liveBadge,
                  {
                    backgroundColor: realtimeConnected
                      ? theme.colors.successSoft
                      : theme.colors.warningSoft,
                    borderColor: realtimeConnected
                      ? theme.colors.success
                      : theme.colors.warning,
                  },
                ]}
              >
                <View
                  style={[
                    styles.liveDot,
                    {
                      backgroundColor: realtimeConnected
                        ? theme.colors.success
                        : theme.colors.warning,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.liveText,
                    {
                      color: realtimeConnected
                        ? theme.colors.success
                        : theme.colors.warning,
                    },
                  ]}
                >
                  {realtimeConnected
                    ? "SYSTEM LIVE"
                    : "CONNECTING"}
                </Text>
              </View>
            </View>

            <View style={styles.heroMetrics}>
              <View style={styles.heroMetric}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={theme.colors.gold}
                />
                <Text
                  style={[
                    styles.heroMetricText,
                    {
                      color: theme.colors.textSecondary,
                    },
                  ]}
                >
                  {dashboard.todayTrips.length} trips today
                </Text>
              </View>

              <View style={styles.heroMetric}>
                <Ionicons
                  name="radio-outline"
                  size={18}
                  color={theme.colors.success}
                />
                <Text
                  style={[
                    styles.heroMetricText,
                    {
                      color: theme.colors.textSecondary,
                    },
                  ]}
                >
                  {dashboard.onlineDrivers.length} drivers online
                </Text>
              </View>

              <View style={styles.heroMetric}>
                <Ionicons
                  name="people-outline"
                  size={18}
                  color={theme.colors.info}
                />
                <Text
                  style={[
                    styles.heroMetricText,
                    {
                      color: theme.colors.textSecondary,
                    },
                  ]}
                >
                  {dashboard.activePassengers} passengers riding
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeadingRow}>
            <View>
              <Text
                style={[
                  styles.sectionEyebrow,
                  {
                    color: theme.colors.gold,
                  },
                ]}
              >
                LIVE BUSINESS OVERVIEW
              </Text>

              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.colors.text,
                  },
                ]}
              >
                Today&apos;s Operations
              </Text>
            </View>

            <TouchableOpacity
              onPress={refreshDashboard}
              style={[
                styles.refreshButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Ionicons
                name="refresh"
                size={18}
                color={theme.colors.gold}
              />
              <Text
                style={[
                  styles.refreshText,
                  {
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                Refresh
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              title="Today's Revenue"
              value={formatMoney(dashboard.todayRevenue)}
              subtitle={`${dashboard.todayCompleted.length} completed today`}
              icon="cash-outline"
              onPress={() => router.push("/owner-revenue")}
            />

            <StatCard
              title="Today's Trips"
              value={dashboard.todayTrips.length}
              subtitle={`${dashboard.upcoming.length} upcoming`}
              icon="calendar-outline"
              tone="info"
              onPress={() =>
                router.push("/booking-management")
              }
            />

            <StatCard
              title="Active Trips"
              value={dashboard.active.length}
              subtitle={`${dashboard.activePassengers} passengers riding`}
              icon="navigate-circle-outline"
              tone="success"
              onPress={() => router.push("/live-trips")}
            />

            <StatCard
              title="Drivers Online"
              value={dashboard.onlineDrivers.length}
              subtitle={`${dashboard.approvedDrivers.length} approved`}
              icon="radio-outline"
              tone="success"
              onPress={() =>
                router.push("/driver-management")
              }
            />
          </View>

          <View style={styles.dropdownStack}>
            <DropdownSection
              sectionKey="live"
              eyebrow="DISPATCH & TRIP CONTROL"
              title="Live Operations"
              subtitle="Bookings, assignments, active trips, live map, and dispatch priorities."
              icon="navigate-outline"
              badge={
                dashboard.active.length +
                dashboard.unassigned.length
              }
            >
              <View style={styles.actionGrid}>
                <ActionCard
                  title="Booking Management"
                  description="Approve, assign, edit, confirm, or cancel bookings."
                  icon="calendar-outline"
                  route="/booking-management"
                />

                <ActionCard
                  title="Live Trips"
                  description="Oversee all active passenger journeys."
                  icon="navigate-outline"
                  route="/live-trips"
                />

                <ActionCard
                  title="Operations Map"
                  description="Track live drivers, vehicles, routes, and ETAs."
                  icon="map-outline"
                  route="/live-map"
                />

                <ActionCard
                  title="Pending Assignments"
                  description={`${dashboard.unassigned.length} bookings are waiting for a driver.`}
                  icon="person-add-outline"
                  route="/booking-management"
                />
              </View>

              <View style={styles.miniStatsGrid}>
                <View
                  style={[
                    styles.miniStat,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniValue,
                      { color: theme.colors.text },
                    ]}
                  >
                    {dashboard.active.length}
                  </Text>
                  <Text
                    style={[
                      styles.miniLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Active Trips
                  </Text>
                </View>

                <View
                  style={[
                    styles.miniStat,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniValue,
                      { color: theme.colors.text },
                    ]}
                  >
                    {dashboard.upcoming.length}
                  </Text>
                  <Text
                    style={[
                      styles.miniLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Upcoming
                  </Text>
                </View>

                <View
                  style={[
                    styles.miniStat,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniValue,
                      { color: theme.colors.text },
                    ]}
                  >
                    {dashboard.unassigned.length}
                  </Text>
                  <Text
                    style={[
                      styles.miniLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Unassigned
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.subsectionTitle,
                  { color: theme.colors.text },
                ]}
              >
                Current Active Trips
              </Text>

              {dashboard.active.length === 0 ? (
                <View
                  style={[
                    styles.emptyBox,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={29}
                    color={theme.colors.success}
                  />

                  <Text
                    style={[
                      styles.emptyTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    No active trips right now
                  </Text>

                  <Text
                    style={[
                      styles.emptyText,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Active rides will appear here automatically.
                  </Text>
                </View>
              ) : (
                dashboard.active.slice(0, 3).map((trip) => {
                  const statusStyle =
                    getOwnerBookingStatusStyle(trip.status);

                  return (
                    <TouchableOpacity
                      key={String(trip.id)}
                      style={[
                        styles.tripCard,
                        {
                          backgroundColor: theme.colors.surfaceSoft,
                          borderColor: theme.colors.cardBorder,
                        },
                      ]}
                      onPress={() => router.push("/live-trips")}
                    >
                      <View
                        style={[
                          styles.tripIcon,
                          {
                            backgroundColor: theme.colors.infoSoft,
                          },
                        ]}
                      >
                        <Ionicons
                          name="navigate"
                          size={21}
                          color={theme.colors.info}
                        />
                      </View>

                      <View style={styles.tripTextArea}>
                        <Text
                          style={[
                            styles.tripPassenger,
                            { color: theme.colors.text },
                          ]}
                        >
                          {trip.passenger_name ||
                            trip.name ||
                            "Passenger"}
                        </Text>

                        <Text
                          style={[
                            styles.tripRoute,
                            { color: theme.colors.textMuted },
                          ]}
                          numberOfLines={1}
                        >
                          {trip.pickup_address ||
                            trip.pickup ||
                            "Pickup"}{" "}
                          →{" "}
                          {trip.dropoff_address ||
                            trip.dropoff ||
                            "Drop-off"}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.tripStatus,
                          {
                            backgroundColor:
                              statusStyle.background,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tripStatusText,
                            {
                              color: statusStyle.color,
                            },
                          ]}
                        >
                          {trip.status || "Active"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </DropdownSection>

            <DropdownSection
              sectionKey="finance"
              eyebrow="REVENUE & PAYOUT CONTROL"
              title="Financial Operations"
              subtitle="Revenue, payment collection, company share, driver payouts, and reports."
              icon="cash-outline"
              badge={formatMoney(dashboard.todayRevenue)}
            >
              <View
                style={[
                  styles.revenueSnapshot,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.cardBorderStrong,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.revenueEyebrow,
                    { color: theme.colors.gold },
                  ]}
                >
                  TODAY&apos;S REVENUE
                </Text>

                <Text
                  style={[
                    styles.revenueAmount,
                    { color: theme.colors.gold },
                  ]}
                >
                  {formatMoney(dashboard.todayRevenue)}
                </Text>

                <View style={styles.revenueSplit}>
                  <View>
                    <Text
                      style={[
                        styles.revenueSplitLabel,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      COMPANY 30%
                    </Text>
                    <Text
                      style={[
                        styles.revenueSplitValue,
                        { color: theme.colors.success },
                      ]}
                    >
                      {formatMoney(
                        dashboard.companyShareToday
                      )}
                    </Text>
                  </View>

                  <View>
                    <Text
                      style={[
                        styles.revenueSplitLabel,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      DRIVER 70%
                    </Text>
                    <Text
                      style={[
                        styles.revenueSplitValue,
                        { color: theme.colors.info },
                      ]}
                    >
                      {formatMoney(
                        dashboard.driverShareToday
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionGrid}>
                <ActionCard
                  title="Revenue Center"
                  description="Track gross revenue, company share, refunds, and collections."
                  icon="cash-outline"
                  route="/owner-revenue"
                />

                <ActionCard
                  title="Payment Management"
                  description="Review fares, payment status, receipts, and refunds."
                  icon="card-outline"
                  route="/payment-management"
                />

                <ActionCard
                  title="Driver Payout Center"
                  description="Review payout obligations and payment methods."
                  icon="wallet-outline"
                  route="/owner-payouts"
                />

                <ActionCard
                  title="Executive Reports"
                  description="Generate finance, payout, and operations reports."
                  icon="document-text-outline"
                  route="/owner-reports"
                />
              </View>

              <View style={styles.miniStatsGrid}>
                <View
                  style={[
                    styles.miniStat,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniMoneyValue,
                      { color: theme.colors.text },
                    ]}
                  >
                    {formatMoney(dashboard.allRevenue)}
                  </Text>
                  <Text
                    style={[
                      styles.miniLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Recorded Revenue
                  </Text>
                </View>

                <View
                  style={[
                    styles.miniStat,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniValue,
                      { color: theme.colors.warning },
                    ]}
                  >
                    {dashboard.unpaid.length}
                  </Text>
                  <Text
                    style={[
                      styles.miniLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Unpaid Bookings
                  </Text>
                </View>

                <View
                  style={[
                    styles.miniStat,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniValue,
                      { color: theme.colors.success },
                    ]}
                  >
                    {dashboard.todayCompleted.length}
                  </Text>
                  <Text
                    style={[
                      styles.miniLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Completed Today
                  </Text>
                </View>
              </View>
            </DropdownSection>

            <DropdownSection
              sectionKey="people"
              eyebrow="DRIVERS, PASSENGERS & STUDENTS"
              title="People Management"
              subtitle="Manage drivers, passengers, student verification, and approvals."
              icon="people-outline"
              badge={
                dashboard.approvedDrivers.length +
                dashboard.pendingDrivers.length
              }
            >
              <View style={styles.actionGrid}>
                <ActionCard
                  title="Driver Management"
                  description="Approve, suspend, monitor, and contact drivers."
                  icon="car-sport-outline"
                  route="/driver-management"
                />

                <ActionCard
                  title="Passenger Management"
                  description="View passenger profiles, trip history, ratings, and notes."
                  icon="people-outline"
                  route="/passenger-management"
                />

                <ActionCard
                  title="Student Verification"
                  description="Review IDs and organize pending, verified, and rejected students."
                  icon="school-outline"
                  route="/student-verification"
                />

                <ActionCard
                  title="Driver Approvals"
                  description={`${dashboard.pendingDrivers.length} driver applications need review.`}
                  icon="shield-checkmark-outline"
                  route="/driver-management"
                />
              </View>

              <View style={styles.miniStatsGrid}>
                <View
                  style={[
                    styles.miniStat,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniValue,
                      { color: theme.colors.success },
                    ]}
                  >
                    {dashboard.approvedDrivers.length}
                  </Text>
                  <Text
                    style={[
                      styles.miniLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Approved Drivers
                  </Text>
                </View>

                <View
                  style={[
                    styles.miniStat,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniValue,
                      { color: theme.colors.warning },
                    ]}
                  >
                    {dashboard.pendingDrivers.length}
                  </Text>
                  <Text
                    style={[
                      styles.miniLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Pending Drivers
                  </Text>
                </View>

                <View
                  style={[
                    styles.miniStat,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniValue,
                      { color: theme.colors.info },
                    ]}
                  >
                    {dashboard.studentTrips.length}
                  </Text>
                  <Text
                    style={[
                      styles.miniLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Student Trips
                  </Text>
                </View>
              </View>
            </DropdownSection>

            <DropdownSection
              sectionKey="safety"
              eyebrow="SAFETY, SUPPORT & COMMUNICATION"
              title="Safety & Communication"
              subtitle="Emergency response, fleet safety, owner messaging, and support."
              icon="shield-checkmark-outline"
              danger
              badge={dashboard.suspendedDrivers.length}
            >
              <View style={styles.actionGrid}>
                <ActionCard
                  title="Safety Command Center"
                  description="Review SOS alerts, incidents, emergencies, and interventions."
                  icon="warning-outline"
                  route="/emergency-center"
                  danger
                />

                <ActionCard
                  title="Owner Safety Overview"
                  description="Monitor fleet safety score, emergency signals, and family check-ins."
                  icon="shield-checkmark-outline"
                  route="/owner-safety"
                  danger
                />

                <ActionCard
                  title="Communication Center"
                  description="Contact passengers, drivers, support, and emergency contacts."
                  icon="chatbubbles-outline"
                  route="/contact-center"
                />

                <ActionCard
                  title="Support & Resolution Center"
                  description="Manage passenger issues, driver support, booking changes, overdue requests, and resolutions."
                  icon="headset-outline"
                  route="/owner-support"
                />

                <ActionCard
                  title="Owner Notifications"
                  description="Review driver, passenger, payment, support, and urgent alerts."
                  icon="notifications-outline"
                  route="/owner-notifications"
                />
              </View>
            </DropdownSection>

            <DropdownSection
              sectionKey="admin"
              eyebrow="BUSINESS INTELLIGENCE & CONTROL"
              title="Analytics & Administration"
              subtitle="Analytics, reports, notifications, and system configuration."
              icon="analytics-outline"
            >
              <View style={styles.actionGrid}>
                <ActionCard
                  title="Analytics Command Center"
                  description="Review revenue trends, performance, routes, and fleet intelligence."
                  icon="analytics-outline"
                  route="/owner-analytics"
                />

                <ActionCard
                  title="Executive Reports"
                  description="Generate daily, weekly, financial, safety, and payout reports."
                  icon="document-text-outline"
                  route="/owner-reports"
                />

                <ActionCard
                  title="Owner Notifications"
                  description="Review operational alerts and unread notifications."
                  icon="notifications-outline"
                  route="/owner-notifications"
                />

                <ActionCard
                  title="Owner Settings"
                  description="Configure company details, financial rules, payments, and security."
                  icon="settings-outline"
                  route="/owner-settings"
                />
              </View>
            </DropdownSection>

            <DropdownSection
              sectionKey="activity"
              eyebrow="RECENT SYSTEM EVENTS"
              title="Recent Activity"
              subtitle="Latest booking, trip, payment, and driver events."
              icon="pulse-outline"
              badge={activities.length}
            >
              {activities.length === 0 ? (
                <View
                  style={[
                    styles.emptyBox,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="pulse-outline"
                    size={29}
                    color={theme.colors.gold}
                  />
                  <Text
                    style={[
                      styles.emptyTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    No recent activity
                  </Text>
                </View>
              ) : (
                activities.map((item) => {
                  const colors = toneColors(item.tone);

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.activityRow,
                        {
                          borderBottomColor:
                            theme.colors.divider,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.activityIcon,
                          {
                            backgroundColor:
                              colors.background,
                          },
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={19}
                          color={colors.foreground}
                        />
                      </View>

                      <View style={styles.activityTextArea}>
                        <Text
                          style={[
                            styles.activityTitle,
                            { color: theme.colors.text },
                          ]}
                        >
                          {item.title}
                        </Text>

                        <Text
                          style={[
                            styles.activityDescription,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {item.description}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.activityTime,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {activityTime(item.time)}
                      </Text>
                    </View>
                  );
                })
              )}
            </DropdownSection>
          </View>

          <View
            style={[
              styles.footerCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.footerLogo,
                {
                  backgroundColor:
                    theme.colors.goldTransparent,
                },
              ]}
            >
              <Text
                style={[
                  styles.footerLogoText,
                  { color: theme.colors.gold },
                ]}
              >
                A
              </Text>
            </View>

            <View style={styles.footerTextArea}>
              <Text
                style={[
                  styles.footerTitle,
                  { color: theme.colors.text },
                ]}
              >
                Angel Express Owner App V6
              </Text>

              <Text
                style={[
                  styles.footerText,
                  { color: theme.colors.textMuted },
                ]}
              >
                V5 premium design • Organized V6 command structure
              </Text>
            </View>
          </View>
        </ScrollView>
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

  container: {
    flexGrow: 1,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 50,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  loadingLogo: {
    width: 78,
    height: 78,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  loadingLogoText: {
    fontSize: 35,
    fontWeight: "900",
  },

  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  headerBrand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },

  headerLogo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerLogoText: {
    fontSize: 23,
    fontWeight: "900",
  },

  headerBrandText: {
    flex: 1,
  },

  brandTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  brandSubtitle: {
    marginTop: 3,
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 1.15,
  },

  headerActions: {
    flexDirection: "row",
    gap: 8,
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 999,
  },

  heroCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 22,
    marginBottom: 24,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  heroTextArea: {
    flex: 1,
    paddingRight: 12,
  },

  greeting: {
    fontSize: 14,
    fontWeight: "700",
  },

  ownerName: {
    marginTop: 3,
    fontSize: 34,
    fontWeight: "900",
  },

  heroDescription: {
    marginTop: 11,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 620,
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 7,
  },

  liveText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  heroMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 22,
  },

  heroMetric: {
    flexDirection: "row",
    alignItems: "center",
  },

  heroMetricText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "700",
  },

  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sectionEyebrow: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  sectionTitle: {
    marginTop: 5,
    fontSize: 22,
    fontWeight: "900",
  },

  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
  },

  refreshText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "800",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  statCard: {
    minHeight: 154,
    borderWidth: 1,
    borderRadius: 21,
    padding: 16,
    marginBottom: 13,
  },

  statTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  statIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  statValue: {
    marginTop: 17,
    fontWeight: "900",
  },

  statTitle: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "900",
  },

  statSubtitle: {
    marginTop: 5,
    fontSize: 9.5,
    fontWeight: "600",
  },

  dropdownStack: {
    gap: 14,
    marginTop: 2,
  },

  dropdownCard: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
  },

  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },

  dropdownIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  dropdownTitleArea: {
    flex: 1,
    paddingRight: 8,
  },

  dropdownEyebrow: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 1,
  },

  dropdownTitle: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: "900",
  },

  dropdownSubtitle: {
    marginTop: 4,
    fontSize: 10.5,
    lineHeight: 16,
  },

  dropdownBadge: {
    minWidth: 34,
    minHeight: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    marginRight: 9,
  },

  dropdownBadgeText: {
    fontSize: 9.5,
    fontWeight: "900",
  },

  dropdownBody: {
    borderTopWidth: 1,
    padding: 15,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  actionCard: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 19,
    padding: 14,
    marginBottom: 12,
  },

  actionIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  actionTextArea: {
    flex: 1,
    paddingRight: 8,
  },

  actionTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  actionDescription: {
    marginTop: 5,
    fontSize: 10,
    lineHeight: 15,
  },

  miniStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 3,
    marginBottom: 16,
  },

  miniStat: {
    flexGrow: 1,
    minWidth: 100,
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
  },

  miniValue: {
    fontSize: 22,
    fontWeight: "900",
  },

  miniMoneyValue: {
    fontSize: 16,
    fontWeight: "900",
  },

  miniLabel: {
    marginTop: 5,
    fontSize: 9.5,
    fontWeight: "700",
  },

  subsectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
  },

  emptyBox: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "900",
  },

  emptyText: {
    marginTop: 5,
    fontSize: 10.5,
    textAlign: "center",
  },

  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 17,
    padding: 13,
    marginBottom: 9,
  },

  tripIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  tripTextArea: {
    flex: 1,
    paddingRight: 8,
  },

  tripPassenger: {
    fontSize: 12,
    fontWeight: "900",
  },

  tripRoute: {
    marginTop: 4,
    fontSize: 9.5,
    fontWeight: "600",
  },

  tripStatus: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  tripStatusText: {
    fontSize: 8,
    fontWeight: "900",
  },

  revenueSnapshot: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 17,
    marginBottom: 14,
  },

  revenueEyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  revenueAmount: {
    marginTop: 7,
    fontSize: 34,
    fontWeight: "900",
  },

  revenueSplit: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 17,
  },

  revenueSplitLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  revenueSplitValue: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: "900",
  },

  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: 12,
  },

  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  activityTextArea: {
    flex: 1,
    paddingRight: 8,
  },

  activityTitle: {
    fontSize: 11.5,
    fontWeight: "900",
  },

  activityDescription: {
    marginTop: 4,
    fontSize: 9.5,
    lineHeight: 14,
  },

  activityTime: {
    fontSize: 8.5,
    fontWeight: "700",
  },

  footerCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    marginTop: 18,
  },

  footerLogo: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  footerLogoText: {
    fontSize: 20,
    fontWeight: "900",
  },

  footerTextArea: {
    flex: 1,
  },

  footerTitle: {
    fontSize: 12,
    fontWeight: "900",
  },

  footerText: {
    marginTop: 4,
    fontSize: 9.5,
  },
});
