document.addEventListener("DOMContentLoaded", () => {
  /* Remove old mobile duplicate dock */
  document.querySelectorAll(".mobile-support-dock").forEach(el => el.remove());
  document.querySelectorAll("#mobileChatBtn").forEach(el => el.remove());

  /* Keep only one AI button */
  let chatButtons = document.querySelectorAll("#chatToggle");
  chatButtons.forEach((btn, index) => {
    if (index > 0) btn.remove();
  });

  /* Keep only one WhatsApp button */
  let whatsappButtons = document.querySelectorAll(".whatsapp-float");
  whatsappButtons.forEach((btn, index) => {
    if (index > 0) btn.remove();
  });

  /* Keep only one chatbot box */
  let chatBoxes = document.querySelectorAll("#chatbotBox");
  chatBoxes.forEach((box, index) => {
    if (index > 0) box.remove();
  });

  let chatToggle = document.getElementById("chatToggle");
  let chatbotBox = document.getElementById("chatbotBox");
  let whatsappFloat = document.querySelector(".whatsapp-float");

  /* Create AI button if missing */
  if (!chatToggle) {
    chatToggle = document.createElement("button");
    chatToggle.id = "chatToggle";
    chatToggle.className = "chat-toggle";
    chatToggle.type = "button";
    chatToggle.innerHTML = "💬 AI Assistant";
    document.body.appendChild(chatToggle);
  }

  /* Create WhatsApp button if missing */
  if (!whatsappFloat) {
    whatsappFloat = document.createElement("a");
    whatsappFloat.href = "https://wa.me/19728367910";
    whatsappFloat.target = "_blank";
    whatsappFloat.className = "whatsapp-float";
    whatsappFloat.innerHTML = "💬 Chat With Us";
    document.body.appendChild(whatsappFloat);
  }

  /* Create chatbot box if missing */
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
        <button type="button" id="chatSendBtn">Send</button>
      </div>
    `;
    document.body.appendChild(chatbotBox);
  }

  function openAngelChat() {
    chatbotBox = document.getElementById("chatbotBox");
    if (!chatbotBox) return;

    chatbotBox.classList.toggle("open");

    if (chatbotBox.classList.contains("open")) {
      chatbotBox.style.display = "block";
    } else {
      chatbotBox.style.display = "none";
    }
  }

  /* Force fresh click behavior */
  chatToggle = document.getElementById("chatToggle");
  chatToggle.onclick = openAngelChat;
});