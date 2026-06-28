document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".mobile-support-dock").forEach(el => el.remove());

  const duplicateMobileBtn = document.getElementById("mobileChatBtn");
  if (duplicateMobileBtn) duplicateMobileBtn.remove();

  let chatToggle = document.getElementById("chatToggle");
  let chatbotBox = document.getElementById("chatbotBox");
  let whatsappFloat = document.querySelector(".whatsapp-float");

  if (!chatToggle) {
    chatToggle = document.createElement("button");
    chatToggle.id = "chatToggle";
    chatToggle.className = "chat-toggle";
    chatToggle.type = "button";
    chatToggle.innerHTML = "💬 AI Assistant";
    document.body.appendChild(chatToggle);
  }

  if (!whatsappFloat) {
    whatsappFloat = document.createElement("a");
    whatsappFloat.href = "https://wa.me/19728367910";
    whatsappFloat.target = "_blank";
    whatsappFloat.className = "whatsapp-float";
    whatsappFloat.innerHTML = "💬 Chat With Us";
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

  const allChatButtons = document.querySelectorAll("#chatToggle");
  allChatButtons.forEach((btn, index) => {
    if (index > 0) btn.remove();
  });

  const allWhatsAppButtons = document.querySelectorAll(".whatsapp-float");
  allWhatsAppButtons.forEach((btn, index) => {
    if (index > 0) btn.remove();
  });

  const allChatBoxes = document.querySelectorAll("#chatbotBox");
  allChatBoxes.forEach((box, index) => {
    if (index > 0) box.remove();
  });

  chatToggle = document.getElementById("chatToggle");
  chatbotBox = document.getElementById("chatbotBox");

  chatToggle?.addEventListener("click", () => {
    if (!chatbotBox) return;

    if (chatbotBox.classList.contains("open")) {
      chatbotBox.classList.remove("open");
      chatbotBox.style.display = "none";
    } else {
      chatbotBox.classList.add("open");
      chatbotBox.style.display = "block";
    }
  });
});