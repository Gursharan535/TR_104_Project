import React, { useEffect, useState } from 'react';
import { View, type ActionItem, type Meeting } from '../types';
import Card from '../components/Card';
import { meetingApi } from '../services/api'; 
import { Clock, FileText, CheckCircle, Plus, ChevronRight, Activity, MessageSquare, BarChart3, ListTodo, Loader2, Search, Sparkles, RefreshCcw } from 'lucide-react';

interface DashboardProps {
  onViewChange: (view: View) => void;
  onMeetingSelect: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewChange, onMeetingSelect }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const data = await meetingApi.getAll();
        setMeetings(data);
        setFilteredMeetings(data);
      } catch (err) {
        console.error("Failed to load meetings", err);
      } finally {
        setLoading(false);
      }
    };
    loadMeetings();
  }, []);

  // 👇 SEMANTIC SEARCH HANDLER
const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If empty, reset to show all
    if (!searchQuery.trim()) {
        setFilteredMeetings(meetings);
        return;
    }

    setIsSearching(true);
    try {
        const token = localStorage.getItem('ai_workspace_token');
        const res = await fetch('http://localhost:8000/tools/semantic-search', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: searchQuery })
        });
        
        const data = await res.json();
        const matchedIds = data.matched_ids || [];
        
        console.log("Matched IDs from Backend:", matchedIds); // 👈 Check Browser Console

        if (matchedIds.length === 0) {
            setFilteredMeetings([]); // Show empty list if no match
        } else {
            // Filter logic: Ensure ID types match (String comparison)
            const results = meetings.filter(m => matchedIds.includes(String(m.id)));
            setFilteredMeetings(results);
        }

    } catch (err) {
        console.error("Search failed", err);
    } finally {
        setIsSearching(false);
    }
  };

  // 👇 NEW: RE-INDEX BUTTON LOGIC
  const handleReindex = async () => {
    if(!confirm("This will regenerate search indexes for all old meetings. Continue?")) return;
    try {
        const token = localStorage.getItem('ai_workspace_token');
        const res = await fetch('http://localhost:8000/debug/regenerate-embeddings', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        alert(data.message);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
        alert("Re-index failed");
    }
  };

  const getTaskStatus = (meeting: Meeting) => {
    const items: ActionItem[] = meeting.actionItems || [];
    const completed = items.filter(i => i.completed).length;
    return { completed, total: items.length, percentage: items.length > 0 ? (completed / items.length) * 100 : 0 };
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

  const totalMeetings = meetings.length;
  const totalHours = meetings.reduce((acc, m) => acc + (parseInt(m.duration) || 0), 0) / 60; 
  const totalTasks = meetings.reduce((acc, m) => acc + (m.actionItems?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h2>
          <p className="text-slate-500">Welcome back, here's what's happening today.</p>
        </div>
        <button onClick={() => onViewChange(View.UPLOAD)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
          <Plus size={18} /> New Meeting
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Meetings', value: totalMeetings.toString(), icon: FileText, color: 'bg-blue-500' },
          { label: 'Hours Transcribed', value: totalHours.toFixed(1), icon: Clock, color: 'bg-indigo-500' },
          { label: 'Tasks Generated', value: totalTasks.toString(), icon: CheckCircle, color: 'bg-emerald-500' },
          { label: 'System Health', value: '100%', icon: Activity, color: 'bg-rose-500' },
        ].map((stat, i) => (
          <Card key={i} className="flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-1">
            <div className={`${stat.color} p-3 rounded-xl text-white shadow-sm`}><stat.icon size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* SEMANTIC SEARCH BAR */}
      <Card noPadding className="p-2">
        <form onSubmit={handleSearch} className="flex items-center gap-2 px-4 py-2">
            <Sparkles className="text-amber-500" size={20} />
            <input 
                type="text" 
                placeholder="Search by meaning (e.g. 'discussions about budget')" 
                className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            {/* 👇 RE-INDEX BUTTON */}
            <button 
                type="button" 
                onClick={handleReindex}
                title="Refresh Search Index (Fix old meetings)"
                className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-500"
            >
                <RefreshCcw size={18} />
            </button>

            <button type="submit" className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition-colors">
                {isSearching ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <Search size={18} className="text-slate-500" />}
            </button>
        </form>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Meetings List */}
        <div className="lg:col-span-2">
          <Card title="Recent Meetings">
            {filteredMeetings.length === 0 ? (
               <div className="text-center py-10 text-slate-400">No meetings found.</div>
            ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-widest bg-slate-50/50">
                    <th className="px-6 pb-3 pt-4 font-bold">Title</th>
                    <th className="px-6 pb-3 pt-4 font-bold">Date</th>
                    <th className="px-6 pb-3 pt-4 font-bold">Status</th>
                    <th className="px-6 pb-3 pt-4 font-bold">Tasks</th>
                    <th className="px-6 pb-3 pt-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredMeetings.map((meeting) => {
                    const { completed, total, percentage } = getTaskStatus(meeting);
                    return (
                      <tr key={meeting.id} className="group hover:bg-blue-50/30 transition-all cursor-pointer" onClick={() => onMeetingSelect(meeting.id)}>
                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{meeting.title}</p>
                          {meeting.summary && <p className="text-xs text-slate-500 truncate max-w-[240px] mt-0.5">{meeting.summary}</p>}
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-500 whitespace-nowrap">{meeting.date}</td>
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-100">
                            <CheckCircle size={10} /> {meeting.status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          {total > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                <ListTodo size={12} className={percentage === 100 ? "text-emerald-500" : "text-slate-400"} />
                                <span>{completed}/{total}</span>
                              </div>
                              <div className="w-16 bg-slate-100 rounded-full h-1 overflow-hidden">
                                <div className={`h-full transition-all duration-700 ${percentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          ) : <span className="text-xs text-slate-400 font-medium">—</span>}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1 shadow-sm">
                            <ChevronRight size={18} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </Card>
        </div>
        
        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          <Card title="Quick Actions">
            <div className="space-y-3">
              <button onClick={() => onViewChange(View.CHAT)} className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-blue-400 hover:bg-blue-50 transition-all group shadow-sm hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><MessageSquare size={20} /></div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Ask AI Assistant</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">RAG-based Transcript Query</p>
                  </div>
                </div>
              </button>
              <button onClick={() => onViewChange(View.ANALYTICS)} className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all group shadow-sm hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors"><BarChart3 size={20} /></div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">View Analytics</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">Performance Benchmarks</p>
                  </div>
                </div>
              </button>
            </div>
          </Card>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
             <h3 className="font-bold text-lg mb-2 relative z-10">Smart Feature</h3>
             <p className="text-blue-100 text-xs mb-5 leading-relaxed relative z-10">Verify participant identities using biometrics during sensitive sessions.</p>
             <button onClick={() => onViewChange(View.BIOMETRICS)} className="bg-white text-blue-600 text-[10px] font-bold py-2.5 px-4 rounded-xl transition-all hover:bg-blue-50 active:scale-95 shadow-lg uppercase tracking-wider relative z-10">Go to Biometrics</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;