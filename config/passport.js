const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20");
const User = require("../models/User");
const dotenv = require("dotenv");

dotenv.config();

// passport-google-oauth20 throws synchronously at construction time if
// clientID/clientSecret are missing — which used to crash the entire app at
// require() time (including every Jest test file, since they all pull in
// app.js) whenever those env vars weren't set. That's the normal case in
// CI and for anyone running this project without Google OAuth configured,
// so the strategy is only registered when both are actually present. If
// it's skipped, GOOGLE_STRATEGY_REGISTERED stays false and the /google
// auth routes return a clear error instead of Passport's cryptic "Unknown
// authentication strategy" — see routes/authRoutes.js.
const googleOAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

if (googleOAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // Was hardcoded to localhost:5000 — that only ever worked in local
        // dev. In production this must point at the deployed backend's own
        // public URL, and that exact URL also has to be registered as an
        // authorized redirect URI in the Google Cloud Console for this
        // OAuth client, or Google will reject the login attempt outright.
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          "http://localhost:5000/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const avatar = profile.photos[0].value;

        const user = await User.findOne({ googleId });

        if (user) {
          return done(null, user);
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
          existingUser.googleId = googleId;
          existingUser.avatar = avatar;
          await existingUser.save();
          existingUser.isNewUser = false;
          return done(null, existingUser);
        }

        const newUser = await User.create({
          name,
          email,
          googleId,
          avatar,
        });
        newUser.isNewUser = true;

        return done(null, newUser);
      } catch (err) {
        console.error(`Error Occurred ${err.message}`);
          return done(err, null);
        }
      },
    ),
  );
} else {
  console.warn(
    "⚠️  GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not set — Google OAuth login is disabled.",
  );
}

module.exports = { googleOAuthConfigured };
