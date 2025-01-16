import './App.css';
import AutoCompleteEditor from './components/AutoCompleteEditor';
import { useState } from 'react';

function App() {
  const [message, setMessage] = useState('');

  const handleSendMessage = (messageContent) => {
    setMessage(messageContent);
  };

  return (
    <div className="App">
      <AutoCompleteEditor onSendMessage={handleSendMessage} />
      <div className="message-display">
        <h2>Message:</h2>
        <p>{message}</p> {/* Display the message */}
      </div>
    </div>
  );
}

export default App;
