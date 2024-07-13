document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const deleteKeyBtn = document.getElementById('delete-key-btn');
    const modelSelect = document.getElementById('model');
    const inputText = document.getElementById('input-text');
    const submitBtn = document.getElementById('submit-btn');
    const responseContainer = document.getElementById('response-container');
    const toggleApiKeyBtn = document.getElementById('toggle-api-key');
    const searchInput = document.getElementById('search-term');
    const sortBtn = document.getElementById('sort-btn');
    let sortOrder = 'desc';

    // Load saved API key
    const savedApiKey = localStorage.getItem('api-key');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }

    saveKeyBtn.addEventListener('click', () => {
        localStorage.setItem('api-key', apiKeyInput.value);
        alert('API key saved!');
    });

    deleteKeyBtn.addEventListener('click', () => {
        localStorage.removeItem('api-key');
        apiKeyInput.value = '';
        alert('Saved API key deleted!');
    });

    toggleApiKeyBtn.addEventListener('click', () => {
        const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
        apiKeyInput.setAttribute('type', type);
        toggleApiKeyBtn.classList.toggle('fa-eye-slash');
    });

    submitBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value;
        const model = modelSelect.value;
        const input = inputText.value;

        if (!apiKey || !input) {
            alert('Please enter both the API key and the input text.');
            return;
        }

        responseContainer.innerHTML = 'Loading...';

        let prompt;
        const words = input.split(' ');

        if (words.length === 1) {
            // Single word prompt
            prompt = `
Usuário forneceu uma palavra. Responda com:
1. Tradução para o inglês e português.
2. Sinônimos da palavra em português com tradução para o inglês.
3. Palavras que têm um sentido semelhante em português com tradução para o inglês.
4. Frases em português que usam a palavra em diferentes contextos, junto com a tradução para cada frase em inglês e português.

Palavra: "${input}"
            `;
        } else {
            // Sentence prompt
            prompt = `
Usuário forneceu uma frase. Responda com:
1. Tradução da frase para o inglês e português.
2. Variações da tradução mantendo o mesmo sentido em inglês e português.
3. Outras frases em inglês que têm um sentido semelhante à frase em português, junto com a tradução para cada frase em inglês e português.

Frase: "${input}"
            `;
        }

        const data = {
            messages: [{ role: 'user', content: prompt }],
            model: model
        };

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();
            const responseContent = result.choices[0].message.content;
            const timestamp = new Date().toISOString();

            // Store in localStorage
            let history = JSON.parse(localStorage.getItem('history')) || [];
            history.push({ inputText: input, responseContent, model, timestamp });
            localStorage.setItem('history', JSON.stringify(history));

            // Display response with markdown support
            responseContainer.innerHTML = marked.parse(responseContent);
        } catch (error) {
            responseContainer.innerHTML = `Error: ${error.message}`;
        }
    });

    // Handle history page
    if (window.location.hash === '#historico') {
        document.body.innerHTML = `
            <div class="container">
                <h1>Translation History</h1>
                <div id="history-controls">
                    <input type="text" id="search-term" placeholder="Search history">
                    <button id="sort-btn">Sort by Date</button>
                </div>
                <div id="history-count"></div>
                <div id="history-container"></div>
            </div>
        `;

        const historyContainer = document.getElementById('history-container');
        const searchTermInput = document.getElementById('search-term');
        const sortBtn = document.getElementById('sort-btn');
        let history = JSON.parse(localStorage.getItem('history')) || [];

        const renderHistory = (history) => {
            historyContainer.innerHTML = '';
            history.forEach((entry, index) => {
                const entryDiv = document.createElement('div');
                entryDiv.classList.add('history-entry');
                entryDiv.innerHTML = `
                    <h2>Entry ${index + 1}</h2>
                    <p><strong>Input:</strong> ${entry.inputText}</p>
                    <p><strong>Model:</strong> ${entry.model}</p>
                    <p><strong>Date:</strong> ${new Date(entry.timestamp).toLocaleString()}</p>
                    <div class="markdown-body"><strong>Response:</strong> ${marked.parse(entry.responseContent)}</div>
                `;
                historyContainer.appendChild(entryDiv);
            });
            document.getElementById('history-count').innerText = `Total Entries: ${history.length}`;
        };

        searchTermInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            const filteredHistory = history.filter(entry => 
                entry.inputText.toLowerCase().includes(searchTerm) || 
                entry.responseContent.toLowerCase().includes(searchTerm)
            );
            renderHistory(filteredHistory);
        });

        sortBtn.addEventListener('click', () => {
            sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            history.sort((a, b) => {
                return sortOrder === 'asc' 
                    ? new Date(a.timestamp) - new Date(b.timestamp)
                    : new Date(b.timestamp) - new Date(a.timestamp);
            });
            renderHistory(history);
        });

        renderHistory(history);
    }
});
