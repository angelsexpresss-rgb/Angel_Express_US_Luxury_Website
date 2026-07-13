import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  RefreshControl,
  ScrollView,
  Share,
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
  driver_name?: string | null;
  assigned_driver_name?: string | null;
  passenger_name?: string | null;
  name?: string | null;
  pickup?: string | null;
  pickup_address?: string | null;
  dropoff?: string | null;
  dropoff_address?: string | null;
  total?: number | string | null;
  total_fare?: number | string | null;
  total_price?: number | string | null;
  price?: number | string | null;
  fare?: number | string | null;
  student_verified?: boolean | null;
  is_student?: boolean | null;
  student_discount?: number | string | null;
};

type DriverRecord = GenericRecord & {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  rating?: number | string | null;
  total_trips?: number | null;
  is_online?: boolean | null;
};

type ReportType =
  | "daily"
  | "weekly"
  | "monthly"
  | "finance"
  | "drivers"
  | "passengers"
  | "students"
  | "safety"
  | "support"
  | "payments"
  | "payouts";

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

function driverName(driver: DriverRecord) {
  return (
    `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
    driver.full_name ||
    "Driver"
  );
}

function bookingDriverName(booking: BookingRecord) {
  return (
    booking.assigned_driver_name ||
    booking.driver_name ||
    "Not assigned"
  );
}

export default function OwnerReportsScreen() {
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

  const [selectedReport, setSelectedReport] =
    useState<ReportType>("daily");

  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

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
        console.log(`${table} reports skipped:`, error.message);
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  }

  async function loadReports(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const [
        bookingRows,
        driverRows,
        passengerRows,
        profileRows,
        alertRows,
        supportRows,
        driverSupportRows,
        studentRows,
      ] = await Promise.all([
        safeRows("bookings", "created_at"),
        safeRows("drivers", "created_at"),
        safeRows("passengers", "created_at"),
        safeRows("passenger_profiles", "created_at"),
        safeRows("emergency_alerts", "created_at"),
        safeRows("support_messages", "created_at"),
        safeRows("driver_support_messages", "created_at"),
        safeRows("student_verifications", "created_at"),
      ]);

      setBookings(bookingRows);
      setDrivers(driverRows);
      setPassengers([...passengerRows, ...profileRows]);
      setAlerts(alertRows);
      setSupportMessages(supportRows);
      setDriverSupportMessages(driverSupportRows);
      setStudentVerifications(studentRows);
    } catch (error: any) {
      Alert.alert(
        "Reports Error",
        error?.message || "Unable to load reports."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const uniquePassengers = useMemo(() => {
    const map = new Map<string, GenericRecord>();

    passengers.forEach((passenger) => {
      const key = String(
        passenger.user_id ||
          passenger.id ||
          passenger.passenger_id ||
          passenger.email ||
          ""
      );

      if (key) map.set(key, passenger);
    });

    return Array.from(map.values());
  }, [passengers]);

  function dateRangeDays(days: number) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    return bookings.filter((booking) => {
      const raw =
        booking.completed_at || booking.created_at;

      if (!raw) return false;

      const date = new Date(raw);

      return (
        !Number.isNaN(date.getTime()) &&
        date >= start
      );
    });
  }

  const report = useMemo(() => {
    const completed = bookings.filter(isCompleted);
    const cancelled = bookings.filter(isCancelled);
    const paid = bookings.filter(isPaid);
    const unpaid = bookings.filter(
      (booking) => !isPaid(booking)
    );
    const studentTrips = bookings.filter(isStudentRide);

    const daily = dateRangeDays(1);
    const weekly = dateRangeDays(7);
    const monthly = dateRangeDays(30);

    const pendingPayouts = bookings.filter(
      (booking) =>
        !["paid", "completed"].includes(
          normalize(
            booking.driver_payout_status ||
              booking.payout_status
          )
        )
    );

    const openAlerts = alerts.filter(
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

    const pendingStudents =
      studentVerifications.filter((item) =>
        ["pending", "pendingreview", "submitted"].includes(
          normalize(item.status)
        )
      );

    const approvedStudents =
      studentVerifications.filter(
        (item) =>
          item.student_verified === true ||
          ["approved", "verified"].includes(
            normalize(item.status)
          )
      );

    return {
      completed,
      cancelled,
      paid,
      unpaid,
      studentTrips,
      daily,
      weekly,
      monthly,
      pendingPayouts,
      openAlerts,
      openSupport,
      pendingStudents,
      approvedStudents,
    };
  }, [
    bookings,
    alerts,
    supportMessages,
    driverSupportMessages,
    studentVerifications,
  ]);

  const driverPerformance = useMemo(() => {
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

        return {
          name: driverName(driver),
          trips: trips.length,
          completed: trips.filter(isCompleted).length,
          revenue: trips.reduce(
            (sum, booking) => sum + fareOf(booking),
            0
          ),
          rating: Number(driver.rating || 5),
        };
      })
      .sort((a, b) => b.completed - a.completed);
  }, [drivers, bookings]);

  function reportTitle(type: ReportType) {
    const titles: Record<ReportType, string> = {
      daily: "Daily Operations Report",
      weekly: "Weekly Executive Report",
      monthly: "Monthly Business Report",
      finance: "Financial Performance Report",
      drivers: "Driver Performance Report",
      passengers: "Passenger Activity Report",
      students: "Student Operations Report",
      safety: "Safety Incident Report",
      support: "Support Operations Report",
      payments: "Outstanding Payments Report",
      payouts: "Driver Payout Report",
    };

    return titles[type];
  }

  function generateReportText(type: ReportType) {
    const generatedAt = new Date().toLocaleString();

    const header = [
      "ANGEL EXPRESS",
      reportTitle(type),
      `Generated: ${generatedAt}`,
      "",
    ];

    const revenue = (rows: BookingRecord[]) =>
      rows.reduce(
        (sum, booking) => sum + fareOf(booking),
        0
      );

    switch (type) {
      case "daily":
        return [
          ...header,
          `Trips today: ${report.daily.length}`,
          `Revenue today: ${money(revenue(report.daily))}`,
          `Completed today: ${
            report.daily.filter(isCompleted).length
          }`,
          `Cancelled today: ${
            report.daily.filter(isCancelled).length
          }`,
          `Paid today: ${
            report.daily.filter(isPaid).length
          }`,
          `Student rides today: ${
            report.daily.filter(isStudentRide).length
          }`,
        ].join("\n");

      case "weekly":
        return [
          ...header,
          `Trips in last 7 days: ${report.weekly.length}`,
          `Revenue in last 7 days: ${money(
            revenue(report.weekly)
          )}`,
          `Completed: ${
            report.weekly.filter(isCompleted).length
          }`,
          `Cancelled: ${
            report.weekly.filter(isCancelled).length
          }`,
          `Paid: ${report.weekly.filter(isPaid).length}`,
          `Student rides: ${
            report.weekly.filter(isStudentRide).length
          }`,
          `Open support cases: ${report.openSupport}`,
          `Open safety alerts: ${report.openAlerts.length}`,
        ].join("\n");

      case "monthly":
        return [
          ...header,
          `Trips in last 30 days: ${report.monthly.length}`,
          `Revenue in last 30 days: ${money(
            revenue(report.monthly)
          )}`,
          `Completed: ${
            report.monthly.filter(isCompleted).length
          }`,
          `Cancelled: ${
            report.monthly.filter(isCancelled).length
          }`,
          `Passengers: ${uniquePassengers.length}`,
          `Registered drivers: ${drivers.length}`,
          `Approved students: ${
            report.approvedStudents.length
          }`,
        ].join("\n");

      case "finance":
        return [
          ...header,
          `Lifetime revenue: ${money(revenue(bookings))}`,
          `Paid revenue: ${money(revenue(report.paid))}`,
          `Outstanding revenue: ${money(
            revenue(report.unpaid)
          )}`,
          `Company 30% estimate: ${money(
            revenue(bookings) * 0.3
          )}`,
          `Driver 70% estimate: ${money(
            revenue(bookings) * 0.7
          )}`,
          `Average fare: ${money(
            bookings.length
              ? revenue(bookings) / bookings.length
              : 0
          )}`,
        ].join("\n");

      case "drivers":
        return [
          ...header,
          `Registered drivers: ${drivers.length}`,
          `Drivers online: ${
            drivers.filter(
              (driver) => driver.is_online === true
            ).length
          }`,
          "",
          ...driverPerformance.slice(0, 10).map(
            (driver, index) =>
              `${index + 1}. ${driver.name} | ${
                driver.completed
              } completed | ${money(
                driver.revenue
              )} revenue | ${driver.rating.toFixed(
                1
              )} rating`
          ),
        ].join("\n");

      case "passengers":
        return [
          ...header,
          `Total passenger profiles: ${
            uniquePassengers.length
          }`,
          `Total trips: ${bookings.length}`,
          `Completed trips: ${report.completed.length}`,
          `Cancelled trips: ${report.cancelled.length}`,
          `Average trips per passenger: ${
            uniquePassengers.length
              ? (
                  bookings.length /
                  uniquePassengers.length
                ).toFixed(2)
              : "0.00"
          }`,
        ].join("\n");

      case "students":
        return [
          ...header,
          `Approved students: ${
            report.approvedStudents.length
          }`,
          `Pending verifications: ${
            report.pendingStudents.length
          }`,
          `Student rides: ${report.studentTrips.length}`,
          `Student ride revenue: ${money(
            revenue(report.studentTrips)
          )}`,
        ].join("\n");

      case "safety":
        return [
          ...header,
          `Total incidents: ${alerts.length}`,
          `Open incidents: ${report.openAlerts.length}`,
          `Resolved incidents: ${
            alerts.length - report.openAlerts.length
          }`,
          "",
          ...report.openAlerts.slice(0, 20).map(
            (alert, index) =>
              `${index + 1}. ${
                alert.alert_type || "Emergency Alert"
              } | Trip #${
                alert.booking_id || "Unknown"
              } | ${alert.notes || "No notes"}`
          ),
        ].join("\n");

      case "support":
        return [
          ...header,
          `Passenger support messages: ${
            supportMessages.length
          }`,
          `Driver support messages: ${
            driverSupportMessages.length
          }`,
          `Open support cases: ${report.openSupport}`,
        ].join("\n");

      case "payments":
        return [
          ...header,
          `Outstanding bookings: ${report.unpaid.length}`,
          `Outstanding amount: ${money(
            revenue(report.unpaid)
          )}`,
          "",
          ...report.unpaid.slice(0, 25).map(
            (booking) =>
              `Trip #${booking.id} | ${
                booking.passenger_name ||
                booking.name ||
                "Passenger"
              } | ${money(fareOf(booking))}`
          ),
        ].join("\n");

      case "payouts":
        return [
          ...header,
          `Pending payout bookings: ${
            report.pendingPayouts.length
          }`,
          `Estimated pending payout value: ${money(
            revenue(report.pendingPayouts) * 0.7
          )}`,
          "",
          ...report.pendingPayouts
            .slice(0, 25)
            .map(
              (booking) =>
                `Trip #${booking.id} | ${bookingDriverName(
                  booking
                )} | ${money(fareOf(booking) * 0.7)}`
            ),
        ].join("\n");

      default:
        return header.join("\n");
    }
  }

  const previewText = useMemo(
    () => generateReportText(selectedReport),
    [
      selectedReport,
      report,
      bookings,
      drivers,
      uniquePassengers,
      alerts,
      supportMessages,
      driverSupportMessages,
      driverPerformance,
    ]
  );

  async function shareReport() {
    await Share.share({
      title: reportTitle(selectedReport),
      message: previewText,
    });
  }

  const reportCards: {
    type: ReportType;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    {
      type: "daily",
      title: "Daily Operations",
      description: "Trips, revenue, payments, and student rides today.",
      icon: "today-outline",
    },
    {
      type: "weekly",
      title: "Weekly Executive",
      description: "Seven-day business performance and operational risks.",
      icon: "calendar-outline",
    },
    {
      type: "monthly",
      title: "Monthly Business",
      description: "Thirty-day growth, passenger, driver, and revenue summary.",
      icon: "bar-chart-outline",
    },
    {
      type: "finance",
      title: "Financial Performance",
      description: "Revenue, company share, driver share, and outstanding balances.",
      icon: "cash-outline",
    },
    {
      type: "drivers",
      title: "Driver Performance",
      description: "Completed trips, revenue, ratings, and driver ranking.",
      icon: "car-outline",
    },
    {
      type: "passengers",
      title: "Passenger Activity",
      description: "Passenger growth, trips, and cancellation behavior.",
      icon: "people-outline",
    },
    {
      type: "students",
      title: "Student Operations",
      description: "Approved students, pending reviews, and student rides.",
      icon: "school-outline",
    },
    {
      type: "safety",
      title: "Safety Incidents",
      description: "Open, resolved, and recent emergency incidents.",
      icon: "warning-outline",
    },
    {
      type: "support",
      title: "Support Operations",
      description: "Passenger and driver support workload.",
      icon: "headset-outline",
    },
    {
      type: "payments",
      title: "Outstanding Payments",
      description: "Unpaid bookings and outstanding revenue.",
      icon: "card-outline",
    },
    {
      type: "payouts",
      title: "Driver Payouts",
      description: "Pending driver payout obligations.",
      icon: "wallet-outline",
    },
  ];

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
          Loading Executive Reports...
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
                await loadReports(false);
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
                ANGEL EXPRESS EXECUTIVE REPORTING
              </Text>

              <Text
                style={[
                  styles.pageTitle,
                  { color: theme.colors.text },
                ]}
              >
                Reports Center
              </Text>

              <Text
                style={[
                  styles.pageSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Generate and share daily, weekly, monthly, financial,
                driver, passenger, student, safety, support, payment,
                and payout reports.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.analyticsShortcut,
              {
                backgroundColor: theme.colors.infoSoft,
                borderColor: theme.colors.info,
              },
            ]}
            onPress={() => router.push("/owner-analytics")}
          >
            <Ionicons
              name="analytics-outline"
              size={22}
              color={theme.colors.info}
            />

            <View style={styles.analyticsShortcutTextArea}>
              <Text
                style={[
                  styles.analyticsShortcutTitle,
                  { color: theme.colors.text },
                ]}
              >
                Back to Analytics
              </Text>

              <Text
                style={[
                  styles.analyticsShortcutText,
                  { color: theme.colors.textMuted },
                ]}
              >
                Review live KPIs, revenue trends, routes, and driver rankings.
              </Text>
            </View>

            <Ionicons
              name="arrow-forward"
              size={20}
              color={theme.colors.info}
            />
          </TouchableOpacity>

          <View style={styles.reportGrid}>
            {reportCards.map((card) => {
              const selected =
                selectedReport === card.type;

              return (
                <TouchableOpacity
                  key={card.type}
                  activeOpacity={0.86}
                  style={[
                    styles.reportCard,
                    {
                      width: isLarge ? "31.8%" : "100%",
                      backgroundColor: selected
                        ? theme.colors.goldTransparent
                        : theme.colors.card,
                      borderColor: selected
                        ? theme.colors.gold
                        : theme.colors.cardBorder,
                    },
                    theme.shadows.soft,
                  ]}
                  onPress={() =>
                    setSelectedReport(card.type)
                  }
                >
                  <View
                    style={[
                      styles.reportIcon,
                      {
                        backgroundColor: selected
                          ? theme.colors.goldTransparent
                          : theme.colors.surfaceSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={card.icon}
                      size={22}
                      color={
                        selected
                          ? theme.colors.gold
                          : theme.colors.info
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.reportCardTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    {card.title}
                  </Text>

                  <Text
                    style={[
                      styles.reportCardText,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {card.description}
                  </Text>

                  {selected ? (
                    <View
                      style={[
                        styles.selectedBadge,
                        {
                          backgroundColor:
                            theme.colors.gold,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectedBadgeText,
                          {
                            color:
                              theme.colors.textInverse,
                          },
                        ]}
                      >
                        Selected
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorderStrong,
              },
              theme.shadows.premium,
            ]}
          >
            <View style={styles.previewHeader}>
              <View>
                <Text
                  style={[
                    styles.previewEyebrow,
                    { color: theme.colors.gold },
                  ]}
                >
                  REPORT PREVIEW
                </Text>

                <Text
                  style={[
                    styles.previewTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {reportTitle(selectedReport)}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.shareButton,
                  {
                    backgroundColor: theme.colors.gold,
                  },
                ]}
                onPress={shareReport}
              >
                <Ionicons
                  name="share-social-outline"
                  size={18}
                  color={theme.colors.textInverse}
                />
                <Text
                  style={[
                    styles.shareButtonText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  Share
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.reportTextBox,
                {
                  backgroundColor:
                    theme.colors.surfaceSoft,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Text
                selectable
                style={[
                  styles.reportText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {previewText}
              </Text>
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

  analyticsShortcut: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },

  analyticsShortcutTextArea: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 10,
  },

  analyticsShortcutTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  analyticsShortcutText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
  },

  reportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  reportCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 17,
    marginBottom: 14,
  },

  reportIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  reportCardTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  reportCardText: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 17,
  },

  selectedBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 13,
  },

  selectedBadgeText: {
    fontSize: 9,
    fontWeight: "900",
  },

  previewCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },

  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  previewEyebrow: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  previewTitle: {
    marginTop: 5,
    fontSize: 20,
    fontWeight: "900",
  },

  shareButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
  },

  shareButtonText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "900",
  },

  reportTextBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },

  reportText: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "600",
  },
});
