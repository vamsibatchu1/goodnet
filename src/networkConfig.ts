// src/networkConfig.ts

export interface NetworkDevice {
    id: string;
    name: string;
    type: 'ROUTER' | 'ACCESS_PT' | 'CLIENT' | 'SWITCH';
    brand: 'ATT' | 'GOOGLE' | 'APPLE' | 'OTHER';
    ipAddress: string;
    macAddress?: string;
    location?: string;
    status: 'NOMINAL' | 'SUB-OPTIMAL' | 'WARNING' | 'OFFLINE';

    // Custom styling derived in app
    color?: string;

    // Specific diagnostic metrics (can be populated by real scans later)
    dwn?: number;
    up?: number;
    ping?: number;
    health?: number;
    devices?: number; // Connected devices to this sub-node
}

export const NETWORK_NODES: NetworkDevice[] = [
    {
        id: 'RT01',
        name: 'ATT_FIBER_MAIN',
        type: 'ROUTER',
        brand: 'ATT',
        ipAddress: '192.168.1.254', // Typical AT&T Gateway IP, edit if different
        location: 'FLOOR_01',
        status: 'NOMINAL',
        dwn: 940,
        up: 920,
        ping: 12,
        health: 98,
        devices: 14
    },
    {
        id: 'RT02',
        name: 'GOOG_WIFI_MAIN',
        type: 'ROUTER',
        brand: 'GOOGLE',
        ipAddress: '192.168.86.1', // Typical Google WiFi Main IP, edit if different
        location: 'FLOOR_01',
        status: 'SUB-OPTIMAL',
        dwn: 450,
        up: 380,
        ping: 24,
        health: 85,
        devices: 22
    },

    {
        id: 'AP02',
        name: 'GOOG_WIFI_NODE',
        type: 'ACCESS_PT',
        brand: 'GOOGLE',
        ipAddress: '192.168.86.2', // Example node
        location: 'FLOOR_02',
        status: 'WARNING',
        dwn: 210,
        up: 150,
        ping: 45,
        health: 62,
        devices: 11
    },
];

// Provide your actual client devices here to build out the terminal's target system
export const CONNECTED_CLIENTS: NetworkDevice[] = [
    {
        id: 'CL01',
        name: 'VAMSI_MBP',
        type: 'CLIENT',
        brand: 'APPLE',
        ipAddress: '192.168.86.30',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        status: 'NOMINAL'
    },
    {
        id: 'CL02',
        name: 'LIVING_ROOM_TV',
        type: 'CLIENT',
        brand: 'OTHER',
        ipAddress: '192.168.1.45',
        status: 'NOMINAL'
    }
];
