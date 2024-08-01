document.addEventListener('DOMContentLoaded', () => {
    const bracketContainer = document.getElementById('bracket-container');
    const JSONBIN_API_KEY = '$2a$10$9pH20SYWSZcFWI4ODBk4Hu6sSPsLkJ8r9tWoheET4cXb9dG2dQlE6';
    const JSONBIN_BIN_ID = '66aaf220ad19ca34f88fc6b9';
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;
    const VOTING_PERIOD = 5 * 24 * 60 * 60 * 1000;

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
        } catch (error) {
            console.error('Error saving bracket state:', error);
        }
    }

    async function loadBracketState() {
        try {
            const response = await fetch(JSONBIN_URL, {
                headers: {
                    'X-Master-Key': JSONBIN_API_KEY
                }
            });
            if (!response.ok) throw new Error('Failed to load state');
            const data = await response.json();
            return data.record;
        } catch (error) {
            console.error('Error loading bracket state:', error);
            return null;
        }
    }

    async function displayCurrentPair() {
        const state = await loadBracketState();
        if (!state) return;

        let { names, round, pairIndex, roundStartTime, votes } = state;

        bracketContainer.innerHTML = '';

        // Display round number
        const roundIndicator = document.createElement('h2');
        roundIndicator.textContent = `Round ${round}`;
        bracketContainer.appendChild(roundIndicator);

        // Display time remaining
        const timeRemaining = document.createElement('p');
        timeRemaining.id = 'time-remaining';
        bracketContainer.appendChild(timeRemaining);

        updateTimeRemaining(roundStartTime);

        if (pairIndex >= names.length) {
            // Show results and start next round
            await showResults(names, votes, round);
            return;
        }

        if (names.length === 1) {
            bracketContainer.innerHTML += `<h2>Winner: ${names[0]}</h2>`;
            return;
        }

        const name1 = names[pairIndex];
        const name2 = pairIndex + 1 < names.length ? names[pairIndex + 1] : 'Bye';

        const pairDiv = document.createElement('div');
        pairDiv.className = 'bracket-pair';
        pairDiv.innerHTML = `
            <div class="bracket-item">
                <p>${name1}</p>
                <button onclick="vote('${name1}')" id="vote-btn-1">Vote</button>
            </div>
            <div class="bracket-item">
                <p>${name2}</p>
                <button onclick="vote('${name2}')" id="vote-btn-2" ${name2 === 'Bye' ? 'disabled' : ''}>Vote</button>
            </div>
        `;

        bracketContainer.appendChild(pairDiv);
    }

    async function vote(name) {
        const state = await loadBracketState();
        if (!state) return;

        let { votes, round, pairIndex } = state;
        
        // Initialize votes for this pair if they don't exist
        if (!votes[round]) votes[round] = {};
        if (!votes[round][pairIndex]) votes[round][pairIndex] = {};
        if (!votes[round][pairIndex][name]) votes[round][pairIndex][name] = 0;

        // Increment vote count
        votes[round][pairIndex][name]++;

        await saveBracketState({...state, votes});
        displayCurrentPair();
    }

    async function showResults(names, votes, round) {
        const results = names.map((name, index) => {
            const pairIndex = Math.floor(index / 2) * 2;
            const voteCount = (votes[round] && votes[round][pairIndex] && votes[round][pairIndex][name]) || 0;
            return { name, votes: voteCount };
        });

        bracketContainer.innerHTML = `
            <h2>Round ${round} Results</h2>
            <ul>
                ${results.map(result => `<li>${result.name}: ${result.votes} votes</li>`).join('')}
            </ul>
            <button onclick="startNextRound()">Start Next Round</button>
        `;
    }

    async function startNextRound() {
        const state = await loadBracketState();
        if (!state) return;

        let { names, round, votes } = state;

        // Determine winners of this round
        const winners = [];
        for (let i = 0; i < names.length; i += 2) {
            const name1 = names[i];
            const name2 = i + 1 < names.length ? names[i + 1] : null;
            const votes1 = (votes[round] && votes[round][i] && votes[round][i][name1]) || 0;
            const votes2 = name2 ? (votes[round] && votes[round][i] && votes[round][i][name2]) || 0 : -1;
            winners.push(votes1 >= votes2 ? name1 : name2);
        }

        // Start new round
        await saveBracketState({
            names: winners,
            round: round + 1,
            pairIndex: 0,
            roundStartTime: Date.now(),
            votes: {...votes, [round + 1]: {}}
        });
        displayCurrentPair();
    }

    function updateTimeRemaining(startTime) {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, VOTING_PERIOD - elapsed);
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = ((remaining % 60000) / 1000).toFixed(0);
        
        document.getElementById('time-remaining').textContent = 
            `Time remaining: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        if (remaining > 0) {
            setTimeout(() => updateTimeRemaining(startTime), 1000);
        } else {
            startNextRound();
        }
    }

    // Initialize the bracket
    async function initializeBracket() {
        const state = await loadBracketState();
        if (!state || !state.names) {
            // If no state exists, initialize with all names
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
            await saveBracketState({
                names: initialNames,
                round: 1,
                pairIndex: 0,
                roundStartTime: Date.now(),
                votes: {}
            });
        }
        displayCurrentPair();
    }

    initializeBracket();
    
    async function checkRoundEnd() {
    const state = await loadBracketState();
    if (!state) return;

    const { roundStartTime } = state;
    const now = Date.now();
    const elapsed = now - roundStartTime;

    if (elapsed >= VOTING_PERIOD) {
        startNextRound();
    } else {
        displayCurrentPair();
    }
}

    // Make functions global so they can be called from HTML
    window.vote = vote;
    window.startNextRound = startNextRound;
});