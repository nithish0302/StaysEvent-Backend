// Centralized error handling middleware.
// notFound: catches any request that didn't match a route.
// errorHandler: catches errors passed via next(err) or thrown in async
// handlers (Express 5 auto-forwards rejected promises to this).

const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found — ${req.method} ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  // Mongoose bad ObjectId
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || "Internal Server Error";

  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `Duplicate value for ${field}` : "Duplicate value";
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  console.error(`[error] ${req.method} ${req.originalUrl} —`, err.message);

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
