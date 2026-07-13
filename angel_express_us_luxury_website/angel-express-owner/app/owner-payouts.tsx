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
  payment_status?: string | null;
  driver_payout_status?: string | null;
  payout_status?: string | null;
  driver_id?: string | null;
  assigned_driver_id?: string | null;
  driver_name?: string | null;
  assigned_driver_name?: string | null;
  total?: number | string | null;
  total_fare?: number | string | null;
  total_price?: number | string | null;
  price?: number | string | null;
  fare?: number | string | null;
  driver_share?: number | string | null;
};

type DriverRecord = GenericRecord & {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean | null;
  payout_status?: string | null;
  payout_method?: string | null;
  zelle?: string | null;
  cash_app?: string | null;
};

type PayoutFilter =
  | "all"
  | "pending"
  | "paid"
  | "stripe"
  | "zelle"
  | "cashapp";

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

function payoutOf(booking: BookingRecord) {
  return Number(
    booking.driver_share ?? fareOf(booking) * 0.7
  );
}

function isPayoutPaid(booking: BookingRecord) {
  return ["paid", "completed", "driverpaid"].includes(
    normalize(
      booking.driver_payout_status ||
        booking.payout_status
    )
  );
}

function driverName(driver?: DriverRecord | null) {
  if (!driver) return "Driver";

  return (
    `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
    driver.full_name ||
    driver.email ||
    "Driver"
  );
}

export default function OwnerPayoutsScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] =
    useState<string | number | null>(null);

  const [bookings, setBookings] =
    useState<BookingRecord[]>([]);
  const [drivers, setDrivers] =
    useState<DriverRecord[]>([]);
  const [filter, setFilter] =
    useState<PayoutFilter>("all");

  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadPayouts();
    }, [])
  );

  async function loadPayouts(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const [bookingResponse, driverResponse] =
        await Promise.all([
          supabase
            .from("bookings")
            .select("*")
            .order("created_at", {
              ascending: false,
            }),

          supabase.from("drivers").select("*"),
        ]);

      if (bookingResponse.error) {
        throw bookingResponse.error;
      }

      if (driverResponse.error) {
        throw driverResponse.error;
      }

      setBookings(bookingResponse.data || []);
      setDrivers(driverResponse.data || []);
    } catch (error: any) {
      Alert.alert(
        "Payout Center Error",
        error?.message || "Unable to load payout data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function driverFor(booking: BookingRecord) {
    const id =
      booking.driver_id ||
      booking.assigned_driver_id;

    return drivers.find(
      (driver) => String(driver.id) === String(id || "")
    );
  }

  async function updatePayout(
    booking: BookingRecord,
    paid: boolean
  ) {
    try {
      setUpdatingId(booking.id);

      const candidates = paid
        ? [
            { driver_payout_status: "paid" },
            { payout_status: "paid" },
          ]
        : [
            { driver_payout_status: "pending" },
            { payout_status: "pending" },
          ];

      let lastError: any = null;
      let applied: GenericRecord | null = null;

      for (const candidate of candidates) {
        const { error } = await supabase
          .from("bookings")
          .update(candidate)
          .eq("id", booking.id);

        if (!error) {
          applied = candidate;
          lastError = null;
          break;
        }

        lastError = error;
      }

      if (lastError || !applied) {
        throw lastError || new Error("No payout column found.");
      }

      setBookings((current) =>
        current.map((item) =>
          String(item.id) === String(booking.id)
            ? { ...item, ...applied }
            : item
        )
      );

      Alert.alert(
        "Payout Updated",
        paid
          ? "Driver payout marked as paid."
          : "Driver payout returned to pending."
      );
    } catch (error: any) {
      Alert.alert(
        "Update Failed",
        error?.message || "Unable to update payout."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const eligibleBookings = useMemo(() => {
    return bookings.filter(
      (booking) =>
        normalize(booking.status) === "completed" ||
        normalize(booking.payment_status) === "paid"
    );
  }, [bookings]);

  const summary = useMemo(() => {
    const paid = eligibleBookings.filter(isPayoutPaid);
    const pending = eligibleBookings.filter(
      (booking) => !isPayoutPaid(booking)
    );

    return {
      paid,
      pending,
      total: eligibleBookings.reduce(
        (sum, booking) => sum + payoutOf(booking),
        0
      ),
      paidValue: paid.reduce(
        (sum, booking) => sum + payoutOf(booking),
        0
      ),
      pendingValue: pending.reduce(
        (sum, booking) => sum + payoutOf(booking),
        0
      ),
    };
  }, [eligibleBookings]);

  const filtered = useMemo(() => {
    return eligibleBookings.filter((booking) => {
      const driver = driverFor(booking);

      switch (filter) {
        case "pending":
          return !isPayoutPaid(booking);
        case "paid":
          return isPayoutPaid(booking);
        case "stripe":
          return normalize(driver?.payout_method).includes("stripe");
        case "zelle":
          return normalize(driver?.payout_method).includes("zelle");
        case "cashapp":
          return normalize(driver?.payout_method).includes("cashapp");
        case "all":
        default:
          return true;
      }
    });
  }, [eligibleBookings, filter, drivers]);

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
          Loading Driver Payout Center...
        </Text>
      </View>
    );
  }

  const filters: {
    key: PayoutFilter;
    label: string;
    count: number;
  }[] = [
    {
      key: "all",
      label: "All",
      count: eligibleBookings.length,
    },
    {
      key: "pending",
      label: "Pending",
      count: summary.pending.length,
    },
    {
      key: "paid",
      label: "Paid",
      count: summary.paid.length,
    },
    {
      key: "stripe",
      label: "Stripe",
      count: eligibleBookings.filter((booking) =>
        normalize(driverFor(booking)?.payout_method).includes(
          "stripe"
        )
      ).length,
    },
    {
      key: "zelle",
      label: "Zelle",
      count: eligibleBookings.filter((booking) =>
        normalize(driverFor(booking)?.payout_method).includes(
          "zelle"
        )
      ).length,
    },
    {
      key: "cashapp",
      label: "Cash App",
      count: eligibleBookings.filter((booking) =>
        normalize(driverFor(booking)?.payout_method).includes(
          "cashapp"
        )
      ).length,
    },
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
                await loadPayouts(false);
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
                ANGEL EXPRESS DRIVER FINANCE
              </Text>
              <Text
                style={[
                  styles.pageTitle,
                  { color: theme.colors.text },
                ]}
              >
                Driver Payout Center
              </Text>
              <Text
                style={[
                  styles.pageSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Review eligible trips, payout obligations, driver
                payment methods, pending payouts, and completed payouts.
              </Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            {[
              [
                "Total Obligations",
                money(summary.total),
                theme.colors.gold,
                theme.colors.goldTransparent,
              ],
              [
                "Pending Payouts",
                money(summary.pendingValue),
                theme.colors.warning,
                theme.colors.warningSoft,
              ],
              [
                "Completed Payouts",
                money(summary.paidValue),
                theme.colors.success,
                theme.colors.successSoft,
              ],
              [
                "Eligible Trips",
                eligibleBookings.length,
                theme.colors.info,
                theme.colors.infoSoft,
              ],
            ].map(([label, value, color, background]) => (
              <View
                key={String(label)}
                style={[
                  styles.metricCard,
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
                    styles.metricIcon,
                    { backgroundColor: String(background) },
                  ]}
                >
                  <Ionicons
                    name="wallet-outline"
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

          <View
            style={[
              styles.filterPanel,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorderStrong,
              },
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

          <View style={styles.payoutGrid}>
            {filtered.map((booking) => {
              const driver = driverFor(booking);
              const paid = isPayoutPaid(booking);
              const updating =
                String(updatingId) === String(booking.id);

              return (
                <View
                  key={String(booking.id)}
                  style={[
                    styles.payoutCard,
                    {
                      width: isLarge ? "48.8%" : "100%",
                      backgroundColor: theme.colors.card,
                      borderColor: paid
                        ? theme.colors.success
                        : theme.colors.warning,
                    },
                    theme.shadows.soft,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.driverAvatar,
                        {
                          backgroundColor:
                            theme.colors.goldTransparent,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.driverAvatarText,
                          { color: theme.colors.gold },
                        ]}
                      >
                        {driverName(driver)
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.cardTitleArea}>
                      <Text
                        style={[
                          styles.driverName,
                          { color: theme.colors.text },
                        ]}
                      >
                        {driverName(driver)}
                      </Text>
                      <Text
                        style={[
                          styles.tripMeta,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        Trip #{booking.id}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: paid
                            ? theme.colors.successSoft
                            : theme.colors.warningSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: paid
                              ? theme.colors.success
                              : theme.colors.warning,
                          },
                        ]}
                      >
                        {paid ? "Paid" : "Pending"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.amountRow}>
                    <View>
                      <Text
                        style={[
                          styles.amountLabel,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        DRIVER PAYOUT
                      </Text>
                      <Text
                        style={[
                          styles.amountValue,
                          { color: theme.colors.gold },
                        ]}
                      >
                        {money(payoutOf(booking))}
                      </Text>
                    </View>

                    <View>
                      <Text
                        style={[
                          styles.amountLabel,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        TRIP FARE
                      </Text>
                      <Text
                        style={[
                          styles.amountSecondary,
                          { color: theme.colors.text },
                        ]}
                      >
                        {money(fareOf(booking))}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.driverDetails}>
                    {[
                      [
                        "Payout Method",
                        driver?.payout_method || "Not set",
                      ],
                      [
                        "Stripe",
                        driver?.stripe_onboarding_complete
                          ? "Connected"
                          : "Not connected",
                      ],
                      ["Zelle", driver?.zelle || "Not set"],
                      [
                        "Cash App",
                        driver?.cash_app || "Not set",
                      ],
                    ].map(([label, value]) => (
                      <View
                        key={label}
                        style={[
                          styles.detailRow,
                          {
                            borderBottomColor:
                              theme.colors.divider,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.detailLabel,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {label}
                        </Text>
                        <Text
                          style={[
                            styles.detailValue,
                            { color: theme.colors.text },
                          ]}
                        >
                          {value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.payoutButton,
                      {
                        backgroundColor: paid
                          ? theme.colors.warningSoft
                          : theme.colors.success,
                        borderColor: paid
                          ? theme.colors.warning
                          : theme.colors.success,
                      },
                    ]}
                    disabled={updating}
                    onPress={() =>
                      updatePayout(booking, !paid)
                    }
                  >
                    {updating ? (
                      <ActivityIndicator
                        color={
                          paid
                            ? theme.colors.warning
                            : "#ffffff"
                        }
                      />
                    ) : (
                      <>
                        <Ionicons
                          name={
                            paid
                              ? "refresh-outline"
                              : "checkmark-done-outline"
                          }
                          size={18}
                          color={
                            paid
                              ? theme.colors.warning
                              : "#ffffff"
                          }
                        />
                        <Text
                          style={[
                            styles.payoutButtonText,
                            {
                              color: paid
                                ? theme.colors.warning
                                : "#ffffff",
                            },
                          ]}
                        >
                          {paid
                            ? "Return to Pending"
                            : "Mark Payout Paid"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
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
    fontSize: 25,
    fontWeight: "900",
  },
  metricLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: "700",
  },
  filterPanel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 13,
    marginBottom: 18,
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
  payoutGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  payoutCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 17,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  driverAvatarText: {
    fontSize: 20,
    fontWeight: "900",
  },
  cardTitleArea: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: "900",
  },
  tripMeta: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: {
    fontSize: 8.5,
    fontWeight: "900",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  amountLabel: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  amountValue: {
    marginTop: 5,
    fontSize: 23,
    fontWeight: "900",
  },
  amountSecondary: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
  },
  driverDetails: {
    marginTop: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingVertical: 11,
  },
  detailLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
  },
  detailValue: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: "900",
    textAlign: "right",
  },
  payoutButton: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 15,
    marginTop: 15,
  },
  payoutButtonText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "900",
  },
});
