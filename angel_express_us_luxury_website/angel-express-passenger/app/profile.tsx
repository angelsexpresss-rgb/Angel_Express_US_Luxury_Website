import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  const [userId, setUserId] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyEmail, setEmergencyEmail] = useState("");

  const [studentStatus, setStudentStatus] = useState(false);
  const [studentVerified, setStudentVerified] = useState(false);
  const [studentVerificationStatus, setStudentVerificationStatus] =
    useState("Not Submitted");

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
      const { data, error } = await supabase
        .from("passenger_ratings")
        .select("overall_rating")
        .eq("passenger_user_id", currentUserId);

      if (error) throw error;

      if (!data || data.length === 0) {
        setPassengerRating("5.0");
        setTotalRatings(0);
        return;
      }

      const average =
        data.reduce((sum, item) => sum + Number(item.overall_rating || 5), 0) /
        data.length;

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

      const { data: profile, error: profileError } = await supabase
        .from("passenger_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setFirstName(profile?.first_name || passenger?.first_name || "");
      setLastName(profile?.last_name || passenger?.last_name || "");
      setPhone(profile?.phone || passenger?.phone || "");
      setEmail(profile?.email || passenger?.email || user.email || "");

      setEmergencyName(profile?.emergency_name || "");
      setEmergencyPhone(profile?.emergency_phone || "");
      setEmergencyEmail(profile?.emergency_contact_email || "");

      setStudentStatus(Boolean(profile?.student_status || profile?.student_verified));
      setStudentVerified(Boolean(profile?.student_verified));
      setStudentVerificationStatus(
        profile?.student_verification_status || "Not Submitted"
      );

      setPreferredRoute(profile?.preferred_route || "");
      setLuggagePreference(profile?.luggage_preference || "");
      setMusicPreference(profile?.music_preference || "");
      setAcPreference(profile?.ac_preference || "");
      setConversationPreference(profile?.conversation_preference || "");
      setTermsAccepted(Boolean(profile?.terms_accepted));
    } catch (error: any) {
      Alert.alert("Profile Error", error.message || "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }

  function requestAccountDeletion() {
    Alert.alert(
      "Delete Account",
      "This will submit a request to permanently delete your Angel Express account and associated data. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Deletion",
          style: "destructive",
          onPress: () => {
            const subject = "Account Deletion Request";
            const body = `Hello Angel Express,

I would like to permanently delete my Angel Express account and associated data.

Account Email: ${email || "Please enter your account email here"}

Thank you.`;

            router.push(
              `mailto:angelexpresss@gmail.com?subject=${encodeURIComponent(
                subject
              )}&body=${encodeURIComponent(body)}` as any
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
      Alert.alert("Missing Information", "Please complete your name, phone, and email.");
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
        .upsert(profileData, { onConflict: "user_id" });

      if (error) throw error;

      Alert.alert("Profile Saved", "Your profile has been updated.", [
        { text: "Continue", onPress: () => router.replace("/dashboard" as any) },
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
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Complete Your Profile</Text>

        <Text style={styles.subtitle}>
          Complete your profile once to unlock Angel Safety Share, Family Check-In+,
          Student Travel Mode+, and ride preferences.
        </Text>

        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>Passenger Rating</Text>
          <Text style={styles.ratingValue}>⭐ {passengerRating}</Text>
          <Text style={styles.ratingSubtitle}>
            Based on {totalRatings} chauffeur review(s)
          </Text>
        </View>

        <Section title="Account Information" />

        <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#8A93A3" value={firstName} onChangeText={setFirstName} />
        <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#8A93A3" value={lastName} onChangeText={setLastName} />
        <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#8A93A3" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#8A93A3" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

        <Section title="Emergency Contact" />

        <TextInput style={styles.input} placeholder="Emergency Contact Name" placeholderTextColor="#8A93A3" value={emergencyName} onChangeText={setEmergencyName} />
        <TextInput style={styles.input} placeholder="Emergency Contact Phone" placeholderTextColor="#8A93A3" value={emergencyPhone} onChangeText={setEmergencyPhone} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Emergency Contact Email" placeholderTextColor="#8A93A3" value={emergencyEmail} onChangeText={setEmergencyEmail} autoCapitalize="none" keyboardType="email-address" />

        <Section title="Student Travel Mode+" />

        <View style={styles.studentCard}>
          <View style={styles.switchRowInner}>
            <View style={styles.switchTextBox}>
              <Text style={styles.switchTitle}>Student Passenger</Text>
              <Text style={styles.switchSubtitle}>
                Turn this on if you are a student passenger. Verified students unlock
                student discounts, Student Pool+, and campus travel features.
              </Text>
            </View>

            <Switch
              value={studentStatus}
              onValueChange={setStudentStatus}
              trackColor={{ false: "#334155", true: "#D4AF37" }}
              thumbColor={studentStatus ? "#FFFFFF" : "#CBD5E1"}
            />
          </View>

          <View style={styles.studentBadge}>
            <Text style={styles.studentBadgeText}>
              {studentVerified
                ? "Verified Student"
                : `Status: ${studentVerificationStatus}`}
            </Text>
          </View>

          {studentStatus && !studentVerified ? (
            <TouchableOpacity
              style={styles.studentButton}
              onPress={() => router.push("/student-verification" as any)}
            >
              <Text style={styles.studentButtonText}>Verify Student Status</Text>
            </TouchableOpacity>
          ) : null}

          {studentStatus && studentVerified ? (
            <TouchableOpacity
              style={styles.studentButton}
              onPress={() => router.push("/student-travel" as any)}
            >
              <Text style={styles.studentButtonText}>Open Student Travel Mode+</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Section title="Travel Preferences" />

        <TextInput style={styles.input} placeholder="Preferred Route e.g. Dallas to Austin" placeholderTextColor="#8A93A3" value={preferredRoute} onChangeText={setPreferredRoute} />
        <TextInput style={styles.input} placeholder="Luggage Preference e.g. 2 bags, carry-on only" placeholderTextColor="#8A93A3" value={luggagePreference} onChangeText={setLuggagePreference} />
        <TextInput style={styles.input} placeholder="Music Preference e.g. quiet ride, gospel, afrobeats" placeholderTextColor="#8A93A3" value={musicPreference} onChangeText={setMusicPreference} />
        <TextInput style={styles.input} placeholder="AC Preference e.g. cool, warm, normal" placeholderTextColor="#8A93A3" value={acPreference} onChangeText={setAcPreference} />
        <TextInput style={styles.input} placeholder="Conversation Preference e.g. quiet ride, open to chat" placeholderTextColor="#8A93A3" value={conversationPreference} onChangeText={setConversationPreference} />

        <Section title="Terms & Privacy" />

        <View style={styles.termsCard}>
          <View style={styles.switchRowInner}>
            <View style={styles.switchTextBox}>
              <Text style={styles.switchTitle}>I accept Angel Express Terms & Conditions</Text>
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

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setTermsModalVisible(true)}
          >
            <Text style={styles.linkText}>Read Terms & Conditions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push("/privacy" as any)}
          >
            <Text style={styles.linkText}>View Privacy Policy</Text>
          </TouchableOpacity>
        </View>

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

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={requestAccountDeletion}>
          <Text style={styles.deleteButtonText}>Request Account Deletion</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={termsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Angel Express Terms & Conditions</Text>

              <Text style={styles.modalText}>
                By using Angel Express Mobility, you agree to use the Passenger App,
                booking system, ride support, payment features, live tracking, safety
                tools, and communication features responsibly.
              </Text>

              <Text style={styles.modalSection}>1. Ride Bookings</Text>
              <Text style={styles.modalText}>
                Passengers must provide accurate pickup, drop-off, date, time, contact,
                luggage, airport, and trip information. Angel Express may contact you to
                confirm or adjust details before the ride.
              </Text>

              <Text style={styles.modalSection}>2. Payments</Text>
              <Text style={styles.modalText}>
                Passengers are responsible for paying approved ride fares, additional
                charges, tolls, waiting time, route changes, and special trip requests
                where applicable. Payment availability may depend on approved Angel
                Express payment methods.
              </Text>

              <Text style={styles.modalSection}>3. Safety & Conduct</Text>
              <Text style={styles.modalText}>
                Passengers must behave respectfully toward drivers and Angel Express
                staff. Unsafe, abusive, unlawful, or disruptive behavior may lead to ride
                cancellation, account restriction, or refusal of future service.
              </Text>

              <Text style={styles.modalSection}>4. Student Travel Mode+</Text>
              <Text style={styles.modalText}>
                Student discounts and Student Pool+ features are available only to
                passengers who submit valid student information and receive approval.
                Angel Express may reject, suspend, or review student benefits at any time.
              </Text>

              <Text style={styles.modalSection}>5. Live Tracking & Safety Features</Text>
              <Text style={styles.modalText}>
                Safety Share, Family Check-In+, and live trip tracking are provided to
                support safer travel. These tools depend on device, network, app, GPS,
                and system availability.
              </Text>

              <Text style={styles.modalSection}>6. Cancellations & Changes</Text>
              <Text style={styles.modalText}>
                Trip changes, cancellations, delays, no-shows, waiting time, and route
                changes may affect pricing or service availability. Contact support as
                early as possible for assistance.
              </Text>

              <Text style={styles.modalSection}>7. Privacy</Text>
              <Text style={styles.modalText}>
                Angel Express uses your information to manage your account, bookings,
                safety features, driver coordination, support, notifications, and service
                improvements. Your information is not sold.
              </Text>

              <Text style={styles.modalSection}>8. Agreement</Text>
              <Text style={styles.modalText}>
                By accepting these terms, you confirm that your information is accurate
                and that you agree to Angel Express service rules, safety expectations,
                payment responsibilities, and privacy practices.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setTermsModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#040C18" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 50 },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#040C18",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: "#FFFFFF", marginTop: 12 },
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
  ratingTitle: { color: "#D4AF37", fontSize: 18, fontWeight: "900", marginBottom: 8 },
  ratingValue: { color: "#FFFFFF", fontSize: 34, fontWeight: "900" },
  ratingSubtitle: { color: "#C9D0D8", marginTop: 6 },
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
  studentCard: {
    backgroundColor: "#071426",
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
  },
  termsCard: {
    backgroundColor: "#071426",
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
  },
  switchRowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchTextBox: { flex: 1 },
  switchTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  switchSubtitle: {
    color: "#C9D0D8",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  studentBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  studentBadgeText: { color: "#D4AF37", fontWeight: "900", fontSize: 13 },
  studentButton: {
    backgroundColor: "#D4AF37",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 14,
  },
  studentButtonText: { color: "#071426", fontWeight: "900", fontSize: 15 },
  linkButton: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 8,
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
  saveButtonText: { color: "#071426", fontSize: 18, fontWeight: "900" },
  buttonDisabled: { opacity: 0.6 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#64748B",
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: "rgba(15,23,42,0.75)",
  },
  secondaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#DC2626",
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },
  deleteButtonText: { color: "#FCA5A5", fontSize: 15, fontWeight: "800" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    maxHeight: "85%",
    backgroundColor: "#071426",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
  },
  modalTitle: {
    color: "#D4AF37",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 14,
  },
  modalSection: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 6,
  },
  modalText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: "#D4AF37",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 18,
  },
  modalButtonText: {
    color: "#071426",
    fontSize: 16,
    fontWeight: "900",
  },
});