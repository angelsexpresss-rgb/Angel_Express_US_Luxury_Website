import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
  total?: number | string | null;
  total_fare?: number | string | null;
  total_price?: number | string | null;
  price?: number | string | null;
  fare?: number | string | null;
  driver_share?: number | string | null;
  company_share?: number | string | null;
  tip?: number | string | null;
  taxes?: number | string | null;
  discount?: number | string | null;
  promo_discount?: number | string | null;
  student_discount?: number | string | null;
  refund_amount?: number | string | null;
  payment_method?: string | null;
};

type RangeKey = "today" | "week" | "month" | "all";

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

function isPaid(booking: BookingRecord) {
  return normalize(booking.payment_status) === "paid";
}

function bookingDate(booking: BookingRecord) {
  const raw = booking.completed_at || booking.created_at;
  if (!raw) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function OwnerRevenueScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] =
    useState<BookingRecord[]>([]);
  const [range, setRange] = useState<RangeKey>("month");

  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadRevenue();
    }, [])
  );

  async function loadRevenue(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBookings(data || []);
    } catch (error: any) {
      Alert.alert(
        "Revenue Error",
        error?.message || "Unable to load revenue data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    if (range === "all") return bookings;

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (range === "today") {
      return bookings.filter((booking) => {
        const date = bookingDate(booking);
        return date && date >= start;
      });
    }

    const days = range === "week" ? 7 : 30;
    start.setDate(start.getDate() - (days - 1));

    return bookings.filter((booking) => {
      const date = bookingDate(booking);
      return date && date >= start;
    });
  }, [bookings, range]);

  const summary = useMemo(() => {
    const gross = filtered.reduce(
      (sum, booking) => sum + fareOf(booking),
      0
    );
    const paidRevenue = filtered
      .filter(isPaid)
      .reduce((sum, booking) => sum + fareOf(booking), 0);
    const outstanding = filtered
      .filter((booking) => !isPaid(booking))
      .reduce((sum, booking) => sum + fareOf(booking), 0);
    const companyShare = filtered.reduce(
      (sum, booking) => sum + companyShareOf(booking),
      0
    );
    const driverShare = filtered.reduce(
      (sum, booking) => sum + driverShareOf(booking),
      0
    );
    const tips = filtered.reduce(
      (sum, booking) => sum + Number(booking.tip || 0),
      0
    );
    const taxes = filtered.reduce(
      (sum, booking) => sum + Number(booking.taxes || 0),
      0
    );
    const discounts = filtered.reduce(
      (sum, booking) =>
        sum +
        Number(
          booking.discount ||
            booking.promo_discount ||
            booking.student_discount ||
            0
        ),
      0
    );
    const refunds = filtered.reduce(
      (sum, booking) =>
        sum + Number(booking.refund_amount || 0),
      0
    );

    return {
      gross,
      paidRevenue,
      outstanding,
      companyShare,
      driverShare,
      tips,
      taxes,
      discounts,
      refunds,
      averageFare:
        filtered.length > 0 ? gross / filtered.length : 0,
      collectionRate:
        filtered.length > 0
          ? (filtered.filter(isPaid).length /
              filtered.length) *
            100
          : 0,
    };
  }, [filtered]);

  const sourceData = useMemo(() => {
    const website = filtered.filter((booking) =>
      normalize(booking.source).includes("website")
    );
    const app = filtered.filter((booking) =>
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
  }, [filtered]);

  const paymentMethods = useMemo(() => {
    const map = new Map<
      string,
      { trips: number; revenue: number }
    >();

    filtered.forEach((booking) => {
      const method = booking.payment_method || "Unspecified";
      const current = map.get(method) || {
        trips: 0,
        revenue: 0,
      };

      map.set(method, {
        trips: current.trips + 1,
        revenue: current.revenue + fareOf(booking),
      });
    });

    return Array.from(map.entries())
      .map(([method, data]) => ({
        method,
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  function metricWidth() {
    if (isLarge) return "23.5%";
    return "48%";
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
          Loading Revenue Center...
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
                await loadRevenue(false);
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
                ANGEL EXPRESS FINANCIAL INTELLIGENCE
              </Text>
              <Text
                style={[
                  styles.pageTitle,
                  { color: theme.colors.text },
                ]}
              >
                Revenue Center
              </Text>
              <Text
                style={[
                  styles.pageSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Review gross revenue, paid revenue, company share,
                driver share, discounts, refunds, tips, taxes, and
                booking-source performance.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.rangePanel,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorderStrong,
              },
            ]}
          >
            {[
              ["today", "Today"],
              ["week", "7 Days"],
              ["month", "30 Days"],
              ["all", "All Time"],
            ].map(([key, label]) => {
              const selected = range === key;

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.rangeButton,
                    {
                      backgroundColor: selected
                        ? theme.colors.goldTransparent
                        : theme.colors.surfaceSoft,
                      borderColor: selected
                        ? theme.colors.gold
                        : theme.colors.cardBorder,
                    },
                  ]}
                  onPress={() => setRange(key as RangeKey)}
                >
                  <Text
                    style={[
                      styles.rangeText,
                      {
                        color: selected
                          ? theme.colors.gold
                          : theme.colors.textMuted,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.metricGrid}>
            {[
              [
                "Gross Revenue",
                money(summary.gross),
                "cash-outline",
                theme.colors.gold,
                theme.colors.goldTransparent,
              ],
              [
                "Paid Revenue",
                money(summary.paidRevenue),
                "checkmark-circle-outline",
                theme.colors.success,
                theme.colors.successSoft,
              ],
              [
                "Outstanding",
                money(summary.outstanding),
                "time-outline",
                theme.colors.warning,
                theme.colors.warningSoft,
              ],
              [
                "Company Share",
                money(summary.companyShare),
                "business-outline",
                theme.colors.info,
                theme.colors.infoSoft,
              ],
              [
                "Driver Share",
                money(summary.driverShare),
                "car-outline",
                theme.colors.success,
                theme.colors.successSoft,
              ],
              [
                "Average Fare",
                money(summary.averageFare),
                "analytics-outline",
                theme.colors.gold,
                theme.colors.goldTransparent,
              ],
              [
                "Collection Rate",
                `${Math.round(summary.collectionRate)}%`,
                "card-outline",
                theme.colors.info,
                theme.colors.infoSoft,
              ],
              [
                "Refunds",
                money(summary.refunds),
                "return-down-back-outline",
                theme.colors.danger,
                theme.colors.dangerSoft,
              ],
            ].map(([label, value, icon, color, background]) => (
              <View
                key={String(label)}
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
                    { backgroundColor: String(background) },
                  ]}
                >
                  <Ionicons
                    name={icon as any}
                    size={21}
                    color={String(color)}
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
            ))}
          </View>

          <View style={styles.twoColumnGrid}>
            <View
              style={[
                styles.sectionCard,
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
                BOOKING SOURCES
              </Text>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text },
                ]}
              >
                Revenue by Channel
              </Text>

              {sourceData.map((item) => (
                <View
                  key={item.label}
                  style={[
                    styles.dataRow,
                    { borderBottomColor: theme.colors.divider },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.dataTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.dataMeta,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {item.trips} trips
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.dataValue,
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
                styles.sectionCard,
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
                PAYMENT CHANNELS
              </Text>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text },
                ]}
              >
                Payment Method Performance
              </Text>

              {paymentMethods.length === 0 ? (
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  No payment methods recorded.
                </Text>
              ) : (
                paymentMethods.map((item) => (
                  <View
                    key={item.method}
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
                          styles.dataTitle,
                          { color: theme.colors.text },
                        ]}
                      >
                        {item.method}
                      </Text>
                      <Text
                        style={[
                          styles.dataMeta,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {item.trips} trips
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.dataValue,
                        { color: theme.colors.info },
                      ]}
                    >
                      {money(item.revenue)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <View
            style={[
              styles.detailStrip,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorderStrong,
              },
            ]}
          >
            {[
              ["Tips", money(summary.tips)],
              ["Taxes", money(summary.taxes)],
              ["Discounts", money(summary.discounts)],
              ["Trips", filtered.length],
            ].map(([label, value]) => (
              <View key={String(label)} style={styles.detailItem}>
                <Text
                  style={[
                    styles.detailValue,
                    { color: theme.colors.text },
                  ]}
                >
                  {value}
                </Text>
                <Text
                  style={[
                    styles.detailLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
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
  rangePanel: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    marginBottom: 18,
  },
  rangeButton: {
    flexGrow: 1,
    minWidth: 90,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  rangeText: {
    fontSize: 10.5,
    fontWeight: "900",
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
    fontSize: 25,
    fontWeight: "900",
  },
  metricLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: "700",
  },
  twoColumnGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 18,
  },
  sectionCard: {
    flexGrow: 1,
    flexBasis: 340,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  sectionEyebrow: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  sectionTitle: {
    marginTop: 5,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 10,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingVertical: 13,
  },
  dataTitle: {
    fontSize: 12,
    fontWeight: "900",
  },
  dataMeta: {
    marginTop: 4,
    fontSize: 9.5,
    fontWeight: "600",
  },
  dataValue: {
    fontSize: 14,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 14,
    fontSize: 11.5,
  },
  detailStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  detailItem: {
    width: "25%",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  detailLabel: {
    marginTop: 5,
    fontSize: 9.5,
    fontWeight: "700",
  },
});
