import { router } from "expo-router";
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
  AlertTriangle,
  Car,
  CheckCircle2,
  Clock3,
  CreditCard,
  Headphones,
  RefreshCw,
  ShieldAlert,
  UserRound,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import {
  useDriverTheme,
  v5Shadow,
} from "../lib/driverTheme";

type DriverStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "offline"
  | "online"
  | "on_trip"
  | string
  | null
  | undefined;

type DriverProfile = {
  id: string;
  status: DriverStatus;

  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;

  driver_license?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | number | null;
  plate_number?: string | null;
  years_driving?: string | number | null;
  preferred_routes?: string | null;

  stripe_onboarding_complete?: boolean | null;
  payout_status?: string | null;

  created_at?: string | null;
};

type ScreenState =
  | "loading"
  | "ready"
  | "missing"
  | "error";

function normalizeStatus(status: DriverStatus) {
  return String(status || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatStatus(status: DriverStatus) {
  const normalized = normalizeStatus(status);

  if (normalized === "on_trip") {
    return "On Trip";
  }

  return normalized
    .split("_")
    .map((word) => {
      return (
        word.charAt(0).toUpperCase() +
        word.slice(1)
      );
    })
    .join(" ");
}

function formatPayoutStatus(
  status?: string | null
) {
  const value = String(
    status || "not_started"
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  switch (value) {
    case "complete":
    case "completed":
    case "active":
      return "Active";

    case "pending":
    case "in_progress":
      return "In Progress";

    case "restricted":
      return "Restricted";

    case "not_started":
    default:
      return "Not Started";
  }
}

function maskLicense(
  value?: string | null
) {
  const license = String(value || "").trim();

  if (!license) {
    return "Not provided";
  }

  if (license.length <= 4) {
    return license;
  }

  return `••••${license.slice(-4)}`;
}

export default function DriverPendingScreen() {
  const {
    colors,
    themeMode,
    toggleTheme,
  } = useDriverTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const fadeAnim =
    useRef(new Animated.Value(0)).current;

  const slideAnim =
    useRef(new Animated.Value(24)).current;

  const hasShownApprovalAlert =
    useRef(false);

  const [driver, setDriver] =
    useState<DriverProfile | null>(null);

  const [screenState, setScreenState] =
    useState<ScreenState>("loading");

  const [checking, setChecking] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [fadeAnim, slideAnim]);

  const routeApprovedDriver = useCallback(
    (
      profile: DriverProfile | null,
      showAlert = false
    ) => {
      if (!profile) {
        return false;
      }

      const status = normalizeStatus(
        profile.status
      );

      const hasOperationalAccess =
        status === "approved" ||
        status === "offline" ||
        status === "online" ||
        status === "on_trip";

      if (!hasOperationalAccess) {
        return false;
      }

      if (
        showAlert &&
        !hasShownApprovalAlert.current
      ) {
        hasShownApprovalAlert.current = true;

        Alert.alert(
          "Chauffeur Approved",
          "Your chauffeur profile has been approved. Welcome to Angel Express.",
          [
            {
              text: "Open Dashboard",
              onPress: () => {
                router.replace(
                  "/driver-dashboard"
                );
              },
            },
          ],
          {
            cancelable: false,
          }
        );
      } else {
        router.replace(
          "/driver-dashboard"
        );
      }

      return true;
    },
    []
  );

  const loadDriverProfile = useCallback(
    async (
      options?: {
        manual?: boolean;
        showResult?: boolean;
      }
    ) => {
      const manual =
        options?.manual === true;

      const showResult =
        options?.showResult === true;

      try {
        if (manual) {
          setChecking(true);
        } else {
          setScreenState("loading");
        }

        setErrorMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          router.replace(
            "/driver-login"
          );

          return null;
        }

        const { data, error } =
          await supabase
            .from("drivers")
            .select(`
              id,
              status,
              full_name,
              first_name,
              last_name,
              email,
              phone,
              driver_license,
              vehicle_make,
              vehicle_model,
              vehicle_year,
              plate_number,
              years_driving,
              preferred_routes,
              stripe_onboarding_complete,
              payout_status,
              created_at
            `)
            .eq("id", user.id)
            .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          setDriver(null);
          setScreenState("missing");

          if (showResult) {
            Alert.alert(
              "Profile Not Found",
              "We could not find your chauffeur application. Please contact Angel Express support."
            );
          }

          return null;
        }

        const profile: DriverProfile = {
          id: String(data.id),
          status:
            data.status ?? "pending",

          full_name:
            data.full_name ?? null,

          first_name:
            data.first_name ?? null,

          last_name:
            data.last_name ?? null,

          email:
            data.email ?? null,

          phone:
            data.phone ?? null,

          driver_license:
            data.driver_license ?? null,

          vehicle_make:
            data.vehicle_make ?? null,

          vehicle_model:
            data.vehicle_model ?? null,

          vehicle_year:
            data.vehicle_year ?? null,

          plate_number:
            data.plate_number ?? null,

          years_driving:
            data.years_driving ?? null,

          preferred_routes:
            data.preferred_routes ?? null,

          stripe_onboarding_complete:
            data.stripe_onboarding_complete ??
            false,

          payout_status:
            data.payout_status ??
            "not_started",

          created_at:
            data.created_at ?? null,
        };

        setDriver(profile);
        setScreenState("ready");

        if (
          routeApprovedDriver(
            profile,
            showResult
          )
        ) {
          return profile;
        }

        if (showResult) {
          const status = normalizeStatus(
            profile.status
          );

          if (status === "pending") {
            Alert.alert(
              "Still Under Review",
              "Your chauffeur application is still pending review."
            );
          } else if (
            status === "rejected"
          ) {
            Alert.alert(
              "Application Update",
              "Your chauffeur application was not approved at this time. Please contact Angel Express Operations for more details."
            );
          } else if (
            status === "suspended"
          ) {
            Alert.alert(
              "Account Suspended",
              "Your chauffeur account is currently suspended. Please contact Angel Express Operations."
            );
          }
        }

        return profile;
      } catch (error: any) {
        const message =
          typeof error?.message ===
          "string"
            ? error.message
            : "Unable to load your chauffeur application.";

        setErrorMessage(message);
        setScreenState("error");

        if (showResult) {
          Alert.alert(
            "Unable to Check Status",
            message
          );
        }

        return null;
      } finally {
        setChecking(false);
        setRefreshing(false);
      }
    },
    [routeApprovedDriver]
  );

  useEffect(() => {
    let mounted = true;

    let channel:
      | ReturnType<
          typeof supabase.channel
        >
      | null = null;

    async function initialize() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        if (error) {
          throw error;
        }

        if (!user) {
          router.replace(
            "/driver-login"
          );
          return;
        }

        await loadDriverProfile();

        if (!mounted) {
          return;
        }

        channel = supabase
          .channel(
            `driver-approval-${user.id}`
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "drivers",
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              const realtimeRecord =
                payload.new as Record<
                  string,
                  unknown
                >;

              const updatedDriver: DriverProfile =
                {
                  id: String(
                    realtimeRecord.id ||
                      user.id
                  ),

                  status:
                    typeof realtimeRecord.status ===
                    "string"
                      ? realtimeRecord.status
                      : "pending",

                  full_name:
                    typeof realtimeRecord.full_name ===
                      "string"
                      ? realtimeRecord.full_name
                      : null,

                  first_name:
                    typeof realtimeRecord.first_name ===
                      "string"
                      ? realtimeRecord.first_name
                      : null,

                  last_name:
                    typeof realtimeRecord.last_name ===
                      "string"
                      ? realtimeRecord.last_name
                      : null,

                  email:
                    typeof realtimeRecord.email ===
                      "string"
                      ? realtimeRecord.email
                      : null,

                  phone:
                    typeof realtimeRecord.phone ===
                      "string"
                      ? realtimeRecord.phone
                      : null,

                  driver_license:
                    typeof realtimeRecord.driver_license ===
                      "string"
                      ? realtimeRecord.driver_license
                      : null,

                  vehicle_make:
                    typeof realtimeRecord.vehicle_make ===
                      "string"
                      ? realtimeRecord.vehicle_make
                      : null,

                  vehicle_model:
                    typeof realtimeRecord.vehicle_model ===
                      "string"
                      ? realtimeRecord.vehicle_model
                      : null,

                  vehicle_year:
                    typeof realtimeRecord.vehicle_year ===
                      "string" ||
                    typeof realtimeRecord.vehicle_year ===
                      "number"
                      ? realtimeRecord.vehicle_year
                      : null,

                  plate_number:
                    typeof realtimeRecord.plate_number ===
                      "string"
                      ? realtimeRecord.plate_number
                      : null,

                  years_driving:
                    typeof realtimeRecord.years_driving ===
                      "string" ||
                    typeof realtimeRecord.years_driving ===
                      "number"
                      ? realtimeRecord.years_driving
                      : null,

                  preferred_routes:
                    typeof realtimeRecord.preferred_routes ===
                      "string"
                      ? realtimeRecord.preferred_routes
                      : null,

                  stripe_onboarding_complete:
                    realtimeRecord.stripe_onboarding_complete ===
                    true,

                  payout_status:
                    typeof realtimeRecord.payout_status ===
                      "string"
                      ? realtimeRecord.payout_status
                      : "not_started",

                  created_at:
                    typeof realtimeRecord.created_at ===
                      "string"
                      ? realtimeRecord.created_at
                      : null,
                };

              setDriver((current) => ({
                ...(current || updatedDriver),
                ...updatedDriver,
              }));

              setScreenState("ready");

              routeApprovedDriver(
                updatedDriver,
                true
              );
            }
          )
          .subscribe((subscriptionStatus) => {
            if (
              subscriptionStatus ===
              "CHANNEL_ERROR"
            ) {
              console.warn(
                "Driver approval realtime channel failed."
              );
            }
          });
      } catch (error: any) {
        if (!mounted) {
          return;
        }

        const message =
          typeof error?.message ===
          "string"
            ? error.message
            : "Unable to initialize the application status screen.";

        setErrorMessage(message);
        setScreenState("error");
      }
    }

    void initialize();

    return () => {
      mounted = false;

      if (channel) {
        void supabase.removeChannel(
          channel
        );
      }
    };
  }, [
    loadDriverProfile,
    routeApprovedDriver,
  ]);

  async function checkApprovalStatus() {
    if (
      checking ||
      loggingOut
    ) {
      return;
    }

    await loadDriverProfile({
      manual: true,
      showResult: true,
    });
  }

  async function handleRefresh() {
    if (
      refreshing ||
      loggingOut
    ) {
      return;
    }

    setRefreshing(true);

    await loadDriverProfile();
  }

  function openSupport() {
    router.push("/support");
  }

  function handleLogout() {
    if (
      loggingOut ||
      checking
    ) {
      return;
    }

    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of the Angel Express Driver App?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              setLoggingOut(true);

              const { error } =
                await supabase.auth.signOut({
                  scope: "local",
                });

              if (error) {
                throw error;
              }

              router.replace("/");
            } catch (error: any) {
              Alert.alert(
                "Logout Failed",
                error?.message ||
                  "Unable to log out."
              );
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  }

  const status = normalizeStatus(
    driver?.status
  );

  const statusConfig =
    getStatusConfig(
      status,
      colors
    );

  const chauffeurName =
    driver?.full_name ||
    [
      driver?.first_name,
      driver?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Chauffeur Applicant";

  const vehicle =
    [
      driver?.vehicle_year,
      driver?.vehicle_make,
      driver?.vehicle_model,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Not provided";

  if (screenState === "loading") {
    return (
      <ImageBackground
        source={require(
          "../assets/images/driver-bg.png"
        )}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View
            style={
              styles.loadingScreen
            }
          >
            <ActivityIndicator
              size="large"
              color={colors.gold}
            />

            <Text
              style={
                styles.loadingTitle
              }
            >
              Checking Application
            </Text>

            <Text
              style={
                styles.loadingMessage
              }
            >
              Loading your chauffeur
              review status.
            </Text>
          </View>
        </View>
      </ImageBackground>
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
              refreshing={refreshing}
              onRefresh={() => {
                void handleRefresh();
              }}
              tintColor={colors.gold}
              colors={[colors.gold]}
            />
          }
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY:
                      slideAnim,
                  },
                ],
              },
            ]}
          >
            <View
              style={styles.topRow}
            >
              <View style={styles.topTextWrap}>
                <Text
                  style={
                    styles.appLabel
                  }
                >
                  ANGEL EXPRESS DRIVER APP
                </Text>

                <Text
                  style={
                    styles.greeting
                  }
                  numberOfLines={2}
                >
                  Hello, {chauffeurName}
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.themePill
                }
                onPress={() => {
                  void toggleTheme();
                }}
                disabled={loggingOut}
                activeOpacity={0.85}
              >
                <Text
                  style={
                    styles.themeText
                  }
                >
                  {themeMode === "dark"
                    ? "☀️ Light"
                    : "🌙 Dark"}
                </Text>
              </TouchableOpacity>
            </View>

            {screenState ===
            "missing" ? (
              <StateCard
                icon={
                  <AlertTriangle
                    size={48}
                    color={colors.gold}
                  />
                }
                title="Application Not Found"
                message="Your authenticated account does not currently have a chauffeur application attached to it."
                styles={styles}
              />
            ) : screenState ===
              "error" ? (
              <StateCard
                icon={
                  <AlertTriangle
                    size={48}
                    color={colors.gold}
                  />
                }
                title="Unable to Load Application"
                message={
                  errorMessage ||
                  "Angel Express could not load your chauffeur application."
                }
                styles={styles}
              />
            ) : (
              <>
                <View
                  style={
                    styles.heroCard
                  }
                >
                  <View
                    style={[
                      styles.statusIcon,
                      {
                        backgroundColor:
                          statusConfig.softColor,
                      },
                    ]}
                  >
                    {statusConfig.icon}
                  </View>

                  <Text
                    style={
                      styles.title
                    }
                  >
                    {statusConfig.title}
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        borderColor:
                          statusConfig.color,
                        backgroundColor:
                          statusConfig.softColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            statusConfig.color,
                        },
                      ]}
                    >
                      Status:{" "}
                      {formatStatus(
                        driver?.status
                      )}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.message
                    }
                  >
                    {statusConfig.message}
                  </Text>
                </View>

                {status === "pending" ? (
                  <View
                    style={
                      styles.infoBox
                    }
                  >
                    <Text
                      style={
                        styles.infoTitle
                      }
                    >
                      What happens next?
                    </Text>

                    <StepRow
                      number="1"
                      text="Angel Express reviews your chauffeur identity, vehicle, and submitted experience."
                      styles={styles}
                    />

                    <StepRow
                      number="2"
                      text="Owner Operations approves, requests additional information, or updates the application."
                      styles={styles}
                    />

                    <StepRow
                      number="3"
                      text="Once approved, the Driver Dashboard and ride assignments become available."
                      styles={styles}
                    />

                    <StepRow
                      number="4"
                      text="Stripe Connect onboarding will then be available for secure 70% chauffeur payouts."
                      styles={styles}
                    />
                  </View>
                ) : null}

                <View
                  style={
                    styles.sectionCard
                  }
                >
                  <View
                    style={
                      styles.sectionHeader
                    }
                  >
                    <UserRound
                      size={20}
                      color={colors.gold}
                    />

                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      Application Summary
                    </Text>
                  </View>

                  <DetailRow
                    label="Full Name"
                    value={chauffeurName}
                    styles={styles}
                  />

                  <DetailRow
                    label="Email"
                    value={
                      driver?.email ||
                      "Not provided"
                    }
                    styles={styles}
                  />

                  <DetailRow
                    label="Phone"
                    value={
                      driver?.phone ||
                      "Not provided"
                    }
                    styles={styles}
                  />

                  <DetailRow
                    label="Driver License"
                    value={maskLicense(
                      driver?.driver_license
                    )}
                    styles={styles}
                  />

                  <DetailRow
                    label="Driving Experience"
                    value={
                      driver?.years_driving
                        ? `${driver.years_driving} years`
                        : "Not provided"
                    }
                    styles={styles}
                    last
                  />
                </View>

                <View
                  style={
                    styles.sectionCard
                  }
                >
                  <View
                    style={
                      styles.sectionHeader
                    }
                  >
                    <Car
                      size={20}
                      color={colors.gold}
                    />

                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      Vehicle & Routes
                    </Text>
                  </View>

                  <DetailRow
                    label="Vehicle"
                    value={vehicle}
                    styles={styles}
                  />

                  <DetailRow
                    label="Plate Number"
                    value={
                      driver?.plate_number ||
                      "Not provided"
                    }
                    styles={styles}
                  />

                  <DetailRow
                    label="Preferred Routes"
                    value={
                      driver?.preferred_routes ||
                      "No routes provided"
                    }
                    styles={styles}
                    last
                  />
                </View>

                <View
                  style={
                    styles.stripeBox
                  }
                >
                  <View
                    style={
                      styles.sectionHeader
                    }
                  >
                    <CreditCard
                      size={20}
                      color={colors.gold}
                    />

                    <Text
                      style={
                        styles.stripeTitle
                      }
                    >
                      Stripe Payout Setup
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.stripeText
                    }
                  >
                    Angel Express uses
                    Stripe Connect for
                    secure chauffeur
                    payouts. Bank details
                    should only be entered
                    through the official
                    Stripe onboarding flow.
                  </Text>

                  <View
                    style={
                      styles.payoutStatusRow
                    }
                  >
                    <Text
                      style={
                        styles.payoutStatusLabel
                      }
                    >
                      Onboarding
                    </Text>

                    <Text
                      style={
                        styles.payoutStatusValue
                      }
                    >
                      {driver?.stripe_onboarding_complete
                        ? "Complete"
                        : "Not Complete"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.payoutStatusRow,
                      styles.payoutStatusRowLast,
                    ]}
                  >
                    <Text
                      style={
                        styles.payoutStatusLabel
                      }
                    >
                      Payout Status
                    </Text>

                    <Text
                      style={
                        styles.payoutStatusValue
                      }
                    >
                      {formatPayoutStatus(
                        driver?.payout_status
                      )}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (checking ||
                  loggingOut) &&
                  styles.disabledButton,
              ]}
              onPress={() => {
                void checkApprovalStatus();
              }}
              disabled={
                checking ||
                loggingOut
              }
              activeOpacity={0.86}
            >
              {checking ? (
                <>
                  <ActivityIndicator
                    color={colors.navy}
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Checking Status
                  </Text>
                </>
              ) : (
                <>
                  <RefreshCw
                    size={20}
                    color={colors.navy}
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Refresh Approval Status
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.supportButton
              }
              onPress={openSupport}
              disabled={loggingOut}
              activeOpacity={0.85}
            >
              <Headphones
                size={20}
                color={colors.gold}
              />

              <Text
                style={
                  styles.supportButtonText
                }
              >
                Contact Driver Support
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.logoutButton,
                loggingOut &&
                  styles.disabledButton,
              ]}
              onPress={handleLogout}
              disabled={loggingOut}
              activeOpacity={0.85}
            >
              {loggingOut ? (
                <ActivityIndicator
                  color={colors.text}
                />
              ) : (
                <Text
                  style={
                    styles.logoutButtonText
                  }
                >
                  Log Out
                </Text>
              )}
            </TouchableOpacity>

            <Text
              style={styles.footer}
            >
              Angel Express • Excellence
              In Every Ride
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

function getStatusConfig(
  status: string,
  colors: any
) {
  switch (status) {
    case "approved":
    case "online":
    case "offline":
    case "on_trip":
      return {
        title:
          "Application Approved",

        message:
          "Your chauffeur profile has been approved and operational access is now available.",

        color:
          colors.success ||
          "#48C78E",

        softColor:
          colors.mode === "dark"
            ? "rgba(72,199,142,0.14)"
            : "rgba(72,199,142,0.12)",

        icon: (
          <CheckCircle2
            size={46}
            color={
              colors.success ||
              "#48C78E"
            }
          />
        ),
      };

    case "rejected":
      return {
        title:
          "Application Not Approved",

        message:
          "Your chauffeur application was not approved at this time. Contact Angel Express Operations for clarification or next steps.",

        color:
          colors.danger ||
          "#E35D6A",

        softColor:
          colors.mode === "dark"
            ? "rgba(227,93,106,0.14)"
            : "rgba(227,93,106,0.10)",

        icon: (
          <ShieldAlert
            size={46}
            color={
              colors.danger ||
              "#E35D6A"
            }
          />
        ),
      };

    case "suspended":
      return {
        title:
          "Account Suspended",

        message:
          "Your chauffeur account is currently suspended. Ride assignments and operational access are unavailable.",

        color:
          colors.danger ||
          "#E35D6A",

        softColor:
          colors.mode === "dark"
            ? "rgba(227,93,106,0.14)"
            : "rgba(227,93,106,0.10)",

        icon: (
          <AlertTriangle
            size={46}
            color={
              colors.danger ||
              "#E35D6A"
            }
          />
        ),
      };

    case "pending":
    default:
      return {
        title:
          "Application Submitted",

        message:
          "Thank you for applying to become an Angel Express chauffeur. Your profile has been received and is currently under review.",

        color: colors.gold,

        softColor:
          colors.mode === "dark"
            ? "rgba(212,175,55,0.12)"
            : "#FFF8E8",

        icon: (
          <Clock3
            size={46}
            color={colors.gold}
          />
        ),
      };
  }
}

function StateCard({
  icon,
  title,
  message,
  styles,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  styles: ReturnType<
    typeof createStyles
  >;
}) {
  return (
    <View style={styles.heroCard}>
      <View
        style={styles.statusIcon}
      >
        {icon}
      </View>

      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.message}>
        {message}
      </Text>
    </View>
  );
}

function StepRow({
  number,
  text,
  styles,
}: {
  number: string;
  text: string;
  styles: ReturnType<
    typeof createStyles
  >;
}) {
  return (
    <View style={styles.stepRow}>
      <View
        style={styles.stepNumber}
      >
        <Text
          style={
            styles.stepNumberText
          }
        >
          {number}
        </Text>
      </View>

      <Text style={styles.stepText}>
        {text}
      </Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  styles,
  last = false,
}: {
  label: string;
  value: string;
  styles: ReturnType<
    typeof createStyles
  >;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,
        last &&
          styles.detailRowLast,
      ]}
    >
      <Text
        style={styles.detailLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.detailValue}
      >
        {value}
      </Text>
    </View>
  );
}

function createStyles(colors: any) {
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
      paddingTop: 58,
      paddingBottom: 46,
    },

    content: {
      width: "100%",
      maxWidth: 620,
      alignSelf: "center",
    },

    loadingScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 30,
    },

    loadingTitle: {
      color: colors.gold,
      fontSize: 22,
      fontWeight: "900",
      marginTop: 18,
      marginBottom: 8,
    },

    loadingMessage: {
      color: colors.text2,
      fontSize: 14,
      textAlign: "center",
      fontWeight: "700",
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 20,
    },

    topTextWrap: {
      flex: 1,
      paddingRight: 12,
    },

    appLabel: {
      color: colors.gold,
      fontSize: 10.5,
      fontWeight: "900",
      letterSpacing: 1.3,
      marginBottom: 5,
    },

    greeting: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "900",
    },

    themePill: {
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.card,
      borderRadius: 999,
      paddingVertical: 9,
      paddingHorizontal: 14,
    },

    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    heroCard: {
      alignItems: "center",
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 30,
      padding: 22,
      marginBottom: 18,
      ...v5Shadow(colors),
    },

    statusIcon: {
      width: 78,
      height: 78,
      borderRadius: 26,
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

    title: {
      color: colors.gold,
      fontSize: 28,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 12,
    },

    statusBadge: {
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 9,
      paddingHorizontal: 15,
      marginBottom: 16,
    },

    statusBadgeText: {
      fontSize: 12,
      fontWeight: "900",
      textAlign: "center",
      textTransform:
        "uppercase",
      letterSpacing: 0.5,
    },

    message: {
      color: colors.text2,
      fontSize: 15,
      lineHeight: 24,
      textAlign: "center",
      fontWeight: "700",
    },

    infoBox: {
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(0,0,0,0.30)"
          : "rgba(7,17,31,0.04)",
      borderRadius: 24,
      padding: 18,
      marginBottom: 18,
      borderWidth: 1,
      borderColor:
        colors.borderSoft ||
        colors.border,
    },

    infoTitle: {
      color: colors.gold,
      fontSize: 19,
      fontWeight: "900",
      marginBottom: 15,
    },

    stepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 13,
    },

    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        colors.gold,
      marginRight: 11,
      marginTop: 1,
    },

    stepNumberText: {
      color: colors.navy,
      fontSize: 13,
      fontWeight: "900",
    },

    stepText: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
    },

    sectionCard: {
      backgroundColor:
        colors.card,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 24,
      padding: 18,
      marginBottom: 18,
      ...v5Shadow(colors),
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 15,
    },

    sectionTitle: {
      color: colors.gold,
      fontSize: 18,
      fontWeight: "900",
      marginLeft: 9,
    },

    detailRow: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor:
        colors.borderSoft ||
        colors.border,
    },

    detailRowLast: {
      borderBottomWidth: 0,
      paddingBottom: 2,
    },

    detailLabel: {
      color: colors.text2,
      fontSize: 11.5,
      fontWeight: "900",
      textTransform:
        "uppercase",
      letterSpacing: 0.7,
      marginBottom: 5,
    },

    detailValue: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
    },

    stripeBox: {
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(212,175,55,0.10)"
          : "#FFF8E8",
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 24,
      padding: 18,
      marginBottom: 20,
    },

    stripeTitle: {
      color: colors.gold,
      fontSize: 18,
      fontWeight: "900",
      marginLeft: 9,
    },

    stripeText: {
      color: colors.text2,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: "700",
      marginBottom: 14,
    },

    payoutStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
      paddingVertical: 11,
    },

    payoutStatusRowLast: {
      paddingBottom: 0,
    },

    payoutStatusLabel: {
      color: colors.text2,
      fontSize: 13,
      fontWeight: "800",
    },

    payoutStatusValue: {
      color: colors.gold,
      fontSize: 13,
      fontWeight: "900",
    },

    primaryButton: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        colors.gold,
      borderRadius: 18,
      paddingHorizontal: 18,
      marginBottom: 12,
    },

    primaryButtonText: {
      color: colors.navy,
      fontWeight: "900",
      fontSize: 14,
      textTransform:
        "uppercase",
      letterSpacing: 0.4,
      marginLeft: 9,
    },

    supportButton: {
      minHeight: 60,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor:
        colors.gold,
      backgroundColor:
        colors.mode === "dark"
          ? "rgba(5,11,22,0.78)"
          : colors.card,
      borderRadius: 18,
      paddingHorizontal: 18,
      marginBottom: 12,
    },

    supportButtonText: {
      color: colors.gold,
      fontWeight: "900",
      fontSize: 14,
      marginLeft: 9,
    },

    logoutButton: {
      minHeight: 58,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor:
        colors.borderSoft ||
        colors.border,
      borderRadius: 18,
      backgroundColor:
        colors.card2 ||
        colors.card,
      marginBottom: 20,
    },

    logoutButtonText: {
      color: colors.text,
      textAlign: "center",
      fontWeight: "800",
      fontSize: 15,
    },

    disabledButton: {
      opacity: 0.65,
    },

    footer: {
      color: colors.text,
      textAlign: "center",
      fontSize: 13,
      fontWeight: "700",
      opacity: 0.9,
    },
  });
}