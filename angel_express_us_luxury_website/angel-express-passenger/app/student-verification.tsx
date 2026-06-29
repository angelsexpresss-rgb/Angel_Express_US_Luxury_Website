import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BadgeCheck,
  Camera,
  GraduationCap,
  IdCard,
  ShieldCheck,
  Upload,
} from "lucide-react-native";

import { supabase } from "../lib/supabase";

import {
  AE_COLORS,
  AngelCard,
  AngelHeroButton,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const GOLD = AE_COLORS.gold;

export default function StudentVerificationScreen() {
  const [university, setUniversity] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [campus, setCampus] = useState("");
  const [studentLevel, setStudentLevel] = useState("");
  const [expectedGraduation, setExpectedGraduation] = useState("");
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [idImage, setIdImage] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
  }, []);

  async function pickStudentId() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow photo access to upload your student ID."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setIdImage(result.assets[0]);
    }
  }

 async function uploadStudentId(userId: string) {
  if (!idImage?.uri) return { path: null, publicUrl: null };

  const fileExt = "jpg";
  const filePath = `${userId}/student-id-${Date.now()}.${fileExt}`;

  const response = await fetch(idImage.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("student-ids")
    .upload(filePath, arrayBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("student-ids")
    .getPublicUrl(filePath);

  return {
    path: filePath,
    publicUrl: data?.publicUrl || null,
  };
}
  async function submitVerification() {
    if (
      !university.trim() ||
      !studentEmail.trim() ||
      !campus.trim() ||
      !studentLevel.trim() ||
      !expectedGraduation.trim()
    ) {
      Alert.alert(
        "Missing Information",
        "Please complete university, student email, campus, student level, and expected graduation."
      );
      return;
    }

    if (!idImage?.uri) {
      Alert.alert(
        "Student ID Required",
        "Please upload a clear photo of your student ID."
      );
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const { data: passengerProfile, error: profileFetchError } =
        await supabase
          .from("passenger_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

      if (profileFetchError) throw profileFetchError;
      if (!passengerProfile) throw new Error("Passenger profile not found.");

      const uploadedId = await uploadStudentId(user.id);

      const submittedAt = new Date().toISOString();

      const { error: profileUpdateError } = await supabase
        .from("passenger_profiles")
        .update({
          student_university: university.trim(),
          student_email: studentEmail.trim().toLowerCase(),
          student_campus: campus.trim(),
          student_level: studentLevel.trim(),
          student_expected_graduation: expectedGraduation.trim(),
          student_id_number: studentIdNumber.trim(),
          student_verification_notes: notes.trim(),

          student_id_path: uploadedId.path,
          student_id_url: uploadedId.publicUrl,
          student_id_uploaded: true,

          student_status: true,
          student_verified: false,
          student_discount_eligible: false,
          student_verification_status: "Pending Review",
          student_verification_submitted_at: submittedAt,
        })
        .eq("user_id", user.id);

      if (profileUpdateError) throw profileUpdateError;

      const { error: queueInsertError } = await supabase
        .from("student_verifications")
        .insert({
          passenger_id: passengerProfile.id,
          user_id: user.id,
          email: passengerProfile.email || user.email || "",
          student_email: studentEmail.trim().toLowerCase(),
          student_id_last4: studentIdNumber.trim(),
          school_name: university.trim(),
          student_id_photo_url: uploadedId.publicUrl || uploadedId.path,
          notes: notes.trim(),
          status: "Pending Review",
          student_verified: false,
          submitted_at: submittedAt,
        });

      if (queueInsertError) throw queueInsertError;

      Alert.alert(
        "Verification Submitted",
        "Your student verification has been submitted. Once approved, your student badge will show in Angel Express and driver-side ride details.",
        [{ text: "OK", onPress: () => router.replace("/student-travel" as any) }]
      );
    } catch (error: any) {
      Alert.alert(
        "Submission Error",
        error.message || "Could not submit verification."
      );
    } finally {
      setSaving(false);
    }
  }

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.bgWrap, { transform: [{ scale: bgScale }] }]}>
        <ImageBackground
          source={require("../assets/images/dashboard-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>A  STUDENT IDENTITY REVIEW</Text>
            </View>

            <Text style={styles.title}>Student Verification</Text>

            <Text style={styles.subtitle}>
              Verify your student identity to unlock student discounts, campus
              pickup priority, ride pooling, and verified student status.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <GraduationCap size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Unlock Student Travel+</Text>
                <Text style={styles.heroText}>
                  Your ID is securely reviewed by Angel Express before benefits
                  are activated.
                </Text>
              </View>
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <BadgeCheck size={23} color={GOLD} />
                <Text style={styles.cardTitle}>School Information</Text>
              </View>

              <Label text="University / School" />
              <TextInput
                style={styles.input}
                placeholder="e.g. University of Texas at Dallas"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={university}
                onChangeText={setUniversity}
              />

              <Label text="Student Email" />
              <TextInput
                style={styles.input}
                placeholder="e.g. name@utdallas.edu"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={studentEmail}
                onChangeText={setStudentEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Label text="Campus / Main Pickup Area" />
              <TextInput
                style={styles.input}
                placeholder="e.g. UTD Richardson Campus"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={campus}
                onChangeText={setCampus}
              />

              <Label text="Student Level" />
              <TextInput
                style={styles.input}
                placeholder="e.g. Undergraduate, Masters, PhD"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={studentLevel}
                onChangeText={setStudentLevel}
              />

              <Label text="Expected Graduation" />
              <TextInput
                style={styles.input}
                placeholder="e.g. Fall 2026"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={expectedGraduation}
                onChangeText={setExpectedGraduation}
              />
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <IdCard size={23} color={GOLD} />
                <Text style={styles.cardTitle}>Student ID Upload</Text>
              </View>

              <Text style={styles.helperText}>
                Upload a clear photo of your student ID. Make sure your name and
                school are visible.
              </Text>

              <TouchableOpacity
                style={styles.uploadBox}
                onPress={pickStudentId}
                activeOpacity={0.85}
              >
                {idImage?.uri ? (
                  <Image source={{ uri: idImage.uri }} style={styles.previewImage} />
                ) : (
                  <>
                    <Camera size={34} color={GOLD} />
                    <Text style={styles.uploadTitle}>Upload Student ID</Text>
                    <Text style={styles.uploadText}>
                      Tap to select from your photos
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {idImage?.uri && (
                <TouchableOpacity style={styles.changeButton} onPress={pickStudentId}>
                  <Upload size={17} color={GOLD} />
                  <Text style={styles.changeButtonText}>
                    Change Student ID Photo
                  </Text>
                </TouchableOpacity>
              )}
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <ShieldCheck size={23} color={GOLD} />
                <Text style={styles.cardTitle}>Verification Questions</Text>
              </View>

              <Label text="Student ID Number / Last 4 Digits" />
              <TextInput
                style={styles.input}
                placeholder="Optional, if available"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={studentIdNumber}
                onChangeText={setStudentIdNumber}
              />

              <Label text="Notes for Angel Express Review" />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Fall 2026 student, campus pickup preference, class schedule, or ID details"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  Your uploaded ID is stored privately for Angel Express review.
                  Drivers will only see your verified student badge/status after
                  approval, not your ID image.
                </Text>
              </View>
            </AngelCard>

            <AngelHeroButton
              title={saving ? "Submitting..." : "Submit Verification"}
              onPress={submitVerification}
              variant="gold"
              style={saving ? styles.disabledButton : styles.mainButton}
            />

            <AngelHeroButton
              title="Go Back"
              onPress={() => router.back()}
              variant="outline"
              style={styles.secondaryButton}
            />
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AE_COLORS.navy, overflow: "hidden" },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(5,11,22,0.91)" },
  container: { flex: 1 },
  content: { padding: 22, paddingTop: 56, paddingBottom: 50 },

  backButton: { alignSelf: "flex-start", marginBottom: 18 },
  backText: { color: GOLD, fontSize: 18, fontWeight: "900" },

  kicker: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  kickerText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  title: {
    color: GOLD,
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 10,
    letterSpacing: -0.7,
  },

  subtitle: {
    color: AE_COLORS.textSoft,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },

  heroCard: {
    minHeight: 120,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(6,17,31,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  heroCopy: { flex: 1 },

  heroTitle: {
    color: AE_COLORS.navy2,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
  },

  heroText: {
    color: "rgba(6,17,31,0.78)",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
  },

  card: {
    padding: 20,
    marginBottom: 18,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },

  cardTitle: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
    flex: 1,
  },

  label: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    color: AE_COLORS.white,
    padding: 17,
    borderRadius: 16,
    fontSize: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  textArea: {
    height: 120,
    textAlignVertical: "top",
  },

  helperText: {
    color: AE_COLORS.textSoft,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 16,
  },

  uploadBox: {
    minHeight: 190,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(212,175,55,0.55)",
    backgroundColor: "rgba(212,175,55,0.07)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    overflow: "hidden",
  },

  uploadTitle: {
    color: GOLD,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 6,
  },

  uploadText: {
    color: AE_COLORS.muted,
    fontSize: 14,
  },

  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 18,
  },

  changeButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(212,175,55,0.08)",
  },

  changeButtonText: {
    color: GOLD,
    fontWeight: "900",
  },

  noticeBox: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },

  noticeText: {
    color: GOLD,
    fontSize: 13.5,
    lineHeight: 21,
    fontWeight: "700",
  },

  mainButton: {
    marginTop: 6,
  },

  disabledButton: {
    opacity: 0.7,
    marginTop: 6,
  },

  secondaryButton: {
    marginTop: 14,
  },
});