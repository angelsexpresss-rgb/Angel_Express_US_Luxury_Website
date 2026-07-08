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
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import {
  getDriverPayoutAmount,
  getDropoffValue,
  getPassengerNameValue,
  getPickupValue,
  getTripMilesValue,
  getTripTotal,
  useDriverTheme,
  v5Shadow,
} from "../lib/driverTheme";

export default function SmartTripQueueScreen() {
  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driver, setDriver] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    loadQueue();
  }, []);

  function getBookingDateTime(trip: any) {
    const dateValue = trip.date || trip.trip_date || trip.pickup_date;
    const timeValue = trip.time || trip.trip_time || trip.pickup_time || "00:00";

    if (!dateValue) return null;

    const combined = `${dateValue}T${timeValue}`;
    const parsed = new Date(combined);

    if (isNaN(parsed.getTime())) {
      return new Date(dateValue);
    }

    return parsed;
  }

  async function loadQueue() {
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

      if (!driverData.is_online) {
        Alert.alert(
          "Go Online First",
          "You must be online before viewing and claiming future trips.",
          [
            {
              text: "Back to Dashboard",
              onPress: () => router.replace("/driver-dashboard"),
            },
          ]
        );
        setTrips([]);
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .is("driver_id", null)
        .in("status", ["Pending", "pending", "Unassigned", "unassigned"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const now = new Date();

      const futureTrips = (data || []).filter((trip) => {
        const bookingDateTime = getBookingDateTime(trip);

        if (!bookingDateTime) {
          return true;
        }

        return bookingDateTime >= now;
      });

      setTrips(futureTrips);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load trip queue.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshQueue() {
    setRefreshing(true);
    await loadQueue();
  }

  async function claimTrip(trip: any) {
    if (!driver?.is_online) {
      Alert.alert(
        "Go Online First",
        "You must be online before claiming a trip."
      );
      return;
    }

    Alert.alert(
      "Claim Trip",
      "Do you want to claim this Angel Express trip?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Claim",
          onPress: async () => {
            try {
              const driverName = `${driver?.first_name || ""} ${
                driver?.last_name || ""
              }`.trim();

              const { error } = await supabase
                .from("bookings")
                .update({
  driver_id: driver.id,
  assigned_driver_id: driver.id,
  status: "Confirmed",
  assigned_driver_name: driverName || "Angel Express Chauffeur",
  assigned_driver_phone: driver?.phone || null,
  assigned_driver_rating: driver?.rating || 5,
  assigned_driver_level: driver?.driver_level || "Bronze",
  claimed_at: new Date().toISOString(),
})
                .eq("id", trip.id)
                .is("driver_id", null);

              if (error) throw error;

              Alert.alert(
                "Trip Claimed",
                "This trip has been added to your upcoming trips."
              );

              await loadQueue();
            } catch (err: any) {
              Alert.alert(
                "Claim Failed",
                err.message ||
                  "Unable to claim this trip. It may have already been assigned."
              );
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading Smart Trip Queue...</Text>
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
              onRefresh={refreshQueue}
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

          <Text style={styles.title}>Smart Trip Queue</Text>

          <Text style={styles.subtitle}>
            Future Angel Express trips available for approved online chauffeurs
            to claim.
          </Text>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>
              {driver?.is_online ? "🟢 You are Online" : "⚪ You are Offline"}
            </Text>
            <Text style={styles.statusText}>
              {driver?.is_online
                ? "You can claim available future trips."
                : "Go online from your dashboard before claiming trips."}
            </Text>
          </View>

          {trips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No future trips available</Text>
              <Text style={styles.emptyText}>
                When new unassigned bookings are available, they will appear in
                this queue.
              </Text>
            </View>
          ) : (
            trips.map((trip) => {
              const tripTotal = getTripTotal(trip);
              const driverPayout = getDriverPayoutAmount(trip);
              const miles = getTripMilesValue(trip);

              return (
                <View key={trip.id} style={styles.tripCard}>
                  <View style={styles.tripHeader}>
                    <Text style={styles.tripRoute}>
                      {getPickupValue(trip)} → {getDropoffValue(trip)}
                    </Text>
                    <Text style={styles.tripBadge}>Available</Text>
                  </View>

                  <Text style={styles.tripText}>
                    Passenger: {getPassengerNameValue(trip)}
                  </Text>

                  <Text style={styles.tripText}>
                    Date: {trip.date || trip.trip_date || "Not provided"}
                  </Text>

                  <Text style={styles.tripText}>
                    Time: {trip.time || trip.trip_time || "Not provided"}
                  </Text>

                  <Text style={styles.tripText}>Miles: {miles.toFixed(1)}</Text>

                  <View style={styles.payoutBox}>
                    <Text style={styles.payoutLabel}>Trip Total</Text>
                    <Text style={styles.tripAmount}>
                      ${tripTotal.toFixed(2)}
                    </Text>

                    <Text style={styles.payoutLabel}>Estimated 70% Payout</Text>
                    <Text style={styles.payoutAmount}>
                      ${driverPayout.toFixed(2)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={() => claimTrip(trip)}
                  >
                    <Text style={styles.claimText}>Claim Trip</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
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
      fontSize: 16,
      fontWeight: "900",
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
    title: {
      color: colors.text,
      fontSize: 33,
      fontWeight: "900",
      marginBottom: 8,
    },
    subtitle: {
      color: colors.text2,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 18,
      fontWeight: "700",
    },
    statusCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(colors),
    },
    statusTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: "900",
      marginBottom: 6,
    },
    statusText: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 20,
      padding: 22,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 8,
    },
    emptyText: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: "700",
    },
    tripCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 18,
      marginBottom: 16,
    },
    tripHeader: {
      marginBottom: 12,
    },
    tripRoute: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
      lineHeight: 24,
      marginBottom: 8,
    },
    tripBadge: {
      color: colors.navy,
      backgroundColor: colors.gold,
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      overflow: "hidden",
      fontSize: 12,
      fontWeight: "900",
    },
    tripText: {
      color: colors.text2,
      fontSize: 14,
      marginBottom: 6,
      fontWeight: "700",
    },
    payoutBox: {
      backgroundColor: colors.mode === "dark" ? "rgba(212,175,55,0.13)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      marginTop: 10,
      marginBottom: 14,
    },
    payoutLabel: {
      color: colors.text2,
      fontSize: 13,
      marginBottom: 5,
      fontWeight: "700",
    },
    tripAmount: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 12,
    },
    payoutAmount: {
      color: colors.gold,
      fontSize: 24,
      fontWeight: "900",
    },
    claimButton: {
      backgroundColor: colors.gold,
      borderRadius: 16,
      padding: 15,
    },
    claimText: {
      color: colors.navy,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
    },
  });
}