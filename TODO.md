# 🚧 TODO

## 🌟 features

- `localhost:3000/artist/{artist-name}/`

- Charts page is buggy, since the songs come from Last.fm but the lyrics etc.
come from Genius
    - e.g. "tv off" by Kendrick Lamar on the charts redirects to a Turkish
    translation, not the original song. Searching for it works as intended.

- Prevent requests for duplicate images in charts and results
    - e.g. if Kendrick Lamar has more than one song in the charts, only
    download the image of him once and reuse it for the other song(s)?

- Make similar artists clickable and have their own page
- Download smaller images?

- Add a 404 page?

- Add password reset option
- Add "incorrect password" JS to login page?

## 🎨 style

- CSS: Fix input box width on login pages

## 🔀 misc

- Add a README
- Reorganise everything into `backend/` and `frontend/`
- Make the error messages say which API they're coming from, because I spent
about an hour debugging what I thought was a bug with the Last.fm API that was
actually from the Genius one 🙃
