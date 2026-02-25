import { useState, useCallback, useEffect, useRef } from 'react';

const getSpeechSynthesis = () =>
  typeof window !== 'undefined' ? window.speechSynthesis : null;

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

export const useTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    const synth = getSpeechSynthesis();
    if (synth) synth.cancel();
    setIsPlaying(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      const cleanText = cleanTextForTTS(text);
      if (!cleanText) return;

      const synth = getSpeechSynthesis();
      if (!synth) return;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const lang = detectLanguage(cleanText);
      const voices = synth.getVoices();

      const findVoice = (targetLang: string) =>
        voices.find((v) => v.lang === targetLang) ||
        voices.find((v) => v.lang.startsWith(targetLang.split('-')[0]));

      let voice: SpeechSynthesisVoice | undefined =
        lang === 'vi-VN'
          ? findVoice(lang)
          : lang === 'en-US'
            ? voices.find((v) => v.name === 'Samantha')
            : undefined;
      if (!voice) voice = voices.find((v) => v.default) || voices[0];

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = lang;
      }

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      utteranceRef.current = utterance;
      synth.speak(utterance);
    },
    [stop]
  );

  const toggle = useCallback(
    (text: string) => {
      if (isPlaying) {
        stop();
      } else {
        speak(text);
      }
    },
    [isPlaying, speak, stop]
  );

  useEffect(() => {
    return () => {
      const synth = getSpeechSynthesis();
      if (synth) synth.cancel();
    };
  }, []);

  return { isPlaying, speak, stop, toggle };
};
