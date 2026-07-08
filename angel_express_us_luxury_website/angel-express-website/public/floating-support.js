/* =========================================================
   ANGEL EXPRESS V5 — FLOATING SUPPORT COMPATIBILITY FILE

   Purpose:
   - Safe backup support widget for older pages.
   - Does NOT hide AI Assistant on mobile.
   - Does NOT remove chat from fare-estimate, confirm-booking, or success.
   - If app.js already created the V5 support widgets, this file does nothing.

   Main V5 support should come from app.js.
   ========================================================= */

(function () {
  const AE_SUPPORT = {
    phoneDisplay: "+1 (972) 836-7910",
    phoneRaw: "19728367910",
    email: "support@angelexpressus.com",
    whatsapp: "https://wa.me/19728367910",
    bookingPage: "book-ride.html",
    driverPage: "driver.html",
    passengerPage: "passenger.html",
    merchandisePage: "angel-merchandise.html",
    contactPage: "contact.html",
  };

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  ready(function () {
    /*
      If app.js already created support widgets, do nothing.
      This prevents duplicate AI Assistant / WhatsApp buttons.
    */
    if (
      document.getElementById("chatToggle") ||
      document.getElementById("chatbotBox") ||
      document.querySelector(".whatsapp-float") ||
      document.querySelector(".mobile-support-dock")
    ) {
      return;
    }

    buildFallbackSupport();
  });

  function buildFallbackSupport() {
    if (window.AE_FLOATING_SUPPORT_LOADED) return;

    window.AE_FLOATING_SUPPORT_LOADED = true;

    const style = document.createElement("style");
    style.id = "angelFloatingSupportStyle";

    style.innerHTML = `
      .chat-toggle,
      .whatsapp-float {
        position: fixed;
        right: 22px;
        z-index: 999999;
        border: none;
        border-radius: 999px;
        min-height: 56px;
        padding: 0 22px;
        font-weight: 950;
        font-size: 15px;
        cursor: pointer;
        text-decoration: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        box-shadow: 0 18px 46px rgba(0,0,0,.38);
      }

      .chat-toggle {
        bottom: 96px;
        background: linear-gradient(135deg, #f4d96b, #d4af37);
        color: #050b16;
      }

      .whatsapp-float {
        bottom: 26px;
        background: #25D366;
        color: #050b16;
      }

      .chatbot-box {
        position: fixed;
        right: 22px;
        bottom: 166px;
        width: 370px;
        max-width: calc(100vw - 44px);
        height: 500px;
        max-height: calc(100vh - 190px);
        background: rgba(5,11,22,.97);
        border: 1px solid rgba(212,175,55,.35);
        border-radius: 26px;
        overflow: hidden;
        z-index: 1000000;
        display: none;
        flex-direction: column;
        box-shadow: 0 30px 90px rgba(0,0,0,.55);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }

      .chatbot-box.open {
        display: flex;
      }

      .chatbot-header {
        padding: 16px;
        background: linear-gradient(135deg, #f4d96b, #d4af37);
        color: #050b16;
        font-weight: 950;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .chatbot-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .chatbot-logo {
        width: 40px;
        height: 40px;
        border-radius: 14px;
        background: #050b16;
        color: #d4af37;
        display: grid;
        place-items: center;
        font-weight: 950;
        font-size: 22px;
      }

      .chatbot-title {
        font-weight: 950;
        line-height: 1.1;
      }

      .chatbot-subtitle {
        font-size: 11px;
        font-weight: 850;
        opacity: .78;
        margin-top: 3px;
      }

      .chat-close {
        border: none;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: rgba(5,11,22,.16);
        color: #050b16;
        font-size: 24px;
        line-height: 1;
        cursor: pointer;
        font-weight: 950;
      }

      .chatbot-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: grid;
        gap: 10px;
        align-content: start;
      }

      .chat-msg {
        padding: 12px 14px;
        border-radius: 18px;
        line-height: 1.5;
        font-size: 14px;
        max-width: 92%;
      }

      .chat-msg.bot {
        justify-self: start;
        background: rgba(255,255,255,.08);
        border: 1px solid rgba(212,175,55,.16);
        color: white;
      }

      .chat-msg.user {
        justify-self: end;
        background: #d4af37;
        color: #050b16;
        font-weight: 900;
      }

      .chat-time {
        display: block;
        margin-top: 7px;
        opacity: .58;
        font-size: 10px;
        font-weight: 700;
      }

      .quick-prompts {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        padding: 0 16px 12px;
      }

      .quick-prompts button {
        border: 1px solid rgba(212,175,55,.35);
        background: rgba(212,175,55,.10);
        color: #d4af37;
        border-radius: 999px;
        padding: 8px 11px;
        font-weight: 900;
        font-size: 12px;
        cursor: pointer;
      }

      .chatbot-input {
        display: grid;
        grid-template-columns: 1fr auto;
        border-top: 1px solid rgba(255,255,255,.1);
      }

      .chatbot-input input {
        min-height: 58px;
        border: none;
        outline: none;
        background: rgba(255,255,255,.08);
        color: white;
        padding: 0 14px;
      }

      .chatbot-input button {
        border: none;
        background: #d4af37;
        color: #050b16;
        padding: 0 18px;
        font-weight: 950;
        cursor: pointer;
      }

      .chat-action-link {
        color: #d4af37;
        font-weight: 950;
        text-decoration: underline;
      }

      @media (max-width: 768px) {
        .chat-toggle,
        .whatsapp-float {
          left: 14px;
          right: 14px;
          width: auto;
        }

        .chat-toggle {
          bottom: 82px;
        }

        .whatsapp-float {
          bottom: 18px;
        }

        .chatbot-box {
          left: 10px;
          right: 10px;
          bottom: 150px;
          width: auto;
          height: 66vh;
          max-width: none;
          max-height: 66vh;
        }
      }
    `;

    document.head.appendChild(style);

    const chatToggle = document.createElement("button");
    chatToggle.id = "chatToggle";
    chatToggle.className = "chat-toggle";
    chatToggle.type = "button";
    chatToggle.innerHTML = `<i class="fa-solid fa-robot"></i> AI Assistant`;

    const whatsappFloat = document.createElement("a");
    whatsappFloat.className = "whatsapp-float";
    whatsappFloat.href = AE_SUPPORT.whatsapp;
    whatsappFloat.target = "_blank";
    whatsappFloat.innerHTML = `<i class="fab fa-whatsapp"></i> Chat With Us`;

    const chatbotBox = document.createElement("div");
    chatbotBox.id = "chatbotBox";
    chatbotBox.className = "chatbot-box";

    chatbotBox.innerHTML = `
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
    `;

    document.body.appendChild(chatToggle);
    document.body.appendChild(whatsappFloat);
    document.body.appendChild(chatbotBox);

    setupFallbackChat();
  }

  function setupFallbackChat() {
    const box = document.getElementById("chatbotBox");
    const messages = document.getElementById("chatbotMessages");
    const input = document.getElementById("chatInput");

    const chatToggle = document.getElementById("chatToggle");
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
        return `Start here: <a class="chat-action-link" href="${AE_SUPPORT.bookingPage}">Book a Ride</a>.`;
      }

      if (
        t.includes("fare") ||
        t.includes("price") ||
        t.includes("cost") ||
        t.includes("estimate")
      ) {
        return `Start your fare estimate here: <a class="chat-action-link" href="${AE_SUPPORT.bookingPage}">Book a Ride</a>.`;
      }

      if (
        t.includes("airport") ||
        t.includes("dfw") ||
        t.includes("love field") ||
        t.includes("flight")
      ) {
        return `Angel Express supports DFW, Love Field, Austin, Houston, and regional airport transportation. Start here: <a class="chat-action-link" href="${AE_SUPPORT.bookingPage}">Book Airport Ride</a>.`;
      }

      if (t.includes("driver") || t.includes("drive") || t.includes("chauffeur")) {
        return `Driver information is here: <a class="chat-action-link" href="${AE_SUPPORT.driverPage}">Drive With Angel Express</a>.`;
      }

      if (
        t.includes("merch") ||
        t.includes("shirt") ||
        t.includes("cap") ||
        t.includes("candle")
      ) {
        return `Shop here: <a class="chat-action-link" href="${AE_SUPPORT.merchandisePage}">Angel Merchandise</a>.`;
      }

      if (t.includes("student") || t.includes("campus")) {
        return `Angel Express supports student travel, student verification, and shared ride options. Use the same email from your Passenger App profile when booking.`;
      }

      if (t.includes("support") || t.includes("contact") || t.includes("email")) {
        return `Email <a class="chat-action-link" href="mailto:${AE_SUPPORT.email}">${AE_SUPPORT.email}</a>, call <a class="chat-action-link" href="tel:+${AE_SUPPORT.phoneRaw}">${AE_SUPPORT.phoneDisplay}</a>, or message us on <a class="chat-action-link" href="${AE_SUPPORT.whatsapp}" target="_blank">WhatsApp</a>.`;
      }

      return `I can help with bookings, fare estimates, airport transportation, passenger services, driver information, merchandise, and support. For direct help, email <a class="chat-action-link" href="mailto:${AE_SUPPORT.email}">${AE_SUPPORT.email}</a>.`;
    }

    function sendMessage(text) {
      const message = (text || input.value || "").trim();

      if (!message) return;

      addMessage(message, "user");
      input.value = "";

      setTimeout(() => {
        addMessage(answer(message), "bot");
      }, 260);
    }

    chatToggle?.addEventListener("click", () => {
      if (box.classList.contains("open")) {
        closeChat();
      } else {
        openChat();
      }
    });

    closeBtn?.addEventListener("click", closeChat);
    sendBtn?.addEventListener("click", () => sendMessage());

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });

    document.querySelectorAll(".quick-prompts button").forEach((button) => {
      button.addEventListener("click", () => {
        sendMessage(button.dataset.prompt);
      });
    });
  }
})();