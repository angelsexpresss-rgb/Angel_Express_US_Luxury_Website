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
import { supabase } from "../lib/supabase";

export default function EmergencyCenterScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();

      const interval = setInterval(() => {
        loadAlerts(false);
      }, 8000);

      return () => clearInterval(interval);
    }, [])
  );

  async function loadAlerts(showLoading = true) {
    try {
      if (showLoading) setLoading(true);

      const { data, error } = await supabase
        .from("emergency_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAlerts(data || []);
    } catch (err: any) {
      Alert.alert("Emergency Center Error", err.message || "Unable to load alerts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function markResolved(alertId: string) {
    const { error } = await supabase
      .from("emergency_alerts")
      .update({ resolved: true })
      .eq("id", alertId);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    loadAlerts(false);
  }

  function callNumber(phone?: string) {
    if (!phone) {
      Alert.alert("No phone number", "Phone number is not available yet.");
      return;
    }

    Linking.openURL(`tel:${phone}`);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loadingText}>Loading Emergency Center...</Text>
      </View>
    );
  }

  const activeAlerts = alerts.filter((item) => !item.resolved);
  const resolvedAlerts = alerts.filter((item) => item.resolved);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadAlerts(false);
          }}
        />
      }
    >
      <Text style={styles.title}>🚨 Emergency Center</Text>

      <Text style={styles.subtitle}>
        Monitor safety alerts, owner interventions, driver emergencies, and trip incidents.
      </Text>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeAlerts.length}</Text>
          <Text style={styles.statLabel}>Active Alerts</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{resolvedAlerts.length}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Active Emergency Alerts</Text>

      {activeAlerts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No active emergency alerts</Text>
          <Text style={styles.emptyText}>
            Driver SOS alerts and owner interventions will appear here.
          </Text>
        </View>
      ) : (
        activeAlerts.map((item) => (
          <View key={item.id} style={styles.alertCard}>
            <Text style={styles.alertTitle}>
              🚨 {item.alert_type || "Emergency Alert"}
            </Text>

            <Text style={styles.alertText}>Trip: #{item.booking_id || "Unknown"}</Text>
            <Text style={styles.alertText}>Driver ID: {item.driver_id || "Unknown"}</Text>
            <Text style={styles.alertText}>Notes: {item.notes || "No notes provided"}</Text>

            <Text style={styles.alertTime}>
              Created:{" "}
              {item.created_at ? new Date(item.created_at).toLocaleString() : "Unknown"}
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() =>
                  Alert.alert(
                    "Contact Driver",
                    "Driver phone connection will be added after we join driver profile data."
                  )
                }
              >
                <Text style={styles.callButtonText}>Call Driver</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resolveButton}
                onPress={() =>
                  Alert.alert("Resolve Alert", "Mark this alert as resolved?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Resolve",
                      onPress: () => markResolved(item.id),
                    },
                  ])
                }
              >
                <Text style={styles.resolveButtonText}>Mark Resolved</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Resolved Alerts</Text>

      {resolvedAlerts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No resolved alerts yet.</Text>
        </View>
      ) : (
        resolvedAlerts.slice(0, 10).map((item) => (
          <View key={item.id} style={styles.resolvedCard}>
            <Text style={styles.resolvedTitle}>
              ✅ {item.alert_type || "Resolved Alert"}
            </Text>

            <Text style={styles.resolvedText}>Trip: #{item.booking_id || "Unknown"}</Text>
            <Text style={styles.resolvedText}>Notes: {item.notes || "No notes provided"}</Text>
          </View>
        ))
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
    color: "#fecaca",
    marginBottom: 14,
    lineHeight: 21,
  },
  backButton: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  backButtonText: {
    color: "#ef4444",
    fontWeight: "900",
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  statNumber: {
    color: "#ef4444",
    fontSize: 34,
    fontWeight: "900",
  },
  statLabel: {
    color: "#fff",
    marginTop: 4,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 18,
  },
  emptyTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17,
    marginBottom: 6,
  },
  emptyText: {
    color: "#cbd5e1",
    lineHeight: 21,
  },
  alertCard: {
    backgroundColor: "#1f0f12",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ef4444",
    marginBottom: 14,
  },
  alertTitle: {
    color: "#ef4444",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  alertText: {
    color: "#fff",
    marginBottom: 6,
    lineHeight: 20,
  },
  alertTime: {
    color: "#fecaca",
    marginTop: 6,
    marginBottom: 10,
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  callButton: {
    flex: 1,
    backgroundColor: "#d4af37",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  callButtonText: {
    color: "#07111f",
    fontWeight: "900",
    fontSize: 12,
  },
  resolveButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  resolveButtonText: {
    color: "#07111f",
    fontWeight: "900",
    fontSize: 12,
  },
  resolvedCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#14532d",
    marginBottom: 12,
  },
  resolvedTitle: {
    color: "#22c55e",
    fontWeight: "900",
    fontSize: 17,
    marginBottom: 6,
  },
  resolvedText: {
    color: "#cbd5e1",
    marginBottom: 4,
  },
  bottomSpace: {
    height: 50,
  },
});