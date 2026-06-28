(function () {
  function setupAngelFloatingSupport() {
    // Remove old duplicate mobile dock buttons
    document.querySelectorAll(".mobile-support-dock, #mobileChatBtn").forEach(el => el.remove());

    // Remove duplicate AI buttons, keep first
    const chatButtons = Array.from(document.querySelectorAll("#chatToggle"));
    chatButtons.slice(1).forEach(el => el.remove());

    // Remove duplicate WhatsApp buttons, keep first
    const whatsappButtons = Array.from(document.querySelectorAll(".whatsapp-float"));
    whatsappButtons.slice(1).forEach(el => el.remove());

    // Remove duplicate chatbot boxes, keep first
    const chatBoxes = Array.from(document.querySelectorAll("#chatbotBox"));
    chatBoxes.slice(1).forEach(el => el.remove());

    let chatToggle = document.getElementById("chatToggle");
    let chatbotBox = document.getElementById("chatbotBox");
    let whatsappFloat = document.querySelector(".whatsapp-float");

    if (!chatToggle) {
      chatToggle = document.createElement("button");
      chatToggle.id = "chatToggle";
      chatToggle.className = "chat-toggle";
      chatToggle.type = "button";
      chatToggle.textContent = "💬 AI Assistant";
      document.body.appendChild(chatToggle);
    }

    if (!whatsappFloat) {
      whatsappFloat = document.createElement("a");
      whatsappFloat.href = "https://wa.me/19728367910";
      whatsappFloat.target = "_blank";
      whatsappFloat.className = "whatsapp-float";
      whatsappFloat.textContent = "💬 Chat With Us";
      document.body.appendChild(whatsappFloat);
    }

    if (!chatbotBox) {
      chatbotBox = document.createElement("div");
      chatbotBox.id = "chatbotBox";
      chatbotBox.className = "chatbot-box";
      chatbotBox.innerHTML = `
        <div class="chatbot-header">Angel Express Assistant</div>
        <div class="chatbot-messages" id="chatbotMessages">
          <p><strong>Angel Assistant:</strong> Hi! How can I help you today?</p>
        </div>
        <div class="chatbot-input">
          <input type="text" id="chatInput" placeholder="Ask about booking, pricing, routes...">
          <button type="button" onclick="sendChat()">Send</button>
        </div>
      `;
      document.body.appendChild(chatbotBox);
    }

    // Force correct display state
    chatbotBox.style.display = "none";

    // Clone button to remove old broken event listeners
    const cleanChatToggle = chatToggle.cloneNode(true);
    chatToggle.parentNode.replaceChild(cleanChatToggle, chatToggle);

    cleanChatToggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const box = document.getElementById("chatbotBox");
      if (!box) return;

      const isOpen = box.style.display === "block";

      if (isOpen) {
        box.style.display = "none";
        box.classList.remove("open");
      } else {
        box.style.display = "block";
        box.classList.add("open");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupAngelFloatingSupport);
  } else {
    setupAngelFloatingSupport();
  }

  window.addEventListener("load", setupAngelFloatingSupport);
})();