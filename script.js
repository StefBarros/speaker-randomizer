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
const presentationType = document.getElementById('presentationType');
const addTypeBtn = document.getElementById('addTypeBtn');
const typeInstructions = document.getElementById('typeInstructions');

// Get references to group randomization elements
const groupSizeInput = document.getElementById('groupSize');
const groupCountInput = document.getElementById('groupCount');
const createGroupsBtn = document.getElementById('createGroupsBtn');
const groupResults = document.getElementById('groupResults');

// Initialize arrays and variables
let speakersAvailable = [];
let speakersChosen = [];
let defaultTime = 300;
let timeLeft = defaultTime;
let timerId = null;
let isTimerRunning = false;

/**
 * Manages presentation types in localStorage
 */
const PresentationTypes = {
    // Get all saved types
    getAll: function() {
        return JSON.parse(localStorage.getItem('presentationTypes') || '{}');
    },
    
    // Save a new type
    save: function(name, description, defaultTime) {
        const types = this.getAll();
        types[name] = { description, defaultTime };
        localStorage.setItem('presentationTypes', JSON.stringify(types));
    },
    
    // Get a specific type
    get: function(name) {
        const types = this.getAll();
        return types[name];
    },
    
    // Delete a type
    delete: function(name) {
        const types = this.getAll();
        delete types[name];
        localStorage.setItem('presentationTypes', JSON.stringify(types));
    }
};

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
            
            // Save the current list to storage
            saveCurrentListToStorage();
            
            // Update the saved lists dropdown
            updateSavedListsDropdown();
            
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
 * Loads the current list from localStorage
 */
function loadCurrentList() {
    const savedList = localStorage.getItem('currentList');
    if (savedList) {
        speakerList.value = savedList;
        initializeLists();
    }
}

/**
 * Saves the current list to localStorage
 */
function saveCurrentListToStorage() {
    localStorage.setItem('currentList', speakerList.value);
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
 * Shows the timer end overlay
 */
function showTimerEndOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'timer-end-overlay';
    
    const message = document.createElement('div');
    message.className = 'timer-end-message';
    message.innerHTML = `
        <h2>Time's Up!</h2>
        <button id="continueBtn" class="primary-btn">Continue</button>
    `;
    
    overlay.appendChild(message);
    document.body.appendChild(overlay);
    
    // Play a sound (optional)
    const audio = new Audio('data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=');
    audio.play();
    
    // Handle continue button click
    document.getElementById('continueBtn').addEventListener('click', () => {
        location.reload(); // Refresh the page
    });
}

/**
 * Updates the timer function to use the new overlay
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
                showTimerEndOverlay();
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
 * Calculates possible group sizes based on total number of names
 * @param {number} totalNames - Total number of names available
 * @returns {Array<{size: number, groups: number}>} Array of possible group configurations
 */
function calculateGroupSuggestions(totalNames) {
    const suggestions = [];
    
    // Don't suggest if we have less than 4 names
    if (totalNames < 4) return suggestions;
    
    // Try different group sizes from 2 to 6
    for (let size = 2; size <= 6; size++) {
        const groups = Math.floor(totalNames / size);
        const remainder = totalNames % size;
        
        // Only suggest if we can make at least 2 groups
        if (groups >= 2) {
            suggestions.push({
                size: size,
                groups: groups,
                remainder: remainder
            });
        }
    }
    
    // Sort suggestions by how evenly they divide the total
    return suggestions.sort((a, b) => a.remainder - b.remainder);
}

/**
 * Updates the group suggestions display
 */
function updateGroupSuggestions() {
    const totalNames = parseInt(document.getElementById('nameCount').textContent) || 0;
    const suggestions = calculateGroupSuggestions(totalNames);
    const suggestionsContainer = document.getElementById('groupSuggestions');
    
    if (!suggestionsContainer) return;
    
    suggestionsContainer.innerHTML = '';
    
    if (suggestions.length === 0) {
        suggestionsContainer.innerHTML = '<p>Not enough names for group suggestions</p>';
        return;
    }
    
    suggestions.forEach(suggestion => {
        const button = document.createElement('button');
        button.className = 'suggestion-btn';
        button.innerHTML = `
            ${suggestion.groups} groups of ${suggestion.size}
            ${suggestion.remainder > 0 ? `<br><small>(${suggestion.remainder} extra)</small>` : ''}
        `;
        
        button.addEventListener('click', () => {
            document.getElementById('groupSize').value = suggestion.size;
            document.getElementById('groupCount').value = suggestion.groups;
        });
        
        suggestionsContainer.appendChild(button);
    });
}

/**
 * Updates the name count display
 */
function updateNameCount() {
    const names = speakerList.value
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    
    const nameCountDisplay = document.getElementById('nameCount');
    if (nameCountDisplay) {
        nameCountDisplay.textContent = names.length;
        // Update group suggestions when name count changes
        updateGroupSuggestions();
    }
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
    
    // Update the name count
    updateNameCount();
    
    // Save the current list to storage
    saveCurrentListToStorage();
    
    // Clear the chosen speakers array
    speakersChosen = [];
    
    // Update the count displays
    updateCounts();
    
    // Reset the selected speaker display
    selectedSpeakerDisplay.textContent = "- - -";
    selectedSpeakerDisplay.style.color = "var(--accent-color)";
    
    // Clear the history
    presentationHistory.innerHTML = '';
    
    // Enable/disable buttons based on whether there are speakers available
    if (pickSpeakerBtn) {
        pickSpeakerBtn.disabled = speakersAvailable.length === 0;
    }
    if (resetBtn) {
        resetBtn.disabled = speakersAvailable.length === 0;
    }
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

// Add event listeners for the textarea
if (speakerList) {
    speakerList.addEventListener('input', initializeLists);
}

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
    // Load any saved list
    loadCurrentList();
    
    // Update saved lists dropdown if it exists
    if (savedListsSelect) {
        updateSavedListsDropdown();
    }
    
    // Initialize lists
    initializeLists();
    
    // Update timer display if on main page
    if (minutesDisplay && secondsDisplay) {
        updateTimerDisplay();
    }
    
    // Update presentation types dropdown if on main page
    if (presentationType) {
        updatePresentationTypeDropdown();
    }
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

/**
 * Shows the modal to add a new presentation type
 */
function showAddTypeModal() {
    const overlay = document.createElement('div');
    overlay.className = 'timer-end-overlay'; // Reusing the overlay style
    
    const modal = document.createElement('div');
    modal.className = 'timer-end-message'; // Reusing the message style
    modal.innerHTML = `
        <h2>Add Presentation Type</h2>
        <div style="text-align: left; margin: 20px 0;">
            <div style="margin-bottom: 15px;">
                <label for="typeName">Name:</label><br>
                <input type="text" id="typeName" style="width: 100%; padding: 8px; margin-top: 5px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label for="typeDescription">Description:</label><br>
                <textarea id="typeDescription" rows="4" style="width: 100%; padding: 8px; margin-top: 5px;"></textarea>
            </div>
            <div style="margin-bottom: 15px;">
                <label for="typeTime">Default Time (seconds):</label><br>
                <input type="number" id="typeTime" value="300" style="width: 100%; padding: 8px; margin-top: 5px;">
            </div>
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="saveTypeBtn" class="primary-btn">Save</button>
            <button id="cancelTypeBtn" class="secondary-btn">Cancel</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Handle save
    document.getElementById('saveTypeBtn').addEventListener('click', () => {
        const name = document.getElementById('typeName').value.trim();
        const description = document.getElementById('typeDescription').value.trim();
        const defaultTime = parseInt(document.getElementById('typeTime').value) || 300;
        
        if (!name || !description) {
            alert('Please fill in all fields');
            return;
        }
        
        PresentationTypes.save(name, description, defaultTime);
        updatePresentationTypeDropdown();
        document.body.removeChild(overlay);
    });
    
    // Handle cancel
    document.getElementById('cancelTypeBtn').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
}

/**
 * Updates the presentation type dropdown
 */
function updatePresentationTypeDropdown() {
    // Clear existing options except the first one
    while (presentationType.options.length > 1) {
        presentationType.remove(1);
    }
    
    // Add options for each type
    const types = PresentationTypes.getAll();
    Object.keys(types).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        presentationType.appendChild(option);
    });
}

/**
 * Shows the instructions for the selected presentation type
 */
function showTypeInstructions(typeName) {
    const type = PresentationTypes.get(typeName);
    if (!type) {
        typeInstructions.innerHTML = '';
        return;
    }
    
    typeInstructions.innerHTML = `
        <div class="type-description">
            ${type.description.replace(/\n/g, '<br>')}
        </div>
    `;
    
    // Set the timer to the default time for this type
    setTimer(type.defaultTime);
}

// Add event listeners for presentation type functionality
addTypeBtn.addEventListener('click', showAddTypeModal);
presentationType.addEventListener('change', (e) => showTypeInstructions(e.target.value));

/**
 * Creates random groups from the available speakers
 */
function createRandomGroups() {
    // Get the current list of speakers
    const speakers = speakerList.value
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);

    if (speakers.length === 0) {
        alert('Please enter some names before creating groups.');
        return;
    }

    const groupSize = parseInt(groupSizeInput.value) || 3;
    const numGroups = parseInt(groupCountInput.value) || 1;

    // Validate inputs
    if (groupSize < 2) {
        alert('Group size must be at least 2.');
        return;
    }

    if (numGroups < 1) {
        alert('Number of groups must be at least 1.');
        return;
    }

    const totalNeeded = groupSize * numGroups;
    if (totalNeeded > speakers.length) {
        alert(`Not enough speakers for ${numGroups} groups of ${groupSize}. Need ${totalNeeded} speakers but only have ${speakers.length}.`);
        return;
    }

    // Create a copy of the speakers array and shuffle it
    const shuffledSpeakers = [...speakers].sort(() => Math.random() - 0.5);

    // Create the groups
    const groups = [];
    for (let i = 0; i < numGroups; i++) {
        const groupMembers = shuffledSpeakers.slice(i * groupSize, (i + 1) * groupSize);
        groups.push(groupMembers);
    }

    // Display the groups
    displayGroups(groups);
}

/**
 * Displays the created groups in the UI
 * @param {string[][]} groups - Array of groups, where each group is an array of names
 */
function displayGroups(groups) {
    groupResults.innerHTML = '';
    
    groups.forEach((group, index) => {
        const groupCard = document.createElement('div');
        groupCard.className = 'group-card';
        
        const groupTitle = document.createElement('h3');
        groupTitle.textContent = `Group ${index + 1}`;
        
        const membersList = document.createElement('ul');
        membersList.className = 'group-members';
        
        group.forEach(member => {
            const memberItem = document.createElement('li');
            memberItem.textContent = member;
            membersList.appendChild(memberItem);
        });
        
        groupCard.appendChild(groupTitle);
        groupCard.appendChild(membersList);
        groupResults.appendChild(groupCard);
    });
}

// Add event listener for group creation
createGroupsBtn.addEventListener('click', createRandomGroups); 