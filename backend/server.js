const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware to parse incoming form data
app.use(bodyParser.urlencoded({ extended: true }));

// Serve the static HTML file (optional if running on a different server)
app.use(express.static('public'));

// Endpoint to handle the search form submission
app.post('/search', (req, res) => {
    const searchTerm = req.body.searchTerm;
    console.log('Search term received:', searchTerm);
    
    // Placeholder for further processing or database actions
    
    // Send a response back to the front end
    res.send(`Received search term: ${searchTerm}`);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
