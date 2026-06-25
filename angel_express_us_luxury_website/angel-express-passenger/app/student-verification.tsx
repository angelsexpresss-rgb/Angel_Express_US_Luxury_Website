import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function StudentVerificationScreen() {
  const [university, setUniversity] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitVerification() {
    if (!university.trim() || !studentEmail.trim()) {
      Alert.alert("Missing Information", "Please enter your university and student email.");
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

      const { error } = await supabase
        .from("passenger_profiles")
        .update({
          student_university: university.trim(),
          student_email: studentEmail.trim().toLowerCase(),
          student_verification_notes: notes.trim(),
          student_verification_status: "Pending Review",
          student_verified: false,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      Alert.alert(
        "Verification Submitted",
        "Your student verification request has been submitted for review.",
        [{ text: "OK", onPress: () => router.replace("/student-travel" as any) }]
      );
    } catch (error: any) {
      Alert.alert("Submission Error", error.message || "Could not submit verification.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Student Verification</Text>
      <Text style={styles.subtitle}>
        Submit your school information to unlock student discounts, campus pickup priority, and referral bonuses.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="University e.g. UTD"
        placeholderTextColor="#8A93A3"
        value={university}
        onChangeText={setUniversity}
      />

      <TextInput
        style={styles.input}
        placeholder="Student Email e.g. name@utdallas.edu"
        placeholderTextColor="#8A93A3"
        value={studentEmail}
        onChangeText={setStudentEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Notes e.g. Fall 2026 student, campus, student ID details"
        placeholderTextColor="#8A93A3"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <TouchableOpacity style={styles.button} onPress={submitVerification} disabled={saving}>
        <Text style={styles.buttonText}>
          {saving ? "Submitting..." : "Submit Verification"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.back()}
      >
        <Text style={styles.secondaryButtonText}>Go Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#040C18" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 50 },
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
  input: {
    backgroundColor: "#071426",
    color: "#FFFFFF",
    borderRadius: 15,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 17,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#071426",
    fontSize: 17,
    fontWeight: "900",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#D4AF37",
    paddingVertical: 17,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 14,
  },
  secondaryButtonText: {
    color: "#D4AF37",
    fontSize: 17,
    fontWeight: "900",
  },
});