import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { useOwnerTheme } from "../lib/ownerTheme";
import { supabase } from "../lib/supabase";

type GenericRecord = Record<string, any>;

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

export default function OwnerSafetyScreen() {
  const { theme, isDark } = useOwnerTheme();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [alerts, setAlerts] =
    useState<GenericRecord[]>([]);
  const [locations, setLocations] =
    useState<GenericRecord[]>([]);
  const [familyCheckins, setFamilyCheckins] =
    useState<GenericRecord[]>([]);
  const [bookings, setBookings] =
    useState<GenericRecord[]>([]);
  const [drivers, setDrivers] =
    useState<GenericRecord[]>([]);

  const isLarge = width >= 1050;

  useFocusEffect(
    useCallback(() => {
      loadSafety();
    }, [])
  );

  async function safeRows(table: string, order?: string) {
    try {
      let query = supabase.from(table).select("*");

      if (order) {
        query = query.order(order, { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.log(`${table} skipped:`, error.message);
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  }

  async function loadSafety(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const [
        alertRows,
        locationRows,
        familyRows,
        bookingRows,
        driverRows,
      ] = await Promise.all([
        safeRows("emergency_alerts", "created_at"),
        safeRows("driver_live_locations", "last_updated"),
        safeRows("family_checkins", "created_at"),
        safeRows("bookings", "created_at"),
        safeRows("drivers", "created_at"),
      ]);

      setAlerts(alertRows);
      setLocations(locationRows);
      setFamilyCheckins(familyRows);
      setBookings(bookingRows);
      setDrivers(driverRows);
    } catch (error: any) {
      Alert.alert(
        "Safety Overview Error",
        error?.message || "Unable to load safety overview."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const summary = useMemo(() => {
    const activeAlerts = alerts.filter(
      (alert) =>
        alert.resolved !== true &&
        !["resolved", "closed"].includes(
          normalize(alert.status)
        )
    );

    const critical = activeAlerts.filter((alert) => {
      const text = normalize(
        `${alert.severity} ${alert.alert_type} ${alert.notes}`
      );

      return (
        text.includes("critical") ||
        text.includes("sos") ||
        text.includes("accident") ||
        text.includes("medical")
      );
    });

    const activeTrips = bookings.filter((booking) =>
      [
        "assigned",
        "driverassigned",
        "accepted",
        "driveraccepted",
        "pickedup",
        "inprogress",
        "active",
      ].includes(normalize(booking.status))
    );

    const onlineDrivers = drivers.filter(
      (driver) => driver.is_online === true
    );

    const emergencyLocations = locations.filter(
      (location) =>
        !["normal", "none", ""].includes(
          normalize(location.emergency_status)
        )
    );

    const recentCheckins = familyCheckins.filter((item) => {
      const date = new Date(item.created_at || 0);
      return (
        !Number.isNaN(date.getTime()) &&
        Date.now() - date.getTime() <= 86400000
      );
    });

    return {
      activeAlerts,
      critical,
      activeTrips,
      onlineDrivers,
      emergencyLocations,
      recentCheckins,
    };
  }, [
    alerts,
    locations,
    familyCheckins,
    bookings,
    drivers,
  ]);

  const safetyScore = useMemo(() => {
    let score = 100;

    score -= summary.activeAlerts.length * 8;
    score -= summary.critical.length * 12;
    score -= summary.emergencyLocations.length * 8;

    return Math.max(0, Math.min(100, score));
  }, [summary]);

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
          color={theme.colors.danger}
        />
        <Text
          style={[
            styles.loadingText,
            { color: theme.colors.textSecondary },
          ]}
        >
          Loading Safety Overview...
        </Text>
      </View>
    );
  }

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
              ? "rgba(3,8,17,0.95)"
              : "rgba(245,247,250,0.97)",
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
                await loadSafety(false);
              }}
              tintColor={theme.colors.danger}
              colors={[theme.colors.danger]}
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
                  { color: theme.colors.danger },
                ]}
              >
                ANGEL EXPRESS SAFETY INTELLIGENCE
              </Text>
              <Text
                style={[
                  styles.pageTitle,
                  { color: theme.colors.text },
                ]}
              >
                Owner Safety Overview
              </Text>
              <Text
                style={[
                  styles.pageSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Review fleet safety health, active alerts, SOS activity,
                emergency trip locations, driver readiness, and family
                check-ins.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.scoreCard,
              {
                backgroundColor:
                  safetyScore >= 85
                    ? theme.colors.successSoft
                    : safetyScore >= 65
                      ? theme.colors.warningSoft
                      : theme.colors.dangerSoft,
                borderColor:
                  safetyScore >= 85
                    ? theme.colors.success
                    : safetyScore >= 65
                      ? theme.colors.warning
                      : theme.colors.danger,
              },
              theme.shadows.premium,
            ]}
          >
            <View>
              <Text
                style={[
                  styles.scoreEyebrow,
                  {
                    color:
                      safetyScore >= 85
                        ? theme.colors.success
                        : safetyScore >= 65
                          ? theme.colors.warning
                          : theme.colors.danger,
                  },
                ]}
              >
                CURRENT SAFETY SCORE
              </Text>
              <Text
                style={[
                  styles.scoreValue,
                  { color: theme.colors.text },
                ]}
              >
                {safetyScore}
              </Text>
              <Text
                style={[
                  styles.scoreText,
                  { color: theme.colors.textMuted },
                ]}
              >
                {safetyScore >= 85
                  ? "Safety systems operating normally."
                  : safetyScore >= 65
                    ? "Safety attention is recommended."
                    : "Immediate safety intervention is required."}
              </Text>
            </View>

            <Ionicons
              name="shield-checkmark-outline"
              size={54}
              color={
                safetyScore >= 85
                  ? theme.colors.success
                  : safetyScore >= 65
                    ? theme.colors.warning
                    : theme.colors.danger
              }
            />
          </View>

          <View style={styles.metricGrid}>
            {[
              [
                "Active Alerts",
                summary.activeAlerts.length,
                "warning-outline",
                theme.colors.danger,
                theme.colors.dangerSoft,
              ],
              [
                "Critical",
                summary.critical.length,
                "alert-circle-outline",
                theme.colors.danger,
                theme.colors.dangerSoft,
              ],
              [
                "Active Trips",
                summary.activeTrips.length,
                "navigate-outline",
                theme.colors.info,
                theme.colors.infoSoft,
              ],
              [
                "Drivers Online",
                summary.onlineDrivers.length,
                "radio-outline",
                theme.colors.success,
                theme.colors.successSoft,
              ],
              [
                "Emergency Locations",
                summary.emergencyLocations.length,
                "location-outline",
                theme.colors.warning,
                theme.colors.warningSoft,
              ],
              [
                "Family Check-ins",
                summary.recentCheckins.length,
                "people-outline",
                theme.colors.gold,
                theme.colors.goldTransparent,
              ],
            ].map(([label, value, icon, color, background]) => (
              <View
                key={String(label)}
                style={[
                  styles.metricCard,
                  {
                    width: isLarge ? "31.8%" : "48%",
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.cardBorder,
                  },
                  theme.shadows.soft,
                ]}
              >
                <View
                  style={[
                    styles.metricIcon,
                    { backgroundColor: String(background) },
                  ]}
                >
                  <Ionicons
                    name={icon as any}
                    size={21}
                    color={String(color)}
                  />
                </View>
                <Text
                  style={[
                    styles.metricValue,
                    { color: theme.colors.text },
                  ]}
                >
                  {value}
                </Text>
                <Text
                  style={[
                    styles.metricLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.commandButton,
              {
                backgroundColor: theme.colors.danger,
              },
            ]}
            onPress={() => router.push("/emergency-center")}
          >
            <Ionicons
              name="warning-outline"
              size={21}
              color="#ffffff"
            />
            <View style={styles.commandTextArea}>
              <Text style={styles.commandTitle}>
                Open Emergency Command Center
              </Text>
              <Text style={styles.commandText}>
                Investigate, contact, map, resolve, and reopen incidents.
              </Text>
            </View>
            <Ionicons
              name="arrow-forward"
              size={20}
              color="#ffffff"
            />
          </TouchableOpacity>

          <View style={styles.twoColumnGrid}>
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionEyebrow,
                  { color: theme.colors.danger },
                ]}
              >
                ACTIVE INCIDENTS
              </Text>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text },
                ]}
              >
                Immediate Attention
              </Text>

              {summary.activeAlerts.length === 0 ? (
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  No active safety incidents.
                </Text>
              ) : (
                summary.activeAlerts
                  .slice(0, 8)
                  .map((alert) => (
                    <View
                      key={alert.id}
                      style={[
                        styles.dataRow,
                        {
                          borderBottomColor:
                            theme.colors.divider,
                        },
                      ]}
                    >
                      <View style={styles.dataTextArea}>
                        <Text
                          style={[
                            styles.dataTitle,
                            { color: theme.colors.text },
                          ]}
                        >
                          {alert.alert_type ||
                            "Emergency Alert"}
                        </Text>
                        <Text
                          style={[
                            styles.dataMeta,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          Trip #{alert.booking_id || "Unknown"} •{" "}
                          {alert.created_at
                            ? new Date(
                                alert.created_at
                              ).toLocaleString()
                            : "Unknown time"}
                        </Text>
                      </View>
                      <Ionicons
                        name="warning"
                        size={18}
                        color={theme.colors.danger}
                      />
                    </View>
                  ))
              )}
            </View>

            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionEyebrow,
                  { color: theme.colors.info },
                ]}
              >
                LIVE SAFETY SIGNALS
              </Text>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text },
                ]}
              >
                Fleet Monitoring
              </Text>

              {locations.slice(0, 8).map((location) => (
                <View
                  key={location.id}
                  style={[
                    styles.dataRow,
                    {
                      borderBottomColor:
                        theme.colors.divider,
                    },
                  ]}
                >
                  <View style={styles.dataTextArea}>
                    <Text
                      style={[
                        styles.dataTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      {location.driver_name || "Driver"}
                    </Text>
                    <Text
                      style={[
                        styles.dataMeta,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {location.trip_phase || "active"} •{" "}
                      {Number(location.speed_mph || 0).toFixed(0)} mph
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.statusValue,
                      {
                        color:
                          normalize(location.emergency_status) ===
                          "normal"
                            ? theme.colors.success
                            : theme.colors.danger,
                      },
                    ]}
                  >
                    {location.emergency_status || "normal"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
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
    maxWidth: 780,
  },
  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },
  scoreEyebrow: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  scoreValue: {
    marginTop: 4,
    fontSize: 42,
    fontWeight: "900",
  },
  scoreText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 17,
    maxWidth: 500,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metricCard: {
    minHeight: 128,
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    marginBottom: 13,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  metricValue: {
    fontSize: 27,
    fontWeight: "900",
  },
  metricLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: "700",
  },
  commandButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  commandTextArea: {
    flex: 1,
    marginHorizontal: 12,
  },
  commandTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  commandText: {
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
    fontSize: 10.5,
    lineHeight: 16,
  },
  twoColumnGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  sectionCard: {
    flexGrow: 1,
    flexBasis: 340,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  sectionEyebrow: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  sectionTitle: {
    marginTop: 5,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 10,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  dataTextArea: {
    flex: 1,
    paddingRight: 8,
  },
  dataTitle: {
    fontSize: 11.5,
    fontWeight: "900",
  },
  dataMeta: {
    marginTop: 4,
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: "600",
  },
  statusValue: {
    fontSize: 9.5,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  emptyText: {
    marginTop: 14,
    fontSize: 11.5,
  },
});
