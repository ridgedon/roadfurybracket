document.addEventListener('DOMContentLoaded', () => {
    const bracketContainer = document.getElementById('bracket-container');
    const JSONBIN_API_KEY = '$2a$10$9pH20SYWSZcFWI4ODBk4Hu6sSPsLkJ8r9tWoheET4cXb9dG2dQlE6';
    const JSONBIN_BIN_ID = '66aaf220ad19ca34f88fc6b9';
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

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

        const { names, round, pairIndex } = state;

        bracketContainer.innerHTML = '';

        if (pairIndex >= names.length) {
            // Start next round
            await saveBracketState({ names, round: round + 1, pairIndex: 0 });
            displayCurrentPair();
            return;
        }

        if (names.length === 1) {
            bracketContainer.innerHTML = `<h2>Winner: ${names[0]}</h2>`;
            return;
        }

        const name1 = names[pairIndex];
        const name2 = pairIndex + 1 < names.length ? names[pairIndex + 1] : 'Bye';

        const pairDiv = document.createElement('div');
        pairDiv.className = 'bracket-pair';
        pairDiv.innerHTML = `
            <div class="bracket-item">
                <p>${name1}</p>
                <button onclick="vote('${name1}')">Vote</button>
            </div>
            <div class="bracket-item">
                <p>${name2}</p>
                <button onclick="vote('${name2}')" ${name2 === 'Bye' ? 'disabled' : ''}>Vote</button>
            </div>
        `;

        bracketContainer.appendChild(pairDiv);
    }

    async function vote(name) {
        const state = await loadBracketState();
        if (!state) return;

        let { names, round, pairIndex } = state;
        names.splice(pairIndex, 2, name);
        pairIndex += 2;

        await saveBracketState({ names, round, pairIndex });
        displayCurrentPair();
    }

    // Initialize the bracket
    displayCurrentPair();

    // Make vote function global so it can be called from HTML
    window.vote = vote;
});