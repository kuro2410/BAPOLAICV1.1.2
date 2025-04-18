// Fungsi untuk mengirim pesan pengguna dan mendapatkan respons AI
export async function sendUserMessage(text, history = []) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, history }) // Kirim teks pengguna dan riwayat ke backend
        });
  
        const data = await response.json();
  
        if (data.text) {
            // Tambahkan respons AI ke antarmuka
            displayMessage(data.text, 'ai');
        } else if (data.error) {
            console.error("Error:", data.error);
        }
    } catch (error) {
        console.error("Error sending message:", error);
    }
  }
  
  // Fungsi untuk streaming respons AI dengan Gemini
  export async function* streamGemini({
    model = 'gemini-2.0-flash-exp',
    contents = [],
    history = [] // Riwayat percakapan untuk konteks
  } = {}) {
    try {
        let response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, contents, history }) // Kirim riwayat percakapan ke backend
        });
  
        yield* streamResponseChunks(response);
    } catch (error) {
        console.error("Error streaming response:", error);
    }
  }
  
  // Fungsi untuk memproses aliran respons (chunks) dari server
  async function* streamResponseChunks(response) {
    let buffer = '';
    const CHUNK_SEPARATOR = '\n\n';
  
    const processBuffer = async function* (streamDone = false) {
        while (true) {
            let flush = false;
            let chunkSeparatorIndex = buffer.indexOf(CHUNK_SEPARATOR);
  
            if (streamDone && chunkSeparatorIndex < 0) {
                flush = true;
                chunkSeparatorIndex = buffer.length;
            }
  
            if (chunkSeparatorIndex < 0) break;
  
            let chunk = buffer.substring(0, chunkSeparatorIndex);
            buffer = buffer.substring(chunkSeparatorIndex + CHUNK_SEPARATOR.length);
            chunk = chunk.replace(/^data:\s*/, '').trim();
  
            if (!chunk) {
                if (flush) break;
                continue;
            }
  
            let { error, text } = JSON.parse(chunk);
            if (error) {
                console.error(error);
                throw new Error(error?.message || JSON.stringify(error));
            }
            yield text;
  
            if (flush) break;
        }
    };
  
    const reader = response.body.getReader();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += new TextDecoder().decode(value);
            yield* processBuffer();
        }
    } finally {
        reader.releaseLock();
    }
  
    yield* processBuffer(true);
  }
  
  // Fungsi untuk streaming respons dari input suara
  export async function* streamGeminiVoice({ text, model = 'gemini-2.0-flash-exp', history = [] } = {}) {
    try {
        let response = await fetch("/api/voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, model, history }) // Kirim riwayat percakapan ke endpoint voice
        });
  
        yield* streamResponseChunks(response);
    } catch (error) {
        console.error("Error streaming voice response:", error);
    }
  }
  
  // Fungsi untuk streaming respons multimodal (teks + gambar + file)
  export async function* streamGeminiMultimodal({ contents = [], model = 'gemini-2.0-flash-exp', history = [] } = {}) {
    try {
        let response = await fetch("/api/multimodal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, contents, history }) // Kirim riwayat percakapan ke backend
        });
  
        yield* streamResponseChunks(response);
    } catch (error) {
        console.error("Error streaming multimodal response:", error);
    }
  }
  
  // Fungsi untuk menampilkan pesan ke UI
  function displayMessage(message, sender) {
    const chatContainer = document.querySelector('#chat-container'); // Pastikan elemen ini ada di HTML Anda
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}`;
    messageElement.textContent = message;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  