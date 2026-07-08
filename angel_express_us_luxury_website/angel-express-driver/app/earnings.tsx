import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
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
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import {
  getCompanyShareAmount,
  getDriverPayoutAmount,
  getDropoffValue,
  getPassengerNameValue,
  getPickupValue,
  getTripMilesValue,
  getTripTotal,
  useDriverTheme,
  v5Shadow,
} from "../lib/driverTheme";

type PeriodType = "weekly" | "monthly" | "yearly";

export default function EarningsScreen() {
  const { colors } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [driver, setDriver] = useState<any>(null);
  const [completedTrips, setCompletedTrips] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("weekly");
  const [showBreakdown, setShowBreakdown] = useState(true);

  useEffect(() => {
    loadEarnings();
  }, []);

  async function loadEarnings(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
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
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (driverError) throw driverError;

      setDriver(driverData);

      const { data: tripsData, error: tripsError } = await supabase
        .from("bookings")
        .select("*")
        .or(`driver_id.eq.${user.id},assigned_driver_id.eq.${user.id}`)
        .in("status", ["completed", "Completed"])
        .order("completed_at", { ascending: false, nullsFirst: false });

      if (tripsError) throw tripsError;

      setCompletedTrips(tripsData || []);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load earnings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getTripDate(trip: any) {
    return new Date(trip.completed_at || trip.created_at);
  }

  function getStartDate(period: PeriodType) {
    const now = new Date();

    if (period === "weekly") {
      const start = new Date(now);
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      return start;
    }

    if (period === "monthly") {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return new Date(now.getFullYear(), 0, 1);
  }

  function getPeriodTitle(period: PeriodType) {
    if (period === "weekly") return "This Week";
    if (period === "monthly") return "This Month";
    return "This Year";
  }

  const filteredTrips = useMemo(() => {
    const startDate = getStartDate(selectedPeriod);

    return completedTrips.filter((trip) => {
      const tripDate = getTripDate(trip);

      if (Number.isNaN(tripDate.getTime())) return false;

      return tripDate >= startDate;
    });
  }, [completedTrips, selectedPeriod]);

  const periodRevenue = filteredTrips.reduce((sum, trip) => {
    return sum + getTripTotal(trip);
  }, 0);

  const periodDriverPayout = filteredTrips.reduce((sum, trip) => {
    return sum + getDriverPayoutAmount(trip);
  }, 0);

  const periodCompanyShare = filteredTrips.reduce((sum, trip) => {
    return sum + getCompanyShareAmount(trip);
  }, 0);

  const periodMiles = filteredTrips.reduce((sum, trip) => {
    return sum + getTripMilesValue(trip);
  }, 0);

  const lifetimeRevenue = completedTrips.reduce((sum, trip) => {
    return sum + getTripTotal(trip);
  }, 0);

  const lifetimeDriverPayout = completedTrips.reduce((sum, trip) => {
    return sum + getDriverPayoutAmount(trip);
  }, 0);

  const lifetimeCompanyShare = completedTrips.reduce((sum, trip) => {
    return sum + getCompanyShareAmount(trip);
  }, 0);

  const lifetimeMiles = completedTrips.reduce((sum, trip) => {
    return sum + getTripMilesValue(trip);
  }, 0);

  function cleanCSVValue(value: any) {
    const text = String(value ?? "").replace(/"/g, '""');
    return `"${text}"`;
  }

  async function exportCSV() {
    try {
      const summaryRows = [
        ["Summary", "", "", "", "", "", "", "", "", ""],
        ["Period", getPeriodTitle(selectedPeriod), "", "", "", "", "", "", "", ""],
        ["Total Trips", filteredTrips.length, "", "", "", "", "", "", "", ""],
        ["Total Miles", periodMiles.toFixed(2), "", "", "", "", "", "", "", ""],
        ["Total Revenue", periodRevenue.toFixed(2), "", "", "", "", "", "", "", ""],
        [
          "Driver Payout",
          periodDriverPayout.toFixed(2),
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ],
        [
          "Company Share",
          periodCompanyShare.toFixed(2),
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ],
        ["", "", "", "", "", "", "", "", "", ""],
      ].map((row) => row.map(cleanCSVValue).join(","));

      const header = [
        "Trip ID",
        "Date",
        "Passenger",
        "Pickup",
        "Dropoff",
        "Miles",
        "Trip Total",
        "Driver Payout",
        "Company Share",
        "Status",
      ]
        .map(cleanCSVValue)
        .join(",");

      const tripRows = filteredTrips.map((trip) => {
        const tripAmount = getTripTotal(trip);
        const payout = getDriverPayoutAmount(trip);
        const companyShare = getCompanyShareAmount(trip);
        const miles = getTripMilesValue(trip);
        const tripDate = getTripDate(trip);

        return [
          trip.id,
          Number.isNaN(tripDate.getTime()) ? "" : tripDate.toLocaleDateString(),
          getPassengerNameValue(trip),
          getPickupValue(trip),
          getDropoffValue(trip),
          miles.toFixed(2),
          tripAmount.toFixed(2),
          payout.toFixed(2),
          companyShare.toFixed(2),
          trip.status || "completed",
        ]
          .map(cleanCSVValue)
          .join(",");
      });

      const csvContent = [...summaryRows, header, ...tripRows].join("\n");

      const fileName = `angel-express-${selectedPeriod}-earnings.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert("CSV Created", `File saved: ${fileUri}`);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Export Angel Express Earnings CSV",
        UTI: "public.comma-separated-values-text",
      });
    } catch (err: any) {
      Alert.alert("Export Error", err.message || "Unable to export CSV.");
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading earnings...</Text>
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
              onRefresh={() => loadEarnings(true)}
              tintColor={colors.gold}
            />
          }
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Earnings</Text>

          <Text style={styles.subtitle}>
            Track weekly, monthly, and yearly Angel Express payouts. Export
            miles and earnings for tax records.
          </Text>

          <View style={styles.tabs}>
            {(["weekly", "monthly", "yearly"] as PeriodType[]).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.tabButton,
                  selectedPeriod === period && styles.tabActive,
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedPeriod === period && styles.tabTextActive,
                  ]}
                >
                  {period === "weekly"
                    ? "Weekly"
                    : period === "monthly"
                    ? "Monthly"
                    : "Yearly"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.cardLabel}>{getPeriodTitle(selectedPeriod)}</Text>
            <Text style={styles.bigAmount}>${periodDriverPayout.toFixed(2)}</Text>
            <Text style={styles.cardSubtext}>Your chauffeur payout</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.smallCard}>
              <Text style={styles.smallLabel}>Trips</Text>
              <Text style={styles.smallAmount}>{filteredTrips.length}</Text>
            </View>

            <View style={styles.smallCard}>
              <Text style={styles.smallLabel}>Miles</Text>
              <Text style={styles.smallAmount}>{periodMiles.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.smallCard}>
              <Text style={styles.smallLabel}>Trip Revenue</Text>
              <Text style={styles.smallAmount}>${periodRevenue.toFixed(2)}</Text>
            </View>

            <View style={styles.smallCard}>
              <Text style={styles.smallLabel}>Company Share</Text>
              <Text style={styles.smallAmount}>
                ${periodCompanyShare.toFixed(2)}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.exportButton} onPress={exportCSV}>
            <Text style={styles.exportText}>Export CSV for Tax Records</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => setShowBreakdown(!showBreakdown)}
          >
            <Text style={styles.dropdownTitle}>
              {getPeriodTitle(selectedPeriod)} Trip Breakdown
            </Text>
            <Text style={styles.dropdownIcon}>{showBreakdown ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {showBreakdown && (
            <View style={styles.dropdownContent}>
              {filteredTrips.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    No completed trips for this period. Pull down to refresh if
                    you just completed a trip.
                  </Text>
                </View>
              ) : (
                filteredTrips.map((trip) => {
                  const tripAmount = getTripTotal(trip);
                  const payout = getDriverPayoutAmount(trip);
                  const companyShare = getCompanyShareAmount(trip);
                  const miles = getTripMilesValue(trip);
                  const tripDate = getTripDate(trip);

                  return (
                    <View key={trip.id} style={styles.tripCard}>
                      <Text style={styles.tripRoute}>
                        {getPickupValue(trip)} → {getDropoffValue(trip)}
                      </Text>

                      <Text style={styles.tripText}>
                        Date:{" "}
                        {Number.isNaN(tripDate.getTime())
                          ? "Not available"
                          : tripDate.toLocaleDateString()}
                      </Text>

                      <Text style={styles.tripText}>
                        Passenger: {getPassengerNameValue(trip)}
                      </Text>

                      <Text style={styles.tripText}>
                        Miles Driven: {miles.toFixed(2)}
                      </Text>

                      <Text style={styles.tripText}>
                        Trip Total: ${tripAmount.toFixed(2)}
                      </Text>

                      <Text style={styles.payoutText}>
                        Your Payout: ${payout.toFixed(2)}
                      </Text>

                      <Text style={styles.tripText}>
                        Company Share: ${companyShare.toFixed(2)}
                      </Text>

                      <Text style={styles.tripStatus}>
                        Status: {String(trip.status || "completed")}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Lifetime Summary</Text>

            <Text style={styles.infoText}>
              Lifetime Driver Payout:{" "}
              <Text style={styles.goldText}>
                ${lifetimeDriverPayout.toFixed(2)}
              </Text>
            </Text>

            <Text style={styles.infoText}>
              Lifetime Trip Revenue:{" "}
              <Text style={styles.goldText}>${lifetimeRevenue.toFixed(2)}</Text>
            </Text>

            <Text style={styles.infoText}>
              Lifetime Company Share:{" "}
              <Text style={styles.goldText}>
                ${lifetimeCompanyShare.toFixed(2)}
              </Text>
            </Text>

            <Text style={styles.infoText}>
              Lifetime Completed Trips:{" "}
              <Text style={styles.goldText}>{completedTrips.length}</Text>
            </Text>

            <Text style={styles.infoText}>
              Lifetime Miles Driven:{" "}
              <Text style={styles.goldText}>{lifetimeMiles.toFixed(2)}</Text>
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Stripe Payout Status</Text>

            <Text style={styles.infoText}>
              Stripe Account ID:{" "}
              <Text style={styles.goldText}>
                {driver?.stripe_account_id || "Not connected"}
              </Text>
            </Text>

            <Text style={styles.infoText}>
              Onboarding:{" "}
              <Text style={styles.goldText}>
                {driver?.stripe_onboarding_complete ? "Complete" : "Not complete"}
              </Text>
            </Text>

            <Text style={styles.infoText}>
              Payout Status:{" "}
              <Text style={styles.goldText}>
                {driver?.payout_status || "not_started"}
              </Text>
            </Text>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
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
      flexGrow: 1,
      padding: 22,
      paddingTop: 60,
      paddingBottom: 45,
    },
    backButton: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 20,
    },
    backText: {
      color: colors.gold,
      fontSize: 16,
      fontWeight: "900",
    },
    title: {
      color: colors.text,
      fontSize: 34,
      fontWeight: "900",
      marginBottom: 8,
    },
    subtitle: {
      color: colors.text2,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 22,
    },
    tabs: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 6,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      marginBottom: 16,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: "center",
    },
    tabActive: {
      backgroundColor: colors.gold,
    },
    tabText: {
      color: colors.muted,
      fontWeight: "900",
      fontSize: 14,
    },
    tabTextActive: {
      color: colors.navy,
    },
    heroCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 20,
      marginBottom: 16,
      ...v5Shadow(colors),
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
    },
    cardLabel: {
      color: colors.text2,
      fontSize: 14,
      marginBottom: 8,
      fontWeight: "800",
    },
    cardSubtext: {
      color: colors.muted2,
      fontSize: 13,
      marginTop: 6,
    },
    bigAmount: {
      color: colors.gold,
      fontSize: 36,
      fontWeight: "900",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    smallCard: {
      width: "48%",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 18,
      padding: 16,
    },
    smallLabel: {
      color: colors.text2,
      fontSize: 13,
      marginBottom: 8,
      fontWeight: "800",
    },
    smallAmount: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "900",
    },
    exportButton: {
      backgroundColor: colors.gold,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    exportText: {
      color: colors.navy,
      textAlign: "center",
      fontSize: 16,
      fontWeight: "900",
    },
    dropdownHeader: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 18,
      marginBottom: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    dropdownTitle: {
      color: colors.gold,
      fontSize: 17,
      fontWeight: "900",
      flex: 1,
    },
    dropdownIcon: {
      color: colors.gold,
      fontSize: 16,
      fontWeight: "900",
    },
    dropdownContent: {
      marginBottom: 18,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    emptyText: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 21,
    },
    tripCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 18,
      padding: 18,
      marginBottom: 13,
    },
    tripRoute: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 8,
    },
    tripText: {
      color: colors.text2,
      fontSize: 14,
      marginBottom: 5,
    },
    payoutText: {
      color: colors.gold,
      fontSize: 16,
      fontWeight: "900",
      marginTop: 6,
    },
    tripStatus: {
      color: colors.success,
      fontSize: 13,
      fontWeight: "800",
      marginTop: 8,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 14,
    },
    infoText: {
      color: colors.text2,
      fontSize: 14,
      marginBottom: 8,
    },
    goldText: {
      color: colors.gold,
      fontWeight: "800",
    },
  });
}