import os
import numpy as np
import openai
from dotenv import load_dotenv
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
import warnings

class Recall:
    def __init__(self, query):
        self.query = query
        self.endpoint = os.getenv("AZURE_SEARCH_ENDPOINT").rstrip("/")
        self.api_key = os.getenv("AZURE_SEARCH_KEY")
        self.index_name = os.getenv("AZURE_SEARCH_INDEX")
        self.credential = AzureKeyCredential(self.api_key)
        self.vector_field = os.getenv("AZURE_VECTOR_FIELD")
        self.client = SearchClient(self.endpoint, self.index_name, self.credential)
        self.query_response = self.search()

    def generate_query_embedding(self, text):
        """Generate an embedding for the query using OpenAI's API."""
        try:
            response = openai.embeddings.create(
                input=text,
                model="text-embedding-ada-002"
            )
            embedding = response.data[0].embedding
            return embedding
        
        except Exception as e:
            print(f"Error generating query embedding: {e}")
            return None
        
    def search(self):
        results =  self.client.search(query_type='semantic', semantic_configuration_name='default',
                    search_text=self.query ,
                    select='content, meta_data_storage_name',
                    query_caption='extractive'
                    )
        context = ''
        for result in results:
            context += result["content"] + '\n\n'
        
        response = openai.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {
                    "role": "system",
                    "content": f"You are a doctor's personal memory assistant. \
                    Respond in natural language format as if you were speaking to a person. Only use the facts provided in the sources below, and do not make up information. If the answer isn't found in the sources, say, 'I don't know.' Maintain a conversational tone while sticking strictly to the provided information.\
                    Facts:\
                    {context}"
                },
                {
                    "role": "user",
                    "content": self.query
                }
                ]
                    
        )
        return response.choices[0].message.content
    
    def text_to_speech(self):
        """
        Convert a given text to speech using OpenAI's text-to-speech API and play it.
        """
        
        response = openai.audio.speech.create(
                model="tts-1",
                voice="onyx",
                input=self.query_response
        )
        warnings.filterwarnings("ignore", category=DeprecationWarning)
        path = os.path.join('recordings', 'response.mp3')
        response.stream_to_file(path)
        return path

