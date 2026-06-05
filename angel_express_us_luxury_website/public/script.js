const SUPABASE_URL = "https://zlzastjpvbboniybyvjv.supabase.co";
console.log("SUPABASE_URL =", SUPABASE_URL);

const SUPABASE_ANON_KEY = "sb_publishable_Fn0wUeIUskON-kTpl8kDFw_B1Exp0EP";

const GOOGLE_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbzfjXYUphz8-nyETcdMYOpHCPoBY33V17OkAZMODpBRVT2V6m8H9DTG5iBM63QqbHtR/exec";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
const OWNER_WHATSAPP = "16176060679"; // Change this to your Angel Express WhatsApp number, country code only.

const routeEl = document.getElementById("route");
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

    const total = base;

    return {
        route: selected.value,
        miles,
        base,
        total
    };
}
function renderPrice() {
  const p = getPrice();
}

routeEl.addEventListener("change", renderPrice);
renderPrice();

function buildBooking() {
  const price = getPrice();
  const booking = {
    name: document.getElementById("name").value.trim(),
    phone: cleanPhone(document.getElementById("phone").value.trim()),
    email: document.getElementById("email").value.trim(),
    route: price.route,
    tripType: document.getElementById("tripType").value,
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    pickup: document.getElementById("pickup").value.trim(),
    dropoff: document.getElementById("dropoff").value.trim(),
    miles: price.miles,
    base: price.base,
    total: price.total,
    status: "pending"
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
Trip Type: ${b.trip_type || "Not specified"}
Date: ${b.date}
Time: ${b.time}
Pickup Address: ${b.pickup}
Drop-off Address: ${b.dropoff}
Vehicle: 2020 Nissan Rogue

Please keep your phone available for pickup updates.`;
}

function ownerMessage(b) {
  return `NEW ANGEL EXPRESS US BOOKING

Booking ID: ${b.id || "Pending"}
Passenger: ${b.name}
Phone: ${b.phone}
Route: ${b.route}
Trip Type: ${b.trip_type || "Not specified"}
Date: ${b.date}
Time: ${b.time}
Pickup: ${b.pickup}
Drop-off: ${b.dropoff}
Vehicle: 2020 Nissan Rogue
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

  try {
    const { data, error } = await supabaseClient
      .from("bookings")
      .insert([booking])
      .select("*")
      .single();

    if (error) throw error;

   await fetch(GOOGLE_SCRIPT_URL, {
  method: "POST",
  mode: "no-cors",
  body: JSON.stringify(booking)
});

    latestBooking = data;
const whatsappMessage = encodeURIComponent(
`New Angel Express Booking

Passenger: ${latestBooking.name}
Phone: ${latestBooking.phone}
Email: ${latestBooking.email}

Route: ${latestBooking.route}
Trip Type: ${latestBooking.trip_type}
Date: ${latestBooking.date}
Time: ${latestBooking.time}

Pickup: ${latestBooking.pickup}
Drop-off: ${latestBooking.dropoff}

Miles: ${latestBooking.miles}
Total: $${latestBooking.total}`
);

window.open(`https://wa.me/16176060679?text=${whatsappMessage}`, "_blank");

    alert("Booking saved successfully!");
  } catch (err) {
    alert("Booking could not be saved. " + err.message);
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

const refreshBookingsBtn = document.getElementById("refreshBookings");
const refreshCustomersBtn = document.getElementById("refreshCustomers");

if (refreshBookingsBtn) {
  refreshBookingsBtn.onclick = loadBookings;
}

if (refreshCustomersBtn) {
  refreshCustomersBtn.onclick = loadCustomers;
}