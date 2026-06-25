import { useLocalSearchParams } from "expo-router";
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

export default function ManageBookingScreen() {
  const params = useLocalSearchParams();

  const bookingId = String(params.booking_id || "");
  const invoiceNo = String(params.invoice_no || "");

  const [requestType, setRequestType] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitRequest() {
    try {
      if (!requestType) {
        Alert.alert("Select Request Type");
        return;
      }

      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Please sign in again.");

      const { error } = await supabase
        .from("booking_change_requests")
        .insert({
          booking_id: bookingId,
          invoice_no: invoiceNo,
          user_id: user.id,
          passenger_email: user.email,
          request_type: requestType,
          request_details: details,
        });

     if (error) throw error;

Alert.alert(
  "Request Submitted",
  "Angel Express has received your request and will review it shortly."
);

setDetails("");
setRequestType("");

    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  }

  const options = [
    "Cancel Ride",
    "Change Pickup Location",
    "Change Drop-off Location",
    "Change Date",
    "Change Time",
    "Other Request",
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Manage Booking</Text>

      <Text style={styles.invoice}>
        {invoiceNo}
      </Text>

      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.option,
            requestType === option && styles.selectedOption,
          ]}
          onPress={() => setRequestType(option)}
        >
          <Text style={styles.optionText}>{option}</Text>
        </TouchableOpacity>
      ))}

      <TextInput
        style={styles.input}
        placeholder="Additional details..."
        placeholderTextColor="#8A93A3"
        multiline
        value={details}
        onChangeText={setDetails}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={submitRequest}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Submitting..." : "Submit Request"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#040C18" },
  content: { padding: 22, paddingTop: 70 },
  title: {
    color: "#D4AF37",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 10,
  },
  invoice: {
    color: "#FFFFFF",
    marginBottom: 20,
  },
  option: {
    backgroundColor: "#071426",
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  selectedOption: {
    borderWidth: 1,
    borderColor: "#D4AF37",
  },
  optionText: {
    color: "#FFFFFF",
  },
  input: {
    backgroundColor: "#071426",
    color: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    minHeight: 120,
    marginTop: 10,
  },
  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#071426",
    fontWeight: "900",
  },
});