document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const deleteKeyBtn = document.getElementById('delete-key-btn');
    const modelSelect = document.getElementById('model');
    const inputText = document.getElementById('input-text');
    const inputLang = document.getElementById('input-lang');
    const outputLang = document.getElementById('output-lang');
    const submitBtn = document.getElementById('submit-btn');
    const responseContainer = document.getElementById('response-container');
    const toggleApiKeyBtn = document.getElementById('toggle-api-key');

    // Funções para manipular cookies
    function setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function eraseCookie(name) {
        document.cookie = name + '=; Max-Age=-99999999;';
    }

    // Carregar idiomas a partir de JSON
    fetch('languages.json')
        .then(response => response.json())
        .then(languages => {
            languages.forEach(language => {
                const option = document.createElement('option');
                option.value = language.code;
                option.textContent = language.name;
                inputLang.appendChild(option);

                const optionClone = option.cloneNode(true);
                outputLang.appendChild(optionClone);
            });

            // Carregar valores salvos nos cookies
            inputLang.value = getCookie('inputLang') || '';
            outputLang.value = getCookie('outputLang') || '';
            modelSelect.value = getCookie('modelSelect') || '';
        })
        .catch(error => console.error('Erro ao carregar idiomas:', error));

    // Carregar chave API salva
    const savedApiKey = localStorage.getItem('api-key');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }

    saveKeyBtn.addEventListener('click', () => {
        localStorage.setItem('api-key', apiKeyInput.value);
        alert('Chave de API guardada!');
    });

    deleteKeyBtn.addEventListener('click', () => {
        localStorage.removeItem('api-key');
        apiKeyInput.value = '';
        alert('Chave de API guardada eliminada!');
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
        const inputLanguage = inputLang.value;
        const outputLanguage = outputLang.value;

        if (!apiKey || !input) {
            alert('Introduza a chave API e o texto de entrada.');
            return;
        }

        // Salvar opções selecionadas nos cookies
        setCookie('inputLang', inputLanguage, 7);
        setCookie('outputLang', outputLanguage, 7);
        setCookie('modelSelect', model, 7);

        responseContainer.innerHTML = 'Loading...';

        let prompt;
        const words = input.split(' ');

        if (words.length === 1) {
            prompt = `
Usuário forneceu uma palavra. Responda com:
1. Tradução da palavra "${input}" para ${outputLanguage}.
2. Sinônimos da palavra em ${inputLanguage} com tradução para ${outputLanguage}.
3. Palavras que têm um sentido semelhante em ${inputLanguage} com tradução para ${outputLanguage}.
4. Frases em ${inputLanguage} que usam a palavra em diferentes contextos, junto com a tradução para cada frase em ${outputLanguage}.

Palavra: "${input}"
            `;
        } else {
            prompt = `
Usuário forneceu uma frase. Responda com:
1. Tradução da frase "${input}" para ${outputLanguage}.
2. Variações da tradução mantendo o mesmo sentido em ${outputLanguage} com a frase original em ${inputLanguage}.
3. Outras frases em ${inputLanguage} que têm um sentido semelhante à frase em ${inputLanguage}, junto com a tradução para cada frase em ${outputLanguage}.

Frase: "${input}"
            `;
        }

        if (!inputLanguage) {
            prompt = `Detect the language of the following word or phrase and then:
${prompt}`;
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

            let history = JSON.parse(localStorage.getItem('history')) || [];
            history.push({ inputText: input, responseContent, model, timestamp: new Date().toISOString() });
            localStorage.setItem('history', JSON.stringify(history));

            responseContainer.innerHTML = marked.parse(responseContent);
        } catch (error) {
            responseContainer.innerHTML = `Error: ${error.message}`;
        }
    });

    if (window.location.hash === '#historico') {
        document.body.innerHTML = `
        <div class="container">
            <h1>Histórico de traduções</h1>
            <div class="filter-group">
                <select id="filter-model">
                    <option value="">Todos os modelos</option>
                    <option value="gemma-7b-it">gemma-7b-it</option>
                    <option value="gemma2-9b-it">gemma2-9b-it</option>
                    <option value="llama3-70b-8192">llama3-70b-8192</option>
                    <option value="llama3-8b-8192">llama3-8b-8192</option>
                    <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
                </select>
                <select id="sort-order">
                    <option value="newest">Mais recente Primeiro</option>
                    <option value="oldest">Mais antigo Primeiro</option>
                </select>
            </div>
            <input type="text" id="search-input" placeholder="Pesquisar">
            <div id="history-container"></div>
        </div>`;

        const history = JSON.parse(localStorage.getItem('history')) || [];

        const filterModelSelect = document.getElementById('filter-model');
        const sortOrderSelect = document.getElementById('sort-order');
        const searchInput = document.getElementById('search-input');
        const historyContainer = document.getElementById('history-container');

        function renderHistory(entries) {
            historyContainer.innerHTML = '';
            entries.forEach((entry, index) => {
                const entryDiv = document.createElement('div');
                entryDiv.classList.add('history-entry');
                entryDiv.innerHTML = `
                    <h2>Entry ${index + 1}</h2>
                    <p><strong>Modelo:</strong> ${entry.model}</p>
                    <p><strong>Data:</strong> ${new Date(entry.timestamp).toLocaleString()}</p>
                    <p><strong>Entrada:</strong> ${entry.inputText}</p>
                    <div class="markdown-body"><strong>Resposta:</strong> ${marked.parse(entry.responseContent)}</div>
                `;
                historyContainer.appendChild(entryDiv);
            });
        }

        function filterAndSortHistory() {
            let filteredHistory = history;

            const selectedModel = filterModelSelect.value;
            const searchQuery = searchInput.value.toLowerCase();

            if (selectedModel) {
                filteredHistory = filteredHistory.filter(entry => entry.model === selectedModel);
            }

            if (searchQuery) {
                filteredHistory = filteredHistory.filter(entry =>
                    entry.inputText.toLowerCase().includes(searchQuery) ||
                    entry.responseContent.toLowerCase().includes(searchQuery)
                );
            }

            const sortOrder = sortOrderSelect.value;
            if (sortOrder === 'newest') {
                filteredHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            } else {
                filteredHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            }

            renderHistory(filteredHistory);
        }

        filterModelSelect.addEventListener('change', filterAndSortHistory);
        sortOrderSelect.addEventListener('change', filterAndSortHistory);
        searchInput.addEventListener('input', filterAndSortHistory);

        filterAndSortHistory();
    }
});
