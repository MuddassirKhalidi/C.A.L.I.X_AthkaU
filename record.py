import os
from dotenv import load_dotenv
import openai
from azure.storage.blob import BlobServiceClient, BlobSasPermissions, generate_blob_sas
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem
import json
from pydub import AudioSegment
import warnings
import shutil
import base64

class ProcessAudio:
    def __init__(self, file_path):
        self.chunk_length_ms = 240000  # 4-minute chunks
        self.audio_dir = file_path 
    
    def transcribe(self):
        """
        Transcribes an audio file by splitting it into chunks, processing each with OpenAI's Whisper API,
        and returning the full transcription text.
        """
        try:
            chunks = self.split_audio()
            warnings.filterwarnings("ignore", category=UserWarning, message="FP16 is not supported on CPU; using FP32 instead")
            
            audio_files = self.save_chunks(chunks)
            full_text = ''
            
            for audio_file in audio_files:
                with open(audio_file, 'rb') as file:
                    try:
                        transcription = openai.audio.transcriptions.create(
                            model="whisper-1", 
                            file=file,
                            response_format="text",
                            language='en'
                        )
                        full_text += transcription  # Append transcription result to the final text
                    except Exception as e:
                        print(f"Error during transcription: {e}")
                        continue  # Skip to the next chunk if there's an error
            
            # Clean up temporary files
            shutil.rmtree(os.path.join(self.audio_dir, 'temp'))
            return full_text

        except Exception as e:
            print(f"Error in transcription process: {e}")
            return ''
    
    def save_chunks(self, chunks):
        """
        Saves the audio chunks to temporary files and returns their paths.
        """
        chunk_files = []
        temp_dir = os.path.join(self.audio_dir, 'temp')
        
        # Create directory if it doesn't exist
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
        
        for i, chunk in enumerate(chunks):
            chunk_filename = os.path.join(temp_dir, f"speech_part{i}.webm")
            try:
                chunk.export(chunk_filename, format="webm")
                chunk_files.append(chunk_filename)
            except Exception as e:
                print(f"Error saving chunk {i}: {e}")
                continue  # Continue saving the next chunk if there's an error
        
        return chunk_files

    def split_audio(self):
        """
        Splits the audio file into smaller chunks to avoid transcription timeouts.
        """
        try:
            audio = AudioSegment.from_file(os.path.join(self.audio_dir, 'recording.webm'))
            chunks = [audio[i:i+self.chunk_length_ms] for i in range(0, len(audio), self.chunk_length_ms)]
            print(f'Audio split into {len(chunks)} chunks')
            return chunks
        except FileNotFoundError:
            print(f"Audio file not found at {self.audio_dir}")
            return []
        except Exception as e:
            print(f"Error splitting audio: {e}")
            return []

class Document:
    def __init__(self, text, pdf_path, txt_path):
        self.text = text
        self.pdf_path = pdf_path
        self.txt_path = txt_path
        notes = self.get_key_details()
        pdf_path, transcript_path = self.generate_pdf(notes)
        if pdf_path:
            self.upload_to_azure(pdf_path, transcript_path)

    def create_transcript(self, name, age):
        path = os.path.join(self.txt_path, f'{name}_{age}.txt')
        with open(path, 'a') as file:
            file.write(self.text)
        return path
    
    def get_key_details(self):
        try:
            response = openai.chat.completions.create(
                model='gpt-4o-mini',
                messages=[
                    {
                        "role": "system",
                        "content": '''You are a doctor listening to a consultation. Given below is a transcription of a
                        consultation with a patient. Return the following information about the patient in JSON style text. If any information \
                        is not provided add a "not provided" to it.
                        1. Name
                        2. Age (return as a string)
                        3. Details from Past Consultations (if any, answer in a string)
                        4. Primary Concern for visit
                        5. Symptoms
                        6. Diagnosis
                        7. Recommended Treatment Plan
                        8. Insurance Coverage
                        9. Recommended Tests
                        10.Notes:quote anything the patient mentioned during the consultation and what you inferred (answer as a list of strings)'''
                    },
                    {
                        "role": "user",
                        "content": f'{self.text}'
                    }
                ]
            )
            
            # Extract the response content
            answer = response.choices[0].message.content
            # Check if the response is empty
            if not answer.strip():
                print("Received an empty response from the API.")
                return None

            # Clean and parse the JSON-like content
            cleaned_answer = answer.strip()
            
            # Remove backticks and the `json` prefix if they exist
            if cleaned_answer.startswith("```json") and cleaned_answer.endswith("```"):
                cleaned_answer = cleaned_answer[7:-3].strip()  # Remove ` ```json` and ` ``` `
            elif cleaned_answer.startswith("```") and cleaned_answer.endswith("```"):
                cleaned_answer = cleaned_answer[3:-3].strip()  # Remove ` ``` `
            
            

            # Parse the cleaned content into JSON
            json_data = json.loads(cleaned_answer)

            # Print the parsed JSON for verification
            json.dumps(json_data, indent=2)
            return json_data
        except Exception as e:
            print(f"An error occurred: {e}")
            return None
        
    def generate_embedding(self, text):
        response = openai.embeddings.create(
            input=text,
            model="text-embedding-ada-002"
        )
        embedding = response.data[0].embedding
        return embedding

    def generate_pdf(self, json_data):
        """
        Generate a well-formatted PDF with headings, text, and bullet points.

        Parameters:
            json_data (dict): The structured data for the PDF, adhering to the standard JSON object format.

        Returns:
            str: The full file path of the generated PDF.
        """
        try:
            # Extract name and age for the filename
            patient_name = json_data.get("Name", "Unknown").replace(" ", "_")
            patient_age = str(json_data.get("Age", "Unknown")).replace(" ", "_")
            transcript_file_path = self.create_transcript(patient_name, patient_age)
            pdf_filename = f"{patient_name}_{patient_age}.pdf"
            full_file_path = os.path.join(self.pdf_path, pdf_filename)

            # Create the PDF document
            pdf = SimpleDocTemplate(full_file_path, pagesize=letter)
            styles = getSampleStyleSheet()

            # Custom styles
            heading_style = ParagraphStyle(
                "Heading",
                parent=styles["Heading2"],
                fontName="Times-Bold",
                fontSize=14,
                spaceAfter=6,
            )
            text_style = ParagraphStyle(
                "BodyText",
                parent=styles["BodyText"],
                fontName="Times-Roman",
                fontSize=12,
                leading=12,
            )
            bullet_style = ParagraphStyle(
                "Bullet",
                parent=text_style,
                bulletFontName="Times-Roman",
                leftIndent=20,
                bulletFontSize=12,
            )

            # Content elements
            elements = []

            # Add each key and its corresponding value
            for key, value in json_data.items():
                # Add key as heading
                elements.append(Paragraph(key, heading_style))

                # Add value based on its type
                if isinstance(value, str):
                    elements.append(Paragraph(value, text_style))
                elif isinstance(value, list):
                    bullets = ListFlowable(
                        [ListItem(Paragraph(item, bullet_style)) for item in value],
                        bulletType="bullet",
                    )
                    elements.append(bullets)
                elements.append(Spacer(1, 6))  # Add spacing after each section

            # Build the PDF
            pdf.build(elements)
            print(f"PDF successfully generated: {full_file_path}")
            return full_file_path, transcript_file_path
        except Exception as e:
            print(f"An error occurred while generating the PDF: {e}")
            return None
    
    def encode_id(self, doc_id):
        """
        Encode the document key using URL-safe Base64.
        """
        return base64.urlsafe_b64encode(doc_id.encode("utf-8")).decode("utf-8")


    def upload_to_azure(self, pdf_path, transcript_path):
        """
        Upload a file to Azure Blob Storage and update the transcripts-index.
        """
        try:
            # Load Azure Blob Storage credentials
            connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
            official_container_name = os.getenv("AZURE_OFFICIALBLOB_CONTAINER_NAME")
            transcripts_container_name = os.getenv("AZURE_TRANSCRIPTSBLOB_CONTAINER_NAME")

            # Azure Cognitive Search credentials
            search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")  # e.g., https://<your-search-service>.search.windows.net
            search_api_key = os.getenv("AZURE_SEARCH_KEY")  # Admin key for your search service
            index_name = "transcripts-index"

            # Create BlobServiceClient and BlobClient
            blob_service_client = BlobServiceClient.from_connection_string(connection_string)
            pdfblob_name = os.path.basename(pdf_path)
            transcriptblob_name = os.path.basename(transcript_path)
            pdf_blob_client = blob_service_client.get_blob_client(container=official_container_name, blob=pdfblob_name)
            transcript_blob_client = blob_service_client.get_blob_client(container=transcripts_container_name, blob=transcriptblob_name)

            # Upload the files to Blob Storage
            with open(pdf_path, "rb") as data:
                pdf_blob_client.upload_blob(data, overwrite=True)
            with open(transcript_path, "rb") as data:
                transcript_blob_client.upload_blob(data, overwrite=True)

            print(f"Files uploaded to Azure Blob Storage: {pdfblob_name}, {transcriptblob_name}")

            # Update the transcripts-index in Azure Cognitive Search
            client = SearchClient(endpoint=search_endpoint, index_name=index_name, credential=AzureKeyCredential(search_api_key))

            # Prepare the document for indexing
            document = {
                "@search.action": "mergeOrUpload",  # Updates or inserts if the document doesn't exist
                "id": self.encode_id(transcriptblob_name),  # Unique identifier for the document (e.g., the blob name)
                "content": self.text,  # The content of the transcript
                "meta_data_storage_name": transcriptblob_name,  # The blob name as metadata
                "text_vector": self.generate_embedding(self.text)  # Call a method to generate vector embedding
            }

            # Upload the document to the index
            result = client.upload_documents(documents=[document])
            print(f"Index update result: {result}")

        except Exception as e:
            print(f"An error occurred while uploading to Azure or updating the index: {e}")




def generate_sas_url(blob_name):
    """
    Generates a SAS URL for a given blob in Azure Blob Storage.
    """
    try:
        # Load Azure Blob Storage credentials
        connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        container_name = os.getenv("AZURE_OFFICIALBLOB_CONTAINER_NAME")

        # Parse account name and key from connection string
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        account_name = blob_service_client.account_name
        account_key = blob_service_client.credential.account_key

        # Generate the SAS token
        sas_token = generate_blob_sas(
            account_name=account_name,
            container_name=container_name,
            blob_name=blob_name,
            account_key=account_key,
            permission=BlobSasPermissions(read=True),  # Only allow read access
            expiry=datetime.utcnow() + timedelta(hours=1)  # Token valid for 1 hour
        )

        # Construct the SAS URL
        blob_url = f"https://{account_name}.blob.core.windows.net/{container_name}/{blob_name}"
        sas_url = f"{blob_url}?{sas_token}"
        print(sas_url)
        return sas_url

    except Exception as e:
        print(f"Error generating SAS URL: {e}")
        return None