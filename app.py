from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__, template_folder='app/templates', static_folder='app/static')
CORS(app)


UPLOAD_FOLDER = './recordings'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_audio():
    audio = request.files['audio']
    file_path = os.path.join(UPLOAD_FOLDER, audio.filename)
    audio.save(file_path)
    return jsonify({"message": "Audio uploaded successfully", "file_path": file_path})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)

