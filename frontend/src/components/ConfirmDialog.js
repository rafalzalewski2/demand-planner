import React from 'react';

function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Usuń', cancelText = 'Anuluj' }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog">
        <div className="confirm-header">
          <h3>{title}</h3>
        </div>
        
        <div className="confirm-body">
          <p>{message}</p>
        </div>
        
        <div className="confirm-actions">
          <button 
            className="btn-delete confirm-btn" 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button 
            className="btn-secondary confirm-btn" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
