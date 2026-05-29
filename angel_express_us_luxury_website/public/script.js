const OWNER_WHATSAPP = "12145550199"; // Change this to your Angel Express WhatsApp number, country code only.

const routeEl = document.getElementById("route");
const studentEl = document.getElementById("student");
const referralEl = document.getElementById("referral");
const successPanel = document.getElementById("successPanel");
let latestBooking = null;

const slides = document.querySelectorAll(".slide");
const dots = document.getElementById("dots");
let active = 0;

slides.forEach((_, index) => {
  const dot = document.createElement("button");
  dot.onclick = () => setSlide(index);
  dots.appendChild(dot);
});

function setSlide(index) {
  slides[active].classList.remove("active");
  dots.children[active].classList.remove("active");
  active = index;
  slides[active].classList.add("active");
  dots.children[active].classList.add("active");
  document.querySelectorAll("video").forEach(v => v.pause());
  const video = slides[active].querySelector("video");
  if (video) video.play().catch(() => {});
}
setSlide(0);
setInterval(() => setSlide((active + 1) % slides.length), 5000);

function cleanPhone(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function getPrice() {
  const selected = routeEl.options[routeEl.selectedIndex];
  const miles = Number(selected.dataset.miles);
  const base = miles;
  const studentDiscount = studentEl.checked ? base * 0.20 : 0;
  const referralDiscount = referralEl.checked ? 10 : 0;
  const discount = studentDiscount + referralDiscount;
  const total = Math.max(base - discount, 0);
  return { route: selected.value, miles, base, studentDiscount, referralDiscount, discount, total };
}

function renderPrice() {
  const p = getPrice();
  document.getElementById("miles").textContent = p.miles;
  document.getElementById("base").textContent = `$${p.base.toFixed(2)}`;
  document.getElementById("discount").textContent = `-$${p.discount.toFixed(2)}`;
  document.getElementById("total").textContent = `$${p.total.toFixed(2)}`;
}

routeEl.addEventListener("change", renderPrice);
studentEl.addEventListener("change", renderPrice);
referralEl.addEventListener("change", renderPrice);
renderPrice();

function buildBooking() {
  const price = getPrice();
  const booking = {
    name: document.getElementById("name").value.trim(),
    phone: cleanPhone(document.getElementById("phone").value.trim()),
    route: price.route,
    tripType: document.getElementById("tripType").value,
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    pickup: document.getElementById("pickup").value.trim(),
    dropoff: document.getElementById("dropoff").value.trim(),
    referralCode: document.getElementById("referralCode").value.trim(),
    referrer: document.getElementById("referrer").value.trim(),
    student: studentEl.checked,
    referralReward: referralEl.checked,
    miles: price.miles,
    base: price.base,
    discount: price.discount,
    total: price.total
  };

  if (!booking.name || !booking.phone || !booking.date || !booking.time || !booking.pickup || !booking.dropoff) {
    alert("Please complete all required booking fields.");
    return null;
  }
  return booking;
}

function passengerMessage(b) {
  return `Thanks for booking your ride with Angel Express US.

Ride: ${b.route}
Trip Type: ${b.tripType}
Date: ${b.date}
Time: ${b.time}
Pickup Address: ${b.pickup}
Drop-off Address: ${b.dropoff}
Vehicle: 2020 Nissan Rogue
Student Discount: ${b.student ? "Yes, 20% applied. Student ID required." : "No"}
Referral Code: ${b.referralCode || "None"}
Total: $${Number(b.total).toFixed(2)}

Please keep your phone available for pickup updates.`;
}

function ownerMessage(b) {
  return `NEW ANGEL EXPRESS US BOOKING

Booking ID: ${b.id || "Pending"}
Passenger: ${b.name}
Phone: ${b.phone}
Route: ${b.route}
Trip Type: ${b.tripType}
Date: ${b.date}
Time: ${b.time}
Pickup: ${b.pickup}
Drop-off: ${b.dropoff}
Vehicle: 2020 Nissan Rogue
Student Discount: ${b.student ? "YES" : "NO"}
Referral Reward: ${b.referralReward ? "YES" : "NO"}
Referral Code: ${b.referralCode || "None"}
Referred By: ${b.referrer || "None"}
Miles: ${b.miles}
Total: $${Number(b.total).toFixed(2)}

Please confirm availability and payment.`;
}

function wa(phone, text) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function calendarLink(b) {
  const start = new Date(`${b.date}T${b.time}`);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const fmt = d => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Angel Express US Ride: " + b.name)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(ownerMessage(b))}&location=${encodeURIComponent(b.pickup + " to " + b.dropoff)}&sf=true&output=xml`;
}

document.getElementById("bookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const booking = buildBooking();
  if (!booking) return;

  try {
    const res = await fetch("/.netlify/functions/create_booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking)
    });

    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Booking failed");

    latestBooking = data.booking;
    document.getElementById("bookingId").textContent = `Booking ID: ${latestBooking.id}`;
    document.getElementById("passengerWhatsApp").onclick = () => window.open(wa(latestBooking.phone, passengerMessage(latestBooking)), "_blank");
    document.getElementById("ownerWhatsApp").onclick = () => window.open(wa(OWNER_WHATSAPP, ownerMessage(latestBooking)), "_blank");
    document.getElementById("calendarBtn").onclick = () => window.open(calendarLink(latestBooking), "_blank");

    successPanel.style.display = "block";
    successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    loadBookings();
    loadCustomers();
  } catch (err) {
    alert("Booking could not be saved. Make sure the backend is running. " + err.message);
  }
});

async function loadBookings() {
  const list = document.getElementById("bookingList");
  try {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    const bookings = data.bookings || [];
    if (!bookings.length) {
      list.innerHTML = `<p>No bookings saved yet.</p>`;
      return;
    }
    list.innerHTML = bookings.slice().reverse().map(b => `
      <div class="record">
        <b>${b.name} — ${b.route}</b>
        <span>${b.date} at ${b.time}</span>
        <span>$${Number(b.total).toFixed(2)} • ${b.status}</span>
      </div>
    `).join("");
  } catch {
    list.innerHTML = `<p>Backend not connected. Run npm install, then npm start.</p>`;
  }
}

async function loadCustomers() {
  const list = document.getElementById("customerList");
  try {
    const res = await fetch("/api/customers");
    const data = await res.json();
    const customers = data.customers || [];
    if (!customers.length) {
      list.innerHTML = `<p>No customers saved yet.</p>`;
      return;
    }
    list.innerHTML = customers.slice().reverse().map(c => `
      <div class="record">
        <b>${c.name}</b>
        <span>${c.phone}</span>
        <span>${c.totalBookings} booking(s) • Last route: ${c.lastRoute || "N/A"}</span>
      </div>
    `).join("");
  } catch {
    list.innerHTML = `<p>Backend not connected. Run npm install, then npm start.</p>`;
  }
}

document.getElementById("refreshBookings").onclick = loadBookings;
document.getElementById("refreshCustomers").onclick = loadCustomers;
document.getElementById("date").min = new Date().toISOString().split("T")[0];
loadBookings();
loadCustomers();