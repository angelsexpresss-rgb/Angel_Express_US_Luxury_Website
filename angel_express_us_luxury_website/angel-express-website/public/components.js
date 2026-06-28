document.addEventListener("DOMContentLoaded", () => {
  const layout = document.getElementById("ae-global-layout");
  if (!layout) return;

  layout.innerHTML = `
    <header class="navbar">
      <a href="index.html" class="logo">
        <div class="logo-mark">A</div>
        <div class="logo-text">
          <h1>ANGEL EXPRESS</h1>
          <span>MOBILITY ECOSYSTEM</span>
        </div>
      </a>

      <nav class="desktop-nav">
        <a href="index.html">Home</a>
        <a href="book-ride.html">Book Ride</a>
        <a href="passenger.html">Passengers</a>
        <a href="driver.html">Drivers</a>
        <a href="terms.html">Terms</a>
        <a href="blog.html">Blog</a>
        <a href="contact.html">Contact</a>
      </nav>

      <div class="desktop-actions">
        <a href="book-ride.html" class="nav-cta">Book a Ride</a>
        <a href="driver.html#apply" class="nav-cta nav-cta-secondary">Drive</a>
      </div>

      <button class="mobile-menu-btn" id="mobileMenuBtn" type="button">
        <i class="fa-solid fa-bars"></i>
      </button>
    </header>

    <div class="mobile-menu" id="mobileMenu">
      <a href="index.html">Home</a>
      <a href="book-ride.html">Book Ride</a>
      <a href="passenger.html">Passengers</a>
      <a href="driver.html">Drivers</a>
      <a href="terms.html">Terms</a>
      <a href="blog.html">Blog</a>
      <a href="contact.html">Contact</a>
      <a href="driver.html#apply">Become a Chauffeur</a>
    </div>

    <button id="chatToggle" class="chat-toggle" type="button">
      💬 AI Assistant
    </button>

    <div class="chatbot-box" id="chatbotBox">
      <div class="chatbot-header">Angel Express Assistant</div>
      <div class="chatbot-messages" id="chatbotMessages">
        <p><strong>Angel Assistant:</strong> Hi! How can I help you today?</p>
      </div>
      <div class="chatbot-input">
        <input type="text" id="chatInput" placeholder="Ask about booking, pricing, routes...">
        <button type="button" onclick="sendChat()">Send</button>
      </div>
    </div>

    <a href="https://wa.me/19728367910" target="_blank" class="whatsapp-float">
      💬 Chat With Us
    </a>

    <div class="mobile-support-dock">
      <button id="mobileChatBtn" class="mobile-support-btn ai" type="button">
        💬 AI Assistant
      </button>
      <a href="https://wa.me/19728367910" target="_blank" class="mobile-support-btn whatsapp">
        💬 Chat With Us
      </a>
    </div>
  `;

  const footer = document.getElementById("ae-global-footer");
  if (!footer) return;

  footer.innerHTML = `
    <footer class="footer">
      <div class="footer-grid">
        <div>
          <h3>Angel Express Mobility (AEM)</h3>
          <p>
            Private long-distance transportation across Texas for students,
            travelers, airport passengers, tourists, World Cup 2026 visitors,
            and approved chauffeurs.
          </p>
          <p><i class="fa-solid fa-futbol"></i> Transportation Support for World Cup 2026 Visitors</p>
        </div>

        <div>
          <h4>Contact Information</h4>
          <p><i class="fa-solid fa-phone"></i> +1 (972) 836-7910</p>
          <p><i class="fa-solid fa-clock"></i> Available 24/7 by Reservation</p>
          <p><i class="fa-solid fa-envelope"></i> <a href="mailto:angelsexpresss@gmail.com">angelsexpresss@gmail.com</a></p>
          <p><i class="fa-solid fa-location-dot"></i> Dallas, Texas, USA</p>
        </div>

        <div>
          <h4>Quick Links</h4>
          <p><a href="index.html">Home</a></p>
          <p><a href="book-ride.html">Book a Ride</a></p>
          <p><a href="passenger.html">Passenger Services</a></p>
          <p><a href="driver.html#apply">Become a Chauffeur</a></p>
          <p><a href="terms.html">Terms & Privacy</a></p>
        </div>

        <div>
          <h4>Follow Us</h4>
          <p><a href="https://instagram.com/angelexpresss" target="_blank"><i class="fab fa-instagram"></i> @angelexpresss</a></p>
          <p><a href="https://x.com/angelexpresss" target="_blank"><i class="fa-brands fa-x-twitter"></i> @angelexpresss</a></p>
          <p><a href="https://wa.me/19728367910" target="_blank"><i class="fab fa-whatsapp"></i> Chat With Us</a></p>
          <p><a href="mailto:angelsexpresss@gmail.com"><i class="fas fa-envelope"></i> Email Us</a></p>
        </div>
      </div>

      <div class="footer-bottom">
        © 2026 Angel Express Mobility. All rights reserved.
      </div>
    </footer>
  `;
});