import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8000';
const GOOGLE_CLIENT_ID = '1084995452617-mbaikph9d2qml25r97vcjvjqluo4npmd.apps.googleusercontent.com';

export default function GoogleDriveImport() {
  const [folders, setFolders] = useState([]);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  const handleGoogleLogin = () => {
    const redirectUri = `${window.location.origin}/callback`;
    const scope = 'https://www.googleapis.com/auth/drive.readonly';

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=${scope}&` +
      `response_type=code&` +
      `access_type=offline`;
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && !authenticated) {
      fetch(`${API_BASE_URL}/google/auth`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: `${window.location.origin}/callback` })
      })
      .then(res => res.json())
      .then(() => {
        setAuthenticated(true);
        return fetch(`${API_BASE_URL}/google/folders`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
      })
      .then(res => res.json())
      .then(data => setFolders(data))
      .catch(err => {
        setMessage('Erro ao carregar pastas: ' + err.message);
        setAuthenticated(false);
      });
    }
  }, []);

  const importFolder = async (folderId) => {
    setImporting(true);
    setMessage('Importando arquivos...');
    setImportStatus(null);

    try {
      const response = await fetch(`${API_BASE_URL}/google/import`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId })
      });

      const data = await response.json();

      if (data.skipped_files?.length > 0) {
        setMessage(`Importados ${data.processes.length} arquivos. ${data.skipped_files.length} arquivos ignorados.`);
      } else {
        setMessage(`Importados ${data.processes.length} arquivos com sucesso!`);
      }

      setImportStatus(data);
    } catch (err) {
      setMessage('Erro na importação: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-6 bg-white rounded-lg shadow-md">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Importar do Google Drive</h1>

        {message && (
          <div className={`p-4 mb-6 rounded-md ${
            message.includes('Erro')
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {!authenticated || folders.length === 0 ? (
          <button
            onClick={handleGoogleLogin}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Conectar com Google Drive
          </button>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Suas Pastas:</h2>
            {folders.map(folder => (
              <div
                key={folder.id}
                className="flex items-center justify-between p-4 border rounded hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium">{folder.name}</span>
                <button
                  onClick={() => importFolder(folder.id)}
                  disabled={importing}
                  className={`
                    px-4 py-2 rounded text-white transition-colors
                    ${importing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'}
                  `}
                >
                  {importing ? 'Importando...' : 'Importar PDFs'}
                </button>
              </div>
            ))}

            {importStatus?.skipped_files?.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
                <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                  Arquivos Ignorados:
                </h3>
                {importStatus.skipped_files.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{file.filename}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}