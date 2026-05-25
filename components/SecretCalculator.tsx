
import React, { useState, useRef, useEffect } from 'react';

interface SecretCalculatorProps {
  onClose: () => void;
}

// --- CRYPTO UTILS ---

// Simple Key Derivation (PBKDF2-like simulation for sync performance)
const deriveKey = (pass: string, salt: string): Uint8Array => {
    const combined = pass + salt;
    const key = new Uint8Array(32); // 256-bit key
    for (let i = 0; i < 32; i++) {
        let val = 0;
        for (let j = 0; j < combined.length; j++) {
            val = (val + combined.charCodeAt(j) * (i + 1)) % 255;
        }
        key[i] = val;
    }
    return key;
};

// XOR Stream Cipher (Synchronous, fast, effective for local "vault" obfuscation)
const toggleEncryption = (data: Uint8Array, key: Uint8Array): Uint8Array => {
    const output = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        output[i] = data[i] ^ key[i % key.length];
    }
    return output;
};

interface VaultFile {
    id: string; // Random filename
    originalName: string; // Stored in plain for UI, but conceptually inside metadata
    type: string;
    encryptedData: Uint8Array;
    salt: string;
    size: number;
}

// --- CALCULATOR & VAULT COMPONENT ---

const SecretCalculator: React.FC<SecretCalculatorProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'calc' | 'vault'>('calc');
  
  // Calculator State
  const [display, setDisplay] = useState("0");
  const [prevVal, setPrevVal] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [inputHistory, setInputHistory] = useState("");

  // Vault State
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [viewingFile, setViewingFile] = useState<{name: string, url: string, type: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CALCULATOR LOGIC ---

  const inputDigit = (digit: string) => {
    // Secret Trigger Check
    const newHistory = (inputHistory + digit).slice(-10); // keep last 10 chars
    setInputHistory(newHistory);

    if (newHistory.includes("80085")) {
        // Trigger Vault
        setMode('vault');
        setInputHistory("");
        setDisplay("");
        return;
    }

    if (waitingForOperand) {
        setDisplay(digit);
        setWaitingForOperand(false);
    } else {
        setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDot = () => {
    if (waitingForOperand) {
        setDisplay("0.");
        setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
        setDisplay(display + ".");
    }
  };

  const clear = () => {
      setDisplay("0");
      setPrevVal(null);
      setOperator(null);
      setWaitingForOperand(false);
      // Note: We do NOT clear inputHistory completely, allowing 800+85 etc.
  };

  const performOperation = (nextOperator: string) => {
      const inputValue = parseFloat(display);

      if (prevVal === null) {
          setPrevVal(inputValue);
      } else if (operator) {
          const currentValue = prevVal || 0;
          const newValue = calculate(currentValue, inputValue, operator);
          setPrevVal(newValue);
          setDisplay(String(newValue));
      }

      setWaitingForOperand(true);
      setOperator(nextOperator);
  };

  const calculate = (a: number, b: number, op: string) => {
      switch(op) {
          case '+': return a + b;
          case '-': return a - b;
          case '×': return a * b;
          case '÷': return a / b;
          default: return b;
      }
  };

  const handleEqual = () => {
      if (!operator || prevVal === null) return;
      const inputValue = parseFloat(display);
      const result = calculate(prevVal, inputValue, operator);
      
      setDisplay(String(result));
      setPrevVal(null);
      setOperator(null);
      setWaitingForOperand(true);
  };

  // --- VAULT LOGIC ---

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const arrayBuffer = evt.target?.result as ArrayBuffer;
          if (!arrayBuffer) return;

          const rawBytes = new Uint8Array(arrayBuffer);
          
          // Encrypt
          const salt = Math.random().toString(36).substring(2, 15);
          const key = deriveKey("80085", salt);
          const encrypted = toggleEncryption(rawBytes, key);
          
          const newFile: VaultFile = {
              id: Math.random().toString(36).substring(7),
              originalName: file.name,
              type: file.type,
              encryptedData: encrypted,
              salt: salt,
              size: file.size
          };

          setFiles(prev => [...prev, newFile]);
      };
      reader.readAsArrayBuffer(file);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenFile = (file: VaultFile) => {
      // Decrypt
      const key = deriveKey("80085", file.salt);
      const decryptedBytes = toggleEncryption(file.encryptedData, key);
      
      const blob = new Blob([decryptedBytes], { type: file.type });
      const url = URL.createObjectURL(blob);
      
      setViewingFile({
          name: file.originalName,
          url: url,
          type: file.type
      });
  };

  const handleExport = (file: VaultFile) => {
      const key = deriveKey("80085", file.salt);
      const decryptedBytes = toggleEncryption(file.encryptedData, key);
      const blob = new Blob([decryptedBytes], { type: file.type });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleDelete = (id: string) => {
      if (confirm("Permanently delete this file from the vault?")) {
          setFiles(files.filter(f => f.id !== id));
      }
  };

  const closeViewer = () => {
      if (viewingFile) URL.revokeObjectURL(viewingFile.url);
      setViewingFile(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
      
      {/* --- CALCULATOR MODE --- */}
      {mode === 'calc' && (
          <div className="bg-gray-200 rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden border-4 border-gray-400">
              {/* Calc Header / Display */}
              <div className="bg-[#4a5568] p-4 border-b-4 border-gray-500">
                  <div className="bg-[#a3b191] h-16 rounded mb-1 border-2 border-[#828f72] shadow-inner flex items-center justify-end px-4 overflow-hidden">
                      <span className="text-4xl font-mono text-gray-800 tracking-widest truncate">{display}</span>
                  </div>
              </div>
              
              {/* Buttons Grid */}
              <div className="grid grid-cols-4 gap-1 p-2 bg-gray-300">
                  <CalcButton label="7" onClick={() => inputDigit("7")} />
                  <CalcButton label="8" onClick={() => inputDigit("8")} />
                  <CalcButton label="9" onClick={() => inputDigit("9")} />
                  <CalcButton label="÷" type="op" onClick={() => performOperation('÷')} />
                  
                  <CalcButton label="4" onClick={() => inputDigit("4")} />
                  <CalcButton label="5" onClick={() => inputDigit("5")} />
                  <CalcButton label="6" onClick={() => inputDigit("6")} />
                  <CalcButton label="×" type="op" onClick={() => performOperation('×')} />
                  
                  <CalcButton label="1" onClick={() => inputDigit("1")} />
                  <CalcButton label="2" onClick={() => inputDigit("2")} />
                  <CalcButton label="3" onClick={() => inputDigit("3")} />
                  <CalcButton label="−" type="op" onClick={() => performOperation('-')} />
                  
                  <CalcButton label="0" onClick={() => inputDigit("0")} />
                  <CalcButton label="." onClick={inputDot} />
                  <CalcButton label="=" type="action" onClick={handleEqual} />
                  <CalcButton label="+" type="op" onClick={() => performOperation('+')} />
                  
                  <button 
                    onClick={clear}
                    className="col-span-4 bg-red-800 hover:bg-red-700 active:bg-red-900 text-white font-bold text-xl py-4 rounded shadow border-b-4 border-red-900 active:border-b-0 active:mt-1"
                  >
                      C
                  </button>
              </div>
              
              <div className="text-center pb-2 bg-gray-300 text-gray-400 text-[10px] font-bold">
                  MODEL 80085
              </div>
              <button onClick={onClose} className="absolute top-4 right-4 text-white opacity-50 hover:opacity-100">✕</button>
          </div>
      )}

      {/* --- VAULT MODE --- */}
      {mode === 'vault' && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl relative animate-fade-in">
             
             {/* Vault Header */}
             <div className="bg-gray-950 p-4 border-b border-gray-800 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded bg-red-900/50 flex items-center justify-center border border-red-500 text-red-500">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                     </div>
                     <div>
                         <h2 className="text-xl font-bold text-white">SECURE STORAGE</h2>
                         <p className="text-xs text-gray-500 uppercase tracking-widest">Encrypted: AES-256 (Sim)</p>
                     </div>
                 </div>
                 
                 <div className="flex gap-2">
                     <button 
                        onClick={() => setMode('calc')}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300 border border-gray-700"
                     >
                        ← Calculator
                     </button>
                     <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-white">✕</button>
                 </div>
             </div>

             {/* File Browser */}
             <div className="flex-1 bg-[#0f1115] p-6 overflow-y-auto">
                 {files.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">
                         <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                         <p>Vault is empty</p>
                         <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded shadow-lg"
                         >
                             Import File
                         </button>
                     </div>
                 ) : (
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                         {/* Add Button */}
                         <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-gray-700 hover:border-blue-500 hover:bg-blue-900/10 flex flex-col items-center justify-center text-gray-500 hover:text-blue-400 transition-all group"
                         >
                             <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">+</span>
                             <span className="text-xs font-bold uppercase">Add File</span>
                         </button>

                         {/* File Items */}
                         {files.map(file => (
                             <div 
                                key={file.id} 
                                className="aspect-square bg-gray-800 hover:bg-gray-700 rounded-xl p-3 flex flex-col items-center justify-between border border-gray-700 relative group transition-colors cursor-pointer"
                                onDoubleClick={() => handleOpenFile(file)}
                             >
                                 <div className="flex-1 flex items-center justify-center w-full">
                                     <FileIcon type={file.type} />
                                 </div>
                                 <div className="w-full text-center">
                                     <p className="text-xs text-white truncate w-full font-medium" title={file.originalName}>{file.originalName}</p>
                                     <p className="text-[10px] text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                 </div>

                                 {/* Hover Actions */}
                                 <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleExport(file); }}
                                        className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded shadow" 
                                        title="Export Decrypted"
                                     >
                                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                     </button>
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                                        className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded shadow"
                                        title="Delete"
                                     >
                                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                     </button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
             </div>

             <input ref={fileInputRef} type="file" className="hidden" onChange={handleImport} />

             {/* File Viewer Modal */}
             {viewingFile && (
                 <div className="absolute inset-0 z-50 bg-black/95 flex flex-col">
                     <div className="flex-none p-3 bg-gray-900 border-b border-gray-800 flex justify-between items-center">
                         <span className="text-white font-bold truncate">{viewingFile.name}</span>
                         <button onClick={closeViewer} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded">Close</button>
                     </div>
                     <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                         {viewingFile.type.startsWith('image/') ? (
                             <img src={viewingFile.url} alt="Preview" className="max-w-full max-h-full object-contain" />
                         ) : viewingFile.type === 'application/pdf' ? (
                             <iframe src={viewingFile.url} className="w-full h-full border-0" title="PDF"></iframe>
                         ) : viewingFile.type.startsWith('text/') ? (
                             <iframe src={viewingFile.url} className="w-full h-full bg-white text-black" title="Text"></iframe>
                         ) : (
                             <div className="text-center text-gray-400">
                                 <p className="mb-4">Preview not available for this file type.</p>
                                 <a href={viewingFile.url} download={viewingFile.name} className="px-4 py-2 bg-blue-600 text-white rounded">Download</a>
                             </div>
                         )}
                     </div>
                 </div>
             )}

          </div>
      )}
    </div>
  );
};

const CalcButton: React.FC<{ label: string; onClick: () => void; type?: 'num'|'op'|'action' }> = ({ label, onClick, type = 'num' }) => {
    let bgClass = "bg-gray-100 hover:bg-white text-gray-800";
    if (type === 'op') bgClass = "bg-orange-400 hover:bg-orange-300 text-white";
    if (type === 'action') bgClass = "bg-blue-600 hover:bg-blue-500 text-white";

    return (
        <button 
            onClick={onClick}
            className={`${bgClass} font-bold text-2xl py-4 rounded shadow border-b-4 border-black/20 active:border-b-0 active:mt-1 active:shadow-none transition-all`}
        >
            {label}
        </button>
    )
}

const FileIcon: React.FC<{ type: string }> = ({ type }) => {
    if (type.startsWith('image/')) return (
        <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
    );
    if (type.includes('pdf')) return (
        <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
    );
    if (type.includes('text') || type.includes('tab')) return (
        <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
    );
    return (
        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
    );
}

export default SecretCalculator;
