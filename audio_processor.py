import os
from dotenv import load_dotenv
import azure.cognitiveservices.speech as speechsdk
import ffmpeg


class AudioProcessor:
    def __init__(self, input_file: str, output_file: str):
        # Load environment variables
        load_dotenv()

        self.SPEECH_KEY = os.getenv("SPEECH_KEY")
        self.SPEECH_REGION = os.getenv("SPEECH_REGION")

        if not self.SPEECH_KEY or not self.SPEECH_REGION:
            raise ValueError("Azure Speech key and region must be set in the environment variables.")

        # Initialize Azure Speech Service configuration
        self.speech_config = speechsdk.SpeechConfig(subscription=self.SPEECH_KEY, region=self.SPEECH_REGION)

        self.input_file = input_file
        self.output_file = output_file

        # Convert the .webm file to .wav during instantiation
        self.convert_to_wav()

    def convert_to_wav(self):
        """
        Converts the input .webm file to a .wav file using ffmpeg.
        """
        try:
            ffmpeg.input(self.input_file).output(self.output_file, ar=16000, ac=1).run(overwrite_output=True)
            print(f"Conversion successful: {self.output_file}")
        except ffmpeg.Error as e:
            print(f"Error during conversion: {e}")
            raise

    def transcribe_audio(self):
        """
        Transcribes the audio from the .wav file using Azure Speech Service.
        """
        # Configure Azure Speech Service with the .wav file
        audio_config = speechsdk.audio.AudioConfig(filename=self.output_file)

        # Create a speech recognizer
        speech_recognizer = speechsdk.SpeechRecognizer(speech_config=self.speech_config, audio_config=audio_config)

        # Perform speech-to-text
        print("Transcribing...")
        result = speech_recognizer.recognize_once()

        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            print(f"Recognized: {result.text}")
            return result.text
        elif result.reason == speechsdk.ResultReason.NoMatch:
            print("No speech could be recognized.")
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation_details = result.cancellation_details
            print(f"Speech Recognition canceled: {cancellation_details.reason}")
            if cancellation_details.error_details:
                print(f"Error details: {cancellation_details.error_details}")

        return None
