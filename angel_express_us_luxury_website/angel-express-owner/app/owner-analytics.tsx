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

type BookingRecord = GenericRecord & {
  id: string | number;
  created_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  source?: string | null;
  payment_status?: string | null;
  driver_payout_status?: string | null;
  payout_status?: string | null;
  driver_id?: string | null;
  assigned_driver_id?: string | null;
  pickup?: string | null;
  pickup_address?: string | null;
  dropoff?: string | null;
  dropoff_address?: string | null;
  total?: number | string | null;
  total_fare?: number | string | null;
  total_price?: number | string | null;
  price?: number | string | null;
  fare?: number | string | null;
  driver_share?: number | string | null;
  company_share?: number | string | null;
  student_verified?: boolean | null;
  is_student?: boolean | null;
  student_discount?: number | string | null;
};

type DriverRecord = GenericRecord & {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  status?: string | null;
  is_online?: boolean | null;
  rating?: number | string | null;
  total_trips?: number | null;
  total_earnings?: number | string | null;
};

type Tone = "gold" | "success" | "warning" | "danger" | "info";

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function fareOf(booking: BookingRecord) {
  return Number(
    booking.total_fare ??
      booking.total ??
      booking.total_price ??
      booking.price ??
      booking.fare ??
      0
  );
}

function driverShareOf(booking: BookingRecord) {
  return Number(
    booking.driver_share ?? fareOf(booking) * 0.7
  );
}

function companyShareOf(booking: BookingRecord) {
  return Number(
    booking.company_share ?? fareOf(booking) * 0.3
  );
}

function isCompleted(booking: BookingRecord) {
  return normalize(booking.status) === "completed";
}

function isCancelled(booking: BookingRecord) {
  return ["cancelled", "canceled"].includes(
    normalize(booking.status)
  );
}

function isPaid(booking: BookingRecord) {
  return normalize(booking.payment_status) === "paid";
}

function isStudentRide(booking: BookingRecord) {
  return (
    booking.student_verified === true ||
    booking.is_student === true ||
    Number(booking.student_discount || 0) > 0
  );
}

function bookingDate(booking: BookingRecord) {
  const raw = booking.completed_at || booking.created_at;

  if (!raw) return null;

  const date = new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
}

function routeLabel(booking: BookingRecord) {
  const pickup =
    booking.pickup_address ||
    booking.pickup ||
    "Pickup";

  const dropoff =
    booking.dropoff_address ||
    booking.dropoff ||
    "Drop-off";

  return `${pickup} → ${dropoff}`;
}

function driverName(driver: DriverRecord) {
  return (
    `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
    driver.full_name ||
    "Driver"
  );
}

function percent(value: number) {
  return `${Math.round(value)}%`;
}

export default function OwnerAnalyticsScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [bookings, setBookings] =
    useState<BookingRecord[]>([]);
  const [drivers, setDrivers] =
    useState<DriverRecord[]>([]);
  const [passengers, setPassengers] =
    useState<GenericRecord[]>([]);
  const [alerts, setAlerts] =
    useState<GenericRecord[]>([]);
  const [supportMessages, setSupportMessages] =
    useState<GenericRecord[]>([]);
  const [driverSupportMessages, setDriverSupportMessages] =
    useState<GenericRecord[]>([]);
  const [studentVerifications, setStudentVerifications] =
    useState<GenericRecord[]>([]);
  const [referralRewards, setReferralRewards] =
    useState<GenericRecord[]>([]);

  const isTablet = width >= 700;
  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [])
  );

  useEffect(() => {
    const channel = supabase
      .channel("owner-analytics-v5")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadAnalytics(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        () => loadAnalytics(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_alerts",
        },
        () => loadAnalytics(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function safeRows(
    table: string,
    orderColumn?: string
  ) {
    try {
      let query = supabase.from(table).select("*");

      if (orderColumn) {
        query = query.order(orderColumn, {
          ascending: false,
        });
      }

      const { data, error } = await query;

      if (error) {
        console.log(`${table} analytics skipped:`, error.message);
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  }

  async function loadAnalytics(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const [
        bookingRows,
        driverRows,
        passengerRows,
        passengerProfileRows,
        alertRows,
        supportRows,
        driverSupportRows,
        studentRows,
        referralRows,
      ] = await Promise.all([
        safeRows("bookings", "created_at"),
        safeRows("drivers", "created_at"),
        safeRows("passengers", "created_at"),
        safeRows("passenger_profiles", "created_at"),
        safeRows("emergency_alerts", "created_at"),
        safeRows("support_messages", "created_at"),
        safeRows("driver_support_messages", "created_at"),
        safeRows("student_verifications", "created_at"),
        safeRows("referral_rewards", "created_at"),
      ]);

      setBookings(bookingRows);
      setDrivers(driverRows);
      setPassengers([
        ...passengerRows,
        ...passengerProfileRows,
      ]);
      setAlerts(alertRows);
      setSupportMessages(supportRows);
      setDriverSupportMessages(driverSupportRows);
      setStudentVerifications(studentRows);
      setReferralRewards(referralRows);
    } catch (error: any) {
      Alert.alert(
        "Analytics Error",
        error?.message || "Unable to load analytics."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const analytics = useMemo(() => {
    const completed = bookings.filter(isCompleted);
    const cancelled = bookings.filter(isCancelled);
    const paid = bookings.filter(isPaid);
    const studentTrips = bookings.filter(isStudentRide);

    const totalRevenue = bookings.reduce(
      (sum, booking) => sum + fareOf(booking),
      0
    );

    const completedRevenue = completed.reduce(
      (sum, booking) => sum + fareOf(booking),
      0
    );

    const companyShare = bookings.reduce(
      (sum, booking) => sum + companyShareOf(booking),
      0
    );

    const driverShare = bookings.reduce(
      (sum, booking) => sum + driverShareOf(booking),
      0
    );

    const completionRate =
      bookings.length > 0
        ? (completed.length / bookings.length) * 100
        : 0;

    const cancellationRate =
      bookings.length > 0
        ? (cancelled.length / bookings.length) * 100
        : 0;

    const paymentCollectionRate =
      bookings.length > 0
        ? (paid.length / bookings.length) * 100
        : 0;

    const averageFare =
      bookings.length > 0
        ? totalRevenue / bookings.length
        : 0;

    const onlineDrivers = drivers.filter(
      (driver) => driver.is_online === true
    );

    const activeDriverIds = new Set(
      bookings
        .filter((booking) =>
          [
            "assigned",
            "driverassigned",
            "accepted",
            "driveraccepted",
            "arrivedatpickup",
            "pickedup",
            "inprogress",
            "active",
          ].includes(normalize(booking.status))
        )
        .map(
          (booking) =>
            booking.driver_id ||
            booking.assigned_driver_id
        )
        .filter(Boolean)
        .map(String)
    );

    const utilization =
      onlineDrivers.length > 0
        ? (activeDriverIds.size / onlineDrivers.length) * 100
        : 0;

    const uniquePassengers = new Map<string, GenericRecord>();

    passengers.forEach((passenger) => {
      const key = String(
        passenger.user_id ||
          passenger.id ||
          passenger.passenger_id ||
          passenger.email ||
          ""
      );

      if (key) {
        uniquePassengers.set(key, passenger);
      }
    });

    const activeAlerts = alerts.filter(
      (alert) =>
        alert.resolved !== true &&
        !["resolved", "closed"].includes(
          normalize(alert.status)
        )
    );

    const openSupport =
      supportMessages.filter(
        (message) =>
          !["resolved", "closed"].includes(
            normalize(
              message.status ||
                message.ticket_status ||
                message.resolution_status
            )
          )
      ).length +
      driverSupportMessages.filter(
        (message) =>
          !["resolved", "closed"].includes(
            normalize(
              message.status ||
                message.ticket_status ||
                message.resolution_status
            )
          )
      ).length;

    const verifiedStudents = studentVerifications.filter(
      (item) =>
        item.student_verified === true ||
        ["approved", "verified"].includes(
          normalize(item.status)
        )
    );

    const pendingStudents = studentVerifications.filter(
      (item) =>
        ["pending", "pendingreview", "submitted"].includes(
          normalize(item.status)
        )
    );

    return {
      completed,
      cancelled,
      paid,
      studentTrips,
      totalRevenue,
      completedRevenue,
      companyShare,
      driverShare,
      completionRate,
      cancellationRate,
      paymentCollectionRate,
      averageFare,
      onlineDrivers,
      activeDriverIds,
      utilization,
      uniquePassengers,
      activeAlerts,
      openSupport,
      verifiedStudents,
      pendingStudents,
    };
  }, [
    bookings,
    drivers,
    passengers,
    alerts,
    supportMessages,
    driverSupportMessages,
    studentVerifications,
  ]);

  const revenueTrend = useMemo(() => {
    const days: {
      label: string;
      value: number;
    }[] = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const value = bookings
        .filter((booking) => {
          const itemDate = bookingDate(booking);

          return (
            itemDate &&
            itemDate >= date &&
            itemDate < nextDate
          );
        })
        .reduce(
          (sum, booking) => sum + fareOf(booking),
          0
        );

      days.push({
        label: date.toLocaleDateString("en-US", {
          weekday: "short",
        }),
        value,
      });
    }

    return days;
  }, [bookings]);

  const bookingSourceData = useMemo(() => {
    const website = bookings.filter((booking) =>
      normalize(booking.source).includes("website")
    );

    const app = bookings.filter((booking) =>
      normalize(booking.source).includes("app")
    );

    return [
      {
        label: "Website",
        trips: website.length,
        revenue: website.reduce(
          (sum, booking) => sum + fareOf(booking),
          0
        ),
      },
      {
        label: "Passenger App",
        trips: app.length,
        revenue: app.reduce(
          (sum, booking) => sum + fareOf(booking),
          0
        ),
      },
    ];
  }, [bookings]);

  const topRoutes = useMemo(() => {
    const map = new Map<
      string,
      { trips: number; revenue: number }
    >();

    bookings.forEach((booking) => {
      const route = routeLabel(booking);
      const current = map.get(route) || {
        trips: 0,
        revenue: 0,
      };

      map.set(route, {
        trips: current.trips + 1,
        revenue: current.revenue + fareOf(booking),
      });
    });

    return Array.from(map.entries())
      .map(([route, data]) => ({
        route,
        ...data,
      }))
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 5);
  }, [bookings]);

  const driverLeaderboard = useMemo(() => {
    return drivers
      .map((driver) => {
        const trips = bookings.filter(
          (booking) =>
            String(
              booking.driver_id ||
                booking.assigned_driver_id ||
                ""
            ) === String(driver.id)
        );

        const completed = trips.filter(isCompleted);

        return {
          id: driver.id,
          name: driverName(driver),
          trips: trips.length,
          completed: completed.length,
          revenue: trips.reduce(
            (sum, booking) => sum + fareOf(booking),
            0
          ),
          rating: Number(driver.rating || 5),
        };
      })
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5);
  }, [drivers, bookings]);

  const maxRevenue = Math.max(
    1,
    ...revenueTrend.map((item) => item.value)
  );

  function metricWidth() {
    if (isLarge) return "23.5%";
    if (isTablet) return "31.8%";
    return "48%";
  }

  function toneColors(tone: Tone) {
    if (tone === "success") {
      return {
        color: theme.colors.success,
        background: theme.colors.successSoft,
      };
    }

    if (tone === "warning") {
      return {
        color: theme.colors.warning,
        background: theme.colors.warningSoft,
      };
    }

    if (tone === "danger") {
      return {
        color: theme.colors.danger,
        background: theme.colors.dangerSoft,
      };
    }

    if (tone === "info") {
      return {
        color: theme.colors.info,
        background: theme.colors.infoSoft,
      };
    }

    return {
      color: theme.colors.gold,
      background: theme.colors.goldTransparent,
    };
  }

  function MetricCard({
    label,
    value,
    icon,
    tone,
  }: {
    label: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    tone: Tone;
  }) {
    const colors = toneColors(tone);

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
            { backgroundColor: colors.background },
          ]}
        >
          <Ionicons
            name={icon}
            size={21}
            color={colors.color}
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
          Loading Executive Analytics...
        </Text>
      </View>
    );
  }

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
                await loadAnalytics(false);
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
                ANGEL EXPRESS EXECUTIVE INTELLIGENCE
              </Text>

              <Text
                style={[
                  styles.pageTitle,
                  { color: theme.colors.text },
                ]}
              >
                Analytics Command Center
              </Text>

              <Text
                style={[
                  styles.pageSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Monitor revenue, trip performance, fleet utilization,
                passenger growth, safety, support, student operations,
                referrals, and payment collection.
              </Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <MetricCard
              label="Total Revenue"
              value={money(analytics.totalRevenue)}
              icon="cash-outline"
              tone="gold"
            />

            <MetricCard
              label="Company Share"
              value={money(analytics.companyShare)}
              icon="business-outline"
              tone="info"
            />

            <MetricCard
              label="Driver Share"
              value={money(analytics.driverShare)}
              icon="car-outline"
              tone="success"
            />

            <MetricCard
              label="Average Fare"
              value={money(analytics.averageFare)}
              icon="analytics-outline"
              tone="gold"
            />

            <MetricCard
              label="Total Trips"
              value={bookings.length}
              icon="navigate-outline"
              tone="info"
            />

            <MetricCard
              label="Completion Rate"
              value={percent(analytics.completionRate)}
              icon="checkmark-done-outline"
              tone="success"
            />

            <MetricCard
              label="Cancellation Rate"
              value={percent(analytics.cancellationRate)}
              icon="close-circle-outline"
              tone={
                analytics.cancellationRate > 10
                  ? "danger"
                  : "warning"
              }
            />

            <MetricCard
              label="Payment Collection"
              value={percent(
                analytics.paymentCollectionRate
              )}
              icon="card-outline"
              tone="success"
            />

            <MetricCard
              label="Total Passengers"
              value={analytics.uniquePassengers.size}
              icon="people-outline"
              tone="info"
            />

            <MetricCard
              label="Drivers Online"
              value={analytics.onlineDrivers.length}
              icon="radio-outline"
              tone="success"
            />

            <MetricCard
              label="Fleet Utilization"
              value={percent(analytics.utilization)}
              icon="speedometer-outline"
              tone="gold"
            />

            <MetricCard
              label="Student Trips"
              value={analytics.studentTrips.length}
              icon="school-outline"
              tone="info"
            />

            <MetricCard
              label="Verified Students"
              value={analytics.verifiedStudents.length}
              icon="shield-checkmark-outline"
              tone="success"
            />

            <MetricCard
              label="Pending Verifications"
              value={analytics.pendingStudents.length}
              icon="time-outline"
              tone="warning"
            />

            <MetricCard
              label="Open Support"
              value={analytics.openSupport}
              icon="headset-outline"
              tone={
                analytics.openSupport > 0
                  ? "warning"
                  : "success"
              }
            />

            <MetricCard
              label="Active Safety Alerts"
              value={analytics.activeAlerts.length}
              icon="warning-outline"
              tone={
                analytics.activeAlerts.length > 0
                  ? "danger"
                  : "success"
              }
            />
          </View>

          <TouchableOpacity
            style={[
              styles.reportShortcut,
              {
                backgroundColor: theme.colors.goldTransparent,
                borderColor: theme.colors.gold,
              },
            ]}
            onPress={() => router.push("/owner-reports")}
          >
            <View
              style={[
                styles.reportShortcutIcon,
                {
                  backgroundColor:
                    theme.colors.goldTransparent,
                },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={24}
                color={theme.colors.gold}
              />
            </View>

            <View style={styles.reportShortcutTextArea}>
              <Text
                style={[
                  styles.reportShortcutTitle,
                  { color: theme.colors.text },
                ]}
              >
                Open Executive Reports
              </Text>

              <Text
                style={[
                  styles.reportShortcutText,
                  { color: theme.colors.textMuted },
                ]}
              >
                Generate daily, weekly, monthly, finance, driver,
                passenger, student, safety, and support reports.
              </Text>
            </View>

            <Ionicons
              name="arrow-forward"
              size={20}
              color={theme.colors.gold}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorderStrong,
              },
              theme.shadows.soft,
            ]}
          >
            <Text
              style={[
                styles.sectionEyebrow,
                { color: theme.colors.gold },
              ]}
            >
              REVENUE TREND
            </Text>

            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text },
              ]}
            >
              Last 7 Days
            </Text>

            <View style={styles.chartArea}>
              {revenueTrend.map((item) => {
                const height = Math.max(
                  8,
                  (item.value / maxRevenue) * 150
                );

                return (
                  <View
                    key={item.label}
                    style={styles.barColumn}
                  >
                    <Text
                      style={[
                        styles.barValue,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {money(item.value)}
                    </Text>

                    <View
                      style={[
                        styles.barTrack,
                        {
                          backgroundColor:
                            theme.colors.surfaceSoft,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.barFill,
                          {
                            height,
                            backgroundColor:
                              theme.colors.gold,
                          },
                        ]}
                      />
                    </View>

                    <Text
                      style={[
                        styles.barLabel,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.twoColumnGrid}>
            <View
              style={[
                styles.halfCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionEyebrow,
                  { color: theme.colors.info },
                ]}
              >
                BOOKING SOURCES
              </Text>

              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text },
                ]}
              >
                Channel Performance
              </Text>

              {bookingSourceData.map((item) => (
                <View
                  key={item.label}
                  style={[
                    styles.dataRow,
                    {
                      borderBottomColor:
                        theme.colors.divider,
                    },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.dataRowTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.dataRowMeta,
                        {
                          color:
                            theme.colors.textMuted,
                        },
                      ]}
                    >
                      {item.trips} trips
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.dataRowValue,
                      { color: theme.colors.gold },
                    ]}
                  >
                    {money(item.revenue)}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.halfCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionEyebrow,
                  { color: theme.colors.success },
                ]}
              >
                GROWTH SIGNALS
              </Text>

              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text },
                ]}
              >
                Business Activity
              </Text>

              {[
                [
                  "Referral Rewards",
                  referralRewards.length,
                ],
                [
                  "Student Verifications",
                  studentVerifications.length,
                ],
                [
                  "Safety Incidents",
                  alerts.length,
                ],
                [
                  "Support Messages",
                  supportMessages.length +
                    driverSupportMessages.length,
                ],
              ].map(([label, value]) => (
                <View
                  key={String(label)}
                  style={[
                    styles.dataRow,
                    {
                      borderBottomColor:
                        theme.colors.divider,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dataRowTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    {label}
                  </Text>

                  <Text
                    style={[
                      styles.dataRowValue,
                      { color: theme.colors.info },
                    ]}
                  >
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.twoColumnGrid}>
            <View
              style={[
                styles.halfCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionEyebrow,
                  { color: theme.colors.gold },
                ]}
              >
                TOP ROUTES
              </Text>

              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text },
                ]}
              >
                Most Requested Corridors
              </Text>

              {topRoutes.length === 0 ? (
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  No route data available yet.
                </Text>
              ) : (
                topRoutes.map((item, index) => (
                  <View
                    key={item.route}
                    style={[
                      styles.rankingRow,
                      {
                        borderBottomColor:
                          theme.colors.divider,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.rankBadge,
                        {
                          backgroundColor:
                            theme.colors.goldTransparent,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rankText,
                          { color: theme.colors.gold },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>

                    <View style={styles.rankingTextArea}>
                      <Text
                        style={[
                          styles.rankingTitle,
                          { color: theme.colors.text },
                        ]}
                        numberOfLines={2}
                      >
                        {item.route}
                      </Text>

                      <Text
                        style={[
                          styles.rankingMeta,
                          {
                            color:
                              theme.colors.textMuted,
                          },
                        ]}
                      >
                        {item.trips} trips •{" "}
                        {money(item.revenue)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View
              style={[
                styles.halfCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionEyebrow,
                  { color: theme.colors.success },
                ]}
              >
                DRIVER LEADERBOARD
              </Text>

              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text },
                ]}
              >
                Performance Ranking
              </Text>

              {driverLeaderboard.length === 0 ? (
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  No driver performance data yet.
                </Text>
              ) : (
                driverLeaderboard.map(
                  (driver, index) => (
                    <View
                      key={driver.id}
                      style={[
                        styles.rankingRow,
                        {
                          borderBottomColor:
                            theme.colors.divider,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.rankBadge,
                          {
                            backgroundColor:
                              theme.colors.successSoft,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rankText,
                            {
                              color:
                                theme.colors.success,
                            },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.rankingTextArea
                        }
                      >
                        <Text
                          style={[
                            styles.rankingTitle,
                            {
                              color:
                                theme.colors.text,
                            },
                          ]}
                        >
                          {driver.name}
                        </Text>

                        <Text
                          style={[
                            styles.rankingMeta,
                            {
                              color:
                                theme.colors.textMuted,
                            },
                          ]}
                        >
                          {driver.completed} completed •{" "}
                          {money(driver.revenue)} •{" "}
                          {driver.rating.toFixed(1)} rating
                        </Text>
                      </View>
                    </View>
                  )
                )
              )}
            </View>
          </View>
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
    fontSize: 27,
    fontWeight: "900",
  },

  metricLabel: {
    marginTop: 5,
    fontSize: 11.5,
    fontWeight: "700",
  },

  reportShortcut: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 21,
    padding: 16,
    marginBottom: 20,
  },

  reportShortcutIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  reportShortcutTextArea: {
    flex: 1,
    paddingRight: 10,
  },

  reportShortcutTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  reportShortcutText: {
    marginTop: 5,
    fontSize: 11.5,
    lineHeight: 17,
  },

  sectionCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },

  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
  },

  chartArea: {
    height: 220,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 18,
  },

  barColumn: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 3,
  },

  barValue: {
    fontSize: 8.5,
    fontWeight: "700",
    marginBottom: 6,
  },

  barTrack: {
    width: "72%",
    height: 155,
    borderRadius: 10,
    justifyContent: "flex-end",
    overflow: "hidden",
  },

  barFill: {
    width: "100%",
    borderRadius: 10,
  },

  barLabel: {
    marginTop: 8,
    fontSize: 9,
    fontWeight: "800",
  },

  twoColumnGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 18,
  },

  halfCard: {
    flexGrow: 1,
    flexBasis: 340,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },

  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingVertical: 14,
  },

  dataRowTitle: {
    fontSize: 12.5,
    fontWeight: "900",
  },

  dataRowMeta: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
  },

  dataRowValue: {
    fontSize: 15,
    fontWeight: "900",
  },

  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: 13,
  },

  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  rankText: {
    fontSize: 13,
    fontWeight: "900",
  },

  rankingTextArea: {
    flex: 1,
  },

  rankingTitle: {
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "900",
  },

  rankingMeta: {
    marginTop: 4,
    fontSize: 9.5,
    fontWeight: "600",
  },

  emptyText: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
  },
});
