from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
import os
from dotenv import load_dotenv
import logging
from record import ProcessAudio, Document, generate_sas_url
from recall import Recall
import openai
from azure.storage.blob import BlobServiceClient
import base64

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__, template_folder='app/templates', static_folder='app/static')
CORS(app)

RECORDINGS = './recordings'
OFFICIAL_DOCUMENTS = './data/official'
TRANSCRIPTS = './data/transcripts'

os.makedirs(RECORDINGS, exist_ok=True)
os.makedirs(OFFICIAL_DOCUMENTS, exist_ok=True)
os.makedirs(TRANSCRIPTS, exist_ok=True)

# Load environment variables
load_dotenv()
# Load environment variables directly
openai.api_key = os.getenv("PERSONAL_OPENAI_KEY")
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_SEARCH_ENDPOINT = os.getenv("AZURE_SEARCH_ENDPOINT")
AZURE_SEARCH_KEY = os.getenv("AZURE_SEARCH_KEY")
AZURE_OFFICIALBLOB_CONTAINER_NAME = os.getenv("AZURE_OFFICIALBLOB_CONTAINER_NAME")
AZURE_TRANSCRIPTSBLOB_CONTAINER_NAME = os.getenv("AZURE_TRANSCRIPTSBLOB_CONTAINER_NAME")
AZURE_SEARCH_INDEX = os.getenv("AZURE_SEARCH_INDEX")
AZURE_VECTOR_FIELD = os.getenv("AZURE_VECTOR_FIELD")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/health', methods=['GET'])
def health_check():
    if not openai.api_key:
        return "Azure Speech key and region error.", 500
    return "Healthy", 200

@app.route('/upload', methods=['POST'])
def upload_audio():
    logging.debug("Received request")
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded"}), 400
    
    audio = request.files['audio']
    logging.debug(f"Audio file: {audio.filename}")

    try:
        file_path = os.path.join(RECORDINGS, audio.filename)
        audio.save(file_path)
        logging.debug(f"Audio saved at {file_path}")
        processor = ProcessAudio(RECORDINGS)
        transcribed_text = processor.transcribe()
        logging.debug(f"Transcription: {transcribed_text}")
        Document(transcribed_text,OFFICIAL_DOCUMENTS, TRANSCRIPTS)
        
        return jsonify({"message": "Audio transcribed successfully", "file_path": file_path, "transcription": transcribed_text})
    except Exception as e:
        logging.error(f"Error processing audio: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/speech_recall', methods=['POST'])
def speech_recall():
    logging.debug("Received request")
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded"}), 400
    
    audio = request.files['audio']
    file_path = os.path.join(RECORDINGS, audio.filename)
    audio.save(file_path)
    logging.debug(f"Audio file: {audio.filename}")
    with open(file_path, 'rb') as audio:
        transcribed_query = openai.audio.transcriptions.create(
                        model="whisper-1", 
                        file=audio,
                        response_format="text",
                        language='en'
                    )
    recaller = Recall(transcribed_query)
    audio_path = recaller.text_to_speech()
# Read the audio file as Base64
    with open(audio_path, "rb") as audio_file:
        audio_base64 = base64.b64encode(audio_file.read()).decode("utf-8")
    
    # Return both the text and audio
    return jsonify({
        "transcribed_text": transcribed_query,  # Transcribed input query
        "response_text": recaller.query_response,  # Response text
        "audio_base64": audio_base64  # Base64-encoded audio file
    })

@app.route('/documents', methods=['GET'])
def list_documents():
    try:
        # Load Azure Blob Storage credentials
        connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        container_name = os.getenv("AZURE_OFFICIALBLOB_CONTAINER_NAME")

        # Create BlobServiceClient and ContainerClient
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        container_client = blob_service_client.get_container_client(container_name)
        # List all blobs and generate URLs
        documents = []
        for blob in container_client.list_blobs():
            sas_url = generate_sas_url(blob.name)  # Dynamically generate SAS URL for each blob
            if sas_url:
                documents.append({"name": blob.name, "url": sas_url})

        return jsonify(documents)
    except Exception as e:
        logging.error(f"Error listing documents: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8000, debug=True)