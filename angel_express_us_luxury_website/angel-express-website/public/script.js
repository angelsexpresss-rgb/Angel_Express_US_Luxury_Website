const SUPABASE_URL = "https://zlzastjpvbboniybyvjv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Fn0wUeIUskON-kTpl8kDFw_B1Exp0EP";

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzfjXYUphz8-nyETcdMYOpHCPoBY33V17OkAZMODpBRVT2V6m8H9DTG5iBM63QqbHtR/exec";

const OWNER_WHATSAPP = "19728367910";

let supabaseClient = null;

if (typeof supabase !== "undefined") {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/* =========================
   SLIDESHOW
========================= */

const slides = document.querySelectorAll(".slide");
const dots = document.getElementById("dots");
let active = 0;

if (slides.length && dots) {
  slides.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.onclick = () => setSlide(index);
    dots.appendChild(dot);
  });

  function setSlide(index) {
    slides[active].classList.remove("active");
    dots.children[active].classList.remove("active");

    active = index;

    slides[active].classList.add("active");
    dots.children[active].classList.add("active");

    document.querySelectorAll("video").forEach((v) => v.pause());

    const video = slides[active].querySelector("video");
    if (video) video.play().catch(() => {});
  }

  setSlide(0);

  setInterval(() => {
    setSlide((active + 1) % slides.length);
  }, 5000);
}

/* =========================
   HELPERS
========================= */

function cleanPhone(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function generateInvoiceNumber() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const uniqueCode = Date.now().toString().slice(-6);

  return `AE-${year}${month}${day}-${uniqueCode}`;
}

/* =========================
   LEGACY WEBSITE BOOKING SUPPORT
========================= */

const pickupEl = document.getElementById("pickup");
const dropoffEl = document.getElementById("dropoff");
const pricePreview = document.getElementById("pricePreview");

const ORS_API_KEY =
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjliZjA4M2Q3NzA3NDQzY2Y4MzFlOGRlYmQ5YTVkYTRjIiwiaCI6Im11cm11cjY0In0=";

async function calculatePrice() {
  if (!pickupEl || !dropoffEl || !pricePreview) return;

  const pickup = pickupEl.value.trim();
  const dropoff = dropoffEl.value.trim();

  if (!pickup || !dropoff) return;

  try {
    const startRes = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(
        pickup
      )}`
    );

    const startData = await startRes.json();

    const endRes = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(
        dropoff
      )}`
    );

    const endData = await endRes.json();

    if (!startData.features.length || !endData.features.length) {
      pricePreview.textContent = "Address not found.";
      return;
    }

    const start = startData.features[0].geometry.coordinates;
    const end = endData.features[0].geometry.coordinates;

    const routeRes = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      {
        method: "POST",
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: [start, end],
        }),
      }
    );

    const routeData = await routeRes.json();

    const meters = routeData.routes[0].summary.distance;
    const miles = meters * 0.000621371;
    const total = Math.ceil(miles);

    const milesEl = document.getElementById("miles");
    const baseEl = document.getElementById("base");
    const totalEl = document.getElementById("total");

    if (milesEl) milesEl.value = miles.toFixed(1);
    if (baseEl) baseEl.value = total;
    if (totalEl) totalEl.value = total;

    pricePreview.textContent = `${miles.toFixed(1)} miles • $${total}`;
  } catch (err) {
    console.error(err);
    pricePreview.textContent = "Unable to calculate route.";
  }
}

if (pickupEl && dropoffEl) {
  pickupEl.addEventListener("blur", calculatePrice);
  dropoffEl.addEventListener("blur", calculatePrice);
}

function getPrice() {
  const pickup = document.getElementById("pickup");
  const dropoff = document.getElementById("dropoff");
  const miles = document.getElementById("miles");
  const base = document.getElementById("base");
  const total = document.getElementById("total");

  return {
    route: `${pickup?.value || ""} → ${dropoff?.value || ""}`,
    miles: Number(miles?.value || 0),
    base: Number(base?.value || 0),
    total: Number(total?.value || 0),
  };
}

function buildBooking() {
  const price = getPrice();

  const booking = {
    name: document.getElementById("name")?.value.trim() || "",
    phone: cleanPhone(document.getElementById("phone")?.value.trim() || ""),
    email: document.getElementById("email")?.value.trim() || "",
    route: price.route,
    date: document.getElementById("date")?.value || "",
    time: document.getElementById("time")?.value || "",
    pickup: document.getElementById("pickup")?.value.trim() || "",
    dropoff: document.getElementById("dropoff")?.value.trim() || "",
    miles: price.miles,
    base: price.base,
    total: price.total,
    status: "pending",
  };

  if (
    !booking.name ||
    !booking.phone ||
    !booking.date ||
    !booking.time ||
    !booking.pickup ||
    !booking.dropoff
  ) {
    alert("Please complete all required booking fields.");
    return null;
  }

  return booking;
}

function ownerMessage(b) {
  return `NEW ANGEL EXPRESS BOOKING

Passenger: ${b.name || "Website Passenger"}
Phone: ${b.phone || "Not provided"}
Email: ${b.email || "Not provided"}

Route: ${b.route || "Not provided"}
Trip Type: ${b.trip_type || "Not specified"}
Date: ${b.date || "Not provided"}
Time: ${b.time || "Not provided"}

Pickup: ${b.pickup || "Not provided"}
Drop-off: ${b.dropoff || "Not provided"}

Miles: ${b.miles || 0}
Total: $${Number(b.total || 0).toFixed(2)}

Please confirm availability.`;
}

const bookingForm = document.getElementById("bookingForm");

if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!supabaseClient) {
      alert("Supabase is not connected on this page.");
      return;
    }

    const loader = document.getElementById("bookingLoader");
    const submitBtn = document.querySelector(
      "#bookingForm button[type='submit']"
    );

    if (submitBtn?.disabled) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing...";
    }

    if (loader) loader.classList.add("show");

    const booking = buildBooking();

    if (!booking) {
      if (loader) loader.classList.remove("show");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save Booking";
      }
      return;
    }

    booking.invoice_no = generateInvoiceNumber();
    booking.invoice_status = "Pending";

    try {
      const { data, error } = await supabaseClient
        .from("bookings")
        .insert([booking])
        .select("*")
        .single();

      if (error) throw error;

      const emailBooking = {
        ...booking,
        trip_type: document.getElementById("tripType")?.value || "One Way",
        invoice_pdf: "",
        amount_paid: 0,
        balance_due: booking.total,
      };

      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(emailBooking),
      });

      const whatsappText = encodeURIComponent(
        ownerMessage({
          ...booking,
          id: data?.id,
        })
      );

      window.open(
        `https://wa.me/${OWNER_WHATSAPP}?text=${whatsappText}`,
        "_blank"
      );

      window.location.href = "success.html";
    } catch (err) {
      console.error(err);

      if (loader) loader.classList.remove("show");

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save Booking";
      }

      alert("Booking could not be saved. " + err.message);
    }
  });
}

/* =========================
   ADMIN RECORDS SUPPORT
========================= */

async function loadBookings() {
  const list = document.getElementById("bookingList");
  if (!list) return;

  try {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    const bookings = data.bookings || [];

    if (!bookings.length) {
      list.innerHTML = `<p>No bookings saved yet.</p>`;
      return;
    }

    list.innerHTML = bookings
      .slice()
      .reverse()
      .map(
        (b) => `
      <div class="record">
        <b>${b.name} — ${b.route}</b>
        <span>${b.date} at ${b.time}</span>
        <span>$${Number(b.total).toFixed(2)} • ${b.status}</span>
      </div>
    `
      )
      .join("");
  } catch {
    list.innerHTML = `<p>Backend not connected. Run npm install, then npm start.</p>`;
  }
}

async function loadCustomers() {
  const list = document.getElementById("customerList");
  if (!list) return;

  try {
    const res = await fetch("/api/customers");
    const data = await res.json();
    const customers = data.customers || [];

    if (!customers.length) {
      list.innerHTML = `<p>No customers saved yet.</p>`;
      return;
    }

    list.innerHTML = customers
      .slice()
      .reverse()
      .map(
        (c) => `
      <div class="record">
        <b>${c.name}</b>
        <span>${c.phone}</span>
        <span>${c.totalBookings} booking(s) • Last route: ${
          c.lastRoute || "N/A"
        }</span>
      </div>
    `
      )
      .join("");
  } catch {
    list.innerHTML = `<p>Backend not connected. Run npm install, then npm start.</p>`;
  }
}

const refreshBookingsBtn = document.getElementById("refreshBookings");
const refreshCustomersBtn = document.getElementById("refreshCustomers");

if (refreshBookingsBtn) refreshBookingsBtn.onclick = loadBookings;
if (refreshCustomersBtn) refreshCustomersBtn.onclick = loadCustomers;

/* =========================
   ANGEL EXPRESS SMART CONCIERGE
========================= */

const chatToggle = document.getElementById("chatToggle");
const chatbotBox = document.getElementById("chatbotBox");
const chatInput = document.getElementById("chatInput");
const chatbotMessages = document.getElementById("chatbotMessages");

if (chatToggle && chatbotBox) {
  chatToggle.addEventListener("click", () => {
    chatbotBox.classList.toggle("open");

    if (chatbotBox.classList.contains("open") && chatInput) {
      setTimeout(() => chatInput.focus(), 200);
    }
  });
}

if (chatInput) {
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendChat();
    }
  });
}

const angelKnowledgeBase = [
  {
    keywords: ["book", "reserve", "reservation", "schedule", "request ride"],
    answer:
      `You can start your Angel Express booking here: <a href="book-ride.html">Book a Ride</a>. The flow is Book Ride → Fare Estimate → Confirm Booking → Success.`,
  },
  {
    keywords: ["fare", "price", "cost", "estimate", "how much", "quote"],
    answer:
      `Angel Express uses distance-based pricing. Start your estimate here: <a href="book-ride.html">Get Fare Estimate</a>. Final pricing may be reviewed based on route, wait time, airport pickup, event traffic, and special requests.`,
  },
  {
    keywords: ["payment", "pay", "card", "apple pay", "google pay", "stripe"],
    answer:
      "Payment is collected after your ride is completed unless Angel Express confirms otherwise. Angel Express is designed to support secure payment methods including Stripe, Apple Pay, and Google Pay.",
  },
  {
    keywords: ["cash", "zelle", "cash app"],
    answer:
      "Angel Express may use Zelle or Cash App as backup payment or payout contact methods when needed. For payment-specific questions, please contact support directly.",
  },
  {
    keywords: ["cancel", "cancellation", "reschedule", "change booking"],
    answer:
      `Please contact Angel Express as early as possible for cancellations, rescheduling, or booking changes. The fastest option is <a href="https://wa.me/19728367910" target="_blank">Chat With Us</a>.`,
  },
  {
    keywords: ["airport", "dfw", "love field", "flight", "terminal"],
    answer:
      "Yes. Angel Express supports airport transfers including DFW Airport and Dallas Love Field. You can include flight number, terminal, luggage details, and pickup instructions in your booking notes.",
  },
  {
    keywords: ["student", "college", "university", "campus", "school", "discount"],
    answer:
      "Angel Express supports student travel, campus pickups, student group rides, and verified student discounts. Campus routes may include UTD, UNT, SMU, UT Arlington, Texas A&M, UT Austin, and custom student destinations.",
  },
  {
    keywords: ["group", "family", "multiple passengers", "passengers"],
    answer:
      "Angel Express supports private group rides, student group rides, families, tourists, and event passengers. You can enter passenger count and luggage count during booking.",
  },
  {
    keywords: ["luggage", "bags", "suitcase", "cargo"],
    answer:
      "You can enter your luggage count during booking. For large luggage, airport travel, student move-in, or group travel, include extra details in the notes section.",
  },
  {
    keywords: ["austin", "dallas to austin"],
    answer:
      `Angel Express supports Dallas to Austin private rides. Start here to estimate and book: <a href="book-ride.html">Book Dallas to Austin Ride</a>.`,
  },
  {
    keywords: ["houston", "dallas to houston"],
    answer:
      `Angel Express supports Dallas to Houston private rides for students, families, airport travelers, and private groups. Start here: <a href="book-ride.html">Book a Ride</a>.`,
  },
  {
    keywords: ["san antonio"],
    answer:
      "Angel Express supports private long-distance rides from Dallas to San Antonio and custom Texas destinations.",
  },
  {
    keywords: ["oklahoma", "okc", "oklahoma city"],
    answer:
      "Angel Express supports Dallas to Oklahoma City private regional rides.",
  },
  {
    keywords: ["college station", "texas a&m", "tamu"],
    answer:
      "Angel Express supports Dallas to College Station and Texas A&M travel for students, families, and campus trips.",
  },
  {
    keywords: ["routes", "cities", "where do you go", "where", "destination"],
    answer:
      "Angel Express supports Dallas, Austin, Houston, San Antonio, Oklahoma City, College Station, airports, hotels, campuses, events, World Cup travel, and custom destinations.",
  },
  {
    keywords: ["world cup", "fifa", "stadium", "soccer", "fan"],
    answer:
      `Angel Express provides World Cup 2026 transportation support for visitors, fans, hotels, airports, student groups, tourists, and regional Texas travel. You can reserve here: <a href="book-ride.html">Reserve World Cup Ride</a>.`,
  },
  {
    keywords: ["hotel", "tourist", "tourism", "visitor"],
    answer:
      "Angel Express supports tourists and visitors with airport transfers, hotel pickups, city-to-city rides, event transportation, and custom travel plans.",
  },
  {
    keywords: ["private", "chauffeur", "luxury", "premium"],
    answer:
      "Angel Express provides private ride service with a professional chauffeur experience, clean vehicle standards, direct communication, and organized trip support.",
  },
  {
    keywords: ["driver", "drive", "chauffeur", "become a driver", "apply"],
    answer:
      `You can learn about driving with Angel Express here: <a href="driver.html">Drive With Us</a>. Approved chauffeurs can access premium long-distance and private ride opportunities.`,
  },
  {
    keywords: ["driver pay", "payout", "earnings", "70", "30"],
    answer:
      "Angel Express uses a 70/30 payout model: drivers receive 70% of eligible ride revenue and Angel Express keeps 30% for operations, technology, support, and business management.",
  },
  {
    keywords: ["vehicle", "car", "clean vehicle", "requirements"],
    answer:
      "Angel Express expects chauffeurs to maintain a clean, comfortable, professional, and safe vehicle suitable for private transportation and long-distance rides.",
  },
  {
    keywords: ["safety", "safe", "emergency", "tracking", "family"],
    answer:
      "Angel Express is designed around safety, including emergency contact support, live trip tracking, driver approval, owner monitoring, trip records, and direct communication.",
  },
  {
    keywords: ["live tracking", "track", "gps", "location"],
    answer:
      "Angel Express is building live trip tracking through the Passenger App, Driver App, and Owner App so passengers and operations can follow trip progress.",
  },
  {
    keywords: ["owner", "operations", "monitoring"],
    answer:
      "The Angel Express Owner App is designed for live operations oversight, including trips, drivers, passengers, payments, alerts, and support needs.",
  },
  {
    keywords: ["app", "passenger app", "download", "ios", "android"],
    answer:
      "The Angel Express Passenger App is designed for booking, ride tracking, trip history, rewards, support, emergency sharing, and live ride updates. App download links will be added once published.",
  },
  {
    keywords: ["rewards", "referral", "promo", "code"],
    answer:
      "Angel Express supports referral and promo codes. You can enter your promo or referral code during the booking process.",
  },
  {
    keywords: ["contact", "support", "help", "phone", "email", "whatsapp", "chat"],
    answer:
      `You can contact Angel Express by phone or WhatsApp at <a href="https://wa.me/19728367910" target="_blank">+1 (972) 836-7910</a> or email <a href="mailto:angelsexpresss@gmail.com">angelsexpresss@gmail.com</a>.`,
  },
  {
    keywords: ["hours", "open", "available", "24/7"],
    answer:
      "Angel Express is available by reservation. For urgent or time-sensitive ride requests, use Chat With Us for the fastest response.",
  },
  {
    keywords: ["privacy", "terms", "policy", "data"],
    answer:
      `You can review Angel Express Terms of Service and Privacy Policy here: <a href="terms.html">Terms & Privacy</a>.`,
  },
  {
    keywords: ["blog", "article", "road travel"],
    answer:
      `Angel Express publishes travel articles and transportation guides here: <a href="blog.html">Angel Express Blog</a>.`,
  },
  {
    keywords: ["hello", "hi", "hey", "good morning", "good evening"],
    answer:
      "Hello! Welcome to Angel Express. I can help with booking, fare estimates, routes, airport transfers, student travel, World Cup rides, or chauffeur applications.",
  },
];

const quickReplies = [
  {
    label: "Book a Ride",
    href: "book-ride.html",
  },
  {
    label: "Passenger Services",
    href: "passenger.html",
  },
  {
    label: "Drive With Us",
    href: "driver.html",
  },
  {
    label: "Chat With Us",
    href: "https://wa.me/19728367910",
    external: true,
  },
];

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addChatMessage(sender, message, isHtml = false) {
  if (!chatbotMessages) return;

  const safeMessage = isHtml ? message : escapeHtml(message);

  chatbotMessages.innerHTML += `
    <p><strong>${sender}:</strong> ${safeMessage}</p>
  `;

  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function getSmartConciergeAnswer(question) {
  const q = question.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  angelKnowledgeBase.forEach((item) => {
    let score = 0;

    item.keywords.forEach((keyword) => {
      if (q.includes(keyword.toLowerCase())) {
        score += keyword.length;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  });

  if (bestMatch) return bestMatch.answer;

  return `I can help with Angel Express bookings, fare estimates, routes, airport transfers, student travel, World Cup transportation, chauffeur applications, payment questions, and support. You can also start here: <a href="book-ride.html">Book a Ride</a>.`;
}

function renderQuickReplies() {
  if (!chatbotMessages) return;

  const buttons = quickReplies
    .map((item) => {
      const target = item.external ? `target="_blank"` : "";
      return `<a class="chat-quick-link" href="${item.href}" ${target}>${item.label}</a>`;
    })
    .join("");

  chatbotMessages.innerHTML += `
    <div class="chat-quick-links">
      ${buttons}
    </div>
  `;

  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function sendChat() {
  if (!chatInput || !chatbotMessages) return;

  const question = chatInput.value.trim();
  if (!question) return;

  addChatMessage("You", question);

  const answer = getSmartConciergeAnswer(question);

  setTimeout(() => {
    addChatMessage("Angel Assistant", answer, true);
    renderQuickReplies();
  }, 300);

  chatInput.value = "";
}
document.addEventListener("DOMContentLoaded", () => {
  const navItems = [
    { label: "Home", href: "index.html" },
    { label: "Book Ride", href: "book-ride.html" },
    { label: "Fare Estimate", href: "fare-estimate.html" },
    { label: "Passengers", href: "passenger.html" },
    { label: "Drivers", href: "driver.html" },
    { label: "Terms", href: "terms.html" },
    { label: "Blog", href: "blog.html" },
    { label: "Angel Merchandise", href: "angel-merchandise.html" },
    { label: "Contact", href: "contact.html" },
    { label: "Become a Chauffeur", href: "driver.html" },
  ];

  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  const header = document.createElement("header");
  header.className = "ae-global-header";

  header.innerHTML = `
    <div class="ae-nav-brand" onclick="window.location.href='index.html'">
      <div class="ae-logo-box">A</div>
      <div>
        <div class="ae-brand-title">ANGEL EXPRESS</div>
        <div class="ae-brand-subtitle">MOBILITY ECOSYSTEM</div>
      </div>
    </div>

    <button class="ae-menu-toggle" id="aeMenuToggle" type="button">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <nav class="ae-nav-menu" id="aeNavMenu">
      ${navItems
        .map(
          (item) => `
          <a 
            href="${item.href}" 
            class="${currentPage === item.href ? "active" : ""}"
          >
            ${item.label}
          </a>
        `
        )
        .join("")}
    </nav>
  `;

  document.body.prepend(header);

  const menuToggle = document.getElementById("aeMenuToggle");
  const navMenu = document.getElementById("aeNavMenu");

  menuToggle.addEventListener("click", () => {
    navMenu.classList.toggle("open");
    menuToggle.classList.toggle("open");
  });
});