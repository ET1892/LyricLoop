require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");

const authRoutes = require("./auth");

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
app.use("/", authRoutes);
app.use(express.static("public"));

// Set EJS as the view engine
app.set("view engine", "ejs");

// Middleware to parse POST request data
app.use(express.urlencoded({ extended: true }));

function cleanLyrics(lyrics) {
    // Add a space before uppercase letters that follow a lowercase letter or a
    // punctuation mark
    return lyrics
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/([.,!?])([A-Za-z])/g, "$1 $2");
}

async function getArtistInfo(artistName) {
    const GENIUS_SEARCH_URL = `https://api.genius.com/search?q=${encodeURIComponent(artistName)}`;

    let lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}`
    lastfmUrl += `&api_key=${process.env.LAST_FM_API_KEY}&format=json`;

    const headers = {
        Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}`,
    };

    try {
        // Fetch artist info from Last.fm
        const lastFmResponse = await axios.get(lastfmUrl);
        const artistInfo = lastFmResponse.data.artist;

        // Fetch artist image from Genius
        const geniusResponse = await axios.get(GENIUS_SEARCH_URL, { headers });
        const hits = geniusResponse.data.response.hits;

        // TODO change this?
        let geniusImage = "/path/to/default-image.png";

        for (const hit of hits) {
            if (
                hit.result.primary_artist &&
                hit.result.primary_artist.name.toLowerCase() === artistName.toLowerCase()
            ) {
                geniusImage = hit.result.primary_artist.image_url || geniusImage;
                break;
            }
        }

        return {
            name: artistInfo.name,
            bio: artistInfo.bio.summary.replace(/<a.*?>.*?<\/a>/g, ""),
            similarArtists: artistInfo.similar.artist.map((a) => a.name).join(", "),
            image: geniusImage,
        };
    } catch (error) {
        console.error("Error fetching artist info:", error.message);

        return {
            name: artistName,
            bio: "Biography not available.",
            similarArtists: "No similar artists found.",
            image: "/path/to/default-image.png",
        };
    }
}

// Function to search tracks on Last.fm
async function searchLastFmTracks(query) {
    let url = `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}`;
    url += `&api_key=${process.env.LAST_FM_API_KEY}&format=json&limit=10`;

    try {
        const response = await axios.get(url);
        const tracks = response.data.results.trackmatches.track;

        return tracks.map((track) => ({
            name: track.name,
            artist: track.artist,
            url: track.url,
        }));
    } catch (error) {
        console.error(`Error fetching data from Last.fm: ${error.message}`);
        return [];
    }
}

// TODO This is part of the Genius API lol
async function getYouTubeVideo(track, artist) {
    const searchQuery = `${track} ${artist}`;

    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1`;
    url += `&q=${encodeURIComponent(searchQuery)}&key=${process.env.YOUTUBE_API_KEY}`;

    try {
        const response = await axios.get(url);
        const items = response.data.items;

        if (items.length > 0) {
            return `https://www.youtube.com/embed/${items[0].id.videoId}`;
        }

        return null;
    } catch (error) {
        console.error(`Error fetching YouTube video: ${error.message}`);
        return null;
    }
}

// Function to get lyrics from Genius
async function getLyricsFromGenius(songName, artistName) {
    const searchUrl = `https://api.genius.com/search?q=${songName} ${artistName}`;

    const headers = {
        Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}`,
    };

    try {
        const response = await axios.get(searchUrl, { headers });
        const hits = response.data.response.hits;

        for (const hit of hits) {
            const result = hit.result;

            if (artistName.toLowerCase() === result.primary_artist.name.toLowerCase()) {
                const path = result.path;
                const lyricsUrl = `https://genius.com${path}`;
                const lyricsPage = await axios.get(lyricsUrl);
                const $ = cheerio.load(lyricsPage.data);

                // Extract and clean the lyrics
                const lyricsDiv = $(".Lyrics__Container-sc-1ynbvzw-1");

                const rawLyrics = lyricsDiv
                    .map((i, el) => $(el).text().trim()) // Extract text and trim extra spaces
                    .get()
                    .join("\n");

                return cleanLyrics(rawLyrics) || "Lyrics not found.";
            }
        }
        return "Lyrics not found for this song and artist.";
    } catch (error) {
        console.error(`Error fetching lyrics from Genius: ${error.message}`);
        return "Error fetching lyrics.";
    }
}

async function getChartData(limit = 10) {
    // Chart data from Last.fm
    let lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=chart.getTopTracks`;
    lastfmUrl += `&api_key=${process.env.LAST_FM_API_KEY}&format=json&limit=${limit}`;

    const headers = {
        Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}`,
    };

    try {
        // Fetch top tracks from Last.fm
        const lastFmResponse = await axios.get(lastfmUrl);
        const tracks = lastFmResponse.data.tracks.track;

        const chartData = [];

        for (const track of tracks) {
            const artistName = track.artist.name;

            // Fetch artist image from Genius
            const geniusSearchUrl = `https://api.genius.com/search?q=${encodeURIComponent(artistName)}`;
            const geniusResponse = await axios.get(geniusSearchUrl, { headers });
            const hits = geniusResponse.data.response.hits;

            // TODO do something about this?
            let artistImage = "/path/to/default-image.png";

            for (const hit of hits) {
                if (
                    hit.result.primary_artist &&
                    hit.result.primary_artist.name.toLowerCase() === artistName.toLowerCase()
                ) {
                    artistImage = hit.result.primary_artist.image_url || artistImage;
                    break;
                }
            }

            // Add track details to the chart data
            chartData.push({
                track: track.name,
                artist: artistName,
                listeners: track.listeners,
                image: artistImage,
            });
        }

        return chartData;
    } catch (error) {
        console.error(`Error fetching chart data: ${error.message}`);
        return [];
    }
}

// Home page
app.get("/", (req, res) => {
    res.render("index");
});

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
        const chartData = await getChartData();
        res.render("charts", { chartData });
    } catch (error) {
        console.error("Error rendering charts page:", error.message);
        res.status(500).send("Error loading charts page.");
    }
});

// Route for handling signup (POST)
app.post("/signup", async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    try {
        console.log(`New user: ${firstName} ${lastName}, Email: ${email}`);
        res.redirect("/");
    } catch (error) {
        console.error("Error during signup:", error.message);
        res.status(500).send("Error during signup");
    }
});

// Route for handling login (POST)
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        if (email === "test@example.com" && password === "password") {
            console.log("User logged in:", email);
            res.redirect("/");
        } else {
            res.status(400).send("Invalid email or password");
        }
    } catch (error) {
        console.error("Error during login:", error.message);
        res.status(500).send("Error during login");
    }
});

// Route for the search page (GET)
app.get("/search", (req, res) => {
    res.render("index");
});

// Route for handling search (POST)
app.post("/search", async (req, res) => {
    const searchQuery = req.body.search_query;
    const tracks = await searchLastFmTracks(searchQuery); // Fetch Last.fm tracks
    const results = [];

    for (const track of tracks) {
        // Fetch artist info
        const artistInfo = await getArtistInfo(track.artist);

        // Fetch lyrics
        const lyrics = await getLyricsFromGenius(track.name, track.artist);

        // Fetch YouTube video URL
        const youtubeVideo = await getYouTubeVideo(track.name, track.artist);

        results.push({
            track: track.name,
            artist: track.artist,
            url: track.url, // Last.fm track URL
            lyrics,
            artistInfo,
            youtubeVideo, // YouTube video URL
        });
    }

    res.render("results", { results });
});

app.get("/featured", async (req, res) => {
    const headers = {
        Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}`,
    };

    try {
        // Fetch trending artists from Last.fm
        let trendingArtistsUrl = `https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists`;
        trendingArtistsUrl += `&api_key=${process.env.LAST_FM_API_KEY}&format=json&limit=10`;

        const artistsResponse = await axios.get(trendingArtistsUrl);
        const artists = artistsResponse.data.artists.artist;

        const featuredData = [];

        for (const artist of artists) {
            // Fetch artist image from Genius
            const geniusSearchUrl = `https://api.genius.com/search?q=${encodeURIComponent(artist.name)}`;
            const geniusResponse = await axios.get(geniusSearchUrl, { headers });
            const hits = geniusResponse.data.response.hits;

            // TODO
            let artistImage = "/path/to/placeholder-image.jpg";

            if (hits.length > 0) {
                artistImage = hits[0].result.primary_artist.image_url || artistImage;
            }

            featuredData.push({
                name: artist.name,
                details: `${artist.listeners} listeners`,
                image: artistImage,
            });
        }

        res.render("featured", { featuredData });
    } catch (error) {
        console.error(`Error fetching featured data: ${error.message}`);
        res.status(500).send("Error loading featured page.");
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})
