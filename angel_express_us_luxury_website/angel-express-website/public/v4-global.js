document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const mobileMenu = document.getElementById("mobileMenu");
    const chatToggle = document.getElementById("chatToggle");
    const mobileChatBtn = document.getElementById("mobileChatBtn");
    const chatbotBox = document.getElementById("chatbotBox");

    mobileMenuBtn?.addEventListener("click", () => {
      mobileMenu?.classList.toggle("open");
    });

    mobileMenu?.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
      });
    });

    function toggleAngelChat() {
      chatbotBox?.classList.toggle("open");
    }

    chatToggle?.addEventListener("click", toggleAngelChat);
    mobileChatBtn?.addEventListener("click", toggleAngelChat);

    const revealElements = document.querySelectorAll(".reveal");

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.15 }
    );

    revealElements.forEach(el => observer.observe(el));
  }, 80);
});