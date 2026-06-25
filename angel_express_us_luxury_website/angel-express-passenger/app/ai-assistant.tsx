import { useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const SUPPORT_WHATSAPP = "19728367910";

export default function AIRideAssistantScreen() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<any[]>([
    {
      role: "assistant",
      text: "Hi, I’m Angel Ride Assistant. I can help with booking, pricing, luggage, airport pickup, routes, delays, hotels, and support.",
    },
  ]);

  function localAnswer(userQuestion: string) {
    const q = userQuestion.toLowerCase();

    if (q.includes("price") || q.includes("cost") || q.includes("fare")) {
      return "Angel Express estimates rides based on distance, trip type, student discount, event traffic, airport pickup, and special requests. Use Book a Ride to get a live estimate.";
    }

    if (q.includes("luggage") || q.includes("bag")) {
      return "You can add luggage count during booking. For large luggage, airport pickup, or group rides, add details in the notes section.";
    }

    if (q.includes("airport") || q.includes("dfw") || q.includes("love field")) {
      return "Angel Express supports airport pickup and drop-off for DFW, Dallas Love Field, Austin, Houston, and other airports. Please include flight number and terminal in notes.";
    }

    if (q.includes("student")) {
      return "Students may receive eligible discounts when student status is verified in the passenger profile.";
    }

    if (q.includes("whatsapp") || q.includes("support") || q.includes("human")) {
      return "You can escalate to Angel Express support by WhatsApp using the button below.";
    }

    return "I can help with booking, pricing, pickup/drop-off, luggage, airport pickup, student rides, routes, delays, hotel pickup, and support. For urgent help, escalate to WhatsApp support.";
  }

  function sendMessage() {
    if (!question.trim()) {
      Alert.alert("Ask a Question", "Please type your question first.");
      return;
    }

    const userText = question.trim();
    const answer = localAnswer(userText);

    setMessages((prev) => [
      ...prev,
      { role: "user", text: userText },
      { role: "assistant", text: answer },
    ]);

    setQuestion("");
  }

  function escalateToWhatsApp() {
    const recent = messages
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Passenger" : "AI"}: ${m.text}`)
      .join("\n\n");

    const message = `Angel Express Support Request

A passenger needs help from the app.

Recent conversation:
${recent}`;

    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
      message
    )}`;

    Linking.openURL(url);
  }

  const quickQuestions = [
    "How much is Dallas to Austin?",
    "Can I bring luggage?",
    "Do you pick up from DFW Airport?",
    "How does student discount work?",
    "I need help from support",
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>AI Ride Assistant</Text>

      <Text style={styles.subtitle}>
        Ask about booking, pricing, luggage, airport pickup, routes, hotels, and support.
      </Text>

      <View style={styles.quickBox}>
        <Text style={styles.quickTitle}>Quick Questions</Text>

        {quickQuestions.map((item) => (
          <TouchableOpacity
            key={item}
            style={styles.quickButton}
            onPress={() => {
              setQuestion(item);
              setTimeout(() => {
                const answer = localAnswer(item);
                setMessages((prev) => [
                  ...prev,
                  { role: "user", text: item },
                  { role: "assistant", text: answer },
                ]);
                setQuestion("");
              }, 100);
            }}
          >
            <Text style={styles.quickText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chatBox}>
        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              message.role === "user" ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text style={styles.messageRole}>
              {message.role === "user" ? "You" : "Angel Assistant"}
            </Text>
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Ask Angel Ride Assistant..."
        placeholderTextColor="#8A93A3"
        value={question}
        onChangeText={setQuestion}
        multiline
      />

      <TouchableOpacity style={styles.button} onPress={sendMessage}>
        <Text style={styles.buttonText}>Ask Assistant</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.whatsappButton} onPress={escalateToWhatsApp}>
        <Text style={styles.whatsappText}>Escalate to WhatsApp Support</Text>
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
  quickBox: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
    marginBottom: 18,
  },
  quickTitle: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12,
  },
  quickButton: {
    backgroundColor: "#040C18",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  quickText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  chatBox: {
    marginBottom: 18,
  },
  messageBubble: {
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
  },
  aiBubble: {
    backgroundColor: "#071426",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.14)",
  },
  userBubble: {
    backgroundColor: "rgba(212,175,55,0.16)",
  },
  messageRole: {
    color: "#D4AF37",
    fontWeight: "900",
    marginBottom: 6,
  },
  messageText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    backgroundColor: "#071426",
    color: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    fontSize: 16,
    minHeight: 90,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.16)",
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 17,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 14,
  },
  buttonText: {
    color: "#071426",
    fontSize: 17,
    fontWeight: "900",
  },
  whatsappButton: {
    borderWidth: 2,
    borderColor: "#D4AF37",
    paddingVertical: 17,
    borderRadius: 15,
    alignItems: "center",
  },
  whatsappText: {
    color: "#D4AF37",
    fontSize: 17,
    fontWeight: "900",
  },
});