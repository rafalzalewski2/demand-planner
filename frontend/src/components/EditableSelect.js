import React, { useState, useRef, useEffect } from 'react';
import './EditableSelect.css';

function EditableSelect({ options, value, onChange, placeholder, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Filtrowanie opcji na podstawie wyszukiwania
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Znalezienie wybranej opcji
  const selectedOption = options.find(opt => opt.id === parseInt(value));

  // Zamykanie dropdownu przy kliknięciu poza nim
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fokus na input przy otwarciu
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'Enter' && filteredOptions.length === 1) {
      handleSelect(filteredOptions[0]);
    }
  };

  return (
    <div className="editable-select" ref={wrapperRef}>
      {label && <label>{label}</label>}
      
      <div className="editable-select-control">
        <input
          ref={inputRef}
          type="text"
          className="editable-select-input"
          value={isOpen ? searchTerm : (selectedOption?.name || '')}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || '-- Wybierz --'}
        />
        <span 
          className={`editable-select-arrow ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          ▼
        </span>
      </div>

      {isOpen && (
        <div className="editable-select-dropdown">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <div
                key={option.id}
                className={`editable-select-option ${option.id === parseInt(value) ? 'selected' : ''}`}
                onClick={() => handleSelect(option)}
              >
                {option.name}
              </div>
            ))
          ) : (
            <div className="editable-select-empty">
              Brak wyników dla "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EditableSelect;
