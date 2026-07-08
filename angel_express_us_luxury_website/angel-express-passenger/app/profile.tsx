import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  GraduationCap,
  LockKeyhole,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { usePassengerTheme, v5Shadow } from "../lib/passengerTheme";

export default function ProfileScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const [lastRatingNote, setLastRatingNote] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadPassengerRating(currentUserId: string, currentEmail: string) {
    try {
      const cleanEmail = currentEmail?.trim().toLowerCase() || "";

      const { data: summaryByUser, error: userSummaryError } = await supabase
        .from("passenger_rating_summary")
        .select("*")
        .eq("passenger_user_id", currentUserId)
        .maybeSingle();

      if (!userSummaryError && summaryByUser) {
        setPassengerRating(Number(summaryByUser.average_rating || 5).toFixed(1));
        setTotalRatings(Number(summaryByUser.total_reviews || 0));
        setLastRatingNote(summaryByUser.last_note || "");
        return;
      }

      if (cleanEmail) {
        const { data: summaryByEmail, error: emailSummaryError } = await supabase
          .from("passenger_rating_summary")
          .select("*")
          .ilike("passenger_email", cleanEmail)
          .maybeSingle();

        if (!emailSummaryError && summaryByEmail) {
          setPassengerRating(Number(summaryByEmail.average_rating || 5).toFixed(1));
          setTotalRatings(Number(summaryByEmail.total_reviews || 0));
          setLastRatingNote(summaryByEmail.last_note || "");
          return;
        }
      }

      setPassengerRating("5.0");
      setTotalRatings(0);
      setLastRatingNote("");
    } catch {
      setPassengerRating("5.0");
      setTotalRatings(0);
      setLastRatingNote("");
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
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/dashboard-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.themePill} onPress={toggleTheme}>
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.kicker}>PASSENGER ACCOUNT</Text>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>
            Keep your passenger profile, safety contact, travel preferences, student
            mode, and live chauffeur rating connected.
          </Text>

          <View style={styles.ratingCard}>
            <View style={styles.ratingIcon}>
              <Star size={28} color={colors.navy} fill={colors.navy} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.ratingTitle}>Passenger Rating</Text>
              <Text style={styles.ratingValue}>⭐ {passengerRating}</Text>
              <Text style={styles.ratingSubtitle}>
                Based on {totalRatings} chauffeur review{totalRatings === 1 ? "" : "s"}
              </Text>
              {lastRatingNote ? (
                <Text style={styles.ratingNote} numberOfLines={2}>
                  Latest note: {lastRatingNote}
                </Text>
              ) : null}
            </View>
          </View>

          <Section title="Account Information" styles={styles} icon={<UserRound size={19} color={colors.gold} />} />

          <TextInput style={styles.input} placeholder="First Name" placeholderTextColor={colors.placeholder} value={firstName} onChangeText={setFirstName} />
          <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor={colors.placeholder} value={lastName} onChangeText={setLastName} />
          <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={colors.placeholder} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.placeholder} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

          <Section title="Emergency Contact" styles={styles} icon={<ShieldCheck size={19} color={colors.gold} />} />

          <TextInput style={styles.input} placeholder="Emergency Contact Name" placeholderTextColor={colors.placeholder} value={emergencyName} onChangeText={setEmergencyName} />
          <TextInput style={styles.input} placeholder="Emergency Contact Phone" placeholderTextColor={colors.placeholder} value={emergencyPhone} onChangeText={setEmergencyPhone} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Emergency Contact Email" placeholderTextColor={colors.placeholder} value={emergencyEmail} onChangeText={setEmergencyEmail} autoCapitalize="none" keyboardType="email-address" />

          <Section title="Student Travel Mode+" styles={styles} icon={<GraduationCap size={19} color={colors.gold} />} />

          <View style={styles.card}>
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
                trackColor={{ false: colors.borderSoft, true: colors.gold }}
                thumbColor={studentStatus ? "#FFFFFF" : "#CBD5E1"}
              />
            </View>

            <View style={styles.studentBadge}>
              <Text style={styles.studentBadgeText}>
                {studentVerified ? "Verified Student" : `Status: ${studentVerificationStatus}`}
              </Text>
            </View>

            {studentStatus && !studentVerified ? (
              <TouchableOpacity
                style={styles.goldButton}
                onPress={() => router.push("/student-verification" as any)}
              >
                <BadgeCheck size={18} color={colors.navy} />
                <Text style={styles.goldButtonText}>Verify Student Status</Text>
              </TouchableOpacity>
            ) : null}

            {studentStatus && studentVerified ? (
              <TouchableOpacity
                style={styles.goldButton}
                onPress={() => router.push("/student-travel" as any)}
              >
                <GraduationCap size={18} color={colors.navy} />
                <Text style={styles.goldButtonText}>Open Student Travel Mode+</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Section title="Travel Preferences" styles={styles} icon={<Star size={19} color={colors.gold} />} />

          <TextInput style={styles.input} placeholder="Preferred Route e.g. Dallas to Austin" placeholderTextColor={colors.placeholder} value={preferredRoute} onChangeText={setPreferredRoute} />
          <TextInput style={styles.input} placeholder="Luggage Preference e.g. 2 bags, carry-on only" placeholderTextColor={colors.placeholder} value={luggagePreference} onChangeText={setLuggagePreference} />
          <TextInput style={styles.input} placeholder="Music Preference e.g. quiet ride, gospel, afrobeats" placeholderTextColor={colors.placeholder} value={musicPreference} onChangeText={setMusicPreference} />
          <TextInput style={styles.input} placeholder="AC Preference e.g. cool, warm, normal" placeholderTextColor={colors.placeholder} value={acPreference} onChangeText={setAcPreference} />
          <TextInput style={styles.input} placeholder="Conversation Preference e.g. quiet ride, open to chat" placeholderTextColor={colors.placeholder} value={conversationPreference} onChangeText={setConversationPreference} />

          <Section title="Terms & Privacy" styles={styles} icon={<LockKeyhole size={19} color={colors.gold} />} />

          <View style={styles.card}>
            <View style={styles.switchRowInner}>
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
                trackColor={{ false: colors.borderSoft, true: colors.gold }}
                thumbColor={termsAccepted ? "#FFFFFF" : "#CBD5E1"}
              />
            </View>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setTermsModalVisible(true)}
            >
              <BookOpen size={16} color={colors.gold} />
              <Text style={styles.linkText}>Read Terms & Conditions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push("/privacy" as any)}
            >
              <LockKeyhole size={16} color={colors.gold} />
              <Text style={styles.linkText}>View Privacy Policy</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={saveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.navy} />
            ) : (
              <>
                <Save size={19} color={colors.navy} />
                <Text style={styles.saveButtonText}>Save Profile</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={requestAccountDeletion}>
            <Trash2 size={18} color={colors.danger} />
            <Text style={styles.deleteButtonText}>Request Account Deletion</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={termsModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Angel Express Terms & Conditions</Text>

                <TermsText styles={styles} />
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
      </View>
    </ImageBackground>
  );
}

function Section({
  title,
  icon,
  styles,
}: {
  title: string;
  icon: React.ReactNode;
  styles: any;
}) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionIcon}>{icon}</View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function TermsText({ styles }: { styles: any }) {
  return (
    <>
      <Text style={styles.modalText}>
        By using Angel Express Mobility, you agree to use the Passenger App,
        booking system, ride support, payment features, live tracking, safety
        tools, and communication features responsibly.
      </Text>

      {[
        ["1. Ride Bookings", "Passengers must provide accurate pickup, drop-off, date, time, contact, luggage, airport, and trip information. Angel Express may contact you to confirm or adjust details before the ride."],
        ["2. Payments", "Passengers are responsible for paying approved ride fares, additional charges, tolls, waiting time, route changes, and special trip requests where applicable. Payment availability may depend on approved Angel Express payment methods."],
        ["3. Safety & Conduct", "Passengers must behave respectfully toward drivers and Angel Express staff. Unsafe, abusive, unlawful, or disruptive behavior may lead to ride cancellation, account restriction, or refusal of future service."],
        ["4. Student Travel Mode+", "Student discounts and Student Pool+ features are available only to passengers who submit valid student information and receive approval. Angel Express may reject, suspend, or review student benefits at any time."],
        ["5. Live Tracking & Safety Features", "Safety Share, Family Check-In+, and live trip tracking are provided to support safer travel. These tools depend on device, network, app, GPS, and system availability."],
        ["6. Cancellations & Changes", "Trip changes, cancellations, delays, no-shows, waiting time, and route changes may affect pricing or service availability. Contact support as early as possible for assistance."],
        ["7. Privacy", "Angel Express uses your information to manage your account, bookings, safety features, driver coordination, support, notifications, and service improvements. Your information is not sold."],
        ["8. Agreement", "By accepting these terms, you confirm that your information is accurate and that you agree to Angel Express service rules, safety expectations, payment responsibilities, and privacy practices."],
      ].map(([title, text]) => (
        <View key={title}>
          <Text style={styles.modalSection}>{title}</Text>
          <Text style={styles.modalText}>{text}</Text>
        </View>
      ))}
    </>
  );
}

function createStyles(c: any) {
  return StyleSheet.create({
    background: { flex: 1 },
    overlay: { flex: 1, backgroundColor: c.overlay },
    container: { flex: 1 },
    content: { padding: 22, paddingTop: 58, paddingBottom: 54 },
    loadingContainer: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: { color: c.text, marginTop: 12, fontWeight: "800" },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backButton: {
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
    backText: { color: c.gold, fontSize: 15, fontWeight: "900" },
    themePill: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    themeText: { color: c.gold, fontSize: 12, fontWeight: "900" },
    kicker: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 8,
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
    ratingCard: {
      backgroundColor: c.gold,
      borderRadius: 24,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 24,
      ...v5Shadow(c),
    },
    ratingIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    ratingTitle: { color: c.navy, fontSize: 16, fontWeight: "900" },
    ratingValue: { color: c.navy, fontSize: 35, fontWeight: "900" },
    ratingSubtitle: { color: c.navy, opacity: 0.8, fontWeight: "800" },
    ratingNote: {
      color: c.navy,
      opacity: 0.8,
      fontSize: 12.5,
      lineHeight: 18,
      marginTop: 7,
      fontWeight: "700",
    },
    sectionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 14,
      marginBottom: 12,
    },
    sectionIcon: {
      width: 36,
      height: 36,
      borderRadius: 13,
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: { color: c.gold, fontSize: 19, fontWeight: "900" },
    input: {
      backgroundColor: c.input,
      color: c.inputText,
      padding: 16,
      borderRadius: 16,
      fontSize: 15.5,
      marginBottom: 13,
      borderWidth: 1,
      borderColor: c.borderSoft,
      fontWeight: "700",
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 17,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: c.borderSoft,
      ...v5Shadow(c),
    },
    switchRowInner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    switchTextBox: { flex: 1 },
    switchTitle: { color: c.text, fontSize: 16, fontWeight: "900" },
    switchSubtitle: {
      color: c.text2,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 4,
      fontWeight: "700",
    },
    studentBadge: {
      alignSelf: "flex-start",
      backgroundColor: c.soft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginTop: 14,
    },
    studentBadgeText: { color: c.gold, fontWeight: "900", fontSize: 13 },
    goldButton: {
      backgroundColor: c.gold,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 14,
    },
    goldButtonText: { color: c.navy, fontWeight: "900", fontSize: 15 },
    linkButton: {
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      paddingVertical: 10,
      marginTop: 8,
    },
    linkText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
      textDecorationLine: "underline",
    },
    saveButton: {
      backgroundColor: c.gold,
      paddingVertical: 18,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
      marginBottom: 14,
      ...v5Shadow(c),
    },
    saveButtonText: { color: c.navy, fontSize: 17, fontWeight: "900" },
    buttonDisabled: { opacity: 0.6 },
    secondaryButton: {
      borderWidth: 1,
      borderColor: c.borderSoft,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: "center",
      marginBottom: 14,
      backgroundColor: c.card,
    },
    secondaryButtonText: { color: c.text, fontSize: 16, fontWeight: "900" },
    deleteButton: {
      borderWidth: 1,
      borderColor: c.danger,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
      backgroundColor: c.dangerSoft,
    },
    deleteButtonText: { color: c.danger, fontSize: 15, fontWeight: "900" },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "center",
      padding: 20,
    },
    modalCard: {
      maxHeight: "85%",
      backgroundColor: c.card,
      borderRadius: 24,
      padding: 22,
      borderWidth: 1,
      borderColor: c.border,
    },
    modalTitle: {
      color: c.gold,
      fontSize: 25,
      fontWeight: "900",
      marginBottom: 14,
    },
    modalSection: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
      marginTop: 14,
      marginBottom: 6,
    },
    modalText: { color: c.text, fontSize: 15, lineHeight: 24 },
    modalButton: {
      backgroundColor: c.gold,
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 18,
    },
    modalButtonText: { color: c.navy, fontSize: 16, fontWeight: "900" },
  });
}