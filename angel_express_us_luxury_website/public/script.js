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

const pickupEl = document.getElementById("pickup");
const dropoffEl = document.getElementById("dropoff");
const pricePreview = document.getElementById("pricePreview");

const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjliZjA4M2Q3NzA3NDQzY2Y4MzFlOGRlYmQ5YTVkYTRjIiwiaCI6Im11cm11cjY0In0=";
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
function generateInvoiceNumber() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const uniqueCode = Date.now().toString().slice(-6);

  return `AE-${year}${month}${day}-${uniqueCode}`;
}

async function generateInvoicePDF(booking) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "pt", "letter");

  const invoiceNo = generateInvoiceNumber();

  const invoiceDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const miles = Number(booking.miles || 0);
  const total = Number(booking.total || 0);
  const amountPaid = Number(booking.amount_paid || 0);
  const balanceDue = total - amountPaid;

  const zelleEmail = "tjayekeh@gmail.com";
  const paymentText = `Pay Angel Express via Zelle\nRecipient: ${zelleEmail}\nInvoice: ${invoiceNo}\nAmount: $${balanceDue.toFixed(2)}`;
 const qrDataUrl =
  "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" +
  encodeURIComponent(paymentText);

  const navy = "#0f2f4f";
  const lightBlue = "#eaf1f7";
  const green = "#22c55e";
  const red = "#c0392b";

  doc.setFillColor(navy);
  doc.rect(0, 0, 612, 55, "F");

  doc.setTextColor("#ffffff");
  doc.setFontSize(12);
  doc.text("GO FAR. ARRIVE WELL.", 306, 34, { align: "center" });

  doc.setTextColor(navy);
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text("PROFESSIONAL TRANSPORTATION", 50, 95);
  doc.text("INVOICE", 50, 117);

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text("Angel Express", 50, 140);
  doc.text("Phone: 617-606-0679 | Email: angelsexpresss@gmail.com", 50, 155);
  doc.text("Reservation Link: https://angel-express-us-luxury-website.pages.dev/", 50, 170);

  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text(`Invoice #: ${invoiceNo}`, 360, 95);
  doc.text(`Date: ${invoiceDate}`, 360, 115);
  doc.setTextColor("#d68910");
  doc.text("Status: PENDING", 360, 135);

  doc.setTextColor(navy);
  doc.setFontSize(13);
  doc.text("TRIP DETAILS", 50, 210);

  doc.setFillColor(lightBlue);
  doc.rect(50, 225, 512, 70, "F");

  doc.setFillColor(navy);
  doc.rect(50, 225, 110, 35, "F");
  doc.rect(50, 260, 110, 35, "F");

  doc.setTextColor("#ffffff");
  doc.setFontSize(10);
  doc.text("Pickup", 60, 247);
  doc.text("Drop-off", 60, 282);

  doc.setTextColor("#000000");
  doc.text(booking.pickup || "", 170, 247, { maxWidth: 370 });
  doc.text(booking.dropoff || "", 170, 282, { maxWidth: 370 });

  doc.setTextColor(navy);
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("MILEAGE BREAKDOWN", 50, 330);

  doc.setFillColor(navy);
  doc.rect(50, 345, 512, 25, "F");

  doc.setTextColor("#ffffff");
  doc.setFontSize(10);
  doc.text("Segment", 60, 362);
  doc.text("Miles", 510, 362);

  doc.setTextColor("#000000");
  doc.setFillColor("#ffffff");
  doc.rect(50, 370, 512, 30, "S");
  doc.text("Pickup → Drop-off", 60, 390);
  doc.text(String(miles), 510, 390);

  doc.setFillColor("#dfe6e9");
  doc.rect(50, 400, 512, 28, "F");
  doc.setFont(undefined, "bold");
  doc.text("TOTAL MILES", 60, 418);
  doc.text(String(miles), 510, 418);

  doc.setTextColor(navy);
  doc.setFontSize(13);
  doc.text("CHARGES & PAYMENT SUMMARY", 50, 465);

  doc.setFillColor(navy);
  doc.rect(50, 480, 512, 25, "F");

  doc.setTextColor("#ffffff");
  doc.text("Description", 60, 497);
  doc.text("Amount", 500, 497);

  doc.setTextColor("#000000");
  doc.setFillColor("#fff9e6");
  doc.rect(50, 505, 512, 30, "F");
  doc.text("Angel Express Transportation Service", 60, 525);
  doc.text(`$${total.toFixed(2)}`, 500, 525);

  doc.setFillColor("#ffffff");
  doc.rect(50, 535, 512, 30, "F");
  doc.setTextColor(green);
  doc.text("Amount Paid", 60, 555);
  doc.text(`$${amountPaid.toFixed(2)}`, 500, 555);

  doc.setFillColor("#fdecea");
  doc.rect(50, 565, 512, 30, "F");
  doc.setTextColor(red);
  doc.text("Balance Due", 60, 585);
  doc.text(`$${balanceDue.toFixed(2)}`, 500, 585);

  doc.setTextColor(navy);
  doc.setFontSize(13);
  doc.text("PAYMENT & AUTHORIZATION", 50, 630);

  doc.addImage(qrDataUrl, "PNG", 60, 645, 110, 110);

  doc.setFontSize(10);
  doc.setTextColor("#000000");
  doc.text("Pay via Zelle", 190, 665);
  doc.text("Scan the QR code with your bank or Zelle app.", 190, 682);
  doc.text("Recipient: tjayekeh@gmail.com", 190, 699);
  doc.text(`Reference: Invoice ${invoiceNo}`, 190, 716);

  doc.text("Authorized by: Angel Express", 360, 680);

  doc.setTextColor(navy);
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("TERMS & CONDITIONS", 50, 780);

  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  doc.setTextColor("#333333");
  doc.text(
    "1. Payment is due upon receipt unless otherwise agreed. 2. Reservations are confirmed after payment or deposit. 3. Cancellations should be made at least 24 hours before pickup. 4. Angel Express is not liable for delays caused by traffic, weather, road closures, or events beyond reasonable control. 5. By booking, the passenger agrees to provide accurate pickup and drop-off information and to be available at the scheduled pickup time.",
    50,
    798,
    { maxWidth: 512 }
  );

  return {
    invoiceNo,
    pdfBase64: doc.output("datauristring").split(",")[1]
  };
}

async function calculatePrice() {
  const pickup = pickupEl.value.trim();
  const dropoff = dropoffEl.value.trim();

  if (!pickup || !dropoff) return;

  try {
    // Geocode pickup
    const startRes = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(pickup)}`
    );
    const startData = await startRes.json();

    // Geocode dropoff
    const endRes = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(dropoff)}`
    );
    const endData = await endRes.json();

    if (!startData.features.length || !endData.features.length) {
      pricePreview.textContent = "Address not found.";
      return;
    }

    const start = startData.features[0].geometry.coordinates;
    const end = endData.features[0].geometry.coordinates;

    // Get route distance
    const routeRes = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      {
        method: "POST",
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          coordinates: [start, end]
        })
      }
    );

    const routeData = await routeRes.json();

    const meters =
      routeData.routes[0].summary.distance;

    const miles = meters * 0.000621371;
    const total = Math.ceil(miles);

    document.getElementById("miles").value = miles.toFixed(1);
    document.getElementById("base").value = total;
    document.getElementById("total").value = total;

    pricePreview.textContent =
      `${miles.toFixed(1)} miles • $${total}`;
  } catch (err) {
    console.error(err);
    pricePreview.textContent =
      "Unable to calculate route.";
  }
}
pickupEl.addEventListener("blur", calculatePrice);
dropoffEl.addEventListener("blur", calculatePrice);

function getPrice() {
  return {
    route: document.getElementById("pickup").value +
           " → " +
           document.getElementById("dropoff").value,

    miles: Number(document.getElementById("miles").value || 0),

    base: Number(document.getElementById("base").value || 0),

    total: Number(document.getElementById("total").value || 0)
  };
}
function renderPrice() {
  const p = getPrice();
}

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

const invoice = await generateInvoicePDF(booking);

const emailBooking = {
  ...booking,
  invoice_no: invoice.invoiceNo,
  invoice_pdf: invoice.pdfBase64,
  amount_paid: 0,
  balance_due: booking.total
};

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
  body: JSON.stringify(emailBooking)
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
function sendChat() {
  const input = document.getElementById("chatInput");
  const messages = document.getElementById("chatbotMessages");
  const question = input.value.trim();

  if (!question) return;

  messages.innerHTML += `<p><strong>You:</strong> ${question}</p>`;

  let answer = "Please contact Angel Express directly for this question.";

  const q = question.toLowerCase();

  if (q.includes("route") || q.includes("where")) {
    answer = "We cover Dallas to Austin, Houston, San Antonio, Oklahoma, College Station, airports, events, and custom destinations.";
  } else if (q.includes("price") || q.includes("cost") || q.includes("how much")) {
    answer = "Angel Express pricing is based on distance. Students may receive a 20% discount.";
  } else if (q.includes("book") || q.includes("reserve")) {
    answer = "You can book your ride by filling out the reservation form on this website.";
  } else if (q.includes("student")) {
    answer = "Yes, students can receive a 20% discount when booking.";
  } else if (q.includes("airport")) {
    answer = "Yes, airport pickup and drop-off are available.";
  } else if (q.includes("car") || q.includes("vehicle")) {
    answer = "Angel Express currently uses a 2020 Nissan Rogue for private regional rides.";
  }

  messages.innerHTML += `<p><strong>Bot:</strong> ${answer}</p>`;
  input.value = "";
  messages.scrollTop = messages.scrollHeight;
}
const chatToggle = document.getElementById("chatToggle");
const chatbotBox = document.getElementById("chatbotBox");

if (chatToggle && chatbotBox) {
  chatToggle.addEventListener("click", () => {
    chatbotBox.classList.toggle("open");
  });
}
