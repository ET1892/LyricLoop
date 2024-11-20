const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

app.post("/search", (req, res) => {
    const searchTerm = req.body.searchTerm;
    console.log(`Search term received: ${searchTerm}`);
    
    // Placeholder for further processing or database actions
    
    res.send(`Received search term: ${searchTerm}`);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
