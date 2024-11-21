const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

// Connect the backend to the frontend
app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.post("/search", (req, res) => {
    const searchTerm = req.body.searchTerm;
    console.log(`Received search term: ${searchTerm}`);
    
    res.send(`Received search term: ${searchTerm}`);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
