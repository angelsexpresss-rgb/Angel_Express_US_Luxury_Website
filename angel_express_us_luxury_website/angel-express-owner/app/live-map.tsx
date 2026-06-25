import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { supabase } from "../lib/supabase";

export default function LiveMapScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadLiveLocations();

      const interval = setInterval(() => {
        loadLiveLocations(false);
      }, 8000);

      return () => clearInterval(interval);
    }, [])
  );

  async function loadLiveLocations(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      const { data, error } = await supabase
        .from("driver_live_locations")
        .select("*")
        .order("last_updated", { ascending: false });

      if (error) throw error;

      setLocations(data || []);
    } catch (err: any) {
      Alert.alert("Map Error", err.message || "Unable to load live map.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function callPhone(phone?: string) {
    if (!phone) {
      Alert.alert("No phone number", "Phone number is not available.");
      return;
    }

    Linking.openURL(`tel:${phone}`);
  }

  function textPhone(phone?: string, message?: string) {
    if (!phone) {
      Alert.alert("No phone number", "Phone number is not available.");
      return;
    }

    Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message || "")}`);
  }

  async function triggerEmergency(item: any) {
    Alert.alert(
      "Emergency Intervention",
      `Create emergency alert for Trip #${item.booking_id}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create Alert",
          style: "destructive",
          onPress: async () => {
            try {
              const { error: insertError } = await supabase
                .from("emergency_alerts")
                .insert({
                  booking_id: item.booking_id,
                  driver_id: item.driver_id,
                  alert_type: "Owner Intervention",
                  notes: `Owner created emergency intervention for ${item.passenger_name || "passenger"}.`,
                });

              if (insertError) throw insertError;

              const { error: updateError } = await supabase
                .from("driver_live_locations")
                .update({
                  emergency_status: "owner_intervention",
                  emergency_message: "Owner intervention triggered",
                  last_updated: new Date().toISOString(),
                })
                .eq("id", item.id);

              if (updateError) throw updateError;

              Alert.alert("Emergency Alert Created", "This trip is now flagged.");
              loadLiveLocations(false);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Unable to create alert.");
            }
          },
        },
      ]
    );
  }

  const firstLocation = locations[0];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading Live Map...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadLiveLocations(false);
          }}
        />
      }
    >
      <Text style={styles.title}>🗺️ Live Trip Map V2</Text>

      <Text style={styles.subtitle}>
        Professional dispatch view for active Angel Express rides.
      </Text>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      {locations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No live driver locations</Text>
          <Text style={styles.emptyText}>
            When a driver opens an active trip, their GPS will appear here.
          </Text>
        </View>
      ) : (
        <>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: Number(firstLocation.latitude),
              longitude: Number(firstLocation.longitude),
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
          >
            {locations.map((item) => {
              const driverPoint = {
                latitude: Number(item.latitude),
                longitude: Number(item.longitude),
              };

              const pickupPoint =
                item.pickup_lat && item.pickup_lng
                  ? {
                      latitude: Number(item.pickup_lat),
                      longitude: Number(item.pickup_lng),
                    }
                  : null;

              const dropoffPoint =
                item.dropoff_lat && item.dropoff_lng
                  ? {
                      latitude: Number(item.dropoff_lat),
                      longitude: Number(item.dropoff_lng),
                    }
                  : null;

              const targetPoint =
                item.status === "in_progress" ? dropoffPoint : pickupPoint;

              return (
                <View key={item.id}>
                  <Marker
                    coordinate={driverPoint}
                    title={`🚘 ${item.driver_name || "Driver"}`}
                    description={`Trip #${item.booking_id} • ${Number(
                      item.speed_mph || 0
                    ).toFixed(1)} mph`}
                    pinColor={
                      item.emergency_status &&
                      item.emergency_status !== "normal"
                        ? "red"
                        : "blue"
                    }
                  />

                  {pickupPoint && (
                    <Marker
                      coordinate={pickupPoint}
                      title="📍 Pickup"
                      description={item.passenger_name || "Passenger pickup"}
                      pinColor="green"
                    />
                  )}

                  {dropoffPoint && (
                    <Marker
                      coordinate={dropoffPoint}
                      title="🏁 Dropoff"
                      description="Trip destination"
                      pinColor="red"
                    />
                  )}

                  {targetPoint && (
                    <Polyline
                      coordinates={[driverPoint, targetPoint]}
                      strokeWidth={4}
                    />
                  )}
                </View>
              );
            })}
          </MapView>

          <Text style={styles.sectionTitle}>Live Dispatch Cards</Text>

          {locations.map((item) => {
            const speed = Number(item.speed_mph || 0);
            const eta = item.eta_minutes
              ? `${Number(item.eta_minutes).toFixed(0)} min`
              : "Calculating";

            const distance = item.distance_to_target_miles
              ? `${Number(item.distance_to_target_miles).toFixed(2)} miles`
              : "Calculating";

            const isEmergency =
              item.emergency_status && item.emergency_status !== "normal";

            return (
              <View
                key={item.id}
                style={[
                  styles.locationCard,
                  isEmergency && styles.emergencyCard,
                ]}
              >
                <Text style={styles.cardTitle}>Trip #{item.booking_id}</Text>

                <Text style={styles.phaseText}>
                  {item.trip_phase || "Trip phase pending"}
                </Text>

                <Text style={styles.cardText}>
                  🚘 Driver: {item.driver_name || "Driver not listed"}
                </Text>

                <Text style={styles.cardText}>
                  👤 Passenger: {item.passenger_name || "Passenger not listed"}
                </Text>

                <Text style={styles.cardText}>
                  ⚡ Speed: {speed.toFixed(1)} mph
                </Text>

                <Text
                  style={[
                    styles.cardText,
                    speed > 85 && styles.warningText,
                  ]}
                >
                  Speed Alert: {speed > 85 ? "Possible speeding" : "Normal"}
                </Text>

                <Text style={styles.cardText}>⏱ ETA: {eta}</Text>

                <Text style={styles.cardText}>📍 Distance: {distance}</Text>

                <Text style={styles.cardText}>
                  🚨 Emergency: {item.emergency_status || "normal"}
                </Text>

                <Text style={styles.cardText}>
                  📡 Last Updated:{" "}
                  {item.last_updated
                    ? new Date(item.last_updated).toLocaleString()
                    : "Unknown"}
                </Text>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => callPhone(item.driver_phone)}
                  >
                    <Text style={styles.actionText}>Call Driver</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => callPhone(item.passenger_phone)}
                  >
                    <Text style={styles.actionText}>Call Passenger</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.smsButton}
                    onPress={() =>
                      textPhone(
                        item.driver_phone,
                        `Angel Express dispatch checking on Trip #${item.booking_id}.`
                      )
                    }
                  >
                    <Text style={styles.smsText}>Text Driver</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dangerButton}
                    onPress={() => triggerEmergency(item)}
                  >
                    <Text style={styles.dangerText}>Emergency</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </>
      )}

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111f",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#07111f",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    marginTop: 50,
  },
  subtitle: {
    color: "#d4af37",
    marginBottom: 14,
    lineHeight: 21,
  },
  backButton: {
    backgroundColor: "rgba(212,175,55,0.15)",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  backButtonText: {
    color: "#d4af37",
    fontWeight: "900",
    textAlign: "center",
  },
  map: {
    height: 390,
    borderRadius: 20,
    marginBottom: 22,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  emptyText: {
    color: "#cbd5e1",
    lineHeight: 21,
  },
  locationCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  emergencyCard: {
    borderColor: "#dc2626",
    backgroundColor: "#1f0f12",
  },
  cardTitle: {
    color: "#d4af37",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  phaseText: {
    color: "#22c55e",
    fontWeight: "900",
    marginBottom: 10,
  },
  cardText: {
    color: "#fff",
    marginBottom: 6,
    lineHeight: 20,
  },
  warningText: {
    color: "#f97316",
    fontWeight: "900",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#d4af37",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  actionText: {
    color: "#07111f",
    fontWeight: "900",
    fontSize: 12,
  },
  smsButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  smsText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  dangerButton: {
    flex: 1,
    backgroundColor: "#dc2626",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  dangerText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  bottomSpace: {
    height: 50,
  },
});