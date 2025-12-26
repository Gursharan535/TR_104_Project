import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import { Send, Bot, User, RefreshCw, Paperclip, AlertCircle, Database, CheckSquare, Square, FileText, SearchCheck, X, Mic, MicOff, Volume2, VolumeX, ArrowDown } from 'lucide-react';
import type { ChatMessage, Meeting } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai"; 
import { meetingApi } from '../services/api'; 
import { executeWithKeyRotation } from '../services/keyManager';

interface ChatProps {
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

const Chat: React.FC<ChatProps> = ({ initialPrompt, onClearInitialPrompt }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: 'Hello! I am your AI Workspace assistant. I have access to your meetings. Which ones would you like to discuss?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Voice States
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false); 

  // Scroll State
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Data State
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  
  // Reference Document State
  const [referenceText, setReferenceText] = useState<string>(''); 
  const [refFileName, setRefFileName] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load History
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await meetingApi.getAll();
        setMeetings(data);
        // Default: Select all completed meetings
        setSelectedContextIds(data.filter(m => m.status === 'Completed').map(m => m.id));
      } catch (err) {
        console.error("Failed to load meeting history", err);
      }
    };
    fetchHistory();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  };

  useEffect(() => scrollToBottom(), [messages, isTyping]);

  // Handle Scroll to show/hide button
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // Show button if user is more than 100px from bottom
      const isNotBottom = scrollHeight - scrollTop - clientHeight > 100;
      setShowScrollBtn(isNotBottom);
    }
  };

  const toggleContext = (id: string) => {
    setSelectedContextIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleFileClick = () => { fileInputRef.current?.click(); };

  // File Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      if (confirm("To analyze audio/video files, use the Upload Meeting page. Go there now?")) {
        window.location.href = "/";
      }
      return;
    }

    if (file.type === 'application/pdf') {
        const formData = new FormData();
        formData.append('file', file);
        try {
            setInput("Parsing reference document...");
            const res = await fetch('http://localhost:8000/tools/parse-pdf', { method: 'POST', body: formData });
            if (!res.ok) throw new Error("Backend parsing failed");
            
            const data = await res.json();
            setReferenceText(data.content);
            setRefFileName(data.filename);
            setInput(`Reference document '${data.filename}' loaded into context.`);
        } catch (err) {
            console.error(err);
            alert("Failed to parse PDF. Ensure Backend is running.");
            setInput("");
        }
    } else {
        alert("Please upload a PDF for reference context.");
    }
  };

  // Helper: Speak Text (TTS)
  const speakResponse = (text: string) => {
    if (!autoSpeak) return;
    
    window.speechSynthesis.cancel(); 
    
    // Remove markdown symbols for smoother reading
    const cleanText = text.replace(/[*#_`]/g, ''); 
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const voices = window.speechSynthesis.getVoices();
    // Prefer Google US English if available
    const preferredVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
  };

  // Voice Input Logic (STT)
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Voice Input. Try Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.start();
  };

  // Fact Checker Logic
  const handleFactCheck = async () => {
    if (!messages.length) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return;

    setIsTyping(true);
    try {
        const res = await fetch('http://localhost:8000/tools/fact-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: lastMsg.content.substring(0, 100) }) 
        });
        
        if (!res.ok) throw new Error("Search failed");
        const searchData = await res.json();

        const verifyPrompt = `
        ORIGINAL STATEMENT: "${lastMsg.content}"
        SEARCH EVIDENCE: "${searchData.context}"
        TASK: Verify the statement based on evidence. Is it true? Be concise.
        `;
        
        const responseText = await executeWithKeyRotation('VITE_GEMINI_KEY', async (apiKey) => {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(verifyPrompt);
            return result.response.text();
        });

        const reply = "🔍 **Fact Check:** " + responseText;
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: reply, timestamp: new Date() }]);
        speakResponse(reply); 

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Failed to perform fact check.", timestamp: new Date() }]);
    } finally {
        setIsTyping(false);
    }
  };

  // Send Message Logic (MCP)
  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: textToSend, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    if (!textOverride) setInput('');
    setIsTyping(true);
    setError(null);
    window.speechSynthesis.cancel(); // Stop speaking if user interrupts

    try {
      const activeContext = meetings.filter(m => selectedContextIds.includes(m.id));
      
      const knowledgeBase = activeContext.length > 0 
        ? activeContext.map(m => `Meeting: ${m.title} (${m.date})\nSummary: ${m.summary}\nTranscript: ${m.transcript?.substring(0, 1000)}...`).join('\n---\n')
        : "No meetings selected.";

      const systemInstruction = `You are an intelligent business assistant powered by MCP (Model Context Protocol).
      
      CONTEXT FROM MEETINGS:
      ${knowledgeBase}

      REFERENCE DOCUMENT (${refFileName || "None"}):
      ${referenceText ? referenceText.substring(0, 5000) : "No document loaded."}
      
      AVAILABLE TOOLS:
      1. search_web(query): Use this for current events, stock prices, or facts outside the meetings.
      2. query_database(keyword): Use this if the user asks to find a meeting about a specific topic.
      
      INSTRUCTIONS:
      1. If the user asks about a meeting, use the CONTEXT provided above.
      2. If the user asks about OUTSIDE info (e.g., "price of Bitcoin"), output a JSON command: {"tool": "search_web", "args": {"query": "..."}}
      3. If no tool is needed, just answer normally.
      
      User Question: "${textToSend}"`;

      let responseText = await executeWithKeyRotation('VITE_GEMINI_KEY', async (apiKey) => {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(systemInstruction);
        return result.response.text();
      });

      const cleanResponse = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      if (cleanResponse.startsWith('{') && cleanResponse.includes('"tool"')) {
         try {
             const command = JSON.parse(cleanResponse);
             setMessages(prev => [...prev, { id: "tool-" + Date.now(), role: 'assistant', content: `⚙️ *Accessing Tool: ${command.tool}...*`, timestamp: new Date() }]);

             const toolRes = await fetch('http://localhost:8000/mcp/process', {
                 method: 'POST',
                 headers: {'Content-Type': 'application/json'},
                 body: JSON.stringify(command)
             });
             const toolData = await toolRes.json();
             
             const finalPrompt = `
             User Question: ${textToSend}
             Tool Used: ${command.tool}
             Tool Result: ${toolData.result}
             Based on this tool result, answer the user's question clearly.
             `;
             
             responseText = await executeWithKeyRotation('VITE_GEMINI_KEY', async (apiKey) => {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent(finalPrompt);
                return result.response.text();
             });
         } catch (e) {
             console.error("MCP Failed", e);
             responseText = "I tried to use a tool but it failed. Please try again.";
         }
      }
      
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: responseText, timestamp: new Date() }]);
      speakResponse(responseText);

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to connect";
        setError(errorMessage);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Error processing request.", timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (initialPrompt && !isTyping) { handleSend(initialPrompt); if (onClearInitialPrompt) onClearInitialPrompt(); }
  }, [initialPrompt]);

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* LEFT: CHAT AREA */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">AI Assistant</h2>
              <p className="text-slate-500">Ask questions about your {selectedContextIds.length} selected meetings.</p>
            </div>
            
            {/* VOICE TOGGLE */}
            <button 
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                autoSpeak 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
              title="Read responses out loud"
            >
              {autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}
              {autoSpeak ? 'Voice ON' : 'Voice OFF'}
            </button>
          </div>

          {messages.length > 1 && (
             <button onClick={handleFactCheck} className="text-xs flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors shadow-sm">
                 <SearchCheck size={14} /> Verify Last Response
             </button>
          )}
        </div>

        <Card className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-white/50 backdrop-blur-sm">
          {error && <div className="bg-red-50 text-red-600 px-4 py-2 text-sm border-b border-red-100 flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
          
          <div 
            ref={scrollContainerRef} 
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin"
          >
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'assistant' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${msg.role === 'assistant' ? 'bg-white text-slate-800 border border-slate-100' : 'bg-blue-600 text-white'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && <div className="flex gap-4"><div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center"><Bot size={20} /></div><div className="bg-white border border-slate-100 rounded-2xl px-5 py-4 flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-75"></div><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-150"></div></div></div>}
            <div ref={messagesEndRef} />
          </div>

          {showScrollBtn && (
            <button 
              onClick={scrollToBottom}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-all animate-bounce z-10"
              title="Scroll to bottom"
            >
              <ArrowDown size={20} />
            </button>
          )}

          <div className="p-4 border-t border-slate-100 bg-white">
            
            {refFileName && (
              <div className="text-xs text-blue-600 mb-2 flex items-center justify-between bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2">
                  <FileText size={14} /> 
                  <span className="font-medium truncate max-w-[200px]">Reference: {refFileName}</span>
                </div>
                <button 
                  onClick={() => { setReferenceText(''); setRefFileName(''); }} 
                  className="text-slate-400 hover:text-red-500 transition-colors p-1"
                  title="Remove Reference Document"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            <div className="relative flex items-center gap-2">
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".pdf, audio/*, video/*" />
              <button onClick={handleFileClick} className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"><Paperclip size={20} /></button>
              
              {/* Voice Input Button */}
              <button 
                onClick={toggleListening}
                className={`p-2.5 rounded-xl transition-all duration-300 ${
                  isListening 
                    ? 'bg-red-50 text-red-600 animate-pulse ring-2 ring-red-200' 
                    : 'text-slate-400 hover:bg-slate-50'
                }`}
                title={isListening ? "Listening..." : "Voice Input"}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={handleKeyPress} 
                placeholder={isListening ? "Listening..." : "Ask about your meetings..."} 
                className={`flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner ${isListening ? 'placeholder-red-400 border-red-200' : ''}`} 
              />
              <button onClick={() => handleSend()} disabled={!input.trim() || isTyping} className="p-3 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 disabled:opacity-50">{isTyping ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}</button>
            </div>
          </div>
        </Card>
      </div>

      {/* RIGHT: CONTEXT PANEL */}
      <div className="w-80 hidden lg:flex flex-col gap-4">
        <div className="mt-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2"><Database size={18} /> Context Memory</h3>
          <p className="text-xs text-slate-500">Select meetings AI should know about.</p>
        </div>
        
        <Card className="flex-1 overflow-hidden" noPadding>
          <div className="h-full overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {meetings.length === 0 && <div className="text-center p-4 text-xs text-slate-400">No meetings found.</div>}
            
            {meetings.map(m => {
              const isSelected = selectedContextIds.includes(m.id);
              return (
                <div 
                  key={m.id} 
                  onClick={() => toggleContext(m.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 group ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-slate-50'}`}
                >
                  <div className={`mt-0.5 ${isSelected ? 'text-blue-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>{m.title}</p>
                    <p className="text-[10px] text-slate-500">{m.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

    </div>
  );
};

export default Chat;