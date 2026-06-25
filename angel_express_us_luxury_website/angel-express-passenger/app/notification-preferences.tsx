import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function NotificationPreferencesScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [rideAlerts, setRideAlerts] = useState(true);
  const [familyAlerts, setFamilyAlerts] = useState(true);
  const [promoAlerts, setPromoAlerts] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const { data, error } = await supabase
        .from("passenger_profiles")
        .select(
          "ride_alerts_enabled,family_alerts_enabled,promo_alerts_enabled"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRideAlerts(data.ride_alerts_enabled ?? true);
        setFamilyAlerts(data.family_alerts_enabled ?? true);
        setPromoAlerts(data.promo_alerts_enabled ?? false);
      }
    } catch (error: any) {
      Alert.alert(
        "Notification Error",
        error.message || "Could not load notification preferences."
      );
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const { error } = await supabase
        .from("passenger_profiles")
        .update({
          ride_alerts_enabled: rideAlerts,
          family_alerts_enabled: familyAlerts,
          promo_alerts_enabled: promoAlerts,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      Alert.alert("Saved", "Your notification preferences have been updated.");
    } catch (error: any) {
      Alert.alert(
        "Save Error",
        error.message || "Could not save notification preferences."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D4AF37" size="large" />
        <Text style={styles.loadingText}>Loading notification settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Notification Preferences</Text>

      <Text style={styles.subtitle}>
        Choose which Angel Express notifications you want to receive.
      </Text>

      <PreferenceRow
        title="Ride Alerts"
        text="Driver assigned, ride confirmed, driver arriving, trip started, completed, and reward updates."
        value={rideAlerts}
        onValueChange={setRideAlerts}
      />

      <PreferenceRow
        title="Family Check-In Alerts"
        text="Pickup, halfway, arrival, and emergency contact related updates."
        value={familyAlerts}
        onValueChange={setFamilyAlerts}
      />

      <PreferenceRow
        title="Promotional Alerts"
        text="Student deals, referral bonuses, event travel offers, and Angel Express updates."
        value={promoAlerts}
        onValueChange={setPromoAlerts}
      />

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={savePreferences}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Saving..." : "Save Preferences"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function PreferenceRow({
  title,
  text,
  value,
  onValueChange,
}: {
  title: string;
  text: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.textBox}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardText}>{text}</Text>
        </View>

        <Switch value={value} onValueChange={onValueChange} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#040C18",
  },

  content: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 50,
  },

  center: {
    flex: 1,
    backgroundColor: "#040C18",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    color: "#FFFFFF",
    marginTop: 12,
    fontSize: 16,
  },

  title: {
    color: "#D4AF37",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 10,
  },

  subtitle: {
    color: "#C9D0D8",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "center",
  },

  textBox: {
    flex: 1,
  },

  cardTitle: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },

  cardText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
  },

  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 17,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 12,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: "#071426",
    fontSize: 17,
    fontWeight: "900",
  },
});