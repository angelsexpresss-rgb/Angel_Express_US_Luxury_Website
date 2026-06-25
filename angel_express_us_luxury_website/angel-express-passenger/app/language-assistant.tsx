import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const LANGUAGES = [
  { key: "en", name: "English" },
  { key: "es", name: "Spanish" },
  { key: "fr", name: "French" },
  { key: "ar", name: "Arabic" },
  { key: "pt", name: "Portuguese" },
];

const PHRASES: any = {
  pickup: {
    label: "Where is my pickup location?",
    en: "Where is my pickup location?",
    es: "¿Dónde está mi lugar de recogida?",
    fr: "Où se trouve mon lieu de prise en charge ?",
    ar: "أين موقع استلامي؟",
    pt: "Onde é o meu local de embarque?",
  },
  driver: {
    label: "I am looking for my driver.",
    en: "I am looking for my driver.",
    es: "Estoy buscando a mi conductor.",
    fr: "Je cherche mon chauffeur.",
    ar: "أنا أبحث عن السائق الخاص بي.",
    pt: "Estou procurando meu motorista.",
  },
  airport: {
    label: "Please take me to the airport.",
    en: "Please take me to the airport.",
    es: "Por favor, lléveme al aeropuerto.",
    fr: "Veuillez m'emmener à l'aéroport.",
    ar: "من فضلك خذني إلى المطار.",
    pt: "Por favor, leve-me ao aeroporto.",
  },
  hotel: {
    label: "Please take me to my hotel.",
    en: "Please take me to my hotel.",
    es: "Por favor, lléveme a mi hotel.",
    fr: "Veuillez m'emmener à mon hôtel.",
    ar: "من فضلك خذني إلى فندقي.",
    pt: "Por favor, leve-me ao meu hotel.",
  },
  stadium: {
    label: "Please take me to the stadium.",
    en: "Please take me to the stadium.",
    es: "Por favor, lléveme al estadio.",
    fr: "Veuillez m'emmener au stade.",
    ar: "من فضلك خذني إلى الملعب.",
    pt: "Por favor, leve-me ao estádio.",
  },
  luggage: {
    label: "I have luggage with me.",
    en: "I have luggage with me.",
    es: "Tengo equipaje conmigo.",
    fr: "J'ai des bagages avec moi.",
    ar: "لدي أمتعة معي.",
    pt: "Tenho bagagem comigo.",
  },
  emergency: {
    label: "I need help.",
    en: "I need help.",
    es: "Necesito ayuda.",
    fr: "J'ai besoin d'aide.",
    ar: "أحتاج إلى مساعدة.",
    pt: "Preciso de ajuda.",
  },
};

export default function LanguageAssistantScreen() {
  const [selectedLanguage, setSelectedLanguage] = useState("es");
  const [customText, setCustomText] = useState("");
  const [translatedText, setTranslatedText] = useState("");

  function translatePhrase(key: string) {
    setTranslatedText(PHRASES[key][selectedLanguage]);
  }

  function translateCustom() {
    if (!customText.trim()) {
      Alert.alert("Enter Text", "Please type something to translate.");
      return;
    }

    setTranslatedText(
      `AI translation will translate this into ${
        LANGUAGES.find((l) => l.key === selectedLanguage)?.name
      }:\n\n"${customText.trim()}"`
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Multi-Language AI Assistant</Text>
      <Text style={styles.subtitle}>
        Translate common travel phrases for World Cup visitors, airport pickups,
        hotel transfers, and Angel Express rides.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Choose Language</Text>

        <View style={styles.languageWrap}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.key}
              style={[
                styles.languageButton,
                selectedLanguage === lang.key && styles.languageButtonActive,
              ]}
              onPress={() => setSelectedLanguage(lang.key)}
            >
              <Text
                style={[
                  styles.languageText,
                  selectedLanguage === lang.key && styles.languageTextActive,
                ]}
              >
                {lang.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Travel Phrases</Text>

        {Object.keys(PHRASES).map((key) => (
          <TouchableOpacity
            key={key}
            style={styles.phraseButton}
            onPress={() => translatePhrase(key)}
          >
            <Text style={styles.phraseText}>{PHRASES[key].label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Custom Translation</Text>

        <TextInput
          style={styles.input}
          placeholder="Type a message for your driver or hotel..."
          placeholderTextColor="#8A93A3"
          value={customText}
          onChangeText={setCustomText}
          multiline
        />

        <TouchableOpacity style={styles.button} onPress={translateCustom}>
          <Text style={styles.buttonText}>Translate Custom Message</Text>
        </TouchableOpacity>
      </View>

      {translatedText ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Translation</Text>
          <Text style={styles.resultText}>{translatedText}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#040C18" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 50 },
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
  card: {
    backgroundColor: "#071426",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },
  cardTitle: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },
  languageWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  languageButton: {
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  languageButtonActive: {
    backgroundColor: "#D4AF37",
  },
  languageText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  languageTextActive: {
    color: "#071426",
  },
  phraseButton: {
    backgroundColor: "#0B1B31",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.12)",
  },
  phraseText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    backgroundColor: "#040C18",
    color: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
    textAlignVertical: "top",
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#071426",
    fontWeight: "900",
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: "#10233D",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
  },
  resultTitle: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
  },
  resultText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 28,
  },
});