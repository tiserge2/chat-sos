'''
LIBRARY IMPORT
'''
import certifi
import pymongo
from bson.json_util import dumps
from flask import Flask, request
from flask_compress import Compress
from flask_cors import CORS
from pprint import pprint
from dotenv import load_dotenv
import os

import openai 
from transformers import GPT2TokenizerFast
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain.chains import ConversationalRetrievalChain
from langchain.chat_models import ChatOpenAI
from pinecone import Pinecone as pinecone

from io import StringIO
from pdfminer.converter import TextConverter
from pdfminer.layout import LAParams
from pdfminer.pdfdocument import PDFDocument
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.pdfpage import PDFPage
from pdfminer.pdfparser import PDFParser
'''
END LIBRARY IMPORT
'''


'''
ENVIRONEMENT VARIABLES
'''
# Load environment variables from .env file
load_dotenv()

# Access the environment variables
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
MONGO_CLIENT_LINK = os.getenv('MONGO_CLIENT_LINK')
PINECONE_HOST = os.getenv('PINECONE_HOST')
'''
END ENVIRONEMENT VARIABLES
'''

pc = pinecone(api_key=PINECONE_API_KEY, environment="asia-southeast1-gcp-free")
os.environ["TOKENIZERS_PARALLELISM"] = "false"
openai.api_key = OPENAI_API_KEY

'''
DATABASE SETUP
'''
my_client = pymongo.MongoClient(
    MONGO_CLIENT_LINK,
    tlsCAFile=certifi.where())

my_db = my_client["utility"]

configuration_col = my_db['configuration']

col = {
    'configuration_col': configuration_col,
}
'''
END DATABASE SETUP
'''

'''
FLASK APP SETUP
'''
compress = Compress()
app = Flask(__name__, static_url_path='')
CORS(app)
compress.init_app(app)

UPLOAD_FOLDER = './files'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 120 * 1024 * 1024
'''
END FLASK APP SETUP
'''


'''
COMMON MESSAGES
'''
NOT_AUTHORIZED_STRING = "You are not authorized to access this feature."
NOT_AUTHENTICATED_STRING = "You are not authenticated to access the app."
DATA_SUCCESS = "Operation done successfully"
DATA_FAILED = "Some error occurred while loading data."
'''
END OF COMMON MESSAGES
'''



@app.route('/status')
def status():
    """
    API Status Endpoint
    
    This function defines the '/status' route and returns a simple JSON 
    response indicating that the API is online. This endpoint can be 
    used to verify if the API server is running and accessible.
    
    Returns:
        dict: A dictionary containing the status message.
    """
    # Return a JSON response to indicate the API is online
    return {'stat': 'API is ONLINE'}


@app.route('/ask_assistant', methods=['POST'])
def ask_assistant():
    """
    Chat Assistant Endpoint
    
    This function defines the '/ask_assistant' route, which processes incoming
    POST requests to interact with a chat assistant powered by GPT or custom 
    data. It retrieves messages from the request, removes specific items,
    loads configuration, and decides whether to use GPT alone or include custom
    data via embeddings for response generation.
    
    Returns:
        dict: JSON response with the assistant's reply or an error status.
    """
    try:
        # Retrieve and filter incoming messages
        messages = request.json['messages']
        messages = [msg for msg in messages if '[NEW FILE UPLOADED TO CHAT]' not in msg['content']]
        # Remove all items with '[NEW FILE UPLOADED TO CHAT]'

        # Retrieve configuration for the assistant
        config = list(configuration_col.find({"type": "chatsos"}))[0]
        selectedModel = config['selectedModel']
        persona = config['persona']
        temperature = config['temperature']
        chatCompletionChoices = config['chatCompletionChoices']
        maxTokens = config['maxTokens']
        useUploadedData = config['useUploadedData']

        # If no uploaded data is to be used, respond with GPT only
        if useUploadedData == "No":
            print("Using only GPT")
            messages.insert(0, {"role": "system", "content": persona})
            response = openai.ChatCompletion.create(
                model=selectedModel,
                messages=messages,
                temperature=temperature,
                max_tokens=maxTokens,
                n=chatCompletionChoices
            )
            response_ = response['choices'][0]['message']['content']

        # If uploaded data is to be used, include custom data in the response
        else:
            print("Using GPT with custom data")
            message = messages[-1]['content']  # User's latest message
            history = []

            # Organize messages into a list of conversation pairs for context
            for i in range(len(messages) - 1):
                if i % 2 == 0:
                    history.append((messages[i]['content'], messages[i + 1]['content']))

            # Set up vector store and embeddings for custom data retrieval
            embeddings = OpenAIEmbeddings()
            index = pc.Index('chat-os', host=PINECONE_HOST)
            vectorstore = PineconeVectorStore(index, embeddings)

            # Initialize LLM and QA chain with the custom data vector store
            llm = ChatOpenAI(
                openai_api_key=OPENAI_API_KEY,
                model_name=selectedModel,
                temperature=temperature
            )
            qa = ConversationalRetrievalChain.from_llm(
                llm, 
                vectorstore.as_retriever()
            )

            # Get assistant's response based on custom data
            response = qa({"question": message, "chat_history": history})
            response_ = response['answer']

        # Return successful response with assistant's message
        return {
            'status': True,
            'message': DATA_SUCCESS,
            'data': {'message': {"role": "assistant", "content": response_}}
        }

    except Exception as e:
        # Log the error and return a failure status
        print(e)
        return {'status': False, 'message': DATA_FAILED}


@app.route('/update_gpt_database', methods=['POST'])
def update_gpt_database():
    """
    Update GPT Database Endpoint
    
    This endpoint allows for updating the GPT-powered assistant's database with 
    new information by uploading a PDF file. The file is parsed for text, 
    which is then sent to Pinecone for embedding and storage. This enables 
    the assistant to use custom data for responses.
    
    Returns:
        dict: JSON response indicating success or failure of the update process.
    """
    try:
        # Check if the file part is present in the request
        if 'file' not in request.files:
            return {'status': False, 'message': 'No file part in the request'}

        file = request.files['file']

        # Check if a file has been selected by the user
        if file.filename == '':
            return {'status': False, 'message': 'No selected file'}

        # If file exists, proceed with saving and processing
        if file:
            filename = file.filename
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)

            # Parse text content from the PDF file
            text = parse_pdf(file_path)
            print("Text Parsing Done...")

            # Send the parsed text to Pinecone for indexing
            res_pinecone = send_data_to_pinecone(text, "chat-os")
            print("Data successfully sent to pinecone...")

            # Check if upload to Pinecone was successful
            if res_pinecone == "DONE":
                return {'status': True, 'message': DATA_SUCCESS}
            else:
                return {'status': False, 'message': DATA_FAILED}

    except Exception as e:
        # Log the exception and return failure response
        print(e)
        return {'status': False, 'message': DATA_FAILED}


@app.route('/update_config', methods=['POST'])
def update_config():
    """
    Update Configuration Endpoint
    
    This endpoint allows updating the assistant's configuration in the database.
    It receives new configuration data in JSON format and updates the document 
    in the 'configuration_col' collection where the type is "chatsos".
    
    Returns:
        dict: JSON response indicating whether the configuration update was 
              successful or if an error occurred.
    """
    # Retrieve the 'config' data from the incoming JSON request
    config = request.json['config']

    try:
        # Update the configuration document in the database
        configuration_col.update_one({"type": "chatsos"}, {"$set": config})

        # Return success response if update was successful
        return {'status': True, 'message': DATA_SUCCESS}
    except Exception as e:
        # Log the exception and return failure response if an error occurs
        print(e)
        return {'status': False, 'message': DATA_FAILED}


@app.route('/get_config', methods=['GET'])
def get_config():
    """
    Retrieve Configuration Endpoint
    
    This endpoint retrieves the assistant's configuration from the database.
    It fetches the document from the 'configuration_col' collection where 
    the type is "chatsos" and returns it as JSON.
    
    Returns:
        dict: JSON response containing the configuration data if successful, 
              or an error message if the retrieval fails.
    """
    try:
        # Fetch the configuration document from the database where type is "chatsos"
        response = configuration_col.find({"type": "chatsos"})
        
        # Convert the response to JSON format and return success response
        return {'status': True, 'message': DATA_SUCCESS, 'data': dumps(response)}
    except Exception as e:
        # Log the exception and return failure response if an error occurs
        print(e)
        return {'status': False, 'message': DATA_FAILED}

'''
UTILITY FUNCTIONS
'''
def parse_pdf(file_path):
    """
    PDF Parsing Function
    
    This function reads a PDF file from the specified file path, extracts 
    its text content, and returns it as a string. It uses pdfminer's 
    classes and methods to process each page of the PDF and retrieve 
    textual data.
    
    Args:
        file_path (str): Path to the PDF file.
    
    Returns:
        str: All extracted text from the PDF.
    """
    # Initialize a StringIO object to store extracted text
    output_string = StringIO()
    
    # Open the PDF file in binary read mode
    with open(file_path, 'rb') as in_file:
        parser = PDFParser(in_file)  # Create PDF parser
        doc = PDFDocument(parser)    # Link parser with document object
        
        # Resource manager to handle shared resources
        rsrcmgr = PDFResourceManager()
        
        # Set up the text converter with the resource manager and output buffer
        device = TextConverter(rsrcmgr, output_string, laparams=LAParams())
        
        # Interpreter to process each page
        interpreter = PDFPageInterpreter(rsrcmgr, device)
        
        # Process each page in the PDF
        for page in PDFPage.create_pages(doc):
            interpreter.process_page(page)
    
    # Retrieve all extracted text from the output buffer
    all_values = output_string.getvalue()
    return all_values


def count_tokens(text):
    """
    Count Tokens in Text
    
    This function uses the GPT-2 tokenizer to encode the input text and 
    returns the number of tokens. Tokens are the smallest units of text 
    that the model processes, and the function calculates how many tokens 
    are required to represent the input text.
    
    Args:
        text (str): The input text for which the token count is required.
    
    Returns:
        int: The number of tokens in the input text.
    """
    # Initialize the GPT-2 tokenizer
    tokenizer = GPT2TokenizerFast.from_pretrained("gpt2")
    
    # Encode the text and return the length of the encoded tokens
    return len(tokenizer.encode(text))


def send_data_to_pinecone(text, index_name):
    """
    Send Data to Pinecone
    
    This function processes the input text by splitting it into smaller chunks, 
    generating embeddings for those chunks, and then sending the data to 
    Pinecone for storage and retrieval. It uses the OpenAI embeddings for 
    vectorizing the text and the PineconeVectorStore to store the resulting 
    vectors in a specified Pinecone index.
    
    Args:
        text (str): The text content to be processed and stored.
        index_name (str): The name of the Pinecone index where the data will be stored.
    
    Returns:
        str: "DONE" if the data is successfully sent to Pinecone, "FAILED" if there is an error.
    """
    try:
        print("Splitting data into chunks...")
        
        # Initialize the text splitter to divide the text into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=512,          # Max chunk size in terms of tokens
            chunk_overlap=24,        # Tokens to overlap between chunks
            length_function=count_tokens  # Function to count tokens in the text
        )

        # Split the text into smaller documents based on the defined chunk size
        chunks = text_splitter.create_documents([text])

        # Initialize embeddings using OpenAI embeddings model
        embeddings = OpenAIEmbeddings()

        print("Sending Data to Pinecone...")

        # Create a PineconeVectorStore and send the chunks and embeddings to Pinecone
        vector_store = PineconeVectorStore.from_documents(chunks, embedding=embeddings, index_name=index_name)

        # Return success message if data was successfully sent
        return "DONE"
    except Exception as e:
        # Print the exception and return failure message if an error occurs
        print(e)
        return "FAILED"
'''
END UTILITY FUNCTIONS
'''


if __name__ == '__main__':
    app.run(debug=True)