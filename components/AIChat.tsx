import React, { useState, useRef, useEffect } from 'react';
import { Send, User as UserIcon, Bot, Sparkles } from 'lucide-react';
import { chatWithIle } from '../services/geminiService';

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<{role: string, text: string}[]>([
    { role: 'model', text: 'Hello! I am Ilé AI. Are you looking for a house, a shop, or maybe a wedding venue today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await chatWithIle(messages, input);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Network vague. Try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden m-4 md:mt-8">
      {/* Header */}
      <div className="bg-primary p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles className="text-secondary" size={20} />
        </div>
        <div>
            <h3 className="font-bold text-white">Ilé Assistant</h3>
            <p className="text-white/70 text-xs">Always here to help you find space.</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-gray-300' : 'bg-primary'}`}>
                {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} className="text-white" />}
            </div>
            <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${
                msg.role === 'user' 
                ? 'bg-gray-800 text-white rounded-tr-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
            }`}>
                {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex gap-2">
             <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                 <Bot size={16} className="text-white" />
             </div>
             <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
                 <div className="flex gap-1">
                     <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                     <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                     <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                 </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about renting shops, houses, or venues..."
            className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
        />
        <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
        >
            <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default AIChat;