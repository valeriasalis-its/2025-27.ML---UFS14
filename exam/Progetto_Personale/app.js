/* =========================================
   APP — Orchestration
   Input handling, animation loop, UI updates
   ========================================= */

(function () {
    'use strict';

    // ── Instances ──
    const sim = new RocketSimulation();
    const simCanvas = document.getElementById('sim-canvas');
    const chartCanvas = document.getElementById('chart-canvas');
    const renderer = new Renderer(simCanvas, chartCanvas);

    // ── State ──
    let running = false;
    let paused = false;
    let lastFrameTime = 0;
    let animFrameId = null;

    // ── DOM refs ──
    const els = {
        btnLaunch: document.getElementById('btn-launch'),
        btnPredict: document.getElementById('btn-predict'),
        btnPredictPanel: document.getElementById('btn-predict-panel'),
        btnPause: document.getElementById('btn-pause'),
        btnStop: document.getElementById('btn-stop'),
        btnReset: document.getElementById('btn-reset-params'),
        statusBadge: document.getElementById('sim-status-badge'),
        statusText: document.getElementById('sim-status-text'),
        // Inputs
        mass: document.getElementById('input-mass'),
        fuelMass: document.getElementById('input-fuel-mass'),
        thrust: document.getElementById('input-thrust'),
        burnTime: document.getElementById('input-burn-time'),
        launchAngle: document.getElementById('input-launch-angle'),
        diameter: document.getElementById('input-diameter'),
        length: document.getElementById('input-length'),
        coneAngle: document.getElementById('input-cone-angle'),
        cd: document.getElementById('input-cd'),
        windSpeed: document.getElementById('input-wind-speed'),
        windVar: document.getElementById('input-wind-var'),
        correctionEnabled: document.getElementById('input-correction-enabled'),
        parachuteEnabled: document.getElementById('input-parachute-enabled'),
        pidKp: document.getElementById('input-pid-kp'),
        pidKi: document.getElementById('input-pid-ki'),
        pidKd: document.getElementById('input-pid-kd'),
        timeScale: document.getElementById('input-time-scale'),
        timeScaleLabel: document.getElementById('time-scale-label'),
        // Telemetry
        valAltitude: document.getElementById('val-altitude'),
        valVelocity: document.getElementById('val-velocity'),
        valAccel: document.getElementById('val-accel'),
        valAngle: document.getElementById('val-angle'),
        valMach: document.getElementById('val-mach'),
        valMass: document.getElementById('val-mass'),
        valDeviation: document.getElementById('val-deviation'),
        deviationBar: document.getElementById('deviation-bar'),
        valCommStatus: document.getElementById('val-comm-status'),
        valCommLatency: document.getElementById('val-comm-latency'),
        valThrustVec: document.getElementById('val-thrust-vec'),
        valFlap: document.getElementById('val-flap'),
        valPredX: document.getElementById('val-pred-x'),
        valPredY: document.getElementById('val-pred-y'),
        // Overlay
        overlayAlt: document.getElementById('overlay-altitude'),
        overlayVel: document.getElementById('overlay-velocity'),
        overlayTime: document.getElementById('overlay-time'),
        // Log
        flightLog: document.getElementById('flight-log'),
    };

    // ── Gather parameters from inputs ──
    function gatherParams() {
        return {
            totalMass: parseFloat(els.mass.value) || 50,
            fuelMass: parseFloat(els.fuelMass.value) || 20,
            thrust: parseFloat(els.thrust.value) || 2000,
            burnTime: parseFloat(els.burnTime.value) || 10,
            launchAngle: parseFloat(els.launchAngle.value) || 85,
            diameter: parseFloat(els.diameter.value) || 0.15,
            length: parseFloat(els.length.value) || 2,
            coneAngle: parseFloat(els.coneAngle.value) || 15,
            cd: parseFloat(els.cd.value) || 0.5,
            windSpeed: parseFloat(els.windSpeed.value) || 5,
            windVariability: (parseFloat(els.windVar.value) || 30) / 100,
            correctionEnabled: els.correctionEnabled.checked,
            parachuteEnabled: els.parachuteEnabled.checked,
            pidKp: parseFloat(els.pidKp.value) || 2.0,
            pidKi: parseFloat(els.pidKi.value) || 0.1,
            pidKd: parseFloat(els.pidKd.value) || 1.5,
            timeScale: parseFloat(els.timeScale.value) || 1
        };
    }

    function setPredictionResult(result) {
        if (!result) {
            els.valPredX.textContent = '--';
            els.valPredY.textContent = '--';
            return;
        }

        els.valPredX.textContent = result.landingX.toFixed(1);
        els.valPredY.textContent = result.landingY.toFixed(1);
    }

    async function runPrediction() {
        const params = gatherParams();

        const predictionSim = new RocketSimulation();
        predictionSim.launch(params);

        const maxTime = 600;
        const dt = 0.05;
        const maxSteps = Math.ceil(maxTime / dt);

        addLogEntry('🔮 Predizione in corso...', 'info');

        for (let i = 0; i < maxSteps && !predictionSim.landed; i++) {
            predictionSim.step(dt);

            if (i % 300 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        if (!predictionSim.landed) {
            addLogEntry('Predizione non completata entro il limite di tempo.', 'warning');
            setPredictionResult(null);
            return;
        }

        const result = {
            landingX: predictionSim.x,
            landingY: predictionSim.y
        };

        sim.predictedLanding = result;
        setPredictionResult(result);
        addLogEntry(`Predizione completata: X=${result.landingX.toFixed(1)} m, Y=${result.landingY.toFixed(1)} m`, 'success');
    }

    // ── Validate parameters ──
    function validateParams(params) {
        const errors = [];
        if (params.fuelMass >= params.totalMass)
            errors.push('La massa carburante deve essere inferiore alla massa totale.');
        if (params.thrust <= params.totalMass * 9.81)
            errors.push(`La spinta (${params.thrust}N) potrebbe non essere sufficiente per il decollo (peso: ${(params.totalMass * 9.81).toFixed(0)}N).`);
        return errors;
    }

    // ── Update status badge ──
    function setStatus(status) {
        els.statusBadge.className = 'status-badge ' + status;
        const labels = { idle: 'IDLE', running: 'RUNNING', paused: 'PAUSED', finished: 'FINISHED' };
        els.statusText.textContent = labels[status] || status.toUpperCase();
    }

    // ── Add to flight log ──
    function addLogEntry(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = 'log-entry ' + type;
        const timePrefix = sim.launched ? `[T+${sim.time.toFixed(1)}s] ` : '';
        entry.textContent = timePrefix + message;
        els.flightLog.prepend(entry);

        // Limit log entries
        while (els.flightLog.children.length > 50) {
            els.flightLog.removeChild(els.flightLog.lastChild);
        }
    }

    // ── Sync log from simulation events ──
    let lastEventIdx = 0;
    function syncEvents() {
        for (let i = lastEventIdx; i < sim.eventLog.length; i++) {
            const evt = sim.eventLog[i];
            addLogEntry(evt.message, evt.type);
        }
        lastEventIdx = sim.eventLog.length;
    }

    // ── Update telemetry UI ──
    function updateTelemetry() {
        const t = sim.getTelemetry();

        els.valAltitude.textContent = t.altitude.toFixed(1);
        els.valVelocity.textContent = t.speed.toFixed(1);
        els.valAccel.textContent = t.acceleration.toFixed(1);
        els.valAngle.textContent = t.angle.toFixed(1);
        els.valMach.textContent = t.mach.toFixed(3);
        els.valMass.textContent = t.mass.toFixed(1);

        // Deviation
        els.valDeviation.textContent = t.lateralDeviation.toFixed(2) + ' m';
        const maxDev = 50; // max displayed deviation
        const devPercent = 50 + (t.lateralDeviation / maxDev) * 50;
        els.deviationBar.style.width = Math.max(2, Math.min(98, devPercent)) + '%';
        const absDev = Math.abs(t.lateralDeviation);
        els.deviationBar.className = 'deviation-bar' +
            (absDev > 20 ? ' danger' : absDev > 10 ? ' warning' : '');

        // EM comms
        els.valCommStatus.textContent = t.emActive ? 'ATTIVO' : 'OFF';
        els.valCommStatus.className = 'comm-value ' + (t.emActive ? 'status-active' : 'status-inactive');
        els.valCommLatency.textContent = t.emLatency.toFixed(2) + ' ms';
        els.valThrustVec.textContent = t.thrustVectorAngle.toFixed(2) + '°';
        els.valFlap.textContent = t.flapDeflection.toFixed(2) + '°';

        // Canvas overlay
        els.overlayAlt.textContent = `ALT: ${t.altitude.toFixed(0)} m`;
        els.overlayVel.textContent = `VEL: ${t.speed.toFixed(1)} m/s`;
        els.overlayTime.textContent = `T+ ${t.time.toFixed(1)} s`;
    }

    // ── Animation Loop ──
    function frame(timestamp) {
        if (!running) return;

        const dt = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.05) : 0.016;
        lastFrameTime = timestamp;

        if (!paused) {
            // Physics
            sim.step(dt);

            // Update telemetry
            updateTelemetry();

            // Sync events
            syncEvents();

            // Check if landed
            if (sim.landed && running) {
                running = false;
                paused = false;
                setStatus('finished');
                els.btnLaunch.disabled = false;
                els.btnLaunch.querySelector('.launch-text').textContent = 'RILANCIA';
                els.btnPause.disabled = true;
                els.btnStop.disabled = true;
            }
        }

        // Render (always, even when paused)
        renderer.render(sim, dt);
        renderer.renderChart(sim);

        if (running) {
            animFrameId = requestAnimationFrame(frame);
        } else {
            // One more render after stop
            renderer.render(sim, 0);
            renderer.renderChart(sim);
        }
    }

    // ── Launch ──
    function doLaunch() {
        const params = gatherParams();

        // Validate
        const warnings = validateParams(params);
        for (const w of warnings) {
            addLogEntry('⚠ ' + w, 'warning');
        }

        // Clear old log
        els.flightLog.innerHTML = '';
        lastEventIdx = 0;
        sim.predictedLanding = null;

        sim.launch(params);

        running = true;
        paused = false;
        lastFrameTime = 0;

        setStatus('running');
        els.btnLaunch.disabled = true;
        els.btnPause.disabled = false;
        els.btnStop.disabled = false;

        addLogEntry('🚀 Lancio iniziato!', 'success');

        animFrameId = requestAnimationFrame(frame);
    }

    // ── Pause/Resume ──
    function togglePause() {
        if (!running) return;
        paused = !paused;
        if (paused) {
            setStatus('paused');
            els.btnPause.textContent = '▶ Riprendi';
            addLogEntry('Simulazione in pausa', 'warning');
        } else {
            setStatus('running');
            els.btnPause.textContent = '⏸ Pausa';
            lastFrameTime = 0; // reset delta to avoid jump
            addLogEntry('Simulazione ripresa', 'success');
        }
    }

    // ── Stop ──
    function doStop() {
        running = false;
        paused = false;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        sim.predictedLanding = sim.predictedLanding || null;

        setStatus('idle');
        els.btnLaunch.disabled = false;
        els.btnLaunch.querySelector('.launch-text').textContent = 'LANCIA';
        els.btnPause.disabled = true;
        els.btnPause.textContent = '⏸ Pausa';
        els.btnStop.disabled = true;

        addLogEntry('Simulazione fermata', 'error');
    }

    // ── Reset params to defaults ──
    function resetParams() {
        els.mass.value = 50;
        els.fuelMass.value = 20;
        els.thrust.value = 2000;
        els.burnTime.value = 10;
        els.launchAngle.value = 85;
        els.diameter.value = 0.15;
        els.length.value = 2;
        els.coneAngle.value = 15;
        els.cd.value = 0.5;
        els.windSpeed.value = 5;
        els.windVar.value = 30;
        els.correctionEnabled.checked = true;
        els.parachuteEnabled.checked = true;
        els.pidKp.value = 2.0;
        els.pidKi.value = 0.1;
        els.pidKd.value = 1.5;
        els.timeScale.value = 1;
        els.timeScaleLabel.textContent = '1×';
        setPredictionResult(null);
        addLogEntry('Parametri resettati ai valori predefiniti', 'info');
    }

    // ── Event Listeners ──
    els.btnLaunch.addEventListener('click', doLaunch);
    els.btnPredict.addEventListener('click', runPrediction);
    els.btnPredictPanel.addEventListener('click', runPrediction);
    els.btnPause.addEventListener('click', togglePause);
    els.btnStop.addEventListener('click', doStop);
    els.btnReset.addEventListener('click', resetParams);

    // Time scale slider
    els.timeScale.addEventListener('input', function () {
        const val = parseFloat(this.value);
        els.timeScaleLabel.textContent = val + '×';
        if (running) {
            sim.params.timeScale = val;
        }
    });

    // Chart tab switching
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderer.activeChart = this.dataset.chart;
            if (!running) {
                renderer.renderChart(sim);
            }
        });
    });

    // Globe drag listener to redraw when idle
    chartCanvas.addEventListener('globe-drag', () => {
        if (!running) {
            renderer.renderChart(sim);
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        if (e.target.tagName === 'INPUT') return; // don't capture when typing in inputs

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (!running) doLaunch();
                else togglePause();
                break;
            case 'Escape':
                if (running) doStop();
                break;
        }
    });

    // ── Resize handling ──
    function handleResize() {
        renderer.resize();
        if (!running) {
            // Re-render static view
            renderer.render(sim, 0);
            renderer.renderChart(sim);
        }
    }

    window.addEventListener('resize', handleResize);

    // ── Initial setup ──
    function init() {
        handleResize();
        // Draw initial state
        renderer.render(sim, 0);
        renderer.renderChart(sim);
        setPredictionResult(null);
        addLogEntry('Sistema pronto — configura i parametri e premi LANCIA', 'info');
    }

    // Wait for fonts
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(init);
    } else {
        window.addEventListener('load', init);
    }
})();
