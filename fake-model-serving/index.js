const express = require("express");

const app = express();
app.use(express.json());

let activeRequests = 0;

// Middleware to track active requests
app.use((req, res, next) => {
    activeRequests++;
    console.log(`[${new Date().toISOString()}] Request to '${req.method} ${req.url}' started. Active requests: ${activeRequests}`);
    const startTime = Date.now();

    res.on("close", () => {
        const duration = Date.now() - startTime;
        activeRequests--;
        console.log(`[${new Date().toISOString()}] Request to '${req.method} ${req.url}' closed after ${duration}ms. Active requests: ${activeRequests}`);
    });

    next();
});

app.post("/v1/chat/completions", async (req, res) => {
    // Simulate a slow response (1 hour)
    await new Promise(resolve => setTimeout(resolve, 60*60*1000));

    res.json({ message: "Response from slow handler." });
});

// Periodically log active requests
setInterval(() => {
    console.log(`[${new Date().toISOString()}] Active requests: ${activeRequests}`);
}, 2000);

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Backing server listening on port ${PORT}`);
});
