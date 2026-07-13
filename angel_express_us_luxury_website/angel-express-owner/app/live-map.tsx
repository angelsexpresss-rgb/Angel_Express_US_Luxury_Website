import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";

import { useOwnerTheme } from "../lib/ownerTheme";
import { supabase } from "../lib/supabase";

type GenericRecord = Record<string, any>;

type DriverRecord = GenericRecord & {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  is_online?: boolean | null;
  status?: string | null;
  current_trip_id?: string | number | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  plate_number?: string | null;
};

type BookingRecord = GenericRecord & {
  id: string | number;
  status?: string | null;
  source?: string | null;
  user_id?: string | null;
  passenger_id?: string | null;
  name?: string | null;
  passenger_name?: string | null;
  email?: string | null;
  phone?: string | null;
  passenger_phone?: string | null;
  pickup?: string | null;
  pickup_address?: string | null;
  pickup_location?: string | null;
  dropoff?: string | null;
  dropoff_address?: string | null;
  dropoff_location?: string | null;
  destination?: string | null;
  driver_id?: string | null;
  assigned_driver_id?: string | null;
  driver_name?: string | null;
  assigned_driver_name?: string | null;
  driver_phone?: string | null;
  assigned_driver_phone?: string | null;
};

type LiveLocation = GenericRecord & {
  id: string;
  driver_id?: string | null;
  booking_id?: string | number | null;
  latitude?: number | null;
  longitude?: number | null;
  speed_mph?: number | string | null;
  heading?: number | string | null;
  status?: string | null;
  emergency_status?: string | null;
  last_updated?: string | null;
  created_at?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  passenger_name?: string | null;
  passenger_phone?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  eta_minutes?: number | string | null;
  distance_to_target_miles?: number | string | null;
  emergency_message?: string | null;
  vehicle_type?: string | null;
  trip_phase?: string | null;
};

type MapFilter =
  | "all"
  | "online"
  | "active"
  | "assigned"
  | "emergency";

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function driverName(driver?: DriverRecord, location?: LiveLocation) {
  if (location?.driver_name) return location.driver_name;

  if (!driver) return "Driver";

  return (
    `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
    driver.full_name ||
    "Driver"
  );
}

function passengerName(
  booking?: BookingRecord,
  location?: LiveLocation
) {
  return (
    location?.passenger_name ||
    booking?.passenger_name ||
    booking?.name ||
    booking?.email ||
    "Passenger"
  );
}

function passengerPhone(
  booking?: BookingRecord,
  location?: LiveLocation
) {
  return (
    location?.passenger_phone ||
    booking?.passenger_phone ||
    booking?.phone ||
    ""
  );
}

function driverPhone(
  booking?: BookingRecord,
  location?: LiveLocation,
  driver?: DriverRecord
) {
  return (
    location?.driver_phone ||
    booking?.assigned_driver_phone ||
    booking?.driver_phone ||
    driver?.phone ||
    ""
  );
}

function cleanPhone(value?: string | null) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function isEmergency(location: LiveLocation) {
  return (
    normalize(location.emergency_status) !== "" &&
    normalize(location.emergency_status) !== "normal"
  );
}

function isActiveStatus(value?: string | null) {
  return [
    "assigned",
    "driverassigned",
    "driveraccepted",
    "accepted",
    "arriving",
    "driverarrived",
    "arrivedatpickup",
    "pickedup",
    "inprogress",
    "active",
    "started",
  ].includes(normalize(value));
}

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#07111f" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#b9c2cf" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#07111f" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#334155" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#334155" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#111827" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#020617" }],
  },
];

export default function LiveMapScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { bookingId } = useLocalSearchParams<{
    bookingId?: string;
  }>();
  const { width } = useWindowDimensions();

  const mapRef = useRef<MapView | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [locations, setLocations] = useState<LiveLocation[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);

  const [filter, setFilter] = useState<MapFilter>("all");
  const [selectedLocation, setSelectedLocation] =
    useState<LiveLocation | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const isTablet = width >= 700;
  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadMapData();

      const interval = setInterval(() => {
        loadMapData(false);
      }, 8000);

      return () => clearInterval(interval);
    }, [])
  );

  useEffect(() => {
    const channel = supabase
      .channel("owner-live-map-v5")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_live_locations",
        },
        () => loadMapData(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => loadMapData(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        () => loadMapData(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadMapData(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const [
        locationsResponse,
        bookingsResponse,
        driversResponse,
      ] = await Promise.all([
        supabase
          .from("driver_live_locations")
          .select("*")
          .order("last_updated", { ascending: false }),

        supabase.from("bookings").select("*"),

        supabase.from("drivers").select("*"),
      ]);

      if (locationsResponse.error) throw locationsResponse.error;
      if (bookingsResponse.error) throw bookingsResponse.error;
      if (driversResponse.error) throw driversResponse.error;

      setLocations(locationsResponse.data || []);
      setBookings(bookingsResponse.data || []);
      setDrivers(driversResponse.data || []);
    } catch (error: any) {
      Alert.alert(
        "Live Map Error",
        error?.message || "Unable to load the live operations map."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function bookingFor(location: LiveLocation) {
    return bookings.find(
      (booking) =>
        String(booking.id) === String(location.booking_id || "")
    );
  }

  function driverFor(location: LiveLocation) {
    return drivers.find(
      (driver) =>
        String(driver.id) === String(location.driver_id || "")
    );
  }

  function matchesFilter(location: LiveLocation) {
    const booking = bookingFor(location);
    const driver = driverFor(location);

    switch (filter) {
      case "online":
        return driver?.is_online === true;
      case "active":
        return isActiveStatus(
          booking?.status || location.trip_phase || location.status
        );
      case "assigned":
        return Boolean(
          booking?.driver_id ||
            booking?.assigned_driver_id ||
            location.driver_id
        );
      case "emergency":
        return isEmergency(location);
      case "all":
      default:
        return true;
    }
  }

  const filteredLocations = useMemo(
    () => locations.filter(matchesFilter),
    [locations, bookings, drivers, filter]
  );

  const region = useMemo<Region>(() => {
    const requested = bookingId
      ? locations.find(
          (location) =>
            String(location.booking_id) === String(bookingId)
        )
      : undefined;

    const first = requested || filteredLocations[0] || locations[0];

    return {
      latitude: Number(first?.latitude || 32.7767),
      longitude: Number(first?.longitude || -96.797),
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [locations, filteredLocations, bookingId]);

  useEffect(() => {
    if (!bookingId || locations.length === 0) return;

    const target = locations.find(
      (location) =>
        String(location.booking_id) === String(bookingId)
    );

    if (!target) return;

    centerOnLocation(target);
    setSelectedLocation(target);
  }, [bookingId, locations]);

  function centerOnLocation(location: LiveLocation) {
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      },
      500
    );
  }

  function fitAllMarkers() {
    const coordinates = filteredLocations
      .map((location) => ({
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
      }))
      .filter(
        (point) =>
          Number.isFinite(point.latitude) &&
          Number.isFinite(point.longitude)
      );

    if (coordinates.length === 0) return;

    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: {
        top: 80,
        right: 60,
        bottom: 80,
        left: 60,
      },
      animated: true,
    });
  }

  function callPhone(phone?: string | null) {
    const cleaned = cleanPhone(phone);

    if (!cleaned) {
      Alert.alert("Phone unavailable", "No phone number is available.");
      return;
    }

    Linking.openURL(`tel:${cleaned}`);
  }

  function textPhone(
    phone: string | null | undefined,
    message: string
  ) {
    const cleaned = cleanPhone(phone);

    if (!cleaned) {
      Alert.alert("Phone unavailable", "No phone number is available.");
      return;
    }

    Linking.openURL(
      `sms:${cleaned}?body=${encodeURIComponent(message)}`
    );
  }

  async function triggerEmergency(location: LiveLocation) {
    const booking = bookingFor(location);

    Alert.alert(
      "Emergency Intervention",
      `Create an emergency intervention for Trip #${
        location.booking_id || "Unknown"
      }?`,
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
                  booking_id: location.booking_id || null,
                  driver_id: location.driver_id || null,
                  alert_type: "Owner Intervention",
                  notes: `Owner intervention created for ${passengerName(
                    booking,
                    location
                  )}.`,
                });

              if (insertError) throw insertError;

              const { error: updateError } = await supabase
                .from("driver_live_locations")
                .update({
                  emergency_status: "owner_intervention",
                  emergency_message: "Owner intervention triggered",
                  last_updated: new Date().toISOString(),
                })
                .eq("id", location.id);

              if (updateError) throw updateError;

              Alert.alert(
                "Emergency Alert Created",
                "This trip is now flagged."
              );

              loadMapData(false);
            } catch (error: any) {
              Alert.alert(
                "Emergency Error",
                error?.message || "Unable to create the alert."
              );
            }
          },
        },
      ]
    );
  }

  const summary = useMemo(() => {
    const online = locations.filter(
      (location) => driverFor(location)?.is_online === true
    );

    const active = locations.filter((location) =>
      isActiveStatus(
        bookingFor(location)?.status ||
          location.trip_phase ||
          location.status
      )
    );

    const emergency = locations.filter(isEmergency);

    const averageSpeed =
      locations.length > 0
        ? locations.reduce(
            (sum, location) =>
              sum + Number(location.speed_mph || 0),
            0
          ) / locations.length
        : 0;

    const etaRows = locations
      .map((location) => Number(location.eta_minutes || 0))
      .filter((value) => value > 0);

    const averageEta =
      etaRows.length > 0
        ? etaRows.reduce((sum, value) => sum + value, 0) /
          etaRows.length
        : 0;

    return {
      online,
      active,
      emergency,
      averageSpeed,
      averageEta,
    };
  }, [locations, drivers, bookings]);

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
          Loading Live Dispatch Map...
        </Text>
      </View>
    );
  }

  const filters: {
    key: MapFilter;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: "all", label: "All", icon: "map-outline" },
    { key: "online", label: "Online", icon: "radio-outline" },
    {
      key: "active",
      label: "Active",
      icon: "navigate-outline",
    },
    {
      key: "assigned",
      label: "Assigned",
      icon: "person-add-outline",
    },
    {
      key: "emergency",
      label: "Emergency",
      icon: "warning-outline",
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
                await loadMapData(false);
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
                ANGEL EXPRESS OPERATIONS
              </Text>

              <Text
                style={[
                  styles.pageTitle,
                  { color: theme.colors.text },
                ]}
              >
                Live Dispatch Map
              </Text>

              <Text
                style={[
                  styles.pageSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Track moving drivers, pickup points, destinations, trip
                phases, speed, ETA, and emergency activity.
              </Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            {[
              {
                label: "Live Locations",
                value: locations.length,
                icon: "location-outline" as const,
                color: theme.colors.gold,
              },
              {
                label: "Drivers Online",
                value: summary.online.length,
                icon: "radio-outline" as const,
                color: theme.colors.success,
              },
              {
                label: "Active Trips",
                value: summary.active.length,
                icon: "navigate-outline" as const,
                color: theme.colors.info,
              },
              {
                label: "Emergencies",
                value: summary.emergency.length,
                icon: "warning-outline" as const,
                color:
                  summary.emergency.length > 0
                    ? theme.colors.danger
                    : theme.colors.success,
              },
              {
                label: "Average ETA",
                value:
                  summary.averageEta > 0
                    ? `${summary.averageEta.toFixed(0)} min`
                    : "--",
                icon: "time-outline" as const,
                color: theme.colors.gold,
              },
              {
                label: "Average Speed",
                value: `${summary.averageSpeed.toFixed(0)} mph`,
                icon: "speedometer-outline" as const,
                color: theme.colors.info,
              },
            ].map((item) => (
              <View
                key={item.label}
                style={[
                  styles.metricCard,
                  {
                    width: isLarge
                      ? "15.7%"
                      : isTablet
                        ? "31.8%"
                        : "48%",
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.cardBorder,
                  },
                  theme.shadows.soft,
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={21}
                  color={item.color}
                />

                <Text
                  style={[
                    styles.metricValue,
                    { color: theme.colors.text },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {item.value}
                </Text>

                <Text
                  style={[
                    styles.metricLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {item.label}
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
              theme.shadows.soft,
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
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={
                        selected
                          ? theme.colors.gold
                          : theme.colors.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color: selected
                            ? theme.colors.gold
                            : theme.colors.textMuted,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.fitButton,
                {
                  backgroundColor: theme.colors.gold,
                },
              ]}
              onPress={fitAllMarkers}
            >
              <Ionicons
                name="scan-outline"
                size={17}
                color={theme.colors.textInverse}
              />
              <Text
                style={[
                  styles.fitButtonText,
                  { color: theme.colors.textInverse },
                ]}
              >
                Fit All
              </Text>
            </TouchableOpacity>
          </View>

          {filteredLocations.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Ionicons
                name="map-outline"
                size={34}
                color={theme.colors.gold}
              />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.text },
                ]}
              >
                No live locations
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textMuted },
                ]}
              >
                Driver GPS locations will appear when the Driver App
                publishes live trip coordinates.
              </Text>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.mapFrame,
                  {
                    borderColor: theme.colors.cardBorderStrong,
                    backgroundColor: theme.colors.card,
                  },
                  theme.shadows.premium,
                ]}
              >
                <MapView
                  ref={(ref) => {
                    mapRef.current = ref;
                  }}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={region}
                  customMapStyle={isDark ? DARK_MAP_STYLE : undefined}
                  showsCompass
                  showsTraffic
                  showsUserLocation={false}
                >
                  {filteredLocations.map((location) => {
                    const driverPoint = {
                      latitude: Number(location.latitude),
                      longitude: Number(location.longitude),
                    };

                    const pickupPoint =
                      location.pickup_lat != null &&
                      location.pickup_lng != null
                        ? {
                            latitude: Number(location.pickup_lat),
                            longitude: Number(location.pickup_lng),
                          }
                        : null;

                    const dropoffPoint =
                      location.dropoff_lat != null &&
                      location.dropoff_lng != null
                        ? {
                            latitude: Number(location.dropoff_lat),
                            longitude: Number(location.dropoff_lng),
                          }
                        : null;

                    const activeStatus = normalize(
                      bookingFor(location)?.status ||
                        location.trip_phase ||
                        location.status
                    );

                    const target =
                      [
                        "pickedup",
                        "inprogress",
                        "active",
                        "started",
                      ].includes(activeStatus)
                        ? dropoffPoint
                        : pickupPoint;

                    const emergency = isEmergency(location);

                    return (
                      <View key={location.id}>
                        <Marker
                          coordinate={driverPoint}
                          title={`${
                            emergency ? "⚠️" : "🚘"
                          } ${driverName(
                            driverFor(location),
                            location
                          )}`}
                          description={`Trip #${
                            location.booking_id || "Unassigned"
                          } • ${Number(
                            location.speed_mph || 0
                          ).toFixed(1)} mph`}
                          pinColor={emergency ? "red" : "#d4af37"}
                          onPress={() =>
                            setSelectedLocation(location)
                          }
                        />

                        {pickupPoint ? (
                          <Marker
                            coordinate={pickupPoint}
                            title="Pickup"
                            description={passengerName(
                              bookingFor(location),
                              location
                            )}
                            pinColor="green"
                          />
                        ) : null}

                        {dropoffPoint ? (
                          <Marker
                            coordinate={dropoffPoint}
                            title="Destination"
                            description="Trip destination"
                            pinColor="red"
                          />
                        ) : null}

                        {target ? (
                          <Polyline
                            coordinates={[driverPoint, target]}
                            strokeWidth={4}
                            strokeColor={
                              emergency ? "#dc2626" : "#d4af37"
                            }
                          />
                        ) : null}
                      </View>
                    );
                  })}
                </MapView>

                <View style={styles.mapOverlayTop}>
                  <View
                    style={[
                      styles.liveBadge,
                      {
                        backgroundColor: theme.colors.successSoft,
                        borderColor: theme.colors.success,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.liveDot,
                        { backgroundColor: theme.colors.success },
                      ]}
                    />
                    <Text
                      style={[
                        styles.liveText,
                        { color: theme.colors.success },
                      ]}
                    >
                      LIVE DISPATCH
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <View>
                  <Text
                    style={[
                      styles.sectionEyebrow,
                      { color: theme.colors.gold },
                    ]}
                  >
                    LIVE FLEET
                  </Text>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Dispatch Cards
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => router.push("/live-trips")}
                >
                  <Text
                    style={[
                      styles.viewBoardText,
                      { color: theme.colors.gold },
                    ]}
                  >
                    Open Board
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardGrid}>
                {filteredLocations.map((location) => {
                  const booking = bookingFor(location);
                  const driver = driverFor(location);
                  const emergency = isEmergency(location);
                  const speed = Number(location.speed_mph || 0);
                  const eta = Number(location.eta_minutes || 0);
                  const distance = Number(
                    location.distance_to_target_miles || 0
                  );

                  return (
                    <TouchableOpacity
                      key={location.id}
                      activeOpacity={0.86}
                      style={[
                        styles.dispatchCard,
                        {
                          width: isLarge ? "48.8%" : "100%",
                          backgroundColor: theme.colors.card,
                          borderColor: emergency
                            ? theme.colors.danger
                            : theme.colors.cardBorder,
                        },
                        theme.shadows.soft,
                      ]}
                      onPress={() => {
                        setSelectedLocation(location);
                        centerOnLocation(location);
                      }}
                    >
                      <View style={styles.dispatchHeader}>
                        <View
                          style={[
                            styles.dispatchIcon,
                            {
                              backgroundColor: emergency
                                ? theme.colors.dangerSoft
                                : theme.colors.goldTransparent,
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              emergency
                                ? "warning-outline"
                                : "car-sport-outline"
                            }
                            size={22}
                            color={
                              emergency
                                ? theme.colors.danger
                                : theme.colors.gold
                            }
                          />
                        </View>

                        <View style={styles.dispatchTitleArea}>
                          <Text
                            style={[
                              styles.dispatchTitle,
                              { color: theme.colors.text },
                            ]}
                          >
                            Trip #{location.booking_id || "Unassigned"}
                          </Text>

                          <Text
                            style={[
                              styles.dispatchSubtitle,
                              { color: theme.colors.textMuted },
                            ]}
                            numberOfLines={1}
                          >
                            {driverName(driver, location)}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.phaseBadge,
                            {
                              backgroundColor: emergency
                                ? theme.colors.dangerSoft
                                : theme.colors.infoSoft,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.phaseText,
                              {
                                color: emergency
                                  ? theme.colors.danger
                                  : theme.colors.info,
                              },
                            ]}
                          >
                            {location.trip_phase ||
                              booking?.status ||
                              "Live"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.dispatchMetrics}>
                        <View style={styles.dispatchMetric}>
                          <Ionicons
                            name="speedometer-outline"
                            size={18}
                            color={
                              speed > 85
                                ? theme.colors.danger
                                : theme.colors.success
                            }
                          />
                          <Text
                            style={[
                              styles.dispatchMetricValue,
                              { color: theme.colors.text },
                            ]}
                          >
                            {speed.toFixed(0)}
                          </Text>
                          <Text
                            style={[
                              styles.dispatchMetricLabel,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            mph
                          </Text>
                        </View>

                        <View style={styles.dispatchMetric}>
                          <Ionicons
                            name="time-outline"
                            size={18}
                            color={theme.colors.info}
                          />
                          <Text
                            style={[
                              styles.dispatchMetricValue,
                              { color: theme.colors.text },
                            ]}
                          >
                            {eta > 0 ? eta.toFixed(0) : "--"}
                          </Text>
                          <Text
                            style={[
                              styles.dispatchMetricLabel,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            min ETA
                          </Text>
                        </View>

                        <View style={styles.dispatchMetric}>
                          <Ionicons
                            name="navigate-circle-outline"
                            size={18}
                            color={theme.colors.gold}
                          />
                          <Text
                            style={[
                              styles.dispatchMetricValue,
                              { color: theme.colors.text },
                            ]}
                          >
                            {distance > 0
                              ? distance.toFixed(1)
                              : "--"}
                          </Text>
                          <Text
                            style={[
                              styles.dispatchMetricLabel,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            miles
                          </Text>
                        </View>
                      </View>

                      <View style={styles.passengerRow}>
                        <Ionicons
                          name="person-outline"
                          size={18}
                          color={theme.colors.info}
                        />
                        <Text
                          style={[
                            styles.passengerText,
                            { color: theme.colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {passengerName(booking, location)}
                        </Text>
                      </View>

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.cardAction}
                          onPress={() =>
                            callPhone(
                              driverPhone(
                                booking,
                                location,
                                driver
                              )
                            )
                          }
                        >
                          <Ionicons
                            name="call-outline"
                            size={18}
                            color={theme.colors.success}
                          />
                          <Text
                            style={[
                              styles.cardActionText,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            Driver
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cardAction}
                          onPress={() =>
                            callPhone(
                              passengerPhone(booking, location)
                            )
                          }
                        >
                          <Ionicons
                            name="person-circle-outline"
                            size={18}
                            color={theme.colors.info}
                          />
                          <Text
                            style={[
                              styles.cardActionText,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            Passenger
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cardAction}
                          onPress={() =>
                            textPhone(
                              driverPhone(
                                booking,
                                location,
                                driver
                              ),
                              `Angel Express dispatch is checking on Trip #${location.booking_id}.`
                            )
                          }
                        >
                          <Ionicons
                            name="chatbubble-outline"
                            size={18}
                            color={theme.colors.gold}
                          />
                          <Text
                            style={[
                              styles.cardActionText,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            Message
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cardAction}
                          onPress={() =>
                            triggerEmergency(location)
                          }
                        >
                          <Ionicons
                            name="warning-outline"
                            size={18}
                            color={theme.colors.danger}
                          />
                          <Text
                            style={[
                              styles.cardActionText,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            SOS
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cardAction}
                          onPress={() => {
                            setSelectedLocation(location);
                            setDetailsVisible(true);
                          }}
                        >
                          <Ionicons
                            name="information-circle-outline"
                            size={18}
                            color={theme.colors.gold}
                          />
                          <Text
                            style={[
                              styles.cardActionText,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            Details
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>

        <Modal
          visible={detailsVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDetailsVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.detailsModal,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.cardBorderStrong,
                },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: theme.colors.divider },
                ]}
              >
                <View style={styles.modalTitleArea}>
                  <Text
                    style={[
                      styles.modalEyebrow,
                      { color: theme.colors.gold },
                    ]}
                  >
                    LIVE LOCATION DETAILS
                  </Text>

                  <Text
                    style={[
                      styles.modalTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Trip #{selectedLocation?.booking_id || "Unassigned"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalClose,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                  onPress={() => setDetailsVisible(false)}
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {selectedLocation ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.detailsContent}
                >
                  {[
                    [
                      "Driver",
                      driverName(
                        driverFor(selectedLocation),
                        selectedLocation
                      ),
                    ],
                    [
                      "Passenger",
                      passengerName(
                        bookingFor(selectedLocation),
                        selectedLocation
                      ),
                    ],
                    [
                      "Trip Phase",
                      selectedLocation.trip_phase ||
                        bookingFor(selectedLocation)?.status ||
                        "Unknown",
                    ],
                    [
                      "Latitude",
                      Number(selectedLocation.latitude || 0).toFixed(
                        6
                      ),
                    ],
                    [
                      "Longitude",
                      Number(selectedLocation.longitude || 0).toFixed(
                        6
                      ),
                    ],
                    [
                      "Speed",
                      `${Number(
                        selectedLocation.speed_mph || 0
                      ).toFixed(1)} mph`,
                    ],
                    [
                      "Heading",
                      `${Number(
                        selectedLocation.heading || 0
                      ).toFixed(0)}°`,
                    ],
                    [
                      "ETA",
                      selectedLocation.eta_minutes
                        ? `${Number(
                            selectedLocation.eta_minutes
                          ).toFixed(0)} minutes`
                        : "Unavailable",
                    ],
                    [
                      "Distance",
                      selectedLocation.distance_to_target_miles
                        ? `${Number(
                            selectedLocation.distance_to_target_miles
                          ).toFixed(2)} miles`
                        : "Unavailable",
                    ],
                    [
                      "Emergency",
                      selectedLocation.emergency_status || "normal",
                    ],
                    [
                      "Emergency Message",
                      selectedLocation.emergency_message ||
                        "No emergency message",
                    ],
                    [
                      "Last Updated",
                      selectedLocation.last_updated
                        ? new Date(
                            selectedLocation.last_updated
                          ).toLocaleString()
                        : "Unknown",
                    ],
                  ].map(([label, value]) => (
                    <View
                      key={label}
                      style={[
                        styles.detailsRow,
                        { borderBottomColor: theme.colors.divider },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailsLabel,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {label}
                      </Text>

                      <Text
                        style={[
                          styles.detailsValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {value}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          </View>
        </Modal>
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
    maxWidth: 760,
  },

  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metricCard: {
    minHeight: 122,
    borderWidth: 1,
    borderRadius: 19,
    padding: 14,
    marginBottom: 13,
  },
  metricValue: {
    marginTop: 13,
    fontSize: 24,
    fontWeight: "900",
  },
  metricLabel: {
    marginTop: 5,
    fontSize: 10.5,
    fontWeight: "700",
  },

  filterPanel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    marginBottom: 18,
  },
  filterRow: {
    gap: 9,
    paddingRight: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterChipText: {
    marginLeft: 6,
    fontSize: 10.5,
    fontWeight: "800",
  },
  fitButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    marginTop: 12,
  },
  fitButtonText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "900",
  },

  mapFrame: {
    height: 500,
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 26,
  },
  map: {
    flex: 1,
  },
  mapOverlayTop: {
    position: "absolute",
    top: 14,
    left: 14,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 7,
  },
  liveText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  sectionEyebrow: {
    marginBottom: 5,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  viewBoardText: {
    fontSize: 12,
    fontWeight: "900",
  },

  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dispatchCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 17,
    marginBottom: 15,
  },
  dispatchHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  dispatchIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dispatchTitleArea: {
    flex: 1,
    paddingRight: 8,
  },
  dispatchTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  dispatchSubtitle: {
    marginTop: 4,
    fontSize: 10.5,
    fontWeight: "600",
  },
  phaseBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    maxWidth: 115,
  },
  phaseText: {
    fontSize: 8.5,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "capitalize",
  },

  dispatchMetrics: {
    flexDirection: "row",
    marginTop: 18,
  },
  dispatchMetric: {
    flex: 1,
    alignItems: "center",
  },
  dispatchMetricValue: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: "900",
  },
  dispatchMetricLabel: {
    marginTop: 3,
    fontSize: 8.5,
    fontWeight: "700",
  },

  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 17,
  },
  passengerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11.5,
    fontWeight: "700",
  },

  cardActions: {
    flexDirection: "row",
    marginTop: 16,
  },
  cardAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
  },
  cardActionText: {
    marginTop: 5,
    fontSize: 8,
    fontWeight: "700",
  },

  emptyState: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    padding: 30,
  },
  emptyTitle: {
    marginTop: 13,
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.66)",
    justifyContent: "flex-end",
  },
  detailsModal: {
    maxHeight: "90%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    padding: 18,
  },
  modalTitleArea: { flex: 1 },
  modalEyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  modalTitle: {
    marginTop: 4,
    fontSize: 21,
    fontWeight: "900",
  },
  modalClose: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsContent: {
    padding: 18,
    paddingBottom: 40,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingVertical: 13,
  },
  detailsLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
  },
  detailsValue: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "900",
    textAlign: "right",
  },
});
