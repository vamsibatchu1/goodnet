import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execAsync = util.promisify(exec);
const app = express();

app.use(cors());

// A simple local network scanner mapping MAC addresses from `arp` and extracting vendor info
let cachedSpeed = { dwn: 0, up: 0, ping: 0, lastRun: 0, isRunning: false };

async function runBackgroundSpeedTest() {
    if (cachedSpeed.isRunning) return;

    try {
        cachedSpeed.isRunning = true;
        // networkQuality is a built-in macOS Monterey+ tool, -c for JSON
        const { stdout } = await execAsync('networkQuality -c -s');
        const data = JSON.parse(stdout);

        // Convert bits per second to Mbps
        const dwnMbps = (data.dl_throughput / 1000000).toFixed(2);
        const upMbps = (data.ul_throughput / 1000000).toFixed(2);

        // networkQuality doesn't explicitly give simple ping, but dl_responsiveness can be inverted, or we can just run a quick ping to 8.8.8.8
        const { stdout: pingOut } = await execAsync('ping -c 4 8.8.8.8');
        const pingMatch = pingOut.match(/avg\/max\/stddev = (.*?)\/(.*?)\//);
        const pingMs = pingMatch ? parseFloat(pingMatch[1]).toFixed(2) : '12.00';

        cachedSpeed = {
            dwn: parseFloat(dwnMbps),
            up: parseFloat(upMbps),
            ping: parseFloat(pingMs),
            lastRun: Date.now(),
            isRunning: false
        };
        console.log(`[SPEEDTEST] Completed: ${dwnMbps} Mbps / ${upMbps} Mbps / ${pingMs} ms`);
    } catch (e) {
        console.error("[SPEEDTEST] Failed:", e);
        cachedSpeed.isRunning = false;
    }
}

// Start immediately, then every 10 minutes
runBackgroundSpeedTest();
setInterval(runBackgroundSpeedTest, 10 * 60 * 1000);

app.get('/api/speedtest', (req, res) => {
    res.json(cachedSpeed);
});

app.get('/api/hostinfo', async (req, res) => {
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const memPercent = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);

        const uptime = os.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const uptimeStr = `${days}d ${hours}h`;

        // Get local IP
        const interfaces = os.networkInterfaces();
        let localIp = '127.0.0.1';
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name] || []) {
                if (!iface.internal && iface.family === 'IPv4') {
                    localIp = iface.address;
                    break;
                }
            }
        }

        res.json({
            platform: os.platform(),
            arch: os.arch(),
            cpuCount: os.cpus().length,
            memPercent: memPercent,
            uptime: uptimeStr,
            localIp: localIp
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/speedtest/run', (req, res) => {
    if (cachedSpeed.isRunning) {
        return res.status(400).json({ status: 'already_running' });
    }
    runBackgroundSpeedTest();
    res.json({ status: 'started' });
});

app.get('/api/sysinfo', async (req, res) => {
    try {
        const { stdout } = await execAsync('system_profiler SPAirPortDataType -json');
        const data = JSON.parse(stdout);
        const wifiCards = data.SPAirPortDataType || [];

        let activeNet = null;
        for (const card of wifiCards) {
            const interfaces = card.spairport_airport_interfaces || [];
            for (const iface of interfaces) {
                if (iface.spairport_current_network_information) {
                    activeNet = iface.spairport_current_network_information;
                    break;
                }
            }
            if (activeNet) break;
        }

        if (activeNet) {
            res.json({
                ssid: activeNet._name || 'Unknown',
                channel: activeNet.spairport_network_channel ? activeNet.spairport_network_channel.split(' ')[0] : 'Unknown', // extract channel width from "52 (5GHz, 80MHz)" regex if needed or just dump it
                channelRaw: activeNet.spairport_network_channel,
                security: activeNet.spairport_security_mode ? activeNet.spairport_security_mode.replace('spairport_security_mode_', '') : 'Unknown',
                phymode: activeNet.spairport_network_phymode || 'Unknown',
                signal: activeNet.spairport_signal_noise || 'Unknown',
                rate: activeNet.spairport_network_rate || 'Unknown'
            });
        } else {
            res.json({ error: "No active Wi-Fi" });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/scan', async (req, res) => {
    try {
        // We poll the arp table on the Mac to see all devices that the Mac knows about right now
        const { stdout: arpOut } = await execAsync('arp -a');

        const MAC_GOOG_MAIN = 'B8:7B:D4:B8:07:25';
        const MAC_GOOG_NODE = 'B8:7B:D4:B8:01:C1';
        const IP_ATT_MAIN = '192.168.1.254';

        const normalizeMac = (mac: string) => {
            if (!mac) return '';
            return mac.split(':').map(part => part.padStart(2, '0')).join(':').toUpperCase();
        };

        const getBrandFromMac = (mac: string) => {
            if (!mac) return 'OTHER';
            const m = mac.toUpperCase();
            if (m.startsWith('36:34:52') || m.startsWith('5C:E9:1E') || m.startsWith('D4:8A:FC') || m.startsWith('F0:B3:EC')) return 'APPLE';
            if (m.startsWith('00:00:') || m.startsWith('7A:D3:0C')) return 'GOOGLE';
            if (m.startsWith('D0:FC:D0')) return 'ATT';
            return 'OTHER';
        }

        const lines = arpOut.split('\n');
        const clients = [];
        const infraMap = {
            'RT01': { id: 'RT01', name: 'ATT_FIBER_MAIN', type: 'ROUTER', brand: 'ATT', ipAddress: IP_ATT_MAIN, location: 'MAIN', status: 'OFFLINE', dwn: 940, up: 920, ping: 12, health: 98, devices: 14, color: '#ffffff' },
            'RT02': { id: 'RT02', name: 'GOOG_WIFI_MAIN', type: 'ROUTER', brand: 'GOOGLE', ipAddress: 'OFFLINE', location: 'MAIN', status: 'OFFLINE', dwn: 450, up: 380, ping: 24, health: 85, devices: 22, color: '#ffffff' },
            'AP02': { id: 'AP02', name: 'GOOG_WIFI_NODE', type: 'ACCESS_PT', brand: 'GOOGLE', ipAddress: 'OFFLINE', location: 'NODE', status: 'OFFLINE', dwn: 320, up: 280, ping: 31, health: 80, devices: 11, color: '#ffffff' }
        };

        // Ping AT&T Gateway to test UPSTREAM
        try {
            await execAsync(`ping -c 1 -t 1 ${IP_ATT_MAIN}`);
            infraMap['RT01'].status = 'NOMINAL';
        } catch (e) {
            // ping failed, remains offline
        }

        let idCounter = 1;

        for (const line of lines) {
            if (!line.includes('(') || !line.includes(')')) continue;

            const ipMatch = line.match(/\((.*?)\)/);
            const macMatch = line.match(/at\s(.*?)\son/);

            if (ipMatch && macMatch) {
                let ipAddress = ipMatch[1];
                let macAddress = macMatch[1];

                if (macAddress !== '(incomplete)') {
                    const normMac = normalizeMac(macAddress);

                    if (normMac === MAC_GOOG_MAIN) {
                        infraMap['RT02'].ipAddress = ipAddress;
                        infraMap['RT02'].status = 'SUB-OPTIMAL';
                    } else if (normMac === MAC_GOOG_NODE) {
                        infraMap['AP02'].ipAddress = ipAddress;
                        infraMap['AP02'].status = 'NOMINAL';
                    } else {
                        clients.push({
                            id: `CLNT_${String(idCounter).padStart(3, '0')}`,
                            name: `DEVICE-${macAddress.substring(0, 5)}`,
                            type: 'CLIENT',
                            brand: getBrandFromMac(macAddress),
                            ipAddress: ipAddress,
                            macAddress: macAddress,
                            status: 'NOMINAL'
                        });
                        idCounter++;
                    }
                }
            }
        }

        res.json({
            clients: clients,
            infra: Object.values(infraMap)
        });
    } catch (error) {
        console.error('Error scanning network:', error);
        res.status(500).json({ error: 'Failed to scan network' });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server API listening on http://localhost:${PORT}`);
});
