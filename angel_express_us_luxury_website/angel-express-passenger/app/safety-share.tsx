import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BellRing,
  CarFront,
  CheckCircle2,
  Clock3,
  Copy,
  HeartHandshake,
  LocateFixed,
  MapPinned,
  MessageCircle,
  Navigation,
  Phone,
  Radio,
  RefreshCw,
  Route,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Smartphone,
  UserRound,
  UsersRound,
  Wifi,
  WifiOff,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const SUPPORT_PHONE = "19728367910";
const SUPPORT_EMAIL = "support@angelexpressus.com";

const ACTIVE_STATUSES = [
  "Pending",
  "Confirmed",
  "Driver Assigned",
  "Arrived at Pickup",
  "Picked Up",
  "In Progress",
  "pending_assignment",
  "assigned",
  "accepted",
  "confirmed",
  "driver_en_route",
  "en_route",
  "driver_arrived",
  "picked_up",
  "passenger_onboard",
  "in_progress",
];

type ConnectionState = "connecting" | "online" | "offline";

export default function SafetyShareScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sosSending, setSosSending] = useState(false);

  const [userId, setUserId] = useState("");
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [relationship, setRelationship] = useState("");

  // Optional trip-specific trusted contact. This does not overwrite
  // the passenger's primary emergency contact stored in their profile.
  const [additionalContactName, setAdditionalContactName] = useState("");
  const [additionalContactPhone, setAdditionalContactPhone] = useState("");
  const [additionalRelationship, setAdditionalRelationship] = useState("");

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  const selectedTrip = useMemo(
    () =>
      activeTrips.find((trip) => String(trip.id) === String(selectedTripId)) ||
      activeTrips[0] ||
      null,
    [activeTrips, selectedTripId]
  );

  useEffect(() => {
    const backgroundAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bgScale, {
          toValue: 1.04,
          duration: 8500,
          useNativeDriver: true,
        }),
        Animated.timing(bgScale, {
          toValue: 1,
          duration: 8500,
          useNativeDriver: true,
        }),
      ])
    );

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.07,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    backgroundAnimation.start();
    pulseAnimation.start();

    Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();

    return () => {
      backgroundAnimation.stop();
      pulseAnimation.stop();
    };
  }, [bgScale, pageFade, pulse]);

  useFocusEffect(
    useCallback(() => {
      loadSafetyShareData();
    }, [])
  );

  useEffect(() => {
    if (!selectedTrip?.id) {
      setConnectionState("offline");
      return;
    }

    setConnectionState("connecting");

    const bookingChannel = supabase
      .channel(`safety-booking-${selectedTrip.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${selectedTrip.id}`,
        },
        (payload) => {
          if (payload.new) {
            setActiveTrips((current) =>
              current.map((trip) =>
                String(trip.id) === String(selectedTrip.id)
                  ? { ...trip, ...(payload.new as any) }
                  : trip
              )
            );
            setLastUpdatedAt(new Date());
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnectionState("online");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionState("offline");
        }
      });

    return () => {
      supabase.removeChannel(bookingChannel);
    };
  }, [selectedTrip?.id]);

  useEffect(() => {
    const driverId =
      selectedTrip?.driver_id ||
      selectedTrip?.assigned_driver_id ||
      selectedTrip?.chauffeur_id;

    if (!driverId) {
      setDriverLocation(null);
      return;
    }

    loadDriverLocation(driverId);

    const locationChannel = supabase
      .channel(`safety-driver-location-${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_live_locations",
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          if (payload.new) {
            setDriverLocation(payload.new);
            setLastUpdatedAt(new Date());
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
    };
  }, [
    selectedTrip?.driver_id,
    selectedTrip?.assigned_driver_id,
    selectedTrip?.chauffeur_id,
  ]);

  async function loadSafetyShareData() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        router.replace("/login" as any);
        return;
      }

      setUserId(user.id);
      const userEmail = user.email?.trim().toLowerCase();

      const { data: profile, error: profileError } = await supabase
        .from("passenger_profiles")
        .select("emergency_name, emergency_phone, emergency_relationship")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setContactName(profile?.emergency_name || "");
      setContactPhone(profile?.emergency_phone || "");
      setRelationship(
        profile?.emergency_relationship || "Primary Emergency Contact"
      );

      const { data: trips, error: tripsError } = await supabase
        .from("bookings")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${userEmail}`)
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false });

      if (tripsError) throw tripsError;

      const nextTrips = trips || [];
      setActiveTrips(nextTrips);

      if (
        nextTrips.length > 0 &&
        !nextTrips.some((trip) => String(trip.id) === String(selectedTripId))
      ) {
        setSelectedTripId(nextTrips[0].id);
      }

      setLastUpdatedAt(new Date());
    } catch (error: any) {
      Alert.alert(
        "Safety Share Error",
        error.message || "Could not load your safety information."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadDriverLocation(driverId: any) {
    try {
      const { data, error } = await supabase
        .from("driver_live_locations")
        .select("*")
        .eq("driver_id", driverId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log("Driver location unavailable:", error.message);
        return;
      }

      setDriverLocation(data || null);
    } catch (error) {
      console.log("Driver location load failed:", error);
    }
  }

  function cleanPhone(phone: string) {
    return String(phone || "").replace(/\D/g, "");
  }

  function trackingLink(trip: any) {
    const key =
      trip?.invoice_number ||
      trip?.invoice_no ||
      trip?.booking_number ||
      trip?.booking_no ||
      trip?.id;

    return `https://angelexpressus.com/live-trip/${encodeURIComponent(
      String(key)
    )}`;
  }

  function tripMessage(trip: any, headline = "Angel Safety Share") {
    const driverName =
      trip?.driver_name ||
      trip?.assigned_driver_name ||
      trip?.chauffeur_name ||
      "Driver assignment pending";

    const vehicle =
      trip?.vehicle ||
      trip?.vehicle_type ||
      [trip?.vehicle_make, trip?.vehicle_model].filter(Boolean).join(" ") ||
      "Vehicle details pending";

    const plate =
      trip?.license_plate ||
      trip?.vehicle_plate ||
      trip?.plate_number ||
      "Plate pending";

    return `${headline}

${trip?.passenger_name || trip?.name || "A passenger"} is traveling with Angel Express.

Status:
${trip?.status || "N/A"}

Pickup:
${trip?.pickup_address || trip?.pickup || "N/A"}

Drop-off:
${trip?.dropoff_address || trip?.dropoff || "N/A"}

Driver:
${driverName}

Vehicle:
${vehicle}

License plate:
${plate}

Invoice:
${trip?.invoice_number || trip?.invoice_no || "N/A"}

Live tracking:
${trackingLink(trip)}

Angel Express Operations:
+1 (972) 836-7910

Angel Express Mobility
Safe. Reliable. Professional.`;
  }

  function primaryContactReady() {
    return Boolean(contactName.trim() && contactPhone.trim());
  }

  function additionalContactReady() {
    const hasAnyValue = Boolean(
      additionalContactName.trim() ||
        additionalContactPhone.trim() ||
        additionalRelationship.trim()
    );

    if (!hasAnyValue) return false;

    return Boolean(
      additionalContactName.trim() &&
        additionalContactPhone.trim() &&
        additionalRelationship.trim()
    );
  }

  function selectedShareContact() {
    if (additionalContactReady()) {
      return {
        name: additionalContactName.trim(),
        phone: additionalContactPhone.trim(),
        relationship: additionalRelationship.trim(),
      };
    }

    return {
      name: contactName.trim(),
      phone: contactPhone.trim(),
      relationship: relationship.trim(),
    };
  }

  function validateContacts() {
    if (!primaryContactReady()) {
      Alert.alert(
        "Primary Emergency Contact Missing",
        "Please add your emergency contact in your Passenger Profile before enabling Safety Share."
      );
      return false;
    }

    const hasPartialAdditionalContact = Boolean(
      additionalContactName.trim() ||
        additionalContactPhone.trim() ||
        additionalRelationship.trim()
    );

    if (hasPartialAdditionalContact && !additionalContactReady()) {
      Alert.alert(
        "Complete Additional Contact",
        "Enter the additional contact's name, phone number, and relationship, or leave all three fields blank."
      );
      return false;
    }

    return true;
  }


  async function enableSafetyShare(trip: any) {
    if (!validateContacts()) return;

    try {
      setSaving(true);

      const link = trackingLink(trip);
      const shareContact = selectedShareContact();

      const { error } = await supabase
        .from("bookings")
        .update({
          safety_share_enabled: true,
          emergency_contact_name: shareContact.name,
          emergency_contact_phone: shareContact.phone,
          emergency_contact_relationship: shareContact.relationship,
          live_tracking_link: link,
        })
        .eq("id", trip.id);

      if (error) throw error;

      setActiveTrips((current) =>
        current.map((item) =>
          String(item.id) === String(trip.id)
            ? {
                ...item,
                safety_share_enabled: true,
                live_tracking_link: link,
              }
            : item
        )
      );

      Alert.alert(
        "Safety Share Enabled",
        "Live trip sharing is now active for this ride.",
        [
          {
            text: "Send WhatsApp",
            onPress: () => shareWhatsApp(trip),
          },
          { text: "Done" },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Safety Share Error",
        error.message || "Could not enable Safety Share."
      );
    } finally {
      setSaving(false);
    }
  }

  async function disableSafetyShare(trip: any) {
    Alert.alert(
      "Disable Safety Share?",
      "Your trusted contact will no longer receive the active tracking link from this screen.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);

              const { error } = await supabase
                .from("bookings")
                .update({ safety_share_enabled: false })
                .eq("id", trip.id);

              if (error) throw error;

              setActiveTrips((current) =>
                current.map((item) =>
                  String(item.id) === String(trip.id)
                    ? { ...item, safety_share_enabled: false }
                    : item
                )
              );
            } catch (error: any) {
              Alert.alert(
                "Update Error",
                error.message || "Could not disable Safety Share."
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  function shareWhatsApp(trip: any) {
    if (!validateContacts()) return;

    const shareContact = selectedShareContact();

    const url = `https://wa.me/${cleanPhone(
      shareContact.phone
    )}?text=${encodeURIComponent(tripMessage(trip))}`;

    Linking.openURL(url);
  }

  function shareSMS(trip: any) {
    if (!validateContacts()) return;

    const shareContact = selectedShareContact();
    const separator = Platform.OS === "ios" ? "&" : "?";
    const url = `sms:${cleanPhone(
      shareContact.phone
    )}${separator}body=${encodeURIComponent(tripMessage(trip))}`;

    Linking.openURL(url);
  }


  async function shareNative(trip: any) {
    await Share.share({
      title: "Angel Express Safety Share",
      message: tripMessage(trip),
      url: trackingLink(trip),
    });
  }

  async function copyTrackingLink(trip: any) {
    await Share.share({
      title: "Angel Express Tracking Link",
      message: trackingLink(trip),
    });
  }

  function call911() {
    Alert.alert(
      "Call Emergency Services",
      "Call 911 now?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call 911",
          style: "destructive",
          onPress: () => Linking.openURL("tel:911"),
        },
      ]
    );
  }

  function callOperations() {
    Linking.openURL(`tel:${SUPPORT_PHONE}`);
  }

  function callDriver() {
    const phone =
      selectedTrip?.driver_phone ||
      selectedTrip?.assigned_driver_phone ||
      selectedTrip?.chauffeur_phone;

    if (!phone) {
      Alert.alert(
        "Driver Unavailable",
        "The driver's phone number is not available yet."
      );
      return;
    }

    Linking.openURL(`tel:${phone}`);
  }

  function messageDriver() {
    const phone =
      selectedTrip?.driver_phone ||
      selectedTrip?.assigned_driver_phone ||
      selectedTrip?.chauffeur_phone;

    if (!phone) {
      router.push("/support" as any);
      return;
    }

    Linking.openURL(
      `sms:${cleanPhone(phone)}?body=${encodeURIComponent(
        `Hello, this is regarding my Angel Express trip ${
          selectedTrip?.invoice_number ||
          selectedTrip?.invoice_no ||
          selectedTrip?.id
        }.`
      )}`
    );
  }

  async function createEmergencyAlert(trip: any, silent: boolean) {
    try {
      setSosSending(true);

      const alertPayload: any = {
        passenger_id: userId,
        user_id: userId,
        booking_id: trip?.id || null,
        alert_type: silent ? "silent_sos" : "sos",
        status: "active",
        message: silent
          ? "Passenger activated Silent SOS from Safety Share."
          : "Passenger activated Emergency SOS from Safety Share.",
        latitude:
          driverLocation?.latitude ||
          driverLocation?.lat ||
          trip?.driver_latitude ||
          null,
        longitude:
          driverLocation?.longitude ||
          driverLocation?.lng ||
          trip?.driver_longitude ||
          null,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("emergency_alerts")
        .insert(alertPayload);

      if (error) {
        console.log("Emergency alert insert failed:", error.message);
      }

      await supabase
        .from("bookings")
        .update({
          emergency_alert_active: true,
          emergency_alert_type: silent ? "silent_sos" : "sos",
          emergency_alert_at: new Date().toISOString(),
        })
        .eq("id", trip.id);

      if (silent) {
        Alert.alert(
          "Silent SOS Sent",
          "Angel Express Operations has been alerted quietly. Call 911 if you are in immediate danger."
        );
      } else {
        Alert.alert(
          "Emergency Alert Sent",
          "Angel Express Operations has been alerted. Call 911 immediately if you are in danger.",
          [
            { text: "Call 911", onPress: () => Linking.openURL("tel:911") },
            { text: "Call Operations", onPress: callOperations },
            { text: "Close" },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Emergency Alert Error",
        error.message || "Could not send the emergency alert."
      );
    } finally {
      setSosSending(false);
    }
  }

  function confirmSOS(silent: boolean) {
    if (!selectedTrip?.id) {
      Alert.alert("No Active Trip", "No active trip is available for SOS.");
      return;
    }

    Alert.alert(
      silent ? "Activate Silent SOS?" : "Activate Emergency SOS?",
      silent
        ? "This quietly alerts Angel Express Operations."
        : "This alerts Angel Express Operations and gives you the option to call 911.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: silent ? "Send Silent SOS" : "Send SOS",
          style: "destructive",
          onPress: () => createEmergencyAlert(selectedTrip, silent),
        },
      ]
    );
  }

  function openLiveTrip() {
    if (!selectedTrip?.id) {
      Alert.alert("No Active Trip", "There is no active trip to open.");
      return;
    }

    router.push({
      pathname: "/live-trip" as any,
      params: {
        booking_id: selectedTrip.id,
        invoice_no:
          selectedTrip.invoice_number || selectedTrip.invoice_no || "",
      },
    });
  }

  const driverName =
    selectedTrip?.driver_name ||
    selectedTrip?.assigned_driver_name ||
    selectedTrip?.chauffeur_name ||
    "Driver assignment pending";

  const vehicleName =
    selectedTrip?.vehicle ||
    selectedTrip?.vehicle_type ||
    [selectedTrip?.vehicle_make, selectedTrip?.vehicle_model]
      .filter(Boolean)
      .join(" ") ||
    "Vehicle details pending";

  const licensePlate =
    selectedTrip?.license_plate ||
    selectedTrip?.vehicle_plate ||
    selectedTrip?.plate_number ||
    "Pending";

  const driverPhoto =
    selectedTrip?.driver_photo_url ||
    selectedTrip?.driver_avatar_url ||
    selectedTrip?.chauffeur_photo_url ||
    null;

  const driverVerified =
    selectedTrip?.driver_verified === true ||
    selectedTrip?.driver_status === "approved" ||
    Boolean(selectedTrip?.driver_id || selectedTrip?.assigned_driver_id);

  const gpsConnected = Boolean(
    driverLocation?.latitude ||
      driverLocation?.lat ||
      selectedTrip?.driver_latitude
  );

  const shareActive = Boolean(selectedTrip?.safety_share_enabled);
  const contactReady = primaryContactReady();
  const statusTimeline = buildTimeline(selectedTrip);

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Preparing Safety Center...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}>
        <ImageBackground
          source={require("../assets/images/dashboard-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.gold}
              onRefresh={() => {
                setRefreshing(true);
                loadSafetyShareData();
              }}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <Text style={styles.kicker}>ANGEL EXPRESS SAFETY CENTER</Text>

            <Text style={styles.title}>Safety Share</Text>

            <Text style={styles.subtitle}>
              Realtime trip protection, trusted-contact sharing, driver verification,
              live safety status, and emergency assistance in one place.
            </Text>

            <View style={styles.heroCard}>
              <Animated.View
                style={[styles.heroIcon, { transform: [{ scale: pulse }] }]}
              >
                <ShieldCheck
                  size={31}
                  color={colors.onGold || colors.navy}
                />
              </Animated.View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Ride With Backup</Text>
                <Text style={styles.heroText}>
                  Keep someone you trust informed while Angel Express Operations
                  monitors the trip.
                </Text>
              </View>
            </View>

            <View style={styles.connectionBanner}>
              {connectionState === "online" ? (
                <Wifi size={18} color={colors.success || "#22C55E"} />
              ) : (
                <WifiOff size={18} color={colors.warning || "#F59E0B"} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.connectionTitle}>
                  {connectionState === "online"
                    ? "Realtime safety connected"
                    : connectionState === "connecting"
                    ? "Connecting to realtime safety"
                    : "Realtime connection unavailable"}
                </Text>
                <Text style={styles.connectionText}>
                  {lastUpdatedAt
                    ? `Last updated ${lastUpdatedAt.toLocaleTimeString()}`
                    : "Waiting for trip updates"}
                </Text>
              </View>
              <TouchableOpacity onPress={loadSafetyShareData}>
                <RefreshCw size={18} color={colors.gold} />
              </TouchableOpacity>
            </View>

            <View style={styles.statusGrid}>
              <SafetyStatus
                icon={<BadgeCheck size={18} color={colors.gold} />}
                title="Driver"
                value={driverVerified ? "Verified" : "Pending"}
                active={driverVerified}
                styles={styles}
              />
              <SafetyStatus
                icon={<LocateFixed size={18} color={colors.gold} />}
                title="GPS"
                value={gpsConnected ? "Connected" : "Waiting"}
                active={gpsConnected}
                styles={styles}
              />
              <SafetyStatus
                icon={<UsersRound size={18} color={colors.gold} />}
                title="Contact"
                value={contactReady ? "Ready" : "Required"}
                active={contactReady}
                styles={styles}
              />
              <SafetyStatus
                icon={<Radio size={18} color={colors.gold} />}
                title="Sharing"
                value={shareActive ? "Active" : "Inactive"}
                active={shareActive}
                styles={styles}
              />
            </View>

            {activeTrips.length > 1 ? (
              <View style={styles.tripSelectorCard}>
                <Text style={styles.sectionMiniTitle}>Select Active Trip</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tripSelectorContent}
                >
                  {activeTrips.map((trip) => {
                    const selected =
                      String(trip.id) === String(selectedTrip?.id);

                    return (
                      <TouchableOpacity
                        key={String(trip.id)}
                        style={[
                          styles.tripChip,
                          selected && styles.tripChipActive,
                        ]}
                        onPress={() => setSelectedTripId(trip.id)}
                      >
                        <Text
                          style={[
                            styles.tripChipTitle,
                            selected && styles.tripChipTitleActive,
                          ]}
                        >
                          {trip.invoice_number ||
                            trip.invoice_no ||
                            `Trip ${String(trip.id).slice(-6)}`}
                        </Text>
                        <Text
                          style={[
                            styles.tripChipStatus,
                            selected && styles.tripChipStatusActive,
                          ]}
                        >
                          {formatStatus(trip.status)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.emergencyCard}>
              <View style={styles.cardHeader}>
                <Siren size={24} color={colors.danger} />
                <Text style={styles.emergencyTitle}>Emergency Center</Text>
              </View>

              <Text style={styles.emergencyText}>
                For immediate danger, call 911. SOS also alerts Angel Express
                Operations with the active trip context.
              </Text>

              <View style={styles.emergencyGrid}>
                <TouchableOpacity
                  style={styles.sosButton}
                  onPress={() => confirmSOS(false)}
                  disabled={sosSending}
                >
                  {sosSending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <ShieldAlert size={21} color="#FFFFFF" />
                      <Text style={styles.sosButtonText}>Emergency SOS</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.silentButton}
                  onPress={() => confirmSOS(true)}
                  disabled={sosSending}
                >
                  <BellRing size={20} color={colors.danger} />
                  <Text style={styles.silentButtonText}>Silent SOS</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.call911Button} onPress={call911}>
                  <Phone size={20} color="#FFFFFF" />
                  <Text style={styles.call911Text}>Call 911</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.operationsButton}
                  onPress={callOperations}
                >
                  <HeartHandshake size={20} color={colors.gold} />
                  <Text style={styles.operationsText}>Operations</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.contactCard}>
              <View style={styles.cardHeader}>
                <UserRound size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Profile Emergency Contact</Text>
              </View>

              <Text style={styles.helperText}>
                This is the emergency contact saved in your Passenger Profile.
                Safety Share does not remove or overwrite it.
              </Text>

              {primaryContactReady() ? (
                <View style={styles.profileContactBox}>
                  <InfoLine
                    icon={<UserRound size={18} color={colors.gold} />}
                    label="Name"
                    value={contactName}
                    styles={styles}
                  />
                  <InfoLine
                    icon={<Phone size={18} color={colors.gold} />}
                    label="Phone"
                    value={contactPhone}
                    styles={styles}
                  />
                  <InfoLine
                    icon={<HeartHandshake size={18} color={colors.gold} />}
                    label="Relationship"
                    value={relationship}
                    styles={styles}
                  />
                </View>
              ) : (
                <View style={styles.missingContactBox}>
                  <AlertTriangle size={20} color={colors.danger} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.missingContactTitle}>
                      Emergency contact not found
                    </Text>
                    <Text style={styles.missingContactText}>
                      Add your primary emergency contact from the Passenger Profile screen.
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => router.push("/profile" as any)}
              >
                <Text style={styles.outlineButtonText}>
                  {primaryContactReady()
                    ? "Update in Passenger Profile"
                    : "Add Emergency Contact in Profile"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.contactCard}>
              <View style={styles.cardHeader}>
                <UsersRound size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Add Another Trusted Contact</Text>
              </View>

              <Text style={styles.helperText}>
                Optional. When completed, this person becomes the recipient for
                this trip's Safety Share. Your profile emergency contact remains unchanged.
              </Text>

              <Text style={styles.label}>Additional Contact Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Trusted contact name"
                placeholderTextColor={colors.placeholder}
                value={additionalContactName}
                onChangeText={setAdditionalContactName}
              />

              <Text style={styles.label}>Additional Contact Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Trusted contact phone"
                placeholderTextColor={colors.placeholder}
                value={additionalContactPhone}
                onChangeText={setAdditionalContactPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Relationship</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Spouse, Parent, Friend"
                placeholderTextColor={colors.placeholder}
                value={additionalRelationship}
                onChangeText={setAdditionalRelationship}
              />

              {additionalContactReady() ? (
                <View style={styles.additionalReadyBox}>
                  <CheckCircle2 size={18} color={colors.gold} />
                  <Text style={styles.additionalReadyText}>
                    Additional trusted contact is ready for this trip.
                  </Text>
                </View>
              ) : null}
            </View>

            {!selectedTrip ? (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <CarFront size={22} color={colors.gold} />
                  <Text style={styles.cardTitle}>No Active Trip</Text>
                </View>

                <Text style={styles.text}>
                  Safety Share becomes fully active when a ride is pending,
                  assigned, confirmed, en route, or in progress.
                </Text>

                <TouchableOpacity
                  style={styles.goldButton}
                  onPress={() => router.push("/my-trips" as any)}
                >
                  <Text style={styles.goldButtonText}>View My Trips</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.tripCard}>
                  <View style={styles.cardHeader}>
                    <Route size={22} color={colors.gold} />
                    <Text style={styles.cardTitle}>Live Trip Protection</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        shareActive && styles.statusBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          shareActive && styles.statusBadgeTextActive,
                        ]}
                      >
                        {shareActive ? "ACTIVE" : "READY"}
                      </Text>
                    </View>
                  </View>

                  <InfoLine
                    icon={<Clock3 size={18} color={colors.gold} />}
                    label="Status"
                    value={formatStatus(selectedTrip.status)}
                    styles={styles}
                  />

                  <InfoLine
                    icon={<MapPinned size={18} color={colors.gold} />}
                    label="Pickup"
                    value={
                      selectedTrip.pickup_address ||
                      selectedTrip.pickup ||
                      "Pickup not available"
                    }
                    styles={styles}
                  />

                  <InfoLine
                    icon={<Navigation size={18} color={colors.gold} />}
                    label="Drop-off"
                    value={
                      selectedTrip.dropoff_address ||
                      selectedTrip.dropoff ||
                      "Drop-off not available"
                    }
                    styles={styles}
                  />

                  <InfoLine
                    icon={<CheckCircle2 size={18} color={colors.gold} />}
                    label="Invoice"
                    value={
                      selectedTrip.invoice_number ||
                      selectedTrip.invoice_no ||
                      "N/A"
                    }
                    styles={styles}
                  />

                  <View style={styles.trackingLinkBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trackingLabel}>Live Tracking Link</Text>
                      <Text style={styles.trackingValue} numberOfLines={2}>
                        {trackingLink(selectedTrip)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => copyTrackingLink(selectedTrip)}
                    >
                      <Copy size={18} color={colors.gold} />
                    </TouchableOpacity>
                  </View>

                  {shareActive ? (
                    <TouchableOpacity
                      style={styles.disableButton}
                      onPress={() => disableSafetyShare(selectedTrip)}
                      disabled={saving}
                    >
                      <Text style={styles.disableText}>Disable Safety Share</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.goldButton, saving && styles.disabledButton]}
                      onPress={() => enableSafetyShare(selectedTrip)}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator
                          color={colors.onGold || colors.navy}
                        />
                      ) : (
                        <>
                          <ShieldCheck
                            size={19}
                            color={colors.onGold || colors.navy}
                          />
                          <Text style={styles.goldButtonText}>
                            Enable Safety Share
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.driverCard}>
                  <View style={styles.cardHeader}>
                    <CarFront size={22} color={colors.gold} />
                    <Text style={styles.cardTitle}>Driver & Vehicle</Text>
                  </View>

                  <View style={styles.driverTop}>
                    {driverPhoto ? (
                      <Image
                        source={{ uri: driverPhoto }}
                        style={styles.driverPhoto}
                      />
                    ) : (
                      <View style={styles.driverPhotoFallback}>
                        <UserRound size={30} color={colors.gold} />
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <View style={styles.driverNameRow}>
                        <Text style={styles.driverName}>{driverName}</Text>
                        {driverVerified ? (
                          <BadgeCheck size={18} color={colors.gold} />
                        ) : null}
                      </View>
                      <Text style={styles.driverMeta}>{vehicleName}</Text>
                      <Text style={styles.driverMeta}>
                        Plate: {licensePlate}
                      </Text>
                      <Text style={styles.driverMeta}>
                        Rating:{" "}
                        {selectedTrip.driver_rating ||
                          selectedTrip.rating ||
                          "New"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.driverActionRow}>
                    <TouchableOpacity
                      style={styles.driverAction}
                      onPress={callDriver}
                    >
                      <Phone size={18} color={colors.gold} />
                      <Text style={styles.driverActionText}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.driverAction}
                      onPress={messageDriver}
                    >
                      <MessageCircle size={18} color={colors.gold} />
                      <Text style={styles.driverActionText}>Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.driverAction}
                      onPress={openLiveTrip}
                    >
                      <Navigation size={18} color={colors.gold} />
                      <Text style={styles.driverActionText}>Live Trip</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.shareCard}>
                  <View style={styles.cardHeader}>
                    <Share2 size={22} color={colors.gold} />
                    <Text style={styles.cardTitle}>Share This Trip</Text>
                  </View>

                  <Text style={styles.helperText}>
                    Send the verified trip context through your preferred channel.
                  </Text>

                  <View style={styles.shareGrid}>
                    <ShareButton
                      icon={<MessageCircle size={20} color={colors.gold} />}
                      label="WhatsApp"
                      onPress={() => shareWhatsApp(selectedTrip)}
                      styles={styles}
                    />
                    <ShareButton
                      icon={<Smartphone size={20} color={colors.gold} />}
                      label="SMS"
                      onPress={() => shareSMS(selectedTrip)}
                      styles={styles}
                    />
                    <ShareButton
                      icon={<Copy size={20} color={colors.gold} />}
                      label="Copy Link"
                      onPress={() => copyTrackingLink(selectedTrip)}
                      styles={styles}
                    />
                    <ShareButton
                      icon={<Send size={20} color={colors.gold} />}
                      label="More"
                      onPress={() => shareNative(selectedTrip)}
                      styles={styles}
                    />
                  </View>
                </View>

                <View style={styles.timelineCard}>
                  <View style={styles.cardHeader}>
                    <Radio size={22} color={colors.gold} />
                    <Text style={styles.cardTitle}>Live Safety Timeline</Text>
                  </View>

                  {statusTimeline.map((item, index) => (
                    <TimelineRow
                      key={item.key}
                      title={item.title}
                      subtitle={item.subtitle}
                      active={item.active}
                      last={index === statusTimeline.length - 1}
                      styles={styles}
                    />
                  ))}
                </View>
              </>
            )}

            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.bottomAction}
                onPress={() => router.push("/family-checkin" as any)}
              >
                <UsersRound size={18} color={colors.gold} />
                <Text style={styles.bottomActionText}>Family Check-In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomAction}
                onPress={() => router.push("/support" as any)}
              >
                <Phone size={18} color={colors.gold} />
                <Text style={styles.bottomActionText}>Support Center</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function SafetyStatus({
  icon,
  title,
  value,
  active,
  styles,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  active: boolean;
  styles: any;
}) {
  return (
    <View style={[styles.safetyStatus, active && styles.safetyStatusActive]}>
      <View style={styles.safetyStatusIcon}>{icon}</View>
      <Text style={styles.safetyStatusValue}>{value}</Text>
      <Text style={styles.safetyStatusTitle}>{title}</Text>
    </View>
  );
}

function ShareButton({
  icon,
  label,
  onPress,
  styles,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  styles: any;
}) {
  return (
    <TouchableOpacity style={styles.shareButton} onPress={onPress}>
      {icon}
      <Text style={styles.shareButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoLine({
  icon,
  label,
  value,
  styles,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function TimelineRow({
  title,
  subtitle,
  active,
  last,
  styles,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  last: boolean;
  styles: any;
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View
          style={[
            styles.timelineDot,
            active && styles.timelineDotActive,
          ]}
        />
        {!last ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.timelineCopy}>
        <Text
          style={[
            styles.timelineTitle,
            active && styles.timelineTitleActive,
          ]}
        >
          {title}
        </Text>
        <Text style={styles.timelineSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function buildTimeline(trip: any) {
  const normalized = String(trip?.status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const order = [
    "pending",
    "confirmed",
    "assigned",
    "en_route",
    "arrived",
    "picked_up",
    "in_progress",
    "completed",
  ];

  let index = 0;

  if (["confirmed"].includes(normalized)) index = 1;
  if (
    [
      "driver_assigned",
      "assigned",
      "accepted",
      "pending_assignment",
    ].includes(normalized)
  )
    index = 2;
  if (["driver_en_route", "en_route"].includes(normalized)) index = 3;
  if (["arrived_at_pickup", "driver_arrived"].includes(normalized)) index = 4;
  if (
    ["picked_up", "passenger_onboard", "in_progress"].includes(normalized)
  )
    index = 6;
  if (["completed", "complete"].includes(normalized)) index = 7;

  return [
    {
      key: order[0],
      title: "Ride Request Received",
      subtitle: "Angel Express has your booking.",
      active: index >= 0,
    },
    {
      key: order[1],
      title: "Trip Confirmed",
      subtitle: "Your trip details are confirmed.",
      active: index >= 1,
    },
    {
      key: order[2],
      title: "Driver Assigned",
      subtitle: "Driver and vehicle verification become available.",
      active: index >= 2,
    },
    {
      key: order[3],
      title: "Driver En Route",
      subtitle: "Realtime GPS monitoring begins.",
      active: index >= 3,
    },
    {
      key: order[4],
      title: "Driver Arrived",
      subtitle: "Confirm the vehicle and license plate.",
      active: index >= 4,
    },
    {
      key: order[5],
      title: "Passenger Onboard",
      subtitle: "Safety Share remains active during the ride.",
      active: index >= 5,
    },
    {
      key: order[6],
      title: "Trip In Progress",
      subtitle: "Operations and trusted-contact tools remain available.",
      active: index >= 6,
    },
    {
      key: order[7],
      title: "Destination Reached",
      subtitle: "Safety Share can close after the trip is completed.",
      active: index >= 7,
    },
  ];
}

function formatStatus(value: any) {
  if (!value) return "Pending";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function createStyles(c: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
      overflow: "hidden",
    },
    bgWrap: {
      ...StyleSheet.absoluteFillObject,
    },
    background: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
    },
    container: {
      flex: 1,
    },
    content: {
      padding: 22,
      paddingTop: 58,
      paddingBottom: 54,
    },
    center: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    loadingText: {
      color: c.text,
      marginTop: 12,
      fontSize: 16,
      fontWeight: "800",
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    backText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
    },
    themePill: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    kicker: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 10,
    },
    title: {
      color: c.text,
      fontSize: 36,
      fontWeight: "900",
      marginBottom: 10,
      letterSpacing: -0.7,
    },
    subtitle: {
      color: c.text2 || c.textSecondary,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },
    heroCard: {
      minHeight: 124,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 19,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroCopy: {
      flex: 1,
    },
    heroTitle: {
      color: c.onGold || c.navy,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 6,
    },
    heroText: {
      color: c.onGold || c.navy,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
      opacity: 0.82,
    },
    connectionBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      backgroundColor: c.card,
      padding: 14,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    connectionTitle: {
      color: c.text,
      fontSize: 13.5,
      fontWeight: "900",
    },
    connectionText: {
      color: c.text2 || c.textSecondary,
      fontSize: 11.5,
      fontWeight: "700",
      marginTop: 2,
    },
    statusGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 18,
    },
    safetyStatus: {
      width: "48%",
      minHeight: 104,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      borderRadius: 18,
      padding: 14,
      ...v5Shadow(c),
    },
    safetyStatusActive: {
      borderColor: c.gold,
      backgroundColor: c.soft,
    },
    safetyStatusIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card2,
      marginBottom: 9,
    },
    safetyStatusValue: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
    },
    safetyStatusTitle: {
      color: c.text2 || c.textSecondary,
      fontSize: 11.5,
      fontWeight: "800",
      marginTop: 3,
    },
    tripSelectorCard: {
      ...cardBase(c),
    },
    sectionMiniTitle: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 12,
    },
    tripSelectorContent: {
      gap: 10,
      paddingRight: 8,
    },
    tripChip: {
      minWidth: 135,
      borderRadius: 16,
      padding: 13,
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
    },
    tripChipActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    tripChipTitle: {
      color: c.text,
      fontSize: 13,
      fontWeight: "900",
    },
    tripChipTitleActive: {
      color: c.onGold || c.navy,
    },
    tripChipStatus: {
      color: c.text2 || c.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 4,
    },
    tripChipStatusActive: {
      color: c.onGold || c.navy,
      opacity: 0.8,
    },
    emergencyCard: {
      padding: 20,
      marginBottom: 18,
      backgroundColor: c.dangerSoft,
      borderColor:
        c.mode === "dark"
          ? "rgba(239,68,68,0.65)"
          : "rgba(220,38,38,0.35)",
      borderWidth: 1,
      borderRadius: 22,
      ...v5Shadow(c),
    },
    emergencyTitle: {
      color: c.danger,
      fontSize: 22,
      fontWeight: "900",
      flex: 1,
    },
    emergencyText: {
      color: c.text,
      fontSize: 14.5,
      lineHeight: 22,
      marginBottom: 16,
      fontWeight: "700",
    },
    emergencyGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    sosButton: {
      width: "48%",
      minHeight: 62,
      borderRadius: 16,
      backgroundColor: c.danger,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    sosButtonText: {
      color: "#FFFFFF",
      fontWeight: "900",
      fontSize: 13,
    },
    silentButton: {
      width: "48%",
      minHeight: 62,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.danger,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    silentButtonText: {
      color: c.danger,
      fontWeight: "900",
      fontSize: 13,
    },
    call911Button: {
      width: "48%",
      minHeight: 62,
      borderRadius: 16,
      backgroundColor: c.danger,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    call911Text: {
      color: "#FFFFFF",
      fontWeight: "900",
      fontSize: 13,
    },
    operationsButton: {
      width: "48%",
      minHeight: 62,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    operationsText: {
      color: c.gold,
      fontWeight: "900",
      fontSize: 13,
    },
    contactCard: cardBase(c),
    profileContactBox: {
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      backgroundColor: c.card2,
      padding: 15,
      marginBottom: 14,
    },
    missingContactBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.danger,
      backgroundColor: c.dangerSoft,
      padding: 15,
      marginBottom: 14,
    },
    missingContactTitle: {
      color: c.danger,
      fontSize: 14.5,
      fontWeight: "900",
      marginBottom: 4,
    },
    missingContactText: {
      color: c.text,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
    },
    additionalReadyBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      padding: 13,
      marginTop: -2,
    },
    additionalReadyText: {
      color: c.gold,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "900",
      flex: 1,
    },
    card: cardBase(c),
    tripCard: cardBase(c),
    driverCard: cardBase(c),
    shareCard: cardBase(c),
    timelineCard: cardBase(c),
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    cardTitle: {
      color: c.gold,
      fontSize: 22,
      fontWeight: "900",
      flex: 1,
    },
    helperText: {
      color: c.text2 || c.textSecondary,
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: "700",
      marginBottom: 16,
    },
    text: {
      color: c.text,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "700",
    },
    label: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    input: {
      backgroundColor: c.input,
      color: c.inputText,
      padding: 17,
      borderRadius: 16,
      fontSize: 16,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      fontWeight: "700",
    },
    infoRow: {
      flexDirection: "row",
      gap: 11,
      alignItems: "flex-start",
      marginBottom: 15,
    },
    infoIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    infoLabel: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    infoValue: {
      color: c.text,
      fontSize: 15.5,
      lineHeight: 22,
      fontWeight: "700",
    },
    statusBadge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: c.card2,
    },
    statusBadgeActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    statusBadgeText: {
      color: c.text2 || c.textSecondary,
      fontSize: 10,
      fontWeight: "900",
    },
    statusBadgeTextActive: {
      color: c.onGold || c.navy,
    },
    trackingLinkBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      backgroundColor: c.soft,
      padding: 14,
      marginTop: 4,
      marginBottom: 16,
    },
    trackingLabel: {
      color: c.gold,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    trackingValue: {
      color: c.text,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
    },
    copyButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.card,
    },
    goldButton: {
      minHeight: 56,
      borderRadius: 16,
      backgroundColor: c.gold,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 2,
      ...v5Shadow(c),
    },
    goldButtonText: {
      color: c.onGold || c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    outlineButton: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    outlineButtonText: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    disableButton: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.danger,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
    },
    disableText: {
      color: c.danger,
      fontSize: 14,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    disabledButton: {
      opacity: 0.7,
    },
    driverTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 18,
    },
    driverPhoto: {
      width: 74,
      height: 74,
      borderRadius: 23,
      borderWidth: 2,
      borderColor: c.gold,
    },
    driverPhotoFallback: {
      width: 74,
      height: 74,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    driverNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 5,
    },
    driverName: {
      color: c.text,
      fontSize: 19,
      fontWeight: "900",
      flexShrink: 1,
    },
    driverMeta: {
      color: c.text2 || c.textSecondary,
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: "700",
    },
    driverActionRow: {
      flexDirection: "row",
      gap: 9,
    },
    driverAction: {
      flex: 1,
      minHeight: 58,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },
    driverActionText: {
      color: c.gold,
      fontSize: 11.5,
      fontWeight: "900",
    },
    shareGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    shareButton: {
      width: "48%",
      minHeight: 82,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      backgroundColor: c.card2,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    shareButtonText: {
      color: c.text,
      fontSize: 13,
      fontWeight: "900",
    },
    timelineRow: {
      flexDirection: "row",
      minHeight: 74,
    },
    timelineRail: {
      width: 28,
      alignItems: "center",
    },
    timelineDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: c.border,
      backgroundColor: c.card2,
      zIndex: 2,
    },
    timelineDotActive: {
      borderColor: c.gold,
      backgroundColor: c.gold,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: c.borderSoft || c.lightBorder,
      marginTop: 3,
    },
    timelineCopy: {
      flex: 1,
      paddingLeft: 10,
      paddingBottom: 18,
    },
    timelineTitle: {
      color: c.text2 || c.textSecondary,
      fontSize: 15,
      fontWeight: "900",
      marginBottom: 4,
    },
    timelineTitleActive: {
      color: c.text,
    },
    timelineSubtitle: {
      color: c.text2 || c.textSecondary,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
    },
    bottomActions: {
      flexDirection: "row",
      gap: 10,
    },
    bottomAction: {
      flex: 1,
      minHeight: 56,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
    },
    bottomActionText: {
      color: c.gold,
      fontSize: 12.5,
      fontWeight: "900",
    },
  });
}

function cardBase(c: any) {
  return {
    backgroundColor: c.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.borderSoft || c.lightBorder,
    padding: 20,
    marginBottom: 18,
    ...v5Shadow(c),
  };
}
