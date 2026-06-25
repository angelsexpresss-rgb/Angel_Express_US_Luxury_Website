import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function AboutScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>About Angel Express</Text>

      <Text style={styles.heading}>Welcome to Angel Express Mobility</Text>

      <Text style={styles.text}>
        Angel Express Mobility is a premium transportation service designed to
        provide safe, comfortable, and reliable travel across Texas and beyond.
      </Text>

      <Text style={styles.text}>
        Whether you're traveling between cities, heading to the airport,
        attending a major event, or visiting family and friends, Angel Express
        delivers a personalized transportation experience focused on
        convenience, professionalism, and peace of mind.
      </Text>

      <SectionTitle title="Our Mission" />

      <Text style={styles.text}>
        To provide dependable transportation solutions that combine comfort,
        safety, and exceptional customer service while making travel simple and
        stress-free.
      </Text>

      <SectionTitle title="Why Ride With Us?" />

      <Bullet text="Professional and courteous drivers" />
      <Bullet text="Safe and reliable transportation" />
      <Bullet text="Real-time booking management" />
      <Bullet text="Student discounts available" />
      <Bullet text="Airport transfers" />
      <Bullet text="Long-distance travel across Texas" />
      <Bullet text="Family and Safety Share features" />
      <Bullet text="Transparent pricing" />

      <SectionTitle title="Service Areas" />

      <Text style={styles.text}>We proudly serve:</Text>

      <Bullet text="Dallas" />
      <Bullet text="Fort Worth" />
      <Bullet text="Austin" />
      <Bullet text="Houston" />
      <Bullet text="San Antonio" />
      <Bullet text="College Station" />
      <Bullet text="Oklahoma City" />

      <Text style={styles.text}>
        And custom destinations upon request.
      </Text>

      <SectionTitle title="Our Core Values" />

      <Card
        title="Comfort"
        text="Travel in clean, comfortable vehicles designed for a relaxing journey."
      />

      <Card
        title="Operational Excellence"
        text="Every ride is managed with professionalism and attention to detail."
      />

      <Card
        title="Reliability"
        text="Dependable service you can trust when it matters most."
      />

      <Card
        title="Safety"
        text="Your safety remains our highest priority from pickup to drop-off."
      />

      <SectionTitle title="Contact Us" />

      <ContactButton
        title="Website"
        onPress={() =>
          Linking.openURL("https://angelexpressus.com")
        }
      />

      <ContactButton
        title="Call (972) 836-7910"
        onPress={() =>
          Linking.openURL("tel:+19728367910")
        }
      />

      <ContactButton
        title="Email Support"
        onPress={() =>
          Linking.openURL(
            "mailto:support@angelexpressus.com"
          )
        }
      />

      <ContactButton
        title="Instagram @angelexpresss"
        onPress={() =>
          Linking.openURL(
            "https://instagram.com/angelexpresss"
          )
        }
      />

      <ContactButton
        title="X @angelexpresss"
        onPress={() =>
          Linking.openURL(
            "https://x.com/angelexpresss"
          )
        }
      />

      <SectionTitle title="App Information" />

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>Version: 1.0.0</Text>
        <Text style={styles.infoText}>
          © 2026 Angel Express Mobility
        </Text>
        <Text style={styles.infoText}>
          All Rights Reserved.
        </Text>
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerText}>
          "Your journey matters. Thank you for choosing Angel
          Express Mobility."
        </Text>
      </View>
    </ScrollView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Bullet({ text }: { text: string }) {
  return <Text style={styles.bullet}>✓ {text}</Text>;
}

function Card({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{text}</Text>
    </View>
  );
}

function ContactButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.contactButton}
      onPress={onPress}
    >
      <Text style={styles.contactButtonText}>
        {title}
      </Text>
    </TouchableOpacity>
  );
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

  title: {
    color: "#D4AF37",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 18,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 16,
  },

  text: {
    color: "#DDE3EA",
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
  },

  sectionTitle: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 14,
  },

  bullet: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#071426",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },

  cardTitle: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },

  cardText: {
    color: "#DDE3EA",
    fontSize: 15,
    lineHeight: 22,
  },

  contactButton: {
    backgroundColor: "#071426",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },

  contactButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  infoCard: {
    backgroundColor: "#071426",
    borderRadius: 16,
    padding: 18,
    marginTop: 10,
  },

  infoText: {
    color: "#FFFFFF",
    fontSize: 15,
    marginBottom: 8,
  },

  footerCard: {
    marginTop: 30,
    padding: 22,
    borderRadius: 18,
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
  },

  footerText: {
    color: "#D4AF37",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "800",
    lineHeight: 28,
  },
});