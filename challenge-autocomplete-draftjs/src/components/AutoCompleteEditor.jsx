import React, { useState, useCallback, useRef } from 'react';
import { Editor, EditorState, RichUtils, Modifier, getDefaultKeyBinding } from 'draft-js';
import "./AutoCompleteEditor.css";

const triggerCharacters = ['#', '@', '<'];

const AutoCompleteEditor = () => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentTrigger, setCurrentTrigger] = useState('');
  const [matchString, setMatchString] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  

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

    // Check for trigger character
    for (let trigger of triggerCharacters) {
      if (text[cursorPosition - 1] === trigger) {
        setCurrentTrigger(trigger);
        setShowSuggestions(true);
        break;
      } else {
        setShowSuggestions(false);
      }
    }

    // Extract the match string
    if (showSuggestions && cursorPosition > 0) {
      const matchStart = text.lastIndexOf(currentTrigger, cursorPosition - 1) + 1;
      const matchSubstring = text.slice(matchStart, cursorPosition);
      setMatchString(matchSubstring);
    }
  };

  const handleReturn = (e) => {
    if (showSuggestions && matchString) {
      const newContentState = Modifier.replaceText(
        editorState.getCurrentContent(),
        editorState.getSelection(),
        matchString
      );
      const newEditorState = EditorState.push(editorState, newContentState, 'insert-characters');
      setEditorState(newEditorState);
      setShowSuggestions(false); // Hide suggestions after completing
    }
    return 'handled';
  };

  const handleSuggestionClick = (suggestion) => {
    const newContentState = Modifier.replaceText(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      suggestion
    );
    const newEditorState = EditorState.push(editorState, newContentState, 'insert-characters');
    setEditorState(newEditorState);
    setShowSuggestions(false); // Hide suggestions after selecting
  };

  const handleArrowKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = e.key === 'ArrowDown'
        ? (highlightedIndex + 1) % suggestions.length
        : (highlightedIndex - 1 + suggestions.length) % suggestions.length;
      setHighlightedIndex(newIndex);
    }
  };

  const suggestions = ['#react', '#javascript', '@john', '@alice', '<related>'];

  return (
    <div>
      <div className="RichEditor-root">
        <BlockStyleControls
          editorState={editorState}
          onToggle={toggleBlockType}
        />
        <InlineStyleControls
          editorState={editorState}
          onToggle={toggleInlineStyle}
        />
        <div className="RichEditor-editor" onClick={focus}>
          <Editor
            blockStyleFn={getBlockStyle}
            customStyleMap={styleMap}
            editorState={editorState}
            handleKeyCommand={handleKeyCommand}
            keyBindingFn={mapKeyToEditorCommand}
            onChange={handleChange}
            handleReturn={handleReturn}
            placeholder="Tell a story..."
            ref={editorRef}  // Use editorRef to attach to the editor
            spellCheck={true}
            onKeyDown={handleArrowKey}
          />
        </div>
        {showSuggestions && (
          <div className="autocomplete-suggestions">
            {suggestions
              .filter((suggestion) => suggestion.includes(matchString))
              .map((suggestion, index) => (
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
      </div>
    </div>
  );
};

// Custom overrides for "code" style.
const styleMap = {
  CODE: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
    fontSize: 16,
    padding: 2,
  },
};

function getBlockStyle(block) {
  switch (block.getType()) {
    case 'blockquote': return 'RichEditor-blockquote';
    default: return null;
  }
}

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

export default AutoCompleteEditor;