const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20");
const User = require("../models/User");
const dotenv = require("dotenv");

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/api/auth/google/callback",
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
