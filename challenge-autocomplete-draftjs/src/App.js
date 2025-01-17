import './App.css';
import AutoCompleteEditor from './components/AutoCompleteEditor';
import { useState } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = (messageContent) => {
    setIsSending(true);
    setMessage('');

    if (messageContent.length > 0) { 
      setTimeout(() => {
        setMessage(messageContent);
        setIsSending(false);
      }, 10000);
    } else {
      setMessage(messageContent);
      setIsSending(false);
    }
  };

  return (
    <div className="App">
      <AutoCompleteEditor onSendMessage={handleSendMessage} />
      <div className="message-display">
 
        {isSending && (
          <div className="sending-message">
            <span>Sending Message...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
