import { useState, useEffect } from 'react';
import './App.css';

const SpeedDial = ({ value, label, unit, subtext, max = 160 }) => {
  const radius = 120;

  // Clamped value calculation for angle
  const clampedValue = Math.min(Math.max(value, 0), max);
  // Total span is roughly from -110 deg to 110 deg maybe, but the image shows:
  // 0 at top, 40 at right, 80 at bottom, 120 at left
  // So it's precisely a clockwise angle.
  // 0 Mbps = 0 deg (top). 
  // angle in radians = (clampedValue / 160) * (2 * Math.PI)
  // Standard math: top is -Math.PI / 2
  // Clockwise rotation maps to: angle = (clampedValue / max) * 2 * Math.PI - Math.PI / 2

  const angle = (clampedValue / max) * (2 * Math.PI) - Math.PI / 2;
  const lineEndX = 130 + radius * Math.cos(angle);
  const lineEndY = 130 + radius * Math.sin(angle);

  return (
    <div className="dial-wrapper">
      <div className="dial-top-text">
        <div className="title-label">{label}</div>
        <div className="dial-value-row">
          <span className="dial-value">{Number(value).toFixed(2)}</span>
          <span className="dial-unit">{unit}</span>
        </div>
      </div>
      <div className="dial-svg">
        <svg width="100%" height="100%" viewBox="0 0 260 260">
          <circle cx="130" cy="130" r={radius} className="dial-bg" fill="none" />
          <circle cx="130" cy="130" r={radius - 20} className="dial-fg" fill="none" />

          {/* Spoke Line representing the value */}
          <line
            x1="130" y1="130"
            x2={lineEndX} y2={lineEndY}
            stroke="#ffffff"
            strokeWidth="3"
            strokeDasharray="4 4"
            style={{ transition: 'all 0.5s ease-out' }}
          />
          {/* Glowing dot at intersection */}
          <circle
            cx={lineEndX} cy={lineEndY} r="4" fill="#ffffff"
            style={{ transition: 'all 0.5s ease-out', filter: 'drop-shadow(0 0 4px #fff)' }}
          />

          <path d="M 130 30 L 130 230 M 30 130 L 230 130" stroke="#ffffff" strokeWidth="1" strokeDasharray="4 8" opacity="0.3" />

          <text x="130" y="115" fill="#fff" fontSize="16" textAnchor="middle" letterSpacing="2">{subtext}</text>
          <text x="130" y="145" fill="#fff" fontSize="30" textAnchor="middle">+</text>

          <text x="130" y="25" fill="#fff" fontSize="14" textAnchor="middle">0</text>
          <text x="215" y="135" fill="#fff" fontSize="14" textAnchor="middle">40</text>
          <text x="130" y="245" fill="#fff" fontSize="14" textAnchor="middle">80</text>
          <text x="45" y="135" fill="#fff" fontSize="14" textAnchor="middle">120</text>
        </svg>
      </div>
    </div>
  );
};

function App() {
  const [liveClients, setLiveClients] = useState([]);
  const [infraNodes, setInfraNodes] = useState([]);
  const [sysInfo, setSysInfo] = useState(null);
  const [hostInfo, setHostInfo] = useState(null);
  const [speedData, setSpeedData] = useState({ dwn: 0, up: 0, ping: 0, isRunning: false });
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    const scanNetwork = async () => {
      try {
        setIsScanning(true);
        const res = await fetch('http://localhost:3001/api/scan');
        const data = await res.json();
        setLiveClients(data.clients || []);
        if (data.infra) {
          setInfraNodes(data.infra.map(n => ({ ...n, color: '#ffffff' })));
        }
        const resSpeed = await fetch('http://localhost:3001/api/speedtest');
        const dataSpeed = await resSpeed.json();
        setSpeedData(dataSpeed);

        try {
          const resSys = await fetch('http://localhost:3001/api/sysinfo');
          const dataSys = await resSys.json();
          if (!dataSys.error) {
            setSysInfo(dataSys);
          }
        } catch (e) {
          console.error("Sysinfo failed", e);
        }

        try {
          const resHost = await fetch('http://localhost:3001/api/hostinfo');
          const dataHost = await resHost.json();
          setHostInfo(dataHost);
        } catch (e) {
          console.error("Host info failed", e);
        }

      } catch (err) {
        console.error("API offline", err);
      } finally {
        setIsScanning(false);
      }
    };
    scanNetwork();
    const scanInterval = setInterval(scanNetwork, 5000);
    return () => clearInterval(scanInterval);
  }, []);

  return (
    <div className="dashboard">

      <div className="main-grid">

        {/* LEFT COLUMN: Top Block + SCROLLABLE DEVICES */}
        <section className="left-col-header">
          <div className="hr-stack">
            <div className="hr-line"></div>
            <div className="hr-line"></div>
            <div className="hr-line"></div>
            <div className="hr-line"></div>
          </div>

          <div className="large-telemetry">
            - 32.14 <span className="telemetry-unit">dBm</span>
          </div>

          <div className="hr-line"></div>

          <div className="data-row-split" style={{ marginBottom: 15 }}>
            <div className="data-block">
              <div className="title-label">Link Ping</div>
              <div className="value-text">+ {speedData.ping.toFixed(2)} <span className="value-unit">ms</span></div>
            </div>
          </div>

          <div className="data-row-split" style={{ alignItems: 'flex-end', marginBottom: 15 }}>
            <div className="data-block">
              <div className="title-label">Network Test</div>
              <div className="value-text" style={{ fontSize: '1.4rem', paddingTop: '10px' }}>
                {speedData.isRunning ? 'RUNNING' : 'NOMINAL'}
              </div>
            </div>
            <button
              className={`hud-btn hud-btn-small ${speedData.isRunning ? 'hud-btn-loading' : ''}`}
              onClick={async () => {
                setSpeedData(prev => ({ ...prev, isRunning: true }));
                await fetch('http://localhost:3001/api/speedtest/run', { method: 'POST' });
              }}
              disabled={speedData.isRunning}
              style={{ width: 'auto', flex: 'none' }}
            >
              {speedData.isRunning ? '[ TESTING... ]' : '[ RUN TEST ]'}
            </button>
          </div>

          <div className="data-row-split" style={{ alignItems: 'flex-end', marginBottom: 15 }}>
            <div className="title-label" style={{ marginBottom: 0 }}>Connected Devices</div>
            <button
              className={`hud-btn hud-btn-small ${isScanning ? 'hud-btn-loading' : ''}`}
              onClick={async () => {
                setIsScanning(true);
                const res = await fetch('http://localhost:3001/api/scan');
                const data = await res.json();
                setLiveClients(data.clients || []);
                if (data.infra) setInfraNodes(data.infra.map(n => ({ ...n, color: '#ffffff' })));
                setIsScanning(false);
              }}
            >
              {isScanning ? '[ SCANNING... ]' : '[ FORCE SCAN ]'}
            </button>
          </div>

          <div className="data-row-split">
            <div className="data-block">
              <div className="title-label">Count</div>
              <div className="value-text">+ {isScanning ? '--' : liveClients.length}.00 <span className="value-unit">cli</span></div>
            </div>
            <div className="data-block">
              <div className="title-label">Tx Power</div>
              <div className="value-text">062 <span className="value-unit">%</span></div>
            </div>
          </div>

          <div className="hr-line" style={{ marginBottom: 20 }}></div>

          {/* DEVICES SCROLL LIST */}
          <div className="devices-list">
            {isScanning && liveClients.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: 20 }}>[ EXECUTING SCAN ]</div>
            ) : (
              liveClients.map((client) => (
                <div key={client.id} className="device-item">
                  <div className="dev-name">{client.name}</div>
                  <div className="dev-meta">
                    <span>{client.ipAddress}</span>
                    <span>{client.macAddress}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* CENTER COLUMN: BIG DIALS AND BOTTOM METRICS */}
        <section className="center-section">
          <div className="speed-dials-container">
            {/* The scale in the screenshot implies it goes from 0 up to 160 around the circle. With down/up being potentially up to 1000Mbps, we'll scale max based on connection */}
            <SpeedDial value={speedData.dwn} label="Downspeed" unit="mb" subtext={speedData.isRunning ? "TESTING" : "MBPS"} max={1000} />
            <SpeedDial value={speedData.up} label="Upload" unit="mb" subtext={speedData.isRunning ? "TESTING" : "MBPS"} max={1000} />
          </div>

          <div className="hr-line"></div>

          <div className="data-row-split" style={{ marginTop: 20 }}>
            <div className="data-block">
              <div className="title-label">Wi-Fi Network</div>
              <div className="value-text">{sysInfo ? sysInfo.ssid : 'Scanning...'}</div>
            </div>
            <div className="data-block">
              <div className="title-label">PHY Mode</div>
              <div className="value-text">{sysInfo ? sysInfo.phymode : '...'}</div>
            </div>
          </div>

          <div className="data-row-split" style={{ marginTop: 20 }}>
            <div className="data-block">
              <div className="title-label">WPA Security</div>
              <div className="value-text">{sysInfo ? sysInfo.security : '...'}</div>
            </div>
            <div className="data-block">
              <div className="title-label">Channel</div>
              <div className="value-text">{sysInfo ? sysInfo.channelRaw : '...'}</div>
            </div>
          </div>

          <div style={{ marginTop: 30, border: '1px solid var(--border-color)', padding: 10, position: 'relative', overflow: 'hidden', height: 120, flexShrink: 0 }}>
            <div className="title-label" style={{ position: 'absolute', top: 10, left: 10 }}>Signal Integrity Oscilloscope</div>
            <div className="title-label" style={{ position: 'absolute', top: 10, right: 10 }}>ACTIVE</div>

            {/* Animated Graph using CSS and SVG */}
            <svg className="oscilloscope-wave" width="200%" height="60" style={{ position: 'absolute', bottom: 10, left: 0 }} viewBox="0 0 1000 100" preserveAspectRatio="none">
              <path
                d="M0,50 Q25,0 50,50 T100,50 T150,50 T200,50 T250,50 T300,50 T350,50 T400,50 T450,50 T500,50 T550,50 T600,50 T650,50 T700,50 T750,50 T800,50 T850,50 T900,50 T950,50 T1000,50"
                fill="none"
                stroke="var(--border-color)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <path
                d="M0,50 Q40,-20 80,50 T160,50 T240,50 T320,50 T400,50 T480,50 T560,50 T640,50 T720,50 T800,50 T880,50 T960,50 T1040,50"
                fill="none"
                stroke="var(--text-main)"
                strokeWidth="1.5"
              />
            </svg>
            {/* Grid overlay */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }}></div>
          </div>

          <div className="data-row-split" style={{ marginTop: 30, flex: 'none' }}>
            {/* DNS RESOLUTION CARD */}
            <div style={{ border: '1px solid var(--border-color)', padding: 15, width: '48%', position: 'relative' }}>
              <div className="title-label" style={{ marginBottom: 15 }}>DNS Resolution</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ width: 80 }}>CLOUDFLARE</span>
                  <div style={{ flex: 1, margin: '0 10px', height: 4, background: 'var(--border-color)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '12%', background: 'var(--text-main)' }}></div>
                  </div>
                  <span>14ms</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ width: 80 }}>GOOGLE</span>
                  <div style={{ flex: 1, margin: '0 10px', height: 4, background: 'var(--border-color)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '21%', background: 'var(--text-main)' }}></div>
                  </div>
                  <span>24ms</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ width: 80 }}>QUAD9</span>
                  <div style={{ flex: 1, margin: '0 10px', height: 4, background: 'var(--border-color)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '38%', background: 'var(--text-main)' }}></div>
                  </div>
                  <span>38ms</span>
                </div>
              </div>
            </div>

            {/* ROUTE TRACE CARD */}
            <div style={{ border: '1px solid var(--border-color)', padding: 15, width: '48%', position: 'relative' }}>
              <div className="title-label" style={{ marginBottom: 15 }}>Active Route Trace</div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 25 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, background: 'var(--text-main)', borderRadius: '50%' }}></div>
                  <span style={{ fontSize: '0.65rem' }}>MAC</span>
                </div>

                <div style={{ flex: 1, borderTop: '1px dashed var(--text-dim)', margin: '0 5px', position: 'relative', top: '-10px' }}></div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, background: 'var(--text-main)', borderRadius: '50%' }}></div>
                  <span style={{ fontSize: '0.65rem' }}>WIFI</span>
                </div>

                <div style={{ flex: 1, borderTop: '1px dashed var(--text-dim)', margin: '0 5px', position: 'relative', top: '-10px' }}></div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, border: '2px solid var(--text-main)', borderRadius: '50%', background: 'transparent' }}></div>
                  <span style={{ fontSize: '0.65rem' }}>ISP</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: ACTIVE CONNS and TOPO */}
        <section className="right-section">

          <div className="title-label" style={{ marginBottom: 20 }}>Active Nodes</div>

          <div className="summary-cards-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {infraNodes.map((node) => (
              <div key={node.id} className="hud-card">

                <div className="hud-card-header">
                  <span className="hud-card-title">{node.id}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{node.status}</span>
                </div>

                <div className="hud-card-body">
                  <div className="hud-data-point">
                    <span className="hud-data-label">Identity</span>
                    <span className="hud-data-value">{node.name}</span>
                  </div>
                  <div className="hud-data-point">
                    <span className="hud-data-label">IPv4 Address</span>
                    <span className="hud-data-value">{node.ipAddress}</span>
                  </div>
                  <div className="hud-data-point">
                    <span className="hud-data-label">Uptime</span>
                    <span className="hud-data-value">42d 14h 22m</span>
                  </div>
                  <div className="hud-data-point">
                    <span className="hud-data-label">Firmware</span>
                    <span className="hud-data-value">v.{node.brand === 'ATT' ? '3.19.4' : '1.41.0'}</span>
                  </div>
                  <div className="hud-data-point">
                    <span className="hud-data-label">Clients</span>
                    <span className="hud-data-value">{node.devices} ACTIVE</span>
                  </div>
                  <div className="hud-data-point">
                    <span className="hud-data-label">Sys Load</span>
                    <span className="hud-data-value">{node.id === 'RT01' ? '42%' : '18%'}</span>
                  </div>
                </div>

                <div className="hud-btn-group">
                  <button className="hud-btn" onClick={() => alert(`Ping initiated to ${node.ipAddress}...`)}>[ PING ]</button>
                  <button className="hud-btn" onClick={() => alert(`Reboot sequence started for ${node.id}...`)}>[ REBOOT ]</button>
                </div>

              </div>
            ))}

            {hostInfo && (
              <div className="hud-card">

                <div className="hud-card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
                  <span className="hud-card-title">{'> LOCAL_STATION'}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>ONLINE</span>
                </div>

                <div className="hud-card-body">
                  <div className="hud-data-point">
                    <span className="hud-data-label">Architecture</span>
                    <span className="hud-data-value">{hostInfo.platform} / {hostInfo.arch}</span>
                  </div>
                  <div className="hud-data-point">
                    <span className="hud-data-label">Local IP Address</span>
                    <span className="hud-data-value">{hostInfo.localIp}</span>
                  </div>
                  <div className="hud-data-point">
                    <span className="hud-data-label">Host Uptime</span>
                    <span className="hud-data-value">{hostInfo.uptime}</span>
                  </div>
                  <div className="hud-data-point">
                    <span className="hud-data-label">Logical Cores</span>
                    <span className="hud-data-value">{hostInfo.cpuCount} CORES</span>
                  </div>
                  <div className="hud-data-point">
                    <span className="hud-data-label">Memory Load</span>
                    <span className="hud-data-value">{hostInfo.memPercent}% UTILIZED</span>
                  </div>
                </div>

                <div className="hud-btn-group">
                  <button className="hud-btn" onClick={() => window.alert(`Opening Terminal session...`)}>[ LOCAL TERMINAL ]</button>
                </div>

              </div>
            )}
          </div>

          <div className="topology-container">
            <svg className="lines-svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
              <path className="line-path" d="M 200 120 L 100 300 L 300 300 Z" strokeDasharray="6 6" fill="none" />
            </svg>

            {infraNodes.map((node, i) => {
              let pos = 'node-top';
              if (i === 1) pos = 'node-left';
              if (i === 2) pos = 'node-right';
              return (
                <div key={node.id} className={`node-container ${pos}`}>
                  <div className="node-inner">
                    <div className="node-val">{node.id}</div>
                  </div>
                </div>
              )
            })}
          </div>

        </section>

      </div>

    </div>
  );
}

export default App;
