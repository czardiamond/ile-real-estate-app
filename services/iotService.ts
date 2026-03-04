
import { SmartMeterData } from "../types";

export const connectToSmartMeter = (meterId: string, onUpdate: (data: SmartMeterData) => void) => {
    // Initial State
    let currentData: SmartMeterData = {
        deviceId: meterId,
        status: 'ON',
        voltage: 220,
        currentLoad: 12.5,
        lastUpdated: new Date().toISOString()
    };

    // Simulate WebSocket updates
    const interval = setInterval(() => {
        // Random fluctuation
        const voltageFluctuation = Math.random() * 10 - 5; // +/- 5V
        const loadFluctuation = Math.random() * 2 - 1; // +/- 1A
        
        // Simulating power cut scenario (random chance)
        const isPowerCut = Math.random() > 0.98; // 2% chance of update being a power cut

        if (isPowerCut) {
            currentData = {
                ...currentData,
                status: 'OFF',
                voltage: 0,
                currentLoad: 0,
                lastUpdated: new Date().toISOString()
            };
        } else {
            // If it was off, maybe it comes back on?
            if (currentData.status === 'OFF' && Math.random() > 0.5) {
                 currentData.status = 'ON';
                 currentData.voltage = 215;
            }

            if (currentData.status === 'ON') {
                currentData = {
                    ...currentData,
                    voltage: Math.min(240, Math.max(180, currentData.voltage + voltageFluctuation)),
                    currentLoad: Math.max(0, currentData.currentLoad + loadFluctuation),
                    lastUpdated: new Date().toISOString()
                };
            }
        }

        onUpdate(currentData);
    }, 2000); // Update every 2 seconds

    // Return cleanup function
    return () => clearInterval(interval);
};
