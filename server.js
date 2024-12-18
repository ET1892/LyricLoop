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

// Signup page
app.get("/signup", (req, res) => {
    res.render("signup");
});

// Login page
app.get("/login", (req, res) => {
    res.render("login");
});

// Render the charts page
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

// Render the search page
app.get("/search", (req, res) => {
    res.render("search");
});

// Get the search results from Genius
app.post("/search", async (req, res) => {
    const searchQuery = encodeURIComponent(req.body.search_query);

    console.log(`Search: ${searchQuery}`);

    res.redirect(`/results?search=${searchQuery}`);
});

// Render the results page, with the encoded search query in the URL
app.get("/results", async (req, res) => {
    const searchQuery = req.query.search;
    const results = await api.getInfoFromGenius(searchQuery);

    console.log("Finished getting search results");

    res.render("results", { results, searchQuery });
});

// Render the lyrics page
app.get("/lyrics", async (req, res) => {
    let { artist, title } = req.query;

    artist = artist.toLowerCase().replace(/\s+/g, "-");
    title = title.toLowerCase().replace(/\s+/g, "-");

    res.redirect(`/${artist}-${title}-lyrics`);
});

// e.g. http://localhost:3000/kendrick-lamar-squabble-up-lyrics
app.get("/:artist-:title-lyrics", async (req, res) => {
    const { artist, title } = req.params;

    try {
        // const searchQuery = `${title.replace(/-/g, " ")} ${artist.replace(/-/g, " ")}`;
        const searchQuery = `${artist} ${title}`;
        const geniusInfo = await api.getInfoFromGenius(searchQuery);

        const song = geniusInfo[0];
        const lyrics = await api.getLyricsFromGenius(song.lyricsPath);
        const youtubeVideo = await song.youtubeVideo();

        const data = {
            "title": song.title,
            "artist": song.artist,
            "lyrics": lyrics,
            "image": song.image,
            "releaseDate": song.releaseDate,
            "youtubeVideo": youtubeVideo,
        };

        res.render("lyrics", { data });
    } catch (err) {
        console.error(`Error fetching lyrics for ${artist} – ${title}: ${err}`);
        res.status(500).send(`Error loading lyrics page for ${artist} – ${title}.`);
    }
});

// Render the artist page
app.get("/artist/:artistName", async (req, res) => {
    try {
        let artistName = req.params.artistName;

        artistName = artistName.replace(/-/g, " ");

        const artistInfo = await api.getArtistInfo(artistName);

        res.render("artist", { artistInfo });
    } catch (err) {
        console.error(`Error fetching artist page: ${err}`);
        res.status(500).send(`Error loading artist page for ${artistName}`);
    }
});

// Render the homepage (featured artists)
app.get("/", async (req, res) => {
    const featuredData = await api.getFeaturedArtists();

    if (featuredData) {
        res.render("index", { featuredData });
    } else {
        res.status(500).send("Error loading featured page.");
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
