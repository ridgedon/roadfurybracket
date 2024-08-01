document.addEventListener('DOMContentLoaded', () => {
    const bracketContainer = document.getElementById('bracket-container');
    const JSONBIN_API_KEY = '$2a$10$9pH20SYWSZcFWI4ODBk4Hu6sSPsLkJ8r9tWoheET4cXb9dG2dQlE6';
    const JSONBIN_BIN_ID = '66aaf220ad19ca34f88fc6b9';
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;
    
function getVotingPeriod(round) {
        const basePeriod = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds
        return Math.max(1 * 24 * 60 * 60 * 1000, basePeriod / round); // Minimum 1 day
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
            if (!data.record) throw new Error('Invalid state data');
            
            const state = {
                names: data.record.names || [],
                round: data.record.round || 1,
                pairIndex: data.record.pairIndex || 0,
                votes: data.record.votes || {},
                roundStartTime: data.record.roundStartTime,
                isComplete: data.record.isComplete || false
            };

            return state;
        } catch (error) {
            console.error('Error loading bracket state:', error);
            return null;
        }
    }

    async function displayCurrentPair() {
    try {
        const state = await loadBracketState();
        if (!state) {
            bracketContainer.innerHTML = '<p>Error loading bracket state. Please refresh the page.</p>';
            return;
        }

        let { names, round, pairIndex, roundStartTime, votes, isComplete } = state;

        bracketContainer.innerHTML = '';

        if (isComplete) {
            displayFinalWinner(names[0]);
            return;
        }

        const roundIndicator = document.createElement('h2');
        roundIndicator.textContent = `Round ${round}`;
        bracketContainer.appendChild(roundIndicator);

        const timeElement = document.createElement('p');
        timeElement.id = 'time-remaining';
        if (roundStartTime) {
            updateTimeRemaining(roundStartTime, round);
        } else {
            timeElement.textContent = 'Waiting for first vote to start the timer...';
        }
        bracketContainer.appendChild(timeElement);

        // Check if all pairs have been voted on
        const allPairsVoted = checkAllPairsVoted(votes, round, names.length);
        if (allPairsVoted) {
            await showResults(names, votes, round);
            return;
        }

        const name1 = names[pairIndex];
        const name2 = pairIndex + 1 < names.length ? names[pairIndex + 1] : 'Bye';

        const votes1 = countVotes(votes, round, pairIndex, name1);
        const votes2 = countVotes(votes, round, pairIndex, name2);

        const userId = getUserId();
        const hasVoted = hasUserVoted(votes, round, pairIndex, userId);

        const pairDiv = document.createElement('div');
        pairDiv.className = 'bracket-pair';
        pairDiv.innerHTML = `
            <div class="bracket-item">
                <p>${name1} (Votes: ${votes1})</p>
                <button onclick="vote('${name1}')" id="vote-btn-1" ${hasVoted ? 'disabled' : ''}>Vote</button>
            </div>
            <div class="bracket-item">
                <p>${name2} (Votes: ${votes2})</p>
                <button onclick="vote('${name2}')" id="vote-btn-2" ${name2 === 'Bye' || hasVoted ? 'disabled' : ''}>Vote</button>
            </div>
        `;

        bracketContainer.appendChild(pairDiv);

        const adminMessage = document.getElementById('admin-message');
        if (adminMessage) adminMessage.textContent = '';
    } catch (error) {
        console.error('Error in displayCurrentPair:', error);
        bracketContainer.innerHTML = '<p>An error occurred. Please refresh the page.</p>';
    }
}

function checkAllPairsVoted(votes, round, totalNames) {
    if (!votes[round]) return false;
    const votedPairs = Object.keys(votes[round]).length;
    return votedPairs >= Math.ceil(totalNames / 2);
}

    async function vote(name) {
    try {
        const state = await loadBracketState();
        if (!state) {
            console.error('Failed to load state');
            return;
        }

        let { votes, round, pairIndex, roundStartTime, names } = state;
        
        if (!roundStartTime) {
            roundStartTime = Date.now();
        }

        if (!votes) votes = {};
        if (!votes[round]) votes[round] = {};
        if (!votes[round][pairIndex]) votes[round][pairIndex] = {};
        if (!votes[round][pairIndex][name]) votes[round][pairIndex][name] = {};

        const userId = getUserId();
        votes[round][pairIndex][name][userId] = true;

        // Advance to the next pair
        pairIndex += 2;

        // If we've reached the end of the names, reset to the beginning for this round
        if (pairIndex >= names.length) {
            pairIndex = 0;
        }

        // Save the updated state and display the next (or first) pair
        await saveBracketState({...state, votes, roundStartTime, pairIndex});
        await displayCurrentPair();
    } catch (error) {
        console.error('Error in vote function:', error);
        alert('An error occurred while voting. Please try again.');
    }
}

    async function showResults(names, votes, round) {
        const results = names.map((name, index) => {
            const pairIndex = Math.floor(index / 2) * 2;
            const voteCount = countVotes(votes, round, pairIndex, name);
            return { name, votes: voteCount };
        });

        bracketContainer.innerHTML = `
            <h2>Round ${round} Results</h2>
            <ul>
                ${results.map(result => `<li>${result.name}: ${result.votes} votes</li>`).join('')}
            </ul>
            <p>Waiting for timer to end or manual start of next round.</p>
        `;

        const adminControls = document.getElementById('admin-controls');
        if (adminControls && adminControls.style.display !== 'none') {
            const nextRoundButton = document.createElement('button');
            nextRoundButton.textContent = 'Start Next Round';
            nextRoundButton.onclick = startNextRound;
            bracketContainer.appendChild(nextRoundButton);
        }
    }

    async function startNextRound() {
        const state = await loadBracketState();
        if (!state) return;

        let { names, round, votes } = state;

        const winners = [];
        for (let i = 0; i < names.length; i += 2) {
            const name1 = names[i];
            const name2 = i + 1 < names.length ? names[i + 1] : null;
            const votes1 = countVotes(votes, round, i, name1);
            const votes2 = name2 ? countVotes(votes, round, i, name2) : -1;
            winners.push(votes1 >= votes2 ? name1 : name2);
        }

        if (winners.length === 1) {
            await saveBracketState({
                ...state,
                names: winners,
                round: round + 1,
                pairIndex: 0,
                roundStartTime: null,
                votes: {...votes, [round + 1]: {}},
                isComplete: true
            });
            displayFinalWinner(winners[0]);
        } else {
            await saveBracketState({
                ...state,
                names: winners,
                round: round + 1,
                pairIndex: 0,
                roundStartTime: null,
                votes: {...votes, [round + 1]: {}}
            });
            displayCurrentPair();
        }
    }

    function displayFinalWinner(winner) {
        bracketContainer.innerHTML = `
            <h2>Final Winner</h2>
            <p class="winner">${winner}</p>
        `;
    }

    function updateTimeRemaining(startTime, round) {
        const now = Date.now();
        const elapsed = now - startTime;
        const votingPeriod = getVotingPeriod(round);
        const remaining = Math.max(0, votingPeriod - elapsed);
        
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        const timeElement = document.getElementById('time-remaining');
        if (timeElement) {
            timeElement.textContent = `Time remaining: ${days} days, ${hours} hours, ${minutes} minutes`;
        }

        if (remaining > 0) {
            setTimeout(() => updateTimeRemaining(startTime, round), 60000);
        } else {
            startNextRound();
        }
    }

    async function checkRoundEnd() {
        const state = await loadBracketState();
        if (!state) return;

        const { roundStartTime, round } = state;
        if (!roundStartTime) {
            displayCurrentPair();
            return;
        }

        const now = Date.now();
        const elapsed = now - roundStartTime;
        const votingPeriod = getVotingPeriod(round);

        if (elapsed >= votingPeriod) {
            startNextRound();
        } else {
            displayCurrentPair();
        }
    }

    function getUserId() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', userId);
        }
        return userId;
    }

    function countVotes(votes, round, pairIndex, name) {
        if (votes && votes[round] && votes[round][pairIndex] && votes[round][pairIndex][name]) {
            return Object.keys(votes[round][pairIndex][name]).length;
        }
        return 0;
    }

    function hasUserVoted(votes, round, pairIndex, userId) {
        if (votes && votes[round] && votes[round][pairIndex]) {
            for (let name in votes[round][pairIndex]) {
                if (votes[round][pairIndex][name][userId]) {
                    return true;
                }
            }
        }
        return false;
    }

    async function initializeBracket() {
        const state = await loadBracketState();
        if (!state || !state.names || state.names.length === 0) {
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
                roundStartTime: null,
                votes: { 1: {} },
                isComplete: false
            });
        }
        checkRoundEnd();
    }

    const adminPanel = document.getElementById('admin-panel');
    const adminLoginButton = document.getElementById('admin-login-button');
    const adminPassword = document.getElementById('admin-password');
    const adminControls = document.getElementById('admin-controls');
    const nextRoundButton = document.getElementById('next-round-button');
    const adminMessage = document.getElementById('admin-message');

    adminLoginButton.addEventListener('click', () => {
        if (adminPassword.value === 'your-secret-password') { // Replace with a secure password
            adminPanel.querySelector('#admin-login').style.display = 'none';
            adminControls.style.display = 'block';
            adminMessage.textContent = 'Logged in successfully.';
        } else {
            adminMessage.textContent = 'Incorrect password. Please try again.';
        }
    });

    nextRoundButton.addEventListener('click', async () => {
        const state = await loadBracketState();
        if (state.isComplete) {
            adminMessage.textContent = 'The bracket is complete. No more rounds to start.';
            nextRoundButton.disabled = true;
        } else {
            await startNextRound();
            adminMessage.textContent = 'Starting next round...';
            displayCurrentPair();
        }
    });

    adminPanel.style.display = 'block';

    initializeBracket();

    window.vote = vote;
    window.startNextRound = startNextRound;
});