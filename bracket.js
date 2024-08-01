document.addEventListener('DOMContentLoaded', () => {
    const bracketContainer = document.getElementById('bracketContainer');
    const adminPanel = document.getElementById('admin-panel');
    const adminLoginButton = document.getElementById('admin-login-button');
    const adminPassword = document.getElementById('admin-password');
    const adminMessage = document.getElementById('admin-message');
    const initBracketButton = document.getElementById('init-bracket-button');
    const debugElement = document.getElementById('debug');
    const JSONBIN_API_KEY = '$2a$10$9pH20SYWSZcFWI4ODBk4Hu6sSPsLkJ8r9tWoheET4cXb9dG2dQlE6';
    const JSONBIN_BIN_ID = '66aaf220ad19ca34f88fc6b9';
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;
    
let isAdminLoggedIn = false;

function displayVotes(votes, currentRound) {
    const voteDisplay = document.createElement('div');
    voteDisplay.innerHTML = '<h3>All Votes:</h3>';
    for (const [key, pairVotes] of Object.entries(votes)) {
        const round = Math.floor(key / 1000) + 1;
        const pairIndex = key % 1000;
        voteDisplay.innerHTML += `Round ${round}, Pair ${pairIndex}: ${pairVotes[0]} - ${pairVotes[1]}<br>`;
    }
    bracketContainer.appendChild(voteDisplay);
}

    function debugLog(message) {
        console.log(message);
        debugElement.innerHTML += `<p>${message}</p>`;
    }

   async function saveBracketState(state) {
    try {
        console.log('Attempting to save state:', state);
        const response = await fetch(JSONBIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify(state)
        });
        if (!response.ok) throw new Error('Failed to save state');
        const savedData = await response.json();
        console.log('State saved successfully:', savedData);
        debugLog('State saved successfully');
    } catch (error) {
        console.error('Error saving state:', error);
        debugLog(`Error saving state: ${error.message}`);
    }
}

async function loadBracketState() {
    try {
        console.log('Attempting to load state');
        const response = await fetch(JSONBIN_URL, {
            headers: { 'X-Master-Key': JSONBIN_API_KEY }
        });
        if (!response.ok) throw new Error('Failed to load state');
        const data = await response.json();
        if (!data.record || Object.keys(data.record).length === 0) {
            console.log('No existing state found');
            debugLog('No existing state found');
            return null;
        }
        console.log('State loaded successfully:', data.record);
        debugLog('State loaded successfully');
        return data.record;
    } catch (error) {
        console.error('Error loading state:', error);
        debugLog(`Error loading state: ${error.message}`);
        return null;
    }
}

    async function displayCurrentPair() {
        debugLog('Displaying current pair');
        const state = await loadBracketState();
        if (!state) {
            bracketContainer.innerHTML = '<p>No bracket data found. Admin must initialize the bracket.</p>';
            return;
        }

    const { names, currentPair, round, votes } = state;

    bracketContainer.innerHTML = `<h2>Round ${round}</h2>`;

    if (currentPair >= names.length) {
        bracketContainer.innerHTML += '<h3>Round Complete</h3>';
        if (names.length > 1) {
            if (isAdminLoggedIn) {
                const nextRoundButton = document.createElement('button');
                nextRoundButton.textContent = 'Start Next Round';
                nextRoundButton.onclick = startNextRound;
                bracketContainer.appendChild(nextRoundButton);
            } else {
                bracketContainer.innerHTML += '<p>Waiting for admin to start next round.</p>';
            }
        } else {
            bracketContainer.innerHTML += `<h3>Final Winner: ${names[0]}</h3>`;
        }
    } else {
        const name1 = names[currentPair];
        const name2 = names[currentPair + 1] || 'Bye';

        bracketContainer.innerHTML += `
            <div class="pair">
                <button onclick="vote(${currentPair}, 0)">${name1}</button>
                <button onclick="vote(${currentPair}, 1)" ${name2 === 'Bye' ? 'disabled' : ''}>${name2}</button>
            </div>
        `;
        debugLog(`Displayed pair: ${name1} vs ${name2}`);
    }

        displayVotes(votes || {}, round);

}

    async function vote(pairIndex, choice) {
    debugLog(`Vote cast: Pair ${pairIndex}, Choice ${choice}`);
    let state = await loadBracketState();
    if (!state) {
        console.error('Failed to load state for voting');
        return;
    }
    const voteKey = (state.round - 1) * 1000 + pairIndex;
    if (!state.votes[voteKey]) state.votes[voteKey] = [0, 0];
    state.votes[voteKey][choice]++;
    state.currentPair = pairIndex + 2;
    console.log('Updated state before saving:', state);
    await saveBracketState(state);
    await displayCurrentPair();
}

    async function startNextRound() {
    if (!isAdminLoggedIn) {
        alert("You must be logged in as an admin to start the next round.");
        return;
    }
    debugLog('Starting next round');
    const state = await loadBracketState();
    const winners = [];
    for (let i = 0; i < state.names.length; i += 2) {
        const votes = state.votes[i] || [0, 0];
        winners.push(state.names[i + (votes[0] >= votes[1] ? 0 : 1)]);
    }
    
    // Preserve votes from previous rounds
    const newVotes = { ...state.votes };
    // Add empty vote objects for the new round
    for (let i = 0; i < winners.length; i += 2) {
        newVotes[state.round * 1000 + i] = [0, 0];  // Use a large offset to avoid conflicts
    }

    await saveBracketState({
        names: winners,
        currentPair: 0,
        round: state.round + 1,
        votes: newVotes
    });
    displayCurrentPair();
}

    async function initializeBracket() {
        if (!isAdminLoggedIn) {
            alert("You must be logged in as an admin to initialize the bracket.");
            return;
        }
        debugLog('Initializing new bracket');
        const initialNames = [
            "Road Fury", "Steel Fleet", "Metal Brigade", "Iron Armada", "Steel Battalion",
        "Titanium Convoy", "Iron Legion", "Metal Vanguard", "Steel Caravan", "Iron Cavalry",
        "Metal Expedition", "Steel Phalanx", "Iron Squadron", "Metal Crusade", "Steel Vanguard",
        "Iron March", "Still Earth", "Smog", "Core Runners", "Broken Earth",
        "Meat Printers", "Meat Runners", "Dirtburn", "IronFront", "Union Fleet",
        "Iron Union", "Ignition", "Ignite", "Fleet Strata", "Short List Weapon Name",
        "Core Protocol", "On The Clock", "Slow Burn", "(Free)way", "Hardliners",
        "Ignitieoun", "Capital Rd.", "Ten-Thousand Degrease", "Core Directive", "°vertime",
        "No Man's Highway", "Dust Rats", "It's Just Business", "Compensation Co.", "Shuttered Skies",
        "Atmospheric Conditions", "Controlled Desolation", "Gridlock", "Lockdown Protocol", "Diatomaceous Earth",
        "Iron Stratum", "Continental Combustion", "Union Delta", "Road Quake", "Gabbros",
        "Cold Ignition", "Synclinition", "Tectonic Transports", "Thrust Faults", "Thrust Fault: Ignition",
        "Fault: Ignition"
        ];
        await saveBracketState({ names: initialNames, currentPair: 0, round: 1, votes: {} });
        displayCurrentPair();
    }

    adminLoginButton.addEventListener('click', () => {
        if (adminPassword.value === 'your-secret-password') { // Replace with a secure password
            isAdminLoggedIn = true;
            adminPanel.querySelector('#admin-login').style.display = 'none';
            initBracketButton.style.display = 'inline-block';
            adminMessage.textContent = 'Logged in as admin';
            debugLog('Admin logged in');
        } else {
            adminMessage.textContent = 'Incorrect password. Please try again.';
            debugLog('Failed admin login attempt');
        }
    });

    initBracketButton.addEventListener('click', initializeBracket);

    debugLog('Script loaded, attempting to display current pair');
    displayCurrentPair();

    window.vote = vote;
    window.startNextRound = startNextRound;
});