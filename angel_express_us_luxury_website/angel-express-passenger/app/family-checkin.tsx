import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function FamilyCheckInScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  async function loadProfile() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const { data, error } = await supabase
        .from("passenger_profiles")
        .select(
          "first_name,last_name,email,phone,emergency_name,emergency_phone,emergency_contact_email"
        )
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error: any) {
      Alert.alert("Family Check-In Error", error.message || "Could not load emergency contact.");
    } finally {
      setLoading(false);
    }
  }

  function buildMessage(type: string) {
    const passengerName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();

    if (type === "picked_up") {
      return `Angel Express Family Check-In

${passengerName || "Your loved one"} has been picked up safely.

We will keep you updated during the ride.`;
    }

    if (type === "halfway") {
      return `Angel Express Family Check-In

${passengerName || "Your loved one"} is halfway to the destination.

The trip is continuing safely.`;
    }

    return `Angel Express Family Check-In

${passengerName || "Your loved one"} has arrived safely.

Thank you for trusting Angel Express.`;
  }

  async function sendWhatsApp(type: string) {
    const phone = String(profile?.emergency_phone || "").replace(/[^\d]/g, "");

    if (!phone) {
      Alert.alert("Missing Phone", "Please add an emergency contact phone number in your profile.");
      return;
    }

    const message = buildMessage(type);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    await Linking.openURL(url);
  }

  async function sendSMS(type: string) {
    const phone = String(profile?.emergency_phone || "").replace(/[^\d+]/g, "");

    if (!phone) {
      Alert.alert("Missing Phone", "Please add an emergency contact phone number in your profile.");
      return;
    }

    const message = buildMessage(type);
    const url = `sms:${phone}?body=${encodeURIComponent(message)}`;
    await Linking.openURL(url);
  }

  async function sendEmail(type: string) {
    const email = profile?.emergency_contact_email;

    if (!email) {
      Alert.alert("Missing Email", "Please add an emergency contact email in your profile.");
      return;
    }

    const message = buildMessage(type);
    const subject = "Angel Express Family Check-In";
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    await Linking.openURL(url);
  }

  async function sendAll(type: string) {
    Alert.alert("Choose Send Method", "How would you like to notify your emergency contact?", [
      { text: "WhatsApp", onPress: () => sendWhatsApp(type) },
      { text: "SMS", onPress: () => sendSMS(type) },
      { text: "Email", onPress: () => sendEmail(type) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D4AF37" size="large" />
        <Text style={styles.loadingText}>Loading Family Check-In...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Family Check-In+</Text>

      <Text style={styles.subtitle}>
        Send quick safety updates to your emergency contact by WhatsApp, SMS, or Email.
      </Text>

      <View style={styles.contactBox}>
        <Text style={styles.boxTitle}>Emergency Contact</Text>
        <Text style={styles.contactText}>Name: {profile?.emergency_name || "Not added"}</Text>
        <Text style={styles.contactText}>Phone: {profile?.emergency_phone || "Not added"}</Text>
        <Text style={styles.contactText}>
          Email: {profile?.emergency_contact_email || "Not added"}
        </Text>
      </View>

      <CheckInButton
        title="Passenger Picked Up"
        text="Let your family know you have been picked up safely."
        onPress={() => sendAll("picked_up")}
      />

      <CheckInButton
        title="Halfway To Destination"
        text="Let your family know the ride is halfway complete."
        onPress={() => sendAll("halfway")}
      />

      <CheckInButton
        title="Arrived Safely"
        text="Let your family know you arrived safely."
        onPress={() => sendAll("arrived")}
      />
    </ScrollView>
  );
}

function CheckInButton({
  title,
  text,
  onPress,
}: {
  title: string;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{text}</Text>
      <Text style={styles.cardAction}>Send Update →</Text>
    </Pressable>
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
    marginBottom: 22,
  },
  contactBox: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },
  boxTitle: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },
  contactText: {
    color: "#FFFFFF",
    fontSize: 15,
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#071426",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
  },
  cardTitle: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  cardText: {
    color: "#C9D0D8",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  cardAction: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});