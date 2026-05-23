const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ success: false, message: "Some Fields are missing" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exist " });
    }
    const hashedpassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedpassword,
      role: role || "customer",
    });
    const accessToken = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "20m" },
    );

    const refreshToken = jwt.sign(
      { id: newUser._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    newUser.refreshToken = refreshToken;
    await newUser.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      accessToken,

      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        vendorStatus: newUser.vendorStatus,
      },
    });
  } catch (err) {
    console.error(`Error Occured  ${err.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and Password Needed" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found Please register to continue to the website",
      });
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is not currently active pls mail to active",
      });
    }

    const ispasswordMatch = await bcrypt.compare(password, user.password);

    if (!ispasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Password not match please check the password to login",
      });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "20m" },
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.status(200).json({
      success: true,
      message: "login successful",
      accessToken,

      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        vendorStatus: user.vendorStatus,
      },
    });
  } catch (err) {
    console.error(`Error Occurred while login ${err.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const logout = async (req, res) => {
  try {
    const id = req.user.id;

    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    user.refreshToken = null;

    await user.save();

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    return res
      .status(200)
      .json({ success: true, message: "Logout successfull" });
  } catch (err) {
    console.error(`Error Occurred ${err.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized access" });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (token !== user.refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access ,token not match",
      });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "20m" },
    );
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;
    return res.status(200).json({ success: true, accessToken, user: userObj });
  } catch (err) {
    console.error(`Error Occured ${err.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const getMe = async (req, res) => {
  try {
    const id = req.user.id;
    if (!id) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized access" });
    }

    const user = await User.findById(id).select("-refreshToken -password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: `User not found ` });
    }
    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error(`Error occured in the getMe method ${err.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const googleCallback = async (req, res) => {
  try {
    const user = req.user;

    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "20m",
      },
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );
    user.refreshToken = refreshToken;
    await user.save();
    const isNew = user.isNewUser || false;
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?token=${accessToken}&isNew=${isNew}`,
    );
  } catch (err) {
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
};

const updateRole = async (req, res) => {
  try {
    const id = req.user.id;
    const { role } = req.body;
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    user.role = role;

    await user.save();
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;
    return res.status(200).json({
      success: true,
      message: "User role is updated successfully",
      user: userObj,
    });
  } catch (err) {
    console.error(`Error occurred while updating the role ${err.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal Error Occurred",
      err,
    });
  }
};

const updateVendorDetails = async (req, res) => {
  try {
    const id = req.user.id;
    const {
      businessName,
      businessType,
      gstNumber,
      panNumber,
      businessAddress,
      city,
    } = req.body;

    const fields = [
      "businessName",
      "businessType",
      "gstNumber",
      "panNumber",
      "businessAddress",
      "city",
    ];

    const hasEmptyfields = fields.some((field) => !req.body[field]?.trim());

    if (hasEmptyfields) {
      return res
        .status(400)
        .json({ success: false, message: "All the field are mandatory" });
    }

    // GST Validation
    const gstRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    // PAN Validation
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    const isValidGST = gstRegex.test(gstNumber);
    const isValidPAN = panRegex.test(panNumber);
    if (!isValidGST)
      return res
        .status(400)
        .json({ success: false, message: "Invalid GST Number format" });
    if (!isValidPAN)
      return res
        .status(400)
        .json({ success: false, message: "Invalid PAN Number format" });
    const user = await User.findById(id);
    if (!user) {
      console.log("User not found");
      return res
        .status(404)
        .json({ success: false, message: "User Not found" });
    }
    if (user.role !== "vendor") {
      return res
        .status(400)
        .json({ success: false, message: "Role Not matched" });
    }
    user.vendorDetails = {
      ...user.vendorDetails,
      businessName,
      businessType,
      businessAddress,
      gstNumber,
      panNumber,
      city,
      submittedAt: new Date(),
    };
    user.vendorStatus = "pending";
    await user.save();
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;
    return res.status(200).json({
      success: true,
      message: "Vendor details updated successfully",
      user: userObj,
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
  register,
  login,
  logout,
  refreshToken,
  getMe,
  googleCallback,
  updateRole,
  updateVendorDetails,
};
