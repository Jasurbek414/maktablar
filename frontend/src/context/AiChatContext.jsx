import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../services/api';

const AiChatContext = createContext(null);

export function AiChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const send = useCallback(async (content) => {
    const text = (content ?? '').trim();
    if (!text) return;
    setError('');
    let nextMessages;
    setMessages(prev => {
      nextMessages = [...prev, { role: 'user', content: text, at: new Date().toISOString() }];
      return nextMessages;
    });
    setSending(true);
    try {
      const res = await api.post('/api/ai-chat', { messages: nextMessages.map(({ role, content }) => ({ role, content })) });
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply, at: new Date().toISOString() }]);
    } catch (e) {
      setError(e.message || 'Xatolik yuz berdi');
    } finally {
      setSending(false);
    }
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError('');
  }, []);

  const value = { messages, sending, error, send, clear, open, setOpen };
  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
}

export function useAiChat() {
  const ctx = useContext(AiChatContext);
  if (!ctx) throw new Error('useAiChat must be used within AiChatProvider');
  return ctx;
}
