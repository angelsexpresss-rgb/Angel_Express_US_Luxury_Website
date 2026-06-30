(function () {
  const OWNER_WHATSAPP = "19728367910";
  const GOOGLE_MAPS_SEARCH = "https://www.google.com/maps/search/";
  const BOOKING_PAGE = "book-ride.html";

  const hiddenPages = ["fare-estimate.html", "confirm-booking.html", "success.html"];
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  if (hiddenPages.includes(currentPage)) {
    document
      .querySelectorAll("#angelChatStyle,#chatToggle,.whatsapp-float,#chatbotBox,.mobile-support-dock,.mobile-support-btn,#mobileChatBtn")
      .forEach((el) => el.remove());
    return;
  }

  const memory = {
    messages: [],
    intent: "general",
    pickup: "",
    dropoff: "",
    airport: "",
    hotel: "",
    event: "",
    restaurant: "",
    flight: "",
    date: "",
    time: "",
    passengers: "",
    luggage: "",
    student: false,
    sharedRide: false,
    tripType: "",
    city: "Dallas, TX",
    preferences: [],
  };

  function buildAngelSupport() {
    document
      .querySelectorAll("#angelChatStyle,#chatToggle,.whatsapp-float,#chatbotBox,.mobile-support-dock,.mobile-support-btn,#mobileChatBtn")
      .forEach((el) => el.remove());

    const style = document.createElement("style");
    style.id = "angelChatStyle";
    style.innerHTML = `
      .chat-toggle,.whatsapp-float{
        position:fixed;right:24px;z-index:999999;border:none;border-radius:999px;
        min-height:58px;padding:0 24px;font-weight:950;font-size:17px;cursor:pointer;
        text-decoration:none;display:flex;align-items:center;justify-content:center;gap:10px;
        box-shadow:0 20px 50px rgba(0,0,0,.38);
      }
      .chat-toggle{bottom:102px;background:linear-gradient(135deg,#D4AF37,#b88918);color:#050b16;}
      .whatsapp-float{bottom:28px;background:#25D366;color:#050b16;}

      .chatbot-box{
        position:fixed;right:26px;bottom:172px;width:390px;height:510px;
        max-width:calc(100vw - 52px);max-height:calc(100vh - 190px);
        z-index:1000000;display:none;flex-direction:column;overflow:hidden;border-radius:28px;
        background:rgba(5,11,22,.98);border:1px solid rgba(212,175,55,.38);
        box-shadow:0 30px 90px rgba(0,0,0,.58);backdrop-filter:blur(22px);
      }
      .chatbot-box.open{display:flex;}

      .chatbot-header{
        padding:15px;background:radial-gradient(circle at 10% 0%,rgba(255,255,255,.26),transparent 30%),linear-gradient(135deg,#D4AF37,#b88918);
        color:#050b16;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;
      }
      .chatbot-brand{display:flex;align-items:center;gap:10px;}
      .chatbot-logo{width:40px;height:40px;border-radius:14px;background:#050b16;color:#D4AF37;display:grid;place-items:center;font-weight:950;font-size:24px;}
      .chatbot-title{font-weight:950;font-size:15px;line-height:1.1;}
      .chatbot-subtitle{font-size:11px;font-weight:850;opacity:.78;margin-top:3px;}
      #chatCloseBtn{border:none;background:rgba(5,11,22,.16);color:#050b16;width:34px;height:34px;border-radius:999px;font-size:24px;font-weight:900;cursor:pointer;}

      .chatbot-messages{flex:1;min-height:0;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth;}
      .chat-msg{max-width:92%;padding:13px 15px;border-radius:20px;line-height:1.5;font-size:14px;animation:aeMsgIn .25s ease;}
      @keyframes aeMsgIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
      .chat-msg.bot{align-self:flex-start;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(212,175,55,.15);border-top-left-radius:8px;}
      .chat-msg.user{align-self:flex-end;background:#D4AF37;color:#050b16;font-weight:850;border-top-right-radius:8px;}
      .chat-time{display:block;margin-top:7px;opacity:.58;font-size:10px;font-weight:700;}

      .typing-bubble{align-self:flex-start;background:rgba(255,255,255,.08);border:1px solid rgba(212,175,55,.15);color:#D4AF37;padding:12px 14px;border-radius:18px;font-size:13px;display:none;margin:0 16px 10px;}
      .typing-bubble.show{display:block;}

      .quick-prompts{flex-shrink:0;display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 12px;}
      .quick-prompts button{border:1px solid rgba(212,175,55,.35);background:rgba(212,175,55,.10);color:#D4AF37;border-radius:999px;padding:8px 11px;font-weight:900;font-size:12px;cursor:pointer;}
      .quick-prompts button:hover{background:rgba(212,175,55,.18);}

      .chatbot-input{display:grid;grid-template-columns:1fr auto;border-top:1px solid rgba(255,255,255,.08);background:#0b1220;flex-shrink:0;}
      #chatInput{min-height:58px;padding:0 15px;background:rgba(255,255,255,.07);border:none;color:#fff;outline:none;font-size:15px;min-width:0;}
      #chatSendBtn{border:none;padding:0 20px;background:#D4AF37;color:#050b16;font-weight:950;cursor:pointer;}

      .chat-action-link{display:inline-block;margin-top:10px;margin-right:7px;padding:10px 13px;border-radius:999px;background:#D4AF37;color:#050b16!important;text-decoration:none;font-weight:950;}
      .chat-action-dark{display:inline-block;margin-top:10px;margin-right:7px;padding:10px 13px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(212,175,55,.28);color:#D4AF37!important;text-decoration:none;font-weight:950;}
      .chat-mini-card{margin-top:10px;padding:12px;border-radius:16px;background:rgba(212,175,55,.09);border:1px solid rgba(212,175,55,.2);}
      .chat-mini-card strong{color:#D4AF37;}
      .chat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;}
      .chat-pill{padding:9px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(212,175,55,.16);font-size:12px;}

      @media(min-width:769px) and (max-width:1180px){
        .chat-toggle,.whatsapp-float{right:22px;}
        .chatbot-box{right:22px;bottom:170px;width:365px;height:485px;max-height:calc(100vh - 185px);}
      }
      @media(min-width:1181px){
        .chatbot-box{right:28px;bottom:170px;width:390px;height:510px;max-height:calc(100vh - 185px);}
      }
      @media(max-width:768px){
        .chat-toggle,.whatsapp-float{left:18px;right:18px;width:auto;min-height:58px;}
        .chat-toggle{bottom:96px;}
        .whatsapp-float{bottom:26px;}
        .chatbot-box{left:10px;right:10px;bottom:166px;width:auto;height:68vh;max-height:68vh;max-width:none;border-radius:26px;}
        .chat-msg{max-width:92%;font-size:14px;}
      }
    `;
    document.head.appendChild(style);

    const chatToggle = document.createElement("button");
    chatToggle.id = "chatToggle";
    chatToggle.className = "chat-toggle";
    chatToggle.type = "button";
    chatToggle.innerHTML = "💬 AI Assistant";

    const whatsappFloat = document.createElement("a");
    whatsappFloat.href = `https://wa.me/${OWNER_WHATSAPP}`;
    whatsappFloat.target = "_blank";
    whatsappFloat.className = "whatsapp-float";
    whatsappFloat.innerHTML = "💬 Chat With Us";

    const chatbotBox = document.createElement("div");
    chatbotBox.id = "chatbotBox";
    chatbotBox.className = "chatbot-box";
    chatbotBox.innerHTML = `
      <div class="chatbot-header">
        <div class="chatbot-brand">
          <div class="chatbot-logo">A</div>
          <div>
            <div class="chatbot-title">Angel Express Concierge</div>
            <div class="chatbot-subtitle">Trips • Texas • Airports • Tourism</div>
          </div>
        </div>
        <button type="button" id="chatCloseBtn">×</button>
      </div>

      <div class="chatbot-messages" id="chatbotMessages"></div>
      <div class="typing-bubble" id="typingBubble">Angel Concierge is planning...</div>

      <div class="quick-prompts">
        <button data-prompt="Plan my full trip">Trip planner</button>
        <button data-prompt="Find hotels around me">Hotels</button>
        <button data-prompt="Find restaurants around me">Restaurants</button>
        <button data-prompt="Show World Cup travel help">World Cup</button>
        <button data-prompt="Check traffic and weather">Traffic/weather</button>
        <button data-prompt="Book a ride">Book ride</button>
      </div>

      <div class="chatbot-input">
        <input id="chatInput" type="text" placeholder="Ask Angel Express anything...">
        <button type="button" id="chatSendBtn">Send</button>
      </div>
    `;

    document.body.appendChild(chatToggle);
    document.body.appendChild(whatsappFloat);
    document.body.appendChild(chatbotBox);

    const messages = document.getElementById("chatbotMessages");
    const input = document.getElementById("chatInput");
    const typingBubble = document.getElementById("typingBubble");

    const nowTime = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const mapsLink = (query) => `${GOOGLE_MAPS_SEARCH}${encodeURIComponent(query)}`;
    const waLink = (text) => `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(text)}`;

    function addMessage(text, sender) {
      const div = document.createElement("div");
      div.className = `chat-msg ${sender}`;
      div.innerHTML = `${text}<span class="chat-time">${nowTime()}</span>`;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
      memory.messages.push({ sender, text, time: Date.now() });
    }

    function showTyping() { typingBubble.classList.add("show"); }
    function hideTyping() { typingBubble.classList.remove("show"); }

    function extractMemory(text) {
      const t = text.toLowerCase();

      const fromTo = text.match(/from\s+(.+?)\s+to\s+(.+?)(?:\s+at|\s+on|\s+tomorrow|\s+today|$)/i);
      if (fromTo) {
        memory.pickup = fromTo[1].trim();
        memory.dropoff = fromTo[2].trim();
      }

      const flight = text.match(/\b([A-Z]{2,3}\s?\d{2,5})\b/i);
      if (flight) memory.flight = flight[1].toUpperCase();

      const pax = text.match(/(\d+)\s+(passengers|people|riders|students)/i);
      if (pax) memory.passengers = pax[1];

      const bags = text.match(/(\d+)\s+(bags|bag|luggage|suitcases|suitcase)/i);
      if (bags) memory.luggage = bags[1];

      if (t.includes("dfw")) memory.airport = "DFW Airport";
      if (t.includes("love field")) memory.airport = "Dallas Love Field";
      if (t.includes("student")) memory.student = true;
      if (t.includes("shared") || t.includes("pool")) memory.sharedRide = true;

      ["dallas", "austin", "houston", "san antonio", "college station", "fort worth", "arlington", "frisco", "plano", "irving"].forEach((city) => {
        if (t.includes(city)) memory.city = city.replace(/\b\w/g, (c) => c.toUpperCase()) + ", TX";
      });
    }

    function intentOf(text) {
      const t = text.toLowerCase();
      if (t.includes("plan") || t.includes("itinerary") || t.includes("full trip") || t.includes("journey")) return "trip_planner";
      if (t.includes("flight") || t.includes("airline") || t.includes("terminal") || t.includes("dfw") || t.includes("airport") || t.includes("love field")) return "flight_airport";
      if (t.includes("hotel") || t.includes("stay") || t.includes("marriott") || t.includes("hilton")) return "hotels";
      if (t.includes("restaurant") || t.includes("food") || t.includes("eat") || t.includes("local food") || t.includes("dinner") || t.includes("lunch")) return "restaurants";
      if (t.includes("event") || t.includes("concert") || t.includes("things to do") || t.includes("around me")) return "events";
      if (t.includes("world cup") || t.includes("stadium") || t.includes("soccer") || t.includes("match") || t.includes("score")) return "worldcup";
      if (t.includes("traffic") || t.includes("weather") || t.includes("rain") || t.includes("delay")) return "traffic_weather";
      if (t.includes("bus") || t.includes("transit") || t.includes("dart") || t.includes("route")) return "bus_transit";
      if (t.includes("student") || t.includes("campus") || t.includes("discount") || t.includes("utd") || t.includes("texas a&m")) return "student";
      if (t.includes("shared") || t.includes("pool") || t.includes("split")) return "shared";
      if (t.includes("price") || t.includes("cost") || t.includes("fare") || t.includes("estimate")) return "pricing";
      if (t.includes("book") || t.includes("ride") || t.includes("reserve") || t.includes("schedule")) return "booking";
      if (t.includes("luggage") || t.includes("bags") || t.includes("suitcase")) return "luggage";
      if (t.includes("safety") || t.includes("emergency") || t.includes("family check")) return "safety";
      if (t.includes("driver") || t.includes("chauffeur")) return "driver";
      if (t.includes("support") || t.includes("human") || t.includes("whatsapp") || t.includes("call")) return "support";
      return "general";
    }

    function actionLinks(type) {
      const booking = `<a class="chat-action-link" href="${BOOKING_PAGE}">Book This Ride</a>`;
      const support = `<a class="chat-action-dark" target="_blank" href="${waLink("Hi Angel Express, I need help with a ride.")}">Talk to Support</a>`;

      if (type === "hotels") {
        return `<a class="chat-action-link" target="_blank" href="${mapsLink("hotels near " + memory.city)}">Hotels Near You</a>${booking}`;
      }
      if (type === "restaurants") {
        return `<a class="chat-action-link" target="_blank" href="${mapsLink("restaurants near " + memory.city)}">Restaurants Near You</a>${booking}`;
      }
      if (type === "events") {
        return `<a class="chat-action-link" target="_blank" href="${mapsLink("events near " + memory.city)}">Events Near You</a>${booking}`;
      }
      if (type === "traffic") {
        return `<a class="chat-action-link" target="_blank" href="https://www.google.com/maps/@?api=1&map_action=map&layer=traffic">Open Live Traffic</a>${booking}`;
      }
      if (type === "weather") {
        return `<a class="chat-action-link" target="_blank" href="https://www.google.com/search?q=${encodeURIComponent("weather " + memory.city)}">Check Weather</a>${booking}`;
      }
      if (type === "worldcup") {
        return `<a class="chat-action-link" target="_blank" href="https://www.google.com/search?q=${encodeURIComponent("World Cup 2026 live scores") }">Live Scores</a><a class="chat-action-dark" target="_blank" href="${mapsLink("World Cup stadium Dallas Texas")}">Stadium Routes</a>${booking}`;
      }
      if (type === "bus") {
        return `<a class="chat-action-link" target="_blank" href="${mapsLink("bus route near " + memory.city)}">Bus Routes</a>${booking}`;
      }
      return `${booking}${support}`;
    }

    function richCard(title, body, items, links = "") {
      return `
        ${body}
        <div class="chat-mini-card">
          <strong>${title}</strong><br>
          ${items.map((x) => `• ${x}`).join("<br>")}
        </div>
        ${links}
      `;
    }

    function buildReply(userText) {
      extractMemory(userText);
      const intent = intentOf(userText);
      memory.intent = intent;

      if (intent === "trip_planner") {
        return richCard(
          "AI Trip Planner",
          "I can build your full Texas travel plan from arrival to return.",
          [
            "Airport pickup or city pickup",
            "Hotel transfer",
            "Restaurant or event stop",
            "Best departure time suggestion",
            "Return ride suggestion",
            "Bookable ride legs"
          ],
          actionLinks("booking")
        );
      }

      if (intent === "flight_airport") {
        return richCard(
          "Airport Pickup Card ✈️",
          "Airport ride detected. I can help you prepare the right pickup details.",
          [
            `Airport: ${memory.airport || "DFW / Love Field / custom airport"}`,
            `Flight number: ${memory.flight || "Add flight number if available"}`,
            "Terminal or gate",
            "Arrival time",
            "Luggage count",
            "Pickup instructions"
          ],
          actionLinks("booking")
        );
      }

      if (intent === "hotels") {
        return richCard(
          "Hotel Transfer Card 🏨",
          "I can help you find hotels and connect the hotel stay to your ride plan.",
          [
            `Search area: ${memory.city}`,
            "Airport → hotel transfer",
            "Hotel → event transfer",
            "Hotel → airport return",
            "Private chauffeur ride"
          ],
          actionLinks("hotels")
        );
      }

      if (intent === "restaurants") {
        return richCard(
          "Texas Food & Restaurant Guide 🍽️",
          "I can help with local food categories and restaurant stops.",
          [
            "BBQ",
            "Tex-Mex",
            "Steakhouse",
            "African food",
            "Seafood",
            "Late-night food",
            "Fine dining",
            "Student budget food"
          ],
          actionLinks("restaurants")
        );
      }

      if (intent === "events") {
        return richCard(
          "Tourist Adventure Guide 🎡",
          "I can help you discover events and plan Angel Express transportation around them.",
          [
            `Events near ${memory.city}`,
            "Hotel pickup",
            "Group ride",
            "Event drop-off",
            "Return pickup",
            "Tourist route"
          ],
          actionLinks("events")
        );
      }

      if (intent === "worldcup") {
        return richCard(
          "World Cup Travel Concierge 🌎",
          "I can help with World Cup visitor transportation and live score lookup links.",
          [
            "Airport → hotel",
            "Hotel → stadium",
            "Stadium → restaurant",
            "Return ride",
            "Group ride",
            "Live score lookup",
            "Traffic-aware departure planning"
          ],
          actionLinks("worldcup")
        );
      }

      if (intent === "traffic_weather") {
        return richCard(
          "Traffic & Weather Travel Check 🌦️",
          "I can help you plan around traffic and weather before booking.",
          [
            `City: ${memory.city}`,
            "Check live traffic",
            "Check weather",
            "Leave earlier for airport and event rides",
            "Add buffer time for storms, rush hour, and stadium traffic"
          ],
          `${actionLinks("traffic")}${actionLinks("weather")}`
        );
      }

      if (intent === "bus_transit") {
        return richCard(
          "Bus & Transit Guide 🚌",
          "I can help compare bus route options with Angel Express private rides.",
          [
            "Find nearby bus routes",
            "Compare convenience",
            "Plan last-mile pickup",
            "Use Angel Express for direct private ride"
          ],
          actionLinks("bus")
        );
      }

      if (intent === "student") {
        return richCard(
          "Student Travel+ 🎓",
          "Student ride detected. Angel Express supports verified student travel and campus rides.",
          [
            "Student discount after approval",
            "Campus pickup support",
            "Student shared ride options",
            "UTD, UTA, SMU, UNT, Texas A&M, Austin, Houston, College Station",
            "Use same email on website and Passenger App"
          ],
          actionLinks("booking")
        );
      }

      if (intent === "shared") {
        return richCard(
          "Student Shared Ride 👥",
          "Shared ride can reduce cost when Angel Express can match riders on similar routes.",
          [
            "Campus-to-campus rides",
            "Weekend student travel",
            "Holiday travel",
            "Dallas ↔ Austin / Houston / College Station",
            "Shared pricing applies only when selected and available"
          ],
          actionLinks("booking")
        );
      }

      if (intent === "pricing") {
        return richCard(
          "Fare Estimate Card 💰",
          "Your fare depends on trip details.",
          [
            "Distance",
            "Pickup and drop-off",
            "Student discount eligibility",
            "Shared ride selection",
            "Referral code",
            "Airport or event timing",
            "Special luggage or multi-stop needs"
          ],
          actionLinks("booking")
        );
      }

      if (intent === "booking") {
        const summary = [];
        if (memory.pickup) summary.push(`Pickup: ${memory.pickup}`);
        if (memory.dropoff) summary.push(`Drop-off: ${memory.dropoff}`);
        if (memory.airport) summary.push(`Airport: ${memory.airport}`);
        if (memory.passengers) summary.push(`Passengers: ${memory.passengers}`);
        if (memory.luggage) summary.push(`Luggage: ${memory.luggage} bag(s)`);

        return richCard(
          "Booking Assistant 🚘",
          "I can guide you into the booking flow.",
          summary.length ? summary : [
            "Enter pickup",
            "Enter drop-off",
            "Choose date/time",
            "Get fare estimate",
            "Confirm booking"
          ],
          actionLinks("booking")
        );
      }

      if (intent === "luggage") {
        return richCard(
          "Luggage Card 🧳",
          "Yes, you can bring luggage. Add it during booking so Angel Express can prepare properly.",
          [
            "Number of suitcases",
            "Large boxes",
            "Airport bags",
            "Group luggage",
            "Special handling notes"
          ],
          actionLinks("booking")
        );
      }

      if (intent === "safety") {
        return richCard(
          "Safety Concierge 🛡️",
          "If this is an emergency, call emergency services first. Angel Express also supports ride safety tools.",
          [
            "Family Check-In+",
            "Live trip tracking",
            "Driver contact",
            "Support escalation",
            "Emergency notes"
          ],
          actionLinks("support")
        );
      }

      if (intent === "driver") {
        return `
          Chauffeur interest detected 🚘
          <div class="chat-mini-card">
            <strong>Driver Program:</strong><br>
            • Approval required<br>
            • Professional chauffeur network<br>
            • 70% driver share model<br>
            • Live trip workflow<br>
            • Driver app support
          </div>
          <a class="chat-action-link" href="driver.html">Apply As Chauffeur</a>
        `;
      }

      if (intent === "support") {
        return richCard(
          "Human Support 🤝",
          "I can escalate you to Angel Express directly.",
          [
            "Urgent booking help",
            "Ride changes",
            "Airport pickup details",
            "Special requests",
            "Payment or receipt questions"
          ],
          actionLinks("support")
        );
      }

      return richCard(
        "Angel Express Concierge",
        "I can help with almost every passenger travel need.",
        [
          "AI trip planning",
          "Booking help",
          "Fare estimates",
          "Airport pickup",
          "Student discount",
          "Shared rides",
          "World Cup transportation",
          "Hotels, restaurants, local food",
          "Events and tourist routes",
          "Traffic, weather, bus routes",
          "Luggage, payment, safety, support"
        ],
        actionLinks("booking")
      );
    }

    function streamBotMessage(html) {
      const div = document.createElement("div");
      div.className = "chat-msg bot";
      messages.appendChild(div);

      let i = 0;
      const speed = 5;

      function type() {
        if (i < html.length) {
          div.innerHTML = html.slice(0, i + 1);
          messages.scrollTop = messages.scrollHeight;
          i++;
          setTimeout(type, speed);
        } else {
          div.innerHTML = `${html}<span class="chat-time">${nowTime()}</span>`;
          messages.scrollTop = messages.scrollHeight;
          memory.messages.push({ sender: "bot", text: html, time: Date.now() });
        }
      }

      type();
    }

    function sendChat() {
      const value = input.value.trim();
      if (!value) return;

      addMessage(value, "user");
      input.value = "";
      showTyping();

      setTimeout(() => {
        hideTyping();
        streamBotMessage(buildReply(value));
      }, 420);
    }

    window.sendChat = sendChat;

    function openChat() {
      chatbotBox.classList.add("open");
      chatbotBox.style.display = "flex";
      setTimeout(() => input.focus(), 150);
    }

    function closeChat() {
      chatbotBox.classList.remove("open");
      chatbotBox.style.display = "none";
    }

    function toggleChat() {
      chatbotBox.classList.contains("open") ? closeChat() : openChat();
    }

    chatToggle.addEventListener("click", toggleChat);
    document.getElementById("chatCloseBtn").addEventListener("click", closeChat);
    document.getElementById("chatSendBtn").addEventListener("click", sendChat);

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        sendChat();
      }
    });

    document.querySelectorAll(".quick-prompts button").forEach((btn) => {
      btn.addEventListener("click", () => {
        input.value = btn.dataset.prompt || "";
        sendChat();
      });
    });

    addMessage(
      `
      Hi! I’m your Angel Express AI Concierge. I can help plan your full trip across Texas.<br><br>
      Ask me about bookings, airport pickup, student rides, shared rides, World Cup travel, hotels, restaurants, local food, traffic, weather, bus routes, events, tourist adventures, luggage, safety, payments, and support.
      `,
      "bot"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildAngelSupport);
  } else {
    buildAngelSupport();
  }
})();