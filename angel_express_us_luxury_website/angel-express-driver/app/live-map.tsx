import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { supabase } from "../lib/supabase";
import { useDriverTheme, v5Shadow } from "../lib/driverTheme";

export default function LiveMapScreen() {
  const { colors, themeMode, toggleTheme } = useDriverTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      Alert.alert("No phone number", "Phone number is not available yet.");
      return;
    }

    Linking.openURL(`tel:${phone}`);
  }

  const firstLocation = locations[0];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading Live Map...</Text>
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
              tintColor={colors.gold}
              onRefresh={() => {
                setRefreshing(true);
                loadLiveLocations(false);
              }}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>🗺️ Live Trip Map</Text>
          <Text style={styles.subtitle}>
            Track active Angel Express drivers in real time.
          </Text>

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
                {locations.map((item) => (
                  <Marker
                    key={item.id}
                    coordinate={{
                      latitude: Number(item.latitude),
                      longitude: Number(item.longitude),
                    }}
                    title={`Trip #${item.booking_id}`}
                    description={`Speed: ${Number(item.speed_mph || 0).toFixed(
                      1
                    )} mph • Status: ${item.status || "active"}`}
                  />
                ))}
              </MapView>

              <Text style={styles.sectionTitle}>Live Driver Activity</Text>

              {locations.map((item) => (
                <View key={item.id} style={styles.locationCard}>
                  <Text style={styles.cardTitle}>Trip #{item.booking_id}</Text>

                  <Text style={styles.cardText}>
                    Driver ID: {item.driver_id || "Unknown"}
                  </Text>

                  <Text style={styles.cardText}>
                    Driver: {item.driver_name || "Not provided"}
                  </Text>

                  <Text style={styles.cardText}>
                    Passenger: {item.passenger_name || "Not provided"}
                  </Text>

                  <Text style={styles.cardText}>
                    Speed: {Number(item.speed_mph || 0).toFixed(1)} mph
                  </Text>

                  <Text style={styles.cardText}>
                    Heading: {Number(item.heading || 0).toFixed(0)}°
                  </Text>

                  <Text style={styles.cardText}>
                    Status: {item.status || "active"}
                  </Text>

                  <Text style={styles.cardText}>
                    Emergency: {item.emergency_status || "normal"}
                  </Text>

                  <Text style={styles.cardText}>
                    Last Updated:{" "}
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
                      style={styles.dangerButton}
                      onPress={() =>
                        Alert.alert(
                          "Emergency Tools",
                          "Next step: owner can flag incident, call driver, call passenger, and mark emergency."
                        )
                      }
                    >
                      <Text style={styles.dangerText}>Emergency</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={styles.bottomSpace} />
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
      padding: 20,
      paddingTop: 60,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      color: colors.text,
      marginTop: 10,
      fontWeight: "800",
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    },
    backButton: {
      backgroundColor:
        colors.mode === "dark" ? "rgba(212,175,55,0.15)" : "#FFF8E8",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    backButtonText: {
      color: colors.gold,
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
      fontSize: 28,
      fontWeight: "900",
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      color: colors.gold,
      marginBottom: 18,
      fontWeight: "800",
      lineHeight: 21,
    },
    map: {
      height: 360,
      borderRadius: 20,
      marginBottom: 22,
      overflow: "hidden",
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 12,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      ...v5Shadow(colors),
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 6,
    },
    emptyText: {
      color: colors.text2,
      lineHeight: 21,
      fontWeight: "700",
    },
    locationCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    cardTitle: {
      color: colors.gold,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 8,
    },
    cardText: {
      color: colors.text,
      marginBottom: 5,
      fontWeight: "700",
      lineHeight: 20,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 12,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.gold,
      padding: 12,
      borderRadius: 10,
      alignItems: "center",
    },
    actionText: {
      color: colors.navy,
      fontWeight: "900",
    },
    dangerButton: {
      flex: 1,
      backgroundColor: colors.danger,
      padding: 12,
      borderRadius: 10,
      alignItems: "center",
    },
    dangerText: {
      color: "#FFFFFF",
      fontWeight: "900",
    },
    bottomSpace: {
      height: 50,
    },
  });
}