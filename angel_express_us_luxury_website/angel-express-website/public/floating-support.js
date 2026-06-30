(function () {
  const OWNER_WHATSAPP = "19728367910";

  const hiddenPages = [
    "fare-estimate.html",
    "confirm-booking.html",
    "success.html",
  ];

  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  if (hiddenPages.includes(currentPage)) {
    document
      .querySelectorAll(
        "#angelChatStyle,#chatToggle,.whatsapp-float,#chatbotBox,.mobile-support-dock,.mobile-support-btn,#mobileChatBtn"
      )
      .forEach((el) => el.remove());
    return;
  }

  const state = {
    messages: [],
    intent: "general",
    rideType: null,
    pickup: "",
    dropoff: "",
    date: "",
    time: "",
    passengerType: "",
  };

  function buildAngelSupport() {
    document
      .querySelectorAll(
        "#angelChatStyle,#chatToggle,.whatsapp-float,#chatbotBox,.mobile-support-dock,.mobile-support-btn,#mobileChatBtn"
      )
      .forEach((el) => el.remove());

    const style = document.createElement("style");
    style.id = "angelChatStyle";

    style.innerHTML = `
      .chat-toggle,
      .whatsapp-float{
        position:fixed;
        right:24px;
        z-index:999999;
        border:none;
        border-radius:999px;
        min-height:58px;
        padding:0 24px;
        font-weight:950;
        font-size:17px;
        cursor:pointer;
        text-decoration:none;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:10px;
        box-shadow:0 20px 50px rgba(0,0,0,.38);
      }

      .chat-toggle{
        bottom:102px;
        background:linear-gradient(135deg,#D4AF37,#b88918);
        color:#050b16;
      }

      .whatsapp-float{
        bottom:28px;
        background:#25D366;
        color:#050b16;
      }

      .chatbot-box{
        position:fixed;
        right:24px;
        bottom:170px;
        width:390px;
        height:520px;
        max-width:calc(100vw - 40px);
        max-height:calc(100vh - 130px);
        z-index:1000000;
        display:none;
        flex-direction:column;
        overflow:hidden;
        border-radius:28px;
        background:rgba(5,11,22,.98);
        border:1px solid rgba(212,175,55,.38);
        box-shadow:0 30px 90px rgba(0,0,0,.58);
        backdrop-filter:blur(22px);
      }

      .chatbot-box.open{display:flex;}

      .chatbot-header{
        padding:15px;
        background:
          radial-gradient(circle at 10% 0%,rgba(255,255,255,.26),transparent 30%),
          linear-gradient(135deg,#D4AF37,#b88918);
        color:#050b16;
        display:flex;
        justify-content:space-between;
        align-items:center;
        flex-shrink:0;
      }

      .chatbot-brand{
        display:flex;
        align-items:center;
        gap:10px;
      }

      .chatbot-logo{
        width:40px;
        height:40px;
        border-radius:14px;
        background:#050b16;
        color:#D4AF37;
        display:grid;
        place-items:center;
        font-weight:950;
        font-size:24px;
      }

      .chatbot-title{
        font-weight:950;
        font-size:15px;
        line-height:1.1;
      }

      .chatbot-subtitle{
        font-size:11px;
        font-weight:850;
        opacity:.78;
        margin-top:3px;
      }

      #chatCloseBtn{
        border:none;
        background:rgba(5,11,22,.16);
        color:#050b16;
        width:34px;
        height:34px;
        border-radius:999px;
        font-size:24px;
        font-weight:900;
        cursor:pointer;
      }

      .chatbot-messages{
        flex:1;
        min-height:0;
        overflow-y:auto;
        padding:16px;
        display:flex;
        flex-direction:column;
        gap:12px;
        scroll-behavior:smooth;
      }

      .chat-msg{
        max-width:90%;
        padding:13px 15px;
        border-radius:20px;
        line-height:1.5;
        font-size:14px;
        animation:aeMsgIn .25s ease;
      }

      @keyframes aeMsgIn{
        from{opacity:0;transform:translateY(8px);}
        to{opacity:1;transform:translateY(0);}
      }

      .chat-msg.bot{
        align-self:flex-start;
        background:rgba(255,255,255,.08);
        color:#fff;
        border:1px solid rgba(212,175,55,.15);
        border-top-left-radius:8px;
      }

      .chat-msg.user{
        align-self:flex-end;
        background:#D4AF37;
        color:#050b16;
        font-weight:850;
        border-top-right-radius:8px;
      }

      .chat-time{
        display:block;
        margin-top:7px;
        opacity:.58;
        font-size:10px;
        font-weight:700;
      }

      .typing-bubble{
        align-self:flex-start;
        background:rgba(255,255,255,.08);
        border:1px solid rgba(212,175,55,.15);
        color:#D4AF37;
        padding:12px 14px;
        border-radius:18px;
        font-size:13px;
        display:none;
        margin:0 16px 10px;
      }

      .typing-bubble.show{display:block;}

      .quick-prompts{
        flex-shrink:0;
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        padding:0 16px 12px;
      }

      .quick-prompts button{
        border:1px solid rgba(212,175,55,.35);
        background:rgba(212,175,55,.10);
        color:#D4AF37;
        border-radius:999px;
        padding:8px 11px;
        font-weight:900;
        font-size:12px;
        cursor:pointer;
      }

      .chatbot-input{
        display:grid;
        grid-template-columns:1fr auto;
        border-top:1px solid rgba(255,255,255,.08);
        background:#0b1220;
        flex-shrink:0;
      }

      #chatInput{
        min-height:58px;
        padding:0 15px;
        background:rgba(255,255,255,.07);
        border:none;
        color:#fff;
        outline:none;
        font-size:15px;
        min-width:0;
      }

      #chatSendBtn{
        border:none;
        padding:0 20px;
        background:#D4AF37;
        color:#050b16;
        font-weight:950;
        cursor:pointer;
      }

      .chat-action-link{
        display:inline-block;
        margin-top:10px;
        padding:10px 13px;
        border-radius:999px;
        background:#D4AF37;
        color:#050b16!important;
        text-decoration:none;
        font-weight:950;
      }

      .chat-mini-card{
        margin-top:10px;
        padding:12px;
        border-radius:16px;
        background:rgba(212,175,55,.09);
        border:1px solid rgba(212,175,55,.2);
      }

      .chat-mini-card strong{
        color:#D4AF37;
      }

      @media(max-width:768px){
        .chat-toggle,
        .whatsapp-float{
          left:18px;
          right:18px;
          width:auto;
          min-height:58px;
        }

        .chat-toggle{bottom:96px;}
        .whatsapp-float{bottom:26px;}

        .chatbot-box{
          left:10px;
          right:10px;
          bottom:166px;
          width:auto;
          height:68vh;
          max-height:68vh;
          max-width:none;
          border-radius:26px;
        }

        .chat-msg{
          max-width:92%;
          font-size:14px;
        }
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
            <div class="chatbot-subtitle">Smart travel support</div>
          </div>
        </div>
        <button type="button" id="chatCloseBtn">×</button>
      </div>

      <div class="chatbot-messages" id="chatbotMessages"></div>
      <div class="typing-bubble" id="typingBubble">Angel Assistant is typing...</div>

      <div class="quick-prompts">
        <button data-prompt="I want to book a ride">Book ride</button>
        <button data-prompt="Help me plan an airport pickup">Airport</button>
        <button data-prompt="I am a student and need a discount">Student</button>
        <button data-prompt="I need a shared ride">Shared ride</button>
        <button data-prompt="I need World Cup transportation">World Cup</button>
        <button data-prompt="Talk to support">Support</button>
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

    function nowTime() {
      return new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    function addMessage(text, sender) {
      const div = document.createElement("div");
      div.className = `chat-msg ${sender}`;
      div.innerHTML = `${text}<span class="chat-time">${nowTime()}</span>`;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
      state.messages.push({ sender, text, time: Date.now() });
    }

    function showTyping() {
      typingBubble.classList.add("show");
    }

    function hideTyping() {
      typingBubble.classList.remove("show");
    }

    function detectIntent(text) {
      const t = text.toLowerCase();

      if (t.includes("airport") || t.includes("dfw") || t.includes("love field") || t.includes("flight")) return "airport";
      if (t.includes("student") || t.includes("school") || t.includes("campus") || t.includes("discount")) return "student";
      if (t.includes("shared") || t.includes("pool") || t.includes("split")) return "shared";
      if (t.includes("world cup") || t.includes("stadium") || t.includes("event") || t.includes("tourist")) return "event";
      if (t.includes("price") || t.includes("cost") || t.includes("fare") || t.includes("how much")) return "pricing";
      if (t.includes("book") || t.includes("ride") || t.includes("reserve")) return "booking";
      if (t.includes("driver") || t.includes("chauffeur")) return "driver";
      if (t.includes("support") || t.includes("human") || t.includes("whatsapp") || t.includes("call")) return "support";
      if (t.includes("austin") || t.includes("houston") || t.includes("san antonio") || t.includes("oklahoma") || t.includes("college station")) return "route";

      return "general";
    }

    function updateMemory(userText) {
      const text = userText.toLowerCase();

      if (text.includes("airport") || text.includes("dfw") || text.includes("love field")) state.rideType = "Airport Transfer";
      if (text.includes("student")) state.passengerType = "Student";
      if (text.includes("shared") || text.includes("pool")) state.rideType = "Student Shared Ride";
      if (text.includes("world cup") || text.includes("event")) state.rideType = "Event / World Cup Ride";

      const routeMatch = userText.match(/from\s+(.+?)\s+to\s+(.+)/i);
      if (routeMatch) {
        state.pickup = routeMatch[1].trim();
        state.dropoff = routeMatch[2].trim();
      }
    }

    function buildBookingLink() {
      return `<a class="chat-action-link" href="book-ride.html">Book This Ride</a>`;
    }

    function buildSupportLink() {
      return `<a class="chat-action-link" target="_blank" href="https://wa.me/${OWNER_WHATSAPP}">Talk to Angel Express</a>`;
    }

    function botReply(userText) {
      updateMemory(userText);
      const intent = detectIntent(userText);
      state.intent = intent;

      if (intent === "booking") {
        return `
          I can help you start a ride request.
          <div class="chat-mini-card">
            <strong>Best flow:</strong><br>
            1. Enter pickup and drop-off<br>
            2. Get fare estimate<br>
            3. Confirm booking<br>
            4. Angel Express reviews and assigns support
          </div>
          ${buildBookingLink()}
        `;
      }

      if (intent === "airport") {
        return `
          Airport ride detected ✈️
          <div class="chat-mini-card">
            <strong>Airport pickup checklist:</strong><br>
            • Airport: DFW or Dallas Love Field<br>
            • Flight number<br>
            • Terminal or gate if known<br>
            • Luggage count<br>
            • Arrival time<br>
            • Pickup instructions
          </div>
          ${buildBookingLink()}
        `;
      }

      if (intent === "student") {
        return `
          Student travel detected 🎓
          <div class="chat-mini-card">
            <strong>Student benefits:</strong><br>
            • Student discount after verification<br>
            • Student Travel+ badge<br>
            • Campus pickup support<br>
            • Shared ride options when available
          </div>
          Use the same email on the website and Passenger App so Angel Express can match your student status.
          ${buildBookingLink()}
        `;
      }

      if (intent === "shared") {
        return `
          Shared ride request detected 👥
          <div class="chat-mini-card">
            <strong>Best for:</strong><br>
            Dallas ↔ Austin, Houston, College Station, UTD, UTA, SMU, UNT, Texas A&M, and campus routes.
          </div>
          Shared ride pricing applies only when selected and available.
          ${buildBookingLink()}
        `;
      }

      if (intent === "event") {
        return `
          Event / World Cup travel detected 🌎
          <div class="chat-mini-card">
            <strong>Angel Express can support:</strong><br>
            • Airport to hotel<br>
            • Hotel to stadium/event<br>
            • Private group rides<br>
            • Tourist routes<br>
            • Texas city-to-city travel
          </div>
          ${buildBookingLink()}
        `;
      }

      if (intent === "pricing") {
        return `
          Pricing depends on route distance, trip type, ride category, student verification, referral code, and shared ride selection.
          <div class="chat-mini-card">
            <strong>Quick note:</strong><br>
            The website calculates your fare after pickup and drop-off are entered.
          </div>
          ${buildBookingLink()}
        `;
      }

      if (intent === "route") {
        return `
          Regional Texas route detected 🛣️
          <div class="chat-mini-card">
            <strong>Popular Angel Express routes:</strong><br>
            Dallas → Austin<br>
            Dallas → Houston<br>
            Dallas → San Antonio<br>
            Dallas → Oklahoma City<br>
            Dallas → College Station
          </div>
          ${buildBookingLink()}
        `;
      }

      if (intent === "driver") {
        return `
          Chauffeur interest detected 🚘
          <div class="chat-mini-card">
            Angel Express chauffeurs are reviewed and approved before receiving ride assignments. Driver payout model is built around a 70% chauffeur share.
          </div>
          <a class="chat-action-link" href="driver.html">Apply As Chauffeur</a>
        `;
      }

      if (intent === "support") {
        return `
          I can escalate you to Angel Express support.
          <div class="chat-mini-card">
            Use WhatsApp for urgent booking questions, ride changes, airport pickup details, or special requests.
          </div>
          ${buildSupportLink()}
        `;
      }

      return `
        I can help you plan your Angel Express ride.
        <div class="chat-mini-card">
          Try asking:<br>
          <strong>“Book from Dallas to Austin”</strong><br>
          <strong>“I need DFW airport pickup”</strong><br>
          <strong>“I am a student and need a shared ride”</strong><br>
          <strong>“I need World Cup transportation”</strong>
        </div>
      `;
    }

    function streamBotMessage(html) {
      const plainText = html;
      const div = document.createElement("div");
      div.className = "chat-msg bot";
      messages.appendChild(div);

      let i = 0;
      const speed = 8;

      function type() {
        if (i < plainText.length) {
          div.innerHTML = plainText.slice(0, i + 1);
          messages.scrollTop = messages.scrollHeight;
          i++;
          setTimeout(type, speed);
        } else {
          div.innerHTML = `${plainText}<span class="chat-time">${nowTime()}</span>`;
          messages.scrollTop = messages.scrollHeight;
          state.messages.push({ sender: "bot", text: plainText, time: Date.now() });
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
        streamBotMessage(botReply(value));
      }, 450);
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
      Hi! I’m your Angel Express AI Concierge. Tell me what you need and I’ll guide you like a travel assistant.<br><br>
      I can help with rides, pricing, airport pickup, student discounts, shared rides, referrals, tourist trips, World Cup transportation, and support.
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