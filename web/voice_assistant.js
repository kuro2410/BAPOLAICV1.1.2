// Voice Assistant Setup menggunakan Web Speech API
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'id-ID';  // Bahasa Indonesia
recognition.interimResults = false; // Hanya hasil final yang digunakan
recognition.maxAlternatives = 1;

// Elemen untuk animasi
const micButton = document.getElementById('voice-assistant-button');
const chatBox = document.getElementById('response-text');
const loadingAnimation = document.getElementById('loading-animation'); // Elemen animasi loading
const aiSpeechAnimation = document.getElementById('ai-speech-animation'); // Elemen animasi AI berbicara
const voiceInputAnimation = document.getElementById('voice-input-animation'); // Animasi input suara

// Sidebar toggle elements
const sidebar = document.querySelector('#sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

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

// Fungsi untuk membersihkan tanda asteris dari teks
function cleanText(text) {
  return text.replace(/[!*#@$%^&()_+=|[\]{};:"',<>/?\\`~]/g, '');  
}

// Fungsi untuk memulai pengenalan suara
function startVoiceRecognition() {
  recognition.start();
  showSpeechRecognitionAnimation(); // Tampilkan animasi pengenalan suara
}

// Event ketika pengenalan suara selesai menangkap input
recognition.onresult = function(event) {
  const voiceText = event.results[0][0].transcript; // Mengambil teks hasil pengenalan suara
  console.log("Voice input:", voiceText);

  // Hentikan animasi pengenalan suara
  hideSpeechRecognitionAnimation();

  // Tampilkan input suara di UI
  document.getElementById('response-text').innerText = "Anda berkata: " + voiceText;

  // Tampilkan animasi loading saat menunggu respons dari AI
  showLoadingAnimation();

  // Kirim teks suara ke backend Flask melalui API /api/voice untuk mendapatkan respons dari AI
  fetch('/api/voice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: voiceText }) // Kirim teks sebagai JSON ke server
  })
  .then(response => response.json()) // Parsing respons JSON dari server
  .then(data => {
    // Bersihkan tanda asteris dari teks respons AI sebelum ditampilkan
    const cleanResponse = cleanText(data.text);

    // Hentikan animasi loading setelah respons AI diterima
    hideLoadingAnimation();

    // Menampilkan respons teks dari AI di UI setelah dibersihkan
    document.getElementById('response-text').innerText = "Voice AI Assistant: " + cleanResponse;

    // Memutar respons audio TTS (dalam format base64) yang dikirimkan dari server
    if (data.audio) {
      const audio = new Audio('data:audio/mp3;base64,' + data.audio);
      audio.play();

      // Tampilkan animasi AI berbicara
      showAISpeechAnimation();

      audio.onended = () => {
        hideAISpeechAnimation(); // Hentikan animasi AI berbicara setelah audio selesai
      };
    } else {
      // Jika audio tidak tersedia, gunakan TTS bawaan dari browser
      const utterance = new SpeechSynthesisUtterance(cleanResponse);
      utterance.lang = 'id-ID'; // Set Bahasa Indonesia

      // Tampilkan animasi AI berbicara
      showAISpeechAnimation();

      speechSynthesis.speak(utterance);

      utterance.onend = () => {
        hideAISpeechAnimation(); // Hentikan animasi AI berbicara setelah TTS selesai
      };
    }
  })
  .catch(error => {
    console.error('Error:', error);
    document.getElementById('response-text').innerText = "Error dalam mendapatkan respons AI.";
    hideLoadingAnimation(); // Sembunyikan animasi loading jika ada error
  });
};

// Tambahkan event listener ke tombol voice assistant untuk memulai pengenalan suara
document.getElementById('voice-assistant-button').addEventListener('click', startVoiceRecognition);

// Menghentikan pengenalan suara jika user berhenti berbicara atau ada error
recognition.onspeechend = function() {
  recognition.stop();
};

recognition.onerror = function(event) {
  console.error('Speech Recognition Error:', event.error);
  document.getElementById('response-text').innerText = 'Error: ' + event.error;
  hideSpeechRecognitionAnimation(); // Hentikan animasi pengenalan suara saat terjadi error
};

// Fungsi untuk menampilkan animasi pengenalan suara
function showSpeechRecognitionAnimation() {
  micButton.classList.add('listening'); // Tambahkan kelas CSS untuk animasi
  voiceInputAnimation.classList.remove('hidden'); // Tampilkan animasi gelombang suara
  chatBox.innerHTML = `<div class="speech-recognition-animation">Mendengarkan...</div>`;
}

// Fungsi untuk menyembunyikan animasi pengenalan suara
function hideSpeechRecognitionAnimation() {
  micButton.classList.remove('listening');
  voiceInputAnimation.classList.add('hidden'); // Sembunyikan animasi gelombang suara
  chatBox.innerHTML = ''; // Hapus teks 'Mendengarkan...'
}

// Fungsi untuk menampilkan animasi loading
function showLoadingAnimation() {
  loadingAnimation.classList.remove('hidden'); // Tampilkan animasi loading
}

// Fungsi untuk menyembunyikan animasi loading
function hideLoadingAnimation() {
  loadingAnimation.classList.add('hidden'); // Sembunyikan animasi loading
}

// Fungsi untuk menampilkan animasi AI berbicara (Text-to-Speech)
function showAISpeechAnimation() {
  aiSpeechAnimation.classList.remove('hidden'); // Tampilkan animasi AI berbicara
}

// Fungsi untuk menyembunyikan animasi AI berbicara (Text-to-Speech)
function hideAISpeechAnimation() {
  aiSpeechAnimation.classList.add('hidden'); // Sembunyikan animasi AI berbicara
}