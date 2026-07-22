import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const OPEN_DISPATCH_STATUSES = [
  "pending",
  "confirmed",
  "booked",
  "pending_assignment",
  "unassigned",
  "smart_queue_ready",
  "pool_matched",
];

const OWNER_ASSIGNED_STATUS = "driver_assigned";

function normalize(value: any) {
  return String(value || "").trim().toLowerCase();
}

function firstValue(...values: any[]) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function titleCase(value: any) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function FindTripsScreen() {
  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [trips, setTrips] = useState<any[]>([]);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const channel = supabase
      .channel("driver-find-trips-v6")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          loadAvailableTrips(false);
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAvailableTrips(false);
    }, [])
  );

  async function loadAvailableTrips(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      if (!isRefresh) setLoading(true);

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
        .maybeSingle();

      if (driverError) throw driverError;

      if (!driver) {
        Alert.alert("Driver Profile Missing", "Please sign in again.");
        router.replace("/driver-login");
        return;
      }

      if (normalize(driver.status) !== "approved") {
        router.replace("/driver-pending");
        return;
      }

      if (!mountedRef.current) return;
      setDriverId(user.id);

      // Refresh overdue dispatch states centrally. The RPC is intentionally
      // service-role-only in the migration, so this call may be unavailable
      // from the client. The scheduled Supabase Cron remains authoritative.
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .in("status", [
          ...OPEN_DISPATCH_STATUSES,
          ...OPEN_DISPATCH_STATUSES.map((status) => titleCase(status)),
          OWNER_ASSIGNED_STATUS,
          "Driver_Assigned",
        ])
        .order("dispatch_priority", { ascending: false })
        .order("scheduled_pickup_at", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const visibleTrips = (data || []).filter((trip) => {
        const status = normalize(trip.status);
        const acceptedDriverId = trip.driver_id;
        const assignedDriverId = trip.assigned_driver_id;

        // Once accepted, the trip belongs in Active/Upcoming Trips.
        if (acceptedDriverId) return false;

        // Student Pool requests remain hidden while Smart Queue is matching.
        if (
          status === "smart_queue" &&
          trip.pool_ready !== true
        ) {
          return false;
        }

        // Owner-reserved trips are visible only to the selected driver.
        if (status === OWNER_ASSIGNED_STATUS) {
          return assignedDriverId === user.id;
        }

        // Open-dispatch trips must not be reserved for another driver.
        if (assignedDriverId && assignedDriverId !== user.id) {
          return false;
        }

        return OPEN_DISPATCH_STATUSES.includes(status);
      });

      if (mountedRef.current) {
        setTrips(dedupeTrips(visibleTrips));
      }
    } catch (err: any) {
      Alert.alert(
        "Trips Error",
        err.message || "Unable to load available trips."
      );
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  function dedupeTrips(items: any[]) {
    const seen = new Set<string>();

    return items.filter((trip) => {
      const key = String(trip.id || "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function isOwnerAssignment(trip: any) {
    return (
      normalize(trip.status) === OWNER_ASSIGNED_STATUS &&
      Boolean(driverId) &&
      trip.assigned_driver_id === driverId &&
      !trip.driver_id
    );
  }

  function isStudentPoolTrip(trip: any) {
    return (
      normalize(trip.ride_category) === "student_pool" ||
      normalize(trip.ride_category_label) === "student_pool" ||
      trip.student_pool_requested === true ||
      Boolean(trip.pool_id)
    );
  }

  function getDispatchLabel(trip: any) {
    const status = normalize(trip.status);

    if (isOwnerAssignment(trip)) return "Reserved for You";
    if (status === "unassigned") return "Rescue Trip";
    if (status === "smart_queue_ready" || status === "pool_matched") {
      return "Student Pool Ready";
    }
    if (trip.dispatch_priority > 0) return "Priority Dispatch";
    return "Open Dispatch";
  }

  function getDispatchMessage(trip: any) {
    if (isOwnerAssignment(trip)) {
      return "Angel Express Operations assigned this ride to you. Accept or decline it promptly.";
    }

    if (normalize(trip.status) === "unassigned") {
      return "This ride still needs a chauffeur and remains available for rescue dispatch.";
    }

    if (isStudentPoolTrip(trip)) {
      return "The student pool is ready for dispatch. Accepting assigns the complete pool to you.";
    }

    return "This booking is open to eligible online Angel Express chauffeurs.";
  }

  async function acceptTrip(trip: any) {
    try {
      if (!driverId) {
        router.replace("/driver-login");
        return;
      }

      setAcceptingId(String(trip.id));

      const { data: currentDriver, error: driverError } = await supabase
        .from("drivers")
        .select("id, status, is_online")
        .eq("id", driverId)
        .maybeSingle();

      if (driverError) throw driverError;

      if (!currentDriver) {
        Alert.alert("Driver Profile Missing", "Please sign in again.");
        return;
      }

      if (normalize(currentDriver.status) !== "approved") {
        router.replace("/driver-pending");
        return;
      }

      if (!currentDriver.is_online) {
        Alert.alert(
          "You Are Offline",
          "Go online from the Driver Dashboard before accepting trips."
        );
        return;
      }

      let updatedTrip: any = null;

      if (isOwnerAssignment(trip)) {
        const { data, error } = await supabase.rpc(
          "ae_driver_respond_to_assignment",
          {
            p_booking_id: trip.id,
            p_accept: true,
            p_reason: null,
          }
        );

        if (error) throw error;
        updatedTrip = data;
      } else {
        const { data, error } = await supabase.rpc(
          "ae_driver_accept_open_trip",
          {
            p_booking_id: trip.id,
          }
        );

        if (error) throw error;
        updatedTrip = data;
      }

      if (!updatedTrip) {
        throw new Error(
          "This ride is no longer available or another chauffeur accepted it."
        );
      }

      if (mountedRef.current) {
        setTrips((currentTrips) =>
          currentTrips.filter((item) => item.id !== trip.id)
        );
      }

      router.replace({
        pathname: "/active-trip" as any,
        params: {
          booking_id: String(updatedTrip.id || trip.id),
          invoice_no: String(
            updatedTrip.invoice_no ||
              updatedTrip.invoice_number ||
              trip.invoice_no ||
              ""
          ),
        },
      });
    } catch (err: any) {
      Alert.alert(
        "Accept Failed",
        err.message || "Unable to accept this trip."
      );
      await loadAvailableTrips(false);
    } finally {
      if (mountedRef.current) setAcceptingId(null);
    }
  }

  async function declineAssignedTrip(trip: any) {
    try {
      if (!isOwnerAssignment(trip)) return;

      setDecliningId(String(trip.id));

      const { error } = await supabase.rpc(
        "ae_driver_respond_to_assignment",
        {
          p_booking_id: trip.id,
          p_accept: false,
          p_reason: "Driver declined from Find Trips.",
        }
      );

      if (error) throw error;

      if (mountedRef.current) {
        setTrips((currentTrips) =>
          currentTrips.filter((item) => item.id !== trip.id)
        );
      }

      Alert.alert(
        "Assignment Declined",
        "The ride has returned to the Unassigned dispatch queue."
      );
    } catch (err: any) {
      Alert.alert(
        "Decline Failed",
        err.message || "Unable to decline this assignment."
      );
      await loadAvailableTrips(false);
    } finally {
      if (mountedRef.current) setDecliningId(null);
    }
  }

  function confirmAcceptTrip(trip: any) {
    Alert.alert(
      isOwnerAssignment(trip) ? "Accept Assigned Ride?" : "Accept Ride?",
      isStudentPoolTrip(trip)
        ? "Accepting assigns this ready student pool to you and moves it to your Active Trip screen."
        : "Accepting assigns this booking to you and moves it to your Active Trip screen.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept Ride",
          onPress: () => acceptTrip(trip),
        },
      ]
    );
  }

  function confirmDeclineTrip(trip: any) {
    Alert.alert(
      "Decline Assignment?",
      "The ride will return to the Unassigned queue so another chauffeur or Operations can rescue it.",
      [
        { text: "Keep Assignment", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => declineAssignedTrip(trip),
        },
      ]
    );
  }

  function getTripTitle(trip: any) {
    return (
      trip.route ||
      `${getPickupValue(trip)} → ${getDropoffValue(trip)}`
    );
  }

  function getSourceLabel(trip: any) {
    const source = normalize(
      firstValue(trip.source_platform, trip.source, trip.source_app, "app")
    );

    if (source === "website") return "Website Booking";
    return "App Booking";
  }

  function formatScheduledPickup(trip: any) {
    if (trip.scheduled_pickup_at) {
      const value = new Date(trip.scheduled_pickup_at);

      if (!Number.isNaN(value.getTime())) {
        return `${value.toLocaleDateString()} at ${value.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}`;
      }
    }

    const date = firstValue(
      trip.ride_date,
      trip.date,
      trip.pickup_date,
      "Date not set"
    );

    const time = firstValue(
      trip.ride_time,
      trip.time,
      trip.pickup_time,
      "Time not set"
    );

    return `${date} at ${time}`;
  }

  function formatDeadline(trip: any) {
    if (!trip.driver_response_deadline) {
      return "No separate response deadline";
    }

    const deadline = new Date(trip.driver_response_deadline);

    if (Number.isNaN(deadline.getTime())) {
      return "Response deadline unavailable";
    }

    return deadline.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
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
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAvailableTrips(true)}
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
            Open dispatch rides, rescue trips, ready student pools, and rides
            assigned directly to you by Angel Express Operations.
          </Text>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>V6 Dispatch Protection</Text>
            <Text style={styles.noticeText}>
              A ride is never cancelled simply because no driver accepted it.
              After the dispatch deadline, it becomes Unassigned and remains
              available for rescue.
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.gold} size="large" />
              <Text style={styles.loadingText}>Loading dispatch queue...</Text>
            </View>
          ) : trips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Available Trips</Text>
              <Text style={styles.emptyText}>
                There are no open, unassigned, pool-ready, or owner-assigned
                rides available to you right now.
              </Text>
            </View>
          ) : (
            trips.map((trip) => {
              const fare = getTripTotal(trip);
              const payout = getDriverPayoutAmount(trip);
              const ownerAssigned = isOwnerAssignment(trip);
              const accepting = acceptingId === String(trip.id);
              const declining = decliningId === String(trip.id);

              return (
                <View key={String(trip.id)} style={styles.tripCard}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.sourceBadge}>
                      {getSourceLabel(trip)}
                    </Text>

                    <Text
                      style={[
                        styles.dispatchBadge,
                        normalize(trip.status) === "unassigned" &&
                          styles.rescueBadge,
                        isStudentPoolTrip(trip) && styles.poolBadge,
                      ]}
                    >
                      {getDispatchLabel(trip)}
                    </Text>
                  </View>

                  <Text style={styles.tripTitle}>{getTripTitle(trip)}</Text>

                  <View style={styles.lifecycleBox}>
                    <Text style={styles.lifecycleText}>
                      {getDispatchMessage(trip)}
                    </Text>
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
                    <Text style={styles.label}>Scheduled Pickup</Text>
                    <Text style={styles.value}>
                      {formatScheduledPickup(trip)}
                    </Text>
                  </View>

                  {ownerAssigned ? (
                    <View style={styles.row}>
                      <Text style={styles.label}>Accept By</Text>
                      <Text style={styles.value}>
                        {formatDeadline(trip)}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.row}>
                    <Text style={styles.label}>Ride Category</Text>
                    <Text style={styles.value}>
                      {titleCase(
                        firstValue(
                          trip.ride_category_label,
                          trip.ride_category,
                          trip.category,
                          "Standard Ride"
                        )
                      )}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Trip Type</Text>
                    <Text style={styles.value}>
                      {titleCase(
                        firstValue(
                          trip.trip_type_label,
                          trip.trip_type,
                          trip.tripType,
                          "One Way"
                        )
                      )}
                    </Text>
                  </View>

                  {isStudentPoolTrip(trip) ? (
                    <View style={styles.poolInfoBox}>
                      <Text style={styles.poolInfoTitle}>
                        Student Pool Dispatch
                      </Text>
                      <Text style={styles.poolInfoText}>
                        Pool size: {Number(trip.pool_size || 1)} • Status:{" "}
                        {titleCase(trip.pool_status || "Ready")}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.moneyBox}>
                    <View>
                      <Text style={styles.moneyLabel}>Trip Total</Text>
                      <Text style={styles.moneyValue}>
                        ${fare.toFixed(2)}
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.moneyLabel}>Your 70%</Text>
                      <Text style={styles.payoutValue}>
                        ${payout.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.acceptButton,
                      (accepting || declining) && styles.disabledButton,
                    ]}
                    onPress={() => confirmAcceptTrip(trip)}
                    disabled={accepting || declining}
                  >
                    {accepting ? (
                      <ActivityIndicator color={colors.navy} />
                    ) : (
                      <Text style={styles.acceptButtonText}>
                        {ownerAssigned
                          ? "Accept Assignment"
                          : "Accept Ride"}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {ownerAssigned ? (
                    <TouchableOpacity
                      style={[
                        styles.declineButton,
                        (accepting || declining) && styles.disabledButton,
                      ]}
                      onPress={() => confirmDeclineTrip(trip)}
                      disabled={accepting || declining}
                    >
                      {declining ? (
                        <ActivityIndicator color={colors.gold} />
                      ) : (
                        <Text style={styles.declineButtonText}>
                          Decline Assignment
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
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
    noticeCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 16,
      marginBottom: 18,
      ...v5Shadow(colors),
    },
    noticeTitle: {
      color: colors.gold,
      fontWeight: "900",
      fontSize: 15,
      marginBottom: 6,
    },
    noticeText: {
      color: colors.text2,
      fontWeight: "700",
      lineHeight: 20,
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
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 11,
    },
    sourceBadge: {
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(212,175,55,0.16)"
          : "#FFF8E8",
      color: colors.gold,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      overflow: "hidden",
    },
    dispatchBadge: {
      backgroundColor: "rgba(59,130,246,0.16)",
      color: "#93C5FD",
      borderWidth: 1,
      borderColor: "rgba(59,130,246,0.45)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      overflow: "hidden",
    },
    rescueBadge: {
      backgroundColor: "rgba(249,115,22,0.16)",
      color: "#FDBA74",
      borderColor: "rgba(249,115,22,0.5)",
    },
    poolBadge: {
      backgroundColor: "rgba(168,85,247,0.16)",
      color: "#D8B4FE",
      borderColor: "rgba(168,85,247,0.5)",
    },
    tripTitle: {
      color: colors.gold,
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 14,
    },
    lifecycleBox: {
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 14,
      padding: 13,
      marginBottom: 14,
    },
    lifecycleText: {
      color: colors.text2,
      fontWeight: "800",
      lineHeight: 20,
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
    poolInfoBox: {
      backgroundColor: "rgba(168,85,247,0.12)",
      borderWidth: 1,
      borderColor: "rgba(168,85,247,0.38)",
      borderRadius: 14,
      padding: 13,
      marginBottom: 13,
    },
    poolInfoTitle: {
      color: "#D8B4FE",
      fontWeight: "900",
      marginBottom: 4,
    },
    poolInfoText: {
      color: colors.text2,
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
    declineButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingVertical: 14,
      borderRadius: 16,
      marginTop: 10,
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
    declineButtonText: {
      color: colors.gold,
      fontSize: 14,
      fontWeight: "900",
      textAlign: "center",
      textTransform: "uppercase",
    },
  });
}
