'use client';

import React, { useEffect, useState, useRef } from 'react';
import * as Ably from 'ably';
import { AblyProvider, ChannelProvider, useChannel, useConnectionStateListener } from 'ably/react';
import { Button, Card, CardBody, Spinner, ScrollShadow } from '@nextui-org/react';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import AudioVisualizer from './AudioVisualizer';
import { v4 as uuidv4 } from 'uuid';

const ABLY_AUTH_URL = '/api/auth/token';

export default function VoiceInterfaceWrapper() {
  const [client, setClient] = useState<Ably.Realtime | null>(null);

  useEffect(() => {
    const ablyClient = new Ably.Realtime({ authUrl: ABLY_AUTH_URL });
    setClient(ablyClient);
    return () => {
        ablyClient.close();
    }
  }, []);

  if (!client) return <div className="flex justify-center p-10"><Spinner label="Connecting to Realtime..." /></div>;

  return (
    <AblyProvider client={client}>
      <VoiceInterfaceContent />
    </AblyProvider>
  );
}

function VoiceInterfaceContent() {
  const [userId, setUserId] = useState<string>('');
  const [logs, setLogs] = useState<{ sender: string; text: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isRecording, startRecording, stopRecording, recordingBlob, audioStream } = useAudioRecorder();
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Session
  useEffect(() => {
    let storedId = localStorage.getItem('krishi_user_id');
    if (!storedId) {
      storedId = uuidv4();
      localStorage.setItem('krishi_user_id', storedId);
    }
    setUserId(storedId);
  }, []);

  // Ably Channel Connection
  const { channel } = useChannel(userId ? `user:${userId}` : null, (message) => {
    if (message.name === 'update') {
      const data = message.data;
      setIsProcessing(false);
      
      // Update logs
      setLogs(prev => [
        ...prev, 
        { sender: 'You', text: data.transcription }, 
        { sender: 'Krishi-Mitra', text: data.text }
      ]);
      
      // Play Audio
      if (data.audioUrl) {
        playAudio(data.audioUrl);
      }
    }
  });

  const playAudio = (url: string) => {
    if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(e => console.error("Playback error", e));
    } else {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play().catch(e => console.error("Playback error", e));
    }
  };

  // Send Audio when recording stops
  useEffect(() => {
    if (recordingBlob && userId) {
      sendAudio(recordingBlob);
    }
  }, [recordingBlob, userId]);

  const sendAudio = async (blob: Blob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('audio', blob);
    formData.append('userId', userId);

    try {
      await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });
      // Response handled via Ably
    } catch (error) {
      console.error('Upload failed', error);
      setIsProcessing(false);
    }
  };

  // Auto-scroll logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!userId) return null;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto p-4">
      <Card className="w-full h-[400px] bg-zinc-900/50 backdrop-blur-md border border-zinc-700">
        <CardBody className="p-0">
          <ScrollShadow className="h-full p-4 space-y-4">
            {logs.length === 0 && (
              <div className="text-center text-zinc-500 mt-20">
                <p>Tap the mic and say "Namaste" or "I need a loan"</p>
              </div>
            )}
            {logs.map((log, i) => (
              <div key={i} className={`flex ${log.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl ${
                  log.sender === 'You' 
                    ? 'bg-blue-600/20 text-blue-100 rounded-tr-none' 
                    : 'bg-green-600/20 text-green-100 rounded-tl-none'
                }`}>
                  <p className="text-xs opacity-50 mb-1">{log.sender}</p>
                  <p>{log.text}</p>
                </div>
              </div>
            ))}
            {isProcessing && (
               <div className="flex justify-start">
                 <div className="bg-zinc-800 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                   <Spinner size="sm" color="success" />
                   <span className="text-xs text-zinc-400">Thinking...</span>
                 </div>
               </div>
            )}
            <div ref={bottomRef} />
          </ScrollShadow>
        </CardBody>
      </Card>

      <div className="relative z-10">
        {isRecording && (
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[200px] h-[60px]">
                <AudioVisualizer stream={audioStream} width={200} height={60} barColor="#ef4444" />
            </div>
        )}

        <Button
          size="lg"
          radius="full"
          color={isRecording ? "danger" : "primary"}
          className={`w-20 h-20 text-2xl shadow-xl ${isRecording ? 'animate-pulse' : ''}`}
          onPress={isRecording ? stopRecording : startRecording}
          isDisabled={isProcessing}
        >
          {isRecording ? '🛑' : '🎙️'}
        </Button>
      </div>

      <p className="text-zinc-500 text-sm">
        {isRecording ? "Listening..." : isProcessing ? "Processing..." : "Tap to Speak"}
      </p>
    </div>
  );
}
