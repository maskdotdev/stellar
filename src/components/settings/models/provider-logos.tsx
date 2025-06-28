import React from 'react'
import {
  SiOpenai,
  SiAnthropic,
  SiGoogle,
  SiMeta,
  SiHuggingface,
  SiAmazon,
  SiGooglecloud,
  SiGithub
} from 'react-icons/si'
import { VscAzure } from 'react-icons/vsc'
import { RiTwitterXLine, RiVercelFill } from 'react-icons/ri'
import { Bot, Cpu, Zap, Cloud, Code, Star, Wind, RotateCcw } from 'lucide-react'

interface ProviderLogoProps {
  providerId: string
  providerName: string
  className?: string
  size?: number
}

export const ProviderLogo: React.FC<ProviderLogoProps> = ({ 
  providerId, 
  providerName, 
  className = "", 
  size = 16 
}) => {
  const getLogoComponent = () => {
    const id = providerId.toLowerCase()
    const name = providerName.toLowerCase()
    
    // OpenAI
    if (id.includes('openai') || name.includes('openai')) {
      return <SiOpenai className={className} size={size} />
    }
    
    // Anthropic/Claude
    if (id.includes('anthropic') || name.includes('anthropic') || name.includes('claude')) {
      return <SiAnthropic className={className} size={size} />
    }
    
    // Google/Gemini
    if (id.includes('google') || name.includes('google') || name.includes('gemini')) {
      return <SiGoogle className={className} size={size} />
    }
    
    // Meta/Llama
    if (id.includes('meta') || name.includes('meta') || name.includes('llama')) {
      return <SiMeta className={className} size={size} />
    }
    
    // Mistral
    if (id.includes('mistral') || name.includes('mistral')) {
      return <Wind className={className} size={size} />
    }
    
    // HuggingFace
    if (id.includes('huggingface') || name.includes('hugging')) {
      return <SiHuggingface className={className} size={size} />
    }
    
    // Cohere
    if (id.includes('cohere') || name.includes('cohere')) {
      return <Cpu className={className} size={size} />
    }
    
    // Microsoft/Azure
    if (id.includes('azure') || name.includes('azure') || id.includes('microsoft') || name.includes('microsoft')) {
      return <VscAzure className={className} size={size} />
    }
    
    // Amazon/AWS
    if (id.includes('aws') || name.includes('aws') || id.includes('amazon') || name.includes('amazon')) {
      return <SiAmazon className={className} size={size} />
    }
    
    // Google Cloud
    if (id.includes('gcp') || name.includes('cloud')) {
      return <SiGooglecloud className={className} size={size} />
    }
    
    // Vercel
    if (id.includes('vercel') || name.includes('vercel')) {
      return <RiVercelFill className={className} size={size} />
    }
    
    // GitHub (for GitHub Copilot or GitHub models)
    if (id.includes('github') || name.includes('github') || name.includes('copilot')) {
      return <SiGithub className={className} size={size} />
    }
    
    // X/Twitter (for Grok or X.AI)
    if (id.includes('grok') || name.includes('grok') || id.includes('xai') || name.includes('x.ai')) {
      return <RiTwitterXLine className={className} size={size} />
    }
    
    // Stability AI
    if (id.includes('stability') || name.includes('stability')) {
      return <Star className={className} size={size} />
    }
    
    // Ollama (no official icon, use bot)
    if (id.includes('ollama') || name.includes('ollama')) {
      return <Bot className={className} size={size} />
    }
    
    // Groq (hardware company, different from Grok)
    if (id.includes('groq') || name.includes('groq')) {
      return <Zap className={className} size={size} />
    }
    
    // Together (no official icon, use cpu)
    if (id.includes('together') || name.includes('together')) {
      return <Cpu className={className} size={size} />
    }
    
    // Replicate (no official icon, use rotate)
    if (id.includes('replicate') || name.includes('replicate')) {
      return <RotateCcw className={className} size={size} />
    }
    
    // Perplexity (no official icon, use code)
    if (id.includes('perplexity') || name.includes('perplexity')) {
      return <Code className={className} size={size} />
    }
    
    // Generic cloud for unknown cloud providers
    if (name.includes('cloud') || name.includes('api')) {
      return <Cloud className={className} size={size} />
    }
    
    // Default fallback
    return <Bot className={className} size={size} />
  }
  
  return getLogoComponent()
} 