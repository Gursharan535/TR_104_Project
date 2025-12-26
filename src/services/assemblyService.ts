// src/services/assemblyService.ts
import { executeWithKeyRotation } from './keyManager';

const AAI_PREFIX = 'VITE_AAI_KEY';

interface AssemblyUploadResponse {
  upload_url: string;
}

// Data structure for a single spoken line
export interface Utterance {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

interface AssemblyTranscriptResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  error?: string;
  language_code?: string;
  utterances?: Utterance[]; // <--- ADDED THIS
}

const uploadFile = async (file: File, apiKey: string): Promise<string> => {
  const response = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: { authorization: apiKey },
    body: file,
  });

  if (!response.ok) throw new Error('Failed to upload file to AssemblyAI');
  const data: AssemblyUploadResponse = await response.json();
  return data.upload_url;
};

const requestTranscript = async (audioUrl: string, apiKey: string): Promise<string> => {
  const response = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_detection: true,
      speaker_labels: true, // <--- Key for multi-speaker detection
    }),
  });

  if (!response.ok) throw new Error('Failed to start transcription');
  const data = await response.json();
  return data.id;
};

const checkStatus = async (transcriptId: string, apiKey: string): Promise<AssemblyTranscriptResponse> => {
  const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
    method: 'GET',
    headers: { authorization: apiKey },
  });

  if (!response.ok) throw new Error('Failed to check transcript status');
  return await response.json();
};

export const transcribeAudio = async (file: File, onProgress: (msg: string) => void): Promise<AssemblyTranscriptResponse> => {
  onProgress('Uploading audio file...');
  const uploadUrl = await executeWithKeyRotation(AAI_PREFIX, async (key) => uploadFile(file, key));

  onProgress('Detecting language and transcribing...');
  const transcriptId = await executeWithKeyRotation(AAI_PREFIX, async (key) => requestTranscript(uploadUrl, key));

  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const statusData = await executeWithKeyRotation(AAI_PREFIX, async (key) => checkStatus(transcriptId, key));

        if (statusData.status === 'completed') {
          clearInterval(pollInterval);
          onProgress('Transcription complete.');
          resolve(statusData);
        } else if (statusData.status === 'error') {
          clearInterval(pollInterval);
          reject(new Error(statusData.error || 'Transcription failed'));
        } else {
          onProgress(`Processing audio (${statusData.status})...`);
        }
      } catch (err) {
        clearInterval(pollInterval);
        reject(err);
      }
    }, 3000);
  });
};