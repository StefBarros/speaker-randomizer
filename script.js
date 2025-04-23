// Get references to HTML elements
const speakerList = document.getElementById('studentList');
const pickSpeakerBtn = document.getElementById('pickStudentBtn');
const resetBtn = document.getElementById('resetBtn');
const selectedSpeakerDisplay = document.getElementById('selectedStudentDisplay');
const remainingCount = document.getElementById('remainingCount');
const chosenCount = document.getElementById('chosenCount');
const presentationHistory = document.getElementById('presentationHistory');
const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const startTimerBtn = document.getElementById('startTimerBtn');
const resetTimerBtn = document.getElementById('resetTimerBtn');
const timerPresetBtns = document.querySelectorAll('.timer-preset-btn');

// Initialize arrays to track available and chosen speakers
let speakersAvailable = [];
let speakersChosen = [];

// Timer variables
let defaultTime = 300; // 5 minutes in seconds
let timeLeft = defaultTime;
let timerId = null;
let isTimerRunning = false;

/**
 * Updates the count displays for remaining and chosen speakers
 */
function updateCounts() {
    remainingCount.textContent = speakersAvailable.length;
    chosenCount.textContent = speakersChosen.length;
}

/**
 * Sets the timer to a specific duration
 * @param {number} seconds - The duration in seconds
 */
function setTimer(seconds) {
    clearInterval(timerId);
    isTimerRunning = false;
    defaultTime = seconds;
    timeLeft = seconds;
    startTimerBtn.textContent = 'Start Timer';
    updateTimerDisplay();
    
    // Update active state of preset buttons
    timerPresetBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.seconds) === seconds);
    });
}

/**
 * Updates the timer display
 */
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    minutesDisplay.textContent = minutes.toString().padStart(2, '0');
    secondsDisplay.textContent = seconds.toString().padStart(2, '0');
}

/**
 * Starts or pauses the timer
 */
function toggleTimer() {
    if (isTimerRunning) {
        clearInterval(timerId);
        startTimerBtn.textContent = 'Start Timer';
    } else {
        timerId = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                clearInterval(timerId);
                isTimerRunning = false;
                startTimerBtn.textContent = 'Start Timer';
                // Play a sound or show an alert when time is up
                alert('Time is up!');
            }
        }, 1000);
        startTimerBtn.textContent = 'Pause Timer';
    }
    isTimerRunning = !isTimerRunning;
}

/**
 * Resets the timer to the current default time
 */
function resetTimer() {
    clearInterval(timerId);
    timeLeft = defaultTime;
    isTimerRunning = false;
    startTimerBtn.textContent = 'Start Timer';
    updateTimerDisplay();
}

/**
 * Adds a speaker to the presentation history
 */
function addToHistory(speakerName) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.textContent = `${speakerName} - ${new Date().toLocaleTimeString()}`;
    presentationHistory.insertBefore(historyItem, presentationHistory.firstChild);
}

/**
 * Initializes the speaker lists based on the textarea content
 */
function initializeLists() {
    // Get text from textarea and split by newlines
    const text = speakerList.value.trim();
    
    // Split by newlines, trim whitespace, and filter out empty names
    speakersAvailable = text
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    
    // Clear the chosen speakers array
    speakersChosen = [];
    
    // Update the count displays
    updateCounts();
    
    // Reset the selected speaker display
    selectedSpeakerDisplay.textContent = "- - -";
    selectedSpeakerDisplay.style.color = "#00bcd4"; // Reset to teal color
    
    // Clear the history
    presentationHistory.innerHTML = '';
    
    // Enable/disable buttons based on whether there are speakers available
    pickSpeakerBtn.disabled = speakersAvailable.length === 0;
    resetBtn.disabled = speakersAvailable.length === 0;
}

/**
 * Picks a random speaker from the available list
 */
function pickRandomSpeaker() {
    // Check if there are any speakers available
    if (speakersAvailable.length === 0) {
        selectedSpeakerDisplay.textContent = "Everyone has presented!";
        selectedSpeakerDisplay.style.color = "#ff6b6b"; // Red color for message
        pickSpeakerBtn.disabled = true;
        return;
    }
    
    // Generate a random index
    const randomIndex = Math.floor(Math.random() * speakersAvailable.length);
    
    // Get the speaker at that index
    const selectedSpeaker = speakersAvailable[randomIndex];
    
    // Display the selected speaker
    selectedSpeakerDisplay.textContent = selectedSpeaker;
    selectedSpeakerDisplay.style.color = "#00bcd4"; // Teal color for selected speaker
    
    // Add to history
    addToHistory(selectedSpeaker);
    
    // Move the speaker from available to chosen
    speakersAvailable.splice(randomIndex, 1);
    speakersChosen.push(selectedSpeaker);
    
    // Update the count displays
    updateCounts();
    
    // Disable the pick button if no more speakers are available
    if (speakersAvailable.length === 0) {
        pickSpeakerBtn.disabled = true;
    }
    
    // Reset and start the timer for the new speaker
    resetTimer();
    toggleTimer();
}

// Add event listeners for timer preset buttons
timerPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const seconds = parseInt(btn.dataset.seconds);
        setTimer(seconds);
    });
});

// Add event listeners
pickSpeakerBtn.addEventListener('click', pickRandomSpeaker);
resetBtn.addEventListener('click', initializeLists);
startTimerBtn.addEventListener('click', toggleTimer);
resetTimerBtn.addEventListener('click', resetTimer);

// Initialize lists when the textarea content changes
speakerList.addEventListener('input', initializeLists);

// Initialize lists and timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeLists();
    updateTimerDisplay();
}); 