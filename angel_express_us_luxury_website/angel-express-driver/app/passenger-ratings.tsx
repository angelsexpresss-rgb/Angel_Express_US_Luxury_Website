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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import {
  getDropoffValue,
  getPassengerNameValue,
  getPickupValue,
  useDriverTheme,
  v5Shadow,
} from "../lib/driverTheme";

export default function PassengerRatingsScreen() {
  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingTripId, setSavingTripId] = useState<any>(null);

  const [driverUserId, setDriverUserId] = useState("");
  const [completedTrips, setCompletedTrips] = useState<any[]>([]);
  const [ratingsByBooking, setRatingsByBooking] = useState<any>({});
  const [notesByBooking, setNotesByBooking] = useState<any>({});

  useEffect(() => {
    loadCompletedTrips();
  }, []);

  async function loadCompletedTrips(isRefresh = false) {
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

      setDriverUserId(user.id);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .or(`driver_id.eq.${user.id},assigned_driver_id.eq.${user.id}`)
        .in("status", ["Completed", "completed"])
        .order("completed_at", { ascending: false });

      if (error) throw error;

      const trips = data || [];
      setCompletedTrips(trips);

      if (trips.length > 0) {
        const bookingIds = trips.map((trip) => Number(trip.id));

        const { data: ratingData, error: ratingError } = await supabase
          .from("passenger_ratings")
          .select("*")
          .eq("driver_id", user.id)
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: false });

        if (ratingError) throw ratingError;

        const ratingsMap: any = {};
        const notesMap: any = {};

        (ratingData || []).forEach((rating) => {
          const key = String(rating.booking_id);

          if (!ratingsMap[key]) {
            ratingsMap[key] = rating;
            notesMap[key] = rating.notes || "";
          }
        });

        trips.forEach((trip) => {
          const key = String(trip.id);

          if (!notesMap[key]) {
            notesMap[key] = trip.passenger_rating_note_by_driver || "";
          }
        });

        setRatingsByBooking(ratingsMap);
        setNotesByBooking(notesMap);
      } else {
        setRatingsByBooking({});
        setNotesByBooking({});
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to load passenger ratings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getPassengerUserId(trip: any) {
    return (
      trip?.user_id ||
      trip?.passenger_id ||
      trip?.passenger_user_id ||
      trip?.customer_id ||
      null
    );
  }

  function getPassengerEmail(trip: any) {
    return (
      trip?.email ||
      trip?.passenger_email ||
      trip?.customer_email ||
      null
    );
  }

  function getPassengerName(trip: any) {
    return getPassengerNameValue(trip) || "Passenger";
  }

  function getExistingRating(trip: any) {
    return ratingsByBooking[String(trip.id)] || null;
  }

  function getCurrentRating(trip: any) {
    const existingRating = getExistingRating(trip);

    return Number(
      existingRating?.overall_rating ||
        trip.passenger_rating_by_driver ||
        0
    );
  }

  function getCurrentNote(trip: any) {
    return notesByBooking[String(trip.id)] || "";
  }

  function updateNote(tripId: any, value: string) {
    setNotesByBooking((current: any) => ({
      ...current,
      [String(tripId)]: value,
    }));
  }

  async function savePassengerRating(trip: any, rating: number) {
    try {
      if (!driverUserId) {
        Alert.alert("Session Error", "Please log in again.");
        router.replace("/driver-login");
        return;
      }

      setSavingTripId(trip.id);

      const bookingId = Number(trip.id);
      const existingRating = getExistingRating(trip);
      const cleanNotes = getCurrentNote(trip).trim();

      const passengerUserId = getPassengerUserId(trip);
      const passengerEmail = getPassengerEmail(trip);
      const passengerName = getPassengerName(trip);

      const ratingPayload: any = {
        booking_id: bookingId,
        passenger_user_id: passengerUserId,
        passenger_email: passengerEmail,
        passenger_name: passengerName,

        driver_id: driverUserId,

        respectful: rating,
        on_time: rating,
        cleanliness: rating,
        communication: rating,
        overall_rating: rating,

        notes: cleanNotes,
        is_visible_to_passenger: true,
      };

      let savedRating: any = null;

      if (existingRating?.id) {
        const { data: updatedRating, error: updateRatingError } = await supabase
          .from("passenger_ratings")
          .update(ratingPayload)
          .eq("id", existingRating.id)
          .select("*")
          .maybeSingle();

        if (updateRatingError) throw updateRatingError;

        savedRating = updatedRating;
      } else {
        const { data: insertedRating, error: insertRatingError } = await supabase
          .from("passenger_ratings")
          .insert(ratingPayload)
          .select("*")
          .maybeSingle();

        if (insertRatingError) throw insertRatingError;

        savedRating = insertedRating;
      }

      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          passenger_rating_by_driver: rating,
          passenger_rating_note_by_driver: cleanNotes,
          passenger_rating_completed_at: new Date().toISOString(),
        })
        .eq("id", trip.id);

      if (bookingError) throw bookingError;

      setRatingsByBooking((current: any) => ({
        ...current,
        [String(trip.id)]: savedRating || {
          ...ratingPayload,
          id: existingRating?.id,
        },
      }));

      setCompletedTrips((prev) =>
        prev.map((item) =>
          item.id === trip.id
            ? {
                ...item,
                passenger_rating_by_driver: rating,
                passenger_rating_note_by_driver: cleanNotes,
                passenger_rating_completed_at: new Date().toISOString(),
              }
            : item
        )
      );

      Alert.alert(
        "Saved",
        "Passenger rating and note were saved. This will update the passenger app rating summary."
      );
    } catch (err: any) {
      Alert.alert(
        "Save Failed",
        err.message || "Unable to save passenger rating."
      );
    } finally {
      setSavingTripId(null);
    }
  }

  async function openFullRatingScreen(trip: any) {
    router.push({
      pathname: "/rate-passenger" as any,
      params: {
        bookingId: String(trip.id),
      },
    });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading passenger ratings...</Text>
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
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadCompletedTrips(true)}
              tintColor={colors.gold}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.themePill}
              onPress={toggleTheme}
              activeOpacity={0.85}
            >
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.kicker}>ANGEL EXPRESS DRIVER APP</Text>
          <Text style={styles.title}>Passenger Ratings</Text>

          <Text style={styles.subtitle}>
            Rate completed passengers and leave feedback notes. Ratings update
            the live passenger rating summary.
          </Text>

          {completedTrips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No completed trips yet</Text>
              <Text style={styles.emptyText}>
                After you complete a ride, you will be able to rate the
                passenger here.
              </Text>
            </View>
          ) : (
            completedTrips.map((trip) => {
              const currentRating = getCurrentRating(trip);
              const passengerName = getPassengerName(trip);
              const existingRating = getExistingRating(trip);
              const saving = savingTripId === trip.id;

              return (
                <View key={trip.id} style={styles.tripCard}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {(passengerName?.[0] || "P").toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.passengerInfo}>
                      <Text style={styles.passengerName}>{passengerName}</Text>

                      <Text style={styles.tripDate}>
                        {trip.date ||
                          trip.trip_date ||
                          trip.completed_at?.slice(0, 10) ||
                          "Completed trip"}
                      </Text>

                      {existingRating ? (
                        <Text style={styles.syncedText}>
                          Synced to Passenger App
                        </Text>
                      ) : (
                        <Text style={styles.notSyncedText}>
                          Not rated yet
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.routeBox}>
                    <Text style={styles.routeLabel}>Route</Text>
                    <Text style={styles.routeText}>
                      {getPickupValue(trip)} → {getDropoffValue(trip)}
                    </Text>
                  </View>

                  <Text style={styles.label}>Driver Rating for Passenger</Text>

                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => savePassengerRating(trip, star)}
                        disabled={saving}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.star,
                            star <= currentRating && styles.starActive,
                          ]}
                        >
                          ★
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.ratingStatus}>
                    {currentRating
                      ? `You rated this passenger ${currentRating} star${
                          currentRating > 1 ? "s" : ""
                        }.`
                      : "Tap a star to rate this passenger."}
                  </Text>

                  <View style={styles.noteBox}>
                    <Text style={styles.noteLabel}>
                      Driver Feedback Note
                    </Text>

                    <TextInput
                      value={getCurrentNote(trip)}
                      onChangeText={(value) => updateNote(trip.id, value)}
                      placeholder="Add a note about passenger behavior, readiness, communication, or concerns..."
                      placeholderTextColor={colors.placeholder}
                      multiline
                      style={styles.noteInput}
                    />

                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        saving && styles.disabledButton,
                      ]}
                      onPress={() =>
                        savePassengerRating(
                          trip,
                          currentRating > 0 ? currentRating : 5
                        )
                      }
                      disabled={saving}
                      activeOpacity={0.85}
                    >
                      {saving ? (
                        <ActivityIndicator color={colors.navy} />
                      ) : (
                        <Text style={styles.saveButtonText}>
                          Save Rating & Note
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.fullRatingButton}
                    onPress={() => openFullRatingScreen(trip)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.fullRatingText}>
                      Open Full Rating Form
                    </Text>
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
    kicker: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 8,
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
      fontWeight: "700",
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
      fontSize: 14,
      lineHeight: 22,
      fontWeight: "700",
    },
    tripCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 22,
      padding: 20,
      marginBottom: 16,
      ...v5Shadow(colors),
    },
    cardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    avatarCircle: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.gold,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    avatarText: {
      color: colors.navy,
      fontSize: 22,
      fontWeight: "900",
    },
    passengerInfo: {
      flex: 1,
    },
    passengerName: {
      color: colors.text,
      fontSize: 19,
      fontWeight: "900",
    },
    tripDate: {
      color: colors.muted2,
      fontSize: 13,
      marginTop: 3,
      fontWeight: "700",
    },
    syncedText: {
      color: colors.success,
      fontSize: 12,
      fontWeight: "900",
      marginTop: 5,
      textTransform: "uppercase",
    },
    notSyncedText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
      marginTop: 5,
      textTransform: "uppercase",
    },
    routeBox: {
      backgroundColor: colors.card2,
      borderRadius: 14,
      padding: 14,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    routeLabel: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 5,
    },
    routeText: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
    },
    label: {
      color: colors.text2,
      fontSize: 14,
      fontWeight: "800",
      marginBottom: 8,
    },
    starsRow: {
      flexDirection: "row",
      marginBottom: 8,
    },
    star: {
      color: colors.mode === "dark" ? "#475569" : "#CBD5E1",
      fontSize: 36,
      marginRight: 8,
    },
    starActive: {
      color: colors.gold,
    },
    ratingStatus: {
      color: colors.gold,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 16,
    },
    noteBox: {
      backgroundColor:
        colors.mode === "dark" ? "rgba(2,6,23,0.45)" : "rgba(7,17,31,0.04)",
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      marginBottom: 12,
    },
    noteLabel: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "900",
      marginBottom: 8,
    },
    noteInput: {
      minHeight: 96,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 14,
      backgroundColor: colors.input,
      color: colors.inputText,
      padding: 13,
      textAlignVertical: "top",
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "700",
      marginBottom: 12,
    },
    saveButton: {
      backgroundColor: colors.gold,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    saveButtonText: {
      color: colors.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    disabledButton: {
      opacity: 0.55,
    },
    fullRatingButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor:
        colors.mode === "dark" ? "rgba(212,175,55,0.10)" : "#FFF8E8",
    },
    fullRatingText: {
      color: colors.gold,
      fontSize: 14,
      fontWeight: "900",
      textTransform: "uppercase",
    },
  });
}