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
        ".mobile-support-dock, .mobile-support-btn, #mobileChatBtn, #chatToggle, .whatsapp-float, #chatbotBox, #angelChatStyle"
      )
      .forEach((el) => el.remove());
    return;
  }

  function buildAngelSupport() {
    document
      .querySelectorAll(
        ".mobile-support-dock, .mobile-support-btn, #mobileChatBtn, #chatToggle, .whatsapp-float, #chatbotBox, #angelChatStyle"
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
        bottom:176px;
        width:420px;
        height:620px;
        max-width:calc(100vw - 40px);
        max-height:calc(100vh - 120px);
        z-index:1000000;
        display:none;
        flex-direction:column;
        overflow:hidden;
        border-radius:30px;
        background:rgba(5,11,22,.98);
        border:1px solid rgba(212,175,55,.38);
        box-shadow:0 30px 90px rgba(0,0,0,.58);
        backdrop-filter:blur(22px);
      }

      .chatbot-box.open{
        display:flex;
      }

      .chatbot-header{
        padding:18px;
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
        gap:12px;
      }

      .chatbot-logo{
        width:42px;
        height:42px;
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
        font-size:16px;
        line-height:1.1;
      }

      .chatbot-subtitle{
        font-size:12px;
        font-weight:850;
        opacity:.78;
        margin-top:3px;
      }

      #chatCloseBtn{
        border:none;
        background:rgba(5,11,22,.16);
        color:#050b16;
        width:36px;
        height:36px;
        border-radius:999px;
        font-size:25px;
        font-weight:900;
        cursor:pointer;
      }

      .chatbot-messages{
        flex:1;
        min-height:0;
        overflow-y:auto;
        padding:18px;
        display:flex;
        flex-direction:column;
        gap:12px;
        scroll-behavior:smooth;
      }

      .chat-msg{
        max-width:88%;
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
      }

      .typing-bubble.show{
        display:block;
      }

      .quick-prompts{
        flex-shrink:0;
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        padding:0 18px 14px;
      }

      .quick-prompts button{
        border:1px solid rgba(212,175,55,.35);
        background:rgba(212,175,55,.10);
        color:#D4AF37;
        border-radius:999px;
        padding:9px 12px;
        font-weight:900;
        font-size:12px;
        cursor:pointer;
      }

      .quick-prompts button:hover{
        background:rgba(212,175,55,.18);
      }

      .chatbot-input{
        display:grid;
        grid-template-columns:1fr auto;
        border-top:1px solid rgba(255,255,255,.08);
        background:#0b1220;
        flex-shrink:0;
      }

      #chatInput{
        min-height:60px;
        padding:0 16px;
        background:rgba(255,255,255,.07);
        border:none;
        color:#fff;
        outline:none;
        font-size:15px;
        min-width:0;
      }

      #chatSendBtn{
        border:none;
        padding:0 22px;
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

        .chat-toggle{
          bottom:96px;
        }

        .whatsapp-float{
          bottom:26px;
        }

        .chatbot-box{
          left:10px;
          right:10px;
          bottom:166px;
          width:auto;
          height:70vh;
          max-height:70vh;
          max-width:none;
          border-radius:26px;
        }

        .chatbot-messages{
          padding:16px;
        }

        .chat-msg{
          max-width:92%;
          font-size:14px;
        }
      }

      @media(min-width:769px) and (max-width:1180px){
        .chatbot-box{
          width:460px;
          height:640px;
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
            <div class="chatbot-subtitle">Travel • Airport • Students • Events</div>
          </div>
        </div>
        <button type="button" id="chatCloseBtn">×</button>
      </div>

      <div class="chatbot-messages" id="chatbotMessages"></div>
      <div class="typing-bubble" id="typingBubble">Angel Assistant is typing...</div>

      <div class="quick-prompts">
        <button data-prompt="I want to book a ride">Book ride</button>
        <button data-prompt="How much does a ride cost?">Pricing</button>
        <button data-prompt="Do you offer student discounts?">Student discount</button>
        <button data-prompt="Can you help with airport pickup?">Airport pickup</button>
        <button data-prompt="I need World Cup transportation">World Cup</button>
        <button data-prompt="I need to speak with support">Support</button>
      </div>

      <div class="chatbot-input">
        <input
          type="text"
          id="chatInput"
          placeholder="Ask about routes, airport pickup, student rides..."
        >
        <button type="button" id="chatSendBtn">Send</button>
      </div>
    `;

    document.body.appendChild(chatToggle);
    document.body.appendChild(whatsappFloat);
    document.body.appendChild(chatbotBox);

    const messages = document.getElementById("chatbotMessages");
    const input = document.getElementById("chatInput");
    const typingBubble = document.getElementById("typingBubble");

    const conversation = [];

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

      conversation.push({ sender, text, time: Date.now() });
    }

    function showTyping() {
      typingBubble.classList.add("show");
      messages.scrollTop = messages.scrollHeight;
    }

    function hideTyping() {
      typingBubble.classList.remove("show");
    }

    function botReply(userText) {
      const text = userText.toLowerCase();

      if (text.includes("book") || text.includes("ride") || text.includes("reserve")) {
        return `
          Absolutely. Angel Express can help with private rides, long-distance Texas trips, airport transfers, student travel, tourist rides, and event transportation.
          <div class="chat-mini-card">
            <strong>Fastest path:</strong><br>
            Book Ride → Fare Estimate → Confirm Booking.
          </div>
          <a class="chat-action-link" href="book-ride.html">Start Booking</a>
        `;
      }

      if (text.includes("price") || text.includes("cost") || text.includes("fare") || text.includes("how much")) {
        return `
          Your fare is estimated by route distance, ride category, trip type, student verification, shared ride selection, and referral discount.
          <div class="chat-mini-card">
            <strong>Tip:</strong> Enter pickup and drop-off first so Angel Express can calculate the best estimate.
          </div>
          <a class="chat-action-link" href="book-ride.html">Get Fare Estimate</a>
        `;
      }

      if (text.includes("student") || text.includes("discount") || text.includes("school")) {
        return `
          Students can receive Angel Express student benefits after verification is approved in the Passenger App.
          <div class="chat-mini-card">
            <strong>Student perks:</strong><br>
            Student discount, Student Travel+, campus pickup support, and shared ride options.
          </div>
        `;
      }

      if (text.includes("shared") || text.includes("pool")) {
        return `
          Student shared rides help reduce trip cost when passengers are matched on similar campus or regional routes.
          <div class="chat-mini-card">
            <strong>Good for:</strong> Dallas ↔ Austin, Houston, College Station, UTD, UNT, SMU, UTA, and group travel.
          </div>
        `;
      }

      if (text.includes("airport") || text.includes("dfw") || text.includes("love field") || text.includes("flight")) {
        return `
          Yes. Angel Express supports DFW Airport and Dallas Love Field pickups.
          <div class="chat-mini-card">
            <strong>Add when booking:</strong><br>
            Flight number, terminal, luggage count, pickup instructions, and arrival time.
          </div>
          <a class="chat-action-link" href="book-ride.html">Book Airport Pickup</a>
        `;
      }

      if (text.includes("world cup") || text.includes("stadium") || text.includes("event") || text.includes("tourist")) {
        return `
          Angel Express supports World Cup 2026 visitors, stadium/event transfers, tourists, airport arrivals, hotel pickups, and private group rides.
          <div class="chat-mini-card">
            <strong>Best for:</strong> airport → hotel, hotel → stadium, tourist routes, group transportation, and Texas city-to-city trips.
          </div>
        `;
      }

      if (text.includes("austin") || text.includes("houston") || text.includes("san antonio") || text.includes("oklahoma") || text.includes("college station")) {
        return `
          Yes. Angel Express focuses on private regional rides across Texas and nearby routes.
          <div class="chat-mini-card">
            <strong>Popular routes:</strong><br>
            Dallas to Austin, Houston, San Antonio, Oklahoma City, College Station, airports, and campuses.
          </div>
          <a class="chat-action-link" href="book-ride.html">Plan This Route</a>
        `;
      }

      if (text.includes("referral") || text.includes("promo") || text.includes("code")) {
        return `
          Angel Express supports referral and promo codes. Enter your code during booking, and eligible discounts will be checked during fare estimate and confirmation.
          <div class="chat-mini-card">
            <strong>Reward note:</strong> Referrers receive credit after the referred ride is completed.
          </div>
        `;
      }

      if (text.includes("driver") || text.includes("chauffeur")) {
        return `
          Interested in driving with Angel Express? Chauffeurs are reviewed and approved before receiving trips.
          <div class="chat-mini-card">
            <strong>Driver model:</strong> professional service, approved drivers, route support, and 70% driver share.
          </div>
          <a class="chat-action-link" href="driver.html">Become a Chauffeur</a>
        `;
      }

      if (text.includes("help") || text.includes("support") || text.includes("whatsapp") || text.includes("call") || text.includes("human")) {
        return `
          I can connect you with Angel Express support directly.
          <a class="chat-action-link" target="_blank" href="https://wa.me/${OWNER_WHATSAPP}">Chat on WhatsApp</a>
        `;
      }

      return `
        I can help with bookings, fare estimates, airport pickup, student discounts, shared rides, referral rewards, Texas routes, tourist trips, World Cup travel, and support.
        <div class="chat-mini-card">
          Try asking:<br>
          <strong>“Can I book Dallas to Austin?”</strong><br>
          <strong>“How does student discount work?”</strong><br>
          <strong>“Can you pick me up at DFW?”</strong>
        </div>
      `;
    }

    function sendChat() {
      const value = input.value.trim();
      if (!value) return;

      addMessage(value, "user");
      input.value = "";

      showTyping();

      setTimeout(() => {
        hideTyping();
        addMessage(botReply(value), "bot");
      }, 500);
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
      Hi! I’m your Angel Express Travel Concierge. I can help with booking, pricing, airport pickup, student discounts, shared rides, referrals, tourist trips, and World Cup transportation.<br><br>
      What are you planning today?
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