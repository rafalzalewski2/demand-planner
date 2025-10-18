import React, { useState, useRef, useEffect } from 'react';

function SelectWithSearch({ options, value, onChange, placeholder, displayField = 'name', valueField = 'id' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (value) {
      const selectedOption = options.find(option => 
        option[valueField].toString() === value.toString()
      );
      setDisplayValue(selectedOption ? selectedOption[displayField] : '');
    } else {
      setDisplayValue('');
    }
  }, [value, options, displayField, valueField]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option[displayField].toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setSearchTerm(inputValue);
    setDisplayValue(inputValue);
    setIsOpen(true);
  };

  const handleOptionClick = (option) => {
    onChange(option[valueField].toString());
    setDisplayValue(option[displayField]);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearchTerm(displayValue);
    setDisplayValue('');
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (!value && !searchTerm) {
        setDisplayValue('');
      }
      setSearchTerm('');
    }, 200);
  };

  return (
    <div className="select-with-search" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? searchTerm : displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className="search-input"
        autoComplete="off"
      />
      {isOpen && (
        <div className="dropdown">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <div
                key={option[valueField]}
                className="dropdown-option"
                onClick={() => handleOptionClick(option)}
              >
                {option[displayField]}
              </div>
            ))
          ) : (
            <div className="dropdown-no-results">Brak wyników</div>
          )}
        </div>
      )}
    </div>
  );
}

export default SelectWithSearch;
