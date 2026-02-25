import { useState, useCallback, useEffect, useRef } from 'react';
import EasySpeech from 'easy-speech';

function cleanTextForTTS(text: string): string {
  return text
    .replace(/#+\s/g, '') // headers
    .replace(/\*\*/g, '') // bold
    .replace(/\*/g, '') // italic
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/`.*?`/g, '') // inline code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
    .replace(/!\[.*?\]\(.*?\)/g, '') // images
    .replace(/>\s/g, '') // quotes
    .replace(/-\s/g, '') // list items
    .trim();
}

function detectLanguage(text: string): string {
  const hasVietnamese =
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
      text
    );
  return hasVietnamese ? 'vi-VN' : 'en-US';
}

function selectVoice(
  voices: SpeechSynthesisVoice[],
  lang: string
): SpeechSynthesisVoice | undefined {
  const findVoice = (targetLang: string) =>
    voices.find((v) => v.lang === targetLang) ||
    voices.find((v) => v.lang.startsWith(targetLang.split('-')[0]));

  if (lang === 'vi-VN') return findVoice(lang);
  if (lang === 'en-US') {
    const samantha = voices.find((v) => v.name === 'Samantha');
    if (samantha) return samantha;
    return findVoice('en');
  }
  const byLang = findVoice(lang);
  if (byLang) return byLang;
  return voices.find((v) => v.default) ?? voices[0];
}

const TTS_INIT_OPTIONS = {
  maxTimeout: 5000,
  interval: 250,
  quiet: true,
} as const;

export const useTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  /** True when init succeeded and at least one voice is available (TTS usable). */
  const [isAvailable, setIsAvailable] = useState(false);
  const initPromiseRef = useRef<Promise<boolean> | null>(null);
  const initializedRef = useRef(false);

  const ensureInit = useCallback((): Promise<boolean> => {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (initPromiseRef.current) return initPromiseRef.current;
    initPromiseRef.current = EasySpeech.init(TTS_INIT_OPTIONS).then((ok) => {
      initializedRef.current = ok;
      if (ok && EasySpeech.voices().length > 0) {
        setIsAvailable(true);
      }
      return ok;
    });
    return initPromiseRef.current;
  }, []);

  const stop = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!initializedRef.current) {
      setIsPlaying(false);
      return;
    }
    EasySpeech.cancel();
    setIsPlaying(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const cleanText = cleanTextForTTS(text);
      if (!cleanText) return;

      if (typeof window === 'undefined') return;
      const ok = await ensureInit();
      if (!ok) return;

      const voices = EasySpeech.voices();
      if (!voices.length) return;

      const lang = detectLanguage(cleanText);
      const voice = selectVoice(voices, lang);

      stop();

      try {
        await EasySpeech.speak({
          text: cleanText,
          voice: voice ?? undefined,
          start: () => setIsPlaying(true),
          end: () => setIsPlaying(false),
          error: () => setIsPlaying(false),
        });
      } catch {
        setIsPlaying(false);
      }
    },
    [ensureInit, stop]
  );

  const toggle = useCallback(
    (text: string) => {
      if (isPlaying) {
        stop();
      } else {
        void speak(text);
      }
    },
    [isPlaying, speak, stop]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    void ensureInit();
    return () => {
      if (initializedRef.current) {
        EasySpeech.cancel();
      }
    };
  }, [ensureInit]);

  return { isPlaying, isAvailable, speak, stop, toggle };
};
