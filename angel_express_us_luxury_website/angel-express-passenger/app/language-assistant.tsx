import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CarFront,
  Clock,
  CreditCard,
  Languages,
  MapPinned,
  MessageCircle,
  Plane,
  ShieldCheck,
} from "lucide-react-native";

import {
  AE_COLORS,
  AngelCard,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

const GOLD = AE_COLORS.gold;

const LANGUAGES = [
  { key: "en", name: "English", group: "Global" },
  { key: "pidgin", name: "Nigerian Pidgin", group: "African" },
  { key: "yo", name: "Yoruba", group: "African" },
  { key: "ig", name: "Igbo", group: "African" },
  { key: "ha", name: "Hausa", group: "African" },
  { key: "sw", name: "Swahili", group: "African" },
  { key: "es", name: "Spanish", group: "Global" },
  { key: "fr", name: "French", group: "Global" },
  { key: "ar", name: "Arabic", group: "Global" },
  { key: "pt", name: "Portuguese", group: "Global" },
  { key: "hi", name: "Hindi", group: "Global" },
  { key: "zh", name: "Chinese", group: "Global" },
];

const PHRASES: any = {
  pickup_location: {
    category: "Pickup",
    label: "Where is my pickup location?",
    en: "Where is my pickup location?",
    pidgin: "Abeg, where my pickup place dey?",
    yo: "Nibo ni ibi ti won ma gbe mi wa?",
    ig: "Ebee ka ebe a ga-eburu m di?",
    ha: "Ina wurin da za a dauke ni?",
    sw: "Mahali pa kunichukua ni wapi?",
    es: "¿Dónde está mi lugar de recogida?",
    fr: "Où se trouve mon lieu de prise en charge ?",
    ar: "أين موقع استلامي؟",
    pt: "Onde é o meu local de embarque?",
    hi: "मेरा पिकअप स्थान कहाँ है?",
    zh: "我的接送地点在哪里？",
  },
  driver_arrived: {
    category: "Pickup",
    label: "Has my driver arrived?",
    en: "Has my driver arrived?",
    pidgin: "My driver don reach?",
    yo: "Ṣe awakọ mi ti de?",
    ig: "Onye ọkwọ ụgbọala m erutela?",
    ha: "Direbana ya iso?",
    sw: "Dereva wangu amefika?",
    es: "¿Ya llegó mi conductor?",
    fr: "Mon chauffeur est-il arrivé ?",
    ar: "هل وصل السائق؟",
    pt: "O meu motorista já chegou?",
    hi: "क्या मेरा ड्राइवर आ गया है?",
    zh: "我的司机到了吗？",
  },
  looking_driver: {
    category: "Pickup",
    label: "I am looking for my driver.",
    en: "I am looking for my driver.",
    pidgin: "I dey find my driver.",
    yo: "Mo n wa awakọ mi.",
    ig: "Ana m achọ onye ọkwọ ụgbọala m.",
    ha: "Ina neman direbana.",
    sw: "Ninamtafuta dereva wangu.",
    es: "Estoy buscando a mi conductor.",
    fr: "Je cherche mon chauffeur.",
    ar: "أنا أبحث عن السائق الخاص بي.",
    pt: "Estou procurando meu motorista.",
    hi: "मैं अपने ड्राइवर को ढूंढ रहा/रही हूँ।",
    zh: "我正在找我的司机。",
  },
  airport: {
    category: "Destination",
    label: "Please take me to the airport.",
    en: "Please take me to the airport.",
    pidgin: "Abeg carry me go airport.",
    yo: "E jowo, gbe mi lo si papa oko ofurufu.",
    ig: "Biko buru m gaa ọdụ ụgbọ elu.",
    ha: "Don Allah kai ni filin jirgin sama.",
    sw: "Tafadhali nipeleke uwanja wa ndege.",
    es: "Por favor, lléveme al aeropuerto.",
    fr: "Veuillez m'emmener à l'aéroport.",
    ar: "من فضلك خذني إلى المطار.",
    pt: "Por favor, leve-me ao aeroporto.",
    hi: "कृपया मुझे हवाई अड्डे ले चलें।",
    zh: "请带我去机场。",
  },
  hotel: {
    category: "Destination",
    label: "Please take me to my hotel.",
    en: "Please take me to my hotel.",
    pidgin: "Abeg carry me go my hotel.",
    yo: "E jowo, gbe mi lo si hotẹẹli mi.",
    ig: "Biko buru m gaa ụlọ nkwari akụ m.",
    ha: "Don Allah kai ni otal dina.",
    sw: "Tafadhali nipeleke hotelini kwangu.",
    es: "Por favor, lléveme a mi hotel.",
    fr: "Veuillez m'emmener à mon hôtel.",
    ar: "من فضلك خذني إلى فندقي.",
    pt: "Por favor, leve-me ao meu hotel.",
    hi: "कृपया मुझे मेरे होटल ले चलें।",
    zh: "请带我去我的酒店。",
  },
  stadium: {
    category: "Destination",
    label: "Please take me to the stadium.",
    en: "Please take me to the stadium.",
    pidgin: "Abeg carry me go stadium.",
    yo: "E jowo, gbe mi lo si papa isere.",
    ig: "Biko buru m gaa ama egwuregwu.",
    ha: "Don Allah kai ni filin wasa.",
    sw: "Tafadhali nipeleke uwanjani.",
    es: "Por favor, lléveme al estadio.",
    fr: "Veuillez m'emmener au stade.",
    ar: "من فضلك خذني إلى الملعب.",
    pt: "Por favor, leve-me ao estádio.",
    hi: "कृपया मुझे स्टेडियम ले चलें।",
    zh: "请带我去体育场。",
  },
  luggage: {
    category: "Ride Details",
    label: "I have luggage with me.",
    en: "I have luggage with me.",
    pidgin: "I get luggage with me.",
    yo: "Mo ni eru pelu mi.",
    ig: "Enwere m akpa njem.",
    ha: "Ina da kaya tare da ni.",
    sw: "Nina mizigo pamoja nami.",
    es: "Tengo equipaje conmigo.",
    fr: "J'ai des bagages avec moi.",
    ar: "لدي أمتعة معي.",
    pt: "Tenho bagagem comigo.",
    hi: "मेरे पास सामान है।",
    zh: "我有行李。",
  },
  wait: {
    category: "Ride Details",
    label: "Please wait for me.",
    en: "Please wait for me.",
    pidgin: "Abeg wait for me.",
    yo: "E jowo, duro de mi.",
    ig: "Biko chere m.",
    ha: "Don Allah jira ni.",
    sw: "Tafadhali nisubiri.",
    es: "Por favor, espéreme.",
    fr: "Veuillez m'attendre.",
    ar: "من فضلك انتظرني.",
    pt: "Por favor, espere por mim.",
    hi: "कृपया मेरा इंतज़ार करें।",
    zh: "请等我。",
  },
  running_late: {
    category: "Ride Details",
    label: "I am running late.",
    en: "I am running late.",
    pidgin: "I dey come late small.",
    yo: "Mo n pe die.",
    ig: "Ana m abia nwayọ.",
    ha: "Ina dan makara.",
    sw: "Nimechelewa kidogo.",
    es: "Voy un poco tarde.",
    fr: "Je suis en retard.",
    ar: "سأتأخر قليلاً.",
    pt: "Estou um pouco atrasado.",
    hi: "मुझे थोड़ी देर हो रही है।",
    zh: "我会晚一点。",
  },
  payment: {
    category: "Payment",
    label: "How do I pay for my ride?",
    en: "How do I pay for my ride?",
    pidgin: "How I go pay for my ride?",
    yo: "Bawo ni mo se le sanwo fun irin ajo mi?",
    ig: "Kedu ka m ga-esi kwụọ ụgwọ njem m?",
    ha: "Ta yaya zan biya kudin tafiyata?",
    sw: "Nitalipaje safari yangu?",
    es: "¿Cómo pago mi viaje?",
    fr: "Comment puis-je payer mon trajet ?",
    ar: "كيف أدفع مقابل رحلتي؟",
    pt: "Como pago pela minha viagem?",
    hi: "मैं अपनी यात्रा का भुगतान कैसे करूँ?",
    zh: "我如何支付车费？",
  },
  receipt: {
    category: "Payment",
    label: "Can I get a receipt?",
    en: "Can I get a receipt?",
    pidgin: "I fit get receipt?",
    yo: "Se mo le gba risiti?",
    ig: "Enwere m ike inweta risiti?",
    ha: "Zan iya samun rasit?",
    sw: "Naweza kupata risiti?",
    es: "¿Puedo recibir un recibo?",
    fr: "Puis-je obtenir un reçu ?",
    ar: "هل يمكنني الحصول على إيصال؟",
    pt: "Posso receber um recibo?",
    hi: "क्या मुझे रसीद मिल सकती है?",
    zh: "我可以拿到收据吗？",
  },
  help: {
    category: "Safety",
    label: "I need help.",
    en: "I need help.",
    pidgin: "Abeg I need help.",
    yo: "Mo nilo iranlowo.",
    ig: "Achọrọ m enyemaka.",
    ha: "Ina bukatar taimako.",
    sw: "Nahitaji msaada.",
    es: "Necesito ayuda.",
    fr: "J'ai besoin d'aide.",
    ar: "أحتاج إلى مساعدة.",
    pt: "Preciso de ajuda.",
    hi: "मुझे मदद चाहिए।",
    zh: "我需要 मदद चाहिए।",
  },
  emergency: {
    category: "Safety",
    label: "This is an emergency.",
    en: "This is an emergency.",
    pidgin: "This one na emergency.",
    yo: "Eyi je pajawiri.",
    ig: "Nke a bu ihe mberede.",
    ha: "Wannan gaggawa ce.",
    sw: "Hii ni dharura.",
    es: "Esto es una emergencia.",
    fr: "C'est une urgence.",
    ar: "هذه حالة طارئة.",
    pt: "Isto é uma emergência.",
    hi: "यह आपातकाल है।",
    zh: "这是紧急情况。",
  },
};

const CATEGORIES = ["All", "Pickup", "Destination", "Ride Details", "Payment", "Safety"];

export default function LanguageAssistantScreen() {
  const [selectedLanguage, setSelectedLanguage] = useState("pidgin");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceText, setSourceText] = useState("");

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slowBackgroundZoom(bgScale).start();
    fadeUp(pageFade, 80).start();
  }, []);

  function translatePhrase(key: string) {
    setSourceText(PHRASES[key].label);
    setTranslatedText(PHRASES[key][selectedLanguage] || PHRASES[key].en);
  }

  const filteredPhrases = Object.keys(PHRASES).filter((key) =>
    selectedCategory === "All" ? true : PHRASES[key].category === selectedCategory
  );

  const selectedLanguageName =
    LANGUAGES.find((l) => l.key === selectedLanguage)?.name || "Language";

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
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>

          <Animated.View style={{ opacity: pageFade, transform: [{ translateY: pageTranslate }] }}>
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>A  TRAVEL PHRASE TRANSLATOR</Text>
            </View>

            <Text style={styles.title}>Multi-Language Assistant</Text>

            <Text style={styles.subtitle}>
              Quick travel translations for passengers, chauffeurs, airport pickups,
              hotels, events, students, and international visitors.
            </Text>

            <AngelCard variant="gold" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Languages size={30} color={AE_COLORS.navy2} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Ready Travel Phrases</Text>
                <Text style={styles.heroText}>
                  Select a phrase and instantly show the translation to your driver,
                  passenger, hotel staff, or airport support.
                </Text>
              </View>
            </AngelCard>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Languages size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Choose Language</Text>
              </View>

              <Text style={styles.groupTitle}>African Languages</Text>
              <View style={styles.languageWrap}>
                {LANGUAGES.filter((l) => l.group === "African").map((lang) => (
                  <LanguagePill
                    key={lang.key}
                    lang={lang}
                    selected={selectedLanguage === lang.key}
                    onPress={() => setSelectedLanguage(lang.key)}
                  />
                ))}
              </View>

              <Text style={styles.groupTitle}>Global Languages</Text>
              <View style={styles.languageWrap}>
                {LANGUAGES.filter((l) => l.group === "Global").map((lang) => (
                  <LanguagePill
                    key={lang.key}
                    lang={lang}
                    selected={selectedLanguage === lang.key}
                    onPress={() => setSelectedLanguage(lang.key)}
                  />
                ))}
              </View>
            </AngelCard>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <AngelCard style={styles.card}>
              <View style={styles.cardHeader}>
                <MessageCircle size={22} color={GOLD} />
                <Text style={styles.cardTitle}>Travel Phrases</Text>
              </View>

              {filteredPhrases.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={styles.phraseButton}
                  onPress={() => translatePhrase(key)}
                >
                  <View style={styles.phraseIcon}>
                    {getCategoryIcon(PHRASES[key].category)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.phraseCategory}>{PHRASES[key].category}</Text>
                    <Text style={styles.phraseText}>{PHRASES[key].label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </AngelCard>

            {translatedText ? (
              <AngelCard style={styles.resultCard}>
                <View style={styles.cardHeader}>
                  <ShieldCheck size={22} color={GOLD} />
                  <Text style={styles.cardTitle}>Translation</Text>
                </View>

                <Text style={styles.translationLabel}>Original</Text>
                <Text style={styles.originalText}>{sourceText}</Text>

                <View style={styles.translationBox}>
                  <Text style={styles.translationLabelGold}>{selectedLanguageName}</Text>
                  <Text style={styles.resultText}>{translatedText}</Text>
                </View>
              </AngelCard>
            ) : null}
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function LanguagePill({ lang, selected, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.languageButton, selected && styles.languageButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.languageText, selected && styles.languageTextActive]}>
        {lang.name}
      </Text>
    </TouchableOpacity>
  );
}

function getCategoryIcon(category: string) {
  if (category === "Pickup") return <MapPinned size={18} color={GOLD} />;
  if (category === "Destination") return <Plane size={18} color={GOLD} />;
  if (category === "Ride Details") return <CarFront size={18} color={GOLD} />;
  if (category === "Payment") return <CreditCard size={18} color={GOLD} />;
  if (category === "Safety") return <AlertTriangle size={18} color={GOLD} />;
  return <BriefcaseBusiness size={18} color={GOLD} />;
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
  kickerText: { color: GOLD, fontSize: 11, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: GOLD, fontSize: 34, fontWeight: "900", marginBottom: 10 },
  subtitle: { color: AE_COLORS.textSoft, fontSize: 16, lineHeight: 24, marginBottom: 24 },
  heroCard: { minHeight: 124, flexDirection: "row", alignItems: "center", marginBottom: 18 },
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
  heroTitle: { color: AE_COLORS.navy2, fontSize: 24, fontWeight: "900", marginBottom: 6 },
  heroText: { color: "rgba(6,17,31,0.78)", fontSize: 15, lineHeight: 21, fontWeight: "700" },
  card: { padding: 20, marginBottom: 18 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  cardTitle: { color: GOLD, fontSize: 22, fontWeight: "900", flex: 1 },
  groupTitle: { color: GOLD, fontSize: 14, fontWeight: "900", textTransform: "uppercase", marginBottom: 10 },
  languageWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  languageButton: {
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  languageButtonActive: { backgroundColor: GOLD },
  languageText: { color: AE_COLORS.white, fontWeight: "900" },
  languageTextActive: { color: AE_COLORS.navy2 },
  categoryRow: { gap: 10, marginBottom: 18 },
  categoryPill: {
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  categoryPillActive: { backgroundColor: GOLD },
  categoryText: { color: AE_COLORS.white, fontWeight: "900" },
  categoryTextActive: { color: AE_COLORS.navy2 },
  phraseButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.14)",
    flexDirection: "row",
    gap: 12,
  },
  phraseIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  phraseCategory: { color: GOLD, fontSize: 11, fontWeight: "900", textTransform: "uppercase", marginBottom: 4 },
  phraseText: { color: AE_COLORS.white, fontSize: 15.5, lineHeight: 22 },
  resultCard: { padding: 20, borderColor: "rgba(212,175,55,0.36)" },
  translationLabel: { color: AE_COLORS.muted, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginBottom: 6 },
  originalText: { color: AE_COLORS.white, fontSize: 16, lineHeight: 24, marginBottom: 16 },
  translationBox: {
    borderRadius: 18,
    backgroundColor: "rgba(212,175,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
    padding: 16,
  },
  translationLabelGold: { color: GOLD, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginBottom: 8 },
  resultText: { color: AE_COLORS.white, fontSize: 22, lineHeight: 32, fontWeight: "900" },
});