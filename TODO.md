# 🚧 TODO

## 🌟 features

- Add pages for artist info and song lyrics? e.g.
    - `localhost:3000/artist/{artist-name}/`
    - `localhost:3000/lyrics/{artist-name}-{song-name}/`

- Prevent requests for duplicate images in charts and results
    - e.g. if Kendrick Lamar has more than one song in the charts, only
    download the image of him once and reuse it for the other song(s)

- Make similar artists clickable and have their own page
- Properly format lyrics
- Make images smaller / cropped
- Remove YouTube API integration – get video from Genius API instead?
- Use this? https://github.com/farshed/genius-lyrics-api

- Add password reset option
- Add "incorrect password" JS to login page?

## 🎨 style

- CSS: Fix input box width on login pages
- Add encoded search parameters to /search url?
    - e.g. `localhost:3000/search?q=kendrick+lamar`
- Change the header to a `ul` and wrap it on mobile?

## 🔀 misc

- Reorganise everything into `backend/` and `frontend/`
- Add metadata partial, and pass the page title as an argument?
    - e.g. "Featured" -> `Featured | Lyric Loop`
- Add a favicon?
