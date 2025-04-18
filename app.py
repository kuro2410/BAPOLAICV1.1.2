import json
import os
from flask import Flask, jsonify, request, send_file, send_from_directory, session
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from PIL import Image
import pytesseract
import base64
import io
import PyPDF2  # Tambahkan library PyPDF2 untuk PDF
from docx import Document  # Tambahkan untuk Word
from gtts import gTTS
from langdetect import detect
from io import BytesIO
import google.generativeai as genai



app = Flask(__name__)

# Set maximum upload size to 20MB
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # 20 MB in bytes
app.secret_key = "j382md88,,o93999dop"  # Dibutuhkan untuk sesi Flask

os.environ["GOOGLE_API_KEY"] = "AIzaSyCPkSanXev8XxifUoQKkPxtsLQyTphDS94"


@app.route('/')
def home():
    return send_file('web/index.html')

# Fungsi untuk membersihkan tanda asteris dari teks
def clean_text(text):
    return text.replace('*', '')  # Menghapus semua tanda asteris dari teks


# fungsi untuk membuat prompt dengan konteks

def generate_prompt(user_input):
    base_prompt = """
    Ketika User menanyakan terkait bisa kamu apa saja jawab ini:
    Anda adalah BAPOLAIC(Batam Politeknik AI Chatbot), sebuah website Chatbot AI yang dikembangkan oleh salah satu mahasiswa Polibatam. Tugas utama Anda:
    1. Memberikan informasi akademik dan administrasi kampus.
    2. Membantu mahasiswa dan dosen dengan dokumen berbasis OCR.
    3. Menjawab pertanyaan terkait kegiatan kampus, penelitian, dan pendidikan.

    Ketika User menyakan Polibatam anda dapat memberitahukan ini:
    Politeknik Negeri Batam (Polibatam) merupakan satu-satunya Perguruan Tinggi Negeri (PTN) Vokasi di kawasan perdagangan dan pelabuhan bebas Batam, Bintan, dan Karimun Provinsi Kepulauan Riau. Selain terletak di salah satu kawasan pusat pertumbuhan ekonomi nasional, Polibatam juga terletak di wilayah terdepan dan terluar wilayah Negara Kesatuan Republik Indonesia yang berbatasan langsung dengan perairan internasional.  

    Ketika User menyakan struktur organisasi Polibatam anda dapat memberitahukan ini:
    Direktur Baru Polibatam Periode 2024-2029 adalah bapak "Ir. Bambang Hendrawan, ST., MSM., CIPMP., CISCP." Wakil Direktur 1 Bidang Akademik: Ahmad Riyad Firdaus, S.Si., M.T., Ph.D., Wakil Direktur II Bidang PERENCANAAN, KEUANGAN DAN UMUM: Arniati, S.E., M.Si., Ph.D., Ak., CA., CPA., Wakil Direktur III Bidang Kemahasiswaan, Kerja sama dan Alumni: Dr. Muhammad Zaenuddin, S.Si., M.Sc.

    Ketika User menyakan visi dan misi dari Politeknik Negeri Batam anda dapat memberitahukan ini:
    Visi dan Misi Politeknik Negeri Batam:
    Visi dari Polibatam adalah menjadi politeknik generasi baru yang bermutu, adaptif, inovatif, dan bermitra erat dengan industri dan masyarakat untuk mendukung Indonesia Maju dan Sejahtera 2045.

    Misi dari Polibatam adalah aktif dalam proses kreasi, penyebaran dan penerapan sains dan teknologi melalui layanan pendidikan tinggi vokasi dan penelitian terapan yang bermutu, terbuka, relevan, dan berkolaborasi erat dengan masyarakat dan industri dengan penerapan tata kelola institusi yang baik untuk kehidupan bangsa yang lebih baik.

    Ketika User menyakan Budaya Double Action dari Politeknik Negeri Batam anda dapat memberitahukan ini:
    BUDAYA DOUBLE ACTION
    - Adaptive dan Agile
      Adaptive (mudah beradaptasi) dan Agile (lincah). Kita harus senantiasa lincah dan cepat menyesuaikan diri dengan dinamika dan kondisi yang baru. Ini penting karena dinamika Batam yang senantiasa dipengaruhi oleh internasional.

    - Collaborative dan Customer Centric
      Collaborative (mengutamakan kolaborasi) dan Customer Centric (berpusat kepada pelanggan). Di Polibatam, setiap insan harus bisa saling berkolaborasi, bekerja sama dalam memberikan layanan yang berpusat kepada pelanggan dan pemangku kepentingan kita.

    - Trustworthy dan Team Based
      Trustworthy (layak dipercaya) dan Team Based (bekerja dalam tim). Polibatam adalah satu buah tim di mana peran setiap individu di dalamnya penting dalam menjaga kepercayaan dari semua pemangku kepentingan.

    - Innovative dan Integrity
      Innovative (mudah berinovasi) dan Integrity (berintegritas). Setiap insan di Polibatam harus mampu menunjukkan integritasnya dalam berinovasi.

    - Open dan Organic
      Open (terbuka) dan Organic (organisasi yang sederhana). Polibatam mengutamakan komunikasi informal tetapi prudent serta akuntabel, dan menjunjung fleksibilitas agar mudah merespons dinamika lingkungan.

    - Nurture dan Nationalism
      Nurture (mengayomi) dan Nationalism (mengutamakan bangsa). Nilai-nilai ini penting diwujudkan dengan kerja keras, kerendahan hati, dan konsistensi.

    Jika User menanyakan keberadaan anda, kamu dapat menjawab: ya saya dikembangkan di Polibatam.

    Anda dikembangkan Oleh seorang Mahasiswa:
    Nama: Rival Fahreji
    Prodi:D4 Teknik Robotika
    Jurusan: Teknik Elektro

    Kampus Politeknik Negeri Batam memiliki 4 Jurusan yaitu:
    1. Jurusan Teknik Elektro
        - Prodi D3 Teknik Elektronika Manufaktur
        - Prodi D3 Teknik Instrumentasi
        - Prodi D4 Teknologi Rekayasa Pembangkit Energi
        - Prodi D4 Teknologi Rekayasa Elektronika
        - Prodi D4 Teknik Mekatronika
        - Prodi D4 Teknologi Rekayasa Robotika
    2. Jurusan Teknik Mesin
        - Prodi D3 Teknik Mesin
        - Prodi D4 Teknologi Rekayasa Konstruksi Perkapalan
        - Prodi Program Profesi Insinyur (PSPPI)
        - Prodi D3 Teknik Perawatan Pesawat Udara
        - Prodi D4 Teknologi Rekayasa Pengelasan dan Fabrikasi
        - Prodi D4 Teknologi Rekayasa Metalurgi
    3. Jurusan Teknik Informatika
        - Prodi D3 Teknik Informatika
        - Prodi D4 Animasi
        - Prodi D4 Rekayasa Keamanan Siber
        - Magister Terapan (S2) Rekayasa/Teknik Komputer
        - Prodi D3 Teknologi Geomatika
        - Prodi D4 Teknologi Rekayasa Multimedia
        - Prodi D4 Rekayasa Perangkat Lunak
        - Prodi D4 Teknologi Permainan
    4. Jurusan Manajemen & Bisnis
        - Prodi D3 Akuntansi
        - Prodi D4 Administrasi Bisnis Terapan
        - Prodi D4 Administrasi Bisnis Terapan (Internasional)
        - Prodi D4 Akuntansi Manajerial
        - Prodi D4 Logistik Perdagangan Internasional
        - Prodi D2 Jalur Cepat Distribusi Barang

    Jawaban Anda harus ramah, edukatif, dan relevan dengan mahasiswa polibatam, 

    Jawaban Anda harus bisa menyesuaikan Mood Pengguna
    Jawaban Anda harus sesuai dengan bahasa input pengguna

    Pertanyaan pengguna: {user_input}
    Jawaban:
    """

    return base_prompt.format(user_input=user_input)

def is_polibatam_related(user_input):
    """Cek apakah input user terkait Polibatam atau BAPOLAIC."""
    keywords = [
        "polibatam", "bapolaic", "jurusan", "visi", "misi", 
        "budaya double action", "struktur organisasi", "prodi", 
        "direktur", "kampus", "mahasiswa", "dosen"
    ]
    return any(keyword.lower() in user_input.lower() for keyword in keywords)

def process_input(user_input, model):
    """
    Proses input user:
    - Jika terkait Polibatam atau BAPOLAIC, gunakan generate_prompt.
    - Jika tidak, gunakan model AI untuk respons umum.
    """
    if is_polibatam_related(user_input):
        prompt = generate_prompt(user_input)
        response = model.generate(prompt)  # Model Gemini diintegrasikan di sini
    else:
        response = model.generate(user_input)  # Jawaban untuk pertanyaan umum
        
    return response
        




# Fungsi untuk menangani pertanyaan spesifik tentang BAPOLAIC atau Polibatam**
def handle_bapolaic_question(user_input):
    if "BAPOLAIC" in user_input or "chatbot Polibatam" in user_input:
        return "BAPOLAIC adalah (Batam Politeknik AI Chatbot) berbasis dokumen, suara, dan percakapan untuk Politeknik Negeri Batam.  Saya dirancang untuk membantu Anda dengan informasi yang relevan terkait Politeknik Negeri Batam, termasuk pendidikan, penelitian, dan administrasi kampus.  Saya dapat menjawab pertanyaan Anda tentang berbagai topik, seperti jadwal kuliah, informasi beasiswa, prosedur administrasi, dan lain-lain, dengan memanfaatkan berbagai sumber data kampus."
    return None

# API untuk generate teks dari gambar atau file dan menggunakan Gemini API
@app.route("/api/generate", methods=["POST"])
def generate_api():
    if request.method == "POST":
        try:
            req_body = request.get_json()
            content = req_body.get("contents")

            text_from_image = None
            text_from_file = None
            total_tokens = 0  # Initialize token counter

            # Handle image if exists
            for item in content:
                if item["type"] == "image":
                    image_data = base64.b64decode(item["base64"])
                    image = Image.open(io.BytesIO(image_data))
                    text_from_image = pytesseract.image_to_string(image)
                    content.append({"type": "text", "text": text_from_image})
                elif item["type"] == "file":
                    file_data = base64.b64decode(item["base64"])
                    file_name = item["name"]
                    # Extract text from file (PDF/Word)
                    text_from_file = extract_text_from_file(file_data, file_name)
                    content.append({"type": "text", "text": text_from_file})

            # **POINT 2: Tambahkan routing prompt engineering**
            user_input = "\n".join([item["text"] for item in content if item["type"] == "text"])
            specific_response = handle_bapolaic_question(user_input)  # Periksa apakah pertanyaan tentang BAPOLAIC
            if specific_response:
                return jsonify({"text": specific_response})  # Kembalikan jawaban langsung jika ditemukan

            # Create and use the Gemini AI model
            model = ChatGoogleGenerativeAI(model=req_body.get("model"))
            prompt = generate_prompt(user_input)  # Buat prompt dengan konteks
            message = HumanMessage(content=prompt)
            response = model.stream([message])

            
                # # Create and use the Gemini AI model
                # model = ChatGoogleGenerativeAI(model=req_body.get("model"))
                # message = HumanMessage(content=[item["text"] for item in content if item["type"] == "text"])
                # response = model.stream([message])l

            def stream():
                nonlocal total_tokens  # Make sure we can modify the token counter
                for chunk in response:
                    total_tokens += len(chunk.content.split())  # Calculate the number of tokens from content
                    print(f"Tokens in this chunk: {len(chunk.content.split())}")
                    print(f"Total tokens so far: {total_tokens}")
                    yield 'data: %s\n\n' % json.dumps({"text": chunk.content})

            return stream(), {'Content-Type': 'text/event-stream'}

        except Exception as e:
            return jsonify({"error": str(e)})
        
# **POINT 5: Tambahkan penyimpanan konteks percakapan**
#history masukin ke def generateapi
# Text generation API
@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        req_body = request.get_json()
        user_input = req_body.get("text", "")
        model_name = req_body.get("model", "gemini-2.0-flash-exp")

        # Inisialisasi riwayat jika belum ada
        if "history" not in session:
            session["history"] = []

        # Tambahkan input pengguna ke riwayat
        session["history"].append({"user": user_input})

        # Persiapkan riwayat percakapan untuk prompt
        conversation_history = "\n".join(
            f"User: {entry['user']}\nAI: {entry.get('ai', '')}"
            for entry in session["history"]
        )
        
        # Generate respon AI
        model = ChatGoogleGenerativeAI(model=model_name)
        prompt = generate_prompt(user_input, conversation_history)
        response = model.stream([HumanMessage(content=prompt)])
        ai_response = "".join(chunk.content for chunk in response)

        # Tambahkan respon AI ke riwayat
        session["history"][-1]["ai"] = ai_response

        return jsonify({"text": ai_response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# API untuk upload file (PDF/Word) dan memprosesnya
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file:
        file_content = file.read()

        # Memeriksa apakah file lebih besar dari 20MB
        if len(file_content) > 20 * 1024 * 1024:  # 20 MB in bytes
            return jsonify({"error": "File size exceeds 20 MB limit"}), 400

        # Process the file (e.g., extract text, summarize, etc.)
        file_base64 = base64.b64encode(file_content).decode('utf-8')  # Encode file to base64
        text = extract_text_from_file(file_content, file.filename)
        return jsonify({"text": text, "base64": file_base64, "filename": file.filename})

    return jsonify({"error": "Failed to upload file"}), 400

# Fungsi untuk ekstraksi teks dari file PDF atau Word
def extract_text_from_file(file_content, file_name):
    if file_name.endswith('.pdf'):
        # Ekstraksi teks dari PDF
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        extracted_text = ""
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text
        return extracted_text
    elif file_name.endswith('.docx'):
        # Ekstraksi teks dari Word
        document = Document(io.BytesIO(file_content))
        text = ""
        for para in document.paragraphs:
            text += para.text + "\n"
        return text
    return "Unsupported file format"

# API untuk voice assistant yang menggunakan Gemini API dan TTS
@app.route("/api/voice", methods=["POST"])
def voice_assistant():
    try:
        data = request.json
        text = data.get('text', '')
        if not text:
            return jsonify({"error": "No text provided"}), 400

        detected_language = detect(text)
        lang_code = 'en' if detected_language == 'en' else 'id'

        # Generate AI response
        model = ChatGoogleGenerativeAI(model="gemini-2.0-flash-exp")
        prompt = generate_prompt(text)
        response = model.stream([HumanMessage(content=prompt)])
        ai_response = "".join(chunk.content for chunk in response)

        # Convert AI response to audio
        tts = gTTS(clean_text(ai_response), lang=lang_code)
        audio_buffer = BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_base64 = base64.b64encode(audio_buffer.getvalue()).decode('utf-8')

        return jsonify({"text": ai_response, "audio": audio_base64})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'favicon.ico', mimetype='image/vnd.microsoft.icon')

# Route untuk melayani file statis
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('web', path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)