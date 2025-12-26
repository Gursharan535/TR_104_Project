// ai-workspace/src/data.ts
import type { Meeting } from './types';

export const mockMeetings: Meeting[] = [
  { 
    id: '1', 
    title: 'Q3 Product Roadmap', 
    date: '2023-10-24', 
    duration: '45m', 
    status: 'Completed', 
    summary: 'Discussed Q3 goals, focusing on AI integration. Key deliverables: Vector DB, Auth module. The team agreed to prioritize the RAG pipeline over the voice biometrics for the MVP.',
    transcript: `[00:00] Alex: Alright, let's get started with the Q3 roadmap. We have a lot to cover today regarding the AI Workspace.
[00:15] Sarah: Thanks Alex. I've reviewed the backlog. The vector database integration seems to be the biggest blocker for the RAG features.
[00:45] Alex: Agreed. If we don't get that right, the chat assistant won't be very useful. How long do we think it will take?
[01:10] Mike: I've done some prototyping with Chroma. It's promising, but we need to figure out the deployment strategy for production.
[02:00] Sarah: We also need to decide on the biometrics. Is it MVP critical?
[02:30] Alex: Good question. I think we should prioritize the RAG pipeline over voice biometrics for now. Let's keep biometrics as "experimental" in the UI.
[03:45] Mike: Makes sense. I'll focus on the backend FastAPI migration and the embeddings generation this week.
[04:20] Sarah: I'll handle the frontend components for the chat interface.
[05:00] Alex: Perfect. Let's sync again on Friday to check the latency metrics.`,
    speakers: [
      { name: 'Alex', value: 40, color: '#3b82f6' },
      { name: 'Sarah', value: 35, color: '#10b981' },
      { name: 'Mike', value: 25, color: '#f59e0b' },
    ],
    sentiment: 'Positive',
    sentimentScore: 88,
    keywords: ['Roadmap', 'Vector DB', 'RAG Pipeline', 'Biometrics', 'FastAPI', 'Latency'],
    actionItems: [
      { id: '1', text: 'Mike to finalize backend FastAPI migration', completed: true },
      { id: '2', text: 'Sarah to build frontend chat interface', completed: false },
      { id: '3', text: 'Team to sync on latency metrics by Friday', completed: false },
      { id: '4', text: 'Prioritize RAG pipeline over biometrics', completed: false }
    ],
    userNotes: "Key takeaway: We are deprioritizing voice biometrics for now. Need to check in with Mike about the vector DB choice next week."
  },
  { 
    id: '2', 
    title: 'Weekly Sync: Engineering', 
    date: '2023-10-25', 
    duration: '30m', 
    status: 'Completed', 
    summary: 'Updates on backend migration and API latency. Backend team is 80% done with FastAPI migration. Latency issues in the transcription service were identified and a fix is scheduled for Friday.',
    transcript: `[00:00] Mike: Hey team, quick update on the backend migration. We are about 80% done with the move to FastAPI.
[02:15] Alex: That's great news. Any performance improvements so far?
[03:00] Mike: Yes, the async endpoints are handling concurrent requests much better. However, we noticed some latency in the transcription service.
[05:20] Sarah: Is that related to the file upload size or the processing itself?
[06:10] Mike: It's the ffmpeg extraction step. It's taking longer than expected for large video files. I'm optimizing the arguments.
[08:00] Alex: Okay, let's schedule a fix deployment for Friday. We can't have users waiting too long for uploads.
[10:30] Sarah: On the frontend side, I've updated the dashboard layout. The new charts are looking good.
[12:00] Mike: Awesome. I'll unblock the API endpoints for the analytics view by EOD.`,
    speakers: [
      { name: 'Mike', value: 60, color: '#f59e0b' },
      { name: 'Alex', value: 20, color: '#3b82f6' },
      { name: 'Sarah', value: 20, color: '#10b981' },
    ],
    sentiment: 'Neutral',
    sentimentScore: 54,
    keywords: ['FastAPI', 'Async', 'Latency', 'Transcription', 'FFmpeg', 'Optimization'],
    actionItems: [
      { id: '1', text: 'Deploy fix for transcription latency on Friday', completed: false },
      { id: '2', text: 'Mike to unblock API endpoints for analytics', completed: true }
    ]
  },
  { 
    id: '3', 
    title: 'Client Feedback Session', 
    date: '2023-10-26', 
    duration: '60m', 
    status: 'Processing',
    summary: 'Pending processing...',
    transcript: 'Transcript generation in progress...',
    speakers: []
  },
  { 
    id: '4', 
    title: 'Design Review: Mobile App', 
    date: '2023-10-27', 
    duration: '50m', 
    status: 'Failed',
    transcript: 'Error: Transcription failed due to corrupted audio file.',
    speakers: []
  },
];
