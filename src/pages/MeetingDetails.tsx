import React, { useState, useEffect, useRef, useMemo } from 'react';
import Card from '../components/Card';
import { meetingApi } from '../services/api';
import type { ActionItem, User, Meeting } from '../types';
import { 
  ArrowLeft, Calendar, Clock, 
  Download, ChevronDown, FileType, 
  Save, Check, Sparkles, Copy, Search, X, ListTodo,
  PenLine, CloudCheck, Loader2, Trash2, Play, Pause, 
  SkipBack, SkipForward, Volume2, Smile, Plus, Lightbulb,
  CheckCircle, Mail, Send, Tag, ArrowDown // 👈 Ensure ArrowDown is imported
} from 'lucide-react';
import { ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import { jsPDF } from "jspdf";

interface MeetingDetailsProps {
  user: User;
  meetingId: string | null;
  onBack: () => void;
  onAskAI: (prompt: string) => void;
}

interface TranscriptParagraph {
  speaker: string;
  startTime: string;
  text: string;
}

interface Entity {
  text: string;
  label: string;
}

const MeetingDetails: React.FC<MeetingDetailsProps> = ({ user, meetingId, onBack, onAskAI }) => {
  const [meetingData, setMeetingData] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // States
  const [activeTab, setActiveTab] = useState<'highlights' | 'transcript'>('highlights');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newActionText, setNewActionText] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Entity State
  const [entities, setEntities] = useState<Entity[]>([]);

  // Agent State
  const [agentResults, setAgentResults] = useState<Record<string, string>>({});
  const [processingItem, setProcessingItem] = useState<string | null>(null);

  // Scroll State for Highlights
  const [showHighlightsScroll, setShowHighlightsScroll] = useState(false);
  const highlightsRef = useRef<HTMLDivElement>(null);

  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'typing' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  
  const autoSaveTimerRef = useRef<number | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  // Email State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const NOTES_STORAGE_KEY = useMemo(() => meetingData ? `meeting_notes_${user.id}_${meetingData.id}` : '', [user.id, meetingData]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const allMeetings = await meetingApi.getAll();
        const found = allMeetings.find(m => m.id === meetingId);
        if (found) {
          setMeetingData(found);
          setActionItems(found.actionItems || []);
          setNotes(found.userNotes || '');

          if (found.transcript) {
            const nlpData = await meetingApi.extractEntities(found.transcript);
            setEntities(nlpData.entities);
          }
        }
      } catch (err) {
        console.error("Failed to load meeting details", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (meetingId) fetchData();
  }, [meetingId]);

  // Handle Highlights Scroll Logic
  const handleHighlightsScroll = () => {
    if (highlightsRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = highlightsRef.current;
      // Show button if not at the bottom
      setShowHighlightsScroll(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  const scrollHighlightsToBottom = () => {
    if (highlightsRef.current) {
      highlightsRef.current.scrollTo({ top: highlightsRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  // Run initial check for scroll button when tab changes
  useEffect(() => {
    if (activeTab === 'highlights') {
      setTimeout(handleHighlightsScroll, 100);
    }
  }, [activeTab, meetingData]);

  // Agent Handler
  const runAgentOnTask = async (itemId: string, taskText: string) => {
    setProcessingItem(itemId);
    try {
      const command = {
        tool: "search_web",
        args: { query: taskText }
      };

      const res = await fetch('http://localhost:8000/mcp/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
      });
      
      const data = await res.json();
      
      setAgentResults(prev => ({
        ...prev,
        [itemId]: data.result 
      }));

    } catch (e) {
      alert("Agent failed to execute task.");
    } finally {
      setProcessingItem(null);
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !meetingData) return;
    setEmailStatus('sending');
    try {
        const token = localStorage.getItem('ai_workspace_token');
        const body = `
Meeting Report: ${meetingData.title}
Date: ${meetingData.date}

Executive Summary:
${meetingData.summary}

Action Items:
${meetingData.actionItems?.map(i => `- ${i.text}`).join('\n')}

View full transcript in AI Workspace.
        `;

        await fetch('http://localhost:8000/tools/send-email', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                recipient: recipientEmail,
                subject: `Meeting Summary: ${meetingData.title}`,
                body: body
            })
        });
        setEmailStatus('sent');
        setTimeout(() => { setIsEmailModalOpen(false); setEmailStatus('idle'); }, 2000);
    } catch (e) {
        setEmailStatus('error');
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); };
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time); }
  };
  const skipForward = () => { if (audioRef.current) audioRef.current.currentTime += 10; };
  const skipBack = () => { if (audioRef.current) audioRef.current.currentTime -= 10; };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const performSave = () => {
    if (!meetingData || !NOTES_STORAGE_KEY) return;
    setSaveStatus('saving');
    setTimeout(() => {
      localStorage.setItem(NOTES_STORAGE_KEY, notes);
      const now = new Date();
      setLastSavedAt(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 800);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setSaveStatus('typing');
  };

  useEffect(() => {
    if (saveStatus !== 'typing' || !meetingData) return;
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => { performSave(); }, 1500);
    return () => { if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current); };
  }, [notes, saveStatus, meetingData]);

  const handleManualSave = () => {
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    performSave();
  };

  const transcriptParagraphs = useMemo(() => {
    if (!meetingData?.transcript) return [];
    const lines = meetingData.transcript.split('\n');
    const paragraphs: TranscriptParagraph[] = [];
    let currentParagraph: TranscriptParagraph | null = null;

    lines.forEach(line => {
      if (!line.trim()) return;
      const match = line.match(/^\[(.*?)\]\s*(.*?):\s*(.*)/);
      if (match) {
        const [, time, speaker, text] = match;
        const cleanSpeaker = speaker.trim();
        if (currentParagraph && currentParagraph.speaker === cleanSpeaker) {
          currentParagraph.text += " " + text;
        } else {
          if (currentParagraph) paragraphs.push(currentParagraph);
          currentParagraph = { speaker: cleanSpeaker, startTime: time, text: text };
        }
      } else {
        if (currentParagraph) currentParagraph.text += " " + line.trim();
        else currentParagraph = { speaker: "Speaker", startTime: "00:00", text: line.trim() };
      }
    });
    if (currentParagraph) paragraphs.push(currentParagraph);
    return paragraphs;
  }, [meetingData?.transcript]);

  const filteredParagraphs = useMemo(() => {
    if (!searchQuery.trim()) return transcriptParagraphs;
    const lowerQ = searchQuery.toLowerCase();
    return transcriptParagraphs.filter(p => p.text.toLowerCase().includes(lowerQ) || p.speaker.toLowerCase().includes(lowerQ));
  }, [transcriptParagraphs, searchQuery]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
    return <>{parts.map((part, i) => part.toLowerCase() === highlight.toLowerCase() ? <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0 font-bold">{part}</mark> : part)}</>;
  };

  const handleToggleActionItem = (id: string) => {
    const updatedItems = actionItems.map(item => item.id === id ? { ...item, completed: !item.completed } : item);
    updateActions(updatedItems);
  };

  const handleAddActionItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionText.trim()) return;
    const newItem: ActionItem = { id: Date.now().toString(), text: newActionText.trim(), completed: false };
    const updatedItems = [...actionItems, newItem];
    updateActions(updatedItems);
    setNewActionText('');
  };

  const handleDeleteActionItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedItems = actionItems.filter(item => item.id !== id);
    updateActions(updatedItems);
  };

  const updateActions = (items: ActionItem[]) => {
    setActionItems(items);
    if (meetingData) meetingData.actionItems = items;
  };

  const handleExportPdf = () => {
    if (!meetingData) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = 20;

    const addText = (text: string, fontSize = 10, isBold = false, color = '#000000') => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setTextColor(color);
      const safeText = text.replace(/[^\x20-\x7E\n]/g, ''); 
      const lines = doc.splitTextToSize(safeText, contentWidth);
      if (y + (lines.length * (fontSize * 0.5)) > pageHeight - margin) { doc.addPage(); y = 20; }
      doc.text(lines, margin, y);
      y += (lines.length * (fontSize * 0.5)) + 4;
    };

    const addHeading = (text: string) => { if (y > pageHeight - 40) { doc.addPage(); y = 20; } y += 5; addText(text, 14, true, '#2563eb'); y += 2; };

    addText(meetingData.title, 22, true);
    addText(`${meetingData.date} | Duration: ${meetingData.duration}`, 10, false, '#64748b');
    y += 10; doc.setDrawColor(200); doc.line(margin, y, pageWidth - margin, y); y += 10;

    if (meetingData.summary) { addHeading("Executive Summary"); addText(meetingData.summary, 11); }
    if (meetingData.keywords?.length) { y += 5; addHeading("Key Discussion Points"); meetingData.keywords.forEach(point => addText(`• ${point}`, 11)); }
    if (meetingData.actionItems?.length) { y += 5; addHeading("Action Items"); meetingData.actionItems.forEach(item => addText(`[ ] ${item.text}`, 11)); }
    if (notes) { y += 5; addHeading("Personal Notes"); addText(notes, 11, false, '#475569'); }
    if (meetingData.transcript) {
      doc.addPage(); y = 20; addHeading("Full Meeting Transcript"); y += 5;
      const lines = meetingData.transcript.split('\n');
      let currentSpeaker = "";
      lines.forEach(line => {
        const match = line.match(/^\[(.*?)\]\s*(.*?):\s*(.*)/);
        if (match) {
          const [, time, speaker, text] = match;
          if (speaker.trim() !== currentSpeaker) {
            y += 4; 
            if (y > pageHeight - 30) { doc.addPage(); y = 20; }
            doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor("#000000");
            doc.text(`${speaker.trim()} (${time})`, margin, y); y += 5;
            currentSpeaker = speaker.trim();
          }
          addText(text, 9, false, '#334155');
        } else if (line.trim()) { addText(line.trim(), 9, false, '#334155'); }
      });
    }
    doc.save(`Meeting_Report_${meetingId}.pdf`);
  };

  const getEntityColor = (label: string) => {
    switch(label) {
        case 'PERSON': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'ORG': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'GPE': return 'bg-green-100 text-green-700 border-green-200';
        case 'MONEY': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'DATE': return 'bg-orange-50 text-orange-600 border-orange-100';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const completedCount = actionItems.filter(i => i.completed).length;
  const progressPercentage = actionItems.length > 0 ? Math.round((completedCount / actionItems.length) * 100) : 0;
  const isAllTasksCompleted = progressPercentage === 100 && actionItems.length > 0;
  const sentimentData = [{ name: 'Sentiment', value: meetingData?.sentimentScore || 0, fill: meetingData?.sentiment === 'Positive' ? '#10b981' : meetingData?.sentiment === 'Negative' ? '#ef4444' : '#f59e0b' }];

  if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
  if (!meetingData) return <div className="text-center py-20 text-slate-400">Meeting not found.</div>;

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* Primary Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={onBack} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-600 transition-all active:scale-90" aria-label="Go back"><ArrowLeft size={22} /></button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{meetingData.title}</h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${meetingData.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{meetingData.status}</span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Calendar size={14} /> {meetingData.date}</span>
              <span className="flex items-center gap-1.5"><Clock size={14} /> {meetingData.duration}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 relative">
          
          <button onClick={() => setIsEmailModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
            <Mail size={18} /> Email
          </button>

          <button onClick={() => onAskAI(`I need a detailed analysis of "${meetingData.title}". What were the critical decisions?`)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95">
            <Sparkles size={18} /> <span className="font-semibold text-sm">Ask AI</span>
          </button>
          <div className="relative">
            <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
              <Download size={18} /> Export <ChevronDown size={14} className={isExportMenuOpen ? 'rotate-180' : ''} />
            </button>
            {isExportMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                <button onClick={() => { navigator.clipboard.writeText(notes || meetingData.transcript || ''); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"><Copy size={16} /> Copy Content</button>
                <button onClick={handleExportPdf} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"><FileType size={16} className="text-red-500" /> Export as PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        <div className="lg:col-span-8 flex flex-col min-h-0 space-y-6">
          
          <div className="bg-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <audio ref={audioRef} src={meetingData.audio_url} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 pointer-events-none"></div>
            <div className="relative flex flex-col md:flex-row items-center gap-6">
              <div className="flex items-center gap-4">
                <button onClick={skipBack} className="p-2 text-slate-400 hover:text-white transition-colors"><SkipBack size={20} /></button>
                <button onClick={togglePlay} className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-lg hover:scale-105 transition-all active:scale-95">{isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}</button>
                <button onClick={skipForward} className="p-2 text-slate-400 hover:text-white transition-colors"><SkipForward size={20} /></button>
              </div>
              <div className="flex-1 w-full">
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-widest">
                  <span>{formatTime(currentTime)}</span><span>{formatTime(audioRef.current?.duration || 0)}</span>
                </div>
                <input type="range" min={0} max={audioRef.current?.duration || 100} value={currentTime} onChange={handleSeek} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400" />
              </div>
              <div className="flex items-center gap-3 text-slate-400"><Volume2 size={18} /></div>
            </div>
          </div>

          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-none shadow-md" noPadding>
            <div className="px-6 border-b border-slate-100 flex items-center gap-8 bg-white">
              <button onClick={() => setActiveTab('highlights')} className={`py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'highlights' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Lightbulb size={16} /> AI Highlights</button>
              <button onClick={() => setActiveTab('transcript')} className={`py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'transcript' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><FileType size={16} /> Full Transcript {searchQuery && <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-md border border-blue-200">{filteredParagraphs.length}</span>}</button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30">
              {activeTab === 'highlights' && (
                <div 
                  ref={highlightsRef} // 👈 ADDED REF
                  onScroll={handleHighlightsScroll} // 👈 ADDED SCROLL HANDLER
                  className="flex-1 overflow-y-auto p-8 bg-white space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 relative"
                >
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100">
                    <h3 className="text-indigo-900 font-bold flex items-center gap-2 mb-3"><Sparkles size={18} className="text-indigo-600" /> Executive Summary</h3>
                    <p className="text-indigo-800/80 text-sm leading-relaxed">{meetingData.summary || "No summary available."}</p>
                  </div>
                  <div>
                    <h3 className="text-slate-800 font-bold flex items-center gap-2 mb-4 border-b border-slate-100 pb-2"><Lightbulb size={18} className="text-amber-500" /> Key Takeaways</h3>
                    <div className="grid grid-cols-1 gap-3">{meetingData.keywords?.map((point, i) => (<div key={i} className="flex gap-3 items-start p-3 hover:bg-slate-50 rounded-lg transition-colors"><div className="w-1.5 h-1.5 mt-2 bg-amber-400 rounded-full shrink-0"></div><p className="text-sm text-slate-600">{point}</p></div>))}</div>
                  </div>
                  
                  {/* 👇 AGENT ACTION ITEMS */}
                  <div>
                    <h3 className="text-slate-800 font-bold flex items-center gap-2 mb-4 border-b border-slate-100 pb-2"><CheckCircle size={18} className="text-emerald-500" /> Action Items</h3>
                    <div className="space-y-4">
                      {meetingData.actionItems?.map((item, i) => (
                        <div key={i} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${item.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-white border border-slate-300 text-transparent'}`}>✓</div>
                                <span className="text-sm text-slate-700 font-medium">{item.text}</span>
                            </div>
                            
                            <button 
                              onClick={() => runAgentOnTask(item.id || `${i}`, item.text)}
                              disabled={!!processingItem}
                              className="text-xs flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition-colors shadow-sm"
                              title="Research this task with AI Agent"
                            >
                              {processingItem === (item.id || `${i}`) ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                              Research
                            </button>
                          </div>
                          
                          {agentResults[item.id || `${i}`] && (
                            <div className="ml-8 mt-1 p-3 bg-white border border-indigo-100 rounded-lg text-xs text-slate-600 shadow-sm animate-in fade-in">
                              <strong className="text-indigo-600 block mb-1">🤖 Agent Findings:</strong>
                              <p className="whitespace-pre-wrap">{agentResults[item.id || `${i}`]}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* 👇 FLOATING SCROLL BUTTON INSIDE HIGHLIGHTS */}
                  {showHighlightsScroll && (
                    <button 
                      onClick={scrollHighlightsToBottom}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-blue-600 border border-blue-100 p-2 rounded-full shadow-lg hover:bg-blue-50 transition-all animate-bounce z-10"
                      title="Scroll to Action Items"
                    >
                      <ArrowDown size={20} />
                    </button>
                  )}

                </div>
              )}

              {activeTab === 'transcript' && (
                <>
                  <div className="px-6 py-4 bg-white border-b border-slate-100">
                    <div className="relative group max-w-lg">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input type="text" placeholder="Search within transcript (Cmd+F)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                      {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>}
                    </div>
                  </div>
                  <div ref={transcriptContainerRef} className="h-[600px] overflow-y-auto space-y-6 p-8 scrollbar-thin bg-white border-t border-slate-100">
                    {filteredParagraphs.map((para, index) => (
                      <div key={index} className="flex flex-col gap-1 border-l-2 border-slate-100 pl-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">{highlightText(para.speaker, searchQuery)}</span>
                          <span className="text-xs font-mono text-slate-400">{para.startTime.replace('[','').replace(']','')}</span>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed text-justify">{highlightText(para.text, searchQuery)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6 overflow-y-auto pb-6 scrollbar-none">
          <Card title="Meeting Health">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%"><RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={sentimentData} startAngle={90} endAngle={-270}><RadialBar background dataKey="value" cornerRadius={5} /></RadialBarChart></ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2"><div className={`p-1.5 rounded-lg ${meetingData.sentiment === 'Positive' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}><Smile size={18} /></div><div><p className="text-xs font-bold text-slate-800 uppercase tracking-wide">{meetingData.sentiment} Sentiment</p><p className="text-[10px] text-slate-500">Confidence: {meetingData.sentimentScore}%</p></div></div>
              </div>
            </div>
          </Card>
          
          <Card title="Detected Entities" className="bg-white">
            <div className="flex flex-wrap gap-2">
                {entities.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No entities detected yet.</span>
                ) : (
                    entities.map((ent, i) => (
                        <span key={i} className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getEntityColor(ent.label)}`}>
                            {ent.text} <span className="opacity-50 ml-1 text-[8px] uppercase">({ent.label})</span>
                        </span>
                    ))
                )}
            </div>
          </Card>

          <Card title="Personal Notes" className="bg-white shadow-lg border-indigo-100 border-2 overflow-visible">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between"><div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-0.5"><PenLine size={12} /> Writing Area</span>{lastSavedAt && (<span className="text-[9px] text-slate-400 font-medium italic">Last saved at {lastSavedAt}</span>)}</div><div className="flex items-center gap-2">{saveStatus === 'saving' && <Loader2 size={12} className="text-indigo-500 animate-spin" />}{saveStatus === 'saved' && <CloudCheck size={14} className="text-emerald-500 animate-in zoom-in" />}<span className={`text-[10px] font-bold uppercase tracking-widest ${saveStatus === 'typing' ? 'text-amber-500' : saveStatus === 'saving' ? 'text-indigo-500' : saveStatus === 'saved' ? 'text-emerald-500' : 'text-slate-400'}`}>{saveStatus === 'typing' ? 'Unsaved changes' : saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'saved' ? 'All changes saved' : ''}</span></div></div>
              <div className="relative group"><textarea value={notes} onChange={handleNotesChange} placeholder="Private reflections, key decisions, or personal reminders..." className={`w-full h-48 p-4 text-sm text-slate-700 bg-slate-50 border-2 rounded-xl focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none shadow-inner outline-none ${saveStatus === 'typing' ? 'border-amber-200' : 'border-slate-100 focus:border-indigo-400'}`} />{saveStatus === 'typing' && (<div className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>)}</div>
              <div className="flex items-center justify-between mt-1"><span className="text-[10px] font-medium text-slate-400">{notes.trim().split(/\s+/).filter(Boolean).length} words</span><button onClick={handleManualSave} disabled={saveStatus === 'saving' || saveStatus === 'idle' || saveStatus === 'saved'} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-sm ${saveStatus === 'typing' ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-95' : 'bg-slate-100 text-slate-400 border cursor-not-allowed'}`}>{saveStatus === 'saving' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Now</button></div>
            </div>
          </Card>
        </div>
      </div>

      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-96">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Email Summary</h3>
                <p className="text-sm text-slate-500 mb-4">Send the executive summary and action items to your team.</p>
                <input type="email" placeholder="recipient@company.com" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl mb-4 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex gap-3">
                    <button onClick={() => setIsEmailModalOpen(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
                    <button onClick={handleSendEmail} disabled={emailStatus === 'sending' || emailStatus === 'sent'} className={`flex-1 py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 ${emailStatus === 'sent' ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700'}`}>{emailStatus === 'sending' ? <Loader2 size={16} className="animate-spin" /> : emailStatus === 'sent' ? 'Sent!' : <><Send size={16} /> Send</>}</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default MeetingDetails;