import React, { useState, useEffect, useRef, useCallback } from 'react';
import { dbService } from '../services/db';
import { VaultFile } from '../types';
import { sensory } from '../services/sensory';

// Props for the thumbnail component
interface FileThumbnailProps {
  file: VaultFile;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onClick: (f: VaultFile) => void;
  onDeleteRequest: (f: VaultFile, e: React.MouseEvent) => void;
}

// Memoized Thumbnail Component
const FileThumbnail = React.memo(({ 
  file, 
  isSelectMode, 
  isSelected, 
  onToggleSelect, 
  onClick, 
  onDeleteRequest 
}: FileThumbnailProps) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file.data);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file.data]);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    sensory.playClick();
    if (!objectUrl) return;
    
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectMode) {
      e.stopPropagation();
      sensory.playClick();
      sensory.hapticImpactLight();
      onToggleSelect(file.id);
    } else {
      sensory.playClick();
      onClick(file);
    }
  };

  const renderContent = () => {
    if (!objectUrl) return <div className="bg-vault-800 h-full w-full animate-pulse" />;

    if (file.type.startsWith('image/')) {
      return (
        <img 
          src={objectUrl} 
          alt={file.name} 
          className={`w-full h-full object-cover transition-transform duration-500 ${isSelectMode ? 'scale-100' : 'group-hover:scale-105'}`}
          loading="lazy"
        />
      );
    } else if (file.type.startsWith('video/')) {
      return (
        <video 
          src={objectUrl} 
          className="w-full h-full object-cover" 
          muted 
          loop 
          onMouseOver={e => {
            if (!isSelectMode) {
              e.currentTarget.play();
              sensory.playHover();
            }
          }} 
          onMouseOut={e => e.currentTarget.pause()}
        />
      );
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-vault-800 text-vault-600 group-hover:text-vault-accent transition-colors">
          <i className="fas fa-file-alt text-4xl mb-2"></i>
          <span className="text-xs px-2 text-center truncate w-full">{file.name}</span>
        </div>
      );
    }
  };

  return (
    <div 
      className={`group relative aspect-square bg-vault-800 rounded-lg overflow-hidden transition-all cursor-pointer shadow-lg 
        ${isSelected 
          ? 'border-2 border-vault-accent shadow-[0_0_15px_rgba(0,240,255,0.3)]' 
          : 'border border-vault-700 hover:border-vault-accent hover:shadow-vault-accent/20'
        }
      `}
      onClick={handleClick}
      onMouseEnter={() => sensory.playHover()}
    >
      {renderContent()}
      
      {/* Selection Overlay Indicator */}
      {isSelectMode && (
        <div className={`absolute inset-0 transition-colors duration-200 flex items-center justify-center
          ${isSelected ? 'bg-vault-accent/20' : 'bg-transparent hover:bg-white/5'}
        `}>
          {isSelected && (
            <div className="w-12 h-12 rounded-full bg-vault-accent text-black flex items-center justify-center shadow-lg animate-[fadeIn_0.2s_ease-out]">
              <i className="fas fa-check text-xl"></i>
            </div>
          )}
        </div>
      )}
      
      {/* Default Overlay Actions (Only visible if NOT in select mode) */}
      {!isSelectMode && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 pointer-events-none group-hover:pointer-events-auto">
            
            {/* Top Right Actions */}
            <div className="flex justify-end space-x-2">
              <button 
                onClick={handleDownload}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-gray-300 hover:text-vault-accent hover:bg-vault-800 backdrop-blur-sm border border-transparent hover:border-vault-accent/50 transition-all"
                title="Download"
                onMouseEnter={() => sensory.playHover()}
              >
                <i className="fas fa-download text-xs"></i>
              </button>
              <button 
                onClick={(e) => {
                    sensory.playClick();
                    onDeleteRequest(file, e);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-gray-300 hover:text-red-500 hover:bg-vault-800 backdrop-blur-sm border border-transparent hover:border-red-500/50 transition-all"
                title="Delete"
                onMouseEnter={() => sensory.playHover()}
              >
                <i className="fas fa-trash-alt text-xs"></i>
              </button>
            </div>

            {/* Bottom Left Filename */}
            <div className="w-full">
               <p className="text-white text-xs font-mono truncate border-l-2 border-vault-accent pl-2 leading-tight">
                 {file.name}
               </p>
            </div>
        </div>
      )}
    </div>
  );
});

type DeleteContext = { type: 'single', file: VaultFile } | { type: 'batch', count: number } | null;

const Dashboard: React.FC = () => {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Selection Mode State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Search Mode State
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Refactored Delete Context
  const [deleteContext, setDeleteContext] = useState<DeleteContext>(null);

  const loadFiles = async () => {
    try {
      const storedFiles = await dbService.getFiles();
      setFiles(storedFiles);
    } catch (error) {
      console.error("Failed to load files", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  // Filtered Files computation
  const filteredFiles = React.useMemo(() => {
    if (!searchQuery) return files;
    return files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [files, searchQuery]);

  // Focus Search Input when mode activated
  useEffect(() => {
    if (isSearchMode && searchInputRef.current) {
      // Small timeout to allow transition to start/render
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isSearchMode]);

  useEffect(() => {
    if (previewFile) {
      const url = URL.createObjectURL(previewFile.data);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [previewFile]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploading(true);
      const newFiles: VaultFile[] = [];
      try {
        for (let i = 0; i < event.target.files.length; i++) {
          const file = event.target.files[i];
          const savedFile = await dbService.saveFile(file);
          newFiles.push(savedFile);
        }
        setFiles(prev => [...newFiles, ...prev]);
        sensory.playSuccess();
        sensory.hapticSuccess();
      } catch (err) {
        console.error("Upload failed", err);
        sensory.playError();
        sensory.hapticError();
        alert("Failed to upload file. Storage might be full.");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  // Selection Logic
  const toggleSelectMode = () => {
    sensory.playClick();
    if (isSearchMode) return; // Prevent if search is active
    if (isSelectMode) {
      // Exit mode
      setIsSelectMode(false);
      setSelectedIds(new Set());
    } else {
      // Enter mode
      setIsSelectMode(true);
      sensory.hapticImpactMedium();
    }
  };

  // Search Logic
  const toggleSearchMode = () => {
    sensory.playClick();
    if (isSelectMode) return; // Prevent if select is active (though icon is hidden)
    if (isSearchMode) {
      // Close Search
      setIsSearchMode(false);
      setSearchQuery('');
    } else {
      // Open Search
      setIsSearchMode(true);
    }
  };

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteRequest = useCallback((file: VaultFile, e: React.MouseEvent) => {
    e.stopPropagation();
    sensory.playClick();
    sensory.hapticImpactMedium();
    setDeleteContext({ type: 'single', file });
  }, []);

  const handleBatchDeleteRequest = () => {
    if (selectedIds.size === 0) return;
    sensory.playClick();
    sensory.hapticImpactMedium();
    setDeleteContext({ type: 'batch', count: selectedIds.size });
  };

  const handleBatchDownload = () => {
    sensory.playClick();
    const selectedFiles = files.filter(f => selectedIds.has(f.id));
    selectedFiles.forEach((file, index) => {
      // Stagger downloads to prevent browser blocking/issues
      setTimeout(() => {
         const url = URL.createObjectURL(file.data);
         const a = document.createElement('a');
         a.href = url;
         a.download = file.name;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
      }, index * 200);
    });
  };

  const confirmDelete = async () => {
    if (!deleteContext) return;
    sensory.playClick();
    
    try {
      if (deleteContext.type === 'single') {
        await dbService.deleteFile(deleteContext.file.id);
        setFiles(prev => prev.filter(f => f.id !== deleteContext.file.id));
        if (previewFile?.id === deleteContext.file.id) setPreviewFile(null);
      } else {
        // Batch delete
        for (const id of selectedIds) {
          await dbService.deleteFile(id);
        }
        setFiles(prev => prev.filter(f => !selectedIds.has(f.id)));
        setIsSelectMode(false);
        setSelectedIds(new Set());
      }
      sensory.hapticImpactHeavy();
    } catch (err) {
      console.error("Delete failed", err);
      sensory.playError();
    } finally {
      setDeleteContext(null);
    }
  };

  const formatDeleteCandidateName = (name: string) => {
    if (name.length <= 100) return name;
    return `${name.slice(0, 50)}...${name.slice(-45)}`;
  };

  return (
    <div className="h-full w-full bg-vault-900 pt-20 pb-24 px-4 md:px-8 overflow-y-auto scroll-smooth">
      {/* Header Container */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-vault-900/90 backdrop-blur-md border-b border-vault-700 z-40 transition-all duration-300">
        
        {/* Search Overlay (Takes over header) */}
        <div 
          className={`absolute inset-0 z-50 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${isSearchMode ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
        >
          <div className={`w-full max-w-4xl px-6 flex items-center justify-center transition-all duration-700 ease-out origin-center
              ${isSearchMode ? 'w-full opacity-100 scale-100' : 'w-0 opacity-0 scale-90'}
          `}>
             <i className="fas fa-search text-vault-accent text-lg mr-4 animate-pulse"></i>
             <input 
               ref={searchInputRef}
               type="text"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder="SEARCH DATABASE..."
               className="flex-1 bg-transparent border-b border-vault-700 focus:border-vault-accent text-white font-mono text-lg py-2 focus:outline-none transition-all placeholder-gray-600 uppercase tracking-widest"
             />
             <button 
               onClick={toggleSearchMode} 
               className="ml-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-vault-800 text-gray-500 hover:text-white transition-colors"
               title="Close Search"
               onMouseEnter={() => sensory.playHover()}
             >
                <i className="fas fa-times text-lg"></i>
             </button>
          </div>
        </div>

        {/* Standard Header Content */}
        <div className={`absolute inset-0 flex items-center justify-between px-6 transition-all duration-500 ease-out
            ${isSearchMode ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}
        `}>
            <div className="flex items-center space-x-3">
              <i className="fas fa-shield-alt text-vault-accent text-xl"></i>
              <h1 className="text-xl font-bold font-mono tracking-wider text-white">VAULT<span className="text-vault-accent">.OS</span></h1>
            </div>
            
            <div className="flex items-center space-x-3">
               
               {/* Search Trigger (Hidden in Select Mode) */}
               {!isSelectMode && (
                 <button 
                   onClick={toggleSearchMode}
                   onMouseEnter={() => sensory.playHover()}
                   className="w-10 h-10 md:w-auto md:px-4 md:py-2 flex items-center justify-center space-x-2 rounded-lg bg-transparent text-gray-400 border border-transparent hover:text-vault-accent hover:bg-vault-800 transition-all duration-300"
                   title="Search Vault"
                 >
                    <i className="fas fa-search text-lg"></i>
                    <span className="hidden md:inline font-mono text-sm uppercase tracking-wide">SEARCH</span>
                 </button>
               )}

               {/* Multi-Select Toggle Button */}
               <button 
                 onClick={toggleSelectMode}
                 onMouseEnter={() => sensory.playHover()}
                 className={`w-10 h-10 md:w-auto md:px-4 md:py-2 flex items-center justify-center space-x-2 rounded-lg transition-all duration-300 border
                   ${isSelectMode 
                     ? 'bg-vault-800 text-gray-400 border-vault-600 hover:text-white hover:border-white' 
                     : 'bg-transparent text-gray-400 border-transparent hover:text-vault-accent hover:bg-vault-800'
                   }`}
                 title={isSelectMode ? "Cancel Selection" : "Select Multiple"}
               >
                  <i className={`fas ${isSelectMode ? 'fa-times' : 'fa-check-double'} transition-transform duration-300 ${isSelectMode ? 'rotate-0' : 'rotate-0'}`}></i>
                  <span className="hidden md:inline font-mono text-sm uppercase tracking-wide">{isSelectMode ? 'Cancel' : 'Select'}</span>
               </button>

               {/* Action Area: Swaps between Upload and Batch Actions */}
               <div className="relative flex items-center justify-end">
                 
                 {/* Upload Button Group */}
                 <div className={`transition-all duration-300 ease-in-out origin-right flex items-center
                    ${isSelectMode ? 'absolute opacity-0 scale-90 pointer-events-none translate-x-4' : 'relative opacity-100 scale-100 translate-x-0'}
                 `}>
                   <button 
                     onClick={() => {
                        sensory.playClick();
                        fileInputRef.current?.click();
                     }}
                     onMouseEnter={() => sensory.playHover()}
                     className="flex items-center space-x-2 bg-vault-800 hover:bg-vault-700 border border-vault-600 hover:border-vault-accent text-white px-4 py-2 rounded-lg transition-all text-sm font-mono uppercase tracking-wide justify-center"
                     disabled={uploading}
                     title="Upload Files"
                   >
                     {uploading ? (
                       <i className="fas fa-circle-notch fa-spin text-vault-accent"></i>
                     ) : (
                       <i className="fas fa-plus text-vault-accent"></i>
                     )}
                     {/* Explicitly visible text on all screens */}
                     <span className="ml-2 whitespace-nowrap">{uploading ? 'Processing' : 'UPLOAD'}</span>
                   </button>
                 </div>

                 {/* Batch Actions Group */}
                 <div className={`flex space-x-2 transition-all duration-300 ease-in-out origin-right
                    ${isSelectMode ? 'relative opacity-100 scale-100 translate-x-0' : 'absolute opacity-0 scale-90 pointer-events-none translate-x-8'}
                 `}>
                    <button
                      onClick={handleBatchDownload}
                      disabled={selectedIds.size === 0}
                      onMouseEnter={() => sensory.playHover()}
                      className="flex items-center space-x-2 bg-vault-800 hover:bg-vault-700 border border-vault-600 hover:border-vault-accent disabled:opacity-50 disabled:cursor-not-allowed text-white w-10 h-10 md:w-auto md:px-4 md:py-2 rounded-lg transition-all text-sm font-mono uppercase tracking-wide justify-center"
                      title="Download Selected"
                    >
                      <i className="fas fa-download"></i>
                      <span className="hidden md:inline ml-2 whitespace-nowrap">Download ({selectedIds.size})</span>
                    </button>
                    
                    <button
                      onClick={handleBatchDeleteRequest}
                      disabled={selectedIds.size === 0}
                      onMouseEnter={() => sensory.playHover()}
                      className="flex items-center space-x-2 bg-vault-danger/10 hover:bg-vault-danger/20 border border-vault-danger/40 hover:border-vault-danger disabled:opacity-50 disabled:cursor-not-allowed text-vault-danger w-10 h-10 md:w-auto md:px-4 md:py-2 rounded-lg transition-all text-sm font-mono uppercase tracking-wide justify-center shadow-[0_0_10px_rgba(255,42,42,0.1)]"
                      title="Delete Selected"
                    >
                      <i className="fas fa-trash-alt"></i>
                      <span className="hidden md:inline ml-2 whitespace-nowrap">Delete ({selectedIds.size})</span>
                    </button>
                 </div>

               </div>

               <input 
                 type="file" 
                 multiple 
                 ref={fileInputRef} 
                 className="hidden" 
                 onChange={handleFileUpload} 
               />
            </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
            <i className="fas fa-circle-notch fa-spin text-3xl mb-4"></i>
            <p className="font-mono">Decrypting Storage...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-600 border-2 border-dashed border-vault-700 rounded-xl">
             {searchQuery ? (
                <>
                   <i className="fas fa-search-minus text-5xl mb-4 text-vault-600"></i>
                   <p className="font-mono mb-2">NO MATCHES FOUND</p>
                   <p className="text-sm text-gray-500">Search criteria yielded 0 matches in secure storage.</p>
                </>
             ) : (
                <>
                   <i className="fas fa-inbox text-5xl mb-4"></i>
                   <p className="font-mono">Vault is empty</p>
                </>
             )}
          </div>
        ) : (
          filteredFiles.map(file => (
            <FileThumbnail 
              key={file.id} 
              file={file} 
              isSelectMode={isSelectMode}
              isSelected={selectedIds.has(file.id)}
              onToggleSelect={toggleSelection}
              onClick={setPreviewFile} 
              onDeleteRequest={handleDeleteRequest} 
            />
          ))
        )}
      </div>

      {/* Delete Confirmation Modal (Unified for Single and Batch) */}
      {deleteContext && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]" onClick={() => setDeleteContext(null)}>
            <div className="bg-vault-900 border border-vault-700 p-6 rounded-xl shadow-2xl max-w-sm w-full relative overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Warning accent line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-vault-danger to-transparent"></div>

                <div className="flex items-center gap-3 mb-4">
                   <div className="w-10 h-10 rounded-full bg-vault-danger/10 flex items-center justify-center text-vault-danger border border-vault-danger/20">
                     <i className="fas fa-exclamation-triangle"></i>
                   </div>
                   <h3 className="text-lg font-mono text-white tracking-wide">
                     {deleteContext.type === 'batch' ? 'PERMANENT DELETION' : 'CONFIRM DELETION'}
                   </h3>
                </div>
                
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  {deleteContext.type === 'batch' ? (
                    <>Are you sure you want to permanently remove the <span className="text-white font-bold">{deleteContext.count}</span> selected files? This action is irreversible and the data cannot be recovered.</>
                  ) : (
                    <>Are you sure you want to permanently delete <span className="text-white font-mono break-all">{formatDeleteCandidateName(deleteContext.file.name)}</span>? This action cannot be undone.</>
                  )}
                </p>

                <div className="flex space-x-3 justify-end">
                   <button
                     onClick={() => {
                        sensory.playClick();
                        setDeleteContext(null);
                     }}
                     onMouseEnter={() => sensory.playHover()}
                     className="px-4 py-2 rounded text-sm font-mono text-gray-400 hover:text-white hover:bg-vault-800 transition-colors border border-transparent"
                   >
                     CANCEL
                   </button>
                   <button
                     onClick={confirmDelete}
                     onMouseEnter={() => sensory.playHover()}
                     className="px-4 py-2 rounded text-sm font-mono bg-vault-danger/10 text-vault-danger border border-vault-danger/40 hover:bg-vault-danger hover:text-white transition-all shadow-[0_0_15px_rgba(255,42,42,0.1)] hover:shadow-[0_0_20px_rgba(255,42,42,0.4)]"
                   >
                     PERMANENTLY DELETE
                   </button>
                </div>
            </div>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {previewFile && previewUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-md animate-[fadeIn_0.3s_ease-out]" 
          onClick={() => setPreviewFile(null)}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.98); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>

          <button 
            className="fixed top-4 right-4 md:top-6 md:right-6 z-[110] w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-xl border border-white/10 text-white/70 hover:text-white hover:bg-vault-accent/20 hover:border-vault-accent/50 transition-all duration-300 group shadow-2xl active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              sensory.playClick();
              setPreviewFile(null);
            }}
            onMouseEnter={() => sensory.playHover()}
            aria-label="Close Preview"
          >
            <i className="fas fa-times text-lg md:text-xl transition-transform duration-300 group-hover:rotate-90"></i>
          </button>
          
          <div className="w-full h-full flex items-center justify-center p-4 md:p-8" onClick={e => e.stopPropagation()}>
            {previewFile.type.startsWith('image/') ? (
              <img 
                src={previewUrl} 
                alt={previewFile.name} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl shadow-vault-accent/10" 
              />
            ) : previewFile.type.startsWith('video/') ? (
               <video 
                src={previewUrl} 
                controls 
                autoPlay 
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" 
               />
            ) : (
              <div className="bg-vault-800/80 backdrop-blur-sm p-10 rounded-xl flex flex-col items-center border border-vault-600 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <i className="fas fa-file-download text-6xl text-vault-accent mb-6 animate-pulse"></i>
                <p className="text-white font-mono mb-4 text-center max-w-xs break-all">{previewFile.name}</p>
                <a 
                  href={previewUrl} 
                  download={previewFile.name}
                  className="bg-vault-700 hover:bg-vault-600 text-white px-8 py-3 rounded-lg font-mono border border-vault-500 hover:border-vault-accent transition-all duration-300 flex items-center space-x-2"
                >
                  <i className="fas fa-download"></i>
                  <span>Download File</span>
                </a>
              </div>
            )}
            
            <div className="fixed bottom-6 left-0 right-0 text-center pointer-events-none">
              <span className="inline-block bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-gray-400 font-mono text-[10px] md:text-xs border border-white/5">
                {previewFile.type.toUpperCase()} &bull; {(previewFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;