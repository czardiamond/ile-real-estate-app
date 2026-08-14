import React, { useState, useRef, useEffect } from 'react';
import type { Property, User } from '../types';
import { X, Send, User as UserIcon, Building2, CloudCheck } from 'lucide-react';
import { saveChatMessageToFirestore, getChatHistoryFromFirestore } from '../services/firebase';

interface ChatModalProps {
  property: Property;
  onClose: () => void;
  user?: User;
}

const ChatModal: React.FC<ChatModalProps> = ({ property, onClose, user }) => {
  const userId = user?.id || 'guest_user';
  const [messages, setMessages] = useState<{role: 'user' | 'agent', text: string}[]>([]);
  const [input, setInput] = useState(`Hi, is this property in ${property.location.area} still available?`);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch agent conversation history for this property
    getChatHistoryFromFirestore(userId, 'property_agent', property.id).then(history => {
      if (history && history.length > 0) {
        setMessages(history.map(m => ({ role: m.role as 'user' | 'agent', text: m.text })));
      } else {
        const initMsg = { role: 'agent' as const, text: `Hello! Thanks for your interest in "${property.title}". How can I help you today?` };
        setMessages([initMsg]);
        saveChatMessageToFirestore({
          userId,
          chatType: 'property_agent',
          propertyId: property.id,
          role: 'agent',
          text: initMsg.text
        });
      }
    });
  }, [userId, property.id, property.title]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if(!input.trim()) return;

    const userText = input;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');

    // Save to Firestore
    saveChatMessageToFirestore({
      userId,
      chatType: 'property_agent',
      propertyId: property.id,
      role: 'user',
      text: userText
    });
    
    // Simulate agent reply
    setTimeout(() => {
        const replyText = "Yes, it is! When would you like to come for an inspection?";
        setMessages(prev => [...prev, { role: 'agent', text: replyText }]);
        saveChatMessageToFirestore({
          userId,
          chatType: 'property_agent',
          propertyId: property.id,
          role: 'agent',
          text: replyText
        });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-surface w-full h-full md:h-[600px] md:max-w-md md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="bg-surface-container-low p-4 flex items-center justify-between border-b border-outline-variant/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <UserIcon size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-on-surface text-sm">Agent for {property.title.substring(0, 15)}...</h3>
                        <p className="text-xs text-on-surface-variant flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                    <X size={24} className="text-on-surface-variant" />
                </button>
            </div>
            
            {/* Property Snippet */}
            <div className="bg-surface-container/50 p-3 flex items-center gap-3 border-b border-outline-variant/10">
                <img src={property.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-on-surface truncate">{property.title}</p>
                    <p className="text-xs text-primary font-bold">₦{property.price.toLocaleString()}</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                            msg.role === 'user' 
                            ? 'bg-primary text-white rounded-tr-none' 
                            : 'bg-surface-container-high text-on-surface rounded-tl-none'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef}></div>
            </div>

            {/* Input */}
            <div className="p-4 bg-surface-container-low border-t border-outline-variant/20 flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-surface border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="Type a message..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button onClick={handleSend} className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-sm hover:scale-105 transition-transform">
                    <Send size={20} />
                </button>
            </div>
        </div>
    </div>
  );
};
export default ChatModal;