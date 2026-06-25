import { router } from "expo-router";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function openUrl(url: string) {
  Linking.openURL(url);
}

export default function TravelConciergeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Angel Travel Concierge</Text>
      <Text style={styles.subtitle}>
        Hotels, events, restaurants, flights, tourism, traffic, airports,
        student travel, and World Cup 2026 support.
      </Text>

      <ConciergeCard
        icon="🏨"
        title="Hotels & Reservations"
        text="Find hotels near Dallas, DFW Airport, Love Field, AT&T Stadium, and event venues."
        button="Search Hotels"
        onPress={() => openUrl("https://www.google.com/travel/hotels/Dallas")}
      />

      <ConciergeCard
        icon="🎟️"
        title="Events in Dallas/Fort Worth"
        text="Discover concerts, sports, festivals, conferences, and local events."
        button="Find Events"
        onPress={() =>
          openUrl(
            "https://www.google.com/search?q=events+in+Dallas+Fort+Worth+this+weekend"
          )
        }
      />

      <ConciergeCard
        icon="🏆"
        title="World Cup / Event Mode"
        text="Plan private rides to stadiums, airports, hotels, fan zones, and watch parties."
        button="World Cup Travel Support"
        onPress={() =>
          openUrl(
            "https://www.google.com/search?q=World+Cup+2026+Dallas+matches+AT%26T+Stadium"
          )
        }
      />

      <ConciergeCard
        icon="🍽️"
        title="Restaurants"
        text="Find restaurants near your pickup, hotel, airport, or stadium."
        button="Search Restaurants"
        onPress={() =>
          openUrl("https://www.google.com/maps/search/restaurants+near+Dallas+TX")
        }
      />

      <ConciergeCard
        icon="✈️"
        title="Flights"
        text="Check flight status for DFW Airport and Dallas Love Field."
        button="Check Flights"
        onPress={() => openUrl("https://www.google.com/search?q=DFW+flight+status")}
      />

      <ConciergeCard
        icon="📸"
        title="Tourism"
        text="Explore Dallas attractions, museums, nightlife, shopping, and family activities."
        button="Explore Dallas"
        onPress={() => openUrl("https://www.visitdallas.com/")}
      />

      <ConciergeCard
        icon="🚌"
        title="Bus Routes"
        text="Check Dallas public transit routes, schedules, and nearby stations."
        button="View DART Routes"
        onPress={() => openUrl("https://www.dart.org/")}
      />

      <ConciergeCard
        icon="🚦"
        title="Live Traffic Report"
        text="Check live traffic before your ride and plan extra time."
        button="Open Live Traffic"
        onPress={() =>
          openUrl("https://www.google.com/maps/@32.7767,-96.7970,11z/data=!5m1!1e1")
        }
      />

      <ConciergeCard
        icon="🛫"
        title="Airport Guide"
        text="DFW Airport and Dallas Love Field pickup guidance, terminals, and travel tips."
        button="Airport Info"
        onPress={() =>
          openUrl("https://www.google.com/search?q=DFW+Airport+terminal+guide")
        }
      />

      <ConciergeCard
        icon="🎓"
        title="Student Travel Guide"
        text="Campus rides for UTD, UTA, SMU, UNT, Texas A&M, and UT Austin."
        button="Open Student Travel"
        onPress={() => router.push("/student-travel" as any)}
      />

      <ConciergeCard
        icon="🌍"
        title="World Cup 2026 Travel Support"
        text="Airport pickup, hotel transfer, stadium ride, group travel, and private city-to-city rides."
        button="Plan World Cup Ride"
        onPress={() => router.push("/book-ride" as any)}
      />
    </ScrollView>
  );
}

function ConciergeCard({
  icon,
  title,
  text,
  button,
  onPress,
}: {
  icon: string;
  title: string;
  text: string;
  button: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{text}</Text>

      <TouchableOpacity style={styles.button} onPress={onPress}>
        <Text style={styles.buttonText}>{button}</Text>
      </TouchableOpacity>
    </View>
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
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.18)",
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10,
  },
  cardText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#D4AF37",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#071426",
    fontSize: 16,
    fontWeight: "900",
  },
});