# 🛠️ Setup

I forgot to mention a few things in the zip file I uploaded, so here are the
proper setup instructions. Apologies for the confusion.

- Create a Genius access token and Last.fm API key, if you haven't already:
    - https://docs.genius.com/
    - https://www.last.fm/api

- Add your credentials to the `example.env` file:

```
GENIUS_ACCESS_TOKEN="YOUR_TOKEN_HERE"
LAST_FM_API_KEY="YOUR_API_KEY_HERE"

# (optional; login might be broken without it, but everything else still works)
MONGO_URI="mongodb+srv://YOUR_MONGO_URL_HERE"
```

- Rename the file to just `.env`
- Install the dependencies: `npm i`
- Run the server: `node server.js`
- Open `http://localhost:3000/` in your browser.

If you get an error while logging in, just bypass the login/signup entirely
by changing the URL to e.g. `http://localhost:3000/search`. We didn't have
time to fix that.
