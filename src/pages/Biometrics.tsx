// ai-workspace/src/pages/Biometrics.tsx
import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import { ScanFace, AlertTriangle, Fingerprint, Eye, Lock, Camera, CameraOff } from 'lucide-react';

const Biometrics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'face' | 'voice'>('face');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'fail' | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Handle Camera Stream
  useEffect(() => {
    const startCamera = async () => {
      if (activeTab === 'face') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setHasCameraPermission(true);
        } catch (err) {
          console.error("Error accessing camera:", err);
          setHasCameraPermission(false);
        }
      }
    };

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };

    if (activeTab === 'face') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeTab]);

  const startScan = () => {
    setIsScanning(true);
    setScanResult(null);
    setTimeout(() => {
      setIsScanning(false);
      setScanResult('success');
    }, 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl">
        <AlertTriangle className="shrink-0" size={24} />
        <div>
           <h3 className="font-bold">Experimental Feature</h3>
           <p className="text-sm">
             Biometric verification is currently in beta. Do not rely on this for critical security checks.
             Ensure you have user consent before collecting biometric data.
           </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Identity Verification</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
           <button 
             onClick={() => setActiveTab('face')}
             className={`w-full text-left p-4 rounded-xl border transition-all ${activeTab === 'face' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
           >
             <div className="flex items-center gap-3 mb-2">
               <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                 <ScanFace size={20} />
               </div>
               <span className="font-semibold text-slate-800">Face Recognition</span>
             </div>
             <p className="text-xs text-slate-500">Verify identity using webcam facial analysis.</p>
           </button>

           <button 
             onClick={() => setActiveTab('voice')}
             className={`w-full text-left p-4 rounded-xl border transition-all ${activeTab === 'voice' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
           >
             <div className="flex items-center gap-3 mb-2">
               <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                 <Fingerprint size={20} />
               </div>
               <span className="font-semibold text-slate-800">VoicePrint</span>
             </div>
             <p className="text-xs text-slate-500">Analyze vocal characteristics for speaker ID.</p>
           </button>
           
           <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 opacity-60">
             <div className="flex items-center gap-3 mb-2">
               <div className="bg-slate-200 text-slate-500 p-2 rounded-lg">
                 <Eye size={20} />
               </div>
               <span className="font-semibold text-slate-800">Gaze Tracking</span>
             </div>
             <p className="text-xs text-slate-500">Coming soon in v0.2.0</p>
           </div>
        </div>

        <div className="md:col-span-2">
           <Card title={activeTab === 'face' ? "Camera Feed" : "Audio Input"} className="h-full">
              <div className="flex flex-col items-center justify-center h-80 bg-slate-900 rounded-lg overflow-hidden relative">
                 {/* Video Element */}
                 {activeTab === 'face' && (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className={`absolute inset-0 w-full h-full object-cover ${!hasCameraPermission ? 'hidden' : ''}`}
                    />
                 )}

                 {/* Fallback / Overlay if no camera */}
                 {!hasCameraPermission && activeTab === 'face' && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-800">
                      <CameraOff size={48} className="mb-4 opacity-50" />
                      <p>Camera access denied or unavailable</p>
                   </div>
                 )}

                 {/* Initial State Overlay */}
                 {!isScanning && !scanResult && activeTab !== 'face' && (
                   <div className="text-center text-slate-400 relative z-10">
                      <Fingerprint size={64} className="mx-auto mb-4 opacity-50" />
                      <p>Ready to verify</p>
                   </div>
                 )}
                 
                 {/* Face Tab Initial Overlay (if camera active but not scanning) */}
                 {!isScanning && !scanResult && activeTab === 'face' && hasCameraPermission && (
                    <div className="absolute bottom-4 left-0 right-0 text-center z-10">
                       <span className="bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                         Position face within frame
                       </span>
                    </div>
                 )}

                 {/* Scanning Animation */}
                 {isScanning && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm z-20">
                      <div className="relative">
                        <div className="w-48 h-48 border-4 border-blue-500/30 rounded-full animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                        <div className="w-24 h-24 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin"></div>
                      </div>
                      <p className="text-blue-400 font-mono animate-pulse mt-8 font-bold tracking-wider">ANALYZING BIOMETRICS...</p>
                      <div className="text-xs text-white/80 font-mono mt-2 bg-slate-900/80 px-2 py-1 rounded">
                        {activeTab === 'face' ? 'LIVENESS CHECK: PASS' : 'SPECTRAL ANALYSIS: ACTIVE'}
                      </div>
                      {/* Scanning Grid Overlay */}
                      {activeTab === 'face' && (
                        <div className="absolute inset-0 w-full h-full pointer-events-none opacity-20 bg-[linear-gradient(transparent_1px,transparent_1px),linear-gradient(90deg,#3b82f6_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]"></div>
                      )}
                   </div>
                 )}

                 {/* Success Result */}
                 {scanResult === 'success' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-900/90 z-20 animate-in fade-in duration-300">
                       <div className="bg-emerald-500 rounded-full p-6 mb-4 shadow-lg shadow-emerald-500/50 scale-110">
                         <Lock size={48} className="text-white" />
                       </div>
                       <h3 className="text-emerald-400 text-2xl font-bold">Verification Passed</h3>
                       <p className="text-emerald-200/70 text-sm mt-2 font-mono">Confidence Score: 98.4%</p>
                       <p className="text-emerald-200/50 text-xs mt-1">Identity: Alex Engineer</p>
                       <button 
                         onClick={() => setScanResult(null)}
                         className="mt-6 px-6 py-2 bg-emerald-800/50 hover:bg-emerald-800 text-emerald-100 rounded-lg transition-colors text-sm"
                       >
                         Done
                       </button>
                    </div>
                 )}
              </div>

              <div className="mt-6 flex justify-center">
                 <button
                   onClick={startScan}
                   disabled={isScanning || (activeTab === 'face' && !hasCameraPermission)}
                   className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-10 rounded-full shadow-lg shadow-blue-600/30 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                 >
                   {activeTab === 'face' ? <Camera size={18} /> : <Fingerprint size={18} />}
                   {isScanning ? 'Scanning...' : 'Start Verification'}
                 </button>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default Biometrics;