import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Search, Upload, FileText, Loader2, Send, Download, BookOpen, Brain, Zap } from 'lucide-react';
import './App.css';

interface ResearchResult {
  success: boolean;
  research_report: {
    summary: string;
    key_findings: string[];
    confidence_score: number;
    sources: Array<{
      title: string;
      content: string;
      relevance_score: number;
    }>;
  };
  execution_time: number;
  sources_found: number;
  reasoning_steps: number;
}

interface SuggestionItem {
  suggested_query: string;
  refinement_type: string;
  rationale: string;
  confidence: number;
  expected_improvement: number;
}

interface Suggestion {
  success: boolean;
  suggestions: SuggestionItem[];
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ResearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setResults(null);
    setSuggestions([]);
    setShowSuggestions(false);

    try {
      const response = await axios.post(`${API_BASE_URL}/research`, {
        query: searchQuery,
        max_sources: 10
      });
      
      setResults(response.data);
    } catch (error) {
      console.error('Research error:', error);
      alert('Error conducting research. Make sure the backend is running on port 8000.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const getSuggestions = async (searchQuery: string) => {
    if (searchQuery.length < 3) return;
    
    try {
      const response = await axios.post(`${API_BASE_URL}/suggest`, {
        query: searchQuery
      });
      
      if (response.data.success) {
        setSuggestions(response.data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Suggestion error:', error);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setQuery(value);
    getSuggestions(value);
  };

  const handleSuggestionClick = (suggestion: SuggestionItem) => {
    setQuery(suggestion.suggested_query);
    setShowSuggestions(false);
    handleSearch(suggestion.suggested_query);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadSuccess(false);

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post(`${API_BASE_URL}/ingest`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setUploadedFiles(prev => [...prev, ...Array.from(files)]);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading files. Make sure the backend is running.');
    } finally {
      setIsUploading(false);
    }
  };

  const exportReport = (format: 'pdf' | 'markdown' | 'json') => {
    if (!results) return;
    
    const content = format === 'json' 
      ? JSON.stringify(results, null, 2)
      : `# Research Report\n\n${results.research_report.summary}\n\n## Key Findings\n${results.research_report.key_findings.map(f => `- ${f}`).join('\n')}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-report.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Brain className="logo-icon" />
            <h1>Deep Researcher</h1>
          </div>
          <div className="header-actions">
            <button 
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload size={20} />
              {isUploading ? 'Uploading...' : 'Upload Documents'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.docx,.md,.html"
              onChange={(e) => handleFileUpload(e.target.files)}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="search-container">
          <div className="search-box">
            <div className="search-input-container">
              <Search className="search-icon" />
              <textarea
                value={query}
                onChange={handleQueryChange}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything about your documents..."
                className="search-input"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={() => handleSearch()}
                disabled={isLoading || !query.trim()}
                className="search-button"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </div>
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <Search size={16} />
                    <div className="suggestion-content">
                      <span className="suggestion-query">{suggestion.suggested_query}</span>
                      <span className="suggestion-rationale">{suggestion.rationale}</span>
                    </div>
                    <div className="suggestion-confidence">
                      {Math.round(suggestion.confidence * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Status */}
          {uploadSuccess && (
            <div className="upload-success">
              ✅ Documents uploaded successfully!
            </div>
          )}

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="uploaded-files">
              <h3>Uploaded Documents:</h3>
              <div className="file-list">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <FileText size={16} />
                    <span>{file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="loading-container">
            <Loader2 className="animate-spin" size={32} />
            <p>Conducting research...</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="results-container">
            <div className="results-header">
              <div className="results-stats">
                <div className="stat">
                  <Zap size={16} />
                  <span>{results.sources_found} sources</span>
                </div>
                <div className="stat">
                  <BookOpen size={16} />
                  <span>{results.reasoning_steps} reasoning steps</span>
                </div>
                <div className="stat">
                  <span>Confidence: {Math.round(results.research_report.confidence_score * 100)}%</span>
                </div>
                <div className="stat">
                  <span>{results.execution_time.toFixed(2)}s</span>
                </div>
              </div>
              <div className="export-actions">
                <button onClick={() => exportReport('pdf')} className="export-btn">
                  <Download size={16} />
                  PDF
                </button>
                <button onClick={() => exportReport('markdown')} className="export-btn">
                  <Download size={16} />
                  MD
                </button>
                <button onClick={() => exportReport('json')} className="export-btn">
                  <Download size={16} />
                  JSON
                </button>
              </div>
            </div>

            <div className="results-content">
              <div className="summary-section">
                <h2>Summary</h2>
                <p>{results.research_report.summary}</p>
              </div>

              <div className="findings-section">
                <h2>Key Findings</h2>
                <ul>
                  {results.research_report.key_findings.map((finding, index) => (
                    <li key={index}>{finding}</li>
                  ))}
                </ul>
              </div>

              <div className="sources-section">
                <h2>Sources</h2>
                <div className="sources-list">
                  {results.research_report.sources.map((source, index) => (
                    <div key={index} className="source-item">
                      <div className="source-header">
                        <h4>{source.title}</h4>
                        <span className="relevance-score">
                          {Math.round(source.relevance_score * 100)}% relevant
                        </span>
                      </div>
                      <p className="source-content">{source.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Message */}
        {!results && !isLoading && (
          <div className="welcome-container">
            <div className="welcome-content">
              <Brain size={64} className="welcome-icon" />
              <h2>Welcome to Deep Researcher</h2>
              <p>Upload your documents and ask questions to get AI-powered research insights.</p>
              <div className="welcome-features">
                <div className="feature">
                  <Search size={24} />
                  <span>Intelligent Search</span>
                </div>
                <div className="feature">
                  <Brain size={24} />
                  <span>AI Analysis</span>
                </div>
                <div className="feature">
                  <FileText size={24} />
                  <span>Multi-format Support</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;