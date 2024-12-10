require("dotenv").config();

const axios = require("axios");
const cheerio = require("cheerio");

// Get artist info from Last.fm and image from Genius
// TODO try and get all info from one API instead?
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

        let geniusImage = "";

        for (const hit of hits) {
            if (
                hit.result.primary_artist &&
                hit.result.primary_artist.name.toLowerCase() === artistName.toLowerCase()
            ) {
                geniusImage = hit.result.primary_artist.image_url;
                break;
            }
        }

        return {
            name: artistInfo.name,
            bio: artistInfo.bio.summary.replace(/<a.*?>.*?<\/a>/g, ""),
            similarArtists: artistInfo.similar.artist.map((a) => a.name).join(", "),
            image: geniusImage,
        };
    } catch (err) {
        console.error(`Error fetching artist info: ${err.message}`);

        return {
            name: artistName,
            bio: "Biography not available.",
            similarArtists: "No similar artists found.",
            image: "/path/to/default-image.png",
        };
    }
}

// Search tracks on Last.fm
async function searchLastFmTracks(query) {
    let url = `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}`;
    url += `&api_key=${process.env.LAST_FM_API_KEY}&format=json&limit=10`;

    try {
        const response = await axios.get(url);
        const tracks = response.data.results.trackmatches.track;

        tracks.forEach((track) => {
            console.log(`Track: "${track.name}" by ${track.artist}`);
        });

        return tracks.map((track) => ({
            name: track.name,
            artist: track.artist,
            // url: track.url,
        }));
    } catch (err) {
        console.error(`Error fetching data from Last.fm: ${err.message}`);
        return [];
    }
}

// TODO Remove the YouTube API and get this from the Genius one instead
async function getYouTubeVideo(track, artist) {
    const searchQuery = `${track} ${artist}`;

    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1`;
    url += `&q=${encodeURIComponent(searchQuery)}&key=${process.env.YOUTUBE_API_KEY}`;

    try {
        const response = await axios.get(url);
        const items = response.data.items;

        if (items.length > 0) {
            console.log(`YouTube: found video for ${artist} - ${track}`);

            return `https://www.youtube.com/embed/${items[0].id.videoId}`;
        }

        console.log(`YouTube: no video for ${artist} - ${track}`);
        return null;
    } catch (err) {
        console.error(`Error fetching YouTube video: ${err.message}`);
        return null;
    }
}

// function cleanLyrics(lyrics) {
//     // Add a space before uppercase letters that follow a lowercase letter or a
//     // punctuation mark
//     return lyrics
//         .replace(/([a-z])([A-Z])/g, "$1 $2")
//         .replace(/([.,!?])([A-Za-z])/g, "$1 $2");
// }

// Scrape the lyrics from Genius (since they're not in the API for some reason)
async function getLyricsFromGenius(songName, artistName) {
    // TODO encode this
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
                const lyricsUrl = `https://genius.com${result.path}`;
                const lyricsPage = await axios.get(lyricsUrl);
                const $ = cheerio.load(lyricsPage.data);

                // Extract and clean the lyrics
                const lyricsDiv = $(".Lyrics__Container-sc-1ynbvzw-1");

                const rawLyrics = lyricsDiv
                    .map((i, el) => $(el).text().trim()) // Extract text and trim extra spaces
                    .get()
                    .join("\n");

                // return cleanLyrics(rawLyrics);

                console.log(`Genius: Got lyrics for ${result.path}`);

                return rawLyrics
                    .replace(/([a-z])([A-Z])/g, "$1 $2")
                    .replace(/([.,!?])([A-Za-z])/g, "$1 $2");
            }
        }

        return "Lyrics not found.";
    } catch (err) {
        console.error(`Error fetching lyrics from Genius: ${err.message}`);
        return "Error fetching lyrics.";
    }
}

// Get featured artists from Last.fm
async function getFeaturedArtists() {
    const headers = {
        Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}`,
    };

    try {
        let trendingArtistsUrl = `https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists`;
        trendingArtistsUrl += `&api_key=${process.env.LAST_FM_API_KEY}&format=json&limit=10`;

        const artistsResponse = await axios.get(trendingArtistsUrl);
        const artists = artistsResponse.data.artists.artist;

        const featuredData = [];

        for (const artist of artists) {
            console.log(`Last.fm: Artist info for ${artist.name}`);

            // Fetch artist image from Genius
            const geniusSearchUrl = `https://api.genius.com/search?q=${encodeURIComponent(artist.name)}`;
            const geniusResponse = await axios.get(geniusSearchUrl, { headers });
            const hits = geniusResponse.data.response.hits;

            let artistImage = "";

            if (hits.length > 0) {
                artistImage = hits[0].result.primary_artist.image_url;
            }

            if (artistImage !== "") {
                console.log(`Genius: Featured image for ${artist.name}`);
            }

            featuredData.push({
                name: artist.name,
                details: `${Number(artist.listeners).toLocaleString()} listeners`,
                image: artistImage,
            });
        }

        console.log("Finished getting featured data");

        return featuredData;
    } catch (err) {
        console.error(`Error fetching featured artists: ${err.message}`);
        return [];
    }
}

// Get the charts from Last.fm
async function getChartData(limit = 10) {
    let lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=chart.getTopTracks`;
    lastfmUrl += `&api_key=${process.env.LAST_FM_API_KEY}&format=json&limit=${limit}`;

    const headers = {
        Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}`,
    };

    try {
        // Fetch top tracks from Last.fm
        const lastFmResponse = await axios.get(lastfmUrl);
        const tracks = lastFmResponse.data.tracks.track;

        console.log("Last.fm: Got chart data");

        const chartData = [];

        for (const track of tracks) {
            const artistName = track.artist.name;

            // Fetch artist image from Genius
            const geniusSearchUrl = `https://api.genius.com/search?q=${encodeURIComponent(artistName)}`;
            const geniusResponse = await axios.get(geniusSearchUrl, { headers });
            const hits = geniusResponse.data.response.hits;

            let artistImage = "";

            for (const hit of hits) {
                if (
                    hit.result.primary_artist &&
                    hit.result.primary_artist.name.toLowerCase() === artistName.toLowerCase()
                ) {
                    artistImage = hit.result.primary_artist.image_url;
                    break;
                }
            }

            if (artistImage !== "") {
                console.log(`Genius: Got chart artist image for ${artistName}`);
            }

            // Add track details to the chart data
            chartData.push({
                track: track.name,
                artist: artistName,
                listeners: Number(track.listeners).toLocaleString(),
                image: artistImage,
            });
        }
        console.log("Finished getting charts data");

        return chartData;
    } catch (err) {
        console.error(`Error fetching chart data: ${err.message}`);
        return [];
    }
}

module.exports = {
    getArtistInfo,
    getChartData,
    getFeaturedArtists,
    getLyricsFromGenius,
    getYouTubeVideo,
    searchLastFmTracks,
};
