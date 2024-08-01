document.addEventListener('DOMContentLoaded', () => {
    const bracketContainer = document.getElementById('bracketContainer');
    const adminPanel = document.getElementById('admin-panel');
    const adminLoginButton = document.getElementById('admin-login-button');
    const adminPassword = document.getElementById('admin-password');
    const adminMessage = document.getElementById('admin-message');
    const debugElement = document.getElementById('debug');
    const JSONBIN_API_KEY = '$2a$10$9pH20SYWSZcFWI4ODBk4Hu6sSPsLkJ8r9tWoheET4cXb9dG2dQlE6';
    const JSONBIN_BIN_ID = '66aaf220ad19ca34f88fc6b9';
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;
    
let isAdminLoggedIn = false;

    function debugLog(message) {
        console.log(message);
        debugElement.innerHTML += `<p>${message}</p>`;
    }

    async function saveBracketState(state) {
        try {
            const response = await fetch(JSONBIN_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_API_KEY
                },
                body: JSON.stringify(state)
            });
            if (!response.ok) throw new Error('Failed to save state');
            debugLog('State saved successfully');
        } catch (error) {
            debugLog(`Error saving state: ${error.message}`);
        }
    }

    async function loadBracketState() {
        try {
            const response = await fetch(JSONBIN_URL, {
                headers: { 'X-Master-Key': JSONBIN_API_KEY }
            });
            if (!response.ok) throw new Error('Failed to load state');
            const data = await response.json();
            debugLog('State loaded successfully');
            return data.record;
        } catch (error) {
            debugLog(`Error loading state: ${error.message}`);
            return null;
        }
    }

    async function displayCurrentPair() {
        debugLog('Displaying current pair');
        const state = await loadBracketState();
        if (!state) {
            debugLog('No state found, initializing bracket');
            await initializeBracket();
            return;
        }

        const { names, currentPair, round } = state;

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
            return;
        }

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

    async function vote(pairIndex, choice) {
        debugLog(`Vote cast: Pair ${pairIndex}, Choice ${choice}`);
        const state = await loadBracketState();
        if (!state.votes) state.votes = {};
        if (!state.votes[pairIndex]) state.votes[pairIndex] = [0, 0];
        state.votes[pairIndex][choice]++;
        state.currentPair = pairIndex + 2;
        await saveBracketState(state);
        displayCurrentPair();
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
        state.names = winners;
        state.currentPair = 0;
        state.round++;
        state.votes = {};
        await saveBracketState(state);
        displayCurrentPair();
    }

    async function initializeBracket() {
        debugLog('Initializing bracket');
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
            adminPanel.style.display = 'none';
            adminMessage.textContent = 'Logged in as admin';
            debugLog('Admin logged in');
            displayCurrentPair(); // Refresh the display to show admin controls if needed
        } else {
            adminMessage.textContent = 'Incorrect password. Please try again.';
            debugLog('Failed admin login attempt');
        }
    });

    debugLog('Script loaded, initializing bracket');
    initializeBracket();

    window.vote = vote;
    window.startNextRound = startNextRound;
});