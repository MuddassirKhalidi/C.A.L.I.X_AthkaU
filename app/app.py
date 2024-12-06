from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)


UPLOAD_FOLDER = './recordings'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/upload', methods=['POST'])
def upload_audio():
    audio = request.files['audio']
    file_path = os.path.join(UPLOAD_FOLDER, audio.filename)
    audio.save(file_path)
    return jsonify({"message": "Audio uploaded successfully", "file_path": file_path})

if __name__ == '__main__':
    app.run(debug = True)
