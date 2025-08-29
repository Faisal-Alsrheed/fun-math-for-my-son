// Fun Math Game for Kids - 10 Level Progression System
// Level 1: 1-10, Level 2: 10-20, etc. with 20 questions per level

console.log('🚀 Math Game loaded!');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// Check if canvas is properly loaded
if (!canvas) {
    console.error('❌ Canvas element not found!');
}
if (!ctx) {
    console.error('❌ Canvas context not available!');
}

// Game state
let gameRunning = true;
let currentLevel = 1;
let questionsInLevel = 0;
let questionsPerLevel = 10;
let totalQuestionsAnswered = 0; // Track total questions across all levels
let totalQuestions = 100; // 10 levels × 10 questions each
let currentQuestion = {};
let usedQuestions = new Set(); // Track used questions to prevent repeats
let selectedStartingNumber = 1; // Default starting number

// Game grid - back to original size
let gridSize = 40;
let canvasWidth, canvasHeight;

// Snake - made of individual "One" blocks
const snake = {
    body: [{x: 300, y: 200}],
    direction: {x: gridSize, y: 0}, // Start moving right
    value: 1,
    segments: [1]
};

// Balloon physics for natural floating motion
let balloon = {
    x: 300,
    y: 150,
    targetX: 300,
    targetY: 150,
    velocityX: 0,
    velocityY: 0,
    swayOffset: 0,
    swaySpeed: 0.02,
    damping: 0.85, // How much the balloon slows down (realistic air resistance)
    springStrength: 0.1 // How strongly it's pulled toward target position
};

// Two answer blocks on screen - now with movement!
let correctBlock = {
    x: 0,
    y: 0,
    value: 2,
    isCorrect: true,
    direction: {x: 0, y: 0}, // Movement direction
    speed: 1 // How fast it moves
};

let wrongBlock = {
    x: 0,
    y: 0,
    value: 3,
    isCorrect: false,
    direction: {x: 0, y: 0}, // Movement direction
    speed: 1 // How fast it moves
};

// Dynamic level configuration based on selected starting number
function generateLevelConfig(startingNumber) {
    const config = {};
    for (let level = 1; level <= 10; level++) {
        const min = startingNumber + ((level - 1) * 10);
        const max = min + 10;
        config[level] = {
            min: min,
            max: max,
            description: `Numbers ${min}-${max}`
        };
    }
    return config;
}

// Initialize with default starting number
let levelConfig = generateLevelConfig(selectedStartingNumber);

// Set up canvas size
function setupCanvas() {
    const borderWidth = 6;
    canvasWidth = window.innerWidth - 20; // Much wider canvas for big numbers
    canvasHeight = window.innerHeight - 100; // Much bigger board for huge numbers!
    
    // Align to grid
    canvasWidth = Math.floor(canvasWidth / gridSize) * gridSize;
    canvasHeight = Math.floor(canvasHeight / gridSize) * gridSize;
    
    // Set canvas dimensions
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    console.log('🖥️ Canvas setup:', canvasWidth, 'x', canvasHeight);
}

// Generate question markers in the progress bar
function generateQuestionMarkers() {
    const markersContainer = document.getElementById('questionMarkers');
    markersContainer.innerHTML = ''; // Clear existing markers
    
    // Create 100 question markers
    for (let i = 0; i < totalQuestions; i++) {
        const marker = document.createElement('div');
        marker.className = 'question-marker';
        markersContainer.appendChild(marker);
    }
}

// Initialize game
function init() {
    console.log('🎮 Initializing Math Game...');
    
    setupCanvas();
    generateQuestionMarkers();
    
    // Center the snake and start with selected starting number of segments
    const centerX = Math.floor(canvasWidth/2/gridSize) * gridSize;
    const centerY = Math.floor(canvasHeight/2/gridSize) * gridSize;
    
    snake.body = [];
    snake.segments = [];
    
    // OPTIMIZED: For huge numbers, only create visible segments + head
    const maxPhysicalSegments = Math.min(selectedStartingNumber, 1000); // Limit physical segments
    snake.virtualLength = selectedStartingNumber; // Track the real length virtually
    
    for (let i = 0; i < maxPhysicalSegments; i++) {
        snake.body.push({
            x: centerX - (i * gridSize), // Each segment to the left of the previous
            y: centerY
        });
        snake.segments.push(1);
    }
    snake.value = 1;
    
    // Initialize balloon position above snake
    const initialTail = snake.body[0];
    const balloonRadius = Math.max(30, gridSize * 0.8);
    balloon.x = initialTail.x + gridSize / 2;
    balloon.y = initialTail.y - balloonRadius - 40;
    balloon.targetX = balloon.x;
    balloon.targetY = balloon.y;
    balloon.velocityX = 0;
    balloon.velocityY = 0;
    balloon.swayOffset = 0;
    
    // Initialize level
    currentLevel = 1;
    questionsInLevel = 0;
    totalQuestionsAnswered = 0;
    
    generateQuestion();
    gameLoop();
    
    // Add keyboard controls
    document.addEventListener('keydown', handleKeyPress);
    
    // Add touch controls for tablets/mobile
    addTouchControls();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        setupCanvas();
        // Ensure snake stays within bounds
        snake.body.forEach(segment => {
            segment.x = Math.min(segment.x, canvasWidth - gridSize);
            segment.y = Math.min(segment.y, canvasHeight - gridSize);
        });
        generateQuestion();
    });
    
    console.log('✅ Game initialized successfully!');
}

// Handle starting number selection change
function changeStartingNumber() {
    const dropdown = document.getElementById('startingNumber');
    selectedStartingNumber = parseInt(dropdown.value);
    
    console.log(`🎯 Starting number changed to: ${selectedStartingNumber}`);
    
    // Regenerate level configuration
    levelConfig = generateLevelConfig(selectedStartingNumber);
    
    // Clear used questions for fresh start
    usedQuestions.clear();
    
    // Reset game to apply new settings
    restartGame();
}

// Generate questions based on current snake length - makes it logical!
function generateQuestion() {
    const config = levelConfig[currentLevel];
    let num1, num2, correctAnswer;
    let questionKey;
    let attempts = 0;
    
    // Keep generating until we get a unique question (or max attempts reached)
    do {
        attempts++;
        
        // Add randomness: Sometimes use snake length, sometimes use random numbers from level range
        const useSnakeLength = Math.random() < 0.7; // 70% chance to use snake length, 30% random
    
    if (useSnakeLength) {
        // Use snake length as first number (traditional mode)
        num1 = snake.body.length;
        
        if (currentLevel === 1) {
            // Level 1: Add small numbers (1-3) to keep it simple
            if (num1 === 1) {
                // When snake is 1, randomly choose between 1+1, 1+2, or 1+3
                num2 = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
            } else if (num1 <= 3) {
                // For small snakes, add 1, 2, or 3
                num2 = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
            } else {
                // For bigger snakes, add 1, 2, 3, or 4
                num2 = Math.floor(Math.random() * 4) + 1; // 1, 2, 3, or 4
            }
        } else {
            // For higher levels, add random numbers that keep us in the level range
            const maxAddition = Math.min(6, config.max - num1); // Don't add more than 6, and stay in range
            if (maxAddition < 1) {
                // If we're at the top of the range, add 1-3
                num2 = Math.floor(Math.random() * 3) + 1;
            } else {
                num2 = Math.floor(Math.random() * maxAddition) + 1;
            }
        }
        
        correctAnswer = num1 + num2;
        
        // Make sure answer doesn't exceed level range
        if (correctAnswer > config.max) {
            num2 = config.max - num1;
            if (num2 < 1) num2 = Math.floor(Math.random() * 3) + 1;
            correctAnswer = num1 + num2;
        }
    } else {
        // Generate completely random questions within the level range
        num1 = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
        
        // Make sure num1 isn't too close to the max to allow for addition
        const safeMax = Math.max(config.min, config.max - 5);
        if (num1 > safeMax) {
            num1 = Math.floor(Math.random() * (safeMax - config.min + 1)) + config.min;
        }
        
        // Generate num2 to keep the answer within level bounds
        const maxNum2 = Math.min(6, config.max - num1);
        num2 = Math.floor(Math.random() * maxNum2) + 1;
        
        correctAnswer = num1 + num2;
        
        // Double-check bounds
        if (correctAnswer > config.max) {
            correctAnswer = config.max;
            num2 = correctAnswer - num1;
        }
    }
    
    // Create unique question key to check for duplicates
    questionKey = `${num1}+${num2}=${correctAnswer}`;
    
    // If we've tried too many times, allow duplicates to prevent infinite loop
    if (attempts > 50) {
        console.log('⚠️ Max attempts reached, allowing potential duplicate question');
        break;
    }
    
    } while (usedQuestions.has(questionKey));
    
    // Add this question to used questions set
    usedQuestions.add(questionKey);
    
    currentQuestion = {
        num1: num1,
        num2: num2,
        answer: correctAnswer
    };
    
    // Generate wrong answer with more randomness and variety
    let wrongAnswer;
    const wrongAnswerStrategies = [
        // Strategy 1: Close to correct answer (±1 to ±3)
        () => correctAnswer + (Math.floor(Math.random() * 6) - 3), // -3 to +3
        // Strategy 2: Common mistake (off by 1 or 10)
        () => Math.random() < 0.5 ? correctAnswer + 1 : correctAnswer - 1,
        // Strategy 3: Random number from level range
        () => Math.floor(Math.random() * (config.max - config.min + 1)) + config.min,
        // Strategy 4: Larger difference (±4 to ±8)
        () => correctAnswer + (Math.floor(Math.random() * 16) - 8), // -8 to +8
        // Strategy 5: One of the original numbers (common mistake)
        () => Math.random() < 0.5 ? num1 : num2
    ];
    
    // Randomly choose a strategy
    const strategy = wrongAnswerStrategies[Math.floor(Math.random() * wrongAnswerStrategies.length)];
    
    do {
        wrongAnswer = strategy();
        
        // Ensure wrong answer is reasonable
        if (wrongAnswer < 1) {
            wrongAnswer = Math.floor(Math.random() * Math.min(10, correctAnswer)) + 1;
        }
        if (wrongAnswer > config.max + 15) {
            wrongAnswer = Math.max(1, correctAnswer - Math.floor(Math.random() * 5) - 1);
        }
    } while (wrongAnswer === correctAnswer || wrongAnswer < 1);
    
    // Set block values
    correctBlock.value = correctAnswer;
    wrongBlock.value = wrongAnswer;
    
    // Place blocks randomly on screen
    placeBlocks();
    
    // Update displays
    document.getElementById('mathQuestion').textContent = 
        `${currentQuestion.num1} + ${currentQuestion.num2} = ?`;
    
    updateProgressDisplay();
    
    console.log(`📝 Level ${currentLevel} Question ${questionsInLevel + 1}:`, num1, '+', num2, '=', correctAnswer, 'Wrong:', wrongAnswer);
}

// Flash red screen effect for wrong answers
function flashRedScreen() {
    // Create red overlay
    const redOverlay = document.createElement('div');
    redOverlay.style.position = 'fixed';
    redOverlay.style.top = '0';
    redOverlay.style.left = '0';
    redOverlay.style.width = '100vw';
    redOverlay.style.height = '100vh';
    redOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
    redOverlay.style.zIndex = '9999';
    redOverlay.style.pointerEvents = 'none';
    redOverlay.style.transition = 'opacity 0.3s ease';
    
    // Add to page
    document.body.appendChild(redOverlay);
    
    // Remove after short time
    setTimeout(() => {
        redOverlay.style.opacity = '0';
        setTimeout(() => {
            if (redOverlay.parentNode) {
                document.body.removeChild(redOverlay);
            }
        }, 300);
    }, 200);
}

// Flash green screen with fireworks party effect for correct answers
function flashGreenScreenWithFireworks() {
    // Create green overlay
    const greenOverlay = document.createElement('div');
    greenOverlay.style.position = 'fixed';
    greenOverlay.style.top = '0';
    greenOverlay.style.left = '0';
    greenOverlay.style.width = '100vw';
    greenOverlay.style.height = '100vh';
    greenOverlay.style.backgroundColor = 'rgba(0, 255, 0, 0.4)';
    greenOverlay.style.zIndex = '9999';
    greenOverlay.style.pointerEvents = 'none';
    greenOverlay.style.transition = 'opacity 0.4s ease';
    
    // Add to page
    document.body.appendChild(greenOverlay);
    
    // Create fireworks effect
    createFireworks();
    
    // Remove green overlay after extended celebration time
    setTimeout(() => {
        greenOverlay.style.opacity = '0';
        setTimeout(() => {
            if (greenOverlay.parentNode) {
                document.body.removeChild(greenOverlay);
            }
        }, 500);
    }, 3500); // Extended to 3.5 seconds!
}

// Create spectacular extended fireworks show
function createFireworks() {
    // Create multiple waves of fireworks over 3.5 seconds
    
    // Wave 1: Initial burst (0-0.8s)
    for (let i = 0; i < 12; i++) {
        setTimeout(() => {
            createSingleFirework();
        }, i * 70);
    }
    
    // Wave 2: Second burst (1s-1.8s)
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            createSingleFirework();
        }, 1000 + (i * 80));
    }
    
    // Wave 3: Third burst (2s-2.8s)
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            createSingleFirework();
        }, 2000 + (i * 55));
    }
    
    // Wave 4: Grand finale (2.8s-3.5s)
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            createSingleFirework();
        }, 2800 + (i * 35));
    }
}

// Create realistic firework explosion with multiple particles
function createSingleFirework() {
    // Random explosion center
    const centerX = Math.random() * window.innerWidth;
    const centerY = Math.random() * window.innerHeight;
    
    // Random bright color for this firework
    const colors = ['#FFD700', '#FF69B4', '#00FF00', '#FF4500', '#9370DB', '#00CED1', '#FF1493', '#00FFFF'];
    const fireworkColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Create 15-25 particles per firework for realistic explosion
    const particleCount = 15 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i < particleCount; i++) {
        createFireworkParticle(centerX, centerY, fireworkColor, i);
    }
    
    // Add bright flash at explosion center
    createExplosionFlash(centerX, centerY, fireworkColor);
}

// Create individual particle that shoots out from explosion center
function createFireworkParticle(centerX, centerY, color, particleIndex) {
    const particle = document.createElement('div');
    particle.style.position = 'fixed';
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.borderRadius = '50%';
    particle.style.zIndex = '10000';
    particle.style.pointerEvents = 'none';
    particle.style.backgroundColor = color;
    particle.style.boxShadow = `0 0 8px ${color}, 0 0 16px ${color}`;
    
    // Start at explosion center
    particle.style.left = centerX + 'px';
    particle.style.top = centerY + 'px';
    
    document.body.appendChild(particle);
    
    // Random direction and speed for realistic spread
    const angle = (Math.PI * 2 * particleIndex) / 20 + (Math.random() - 0.5) * 0.5;
    const speed = 2 + Math.random() * 4;
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;
    
    // Animate particle flying outward
    let currentX = centerX;
    let currentY = centerY;
    let opacity = 1;
    let gravity = 0.1;
    let currentVelocityY = velocityY;
    
    const animateParticle = () => {
        // Update position with physics
        currentX += velocityX;
        currentY += currentVelocityY;
        currentVelocityY += gravity; // Gravity effect
        
        // Fade out over time
        opacity -= 0.015;
        
        // Update particle position and opacity
        particle.style.left = currentX + 'px';
        particle.style.top = currentY + 'px';
        particle.style.opacity = opacity;
        
        // Continue animation or cleanup
        if (opacity > 0 && currentY < window.innerHeight + 100) {
            requestAnimationFrame(animateParticle);
        } else {
            if (particle.parentNode) {
                document.body.removeChild(particle);
            }
        }
    };
    
    requestAnimationFrame(animateParticle);
}

// Create bright explosion flash at center
function createExplosionFlash(x, y, color) {
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.width = '20px';
    flash.style.height = '20px';
    flash.style.borderRadius = '50%';
    flash.style.zIndex = '10001';
    flash.style.pointerEvents = 'none';
    flash.style.backgroundColor = color;
    flash.style.boxShadow = `0 0 30px ${color}, 0 0 60px ${color}, 0 0 90px ${color}`;
    flash.style.left = (x - 10) + 'px';
    flash.style.top = (y - 10) + 'px';
    
    document.body.appendChild(flash);
    
    // Animate bright flash
    let scale = 1;
    let opacity = 1;
    const animateFlash = () => {
        scale += 0.3;
        opacity -= 0.08;
        
        flash.style.transform = `scale(${scale})`;
        flash.style.opacity = opacity;
        
        if (opacity > 0) {
            requestAnimationFrame(animateFlash);
        } else {
            if (flash.parentNode) {
                document.body.removeChild(flash);
            }
        }
    };
    
    requestAnimationFrame(animateFlash);
}

// Update progress display
function updateProgressDisplay() {
    // Update question counter (total questions across all levels)
    document.getElementById('currentQuestion').textContent = totalQuestionsAnswered + 1;
    
    // Update progress bar (0-100% across all 200 questions)
    const progressPercent = ((totalQuestionsAnswered) / totalQuestions) * 100;
    document.getElementById('progressFill').style.width = progressPercent + '%';
}

// Place the two blocks randomly on screen with padding, distance, and movement directions
function placeBlocks() {
    let attempts = 0;
    const safePadding = 80; // Much larger safe zone to keep numbers fully visible
    const minDistance = gridSize * 3; // Minimum distance between blocks (3 grid spaces)
    
    // Possible movement directions (horizontal or vertical only)
    const directions = [
        {x: 1, y: 0},   // Right
        {x: -1, y: 0},  // Left
        {x: 0, y: 1},   // Down
        {x: 0, y: -1}   // Up
    ];
    
    // Calculate safe area boundaries (keep blocks well away from edges)
    const safeMinX = safePadding;
    const safeMaxX = canvasWidth - safePadding - gridSize;
    const safeMinY = safePadding;
    const safeMaxY = canvasHeight - safePadding - gridSize;
    
    // Place correct block in safe middle area
    do {
        correctBlock.x = Math.floor(Math.random() * ((safeMaxX - safeMinX) / gridSize)) * gridSize + safeMinX;
        correctBlock.y = Math.floor(Math.random() * ((safeMaxY - safeMinY) / gridSize)) * gridSize + safeMinY;
        attempts++;
        if (attempts > 100) break;
    } while (isPositionOccupied(correctBlock.x, correctBlock.y));
    
    // Set random direction for correct block
    correctBlock.direction = directions[Math.floor(Math.random() * directions.length)];
    correctBlock.speed = 0.02; // Extremely slow - almost stationary
    
    // Place wrong block in safe middle area (avoid snake area, edges, and keep distance from correct block)
    attempts = 0;
    let totalDistance = 0;
    do {
        wrongBlock.x = Math.floor(Math.random() * ((safeMaxX - safeMinX) / gridSize)) * gridSize + safeMinX;
        wrongBlock.y = Math.floor(Math.random() * ((safeMaxY - safeMinY) / gridSize)) * gridSize + safeMinY;
        
        // Calculate distance between blocks
        const distanceX = Math.abs(wrongBlock.x - correctBlock.x);
        const distanceY = Math.abs(wrongBlock.y - correctBlock.y);
        totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        attempts++;
        if (attempts > 100) break;
    } while (isPositionOccupied(wrongBlock.x, wrongBlock.y) || 
             totalDistance < minDistance || // Keep distance from correct block
             isTooCloseToSnake(wrongBlock.x, wrongBlock.y)); // Keep away from snake!
    
    // Set random direction for wrong block (different from correct block if possible)
    let availableDirections = directions.filter(dir => 
        dir.x !== correctBlock.direction.x || dir.y !== correctBlock.direction.y
    );
    if (availableDirections.length === 0) availableDirections = directions;
    
    wrongBlock.direction = availableDirections[Math.floor(Math.random() * availableDirections.length)];
    wrongBlock.speed = 0.02; // Extremely slow - almost stationary
}

// Check if position is occupied by snake - OPTIMIZED FOR MILLIONS!
function isPositionOccupied(x, y) {
    // Only check first 100 segments for speed with huge snakes
    const segmentsToCheck = Math.min(snake.body.length, 100);
    for (let i = 0; i < segmentsToCheck; i++) {
        const segment = snake.body[i];
        if (segment.x === x && segment.y === y) {
            return true;
        }
    }
    return false;
}

// Check if position is too close to snake (safety zone) - OPTIMIZED FOR MILLIONS!
function isTooCloseToSnake(x, y, safetyDistance = gridSize * 2) {
    // Only check first 50 segments for speed with huge snakes
    const segmentsToCheck = Math.min(snake.body.length, 50);
    for (let i = 0; i < segmentsToCheck; i++) {
        const segment = snake.body[i];
        const distanceX = Math.abs(x - segment.x);
        const distanceY = Math.abs(y - segment.y);
        const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        if (totalDistance < safetyDistance) {
            return true;
        }
    }
    return false;
}

// Check if two blocks are colliding (overlap detection for moving blocks)
function isBlockCollision(x1, y1, x2, y2) {
    const overlapThreshold = gridSize * 0.7; // Allow collision if blocks overlap by 70%
    
    const distanceX = Math.abs(x1 - x2);
    const distanceY = Math.abs(y1 - y2);
    
    // Check if blocks overlap enough to count as collision
    return distanceX < overlapThreshold && distanceY < overlapThreshold;
}

// Handle keyboard input
function handleKeyPress(event) {
    if (!gameRunning) return;
    
    const key = event.key;
    
    // Prevent default arrow key behavior
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        event.preventDefault();
    }
    
    // Prevent snake from going backwards
    switch(key) {
        case 'ArrowUp':
            if (snake.direction.y === 0) {
                snake.direction = {x: 0, y: -gridSize};
            }
            break;
        case 'ArrowDown':
            if (snake.direction.y === 0) {
                snake.direction = {x: 0, y: gridSize};
            }
            break;
        case 'ArrowLeft':
            if (snake.direction.x === 0) {
                snake.direction = {x: -gridSize, y: 0};
            }
            break;
        case 'ArrowRight':
            if (snake.direction.x === 0) {
                snake.direction = {x: gridSize, y: 0};
            }
            break;
    }
}

// Add touch controls for tablets and mobile devices
function addTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    
    // Handle touch start
    canvas.addEventListener('touchstart', function(event) {
        event.preventDefault();
        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: false });
    
    // Handle touch end (swipe detection)
    canvas.addEventListener('touchend', function(event) {
        event.preventDefault();
        if (!gameRunning) return;
        
        const touch = event.changedTouches[0];
        const touchEndX = touch.clientX;
        const touchEndY = touch.clientY;
        
        // Calculate swipe direction
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const minSwipeDistance = 30; // Minimum distance for a swipe
        
        // Determine if it's a horizontal or vertical swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            // Horizontal swipe
            if (deltaX > 0 && snake.direction.x === 0) {
                // Swipe right
                snake.direction = {x: gridSize, y: 0};
            } else if (deltaX < 0 && snake.direction.x === 0) {
                // Swipe left
                snake.direction = {x: -gridSize, y: 0};
            }
        } else if (Math.abs(deltaY) > minSwipeDistance) {
            // Vertical swipe
            if (deltaY > 0 && snake.direction.y === 0) {
                // Swipe down
                snake.direction = {x: 0, y: gridSize};
            } else if (deltaY < 0 && snake.direction.y === 0) {
                // Swipe up
                snake.direction = {x: 0, y: -gridSize};
            }
        }
    }, { passive: false });
    
    // Prevent scrolling on touch
    canvas.addEventListener('touchmove', function(event) {
        event.preventDefault();
    }, { passive: false });
}

// Update answer blocks movement
function updateAnswerBlocks() {
    // Move correct block
    correctBlock.x += correctBlock.direction.x * correctBlock.speed;
    correctBlock.y += correctBlock.direction.y * correctBlock.speed;
    
    // Bounce off safe boundaries for correct block (keep numbers fully visible)
    const safePadding = 80; // Same safe zone as placement
    if (correctBlock.x <= safePadding || correctBlock.x >= canvasWidth - safePadding - gridSize) {
        correctBlock.direction.x *= -1; // Reverse horizontal direction
    }
    if (correctBlock.y <= safePadding || correctBlock.y >= canvasHeight - safePadding - gridSize) {
        correctBlock.direction.y *= -1; // Reverse vertical direction
    }
    
    // Move wrong block
    wrongBlock.x += wrongBlock.direction.x * wrongBlock.speed;
    wrongBlock.y += wrongBlock.direction.y * wrongBlock.speed;
    
    // Bounce off safe boundaries for wrong block (keep numbers fully visible)
    if (wrongBlock.x <= safePadding || wrongBlock.x >= canvasWidth - safePadding - gridSize) {
        wrongBlock.direction.x *= -1; // Reverse horizontal direction
    }
    if (wrongBlock.y <= safePadding || wrongBlock.y >= canvasHeight - safePadding - gridSize) {
        wrongBlock.direction.y *= -1; // Reverse vertical direction
    }
}

// Update balloon physics for natural floating motion
function updateBalloonPhysics() {
    if (snake.body.length === 0) return;
    
    const tail = snake.body[snake.body.length - 1];
    const balloonRadius = Math.max(30, gridSize * 0.8);
    
    // Set target position above the tail
    balloon.targetX = tail.x + gridSize / 2;
    balloon.targetY = tail.y - balloonRadius - 40;
    
    // Add natural swaying motion (like wind)
    balloon.swayOffset += balloon.swaySpeed;
    const swayAmount = Math.sin(balloon.swayOffset) * 15; // 15 pixels of sway
    balloon.targetX += swayAmount;
    
    // Calculate forces toward target position (spring physics)
    const forceX = (balloon.targetX - balloon.x) * balloon.springStrength;
    const forceY = (balloon.targetY - balloon.y) * balloon.springStrength;
    
    // Update velocity with forces
    balloon.velocityX += forceX;
    balloon.velocityY += forceY;
    
    // Apply air resistance (damping)
    balloon.velocityX *= balloon.damping;
    balloon.velocityY *= balloon.damping;
    
    // Update position with velocity
    balloon.x += balloon.velocityX;
    balloon.y += balloon.velocityY;
}

// Update game state
function update() {
    if (!gameRunning) return;
    
    // Move answer blocks
    updateAnswerBlocks();
    
    // Update balloon physics for natural floating motion
    updateBalloonPhysics();
    
    // Move snake
    const head = {x: snake.body[0].x + snake.direction.x, y: snake.body[0].y + snake.direction.y};
    
    // Wrap around walls
    if (head.x < 0) {
        head.x = canvasWidth - gridSize;
    } else if (head.x >= canvasWidth) {
        head.x = 0;
    }
    
    if (head.y < 0) {
        head.y = canvasHeight - gridSize;
    } else if (head.y >= canvasHeight) {
        head.y = 0;
    }
    
    // Snake can pass through itself - no self collision check for kid-friendly gameplay
    
    snake.body.unshift(head);
    
    // Check collision with correct block (using overlap detection instead of exact match)
    if (isBlockCollision(head.x, head.y, correctBlock.x, correctBlock.y)) {
        console.log('✅ Correct answer! Snake grows!');
        
        // Flash green screen with fireworks party effect!
        flashGreenScreenWithFireworks();
        
        // Snake grows by the amount we added in the math problem
        const growthAmount = currentQuestion.num2;
        
        // Update virtual length (always grows)
        snake.virtualLength = (snake.virtualLength || snake.body.length) + growthAmount;
        
        // Only add physical segments if we're under the limit
        const maxPhysicalSegments = 1000;
        for (let i = 0; i < growthAmount && snake.body.length < maxPhysicalSegments; i++) {
            snake.segments.push(1);
            // Add body segments at the tail position
            const tail = snake.body[snake.body.length - 1];
            snake.body.push({x: tail.x, y: tail.y});
        }
        
        // Increment question counters
        questionsInLevel++;
        totalQuestionsAnswered++;
        
        // Check if level is complete
        if (questionsInLevel >= questionsPerLevel) {
            levelComplete();
        } else {
            // Generate next question
        setTimeout(() => {
                generateQuestion();
            }, 500);
        }
        
    } else if (isBlockCollision(head.x, head.y, wrongBlock.x, wrongBlock.y)) {
        // Wrong answer - flash red screen and keep same question for retry
        console.log('❌ Wrong answer - try again with same question!');
        
        // Flash red screen effect
        flashRedScreen();
        
        // Just place new blocks with same question - don't generate new question!
        placeBlocks();
        
        return;
        
    } else {
        // No collision - remove tail
        snake.body.pop();
    }
}

// Level complete - automatically advance to next level
function levelComplete() {
    if (currentLevel >= 10) {
        // Game complete!
        gameWin();
        return;
    }
    
    console.log(`🎉 Level ${currentLevel} completed! Moving to Level ${currentLevel + 1}`);
    
    // Show brief celebration message
    showCelebration(`Level ${currentLevel} Complete! 🎉`);
    
    // Automatically advance to next level after short delay
    setTimeout(() => {
        nextLevel();
    }, 1500); // 1.5 second delay to show celebration
}

// Next level
function nextLevel() {
    currentLevel++;
    questionsInLevel = 0;
    
    updateProgressDisplay();
    generateQuestion();
    
    console.log(`🚀 Starting Level ${currentLevel}`);
}

// Show celebration message
function showCelebration(message) {
    const celebration = document.getElementById('celebration');
    celebration.textContent = message;
    celebration.style.display = 'block';
    
    setTimeout(() => {
        celebration.style.display = 'none';
    }, 2000);
}

// Game win (all 10 levels completed)
function gameWin() {
    gameRunning = false;
    document.getElementById('gameOver').querySelector('h2').textContent = 'Congratulations! 🏆';
    document.getElementById('gameOver').querySelector('.number-display').innerHTML = 
        `You completed all 10 levels!<br>Final Snake Length: <span id="finalScore">${snake.body.length}</span> Ones!`;
    document.getElementById('gameOver').style.display = 'block';
}

// Draw a single "One" block (red Numberblock) - simple with number 1 on top
function drawOneBlock(x, y, isHead = false) {
    if (isHead) {
        // RAINBOW HEAD - BIGGER AND COLORFUL! 🌈
        const headSize = gridSize * 1.5; // 50% bigger head
        const headX = x - (headSize - gridSize) / 2;
        const headY = y - (headSize - gridSize) / 2;
        
        // Create rainbow gradient
        const gradient = ctx.createLinearGradient(headX, headY, headX + headSize, headY + headSize);
        gradient.addColorStop(0, '#FF0000');    // Red
        gradient.addColorStop(0.16, '#FF8000'); // Orange
        gradient.addColorStop(0.33, '#FFFF00'); // Yellow
        gradient.addColorStop(0.5, '#00FF00');  // Green
        gradient.addColorStop(0.66, '#0080FF'); // Blue
        gradient.addColorStop(0.83, '#8000FF'); // Indigo
        gradient.addColorStop(1, '#FF00FF');    // Violet
        
        ctx.fillStyle = gradient;
        ctx.fillRect(headX, headY, headSize, headSize);
        
        // Rainbow border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4; // Thicker border for head
        ctx.strokeRect(headX, headY, headSize, headSize);
        
        // Draw "HEAD" text bigger
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.max(20, gridSize / 1.5)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('HEAD', headX + headSize/2, headY - 8);
    } else {
        // Regular red block for body
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(x, y, gridSize, gridSize);
        
        // Draw white border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, gridSize, gridSize);
    }
        
    // Draw the number "1" in black at the top (only for body segments, not head)
    if (!isHead) {
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.max(16, gridSize / 2.5)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('1', x + gridSize/2, y - 5);
    }
    
    // Draw one eye (center) - adjust for head size
    const blockSize = isHead ? gridSize * 1.5 : gridSize;
    const blockX = isHead ? x - (blockSize - gridSize) / 2 : x;
    const blockY = isHead ? y - (blockSize - gridSize) / 2 : y;
    
    const eyeSize = Math.max(isHead ? 10 : 6, blockSize / 8);
    const pupilSize = Math.max(isHead ? 4 : 2, blockSize / 16);
    
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(blockX + blockSize/2, blockY + blockSize/3, eyeSize, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(blockX + blockSize/2, blockY + blockSize/3, pupilSize, 0, 2 * Math.PI);
        ctx.fill();
        
    // Draw mouth (simple smile) - bigger for head
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = isHead ? 4 : Math.max(2, gridSize / 20);
    ctx.beginPath();
    const mouthRadius = Math.max(isHead ? 10 : 6, blockSize / 6);
    ctx.arc(blockX + blockSize/2, blockY + 2 * blockSize/3, mouthRadius, 0, Math.PI);
    ctx.stroke();
}

// Draw answer block - simple blocks with number on top
function drawAnswerBlock(x, y, value, isCorrect) {
    // Both blocks look identical - kids must figure out which is correct!
    const color = '#4ECDC4'; // Same teal color for both blocks
    
    ctx.fillStyle = color;
    ctx.fillRect(x, y, gridSize, gridSize);
    
    // Draw border
                ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, gridSize, gridSize);
    
    // Draw the number with background for better visibility
    const numberY = y - 8;
    const fontSize = Math.max(60, gridSize / 0.6); // GIGANTIC numbers - super easy to see!
    
    // Draw white background circle for the number
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x + gridSize/2, numberY, fontSize/2 + 10, 0, 2 * Math.PI); // Even bigger circle for bigger numbers
    ctx.fill();
    
    // Draw black border around the circle
    ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
            ctx.beginPath();
    ctx.arc(x + gridSize/2, numberY, fontSize/2 + 10, 0, 2 * Math.PI); // Even bigger circle for bigger numbers
            ctx.stroke();
    
    // Draw the number in black
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value.toString(), x + gridSize/2, numberY);
    
    // Draw one eye (center)
    const eyeSize = Math.max(6, gridSize / 8);
    const pupilSize = Math.max(2, gridSize / 16);
    
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x + gridSize/2, y + gridSize/3, eyeSize, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x + gridSize/2, y + gridSize/3, pupilSize, 0, 2 * Math.PI);
        ctx.fill();
        
    // Draw smile
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
        ctx.beginPath();
    const mouthRadius = Math.max(6, gridSize / 6);
    ctx.arc(x + gridSize/2, y + 2 * gridSize/3, mouthRadius, 0, Math.PI);
    ctx.stroke();
}

// Draw everything
function draw() {
    if (!ctx || !canvas) {
        console.error('❌ Canvas or context not available!');
        return;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Fill with light background
    ctx.fillStyle = '#F0F8FF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    console.log('🎨 Drawing - Snake:', snake.body.length, 'Correct:', correctBlock.x, correctBlock.y, 'Wrong:', wrongBlock.x, wrongBlock.y);
    
    // Draw the two answer blocks FIRST (in background)
    drawAnswerBlock(correctBlock.x, correctBlock.y, correctBlock.value, true);
    drawAnswerBlock(wrongBlock.x, wrongBlock.y, wrongBlock.value, false);
    
    // Draw snake as individual "One" blocks ON TOP - OPTIMIZED FOR MILLIONS!
    // Only draw visible segments for lightning speed with huge snakes
    const maxVisibleSegments = Math.min(snake.body.length, 500); // Limit for speed
    for (let i = 0; i < maxVisibleSegments; i++) {
        const segment = snake.body[i];
        const isHead = (i === 0); // First segment is the head
        drawOneBlock(segment.x, segment.y, isHead);
    }
    
    // Draw yellow balloon at the end of the snake showing length
    if (snake.body.length > 0) {
        const tail = snake.body[snake.body.length - 1];
        drawSnakeLengthBalloon(tail.x, tail.y, snake.virtualLength || snake.body.length);
    }
}

// Draw smaller clean yellow balloon showing snake length with natural floating physics
function drawSnakeLengthBalloon(tailX, tailY, length) {
    // Make balloon smaller and less prominent
    const balloonRadius = Math.max(30, gridSize * 0.8); // Smaller size
    
    // Use physics-based balloon position for natural floating motion
    const balloonX = balloon.x;
    const balloonY = balloon.y;
    
    // Draw balloon string (thinner) - connects tail to floating balloon
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tailX + gridSize / 2, tailY);
    ctx.lineTo(balloonX, balloonY + balloonRadius);
    ctx.stroke();
    
    // Draw clean yellow balloon (no bright highlights)
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(balloonX, balloonY, balloonRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw balloon border (thinner)
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(balloonX, balloonY, balloonRadius, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw the number inside the balloon (clear and readable)
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${Math.max(24, balloonRadius / 1.5)}px Comic Sans MS`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(length.toString(), balloonX, balloonY);
    
    // Draw bigger balloon knot
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.ellipse(balloonX, balloonY + balloonRadius, 6, 12, 0, 0, 2 * Math.PI);
    ctx.fill();
}

// Game over
function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = snake.body.length;
    document.getElementById('gameOver').style.display = 'block';
}

// Restart game
function restartGame() {
    gameRunning = true;
    currentLevel = 1;
    questionsInLevel = 0;
    totalQuestionsAnswered = 0;
    
    // Reset snake to selected starting number of segments
    const centerX = Math.floor(canvasWidth/2/gridSize) * gridSize;
    const centerY = Math.floor(canvasHeight/2/gridSize) * gridSize;
    
    snake.body = [];
    snake.segments = [];
    
    // OPTIMIZED: For huge numbers, only create visible segments + head
    const maxPhysicalSegments = Math.min(selectedStartingNumber, 1000); // Limit physical segments
    snake.virtualLength = selectedStartingNumber; // Track the real length virtually
    
    for (let i = 0; i < maxPhysicalSegments; i++) {
        snake.body.push({
            x: centerX - (i * gridSize), // Each segment to the left of the previous
            y: centerY
        });
        snake.segments.push(1);
    }
    snake.direction = {x: gridSize, y: 0};
    snake.value = 1;
    
    // Reset balloon position above snake
    const initialTail = snake.body[0];
    const balloonRadius = Math.max(30, gridSize * 0.8);
    balloon.x = initialTail.x + gridSize / 2;
    balloon.y = initialTail.y - balloonRadius - 40;
    balloon.targetX = balloon.x;
    balloon.targetY = balloon.y;
    balloon.velocityX = 0;
    balloon.velocityY = 0;
    balloon.swayOffset = 0;
    
    document.getElementById('gameOver').style.display = 'none';
    
    generateQuestion();
}

// Game loop
function gameLoop() {
    update();
    draw();
    
    if (gameRunning) {
        setTimeout(gameLoop, 200); // Slow and gentle speed perfect for 5-year-olds
    }
}

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, starting game...');
    init();
});

// Fallback: Start immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading
} else {
    // DOM is already loaded
    console.log('🚀 DOM already loaded, starting game immediately...');
    init();
}
