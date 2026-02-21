(function(Scratch) {
  'use strict';

  class AIProxyExtension {
    constructor() {
      this.apiUrl = 'https://nexuproxy.onrender.com/';
      this.lastResponse = '';
      this.conversationHistory = [];
      this._isLoading = false;
      this.modelsList = [];
      this.currentModel = null; // null means use server default
      
      // Load models from API in the background
      this.loadModelsFromAPI();
    }

    async loadModelsFromAPI() {
      try {
        const response = await Scratch.fetch(`${this.apiUrl}models`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.models.length > 0) {
            this.modelsList = data.models;
            console.log(`✅ Loaded ${data.models.length} models from API`);
          }
        }
      } catch (error) {
        console.error('Failed to load models from API:', error);
      }
    }

    getInfo() {
      return {
        id: 'aiproxy',
        name: 'NexuGPT',
        color1: '#667eea',
        color2: '#764ba2',
        color3: '#5568d3',
        blocks: [
          {
            opcode: 'askAI',
            blockType: Scratch.BlockType.REPORTER,
            text: 'ask AI [PROMPT]',
            arguments: {
              PROMPT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Hello!'
              }
            }
          },

          {
            opcode: 'askAIWithHistory',
            blockType: Scratch.BlockType.REPORTER,
            text: 'ask AI [PROMPT] with conversation memory',
            arguments: {
              PROMPT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Hello!'
              }
            }
          },
          {
            opcode: 'setModel',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set model to [MODEL]',
            arguments: {
              MODEL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'openrouter/free'
              }
            }
          },
          {
            opcode: 'getCurrentModel',
            blockType: Scratch.BlockType.REPORTER,
            text: 'current model'
          },
          {
            opcode: 'resetModel',
            blockType: Scratch.BlockType.COMMAND,
            text: 'reset model to default'
          },
          {
            opcode: 'getLastResponse',
            blockType: Scratch.BlockType.REPORTER,
            text: 'last AI response'
          },
          {
            opcode: 'clearHistory',
            blockType: Scratch.BlockType.COMMAND,
            text: 'clear conversation history'
          },
          {
            opcode: 'checkIfLoading',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'AI is thinking?'
          },
          {
            opcode: 'getHistoryLength',
            blockType: Scratch.BlockType.REPORTER,
            text: 'conversation length'
          },
          {
            opcode: 'setApiUrl',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set API URL to [URL]',
            arguments: {
              URL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'https://nexuproxy.onrender.com/'
              }
            }
          },
          {
            opcode: 'listModels',
            blockType: Scratch.BlockType.REPORTER,
            text: 'list all available models'
          },
          {
            opcode: 'getModelByIndex',
            blockType: Scratch.BlockType.REPORTER,
            text: 'model [INDEX] ID',
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: 'getModelCount',
            blockType: Scratch.BlockType.REPORTER,
            text: 'number of available models'
          },
          {
            opcode: 'refreshModels',
            blockType: Scratch.BlockType.COMMAND,
            text: 'refresh available models'
          }
        ]
      };
    }

    async askAI(args) {
      const prompt = args.PROMPT;
      if (!prompt) return 'Please provide a prompt';

      this._isLoading = true;

      try {
        let url = `${this.apiUrl}?prompt=${encodeURIComponent(prompt)}`;
        if (this.currentModel) {
          url += `&model=${encodeURIComponent(this.currentModel)}`;
        }
        const response = await Scratch.fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        this.lastResponse = await response.text();
        this._isLoading = false;
        return this.lastResponse;
      } catch (error) {
        this._isLoading = false;
        return `Error: ${error.message}`;
      }
    }

    async askAIWithHistory(args) {
      const prompt = args.PROMPT;
      if (!prompt) return 'Please provide a prompt';

      this._isLoading = true;

      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: prompt
      });

      try {
        const body = {
          messages: this.conversationHistory,
          temperature: 0.7,
          max_tokens: 100000
        };

        // Include the current model if one has been set
        if (this.currentModel) {
          body.model = this.currentModel;
        }

        const response = await Scratch.fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        this.lastResponse = await response.text();
        
        // Add AI response to history
        this.conversationHistory.push({
          role: 'assistant',
          content: this.lastResponse
        });

        this._isLoading = false;
        return this.lastResponse;
      } catch (error) {
        // Remove the user message we added since the request failed
        this.conversationHistory.pop();
        this._isLoading = false;
        return `Error: ${error.message}`;
      }
    }

    setModel(args) {
      this.currentModel = args.MODEL;
    }

    getCurrentModel() {
      return this.currentModel || '(server default)';
    }

    resetModel() {
      this.currentModel = null;
    }

    getLastResponse() {
      return this.lastResponse || 'No response yet';
    }

    clearHistory() {
      this.conversationHistory = [];
      this.lastResponse = '';
    }

    checkIfLoading() {
      return this._isLoading;
    }

    getHistoryLength() {
      return this.conversationHistory.length;
    }

    setApiUrl(args) {
      this.apiUrl = args.URL;
      // Reload models when API URL changes
      this.loadModelsFromAPI();
    }

    listModels() {
      if (this.modelsList.length === 0) {
        return 'Models not loaded yet. Use refresh models block.';
      }
      
      let result = `${this.modelsList.length} models available:\n\n`;
      this.modelsList.forEach((model, index) => {
        result += `${index + 1}. ${model.name}\n   ID: ${model.id}\n\n`;
      });
      return result;
    }

    getModelByIndex(args) {
      const index = parseInt(args.INDEX) - 1; // Convert to 0-based index
      
      if (this.modelsList.length === 0) {
        return 'Models not loaded';
      }
      
      if (index < 0 || index >= this.modelsList.length) {
        return `Invalid index. Use 1-${this.modelsList.length}`;
      }
      
      return this.modelsList[index].id;
    }

    getModelCount() {
      return this.modelsList.length;
    }

    async refreshModels() {
      await this.loadModelsFromAPI();
    }
  }

  Scratch.extensions.register(new AIProxyExtension());
})(Scratch);
