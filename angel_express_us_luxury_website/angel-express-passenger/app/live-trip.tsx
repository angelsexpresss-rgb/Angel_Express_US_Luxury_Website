import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  Linking,
  RefreshControl,
  ScrollView,
  Share,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CarFront,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  MapPinned,
  GraduationCap,
  MessageCircle,
  Navigation,
  Phone,
  Plane,
  RefreshCcw,
  Route,
  ShieldCheck,
  Share2,
  Star,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

const LIVE_STATUSES = [
  "confirmed",
  "driver_assigned",
  "assigned",
  "accepted",
  "driver_accepted",
  "driver_en_route",
  "en_route",
  "driver_arrived",
  "passenger_onboard",
  "picked_up",
  "in_progress",
];

const STOPPED_STATUSES = ["completed", "cancelled", "canceled"];
const OPERATIONS_PHONE = "+19728367910";

const TIMELINE = [
  { key: "confirmed", label: "Confirmed" },
  { key: "assigned", label: "Driver Assigned" },
  { key: "en_route", label: "Driver En Route" },
  { key: "arrived", label: "Driver Arrived" },
  { key: "onboard", label: "Passenger Onboard" },
  { key: "in_progress", label: "Trip In Progress" },
  { key: "completed", label: "Completed" },
];

function timelineIndex(value: any) {
  const status = normalize(value);
  if (["pending","confirmed","pending_assignment","smart_queue","student_pool_pending","matching","unassigned"].includes(status)) return 0;
  if (["driver_assigned","assigned","accepted","driver_accepted"].includes(status)) return 1;
  if (["driver_en_route","en_route"].includes(status)) return 2;
  if (status === "driver_arrived") return 3;
  if (["passenger_onboard","picked_up"].includes(status)) return 4;
  if (status === "in_progress") return 5;
  if (status === "completed") return 6;
  return 0;
}

function haversineMiles(a: any, b: any) {
  if (!a || !b) return null;
  const r = 3958.8;
  const rad = (n: number) => (n * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const p1 = rad(a.latitude);
  const p2 = rad(b.latitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function formatDistance(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Calculating";
  if (value < 0.1) return "Less than 0.1 mile";
  return `${value.toFixed(value < 10 ? 1 : 0)} miles`;
}

function formatMoney(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function firstAvailable(...values: any[]) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function normalize(value: any) {
  return String(value || "").trim().toLowerCase();
}

function numberValue(...values: any[]) {
  const value = values.find(
    (item) => item !== undefined && item !== null && item !== ""
  );
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getStatusLabel(value: any) {
  const status = normalize(value);

  if (status === "pending") return "Pending";
  if (status === "confirmed") return "Confirmed";
  if (status === "driver_assigned") return "Driver Assigned";
  if (status === "assigned") return "Driver Assigned";
  if (status === "accepted") return "Driver Accepted";
  if (status === "driver_accepted") return "Driver Accepted";
  if (status === "driver_en_route" || status === "en_route") return "Driver En Route";
  if (status === "driver_arrived") return "Driver Arrived";
  if (status === "passenger_onboard" || status === "picked_up") return "Passenger Onboard";
  if (status === "in_progress") return "Trip In Progress";
  if (status === "unassigned") return "Searching for Another Driver";
  if (status === "driver_cancelled" || status === "driver_declined") return "Driver Cancelled";
  if (status === "smart_queue" || status === "student_pool_pending" || status === "matching") return "Student Pool Matching";
  if (status === "completed") return "Completed";
  if (status === "cancelled" || status === "canceled") return "Cancelled";

  return String(value || "Pending").replace(/_/g, " ");
}

function isTrackableStatus(status: any) {
  return LIVE_STATUSES.includes(normalize(status));
}

function isStoppedStatus(status: any) {
  return STOPPED_STATUSES.includes(normalize(status));
}

export default function LiveTripScreen() {
  const params = useLocalSearchParams();

  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const bookingId = String(
    params.booking_id || params.bookingId || ""
  );

  const invoiceNumber = String(
    params.invoice_number || params.invoice_no || ""
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trip, setTrip] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [etaSeconds, setEtaSeconds] = useState(0);

  const previousDriverId = useRef("");
  const previousStatus = useRef("");
  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    Animated.loop(
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
    ).start();

    Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();

    loadLiveTrip(true);
  }, []);

  useEffect(() => {
    if (!trip?.id) return;

    const bookingChannel = supabase
      .channel(`passenger-live-booking-${trip.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${trip.id}`,
        },
        () => loadLiveTrip(false)
      )
      .subscribe();

    const locationChannel = supabase
      .channel(`passenger-live-location-${trip.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_live_locations",
          filter: `booking_id=eq.${trip.id}`,
        },
        (payload) => {
          const next = payload.new as any;
          if (next && Object.keys(next).length) setLocation(next);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(locationChannel);
    };
  }, [trip?.id]);

  useEffect(() => {
    const minutes = Number(firstAvailable(location?.eta_minutes, trip?.eta_minutes));
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setEtaSeconds(0);
      return;
    }
    const stamp = firstAvailable(location?.last_updated, location?.updated_at, location?.created_at);
    const elapsed = stamp
      ? Math.max(0, Math.floor((Date.now() - new Date(stamp).getTime()) / 1000))
      : 0;
    setEtaSeconds(Math.max(0, Math.round(minutes * 60) - elapsed));
  }, [location?.eta_minutes, location?.last_updated, trip?.eta_minutes]);

  useEffect(() => {
    if (etaSeconds <= 0) return;
    const timer = setInterval(() => {
      setEtaSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [etaSeconds > 0]);

  useEffect(() => {
    if (!trip || !isTrackableStatus(trip.status)) return;

    const interval = setInterval(() => {
      loadLiveTrip(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [trip?.id, trip?.status]);

  useEffect(() => {
    const coordinate = getDriverCoords();

    if (coordinate && mapRef.current && autoFollow) {
      mapRef.current.animateToRegion(
        {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        },
        650
      );
    }
  }, [location?.latitude, location?.longitude, autoFollow]);

  async function loadLiveTrip(showLoader = true) {
    try {
      if (showLoader) setLoading(true);
      if (!showLoader) setRefreshing(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        Alert.alert("Not Logged In", "Please sign in again.");
        router.replace("/login" as any);
        return;
      }

      const userEmail = normalize(user.email);
      let booking: any = null;

      if (bookingId) {
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();

        if (error) throw error;
        booking = data;
      } else if (invoiceNumber) {
        const { data: byNewInvoice, error: newInvoiceError } = await supabase
          .from("bookings")
          .select("*")
          .eq("invoice_number", invoiceNumber)
          .maybeSingle();

        if (newInvoiceError && !String(newInvoiceError.message || "").includes("column")) {
          throw newInvoiceError;
        }

        booking = byNewInvoice;

        if (!booking) {
          const { data: byLegacyInvoice, error: oldInvoiceError } = await supabase
            .from("bookings")
            .select("*")
            .eq("invoice_no", invoiceNumber)
            .maybeSingle();

          if (oldInvoiceError) throw oldInvoiceError;
          booking = byLegacyInvoice;
        }
      } else {
        let query = supabase
          .from("bookings")
          .select("*")
          .in("status", LIVE_STATUSES)
          .order("created_at", { ascending: false })
          .limit(1);

        if (userEmail) {
          query = query.or(`user_id.eq.${user.id},email.ilike.${userEmail}`);
        } else {
          query = query.eq("user_id", user.id);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        booking = data;
      }

      if (booking) {
        const bookingOwnerId = String(
          firstAvailable(booking.user_id, booking.passenger_id)
        );

        const bookingEmail = normalize(
          firstAvailable(booking.email, booking.passenger_email)
        );

        const ownerMatches =
          !bookingOwnerId || bookingOwnerId === String(user.id);

        const emailMatches =
          !bookingEmail || bookingEmail === userEmail;

        if (!ownerMatches && !emailMatches) {
          throw new Error("You are not authorized to view this trip.");
        }
      }

      if (booking) {
        const nextDriverId = firstAvailable(
          booking.driver_id,
          booking.assigned_driver_id
        );
        const nextStatus = normalize(booking.status);

        if (
          previousDriverId.current &&
          nextDriverId &&
          previousDriverId.current !== nextDriverId
        ) {
          Alert.alert(
            "New Chauffeur Assigned",
            "Angel Express reassigned your trip. The new driver and vehicle details are now displayed."
          );
        }

        if (
          previousStatus.current &&
          previousStatus.current !== nextStatus &&
          ["driver_cancelled", "driver_declined", "unassigned"].includes(nextStatus)
        ) {
          Alert.alert(
            "Driver Update",
            "The previous chauffeur is no longer assigned. Angel Express is finding another chauffeur."
          );
        }

        previousDriverId.current = nextDriverId;
        previousStatus.current = nextStatus;
      }

      setTrip(booking || null);

      if (!booking) {
        setLocation(null);
        setDriverProfile(null);
        return;
      }

      await Promise.all([
        loadDriverProfile(booking),
        loadDriverLiveLocation(booking),
      ]);
    } catch (error: any) {
      Alert.alert(
        "Live Tracking Error",
        error.message || "Could not load live trip."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadDriverProfile(booking: any) {
    try {
      const driverId = firstAvailable(
        booking?.driver_id,
        booking?.assigned_driver_id
      );

      if (!driverId) {
        setDriverProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", driverId)
        .maybeSingle();

      if (error) throw error;

      setDriverProfile(data || null);
    } catch (error) {
      console.log("Driver profile lookup error:", error);
      setDriverProfile(null);
    }
  }

  async function loadDriverLiveLocation(booking: any) {
    try {
      let liveLocation: any = null;
      const driverId = firstAvailable(
        booking?.driver_id,
        booking?.assigned_driver_id
      );

      if (booking?.id) {
        let query = supabase
          .from("driver_live_locations")
          .select("*")
          .eq("booking_id", booking.id);

        if (driverId) {
          query = query.eq("driver_id", driverId);
        }

        const { data, error } = await query
          .order("last_updated", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        liveLocation = data;
      }

      if (!liveLocation) {
        const legacyInvoice = firstAvailable(
          booking?.invoice_number,
          booking?.invoice_no
        );

        if (legacyInvoice) {
          const { data } = await supabase
            .from("live_trip_locations")
            .select("*")
            .eq("invoice_no", legacyInvoice)
            .limit(1)
            .maybeSingle();

          liveLocation = data;
        }
      }

      setLocation(liveLocation || null);
    } catch (error) {
      console.log("Live location lookup error:", error);
      setLocation(null);
    }
  }

  function getDriverName() {
    const first = firstAvailable(
      driverProfile?.first_name,
      driverProfile?.firstname
    );

    const last = firstAvailable(
      driverProfile?.last_name,
      driverProfile?.lastname
    );

    return firstAvailable(
      location?.driver_name,
      trip?.driver_name,
      trip?.assigned_driver_name,
      driverProfile?.full_name,
      driverProfile?.name,
      first && last ? `${first} ${last}` : "",
      first,
      "Angel Express Chauffeur"
    );
  }

  function getDriverPhone() {
    return firstAvailable(
      location?.driver_phone,
      trip?.driver_phone,
      trip?.assigned_driver_phone,
      driverProfile?.phone,
      driverProfile?.phone_number,
      driverProfile?.mobile
    );
  }

  function getVehicle() {
    const driverVehicle = [
      driverProfile?.vehicle_year,
      driverProfile?.vehicle_make,
      driverProfile?.vehicle_model,
    ]
      .filter(Boolean)
      .join(" ");

    return firstAvailable(
      location?.vehicle,
      location?.vehicle_type,
      trip?.vehicle,
      trip?.vehicle_type,
      driverVehicle,
      driverProfile?.vehicle,
      driverProfile?.vehicle_type,
      driverProfile?.car,
      "Angel Express Vehicle"
    );
  }

  function getPlateNumber() {
    return firstAvailable(
      location?.plate_number,
      location?.plate,
      trip?.plate_number,
      trip?.plate,
      driverProfile?.plate_number,
      driverProfile?.license_plate,
      "N/A"
    );
  }

  function getPickup() {
    return firstAvailable(
      trip?.pickup_address,
      trip?.pickup,
      trip?.pickup_location,
      "N/A"
    );
  }

  function getDropoff() {
    return firstAvailable(
      trip?.dropoff_address,
      trip?.dropoff,
      trip?.dropoff_location,
      trip?.destination,
      "N/A"
    );
  }

  function getPickupCoords() {
    const latitude = numberValue(
      trip?.pickup_latitude,
      trip?.pickup_lat,
      location?.pickup_latitude,
      location?.pickup_lat
    );

    const longitude = numberValue(
      trip?.pickup_longitude,
      trip?.pickup_lng,
      location?.pickup_longitude,
      location?.pickup_lng
    );

    if (!latitude || !longitude) return null;

    return { latitude, longitude };
  }

  function getDropoffCoords() {
    const latitude = numberValue(
      trip?.dropoff_latitude,
      trip?.dropoff_lat,
      location?.dropoff_latitude,
      location?.dropoff_lat
    );

    const longitude = numberValue(
      trip?.dropoff_longitude,
      trip?.dropoff_lng,
      location?.dropoff_longitude,
      location?.dropoff_lng
    );

    if (!latitude || !longitude) return null;

    return { latitude, longitude };
  }

  function getDriverCoords() {
    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);

    if (!latitude || !longitude) return null;

    return { latitude, longitude };
  }

  function getLocationTimestamp() {
    return firstAvailable(
      location?.last_updated,
      location?.updated_at,
      location?.created_at
    );
  }

  function getLocationFreshness() {
    const timestamp = getLocationTimestamp();

    if (!timestamp) {
      return {
        label: "Offline",
        message: "Waiting for the chauffeur to begin sharing GPS.",
      };
    }

    const ageMs = Date.now() - new Date(timestamp).getTime();
    const ageMinutes = ageMs / 60000;

    if (ageMinutes <= 2) {
      return {
        label: "Live",
        message: "Your chauffeur is sharing live GPS.",
      };
    }

    if (ageMinutes <= 10) {
      return {
        label: "Recently Updated",
        message: "The latest chauffeur location was received recently.",
      };
    }

    if (ageMinutes <= 60) {
      return {
        label: "Location Stale",
        message: "The chauffeur location has not updated recently.",
      };
    }

    return {
      label: "Offline",
      message: "The saved chauffeur location is no longer current.",
    };
  }

  function getStatusMessage() {
    const status = normalize(trip?.status);
    const freshness = getLocationFreshness();

    if (status === "completed") {
      return "This ride has been completed. Live tracking has ended.";
    }

    if (status === "cancelled" || status === "canceled") {
      return "This ride has been cancelled. Live tracking is unavailable.";
    }

    if (getDriverCoords()) return freshness.message;

    if (["driver_cancelled", "driver_declined", "unassigned"].includes(status)) {
      return "The previous chauffeur is no longer assigned. Angel Express is searching for another chauffeur.";
    }

    if (status === "driver_en_route" || status === "en_route") {
      return etaSeconds > 0
        ? `Your chauffeur is on the way and is expected in ${formatEta()}.`
        : "Your chauffeur is on the way to the pickup location.";
    }

    if (status === "passenger_onboard" || status === "picked_up") {
      return "You are checked in. Your chauffeur will begin the trip shortly.";
    }

    if (status === "driver_assigned" || status === "assigned") {
      return "Your chauffeur has accepted the ride. GPS will appear once the driver opens Active Trip.";
    }

    if (status === "driver_arrived") {
      return "Your chauffeur has arrived. Live GPS will update as the trip continues.";
    }

    if (status === "in_progress") {
      return "Your trip is in progress. Waiting for the latest GPS update.";
    }

    return "Waiting for chauffeur GPS location.";
  }

  function getDriverPhoto() {
    return firstAvailable(
      driverProfile?.profile_photo_url,
      driverProfile?.photo_url,
      driverProfile?.avatar_url,
      trip?.driver_photo_url
    );
  }

  function getDriverRating() {
    return firstAvailable(
      driverProfile?.average_rating,
      driverProfile?.rating,
      trip?.driver_rating,
      "New"
    );
  }

  function getCompletedTrips() {
    return firstAvailable(
      driverProfile?.completed_trips,
      driverProfile?.total_completed_trips,
      driverProfile?.trip_count,
      "0"
    );
  }

  function isDriverVerified() {
    return Boolean(
      driverProfile?.is_verified ||
      driverProfile?.verified ||
      normalize(driverProfile?.verification_status) === "approved" ||
      normalize(driverProfile?.status) === "approved"
    );
  }

  function getVehicleColor() {
    return firstAvailable(
      location?.vehicle_color,
      trip?.vehicle_color,
      driverProfile?.vehicle_color,
      driverProfile?.car_color,
      "Not available"
    );
  }

  function formatEta() {
    if (etaSeconds <= 0) return "Calculating";
    const minutes = Math.floor(etaSeconds / 60);
    const seconds = etaSeconds % 60;
    if (minutes >= 60) {
      return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function textDriver() {
    const phone = getDriverPhone();
    if (!phone) {
      Alert.alert("Phone Missing", "Driver phone number is not available yet.");
      return;
    }
    const body = encodeURIComponent(
      `Hello, this is the passenger for Angel Express booking ${getBookingNumber()}.`
    );
    Linking.openURL(
      `sms:${String(phone).replace(/[^\d+]/g, "")}?body=${body}`
    );
  }

  function callOperations() {
    Linking.openURL(`tel:${OPERATIONS_PHONE}`);
  }

  function openSupport() {
    router.push({
      pathname: "/support" as any,
      params: {
        booking_id: String(trip?.id || ""),
        booking_number: getBookingNumber(),
      },
    });
  }

  async function shareLiveTrip() {
    const driver = getDriverCoords();
    const liveLocation = driver
      ? `https://www.google.com/maps/search/?api=1&query=${driver.latitude},${driver.longitude}`
      : "Live GPS is not available yet.";

    await Share.share({
      title: "Angel Express Live Trip",
      message:
        `Angel Express trip update\n\n` +
        `Booking: ${getBookingNumber()}\n` +
        `Status: ${getStatusLabel(trip?.status)}\n` +
        `Driver: ${getDriverName()}\n` +
        `Vehicle: ${getVehicle()} (${getVehicleColor()})\n` +
        `Plate: ${getPlateNumber()}\n` +
        `Pickup: ${getPickup()}\n` +
        `Drop-off: ${getDropoff()}\n` +
        `Current location: ${liveLocation}`,
    });
  }

  function openFamilyCheckIn() {
    router.push({
      pathname: "/family-checkin" as any,
      params: {
        booking_id: String(trip?.id || ""),
        booking_number: getBookingNumber(),
        invoice_number: getInvoiceNumber(),
      },
    });
  }

  function openSafetyShare() {
    router.push({
      pathname: "/safety-share" as any,
      params: {
        booking_id: String(trip?.id || ""),
        booking_number: getBookingNumber(),
      },
    });
  }

  function triggerSOS() {
    Alert.alert(
      "Emergency SOS",
      "This alerts Angel Express Operations. Call 911 immediately if you are in danger.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send SOS",
          style: "destructive",
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              const coordinate = getDriverCoords();

              const { error } = await supabase
                .from("emergency_alerts")
                .insert({
                  booking_id: trip?.id || null,
                  passenger_id: user?.id || null,
                  user_id: user?.id || null,
                  alert_type: "passenger_sos",
                  status: "active",
                  latitude: coordinate?.latitude || null,
                  longitude: coordinate?.longitude || null,
                  notes: `Passenger SOS for booking ${getBookingNumber()}.`,
                });

              if (error) throw error;

              Alert.alert(
                "Operations Alerted",
                "Angel Express Operations received your emergency alert.",
                [
                  { text: "Close" },
                  {
                    text: "Call 911",
                    style: "destructive",
                    onPress: () => Linking.openURL("tel:911"),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert(
                "SOS Error",
                error.message || "Could not send SOS. Call 911 if you are in immediate danger.",
                [
                  { text: "Close" },
                  {
                    text: "Call 911",
                    style: "destructive",
                    onPress: () => Linking.openURL("tel:911"),
                  },
                ]
              );
            }
          },
        },
      ]
    );
  }

  function getRideBadges() {
    const category = normalize(
      firstAvailable(
        trip?.ride_category,
        trip?.ride_category_label,
        trip?.service_type
      )
    );

    const badges: any[] = [];
    if (category.includes("student")) {
      badges.push({ label: "Student Ride", icon: GraduationCap });
    }
    if (category.includes("airport") || trip?.flight_number) {
      badges.push({ label: "Airport Ride", icon: Plane });
    }
    if (category.includes("corporate") || trip?.corporate_account_id) {
      badges.push({ label: "Corporate Ride", icon: Building2 });
    }
    if (
      category.includes("pool") ||
      category.includes("shared") ||
      trip?.is_shared_ride
    ) {
      badges.push({ label: "Shared Ride", icon: UsersRound });
    }
    return badges;
  }

  function openInMaps() {
    const driverCoords = getDriverCoords();

    if (!driverCoords || isStoppedStatus(trip?.status)) {
      Alert.alert(
        "Driver Location Not Available",
        "A current driver location is not available for this trip."
      );
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${driverCoords.latitude},${driverCoords.longitude}`;
    Linking.openURL(url);
  }

  function callDriver() {
    const phone = getDriverPhone();

    if (!phone) {
      Alert.alert("Phone Missing", "Driver phone number is not available yet.");
      return;
    }

    Linking.openURL(`tel:${String(phone).replace(/[^\d+]/g, "")}`);
  }

  function openPayRide() {
    router.push({
      pathname: "/pay-ride" as any,
      params: {
        bookingId: String(trip?.id || ""),
        booking_id: String(trip?.id || ""),
      },
    });
  }

  function openRateDriver() {
    router.push({
      pathname: "/rate-driver" as any,
      params: {
        bookingId: String(trip?.id || ""),
        booking_id: String(trip?.id || ""),
        booking_number: getBookingNumber(),
        invoice_number: getInvoiceNumber(),
        invoice_no: getInvoiceNumber(),
      },
    });
  }

  function getBookingNumber() {
    return firstAvailable(
      trip?.booking_number,
      trip?.booking_no,
      trip?.id,
      "N/A"
    );
  }

  function getInvoiceNumber() {
    return firstAvailable(
      trip?.invoice_number,
      trip?.invoice_no,
      "N/A"
    );
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const driverCoordinate = getDriverCoords();
  const pickupCoordinate = getPickupCoords();
  const dropoffCoordinate = getDropoffCoords();

  const hasDriverLocation = Boolean(driverCoordinate);
  const freshness = getLocationFreshness();
  const status = normalize(trip?.status);
  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled" || status === "canceled";
  const isPaid = normalize(trip?.payment_status) === "paid";
  const activeTimelineIndex = timelineIndex(status);
  const distanceToPickup = haversineMiles(driverCoordinate, pickupCoordinate);
  const distanceToDropoff = haversineMiles(driverCoordinate, dropoffCoordinate);
  const rideBadges = getRideBadges();
  const fare = firstAvailable(
    trip?.final_fare,
    trip?.total_fare,
    trip?.fare,
    trip?.quoted_fare,
    trip?.estimated_fare
  );

  const mapCenter =
    driverCoordinate ||
    pickupCoordinate ||
    dropoffCoordinate || {
      latitude: 32.7767,
      longitude: -96.797,
    };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Loading live trip...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyCard}>
          <MapPinned size={38} color={colors.gold} />
          <Text style={styles.emptyTitle}>Trip Not Found</Text>
          <Text style={styles.emptyText}>
            No active accepted trip was found for your account.
          </Text>

          <TouchableOpacity
            style={styles.goldButton}
            onPress={() => router.replace("/my-trips" as any)}
          >
            <Text style={styles.goldButtonText}>View My Trips</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.back()}
          >
            <Text style={styles.outlineButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}
      >
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadLiveTrip(false)}
              tintColor={colors.gold}
            />
          }
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.themePill}
              onPress={toggleTheme}
            >
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
            <Text style={styles.kicker}>LIVE TRIP TRACKING</Text>
            <Text style={styles.title}>Track Live Trip</Text>

            <Text style={styles.subtitle}>
              Track your Angel Express chauffeur, pickup, drop-off, vehicle,
              safety tools, fare, and trip phase in real time.
            </Text>

            {rideBadges.length > 0 && (
              <View style={styles.badgeRow}>
                {rideBadges.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <View style={styles.rideBadge} key={badge.label}>
                      <Icon size={14} color={colors.gold} />
                      <Text style={styles.rideBadgeText}>{badge.label}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                {isCompleted ? (
                  <CheckCircle2 size={31} color={colors.onGold || colors.navy} />
                ) : isCancelled ? (
                  <XCircle size={31} color={colors.onGold || colors.navy} />
                ) : (
                  <Navigation size={31} color={colors.onGold || colors.navy} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>
                  {getStatusLabel(trip.status)}
                </Text>
                <Text style={styles.heroText}>
                  {isCompleted
                    ? "Trip completed"
                    : isCancelled
                    ? "Trip cancelled"
                    : hasDriverLocation
                    ? `${freshness.label} GPS`
                    : "Waiting for chauffeur GPS"}
                </Text>
              </View>
            </View>

            {!isStoppedStatus(trip.status) && (
              <View style={styles.quickRow}>
                <TouchableOpacity style={styles.quickButton} onPress={() => loadLiveTrip(false)}>
                  <RefreshCcw size={18} color={colors.gold} />
                  <Text style={styles.quickText}>Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickButton} onPress={callDriver}>
                  <Phone size={18} color={colors.gold} />
                  <Text style={styles.quickText}>Call Driver</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickButton} onPress={textDriver}>
                  <MessageCircle size={18} color={colors.gold} />
                  <Text style={styles.quickText}>Text Driver</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickButton} onPress={callOperations}>
                  <ShieldCheck size={18} color={colors.gold} />
                  <Text style={styles.quickText}>Operations</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.statusCard}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Ride Status</Text>
              </View>

              <Text style={styles.statusText}>
                {getStatusLabel(trip.status)}
              </Text>

              <Text style={styles.text}>{getStatusMessage()}</Text>
            </View>

            <View style={styles.timelineCard}>
              <View style={styles.cardHeader}>
                <Clock3 size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Trip Progress</Text>
              </View>

              {TIMELINE.map((step, index) => {
                const complete = index < activeTimelineIndex;
                const active = index === activeTimelineIndex;
                return (
                  <View style={styles.timelineRow} key={step.key}>
                    <View style={styles.timelineRail}>
                      <View
                        style={[
                          styles.timelineDot,
                          complete && styles.timelineDotComplete,
                          active && styles.timelineDotActive,
                        ]}
                      >
                        {complete && (
                          <CheckCircle2
                            size={13}
                            color={colors.onGold || colors.navy}
                          />
                        )}
                      </View>
                      {index < TIMELINE.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            index < activeTimelineIndex &&
                              styles.timelineLineComplete,
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.timelineCopy}>
                      <Text
                        style={[
                          styles.timelineLabel,
                          active && styles.timelineLabelActive,
                          index > activeTimelineIndex &&
                            styles.timelineLabelFuture,
                        ]}
                      >
                        {step.label}
                      </Text>
                      {active && (
                        <Text style={styles.timelineCurrent}>
                          Current trip phase
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {!isStoppedStatus(trip.status) && (
              <>
              <View style={styles.mapTopRow}>
                <Text style={styles.mapTitle}>Chauffeur Location</Text>
                <TouchableOpacity
                  style={[
                    styles.followPill,
                    autoFollow && styles.followPillActive,
                  ]}
                  onPress={() => setAutoFollow((current) => !current)}
                >
                  <Navigation
                    size={14}
                    color={
                      autoFollow
                        ? colors.onGold || colors.navy
                        : colors.gold
                    }
                  />
                  <Text
                    style={[
                      styles.followText,
                      autoFollow && styles.followTextActive,
                    ]}
                  >
                    {autoFollow ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.mapShell}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  onPanDrag={() => setAutoFollow(false)}
                  initialRegion={{
                    latitude: mapCenter.latitude,
                    longitude: mapCenter.longitude,
                    latitudeDelta: 0.08,
                    longitudeDelta: 0.08,
                  }}
                >
                  {driverCoordinate && (
                    <Marker
                      coordinate={driverCoordinate}
                      title={getDriverName()}
                      description={getVehicle()}
                    />
                  )}

                  {pickupCoordinate && (
                    <Marker
                      coordinate={pickupCoordinate}
                      title="Pickup"
                      description={getPickup()}
                      pinColor="green"
                    />
                  )}

                  {dropoffCoordinate && (
                    <Marker
                      coordinate={dropoffCoordinate}
                      title="Drop-off"
                      description={getDropoff()}
                      pinColor="orange"
                    />
                  )}

                  {driverCoordinate &&
                    pickupCoordinate &&
                    status !== "in_progress" && (
                      <Polyline
                        coordinates={[
                          driverCoordinate,
                          pickupCoordinate,
                        ]}
                        strokeWidth={4}
                        strokeColor={colors.gold}
                      />
                    )}

                  {driverCoordinate &&
                    dropoffCoordinate &&
                    status === "in_progress" && (
                      <Polyline
                        coordinates={[
                          driverCoordinate,
                          dropoffCoordinate,
                        ]}
                        strokeWidth={4}
                        strokeColor={colors.gold}
                      />
                    )}
                </MapView>
              </View>

              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <MapPinned size={18} color={colors.gold} />
                  <Text style={styles.metricLabel}>To Pickup</Text>
                  <Text style={styles.metricValue}>
                    {formatDistance(distanceToPickup)}
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Route size={18} color={colors.gold} />
                  <Text style={styles.metricLabel}>To Destination</Text>
                  <Text style={styles.metricValue}>
                    {formatDistance(distanceToDropoff)}
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Clock3 size={18} color={colors.gold} />
                  <Text style={styles.metricLabel}>Live ETA</Text>
                  <Text style={styles.metricValue}>{formatEta()}</Text>
                </View>
              </View>
              </>
            )}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <UserRound size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Driver Details</Text>
              </View>

              <View style={styles.driverIdentity}>
                {getDriverPhoto() ? (
                  <Image
                    source={{ uri: getDriverPhoto() }}
                    style={styles.driverPhoto}
                  />
                ) : (
                  <View style={styles.driverPhotoFallback}>
                    <UserRound size={30} color={colors.gold} />
                  </View>
                )}

                <View style={styles.driverIdentityCopy}>
                  <View style={styles.driverNameRow}>
                    <Text style={styles.driverName}>{getDriverName()}</Text>
                    {isDriverVerified() && (
                      <BadgeCheck size={19} color={colors.gold} />
                    )}
                  </View>
                  <View style={styles.driverStatsRow}>
                    <Star size={14} color={colors.gold} />
                    <Text style={styles.driverStatText}>
                      {getDriverRating()} rating • {getCompletedTrips()} trips
                    </Text>
                  </View>
                </View>
              </View>

              <Row
                label="Phone"
                value={getDriverPhone() || "Not available yet"}
                styles={styles}
              />

              <Row
                label="Vehicle"
                value={getVehicle()}
                styles={styles}
              />

              <Row
                label="Vehicle Color"
                value={getVehicleColor()}
                styles={styles}
              />
              <Row
                label="Plate Number"
                value={getPlateNumber()}
                styles={styles}
              />

              <Row
                label="ETA"
                value={
                  location?.eta_minutes
                    ? `${Math.round(
                        Number(location.eta_minutes)
                      )} minutes`
                    : isStoppedStatus(trip.status)
                    ? "Not applicable"
                    : "Calculating"
                }
                styles={styles}
              />

              <Row
                label="Trip Phase"
                value={
                  location?.trip_phase ||
                  getStatusLabel(trip.status)
                }
                styles={styles}
              />

              <Row
                label="GPS Status"
                value={
                  isStoppedStatus(trip.status)
                    ? "Tracking ended"
                    : freshness.label
                }
                styles={styles}
              />

              <Row
                label="Last Updated"
                value={
                  getLocationTimestamp()
                    ? new Date(
                        getLocationTimestamp()
                      ).toLocaleString()
                    : "Waiting for GPS update"
                }
                styles={styles}
              />

              {!isStoppedStatus(trip.status) && (
                <View style={styles.driverActions}>
                  <TouchableOpacity
                    style={styles.secondaryAction}
                    onPress={callDriver}
                    activeOpacity={0.85}
                  >
                    <Phone size={17} color={colors.gold} />
                    <Text style={styles.secondaryActionText}>
                      Call Driver
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryAction}
                    onPress={textDriver}
                    activeOpacity={0.85}
                  >
                    <MessageCircle size={17} color={colors.gold} />
                    <Text style={styles.secondaryActionText}>
                      Text Driver
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryAction}
                    onPress={openInMaps}
                    activeOpacity={0.85}
                  >
                    <ExternalLink size={17} color={colors.gold} />
                    <Text style={styles.secondaryActionText}>
                      Open Maps
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <CarFront size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Trip Details</Text>
              </View>

              <Row
                label="Booking Number"
                value={getBookingNumber()}
                styles={styles}
              />

              <Row
                label="Invoice Number"
                value={getInvoiceNumber()}
                styles={styles}
              />

              <Row
                label="Status"
                value={getStatusLabel(trip.status)}
                styles={styles}
              />

              <Row
                label="Pickup"
                value={getPickup()}
                styles={styles}
              />

              <Row
                label="Drop-off"
                value={getDropoff()}
                styles={styles}
              />

              <Row
                label="Date"
                value={
                  trip.date ||
                  trip.ride_date ||
                  trip.pickup_date ||
                  "N/A"
                }
                styles={styles}
              />

              <Row
                label="Time"
                value={
                  trip.time ||
                  trip.ride_time ||
                  trip.pickup_time ||
                  "N/A"
                }
                styles={styles}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Route size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Route</Text>
              </View>

              <View style={styles.routeLine}>
                <MapPinned size={18} color={colors.gold} />
                <Text style={styles.routeText}>{getPickup()}</Text>
              </View>

              <Text style={styles.routeArrow}>↓</Text>

              <View style={styles.routeLine}>
                <CarFront size={18} color={colors.gold} />
                <Text style={styles.routeText}>{getDropoff()}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <CreditCard size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Fare and Payment</Text>
              </View>
              <Row
                label="Ride Fare"
                value={fare ? formatMoney(fare) : "Not available"}
                styles={styles}
              />
              <Row
                label="Payment Status"
                value={getStatusLabel(
                  firstAvailable(trip?.payment_status, "unpaid")
                )}
                styles={styles}
              />
              <Row
                label="Invoice"
                value={getInvoiceNumber()}
                styles={styles}
              />
              <Row
                label="Referral / Promo"
                value={firstAvailable(
                  trip?.promo_code,
                  trip?.referral_code,
                  "None"
                )}
                styles={styles}
              />
            </View>

            <View style={styles.safetyCard}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Safety and Sharing</Text>
              </View>

              <View style={styles.safetyGrid}>
                <TouchableOpacity style={styles.safetyButton} onPress={shareLiveTrip}>
                  <Share2 size={20} color={colors.gold} />
                  <Text style={styles.safetyButtonTitle}>Share Live Trip</Text>
                  <Text style={styles.safetyButtonText}>
                    Share status, driver, vehicle, route and GPS.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.safetyButton} onPress={openFamilyCheckIn}>
                  <UsersRound size={20} color={colors.gold} />
                  <Text style={styles.safetyButtonTitle}>Family Check-In</Text>
                  <Text style={styles.safetyButtonText}>
                    Notify family about important trip phases.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.safetyButton} onPress={openSafetyShare}>
                  <ShieldCheck size={20} color={colors.gold} />
                  <Text style={styles.safetyButtonTitle}>Safety Share</Text>
                  <Text style={styles.safetyButtonText}>
                    Open dedicated safety-sharing controls.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.safetyButton} onPress={openSupport}>
                  <MessageCircle size={20} color={colors.gold} />
                  <Text style={styles.safetyButtonTitle}>Contact Support</Text>
                  <Text style={styles.safetyButtonText}>
                    Message Angel Express Operations.
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.sosButton} onPress={triggerSOS}>
                <AlertTriangle size={21} color="#FFFFFF" />
                <Text style={styles.sosButtonText}>Emergency SOS</Text>
              </TouchableOpacity>
            </View>

            {!isStoppedStatus(trip.status) && (
              <TouchableOpacity
                style={styles.goldButton}
                onPress={openInMaps}
              >
                <ExternalLink size={18} color={colors.onGold || colors.navy} />
                <Text style={styles.goldButtonText}>
                  Open Driver Location in Maps
                </Text>
              </TouchableOpacity>
            )}

            {isCompleted && !isPaid && (
              <TouchableOpacity
                style={styles.goldButton}
                onPress={openPayRide}
              >
                <CreditCard size={18} color={colors.onGold || colors.navy} />
                <Text style={styles.goldButtonText}>
                  Pay Completed Ride
                </Text>
              </TouchableOpacity>
            )}

            {isCompleted && (
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={openRateDriver}
              >
                <Star size={18} color={colors.gold} />
                <Text style={styles.outlineButtonText}>
                  Rate Your Chauffeur
                </Text>
              </TouchableOpacity>
            )}

            {isCancelled && (
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() =>
                  router.replace("/my-trips" as any)
                }
              >
                <Text style={styles.outlineButtonText}>
                  Back to My Trips
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
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
    centerContainer: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
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
      marginBottom: 8,
    },
    title: {
      color: c.text,
      fontSize: 37,
      fontWeight: "900",
      marginBottom: 10,
    },
    subtitle: {
      color: c.text2 || c.textSecondary,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },
    loadingText: {
      color: c.text,
      marginTop: 14,
      fontSize: 16,
      fontWeight: "800",
    },
    text: {
      color: c.text2 || c.textSecondary,
      fontSize: 15.5,
      lineHeight: 23,
      fontWeight: "700",
    },
    heroCard: {
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 17,
      ...v5Shadow(c),
    },
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: {
      color: c.onGold || c.navy,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 4,
    },
    heroText: {
      color: c.onGold || c.navy,
      fontSize: 14,
      fontWeight: "800",
      lineHeight: 20,
      opacity: 0.82,
    },
    quickRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 18,
    },
    quickButton: {
      width: "48%",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    quickText: {
      color: c.gold,
      fontWeight: "900",
      fontSize: 13,
    },
    statusCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    statusText: {
      color: c.gold,
      fontSize: 25,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 10,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    cardTitle: {
      color: c.gold,
      fontSize: 21,
      fontWeight: "900",
      flex: 1,
    },
    mapShell: {
      height: 330,
      overflow: "hidden",
      marginBottom: 18,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      ...v5Shadow(c),
    },
    map: {
      flex: 1,
    },
    row: {
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft || c.lightBorder,
      paddingBottom: 11,
    },
    label: {
      color: c.gold,
      fontSize: 13,
      fontWeight: "900",
      marginBottom: 4,
      textTransform: "uppercase",
    },
    value: {
      color: c.text,
      fontSize: 15.5,
      lineHeight: 22,
      fontWeight: "700",
    },
    driverActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 6,
    },
    secondaryAction: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
      backgroundColor: c.soft,
    },
    secondaryActionText: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
    },
    goldButton: {
      backgroundColor: c.gold,
      borderRadius: 16,
      paddingVertical: 15,
      paddingHorizontal: 18,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
      ...v5Shadow(c),
    },
    goldButtonText: {
      color: c.onGold || c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
      textAlign: "center",
    },
    outlineButton: {
      borderRadius: 16,
      paddingVertical: 15,
      paddingHorizontal: 18,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      marginTop: 12,
    },
    outlineButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    emptyCard: {
      backgroundColor: c.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.border,
      padding: 24,
      alignItems: "center",
      width: "100%",
      ...v5Shadow(c),
    },
    emptyTitle: {
      color: c.text,
      fontSize: 25,
      fontWeight: "900",
      marginTop: 14,
      marginBottom: 8,
      textAlign: "center",
    },
    emptyText: {
      color: c.text2 || c.textSecondary,
      fontSize: 15.5,
      lineHeight: 23,
      textAlign: "center",
      fontWeight: "700",
      marginBottom: 10,
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    rideBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },
    rideBadgeText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    timelineCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    timelineRow: {
      flexDirection: "row",
      minHeight: 61,
    },
    timelineRail: {
      width: 34,
      alignItems: "center",
    },
    timelineDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: c.border,
      backgroundColor: c.card2,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    timelineDotComplete: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    timelineDotActive: {
      borderColor: c.gold,
      backgroundColor: c.soft,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      minHeight: 36,
      backgroundColor: c.borderSoft || c.lightBorder,
    },
    timelineLineComplete: {
      backgroundColor: c.gold,
    },
    timelineCopy: {
      flex: 1,
      paddingLeft: 10,
      paddingTop: 1,
    },
    timelineLabel: {
      color: c.text,
      fontSize: 15,
      fontWeight: "900",
    },
    timelineLabelActive: {
      color: c.gold,
    },
    timelineLabelFuture: {
      color: c.muted,
    },
    timelineCurrent: {
      color: c.text2 || c.textSecondary,
      marginTop: 4,
      fontSize: 12.5,
      fontWeight: "700",
    },
    mapTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    mapTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: "900",
    },
    followPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },
    followPillActive: {
      backgroundColor: c.gold,
      borderColor: c.gold,
    },
    followText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },
    followTextActive: {
      color: c.onGold || c.navy,
    },
    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 18,
    },
    metricCard: {
      width: "48%",
      minHeight: 105,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      borderRadius: 18,
      padding: 14,
      justifyContent: "center",
    },
    metricLabel: {
      color: c.text2 || c.textSecondary,
      fontSize: 12.5,
      fontWeight: "800",
      marginTop: 7,
      marginBottom: 4,
    },
    metricValue: {
      color: c.text,
      fontSize: 16,
      fontWeight: "900",
    },
    driverIdentity: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      marginBottom: 17,
    },
    driverPhoto: {
      width: 68,
      height: 68,
      borderRadius: 23,
      borderWidth: 2,
      borderColor: c.gold,
      backgroundColor: c.card2,
    },
    driverPhotoFallback: {
      width: 68,
      height: 68,
      borderRadius: 23,
      borderWidth: 2,
      borderColor: c.gold,
      backgroundColor: c.soft,
      alignItems: "center",
      justifyContent: "center",
    },
    driverIdentityCopy: {
      flex: 1,
    },
    driverNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    driverName: {
      color: c.text,
      fontSize: 19,
      fontWeight: "900",
      flexShrink: 1,
    },
    driverStatsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 7,
    },
    driverStatText: {
      color: c.text2 || c.textSecondary,
      fontSize: 12.5,
      fontWeight: "800",
    },
    safetyCard: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.border,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(c),
    },
    safetyGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    safetyButton: {
      width: "48%",
      minHeight: 132,
      backgroundColor: c.card2,
      borderWidth: 1,
      borderColor: c.borderSoft || c.lightBorder,
      borderRadius: 17,
      padding: 14,
    },
    safetyButtonTitle: {
      color: c.text,
      fontSize: 14.5,
      fontWeight: "900",
      marginTop: 9,
      marginBottom: 5,
    },
    safetyButtonText: {
      color: c.text2 || c.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "700",
    },
    sosButton: {
      backgroundColor: c.danger || "#DC2626",
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 14,
    },
    sosButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    routeLine: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
    },
    routeText: {
      color: c.text,
      fontSize: 15.5,
      lineHeight: 23,
      flex: 1,
      fontWeight: "700",
    },
    routeArrow: {
      color: c.gold,
      fontSize: 20,
      marginVertical: 5,
      marginLeft: 4,
    },
  });
}
