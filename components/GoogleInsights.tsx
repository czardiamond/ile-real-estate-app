
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Property } from '../types';
import { Search, Map as MapIcon, TrendingUp, ShieldCheck, Info, Sparkles, ExternalLink, MapPin, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';

interface GoogleInsightsProps {
    property: Property;
}

const GoogleInsights: React.FC<GoogleInsightsProps> = ({ property }) => {
    const [insights, setInsights] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [groundingChunks, setGroundingChunks] = useState<any[]>([]);

    const generateInsights = async () => {
        setLoading(true);
        setError(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const prompt = `
                Provide a comprehensive neighborhood and market insight for this property in ${property.location.area}, ${property.location.city}, ${property.location.state}, Nigeria.
                
                Property Details:
                - Title: ${property.title}
                - Type: ${property.type}
                - Price: ₦${property.price.toLocaleString()}
                - Features: ${property.features.join(', ')}
                
                Please use Google Search and Google Maps to find:
                1. Recent real estate trends in ${property.location.area}.
                2. Neighborhood safety and development news.
                3. Top 3 nearby amenities (schools, hospitals, or malls) with their names and general distance.
                4. A "Smart Verdict" on whether this is a good investment or rental choice based on current market data.
                
                Format the response in clean Markdown with clear headings.
            `;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
                config: {
                    tools: [
                        { googleSearch: {} },
                        { googleMaps: {} }
                    ],
                    toolConfig: {
                        retrievalConfig: {
                            latLng: property.coordinates ? {
                                latitude: property.coordinates.lat,
                                longitude: property.coordinates.lng
                            } : undefined
                        }
                    }
                },
            });

            setInsights(response.text || "No insights available at the moment.");
            
            // Extract grounding chunks for citations
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            setGroundingChunks(chunks);

        } catch (err) {
            console.error("Error generating insights:", err);
            setError("Failed to load smart insights. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        generateInsights();
    }, [property.id]);

    return (
        <div className="bg-white rounded-3xl border border-outline-variant/30 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="bg-primary/5 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                        <Sparkles size={16} />
                    </div>
                    <h3 className="font-bold text-on-surface">Smart Insights by Google</h3>
                </div>
                {loading && (
                    <div className="flex items-center gap-2 text-xs text-primary font-medium animate-pulse">
                        <Search size={14} className="animate-spin" /> Analyzing data...
                    </div>
                )}
            </div>

            <div className="p-6">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            <div className="h-4 bg-surface-container rounded-full w-3/4 animate-pulse" />
                            <div className="h-4 bg-surface-container rounded-full w-full animate-pulse" />
                            <div className="h-4 bg-surface-container rounded-full w-5/6 animate-pulse" />
                            <div className="h-32 bg-surface-container rounded-2xl w-full animate-pulse" />
                        </motion.div>
                    ) : error ? (
                        <motion.div 
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-8"
                        >
                            <div className="w-12 h-12 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-3">
                                <Info size={24} />
                            </div>
                            <p className="text-on-surface-variant text-sm">{error}</p>
                            <button 
                                onClick={generateInsights}
                                className="mt-4 text-primary font-bold text-sm hover:underline"
                            >
                                Try Again
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="prose prose-sm max-w-none text-on-surface-variant"
                        >
                            <div className="markdown-body">
                                <Markdown>{insights || ""}</Markdown>
                            </div>

                            {groundingChunks.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-outline-variant/20">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 mb-3 flex items-center gap-2">
                                        <ExternalLink size={12} /> Sources & Citations
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {groundingChunks.map((chunk, idx) => {
                                            const uri = chunk.web?.uri || chunk.maps?.uri;
                                            const title = chunk.web?.title || chunk.maps?.title || "Source";
                                            if (!uri) return null;
                                            return (
                                                <a 
                                                    key={idx}
                                                    href={uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-primary-container hover:text-on-primary-container rounded-full text-[10px] font-medium transition-colors border border-outline-variant/30"
                                                >
                                                    {chunk.maps ? <MapIcon size={10} /> : <Search size={10} />}
                                                    {title}
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <div className="bg-surface-container px-6 py-3 flex items-center gap-4 text-[10px] text-on-surface-variant/60">
                <div className="flex items-center gap-1">
                    <ShieldCheck size={12} className="text-secondary" /> Verified by Google Search
                </div>
                <div className="flex items-center gap-1">
                    <MapIcon size={12} className="text-primary" /> Live Maps Data
                </div>
            </div>
        </div>
    );
};

export default GoogleInsights;
