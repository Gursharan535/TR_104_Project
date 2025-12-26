// ai-workspace/src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View,type  User } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import UploadMeeting from './pages/UploadMeeting';
import Chat from './pages/Chat';
import Analytics from './pages/Analytics';
import Biometrics from './pages/Biometrics';
import MeetingDetails from './pages/MeetingDetails';
import { authApi } from './services/api';
import { LayoutDashboard, Upload, MessageSquare, BarChart3, ScanFace } from 'lucide-react';

// Define which views are part of the authentication flow
const AUTH_VIEWS = [View.LOGIN, View.SIGNUP, View.FORGOT_PASSWORD, View.RESET_PASSWORD];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [initialChatPrompt, setInitialChatPrompt] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeResetToken, setActiveResetToken] = useState<string | null>(null);

  /**
   * Session Validation & Routing Enforcement
   * This hook runs on mount and whenever the view changes to ensure users are where they should be.
   */
  useEffect(() => {
    const validateSession = async () => {
      try {
        const currentUser = await authApi.getCurrentUser();
        
        if (currentUser) {
          setUser(currentUser);
          // If a logged-in user tries to visit an Auth page, send them to Dashboard
          if (AUTH_VIEWS.includes(currentView)) {
            setCurrentView(View.DASHBOARD);
          }
        } else {
          setUser(null);
          // If a guest tries to visit a protected page, force them to Login
          if (!AUTH_VIEWS.includes(currentView)) {
            setCurrentView(View.LOGIN);
          }
        }
      } catch (error) {
        console.error("Auth verification failed:", error);
        setUser(null);
        setCurrentView(View.LOGIN);
      } finally {
        setIsAuthChecking(false);
      }
    };

    validateSession();
  }, [currentView]);

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    setCurrentView(View.DASHBOARD);
  };

  const handleLogout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setCurrentView(View.LOGIN);
    setSelectedMeetingId(null);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleAskAI = (prompt: string) => {
    setInitialChatPrompt(prompt);
    setCurrentView(View.CHAT);
  };

  const handleChangeView = (view: View) => {
    // Immediate guard for navigation calls
    if (!user && !AUTH_VIEWS.includes(view)) {
      setCurrentView(View.LOGIN);
      return;
    }
    
    // Clean up contextual state when switching major views
    if (view !== View.MEETING_DETAILS) setSelectedMeetingId(null);
    if (view !== View.CHAT) setInitialChatPrompt(null);
    
    setCurrentView(view);
  };

  const handleSelectMeeting = (id: string) => {
    if (!user) {
      setCurrentView(View.LOGIN);
      return;
    }
    setSelectedMeetingId(id);
    setCurrentView(View.MEETING_DETAILS);
  };

  /**
   * Renders internal workspace views (Protected)
   */
  const renderAuthenticatedContent = () => {
    if (!user) return null;

    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard onViewChange={handleChangeView} onMeetingSelect={handleSelectMeeting} />;
        case View.UPLOAD:
  // When upload is done, switch to Meeting Details view
        return <UploadMeeting onUploadSuccess={(id) => handleSelectMeeting(id)} />;
      case View.CHAT:
        return <Chat initialPrompt={initialChatPrompt} onClearInitialPrompt={() => setInitialChatPrompt(null)} />;
      case View.ANALYTICS:
        return <Analytics />;
      case View.BIOMETRICS:
        return <Biometrics />;
      case View.MEETING_DETAILS:
        return <MeetingDetails user={user} meetingId={selectedMeetingId} onBack={() => handleChangeView(View.DASHBOARD)} onAskAI={handleAskAI} />;
      default:
        return <Dashboard onViewChange={handleChangeView} onMeetingSelect={handleSelectMeeting} />;
    }
  };

  /**
   * Renders authentication views (Public)
   */
  const renderAuthView = () => {
    switch (currentView) {
      case View.SIGNUP:
        return (
          <SignUp 
            onSignUp={handleAuthSuccess} 
            onSwitchToLogin={() => setCurrentView(View.LOGIN)} 
          />
        );
      case View.FORGOT_PASSWORD:
        return (
          <ForgotPassword 
            onBackToLogin={() => setCurrentView(View.LOGIN)} 
            onResetRequestSent={(token) => {
              setActiveResetToken(token);
              setCurrentView(View.RESET_PASSWORD);
            }} 
          />
        );
      case View.RESET_PASSWORD:
        return (
          <ResetPassword 
            token={activeResetToken} 
            onResetSuccess={() => {
              setActiveResetToken(null);
              setCurrentView(View.LOGIN);
            }} 
          />
        );
      default:
        // Default guest landing is Login
        return (
          <Login 
            onLogin={handleAuthSuccess} 
            onSwitchToSignUp={() => setCurrentView(View.SIGNUP)} 
            onForgotPassword={() => setCurrentView(View.FORGOT_PASSWORD)} 
          />
        );
    }
  };

  // Show splash screen during initial auth verification
  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium text-sm animate-pulse">Establishing Secure Workspace...</p>
        </div>
      </div>
    );
  }

  // Guest view container
  if (!user) {
    return (
      <div className="h-screen w-full overflow-hidden bg-slate-900">
        <div className="h-full w-full animate-in fade-in duration-700">
          {renderAuthView()}
        </div>
      </div>
    );
  }

  // Protected workspace layout
  const navItems = [
    { view: View.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { view: View.UPLOAD, label: 'Upload Meeting', icon: Upload },
    { view: View.CHAT, label: 'AI Assistant', icon: MessageSquare },
    { view: View.ANALYTICS, label: 'Analytics', icon: BarChart3 },
    { view: View.BIOMETRICS, label: 'Biometrics', icon: ScanFace },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar 
        currentView={currentView} 
        onChangeView={handleChangeView} 
        isOpen={isSidebarOpen} 
        navItems={navItems} 
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden transition-all duration-300">
        <Header 
          user={user} 
          onLogout={handleLogout} 
          toggleSidebar={toggleSidebar} 
          title={navItems.find(i => i.view === currentView)?.label || 'Meeting Analysis'} 
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto h-full">
            <div 
              key={currentView + (selectedMeetingId || '')} 
              className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-full"
            >
              {renderAuthenticatedContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
