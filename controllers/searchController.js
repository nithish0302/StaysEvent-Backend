const Hotel = require("../models/Hotel");
const Event = require("../models/Event");

// GET /api/search?q=&city=&limit=10
// Unified search across hotels and events by name/city, active listings only.
const search = async (req, res) => {
  const { q = "", city = "", limit = 10 } = req.query;
  try {
    const textFilter = q
      ? { name: { $regex: q, $options: "i" } }
      : {};
    const cityFilter = city
      ? { "location.city": { $regex: city, $options: "i" } }
      : {};

    const hotelFilter = { isActive: true, ...textFilter, ...cityFilter };
    const eventFilter = { isActive: true, ...textFilter, ...cityFilter };

    const [hotels, events] = await Promise.all([
      Hotel.find(hotelFilter)
        .select("name location photos pricePerNight avgRating reviewCount isFeatured")
        .limit(Number(limit)),
      Event.find(eventFilter)
        .select("name location photos startDate category avgRating reviewCount isFeatured bookingType hallDetails ticketDetails")
        .limit(Number(limit)),
    ]);

    const results = [
      ...hotels.map((h) => ({ ...h.toObject(), itemType: "HOTEL" })),
      ...events.map((e) => ({ ...e.toObject(), itemType: "EVENT" })),
    ];

    return res.status(200).json({
      success: true,
      results,
      total: results.length,
      hotels,
      events,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal Error Occurred", err: err.message });
  }
};

module.exports = { search };
