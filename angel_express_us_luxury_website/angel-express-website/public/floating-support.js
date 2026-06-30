(function () {
  const OWNER_WHATSAPP = "19728367910";

  const hiddenPages = [
    "fare-estimate.html",
    "confirm-booking.html",
    "success.html",
  ];

  const currentPage = window.location.pathname.split("/").pop();

  if (hiddenPages.includes(currentPage)) {
    document
      .querySelectorAll(
        ".mobile-support-dock, .mobile-support-btn, #mobileChatBtn, #chatToggle, .whatsapp-float, #chatbotBox"
      )
      .forEach((el) => el.remove());
    return;
  }

  function buildAngelSupport() {
    document
      .querySelectorAll(
        ".mobile-support-dock, .mobile-support-btn, #mobileChatBtn, #chatToggle, .whatsapp-float, #chatbotBox"
      )
      .forEach((el) => el.remove());

    const style = document.createElement("style");
    style.innerHTML = `
      .chat-toggle,
      .whatsapp-float{
        position:fixed;
        right:24px;
        z-index:99999;
        border:none;
        border-radius:999px;
        min-height:58px;
        padding:0 24px;
        font-weight:950;
        font-size:17px;
        cursor:pointer;
        box-shadow:0 20px 50px rgba(0,0,0,.35);
        text-decoration:none;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:10px;
      }

      .chat-toggle{
        bottom:102px;
        background:#D4AF37;
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
        width:min(420px,calc(100vw - 32px));
        max-height:72vh;
        z-index:100000;
        display:none;
        flex-direction:column;
        overflow:hidden;
        border-radius:28px;
        background:rgba(5,11,22,.96);
        border:1px solid rgba(212,175,55,.38);
        box-shadow:0 30px 90px rgba(0,0,0,.55);
        backdrop-filter:blur(18px);
      }

      .chatbot-box.open{display:flex;}

      .chatbot-header{
        padding:18px;
        background:linear-gradient(135deg,#D4AF37,#b88c1d);
        color:#050b16;
        display:flex;
        justify-content:space-between;
        align-items:center;
        font-weight:950;
      }

      .chatbot-header span{
        font-size:17px;
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
        padding:18px;
        height:360px;
        overflow-y:auto;
        display:flex;
        flex-direction:column;
        gap:12px;
      }

      .chat-msg{
        max-width:88%;
        padding:13px 15px;
        border-radius:18px;
        line-height:1.5;
        font-size:14px;
      }

      .chat-msg.bot{
        align-self:flex-start;
        background:rgba(255,255,255,.08);
        color:#fff;
        border:1px solid rgba(212,175,55,.14);
      }

      .chat-msg.user{
        align-self:flex-end;
        background:#D4AF37;
        color:#050b16;
        font-weight:800;
      }

      .quick-prompts{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        padding:0 18px 14px;
      }

      .quick-prompts button{
        border:1px solid rgba(212,175,55,.35);
        background:rgba(212,175,55,.1);
        color:#D4AF37;
        border-radius:999px;
        padding:9px 12px;
        font-weight:850;
        font-size:12px;
        cursor:pointer;
      }

      .chatbot-input{
        display:grid;
        grid-template-columns:1fr auto;
        border-top:1px solid rgba(255,255,255,.1);
      }

      #chatInput{
        min-height:58px;
        padding:0 16px;
        background:rgba(255,255,255,.08);
        border:none;
        color:#fff;
        outline:none;
        font-size:15px;
      }

      #chatSendBtn{
        border:none;
        padding:0 20px;
        background:#D4AF37;
        color:#050b16;
        font-weight:950;
        cursor:pointer;
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
          left:12px;
          right:12px;
          bottom:166px;
          width:auto;
          max-height:68vh;
          border-radius:24px;
        }

        .chatbot-messages{
          height:310px;
        }
      }

      @media(min-width:769px) and (max-width:1180px){
        .chatbot-box{
          width:460px;
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
        <span>Angel Express Travel Assistant</span>
        <button type="button" id="chatCloseBtn">×</button>
      </div>

      <div class="chatbot-messages" id="chatbotMessages"></div>

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

    function addMessage(text, sender) {
      const div = document.createElement("div");
      div.className = `chat-msg ${sender}`;
      div.innerHTML = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    function botReply(userText) {
      const text = userText.toLowerCase();

      if (text.includes("book") || text.includes("ride") || text.includes("reserve")) {
        return `
          I can help you start a ride request. Angel Express serves private rides across Texas, airport transfers, student trips, tourist rides, and event transportation.<br><br>
          Tap here to begin: <strong><a href="book-ride.html" style="color:#D4AF37;">Book a Ride</a></strong>.
        `;
      }

      if (text.includes("price") || text.includes("cost") || text.includes("fare") || text.includes("how much")) {
        return `
          Angel Express estimates fares based on route distance, ride type, student eligibility, referral discounts, and shared ride selection.<br><br>
          Standard estimate flow: <strong>Book Ride → Fare Estimate → Confirm Booking</strong>.
        `;
      }

      if (text.includes("student") || text.includes("discount") || text.includes("school")) {
        return `
          Students may receive a discount after student verification is approved. Use the same email in the Angel Express app and website so your student status can be matched correctly.<br><br>
          Student shared rides may also reduce cost when selected.
        `;
      }

      if (text.includes("airport") || text.includes("dfw") || text.includes("love field") || text.includes("flight")) {
        return `
          Yes. Angel Express supports DFW Airport and Dallas Love Field pickups. Add your flight number, terminal, luggage count, and pickup notes when booking.
        `;
      }

      if (text.includes("world cup") || text.includes("event") || text.includes("stadium") || text.includes("tourist")) {
        return `
          Angel Express supports World Cup 2026 visitors, event rides, tourist transportation, airport arrivals, and private group rides across Texas.
        `;
      }

      if (text.includes("austin") || text.includes("houston") || text.includes("san antonio") || text.includes("oklahoma") || text.includes("college station")) {
        return `
          Yes. Angel Express focuses on private regional rides such as Dallas to Austin, Houston, San Antonio, Oklahoma City, College Station, airports, campuses, and custom routes.
        `;
      }

      if (text.includes("help") || text.includes("support") || text.includes("whatsapp") || text.includes("call")) {
        return `
          You can speak with Angel Express directly on WhatsApp here:<br><br>
          <strong><a href="https://wa.me/${OWNER_WHATSAPP}" target="_blank" style="color:#D4AF37;">Chat with Angel Express Support</a></strong>.
        `;
      }

      if (text.includes("driver") || text.includes("chauffeur")) {
        return `
          Interested in driving with Angel Express? Chauffeurs are reviewed and approved before receiving ride assignments.<br><br>
          Visit the driver page to apply.
        `;
      }

      return `
        I can help with bookings, fare estimates, airport pickup, student discounts, shared rides, referral rewards, tourist trips, World Cup transportation, and support escalation.<br><br>
        Try asking: <strong>“Can I book Dallas to Austin?”</strong> or <strong>“How does the student discount work?”</strong>
      `;
    }

    function sendChat() {
      const value = input.value.trim();

      if (!value) return;

      addMessage(value, "user");
      input.value = "";

      setTimeout(() => {
        addMessage(botReply(value), "bot");
      }, 350);
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
      Hi! I’m your Angel Express Travel Assistant. I can help with booking, pricing, airport pickup, student discounts, shared rides, referrals, tourist trips, and World Cup transportation.<br><br>
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