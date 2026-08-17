// New Era Command Center - Main Application Logic

// Database constants
const DB_NAME = 'NewEraCommandCenterDB';
const DB_VERSION = 2;
const STORES = {
    PIN: 'pin',
    AGENTS: 'agents',
    NOTES: 'notes',
    BRIEFING: 'briefing',
    WEATHER: 'weather'
};

// UI elements
let lockScreen, pinInput, keypadButtons, pinError;
let homeTab, notesTab, todayTab, settingsTab;
let agentBoard, notesList, briefingText, dateDisplay;
let voiceBtn, voiceBriefingBtn, readBriefingBtn;
let addAgentBtn, addNoteBtn, changePinBtn, aboutBtn;
let skipPinBtn, removePinBtn, stayUnlockedToggle;
let bottomNavButtons;
let toastContainer;
let weatherIcon, weatherTemp, weatherLoc, weatherCond, weatherEdit;
let weatherModal, useGpsBtn, weatherCity, weatherCancel, weatherSave;
let weatherFeels, weatherExtra;
let wgWind, wgHum, wgVis, wgPres, wgUv, wgDew;

// State
let isUnlocked = false;
let currentTab = 'home';

// Initialize the app
async function init() {
    cacheElements();
    await initDatabase();
    await checkFirstLaunch();
    setupEventListeners();
    renderDate();
    switchTab(currentTab);
    bindInactivityReset();
    await loadSettings();
}

// Cache DOM elements
function cacheElements() {
    lockScreen = document.getElementById('lock-screen');
    pinInput = document.createElement('input');
    pinInput.type = 'password';
    pinInput.id = 'pin-input';
    // We'll build the keypad manually, so we don't need an input field in the HTML for now
    // Instead, we'll handle PIN input via button clicks
    
    keypadButtons = document.querySelectorAll('.keypad-btn');
    pinError = document.getElementById('pin-error');
    
    homeTab = document.getElementById('home');
    notesTab = document.getElementById('notes');
    todayTab = document.getElementById('today');
    settingsTab = document.getElementById('settings');
    
    agentBoard = document.getElementById('agent-board');
    notesList = document.getElementById('notes-list');
    briefingText = document.getElementById('briefing-text');
    dateDisplay = document.getElementById('date-display');
    
    voiceBtn = document.getElementById('voice-btn');
    voiceBriefingBtn = document.getElementById('voice-briefing-btn');
    readBriefingBtn = document.getElementById('read-briefing-btn');
    
    addAgentBtn = document.getElementById('add-agent-btn');
    addNoteBtn = document.getElementById('add-note-btn');
    changePinBtn = document.getElementById('change-pin-btn');
    aboutBtn = document.getElementById('about-btn');
    skipPinBtn = document.getElementById('skip-pin-btn');
    removePinBtn = document.getElementById('remove-pin-btn');
    stayUnlockedToggle = document.getElementById('stay-unlocked-toggle');
    
    weatherIcon = document.getElementById('weather-icon');
    weatherTemp = document.getElementById('weather-temp');
    weatherLoc = document.getElementById('weather-loc');
    weatherCond = document.getElementById('weather-cond');
    weatherEdit = document.getElementById('weather-edit');
    weatherModal = document.getElementById('weather-modal');
    useGpsBtn = document.getElementById('use-gps-btn');
    weatherCity = document.getElementById('weather-city');
    weatherCancel = document.getElementById('weather-cancel');
    weatherSave = document.getElementById('weather-save');
    weatherFeels = document.getElementById('weather-feels');
    weatherExtra = document.getElementById('weather-extra');
    wgWind = document.getElementById('wg-wind');
    wgHum = document.getElementById('wg-hum');
    wgVis = document.getElementById('wg-vis');
    wgPres = document.getElementById('wg-pres');
    wgUv = document.getElementById('wg-uv');
    wgDew = document.getElementById('wg-dew');
    
    bottomNavButtons = document.querySelectorAll('.nav-btn');
    toastContainer = document.getElementById('toast-container');
    
    // Add pin input to lock screen
    const lockContent = document.querySelector('.lock-content');
    lockContent.insertBefore(pinInput, lockContent.firstChild);
}

// Initialize IndexedDB
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object stores
            if (!db.objectStoreNames.contains(STORES.PIN)) {
                db.createObjectStore(STORES.PIN, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.AGENTS)) {
                const agentStore = db.createObjectStore(STORES.AGENTS, { keyPath: 'id', autoIncrement: true });
                agentStore.createIndex('name', 'name', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORES.NOTES)) {
                const noteStore = db.createObjectStore(STORES.NOTES, { keyPath: 'id', autoIncrement: true });
                noteStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORES.BRIEFING)) {
                db.createObjectStore(STORES.BRIEFING, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.WEATHER)) {
                db.createObjectStore(STORES.WEATHER, { keyPath: 'id' });
            }
        };
        
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Open the DB as a real Promise. NOTE: indexedDB.open() returns an IDBRequest,
// NOT a Promise — `await indexedDB.open(...)` would give you the request object.
// Always go through this helper.
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORES.PIN)) db.createObjectStore(STORES.PIN, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(STORES.AGENTS)) {
                const s = db.createObjectStore(STORES.AGENTS, { keyPath: 'id', autoIncrement: true });
                s.createIndex('name', 'name', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORES.NOTES)) {
                const s = db.createObjectStore(STORES.NOTES, { keyPath: 'id', autoIncrement: true });
                s.createIndex('timestamp', 'timestamp', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORES.BRIEFING)) db.createObjectStore(STORES.BRIEFING, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(STORES.WEATHER)) db.createObjectStore(STORES.WEATHER, { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Check if it's first launch (no PIN set)
async function checkFirstLaunch() {
    const stay = await getStayUnlocked();
    const skipped = await getPinSkipped();
    const db = await openDB();
    const transaction = db.transaction(STORES.PIN, 'readonly');
    const store = transaction.objectStore(STORES.PIN);
    const request = store.get(1); // We'll use id=1 for the PIN record
    
    return new Promise((resolve) => {
        request.onsuccess = () => {
            if (request.result) {
                // PIN exists. If "stay unlocked" is on, skip the lock entirely.
                if (stay) {
                    hideLockScreen();
                } else {
                    showLockScreen();
                }
            } else if (skipped) {
                // User chose "Skip for now" earlier — never nag again.
                hideLockScreen();
            } else {
                // Never set up and never skipped — offer the optional setup once.
                showPinSetup();
            }
            resolve();
        };
    });
}

// Show lock screen for PIN entry
function showLockScreen() {
    lockScreen.style.display = 'flex';
    pinInput.value = '';
    pinInput.focus();
    pinError.textContent = '';
    if (skipPinBtn) skipPinBtn.style.display = 'none';
}

// Show PIN setup screen (optional — has a Skip button)
function showPinSetup() {
    lockScreen.style.display = 'flex';
    pinInput.placeholder = 'Set a new PIN (4-6 digits)';
    pinInput.value = '';
    pinInput.focus();
    pinError.textContent = '';
    
    const lockContent = document.querySelector('.lock-content');
    const h2 = lockContent.querySelector('h2');
    h2.textContent = 'Set Up Your PIN (optional)';
    if (skipPinBtn) skipPinBtn.style.display = 'block';
}

// Hide lock screen
function hideLockScreen() {
    lockScreen.style.display = 'none';
    isUnlocked = true;
    // Load data after unlock
    loadAgents();
    loadNotes();
    loadBriefing();
    loadWeather();
    resetInactivityTimer();
}

// ========== SETTINGS & INACTIVITY LOCK (glove-friendly) ==========

// "Stay unlocked on this phone" flag is stored in the PIN store under id=2.
async function getStayUnlocked() {
    const db = await openDB();
    const transaction = db.transaction(STORES.PIN, 'readonly');
    const store = transaction.objectStore(STORES.PIN);
    const request = store.get(2);
    return new Promise((resolve) => {
        request.onsuccess = () => resolve(!!(request.result && request.result.stayUnlocked));
    });
}

async function setStayUnlocked(val) {
    const db = await openDB();
    const transaction = db.transaction(STORES.PIN, 'readwrite');
    const store = transaction.objectStore(STORES.PIN);
    store.put({ id: 2, stayUnlocked: !!val });
    return transaction.complete;
}

async function removePin() {
    const db = await openDB();
    const transaction = db.transaction(STORES.PIN, 'readwrite');
    const store = transaction.objectStore(STORES.PIN);
    store.delete(1);
    return transaction.complete;
}

// Remember whether the user chose "Skip for now" on the optional PIN setup, so
// we never re-prompt them on every open (glove-friendly). Stored under id=3.
async function getPinSkipped() {
    const db = await openDB();
    const transaction = db.transaction(STORES.PIN, 'readonly');
    const store = transaction.objectStore(STORES.PIN);
    const request = store.get(3);
    return new Promise((resolve) => {
        request.onsuccess = () => resolve(!!(request.result && request.result.pinSkipped));
    });
}

async function setPinSkipped(val) {
    const db = await openDB();
    const transaction = db.transaction(STORES.PIN, 'readwrite');
    const store = transaction.objectStore(STORES.PIN);
    if (val) store.put({ id: 3, pinSkipped: true });
    else store.delete(3);
    return transaction.complete;
}

// Auto-lock after inactivity (default 15 min), unless "stay unlocked" is on.
let inactivityTimer = null;
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(async () => {
        if (!isUnlocked) return;
        const stay = await getStayUnlocked();
        if (!stay) {
            isUnlocked = false;
            showLockScreen();
        }
    }, INACTIVITY_TIMEOUT);
}

function bindInactivityReset() {
    ['click', 'keydown', 'touchstart', 'scroll'].forEach(evt =>
        document.addEventListener(evt, resetInactivityTimer, { passive: true })
    );
}

async function loadSettings() {
    stayUnlockedToggle.checked = await getStayUnlocked();
    const db = await openDB();
    const transaction = db.transaction(STORES.PIN, 'readonly');
    const store = transaction.objectStore(STORES.PIN);
    const request = store.get(1);
    request.onsuccess = () => {
        removePinBtn.style.display = request.result ? 'block' : 'none';
    };
}

// Validate PIN (4-6 digits)
function validatePin(pin) {
    return /^\d{4,6}$/.test(pin);
}

// Hash PIN using SHA-256
async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Verify entered PIN against stored hash
async function verifyPin(enteredPin) {
    const db = await openDB();
    const transaction = db.transaction(STORES.PIN, 'readonly');
    const store = transaction.objectStore(STORES.PIN);
    const request = store.get(1);
    
    return new Promise((resolve) => {
        request.onsuccess = async () => {
            if (!request.result) {
                resolve(false);
                return;
            }
            const storedHash = request.result.hash;
            const enteredHash = await hashPin(enteredPin);
            resolve(storedHash === enteredHash);
        };
    });
}

// Save PIN hash
async function savePin(pin) {
    const pinHash = await hashPin(pin);
    const db = await openDB();
    const transaction = db.transaction(STORES.PIN, 'readwrite');
    const store = transaction.objectStore(STORES.PIN);
    store.put({ id: 1, hash: pinHash });
    
    return transaction.complete;
}

// Setup event listeners
function setupEventListeners() {
    // Keypad buttons
    keypadButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (pinError.textContent) pinError.textContent = '';
            
            if (button.id === 'backspace-btn') {
                pinInput.value = pinInput.value.slice(0, -1);
            } else {
                pinInput.value += button.textContent;
            }
            
            // Auto-validate when 4-6 digits entered
            if (pinInput.value.length >= 4 && pinInput.value.length <= 6) {
                const pin = pinInput.value;
                if (validatePin(pin)) {
                    handlePinSubmit(pin);
                } else {
                    pinError.textContent = 'PIN must be 4-6 digits';
                }
            }
        });
    });
    
    // Bottom navigation
    bottomNavButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            switchTab(tab);
        });
    });
    
    // FAB buttons
    addAgentBtn.addEventListener('click', () => {
        showAgentForm();
    });
    
    addNoteBtn.addEventListener('click', () => {
        showNoteForm();
    });
    
    changePinBtn.addEventListener('click', () => {
        showChangePinForm();
    });
    
    aboutBtn.addEventListener('click', () => {
        showAbout();
    });

    // Skip setting a PIN (first-run)
    skipPinBtn.addEventListener('click', async () => {
        await setPinSkipped(true);
        hideLockScreen();
        showToast('No passcode set — add one anytime in Settings');
    });

    // Remove the passcode entirely
    removePinBtn.addEventListener('click', async () => {
        if (confirm('Remove the passcode? The app will stop asking for one.')) {
            await removePin();
            await setPinSkipped(true);
            stayUnlockedToggle.checked = false;
            await setStayUnlocked(false);
            removePinBtn.style.display = 'none';
            showToast('Passcode removed');
        }
    });

    // Stay-unlocked toggle
    stayUnlockedToggle.addEventListener('change', async () => {
        await setStayUnlocked(stayUnlockedToggle.checked);
        showToast(stayUnlockedToggle.checked ? 'Staying unlocked on this phone' : 'Will lock after 15 min idle');
        loadSettings();
    });
    
    // Voice buttons
    voiceBtn.addEventListener('click', () => {
        toggleVoiceInput();
    });
    
    voiceBriefingBtn.addEventListener('click', () => {
        readBriefingAloud();
    });
    
    readBriefingBtn.addEventListener('click', () => {
        readBriefingAloud();
    });

    // Weather
    weatherEdit.addEventListener('click', openWeatherModal);
    weatherCancel.addEventListener('click', closeWeatherModal);
    weatherSave.addEventListener('click', saveTypedCity);
    useGpsBtn.addEventListener('click', useGPS);
}

// Handle PIN submission (for unlock or setup)
async function handlePinSubmit(pin) {
    if (!validatePin(pin)) {
        pinError.textContent = 'PIN must be 4-6 digits';
        return;
    }
    
    // Check if we're in setup mode (no PIN yet)
    const db = await openDB();
    const transaction = db.transaction(STORES.PIN, 'readonly');
    const store = transaction.objectStore(STORES.PIN);
    const request = store.get(1);
    
    const result = await new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result);
    });
    
    if (!result) {
        // Setting up PIN for the first time
        await savePin(pin);
        await setPinSkipped(false);
        showToast('PIN set successfully');
        hideLockScreen();
        // Reset placeholder
        pinInput.placeholder = 'Enter PIN';
        const lockContent = document.querySelector('.lock-content');
        const h2 = lockContent.querySelector('h2');
        h2.textContent = 'Enter PIN';
    } else {
        // Verifying PIN to unlock
        const isValid = await verifyPin(pin);
        if (isValid) {
            showToast('Unlocked');
            hideLockScreen();
        } else {
            pinError.textContent = 'Incorrect PIN';
            pinInput.value = '';
            pinInput.focus();
        }
    }
}

// Switch tab
function switchTab(tabId) {
    // Hide all tabs
    homeTab.classList.remove('active');
    notesTab.classList.remove('active');
    todayTab.classList.remove('active');
    settingsTab.classList.remove('active');
    
    // Remove active from all nav buttons
    bottomNavButtons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    switch(tabId) {
        case 'home':
            homeTab.classList.add('active');
            break;
        case 'notes':
            notesTab.classList.add('active');
            break;
        case 'today':
            todayTab.classList.add('active');
            break;
        case 'settings':
            settingsTab.classList.add('active');
            break;
    }
    
    // Activate corresponding nav button
    const activeBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    currentTab = tabId;
    
    // Refresh data if needed
    if (tabId === 'home') {
        loadAgents();
        loadWeather();
    } else if (tabId === 'notes') {
        loadNotes();
    } else if (tabId === 'today') {
        loadBriefing();
    } else if (tabId === 'settings') {
        loadSettings();
    }
}

// Render current date
function renderDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = now.toLocaleDateString(undefined, options);
}

// ========== AGENT MANAGEMENT ==========

// Load agents from database and render
async function loadAgents() {
    const db = await openDB();
    const transaction = db.transaction(STORES.AGENTS, 'readonly');
    const store = transaction.objectStore(STORES.AGENTS);
    const request = store.getAll();
    
    agentBoard.innerHTML = ''; // Clear
    
    request.onsuccess = () => {
        const agents = request.result;
        if (agents.length === 0) {
            // Pre-populate with default agents
            const defaultAgents = [
                { name: 'Arke', role: 'Orchestrator', status: 'Online', note: 'Ready' },
                { name: 'Iris', role: 'Lead Agent', status: 'Idle', note: 'Monitoring' },
                { name: 'Clover', role: 'Ops', status: 'Online', note: 'Active' },
                { name: 'Lexi', role: 'Records', status: 'Offline', note: 'Synced' },
                { name: 'Scout', role: 'Research', status: 'Idle', note: 'Ready' },
                { name: 'Venture', role: 'Startup', status: 'Online', note: 'Deployed' }
            ];
            
            // Add default agents to DB
            defaultAgents.forEach(async (agent) => {
                await addAgentToDB(agent);
            });
            
            // Reload
            loadAgents();
            return;
        }
        
        agents.forEach(agent => {
            const agentCard = createAgentCard(agent);
            agentBoard.appendChild(agentCard);
        });
    };
}

// Create agent card element
function createAgentCard(agent) {
    const card = document.createElement('div');
    card.className = 'agent-card';
    card.dataset.id = agent.id;
    
    const statusClass = `status-${agent.status.toLowerCase()}`;
    
    card.innerHTML = `
        <h3>${agent.name}</h3>
        <div class="role">${agent.role}</div>
        <div class="status-pill ${statusClass}">${agent.status}</div>
        <div class="note">${agent.note || ''}</div>
    `;
    
    // Make card tappable to edit
    card.addEventListener('click', () => {
        showAgentForm(agent);
    });
    
    return card;
}

// Add agent to database
async function addAgentToDB(agentData) {
    const db = await openDB();
    const transaction = db.transaction(STORES.AGENTS, 'readwrite');
    const store = transaction.objectStore(STORES.AGENTS);
    store.add(agentData);
    return transaction.complete;
}

// Update agent in database
async function updateAgentInDB(id, updates) {
    const db = await openDB();
    const transaction = db.transaction(STORES.AGENTS, 'readwrite');
    const store = transaction.objectStore(STORES.AGENTS);
    const request = store.get(id);
    
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const agent = request.result;
            if (!agent) {
                reject('Agent not found');
                return;
            }
            Object.assign(agent, updates);
            store.put(agent);
            transaction.complete.then(resolve).catch(reject);
        };
        request.onerror = () => reject(request.error);
    });
}

// Delete agent from database
async function deleteAgentFromDB(id) {
    const db = await openDB();
    const transaction = db.transaction(STORES.AGENTS, 'readwrite');
    const store = transaction.objectStore(STORES.AGENTS);
    store.delete(id);
    return transaction.complete;
}

// Show agent form (for add/edit)
function showAgentForm(agentToEdit = null) {
    const isEdit = !!agentToEdit;
    
    // Create form overlay
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
        <div class="lock-content" style="width: 90%; max-width: 400px;">
            <h2>${isEdit ? 'Edit Agent' : 'Add Agent'}</h2>
            <div class="form-group">
                <label for="agent-name">Name:</label>
                <input type="text" id="agent-name" placeholder="Agent name" value="${agentToEdit ? agentToEdit.name : ''}">
            </div>
            <div class="form-group">
                <label for="agent-role">Role:</label>
                <input type="text" id="agent-role" placeholder="Agent role" value="${agentToEdit ? agentToEdit.role : ''}">
            </div>
            <div class="form-group">
                <label for="agent-status">Status:</label>
                <select id="agent-status">
                    <option value="Online" ${agentToEdit && agentToEdit.status === 'Online' ? 'selected' : ''}>Online</option>
                    <option value="Idle" ${agentToEdit && agentToEdit.status === 'Idle' ? 'selected' : ''}>Idle</option>
                    <option value="Offline" ${agentToEdit && agentToEdit.status === 'Offline' ? 'selected' : ''}>Offline</option>
                </select>
            </div>
            <div class="form-group">
                <label for="agent-note">Note:</label>
                <textarea id="agent-note" placeholder="Short note">${agentToEdit ? agentToEdit.note : ''}</textarea>
            </div>
            <div class="form-actions">
                <button id="form-cancel">Cancel</button>
                <button id="form-save">${isEdit ? 'Update' : 'Add'}</button>
            </div>
        </div>
    `;
    
    // Add styles for form-group
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    document.body.appendChild(overlay);
    
    // Add CSS for form elements (inline for simplicity)
    const style = document.createElement('style');
    style.textContent = `
        .form-group { margin: 1rem 0; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
        .form-group input, .form-group select, .form-group textarea {
            width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;
            font-family: inherit; font-size: 0.9rem;
        }
        .form-group textarea { height: 80px; resize: vertical; }
        .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
        .form-actions button {
            flex: 1; padding: 0.75rem; border: none; border-radius: 4px;
            cursor: pointer; font-size: 0.9rem;
        }
        #form-cancel { background-color: #757575; color: white; }
        #form-save { background-color: var(--primary-dark); color: white; }
    `;
    document.head.appendChild(style);
    
    // Form event listeners
    const formCancel = overlay.querySelector('#form-cancel');
    const formSave = overlay.querySelector('#form-save');
    const agentName = overlay.querySelector('#agent-name');
    const agentRole = overlay.querySelector('#agent-role');
    const agentStatus = overlay.querySelector('#agent-status');
    const agentNote = overlay.querySelector('#agent-note');
    
    formCancel.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.head.removeChild(style);
    });
    
    formSave.addEventListener('click', async () => {
        const name = agentName.value.trim();
        const role = agentRole.value.trim();
        const status = agentStatus.value;
        const note = agentNote.value.trim();
        
        if (!name || !role) {
            showToast('Name and role are required');
            return;
        }
        
        const agentData = { name, role, status, note };
        
        if (isEdit) {
            await updateAgentInDB(agentToEdit.id, agentData);
            showToast('Agent updated');
        } else {
            await addAgentToDB(agentData);
            showToast('Agent added');
        }
        
        document.body.removeChild(overlay);
        document.head.removeChild(style);
        loadAgents(); // Refresh
    });
}

// ========== NOTE MANAGEMENT ==========

// Load notes from database and render
async function loadNotes() {
    const db = await openDB();
    const transaction = db.transaction(STORES.NOTES, 'readonly');
    const store = transaction.objectStore(STORES.NOTES);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev'); // Descending order
    
    notesList.innerHTML = ''; // Clear
    
    request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
            const note = cursor.value;
            const noteElement = createNoteElement(note);
            notesList.appendChild(noteElement);
            cursor.continue();
        } else if (notesList.children.length === 0) {
            // Show empty state
            const emptyState = document.createElement('div');
            emptyState.style.textAlign = 'center';
            emptyState.style.padding = '2rem';
            emptyState.style.color = '#757575';
            emptyState.textContent = 'No notes yet — tap the mic to add one';
            notesList.appendChild(emptyState);
        }
    };
}

// Create note element
function createNoteElement(note) {
    const div = document.createElement('div');
    div.className = 'note-item';
    div.dataset.id = note.id;
    
    const date = new Date(note.timestamp);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    div.innerHTML = `
        <div class="timestamp">${timeString}</div>
        <div class="content">${note.content}</div>
        <div class="actions">
            <button class="read-btn">Read Aloud</button>
            <button class="delete-btn">Delete</button>
        </div>
    `;
    
    // Read aloud button
    const readBtn = div.querySelector('.read-btn');
    readBtn.addEventListener('click', () => {
        speechSynthesis.cancel(); // Cancel any current speech
        const utterance = new SpeechSynthesisUtterance(note.content);
        utterance.voice = getPreferredVoice();
        speechSynthesis.speak(utterance);
    });
    
    // Delete button
    const deleteBtn = div.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async () => {
        if (confirm('Delete this note?')) {
            await deleteNoteFromDB(note.id);
            loadNotes();
            showToast('Note deleted');
        }
    });
    
    return div;
}

// Add note to database
async function addNoteToDB(noteData) {
    const db = await openDB();
    const transaction = db.transaction(STORES.NOTES, 'readwrite');
    const store = transaction.objectStore(STORES.NOTES);
    store.add(noteData);
    return transaction.complete;
}

// Delete note from database
async function deleteNoteFromDB(id) {
    const db = await openDB();
    const transaction = db.transaction(STORES.NOTES, 'readwrite');
    const store = transaction.objectStore(STORES.NOTES);
    store.delete(id);
    return transaction.complete;
}

// Show note form (for voice or text input)
function showNoteForm(initialContent = '') {
    // Create form overlay
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
        <div class="lock-content" style="width: 90%; max-width: 400px;">
            <h2>New Note</h2>
            <div class="form-group">
                <label for="note-content">Note:</label>
                <textarea id="note-content" placeholder="Type your note or use voice input">${initialContent}</textarea>
            </div>
            <div class="form-actions">
                <button id="form-cancel">Cancel</button>
                <button id="form-save">Save</button>
            </div>
        </div>
    `;
    
    // Add styles for form-group (same as agent form)
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    document.body.appendChild(overlay);
    
    // Reuse the style from agent form or create new
    let style = document.querySelector('#form-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'form-style';
        style.textContent = `
            .form-group { margin: 1rem 0; }
            .form-group label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
            .form-group input, .form-group select, .form-group textarea {
                width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;
                font-family: inherit; font-size: 0.9rem;
            }
            .form-group textarea { height: 100px; resize: vertical; }
            .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
            .form-actions button {
                flex: 1; padding: 0.75rem; border: none; border-radius: 4px;
                cursor: pointer; font-size: 0.9rem;
            }
            #form-cancel { background-color: #757575; color: white; }
            #form-save { background-color: var(--primary-dark); color: white; }
        `;
        document.head.appendChild(style);
    }
    
    // Form event listeners
    const formCancel = overlay.querySelector('#form-cancel');
    const formSave = overlay.querySelector('#form-save');
    const noteContent = overlay.querySelector('#note-content');
    
    formCancel.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    formSave.addEventListener('click', async () => {
        const content = noteContent.value.trim();
        if (!content) {
            showToast('Note cannot be empty');
            return;
        }
        
        const noteData = {
            content,
            timestamp: new Date().toISOString()
        };
        
        await addNoteToDB(noteData);
        loadNotes();
        showToast('Note saved');
        
        document.body.removeChild(overlay);
    });
    
    // Focus on textarea
    noteContent.focus();
}

// ========== BRIEFING MANAGEMENT ==========

// Load briefing from database
async function loadBriefing() {
    const db = await openDB();
    const transaction = db.transaction(STORES.BRIEFING, 'readonly');
    const store = transaction.objectStore(STORES.BRIEFING);
    const request = store.get(1); // We'll use id=1 for the briefing
    
    request.onsuccess = () => {
        if (request.result) {
            briefingText.value = request.result.content || '';
        } else {
            briefingText.value = ''; // Empty by default
        }
    };
}

// Save briefing to database
async function saveBriefing(content) {
    const db = await openDB();
    const transaction = db.transaction(STORES.BRIEFING, 'readwrite');
    const store = transaction.objectStore(STORES.BRIEFING);
    store.put({ id: 1, content });
    return transaction.complete;
}

// Read briefing aloud
function readBriefingAloud() {
    const content = briefingText.value.trim();
    if (!content) {
        showToast('Briefing is empty');
        return;
    }
    
    speechSynthesis.cancel(); // Cancel any current speech
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.voice = getPreferredVoice();
    speechSynthesis.speak(utterance);
    showToast('Reading briefing');
}

// ========== VOICE INPUT ==========

// Toggle voice input for notes
let recognition = null;
let isListening = false;

function toggleVoiceInput() {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        showToast('Voice input not supported in this browser');
        return;
    }
    
    if (isListening) {
        stopVoiceInput();
    } else {
        startVoiceInput();
    }
}

function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
        isListening = true;
        updateVoiceButton(true);
        showToast('Listening...');
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        // Insert transcript into note form if open, or briefing if that's active
        if (currentTab === 'notes') {
            // We'll show the note form with the transcript
            showNoteForm(transcript);
        } else {
            // Otherwise, insert into briefing
            briefingText.value += (briefingText.value ? ' ' : '') + transcript;
            showToast('Voice input added to briefing');
        }
    };
    
    recognition.onerror = (event) => {
        showToast('Voice input error: ' + event.error);
    };
    
    recognition.onend = () => {
        isListening = false;
        updateVoiceButton(false);
    };
    
    recognition.start();
}

function stopVoiceInput() {
    if (recognition) {
        recognition.stop();
    }
}

function updateVoiceButton(listening) {
    if (listening) {
        voiceBtn.style.backgroundColor = '#d32f2f';
        voiceBtn.textContent = '⏹';
    } else {
        voiceBtn.style.backgroundColor = '#1B5E20';
        voiceBtn.textContent = '🎙️';
    }
}

// Get preferred voice for speech synthesis
function getPreferredVoice() {
    const voices = speechSynthesis.getVoices();
    // Prefer a female English voice if available
    const preferred = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.includes('Female') || v.name.includes('Woman') || v.name.includes('Girl'))
    );
    return preferred || voices[0];
}

// Load voices when available
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
        // Voices loaded
    };
}

// ========== WEATHER (free, no key — Open-Meteo) ==========

const WEATHER_CODE = {
    0: '☀️ Clear', 1: '🌤️ Mainly clear', 2: '⛅ Partly cloudy', 3: '☁️ Overcast',
    45: '🌫️ Fog', 48: '🌫️ Fog',
    51: '🌦️ Drizzle', 53: '🌦️ Drizzle', 55: '🌦️ Drizzle', 56: '🌧️ Freezing drizzle', 57: '🌧️ Freezing drizzle',
    61: '🌧️ Light rain', 63: '🌧️ Rain', 65: '🌧️ Heavy rain', 66: '🌧️ Freezing rain', 67: '🌧️ Freezing rain',
    71: '🌨️ Light snow', 73: '🌨️ Snow', 75: '❄️ Heavy snow', 77: '❄️ Snow grains',
    80: '🌦️ Showers', 81: '🌦️ Showers', 82: '⛈️ Heavy showers',
    85: '🌨️ Snow showers', 86: '🌨️ Heavy snow showers',
    95: '⛈️ Thunderstorm', 96: '⛈️ Thunderstorm', 99: '⛈️ Severe thunderstorm'
};

async function getWeatherLoc() {
    const db = await openDB();
    const tx = db.transaction(STORES.WEATHER, 'readonly');
    const store = tx.objectStore(STORES.WEATHER);
    const req = store.get(1);
    return new Promise(res => { req.onsuccess = () => res(req.result || null); });
}

async function setWeatherLoc(loc) {
    const db = await openDB();
    const tx = db.transaction(STORES.WEATHER, 'readwrite');
    const store = tx.objectStore(STORES.WEATHER);
    store.put({ id: 1, lat: loc.lat, lon: loc.lon, name: loc.name || '' });
    return tx.complete;
}

async function loadWeather() {
    const loc = await getWeatherLoc();
    if (!loc) { showWeatherPlaceholder(); return; }
    weatherLoc.textContent = loc.name || 'My location';
    await fetchWeather(loc.lat, loc.lon);
}

function showWeatherPlaceholder() {
    weatherIcon.textContent = '🌤️';
    weatherTemp.textContent = '--°';
    weatherLoc.textContent = 'Tap ⚙️ to set location';
    weatherCond.textContent = '--';
    weatherFeels.textContent = 'Feels like --°';
    wgWind.textContent = '--'; wgHum.textContent = '--'; wgVis.textContent = '--';
    wgPres.textContent = '--'; wgUv.textContent = '--'; wgDew.textContent = '--';
    weatherExtra.textContent = '';
}

function windDir(deg) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
}

async function fetchWeather(lat, lon) {
    try {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
            '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,visibility,surface_pressure,dew_point_2m' +
            '&daily=temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset,precipitation_probability_max' +
            '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1';
        const r = await fetch(url);
        const d = await r.json();
        const cur = d.current, day = d.daily;
        const entry = WEATHER_CODE[cur.weather_code] || '☁️ Weather';
        const sp = entry.indexOf(' ');
        weatherIcon.textContent = entry.slice(0, sp);
        weatherCond.textContent = entry.slice(sp + 1);
        weatherTemp.textContent = Math.round(cur.temperature_2m) + '°';
        weatherFeels.textContent = 'Feels like ' + Math.round(cur.apparent_temperature) + '°';
        wgWind.textContent = Math.round(cur.wind_speed_10m) + ' mph ' + windDir(cur.wind_direction_10m);
        wgHum.textContent = Math.round(cur.relative_humidity_2m) + '%';
        const visMi = cur.visibility / 1609.34;
        wgVis.textContent = visMi >= 10 ? '10+ mi' : visMi.toFixed(1) + ' mi';
        wgPres.textContent = (cur.surface_pressure / 33.8639).toFixed(2) + ' inHg';
        wgUv.textContent = Math.round(day.uv_index_max[0]) + ' UV';
        wgDew.textContent = Math.round(cur.dew_point_2m) + '°';
        const fmt = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        let extra = '🌅 ' + fmt(day.sunrise[0]) + ' · 🌇 ' + fmt(day.sunset[0]);
        if (day.precipitation_probability_max && day.precipitation_probability_max[0] != null) {
            extra += ' · 🌧️ ' + Math.round(day.precipitation_probability_max[0]) + '%';
        }
        weatherExtra.textContent = extra;
    } catch (e) {
        weatherCond.textContent = 'Weather unavailable offline';
    }
}

function openWeatherModal() { weatherModal.style.display = 'flex'; weatherCity.value = ''; weatherCity.focus(); }
function closeWeatherModal() { weatherModal.style.display = 'none'; }

function useGPS() {
    if (!navigator.geolocation) { showToast('GPS not supported on this device'); return; }
    showToast('Getting your location...');
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        await setWeatherLoc({ lat, lon, name: 'My location' });
        closeWeatherModal();
        weatherLoc.textContent = 'My location';
        await fetchWeather(lat, lon);
        showToast('Weather set to your location');
    }, () => { showToast('Could not get GPS location'); }, { enableHighAccuracy: false, timeout: 10000 });
}

async function saveTypedCity() {
    const q = weatherCity.value.trim();
    if (!q) { showToast('Enter a city'); return; }
    try {
        const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=1&language=en&format=json');
        const d = await r.json();
        if (!d.results || d.results.length === 0) { showToast('City not found'); return; }
        const res = d.results[0];
        const name = [res.name, res.admin1, res.country_code].filter(Boolean).join(', ');
        await setWeatherLoc({ lat: res.latitude, lon: res.longitude, name });
        closeWeatherModal();
        weatherLoc.textContent = name;
        await fetchWeather(res.latitude, res.longitude);
        showToast('Weather updated');
    } catch (e) { showToast('Could not find that city'); }
}

// ========== UTILITIES ==========

// Show toast message
function showToast(message) {
    // Remove any existing toasts
    const existingToasts = toastContainer.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Show change PIN form
function showChangePinForm() {
    // Create form overlay
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
        <div class="lock-content" style="width: 90%; max-width: 400px;">
            <h2>Change PIN</h2>
            <div class="form-group">
                <label for="current-pin">Current PIN:</label>
                <input type="password" id="current-pin" placeholder="Enter current PIN">
            </div>
            <div class="form-group">
                <label for="new-pin">New PIN:</label>
                <input type="password" id="new-pin" placeholder="Enter new PIN (4-6 digits)">
            </div>
            <div class="form-group">
                <label for="confirm-pin">Confirm PIN:</label>
                <input type="password" id="confirm-pin" placeholder="Confirm new PIN">
            </div>
            <div class="form-actions">
                <button id="form-cancel">Cancel</button>
                <button id="form-save">Save Changes</button>
            </div>
        </div>
    `;
    
    // Add styles
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    document.body.appendChild(overlay);
    
    // Reuse form style
    let style = document.querySelector('#form-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'form-style';
        style.textContent = `
            .form-group { margin: 1rem 0; }
            .form-group label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
            .form-group input, .form-group select, .form-group textarea {
                width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;
                font-family: inherit; font-size: 0.9rem;
            }
            .form-group textarea { height: 100px; resize: vertical; }
            .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
            .form-actions button {
                flex: 1; padding: 0.75rem; border: none; border-radius: 4px;
                cursor: pointer; font-size: 0.9rem;
            }
            #form-cancel { background-color: #757575; color: white; }
            #form-save { background-color: var(--primary-dark); color: white; }
        `;
        document.head.appendChild(style);
    }
    
    // Form event listeners
    const formCancel = overlay.querySelector('#form-cancel');
    const formSave = overlay.querySelector('#form-save');
    const currentPin = overlay.querySelector('#current-pin');
    const newPin = overlay.querySelector('#new-pin');
    const confirmPin = overlay.querySelector('#confirm-pin');
    
    formCancel.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.head.removeChild(style);
    });
    
    formSave.addEventListener('click', async () => {
        const current = currentPin.value;
        const newPinVal = newPin.value;
        const confirm = confirmPin.value;
        
        if (!current) {
            showToast('Please enter current PIN');
            return;
        }
        
        const isValid = await verifyPin(current);
        if (!isValid) {
            showToast('Current PIN is incorrect');
            return;
        }
        
        if (!validatePin(newPinVal)) {
            showToast('New PIN must be 4-6 digits');
            return;
        }
        
        if (newPinVal !== confirm) {
            showToast('New PINs do not match');
            return;
        }
        
        await savePin(newPinVal);
        showToast('PIN changed successfully');
        document.body.removeChild(overlay);
        document.head.removeChild(style);
        
        // Require unlock again with new PIN
        showLockScreen();
    });
}

// Show about dialog
function showAbout() {
    alert('New Era Command Center v1.0\\n\\nAn offline-first PWA for managing your business.\\n\\nFeatures:\\n- Secure passcode lock\\n- Agent status board\\n- Voice input/output\\n- Command pad\\n- Today briefing\\n\\nAll data stored locally on your device.');
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);