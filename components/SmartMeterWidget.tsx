
import React, { useEffect, useState } from 'react';
import { SmartMeterData } from '../types';
import { connectToSmartMeter } from '../services/iotService';
import { Zap, Activity, Power, Wifi } from 'lucide-react';

interface SmartMeterWidgetProps {
    meterId: string;
}

const SmartMeterWidget: React.FC<SmartMeterWidgetProps> = ({ meterId }) => {
    const [data, setData] = useState<SmartMeterData | null>(null);

    useEffect(() => {
        const cleanup = connectToSmartMeter(meterId, (newData) => {
            setData(newData);
        });
        return cleanup;
    }, [meterId]);

    if (!data) return (
        <div className="bg-gray-900 rounded-2xl p-6 text-white flex items-center justify-center h-48 animate-pulse">
            <div className="flex flex-col items-center gap-2">
                <Wifi className="animate-ping" />
                <span className="text-xs font-mono text-gray-400">Connecting to Smart Meter...</span>
            </div>
        </div>
    );

    const isPowerOn = data.status === 'ON';

    return (
        <div className="bg-gray-900 rounded-[24px] p-6 text-white relative overflow-hidden border border-gray-800 shadow-xl">
            {/* Background Effect */}
            <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] opacity-20 ${isPowerOn ? 'bg-yellow-400' : 'bg-red-600'}`}></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isPowerOn ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Power Monitor</span>
                    </div>
                    <div className="text-[10px] font-mono text-gray-600">{data.deviceId}</div>
                </div>

                <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 rounded-full ${isPowerOn ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-500'}`}>
                        <Zap size={32} fill={isPowerOn ? "currentColor" : "none"} />
                    </div>
                    <div>
                        <h3 className="text-3xl font-mono font-bold">{isPowerOn ? Math.round(data.voltage) : 0}<span className="text-sm font-sans text-gray-400 ml-1">V</span></h3>
                        <p className={`text-xs font-bold ${isPowerOn ? 'text-green-400' : 'text-red-400'}`}>
                            {isPowerOn ? 'Grid Active' : 'Power Outage'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-800 pt-4">
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase mb-1">Current Load</p>
                        <div className="flex items-center gap-2">
                            <Activity size={14} className="text-blue-400" />
                            <span className="font-mono font-bold text-lg">{data.currentLoad.toFixed(1)}A</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase mb-1">Uptime (24h)</p>
                        <div className="flex items-center gap-2">
                            <Power size={14} className="text-green-400" />
                            <span className="font-mono font-bold text-lg">92%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartMeterWidget;
