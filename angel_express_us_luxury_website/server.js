const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const BOOKINGS_FILE = path.join(__dirname, "bookings.json");
const CUSTOMERS_FILE = path.join(__dirname, "customers.json");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return []; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function upsertCustomer(booking) {
  const customers = readJSON(CUSTOMERS_FILE);
  const found = customers.find(c => c.phone === booking.phone);
  if (found) {
    found.name = booking.name;
    found.totalBookings = (found.totalBookings || 0) + 1;
    found.lastRoute = booking.route;
    found.lastBookingAt = new Date().toISOString();
    found.student = booking.student;
  } else {
    customers.push({
      id: "CUST-" + Date.now(),
      name: booking.name,
      phone: booking.phone,
      student: booking.student,
      totalBookings: 1,
      lastRoute: booking.route,
      firstBookingAt: new Date().toISOString(),
      lastBookingAt: new Date().toISOString()
    });
  }
  writeJSON(CUSTOMERS_FILE, customers);
}

app.post("/api/bookings", (req, res) => {
  const booking = req.body || {};
  const missing = ["name", "phone", "route", "date", "time", "pickup", "dropoff"].filter(k => !booking[k]);
  if (missing.length) return res.status(400).json({ ok: false, error: "Missing required fields", missing });

  const record = {
    id: "AEX-US-" + Date.now(),
    status: "pending confirmation",
    createdAt: new Date().toISOString(),
    ...booking
  };
  const bookings = readJSON(BOOKINGS_FILE);
  bookings.push(record);
  writeJSON(BOOKINGS_FILE, bookings);
  upsertCustomer(record);
  res.json({ ok: true, booking: record });
});

app.get("/api/bookings", (req, res) => res.json({ ok: true, bookings: readJSON(BOOKINGS_FILE) }));
app.get("/api/customers", (req, res) => res.json({ ok: true, customers: readJSON(CUSTOMERS_FILE) }));

app.get("/api/bookings.csv", (req, res) => {
  const bookings = readJSON(BOOKINGS_FILE);
  const headers = ["id","createdAt","status","name","phone","route","tripType","date","time","pickup","dropoff","student","referralCode","referrer","miles","base","discount","total"];
  const rows = bookings.map(b => headers.map(h => `"${String(b[h] ?? "").replace(/"/g, '""')}"`).join(","));
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=angel-express-us-bookings.csv");
  res.send([headers.join(","), ...rows].join("\n"));
});

app.listen(PORT, () => console.log(`Angel Express US Luxury Website running at http://localhost:${PORT}`));