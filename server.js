process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const MONGO_URI = 'mongodb+srv://ciara03:zjNioxrx3AC7LzxV@cluster0.nfjml.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const PORT = 3000;
const mongoose = require('mongoose');
const authRoutes = require('./auth'); 

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Routes
app.use('/', authRoutes);


app.use(express.static('public'));

// Disable SSL verification for Spotify API requests
const agent = new https.Agent({
  rejectUnauthorized: false, // Disables SSL certificate verification
});

// Genius API Token
const GENIUS_ACCESS_TOKEN = 'Fx7g281iqxlMV0fZoicMsHEbuslwIx7DilhUR4IsukTttMALi_QAAPq2cL44BSRd';
const LAST_FM_API_KEY = 'a8567be2f970e353343008b43db2fa9f'; 
// Set EJS as the view engine
app.set('view engine', 'ejs');

// Middleware to parse POST request data
app.use(express.urlencoded({ extended: true }));

function cleanLyrics(lyrics) {
  // Add a space before uppercase letters that follow a lowercase letter or a punctuation mark
  return lyrics.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([.,!?])([A-Za-z])/g, '$1 $2');
}

async function getArtistInfo(artistName) {
  const LAST_FM_API_KEY = 'a8567be2f970e353343008b43db2fa9f'; 
  const GENIUS_SEARCH_URL = `https://api.genius.com/search?q=${encodeURIComponent(artistName)}`;
  const LAST_FM_URL = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${LAST_FM_API_KEY}&format=json`;

  const headers = {
    Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}`,
  };

  try {
    // Fetch artist info from Last.fm
    const lastFmResponse = await axios.get(LAST_FM_URL);
    const artistInfo = lastFmResponse.data.artist;

    // Fetch artist image from Genius
    const geniusResponse = await axios.get(GENIUS_SEARCH_URL, { headers });
    const hits = geniusResponse.data.response.hits;

    let geniusImage = '/path/to/default-image.png';
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
      bio: artistInfo.bio.summary.replace(/<a.*?>.*?<\/a>/g, ''),
      similarArtists: artistInfo.similar.artist.map((a) => a.name).join(', '),
      image: geniusImage,
    };
  } catch (error) {
    console.error('Error fetching artist info:', error.message);
    return {
      name: artistName,
      bio: 'Biography not available.',
      similarArtists: 'No similar artists found.',
      image: '/path/to/default-image.png',
    };
  }
}

// Function to search tracks on Spotify
async function searchLastFmTracks(query) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${LAST_FM_API_KEY}&format=json&limit=10`;

  try {
    const response = await axios.get(url);
    const tracks = response.data.results.trackmatches.track;

    return tracks.map((track) => ({
      name: track.name,
      artist: track.artist,
      url: track.url, // Last.fm track URL
    }));
  } catch (error) {
    console.error('Error fetching data from Last.fm:', error.message);
    return [];
  }
}

async function getYouTubeVideo(track, artist) {
  const API_KEY = 'AIzaSyBd4awjwxwHDaWfQWr5CFTTPdqKHuzTB4Y';
  const searchQuery = `${track} ${artist}`;
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(searchQuery)}&key=${API_KEY}`;

  try {
    const response = await axios.get(url);
    const items = response.data.items;

    if (items.length > 0) {
      return `https://www.youtube.com/embed/${items[0].id.videoId}`;
    } else {
      return null; // No video found
    }
  } catch (error) {
    console.error('Error fetching YouTube video:', error.message);
    return null; // Return null if there's an error
  }
}


// Function to get lyrics from Genius
async function getLyricsFromGenius(songName, artistName) {
  const searchUrl = `https://api.genius.com/search?q=${songName} ${artistName}`;
  const headers = {
    Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}`,
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
        const lyricsDiv = $('.Lyrics__Container-sc-1ynbvzw-1');
        const rawLyrics = lyricsDiv
          .map((i, el) => $(el).text().trim()) // Extract text and trim extra spaces
          .get()
          .join('\n'); // Join lines with newline

        return cleanLyrics(rawLyrics) || 'Lyrics not found.';
      }
    }
    return 'Lyrics not found for this song and artist.';
  } catch (error) {
    console.error('Error fetching lyrics from Genius:', error.message);
    return 'Error fetching lyrics.';
  }
}

async function getChartData(limit = 10) {
  const LAST_FM_API_KEY = 'a8567be2f970e353343008b43db2fa9f'; // Replace with your actual Last.fm API key
  const GENIUS_ACCESS_TOKEN = 'Fx7g281iqxlMV0fZoicMsHEbuslwIx7DilhUR4IsukTttMALi_QAAPq2cL44BSRd'; // Replace with your Genius token
  const LAST_FM_URL = `https://ws.audioscrobbler.com/2.0/?method=chart.getTopTracks&api_key=${LAST_FM_API_KEY}&format=json&limit=${limit}`;

  const headers = {
    Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}`,
  };

  try {
    // Fetch top tracks from Last.fm
    const lastFmResponse = await axios.get(LAST_FM_URL);
    const tracks = lastFmResponse.data.tracks.track;

    const chartData = [];

    for (const track of tracks) {
      const artistName = track.artist.name;

      // Fetch artist image from Genius
      const geniusSearchUrl = `https://api.genius.com/search?q=${encodeURIComponent(artistName)}`;
      const geniusResponse = await axios.get(geniusSearchUrl, { headers });
      const hits = geniusResponse.data.response.hits;

      let artistImage = '/path/to/default-image.png'; // Default fallback image
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
    console.error('Error fetching chart data:', error.message);
    return [];
  }
}



// Route for the home page (GET)
app.get('/', (req, res) => {
  res.render('index'); // Render 'index.ejs'
});

// Route for the sign-up page (GET)
app.get('/signup', (req, res) => {
  res.render('signup'); // Render 'signup.ejs'
});

// Route for the login page (GET)
app.get('/login', (req, res) => {
  res.render('login'); // Render 'login.ejs'
});

app.get('/charts', async (req, res) => {
  try {
    const chartData = await getChartData(); // Fetch top tracks and artist images
    res.render('charts', { chartData }); // Render the EJS template with data
  } catch (error) {
    console.error('Error rendering charts page:', error.message);
    res.status(500).send('Error loading charts page.');
  }
});

// Route for handling sign-up (POST)
app.post('/signup', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  try {
    console.log(`New user: ${firstName} ${lastName}, Email: ${email}`);
    res.redirect('/'); // Redirect to search page upon successful sign-up
  } catch (error) {
    console.error('Error during sign-up:', error.message);
    res.status(500).send('Error during sign-up');
  }
});

// Route for handling login (POST)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (email === 'test@example.com' && password === 'password') {
      console.log('User logged in:', email);
      res.redirect('/search'); // Redirect to search page upon successful login
    } else {
      res.status(400).send('Invalid email or password');
    }
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).send('Error during login');
  }
});

// Route for the search page (GET)
app.get('/search', (req, res) => {
  res.render('index'); // Render 'search.ejs'
});

// Route for handling search (POST)
app.post('/search', async (req, res) => {
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
      youtubeVideo, // Include YouTube video URL
    });
  }

  res.render('results', { results }); // Render 'results.ejs' with data
});


app.get('/featured', async (req, res) => {
  const LAST_FM_API_KEY = 'a8567be2f970e353343008b43db2fa9f'; // Replace with your Last.fm API key
  const GENIUS_ACCESS_TOKEN = 'Fx7g281iqxlMV0fZoicMsHEbuslwIx7DilhUR4IsukTttMALi_QAAPq2cL44BSRd'; // Replace with your Genius token
  const headers = { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` };

  try {
    // Fetch trending artists from Last.fm
    const trendingArtistsUrl = `https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=${LAST_FM_API_KEY}&format=json&limit=5`;
    const artistsResponse = await axios.get(trendingArtistsUrl);
    const artists = artistsResponse.data.artists.artist;

    const featuredData = [];

    for (const artist of artists) {
      // Fetch artist image from Genius
      const geniusSearchUrl = `https://api.genius.com/search?q=${encodeURIComponent(artist.name)}`;
      const geniusResponse = await axios.get(geniusSearchUrl, { headers });
      const hits = geniusResponse.data.response.hits;

      let artistImage = '/path/to/placeholder-image.jpg'; // Default image
      if (hits.length > 0) {
        artistImage = hits[0].result.primary_artist.image_url || artistImage;
      }

      featuredData.push({
        name: artist.name,
        details: `${artist.listeners} listeners`,
        image: artistImage,
      });
    }

    // Send data to the EJS template
    res.render('featured', { featuredData });
  } catch (error) {
    console.error('Error fetching featured data:', error.message);
    res.status(500).send('Error loading featured page.');
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
})
