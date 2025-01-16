import React, { useState, useCallback, useRef } from 'react';
import { Editor, EditorState, RichUtils, Modifier, getDefaultKeyBinding } from 'draft-js';
import './AutoCompleteEditor.css';

const triggerCharacters = ['#', '@', '<'];
const suggestions = [
  '#community', '#general', '#daily',
  '<relation>', '@John', '@Maria', '@Lucy', '@Carlos', '@All',
];

const AutoCompleteEditor = ({ onSendMessage }) => {  // Pass a prop for sending the message
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentTrigger, setCurrentTrigger] = useState('');
  const [matchString, setMatchString] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [currentText, setCurrentText] = useState('');

  const editorRef = useRef(null);

  const focus = useCallback(() => {
    editorRef.current.focus();
  }, []);

  const onChange = (newEditorState) => {
    setEditorState(newEditorState);
  };

  const handleKeyCommand = useCallback((command) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      onChange(newState);
      return true;
    }
    return false;
  }, [editorState]);

  const mapKeyToEditorCommand = useCallback((e) => {
    if (e.keyCode === 9 /* TAB */) {
      const newEditorState = RichUtils.onTab(
        e,
        editorState,
        4, /* maxDepth */
      );
      if (newEditorState !== editorState) {
        onChange(newEditorState);
      }
      return;
    }
    return getDefaultKeyBinding(e);
  }, [editorState]);

  const toggleBlockType = (blockType) => {
    const newState = RichUtils.toggleBlockType(editorState, blockType);
    onChange(newState);
  };

  const toggleInlineStyle = (inlineStyle) => {
    const newState = RichUtils.toggleInlineStyle(editorState, inlineStyle);
    onChange(newState);
  };

  const handleChange = (state) => {
    setEditorState(state);
    const selection = state.getSelection();
    const contentState = state.getCurrentContent();
    const block = contentState.getBlockForKey(selection.getStartKey());
    const text = block.getText();
    const cursorPosition = selection.getStartOffset();
  
    // Get the substring from the start of the block to the cursor position
    const inputText = text.slice(0, cursorPosition);
  
    // Filter suggestions based on the current inputText
    const newSuggestions = suggestions.filter((suggestion) =>
      suggestion.toLowerCase().startsWith(inputText.toLowerCase())
    );
    
    const regex = /([#@<])(\w*)$/;
    const match = inputText.match(regex);

    if (match) {
      const trigger = match[1]; // The trigger character (#, @, <)
      const word = match[2];    // The word after the trigger

      // Update the current trigger and match string
      setCurrentTrigger(trigger);
      setMatchString(word);

      // Filter suggestions based on the matched word
      const newSuggestions = suggestions.filter((suggestion) =>
        suggestion.toLowerCase().startsWith(`${trigger}${word.toLowerCase()}`)
      );

      setFilteredSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setShowSuggestions(false); // Hide suggestions if there's no match
    }
  };
  
  const handleReturn = (e) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      const selection = editorState.getSelection();
      const contentState = editorState.getCurrentContent();
      const block = contentState.getBlockForKey(selection.getStartKey());
      const text = block.getText();
      const cursorPosition = selection.getStartOffset();
  
      const matchStart = text.lastIndexOf(currentTrigger, cursorPosition - 1);
  
      if (matchStart !== -1) {
        const matchEnd = cursorPosition;
        const beforeMatch = text.slice(0, matchStart); // Text before the match
        const afterMatch = text.slice(matchEnd); // Text after the match
  
        const newContentState = Modifier.replaceText(
          contentState,
          selection.merge({
            anchorOffset: matchStart,
            focusOffset: matchEnd,
          }),
          `${filteredSuggestions[highlightedIndex] || filteredSuggestions[0]}`
        );
  
        const finalContentState = Modifier.insertText(
          newContentState,
          selection.merge({
            anchorOffset: matchStart,
            focusOffset: matchStart + filteredSuggestions[0].length,
          }),
          `${beforeMatch}${filteredSuggestions[0]}${afterMatch}`
        );
  
        const newEditorState = EditorState.push(editorState, finalContentState, 'insert-characters');
        setEditorState(newEditorState);
        setShowSuggestions(false);
        return 'handled';
      }
    }
    return 'not-handled';
  };
  

  const handleSuggestionClick = (suggestion) => {
    const selection = editorState.getSelection();
    const contentState = editorState.getCurrentContent();
    const block = contentState.getBlockForKey(selection.getStartKey());
    const text = block.getText();
    const cursorPosition = selection.getStartOffset();
  
    // Find the start position of the current trigger
    var matchStart = '';

    if(text.length < 7){
      matchStart = text.lastIndexOf(currentTrigger, cursorPosition - text.length);
    }else{
      matchStart = text.lastIndexOf(currentTrigger, cursorPosition - 1);
    }
    
  
    if (matchStart !== -1) {
      const matchEnd = cursorPosition;
  
      // Replace the matched text (trigger + partial match) with the suggestion
      const newContentState = Modifier.replaceText(
        contentState,
        selection.merge({
          anchorOffset: matchStart,
          focusOffset: matchEnd,
        }),
        suggestion
      );
  
      // Push the new content state and move focus to the end
      const newEditorState = EditorState.push(editorState, newContentState, 'insert-characters');
      setEditorState(EditorState.moveFocusToEnd(newEditorState));
      setShowSuggestions(false);
      setCurrentTrigger('');
      setMatchString('');
    }
  };
  
  
  

  const handleArrowKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = e.key === 'ArrowDown'
        ? (highlightedIndex + 1) % filteredSuggestions.length
        : (highlightedIndex - 1 + filteredSuggestions.length) % filteredSuggestions.length;
      setHighlightedIndex(newIndex);
    }
  };

  const handleSendMessage = () => {
    // Get the current content of the editor
    const content = editorState.getCurrentContent().getPlainText();
    // Pass the content to the parent component
    onSendMessage(content);
  };

  
  return (
    <div className="RichEditor-root">
      <div className="RichEditor-editor" onClick={focus}>
        <Editor
          editorState={editorState}
          handleKeyCommand={handleKeyCommand}
          keyBindingFn={mapKeyToEditorCommand}
          onChange={handleChange}
          handleReturn={handleReturn}
          placeholder="Type here..."
          ref={editorRef}
          spellCheck={true}
          onKeyDown={handleArrowKey}
        />
      </div>
      {showSuggestions && (
        <div className="autocomplete-suggestions">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`autocomplete-suggestion ${highlightedIndex === index ? 'highlighted' : ''}`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
      <div className="RichEditor-controls">
        <BlockStyleControls
          editorState={editorState}
          onToggle={toggleBlockType}
        />
        <InlineStyleControls
          editorState={editorState}
          onToggle={toggleInlineStyle}
        />
      </div>
      <button className="button-30" role="button" onClick={handleSendMessage}>Send Message</button> {/* Send Button */}
    </div>
  );
};

const BlockStyleControls = ({ editorState, onToggle }) => {
  const selection = editorState.getSelection();
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType();

  return (
    <div className="RichEditor-controls">
      {BLOCK_TYPES.map((type) =>
        <StyleButton
          key={type.label}
          active={type.style === blockType}
          label={type.label}
          onToggle={onToggle}
          style={type.style}
        />
      )}
    </div>
  );
};

const INLINE_STYLES = [
  { label: 'Bold', style: 'BOLD' },
  { label: 'Italic', style: 'ITALIC' },
  { label: 'Underline', style: 'UNDERLINE' },
  { label: 'Monospace', style: 'CODE' },
];

const InlineStyleControls = ({ editorState, onToggle }) => {
  const currentStyle = editorState.getCurrentInlineStyle();

  return (
    <div className="RichEditor-controls">
      {INLINE_STYLES.map((type) =>
        <StyleButton
          key={type.label}
          active={currentStyle.has(type.style)}
          label={type.label}
          onToggle={onToggle}
          style={type.style}
        />
      )}
    </div>
  );
};

const StyleButton = ({ active, label, onToggle, style }) => {
  const onToggleHandler = (e) => {
    e.preventDefault();
    onToggle(style);
  };

  return (
    <span className={`RichEditor-styleButton ${active ? 'RichEditor-activeButton' : ''}`} onMouseDown={onToggleHandler}>
      {label}
    </span>
  );
};

const BLOCK_TYPES = [
  { label: 'H1', style: 'header-one' },
  { label: 'H2', style: 'header-two' },
  { label: 'H3', style: 'header-three' },
  { label: 'H4', style: 'header-four' },
  { label: 'H5', style: 'header-five' },
  { label: 'H6', style: 'header-six' },
  { label: 'Blockquote', style: 'blockquote' },
  { label: 'UL', style: 'unordered-list-item' },
  { label: 'OL', style: 'ordered-list-item' },
  { label: 'Code Block', style: 'code-block' },
];

export default AutoCompleteEditor;
