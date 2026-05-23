const { default: mongoose } = require("mongoose");
const Event = require("../models/Event");
const Hotel = require("../models/Hotel");
const User = require("../models/User");

const createEvent = async (req, res) => {
  const id = req.user.id;

  try {
    const {
      name,
      description,
      category,
      otherCategoryName,
      bookingType,
      startTime,
      endTime,
      status,
      amenities,
      location,
      hallDetails,
      ticketDetails,
      photos,
      registrationDeadline,
      startDate,
      endDate,
      isPublic,
      isFeatured,
    } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.vendorStatus !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Vendor not approved",
      });
    }

    const stringFields = [
      name,
      description,
      category,
      bookingType,
      startTime,
      endTime,
    ];

    const arrayFields = [amenities];

    const hasEmptyStrings = stringFields.some((field) => !field?.trim());

    const hasEmptyArrays = arrayFields.some((field) => !field?.length);

    const validateLocation = () => {
      if (!location) {
        return false;
      }

      const locationStrings = [location.city, location.state, location.address];

      const hasEmptyLocationStrings = locationStrings.some(
        (field) => !field?.trim(),
      );

      if (hasEmptyLocationStrings) {
        return false;
      }

      return true;
    };

    if (hasEmptyStrings || hasEmptyArrays || !validateLocation()) {
      return res.status(400).json({
        success: false,
        message: "All fields are mandatory",
      });
    }

    const validateHallBooking = () => {
      return hallDetails?.pricePerDay && hallDetails?.totalHalls;
    };

    const validateTicketBooking = () => {
      return ticketDetails?.price && ticketDetails?.totalSeats;
    };

    if (bookingType.toLowerCase() === "hall") {
      if (!validateHallBooking()) {
        return res.status(400).json({
          success: false,
          message: "Hall details needed",
        });
      }
    }

    if (bookingType.toLowerCase() === "ticket") {
      if (!validateTicketBooking()) {
        return res.status(400).json({
          success: false,
          message: "Ticket details needed",
        });
      }
    }

    if (bookingType.toLowerCase() === "both") {
      if (!validateHallBooking() || !validateTicketBooking()) {
        return res.status(400).json({
          success: false,
          message: "Both hall and ticket details needed",
        });
      }
    }

    if (
      registrationDeadline &&
      new Date(registrationDeadline) >= new Date(startDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Registration Deadline must be before Start date",
      });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    if (category.toLowerCase() === "other" && !otherCategoryName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please specify the event category name",
      });
    }

    const nearbyHotel = await Hotel.find(
      { "location.city": location.city, isActive: true },
      "_id",
    );

    const nearbyHotelId = nearbyHotel.map((hotel) => hotel._id);

    const event = await Event.create({
      vendorId: id,
      name,
      description,
      category,
      otherCategoryName,
      bookingType,
      hallDetails: hallDetails
        ? {
            ...hallDetails,
            availableHalls: hallDetails.totalHalls,
          }
        : null,
      ticketDetails: ticketDetails
        ? {
            ...ticketDetails,
            availableSeats: ticketDetails.totalSeats,
          }
        : null,
      location,
      photos,
      startDate,
      endDate,
      startTime,
      endTime,
      registrationDeadline,
      status,
      amenities,
      isPublic,
      nearbyHotels: nearbyHotelId,
      isFeatured,
    });

    return res.status(201).json({ success: true, event });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const {
      city,
      category,
      bookingType,
      status,
      minPrice,
      maxPrice,
      amenities,
      isPublic,
      page = 1,
      limit = 10,
    } = req.query;
    const now = new Date();

    await Event.updateMany(
      { endDate: { $lt: now }, status: { $nin: ["completed", "cancelled"] } },
      { $set: { status: "completed" } },
    );

    await Event.updateMany(
      {
        startDate: { $lte: now },
        endDate: { $gte: now },
        status: { $nin: ["ongoing", "cancelled"] },
      },
      { $set: { status: "ongoing" } },
    );

    let filter = { isActive: true };

    if (city) {
      filter["location.city"] = city;
    }

    if (category) {
      filter.category = category;
    }

    if (bookingType) {
      filter.bookingType = bookingType;
    }

    if (status) {
      filter.status = status;
    } else {
      filter.status = { $nin: ["completed", "cancelled"] };
    }
    if (minPrice || maxPrice) {
      const priceFilter = {};

      if (minPrice) priceFilter.$gte = Number(minPrice);

      if (maxPrice) priceFilter.$lte = Number(maxPrice);

      filter.$or = [
        { "hallDetails.pricePerDay": priceFilter },
        { "ticketDetails.price": priceFilter },
      ];
    }

    if (amenities) {
      const amenitiesArray = amenities.split(",");
      filter.amenities = {
        $all: amenitiesArray,
      };
    }

    if (isPublic !== undefined) {
      filter.isPublic = isPublic === "true";
    }

    const skip = (Number(page) - 1) * Number(limit);

    const events = await Event.find(filter).skip(skip).limit(Number(limit));
    console.log(events);
    const totalEvents = await Event.countDocuments(filter);

    return res.status(200).json({
      success: true,
      currentPage: page,
      totalPage: Math.ceil(totalEvents / limit),
      totalEvents,
      events,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const getEventById = async (req, res) => {
  const id = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Event Id not valid",
      });
    }
    const event = await Event.findById(id)
      .populate("vendorId", "name email")
      .populate("nearbyHotels", "name location pricePerNight photos avgRating");
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event Not Found ",
      });
    }

    const now = new Date();
    if (event.status !== "cancelled") {
      if (now < new Date(event.startDate)) {
        event.status = "upcoming";
      } else if (
        now >= new Date(event.startDate) &&
        now <= new Date(event.endDate)
      ) {
        event.status = "ongoing";
      } else if (now > new Date(event.endDate)) {
        event.status = "completed";
      }
      await event.save();
    }

    return res.status(200).json({
      success: true,
      event,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const updateEvent = async (req, res) => {
  const id = req.user.id;
  const eventId = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Event Id" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event Not Found" });
    }

    if (!event.vendorId.equals(id)) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    const newBookingType = req.body.bookingType || event.bookingType;
    const bookingTypeChanged =
      req.body.bookingType && req.body.bookingType !== event.bookingType;

    const needsHall = newBookingType === "hall" || newBookingType === "both";
    const needsTicket =
      newBookingType === "ticket" || newBookingType === "both";

    if (needsHall) {
      const hallData = req.body.hallDetails || event.hallDetails;
      if (!hallData?.pricePerDay || !hallData?.totalHalls) {
        return res.status(400).json({
          success: false,
          message:
            "Hall details (pricePerDay, totalHalls) are required for this bookingType",
        });
      }

      event.hallDetails = {
        ...(event.hallDetails.toObject?.() ?? event.hallDetails),
        ...hallData,
        availableHalls:
          bookingTypeChanged || req.body.hallDetails?.totalHalls
            ? hallData.totalHalls
            : event.hallDetails.availableHalls,
      };
    }

    if (needsTicket) {
      const ticketData = req.body.ticketDetails || event.ticketDetails;
      if (!ticketData?.price || !ticketData?.totalSeats) {
        return res.status(400).json({
          success: false,
          message:
            "Ticket details (price, totalSeats) are required for this bookingType",
        });
      }

      event.ticketDetails = {
        ...(event.ticketDetails.toObject?.() ?? event.ticketDetails),
        ...ticketData,
        availableSeats:
          bookingTypeChanged || req.body.ticketDetails?.totalSeats
            ? ticketData.totalSeats
            : event.ticketDetails.availableSeats,
      };
    }

    if (bookingTypeChanged) {
      if (!needsHall) {
        event.hallDetails = {
          pricePerDay: null,
          totalHalls: null,
          availableHalls: null,
        };
      }
      if (!needsTicket) {
        event.ticketDetails = {
          price: null,
          totalSeats: null,
          availableSeats: null,
        };
      }
    }

    const allowedFields = [
      "name",
      "description",
      "category",
      "otherCategoryName",
      "bookingType",
      "location",
      "photos",
      "startDate",
      "endDate",
      "startTime",
      "endTime",
      "registrationDeadline",
      "isPublic",
      "amenities",
    ];

    for (const field of allowedFields) {
      if (req.body[field] === undefined) continue;

      if (field === "location") {
        const updatedCity = req.body.location?.city;
        const oldCity = event.location?.city;

        if (updatedCity !== undefined && updatedCity !== oldCity) {
          const nearbyHotels = await Hotel.find(
            { "location.city": updatedCity, isActive: true },
            "_id",
          );
          event.nearbyHotels = nearbyHotels.map((hotel) => hotel._id);
        }

        event.location = {
          ...(event.location.toObject?.() ?? event.location),
          ...req.body.location,
        };
      } else {
        event[field] = req.body[field];
      }
    }

    await event.save();
    return res.status(200).json({ success: true, event });
  } catch (err) {
    console.error("updateEvent error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Error Occurred" });
  }
};
const deleteEvent = async (req, res) => {
  const id = req.user.id;
  const eventId = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Event Id",
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event Not Found",
      });
    }

    if (!event.vendorId.equals(id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    await event.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Event Successfully permanently deleted ",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const changeEventStatus = async (req, res) => {
  const id = req.user.id;
  const eventId = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Event Id",
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event Not Found",
      });
    }

    if (!event.vendorId.equals(id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const eventStatus = event.isActive;
    event.isActive = !eventStatus;

    await event.save();

    return res.status(200).json({
      success: true,
      message: `Event  ${eventStatus ? "Deactivated" : "Activated"} Successfully`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};
const getMyEvents = async (req, res) => {
  const id = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  try {
    const skip = (Number(page) - 1) * Number(limit);

    const events = await Event.find({ vendorId: id })
      .skip(skip)
      .limit(Number(limit));

    const totalEvents = await Event.countDocuments({ vendorId: id });

    return res.status(200).json({
      success: true,
      currentPage: page,
      totalPage: Math.ceil(totalEvents / limit),
      totalEvents,
      events,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};
module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  changeEventStatus,
  getMyEvents,
};
