import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import User from "../models/userModel.js"; 
import jwt from "jsonwebtoken";
import env from 'dotenv'
import fetch from "node-fetch";

env.config()

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://servybackend.onrender.com/api/auth/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const response = await fetch(
            "https://people.googleapis.com/v1/people/me?personFields=phoneNumbers",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        const data = await response.json();
        const phoneNumber = data.phoneNumbers?.[0]?.value || "9999999999";

        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
            user = await User.create({
                googleId: profile.id,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                email: profile.emails[0].value,
                mobile: phoneNumber,
                password: "google",
                isVerified: true,
            });
        }

        const payload = { id: user._id, email: user.email, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

        return done(null, { user, token });

    } catch (error) {
        return done(error, null);
    }
}));


// passport.serializeUser((user, done) => {
//     done(null, user.id);
// });

// passport.deserializeUser(async (id, done) => {
//     try {
//         const user = await User.findById(id);
//         done(null, user);
//     } catch (error) {
//         done(error, null);
//     }
// });

export default passport;
