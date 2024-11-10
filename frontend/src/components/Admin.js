import React, { Component } from 'react';
import '../css/Admin.css'; // Create a new CSS file for AdminPanel styles
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class Admin extends Component {
  state = {
    selectedModel: "gpt-3.5-turbo",
    persona: "You are a helpful assistant.",
    temperature: 0.01,
    chatCompletionChoices: 1,
    maxTokens: 15,
    useUploadedData: "No"
  };

  /**
   * Handles the change in the selected model from the dropdown list.
   * This function updates the state with the newly selected model value.
   * 
   * @param {Event} event - The event object that contains the new value selected from the dropdown.
   */
  handleModelChange = (event) => {
    // Update the selected model in the state when the dropdown value changes
    this.setState({ selectedModel: event.target.value });
  };

  /**
   * Handles the change in the temperature value.
   * Updates the `temperature` state with the new value entered by the user.
   * If the value is invalid, it defaults to 0.0.
   * 
   * @param {Event} event - The event object that contains the new temperature value.
   */
  handleTemperatureChange = (event) => {
    // Parse the input value as a float and update the state. Default to 0.0 if invalid.
    this.setState({ temperature: parseFloat(event.target.value) || 0.0 });
  };

  /**
   * Handles the change in the persona value.
   * Updates the `persona` state with the new persona text entered by the user.
   * 
   * @param {Event} event - The event object that contains the new persona value.
   */
  handlePersonaChange = (event) => {
    // Update the persona state with the new value
    this.setState({ persona: event.target.value });
  };

  /**
   * Handles the change in the chat completion choices value.
   * Updates the `chatCompletionChoices` state with the new value entered by the user.
   * If the value is invalid, it defaults to 1.
   * 
   * @param {Event} event - The event object that contains the new chat completion choices value.
   */
  handleChatCompletionChoicesChange = (event) => {
    // Parse the input value as an integer and update the state. Default to 1 if invalid.
    this.setState({ chatCompletionChoices: parseInt(event.target.value) || 1 });
  };

  /**
   * Handles the change in the max tokens value.
   * Updates the `maxTokens` state with the new value entered by the user.
   * If the value is invalid, it defaults to 25.
   * 
   * @param {Event} event - The event object that contains the new max tokens value.
   */
  handleMaxTokensChange = (event) => {
    // Parse the input value as an integer and update the state. Default to 25 if invalid.
    this.setState({ maxTokens: parseInt(event.target.value) || 25 });
  };

  /**
   * Handles the change in the "use uploaded data" option.
   * Updates the `useUploadedData` state with the new value selected by the user.
   * 
   * @param {Event} event - The event object that contains the new value for using uploaded data.
   */
  handleUseUploadDataChange = (event) => {
    // Update the useUploadedData state with the new value
    this.setState({ useUploadedData: event.target.value });
  };

  /**
   * Handles the form submission.
   * Sends the current configuration values (selected model, persona, temperature, etc.)
   * to the server using an HTTP POST request to update the config.
   * Displays a success or error toast message based on the response.
   * 
   * @param {Event} event - The form submission event.
   */
  handleSubmit = (event) => {
    event.preventDefault(); // Prevents the default form submission behavior
    
    // Extract values from the current state to send to the backend
    const { selectedModel, persona, temperature, chatCompletionChoices, maxTokens, useUploadedData } = this.state;

    // Send POST request to update configuration on the server
    axios
      .post("http://127.0.0.1:5000/update_config", {
        "config": {
          "selectedModel": selectedModel, 
          "persona": persona, 
          "temperature": temperature, 
          "chatCompletionChoices": chatCompletionChoices, 
          "maxTokens": maxTokens, 
          "useUploadedData": useUploadedData
        }
      })
      .then(res => {
        // If the response is successful, show a success toast
        if (res.data.status) {
          toast.success('🦄 Wow so easy!', {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
          });
        } else {
          // If an error occurs, show an error toast
          toast.error('Sorry there was an error!', {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
          });
        }
      })
      .catch(err => {
        // Log the error and show an error toast
        console.log(err);
        toast.error('Sorry there was an error!', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      });
  };

  /**
   * Fetches the current configuration from the server when the component mounts.
   * Sets the component's state with the retrieved configuration data.
   */
  componentDidMount = () => {
    // Send GET request to fetch current configuration
    axios
      .get("http://127.0.0.1:5000/get_config")
      .then(res => {
        // If the response is successful, update the state with the retrieved configuration
        if (res.status) {
          let data = JSON.parse(res.data.data)[0];
          delete data['_id']; // Remove unnecessary fields
          delete data['type']; // Remove unnecessary fields
          this.setState(data); // Update the state with the new config
          console.log(data); // Log the fetched data for debugging
        }
      })
      .catch(error => {
        // Log any errors that occur during the fetch operation
        console.log(error);
      });
  }

  /**
   * Renders the Admin panel with the configuration options.
   * Includes form fields for selecting the model, setting persona, temperature, etc.
   */
  render() {
    const { selectedModel, persona, temperature, chatCompletionChoices, maxTokens, useUploadedData } = this.state;

    return (
      <div className="admin-panel">
        <h2>Configure ChatSOS</h2>
        <form onSubmit={this.handleSubmit}>
          <div className="form-field">
            <label htmlFor="model">Model:</label>
            <select id="model" value={selectedModel} onChange={this.handleModelChange}>
              <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              <option value="davinci:ft-personal-2023-08-04-00-01-46">davinci:ft-personal-2023-08-04-00-01-46</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="persona">Persona:</label>
            <input
              type="text"
              id="persona"
              value={persona}
              onChange={this.handlePersonaChange}
            />
          </div>
          <div className="form-field">
            <label htmlFor="temperature">Temperature:</label>
            <input
              type="number"
              step="0.01"
              id="temperature"
              value={temperature}
              onChange={this.handleTemperatureChange}
            />
          </div>
          <div className="form-field">
            <label htmlFor="chatCompletionChoices">Chat Completion Choices:</label>
            <input
              type="text"
              id="chatCompletionChoices"
              value={chatCompletionChoices}
              onChange={this.handleChatCompletionChoicesChange}
            />
          </div>
          <div className="form-field">
            <label htmlFor="maxTokens">Max Tokens:</label>
            <input
              type="number"
              id="maxTokens"
              value={maxTokens}
              onChange={this.handleMaxTokensChange}
            />
          </div>
          <div className="form-field">
            <label htmlFor="useUploadedData">Use Uploaded Data:</label>
            <select id="useUploadedData" value={useUploadedData} onChange={this.handleUseUploadDataChange}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <button type="submit">Apply Changes</button>
        </form>
        <ToastContainer />
      </div>
    );
  }
}

export default Admin;
