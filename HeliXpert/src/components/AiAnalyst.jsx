import React, { useState, useEffect, useRef } from 'react';
import { aiEngine } from '../services/aiEngine';
import { startListening, speak, stopSpeaking, isSupported } from '../services/voiceService';
import { t } from '../utils/translations';
import {
  Bot,
  User,
  Send,
  Terminal,
  BarChart2,
  Table as TableIcon,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Globe,
  Cpu
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

// Render markdown-style bold (**text**) inline
function RichText({ text }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="text-primary-500">{part.slice(2, -2)}</strong>
          : part
      )}
    </span>
  );
}

// Inline table renderer
function DataTable({ data }) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  const cols = Object.keys(data[0]);
  return (
    <div className="rounded-xl border border-border overflow-hidden text-xs mt-2">
      <div className="px-3 py-2 bg-surface-variant border-b border-border flex items-center gap-1.5 font-mono text-muted">
        <TableIcon className="w-3.5 h-3.5 text-primary-500" />
        <span className="text-primary-500 font-semibold">Query Results ({data.length} rows)</span>
      </div>
      <div className="overflow-x-auto max-h-52">
        <table className="w-full font-mono text-left">
          <thead className="bg-surface-variant/50 border-b border-border">
            <tr>
              {cols.slice(0, 7).map(col => (
                <th key={col} className="px-3 py-2 text-[10px] uppercase text-muted">{col.replace(/_/g,' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.slice(0, 8).map((row, ri) => (
              <tr key={ri} className="hover:bg-surface-variant/30">
                {cols.slice(0, 7).map(col => (
                  <td key={col} className="px-3 py-1.5 text-foreground truncate max-w-[160px]">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AiAnalyst({ initialPrompt, clearInitialPrompt }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hello! I am **HeliXpert AI**, your intelligent helicopter assistant.\n\nI support **NLP and RAG modes** with **multilingual queries** and **voice input**.\n\nSwitch modes above or ask me anything!',
      timestamp: new Date().toLocaleTimeString(),
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  // Feature states
  const [mode, setMode] = useState('nlp'); // 'nlp' or 'rag'
  const [language, setLanguage] = useState('en'); // 'en', 'kn'
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted
  const [ollamaStatus, setOllamaStatus] = useState({ available: false, model: null });
  const recognitionRef = useRef(null);

  const sampleQueries = [
    "How many helicopters are there?",
    "Show all helicopters",
    "What is the average MGT?",
    "Show faulty observations",
    "Show maintenance records",
    "What is the average torque?",
    "Show MGT trend over time",
  ];

  // Check Ollama status on mount
  useEffect(() => {
    checkOllamaStatus();
    const interval = setInterval(checkOllamaStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const checkOllamaStatus = async () => {
    try {
      const status = await aiEngine.getOllamaStatus();
      setOllamaStatus(status);
    } catch (error) {
      console.error('Failed to check Ollama status:', error);
      setOllamaStatus({ available: false, model: null });
    }
  };

  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
      if (clearInitialPrompt) clearInitialPrompt();
    }
  }, [initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryToRun) => {
    const q = (queryToRun || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMsg]);
    if (!queryToRun) setInputQuery('');
    setIsLoading(true);

    try {
      // Pass mode and language to the AI engine
      const response = await aiEngine.processQuery(q, mode, language);

      const responseMode = response.mode || mode;
      const isRagResponse = responseMode === 'rag';
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: response.answer || (response.success ? 'Query processed.' : 'Unable to process query.'),
        mode: responseMode,
        // NLP is conversational: do not expose raw table results or SQL, but DO allow charts.
        // RAG intentionally exposes the retrieved dataset evidence table and SQL.
        sql: isRagResponse ? response.sql || null : null,
        intent: response.intent || null,
        chartType: response.visualization?.type || null,
        chartData: response.visualization?.data || null,
        tableData: isRagResponse ? response.data || null : null,
        success: response.success,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, aiMsg]);

      // Speak response if NOT muted
      if (!isMuted && response.answer) {
        speak(response.answer, language);
      }
    } catch (err) {
      console.error('Query error:', err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: `Error processing your query: ${err.message}\n\nPlease make sure the backend server is running on http://localhost:8000`,
        success: false,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    // Start listening
    setIsListening(true);
    recognitionRef.current = startListening(
      language,
      (transcript) => {
        setInputQuery(transcript);
        setIsListening(false);
      },
      (error) => {
        console.error('Voice recognition error:', error);
        setIsListening(false);
      }
    );
  };

  const toggleMute = () => {
    if (!isMuted) {
      // If unmuting (currently speaking), stop any ongoing speech
      stopSpeaking();
    }
    setIsMuted(!isMuted);
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Determine what chart keys to use
  const getChartKeys = (data) => {
    if (!data || !data[0]) return { xKey: 'name', valueKey: 'value' };
    const keys = Object.keys(data[0]);
    const xKey = keys[0];
    const valueKey = keys.find(k => k !== xKey && typeof data[0][k] === 'number') || keys[1];
    return { xKey, valueKey };
  };

  const voiceSupport = isSupported();

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] card-premium overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface-variant/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm font-mono text-foreground flex items-center gap-2">
                HeliXpert AI Analyst
                <span className="px-2 py-0.5 rounded bg-primary-500/10 text-primary-500 text-[10px] border border-primary-500/20">
                  {mode.toUpperCase()}
                </span>
              </h3>
              <p className="text-xs text-muted font-mono">
                {ollamaStatus.available ? `Ollama: ${ollamaStatus.model}` : 'Rule-Based Engine'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMessages([messages[0]])}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border">
            <Cpu className="w-3.5 h-3.5 text-muted" />
            <button
              onClick={() => setMode('nlp')}
              className={`px-2 py-1 rounded text-xs font-mono transition ${
                mode === 'nlp'
                  ? 'bg-primary-500 text-white'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              NLP
            </button>
            <button
              onClick={() => setMode('rag')}
              className={`px-2 py-1 rounded text-xs font-mono transition ${
                mode === 'rag'
                  ? 'bg-primary-500 text-white'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              RAG
            </button>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border">
            <Globe className="w-3.5 h-3.5 text-muted" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-xs font-mono text-foreground border-none outline-none cursor-pointer"
            >
              <option value="en">English</option>
              <option value="kn">ಕನ್ನಡ</option>
            </select>
          </div>

          {/* Voice Input */}
          {voiceSupport.recognition && (
            <button
              onClick={handleVoiceInput}
              disabled={isLoading}
              title={isListening ? "Stop listening" : "Start voice input"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                isListening
                  ? 'bg-red-500/10 text-red-500 border border-red-500/30 animate-pulse'
                  : 'bg-surface border border-border text-muted hover:text-foreground'
              }`}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              {isListening ? t('listening', language) : 'Voice'}
            </button>
          )}

          {/* Mute/Unmute */}
          {voiceSupport.synthesis && (
            <button
              onClick={toggleMute}
              title={isMuted ? "Unmute AI responses" : "Mute AI responses"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                !isMuted
                  ? 'bg-primary-500/10 text-primary-500 border border-primary-500/30'
                  : 'bg-surface border border-border text-muted hover:text-foreground'
              }`}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
          )}

          {/* Ollama Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono ${
            ollamaStatus.available
              ? 'bg-green-500/10 text-green-500 border border-green-500/30'
              : 'bg-orange-500/10 text-orange-500 border border-orange-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${ollamaStatus.available ? 'bg-green-500' : 'bg-orange-500'}`} />
            {ollamaStatus.available ? 'Ollama' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex space-x-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-lg bg-primary-500/15 border border-primary-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary-500" />
              </div>
            )}

            <div className={`max-w-3xl rounded-2xl p-4 space-y-3 ${
              msg.sender === 'user'
                ? 'bg-primary-500/10 border border-primary-500/20 text-foreground rounded-tr-none'
                : 'bg-surface-variant border border-border text-foreground rounded-tl-none'
            }`}>
              {/* Timestamp + sender */}
              <div className="flex items-center justify-between text-[11px] font-mono text-muted border-b border-border/40 pb-2">
                <span className="font-semibold">
                  {msg.sender === 'user' ? 'You' : 'HeliXpert AI'}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Main text */}
              <div className="text-sm leading-relaxed whitespace-pre-line">
                <RichText text={msg.text} />
              </div>

              {/* Bar chart */}
              {msg.chartType === 'bar' && msg.chartData && msg.chartData.length > 0 && (() => {
                const { xKey, valueKey } = getChartKeys(msg.chartData);
                return (
                  <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-primary-500">
                      <BarChart2 className="w-4 h-4" /> Bar Chart
                    </div>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={msg.chartData}>
                          <XAxis dataKey={xKey} stroke="#888" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#888" tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey={valueKey} fill="rgb(var(--color-primary-500))" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}

              {/* Line chart */}
              {msg.chartType === 'line' && msg.chartData && msg.chartData.length > 0 && (() => {
                const { xKey, valueKey } = getChartKeys(msg.chartData);
                return (
                  <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-primary-500">
                      <BarChart2 className="w-4 h-4" /> Trend Chart
                    </div>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={msg.chartData}>
                          <XAxis dataKey={xKey} stroke="#888" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#888" tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Line dataKey={valueKey} stroke="rgb(var(--color-primary-500))" dot={false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}

              {/* Table */}
              {msg.mode === 'rag' && (msg.chartType === 'table' || msg.tableData) && (
                <DataTable data={msg.tableData || msg.chartData} />
              )}

              {/* SQL Inspector */}
              {msg.sql && (
                <div className="p-3 rounded-xl bg-surface border border-border space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-muted">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Terminal className="w-3.5 h-3.5 text-primary-500" /> SQL Query
                    </span>
                    <span className="flex items-center gap-1 text-success-light dark:text-success-dark">
                      <CheckCircle className="w-3 h-3" /> Read-Only
                    </span>
                  </div>
                  <div className="p-2 rounded bg-surface-variant border border-border flex items-center justify-between gap-2">
                    <code className="text-[11px] text-primary-500 overflow-x-auto whitespace-pre-wrap break-all">
                      {msg.sql}
                    </code>
                    <button
                      onClick={() => handleCopy(msg.sql, msg.id)}
                      className="shrink-0 text-muted hover:text-foreground transition"
                    >
                      {copiedId === msg.id
                        ? <Check className="w-3.5 h-3.5 text-success-light dark:text-success-dark" />
                        : <Copy className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-surface-variant border border-border flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-muted text-xs font-mono">
            <div className="w-8 h-8 rounded-lg bg-primary-500/15 border border-primary-500/30 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-primary-500 animate-spin" />
            </div>
            <span>{t('thinking', language)}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sample query pills */}
      <div className="px-4 py-2 border-t border-border bg-surface-variant/40 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-mono text-muted shrink-0">Try:</span>
        {sampleQueries.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSend(q)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full bg-surface border border-border hover:border-primary-500/50 hover:text-primary-500 text-muted text-xs font-mono shrink-0 transition disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-surface-variant/40">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={t('placeholder', language)}
            className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder-muted text-sm font-sans focus:outline-none focus:border-primary-500"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="btn-primary px-5 py-3 flex items-center gap-2 disabled:opacity-40"
          >
            <span>Ask</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
