(function () {
  function buildAngelSupport() {
    document
      .querySelectorAll(".mobile-support-dock, .mobile-support-btn, #mobileChatBtn")
      .forEach((el) => el.remove());

    document.querySelectorAll("#chatToggle").forEach((el) => el.remove());
    document.querySelectorAll(".whatsapp-float").forEach((el) => el.remove());
    document.querySelectorAll("#chatbotBox").forEach((el) => el.remove());

    const chatToggle = document.createElement("button");
    chatToggle.id = "chatToggle";
    chatToggle.className = "chat-toggle";
    chatToggle.type = "button";
    chatToggle.innerHTML = "💬 AI Assistant";

    const whatsappFloat = document.createElement("a");
    whatsappFloat.href = "https://wa.me/19728367910";
    whatsappFloat.target = "_blank";
    whatsappFloat.className = "whatsapp-float";
    whatsappFloat.innerHTML = "💬 Chat With Us";

    const chatbotBox = document.createElement("div");
    chatbotBox.id = "chatbotBox";
    chatbotBox.className = "chatbot-box";
    chatbotBox.innerHTML = `
      <div class="chatbot-header">
        <span>Angel Express Assistant</span>
        <button type="button" id="chatCloseBtn">×</button>
      </div>

      <div class="chatbot-messages" id="chatbotMessages">
        <p><strong>Angel Assistant:</strong> Hi! How can I help you today?</p>
      </div>

      <div class="chatbot-input">
        <input
          type="text"
          id="chatInput"
          placeholder="Ask about booking, pricing, routes..."
        >
        <button type="button" id="chatSendBtn">Send</button>
      </div>
    `;

    document.body.appendChild(chatToggle);
    document.body.appendChild(whatsappFloat);
    document.body.appendChild(chatbotBox);

    function openChat() {
      chatbotBox.classList.add("open");
      chatbotBox.style.display = "flex";
    }

    function closeChat() {
      chatbotBox.classList.remove("open");
      chatbotBox.style.display = "none";
    }

    function toggleChat() {
      if (chatbotBox.classList.contains("open")) {
        closeChat();
      } else {
        openChat();
      }
    }

    chatToggle.addEventListener("click", toggleChat);
    document.getElementById("chatCloseBtn")?.addEventListener("click", closeChat);

    document.getElementById("chatSendBtn")?.addEventListener("click", function () {
      if (typeof sendChat === "function") {
        sendChat();
      }
    });

    document.getElementById("chatInput")?.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (typeof sendChat === "function") {
          sendChat();
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildAngelSupport);
  } else {
    buildAngelSupport();
  }
})();