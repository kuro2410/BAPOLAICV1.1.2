import { streamGemini } from './gemini-api.js';

let form = document.querySelector('#promptForm');
let promptInput = document.querySelector('textarea[name="prompt"]');
let chatLog = document.querySelector('#chatLog');
const imageLoader = document.getElementById('imageLoader');
const fileLoader = document.getElementById('fileLoader');
const voiceInputButton = document.querySelector('#voiceInputButton');
const newChatButton = document.querySelector('#new-chat-btn');
const chatList = document.querySelector('.chat-list');
const sidebar = document.querySelector('#sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

let imageBase64 = null;
let fileData = null;
let chatSessions = [];

// Handle Sidebar Toggle
function toggleSidebar() {
  sidebar.classList.toggle('active');
  sidebarOverlay.classList.toggle('active');
}

sidebarToggle.addEventListener('click', toggleSidebar);
sidebarCloseBtn.addEventListener('click', toggleSidebar);
sidebarOverlay.addEventListener('click', toggleSidebar);

// Close sidebar when a nav link is clicked on mobile
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    }
  });
});

// Handle New Chat
newChatButton.addEventListener('click', () => {
  chatLog.innerHTML = '';
  chatSessions.push({ id: chatSessions.length + 1, messages: [] });
  updateChatList();
});

function updateChatList() {
  chatList.innerHTML = chatSessions.length === 0 ? '<p>No chats.</p>' : chatSessions.map(session => `
    <div class="chat-item">Chat ${session.id}</div>
  `).join('');
}

// Handle Image Upload
imageLoader.addEventListener('change', handleImage, false);

function handleImage(e) {
  const reader = new FileReader();
  reader.onload = function(event) {
    imageBase64 = event.target.result.split(',')[1];
    Swal.fire({
      title: 'Success!',
      text: 'Image uploaded successfully!',
      icon: 'success',
      confirmButtonText: 'OK'
    });
  };
  reader.readAsDataURL(e.target.files[0]);
}

// Handle File Upload
fileLoader.addEventListener('change', handleFile, false);

function handleFile(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      fileData = {
        name: file.name,
        content: event.target.result.split(',')[1]
      };
      Swal.fire({
        title: 'Success!',
        text: 'File uploaded successfully!',
        icon: 'success',
        confirmButtonText: 'OK'
      });
    };
    reader.readAsDataURL(file);
  }
}

// Handle Form Submission
form.onsubmit = async (ev) => {
  ev.preventDefault();
  await sendUserMessage(promptInput.value);
};

// Handle Enter Key for Sending Message
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendUserMessage(promptInput.value);
  }
});

async function sendUserMessage(message) {
  if (!message.trim() && !imageBase64 && !fileData) return;

  let userMessage = {
    text: message,
    timestamp: new Date().toLocaleTimeString(),
  };
  chatLog.innerHTML += `
    <div class="message user">
      <div class="text">${userMessage.text}</div>
      <div class="timestamp">${userMessage.timestamp}</div>
    </div>
  `;
  chatLog.scrollTop = chatLog.scrollHeight;
  showTypingIndicator();

  try {
    let contents = [{ type: "text", text: message }];

    if (imageBase64) {
      contents.push({ type: "image", base64: imageBase64 });
    }

    if (fileData) {
      contents.push({ type: "file", name: fileData.name, base64: fileData.content });
    }

    let stream = streamGemini({
      model: 'gemini-2.0-flash-exp',
      contents,
    });

    let buffer = [];
    let md = new markdownit();
    for await (let chunk of stream) {
      buffer.push(chunk);
    }
    let response = buffer.join('');
    hideTypingIndicator();
    let botMessage = {
      text: md.render(response),
      timestamp: new Date().toLocaleTimeString(),
    };
    chatLog.innerHTML += `
      <div class="message bot">
        <div class="icon-container">
          <img src="Chatbot_AI_REMAKEv3.png" alt="AI Icon" class="bot-icon">
        </div>
        <div class="message-content">
          <div class="text">${botMessage.text}</div>
          <div class="timestamp">${botMessage.timestamp}</div>
        </div>
      </div>
    `;
    chatLog.scrollTop = chatLog.scrollHeight;

    promptInput.value = '';
    imageLoader.value = '';
    fileLoader.value = '';
    imageBase64 = null;
    fileData = null;
  } catch (e) {
    console.error(e);
    hideTypingIndicator();
    chatLog.innerHTML += `
      <div class="message bot">
        <div class="icon-container">
          <img src="Chatbot_AI_REMAKEv3.png" alt="AI Icon" class="bot-icon">
        </div>
        <div class="message-content">
          <div class="text">Error: Could not get response.</div>
        </div>
      </div>
    `;
  }
}

function showTypingIndicator() {
  chatLog.innerHTML += `
    <div class="message bot typing">
      <div class="icon-container">
        <img src="Animation typing.gif" alt="Typing..." class="bot-icon">
      </div>
      <div class="message-content">
        <div class="text">Typing...</div>
      </div>
    </div>
  `;
  chatLog.scrollTop = chatLog.scrollHeight;
}

function hideTypingIndicator() {
  const typingIndicator = document.querySelector('.message.typing');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// Voice Input with Web Speech API
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'id-ID';

  let isRecognizing = false;

  recognition.onstart = function() {
    console.log('Voice recognition started.');
    isRecognizing = true;
    voiceInputButton.style.opacity = '1';
  };

  recognition.onspeechend = function() {
    recognition.stop();
  };

  recognition.onend = function() {
    console.log('Recognition ended.');
    isRecognizing = false;
    voiceInputButton.style.opacity = '0.7';
  };

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    console.log('Recognized: ', transcript);
    sendUserMessage(transcript);
  };

  voiceInputButton.addEventListener('click', () => {
    if (!isRecognizing) {
      recognition.start();
    }
  });
} else {
  console.log('Web Speech API is not supported by this browser.');
}