import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const [studentStatus, setStudentStatus] = useState(false);
  const [preferredRoute, setPreferredRoute] = useState("");
  const [luggagePreference, setLuggagePreference] = useState("");
  const [musicPreference, setMusicPreference] = useState("");
  const [acPreference, setAcPreference] = useState("");
  const [conversationPreference, setConversationPreference] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);

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

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: passenger } = await supabase
        .from("passengers")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (passenger) {
        setFirstName(passenger.first_name || "");
        setLastName(passenger.last_name || "");
        setPhone(passenger.phone || "");
        setEmail(passenger.email || user.email || "");
      }

      const { data: profile, error: profileError } = await supabase
        .from("passenger_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile) {
        setFirstName(profile.first_name || passenger?.first_name || "");
        setLastName(profile.last_name || passenger?.last_name || "");
        setPhone(profile.phone || passenger?.phone || "");
        setEmail(profile.email || user.email || "");

        setEmergencyName(profile.emergency_name || "");
        setEmergencyPhone(profile.emergency_phone || "");

        setStudentStatus(profile.student_status || false);
        setPreferredRoute(profile.preferred_route || "");
        setLuggagePreference(profile.luggage_preference || "");
        setMusicPreference(profile.music_preference || "");
        setAcPreference(profile.ac_preference || "");
        setConversationPreference(profile.conversation_preference || "");
        setTermsAccepted(profile.terms_accepted || false);
      }
    } catch (error: any) {
      Alert.alert("Profile Error", error.message || "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!userId) {
      Alert.alert("Error", "User not found. Please sign in again.");
      return;
    }

    if (!firstName || !lastName || !phone || !email) {
      Alert.alert("Missing Information", "Please complete your name, phone, and email.");
      return;
    }

    if (!emergencyName || !emergencyPhone) {
      Alert.alert(
        "Emergency Contact Required",
        "Please add your emergency contact before continuing."
      );
      return;
    }

    if (!termsAccepted) {
      Alert.alert(
        "Terms Required",
        "Please accept Angel Express Terms & Conditions to continue."
      );
      return;
    }

    try {
      setSaving(true);

      const profileData = {
        user_id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        emergency_name: emergencyName.trim(),
        emergency_phone: emergencyPhone.trim(),
        student_status: studentStatus,
        preferred_route: preferredRoute.trim(),
        luggage_preference: luggagePreference.trim(),
        music_preference: musicPreference.trim(),
        ac_preference: acPreference.trim(),
        conversation_preference: conversationPreference.trim(),
        terms_accepted: termsAccepted,
        profile_completed: true,
      };

      const { error } = await supabase
        .from("passenger_profiles")
        .upsert(profileData, {
          onConflict: "user_id",
        });

      if (error) throw error;

      Alert.alert("Profile Completed", "Your profile has been saved.", [
        {
          text: "Continue",
          onPress: () => router.replace("/dashboard" as any),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Save Error", error.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>
        Complete your profile once to unlock Angel Safety Share, Student Travel Mode, and ride preferences.
      </Text>

      <Section title="Account Information" />

      <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#8A93A3" value={firstName} onChangeText={setFirstName} />
      <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#8A93A3" value={lastName} onChangeText={setLastName} />
      <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#8A93A3" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#8A93A3" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

      <Section title="Emergency Contact" />

      <TextInput style={styles.input} placeholder="Emergency Contact Name" placeholderTextColor="#8A93A3" value={emergencyName} onChangeText={setEmergencyName} />
      <TextInput style={styles.input} placeholder="Emergency Contact Phone" placeholderTextColor="#8A93A3" value={emergencyPhone} onChangeText={setEmergencyPhone} keyboardType="phone-pad" />

      <Section title="Student Travel Mode" />

      <View style={styles.switchRow}>
        <View>
          <Text style={styles.switchTitle}>Verified Student</Text>
          <Text style={styles.switchText}>Enable student discounts and campus pickup options.</Text>
        </View>
        <Switch value={studentStatus} onValueChange={setStudentStatus} />
      </View>

      <Section title="Ride Preferences" />

      <TextInput style={styles.input} placeholder="Preferred Route e.g. Dallas → Austin" placeholderTextColor="#8A93A3" value={preferredRoute} onChangeText={setPreferredRoute} />
      <TextInput style={styles.input} placeholder="Luggage Preference e.g. 2 bags" placeholderTextColor="#8A93A3" value={luggagePreference} onChangeText={setLuggagePreference} />
      <TextInput style={styles.input} placeholder="Music Preference e.g. Soft music / No music" placeholderTextColor="#8A93A3" value={musicPreference} onChangeText={setMusicPreference} />
      <TextInput style={styles.input} placeholder="AC Preference e.g. Cold AC / Mild AC" placeholderTextColor="#8A93A3" value={acPreference} onChangeText={setAcPreference} />
      <TextInput style={styles.input} placeholder="Conversation Preference e.g. Quiet ride" placeholderTextColor="#8A93A3" value={conversationPreference} onChangeText={setConversationPreference} />

      <Section title="Terms & Conditions" />

      <View style={styles.switchRow}>
        <View>
          <Text style={styles.switchTitle}>I Accept</Text>
          <Text style={styles.switchText}>
            I agree to Angel Express Terms & Conditions and Privacy Policy.
          </Text>
        </View>
        <Switch value={termsAccepted} onValueChange={setTermsAccepted} />
      </View>

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={saveProfile}
        disabled={saving || loading}
      >
        <Text style={styles.buttonText}>
          {saving ? "Saving Profile..." : "Save & Continue"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
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
  title: {
    color: "#D4AF37",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 10,
  },
  subtitle: {
    color: "#C9D0D8",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 14,
  },
  input: {
    backgroundColor: "#071426",
    color: "#FFFFFF",
    padding: 17,
    borderRadius: 14,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.16)",
  },
  switchRow: {
    backgroundColor: "#071426",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.16)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 5,
  },
  switchText: {
    color: "#C9D0D8",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 230,
  },
  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#071426",
    fontSize: 19,
    fontWeight: "900",
  },
});