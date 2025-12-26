import React, { useState, useRef } from 'react';
import Card from '../components/Card';
import { Upload, FileAudio, Check, Loader2, ArrowRight, AlertTriangle, Sparkles, Globe } from 'lucide-react';
import { meetingApi } from '../services/api';
import { transcribeAudio, type Utterance } from '../services/assemblyService';
import { analyzeTranscript, translateToEnglish } from '../services/fireworksService';

interface UploadMeetingProps {
  onUploadSuccess?: (id: string) => void;
}

const UploadMeeting: React.FC<UploadMeetingProps> = ({ onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing_audio' | 'translating' | 'analyzing_text' | 'done' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [newMeetingId, setNewMeetingId] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<string>('en');

  // 👇 1. NEW STATE: Context Mode
  const [contextMode, setContextMode] = useState<string>('General');

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else if (e.type === 'dragleave') setDragActive(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { e.preventDefault(); if (e.target.files && e.target.files[0]) setFile(e.target.files[0]); };
  const onButtonClick = () => { inputRef.current?.click(); };

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60));
    return `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
  };

  const buildTranscriptString = (utterances?: Utterance[], rawText?: string) => {
    if (utterances && utterances.length > 0) {
      return utterances.map(u => `${formatTime(u.start)} Speaker ${u.speaker}: ${u.text}`).join('\n');
    }
    return rawText || "";
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadStatus('uploading');
    setErrorMessage('');
    
    try {
      // 1. TRANSCRIPTION
      const aaiResult = await transcribeAudio(file, (msg) => {
        setUploadStatus('processing_audio');
        setStatusMessage(msg);
      });

      if (!aaiResult.text) throw new Error("Transcription failed to produce text.");
      
      const detected = aaiResult.language_code || 'en';
      setDetectedLang(detected);

      let finalTranscript = buildTranscriptString(aaiResult.utterances, aaiResult.text);

      // 2. TRANSLATION
      if (detected !== 'en' && detected !== 'en_us' && detected !== 'en_uk') {
        setUploadStatus('translating');
        setStatusMessage(`Detected ${detected.toUpperCase()}. Translating full transcript to English...`);
        finalTranscript = await translateToEnglish(finalTranscript, (progressMsg) => setStatusMessage(progressMsg));
      }

      // 3. ANALYSIS
      setUploadStatus('analyzing_text');
      setStatusMessage(`Analyzing for ${contextMode} context...`); // Update status message
      
      // 👇 2. PASS THE MODE HERE
      const analysis = await analyzeTranscript(finalTranscript, contextMode);

      setStatusMessage("Saving audio file and finalizing...");

      // 4. UPLOAD AUDIO
      const audioUrl = await meetingApi.uploadMedia(file);

      // 5. SAVE DATA TO DB
      const newMeeting = await meetingApi.create({
        title: file.name.replace(/\.[^/.]+$/, "") || "Untitled Meeting",
        date: new Date().toISOString().split('T')[0],
        duration: '45m', 
        status: 'Completed',
        audio_url: audioUrl,
        summary: analysis.summary,
        actionItems: analysis.actionItems.map((text, i) => ({ id: `${Date.now()}_${i}`, text, completed: false })),
        keywords: analysis.keyPoints,
        transcript: finalTranscript,
        speakers: [{ name: 'Speaker A', value: 50, color: '#3b82f6' }, { name: 'Speaker B', value: 50, color: '#10b981' }],
        sentiment: analysis.sentiment || 'Neutral', 
        sentimentScore: analysis.sentimentScore || 50,
      });

      setNewMeetingId(newMeeting.id);
      setUploadStatus('done');

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    }
  };

  const reset = () => {
    setFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
    setStatusMessage('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800">Upload Meeting Recording</h2>
        <p className="text-slate-500 mt-2">Auto-Language Detection • Translation • Context Analysis</p>
      </div>

      {/* 👇 3. NEW DROPDOWN UI */}
      {uploadStatus === 'idle' && (
        <div className="flex justify-center">
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-600">Analysis Context:</span>
              <select 
                  value={contextMode}
                  onChange={(e) => setContextMode(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 cursor-pointer outline-none"
              >
                  <option value="General">General (Default)</option>
                  <option value="Educational">Educational / Tutorial</option>
                  <option value="Legal">Legal / Formal</option>
                  <option value="Creative">Creative / Brainstorm</option>
              </select>
          </div>
        </div>
      )}

      <Card className="p-8">
        {uploadStatus === 'error' && (
           <div className="text-center py-10 space-y-4">
             <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto"><AlertTriangle size={32} /></div>
            <h3 className="text-xl font-semibold text-slate-800">Process Failed</h3>
            <p className="text-red-500 max-w-md mx-auto">{errorMessage}</p>
            <button onClick={reset} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg">Try Again</button>
           </div>
        )}

        {uploadStatus === 'done' ? (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-in zoom-in"><Check size={32} /></div>
            <h3 className="text-xl font-semibold text-slate-800">Processing Complete!</h3>
            <p className="text-slate-500">
              {detectedLang !== 'en' 
                ? `Detected ${detectedLang.toUpperCase()} and translated to English.` 
                : "English transcript processed successfully."}
            </p>
            <div className="flex justify-center gap-4 mt-6">
              <button onClick={reset} className="px-6 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Upload Another</button>
              <button onClick={() => newMeetingId && onUploadSuccess && onUploadSuccess(newMeetingId)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20">View Report & PDF <ArrowRight size={18} /></button>
            </div>
          </div>
        ) : (uploadStatus !== 'idle') ? (
          <div className="py-10 space-y-6">
             <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                 {uploadStatus === 'translating' ? <Globe size={24} className="animate-spin" /> : 
                  uploadStatus === 'analyzing_text' ? <Sparkles size={24} className="animate-pulse" /> : 
                  <Loader2 size={24} className="animate-spin" />}
               </div>
               <div className="flex-1">
                 <p className="font-medium text-slate-800">{file?.name}</p>
                 <p className="text-sm text-slate-500">{statusMessage || 'Processing...'}</p>
               </div>
             </div>
             <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
               <div className="bg-blue-600 h-2.5 rounded-full animate-pulse w-full"></div>
             </div>
          </div>
        ) : uploadStatus === 'idle' && (
          <div className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={onButtonClick}>
            <input ref={inputRef} type="file" className="hidden" accept="audio/*,video/*" onChange={handleChange} />
            {!file ? (
              <>
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4"><Upload size={32} /></div>
                <h3 className="text-lg font-medium text-slate-800">Click to upload or drag and drop</h3>
                <p className="text-slate-500 mt-2 text-sm">MP4, MOV, MP3, WAV</p>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><FileAudio size={32} /></div>
                <h3 className="text-lg font-medium text-slate-800">{file.name}</h3>
                <p className="text-slate-500 mt-1 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <div className="flex gap-3 mt-6">
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 font-medium">Cancel</button>
                  <button onClick={(e) => { e.stopPropagation(); handleUpload(); }} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md shadow-blue-500/20">Start Processing</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default UploadMeeting;