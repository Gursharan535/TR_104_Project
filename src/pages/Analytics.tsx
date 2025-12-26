import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import Card from '../components/Card';
import { meetingApi } from '../services/api';
import type { Meeting } from '../types';
import { Clock, TrendingUp, ThumbsUp, Activity, Loader2, Filter } from 'lucide-react';

const parseDurationToMinutes = (durationStr: string): number => {
  if (!durationStr || durationStr === 'Unknown') return 0;
  let minutes = 0;
  const hoursMatch = durationStr.match(/(\d+)h/);
  const minsMatch = durationStr.match(/(\d+)m/);
  if (hoursMatch) minutes += parseInt(hoursMatch[1]) * 60;
  if (minsMatch) minutes += parseInt(minsMatch[1]);
  return minutes > 0 ? minutes : 45; 
};

const Analytics: React.FC = () => {
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('all'); // 👈 FILTER STATE
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await meetingApi.getAll();
        setAllMeetings(data);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 👇 FILTER LOGIC
  const activeMeetings = useMemo(() => {
    if (selectedMeetingId === 'all') return allMeetings;
    return allMeetings.filter(m => m.id === selectedMeetingId);
  }, [allMeetings, selectedMeetingId]);

  // All calculations now use 'activeMeetings' instead of 'meetings'
  const summaryMetrics = useMemo(() => {
    const totalMeetings = activeMeetings.length;
    const totalMinutes = activeMeetings.reduce((acc, m) => acc + parseDurationToMinutes(m.duration), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const completed = activeMeetings.filter(m => m.status === 'Completed').length;
    const sentimentSum = activeMeetings.reduce((acc, m) => acc + (m.sentimentScore || 0), 0);
    const avgSentiment = totalMeetings > 0 ? Math.round(sentimentSum / totalMeetings) : 0;
    return { totalMeetings, totalHours, completed, avgSentiment };
  }, [activeMeetings]);

  const volumeData = useMemo(() => {
    // If viewing single meeting, show it specifically. If all, show trend.
    if (selectedMeetingId !== 'all') {
       return [{
         date: activeMeetings[0]?.date || 'Today',
         minutes: parseDurationToMinutes(activeMeetings[0]?.duration || '0'),
         count: 1
       }];
    }

    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    return last7Days.map(date => {
      const meetingsOnDate = activeMeetings.filter(m => m.date === date);
      const minutes = meetingsOnDate.reduce((acc, m) => acc + parseDurationToMinutes(m.duration), 0);
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        minutes: minutes,
        count: meetingsOnDate.length
      };
    });
  }, [activeMeetings, selectedMeetingId]);

  const sentimentDistribution = useMemo(() => {
    const counts = { Positive: 0, Neutral: 0, Negative: 0 };
    activeMeetings.forEach(m => {
      if (m.sentiment === 'Positive') counts.Positive++;
      else if (m.sentiment === 'Negative') counts.Negative++;
      else counts.Neutral++;
    });
    return [
      { name: 'Positive', value: counts.Positive },
      { name: 'Neutral', value: counts.Neutral },
      { name: 'Negative', value: counts.Negative },
    ].filter(item => item.value > 0);
  }, [activeMeetings]);

  const topicData = useMemo(() => {
    const topicCounts: Record<string, number> = {};
    activeMeetings.forEach(m => {
      if (m.keywords) {
        m.keywords.forEach(k => {
          const key = k.trim(); 
          topicCounts[key] = (topicCounts[key] || 0) + 1;
        });
      }
    });
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [activeMeetings]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Analytics</h2>
          <p className="text-slate-500">
            {selectedMeetingId === 'all' 
              ? `Real-time insights from all ${allMeetings.length} meetings.` 
              : `Showing specific data for: ${activeMeetings[0]?.title}`
            }
          </p>
        </div>

        {/* 👇 MEETING SELECTOR DROPDOWN */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter size={16} className="text-slate-500" />
          </div>
          <select 
            value={selectedMeetingId}
            onChange={(e) => setSelectedMeetingId(e.target.value)}
            className="pl-10 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm cursor-pointer min-w-[200px]"
          >
            <option value="all">All Meetings (Aggregate)</option>
            <hr />
            {allMeetings.map(m => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.date})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Activity size={24} /></div>
          <div><p className="text-sm text-slate-500 font-medium">Total Meetings</p><p className="text-2xl font-bold text-slate-800">{summaryMetrics.totalMeetings}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><Clock size={24} /></div>
          <div><p className="text-sm text-slate-500 font-medium">Hours Recorded</p><p className="text-2xl font-bold text-slate-800">{summaryMetrics.totalHours}h</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><TrendingUp size={24} /></div>
          <div><p className="text-sm text-slate-500 font-medium">Completion Rate</p><p className="text-2xl font-bold text-slate-800">{allMeetings.length > 0 ? Math.round((summaryMetrics.completed / activeMeetings.length) * 100) : 0}%</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><ThumbsUp size={24} /></div>
          <div><p className="text-sm text-slate-500 font-medium">Avg. Sentiment</p><p className="text-2xl font-bold text-slate-800">{summaryMetrics.avgSentiment}/100</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={selectedMeetingId === 'all' ? "Transcription Volume (Last 7 Days)" : "Meeting Duration"}>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {selectedMeetingId === 'all' ? (
                <AreaChart data={volumeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Area type="monotone" dataKey="minutes" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMinutes)" />
                </AreaChart>
              ) : (
                <BarChart data={volumeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="minutes" fill="#3b82f6" barSize={60} radius={[4, 4, 0, 0]} name="Minutes" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ... (Sentiment and Topics Charts remain the same, they use activeMeetings automatically) ... */}
        <Card title="Sentiment Overview">
          <div className="h-80 w-full flex items-center justify-center">
            {sentimentDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sentimentDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" paddingAngle={5} dataKey="value">
                    {sentimentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Positive' ? '#10b981' : entry.name === 'Negative' ? '#ef4444' : '#f59e0b'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="text-slate-400">No sentiment data available</div>}
          </div>
        </Card>

        <Card title="Topics (Keywords)">
          <div className="h-80 w-full">
            {topicData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400">Not enough data to extract topics</div>}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;