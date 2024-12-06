from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from audio_processor import AudioProcessor
import os
from dotenv import load_dotenv


app = Flask(__name__, template_folder='app/templates', static_folder='app/static')
CORS(app)


UPLOAD_FOLDER = './recordings'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load environment variables
load_dotenv()
SPEECH_KEY = os.getenv("SPEECH_KEY")
SPEECH_REGION = os.getenv("SPEECH_REGION")



@app.route('/')
def home():
    return render_template('index.html')

@app.route('/health', methods=['GET'])
def health_check():
    if not SPEECH_KEY or not SPEECH_REGION:
        return "Azure Speech key and region error.", 500

    return "Healthy", 200


@app.route('/upload', methods=['POST'])
def upload_audio():
    audio = request.files['audio']
    file_path = os.path.join(UPLOAD_FOLDER, audio.filename)
    audio.save(file_path)
    input_file = file_path
    output_file = "recordings/recording.wav"

    processor = AudioProcessor(SPEECH_KEY, SPEECH_REGION, input_file, output_file)
    
    # Transcribe the converted .wav file
    transcribed_text = processor.transcribe_audio()
    return jsonify({"message": "Audio transcribed successfully", "file_path": file_path, "transcription": transcribed_text})

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8000, debug=True)

