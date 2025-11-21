'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convertFigma } from '../lib/api';

export default function Home() {
  // avoiding state management library for simplicity and performance
  const [fileKey, setFileKey] = useState('');
  const [token, setToken] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [shouldFetch, setShouldFetch] = useState(false);

  // using react query for easy state management and caching per user
  // using useQuery to fetch the data from the Figma API
  const { data, isLoading, error, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['convert-figma', fileKey, token],
    queryFn: () => convertFigma(fileKey, token),
    enabled: shouldFetch && !!fileKey && !!token,
    staleTime: Infinity, // don't stale the data
    refetchOnWindowFocus: false, // don't refetch when window regains focus
    refetchOnMount: false, // don't refetch when component remounts
    refetchOnReconnect: false, // don't refetch when network reconnects
  });

  // destructuring the data from the query
  const { html, css } = data || { html: '', css: '' };
  console.log('html', html);
  console.log('css', css);

  // triggering the conversion to html and css
  const handleConvert = (e: React.FormEvent) => {
    e.preventDefault();
    setShouldFetch(true);
  };

  // button to download the html and css files
  const handleDownload = () => {
    if (!html || !css) return;
    
    // Download HTML
    const htmlBlob = new Blob([
        `<!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="styles.css">
        </head>
        <body>
            ${html}
        </body>
        </html>`
    ], { type: 'text/html' });
    const htmlUrl = URL.createObjectURL(htmlBlob);
    const htmlLink = document.createElement('a');
    htmlLink.href = htmlUrl;
    htmlLink.download = 'index.html';
    htmlLink.click();

    // Download CSS
    const cssBlob = new Blob([css], { type: 'text/css' });
    const cssUrl = URL.createObjectURL(cssBlob);
    const cssLink = document.createElement('a');
    cssLink.href = cssUrl;
    cssLink.download = 'styles.css';
    cssLink.click();
  };

  // iframe to preview the html and css
  const iframeSrc = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          ${css}
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

  return (
    <div className="min-h-screen p-8 bg-gray-50 font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-6xl mx-auto space-y-8">
        <header className="text-center space-y-2">
           <h1 className="text-4xl font-bold tracking-tight text-gray-900">Figma to HTML/CSS</h1>
           <p className="text-gray-600">Convert your designs instantly.</p>
        </header>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <form onSubmit={handleConvert} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1 w-full">
              <label className="text-sm font-medium text-gray-700">File Key</label>
              <input
                type="text"
                value={fileKey}
                onChange={(e) => setFileKey(e.target.value)}
                placeholder="e.g. MxMXpjiLPbdHlratvH0Wdy"
                className="w-full px-4 py-2 text-black placeholder:text-gray-300 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>
            <div className="flex-1 space-y-1 w-full">
              <label className="text-sm font-medium text-gray-700">Personal Access Token</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="figd_..."
                className="w-full px-4 py-2 text-black placeholder:text-gray-300 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Converting...' : 'Convert'}
            </button>
          </form>
          
          {/* Cache status indicator */}
          {data && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <span className={`inline-block w-2 h-2 rounded-full ${isFetching ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
                <span className="font-medium text-blue-900">
                  {isFetching ? '🔄 Fetching from server...' : '✅ Using cached data'}
                </span>
                {dataUpdatedAt && (
                  <span className="text-blue-600 text-xs">
                    (Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()})
                  </span>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
              Error: {error.message}
            </div>
          )}
        </div>

        {(html || css) && (
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                   <button
                     onClick={() => setActiveTab('preview')}
                     className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'preview' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                     Preview
                   </button>
                   <button
                     onClick={() => setActiveTab('code')}
                     className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'code' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                     Code
                   </button>
                </div>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                >
                  Download Files
                </button>
             </div>

             <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm h-[800px]">
               {activeTab === 'preview' ? (
                 <iframe
                   srcDoc={iframeSrc}
                   className="w-full h-full border-0 bg-gray-100"
                   title="Preview"
                 />
               ) : (
                 <div className="grid grid-cols-2 h-full divide-x divide-gray-200">
                    <div className="flex flex-col h-full">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-mono text-xs text-gray-500">index.html</div>
                        <textarea
                          readOnly
                          className="flex-1 w-full p-4 text-black font-mono text-xs resize-none focus:outline-none"
                          value={html}
                        />
                    </div>
                    <div className="flex flex-col h-full">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-mono text-xs text-gray-500">styles.css</div>
                        <textarea
                          readOnly
                          className="flex-1 w-full p-4 text-black font-mono text-xs resize-none focus:outline-none"
                          value={css}
                        />
                    </div>
                 </div>
               )}
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
