import React, { Component, createRef } from 'react';
import '../css/Chat.css'; // Import the CSS file
import axios from 'axios'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperclip } from '@fortawesome/free-solid-svg-icons'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class Chat extends Component {

  // Create a ref to reference the message container for scrolling
  messageContainerRef = createRef();

  // State initialization for managing component data
  state = {
    messages: [],        // Array to store chat messages
    newMessage: '',      // Stores the current message being typed by the user
    answering: false,    // Flag to indicate if the assistant is processing a response
    selectedFile: ""     // Stores the selected file (if any) for uploading
  };

  /**
   * Handle Input Change for New Message
  
    * This function is triggered whenever the user types in the message input field.
    * It updates the component's state with the new value of the input field, 
    * allowing the user to compose a message that will be sent to the assistant.
    *
    * @function handleInputChange
    * @param {Event} event - The event triggered by input change.
    */
  handleInputChange = (event) => {
    // Update the state with the new value typed by the user
    this.setState({ newMessage: event.target.value });
  };

  /**
   * Handle Sending Message to Assistant
  
    * This function is triggered when the user sends a message. It updates the 
    * `messages` state with the new message, sends the message to the backend 
    * (via an API request), and updates the conversation with the assistant's 
    * response. The assistant's response is then displayed in the chat interface.

    * Process:
    * 1. The message is added to the conversation.
    * 2. The message is sent to the backend via a POST request to the `/ask_assistant` endpoint.
    * 3. Once the assistant's response is received, it is added to the conversation.
    * 4. Error handling is implemented for API call failures.

    * @function handleSendMessage
    */
  handleSendMessage = () => {
    const { newMessage, messages } = this.state;

    // Set 'answering' flag to true while waiting for the response
    this.setState({answering: true});

    // Check if the new message is not empty
    if (newMessage.trim() !== '') {
      // Add the new message to the conversation
      const updatedMessages = [...messages, { content: newMessage, role: 'user'}];

      // Update the state with the new message and clear the input field
      this.setState({ messages: updatedMessages, newMessage: '' });

      // Send the updated messages to the backend for processing
      axios
        .post("http://127.0.0.1:5000/ask_assistant", {
          "messages": updatedMessages
        })
        .then(res => {
          // Handle successful response from the backend
          console.log(res);
          if(res.status) {
            // Add assistant's response to the conversation
            const updatedMessages_ = [...updatedMessages, res.data.data.message];
            // Update the state with the new message and set 'answering' to false
            this.setState({messages: updatedMessages_, answering: false});
          }
        })
        .catch(err => {
          // Handle error if the API request fails
          console.log(err);
        });
    }
  };

  /**
   * Handle File Upload and Update Database
  
    * This function is triggered when the user selects a file to upload. 
    * It handles the file upload process, sends the file to the backend for processing, 
    * and updates the UI with a success or error message based on the response.
    * 
    * The file is sent to the backend via a POST request, and the status of the 
    * upload is shown to the user using a toast notification.
    *
    * Process:
    * 1. The selected file is added to the state.
    * 2. A FormData object is created to send the file to the backend.
    * 3. The backend API (`/update_gpt_database`) is called to process the file.
    * 4. The response from the backend determines whether a success or error message is shown to the user.
    * 5. The conversation history is updated with a placeholder message indicating a file was uploaded.
    *
    * @function handleFileChange
    * @param {Event} event - The event triggered by selecting a file.
    */
  handleFileChange = (event) => {
    // Get the selected file from the event
    const file = event.target.files[0];
    
    // Update state with the selected file and indicate that the system is processing the upload
    this.setState({selectedFile: file, answering: true});
    
    console.log("Uploading file:", file);

    // Create FormData to send the file to the backend
    const formData = new FormData();
    formData.append('file', file);

    // Show a loading toast notification while the upload is in progress
    const id = toast.loading("Please wait...");

    // Send POST request to upload the file
    axios.post('http://127.0.0.1:5000/update_gpt_database', formData)
      .then(response => {
        // Handle successful response from the backend
        if(response.data.status) {
          // Update toast with success message
          toast.update(id, { render: "All is good", type: "success", isLoading: false, autoClose: 3000 });
          
          // Get the current messages and add a placeholder for the uploaded file
          const { newMessage, messages } = this.state;
          const updatedMessages = [...messages, { content: "[NEW FILE UPLOADED TO CHAT]", role: 'user'}];
          
          // Update the conversation state with the new message
          this.setState({ messages: updatedMessages});
        } else {
          // Update toast with error message if upload fails
          toast.update(id, { render: "Some error occurred", type: "error", isLoading: false, autoClose: 3000 });
        }

        // Set 'answering' flag to false when the process is done
        this.setState({answering: false});
      })
      .catch(error => {
        console.error(error);
        // Handle any error that occurred during the file upload
        toast.update(id, { render: "Some error occurred", type: "error", isLoading: false, autoClose: 3000 });
        this.setState({answering: false});
      });
  };


  /**
   * Trigger File Input Click Programmatically
  
    * This function is used to programmatically trigger the file input click action.
    * When called, it simulates a click event on the file input element (with id "upfile").
    * This allows the user to open the file picker dialog without directly clicking the input element.
    * The file input element can then be used to upload a file.
    *
    * @function getFile
    */
  getFile() {
    // Trigger the file input element's click event programmatically
    document.getElementById("upfile").click();
  };
  
  /**
   * Render Messages in the Chat Interface
  
    * This function renders the messages in the chat interface. It maps over the `messages` array 
    * in the component’s state, generating a message div for each message. Each message is displayed 
    * with the role (either "Me" for the user or "Assistant" for the assistant), and the message content 
    * is shown accordingly. Special handling is applied for the case when a file has been uploaded.
    *
    * Process:
    * 1. For each message, a div is generated with the appropriate role styling (either 'message-sent' 
    *    or 'message-received').
    * 2. If the message content is "[NEW FILE UPLOADED TO CHAT]", it displays a paperclip icon and 
    *    italicized, small text indicating the uploaded file.
    * 3. Otherwise, it displays the message content with a label showing the sender ("Me:" or "Assistant:").
    *
    * @function renderMessages
    */
  renderMessages = () => {
    const { messages } = this.state;

    // Map through the messages and render each message
    return messages.map((message, index) => (
        <div
            key={index}
            className={`message ${message.role === 'user' ? 'message-sent' : 'message-received'}`}
        >
            {/* Check if the message content is not the special "[NEW FILE UPLOADED TO CHAT]" string */}
            {message.content !== "[NEW FILE UPLOADED TO CHAT]" ? (
                <>
                    {/* Display the sender role (Me or Assistant) with the message content */}
                    <strong>{message.role === 'user' ? "Me:" : "Assistant:"}</strong>&nbsp; {message.content}
                </>
            ) : (
                <>
                    {/* Display the paperclip icon and a special message for file uploads */}
                    <strong></strong>&nbsp; 
                    <FontAwesomeIcon icon={faPaperclip} />&nbsp;
                    <span style={{ fontStyle: 'italic', fontSize: 'small' }}>{message.content}</span>
                </>
            )}
        </div>
    ));
  };

  /**
   * Handle Updates to Messages
  
    * This lifecycle method is triggered whenever the component's state or props are updated.
    * It checks whether the number of messages has changed (indicating that a new message 
    * has been added). If so, it triggers the `scrollToBottom` method to ensure the 
    * chat window scrolls down to the most recent message.
    *
    * @function componentDidUpdate
    * @param {Object} prevProps - The previous props of the component.
    * @param {Object} prevState - The previous state of the component.
    */
  componentDidUpdate(prevProps, prevState) {
    // If the number of messages has changed, scroll to the bottom
    if (prevState.messages.length !== this.state.messages.length) {
      this.scrollToBottom();
    }
  }

  /**
   * Scroll the Message Container to the Bottom
  
    * This method is used to scroll the chat window (message container) to the bottom.
    * It calculates the scroll height and sets the scroll position to the maximum 
    * scrollable position, ensuring the latest message is visible. If the scrollable 
    * content is smaller than the container height, it ensures the scroll position is at the top (0).
    *
    * @function scrollToBottom
    */
  scrollToBottom = () => {
    // Check if the message container reference exists
    if (this.messageContainerRef.current) {
        // Get the total scrollable height and the height of the container
        const scrollHeight = this.messageContainerRef.current.scrollHeight;
        const height = this.messageContainerRef.current.clientHeight;
        
        // Calculate the maximum scrollable position
        const maxScrollTop = scrollHeight - height;

        // Set the scroll position to the bottom
        this.messageContainerRef.current.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
    }
  };

  /**
   * Render the Chat Interface
  
    * This is the render method of the component. It is responsible for rendering the entire 
    * chat interface, including the message list, the input field for the user to type messages, 
    * and the file input for uploading files. The component handles user interaction such as sending 
    * messages, uploading files, and displaying different states of the message input (enabled or disabled).
    *
    * The rendered elements include:
    * 1. The chat container with a title.
    * 2. The list of messages with dynamic content based on the current state.
    * 3. An input section with a file upload button, a text input for the message, and a send button.
    * 4. Conditional rendering of the send button based on the state (either active or disabled).
    *
    * @function render
    */
  render() {
    return (
      <div className="chat-container">
        {/* Title of the Chat Interface */}
        <h2>Talk With ChatSOS</h2>

        {/* Container for the messages */}
        <div className="message-list" ref={this.messageContainerRef}>
          {this.renderMessages()} {/* Render messages */}
        </div>

        {/* Input container for typing and sending messages */}
        <div className="input-container">
          
          {/* Button to trigger file selection */}
          <div id="yourBtn" onClick={this.getFile}>
            <FontAwesomeIcon icon={faPaperclip} /> {/* Paperclip icon for file upload */}
          </div>

          {/* Hidden file input to upload files */}
          <div style={{ height: '0px', width: '0px', overflow: 'hidden' }}>
            <input
              id="upfile"
              type="file"
              value=""
              onChange={this.handleFileChange} 
            />
          </div>

          {/* Text input for typing the message */}
          <input
            type="text"
            value={this.state.newMessage}
            onChange={this.handleInputChange} 
            placeholder="Type your message..."
            className="input-field"
          />

          {/* Conditionally render the send button based on whether the assistant is answering */}
          {!this.state.answering ? (
            <button onClick={this.handleSendMessage} className="send-button">
              Send
            </button>
          ) : (
            <button
              onClick={this.handleSendMessage}
              disabled
              className="answering-button"
            >
              ...
            </button>
          )}
        </div>

        {/* Toast notifications for success or error messages */}
        <ToastContainer />
      </div>
    );
  }
}

export default Chat;
