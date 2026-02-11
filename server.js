const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);

// 🔐 Step 1 — Redirect user to Google Login
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
  });
  res.redirect(url);
});

// 🔐 Step 2 — Google redirects back here
app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);

  console.log("REFRESH TOKEN:", tokens.refresh_token);

  res.send("Authentication successful! You can close this window.");
});

// 📅 Step 3 — Create Meeting
app.post("/schedule", async (req, res) => {
  try {
    const { email, dateTime } = req.body;

    oauth2Client.setCredentials({
      refresh_token: process.env.REFRESH_TOKEN,
    });

    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const endTime = new Date(
      new Date(dateTime).getTime() + 30 * 60000,
    ).toISOString();

    const event = {
      summary: "Shopify Client Meeting",
      description: "Scheduled via Shopify Bot",
      start: {
        dateTime,
        timeZone: process.env.TIME_ZONE,
      },
      end: {
        dateTime: endTime,
        timeZone: process.env.TIME_ZONE,
      },
      attendees: [{ email }],
      conferenceData: {
        createRequest: {
          requestId: Math.random().toString(36).substring(7),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
    });

    res.json({
      meetLink: response.data.hangoutLink,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/available-slots", async (req, res) => {
  try {
    oauth2Client.setCredentials({
      refresh_token: process.env.REFRESH_TOKEN,
    });

    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const now = new Date();
    const end = new Date();
    end.setDate(now.getDate() + 7); // check next 7 days

    // 1️⃣ Get busy times
    const busyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: end.toISOString(),
        timeZone: process.env.TIME_ZONE,
        items: [{ id: "primary" }],
      },
    });

    const busySlots = busyResponse.data.calendars.primary.busy || [];

    const availableSlots = [];

    // 2️⃣ Define working hours
    for (let d = 1; d <= 7; d++) {
      const date = new Date();
      date.setDate(now.getDate() + d);

      for (let hour = 10; hour < 18; hour++) {
        const start = new Date(date);
        start.setHours(hour, 0, 0, 0);

        const endTime = new Date(start.getTime() + 30 * 60000);

        const isBusy = busySlots.some(
          (busy) =>
            start < new Date(busy.end) && endTime > new Date(busy.start),
        );

        if (!isBusy && start > new Date()) {
          availableSlots.push(start.toISOString());
        }
      }
    }

    res.json(availableSlots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
