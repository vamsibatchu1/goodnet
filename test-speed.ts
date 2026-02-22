import FastSpeedtest from 'fast-speedtest-api';

async function run() {
    try {
        let speedtest = new FastSpeedtest({
            token: "YXNkZmFzZGZhc2RmYXNkZmFzZGY5ODczNDU5ODc2NDU5ODc1", // Needs a real token from fast.com JS or we let it use default if any.
            verbose: false,
            timeout: 10000,
            https: true,
            urlCount: 5,
            bufferSize: 8,
            unit: FastSpeedtest.UNITS.Mbps
        });

        console.log("Running Fast.com speed test...");
        let speed = await speedtest.getSpeed();
        console.log("Speed: ", speed, "Mbps");
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
