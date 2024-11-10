# ChatSOS

ChatSOS is an interactive chat application designed to configure and manage the behavior of a conversational assistant model. It provides an Admin Panel to easily adjust configuration parameters for the chatbot, such as model type, persona, temperature, and more. The application communicates with a backend server to save and retrieve configuration settings.

## Features

- **Chat Interface**: A user-friendly chat interface for real-time communication with the assistant.
- **Admin Panel**: A dashboard to configure settings such as:
  - Model selection (`gpt-3.5-turbo`, custom fine-tuned models)
  - Persona customization (to define the assistant's tone and behavior)
  - Temperature (to control response randomness)
  - Maximum tokens (to limit the length of responses)
  - Data handling options (use uploaded data for training)
- **Configuration Persistence**: Changes made in the admin panel are saved and applied immediately by the backend.
- **Toast Notifications**: Success and error notifications are displayed on applying the configuration changes.
  
## Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

Make sure you have the following software installed:

- [Node.js](https://nodejs.org/) (for running the React frontend)
- [npm](https://www.npmjs.com/) (Node package manager)
- [Python](https://www.python.org/) (for running the Flask backend)
- [Flask](https://flask.palletsprojects.com/en/2.0.x/) (Python web framework)

### Installing

#### 1. Clone the repository:

```bash
git clone https://github.com/your-username/ChatSOS.git
cd ChatSOS
```

#### 2. Set up the Frontend (React)

```bash
cd frontend
npm install
npm run start
```

This will start the React app on http://localhost:3000.

#### 3. Set up the Backend (Flask)

Make sure you have the required Python libraries installed. Create a virtual environment and install dependencies.

```bash
conda create --name chatsos
conda activate chatsos
pip install -r requirements.txt
```

The Flask API will run on http://localhost:5000.

Configuration API Endpoints

	•	GET /get_config: Fetches the current configuration of the assistant model.
	•	POST /update_config: Updates the assistant configuration settings.
    •	GET-POST /status: Check if the API is running.
    •	POST /update_gpt_database: Updates the vector database with new data.
    •	POST /ask_assistant: Queries the assistant with question.


Example POST Request (from frontend)

The frontend sends a POST request to the backend to update the configuration:

{
  "config": {
    "selectedModel": "gpt-3.5-turbo",
    "persona": "You are a helpful assistant.",
    "temperature": 0.01,
    "chatCompletionChoices": 1,
    "maxTokens": 15,
    "useUploadedData": "No"
  }
}

### Notes

	•	The backend stores the configuration in a simple format (e.g., a JSON object), and retrieves it on page load to update the form fields in the Admin Panel.
	•	The admin panel is a React-based interface that uses hooks and state management to handle user inputs and interact with the Flask API.

### File Structure

    ChatSOS/
    │
    ├── frontend/                 # React application (Admin Panel and Chat Interface)
    │   ├── src/
    │   ├── public/
    │   └── package.json          # NPM dependencies and scripts
    │
    └── backend/                  # Flask API (for handling configuration updates)
        ├── app.py                # Main backend application
        ├── requirements.txt      # Python dependencies
        └── .env                  # Environement variables

### Usage

	1.	Open the React app in your browser (http://localhost:3000/chat).
	2.	Use the chat interface to interact with the assistant.
	3.	Use the Admin Panel to modify settings such as model type and temperature.
	4.	Changes in the Admin Panel are applied immediately, and you will receive a success or error notification.

### Contributing

Feel free to fork the repository, create a new branch, and make improvements. If you find bugs or want to add features, open an issue or submit a pull request.

### License

This project is licensed under the MIT License - see the LICENSE file for details.