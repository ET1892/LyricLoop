require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const authRoutes = require("./auth");
const api = require("./api");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("public"));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error(`Error connecting to MongoDB: ${err}`));

// Routes
// app.use("/", authRoutes);
app.use(express.static("public"));

// Set EJS as the view engine
app.set("view engine", "ejs");

// Middleware to parse POST request data
app.use(express.urlencoded({ extended: true }));

// // Home page (featured artists)
// app.get("/", (req, res) => {
//     res.render("index");
// });

// Signup page
app.get("/signup", (req, res) => {
    res.render("signup");
});

// Login page
app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/charts", async (req, res) => {
    try {
        const chartData = await api.getChartData();
        res.render("charts", { chartData });
    } catch (err) {
        console.error(`Error rendering charts page: ${err.message}`);
        res.status(500).send("Error loading charts page.");
    }
});

// Route for handling signup (POST)
app.post("/signup", async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    try {
        console.log(`New user: ${firstName} ${lastName}, Email: ${email}`);
        res.redirect("/");
    } catch (err) {
        console.error(`Error during signup: ${err.message}`);
        res.status(500).send("Error during signup");
    }
});

// Route for handling login (POST)
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        if (email === "test@example.com" && password === "password") {
            console.log(`User logged in: ${email}`);
            res.redirect("/");
        } else {
            res.status(400).send("Invalid email or password");
        }
    } catch (err) {
        console.error(`Error during login: ${err.message}`);
        res.status(500).send("Error during login");
    }
});

// Route for the search page (GET)
app.get("/search", (req, res) => {
    res.render("search");
});

// Route for handling search (POST)
app.post("/search", async (req, res) => {
    const searchQuery = req.body.search_query;
    const tracks = await api.searchLastFmTracks(searchQuery); // Fetch Last.fm tracks
    const results = [];

    for (const track of tracks) {
        // Fetch artist info
        const artistInfo = await api.getArtistInfo(track.artist);

        // Fetch lyrics
        const lyrics = await api.getLyricsFromGenius(track.name, track.artist);

        // // Fetch YouTube video URL
        // const youtubeVideo = await api.getYouTubeVideo(track.name, track.artist);

        results.push({
            track: track.name,
            artist: track.artist,
            // url: track.url, // Last.fm track URL
            lyrics,
            artistInfo,
            // youtubeVideo, // YouTube video URL
        });
    }

    console.log("Finished getting lyrics from Genius");

    res.render("results", { results });
});

app.get("/", async (req, res) => {
    const featuredData = await api.getFeaturedArtists();

    if (featuredData.length > 0) {
        res.render("index", { featuredData });
    } else {
        res.status(500).send("Error loading featured page.");
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
