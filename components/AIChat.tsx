import React, { useState, useRef, useEffect } from 'react';
import { Send, User as UserIcon, Bot, Sparkles, CloudCheck, Loader2 } from 'lucide-react';
import { chatWithIle } from '../services/geminiService';
import type { User } from '../types';
import { saveChatMessageToFirestore, getChatHistoryFromFirestore } from '../services/firebase';

interface AIChatProps {
  user?: User;
}

const AIChat: React.FC<AIChatProps> = ({ user }) => {
  const userId = user?.id || 'guest_user';
  const [messages, setMessages] = useState<{role: string, text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Load conversation history from Firestore
    setIsLoadingHistory(true);
    getChatHistoryFromFirestore(userId, 'ile_ai').then(history => {
      if (history && history.length > 0) {
        setMessages(history.map(m => ({ role: m.role, text: m.text })));
      } else {
        const welcome = { role: 'model', text: 'Hello! I am Ilé, your AI real estate assistant. How can I help you find your perfect space today?' };
        setMessages([welcome]);
        saveChatMessageToFirestore({ userId, chatType: 'ile_ai', role: 'model', text: welcome.text });
      }
      setIsLoadingHistory(false);
    });
  }, [userId]);

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsgText = input;
    const userMsg = { role: 'user', text: userMsgText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Save user message to Firestore
    saveChatMessageToFirestore({ userId, chatType: 'ile_ai', role: 'user', text: userMsgText });

    try {
      const responseText = await chatWithIle(messages, userMsgText);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      // Save AI response to Firestore
      saveChatMessageToFirestore({ userId, chatType: 'ile_ai', role: 'model', text: responseText });
    } catch (error) {
      const errText = "I'm having trouble connecting right now. Please try again.";
      setMessages(prev => [...prev, { role: 'model', text: errText }]);
      saveChatMessageToFirestore({ userId, chatType: 'ile_ai', role: 'model', text: errText });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-outline-variant/30 overflow-hidden m-4 md:mt-8">
      {/* Header */}
      <div className="bg-white p-6 flex items-center justify-between border-b border-outline-variant/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center text-primary shadow-sm">
              <Sparkles size={24} />
          </div>
          <div>
              <h3 className="font-bold text-on-surface text-lg">Ilé AI Assistant</h3>
              <p className="text-on-surface-variant text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Online & Ready to assist
              </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <CloudCheck size={14} className="text-emerald-600" />
          <span>Firestore Synced</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface">
        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full text-on-surface-variant text-sm gap-2">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span>Retrieving conversation logs from Firestore...</span>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-surface-container-high' : 'bg-primary text-white'}`}>
                  {msg.role === 'user' ? <UserIcon size={20} /> : <Sparkles size={20} />}
              </div>
              <div className={`p-4 rounded-3xl max-w-[85%] text-sm leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none shadow-md shadow-primary/10' 
                  : 'bg-white border border-outline-variant/30 text-on-surface rounded-tl-none shadow-sm'
              }`}>
                  {msg.text}
              </div>
            </div>
          ))
        )}
        {isTyping && (
           <div className="flex gap-4">
             <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-sm">
                 <Sparkles size={20} />
             </div>
             <div className="bg-white border border-outline-variant/30 px-5 py-4 rounded-3xl rounded-tl-none shadow-sm">
                 <div className="flex gap-1.5">
                     <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></span>
                     <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce delay-100"></span>
                     <span className="w-2 h-2 bg-primary/80 rounded-full animate-bounce delay-200"></span>
                 </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-outline-variant/20">
        <div className="flex gap-3 bg-surface-container rounded-full p-2 pl-6 items-center border border-transparent focus-within:bg-white focus-within:shadow-lg focus-within:border-primary/30 transition-all">
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Ilé anything about real estate..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-on-surface-variant/60"
            />
            <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md shadow-primary/20 active:scale-95"
            >
                <Send size={20} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;