import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import provider icons
import anthropicIcon from '@/assets/provider-icons/anthropic.png';
import deepInfraIcon from '@/assets/provider-icons/deepinfra.svg';
import deepseekIcon from '@/assets/provider-icons/deepseek.png';
import fireworksIcon from '@/assets/provider-icons/fireworks.svg';
import googleIcon from '@/assets/provider-icons/google.svg';
import groqIcon from '@/assets/provider-icons/groq.svg';
import litellmIcon from '@/assets/provider-icons/litellm.png';
import ollamaIcon from '@/assets/provider-icons/ollama.svg';
import openaiIcon from '@/assets/provider-icons/openai.svg';
import openrouterIcon from '@/assets/provider-icons/openrouter.svg';
import togetherIcon from '@/assets/provider-icons/together.svg';
import vllmIcon from '@/assets/provider-icons/vllm.svg';

interface ProviderIconProps {
  provider: string;
  className?: string;
}

export function ProviderIcon({ provider, className }: ProviderIconProps) {
  const p = provider.toLowerCase();

  const iconClasses = cn('size-5 object-contain', className);

  const localIcons: Record<string, string> = {
    openai: openaiIcon,
    google: googleIcon,
    vllm: vllmIcon,
    ollama: ollamaIcon,
    litellm: litellmIcon,
    fireworks: fireworksIcon,
    together: togetherIcon,
    openrouter: openrouterIcon,
    deepinfra: deepInfraIcon,
    groq: groqIcon,
    anthropic: anthropicIcon,
    deepseek: deepseekIcon,
  };

  // Providers that use monochrome icons (likely black by default)
  // These need to be inverted in dark mode to be visible (white).
  const monochromeProviders = ['openai', 'ollama', 'groq', 'openrouter'];
  const isMonochrome = monochromeProviders.includes(p);

  if (localIcons[p]) {
    return (
      <img
        src={localIcons[p]}
        alt={provider}
        className={cn('rounded-sm', iconClasses, {
          'dark:invert': isMonochrome,
        })}
      />
    );
  }

  // Fallback logos for providers not in local assets (none currently, but good to keep structure)
  const remoteLogos: Record<string, string> = {};

  if (remoteLogos[p]) {
    return (
      <img
        src={remoteLogos[p]}
        alt={provider}
        className={cn('rounded-sm', iconClasses)}
      />
    );
  }

  return <Bot className={iconClasses} />;
}
