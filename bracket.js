document.addEventListener('DOMContentLoaded', () => {
    const bracketContainer = document.getElementById('bracket-container');
    const JSONBIN_API_KEY = '$2a$10$9pH20SYWSZcFWI4ODBk4Hu6sSPsLkJ8r9tWoheET4cXb9dG2dQlE6';
    const JSONBIN_BIN_ID = '66aaf220ad19ca34f88fc6b9';
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;
    
async function saveBracketState(state) {
        const response = await fetch(JSONBIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify(state)
        });
        if (!response.ok) throw new Error('Failed to save state');
    }

    async function loadBracketState() {
        const response = await fetch(JSONBIN_URL, {
            headers: { 'X-Master-Key': JSONBIN_API_KEY }
        });
        if (!response.ok) throw new Error('Failed to load state');
        const data = await response.json();
        return data.record;
    }

    async function displayCurrentPair() {
        const state = await loadBracketState();
        const { names, currentPair, round } = state;

        bracketContainer.innerHTML = `<h2>Round ${round}</h2>`;

        if (currentPair >= names.length) {
            bracketContainer.innerHTML += '<h3>Round Complete</h3>';
            if (names.length > 1) {
                const nextRoundButton = document.createElement('button');
                nextRoundButton.textContent = 'Start Next Round';
                nextRoundButton.onclick = startNextRound;
                bracketContainer.appendChild(nextRoundButton);
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
    }

    async function vote(pairIndex, choice) {
        const state = await loadBracketState();
        if (!state.votes) state.votes = {};
        if (!state.votes[pairIndex]) state.votes[pairIndex] = [0, 0];
        state.votes[pairIndex][choice]++;
        state.currentPair = pairIndex + 2;
        await saveBracketState(state);
        displayCurrentPair();
    }

    async function startNextRound() {
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

    initializeBracket();

    window.vote = vote;
    window.startNextRound = startNextRound;
});