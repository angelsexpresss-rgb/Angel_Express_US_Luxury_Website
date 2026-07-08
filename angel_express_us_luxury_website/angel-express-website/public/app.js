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

let aeSupabase = null;

if (typeof supabase !== "undefined") {
  aeSupabase = supabase.createClient(AE.supabaseUrl, AE.supabaseAnonKey);
}

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
  document
    .querySelectorAll(
      "#chatToggle, .chat-toggle, .whatsapp-float, #chatbotBox, .chatbot-box, .mobile-support-dock"
    )
    .forEach((el) => el.remove());

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <button id="chatToggle" class="chat-toggle" type="button">
        <i class="fa-solid fa-robot"></i>
        AI Assistant
      </button>

      <a class="whatsapp-float" href="${AE.whatsapp}" target="_blank">
        <i class="fab fa-whatsapp"></i>
        Chat With Us
      </a>

      <div id="chatbotBox" class="chatbot-box">
        <div class="chatbot-header">
          <div class="chatbot-brand">
            <div class="chatbot-logo">A</div>
            <div>
              <div class="chatbot-title">Angel Express Concierge</div>
              <div class="chatbot-subtitle">Trips • Texas • Airports • Support</div>
            </div>
          </div>

          <button type="button" class="chat-close" id="chatCloseBtn">×</button>
        </div>

        <div class="chatbot-messages" id="chatbotMessages"></div>

        <div class="quick-prompts">
          <button data-prompt="I want to book a ride">Book ride</button>
          <button data-prompt="How much is a ride?">Fare help</button>
          <button data-prompt="I need airport transportation">Airport</button>
          <button data-prompt="I want to become a driver">Drive</button>
          <button data-prompt="Contact support">Support</button>
        </div>

        <div class="chatbot-input">
          <input id="chatInput" placeholder="Ask Angel Express anything..." />
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
      ${text}
      <span class="chat-time">${timeNow()}</span>
    `;

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function openChat() {
    box.classList.add("open");

    if (!messages.children.length) {
      addMessage(
        `Welcome to Angel Express. I can help with bookings, fares, airport trips, chauffeur applications, merchandise, and support.`
      );
    }

    setTimeout(() => input.focus(), 120);
  }

  function closeChat() {
    box.classList.remove("open");
  }

  function answer(text) {
    const t = text.toLowerCase();

    if (t.includes("book") || t.includes("ride") || t.includes("reservation")) {
      return `Start here: <a href="book-ride.html">Book a Ride</a>.`;
    }

    if (
      t.includes("fare") ||
      t.includes("price") ||
      t.includes("cost") ||
      t.includes("estimate")
    ) {
      return `Start a fare estimate here: <a href="book-ride.html">Book a Ride</a>.`;
    }

    if (
      t.includes("airport") ||
      t.includes("dfw") ||
      t.includes("love field") ||
      t.includes("flight")
    ) {
      return `We support DFW, Love Field, Austin, Houston, and regional airport rides. <a href="book-ride.html">Book here</a>.`;
    }

    if (t.includes("driver") || t.includes("drive") || t.includes("chauffeur")) {
      return `Apply here: <a href="driver.html#apply">Drive With Angel Express</a>.`;
    }

    if (
      t.includes("merch") ||
      t.includes("shirt") ||
      t.includes("cap") ||
      t.includes("candle")
    ) {
      return `Shop here: <a href="angel-merchandise.html">Angel Merchandise</a>.`;
    }

    if (t.includes("terms") || t.includes("privacy")) {
      return `Review policies here: <a href="terms.html">Terms</a>.`;
    }

    return `Email <a href="mailto:${AE.email}">${AE.email}</a>, call <a href="tel:+${AE.phoneRaw}">${AE.phoneDisplay}</a>, or use <a href="${AE.whatsapp}" target="_blank">WhatsApp</a>.`;
  }

  function sendMessage(text) {
    const message = (text || input.value || "").trim();

    if (!message) return;

    addMessage(message, "user");
    input.value = "";

    setTimeout(() => {
      addMessage(answer(message));
    }, 250);
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

  document.querySelectorAll(".quick-prompts button").forEach((button) => {
    button.addEventListener("click", () => {
      sendMessage(button.dataset.prompt);
    });
  });
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