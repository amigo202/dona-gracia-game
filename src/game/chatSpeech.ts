import { useCallback, useEffect, useRef, useState } from 'react';
import { getChatEndpoint } from './donaChat';
import { useSpeech } from './store';

export function getTtsEndpoint(): string | null {
  const base = getChatEndpoint();
  if (!base) return null;
  return base.replace(/\/+$/, '') + '/tts';
}

/* הקראת תשובות בצ'אט: קול Sulafat הנשי דרך ה-Worker, עם נפילה לקול המכשיר */
export function useReplySpeech() {
  const device = useSpeech();
  const remoteUrl = getTtsEndpoint();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const genRef = useRef(0);
  const [remotePlaying, setRemotePlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState('');

  const clearAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.ontimeupdate = null;
      audio.onerror = null;
      audio.pause();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const stop = useCallback(() => {
    genRef.current += 1;
    clearAudio();
    device.stop();
    setRemotePlaying(false);
    setLoading(false);
  }, [device]);

  useEffect(() => () => {
    genRef.current += 1;
    clearAudio();
  }, []);

  const speakRemote = async (text: string, gen: number) => {
    if (!remoteUrl) return false;
    setLoading(true);
    setRemotePlaying(true);
    setProgress(0);
    try {
      const resp = await fetch(remoteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (gen !== genRef.current) return true;
      if (!resp.ok) {
        setRemotePlaying(false);
        setLoading(false);
        if (resp.status === 429) {
          setNote('ההקראה בקול של דונה הגיעה למכסת היום. יושמע קול המכשיר, אם הוא זמין.');
        } else {
          setNote('ההקראה בקול של דונה לא הייתה זמינה כרגע, לכן יושמע קול המכשיר, אם הוא זמין.');
        }
        return false;
      }
      const blob = await resp.blob();
      if (gen !== genRef.current) return true;
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.ontimeupdate = () => {
        if (gen !== genRef.current || !audio.duration) return;
        setProgress(Math.min(100, Math.round(100 * (audio.currentTime / audio.duration))));
      };
      audio.onended = () => {
        if (gen !== genRef.current) return;
        setRemotePlaying(false);
        setLoading(false);
        setProgress(100);
      };
      audio.onerror = () => {
        if (gen !== genRef.current) return;
        clearAudio();
        setRemotePlaying(false);
        setLoading(false);
        setNote('ההקראה בקול של דונה לא הצליחה להתנגן, לכן יושמע קול המכשיר, אם הוא זמין.');
        void device.speak(text);
      };
      setLoading(false);
      await audio.play();
      return true;
    } catch {
      if (gen !== genRef.current) return true;
      setRemotePlaying(false);
      setLoading(false);
      setNote('ההקראה בקול של דונה לא הייתה זמינה כרגע, לכן יושמע קול המכשיר, אם הוא זמין.');
      return false;
    }
  };

  const speak = useCallback(async (text: string) => {
    if (remotePlaying || loading || device.playing) {
      stop();
      return;
    }
    const gen = ++genRef.current;
    setNote('');
    setProgress(0);
    if (remoteUrl) {
      const handled = await speakRemote(text, gen);
      if (handled || gen !== genRef.current) return;
    }
    if (!device.supported) {
      setNote('ההקראה אינה זמינה במכשיר הזה כרגע.');
      return;
    }
    await device.speak(text);
  }, [remoteUrl, remotePlaying, loading, device, stop]);

  return {
    supported: !!remoteUrl || device.supported,
    playing: remotePlaying || device.playing,
    loading,
    progress: remotePlaying ? progress : device.progress,
    note: note || device.note,
    speak,
    stop,
  };
}
