import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  ArrowLeft,
  BriefcaseBusiness,
  CarFront,
  CreditCard,
  Languages,
  MapPinned,
  MessageCircle,
  Plane,
  ShieldCheck,
} from "lucide-react-native";

import { usePassengerTheme, v5Shadow } from "../lib/angelTheme";

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
    zh: "我需要帮助。",
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

const CATEGORIES = [
  "All",
  "Pickup",
  "Destination",
  "Ride Details",
  "Payment",
  "Safety",
];

export default function LanguageAssistantScreen() {
  const { colors, themeMode, toggleTheme } = usePassengerTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedLanguage, setSelectedLanguage] = useState("pidgin");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceText, setSourceText] = useState("");

  const scrollRef = useRef<ScrollView>(null);

  const bgScale = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;

  const resultFade = useRef(new Animated.Value(0)).current;
  const resultTranslateY = useRef(new Animated.Value(18)).current;
  const resultScale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgScale, {
          toValue: 1.04,
          duration: 8500,
          useNativeDriver: true,
        }),
        Animated.timing(bgScale, {
          toValue: 1,
          duration: 8500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.timing(pageFade, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();
  }, []);

  function scrollToTranslation() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    });
  }

  function animateTranslation() {
    resultFade.setValue(0);
    resultTranslateY.setValue(18);
    resultScale.setValue(0.98);

    Animated.parallel([
      Animated.timing(resultFade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.spring(resultTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.spring(resultScale, {
        toValue: 1,
        friction: 8,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function translatePhrase(key: string) {
    const phrase = PHRASES[key];

    setSourceText(phrase.label);
    setTranslatedText(phrase[selectedLanguage] || phrase.en);

    resultFade.setValue(0);
    resultTranslateY.setValue(18);
    resultScale.setValue(0.98);

    setTimeout(() => {
      animateTranslation();
      scrollToTranslation();
    }, 90);

    setTimeout(() => {
      scrollToTranslation();
    }, 320);
  }

  const filteredPhrases = Object.keys(PHRASES).filter((key) =>
    selectedCategory === "All"
      ? true
      : PHRASES[key].category === selectedCategory
  );

  const selectedLanguageName =
    LANGUAGES.find((language) => language.key === selectedLanguage)?.name ||
    "Language";

  const pageTranslate = pageFade.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.bgWrap,
          {
            transform: [{ scale: bgScale }],
          },
        ]}
      >
        <ImageBackground
          source={require("../assets/images/dashboard-bg.png")}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <ScrollView
          ref={scrollRef}
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={19} color={colors.gold} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.themePill}
              onPress={toggleTheme}
            >
              <Text style={styles.themeText}>
                {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: pageFade,
              transform: [{ translateY: pageTranslate }],
            }}
          >
            <Text style={styles.kicker}>
              TRAVEL PHRASE TRANSLATOR
            </Text>

            <Text style={styles.title}>
              Multi-Language Assistant
            </Text>

            <Text style={styles.subtitle}>
              Quick travel translations for passengers, chauffeurs, airport
              pickups, hotels, events, students, and international visitors.
            </Text>

            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Languages size={30} color={colors.navy} />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>
                  Ready Travel Phrases
                </Text>

                <Text style={styles.heroText}>
                  Select a phrase and instantly show the translation to your
                  driver, passenger, hotel staff, or airport support.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Languages size={22} color={colors.gold} />
                <Text style={styles.cardTitle}>
                  Choose Language
                </Text>
              </View>

              <Text style={styles.groupTitle}>
                African Languages
              </Text>

              <View style={styles.languageWrap}>
                {LANGUAGES.filter(
                  (language) => language.group === "African"
                ).map((language) => (
                  <LanguagePill
                    key={language.key}
                    lang={language}
                    selected={selectedLanguage === language.key}
                    onPress={() =>
                      setSelectedLanguage(language.key)
                    }
                    styles={styles}
                  />
                ))}
              </View>

              <Text style={styles.groupTitle}>
                Global Languages
              </Text>

              <View style={styles.languageWrap}>
                {LANGUAGES.filter(
                  (language) => language.group === "Global"
                ).map((language) => (
                  <LanguagePill
                    key={language.key}
                    lang={language}
                    selected={selectedLanguage === language.key}
                    onPress={() =>
                      setSelectedLanguage(language.key)
                    }
                    styles={styles}
                  />
                ))}
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryPill,
                    selectedCategory === category &&
                      styles.categoryPillActive,
                  ]}
                  onPress={() =>
                    setSelectedCategory(category)
                  }
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === category &&
                        styles.categoryTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MessageCircle
                  size={22}
                  color={colors.gold}
                />

                <Text style={styles.cardTitle}>
                  Travel Phrases
                </Text>
              </View>

              {filteredPhrases.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={styles.phraseButton}
                  onPress={() => translatePhrase(key)}
                  activeOpacity={0.85}
                >
                  <View style={styles.phraseIcon}>
                    {getCategoryIcon(
                      PHRASES[key].category,
                      colors
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.phraseCategory}>
                      {PHRASES[key].category}
                    </Text>

                    <Text style={styles.phraseText}>
                      {PHRASES[key].label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {translatedText ? (
              <Animated.View
                onLayout={scrollToTranslation}
                style={[
                  styles.resultCard,
                  {
                    opacity: resultFade,
                    transform: [
                      {
                        translateY: resultTranslateY,
                      },
                      {
                        scale: resultScale,
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <ShieldCheck
                    size={22}
                    color={colors.gold}
                  />

                  <Text style={styles.cardTitle}>
                    Translation
                  </Text>
                </View>

                <Text style={styles.translationLabel}>
                  Original
                </Text>

                <Text style={styles.originalText}>
                  {sourceText}
                </Text>

                <View style={styles.translationBox}>
                  <Text style={styles.translationLabelGold}>
                    {selectedLanguageName}
                  </Text>

                  <Text style={styles.resultText}>
                    {translatedText}
                  </Text>
                </View>
              </Animated.View>
            ) : null}
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

function LanguagePill({
  lang,
  selected,
  onPress,
  styles,
}: any) {
  return (
    <TouchableOpacity
      style={[
        styles.languageButton,
        selected && styles.languageButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text
        style={[
          styles.languageText,
          selected && styles.languageTextActive,
        ]}
      >
        {lang.name}
      </Text>
    </TouchableOpacity>
  );
}

function getCategoryIcon(category: string, colors: any) {
  if (category === "Pickup") {
    return <MapPinned size={18} color={colors.gold} />;
  }

  if (category === "Destination") {
    return <Plane size={18} color={colors.gold} />;
  }

  if (category === "Ride Details") {
    return <CarFront size={18} color={colors.gold} />;
  }

  if (category === "Payment") {
    return <CreditCard size={18} color={colors.gold} />;
  }

  if (category === "Safety") {
    return <AlertTriangle size={18} color={colors.gold} />;
  }

  return (
    <BriefcaseBusiness
      size={18}
      color={colors.gold}
    />
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      overflow: "hidden",
    },

    bgWrap: {
      ...StyleSheet.absoluteFillObject,
    },

    background: {
      flex: 1,
    },

    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
    },

    container: {
      flex: 1,
    },

    content: {
      padding: 22,
      paddingTop: 58,
      paddingBottom: 54,
    },

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
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },

    backText: {
      color: colors.gold,
      fontSize: 15,
      fontWeight: "900",
    },

    themePill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },

    themeText: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    kicker: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginBottom: 10,
    },

    title: {
      color: colors.text,
      fontSize: 34,
      fontWeight: "900",
      marginBottom: 10,
    },

    subtitle: {
      color: colors.text2,
      fontSize: 15.5,
      lineHeight: 23,
      marginBottom: 22,
      fontWeight: "700",
    },

    heroCard: {
      minHeight: 124,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
      backgroundColor: colors.gold,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      ...v5Shadow(colors),
    },

    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },

    heroCopy: {
      flex: 1,
    },

    heroTitle: {
      color: colors.navy,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 6,
    },

    heroText: {
      color: colors.navy,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
      opacity: 0.82,
    },

    card: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: 20,
      marginBottom: 18,
      ...v5Shadow(colors),
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },

    cardTitle: {
      color: colors.gold,
      fontSize: 22,
      fontWeight: "900",
      flex: 1,
    },

    groupTitle: {
      color: colors.gold,
      fontSize: 14,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 10,
    },

    languageWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 16,
    },

    languageButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: colors.card2,
    },

    languageButtonActive: {
      backgroundColor: colors.gold,
      borderColor: colors.gold,
    },

    languageText: {
      color: colors.text,
      fontWeight: "900",
    },

    languageTextActive: {
      color: colors.navy,
    },

    categoryRow: {
      gap: 10,
      marginBottom: 18,
      paddingRight: 18,
    },

    categoryPill: {
      paddingVertical: 11,
      paddingHorizontal: 15,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },

    categoryPillActive: {
      backgroundColor: colors.gold,
      borderColor: colors.gold,
    },

    categoryText: {
      color: colors.text,
      fontWeight: "900",
    },

    categoryTextActive: {
      color: colors.navy,
    },

    phraseButton: {
      backgroundColor: colors.card2,
      borderRadius: 16,
      padding: 15,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      flexDirection: "row",
      gap: 12,
    },

    phraseIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.soft,
      alignItems: "center",
      justifyContent: "center",
    },

    phraseCategory: {
      color: colors.gold,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
    },

    phraseText: {
      color: colors.text,
      fontSize: 15.5,
      lineHeight: 22,
      fontWeight: "700",
    },

    resultCard: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      ...v5Shadow(colors),
    },

    translationLabel: {
      color: colors.text2,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 6,
    },

    originalText: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 16,
      fontWeight: "700",
    },

    translationBox: {
      borderRadius: 18,
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },

    translationLabelGold: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 8,
    },

    resultText: {
      color: colors.text,
      fontSize: 22,
      lineHeight: 32,
      fontWeight: "900",
    },
  });
}