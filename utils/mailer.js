const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Format date nicely
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";

const fmtAmount = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

/**
 * Send booking confirmation email to the customer.
 * @param {Object} booking  — populated Booking document
 * @param {string} toEmail  — customer email
 * @param {string} toName   — customer name
 */
const sendBookingConfirmation = async (booking, toEmail, toName) => {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) return; // silently skip if not configured

  const isHotel = booking.bookingCategory === "hotel";
  const itemName = isHotel
    ? booking.hotelId?.name || "Hotel"
    : booking.eventId?.name || "Event";

  const detailRows = isHotel
    ? `
      <tr><td style="padding:6px 0;color:#555;">Check-in</td><td style="padding:6px 0;font-weight:600;">${fmtDate(booking.checkIn)}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Check-out</td><td style="padding:6px 0;font-weight:600;">${fmtDate(booking.checkOut)}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Rooms</td><td style="padding:6px 0;font-weight:600;">${booking.rooms}</td></tr>
    `
    : `
      <tr><td style="padding:6px 0;color:#555;">Event Date</td><td style="padding:6px 0;font-weight:600;">${fmtDate(booking.eventDate)}</td></tr>
      <tr><td style="padding:6px 0;color:#555;">Booking Type</td><td style="padding:6px 0;font-weight:600;">${booking.eventBookingType === "hall" ? `${booking.halls} Hall(s)` : `${booking.tickets} Ticket(s)`}</td></tr>
    `;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <!-- Header -->
      <div style="background:#1A3C34;padding:28px 32px;">
        <h1 style="margin:0;color:#BFA060;font-size:22px;letter-spacing:0.5px;">StayEvents</h1>
        <p style="margin:6px 0 0;color:#a0c4b8;font-size:14px;">Booking Confirmed ✓</p>
      </div>

      <!-- Body -->
      <div style="padding:28px 32px;background:#fff;">
        <p style="font-size:16px;color:#111;">Hi <strong>${toName}</strong>,</p>
        <p style="color:#444;line-height:1.6;">
          Your ${isHotel ? "hotel" : "event"} booking has been <strong style="color:#1A3C34;">confirmed</strong>.
          Here are your booking details:
        </p>

        <div style="background:#f9fafb;border-radius:10px;padding:20px 24px;margin:20px 0;">
          <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1A3C34;">${itemName}</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tbody>
              <tr><td style="padding:6px 0;color:#555;">Booking ID</td><td style="padding:6px 0;font-weight:600;color:#555;">#${booking._id.toString().slice(-8).toUpperCase()}</td></tr>
              ${detailRows}
              <tr><td style="padding:6px 0;color:#555;">Status</td><td style="padding:6px 0;"><span style="background:#dcfce7;color:#166534;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">Confirmed</span></td></tr>
              <tr style="border-top:1px solid #e5e7eb;">
                <td style="padding:12px 0 6px;font-weight:700;color:#1A3C34;font-size:16px;">Total Amount</td>
                <td style="padding:12px 0 6px;font-weight:700;color:#1A3C34;font-size:16px;">${fmtAmount(booking.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${booking.specialRequests ? `<p style="color:#555;font-size:13px;"><strong>Special Requests:</strong> ${booking.specialRequests}</p>` : ""}

        <p style="color:#777;font-size:13px;margin-top:24px;">
          Questions? Reply to this email or visit StayEvents to manage your booking.
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} StayEvents. All rights reserved.</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"StayEvents" <${process.env.MAIL_USER}>`,
    to: `"${toName}" <${toEmail}>`,
    subject: `Booking Confirmed — ${itemName}`,
    html,
  });
};

module.exports = { sendBookingConfirmation };
