const { default: mongoose } = require("mongoose");
const Hotel = require("../models/Hotel");
const User = require("../models/User");
const createHotel = async (req, res) => {
  const id = req.user.id;

  try {
    const user = await User.findById(id);

    const {
      name,
      description,
      location,
      photos,
      amenities,
      pricePerNight,
      totalRooms,
      isFeatured,
      starRating,
    } = req.body;

    if (user.vendorStatus !== "approved")
      return res.status(400).json({
        success: false,
        message: "You currently not approved to post the hotel",
      });
    const stringFields = [name, description];

    const arrayFields = [amenities];

    const numberFields = [pricePerNight, totalRooms];
    const hasEmptyStrings = stringFields.some((field) => !field?.trim());

    const hasEmptyArrays = arrayFields.some((field) => !field?.length);

    const hasEmptyNumbers = numberFields.some(
      (field) => field === undefined || field === null,
    );

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
    if (
      hasEmptyStrings ||
      hasEmptyArrays ||
      hasEmptyNumbers ||
      !validateLocation()
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are mandatory",
      });
    }

    const hotel = await Hotel.create({
      vendorId: id,
      name,
      description,
      location,
      photos,
      amenities,
      pricePerNight,
      totalRooms,
      availableRooms: totalRooms,
      isFeatured,
      starRating,
    });
    return res.status(201).json({ success: true, hotel });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const getAllHotels = async (req, res) => {
  try {
    const {
      city,
      minPrice,
      maxPrice,
      amenities,
      starRating,
      page = 1,
      limit = 6,
    } = req.query;

    // Only show hotels that currently have rooms free. A fully booked hotel
    // (availableRooms 0) drops out of the public listing automatically and
    // reappears the moment a cancellation or checkout frees a room again —
    // availableRooms is already kept in sync by the booking/cancel flow.
    let filter = { isActive: true, availableRooms: { $gt: 0 } };

    if (city) {
      filter["location.city"] = {
        $regex: `^${city}`,
        $options: "i",
      };
    }
    if (minPrice || maxPrice) {
      filter.pricePerNight = {};
      if (minPrice) {
        filter.pricePerNight.$gte = Number(minPrice);
      }
      if (maxPrice) {
        filter.pricePerNight.$lte = Number(maxPrice);
      }
    }
    if (amenities) {
      const amenitiesArray = amenities.split(",");
      filter.amenities = {
        $all: amenitiesArray,
      };
    }
    if (starRating) {
      filter.starRating = Number(starRating);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const hotels = await Hotel.find(filter).skip(skip).limit(Number(limit));

    const totalHotels = await Hotel.countDocuments(filter);

    return res.status(200).json({
      success: true,
      currentPage: page,
      totalPage: Math.ceil(totalHotels / limit),
      totalHotels,
      hotels,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const getHotelById = async (req, res) => {
  const id = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Hotel Id" });
    }

    const hotel = await Hotel.findById(id).populate("vendorId", "name email");
    if (!hotel) {
      return res
        .status(404)
        .json({ success: false, message: "No Hotel find with this id" });
    }
    return res.status(200).json({ success: true, hotel });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const updateHotel = async (req, res) => {
  const id = req.user.id;
  const hotelId = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Hotel Id" });
    }
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found ",
      });
    }

    if (!hotel.vendorId.equals(id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }
    const allowedFields = [
      "name",
      "description",
      "location",
      "amenities",
      "pricePerNight",
      "totalRooms",
      "starRating",
      "photos",
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "location") {
          hotel.location = {
            ...hotel.location.toObject(),
            ...req.body.location,
          };
        } else {
          hotel[field] = req.body[field];
        }
      }
    });
    await hotel.save();
    return res.status(200).json({ success: true, hotel });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const deleteHotel = async (req, res) => {
  const id = req.user.id;
  const hotelId = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid hotel Id" });
    }
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res
        .status(404)
        .json({ success: false, message: "Hotel not found" });
    }
    if (!hotel.vendorId.equals(id)) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }
    await hotel.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Hotel Successfully permanently deleted ",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const changeHotelStatus = async (req, res) => {
  const id = req.user.id;
  const hotelId = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid hotel Id" });
    }
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res
        .status(404)
        .json({ success: false, message: "Hotel not found" });
    }
    if (!hotel.vendorId.equals(id)) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }
    const hotelStatus = hotel.isActive;
    hotel.isActive = !hotelStatus;
    await hotel.save();

    return res.status(200).json({
      success: true,
      message: `Hotel  ${hotelStatus === false ? "Activated" : "Deactivated"}  Successfully`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};
const getMyHotels = async (req, res) => {
  const id = req.user.id;
  const { page = 1, limit = 10 } = req.query;
  try {
    const skip = (Number(page) - 1) * Number(limit);
    const hotels = await Hotel.find({ vendorId: id })
      .skip(skip)
      .limit(Number(limit));

    const totalHotels = await Hotel.countDocuments({ vendorId: id });

    return res.status(200).json({
      success: true,
      currentPage: page,
      totalPage: Math.ceil(totalHotels / limit),
      totalHotels,
      hotels,
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
  createHotel,
  getAllHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
  changeHotelStatus,
  getMyHotels,
};
