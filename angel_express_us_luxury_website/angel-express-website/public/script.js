/* =========================================================
   ANGEL EXPRESS V5 — SCRIPT COMPATIBILITY FILE

   Main V5 system now lives in app.js.

   This file is intentionally safe:
   - Does NOT inject navbar
   - Does NOT inject footer
   - Does NOT inject AI Assistant
   - Does NOT inject Chat With Us
   - Does NOT use old Gmail
   - Does NOT override app.js

   Keep this file only as a backup for old pages that may still load:
   <script src="script.js"></script>

   New V5 pages should use:
   <script defer src="app.js"></script>
   ========================================================= */

(function () {
  const AE_COMPAT = {
    supportEmail: "support@angelexpressus.com",
    phoneDisplay: "+1 (972) 836-7910",
    phoneRaw: "19728367910",
    whatsapp: "https://wa.me/19728367910",
    bookingPage: "book-ride.html",
    successPage: "success.html",
    supabaseUrl: "https://zlzastjpvbboniybyvjv.supabase.co",
    supabaseAnonKey: "sb_publishable_Fn0wUeIUskON-kTpl8kDFw_B1Exp0EP",
    googleScriptUrl:
      "https://script.google.com/macros/s/AKfycbzfjXYUphz8-nyETcdMYOpHCPoBY33V17OkAZMODpBRVT2V6m8H9DTG5iBM63QqbHtR/exec",
  };

  let compatSupabase = null;

  if (typeof window.supabase !== "undefined") {
    compatSupabase = window.supabase.createClient(
      AE_COMPAT.supabaseUrl,
      AE_COMPAT.supabaseAnonKey
    );
  }

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  ready(function () {
    replaceOldEmailsSafely();
    setupLegacySlides();
    setupLegacyBookingForm();
    setupLegacyAdminButtons();
    setupLegacyReveal();
  });

  /* =========================
     SAFE EMAIL REPLACEMENT
  ========================= */

  function replaceOldEmailsSafely() {
    const oldEmails = [
      "angelsexpresss@gmail.com",
      "angelsexpress@gmail.com",
      "angelsexpressus@gmail.com",
    ];

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes = [];

    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((node) => {
      let value = node.nodeValue;

      oldEmails.forEach((oldEmail) => {
        value = value.replaceAll(oldEmail, AE_COMPAT.supportEmail);
      });

      node.nodeValue = value;
    });

    document.querySelectorAll("a[href^='mailto:']").forEach((link) => {
      const href = link.getAttribute("href") || "";

      if (oldEmails.some((oldEmail) => href.includes(oldEmail))) {
        link.setAttribute("href", `mailto:${AE_COMPAT.supportEmail}`);
      }
    });
  }

  /* =========================
     LEGACY SLIDESHOW SUPPORT
     Only runs on old pages that use .slide and #dots.
  ========================= */

  function setupLegacySlides() {
    const slides = document.querySelectorAll(".slide");
    const dots = document.getElementById("dots");

    if (!slides.length || !dots) return;

    let active = 0;

    dots.innerHTML = "";

    slides.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.addEventListener("click", () => setSlide(index));
      dots.appendChild(dot);
    });

    function setSlide(index) {
      if (!slides[active] || !dots.children[active]) return;

      slides[active].classList.remove("active");
      dots.children[active].classList.remove("active");

      active = index;

      slides[active].classList.add("active");
      dots.children[active].classList.add("active");

      document.querySelectorAll("video").forEach((video) => {
        video.pause();
      });

      const video = slides[active].querySelector("video");

      if (video) {
        video.play().catch(() => {});
      }
    }

    setSlide(0);

    setInterval(() => {
      setSlide((active + 1) % slides.length);
    }, 5000);
  }

  /* =========================
     LEGACY HELPERS
  ========================= */

  function cleanPhone(value) {
    return String(value || "").replace(/[^\d]/g, "");
  }

  function generateInvoiceNumber() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const uniqueCode = Date.now().toString().slice(-6);

    return `AE-${year}${month}${day}-${uniqueCode}`;
  }

  function money(value) {
    return "$" + Number(value || 0).toFixed(2);
  }

  function ownerMessage(booking) {
    return `NEW ANGEL EXPRESS BOOKING

Passenger: ${booking.name || "Website Passenger"}
Phone: ${booking.phone || "Not provided"}
Email: ${booking.email || "Not provided"}

Route: ${booking.route || "Not provided"}
Trip Type: ${booking.trip_type || "Not specified"}
Date: ${booking.date || "Not provided"}
Time: ${booking.time || "Not provided"}

Pickup: ${booking.pickup || "Not provided"}
Drop-off: ${booking.dropoff || "Not provided"}

Miles: ${booking.miles || 0}
Total: ${money(booking.total || 0)}

Please confirm availability.`;
  }

  /* =========================
     LEGACY BOOKING FORM SUPPORT
     Only runs if an old page still has #bookingForm.
     New V5 booking pages do not depend on this.
  ========================= */

  function setupLegacyBookingForm() {
    const bookingForm = document.getElementById("bookingForm");

    if (!bookingForm) return;

    const pickupEl = document.getElementById("pickup");
    const dropoffEl = document.getElementById("dropoff");
    const pricePreview = document.getElementById("pricePreview");

    function estimateMiles(pickup, dropoff) {
      const text = `${pickup || ""} ${dropoff || ""}`.toLowerCase();

      if (text.includes("austin")) return 221.5;
      if (text.includes("houston")) return 240;
      if (text.includes("san antonio")) return 275;
      if (text.includes("oklahoma")) return 205;
      if (text.includes("college station")) return 180;
      if (text.includes("dfw")) return 25;
      if (text.includes("love field")) return 15;

      return 100;
    }

    function calculatePrice() {
      if (!pickupEl || !dropoffEl || !pricePreview) return;

      const pickup = pickupEl.value.trim();
      const dropoff = dropoffEl.value.trim();

      if (!pickup || !dropoff) return;

      const miles = estimateMiles(pickup, dropoff);
      const baseFare = 35;
      const mileageFare = miles * 1.1;
      const total = baseFare + mileageFare;

      const milesEl = document.getElementById("miles");
      const baseEl = document.getElementById("base");
      const totalEl = document.getElementById("total");

      if (milesEl) milesEl.value = miles.toFixed(1);
      if (baseEl) baseEl.value = baseFare.toFixed(2);
      if (totalEl) totalEl.value = total.toFixed(2);

      pricePreview.textContent = `${miles.toFixed(1)} miles • ${money(total)}`;
    }

    pickupEl?.addEventListener("blur", calculatePrice);
    dropoffEl?.addEventListener("blur", calculatePrice);

    bookingForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!compatSupabase) {
        alert("Supabase is not connected on this page.");
        return;
      }

      const loader = document.getElementById("bookingLoader");
      const submitBtn = bookingForm.querySelector("button[type='submit']");

      if (submitBtn?.disabled) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Processing...";
      }

      loader?.classList.add("show");

      const pickup = document.getElementById("pickup")?.value.trim() || "";
      const dropoff = document.getElementById("dropoff")?.value.trim() || "";
      const miles = Number(document.getElementById("miles")?.value || 0);
      const total = Number(document.getElementById("total")?.value || 0);

      const booking = {
        name: document.getElementById("name")?.value.trim() || "Website Passenger",
        passenger_name:
          document.getElementById("name")?.value.trim() || "Website Passenger",
        phone: cleanPhone(document.getElementById("phone")?.value.trim() || ""),
        email: document.getElementById("email")?.value.trim() || "",
        route: `${pickup} → ${dropoff}`,
        trip_type: document.getElementById("tripType")?.value || "One Way",
        date: document.getElementById("date")?.value || "",
        time: document.getElementById("time")?.value || "",
        ride_date: document.getElementById("date")?.value || "",
        ride_time: document.getElementById("time")?.value || "",
        pickup,
        dropoff,
        pickup_address: pickup,
        dropoff_address: dropoff,
        miles,
        estimated_miles: miles,
        base: Number(document.getElementById("base")?.value || 35),
        base_fare: 35,
        total,
        total_fare: total,
        balance_due: total,
        status: "pending",
        source: "website",
        payment_status: "unpaid",
        invoice_no: generateInvoiceNumber(),
        invoice_status: "Pending",
      };

      if (!booking.name || !booking.date || !booking.time || !pickup || !dropoff) {
        alert("Please complete all required booking fields.");

        loader?.classList.remove("show");

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Save Booking";
        }

        return;
      }

      try {
        const { data, error } = await compatSupabase
          .from("bookings")
          .insert([booking])
          .select("*")
          .single();

        if (error) throw error;

        try {
          await fetch(AE_COMPAT.googleScriptUrl, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify({
              ...booking,
              invoice_pdf: "",
              amount_paid: 0,
              balance_due: booking.total,
            }),
          });
        } catch (notificationError) {
          console.log("Google Script notification skipped:", notificationError);
        }

        const whatsappText = encodeURIComponent(
          ownerMessage({
            ...booking,
            id: data?.id,
          })
        );

        window.open(
          `${AE_COMPAT.whatsapp}?text=${whatsappText}`,
          "_blank"
        );

        localStorage.setItem(
          "angelLastBooking",
          JSON.stringify({
            ...booking,
            id: data?.id,
          })
        );

        window.location.href = AE_COMPAT.successPage;
      } catch (error) {
        console.error(error);

        loader?.classList.remove("show");

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Save Booking";
        }

        alert("Booking could not be saved. " + (error.message || ""));
      }
    });
  }

  /* =========================
     LEGACY ADMIN RECORDS
     Only runs if old admin elements exist.
  ========================= */

  function setupLegacyAdminButtons() {
    const refreshBookingsBtn = document.getElementById("refreshBookings");
    const refreshCustomersBtn = document.getElementById("refreshCustomers");

    refreshBookingsBtn?.addEventListener("click", loadBookings);
    refreshCustomersBtn?.addEventListener("click", loadCustomers);

    loadBookings();
    loadCustomers();
  }

  async function loadBookings() {
    const list = document.getElementById("bookingList");

    if (!list) return;

    try {
      const response = await fetch("/api/bookings");
      const data = await response.json();
      const bookings = data.bookings || [];

      if (!bookings.length) {
        list.innerHTML = `<p>No bookings saved yet.</p>`;
        return;
      }

      list.innerHTML = bookings
        .slice()
        .reverse()
        .map(
          (booking) => `
            <div class="record">
              <b>${booking.name || booking.passenger_name || "Passenger"} — ${booking.route || ""}</b>
              <span>${booking.date || booking.ride_date || ""} at ${booking.time || booking.ride_time || ""}</span>
              <span>${money(booking.total || booking.total_fare || 0)} • ${booking.status || "pending"}</span>
            </div>
          `
        )
        .join("");
    } catch {
      list.innerHTML = `<p>Backend not connected. Run npm install, then npm start.</p>`;
    }
  }

  async function loadCustomers() {
    const list = document.getElementById("customerList");

    if (!list) return;

    try {
      const response = await fetch("/api/customers");
      const data = await response.json();
      const customers = data.customers || [];

      if (!customers.length) {
        list.innerHTML = `<p>No customers saved yet.</p>`;
        return;
      }

      list.innerHTML = customers
        .slice()
        .reverse()
        .map(
          (customer) => `
            <div class="record">
              <b>${customer.name || "Customer"}</b>
              <span>${customer.phone || ""}</span>
              <span>${customer.totalBookings || 0} booking(s) • Last route: ${customer.lastRoute || "N/A"}</span>
            </div>
          `
        )
        .join("");
    } catch {
      list.innerHTML = `<p>Backend not connected. Run npm install, then npm start.</p>`;
    }
  }

  /* =========================
     LEGACY REVEAL SUPPORT
  ========================= */

  function setupLegacyReveal() {
    const revealElements = document.querySelectorAll(".reveal");

    if (!revealElements.length) return;

    if (!("IntersectionObserver" in window)) {
      revealElements.forEach((element) => {
        element.classList.add("active", "visible");
      });

      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active", "visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    revealElements.forEach((element) => {
      observer.observe(element);
    });
  }
})();