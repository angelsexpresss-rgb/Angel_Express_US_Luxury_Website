import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

type PeriodType = "weekly" | "monthly" | "yearly";

export default function EarningsScreen() {
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<any>(null);
  const [completedTrips, setCompletedTrips] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("weekly");
  const [showBreakdown, setShowBreakdown] = useState(true);

  useEffect(() => {
    loadEarnings();
  }, []);

  async function loadEarnings() {
    try {
      setLoading(true);

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
        .single();

      if (driverError) throw driverError;

      setDriver(driverData);

      const { data: tripsData, error: tripsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("driver_id", user.id)
        .eq("status", "Completed")
        .order("created_at", { ascending: false });

      if (tripsError) throw tripsError;

      setCompletedTrips(tripsData || []);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load earnings.");
    } finally {
      setLoading(false);
    }
  }

  function getTripDate(trip: any) {
    return new Date(trip.completed_at || trip.updated_at || trip.created_at);
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

  function getTripAmount(trip: any) {
    return Number(trip.total || trip.total_price || trip.price || 0);
  }

  function getTripMiles(trip: any) {
    return Number(trip.miles || trip.distance_miles || trip.trip_miles || 0);
  }

  const filteredTrips = useMemo(() => {
    const startDate = getStartDate(selectedPeriod);
    return completedTrips.filter((trip) => getTripDate(trip) >= startDate);
  }, [completedTrips, selectedPeriod]);

  const periodRevenue = filteredTrips.reduce((sum, trip) => {
    return sum + getTripAmount(trip);
  }, 0);

  const periodDriverPayout = periodRevenue * 0.7;
  const periodCompanyShare = periodRevenue * 0.3;

  const periodMiles = filteredTrips.reduce((sum, trip) => {
    return sum + getTripMiles(trip);
  }, 0);

  const lifetimeRevenue = completedTrips.reduce((sum, trip) => {
    return sum + getTripAmount(trip);
  }, 0);

  const lifetimeDriverPayout = lifetimeRevenue * 0.7;

  const lifetimeMiles = completedTrips.reduce((sum, trip) => {
    return sum + getTripMiles(trip);
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
          "Driver 70% Payout",
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
          "Company 30% Share",
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
        "Driver 70% Payout",
        "Company 30% Share",
        "Status",
      ]
        .map(cleanCSVValue)
        .join(",");

      const tripRows = filteredTrips.map((trip) => {
        const tripAmount = getTripAmount(trip);
        const payout = tripAmount * 0.7;
        const companyShare = tripAmount * 0.3;
        const miles = getTripMiles(trip);

        return [
          trip.id,
          getTripDate(trip).toLocaleDateString(),
          trip.name || trip.passenger_name || "Passenger",
          trip.pickup || "",
          trip.dropoff || "",
          miles.toFixed(2),
          tripAmount.toFixed(2),
          payout.toFixed(2),
          companyShare.toFixed(2),
          trip.status || "Completed",
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
        <ActivityIndicator size="large" color="#d4af37" />
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
        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Earnings</Text>

          <Text style={styles.subtitle}>
            Track weekly, monthly, and yearly Angel Express payouts. Export
            miles and earnings for tax records.
          </Text>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                selectedPeriod === "weekly" && styles.tabActive,
              ]}
              onPress={() => setSelectedPeriod("weekly")}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedPeriod === "weekly" && styles.tabTextActive,
                ]}
              >
                Weekly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                selectedPeriod === "monthly" && styles.tabActive,
              ]}
              onPress={() => setSelectedPeriod("monthly")}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedPeriod === "monthly" && styles.tabTextActive,
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                selectedPeriod === "yearly" && styles.tabActive,
              ]}
              onPress={() => setSelectedPeriod("yearly")}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedPeriod === "yearly" && styles.tabTextActive,
                ]}
              >
                Yearly
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>{getPeriodTitle(selectedPeriod)}</Text>
            <Text style={styles.bigAmount}>${periodDriverPayout.toFixed(2)}</Text>
            <Text style={styles.cardSubtext}>Your 70% chauffeur payout</Text>
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
              <Text style={styles.smallLabel}>Company 30%</Text>
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
                    No completed trips for this period.
                  </Text>
                </View>
              ) : (
                filteredTrips.map((trip) => {
                  const tripAmount = getTripAmount(trip);
                  const payout = tripAmount * 0.7;
                  const miles = getTripMiles(trip);

                  return (
                    <View key={trip.id} style={styles.tripCard}>
                      <Text style={styles.tripRoute}>
                        {trip.pickup || "Pickup"} → {trip.dropoff || "Dropoff"}
                      </Text>

                      <Text style={styles.tripText}>
                        Date: {getTripDate(trip).toLocaleDateString()}
                      </Text>

                      <Text style={styles.tripText}>
                        Passenger:{" "}
                        {trip.name || trip.passenger_name || "Passenger"}
                      </Text>

                      <Text style={styles.tripText}>
                        Miles Driven: {miles.toFixed(2)}
                      </Text>

                      <Text style={styles.tripText}>
                        Trip Total: ${tripAmount.toFixed(2)}
                      </Text>

                      <Text style={styles.payoutText}>
                        Your 70% Payout: ${payout.toFixed(2)}
                      </Text>

                      <Text style={styles.tripStatus}>Status: Completed</Text>
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

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#07111f",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 14,
  },
  container: {
    flexGrow: 1,
    padding: 22,
    paddingTop: 60,
    paddingBottom: 45,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    color: "#d4af37",
    fontSize: 16,
    fontWeight: "800",
  },
  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 18,
    padding: 6,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#d4af37",
  },
  tabText: {
    color: "#cbd5e1",
    fontWeight: "900",
    fontSize: 14,
  },
  tabTextActive: {
    color: "#07111f",
  },
  card: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.6)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  cardLabel: {
    color: "#cbd5e1",
    fontSize: 14,
    marginBottom: 8,
  },
  cardSubtext: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 6,
  },
  bigAmount: {
    color: "#d4af37",
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
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    padding: 16,
  },
  smallLabel: {
    color: "#cbd5e1",
    fontSize: 13,
    marginBottom: 8,
  },
  smallAmount: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
  },
  exportButton: {
    backgroundColor: "#d4af37",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  exportText: {
    color: "#07111f",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
  },
  dropdownHeader: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownTitle: {
    color: "#d4af37",
    fontSize: 17,
    fontWeight: "900",
    flex: 1,
  },
  dropdownIcon: {
    color: "#d4af37",
    fontSize: 16,
    fontWeight: "900",
  },
  dropdownContent: {
    marginBottom: 18,
  },
  emptyCard: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  emptyText: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21,
  },
  tripCard: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    padding: 18,
    marginBottom: 13,
  },
  tripRoute: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },
  tripText: {
    color: "#cbd5e1",
    fontSize: 14,
    marginBottom: 5,
  },
  payoutText: {
    color: "#d4af37",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 6,
  },
  tripStatus: {
    color: "#22c55e",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },
  infoText: {
    color: "#e5e7eb",
    fontSize: 14,
    marginBottom: 8,
  },
  goldText: {
    color: "#d4af37",
    fontWeight: "800",
  },
});