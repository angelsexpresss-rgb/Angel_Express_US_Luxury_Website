import {
  router,
  useFocusEffect,
} from "expo-router";

import type { ReactNode } from "react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  CalendarClock,
  CarFront,
  ChevronRight,
  Clock3,
  GraduationCap,
  MapPin,
  RefreshCw,
  Route,
  ShieldCheck,
  UserRoundCheck,
  WalletCards,
} from "lucide-react-native";

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

const OWNER_ASSIGNED_STATUS =
  "driver_assigned";

const APPROVED_DRIVER_STATUSES = [
  "approved",
  "online",
  "offline",
  "on_trip",
];

const OPEN_TRIP_EXPIRY_MINUTES = 45;

type TripRecord = Record<string, any>;

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function firstValue(
  ...values: unknown[]
) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );
}

function titleCase(value: unknown) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function parseBookingId(
  value: unknown
) {
  const bookingId =
    Number(value);

  if (
    !Number.isSafeInteger(
      bookingId
    ) ||
    bookingId <= 0
  ) {
    return null;
  }

  return bookingId;
}

function dedupeTrips(
  items: TripRecord[]
) {
  const seen =
    new Set<string>();

  return items.filter((trip) => {
    const key =
      String(trip.id || "");

    if (
      !key ||
      seen.has(key)
    ) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

function unwrapRpcBooking(
  value: unknown
): TripRecord | null {
  if (Array.isArray(value)) {
    const first =
      value[0];

    if (
      first &&
      typeof first === "object"
    ) {
      return first as TripRecord;
    }

    return null;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return value as TripRecord;
  }

  return null;
}

function parseScheduledPickup(
  trip: TripRecord
) {
  const directValue =
    firstValue(
      trip.scheduled_pickup_at,
      trip.pickup_datetime,
      trip.scheduled_at,
      trip.trip_start_at
    );

  if (directValue) {
    const parsed =
      new Date(
        String(directValue)
      );

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return parsed;
    }
  }

  const datePart =
    firstValue(
      trip.ride_date,
      trip.date,
      trip.pickup_date,
      trip.travel_date
    );

  const timePart =
    firstValue(
      trip.ride_time,
      trip.time,
      trip.pickup_time,
      trip.travel_time
    );

  if (!datePart) {
    return null;
  }

  const combined =
    timePart
      ? `${String(
          datePart
        )} ${String(
          timePart
        )}`
      : String(datePart);

  const parsed =
    new Date(combined);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
}

function isPastOpenWindow(
  trip: TripRecord
) {
  const pickupTime =
    parseScheduledPickup(
      trip
    );

  if (!pickupTime) {
    return false;
  }

  const expiryTime =
    pickupTime.getTime() +
    OPEN_TRIP_EXPIRY_MINUTES *
      60 *
      1000;

  return Date.now() >
    expiryTime;
}

export default function FindTripsScreen() {
  const {
    colors,
    themeMode,
    toggleTheme,
  } = useDriverTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const mountedRef =
    useRef(true);

  const fadeAnim =
    useRef(
      new Animated.Value(0)
    ).current;

  const slideAnim =
    useRef(
      new Animated.Value(18)
    ).current;

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    acceptingId,
    setAcceptingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    decliningId,
    setDecliningId,
  ] =
    useState<string | null>(
      null
    );

  const [
    driverId,
    setDriverId,
  ] =
    useState<string | null>(
      null
    );

  const [
    driverOnline,
    setDriverOnline,
  ] = useState(false);

  const [trips, setTrips] =
    useState<TripRecord[]>([]);

  const isOwnerAssignment =
    useCallback(
      (
        trip: TripRecord,
        currentDriverId?: string | null
      ) => {
        const effectiveDriverId =
          currentDriverId ??
          driverId;

        return (
          normalize(
            trip.status
          ) ===
            OWNER_ASSIGNED_STATUS &&
          Boolean(
            effectiveDriverId
          ) &&
          String(
            trip.assigned_driver_id ||
              ""
          ) ===
            String(
              effectiveDriverId
            ) &&
          !trip.driver_id
        );
      },
      [driverId]
    );

  const isStudentPoolTrip =
    useCallback(
      (trip: TripRecord) => {
        return (
          normalize(
            trip.ride_category
          ) ===
            "student_pool" ||
          normalize(
            trip.ride_category_label
          ) ===
            "student_pool" ||
          trip.student_pool_requested ===
            true ||
          Boolean(trip.pool_id)
        );
      },
      []
    );

  const isVisibleTrip =
    useCallback(
      (
        trip: TripRecord,
        currentDriverId: string
      ) => {
        const status =
          normalize(
            trip.status
          );

        const acceptedDriverId =
          trip.driver_id;

        const assignedDriverId =
          trip.assigned_driver_id;

        if (acceptedDriverId) {
          return false;
        }

        const ownerAssigned =
          isOwnerAssignment(
            trip,
            currentDriverId
          );

        /*
         * An owner-assigned ride is visible to the
         * selected chauffeur even if the public
         * 45-minute acceptance window has expired.
         */
        if (ownerAssigned) {
          return true;
        }

        /*
         * Never show a trip reserved for a different
         * chauffeur.
         */
        if (
          assignedDriverId &&
          String(
            assignedDriverId
          ) !==
            String(
              currentDriverId
            )
        ) {
          return false;
        }

        /*
         * Public dispatch trips disappear 45 minutes
         * after the scheduled pickup time.
         */
        if (
          isPastOpenWindow(
            trip
          )
        ) {
          return false;
        }

        /*
         * Student pool trips remain hidden until
         * matching is complete.
         */
        if (
          status ===
            "smart_queue" &&
          trip.pool_ready !== true
        ) {
          return false;
        }

        return OPEN_DISPATCH_STATUSES.includes(
          status
        );
      },
      [isOwnerAssignment]
    );

  const loadAvailableTrips =
    useCallback(
      async (
        isRefresh = false
      ) => {
        try {
          if (isRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          const {
            data: { user },
            error: userError,
          } =
            await supabase.auth
              .getUser();

          if (userError) {
            throw userError;
          }

          if (!user) {
            router.replace(
              "/driver-login"
            );

            return;
          }

          const {
            data: driver,
            error: driverError,
          } = await supabase
            .from("drivers")
            .select(
              "id, status, is_online"
            )
            .eq("id", user.id)
            .maybeSingle();

          if (driverError) {
            throw driverError;
          }

          if (!driver) {
            Alert.alert(
              "Driver Profile Missing",
              "Your chauffeur profile could not be found. Please sign in again."
            );

            router.replace(
              "/driver-login"
            );

            return;
          }

          const driverStatus =
            normalize(
              driver.status
            );

          if (
            !APPROVED_DRIVER_STATUSES.includes(
              driverStatus
            )
          ) {
            router.replace(
              "/driver-pending"
            );

            return;
          }

          if (
            !mountedRef.current
          ) {
            return;
          }

          setDriverId(user.id);

          setDriverOnline(
            Boolean(
              driver.is_online
            )
          );

          const statusValues = [
            ...OPEN_DISPATCH_STATUSES,

            ...OPEN_DISPATCH_STATUSES.map(
              (status) =>
                titleCase(status)
            ),

            OWNER_ASSIGNED_STATUS,
            "Driver Assigned",
            "Driver_Assigned",
          ];

          const {
            data,
            error,
          } = await supabase
            .from("bookings")
            .select("*")
            .in(
              "status",
              statusValues
            )
            .order(
              "dispatch_priority",
              {
                ascending: false,
              }
            )
            .order(
              "scheduled_pickup_at",
              {
                ascending: true,
                nullsFirst: false,
              }
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            );

          if (error) {
            throw error;
          }

          const visibleTrips =
            (data || []).filter(
              (trip) =>
                isVisibleTrip(
                  trip,
                  user.id
                )
            );

          if (
            mountedRef.current
          ) {
            setTrips(
              dedupeTrips(
                visibleTrips
              )
            );
          }
        } catch (error: any) {
          if (
            mountedRef.current
          ) {
            Alert.alert(
              "Trips Error",
              error?.message ||
                "Unable to load available trips."
            );
          }
        } finally {
          if (
            mountedRef.current
          ) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      },
      [isVisibleTrip]
    );

  useEffect(() => {
    mountedRef.current =
      true;

    const animation =
      Animated.parallel([
        Animated.timing(
          fadeAnim,
          {
            toValue: 1,
            duration: 550,
            useNativeDriver: true,
          }
        ),

        Animated.timing(
          slideAnim,
          {
            toValue: 0,
            duration: 550,
            useNativeDriver: true,
          }
        ),
      ]);

    animation.start();

    const channel = supabase
      .channel(
        `driver-find-trips-${Date.now()}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          void loadAvailableTrips(
            false
          );
        }
      )
      .subscribe();

    return () => {
      mountedRef.current =
        false;

      animation.stop();

      void supabase.removeChannel(
        channel
      );
    };
  }, [
    fadeAnim,
    loadAvailableTrips,
    slideAnim,
  ]);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current =
        true;

      void loadAvailableTrips(
        false
      );

      return () => {
        mountedRef.current =
          false;
      };
    }, [loadAvailableTrips])
  );

  function getDispatchLabel(
    trip: TripRecord
  ) {
    const status =
      normalize(
        trip.status
      );

    if (
      isOwnerAssignment(
        trip
      )
    ) {
      return "Reserved for You";
    }

    if (
      status ===
      "unassigned"
    ) {
      return "Rescue Trip";
    }

    if (
      status ===
        "smart_queue_ready" ||
      status ===
        "pool_matched"
    ) {
      return "Student Pool Ready";
    }

    if (
      Number(
        trip.dispatch_priority ||
          0
      ) > 0
    ) {
      return "Priority Dispatch";
    }

    return "Open Dispatch";
  }

  function getDispatchMessage(
    trip: TripRecord
  ) {
    if (
      isOwnerAssignment(
        trip
      )
    ) {
      return "Angel Express Operations assigned this ride directly to you. Review the trip and respond promptly.";
    }

    if (
      normalize(
        trip.status
      ) ===
      "unassigned"
    ) {
      return "This trip is available for rescue dispatch inside its active pickup window.";
    }

    if (
      isStudentPoolTrip(
        trip
      )
    ) {
      return "This student pool is ready for dispatch. Accepting assigns the eligible pool to you.";
    }

    return "This booking is available to eligible online Angel Express chauffeurs.";
  }

  function getTripTitle(
    trip: TripRecord
  ) {
    return (
      trip.route ||
      `${getPickupValue(
        trip
      )} → ${getDropoffValue(
        trip
      )}`
    );
  }

  function getSourceLabel(
    trip: TripRecord
  ) {
    const source =
      normalize(
        firstValue(
          trip.source_platform,
          trip.source,
          trip.source_app,
          "app"
        )
      );

    if (
      source ===
        "website" ||
      source === "web"
    ) {
      return "Website Booking";
    }

    return "App Booking";
  }

  function formatScheduledPickup(
    trip: TripRecord
  ) {
    const pickupTime =
      parseScheduledPickup(
        trip
      );

    if (!pickupTime) {
      return "Pickup time not set";
    }

    return `${pickupTime.toLocaleDateString()} at ${pickupTime.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    )}`;
  }

  function getPickupWindowText(
    trip: TripRecord
  ) {
    const pickupTime =
      parseScheduledPickup(
        trip
      );

    if (!pickupTime) {
      return "Availability window unavailable";
    }

    const expiryTime =
      new Date(
        pickupTime.getTime() +
          OPEN_TRIP_EXPIRY_MINUTES *
            60 *
            1000
      );

    return `Available until ${expiryTime.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    )}`;
  }

  function formatDeadline(
    trip: TripRecord
  ) {
    if (
      !trip.driver_response_deadline
    ) {
      return "Respond promptly";
    }

    const deadline =
      new Date(
        trip.driver_response_deadline
      );

    if (
      Number.isNaN(
        deadline.getTime()
      )
    ) {
      return "Response deadline unavailable";
    }

    return deadline.toLocaleString(
      [],
      {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  async function verifyAcceptedBooking(
    bookingId: number,
    currentDriverId: string
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    const acceptedDriverId =
      firstValue(
        data.driver_id,
        data.assigned_driver_id
      );

    if (
      String(
        acceptedDriverId ||
          ""
      ) !==
      String(
        currentDriverId
      )
    ) {
      return null;
    }

    return data as TripRecord;
  }

  async function acceptTrip(
    trip: TripRecord
  ) {
    try {
      if (!driverId) {
        router.replace(
          "/driver-login"
        );

        return;
      }

      const bookingId =
        parseBookingId(
          trip.id
        );

      if (!bookingId) {
        throw new Error(
          "This booking has an invalid numeric ID."
        );
      }

      setAcceptingId(
        String(trip.id)
      );

      const {
        data: currentDriver,
        error: driverError,
      } = await supabase
        .from("drivers")
        .select(
          "id, status, is_online"
        )
        .eq("id", driverId)
        .maybeSingle();

      if (driverError) {
        throw driverError;
      }

      if (!currentDriver) {
        throw new Error(
          "Your chauffeur profile could not be found."
        );
      }

      const currentStatus =
        normalize(
          currentDriver.status
        );

      if (
        !APPROVED_DRIVER_STATUSES.includes(
          currentStatus
        )
      ) {
        router.replace(
          "/driver-pending"
        );

        return;
      }

      if (
        !currentDriver.is_online
      ) {
        Alert.alert(
          "You Are Offline",
          "Go online from the Driver Dashboard before accepting a trip."
        );

        return;
      }

      const ownerAssigned =
        isOwnerAssignment(
          trip
        );

      if (
        !ownerAssigned &&
        isPastOpenWindow(
          trip
        )
      ) {
        if (
          mountedRef.current
        ) {
          setTrips(
            (current) =>
              current.filter(
                (item) =>
                  String(
                    item.id
                  ) !==
                  String(
                    trip.id
                  )
              )
          );
        }

        Alert.alert(
          "Trip Window Expired",
          "This trip is more than 45 minutes past its scheduled pickup time. Angel Express Operations must reassign it before it can be accepted."
        );

        return;
      }

      let rpcResponse:
        | unknown
        | null = null;

      if (ownerAssigned) {
        const {
          data,
          error,
        } = await supabase.rpc(
          "ae_driver_respond_to_assignment",
          {
            p_booking_id:
              bookingId,
            p_accept: true,
            p_reason: null,
          }
        );

        if (error) {
          throw error;
        }

        rpcResponse = data;
      } else {
        const {
          data,
          error,
        } = await supabase.rpc(
          "ae_driver_accept_open_trip",
          {
            p_booking_id:
              bookingId,
          }
        );

        if (error) {
          throw error;
        }

        rpcResponse = data;
      }

      let acceptedBooking =
        unwrapRpcBooking(
          rpcResponse
        );

      if (!acceptedBooking) {
        acceptedBooking =
          await verifyAcceptedBooking(
            bookingId,
            driverId
          );
      }

      /*
       * This explicit check resolves every
       * “acceptedBooking is possibly null” warning.
       */
      if (!acceptedBooking) {
        throw new Error(
          "This ride is no longer available or another chauffeur accepted it."
        );
      }

      const finalBooking:
        TripRecord =
        acceptedBooking;

      const finalDriverId =
        firstValue(
          finalBooking.driver_id,
          finalBooking.assigned_driver_id
        );

      if (
        String(
          finalDriverId ||
            ""
        ) !==
        String(driverId)
      ) {
        throw new Error(
          "This ride was assigned to another chauffeur."
        );
      }

      if (
        mountedRef.current
      ) {
        setTrips(
          (currentTrips) =>
            currentTrips.filter(
              (item) =>
                String(
                  item.id
                ) !==
                String(
                  trip.id
                )
            )
        );
      }

      router.replace({
        pathname:
          "/active-trip" as any,

        params: {
          booking_id:
            String(
              finalBooking.id ||
                bookingId
            ),

          invoice_no:
            String(
              finalBooking.invoice_no ||
                finalBooking.invoice_number ||
                trip.invoice_no ||
                trip.invoice_number ||
                ""
            ),
        },
      });
    } catch (error: any) {
      Alert.alert(
        "Accept Failed",
        error?.message ||
          "Unable to accept this trip."
      );

      await loadAvailableTrips(
        false
      );
    } finally {
      if (
        mountedRef.current
      ) {
        setAcceptingId(
          null
        );
      }
    }
  }

  async function declineAssignedTrip(
    trip: TripRecord
  ) {
    try {
      if (
        !driverId ||
        !isOwnerAssignment(
          trip
        )
      ) {
        return;
      }

      const bookingId =
        parseBookingId(
          trip.id
        );

      if (!bookingId) {
        throw new Error(
          "This booking has an invalid numeric ID."
        );
      }

      setDecliningId(
        String(trip.id)
      );

      const {
        error,
      } = await supabase.rpc(
        "ae_driver_respond_to_assignment",
        {
          p_booking_id:
            bookingId,

          p_accept: false,

          p_reason:
            "Driver declined from Find Trips.",
        }
      );

      if (error) {
        throw error;
      }

      if (
        mountedRef.current
      ) {
        setTrips(
          (currentTrips) =>
            currentTrips.filter(
              (item) =>
                String(
                  item.id
                ) !==
                String(
                  trip.id
                )
            )
        );
      }

      Alert.alert(
        "Assignment Declined",
        "Angel Express Operations has been notified that you declined this assignment."
      );
    } catch (error: any) {
      Alert.alert(
        "Decline Failed",
        error?.message ||
          "Unable to decline this assignment."
      );

      await loadAvailableTrips(
        false
      );
    } finally {
      if (
        mountedRef.current
      ) {
        setDecliningId(
          null
        );
      }
    }
  }

  function confirmAcceptTrip(
    trip: TripRecord
  ) {
    if (!driverOnline) {
      Alert.alert(
        "Go Online First",
        "You must be online before accepting an Angel Express trip.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Dashboard",
            onPress: () =>
              router.replace(
                "/driver-dashboard"
              ),
          },
        ]
      );

      return;
    }

    const ownerAssigned =
      isOwnerAssignment(
        trip
      );

    Alert.alert(
      ownerAssigned
        ? "Accept Assigned Ride?"
        : "Accept This Ride?",
      isStudentPoolTrip(
        trip
      )
        ? "Accepting assigns this ready student pool to you and moves it to Active Trip."
        : "Confirm that you are available and prepared to complete this ride.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: ownerAssigned
            ? "Accept Assignment"
            : "Accept Ride",
          onPress: () => {
            void acceptTrip(
              trip
            );
          },
        },
      ]
    );
  }

  function confirmDeclineTrip(
    trip: TripRecord
  ) {
    Alert.alert(
      "Decline Assignment?",
      "Angel Express Operations will be notified and may assign this trip to another chauffeur.",
      [
        {
          text: "Keep Assignment",
          style: "cancel",
        },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => {
            void declineAssignedTrip(
              trip
            );
          },
        },
      ]
    );
  }

  return (
    <ImageBackground
      source={require(
        "../assets/images/driver-bg.png"
      )}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={
            styles.container
          }
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={() => {
                void loadAvailableTrips(
                  true
                );
              }}
              tintColor={
                colors.gold
              }
              colors={[
                colors.gold,
              ]}
            />
          }
        >
          <Animated.View
            style={{
              opacity:
                fadeAnim,

              transform: [
                {
                  translateY:
                    slideAnim,
                },
              ],
            }}
          >
            <View
              style={
                styles.topRow
              }
            >
              <TouchableOpacity
                style={
                  styles.backPill
                }
                onPress={() =>
                  router.replace(
                    "/driver-dashboard"
                  )
                }
                activeOpacity={0.85}
              >
                <Text
                  style={
                    styles.backPillText
                  }
                >
                  ‹ Dashboard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.themePill
                }
                onPress={() => {
                  void toggleTheme();
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={
                    styles.themeText
                  }
                >
                  {themeMode ===
                  "dark"
                    ? "☀️ Light"
                    : "🌙 Dark"}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={
                styles.headingRow
              }
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={
                    styles.kicker
                  }
                >
                  TRIP MARKETPLACE
                </Text>

                <Text
                  style={
                    styles.title
                  }
                >
                  Find Trips
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.refreshButton
                }
                onPress={() => {
                  void loadAvailableTrips(
                    true
                  );
                }}
                disabled={
                  refreshing ||
                  loading
                }
              >
                <RefreshCw
                  size={21}
                  color={
                    colors.gold
                  }
                />
              </TouchableOpacity>
            </View>

            <Text
              style={
                styles.subtitle
              }
            >
              Review eligible open rides,
              student pools, rescue requests,
              and assignments from Angel
              Express Operations.
            </Text>

            <View
              style={
                styles.statusStrip
              }
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      driverOnline
                        ? "#22C55E"
                        : colors.muted2,
                  },
                ]}
              />

              <Text
                style={
                  styles.statusText
                }
              >
                {driverOnline
                  ? "You are online and eligible to accept trips."
                  : "You are offline. Return to the dashboard to go online."}
              </Text>
            </View>

            {loading ? (
              <View
                style={
                  styles.loadingBox
                }
              >
                <ActivityIndicator
                  color={
                    colors.gold
                  }
                  size="large"
                />

                <Text
                  style={
                    styles.loadingTitle
                  }
                >
                  Searching for Trips
                </Text>

                <Text
                  style={
                    styles.loadingText
                  }
                >
                  Checking the live Angel
                  Express dispatch queue.
                </Text>
              </View>
            ) : trips.length === 0 ? (
              <View
                style={
                  styles.emptyCard
                }
              >
                <View
                  style={
                    styles.emptyIcon
                  }
                >
                  <CarFront
                    size={36}
                    color={
                      colors.gold
                    }
                  />
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  No Available Trips
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  There are no eligible trips
                  inside the active pickup
                  window. New and reassigned
                  rides will appear here
                  automatically.
                </Text>

                <TouchableOpacity
                  style={
                    styles.emptyRefreshButton
                  }
                  onPress={() => {
                    void loadAvailableTrips(
                      true
                    );
                  }}
                >
                  <RefreshCw
                    size={18}
                    color={
                      colors.navy
                    }
                  />

                  <Text
                    style={
                      styles.emptyRefreshText
                    }
                  >
                    Refresh Trips
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              trips.map((trip) => {
                const fare =
                  getTripTotal(
                    trip
                  );

                const payout =
                  getDriverPayoutAmount(
                    trip
                  );

                const ownerAssigned =
                  isOwnerAssignment(
                    trip
                  );

                const accepting =
                  acceptingId ===
                  String(trip.id);

                const declining =
                  decliningId ===
                  String(trip.id);

                return (
                  <View
                    key={String(
                      trip.id
                    )}
                    style={
                      styles.tripCard
                    }
                  >
                    <View
                      style={
                        styles.badgeRow
                      }
                    >
                      <View
                        style={
                          styles.sourceBadge
                        }
                      >
                        <Text
                          style={
                            styles.sourceBadgeText
                          }
                        >
                          {getSourceLabel(
                            trip
                          )}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.dispatchBadge,

                          normalize(
                            trip.status
                          ) ===
                            "unassigned" &&
                            styles.rescueBadge,

                          isStudentPoolTrip(
                            trip
                          ) &&
                            styles.poolBadge,

                          ownerAssigned &&
                            styles.assignedBadge,
                        ]}
                      >
                        <Text
                          style={
                            styles.dispatchBadgeText
                          }
                        >
                          {getDispatchLabel(
                            trip
                          )}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={
                        styles.tripTitle
                      }
                    >
                      {getTripTitle(
                        trip
                      )}
                    </Text>

                    <View
                      style={
                        styles.lifecycleBox
                      }
                    >
                      <ShieldCheck
                        size={18}
                        color={
                          colors.gold
                        }
                      />

                      <Text
                        style={
                          styles.lifecycleText
                        }
                      >
                        {getDispatchMessage(
                          trip
                        )}
                      </Text>
                    </View>

                    <TripDetail
                      icon={
                        <MapPin
                          size={19}
                          color={
                            colors.gold
                          }
                        />
                      }
                      label="Pickup"
                      value={getPickupValue(
                        trip
                      )}
                      styles={styles}
                    />

                    <TripDetail
                      icon={
                        <Route
                          size={19}
                          color={
                            colors.gold
                          }
                        />
                      }
                      label="Drop-off"
                      value={getDropoffValue(
                        trip
                      )}
                      styles={styles}
                    />

                    <TripDetail
                      icon={
                        <CalendarClock
                          size={19}
                          color={
                            colors.gold
                          }
                        />
                      }
                      label="Scheduled Pickup"
                      value={formatScheduledPickup(
                        trip
                      )}
                      styles={styles}
                    />

                    {ownerAssigned ? (
                      <TripDetail
                        icon={
                          <UserRoundCheck
                            size={19}
                            color={
                              colors.gold
                            }
                          />
                        }
                        label="Respond By"
                        value={formatDeadline(
                          trip
                        )}
                        styles={styles}
                      />
                    ) : (
                      <TripDetail
                        icon={
                          <Clock3
                            size={19}
                            color={
                              colors.gold
                            }
                          />
                        }
                        label="Availability"
                        value={getPickupWindowText(
                          trip
                        )}
                        styles={styles}
                      />
                    )}

                    <View
                      style={
                        styles.categoryGrid
                      }
                    >
                      <View
                        style={
                          styles.categoryCell
                        }
                      >
                        <Text
                          style={
                            styles.categoryLabel
                          }
                        >
                          Ride Category
                        </Text>

                        <Text
                          style={
                            styles.categoryValue
                          }
                        >
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

                      <View
                        style={
                          styles.categoryDivider
                        }
                      />

                      <View
                        style={
                          styles.categoryCell
                        }
                      >
                        <Text
                          style={
                            styles.categoryLabel
                          }
                        >
                          Trip Type
                        </Text>

                        <Text
                          style={
                            styles.categoryValue
                          }
                        >
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
                    </View>

                    {isStudentPoolTrip(
                      trip
                    ) ? (
                      <View
                        style={
                          styles.poolInfoBox
                        }
                      >
                        <GraduationCap
                          size={21}
                          color={
                            "#D8B4FE"
                          }
                        />

                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text
                            style={
                              styles.poolInfoTitle
                            }
                          >
                            Student Pool Dispatch
                          </Text>

                          <Text
                            style={
                              styles.poolInfoText
                            }
                          >
                            Pool size:{" "}
                            {Number(
                              trip.pool_size ||
                                1
                            )}{" "}
                            • Status:{" "}
                            {titleCase(
                              trip.pool_status ||
                                "Ready"
                            )}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    <View
                      style={
                        styles.moneyBox
                      }
                    >
                      <View
                        style={
                          styles.moneyColumn
                        }
                      >
                        <WalletCards
                          size={19}
                          color={
                            colors.text2
                          }
                        />

                        <Text
                          style={
                            styles.moneyLabel
                          }
                        >
                          Trip Total
                        </Text>

                        <Text
                          style={
                            styles.moneyValue
                          }
                        >
                          $
                          {fare.toFixed(
                            2
                          )}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.moneyDivider
                        }
                      />

                      <View
                        style={[
                          styles.moneyColumn,
                          styles.moneyColumnRight,
                        ]}
                      >
                        <Text
                          style={
                            styles.shareBadge
                          }
                        >
                          70%
                        </Text>

                        <Text
                          style={
                            styles.moneyLabel
                          }
                        >
                          Your Payout
                        </Text>

                        <Text
                          style={
                            styles.payoutValue
                          }
                        >
                          $
                          {payout.toFixed(
                            2
                          )}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.acceptButton,

                        (accepting ||
                          declining ||
                          !driverOnline) &&
                          styles.disabledButton,
                      ]}
                      onPress={() =>
                        confirmAcceptTrip(
                          trip
                        )
                      }
                      disabled={
                        accepting ||
                        declining
                      }
                      activeOpacity={0.86}
                    >
                      {accepting ? (
                        <ActivityIndicator
                          color={
                            colors.navy
                          }
                        />
                      ) : (
                        <>
                          <Text
                            style={
                              styles.acceptButtonText
                            }
                          >
                            {ownerAssigned
                              ? "Accept Assignment"
                              : "Accept Ride"}
                          </Text>

                          <ChevronRight
                            size={23}
                            color={
                              colors.navy
                            }
                          />
                        </>
                      )}
                    </TouchableOpacity>

                    {ownerAssigned ? (
                      <TouchableOpacity
                        style={[
                          styles.declineButton,

                          (accepting ||
                            declining) &&
                            styles.disabledButton,
                        ]}
                        onPress={() =>
                          confirmDeclineTrip(
                            trip
                          )
                        }
                        disabled={
                          accepting ||
                          declining
                        }
                        activeOpacity={0.85}
                      >
                        {declining ? (
                          <ActivityIndicator
                            color={
                              colors.gold
                            }
                          />
                        ) : (
                          <Text
                            style={
                              styles.declineButtonText
                            }
                          >
                            Decline Assignment
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

function TripDetail({
  icon,
  label,
  value,
  styles,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  styles: ReturnType<
    typeof createStyles
  >;
}) {
  return (
    <View
      style={
        styles.detailRow
      }
    >
      <View
        style={
          styles.detailIcon
        }
      >
        {icon}
      </View>

      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={
            styles.detailLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.detailValue
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function createStyles(
  colors: any
) {
  return StyleSheet.create({
    background: {
      flex: 1,
    },

    overlay: {
      flex: 1,
      backgroundColor:
        colors.overlay,
    },

    container: {
      flexGrow: 1,
      paddingHorizontal: 22,
      paddingTop: 62,
      paddingBottom: 48,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 24,
    },

    backPill: {
      minHeight: 44,
      justifyContent: "center",
      borderWidth: 1,
      borderColor:
        colors.border,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor:
        colors.card,
    },

    backPillText: {
      color: colors.gold,
      fontWeight: "900",
      fontSize: 14,
    },

    themePill: {
      minHeight: 44,
      justifyContent: "center",
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },

    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    headingRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
    },

    kicker: {
      color: colors.gold,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.5,
      marginBottom: 6,
    },

    title: {
      color: colors.text,
      fontSize: 38,
      lineHeight: 44,
      fontWeight: "900",
      letterSpacing: -1,
    },

    refreshButton: {
      width: 46,
      height: 46,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.border,
    },

    subtitle: {
      color: colors.text2,
      fontSize: 15,
      lineHeight: 23,
      marginBottom: 16,
      fontWeight: "700",
    },

    statusStrip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 16,
      padding: 13,
      marginBottom: 20,
    },

    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 10,
    },

    statusText: {
      flex: 1,
      color: colors.text2,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "800",
    },

    loadingBox: {
      backgroundColor:
        colors.card,
      borderRadius: 24,
      padding: 28,
      alignItems: "center",
      borderWidth: 1,
      borderColor:
        colors.border,
      ...v5Shadow(colors),
    },

    loadingTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: "900",
      marginTop: 15,
      marginBottom: 6,
    },

    loadingText: {
      color: colors.text2,
      textAlign: "center",
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
    },

    emptyCard: {
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 26,
      padding: 24,
      alignItems: "center",
      ...v5Shadow(colors),
    },

    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(212,175,55,0.10)"
          : "#FFF8E8",
      borderWidth: 1,
      borderColor:
        colors.border,
      marginBottom: 16,
    },

    emptyTitle: {
      color: colors.text,
      fontSize: 21,
      fontWeight: "900",
      marginBottom: 8,
      textAlign: "center",
    },

    emptyText: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 18,
    },

    emptyRefreshButton: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        colors.gold,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignSelf: "stretch",
    },

    emptyRefreshText: {
      color: colors.navy,
      fontSize: 14,
      fontWeight: "900",
      textTransform: "uppercase",
      marginLeft: 8,
    },

    tripCard: {
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 28,
      padding: 18,
      marginBottom: 20,
      ...v5Shadow(colors),
    },

    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 13,
    },

    sourceBadge: {
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(212,175,55,0.13)"
          : "#FFF8E8",
      borderWidth: 1,
      borderColor:
        colors.border,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 999,
    },

    sourceBadgeText: {
      color: colors.gold,
      fontSize: 10.5,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },

    dispatchBadge: {
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(59,130,246,0.14)"
          : "rgba(59,130,246,0.09)",
      borderWidth: 1,
      borderColor:
        "rgba(59,130,246,0.42)",
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 999,
    },

    dispatchBadgeText: {
      color:
        colors.mode === "dark"
          ? "#93C5FD"
          : "#2563EB",
      fontSize: 10.5,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },

    rescueBadge: {
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(249,115,22,0.14)"
          : "rgba(249,115,22,0.09)",
      borderColor:
        "rgba(249,115,22,0.48)",
    },

    poolBadge: {
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(168,85,247,0.14)"
          : "rgba(168,85,247,0.09)",
      borderColor:
        "rgba(168,85,247,0.48)",
    },

    assignedBadge: {
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(34,197,94,0.14)"
          : "rgba(34,197,94,0.09)",
      borderColor:
        "rgba(34,197,94,0.45)",
    },

    tripTitle: {
      color: colors.gold,
      fontSize: 21,
      lineHeight: 28,
      fontWeight: "900",
      marginBottom: 14,
    },

    lifecycleBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor:
        colors.card2,
      borderWidth: 1,
      borderColor:
        colors.borderSoft ||
        colors.border,
      borderRadius: 16,
      padding: 13,
      marginBottom: 17,
    },

    lifecycleText: {
      flex: 1,
      color: colors.text2,
      fontSize: 13.5,
      fontWeight: "800",
      lineHeight: 20,
      marginLeft: 9,
    },

    detailRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor:
        colors.borderSoft ||
        colors.border,
    },

    detailIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(212,175,55,0.08)"
          : "#FFF8E8",
      borderWidth: 1,
      borderColor:
        colors.border,
      marginRight: 11,
    },

    detailLabel: {
      color:
        colors.muted2 ||
        colors.text2,
      fontSize: 10.5,
      fontWeight: "900",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 4,
    },

    detailValue: {
      color: colors.text,
      fontSize: 14.5,
      lineHeight: 21,
      fontWeight: "800",
    },

    categoryGrid: {
      flexDirection: "row",
      backgroundColor:
        colors.card2,
      borderWidth: 1,
      borderColor:
        colors.borderSoft ||
        colors.border,
      borderRadius: 16,
      padding: 14,
      marginTop: 15,
      marginBottom: 14,
    },

    categoryCell: {
      flex: 1,
    },

    categoryDivider: {
      width: 1,
      backgroundColor:
        colors.border,
      marginHorizontal: 13,
    },

    categoryLabel: {
      color: colors.text2,
      fontSize: 10.5,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 5,
    },

    categoryValue: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "900",
    },

    poolInfoBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        "rgba(168,85,247,0.12)",
      borderWidth: 1,
      borderColor:
        "rgba(168,85,247,0.38)",
      borderRadius: 16,
      padding: 13,
      marginBottom: 14,
    },

    poolInfoTitle: {
      color:
        colors.mode === "dark"
          ? "#D8B4FE"
          : "#7E22CE",
      fontWeight: "900",
      marginBottom: 4,
      marginLeft: 10,
    },

    poolInfoText: {
      color: colors.text2,
      fontSize: 13,
      fontWeight: "700",
      marginLeft: 10,
    },

    moneyBox: {
      backgroundColor:
        colors.card2,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "stretch",
      borderWidth: 1,
      borderColor:
        colors.borderSoft ||
        colors.border,
    },

    moneyColumn: {
      flex: 1,
    },

    moneyColumnRight: {
      alignItems: "flex-end",
    },

    moneyDivider: {
      width: 1,
      backgroundColor:
        colors.border,
      marginHorizontal: 14,
    },

    moneyLabel: {
      color: colors.text2,
      fontSize: 12.5,
      marginTop: 6,
      marginBottom: 5,
      fontWeight: "800",
    },

    moneyValue: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "900",
    },

    payoutValue: {
      color: colors.gold,
      fontSize: 22,
      fontWeight: "900",
    },

    shareBadge: {
      color: colors.gold,
      fontSize: 11,
      fontWeight: "900",
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(212,175,55,0.10)"
          : "#FFF8E8",
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      overflow: "hidden",
    },

    acceptButton: {
      minHeight: 60,
      backgroundColor:
        colors.gold,
      paddingHorizontal: 18,
      borderRadius: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },

    declineButton: {
      minHeight: 54,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.card,
      paddingHorizontal: 18,
      borderRadius: 17,
      marginTop: 10,
      alignItems: "center",
      justifyContent: "center",
    },

    disabledButton: {
      opacity: 0.5,
    },

    acceptButtonText: {
      color: colors.navy,
      fontSize: 15,
      fontWeight: "900",
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginRight: 5,
    },

    declineButtonText: {
      color: colors.gold,
      fontSize: 13.5,
      fontWeight: "900",
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
  });
}