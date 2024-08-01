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
    
  let isAdminLoggedIn = true;

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
        console.log('Loaded state:', data.record); // Log the entire state
        debugLog('State loaded successfully');
        return data.record;
    } catch (error) {
        debugLog(`Error loading state: ${error.message}`);
        return null;
    }
}

    async function displayCurrentPairs() {
    const state = await loadBracketState();
    if (!state) {
        bracketContainer.innerHTML = '<p>No bracket data found. Admin must initialize the bracket.</p>';
        return;
    }

    console.log('Current state:', state); // Log the current state

    const { names, round, votes } = state;

    if (!names || names.length === 0) {
        bracketContainer.innerHTML = '<p>No names found in the bracket. Admin must initialize the bracket.</p>';
        return;
    }

    bracketContainer.innerHTML = `<h2>Round ${round}</h2>`;

    if (names.length <= 1) {
        bracketContainer.innerHTML += `<h3>Final Winner: ${names[0] || 'Unknown'}</h3>`;
        return;
    }

    const userProgress = getUserProgress(round);
    const startIndex = userProgress * 4;

    console.log('User progress:', userProgress, 'Start index:', startIndex); // Log progress and start index

    for (let i = startIndex; i < Math.min(startIndex + 4, names.length); i += 2) {
        const name1 = names[i] || 'Unknown';
        const name2 = (i + 1 < names.length ? names[i + 1] : 'Bye') || 'Unknown';

        const votes1 = (votes[i] && votes[i][0]) || 0;
        const votes2 = (votes[i] && votes[i][1]) || 0;

        console.log(`Pair ${i/2 + 1}:`, name1, 'vs', name2); // Log each pair

        bracketContainer.innerHTML += `
            <div class="pair">
                <button onclick="vote(${i}, 0)">${name1} (${votes1} votes)</button>
                <button onclick="vote(${i}, 1)" ${name2 === 'Bye' ? 'disabled' : ''}>${name2} (${votes2} votes)</button>
            </div>
        `;
    }

    if (userProgress * 4 >= names.length) {
        bracketContainer.innerHTML += '<h3>You have completed voting for this round.</h3>';
        if (isAdminLoggedIn) {
            const nextRoundButton = document.createElement('button');
            nextRoundButton.textContent = 'Start Next Round';
            nextRoundButton.onclick = startNextRound;
            bracketContainer.appendChild(nextRoundButton);
        }
    }

    displayVotes(votes || {});
}

    function getUserProgress(round) {
        const progress = localStorage.getItem(`round${round}Progress`);
        return progress ? parseInt(progress) : 0;
    }

    function setUserProgress(round, progress) {
        localStorage.setItem(`round${round}Progress`, progress.toString());
    }

    async function vote(pairIndex, choice) {
        const state = await loadBracketState();
        if (!state.votes) state.votes = {};
        if (!state.votes[pairIndex]) state.votes[pairIndex] = [0, 0];
        state.votes[pairIndex][choice]++;
        await saveBracketState(state);

        const userProgress = getUserProgress(state.round);
        setUserProgress(state.round, userProgress + 1);

        await displayCurrentPairs();
    }

    async function startNextRound() {
        if (!isAdminLoggedIn) {
            alert("You must be logged in as an admin to start the next round.");
            return;
        }
        const state = await loadBracketState();
        const winners = [];
        for (let i = 0; i < state.names.length; i += 2) {
            const votes = state.votes[i] || [0, 0];
            winners.push(state.names[i + (votes[0] > votes[1] ? 0 : 1)]);
        }
        await saveBracketState({
            names: winners,
            round: state.round + 1,
            votes: {}
        });
        // Reset user progress for the new round
        setUserProgress(state.round + 1, 0);
        displayCurrentPairs();
    }

    function displayVotes(votes) {
        const voteDisplay = document.createElement('div');
        voteDisplay.innerHTML = '<h3>Current Votes:</h3>';
        for (const [pairIndex, pairVotes] of Object.entries(votes)) {
            voteDisplay.innerHTML += `Pair ${pairIndex}: ${pairVotes[0]} - ${pairVotes[1]}<br>`;
        }
        bracketContainer.appendChild(voteDisplay);
    }

    async function initializeBracket() {
        if (!isAdminLoggedIn) {
            alert("You must be logged in as an admin to initialize the bracket.");
            return;
        }
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
        await saveBracketState({ names: initialNames, round: 1, votes: {} });
        setUserProgress(1, 0);
        displayCurrentPairs();
    }

    adminLoginButton.addEventListener('click', () => {
    console.log('Login attempt');
    isAdminLoggedIn = true;
    adminPanel.querySelector('#admin-login').style.display = 'none';
    initBracketButton.style.display = 'inline-block';
    adminMessage.textContent = 'Logged in as admin';
    debugLog('Admin logged in');
    displayCurrentPairs();
});

    initBracketButton.addEventListener('click', initializeBracket);

    debugLog('Script loaded, attempting to display current pairs');
    displayCurrentPairs();

    window.vote = vote;
    window.startNextRound = startNextRound;
});