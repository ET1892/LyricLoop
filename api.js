require("dotenv").config();

const axios = require("axios");
const cheerio = require("cheerio");

// Get song and artist info from Genius
async function getInfoFromGenius(searchQuery) {
    const geniusSearchUrl = `https://api.genius.com/search?q=${encodeURIComponent(searchQuery)}`;

    const headers = {
        Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}`,
    };

    const results = [];

    try {
        const geniusResponse = await axios.get(geniusSearchUrl, { headers });
        const hits = geniusResponse.data.response.hits;

        for (const hit of hits) {
            results.push({
                "title": hit.result.title,
                "artist": hit.result.primary_artist.name,
                "image": hit.result.header_image_url,
                "id": hit.result.id,
                "lyricsPath": hit.result.path,

                "artistImage": hit.result.primary_artist.image_url,
                "releaseDate": hit.result.release_date_for_display,

                "youtubeVideo": async () => {
                    console.log("Calling youtubeVideo");

                    // Get the page for the current song, using its ID
                    const songResponse = await axios.get(
                        `https://api.genius.com/songs/${hit.result.id}`,
                        { headers },
                    );

                    const media = songResponse.data.response.song.media;

                    // The "media" array contains objects for YouTube, Spotify,
                    // SoundCloud, etc. If there is a YouTube URL, return it.
                    for (const platform of media) {
                        if (platform.provider === "youtube") {
                            console.log(`Found YouTube video: ${platform.url}`);

                            // Example URL: get the ID at the end
                            // https://www.youtube.com/watch?v=St-mEIhvKOI
                            const splitUrl = platform.url.split("?v=");
                            const videoId = splitUrl[splitUrl.length - 1];

                            return `https://www.youtube-nocookie.com/embed/${videoId}`;
                        }
                    }

                    return "";
                },
            });
        }
    } catch (err) {
        console.error(`Error fetching info from Genius: ${err.message}`);
    }

    return results;
}

// Scrape the lyrics from Genius (since they're not in the API for some reason)
async function getLyricsFromGenius(lyricsPath) {
    const lyricsPage = `https://genius.com${lyricsPath}`;
    console.log(lyricsPage);

    try {
        const response = await axios.get(lyricsPage);
        const $ = cheerio.load(response.data);

        const lyricsDivs = $('[data-lyrics-container="true"]');

        const lyrics = lyricsDivs
            .map((i, el) => {
                return $(el)
                    .html()
                    .replace(/<br\s*\/?>/g, "\n")
                    .replace(/<\/?[^>]+(>|$)/g, "")
                    .trim();
            })
            .get()
            .join("\n\n");

        console.log(`Genius: Got lyrics for ${lyricsPath}`);
        console.log(lyrics);

        return lyrics.replace(/\n/g, "<br>");
    } catch (err) {
        console.error(`Error fetching lyrics from Genius: ${err.message}`);
        return "Error fetching lyrics.";
    }
}

// Get artist info from Last.fm and image from Genius
async function getArtistInfo(artistName) {
    // Get the artist info from Last.fm
    let lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}`;
    lastfmUrl += `&api_key=${process.env.LAST_FM_API_KEY}&format=json`;

    // Get the artist's top 10 songs from Last.fm
    let tracksUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(artistName)}`;
    tracksUrl += `&api_key=${process.env.LAST_FM_API_KEY}&format=json&limit=10`;

    // For getting the artist's image from Genius (because they removed this
    // from the Last.fm API for some reason)
    const geniusSearchUrl = `https://api.genius.com/search?q=${encodeURIComponent(artistName)}`;

    const headers = {
        Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}`,
    };

    try {
        // Get artist info from Last.fm
        const lastFmResponse = await axios.get(lastfmUrl);
        const artistInfo = lastFmResponse.data.artist;

        // Get top 10 songs from Last.fm
        const tracksResponse = await axios.get(tracksUrl);
        const topTracks = tracksResponse.data.toptracks.track;

        // Get artist image from Genius
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

        if (artistImage) {
            console.log(`Genius: Got image for ${artistInfo.name}`);
        } else {
            console.log(`Genius: Couldn't find image for ${artistInfo.name}`);
        }

        return {
            name: artistInfo.name,
            bio: artistInfo.bio.summary.replace(/<a.*?>.*?<\/a>/g, ""),
            similarArtists: artistInfo.similar.artist.map((a) => a.name).join(", "),
            topTracks: topTracks,
            image: artistImage,
        };
    } catch (err) {
        console.error(`Error fetching artist info: ${err.message}`);

        return {
            name: artistName,
            bio: "Biography not available.",
            similarArtists: "No similar artists found.",
            topTracks: [],

            // TODO replace this
            image: "/path/to/default-image.png",
        };
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

            if (artistImage) {
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
async function getChartData() {
    let lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=chart.getTopTracks`;
    lastfmUrl += `&api_key=${process.env.LAST_FM_API_KEY}&format=json&limit=10`;

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
    getInfoFromGenius,
    getLyricsFromGenius,
};
