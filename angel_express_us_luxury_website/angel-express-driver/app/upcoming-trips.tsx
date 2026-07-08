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
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import {
  getDriverPayoutAmount,
  getDropoffValue,
  getPassengerNameValue,
  getPickupValue,
  getTripTotal,
  useDriverTheme,
  v5Shadow,
} from "../lib/driverTheme";

export default function UpcomingTripsScreen() {
  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);

  const [showToday, setShowToday] = useState(true);
  const [showThisWeek, setShowThisWeek] = useState(false);
  const [showFuture, setShowFuture] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUpcomingTrips();
    }, [])
  );

  async function loadUpcomingTrips() {
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

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .or(`driver_id.eq.${user.id},assigned_driver_id.eq.${user.id}`)
        .in("status", [
          "assigned",
          "driver_assigned",
          "accepted",
          "driver_accepted",
          "confirmed",
          "Confirmed",
        ])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTrips(data || []);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load upcoming trips.");
    } finally {
      setLoading(false);
    }
  }

  function getTripDateValue(trip: any) {
    return (
      trip.date ||
      trip.ride_date ||
      trip.pickup_date ||
      trip.trip_date ||
      null
    );
  }

  function parseTripDate(trip: any) {
    const rawDate = getTripDateValue(trip);

    if (!rawDate) return null;

    const parsed = new Date(rawDate);

    if (isNaN(parsed.getTime())) return null;

    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  function isToday(trip: any) {
    const tripDate = parseTripDate(trip);
    if (!tripDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tripDate.getTime() === today.getTime();
  }

  function isThisWeek(trip: any) {
    const tripDate = parseTripDate(trip);
    if (!tripDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    return tripDate > today && tripDate <= sevenDaysFromNow;
  }

  function isFutureTrip(trip: any) {
    const tripDate = parseTripDate(trip);
    if (!tripDate) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    return tripDate > sevenDaysFromNow;
  }

  const todayTrips = trips.filter(isToday);
  const thisWeekTrips = trips.filter(isThisWeek);
  const futureTrips = trips.filter(isFutureTrip);

  function getTripTitle(trip: any) {
    return trip.route || `${getPickupValue(trip)} → ${getDropoffValue(trip)}`;
  }

  function getFare(trip: any) {
    return getTripTotal(trip);
  }

  function getDriverPayout(trip: any) {
    return getDriverPayoutAmount(trip);
  }

  function renderTripCard(trip: any) {
    return (
      <View key={trip.id} style={styles.tripCard}>
        <Text style={styles.tripTitle}>{getTripTitle(trip)}</Text>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            Status: {String(trip.status || "").replace(/_/g, " ").toUpperCase()}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Passenger</Text>
          <Text style={styles.value}>{getPassengerNameValue(trip)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Pickup</Text>
          <Text style={styles.value}>{getPickupValue(trip)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Drop-off</Text>
          <Text style={styles.value}>{getDropoffValue(trip)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{getTripDateValue(trip) || "Not set"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Time</Text>
          <Text style={styles.value}>
            {trip.time || trip.ride_time || trip.pickup_time || "Not set"}
          </Text>
        </View>

        <View style={styles.moneyBox}>
          <View>
            <Text style={styles.moneyLabel}>Trip Total</Text>
            <Text style={styles.moneyValue}>${getFare(trip).toFixed(2)}</Text>
          </View>

          <View>
            <Text style={styles.moneyLabel}>Your 70%</Text>
            <Text style={styles.payoutValue}>
              ${getDriverPayout(trip).toFixed(2)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            router.push({
              pathname: "/active-trip" as any,
              params: {
                booking_id: String(trip.id),
                invoice_no: String(trip.invoice_no || ""),
              },
            })
          }
        >
          <Text style={styles.primaryButtonText}>View Active Trip</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderDropdownSection(
    title: string,
    count: number,
    expanded: boolean,
    setExpanded: (value: boolean) => void,
    sectionTrips: any[]
  ) {
    return (
      <View style={styles.sectionWrapper}>
        <TouchableOpacity
          style={styles.dropdownHeader}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.dropdownTitle}>
            {title} ({count})
          </Text>

          <Text style={styles.dropdownIcon}>{expanded ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.dropdownContent}>
            {sectionTrips.length === 0 ? (
              <View style={styles.emptySmallCard}>
                <Text style={styles.emptySmallText}>
                  No trips in this section.
                </Text>
              </View>
            ) : (
              sectionTrips.map(renderTripCard)
            )}
          </View>
        )}
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
              refreshing={loading}
              onRefresh={loadUpcomingTrips}
              tintColor={colors.gold}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/driver-dashboard")}
            >
              <Text style={styles.backButtonText}>← Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Upcoming Trips</Text>

          <Text style={styles.subtitle}>
            Accepted Angel Express trips organized by schedule.
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.gold} size="large" />
              <Text style={styles.loadingText}>Loading upcoming trips...</Text>
            </View>
          ) : trips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Upcoming Trips</Text>

              <Text style={styles.emptyText}>
                You have not accepted any upcoming trips yet.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push("/find-trips")}
              >
                <Text style={styles.primaryButtonText}>Find Trips</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {renderDropdownSection(
                "Today",
                todayTrips.length,
                showToday,
                setShowToday,
                todayTrips
              )}

              {renderDropdownSection(
                "This Week",
                thisWeekTrips.length,
                showThisWeek,
                setShowThisWeek,
                thisWeekTrips
              )}

              {renderDropdownSection(
                "Future Trips",
                futureTrips.length,
                showFuture,
                setShowFuture,
                futureTrips
              )}
            </>
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
    container: {
      flexGrow: 1,
      padding: 22,
      paddingTop: 65,
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
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: colors.card,
    },
    backButtonText: {
      color: colors.gold,
      fontWeight: "900",
      fontSize: 14,
    },
    themePill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 11,
      paddingHorizontal: 14,
    },
    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    title: {
      color: colors.gold,
      fontSize: 32,
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
    loadingBox: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    loadingText: {
      color: colors.text2,
      marginTop: 12,
      fontWeight: "800",
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 22,
      ...v5Shadow(colors),
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 8,
    },
    emptyText: {
      color: colors.text2,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 18,
      fontWeight: "700",
    },
    sectionWrapper: {
      marginBottom: 14,
    },
    dropdownHeader: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 18,
      marginBottom: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    dropdownTitle: {
      color: colors.gold,
      fontSize: 19,
      fontWeight: "900",
    },
    dropdownIcon: {
      color: colors.gold,
      fontSize: 18,
      fontWeight: "900",
    },
    dropdownContent: {
      marginBottom: 10,
    },
    emptySmallCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },
    emptySmallText: {
      color: colors.text2,
      textAlign: "center",
      fontWeight: "700",
    },
    tripCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(colors),
    },
    tripTitle: {
      color: colors.gold,
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 14,
    },
    statusBadge: {
      backgroundColor: colors.mode === "dark" ? "rgba(212,175,55,0.18)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.gold,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 16,
    },
    statusText: {
      color: colors.gold,
      fontWeight: "900",
      textAlign: "center",
    },
    row: {
      marginBottom: 12,
    },
    label: {
      color: colors.muted2,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 4,
      textTransform: "uppercase",
    },
    value: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "700",
    },
    moneyBox: {
      backgroundColor: colors.card2,
      borderRadius: 16,
      padding: 16,
      marginTop: 8,
      marginBottom: 18,
      flexDirection: "row",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    moneyLabel: {
      color: colors.text2,
      fontSize: 13,
      marginBottom: 5,
      fontWeight: "700",
    },
    moneyValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "900",
    },
    payoutValue: {
      color: colors.gold,
      fontSize: 20,
      fontWeight: "900",
    },
    primaryButton: {
      backgroundColor: colors.gold,
      paddingVertical: 16,
      borderRadius: 16,
    },
    primaryButtonText: {
      color: colors.navy,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
      textTransform: "uppercase",
    },
  });
}