# Genius API Notes

These are some quick, crappy notes I took while studying the Genius API,
featuring lots of messy pseudocode.

Each request returns a ton of data, most of which we don't need, so I've written
down the things I think we'll actually use (artist names, song titles, cover art,
release dates, etc.).

## Setup

- `export GENIUS_TOKEN="yourGeniusTokenHere"`

TODO: Use dotenv to load this in JavaScript?

## Example Usage

```
curl https://api.genius.com/songs/371759 \
-H "Authorization: Bearer $GENIUS_TOKEN" | \
python -m json.tool > song.json
```

## Artist

GET

- https://api.genius.com/artists/{id}

```
json.response.artist:
    alternate_names (array)
    image_url
    name (e.g. "Kendrick Lamar")
    url (e.g. "https://genius.com/artists/Kendrick-lamar")

    instagram_name?
```

## Artist Songs

GET

- https://api.genius.com/artists/{id}/songs

By default, songs are sorted by title. To sort by popularity:

- https://api.genius.com/artists/{id}/songs?sort=popularity

```
for data in json.response.songs (array):
    api_path (e.g. "/songs/6764765")
    artist_names
    full_title
    release_date_for_display
    song_art_image_url
    url
```

## Search

GET

- https://api.genius.com/search?q={searchTerm}

json.response.hits is an array

```
for data in hits.result:
    artist_names (e.g. "Burial")
    api_path (e.g. "/songs/106351")
    full_title (e.g. "Archangel by Burial")
    id (the song id in api_path)
    song_art_image_url
    url (e.g. "https://genius.com/Burial-archangel-lyrics")

    release_date_for_display?
```

## Song

GET

- https://api.genius.com/songs/{id}

```
json.response.song:
    artist_names
    full_title
    release_date_for_display
    song_art_image_url
    url

    album:
        api_path (e.g. "/albums/750897")
        cover_art_url
        full_title
        release_date_for_display

    for json in media (array):
        if json.provider === "youtube":
            embed json.url (the music video on youtube)
```
