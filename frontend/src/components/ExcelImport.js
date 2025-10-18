import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import './ExcelImport.css';

function ExcelImport({ type, onImport, apiUrl }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Sprawdź rozszerzenie
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      showMessage('Wybierz plik Excel (.xlsx lub .xls)', 'error');
      return;
    }

    setFile(selectedFile);
    readExcelFile(selectedFile);
  };

  const readExcelFile = (file) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Odczytaj pierwszy arkusz
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        // Usuń pusty pierwszy wiersz jeśli istnieje
        const cleanData = jsonData.filter(row => row.some(cell => cell));
        
        if (cleanData.length < 2) {
          showMessage('Plik jest pusty lub nie zawiera danych', 'error');
          return;
        }

        setPreview(cleanData.slice(0, 6)); // Pokaż max 6 wierszy w podglądzie
        showMessage(`Wczytano ${cleanData.length - 1} wierszy z pliku`, 'success');
      } catch (error) {
        console.error('Błąd odczytu pliku:', error);
        showMessage('Błąd odczytu pliku Excel', 'error');
      }
    };

    reader.onerror = () => {
      showMessage('Błąd wczytywania pliku', 'error');
    };

    reader.readAsArrayBuffer(file);
  };

  const processAndImport = async () => {
    if (!file) {
      showMessage('Wybierz plik', 'error');
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        const cleanData = jsonData.filter(row => row.some(cell => cell));
        
        if (cleanData.length < 2) {
          showMessage('Brak danych do importu', 'error');
          setIsProcessing(false);
          return;
        }

        // Pomijamy nagłówek (pierwszy wiersz)
        const dataRows = cleanData.slice(1);
        
        let successCount = 0;
        let errorCount = 0;

        for (const row of dataRows) {
          if (!row[0]) continue; // Pomijamy puste wiersze

          try {
            if (type === 'clients') {
              await fetch(`${apiUrl}/clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: String(row[0]).trim(),
                  contact_info: row[1] ? String(row[1]).trim() : ''
                })
              });
              successCount++;
            } else if (type === 'products') {
              await fetch(`${apiUrl}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: String(row[0]).trim(),
                  unit: row[1] ? String(row[1]).trim() : 'szt'
                })
              });
              successCount++;
            }
          } catch (error) {
            console.error('Błąd importu wiersza:', error);
            errorCount++;
          }
        }

        setIsProcessing(false);
        showMessage(
          `Import zakończony: ${successCount} dodanych, ${errorCount} błędów`,
          errorCount === 0 ? 'success' : 'warning'
        );
        
        // Odśwież listę
        if (onImport) onImport();
        
        // Wyczyść formularz
        setFile(null);
        setPreview([]);
        document.getElementById('excel-file-input').value = '';

      } catch (error) {
        console.error('Błąd przetwarzania:', error);
        showMessage('Błąd podczas importu danych', 'error');
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const getTemplateInstructions = () => {
    if (type === 'clients') {
      return (
        <div className="template-info">
          <h4>Format pliku Excel dla klientów:</h4>
          <table className="template-table">
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Dane kontaktowe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Firma ABC</td>
                <td>tel: 123-456-789</td>
              </tr>
              <tr>
                <td>Firma XYZ</td>
                <td>email@example.com</td>
              </tr>
            </tbody>
          </table>
          <p className="note">Kolumna "Dane kontaktowe" jest opcjonalna</p>
        </div>
      );
    } else {
      return (
        <div className="template-info">
          <h4>Format pliku Excel dla produktów:</h4>
          <table className="template-table">
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Jednostka</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Produkt A</td>
                <td>szt</td>
              </tr>
              <tr>
                <td>Produkt B</td>
                <td>kg</td>
              </tr>
              <tr>
                <td>Produkt C</td>
                <td>l</td>
              </tr>
            </tbody>
          </table>
          <p className="note">Jednostki: szt, kg, l, m, m², m³, op</p>
        </div>
      );
    }
  };

  return (
    <div className="excel-import">
      {message.text && (
        <div className={`import-message import-message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="import-section">
        <h3>Import z Excel</h3>
        
        {getTemplateInstructions()}

        <div className="file-input-wrapper">
          <input
            id="excel-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
          <label htmlFor="excel-file-input" className="file-input-label">
            {file ? file.name : 'Wybierz plik Excel'}
          </label>
        </div>

        {preview.length > 0 && (
          <div className="preview-section">
            <h4>Podgląd ({preview.length - 1} wierszy):</h4>
            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    {preview[0].map((header, idx) => (
                      <th key={idx}>{header || `Kolumna ${idx + 1}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(1).map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="import-actions">
          <button
            className="btn-import"
            onClick={processAndImport}
            disabled={!file || isProcessing}
          >
            {isProcessing ? 'Importowanie...' : 'Importuj dane'}
          </button>
          {file && !isProcessing && (
            <button
              className="btn-cancel"
              onClick={() => {
                setFile(null);
                setPreview([]);
                document.getElementById('excel-file-input').value = '';
              }}
            >
              Anuluj
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExcelImport;
