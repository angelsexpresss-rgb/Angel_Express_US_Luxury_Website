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
  getPickupValue,
  getTripTotal,
  useDriverTheme,
  v5Shadow,
} from "../lib/driverTheme";

const AUTO_CANCEL_AFTER_START_MINUTES = 45;

export default function FindTripsScreen() {
  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadAvailableTrips();
    }, [])
  );

  async function loadAvailableTrips() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .in("status", ["pending", "confirmed", "Pending", "Confirmed"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const visibleTrips: any[] = [];

      for (const trip of data || []) {
        const hasDriverAccepted =
          Boolean(trip.driver_id) || Boolean(trip.assigned_driver_id);

        if (hasDriverAccepted) {
          continue;
        }

        const isExpiredUnaccepted = isUnacceptedRideExpired(trip);

        if (isExpiredUnaccepted) {
          await cancelExpiredUnacceptedRide(trip);
          continue;
        }

        visibleTrips.push(trip);
      }

      setTrips(visibleTrips);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load available trips.");
    } finally {
      setLoading(false);
    }
  }

  function isUnacceptedRideExpired(trip: any) {
    const hasDriverAccepted =
      Boolean(trip.driver_id) || Boolean(trip.assigned_driver_id);

    if (hasDriverAccepted) {
      return false;
    }

    const rideStartDateTime = getRideStartDateTime(trip);

    if (!rideStartDateTime) {
      return false;
    }

    const cancelAfter = new Date(
      rideStartDateTime.getTime() + AUTO_CANCEL_AFTER_START_MINUTES * 60 * 1000
    );

    return new Date() > cancelAfter;
  }

  async function cancelExpiredUnacceptedRide(trip: any) {
    try {
      const hasDriverAccepted =
        Boolean(trip.driver_id) || Boolean(trip.assigned_driver_id);

      if (hasDriverAccepted) {
        return;
      }

      await supabase
        .from("bookings")
        .update({
          status: "cancelled",
        })
        .eq("id", trip.id)
        .is("driver_id", null)
        .in("status", ["pending", "confirmed", "Pending", "Confirmed"]);
    } catch (err) {
      console.log("Auto-cancel expired unaccepted ride error:", err);
    }
  }

  function getRideStartDate(trip: any) {
    return (
      trip.date ||
      trip.ride_date ||
      trip.pickup_date ||
      trip.start_date ||
      null
    );
  }

  function getRideStartTime(trip: any) {
    return (
      trip.time ||
      trip.ride_time ||
      trip.pickup_time ||
      trip.start_time ||
      null
    );
  }

  function getRideStartDateTime(trip: any) {
    const dateValue = getRideStartDate(trip);
    const timeValue = getRideStartTime(trip);

    if (!dateValue || !timeValue) {
      return null;
    }

    return buildDateTime(dateValue, timeValue);
  }

  function buildDateTime(dateValue: any, timeValue: any) {
    if (!dateValue || !timeValue) return null;

    const rawDate = String(dateValue).trim();
    const rawTime = String(timeValue).trim();

    if (!rawDate || !rawTime) return null;

    const dateOnly = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
    const parsedTime = parseTime(rawTime);

    if (!parsedTime) {
      const directDate = new Date(`${dateOnly} ${rawTime}`);

      if (!isNaN(directDate.getTime())) {
        return directDate;
      }

      return null;
    }

    const yearMonthDay = dateOnly.split("-").map((item) => Number(item));

    if (yearMonthDay.length < 3 || yearMonthDay.some((item) => isNaN(item))) {
      const fallbackDate = new Date(dateOnly);

      if (isNaN(fallbackDate.getTime())) return null;

      fallbackDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
      return fallbackDate;
    }

    const [year, month, day] = yearMonthDay;

    return new Date(
      year,
      month - 1,
      day,
      parsedTime.hours,
      parsedTime.minutes,
      0,
      0
    );
  }

  function parseTime(timeValue: string) {
    const cleanTime = String(timeValue || "")
      .trim()
      .replace(/\./g, "")
      .toUpperCase();

    if (!cleanTime) return null;

    const amPmMatch = cleanTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);

    if (amPmMatch) {
      let hours = Number(amPmMatch[1]);
      const minutes = Number(amPmMatch[2] || 0);
      const period = amPmMatch[3];

      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
      }

      return { hours, minutes };
    }

    const twentyFourHourMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/);

    if (twentyFourHourMatch) {
      const hours = Number(twentyFourHourMatch[1]);
      const minutes = Number(twentyFourHourMatch[2]);

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
      }

      return { hours, minutes };
    }

    const hourOnlyMatch = cleanTime.match(/^(\d{1,2})$/);

    if (hourOnlyMatch) {
      const hours = Number(hourOnlyMatch[1]);

      if (hours < 0 || hours > 23) {
        return null;
      }

      return { hours, minutes: 0 };
    }

    return null;
  }

  function formatCancelInfo(trip: any) {
    const startDateTime = getRideStartDateTime(trip);

    if (!startDateTime) {
      return "Auto-cancel time unavailable";
    }

    const cancelAfter = new Date(
      startDateTime.getTime() + AUTO_CANCEL_AFTER_START_MINUTES * 60 * 1000
    );

    return `Cancels if not accepted by ${cancelAfter.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  async function acceptTrip(trip: any) {
    try {
      if (isUnacceptedRideExpired(trip)) {
        await cancelExpiredUnacceptedRide(trip);

        Alert.alert(
          "Ride Expired",
          "This ride was not accepted within 45 minutes after the start time, so it has been cancelled for the passenger."
        );

        await loadAvailableTrips();
        return;
      }

      setAcceptingId(trip.id);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/driver-login");
        return;
      }

      const { data: driver, error: driverError } = await supabase
        .from("drivers")
        .select("id, status, is_online")
        .eq("id", user.id)
        .single();

      if (driverError || !driver) {
        Alert.alert("Driver Profile Missing", "Please login again.");
        return;
      }

      if (driver.status !== "approved") {
        router.replace("/driver-pending");
        return;
      }

      if (!driver.is_online) {
        Alert.alert(
          "You Are Offline",
          "Please go online from your dashboard before accepting trips."
        );
        return;
      }

      const { data: latestTrip, error: latestTripError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", trip.id)
        .maybeSingle();

      if (latestTripError) throw latestTripError;

      if (!latestTrip) {
        Alert.alert("Trip Not Found", "This trip no longer exists.");
        await loadAvailableTrips();
        return;
      }

      const alreadyAccepted =
        Boolean(latestTrip.driver_id) || Boolean(latestTrip.assigned_driver_id);

      if (alreadyAccepted) {
        Alert.alert(
          "Trip Already Accepted",
          "Another driver may have accepted this ride already."
        );

        await loadAvailableTrips();
        return;
      }

      if (isUnacceptedRideExpired(latestTrip)) {
        await cancelExpiredUnacceptedRide(latestTrip);

        Alert.alert(
          "Ride Expired",
          "This ride was not accepted within 45 minutes after the start time, so it has been cancelled for the passenger."
        );

        await loadAvailableTrips();
        return;
      }

      const { data: updatedTrip, error: updateError } = await supabase
        .from("bookings")
        .update({
  driver_id: user.id,
  assigned_driver_id: user.id,
  status: "driver_assigned",
})
        .eq("id", trip.id)
        .is("driver_id", null)
        .in("status", ["pending", "confirmed", "Pending", "Confirmed"])
        .select("*")
        .maybeSingle();

      if (updateError) throw updateError;

      if (!updatedTrip) {
        Alert.alert(
          "Trip Already Accepted",
          "Another driver may have accepted this ride already."
        );

        await loadAvailableTrips();
        return;
      }

      setTrips((currentTrips) =>
        currentTrips.filter((item) => item.id !== trip.id)
      );

      router.replace({
        pathname: "/active-trip" as any,
        params: {
          booking_id: String(updatedTrip.id),
          invoice_no: String(updatedTrip.invoice_no || ""),
        },
      });
    } catch (err: any) {
      Alert.alert("Accept Failed", err.message || "Unable to accept this trip.");
    } finally {
      setAcceptingId(null);
    }
  }

  function confirmAcceptTrip(trip: any) {
    Alert.alert(
      "Accept Ride?",
      "This ride will move to your Active Trip screen immediately.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Accept Ride",
          onPress: () => acceptTrip(trip),
        },
      ]
    );
  }

  function getTripTitle(trip: any) {
    return trip.route || `${getPickupValue(trip)} → ${getDropoffValue(trip)}`;
  }

  function getFare(trip: any) {
    return getTripTotal(trip);
  }

  function getDriverPayout(trip: any) {
    return getDriverPayoutAmount(trip);
  }

  function getSourceLabel(trip: any) {
    const source = String(trip.source || "app").toLowerCase();

    if (source === "website") return "Website Booking";
    return "App Booking";
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
              onRefresh={loadAvailableTrips}
              tintColor={colors.gold}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backPill}
              onPress={() => router.back()}
            >
              <Text style={styles.backPillText}>← Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Find Trips</Text>

          <Text style={styles.subtitle}>
            Available Angel Express bookings ready for approved chauffeurs.
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.gold} size="large" />
              <Text style={styles.loadingText}>Loading available trips...</Text>
            </View>
          ) : trips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Available Trips</Text>
              <Text style={styles.emptyText}>
                There are no unassigned trips right now. Rides not accepted
                within 45 minutes after the start time are automatically
                cancelled for the passenger.
              </Text>
            </View>
          ) : (
            trips.map((trip) => {
              const fare = getFare(trip);
              const payout = getDriverPayout(trip);

              return (
                <View key={trip.id} style={styles.tripCard}>
                  <Text style={styles.sourceBadge}>{getSourceLabel(trip)}</Text>

                  <Text style={styles.tripTitle}>{getTripTitle(trip)}</Text>

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
                    <Text style={styles.value}>
                      {trip.date || trip.ride_date || trip.pickup_date || "Not set"}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Start Time</Text>
                    <Text style={styles.value}>
                      {trip.time || trip.ride_time || trip.pickup_time || "Not set"}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Auto Cancel Rule</Text>
                    <Text style={styles.value}>{formatCancelInfo(trip)}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Ride Category</Text>
                    <Text style={styles.value}>
                      {trip.ride_category || trip.category || "Standard Ride"}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Trip Type</Text>
                    <Text style={styles.value}>
                      {trip.trip_type || trip.tripType || "One Way"}
                    </Text>
                  </View>

                  <View style={styles.moneyBox}>
                    <View>
                      <Text style={styles.moneyLabel}>Trip Total</Text>
                      <Text style={styles.moneyValue}>${fare.toFixed(2)}</Text>
                    </View>

                    <View>
                      <Text style={styles.moneyLabel}>Your 70%</Text>
                      <Text style={styles.payoutValue}>${payout.toFixed(2)}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.acceptButton,
                      acceptingId === trip.id && styles.disabledButton,
                    ]}
                    onPress={() => confirmAcceptTrip(trip)}
                    disabled={acceptingId === trip.id}
                  >
                    {acceptingId === trip.id ? (
                      <ActivityIndicator color={colors.navy} />
                    ) : (
                      <Text style={styles.acceptButtonText}>Accept Ride</Text>
                    )}
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
    backPill: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: colors.card,
    },
    backPillText: {
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
    sourceBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.mode === "dark" ? "rgba(212,175,55,0.16)" : "#FFF8E8",
      color: colors.gold,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      fontSize: 12,
      fontWeight: "900",
      marginBottom: 10,
      textTransform: "uppercase",
      overflow: "hidden",
    },
    tripTitle: {
      color: colors.gold,
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 14,
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
      marginBottom: 16,
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
    acceptButton: {
      backgroundColor: colors.gold,
      paddingVertical: 16,
      borderRadius: 16,
    },
    disabledButton: {
      opacity: 0.55,
    },
    acceptButtonText: {
      color: colors.navy,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
      textTransform: "uppercase",
    },
  });
}