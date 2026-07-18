/* =========================================================
   ANGEL EXPRESS WEBSITE V5 — SHARED APP.JS
   Controls:
   - Global config
   - Navbar on every page
   - Footer on every page
   - Mobile menu
   - AI Assistant
   - Chat With Us
   - Email replacement
   - Booking → Fare Estimate → Confirm → Success flow
   - Supabase booking insert
   ========================================================= */

/* =========================
   GLOBAL CONFIG
========================= */

const AE = {
  brand: "Angel Express",
  tagline: "Mobility Ecosystem",

  phoneDisplay: "+1 (972) 836-7910",
  phoneRaw: "19728367910",

  email: "support@angelexpressus.com",
  website: "angelexpressus.com",
  city: "Dallas, Texas, USA",

  instagram: "https://instagram.com/angelexpresss",
  x: "https://x.com/angelexpresss",
  whatsapp: "https://wa.me/19728367910",

  supabaseUrl: "https://zlzastjpvbboniybyvjv.supabase.co",
  supabaseAnonKey: "sb_publishable_Fn0wUeIUskON-kTpl8kDFw_B1Exp0EP",

  googleScriptUrl:
    "https://script.google.com/macros/s/AKfycbzfjXYUphz8-nyETcdMYOpHCPoBY33V17OkAZMODpBRVT2V6m8H9DTG5iBM63QqbHtR/exec",

  nav: [
    { label: "Home", href: "index.html" },
    { label: "Book a Ride", href: "book-ride.html" },
    { label: "Passengers", href: "passenger.html" },
    { label: "Drivers", href: "driver.html" },
    { label: "Terms", href: "terms.html" },
    { label: "Blog", href: "blog.html" },
    { label: "Angel Merchandise", href: "angel-merchandise.html" },
    { label: "Contact", href: "contact.html" },
  ],
};


/* =========================
   DARK MODE ONLY
   Removes the retired light-mode preference.
========================= */

try {
  localStorage.removeItem("angelExpressTheme");
} catch {
  /* Storage may be unavailable; the website still remains dark. */
}

document.documentElement.removeAttribute("data-theme");
document.documentElement.style.colorScheme = "dark";

let aeSupabase = null;

if (typeof supabase !== "undefined") {
  aeSupabase = supabase.createClient(AE.supabaseUrl, AE.supabaseAnonKey);
}

/* =========================
   AI CONFIG
========================= */

const AE_AI = {
  welcomeMessage: `
    Welcome to Angel Express. I can help with booking, fares, airport pickups,
    luggage, student travel, shared rides, live tracking, driver contact, delays,
    payments, receipts, hotels, event transportation, chauffeur applications,
    merchandise, safety, and support.
  `,

  quickPrompts: [
    "How do I book a ride?",
    "How much is Dallas to Austin?",
    "Do you pick up from DFW Airport?",
    "Do you pick up from Dallas Love Field?",
    "Can I bring luggage?",
    "Can I book a round trip?",
    "Can I book for someone else?",
    "Can I change my pickup address?",
    "Can I cancel my ride?",
    "How does student discount work?",
    "How do student shared rides work?",
    "How do I track my driver?",
    "How do I contact my driver?",
    "What if my driver is late?",
    "How do I pay for my ride?",
    "Can I get a receipt?",
    "Do you support event transportation?",
    "Can Angel Express help with hotel pickup?",
    "What if I need emergency help?",
    "I need support from Angel Express",
  ],

  knowledge: [
    {
      intent: "booking",
      keywords: [
        "book",
        "booking",
        "reserve",
        "reservation",
        "schedule",
        "request ride",
        "ride request",
        "get a ride",
        "need a ride",
        "start ride",
        "private ride",
      ],
      answer: `
        You can book an Angel Express ride by going to
        <a href="book-ride.html">Book a Ride</a>. Enter your pickup address,
        drop-off address, ride date, ride time, passenger details, luggage count,
        and notes. After that, you can review your fare estimate and confirm your booking.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Book a Ride</a>
      `,
    },

    {
      intent: "fare",
      keywords: [
        "fare",
        "price",
        "cost",
        "estimate",
        "quote",
        "how much",
        "pricing",
        "rate",
        "total",
        "fee",
        "charge",
        "expensive",
        "cheap",
      ],
      answer: `
        Angel Express calculates fares based on distance, trip type, route timing,
        airport or event demand, student discount eligibility, shared ride savings,
        referral discounts, luggage, and special notes.
        <br><br>
        For the most accurate quote, start with
        <a href="book-ride.html">Book a Ride</a>. The website will take you through
        the fare estimate before confirmation.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Get Fare Estimate</a>
      `,
    },

    {
      intent: "dallas-austin",
      keywords: [
        "dallas to austin",
        "austin from dallas",
        "dfw to austin",
        "austin ride",
        "ut austin",
        "university of texas",
        "dallas austin",
      ],
      answer: `
        Yes. Angel Express supports Dallas to Austin private rides for students,
        families, airport travelers, business travelers, and private groups.
        Pricing depends on pickup point, drop-off point, date, time, luggage,
        trip type, and eligible discounts.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Book Dallas to Austin</a>
      `,
    },

    {
      intent: "dallas-houston",
      keywords: [
        "dallas to houston",
        "houston from dallas",
        "dfw to houston",
        "houston ride",
        "dallas houston",
      ],
      answer: `
        Angel Express supports Dallas to Houston rides, including private
        long-distance transportation, airport transfers, student travel, and
        group rides. Your final estimate depends on distance, time, luggage,
        route, and trip details.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Book Dallas to Houston</a>
      `,
    },

    {
      intent: "dallas-san-antonio",
      keywords: [
        "san antonio",
        "dallas to san antonio",
        "san antonio from dallas",
        "dfw to san antonio",
      ],
      answer: `
        Yes. Angel Express can support private rides between Dallas and San Antonio.
        Add your pickup, drop-off, travel date, luggage, and any special notes when booking.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Book San Antonio Ride</a>
      `,
    },

    {
      intent: "oklahoma-city",
      keywords: [
        "okc",
        "oklahoma",
        "oklahoma city",
        "dallas to okc",
        "dallas to oklahoma",
      ],
      answer: `
        Angel Express supports Dallas to Oklahoma City and regional private rides.
        Use the booking form to enter your exact pickup and destination so the team
        can review your ride request accurately.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Book OKC Ride</a>
      `,
    },

    {
      intent: "college-station",
      keywords: [
        "college station",
        "texas a&m",
        "tamu",
        "dallas to college station",
        "aggie",
      ],
      answer: `
        Yes. Angel Express supports student and private rides to College Station
        and Texas A&M. Students can include campus pickup, dorm pickup, luggage,
        and family travel notes during booking.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Book College Station Ride</a>
      `,
    },

    {
      intent: "airport",
      keywords: [
        "airport",
        "dfw",
        "love field",
        "dal airport",
        "flight",
        "terminal",
        "airline",
        "arrival",
        "departure",
        "baggage claim",
        "airport pickup",
        "airport dropoff",
        "airport drop-off",
      ],
      answer: `
        Yes. Angel Express supports airport pickup and drop-off for DFW Airport,
        Dallas Love Field, Austin, Houston, and other airports. When booking,
        add your airline, flight number, terminal, arrival or departure time,
        luggage count, and pickup instructions.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Book Airport Ride</a>
      `,
    },

    {
      intent: "dfw-airport",
      keywords: [
        "dfw airport",
        "dfw pickup",
        "dfw dropoff",
        "dfw drop-off",
        "dfw terminal",
        "dallas fort worth airport",
      ],
      answer: `
        Angel Express supports DFW Airport pickup and drop-off. Please include
        your airline, flight number, terminal, baggage claim details, luggage count,
        and whether you need arrival or departure service.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Book DFW Airport Ride</a>
      `,
    },

    {
      intent: "love-field",
      keywords: [
        "love field",
        "dallas love field",
        "dal",
        "love field pickup",
        "love field dropoff",
        "southwest",
      ],
      answer: `
        Yes. Angel Express supports Dallas Love Field pickup and drop-off.
        Add your flight details, pickup instructions, luggage count, and exact
        pickup time when booking.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Book Love Field Ride</a>
      `,
    },

    {
      intent: "luggage",
      keywords: [
        "luggage",
        "bags",
        "bag",
        "suitcase",
        "suitcases",
        "boxes",
        "cargo",
        "carry on",
        "carry-on",
        "large luggage",
        "moving",
      ],
      answer: `
        Yes. You can bring luggage. Add your luggage count during booking.
        For large suitcases, boxes, student move-in, airport pickups, or group travel,
        include details in the notes so Angel Express can prepare properly.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Book With Luggage</a>
      `,
    },

    {
      intent: "round-trip",
      keywords: [
        "round trip",
        "return ride",
        "return trip",
        "come back",
        "two way",
        "2 way",
        "both ways",
      ],
      answer: `
        Yes. Angel Express supports one-way and round-trip rides. Choose Round Trip
        during booking or include return trip details in the notes. The team may review
        timing, wait time, and route details before final confirmation.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Book Round Trip</a>
      `,
    },

    {
      intent: "book-for-someone-else",
      keywords: [
        "someone else",
        "book for my friend",
        "book for my family",
        "book for my child",
        "book for my son",
        "book for my daughter",
        "parent booking",
        "family member",
        "another passenger",
      ],
      answer: `
        Yes. You can book for someone else. Enter the passenger’s name, phone number,
        pickup details, drop-off details, and emergency or contact notes during booking.
        For students, parents can include campus, dorm, and luggage information.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Book for Someone</a>
      `,
    },

    {
      intent: "changes",
      keywords: [
        "change",
        "edit",
        "modify",
        "update booking",
        "change pickup",
        "change dropoff",
        "change drop-off",
        "pickup address",
        "dropoff address",
        "drop-off address",
        "change time",
        "change date",
        "reschedule",
      ],
      answer: `
        For changes to pickup, drop-off, ride time, date, luggage, or notes,
        contact Angel Express as early as possible. If the ride is close to pickup time,
        use WhatsApp for the fastest help.
        <br><br>
        <a class="chat-action-link" href="${AE.whatsapp}" target="_blank">Message Support</a>
      `,
    },

    {
      intent: "cancel",
      keywords: [
        "cancel",
        "cancellation",
        "cancel ride",
        "cancel booking",
        "refund",
        "no longer need",
        "reschedule",
      ],
      answer: `
        To cancel or reschedule, contact Angel Express as early as possible.
        If a chauffeur has already been assigned or is already on the way,
        support may need to review the trip status.
        <br><br>
        <a class="chat-action-link" href="${AE.whatsapp}" target="_blank">Cancel or Reschedule</a>
      `,
    },

    {
      intent: "student",
      keywords: [
        "student",
        "college",
        "campus",
        "university",
        "student discount",
        "student ride",
        "student travel",
        "utd",
        "unt",
        "smu",
        "uta",
        "ut arlington",
        "texas a&m",
        "tamu",
        "ut austin",
        "dorm",
        "school",
      ],
      answer: `
        Angel Express supports student travel, campus pickups, verified student discounts,
        long-distance campus routes, and student shared ride options when available.
        Students should use the same email connected to their Angel Express profile
        when booking so eligibility can be checked.
        <br><br>
        <a class="chat-action-link" href="passenger.html">Passenger Services</a>
        <a class="chat-action-dark" href="book-ride.html">Book Student Ride</a>
      `,
    },

    {
      intent: "student-shared-rides",
      keywords: [
        "student shared",
        "student pool",
        "pool ride",
        "shared ride",
        "share ride",
        "split ride",
        "ride with other students",
        "student group",
        "campus shared",
      ],
      answer: `
        Student shared rides help eligible students lower travel cost by sharing
        a route with other students when timing and destination match. Shared rides
        may depend on student verification, campus demand, pickup timing, route,
        and available seats.
        <br><br>
        Start a booking and select the student/shared ride option if available:
        <a class="chat-action-link" href="book-ride.html">Book Shared Student Ride</a>
      `,
    },

    {
      intent: "referral",
      keywords: [
        "referral",
        "promo",
        "promo code",
        "discount code",
        "coupon",
        "reward",
        "rewards",
        "ride credit",
        "referrer",
      ],
      answer: `
        Angel Express supports referral and promo codes. Enter your code during
        booking. Eligible referral savings may apply to the passenger, and the referrer
        may receive ride credit after the trip is completed, depending on eligibility.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Use Referral Code</a>
      `,
    },

    {
      intent: "tracking",
      keywords: [
        "track",
        "tracking",
        "live tracking",
        "driver location",
        "where is my driver",
        "gps",
        "eta",
        "trip status",
        "live trip",
      ],
      answer: `
        Angel Express is designed to support live trip tracking through the Passenger App,
        Driver App, and Owner App. Driver location and ETA are available when the chauffeur
        is assigned and actively sharing trip status.
        <br><br>
        For urgent trip updates, use WhatsApp:
        <a class="chat-action-link" href="${AE.whatsapp}" target="_blank">Get Trip Support</a>
      `,
    },

    {
      intent: "driver-contact",
      keywords: [
        "contact my driver",
        "call driver",
        "text driver",
        "driver phone",
        "chauffeur contact",
        "message driver",
        "speak to driver",
      ],
      answer: `
        When your chauffeur is assigned, driver contact details may be shared through
        trip updates or support. For safety and coordination, Angel Express can help
        connect you with the chauffeur when appropriate.
        <br><br>
        <a class="chat-action-link" href="${AE.whatsapp}" target="_blank">Contact Support</a>
      `,
    },

    {
      intent: "driver-late",
      keywords: [
        "driver late",
        "late",
        "delay",
        "traffic",
        "driver delayed",
        "running late",
        "not here",
        "chauffeur late",
        "waiting",
      ],
      answer: `
        If your driver is delayed, traffic, weather, airport congestion, event routes,
        road closures, or previous trip timing may be affecting arrival. For urgent delays,
        contact Angel Express immediately by WhatsApp.
        <br><br>
        <a class="chat-action-link" href="${AE.whatsapp}" target="_blank">Report Delay</a>
      `,
    },

    {
      intent: "payment",
      keywords: [
        "pay",
        "payment",
        "card",
        "credit card",
        "debit card",
        "apple pay",
        "google pay",
        "stripe",
        "cash",
        "zelle",
        "cash app",
        "invoice",
        "receipt",
        "paid",
        "balance",
      ],
      answer: `
        Angel Express may support secure payment methods including Stripe, card,
        Apple Pay, Google Pay, and approved backup payment methods when needed.
        Receipts and invoices may be sent after booking confirmation or ride completion,
        depending on the trip flow.
        <br><br>
        For payment questions, contact:
        <a href="mailto:${AE.email}">${AE.email}</a>
      `,
    },

    {
      intent: "receipt",
      keywords: [
        "receipt",
        "invoice",
        "proof of payment",
        "email receipt",
        "billing",
        "bill",
        "payment record",
      ],
      answer: `
        Angel Express can provide booking confirmations, invoices, and receipts when available.
        Check the email used for booking. If you need another copy, contact support with
        your name, phone number, ride date, and route.
        <br><br>
        <a class="chat-action-link" href="mailto:${AE.email}">Request Receipt</a>
      `,
    },

    {
      intent: "event-transportation",
      keywords: [
        "event transportation",
        "major event",
        "sports event",
        "venue",
        "event guest",
        "conference",
        "festival",
        "event transportation",
        "sports event",
      ],
      answer: `
        Angel Express supports event transportation for airport transfers,
        hotel pickups, private groups, event guests, tourists, students, and regional Texas travel.
        Early booking is recommended during high-demand event periods.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Book Event Transportation</a>
      `,
    },

    {
      intent: "hotel",
      keywords: [
        "hotel",
        "hotel pickup",
        "hotel dropoff",
        "hotel drop-off",
        "resort",
        "lobby",
        "tourist",
        "visitor",
        "guest",
      ],
      answer: `
        Yes. Angel Express supports hotel pickup and drop-off. Add the hotel name,
        lobby or entrance instructions, room contact preference if needed, luggage count,
        and pickup time during booking.
        <br><br>
        <a class="chat-action-link" href="book-ride.html">Book Hotel Pickup</a>
      `,
    },

    {
      intent: "safety",
      keywords: [
        "safe",
        "safety",
        "emergency",
        "unsafe",
        "danger",
        "accident",
        "911",
        "security",
        "family check",
        "family tracking",
        "emergency contact",
      ],
      answer: `
        If this is an emergency or immediate danger, call local emergency services first.
        For ride-related safety support, Angel Express can help with trip status,
        emergency contacts, support communication, and operations oversight.
        <br><br>
        <a class="chat-action-link" href="${AE.whatsapp}" target="_blank">Contact Angel Express Support</a>
      `,
    },

    {
      intent: "support",
      keywords: [
        "support",
        "help",
        "human",
        "agent",
        "representative",
        "customer service",
        "phone",
        "email",
        "whatsapp",
        "contact",
        "talk to someone",
        "call angel express",
      ],
      answer: `
        You can reach Angel Express support by WhatsApp, phone, or email.
        <br><br>
        <div class="chat-mini-card">
          <strong>Angel Express Support</strong><br>
          Phone: <a href="tel:+${AE.phoneRaw}">${AE.phoneDisplay}</a><br>
          Email: <a href="mailto:${AE.email}">${AE.email}</a><br>
          WhatsApp: <a href="${AE.whatsapp}" target="_blank">Chat With Us</a>
        </div>
        <br>
        <a class="chat-action-link" href="${AE.whatsapp}" target="_blank">Open WhatsApp</a>
      `,
    },

    {
      intent: "driver-application",
      keywords: [
        "driver",
        "drive",
        "chauffeur",
        "become a driver",
        "apply to drive",
        "driver application",
        "chauffeur application",
        "driver pay",
        "payout",
        "earnings",
        "70",
        "70/30",
        "vehicle requirement",
      ],
      answer: `
        Angel Express works with approved chauffeurs for private rides, airport transfers,
        student travel, long-distance routes, event transportation, and major event travel demand.
        The standard payout model is 70% driver share and 30% company share for eligible ride revenue.
        <br><br>
        <a class="chat-action-link" href="driver.html#apply">Apply to Drive</a>
        <a class="chat-action-dark" href="driver.html#earnings">View Earnings</a>
      `,
    },

    {
      intent: "merchandise",
      keywords: [
        "merch",
        "merchandise",
        "shirt",
        "t-shirt",
        "tee",
        "cap",
        "hat",
        "candle",
        "candles",
        "angel scented",
        "ocean breeze",
        "cupid",
        "valentine",
        "cart",
        "checkout",
        "stripe payment link",
      ],
      answer: `
        You can shop Angel Express merchandise, apparel, caps, and Angels Scented Candle
        collections on the merchandise page. Checkout uses Stripe Payment Links once
        your product links are added.
        <br><br>
        <a class="chat-action-link" href="angel-merchandise.html">Shop Angel Merchandise</a>
      `,
    },

    {
      intent: "passenger-services",
      keywords: [
        "passenger",
        "passenger services",
        "services",
        "private transportation",
        "long distance",
        "student travel",
        "airport transfer",
        "group ride",
        "family ride",
        "tourist",
      ],
      answer: `
        Angel Express passenger services include private rides, airport transfers,
        student travel, long-distance Texas routes, hotel pickups, event transportation,
        and private group travel.
        <br><br>
        <a class="chat-action-link" href="passenger.html">View Passenger Services</a>
      `,
    },

    {
      intent: "terms-privacy",
      keywords: [
        "terms",
        "privacy",
        "policy",
        "data",
        "personal information",
        "location data",
        "gps",
        "rules",
        "agreement",
        "conditions",
      ],
      answer: `
        You can review Angel Express Terms of Service and Privacy Policy on the Terms page.
        It covers bookings, payments, driver responsibilities, passenger responsibilities,
        safety, app data, live tracking, and third-party services.
        <br><br>
        <a class="chat-action-link" href="terms.html">Read Terms & Privacy</a>
      `,
    },

    {
      intent: "blog",
      keywords: [
        "blog",
        "article",
        "travel guide",
        "road travel",
        "tips",
        "news",
        "guide",
      ],
      answer: `
        Angel Express publishes travel articles, transportation guides, and road travel content
        on the blog page.
        <br><br>
        <a class="chat-action-link" href="blog.html">Visit Angel Express Blog</a>
      `,
    },

    {
      intent: "hours",
      keywords: [
        "hours",
        "open",
        "available",
        "24/7",
        "night",
        "early morning",
        "late night",
        "weekend",
        "holiday",
      ],
      answer: `
        Angel Express is available by reservation. For early morning, late night,
        airport, holiday, or event rides, book early and include timing details.
        For urgent requests, contact WhatsApp support.
        <br><br>
        <a class="chat-action-link" href="${AE.whatsapp}" target="_blank">Ask About Availability</a>
      `,
    },

    {
      intent: "greeting",
      keywords: [
        "hello",
        "hi",
        "hey",
        "good morning",
        "good afternoon",
        "good evening",
        "how are you",
        "start",
      ],
      answer: `
        Hello! Welcome to Angel Express. I can help with booking, fare estimates,
        airport rides, luggage, student travel, tracking, payments, chauffeur applications,
        merchandise, safety, and support.
        <br><br>
        What would you like help with today?
      `,
    },
  ],
};

/* =========================
   BOOT
========================= */

document.addEventListener("DOMContentLoaded", () => {
  buildHeader();
  buildFooter();
  buildSupportWidgets();

  replaceOldEmailsSafely();

  setupLoader();
  setupReveal();
  setupHeroSlides();
  setupOptions();
  setupMobileMenu();

  initPage();
});

/* =========================
   PAGE HELPERS
========================= */

function currentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function isCurrentPage(href) {
  return currentPage() === href;
}

function navHTML() {
  return AE.nav
    .map(
      (item) => `
        <a href="${item.href}" class="${isCurrentPage(item.href) ? "active" : ""}">
          ${item.label}
        </a>
      `
    )
    .join("");
}

function getValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function money(value) {
  return "$" + Number(value || 0).toFixed(2);
}

function cleanPhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function generateInvoiceNumber() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const uniqueCode = Date.now().toString().slice(-6);

  return `AE-${year}${month}${day}-${uniqueCode}`;
}

function getDraftBooking() {
  return JSON.parse(localStorage.getItem("angelBooking") || "{}");
}

function saveDraftBooking(booking) {
  localStorage.setItem("angelBooking", JSON.stringify(booking));
}

/* =========================
   GLOBAL HEADER
========================= */

function buildHeader() {
  let mount = document.getElementById("siteHeader");

  if (!mount) {
    const existingHeader = document.querySelector(".navbar, .ae-navbar");

    if (existingHeader) {
      existingHeader.remove();
    }

    mount = document.createElement("div");
    mount.id = "siteHeader";
    document.body.prepend(mount);
  }

  mount.innerHTML = `
    <header class="navbar ae-navbar">
      <a href="index.html" class="logo ae-logo" aria-label="Angel Express Home">
        <div class="logo-mark ae-logo-mark">A</div>

        <div class="logo-text ae-logo-text">
          <h1>ANGEL EXPRESS</h1>
          <span>MOBILITY ECOSYSTEM</span>
        </div>
      </a>

      <nav class="desktop-nav ae-desktop-nav" aria-label="Main navigation">
        ${navHTML()}
      </nav>

      <div class="desktop-actions ae-nav-actions">


        <a href="book-ride.html" class="nav-cta ae-nav-cta">Book a Ride</a>
      </div>

      <button class="mobile-menu-btn ae-menu-btn" id="mobileMenuBtn" type="button" aria-label="Open menu">
        <i class="fa-solid fa-bars"></i>
      </button>
    </header>

    <nav class="mobile-menu ae-mobile-menu" id="mobileMenu" aria-label="Mobile navigation">
${navHTML()}
    </nav>
  `;
}

/* =========================
   GLOBAL FOOTER
========================= */

function buildFooter() {
  let mount = document.getElementById("siteFooter");

  if (!mount) {
    const existingFooter = document.querySelector("footer.footer");

    if (existingFooter) {
      existingFooter.remove();
    }

    mount = document.createElement("div");
    mount.id = "siteFooter";
    document.body.appendChild(mount);
  }

  mount.innerHTML = `
    <footer class="footer">
      <div class="footer-grid">
        <div>
          <h3>Angel Express Mobility</h3>
          <p>
            Private transportation across Texas for students, airport travelers,
            long-distance riders, tourists, event guests, and approved chauffeurs.
          </p>
          <p>
            <i class="fa-solid fa-shield-halved"></i>
            Comfort • Reliability • Security • Cleanliness
          </p>
        </div>

        <div>
          <h4>Contact</h4>
          <p>
            <i class="fa-solid fa-phone"></i>
            <a href="tel:+${AE.phoneRaw}">${AE.phoneDisplay}</a>
          </p>
          <p>
            <i class="fa-solid fa-envelope"></i>
            <a href="mailto:${AE.email}">${AE.email}</a>
          </p>
          <p>
            <i class="fa-solid fa-location-dot"></i>
            ${AE.city}
          </p>
          <p>
            <i class="fa-solid fa-clock"></i>
            Available 24/7 by reservation
          </p>
        </div>

        <div>
          <h4>Quick Links</h4>
          ${AE.nav
            .map(
              (item) => `
                <p><a href="${item.href}">${item.label}</a></p>
              `
            )
            .join("")}
        </div>

        <div>
          <h4>Social & Support</h4>
          <p>
            <a href="${AE.instagram}" target="_blank">
              <i class="fab fa-instagram"></i> @angelexpresss
            </a>
          </p>
          <p>
            <a href="${AE.x}" target="_blank">
              <i class="fa-brands fa-x-twitter"></i> @angelexpresss
            </a>
          </p>
          <p>
            <a href="${AE.whatsapp}" target="_blank">
              <i class="fab fa-whatsapp"></i> Chat With Us
            </a>
          </p>
          <p>
            <a href="mailto:${AE.email}">
              <i class="fas fa-envelope"></i> Email Support
            </a>
          </p>
        </div>
      </div>

      <div class="footer-bottom">
        © 2026 Angel Express Mobility. All rights reserved.
      </div>
    </footer>
  `;
}

/* =========================
   MOBILE MENU
========================= */

function setupMobileMenu() {
  const button = document.getElementById("mobileMenuBtn");
  const menu = document.getElementById("mobileMenu");

  if (!button || !menu) return;

  button.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");

    document.body.classList.toggle("nav-open", isOpen);

    button.innerHTML = isOpen
      ? `<i class="fa-solid fa-xmark"></i>`
      : `<i class="fa-solid fa-bars"></i>`;
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("open");
      document.body.classList.remove("nav-open");
      button.innerHTML = `<i class="fa-solid fa-bars"></i>`;
    });
  });
}

/* =========================
   SAFE EMAIL REPLACEMENT
========================= */

function replaceOldEmailsSafely() {
  const oldEmails = [
    "angelsexpresss@gmail.com",
    "angelxpresss@gmail.com",
    "angelxpress@gmail.com",
  ];

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((node) => {
    oldEmails.forEach((oldEmail) => {
      if (node.nodeValue.includes(oldEmail)) {
        node.nodeValue = node.nodeValue.replaceAll(oldEmail, AE.email);
      }
    });
  });

  document.querySelectorAll("a[href^='mailto:']").forEach((link) => {
    link.href = `mailto:${AE.email}`;

    oldEmails.forEach((oldEmail) => {
      if (link.textContent.includes(oldEmail)) {
        link.textContent = link.textContent.replaceAll(oldEmail, AE.email);
      }
    });
  });
}

/* =========================
   AI ASSISTANT + WHATSAPP
========================= */

function buildSupportWidgets() {
  injectAdaptiveAIStyles();

  document
    .querySelectorAll(
      "#chatToggle, .chat-toggle, .whatsapp-float, #chatbotBox, .chatbot-box, .mobile-support-dock"
    )
    .forEach((el) => el.remove());

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <button id="chatToggle" class="chat-toggle" type="button" aria-label="Open Angel Express AI Assistant">
        <i class="fa-solid fa-robot"></i>
        <span>AI Assistant</span>
      </button>

      <a class="whatsapp-float" href="${AE.whatsapp}" target="_blank" aria-label="Chat with Angel Express on WhatsApp">
        <i class="fab fa-whatsapp"></i>
        <span>Chat With Us</span>
      </a>

      <div id="chatbotBox" class="chatbot-box" role="dialog" aria-label="Angel Express AI Assistant">
        <div class="chatbot-header">
          <div class="chatbot-brand">
            <div class="chatbot-logo">A</div>
            <div>
              <div class="chatbot-title">Angel Express Concierge</div>
              <div class="chatbot-subtitle">Trips • Texas • Airports • Support</div>
            </div>
          </div>

          <button type="button" class="chat-close" id="chatCloseBtn" aria-label="Close chat">×</button>
        </div>

        <div class="chatbot-messages" id="chatbotMessages"></div>

        <div class="quick-prompts" id="chatQuickPrompts">
          ${AE_AI.quickPrompts
            .slice(0, 8)
            .map(
              (prompt) => `
                <button type="button" data-prompt="${escapeAttribute(prompt)}">
                  ${escapeHtml(prompt)}
                </button>
              `
            )
            .join("")}
        </div>

        <button type="button" class="show-more-prompts" id="showMorePromptsBtn">
          More questions
        </button>

        <div class="chatbot-input">
          <input id="chatInput" placeholder="Ask Angel Express anything..." autocomplete="off" />
          <button id="chatSendBtn" type="button">Send</button>
        </div>
      </div>

      <div class="mobile-support-dock">
        <button class="mobile-support-btn ai" id="mobileAiBtn" type="button">
          <i class="fa-solid fa-robot"></i>
          AI Assistant
        </button>

        <a class="mobile-support-btn whatsapp" href="${AE.whatsapp}" target="_blank">
          <i class="fab fa-whatsapp"></i>
          Chat With Us
        </a>
      </div>
    `
  );

  setupChatLogic();
}

function setupChatLogic() {
  const box = document.getElementById("chatbotBox");
  const messages = document.getElementById("chatbotMessages");
  const input = document.getElementById("chatInput");

  const chatToggle = document.getElementById("chatToggle");
  const mobileAiBtn = document.getElementById("mobileAiBtn");
  const closeBtn = document.getElementById("chatCloseBtn");
  const sendBtn = document.getElementById("chatSendBtn");

  if (!box || !messages || !input) return;

  function timeNow() {
    return new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function addMessage(text, sender = "bot") {
    const div = document.createElement("div");
    div.className = `chat-msg ${sender}`;

    div.innerHTML = `
      ${sender === "user" ? escapeHtml(text) : text}
      <span class="chat-time">${timeNow()}</span>
    `;

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    const typing = document.createElement("div");
    typing.className = "chat-msg bot";
    typing.id = "angelTypingBubble";
    typing.innerHTML = `
      Angel Express is checking that for you...
      <span class="chat-time">${timeNow()}</span>
    `;

    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTyping() {
    document.getElementById("angelTypingBubble")?.remove();
  }

  function openChat() {
    box.classList.add("open");

    if (!messages.children.length) {
      addMessage(AE_AI.welcomeMessage);
      addMessage(getSmartSuggestions());
    }

    setTimeout(() => input.focus(), 120);
  }

  function closeChat() {
    box.classList.remove("open");
  }

  function sendMessage(text) {
    const message = (text || input.value || "").trim();

    if (!message) return;

    addMessage(message, "user");
    input.value = "";

    showTyping();

    setTimeout(() => {
      removeTyping();
      addMessage(getSmartConciergeAnswer(message));
    }, 350);
  }

  function bindQuickPromptButtons(scope = document) {
    scope.querySelectorAll(".quick-prompts button").forEach((button) => {
      button.addEventListener("click", () => {
        sendMessage(button.dataset.prompt);
      });
    });
  }

  chatToggle?.addEventListener("click", () => {
    if (box.classList.contains("open")) {
      closeChat();
    } else {
      openChat();
    }
  });

  mobileAiBtn?.addEventListener("click", openChat);
  closeBtn?.addEventListener("click", closeChat);
  sendBtn?.addEventListener("click", () => sendMessage());

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  });

  bindQuickPromptButtons();

  const showMorePromptsBtn = document.getElementById("showMorePromptsBtn");
  const quickPromptsBox = document.getElementById("chatQuickPrompts");

  showMorePromptsBtn?.addEventListener("click", () => {
    if (!quickPromptsBox) return;

    quickPromptsBox.innerHTML = AE_AI.quickPrompts
      .map(
        (prompt) => `
          <button type="button" data-prompt="${escapeAttribute(prompt)}">
            ${escapeHtml(prompt)}
          </button>
        `
      )
      .join("");

    bindQuickPromptButtons(quickPromptsBox);
    showMorePromptsBtn.remove();
  });

  window.sendChat = function sendChat() {
    sendMessage();
  };
}

function getSmartConciergeAnswer(question) {
  const q = normalizeAIText(question);

  const exactRouteAnswer = getRouteSpecificAnswer(q);

  if (exactRouteAnswer) {
    return exactRouteAnswer;
  }

  let bestMatch = null;
  let bestScore = 0;

  AE_AI.knowledge.forEach((item) => {
    let score = 0;

    item.keywords.forEach((keyword) => {
      const normalizedKeyword = normalizeAIText(keyword);

      if (q.includes(normalizedKeyword)) {
        score += normalizedKeyword.length;

        if (q === normalizedKeyword) {
          score += 25;
        }

        if (normalizedKeyword.length > 10) {
          score += 5;
        }
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  });

  if (bestMatch && bestScore >= 3) {
    return bestMatch.answer;
  }

  return getFallbackAnswer(question);
}

function getRouteSpecificAnswer(q) {
  const routes = [
    {
      names: ["austin", "ut austin", "university of texas"],
      label: "Austin",
      note:
        "Angel Express supports Dallas to Austin rides for students, families, airport travelers, business travelers, and private groups.",
    },
    {
      names: ["houston"],
      label: "Houston",
      note:
        "Angel Express supports Dallas to Houston private rides, student travel, airport transfers, and group transportation.",
    },
    {
      names: ["san antonio"],
      label: "San Antonio",
      note:
        "Angel Express can support Dallas to San Antonio private rides and custom long-distance travel.",
    },
    {
      names: ["okc", "oklahoma", "oklahoma city"],
      label: "Oklahoma City",
      note:
        "Angel Express supports Dallas to Oklahoma City and regional private rides.",
    },
    {
      names: ["college station", "texas a&m", "tamu"],
      label: "College Station",
      note:
        "Angel Express supports College Station and Texas A&M student rides, family travel, and campus transportation.",
    },
    {
      names: ["dfw", "dfw airport", "dallas fort worth"],
      label: "DFW Airport",
      note:
        "Angel Express supports DFW Airport pickup and drop-off. Add airline, terminal, flight number, and luggage details.",
    },
    {
      names: ["love field", "dallas love field", "dal"],
      label: "Dallas Love Field",
      note:
        "Angel Express supports Dallas Love Field pickup and drop-off. Add flight details and pickup instructions.",
    },
  ];

  const isRouteQuestion =
    q.includes("to ") ||
    q.includes("from ") ||
    q.includes("ride") ||
    q.includes("trip") ||
    q.includes("pickup") ||
    q.includes("dropoff") ||
    q.includes("drop off") ||
    q.includes("airport") ||
    q.includes("how much");

  if (!isRouteQuestion) return "";

  const match = routes.find((route) =>
    route.names.some((name) => q.includes(name))
  );

  if (!match) return "";

  return `
    ${match.note}
    <br><br>
    Your estimate depends on exact pickup, drop-off, date, time, luggage,
    trip type, student/shared ride eligibility, referral code, and special notes.
    <br><br>
    <a class="chat-action-link" href="book-ride.html">Book ${match.label} Ride</a>
    <a class="chat-action-dark" href="${AE.whatsapp}" target="_blank">Ask Support</a>
  `;
}

function getFallbackAnswer(question) {
  const safeQuestion = escapeHtml(question || "your question");

  return `
    I may not have a perfect answer for: <strong>${safeQuestion}</strong>.
    <br><br>
    I can still help with booking, fares, route estimates, airport rides, luggage,
    student discounts, shared rides, referral codes, live tracking, driver contact,
    delays, payments, receipts, hotel pickup, event transportation, chauffeur applications,
    merchandise, safety, and support.
    <br><br>
    Try one of these:
    <div class="chat-grid">
      <a class="chat-pill" href="book-ride.html">Book a Ride</a>
      <a class="chat-pill" href="passenger.html">Passenger Services</a>
      <a class="chat-pill" href="driver.html#apply">Drive With Us</a>
      <a class="chat-pill" href="angel-merchandise.html">Merchandise</a>
      <a class="chat-pill" href="terms.html">Terms & Privacy</a>
      <a class="chat-pill" href="${AE.whatsapp}" target="_blank">WhatsApp Support</a>
    </div>
  `;
}

function getSmartSuggestions() {
  return `
    <div class="chat-mini-card">
      <strong>Popular topics:</strong>
      <div class="chat-grid">
        <span class="chat-pill">Booking</span>
        <span class="chat-pill">Fare estimate</span>
        <span class="chat-pill">Airport pickup</span>
        <span class="chat-pill">Student rides</span>
        <span class="chat-pill">Live tracking</span>
        <span class="chat-pill">Driver support</span>
        <span class="chat-pill">Event transportation</span>
        <span class="chat-pill">Merchandise</span>
      </div>
    </div>
  `;
}

function normalizeAIText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s&/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(text) {
  return escapeHtml(text).replaceAll("`", "&#096;");
}

function injectAdaptiveAIStyles() {
  if (document.getElementById("angelAiAdaptiveStyle")) return;

  const style = document.createElement("style");
  style.id = "angelAiAdaptiveStyle";

  style.textContent = `
    /* =========================
       ANGEL EXPRESS ADAPTIVE AI BOT
    ========================= */

    .chat-toggle,
    .whatsapp-float{
      position:fixed;
      right:22px;
      z-index:99990;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:10px;
      min-height:54px;
      padding:0 22px;
      border-radius:999px;
      border:1px solid rgba(212,175,55,.42);
      font-weight:950;
      text-decoration:none;
      box-shadow:0 18px 55px rgba(0,0,0,.36);
      backdrop-filter:blur(16px);
      -webkit-backdrop-filter:blur(16px);
    }

    .chat-toggle{
      bottom:94px;
      background:linear-gradient(135deg,#F4D96B,#D4AF37);
      color:#050b16;
      cursor:pointer;
    }

    .whatsapp-float{
      bottom:28px;
      background:rgba(5,11,22,.92);
      color:white;
    }

    .chatbot-box{
      position:fixed;
      right:22px;
      top:92px;
      bottom:158px;
      width:min(420px, calc(100vw - 44px));
      z-index:99991;
      display:none;
      overflow:hidden;
      border-radius:28px;
      background:rgba(5,11,22,.97);
      border:1px solid rgba(212,175,55,.34);
      box-shadow:0 28px 90px rgba(0,0,0,.52);
      backdrop-filter:blur(22px);
      -webkit-backdrop-filter:blur(22px);
    }

    .chatbot-box.open{
      display:grid;
      grid-template-rows:auto 1fr auto auto auto;
    }

    .chatbot-header{
      min-height:86px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
      padding:16px 18px;
      border-bottom:1px solid rgba(212,175,55,.18);
      background:
        radial-gradient(circle at top left,rgba(212,175,55,.16),transparent 38%),
        rgba(255,255,255,.035);
    }

    .chatbot-brand{
      display:flex;
      align-items:center;
      gap:12px;
      min-width:0;
    }

    .chatbot-logo{
      width:52px;
      height:52px;
      flex:0 0 auto;
      display:grid;
      place-items:center;
      border-radius:18px;
      background:linear-gradient(135deg,#F4D96B,#D4AF37);
      color:#050b16;
      font-weight:950;
      font-size:24px;
      box-shadow:0 14px 35px rgba(212,175,55,.22);
    }

    .chatbot-title{
      color:white;
      font-size:17px;
      font-weight:950;
      line-height:1.15;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .chatbot-subtitle{
      margin-top:4px;
      font-size:11px;
      color:rgba(255,255,255,.58);
      font-weight:800;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .chat-close{
      flex:0 0 auto;
      width:34px;
      height:34px;
      border-radius:50%;
      border:1px solid rgba(212,175,55,.24);
      background:rgba(255,255,255,.06);
      color:white;
      font-size:24px;
      line-height:1;
      cursor:pointer;
    }

    .chatbot-messages{
      min-height:0;
      padding:14px;
      overflow-y:auto;
      overscroll-behavior:contain;
      scrollbar-width:thin;
      background:rgba(0,0,0,.08);
    }

    .chat-msg{
      width:fit-content;
      max-width:94%;
      font-size:13.5px;
      line-height:1.55;
      border-radius:18px;
      padding:12px 13px;
      margin-bottom:10px;
      color:#edf3fb;
      word-wrap:break-word;
      overflow-wrap:anywhere;
    }

    .chat-msg.bot{
      background:rgba(255,255,255,.065);
      border:1px solid rgba(212,175,55,.14);
      border-bottom-left-radius:7px;
    }

    .chat-msg.user{
      margin-left:auto;
      background:rgba(212,175,55,.16);
      border:1px solid rgba(212,175,55,.24);
      border-bottom-right-radius:7px;
    }

    .chat-msg a{
      color:#F4D96B;
      font-weight:900;
    }

    .chat-time{
      display:block;
      margin-top:7px;
      font-size:10px;
      color:rgba(255,255,255,.45);
    }

    .quick-prompts{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      padding:12px 14px 10px;
      max-height:104px;
      overflow-y:auto;
      border-top:1px solid rgba(255,255,255,.06);
      background:rgba(255,255,255,.025);
      scrollbar-width:thin;
    }

    .quick-prompts button{
      width:auto;
      min-height:32px;
      padding:7px 11px;
      border-radius:999px;
      border:1px solid rgba(212,175,55,.28);
      background:rgba(255,255,255,.055);
      color:#D4AF37;
      font-size:12px;
      font-weight:850;
      line-height:1.2;
      box-shadow:none;
      white-space:normal;
      text-align:left;
      cursor:pointer;
      transition:.2s ease;
    }

    .quick-prompts button:hover{
      background:rgba(212,175,55,.14);
      border-color:rgba(212,175,55,.55);
      transform:none;
    }

    .show-more-prompts{
      align-self:flex-start;
      margin:0 14px 10px;
      min-height:32px;
      padding:0 12px;
      border-radius:999px;
      border:1px solid rgba(212,175,55,.35);
      background:transparent;
      color:#D4AF37;
      font-size:12px;
      font-weight:900;
      cursor:pointer;
    }

    .chatbot-input{
      display:grid;
      grid-template-columns:1fr auto;
      border-top:1px solid rgba(212,175,55,.16);
      background:rgba(255,255,255,.055);
    }

    .chatbot-input input{
      width:100%;
      min-height:56px;
      padding:0 15px;
      border:none;
      outline:none;
      background:transparent;
      color:white;
      font-size:14px;
    }

    .chatbot-input input::placeholder{
      color:rgba(255,255,255,.46);
    }

    .chatbot-input button{
      min-width:86px;
      border:none;
      background:linear-gradient(135deg,#F4D96B,#D4AF37);
      color:#050b16;
      font-weight:950;
      font-size:14px;
      cursor:pointer;
    }

    .chat-action-link,
    .chat-action-dark,
    .chat-pill{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:32px;
      padding:7px 11px;
      margin:5px 5px 0 0;
      border-radius:999px;
      text-decoration:none;
      font-size:12px;
      font-weight:900;
      line-height:1.2;
    }

    .chat-action-link{
      background:#D4AF37;
      color:#050b16 !important;
    }

    .chat-action-dark{
      background:rgba(255,255,255,.08);
      border:1px solid rgba(212,175,55,.24);
      color:white !important;
    }

    .chat-mini-card{
      padding:12px;
      border-radius:16px;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(212,175,55,.16);
    }

    .chat-grid{
      display:flex;
      flex-wrap:wrap;
      gap:7px;
      margin-top:9px;
    }

    .chat-pill{
      background:rgba(255,255,255,.07);
      border:1px solid rgba(212,175,55,.2);
      color:#D4AF37 !important;
    }

    .mobile-support-dock{
      display:none;
    }

    @media(max-width:1024px){
      .chatbot-box{
        right:18px;
        top:86px;
        bottom:146px;
        width:min(440px, calc(100vw - 36px));
      }

      .chat-toggle,
      .whatsapp-float{
        right:18px;
      }
    }

    @media(max-width:760px){
      .chat-toggle,
      .whatsapp-float{
        display:none !important;
      }

      .mobile-support-dock{
        position:fixed;
        left:12px;
        right:12px;
        bottom:calc(env(safe-area-inset-bottom) + 14px);
        z-index:99990;
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
      }

      .mobile-support-btn{
        min-height:50px;
        border-radius:999px;
        border:none;
        font-weight:950;
        font-size:13px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:8px;
        text-decoration:none;
        box-shadow:0 14px 35px rgba(0,0,0,.35);
      }

      .mobile-support-btn.ai{
        background:linear-gradient(135deg,#F4D96B,#D4AF37);
        color:#050b16;
      }

      .mobile-support-btn.whatsapp{
        background:#25D366;
        color:#050b16;
      }

      .chatbot-box{
        left:12px;
        right:12px;
        top:78px;
        bottom:calc(env(safe-area-inset-bottom) + 82px);
        width:auto;
        border-radius:24px;
      }

      .chatbot-header{
        min-height:76px;
        padding:13px 14px;
      }

      .chatbot-logo{
        width:42px;
        height:42px;
        border-radius:15px;
        font-size:20px;
      }

      .chatbot-title{
        font-size:14px;
      }

      .chatbot-subtitle{
        font-size:10px;
      }

      .chatbot-messages{
        padding:12px;
      }

      .chat-msg{
        max-width:96%;
        font-size:13px;
        padding:11px 12px;
      }

      .quick-prompts{
        max-height:92px;
        padding:10px 12px 8px;
        gap:7px;
      }

      .quick-prompts button{
        font-size:11.5px;
        min-height:31px;
        padding:7px 10px;
      }

      .show-more-prompts{
        margin:0 12px 9px;
      }

      .chatbot-input input{
        min-height:54px;
        font-size:13px;
      }

      .chatbot-input button{
        min-width:78px;
        font-size:13px;
      }
    }

    @media(max-width:390px){
      .mobile-support-dock{
        grid-template-columns:1fr;
      }

      .chatbot-box{
        top:70px;
        bottom:calc(env(safe-area-inset-bottom) + 132px);
      }

      .quick-prompts{
        max-height:74px;
      }
    }


  `;

  document.head.appendChild(style);
}
/* =========================
   DESIGN HELPERS
========================= */

function setupLoader() {
  const loader = document.querySelector(".luxury-loader");

  if (loader) {
    setTimeout(() => loader.classList.add("hide"), 650);
  }
}

function setupReveal() {
  const elements = document.querySelectorAll(".reveal");

  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active", "visible");
        }
      });
    },
    { threshold: 0.12 }
  );

  elements.forEach((el) => observer.observe(el));
}

function setupHeroSlides() {
  const slides = document.querySelectorAll(".hero-slide");

  if (!slides.length) return;

  let index = 0;

  slides[0].classList.add("active");

  setInterval(() => {
    slides[index].classList.remove("active");

    index = (index + 1) % slides.length;

    slides[index].classList.add("active");
  }, 6500);
}

function setupOptions() {
  document.querySelectorAll("[data-option-group]").forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.dataset.optionGroup;

      document
        .querySelectorAll(`[data-option-group="${group}"]`)
        .forEach((item) => item.classList.remove("active"));

      button.classList.add("active");

      const target = document.getElementById(group);

      if (target) {
        target.value = button.dataset.value || button.textContent.trim();
      }
    });
  });
}

/* =========================
   FARE LOGIC
========================= */

function estimateMiles(pickup, dropoff) {
  const textLength = `${pickup || ""} ${dropoff || ""}`.length;

  return Math.max(8, Math.min(360, Math.round(textLength * 0.9)));
}

function calculateFare(booking) {
  const miles = Number(
    booking.estimated_miles ||
      booking.miles ||
      estimateMiles(booking.pickup_address, booking.dropoff_address)
  );

  const baseFare = miles <= 35 ? 15 : 35;
  const mileageRate = miles <= 35 ? 1.5 : 1.1;
  const mileageFare = Math.max(0, miles - 10) * mileageRate;
  const subtotal = baseFare + mileageFare;

  const studentDiscount = booking.student_verified ? subtotal * 0.2 : 0;
  const referralDiscount = booking.referral_code ? 5 : 0;
  const sharedDiscount = booking.shared_ride ? subtotal * 0.1 : 0;

  const totalDiscount = studentDiscount + referralDiscount + sharedDiscount;
  const total = Math.max(12, subtotal - totalDiscount);

  return {
    miles,
    baseFare,
    mileageRate,
    mileageFare,
    subtotal,
    studentDiscount,
    referralDiscount,
    sharedDiscount,
    totalDiscount,
    total,
    driverShare: total * 0.7,
    companyShare: total * 0.3,
    pricingTier: miles <= 35 ? "Local / Campus Trip" : "Long Distance Trip",
  };
}

/* =========================
   BOOK RIDE PAGE
========================= */

window.goToFareEstimate = function goToFareEstimate() {
  const booking = {
    email: getValue("email"),
    name: getValue("email"),
    passenger_name: getValue("email"),
    phone: cleanPhone(getValue("phone")),

    pickup: getValue("pickup"),
    dropoff: getValue("dropoff"),
    pickup_address: getValue("pickup"),
    dropoff_address: getValue("dropoff"),
    route: `${getValue("pickup")} → ${getValue("dropoff")}`,

    date: getValue("tripDate"),
    time: getValue("tripTime"),
    ride_date: getValue("tripDate"),
    ride_time: getValue("tripTime"),

    passengers: Number(getValue("passengers") || 1),
    luggage_count: Number(getValue("luggage") || 0),
    notes: getValue("notes"),

    trip_type: getValue("tripType") || "One Way",
    tripType: getValue("tripType") || "One Way",
    ride_category: getValue("rideCategory") || "Standard Ride",

    referral_code: getValue("referralCode").toUpperCase(),
    referral_code_used: getValue("referralCode").toUpperCase(),

    student_verified: getValue("studentVerified") === "true",
    shared_ride: getValue("sharedRide") === "true",

    source: "website",
    status: "pending",
    payment_status: "unpaid",
  };

  if (
    !booking.email ||
    !booking.pickup ||
    !booking.dropoff ||
    !booking.date ||
    !booking.time
  ) {
    alert("Please complete email, pickup, drop-off, date, and time.");
    return;
  }

  const fare = calculateFare(booking);

  saveDraftBooking({
    ...booking,
    ...fare,
  });

  window.location.href = "fare-estimate.html";
};

window.checkStudentStatus = async function checkStudentStatus() {
  const email = getValue("email").toLowerCase();
  const statusBox = document.getElementById("studentStatus");
  const hiddenInput = document.getElementById("studentVerified");

  if (!statusBox || !hiddenInput) return;

  if (!email) {
    statusBox.className = "notice error";
    statusBox.textContent = "Enter your Angel Express app email first.";
    return;
  }

  statusBox.className = "notice";
  statusBox.textContent = "Checking student status...";

  try {
    if (!aeSupabase) throw new Error("Supabase unavailable.");

    const { data, error } = await aeSupabase
      .from("passengers")
      .select("email, student_verified")
      .ilike("email", email)
      .maybeSingle();

    if (error) throw error;

    if (data?.student_verified) {
      hiddenInput.value = "true";
      statusBox.className = "notice success";
      statusBox.textContent = "Student discount verified.";
    } else {
      hiddenInput.value = "false";
      statusBox.className = "notice";
      statusBox.textContent =
        "No verified student profile found yet. Continue without the discount.";
    }
  } catch {
    hiddenInput.value = "false";
    statusBox.className = "notice";
    statusBox.textContent =
      "Student lookup unavailable. Angel Express can review manually.";
  }
};

/* =========================
   FARE ESTIMATE PAGE
========================= */

function renderFareEstimatePage() {
  const booking = getDraftBooking();

  if (!booking.pickup_address) return;

  const fare = calculateFare(booking);

  saveDraftBooking({
    ...booking,
    ...fare,
  });

  setText("pickupText", booking.pickup_address);
  setText("dropoffText", booking.dropoff_address);
  setText("dateTimeText", `${booking.ride_date} at ${booking.ride_time}`);

  setText("pricingTierText", fare.pricingTier);
  setText("pricingTier", fare.pricingTier);

  setText("distanceText", `${fare.miles.toFixed(1)} miles`);
  setText("driveTimeText", "Calculated during dispatch");

  setText(
    "fareMethodText",
    `${money(fare.baseFare)} base + ${money(fare.mileageRate)}/mile`
  );

  setText("tripTypeText", booking.trip_type);
  setText("rideCategoryText", booking.ride_category);

  setText("mileageFareText", money(fare.mileageFare));
  setText("baseMileageText", money(fare.subtotal));

  setText("studentStatusText", booking.student_verified ? "Verified" : "Not verified");
  setText("studentDiscountText", "-" + money(fare.studentDiscount));
  setText("referralDiscountText", "-" + money(fare.referralDiscount));
  setText("sharedRideText", booking.shared_ride ? "Selected" : "Not selected");
  setText("sharedRideDiscountText", "-" + money(fare.sharedDiscount));
  setText("roundTripText", "$0.00");

  setText("totalSavingsText", "-" + money(fare.totalDiscount));
  setText("finalPriceText", money(fare.total));
}

window.continueToConfirm = function continueToConfirm() {
  window.location.href = "confirm-booking.html";
};

/* =========================
   CONFIRM BOOKING PAGE
========================= */

function renderConfirmBookingPage() {
  const booking = getDraftBooking();

  if (!booking.pickup_address) return;

  const fare = calculateFare(booking);

  saveDraftBooking({
    ...booking,
    ...fare,
  });

  setText("confirmPickupText", booking.pickup_address);
  setText("confirmDropoffText", booking.dropoff_address);
  setText("confirmDateText", booking.ride_date);
  setText("confirmTimeText", booking.ride_time);
  setText("confirmTripTypeText", booking.trip_type);
  setText("confirmRideCategoryText", booking.ride_category);
  setText("confirmPassengersText", String(booking.passengers || 1));
  setText("confirmLuggageText", String(booking.luggage_count || 0));
  setText("confirmNotesText", booking.notes || "None");
  setText("confirmReferralText", booking.referral_code || "None");
  setText("confirmDistanceText", `${fare.miles.toFixed(1)} miles`);
  setText("confirmStudentDiscountText", "-" + money(fare.studentDiscount));
  setText("confirmReferralDiscountText", "-" + money(fare.referralDiscount));
  setText("confirmSharedDiscountText", "-" + money(fare.sharedDiscount));
  setText("confirmTotalText", money(fare.total));

  setText("pickupText", booking.pickup_address);
  setText("dropoffText", booking.dropoff_address);
  setText("dateText", booking.ride_date);
  setText("timeText", booking.ride_time);
  setText("tripTypeText", booking.trip_type);
  setText("rideCategoryText", booking.ride_category);
  setText("sharedRideText", booking.shared_ride ? "Selected" : "Not selected");
  setText("passengersText", String(booking.passengers || 1));
  setText("luggageText", String(booking.luggage_count || 0));
  setText("notesText", booking.notes || "None");
  setText("referralText", booking.referral_code || "None");

  setText("pricingTierText", fare.pricingTier);
  setText("distanceText", `${fare.miles.toFixed(1)} miles`);
  setText("driveTimeText", "Calculated during dispatch");
  setText("mileageFareText", money(fare.mileageFare));
  setText("sharedRideDiscountText", "-" + money(fare.sharedDiscount));
  setText("studentDiscountText", "-" + money(fare.studentDiscount));
  setText("referralDiscountText", "-" + money(fare.referralDiscount));
  setText("finalPriceText", money(fare.total));
}

window.confirmBooking = async function confirmBooking() {
  const booking = getDraftBooking();
  const fare = calculateFare(booking);
  const button = document.getElementById("confirmBtn");

  if (!booking.email || !booking.pickup_address) {
    alert("Booking details missing.");
    window.location.href = "book-ride.html";
    return;
  }

  const payload = {
    name: booking.name,
    passenger_name: booking.passenger_name,
    email: booking.email,
    phone: booking.phone,

    route: booking.route,
    tripType: booking.tripType,
    trip_type: booking.trip_type,

    date: booking.date,
    time: booking.time,
    ride_date: booking.ride_date,
    ride_time: booking.ride_time,

    pickup: booking.pickup,
    dropoff: booking.dropoff,
    pickup_address: booking.pickup_address,
    dropoff_address: booking.dropoff_address,

    miles: String(fare.miles),
    estimated_miles: String(fare.miles),

    base: String(fare.baseFare),
    base_fare: String(fare.baseFare),
    base_fare_amount: String(fare.baseFare),

    mileage_rate: String(fare.mileageRate),
    mileage_fare: String(fare.mileageFare),

    total: String(fare.total),
    total_fare: fare.total.toFixed(2),
    balance_due: fare.total.toFixed(2),

    status: "pending",
    invoice_no: generateInvoiceNumber(),
    invoice_status: "Pending",

    source: "website",
    ride_category: booking.ride_category,

    luggage_count: booking.luggage_count,
    notes: booking.notes,
    passengers: booking.passengers,

    promo_code: booking.referral_code || null,
    referral_code: booking.referral_code || null,
    referral_code_used: booking.referral_code || null,

    referral_discount: String(fare.referralDiscount),
    student_discount: String(fare.studentDiscount),
    total_discount: String(fare.totalDiscount),

    payment_status: "unpaid",

    driver_share: fare.driverShare.toFixed(2),
    company_share: fare.companyShare.toFixed(2),
    driver_payout_percent: "70",
    company_commission_percent: "30",

    pricing_model: "v5",
    pricing_tier: fare.pricingTier,

    student_verified: Boolean(booking.student_verified),
    shared_ride: Boolean(booking.shared_ride),
    is_shared_ride: Boolean(booking.shared_ride),
    shared_discount: String(fare.sharedDiscount),
  };

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Submitting...";
    }

    if (!aeSupabase) {
      throw new Error("Supabase is not connected.");
    }

    const { data, error } = await aeSupabase
      .from("bookings")
      .insert([payload])
      .select("*")
      .single();

    if (error) throw error;

    localStorage.setItem("angelLastBooking", JSON.stringify(data || payload));

    try {
      await fetch(AE.googleScriptUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload),
      });
    } catch {
      console.log("Google script notification skipped.");
    }

    window.location.href = "success.html";
  } catch (error) {
    alert("Booking could not be saved. " + (error.message || ""));

    if (button) {
      button.disabled = false;
      button.textContent = "Confirm Booking";
    }
  }
};

/* =========================
   SUCCESS PAGE
========================= */

function renderSuccessPage() {
  const booking = JSON.parse(localStorage.getItem("angelLastBooking") || "{}");

  setText("successInvoiceText", booking.invoice_no || "Your booking was received.");
  setText(
    "successRouteText",
    booking.route || "Angel Express will review your ride request."
  );
  setText(
    "successEmailText",
    booking.email
      ? `A confirmation will be sent to ${booking.email}.`
      : `Questions? Email ${AE.email}.`
  );
}

/* =========================
   PAGE ROUTER
========================= */

function initPage() {
  const file = currentPage();

  if (file === "fare-estimate.html") {
    renderFareEstimatePage();
  }

  if (file === "confirm-booking.html") {
    renderConfirmBookingPage();
  }

  if (file === "success.html") {
    renderSuccessPage();
  }
}