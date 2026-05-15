
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FiSend, FiCpu, FiLoader, FiDollarSign, FiPieChart } from 'react-icons/fi';
import { getAIAuditeurChat } from '../firebase-ai.js';

const AIAuditeur = ({ branchId = "sfax" }) => {
    const [messages, setMessages] = useState([
        { role: 'ai', text: `أهلاً بيك! أنا المدقق الذكي الخاص بفرع ${branchId}. كيفاش نجم نعاونك اليوم؟ (مثال: قداش ربحنا اليوم؟ وإلا حلل لي تكاليف Labsa)` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [productionOrders, setProductionOrders] = useState([]);
    const scrollRef = useRef(null);

    useEffect(() => {
        // Scroll to bottom when messages change
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        // Load data for context (Raw materials costs and recent orders)
        const unsubMaterials = onSnapshot(collection(db, 'raw_materials'), (snapshot) => {
            setRawMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const q = query(collection(db, 'production_orders'), orderBy('createdAt', 'desc'), limit(10));
        const unsubOrders = onSnapshot(q, (snapshot) => {
            setProductionOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubMaterials();
            unsubOrders();
        };
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);

        try {
            const response = await getAIAuditeurChat(userMessage, {
                branchId,
                rawMaterials,
                productionOrders
            });
            
            setMessages(prev => [...prev, { role: 'ai', text: response }]);
        } catch (error) {
            toast.error("مشكلة في الاتصال بالذكاء الاصطناعي");
            setMessages(prev => [...prev, { role: 'ai', text: "سامحني، صارت مشكلة فنية. عاود جرب مرة أخرى." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col h-[600px] w-full max-w-2xl mx-auto overflow-hidden">
            {/* Header */}
            <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500 p-2 rounded-lg">
                        <FiCpu className="text-white text-xl" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">AI Auditeur - {branchId.toUpperCase()}</h3>
                        <p className="text-xs text-green-400 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> متصل - تحليل ذكي
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 text-slate-400 text-sm">
                   <FiDollarSign title="Profit Reports" className="hover:text-red-500 cursor-pointer" />
                   <FiPieChart title="Analytics" className="hover:text-red-500 cursor-pointer" />
                </div>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl ${
                            msg.role === 'user' 
                            ? 'bg-red-600 text-white rounded-tr-none' 
                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                        }`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-700">
                            <FiLoader className="animate-spin text-red-500" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-800 border-t border-slate-700">
                <div className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="اسألني أي حاجة بالدارجة..."
                        className="flex-1 bg-slate-900 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isLoading}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isLoading ? '...' : 'Go'} <FiSend />
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 text-center">
                    مدعوم بـ Cinqd AI Engine - تحليل فوري للتكاليف والأرباح
                </p>
            </div>
        </div>
    );
};

export default AIAuditeur;
