import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  const [emergencyEmail, setEmergencyEmail] = useState("");

  const [studentStatus, setStudentStatus] = useState(false);
  const [preferredRoute, setPreferredRoute] = useState("");
  const [luggagePreference, setLuggagePreference] = useState("");
  const [musicPreference, setMusicPreference] = useState("");
  const [acPreference, setAcPreference] = useState("");
  const [conversationPreference, setConversationPreference] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);

  const [passengerRating, setPassengerRating] = useState("5.0");
  const [totalRatings, setTotalRatings] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadPassengerRating(currentUserId: string, currentEmail: string) {
    try {
      let query = supabase
        .from("passenger_ratings")
        .select("overall_rating");

      if (currentUserId) {
        query = query.eq("passenger_user_id", currentUserId);
      } else {
        query = query.eq("passenger_email", currentEmail);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setPassengerRating("5.0");
        setTotalRatings(0);
        return;
      }

      const average =
        data.reduce(
          (sum, item) => sum + Number(item.overall_rating || 5),
          0
        ) / data.length;

      setPassengerRating(average.toFixed(1));
      setTotalRatings(data.length);
    } catch {
      setPassengerRating("5.0");
      setTotalRatings(0);
    }
  }

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

      await loadPassengerRating(user.id, user.email || "");

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
        setEmergencyEmail(profile.emergency_contact_email || "");

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

  function openPrivacyPolicy() {
    Linking.openURL("https://angelexpressus.com/privacy");
  }

  function requestAccountDeletion() {
    Alert.alert(
      "Delete Account",
      "This will submit a request to permanently delete your Angel Express account and associated data. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Request Deletion",
          style: "destructive",
          onPress: () => {
            const subject = "Account Deletion Request";
            const body = `Hello Angel Express,

I would like to permanently delete my Angel Express account and associated data.

Account Email: ${email || "Please enter your account email here"}

Thank you.`;

            Linking.openURL(
              `mailto:angelexpresss@gmail.com?subject=${encodeURIComponent(
                subject
              )}&body=${encodeURIComponent(body)}`
            );
          },
        },
      ]
    );
  }

  async function saveProfile() {
    if (!userId) {
      Alert.alert("Error", "User not found. Please sign in again.");
      return;
    }

    if (!firstName || !lastName || !phone || !email) {
      Alert.alert(
        "Missing Information",
        "Please complete your name, phone, and email."
      );
      return;
    }

    if (!emergencyName || !emergencyPhone || !emergencyEmail) {
      Alert.alert(
        "Emergency Contact Required",
        "Please add your emergency contact name, phone, and email before continuing."
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
        emergency_contact_email: emergencyEmail.trim(),

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

      Alert.alert("Profile Saved", "Your profile has been updated.", [
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#D4AF37" size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Complete Your Profile</Text>

      <Text style={styles.subtitle}>
        Complete your profile once to unlock Angel Safety Share, Student Travel
        Mode, and ride preferences.
      </Text>

      <View style={styles.ratingCard}>
        <Text style={styles.ratingTitle}>Passenger Rating</Text>

        <Text style={styles.ratingValue}>⭐ {passengerRating}</Text>

        <Text style={styles.ratingSubtitle}>
          Based on {totalRatings} chauffeur review(s)
        </Text>
      </View>

      <Section title="Account Information" />

      <TextInput
        style={styles.input}
        placeholder="First Name"
        placeholderTextColor="#8A93A3"
        value={firstName}
        onChangeText={setFirstName}
      />

      <TextInput
        style={styles.input}
        placeholder="Last Name"
        placeholderTextColor="#8A93A3"
        value={lastName}
        onChangeText={setLastName}
      />

      <TextInput
        style={styles.input}
        placeholder="Phone"
        placeholderTextColor="#8A93A3"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#8A93A3"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Section title="Emergency Contact" />

      <TextInput
        style={styles.input}
        placeholder="Emergency Contact Name"
        placeholderTextColor="#8A93A3"
        value={emergencyName}
        onChangeText={setEmergencyName}
      />

      <TextInput
        style={styles.input}
        placeholder="Emergency Contact Phone"
        placeholderTextColor="#8A93A3"
        value={emergencyPhone}
        onChangeText={setEmergencyPhone}
        keyboardType="phone-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Emergency Contact Email"
        placeholderTextColor="#8A93A3"
        value={emergencyEmail}
        onChangeText={setEmergencyEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Section title="Travel Preferences" />

      <View style={styles.switchRow}>
        <View>
          <Text style={styles.switchTitle}>Student Travel Mode</Text>
          <Text style={styles.switchSubtitle}>
            Enable this if you are a student passenger.
          </Text>
        </View>

        <Switch
          value={studentStatus}
          onValueChange={setStudentStatus}
          trackColor={{ false: "#334155", true: "#D4AF37" }}
          thumbColor={studentStatus ? "#FFFFFF" : "#CBD5E1"}
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Preferred Route e.g. Dallas to Austin"
        placeholderTextColor="#8A93A3"
        value={preferredRoute}
        onChangeText={setPreferredRoute}
      />

      <TextInput
        style={styles.input}
        placeholder="Luggage Preference e.g. 2 bags, carry-on only"
        placeholderTextColor="#8A93A3"
        value={luggagePreference}
        onChangeText={setLuggagePreference}
      />

      <TextInput
        style={styles.input}
        placeholder="Music Preference e.g. quiet ride, gospel, afrobeats"
        placeholderTextColor="#8A93A3"
        value={musicPreference}
        onChangeText={setMusicPreference}
      />

      <TextInput
        style={styles.input}
        placeholder="AC Preference e.g. cool, warm, normal"
        placeholderTextColor="#8A93A3"
        value={acPreference}
        onChangeText={setAcPreference}
      />

      <TextInput
        style={styles.input}
        placeholder="Conversation Preference e.g. quiet ride, open to chat"
        placeholderTextColor="#8A93A3"
        value={conversationPreference}
        onChangeText={setConversationPreference}
      />

      <Section title="Terms & Privacy" />

      <View style={styles.switchRow}>
        <View style={styles.switchTextBox}>
          <Text style={styles.switchTitle}>
            I accept Angel Express Terms & Conditions
          </Text>
          <Text style={styles.switchSubtitle}>
            Required before booking and using safety features.
          </Text>
        </View>

        <Switch
          value={termsAccepted}
          onValueChange={setTermsAccepted}
          trackColor={{ false: "#334155", true: "#D4AF37" }}
          thumbColor={termsAccepted ? "#FFFFFF" : "#CBD5E1"}
        />
      </View>

      <TouchableOpacity style={styles.linkButton} onPress={openPrivacyPolicy}>
        <Text style={styles.linkText}>View Privacy Policy</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={saveProfile}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#071426" />
        ) : (
          <Text style={styles.saveButtonText}>Save Profile</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.back()}
      >
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={requestAccountDeletion}
      >
        <Text style={styles.deleteButtonText}>Request Account Deletion</Text>
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

  loadingContainer: {
    flex: 1,
    backgroundColor: "#040C18",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#FFFFFF",
    marginTop: 12,
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

  ratingCard: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#D4AF37",
  },

  ratingTitle: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },

  ratingValue: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
  },

  ratingSubtitle: {
    color: "#C9D0D8",
    marginTop: 6,
  },

  sectionTitle: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 22,
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
    borderColor: "rgba(212,175,55,0.16)",
  },

  switchRow: {
    backgroundColor: "#071426",
    borderRadius: 14,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.16)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  switchTextBox: {
    flex: 1,
  },

  switchTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  switchSubtitle: {
    color: "#C9D0D8",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },

  linkButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },

  linkText: {
    color: "#D4AF37",
    fontSize: 16,
    fontWeight: "800",
    textDecorationLine: "underline",
  },

  saveButton: {
    backgroundColor: "#D4AF37",
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 14,
  },

  saveButtonText: {
    color: "#071426",
    fontSize: 18,
    fontWeight: "900",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: "#64748B",
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: "rgba(15,23,42,0.75)",
  },

  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  deleteButton: {
    borderWidth: 1,
    borderColor: "#DC2626",
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },

  deleteButtonText: {
    color: "#FCA5A5",
    fontSize: 15,
    fontWeight: "800",
  },
});