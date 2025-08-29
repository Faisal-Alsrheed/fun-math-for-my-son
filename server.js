const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));

// Route for the main game
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Numberblocks Math Snake Game Server is running!',
        timestamp: new Date().toISOString()
    });
});

// Start the server
app.listen(PORT, () => {
    console.log('🎮 Math Snake Game Server Started!');
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log('🐍 Open your browser and go to the URL above to play!');
    console.log('📚 Teaching 5-year-olds addition with colorful Numberblocks!');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    console.log('👋 Thanks for playing Numberblocks Math Snake!');
    process.exit(0);
});
