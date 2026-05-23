const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer")) {
      return res
        .status(401)
        .json({ message: `Header not present or not in the correct format` });
    }
    const token = header.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: `No token found in the header ` });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    console.error(`Error occurred in middleware ${err.message}`);
    return res
      .status(401)
      .json({ message: `Error occurred in middleware ${err.message}` });
  }
};

module.exports = authMiddleware;
