import { router } from "expo-router";
import {
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  Animated,
  Image,
  ImageBackground,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  AE_COLORS,
  AngelCard,
  fadeUp,
  slowBackgroundZoom,
} from "../components/angel";

import {
  useAngelTheme,
  type AngelThemeColors,
} from "../lib/angelTheme";

type TermsSection = {
  number: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const LAST_UPDATED = "July 18, 2026";

const TERMS_SECTIONS: TermsSection[] = [
  {
    number: "1",
    title: "Acceptance of These Terms",
    paragraphs: [
      "These Terms of Service govern your access to and use of the Angel Express website, passenger application, driver application, owner application, booking services, communication tools, transportation coordination services, and related features.",
      "By creating an account, requesting a ride, accepting a ride, using an Angel Express service, or otherwise accessing the Angel Express platform, you confirm that you have read, understood, and agreed to these Terms of Service and the Angel Express Privacy Policy.",
      "If you do not agree to these Terms, you must not create an account, request transportation, provide transportation through the platform, or otherwise use Angel Express services.",
    ],
  },
  {
    number: "2",
    title: "About Angel Express",
    paragraphs: [
      "Angel Express provides technology, booking, communication, transportation coordination, customer support, and related mobility services. The specific nature of a trip may depend on the route, vehicle, passenger requirements, driver availability, service category, payment arrangement, and applicable law.",
      "Angel Express may provide or coordinate airport transfers, student transportation, long-distance transportation, private rides, shared rides, group transportation, scheduled rides, business transportation, and other mobility services made available through the platform.",
      "The availability of any service is not guaranteed. Services may be limited by geography, driver availability, weather, traffic, vehicle capacity, regulatory requirements, safety concerns, operational conditions, or other circumstances.",
    ],
  },
  {
    number: "3",
    title: "Eligibility",
    paragraphs: [
      "You must be legally capable of entering into a binding agreement to create and use an Angel Express account.",
      "Users under the age of 18 may use Angel Express only with the involvement, authorization, and supervision of a parent, legal guardian, school, organization, or other legally responsible adult, where permitted.",
      "You may not use the platform if you have previously been permanently removed from Angel Express for fraud, violence, harassment, safety violations, unlawful conduct, or another serious breach of these Terms.",
    ],
  },
  {
    number: "4",
    title: "Passenger Accounts",
    paragraphs: [
      "You must provide accurate, current, and complete information when creating and maintaining your passenger account.",
      "You are responsible for safeguarding your password, account credentials, verification codes, and devices. You must notify Angel Express promptly if you suspect unauthorized access to your account.",
      "You may not create an account using another person's identity, email address, telephone number, payment information, student information, or other personal information without lawful authorization.",
      "Angel Express may require additional verification before allowing access to certain services, discounts, payment methods, account functions, or transportation features.",
    ],
    bullets: [
      "Keep your name, telephone number, email address, and emergency contact information current.",
      "Do not allow another person to use your account without authorization.",
      "Do not create duplicate accounts to obtain discounts, credits, promotions, or referral benefits.",
      "Respond promptly when Angel Express contacts you about an active booking or safety issue.",
    ],
  },
  {
    number: "5",
    title: "Profile Completion",
    paragraphs: [
      "New passengers may be required to complete their profile before accessing the full Angel Express platform.",
      "Required profile information may include your legal or preferred name, telephone number, emergency contact, home city, accessibility information, notification preferences, and other information reasonably needed to provide transportation services.",
      "Angel Express may restrict booking access until required profile information has been completed and these Terms and the Privacy Policy have been accepted.",
    ],
  },
  {
    number: "6",
    title: "Driver Applications",
    paragraphs: [
      "Creating a passenger account does not automatically create a driver account or authorize a user to provide transportation through Angel Express.",
      "A person seeking to become an Angel Express driver must complete a separate driver application and provide all requested information and documents.",
      "Driver approval may require identity verification, driver's license review, vehicle review, insurance verification, background screening, safety screening, document verification, training, interviews, and other checks permitted or required by law.",
      "Angel Express may approve, reject, suspend, deactivate, or request additional information from a driver applicant at its discretion, subject to applicable law.",
    ],
    bullets: [
      "Driver approval is not guaranteed.",
      "A driver must keep all licenses, insurance, registrations, permits, and required documents current.",
      "A driver may not allow an unapproved person to complete an Angel Express trip.",
      "A driver must comply with all safety, conduct, communication, payment, and trip-completion requirements.",
    ],
  },
  {
    number: "7",
    title: "Ride Requests and Bookings",
    paragraphs: [
      "A booking request is not guaranteed until Angel Express confirms the booking or assigns an eligible driver.",
      "You must provide accurate pickup, destination, date, time, passenger count, luggage, accessibility, contact, and trip information.",
      "A booking may be submitted through the Angel Express website, passenger application, customer support, or another approved Angel Express channel.",
      "Angel Express may contact you to verify, clarify, modify, or confirm booking details before assigning a driver.",
      "You are responsible for reviewing your booking details before confirming your request.",
    ],
  },
  {
    number: "8",
    title: "Scheduled Rides",
    paragraphs: [
      "Scheduled pickup times are estimates based on the information available when the booking is created.",
      "Traffic, weather, road closures, vehicle issues, driver availability, prior trip delays, law-enforcement activity, airport congestion, and other conditions may affect arrival and completion times.",
      "Passengers should allow additional travel time for airports, examinations, medical appointments, court appearances, interviews, business meetings, international travel, and other time-sensitive events.",
      "Angel Express does not guarantee that a passenger will arrive by a particular airline departure, appointment, event, or deadline.",
    ],
  },
  {
    number: "9",
    title: "Pricing and Fare Estimates",
    paragraphs: [
      "The fare displayed before booking may be an estimate. The final fare may change when the actual route, mileage, waiting time, tolls, trip duration, passenger count, luggage, stops, service category, schedule, or other material trip details differ from the information originally provided.",
      "Angel Express may use a base fare, mileage rate, time rate, route price, fixed price, service fee, waiting fee, cancellation fee, toll charge, airport fee, cleaning fee, damage charge, or other disclosed charge.",
      "Where a final price is provided and accepted, Angel Express may still adjust that price when the passenger materially changes the booking or provides inaccurate or incomplete information.",
      "All prices are shown in United States dollars unless otherwise stated.",
    ],
  },
  {
    number: "10",
    title: "Payments",
    paragraphs: [
      "Passengers must pay all valid charges associated with their bookings.",
      "Payment may be collected before a ride, during a ride, after ride completion, or according to another arrangement approved by Angel Express.",
      "Available payment methods may include card payments, digital payment services, electronic transfers, cash, Zelle, Cash App, invoicing, credits, or other methods approved by Angel Express.",
      "You authorize Angel Express and its payment providers to process charges, adjustments, refunds, holds, or other payment activity associated with your use of the service.",
      "A failed, reversed, disputed, incomplete, or unauthorized payment may result in account restrictions or collection activity.",
    ],
  },
  {
    number: "11",
    title: "Tips",
    paragraphs: [
      "Tips are optional unless a gratuity has been clearly disclosed as part of a group, business, event, or contracted transportation arrangement.",
      "Where tipping is available, passengers may choose the amount. Angel Express may process tips through the platform or permit passengers to provide tips directly to drivers.",
    ],
  },
  {
    number: "12",
    title: "Cancellations and No-Shows",
    paragraphs: [
      "Passengers should cancel a booking as soon as they know the ride is no longer needed.",
      "Angel Express may charge a cancellation fee when a passenger cancels after a driver has been assigned, after the driver has begun traveling to the pickup location, close to the scheduled pickup time, or after operational costs have already been incurred.",
      "A passenger may be treated as a no-show when the driver arrives at the correct pickup location, attempts to contact the passenger, waits for the applicable waiting period, and the passenger cannot be located or does not respond.",
      "Repeated cancellations, no-shows, or misuse of scheduled bookings may result in booking restrictions or account suspension.",
    ],
  },
  {
    number: "13",
    title: "Refunds and Credits",
    paragraphs: [
      "Refunds and account credits are determined based on the facts of the booking, payment status, cancellation timing, services already provided, and applicable law.",
      "Submitting a refund request does not guarantee approval.",
      "Promotional credits, referral credits, rewards, discounts, and goodwill credits may have expiration dates, eligibility conditions, usage restrictions, and no cash value unless otherwise required by law.",
      "Angel Express may correct credits obtained through error, duplicate accounts, fraud, abuse, or a violation of these Terms.",
    ],
  },
  {
    number: "14",
    title: "Airport Transportation",
    paragraphs: [
      "Passengers requesting airport transportation are responsible for providing the correct airport, airline, terminal, flight information, pickup location, pickup time, and luggage details.",
      "Airline schedules, security lines, baggage delays, terminal changes, airport traffic, construction, weather, and other airport conditions are outside Angel Express control.",
      "Passengers should select a pickup time that allows sufficient time for check-in, baggage handling, security screening, terminal transportation, and airline boarding requirements.",
      "Additional waiting, parking, toll, terminal, or airport access charges may apply where disclosed or reasonably incurred.",
    ],
  },
  {
    number: "15",
    title: "Student Discounts",
    paragraphs: [
      "Student discounts are available only to eligible passengers who complete Angel Express student verification requirements.",
      "Angel Express may request a current student email address, school name, student identification information, enrollment evidence, expiration information, or other reasonable verification.",
      "Student verification does not guarantee that every trip, route, service category, or promotion will qualify for a discount.",
      "Student discounts may not be transferred, sold, shared, duplicated, or combined with another offer unless Angel Express expressly permits it.",
      "Angel Express may remove student status where information is false, expired, unverifiable, or misused.",
    ],
  },
  {
    number: "16",
    title: "Passenger Responsibilities",
    paragraphs: [
      "Passengers must behave respectfully and must not interfere with the safe operation of a vehicle.",
      "Passengers must be ready at the agreed pickup location and must follow reasonable pickup, loading, seating, safety, and communication instructions.",
      "Passengers are responsible for confirming that all children, dependents, guests, luggage, mobility devices, and personal property are properly accounted for before the vehicle departs.",
    ],
    bullets: [
      "Wear a seat belt whenever one is available.",
      "Do not threaten, assault, harass, discriminate against, or intimidate a driver or another passenger.",
      "Do not damage, contaminate, or misuse a vehicle.",
      "Do not bring unlawful weapons, illegal drugs, hazardous materials, or prohibited items into a vehicle.",
      "Do not request or encourage unsafe, reckless, or unlawful driving.",
      "Do not distract the driver or interfere with vehicle controls.",
      "Do not exceed the stated passenger or luggage capacity.",
      "Do not smoke or vape in a vehicle unless Angel Express expressly authorizes it.",
    ],
  },
  {
    number: "17",
    title: "Children and Car Seats",
    paragraphs: [
      "The person booking transportation for a child is responsible for disclosing that a child will be traveling and for complying with all applicable child-restraint and supervision requirements.",
      "Unless Angel Express expressly confirms otherwise, passengers are responsible for providing and properly installing an appropriate child safety seat.",
      "A driver may refuse or cancel a trip when safe and legally compliant transportation of a child cannot be provided.",
      "A minor may not travel without an adult unless Angel Express has expressly approved the arrangement and all required authorizations have been completed.",
    ],
  },
  {
    number: "18",
    title: "Accessibility and Special Assistance",
    paragraphs: [
      "Passengers should disclose accessibility needs, mobility devices, service animals, assistance requirements, or other relevant transportation needs before the scheduled ride whenever possible.",
      "Angel Express will seek to provide reasonable support consistent with available vehicles, driver capabilities, safety requirements, and applicable law.",
      "A booking may require modification or a different vehicle when the selected vehicle cannot safely accommodate a passenger, mobility device, luggage, or requested assistance.",
    ],
  },
  {
    number: "19",
    title: "Service Animals and Pets",
    paragraphs: [
      "Passengers should notify Angel Express in advance when traveling with an animal.",
      "Service animals will be accommodated as required by applicable law.",
      "Pets that are not service animals may require prior approval, an appropriate carrier, protective covering, a pet fee, or a particular vehicle.",
      "The passenger is responsible for controlling the animal and for damage, excessive cleaning, injury, or disruption caused by the animal, except where prohibited by law.",
    ],
  },
  {
    number: "20",
    title: "Luggage and Personal Property",
    paragraphs: [
      "Passengers must disclose unusually large, heavy, valuable, fragile, or excessive luggage before booking.",
      "Angel Express may refuse items that cannot be transported safely or legally.",
      "Passengers are responsible for loading, identifying, monitoring, and collecting their personal property, except where assistance has been specifically agreed.",
      "Angel Express is not responsible for ordinary loss, theft, or damage to unattended or forgotten property except to the extent responsibility cannot legally be excluded.",
    ],
  },
  {
    number: "21",
    title: "Lost and Found",
    paragraphs: [
      "Passengers should contact Angel Express promptly after discovering that an item may have been left in a vehicle.",
      "Angel Express may attempt to contact the driver and coordinate return of the item but does not guarantee that the item will be located or returned.",
      "A reasonable return, delivery, shipping, or driver-time fee may apply.",
      "Unclaimed property may be handled, stored, transferred, donated, discarded, or reported according to Angel Express procedures and applicable law.",
    ],
  },
  {
    number: "22",
    title: "Cleaning and Damage Charges",
    paragraphs: [
      "A passenger may be responsible for reasonable cleaning, repair, replacement, downtime, towing, or other costs caused by the passenger, the passenger's guest, child, pet, luggage, or property.",
      "Examples may include spills, bodily fluids, smoke, burns, broken fixtures, torn upholstery, excessive trash, pet contamination, or damage caused by prohibited conduct.",
      "Angel Express may request photographs, receipts, estimates, driver statements, passenger statements, or other evidence before determining a charge.",
    ],
  },
  {
    number: "23",
    title: "Safety and Emergencies",
    paragraphs: [
      "The Angel Express platform may include emergency alerts, live trip information, family check-in features, location sharing, driver or passenger support, and other safety tools.",
      "These tools support safety but do not replace emergency services.",
      "In an immediate emergency, call 911 or the appropriate local emergency service before contacting Angel Express.",
      "Location, notification, and communication features may be delayed, unavailable, inaccurate, or affected by device settings, network conditions, battery status, permissions, or third-party services.",
    ],
  },
  {
    number: "24",
    title: "Family Check-In and Trip Sharing",
    paragraphs: [
      "Passengers may be able to share trip information with a family member, emergency contact, or another trusted person.",
      "You are responsible for ensuring that you have permission to provide another person's contact information.",
      "A family check-in notification does not guarantee continuous monitoring by Angel Express or by the recipient.",
      "Trip status and estimated arrival information may change as road and operational conditions change.",
    ],
  },
  {
    number: "25",
    title: "Communications",
    paragraphs: [
      "By creating an account or booking a ride, you authorize Angel Express to contact you about account activity, bookings, driver assignment, trip updates, payments, safety, support, policy updates, and service-related matters.",
      "Communications may be sent through email, telephone calls, text messages, push notifications, in-app messages, WhatsApp, or other channels you provide or enable.",
      "You may manage eligible marketing and notification preferences, but essential account, booking, payment, legal, and safety communications may still be sent.",
      "Carrier messaging and data rates may apply.",
    ],
  },
  {
    number: "26",
    title: "Location Information",
    paragraphs: [
      "Certain features may require access to device location information.",
      "Location information may be used to identify pickup locations, show trip progress, calculate routes, estimate arrival, support safety functions, coordinate drivers, investigate incidents, and provide customer support.",
      "Disabling location permissions may prevent some platform features from operating correctly.",
      "Additional information about the collection and use of location information is available in the Angel Express Privacy Policy.",
    ],
  },
  {
    number: "27",
    title: "Prohibited Uses",
    paragraphs: [
      "You may not use Angel Express in a way that is unlawful, fraudulent, abusive, unsafe, deceptive, harmful, or inconsistent with these Terms.",
    ],
    bullets: [
      "Creating false bookings or intentionally sending a driver to an incorrect location.",
      "Using stolen, unauthorized, or fraudulent payment information.",
      "Manipulating referrals, discounts, rewards, ratings, or promotions.",
      "Impersonating another person or misrepresenting your identity.",
      "Accessing another user's account without permission.",
      "Attempting to bypass security, authentication, pricing, or platform controls.",
      "Scraping, copying, reverse engineering, or disrupting the platform.",
      "Using the service to transport illegal goods or facilitate unlawful conduct.",
      "Recording a person where recording is prohibited by law.",
      "Publishing private driver, passenger, employee, or customer information without lawful authority.",
    ],
  },
  {
    number: "28",
    title: "Ratings, Reviews, and Feedback",
    paragraphs: [
      "Passengers and drivers may be allowed to rate trips or provide feedback.",
      "Ratings and feedback must be honest and must not contain threats, harassment, discrimination, private information, unlawful content, or knowingly false accusations.",
      "Angel Express may review, remove, restrict, or retain ratings and feedback for safety, quality assurance, dispute resolution, fraud prevention, and platform management.",
      "Submitting feedback gives Angel Express permission to use that feedback to improve its services without payment or obligation to you.",
    ],
  },
  {
    number: "29",
    title: "Third-Party Services",
    paragraphs: [
      "Angel Express may use third-party services for maps, navigation, payment processing, cloud hosting, messaging, analytics, identity verification, notifications, email, support, and other platform functions.",
      "Third-party services may have their own terms and privacy practices.",
      "Angel Express is not responsible for an independent third party's systems, availability, content, policies, or actions except where applicable law provides otherwise.",
    ],
  },
  {
    number: "30",
    title: "Promotions, Referrals, and Rewards",
    paragraphs: [
      "Angel Express may offer referral programs, promotional fares, rewards, discounts, credits, or limited-time offers.",
      "Each promotion may have additional eligibility rules, expiration dates, geographical restrictions, trip requirements, account limits, and usage conditions.",
      "Angel Express may cancel or correct a benefit obtained through fraud, duplicate accounts, technical error, manipulation, or violation of the applicable promotion rules.",
      "Promotions and credits may not be sold, transferred, exchanged for cash, or combined unless expressly permitted.",
    ],
  },
  {
    number: "31",
    title: "Account Suspension and Termination",
    paragraphs: [
      "Angel Express may investigate, restrict, suspend, or terminate access to the platform when reasonably necessary to protect passengers, drivers, employees, the public, payment systems, or the integrity of the service.",
      "Reasons may include suspected fraud, nonpayment, unsafe behavior, harassment, false information, misuse of discounts, repeated no-shows, chargebacks, unlawful conduct, document expiration, or a material violation of these Terms.",
      "In urgent safety or fraud circumstances, Angel Express may take action without advance notice.",
      "Termination does not remove valid payment obligations or provisions that reasonably continue after account closure.",
    ],
  },
  {
    number: "32",
    title: "Intellectual Property",
    paragraphs: [
      "The Angel Express name, logos, designs, applications, website, software, text, graphics, interfaces, features, databases, and related content are owned by or licensed to Angel Express and are protected by applicable intellectual property laws.",
      "Angel Express grants you a limited, revocable, non-exclusive, non-transferable license to use the platform for its intended personal or authorized business purposes.",
      "You may not reproduce, modify, distribute, sell, license, reverse engineer, copy, or commercially exploit Angel Express intellectual property without written permission.",
    ],
  },
  {
    number: "33",
    title: "Service Availability",
    paragraphs: [
      "Angel Express may modify, suspend, limit, replace, or discontinue any part of the platform or service.",
      "The platform may occasionally be unavailable because of maintenance, updates, technical failures, cybersecurity events, network issues, third-party outages, emergencies, or circumstances outside Angel Express control.",
      "Angel Express does not guarantee uninterrupted, error-free, or continuously available access.",
    ],
  },
  {
    number: "34",
    title: "Disclaimers",
    paragraphs: [
      "To the fullest extent permitted by law, the Angel Express platform and services are provided on an as-available and as-is basis.",
      "Angel Express does not guarantee that every ride request will be accepted, that a particular driver or vehicle will be available, that estimated times will be exact, or that the platform will be free from interruption or error.",
      "Nothing in these Terms excludes any warranty, right, or protection that cannot legally be excluded.",
    ],
  },
  {
    number: "35",
    title: "Limitation of Liability",
    paragraphs: [
      "To the fullest extent permitted by applicable law, Angel Express will not be liable for indirect, incidental, special, exemplary, punitive, or consequential damages arising from use of the platform or services.",
      "Angel Express will not be responsible for losses caused solely by traffic, weather, road closures, airline changes, passenger delay, inaccurate booking information, third-party systems, device failure, network interruption, or events beyond reasonable control.",
      "Nothing in these Terms limits liability where limitation is prohibited by law, including liability that cannot lawfully be waived or excluded.",
    ],
  },
  {
    number: "36",
    title: "Indemnification",
    paragraphs: [
      "To the extent permitted by law, you agree to be responsible for claims, losses, liabilities, expenses, and reasonable legal costs arising from your unlawful use of the platform, your material violation of these Terms, your misuse of another person's information, or damage caused by you or persons for whom you are responsible.",
      "This provision does not require you to indemnify Angel Express for conduct for which indemnification cannot lawfully be required.",
    ],
  },
  {
    number: "37",
    title: "Disputes and Informal Resolution",
    paragraphs: [
      "Before beginning formal legal proceedings, you and Angel Express agree to make a good-faith effort to resolve the dispute informally.",
      "You should send a written description of the dispute, relevant booking information, requested resolution, and supporting documentation to Angel Express support.",
      "Angel Express may contact you to request additional information or propose a resolution.",
      "Nothing in this section prevents either party from seeking urgent relief when necessary to address immediate safety, fraud, confidentiality, or intellectual property concerns.",
    ],
  },
  {
    number: "38",
    title: "Governing Law",
    paragraphs: [
      "These Terms are governed by the laws applicable in the State of Texas, without regard to conflict-of-law principles, except where another jurisdiction's law must apply.",
      "Any court proceeding that is not otherwise subject to a valid alternative dispute process must be brought in a court with lawful jurisdiction over the dispute.",
      "The parties retain all rights and protections that cannot legally be waived.",
    ],
  },
  {
    number: "39",
    title: "Privacy",
    paragraphs: [
      "Angel Express collects, uses, stores, shares, and protects personal information as described in the Angel Express Privacy Policy.",
      "The Privacy Policy is incorporated into these Terms by reference.",
      "You should review the Privacy Policy before creating an account or using Angel Express services.",
    ],
  },
  {
    number: "40",
    title: "Changes to These Terms",
    paragraphs: [
      "Angel Express may update these Terms to reflect changes in services, technology, pricing, operations, safety practices, business practices, or legal requirements.",
      "The updated Terms will display a revised effective or last-updated date.",
      "Where required, Angel Express may provide additional notice or request renewed acceptance.",
      "Continued use of Angel Express after updated Terms become effective constitutes acceptance of the revised Terms, except where applicable law requires another form of consent.",
    ],
  },
  {
    number: "41",
    title: "Severability",
    paragraphs: [
      "If any provision of these Terms is found to be unlawful, invalid, or unenforceable, that provision will be enforced to the maximum extent permitted and the remaining provisions will continue in effect.",
    ],
  },
  {
    number: "42",
    title: "No Waiver",
    paragraphs: [
      "Angel Express failure to enforce a provision of these Terms does not waive the right to enforce that provision later.",
      "A waiver is effective only when expressly provided by an authorized Angel Express representative.",
    ],
  },
  {
    number: "43",
    title: "Entire Agreement",
    paragraphs: [
      "These Terms, the Angel Express Privacy Policy, applicable booking terms, promotion rules, driver agreements, and any expressly incorporated policies constitute the agreement governing your use of the relevant Angel Express services.",
      "Separate written agreements may apply to schools, businesses, organizations, drivers, contractors, events, or transportation partners.",
    ],
  },
  {
    number: "44",
    title: "Contact Angel Express",
    paragraphs: [
      "Questions, concerns, complaints, refund requests, safety reports, and legal notices relating to these Terms may be sent to Angel Express using the contact information below.",
    ],
  },
];

export default function TermsScreen() {
  const {
    colors,
    themeMode,
    toggleTheme,
  } = useAngelTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const headerFade =
    useRef(new Animated.Value(0)).current;

  const contentFade =
    useRef(new Animated.Value(0)).current;

  const bgScale =
    useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const backgroundAnimation =
      slowBackgroundZoom(bgScale);

    const entranceAnimation =
      Animated.sequence([
        fadeUp(headerFade, 50),
        fadeUp(contentFade, 40),
      ]);

    backgroundAnimation.start();
    entranceAnimation.start();

    return () => {
      backgroundAnimation.stop();
      entranceAnimation.stop();
    };
  }, [
    bgScale,
    contentFade,
    headerFade,
  ]);

  const headerTranslate =
    headerFade.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0],
    });

  const contentTranslate =
    contentFade.interpolate({
      inputRange: [0, 1],
      outputRange: [24, 0],
    });

  async function openEmail() {
    const url =
      "mailto:support@angelexpressus.com?subject=Angel%20Express%20Terms%20of%20Service";

    const supported =
      await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    }
  }

  async function openWebsite() {
    const url =
      "https://angelexpressus.com";

    const supported =
      await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    }
  }

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.backgroundWrapper,
          {
            transform: [
              {
                scale: bgScale,
              },
            ],
          },
        ]}
      >
        <ImageBackground
          source={require(
            "../assets/images/gmc-background.png"
          )}
          style={styles.background}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>
                ‹ Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.themeButton}
              onPress={() => {
                void toggleTheme();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.themeButtonText}>
                {themeMode === "dark"
                  ? "☀️ Light"
                  : "🌙 Dark"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={
              styles.scrollContent
            }
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={{
                opacity: headerFade,
                transform: [
                  {
                    translateY:
                      headerTranslate,
                  },
                ],
              }}
            >
              <Image
                source={require(
                  "../assets/images/angel-logo-transparent.png"
                )}
                style={styles.logo}
                resizeMode="contain"
              />

              <View style={styles.eyebrow}>
                <Text style={styles.eyebrowText}>
                  LEGAL AGREEMENT
                </Text>
              </View>

              <Text style={styles.title}>
                Terms of{"\n"}
                <Text style={styles.gold}>
                  Service.
                </Text>
              </Text>

              <Text style={styles.subtitle}>
                Please read these Terms
                carefully before creating an
                account, booking a ride, or
                using any Angel Express
                service.
              </Text>

              <View style={styles.updatedBadge}>
                <Text style={styles.updatedLabel}>
                  Last updated
                </Text>

                <Text style={styles.updatedDate}>
                  {LAST_UPDATED}
                </Text>
              </View>
            </Animated.View>

            <Animated.View
              style={{
                opacity: contentFade,
                transform: [
                  {
                    translateY:
                      contentTranslate,
                  },
                ],
              }}
            >
              <AngelCard
                style={styles.introductionCard}
              >
                <Text style={styles.introTitle}>
                  Important Notice
                </Text>

                <Text style={styles.introText}>
                  These Terms form a legally
                  binding agreement between you
                  and Angel Express. By selecting
                  the agreement checkbox,
                  creating an account, or using
                  the service, you agree to be
                  bound by these Terms.
                </Text>
              </AngelCard>

              <View style={styles.divider} />

              {TERMS_SECTIONS.map(
                (section) => (
                  <AngelCard
                    key={section.number}
                    style={styles.sectionCard}
                  >
                    <View
                      style={
                        styles.sectionHeading
                      }
                    >
                      <View
                        style={
                          styles.sectionNumber
                        }
                      >
                        <Text
                          style={
                            styles.sectionNumberText
                          }
                        >
                          {section.number}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.sectionTitle
                        }
                      >
                        {section.title}
                      </Text>
                    </View>

                    {section.paragraphs.map(
                      (
                        paragraph,
                        index
                      ) => (
                        <Text
                          key={`${section.number}-paragraph-${index}`}
                          style={
                            styles.paragraph
                          }
                        >
                          {paragraph}
                        </Text>
                      )
                    )}

                    {section.bullets?.map(
                      (bullet, index) => (
                        <View
                          key={`${section.number}-bullet-${index}`}
                          style={
                            styles.bulletRow
                          }
                        >
                          <View
                            style={
                              styles.bulletDot
                            }
                          />

                          <Text
                            style={
                              styles.bulletText
                            }
                          >
                            {bullet}
                          </Text>
                        </View>
                      )
                    )}

                    {section.number ===
                    "44" ? (
                      <View
                        style={
                          styles.contactArea
                        }
                      >
                        <TouchableOpacity
                          style={
                            styles.contactButton
                          }
                          onPress={() => {
                            void openEmail();
                          }}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={
                              styles.contactButtonLabel
                            }
                          >
                            EMAIL
                          </Text>

                          <Text
                            style={
                              styles.contactButtonValue
                            }
                          >
                            support@angelexpressus.com
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={
                            styles.contactButton
                          }
                          onPress={() => {
                            void openWebsite();
                          }}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={
                              styles.contactButtonLabel
                            }
                          >
                            WEBSITE
                          </Text>

                          <Text
                            style={
                              styles.contactButtonValue
                            }
                          >
                            angelexpressus.com
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </AngelCard>
                )
              )}

              <AngelCard
                style={styles.acceptanceCard}
              >
                <Text
                  style={
                    styles.acceptanceTitle
                  }
                >
                  Your Acceptance
                </Text>

                <Text
                  style={
                    styles.acceptanceText
                  }
                >
                  By continuing to use Angel
                  Express, you acknowledge that
                  you have read, understood, and
                  accepted these Terms of
                  Service.
                </Text>

                <TouchableOpacity
                  style={
                    styles.continueButton
                  }
                  onPress={() =>
                    router.back()
                  }
                  activeOpacity={0.88}
                >
                  <Text
                    style={
                      styles.continueButtonText
                    }
                  >
                    Return to Previous Page
                  </Text>
                </TouchableOpacity>
              </AngelCard>

              <Text style={styles.footerText}>
                © 2026 Angel Express Mobility.
                All rights reserved.
              </Text>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}

function createStyles(
  c: AngelThemeColors
) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor:
        c.bg || AE_COLORS.navy,
      overflow: "hidden",
    },

    backgroundWrapper: {
      ...StyleSheet.absoluteFillObject,
    },

    background: {
      flex: 1,
    },

    overlay: {
      flex: 1,
      backgroundColor:
        c.mode === "dark"
          ? "rgba(5,11,22,0.94)"
          : "rgba(247,249,252,0.88)",
    },

    safeArea: {
      flex: 1,
    },

    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingHorizontal: 22,
      paddingTop: 10,
      paddingBottom: 4,
      zIndex: 20,
    },

    backButton: {
      borderWidth: 1,
      borderColor:
        c.mode === "dark"
          ? "rgba(212,175,55,0.28)"
          : "rgba(7,20,38,0.14)",
      backgroundColor:
        c.mode === "dark"
          ? "rgba(7,20,38,0.88)"
          : "rgba(255,255,255,0.90)",
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 15,
    },

    backButtonText: {
      color: c.gold,
      fontSize: 15,
      fontWeight: "900",
    },

    themeButton: {
      borderWidth: 1,
      borderColor:
        c.mode === "dark"
          ? "rgba(212,175,55,0.28)"
          : "rgba(7,20,38,0.14)",
      backgroundColor:
        c.mode === "dark"
          ? "rgba(7,20,38,0.88)"
          : "rgba(255,255,255,0.90)",
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },

    themeButtonText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    scrollContent: {
      paddingHorizontal: 22,
      paddingTop: 4,
      paddingBottom: 50,
    },

    logo: {
      width: "100%",
      height: 112,
      marginBottom: 4,
    },

    eyebrow: {
      alignSelf: "flex-start",
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        "rgba(212,175,55,0.38)",
      backgroundColor:
        "rgba(212,175,55,0.10)",
      paddingVertical: 7,
      paddingHorizontal: 12,
      marginBottom: 14,
    },

    eyebrowText: {
      color: c.gold,
      fontSize: 10.5,
      fontWeight: "900",
      letterSpacing: 1.7,
    },

    title: {
      color:
        c.mode === "dark"
          ? AE_COLORS.white
          : "#071426",
      fontSize: 46,
      lineHeight: 49,
      fontWeight: "900",
      letterSpacing: -1.2,
      marginBottom: 14,
    },

    gold: {
      color: c.gold,
    },

    subtitle: {
      color:
        c.mode === "dark"
          ? "#DCE5EE"
          : "#203247",
      fontSize: 16,
      lineHeight: 25,
      fontWeight:
        c.mode === "dark"
          ? "500"
          : "700",
      marginBottom: 18,
    },

    updatedBadge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 13,
      borderWidth: 1,
      borderColor: c.lightBorder,
      backgroundColor: c.soft,
      paddingVertical: 9,
      paddingHorizontal: 12,
      marginBottom: 22,
    },

    updatedLabel: {
      color: c.muted,
      fontSize: 12,
      fontWeight: "700",
      marginRight: 7,
    },

    updatedDate: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    introductionCard: {
      padding: 20,
      marginBottom: 22,
      borderColor:
        "rgba(212,175,55,0.30)",
      backgroundColor:
        c.mode === "dark"
          ? "rgba(20,31,49,0.95)"
          : "rgba(255,255,255,0.95)",
    },

    introTitle: {
      color: c.gold,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 10,
    },

    introText: {
      color: c.text,
      fontSize: 14.5,
      lineHeight: 23,
      fontWeight: "600",
    },

    divider: {
      height: 1,
      backgroundColor:
        c.lightBorder,
      marginBottom: 22,
    },

    sectionCard: {
      padding: 20,
      marginBottom: 16,
      backgroundColor:
        c.mode === "dark"
          ? "rgba(7,20,38,0.94)"
          : "rgba(255,255,255,0.94)",
      borderColor:
        c.mode === "dark"
          ? "rgba(212,175,55,0.16)"
          : "rgba(7,20,38,0.10)",
    },

    sectionHeading: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 15,
    },

    sectionNumber: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(212,175,55,0.13)",
      borderWidth: 1,
      borderColor:
        "rgba(212,175,55,0.32)",
      marginRight: 11,
    },

    sectionNumberText: {
      color: c.gold,
      fontSize: 12,
      fontWeight: "900",
    },

    sectionTitle: {
      flex: 1,
      color:
        c.mode === "dark"
          ? AE_COLORS.white
          : "#071426",
      fontSize: 18,
      lineHeight: 23,
      fontWeight: "900",
    },

    paragraph: {
      color: c.text,
      fontSize: 14,
      lineHeight: 23,
      fontWeight: "500",
      marginBottom: 12,
    },

    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingRight: 4,
      marginBottom: 10,
    },

    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.gold,
      marginTop: 8,
      marginRight: 11,
    },

    bulletText: {
      flex: 1,
      color: c.text,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: "500",
    },

    contactArea: {
      marginTop: 8,
      gap: 10,
    },

    contactButton: {
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        "rgba(212,175,55,0.25)",
      backgroundColor:
        "rgba(212,175,55,0.08)",
      paddingVertical: 14,
      paddingHorizontal: 15,
    },

    contactButtonLabel: {
      color: c.muted,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.3,
      marginBottom: 5,
    },

    contactButtonValue: {
      color: c.gold,
      fontSize: 14,
      fontWeight: "900",
    },

    acceptanceCard: {
      padding: 22,
      marginTop: 8,
      marginBottom: 20,
      borderColor:
        "rgba(212,175,55,0.35)",
      backgroundColor:
        c.mode === "dark"
          ? "rgba(20,31,49,0.97)"
          : "rgba(255,255,255,0.97)",
    },

    acceptanceTitle: {
      color: c.gold,
      fontSize: 21,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 10,
    },

    acceptanceText: {
      color: c.text,
      fontSize: 14.5,
      lineHeight: 23,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 18,
    },

    continueButton: {
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: c.gold,
      paddingHorizontal: 18,
      paddingVertical: 15,
    },

    continueButtonText: {
      color:
        c.mode === "dark"
          ? "#07111F"
          : "#FFFFFF",
      fontSize: 14,
      fontWeight: "900",
      textAlign: "center",
    },

    footerText: {
      color: c.muted,
      fontSize: 12,
      lineHeight: 19,
      fontWeight: "700",
      textAlign: "center",
      marginTop: 4,
    },
  });
}