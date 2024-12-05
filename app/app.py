from flask import Flask, request, jsonify
from flask_cors import CORS
from audio_recorder import AudioRecorder

app = Flask(__name__)
CORS(app)
recorder = None

@app.route('/start', methods=['POST'])
def start_recording():
    """
    Start audio recording.
    """
    global recorder
    try:
        recorder = AudioRecorder()  # Initialize a new AudioRecorder instance
        recorder.start_recording()  # Start the recording
        return jsonify({"message": "Recording started"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to start recording: {str(e)}"}), 500

@app.route('/stop', methods=['POST'])
def stop_recording():
    """
    Stop audio recording and save the file.
    """
    global recorder
    try:
        if recorder:
            recorder.stop_recording()  # Stop the recording and save the audio
            recorder = None  # Reset the recorder
            return jsonify({"message": "Recording stopped and saved"}), 200
        else:
            return jsonify({"error": "No active recording to stop"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to stop recording: {str(e)}"}), 500
if __name__ == '__main__':
    app.run(debug = True)
