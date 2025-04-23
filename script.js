// Theme handling
const toggleSwitch = document.querySelector('#checkbox');

// Check for saved theme preference and set initial theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
toggleSwitch.checked = savedTheme === 'dark';

// Theme switch event listener
toggleSwitch.addEventListener('change', (e) => {
    const theme = e.target.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
});

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
const csvFileInput = document.getElementById('csvFile');
const savedListsSelect = document.getElementById('savedLists');
const saveListBtn = document.getElementById('saveListBtn');
const deleteListBtn = document.getElementById('deleteListBtn');

// Initialize arrays and variables
let speakersAvailable = [];
let speakersChosen = [];
let defaultTime = 300;
let timeLeft = defaultTime;
let timerId = null;
let isTimerRunning = false;

/**
 * Parses a CSV file and returns an array of names
 * @param {string} csvContent - The content of the CSV file
 * @returns {string[]} Array of names from the CSV
 */
function parseCSV(csvContent) {
    // Split the content by newlines
    const lines = csvContent.split(/\r?\n/);
    
    // Get all non-empty names from the CSV, assuming names are in the first column
    const names = lines
        .map(line => line.split(',')[0].trim())
        .filter(name => name && name.length > 0);
    
    return names;
}

/**
 * Handles CSV file upload
 * @param {File} file - The uploaded CSV file
 */
function handleCSVUpload(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const names = parseCSV(e.target.result);
            if (names.length === 0) {
                alert('No valid names found in the CSV file.');
                return;
            }
            
            // Update textarea with the names
            speakerList.value = names.join('\n');
            
            // Initialize the lists with the new names
            initializeLists();
            
        } catch (error) {
            alert('Error reading CSV file: ' + error.message);
        }
    };
    
    reader.onerror = function() {
        alert('Error reading the file');
    };
    
    reader.readAsText(file);
}

/**
 * Saves the current list to localStorage
 */
function saveCurrentList() {
    const listName = prompt('Enter a name for this list:');
    if (!listName) return;
    
    const currentList = speakerList.value.trim();
    if (!currentList) {
        alert('Please enter some names before saving the list.');
        return;
    }
    
    // Get existing lists or initialize empty object
    const savedLists = JSON.parse(localStorage.getItem('speakerLists') || '{}');
    
    // Save the new list
    savedLists[listName] = currentList;
    localStorage.setItem('speakerLists', JSON.stringify(savedLists));
    
    // Update the dropdown
    updateSavedListsDropdown();
    
    alert('List saved successfully!');
}

/**
 * Updates the saved lists dropdown with lists from localStorage
 */
function updateSavedListsDropdown() {
    // Clear existing options except the first one
    while (savedListsSelect.options.length > 1) {
        savedListsSelect.remove(1);
    }
    
    // Get saved lists
    const savedLists = JSON.parse(localStorage.getItem('speakerLists') || '{}');
    
    // Add options for each saved list
    Object.keys(savedLists).forEach(listName => {
        const option = document.createElement('option');
        option.value = listName;
        option.textContent = listName;
        savedListsSelect.appendChild(option);
    });
}

/**
 * Loads a saved list from localStorage
 * @param {string} listName - The name of the list to load
 */
function loadSavedList(listName) {
    if (!listName) return;
    
    const savedLists = JSON.parse(localStorage.getItem('speakerLists') || '{}');
    const listContent = savedLists[listName];
    
    if (listContent) {
        speakerList.value = listContent;
        initializeLists();
    }
}

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
    selectedSpeakerDisplay.style.color = "var(--accent-color)"; // Use CSS variable
    
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
        selectedSpeakerDisplay.style.color = "var(--cta-color)"; // Use CSS variable
        pickSpeakerBtn.disabled = true;
        return;
    }
    
    // Generate a random index
    const randomIndex = Math.floor(Math.random() * speakersAvailable.length);
    
    // Get the speaker at that index
    const selectedSpeaker = speakersAvailable[randomIndex];
    
    // Display the selected speaker
    selectedSpeakerDisplay.textContent = selectedSpeaker;
    selectedSpeakerDisplay.style.color = "var(--accent-color)"; // Use CSS variable
    
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

// Add event listeners for new functionality
csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            handleCSVUpload(file);
        } else {
            alert('Please upload a CSV file');
        }
    }
});

savedListsSelect.addEventListener('change', (e) => {
    loadSavedList(e.target.value);
});

saveListBtn.addEventListener('click', saveCurrentList);

// Initialize saved lists dropdown when page loads
document.addEventListener('DOMContentLoaded', () => {
    updateSavedListsDropdown();
    initializeLists();
    updateTimerDisplay();
});

/**
 * Deletes a saved list from localStorage
 */
function deleteCurrentList() {
    const listName = savedListsSelect.value;
    if (!listName) {
        alert('Please select a list to delete.');
        return;
    }

    if (confirm(`Are you sure you want to delete the list "${listName}"?`)) {
        const savedLists = JSON.parse(localStorage.getItem('speakerLists') || '{}');
        delete savedLists[listName];
        localStorage.setItem('speakerLists', JSON.stringify(savedLists));
        
        // Update the dropdown
        updateSavedListsDropdown();
        
        // Clear the textarea if the deleted list was selected
        if (savedListsSelect.value === '') {
            speakerList.value = '';
            initializeLists();
        }
        
        alert('List deleted successfully!');
    }
}

deleteListBtn.addEventListener('click', deleteCurrentList); 