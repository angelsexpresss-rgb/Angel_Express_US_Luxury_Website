import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  CarFront,
  Clock,
  CreditCard,
  GraduationCap,
  MapPinned,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

type JsonRecord = Record<string, any>;

function firstValue(...values: any[]) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function money(value: any) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value: any) {
  return `$${money(value).toFixed(2)}`;
}

function formatDuration(minutesValue: any) {
  const minutes = Math.max(0, Math.round(Number(minutesValue || 0)));

  if (!minutes) return "N/A";

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function formatScheduledAt(value?: string) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function displayTripType(value?: string) {
  return value === "round_trip" ? "Round Trip" : "One Way";
}

function displayRideCategory(value?: string, label?: string) {
  if (label) return label;

  const map: Record<string, string> = {
    private: "Standard Ride",
    airport: "Airport Transfer",
    student_private: "Student Ride",
    student_pool: "Student Shared Ride",
    tourist_event: "Tourist/Event Ride",
    corporate: "Corporate Ride",
  };

  return map[value || ""] || value || "Standard Ride";
}

function quoteObject(response: any) {
  return (
    response?.quote ||
    response?.fare_quote ||
    response?.data ||
    response ||
    {}
  );
}

export default function FareEstimateScreen() {
  const params = useLocalSearchParams();
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const draftId = String(
    firstValue(params.draftId, params.draft_id, "") || ""
  );

  const accessToken = String(
    firstValue(params.accessToken, params.access_token, "") || ""
  );

  const [draft, setDraft] = useState<JsonRecord | null>(null);
  const [quote, setQuote] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingQuote, setRefreshingQuote] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

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

    initializeFareEstimate();
  }, []);

  async function getDraft() {
    if (!draftId) {
      throw new Error(
        "Booking draft ID is missing. Please return to the booking form."
      );
    }

    const { data, error } = await supabase.rpc("get_booking_draft_v2", {
      p_draft_id: draftId,
      p_access_token: accessToken || null,
    });

    if (error) throw error;

    const loadedDraft = data?.draft || data;

    if (!loadedDraft?.id) {
      throw new Error("The booking draft could not be loaded.");
    }

    return loadedDraft as JsonRecord;
  }

  async function calculateRoute(currentDraft: JsonRecord) {
    const pickupLatitude = Number(currentDraft.pickup_latitude);
    const pickupLongitude = Number(currentDraft.pickup_longitude);
    const dropoffLatitude = Number(currentDraft.dropoff_latitude);
    const dropoffLongitude = Number(currentDraft.dropoff_longitude);

    if (
      !Number.isFinite(pickupLatitude) ||
      !Number.isFinite(pickupLongitude) ||
      !Number.isFinite(dropoffLatitude) ||
      !Number.isFinite(dropoffLongitude)
    ) {
      throw new Error(
        "Pickup or drop-off GPS coordinates are missing. Please return to the booking form and select both addresses from the suggestions."
      );
    }

    const routeUrl =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${pickupLongitude},${pickupLatitude};` +
      `${dropoffLongitude},${dropoffLatitude}` +
      `?overview=false&steps=false`;

    const response = await fetch(routeUrl);

    if (!response.ok) {
      throw new Error("The route service is temporarily unavailable.");
    }

    const data = await response.json();
    const route = data?.routes?.[0];

    if (!route) {
      throw new Error("Could not calculate a driving route for this trip.");
    }

    return {
      distanceMiles: Number((Number(route.distance) / 1609.344).toFixed(2)),
      durationMinutes: Math.max(1, Math.round(Number(route.duration) / 60)),
      metadata: {
        osrm_code: data?.code || null,
        route_weight: route?.weight || null,
        calculated_at: new Date().toISOString(),
      },
    };
  }

  async function saveRoute(
    currentDraft: JsonRecord,
    distanceMiles: number,
    durationMinutes: number,
    metadata: JsonRecord
  ) {
    const existingDistance = Number(currentDraft.route_distance_miles || 0);
    const existingDuration = Number(currentDraft.route_duration_minutes || 0);

    const routeAlreadyCurrent =
      Math.abs(existingDistance - distanceMiles) < 0.01 &&
      existingDuration === durationMinutes;

    if (routeAlreadyCurrent) return currentDraft;

    const { data, error } = await supabase.rpc("update_booking_draft_v2", {
      p_draft_id: draftId,
      p_access_token: accessToken || null,
      p_patch: {
        route_distance_miles: distanceMiles,
        route_duration_minutes: durationMinutes,
        route_provider: "osrm",
        route_metadata: metadata,
      },
    });

    if (error) throw error;

    return (data?.draft || data || currentDraft) as JsonRecord;
  }

  function buildFareRequest(currentDraft: JsonRecord) {
    return {
      source_platform: currentDraft.source_platform || "passenger_app",
      draft_id: currentDraft.id,

      pickup_address: currentDraft.pickup_address,
      pickup_city: currentDraft.pickup_city,
      pickup_state: currentDraft.pickup_state,
      pickup_postal_code: currentDraft.pickup_postal_code,
      pickup_latitude: currentDraft.pickup_latitude,
      pickup_longitude: currentDraft.pickup_longitude,

      dropoff_address: currentDraft.dropoff_address,
      dropoff_city: currentDraft.dropoff_city,
      dropoff_state: currentDraft.dropoff_state,
      dropoff_postal_code: currentDraft.dropoff_postal_code,
      dropoff_latitude: currentDraft.dropoff_latitude,
      dropoff_longitude: currentDraft.dropoff_longitude,

      scheduled_at: currentDraft.scheduled_at,
      return_scheduled_at: currentDraft.return_scheduled_at,

      trip_type: currentDraft.trip_type,
      ride_category: currentDraft.ride_category,

      passenger_count: currentDraft.passenger_count,
      luggage_count: currentDraft.luggage_count,

      route_distance_miles: currentDraft.route_distance_miles,
      route_duration_minutes: currentDraft.route_duration_minutes,

      airport_code: currentDraft.airport_code,
      airport_action: currentDraft.airport_action,

      student_verified: currentDraft.student_verified,
      student_discount_eligible:
        currentDraft.student_discount_eligible,
      student_pool_requested: currentDraft.student_pool_requested,
      expected_pool_size: currentDraft.expected_pool_size,

      referral_code: currentDraft.referral_code,
      referrer_user_id: currentDraft.referrer_user_id,
      referral_applied: currentDraft.referral_applied,

      promotion_code: currentDraft.promotion_code,
    };
  }

  async function generateAndAttachQuote(currentDraft: JsonRecord) {
    const { data: quoteResponse, error: quoteError } = await supabase.rpc(
      "generate_fare_quote_v2",
      {
        p_request: buildFareRequest(currentDraft),
      }
    );

    if (quoteError) throw quoteError;

    const generatedQuote = quoteObject(quoteResponse);
    const quoteId = firstValue(
      generatedQuote?.quote_id,
      generatedQuote?.id,
      quoteResponse?.quote_id,
      quoteResponse?.id
    );

    if (!quoteId) {
      throw new Error(
        "The Fare Engine returned no quote ID. Verify the generate_fare_quote_v2 RPC response."
      );
    }

    const { data: attached, error: attachError } = await supabase.rpc(
      "attach_fare_quote_to_draft_v2",
      {
        p_draft_id: draftId,
        p_access_token: accessToken || null,
        p_quote_id: quoteId,
      }
    );

    if (attachError) throw attachError;

    const refreshedDraft = await getDraft();

    setDraft(refreshedDraft);
    setQuote({
      ...generatedQuote,
      ...attached,
      quote_id: quoteId,
    });
  }

  async function initializeFareEstimate(forceNewQuote = false) {
    try {
      setErrorMessage("");
      forceNewQuote ? setRefreshingQuote(true) : setLoading(true);

      let currentDraft = await getDraft();

      if (currentDraft.status === "expired") {
        throw new Error(
          "This booking draft has expired. Please begin a new booking."
        );
      }

      if (currentDraft.status === "cancelled") {
        throw new Error("This booking draft has been cancelled.");
      }

      const route = await calculateRoute(currentDraft);

      currentDraft = await saveRoute(
        currentDraft,
        route.distanceMiles,
        route.durationMinutes,
        route.metadata
      );

      setDraft(currentDraft);

      const existingQuoteIsActive =
        !forceNewQuote &&
        currentDraft.fare_quote_id &&
        currentDraft.quote_expires_at &&
        new Date(currentDraft.quote_expires_at).getTime() > Date.now() &&
        ["quoted", "quote_accepted"].includes(currentDraft.status);

      if (existingQuoteIsActive) {
        setQuote({
          quote_id: currentDraft.fare_quote_id,
          quote_number: currentDraft.quote_number,
          pricing_version: currentDraft.pricing_version,
          pricing_method: currentDraft.pricing_method,
          subtotal: currentDraft.quoted_subtotal,
          total_discount: currentDraft.quoted_discount,
          final_fare: currentDraft.quoted_fare,
          driver_share: currentDraft.quoted_driver_share,
          company_share: currentDraft.quoted_company_share,
          expires_at: currentDraft.quote_expires_at,
        });
      } else {
        await generateAndAttachQuote(currentDraft);
      }
    } catch (error: any) {
      console.error("Fare Estimate V2 error:", error);
      const message =
        error?.message || "Angel Express could not generate your fare quote.";
      setErrorMessage(message);
      Alert.alert("Fare Estimate Error", message);
    } finally {
      setLoading(false);
      setRefreshingQuote(false);
    }
  }

  async function continueToConfirmation() {
    if (accepting || !draftId) return;

    try {
      setAccepting(true);

      const { data, error } = await supabase.rpc(
        "accept_booking_draft_quote_v2",
        {
          p_draft_id: draftId,
          p_access_token: accessToken || null,
        }
      );

      if (error) throw error;

      if (!data?.success) {
        throw new Error("The fare quote could not be accepted.");
      }

      router.push({
        pathname: "/confirm-booking" as any,
        params: {
          draftId,
          accessToken,
        },
      });
    } catch (error: any) {
      const message =
        error?.message || "Could not continue to booking confirmation.";

      Alert.alert("Quote Error", message);

      if (message.toLowerCase().includes("expired")) {
        initializeFareEstimate(true);
      }
    } finally {
      setAccepting(false);
    }
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const finalFare = firstValue(
    quote?.final_fare,
    quote?.quoted_fare,
    quote?.fare,
    draft?.quoted_fare,
    0
  );

  const subtotal = firstValue(
    quote?.subtotal,
    quote?.quoted_subtotal,
    draft?.quoted_subtotal,
    0
  );

  const totalDiscount = firstValue(
    quote?.total_discount,
    quote?.discount,
    quote?.quoted_discount,
    draft?.quoted_discount,
    0
  );

  const driverShare = firstValue(
    quote?.driver_share,
    quote?.quoted_driver_share,
    draft?.quoted_driver_share,
    0
  );

  const companyShare = firstValue(
    quote?.company_share,
    quote?.quoted_company_share,
    draft?.quoted_company_share,
    0
  );

  const quoteNumber = String(
    firstValue(quote?.quote_number, draft?.quote_number, "Pending")
  );

  const pricingVersion = String(
    firstValue(
      quote?.pricing_version_code,
      quote?.pricing_version,
      draft?.pricing_version,
      "V2"
    )
  );

  const pricingMethod = String(
    firstValue(
      quote?.pricing_method,
      draft?.pricing_method,
      "Central Fare Engine"
    )
  );

  const baseFare = firstValue(
    quote?.base_fare,
    quote?.base_amount,
    quote?.fare_breakdown?.base_fare
  );

  const mileageFare = firstValue(
    quote?.mileage_fare,
    quote?.distance_charge,
    quote?.fare_breakdown?.mileage_fare
  );

  const studentDiscount = firstValue(
    quote?.student_discount,
    quote?.fare_breakdown?.student_discount
  );

  const referralDiscount = firstValue(
    quote?.referral_discount,
    quote?.fare_breakdown?.referral_discount
  );

  const sharedRideDiscount = firstValue(
    quote?.shared_ride_discount,
    quote?.pool_discount,
    quote?.fare_breakdown?.shared_ride_discount
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>
          Loading draft and generating secure fare quote...
        </Text>
      </View>
    );
  }

  if (!draft || errorMessage) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Fare estimate unavailable</Text>
        <Text style={styles.errorText}>
          {errorMessage || "The booking draft could not be loaded."}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => initializeFareEstimate(false)}
        >
          <RefreshCw size={18} color={colors.navy} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.errorBackButton}
          onPress={() => router.back()}
        >
          <Text style={styles.errorBackText}>Back to Booking Form</Text>
        </TouchableOpacity>
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
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backTopButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backTopText}>Back</Text>
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
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>A  SECURE FARE QUOTE</Text>
            </View>

            <Text style={styles.title}>Fare Estimate</Text>

            <Text style={styles.subtitle}>
              Your route and pricing were calculated by the centralized Angel
              Express Fare Engine V2.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <CreditCard size={30} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Quoted Fare</Text>
                <Text style={styles.heroPrice}>
                  {formatMoney(finalFare)}
                </Text>
                <Text style={styles.heroText}>
                  {Number(draft.route_distance_miles || 0).toFixed(1)} miles •{" "}
                  {formatDuration(draft.route_duration_minutes)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <MiniStat
                icon={<Route size={18} color={colors.gold} />}
                title="Distance"
                value={`${Number(
                  draft.route_distance_miles || 0
                ).toFixed(1)} mi`}
                styles={styles}
              />

              <MiniStat
                icon={<Clock size={18} color={colors.gold} />}
                title="Drive Time"
                value={formatDuration(draft.route_duration_minutes)}
                styles={styles}
              />

              <MiniStat
                icon={<CarFront size={18} color={colors.gold} />}
                title="Trip Type"
                value={displayTripType(draft.trip_type)}
                styles={styles}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MapPinned size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Trip Route</Text>
              </View>

              <Info
                label="Pickup"
                value={draft.pickup_address}
                styles={styles}
              />
              <Info
                label="Drop-off"
                value={draft.dropoff_address}
                styles={styles}
              />
              <Info
                label="Date & Time"
                value={formatScheduledAt(draft.scheduled_at)}
                styles={styles}
              />
              <Info
                label="Ride Category"
                value={displayRideCategory(
                  draft.ride_category,
                  draft.ride_category_label
                )}
                styles={styles}
              />
              <Info
                label="Passengers"
                value={String(draft.passenger_count || 1)}
                styles={styles}
              />
              <Info
                label="Luggage"
                value={String(draft.luggage_count || 0)}
                styles={styles}
              />

              {draft.student_pool_requested ? (
                <View style={styles.sharedBox}>
                  <Users size={18} color="#22c55e" />
                  <Text style={styles.sharedText}>
                    Student Shared Ride matching is active for this draft.
                  </Text>
                </View>
              ) : null}

              <View style={styles.gpsBox}>
                <ShieldCheck size={18} color="#22c55e" />
                <Text style={styles.gpsText}>
                  Route saved by OSRM for chauffeur navigation and centralized
                  pricing.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Sparkles size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Fare Breakdown</Text>
              </View>

              <BreakdownRow
                label="Quote Number"
                value={quoteNumber}
                styles={styles}
              />
              <BreakdownRow
                label="Pricing Version"
                value={pricingVersion}
                styles={styles}
              />
              <BreakdownRow
                label="Pricing Method"
                value={pricingMethod}
                styles={styles}
              />

              {baseFare !== undefined ? (
                <BreakdownRow
                  label="Base Fare"
                  value={formatMoney(baseFare)}
                  styles={styles}
                />
              ) : null}

              {mileageFare !== undefined ? (
                <BreakdownRow
                  label="Distance Charge"
                  value={formatMoney(mileageFare)}
                  styles={styles}
                />
              ) : null}

              <View style={styles.divider} />

              <BreakdownRow
                label="Subtotal"
                value={formatMoney(subtotal)}
                styles={styles}
              />

              {money(studentDiscount) > 0 ? (
                <DiscountRow
                  icon={<GraduationCap size={17} color="#22c55e" />}
                  label="Student Discount"
                  value={`-${formatMoney(studentDiscount)}`}
                  styles={styles}
                />
              ) : null}

              {money(referralDiscount) > 0 ? (
                <DiscountRow
                  icon={<Tag size={17} color="#22c55e" />}
                  label="Referral Discount"
                  value={`-${formatMoney(referralDiscount)}`}
                  styles={styles}
                />
              ) : null}

              {money(sharedRideDiscount) > 0 ? (
                <DiscountRow
                  icon={<Users size={17} color="#22c55e" />}
                  label="Shared Ride Discount"
                  value={`-${formatMoney(sharedRideDiscount)}`}
                  styles={styles}
                />
              ) : null}

              <BreakdownRow
                label="Total Savings"
                value={`-${formatMoney(totalDiscount)}`}
                styles={styles}
              />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Final Fare</Text>
                <Text style={styles.totalValue}>
                  {formatMoney(finalFare)}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>Quote Record</Text>
              </View>

              <BreakdownRow
                label="Driver Share"
                value={formatMoney(driverShare)}
                styles={styles}
              />
              <BreakdownRow
                label="Company Share"
                value={formatMoney(companyShare)}
                styles={styles}
              />
              <BreakdownRow
                label="Quote Expires"
                value={formatScheduledAt(
                  firstValue(quote?.expires_at, draft.quote_expires_at)
                )}
                styles={styles}
              />

              <Text style={styles.notice}>
                This quote is generated and stored by the Angel Express Fare
                Engine. The Passenger App does not calculate or override the
                price locally.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.actionButton,
                accepting && styles.actionButtonDisabled,
              ]}
              onPress={continueToConfirmation}
              activeOpacity={0.88}
              disabled={accepting}
            >
              {accepting ? (
                <View style={styles.actionLoadingRow}>
                  <ActivityIndicator color={colors.navy} />
                  <Text style={styles.actionButtonText}>
                    Accepting Fare Quote
                  </Text>
                </View>
              ) : (
                <Text style={styles.actionButtonText}>
                  Continue to Confirm Booking
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.refreshButton,
                refreshingQuote && styles.actionButtonDisabled,
              ]}
              onPress={() => initializeFareEstimate(true)}
              disabled={refreshingQuote}
            >
              {refreshingQuote ? (
                <ActivityIndicator color={colors.gold} />
              ) : (
                <>
                  <RefreshCw size={17} color={colors.gold} />
                  <Text style={styles.refreshButtonText}>
                    Refresh Fare Quote
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.88}
            >
              <Text style={styles.backButtonText}>
                Back to Booking Form
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function MiniStat({
  icon,
  title,
  value,
  styles,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.miniStat}>
      {icon}
      <Text style={styles.miniTitle}>{title}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

function Info({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "N/A"}</Text>
    </View>
  );
}

function BreakdownRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: any;
}) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
}

function DiscountRow({
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
    <View style={styles.discountRow}>
      <View style={styles.discountLeft}>
        {icon}
        <Text style={styles.discountLabel}>{label}</Text>
      </View>
      <Text style={styles.discountValue}>{value}</Text>
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

    center: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
      padding: 28,
    },
    loadingText: {
      color: c.text,
      marginTop: 14,
      fontWeight: "800",
      textAlign: "center",
      lineHeight: 21,
    },
    errorTitle: {
      color: c.gold,
      fontSize: 25,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 12,
    },
    errorText: {
      color: c.text2,
      fontSize: 15,
      fontWeight: "700",
      textAlign: "center",
      lineHeight: 23,
      marginBottom: 22,
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      backgroundColor: c.gold,
      borderRadius: 16,
      paddingVertical: 15,
      paddingHorizontal: 25,
      minWidth: 190,
    },
    retryButtonText: {
      color: c.navy,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    errorBackButton: {
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginTop: 10,
    },
    errorBackText: {
      color: c.gold,
      fontWeight: "900",
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backTopButton: {
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
    backTopText: {
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
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.soft,
      borderRadius: 999,
      paddingVertical: 9,
      paddingHorizontal: 14,
      marginBottom: 18,
    },
    kickerText: {
      color: c.gold,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.3,
    },
    title: {
      color: c.text,
      fontSize: 38,
      fontWeight: "900",
      marginBottom: 10,
    },
    subtitle: {
      color: c.text2,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },

    heroCard: {
      minHeight: 132,
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
      color: c.navy,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 4,
    },
    heroPrice: {
      color: c.navy,
      fontSize: 42,
      fontWeight: "900",
      letterSpacing: -1,
    },
    heroText: {
      color: c.navy,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "800",
      opacity: 0.82,
    },

    summaryGrid: {
      flexDirection: "row",
      gap: 9,
      marginBottom: 18,
    },
    miniStat: {
      flex: 1,
      minHeight: 88,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.borderSoft,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      padding: 8,
      gap: 5,
      ...v5Shadow(c),
    },
    miniTitle: {
      color: c.text2,
      fontSize: 11,
      fontWeight: "800",
      textAlign: "center",
    },
    miniValue: {
      color: c.text,
      fontSize: 13,
      fontWeight: "900",
      textAlign: "center",
    },

    card: {
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSoft,
      padding: 20,
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
      fontSize: 22,
      fontWeight: "900",
      flex: 1,
    },

    infoRow: {
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
      paddingBottom: 11,
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
      lineHeight: 23,
      fontWeight: "700",
    },

    sharedBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(34,197,94,0.10)",
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.35)",
      borderRadius: 15,
      padding: 13,
      marginTop: 4,
      marginBottom: 10,
    },
    sharedText: {
      color: "#22c55e",
      fontSize: 13,
      fontWeight: "900",
      flex: 1,
      lineHeight: 19,
    },
    gpsBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(34,197,94,0.10)",
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.35)",
      borderRadius: 15,
      padding: 13,
      marginTop: 6,
    },
    gpsText: {
      color: "#22c55e",
      fontSize: 13,
      fontWeight: "900",
      flex: 1,
      lineHeight: 19,
    },

    breakdownRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 13,
    },
    breakdownLabel: {
      color: c.text2,
      fontSize: 15,
      flex: 1,
      fontWeight: "700",
    },
    breakdownValue: {
      color: c.text,
      fontSize: 15,
      fontWeight: "900",
      textAlign: "right",
      flex: 1,
    },
    divider: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: 10,
    },

    discountRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 13,
    },
    discountLeft: {
      flex: 1,
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    discountLabel: {
      color: "#22c55e",
      fontSize: 15,
      fontWeight: "900",
      flex: 1,
    },
    discountValue: {
      color: "#22c55e",
      fontSize: 15,
      fontWeight: "900",
      textAlign: "right",
    },

    totalRow: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 16,
      marginTop: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    totalLabel: {
      color: c.gold,
      fontSize: 22,
      fontWeight: "900",
    },
    totalValue: {
      color: c.gold,
      fontSize: 25,
      fontWeight: "900",
    },
    notice: {
      color: c.text2,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: "700",
      marginTop: 8,
    },

    actionButton: {
      backgroundColor: c.gold,
      borderRadius: 16,
      paddingVertical: 17,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      ...v5Shadow(c),
    },
    actionButtonDisabled: {
      opacity: 0.65,
    },
    actionLoadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    actionButtonText: {
      color: c.navy,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "uppercase",
      textAlign: "center",
    },
    refreshButton: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
      backgroundColor: c.soft,
      flexDirection: "row",
      gap: 9,
    },
    refreshButtonText: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    backButton: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
      backgroundColor: c.card,
    },
    backButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textTransform: "uppercase",
    },
  });
}
