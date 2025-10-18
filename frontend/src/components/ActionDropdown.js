import React, { useState, useRef, useEffect } from 'react';

function ActionDropdown({ onImport, onExport, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Zamknij dropdown gdy kliknięto poza nim
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAction = (action) => {
    if (action === 'import') {
      onImport();
    } else if (action === 'export') {
      onExport();
    }
    setIsOpen(false);
  };

  return (
    <div className="action-dropdown" ref={dropdownRef}>
      <button 
        className="dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        📂 Akcje ▼
      </button>
      
      {isOpen && (
        <div className="dropdown-menu">
          <button 
            className="dropdown-item"
            onClick={() => handleAction('export')}
          >
            📤 Export do Excel
          </button>
          <button 
            className="dropdown-item"
            onClick={() => handleAction('import')}
          >
            📥 Import z Excel
          </button>
        </div>
      )}
    </div>
  );
}

export default ActionDropdown;