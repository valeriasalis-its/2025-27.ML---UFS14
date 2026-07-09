/* =========================================
   RENDERER
   Canvas drawing: sky, rocket, trajectory,
   EM waves, telemetry charts, particles
   ========================================= */

class Renderer {
    constructor(canvas, chartCanvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.chartCanvas = chartCanvas;
        this.chartCtx = chartCanvas.getContext('2d');

        // Viewport
        this.viewX = 0;
        this.viewY = 0;
        this.scale = 1; // pixels per meter
        this.targetScale = 1;
        this.targetViewX = 0;
        this.targetViewY = 0;

        // Stars
        this.stars = [];
        this.generateStars(200);

        // Flame particles
        /** @type {{ x: number, y: number, vx: number, vy: number, life: number, maxLife: number, size: number, hue: number }[]} */
        this.particles = [];

        // Trail particles (smoke)
        /** @type {{ x: number, y: number, life: number, maxLife: number, size: number, alpha: number }[]} */
        this.smokeParticles = [];

        // Active chart tab
        this.activeChart = 'altitude';

        // Animation time
        this.animTime = 0;

        // Ground station visual position
        this.groundStationWorldX = -30;

        // Clouds for day sky
        this.clouds = [
            { x: 0.15, y: 0.35, scale: 0.85, speed: 0.006 },
            { x: 0.45, y: 0.25, scale: 1.15, speed: 0.009 },
            { x: 0.75, y: 0.45, scale: 0.75, speed: 0.005 },
            { x: 0.95, y: 0.20, scale: 1.05, speed: 0.008 }
        ];

        // Globe state
        this.globeRotationX = -0.3;
        this.globeRotationY = 0.5;
        this.isDraggingGlobe = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.initGlobeEvents();
    }

    generateStars(count) {
        this.stars = [];
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.6 + 0.4,
                twinkleSpeed: Math.random() * 2 + 0.5,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.displayWidth = rect.width;
        this.displayHeight = rect.height;

        // Chart canvas
        const chartRect = this.chartCanvas.parentElement.getBoundingClientRect();
        this.chartCanvas.width = this.chartCanvas.offsetWidth * dpr;
        this.chartCanvas.height = this.chartCanvas.offsetHeight * dpr;
        this.chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.chartWidth = this.chartCanvas.offsetWidth;
        this.chartHeight = this.chartCanvas.offsetHeight;
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(wx, wy) {
        return {
            x: (wx - this.viewX) * this.scale + this.displayWidth * 0.3,
            y: this.displayHeight - 40 - (wy - this.viewY) * this.scale
        };
    }

    /**
     * Update camera to follow rocket
     */
    updateCamera(sim, dt) {
        if (!sim.launched) {
            this.targetScale = 2;
            this.targetViewX = -50;
            this.targetViewY = -20;
        } else {
            // Auto-zoom based on trajectory extent
            const maxDim = Math.max(sim.maxAltitude, Math.abs(sim.x), 100);
            this.targetScale = Math.min(
                this.displayHeight * 0.7 / Math.max(maxDim, 1),
                4
            );
            this.targetScale = Math.max(this.targetScale, 0.1);

            // Center on rocket with some lead
            this.targetViewX = sim.x - this.displayWidth * 0.3 / this.targetScale;
            this.targetViewY = Math.max(0, sim.y - this.displayHeight * 0.5 / this.targetScale);
        }

        // Smooth camera
        const lerpSpeed = 2 * dt;
        this.scale += (this.targetScale - this.scale) * lerpSpeed;
        this.viewX += (this.targetViewX - this.viewX) * lerpSpeed;
        this.viewY += (this.targetViewY - this.viewY) * lerpSpeed;
    }

    /**
     * Spawn flame particles
     */
    spawnFlameParticles(rocketX, rocketY, angle, burning) {
        if (!burning) return;

        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 0.6;
            const speed = 20 + Math.random() * 40;
            this.particles.push({
                x: rocketX - Math.cos(angle) * 3,
                y: rocketY - Math.sin(angle) * 3,
                vx: -Math.cos(angle + spread) * speed + (Math.random() - 0.5) * 10,
                vy: -Math.sin(angle + spread) * speed + (Math.random() - 0.5) * 10,
                life: 0,
                maxLife: 0.3 + Math.random() * 0.4,
                size: 2 + Math.random() * 4,
                hue: 20 + Math.random() * 30 // orange-yellow
            });
        }

        // Smoke trail
        if (Math.random() < 0.5) {
            this.smokeParticles.push({
                x: rocketX - Math.cos(angle) * 5,
                y: rocketY - Math.sin(angle) * 5,
                life: 0,
                maxLife: 2 + Math.random() * 2,
                size: 3 + Math.random() * 5,
                alpha: 0.15
            });
        }
    }

    /**
     * Update particles
     */
    updateParticles(dt) {
        // Flame
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy -= 5 * dt; // slight gravity on particles
            if (p.life >= p.maxLife) {
                this.particles.splice(i, 1);
            }
        }

        // Smoke
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const p = this.smokeParticles[i];
            p.life += dt;
            p.size += dt * 3;
            p.alpha *= 0.98;
            if (p.life >= p.maxLife || p.alpha < 0.01) {
                this.smokeParticles.splice(i, 1);
            }
        }

        // Limit particle count
        if (this.particles.length > 300) this.particles.splice(0, 50);
        if (this.smokeParticles.length > 200) this.smokeParticles.splice(0, 30);
    }

    /**
     * Main render function
     */
    render(sim, dt) {
        this.animTime += dt;
        const ctx = this.ctx;
        const w = this.displayWidth;
        const h = this.displayHeight;

        this.updateCamera(sim, dt);

        // --- Sky gradient (changes with altitude) ---
        const viewAlt = Math.max(sim.y, 0);
        
        // Transition day sky -> space between 1500m and 8000m
        const transitionStart = 1500;
        const transitionEnd = 8000;
        const skyProgress = Math.max(0, Math.min(1, (viewAlt - transitionStart) / (transitionEnd - transitionStart)));

        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        
        // Day sky colors
        const dayTop = '#4293f5';      // Bright blue
        const dayBottom = '#aae2f7';   // Horizon warm cyan
        
        // Space/Night colors
        const spaceTop = '#010308';    // Deep black-blue
        const spaceBottom = '#040712'; // Black-blue
        
        skyGrad.addColorStop(0, this.lerpColor(dayTop, spaceTop, skyProgress));
        skyGrad.addColorStop(1, this.lerpColor(dayBottom, spaceBottom, skyProgress));
        
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // --- Sun (visible in atmosphere) ---
        if (skyProgress < 1) {
            const sunOpacity = 1 - skyProgress;
            const sunX = w * 0.78;
            const sunY = h * 0.22;
            const sunR = 26;
            
            const sunGrad = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR);
            sunGrad.addColorStop(0, `rgba(255, 255, 250, ${sunOpacity})`);
            sunGrad.addColorStop(0.2, `rgba(255, 253, 220, ${sunOpacity * 0.8})`);
            sunGrad.addColorStop(1, `rgba(255, 245, 180, 0)`);
            
            ctx.save();
            ctx.fillStyle = sunGrad;
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // --- Clouds (low-altitude parallax particles) ---
        if (skyProgress < 1) {
            const cloudOpacity = (1 - skyProgress) * 0.45;
            ctx.save();
            for (const cloud of this.clouds) {
                cloud.x += cloud.speed * dt;
                if (cloud.x > 1.25) cloud.x = -0.25;
                
                const cx = cloud.x * w;
                const cy = cloud.y * h + (this.viewY * this.scale * 0.15); // Parallax
                const cs = cloud.scale;
                
                ctx.fillStyle = `rgba(255, 255, 255, ${cloudOpacity})`;
                ctx.beginPath();
                ctx.arc(cx, cy, 18 * cs, 0, Math.PI * 2);
                ctx.arc(cx + 12 * cs, cy - 8 * cs, 14 * cs, 0, Math.PI * 2);
                ctx.arc(cx - 12 * cs, cy - 5 * cs, 12 * cs, 0, Math.PI * 2);
                ctx.arc(cx + 24 * cs, cy - 2 * cs, 12 * cs, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }

        // --- Stars (fade in as space is reached) ---
        const starAlpha = skyProgress * 0.95;
        this.renderStars(ctx, w, h, starAlpha);

        // --- Ground ---
        this.renderGround(ctx, w, h, sim);

        // --- Ground station ---
        this.renderGroundStation(ctx, sim);

        // --- Nominal trajectory (dashed) ---
        this.renderNominalTrajectory(ctx, sim);

        // --- Actual trajectory trail ---
        this.renderTrajectory(ctx, sim);

        // --- Smoke particles ---
        this.renderSmokeParticles(ctx);

        // --- Flame particles ---
        this.renderFlameParticles(ctx);

        // --- EM Waves ---
        this.renderEMWaves(ctx, sim);

        // --- Rocket ---
        if (sim.launched && !sim.landed) {
            this.spawnFlameParticles(sim.x, sim.y, sim.angle, sim.burning);
            this.renderRocket(ctx, sim);
        } else if (sim.landed) {
            this.renderLandedRocket(ctx, sim);
        }

        // --- Wind indicator ---
        if (sim.launched) {
            this.renderWindIndicator(ctx, w, h, sim);
        }

        this.updateParticles(dt);
    }

    lerpColor(c1, c2, t) {
        t = Math.max(0, Math.min(1, t));
        const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
        const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        return `rgb(${r},${g},${b})`;
    }

    renderStars(ctx, w, h, alpha) {
        for (const star of this.stars) {
            const twinkle = 0.5 + 0.5 * Math.sin(this.animTime * star.twinkleSpeed + star.twinklePhase);
            const a = star.brightness * twinkle * alpha;
            ctx.beginPath();
            ctx.arc(star.x * w, star.y * h * 0.7, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${a})`;
            ctx.fill();

            // Slight glow for brighter stars
            if (star.size > 1.5) {
                ctx.beginPath();
                ctx.arc(star.x * w, star.y * h * 0.7, star.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200,220,255,${a * 0.1})`;
                ctx.fill();
            }
        }
    }

    renderGround(ctx, w, h, sim) {
        const groundY = this.worldToScreen(0, 0).y;
        if (groundY < h) {
            const viewAlt = Math.max(sim.y, 0);
            const transitionStart = 1500;
            const transitionEnd = 8000;
            const skyProgress = Math.max(0, Math.min(1, (viewAlt - transitionStart) / (transitionEnd - transitionStart)));

            // Ground gradient shifts depending on sky light levels
            const gGrad = ctx.createLinearGradient(0, groundY, 0, h);
            
            // Day ground (vibrant greens)
            const dayG0 = '#3e8f49';
            const dayG1 = '#26632c';
            const dayG2 = '#133b17';
            
            // Space/Night ground (dark shadows)
            const spaceG0 = '#0d2111';
            const spaceG1 = '#09170c';
            const spaceG2 = '#040a05';

            gGrad.addColorStop(0, this.lerpColor(dayG0, spaceG0, skyProgress));
            gGrad.addColorStop(0.05, this.lerpColor(dayG1, spaceG1, skyProgress));
            gGrad.addColorStop(1, this.lerpColor(dayG2, spaceG2, skyProgress));
            
            ctx.fillStyle = gGrad;
            ctx.fillRect(0, groundY, w, h - groundY);

            // Ground line
            ctx.beginPath();
            ctx.moveTo(0, groundY);
            ctx.lineTo(w, groundY);
            ctx.strokeStyle = 'rgba(0,230,118,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Launch pad
            const padScreen = this.worldToScreen(0, 0);
            ctx.fillStyle = 'rgba(100,100,100,0.6)';
            ctx.fillRect(padScreen.x - 15, padScreen.y - 2, 30, 6);
            ctx.fillStyle = 'rgba(255,100,0,0.4)';
            ctx.fillRect(padScreen.x - 3, padScreen.y - 20, 6, 20);

            // Predicted landing marker
            if (sim.predictedLanding && Number.isFinite(sim.predictedLanding.landingX)) {
                const predPos = this.worldToScreen(sim.predictedLanding.landingX, 0);
                ctx.save();
                ctx.shadowColor = 'rgba(0,229,255,0.75)';
                ctx.shadowBlur = 18;
                ctx.strokeStyle = 'rgba(0,229,255,0.95)';
                ctx.fillStyle = 'rgba(0,229,255,0.18)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(predPos.x, predPos.y - 2, 13, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(predPos.x - 18, predPos.y - 2);
                ctx.lineTo(predPos.x + 18, predPos.y - 2);
                ctx.moveTo(predPos.x, predPos.y - 20);
                ctx.lineTo(predPos.x, predPos.y + 16);
                ctx.stroke();
                ctx.font = 'bold 10px "JetBrains Mono", monospace';
                ctx.fillStyle = 'rgba(0,229,255,0.95)';
                ctx.textAlign = 'center';
                ctx.fillText('PRED', predPos.x, predPos.y - 24);
                ctx.restore();
            }
        }
    }

    renderGroundStation(ctx, sim) {
        const pos = this.worldToScreen(sim.groundStation.x, 0);

        // Antenna base
        ctx.fillStyle = 'rgba(80,80,100,0.8)';
        ctx.fillRect(pos.x - 8, pos.y - 25, 16, 25);

        // Dish
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y - 30, 15, 8, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100,120,160,0.6)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,229,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Blinking light
        const blink = Math.sin(this.animTime * 4) > 0;
        if (blink && sim.em.active) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - 35, 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,229,255,0.9)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - 35, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,229,255,0.15)';
            ctx.fill();
        }

        // Label
        ctx.font = '9px "Orbitron", monospace';
        ctx.fillStyle = 'rgba(0,229,255,0.6)';
        ctx.textAlign = 'center';
        ctx.fillText('GROUND CTRL', pos.x, pos.y + 14);
    }

    renderNominalTrajectory(ctx, sim) {
        if (sim.nominalTrajectory.length < 2) return;

        ctx.beginPath();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = 'rgba(0,230,118,0.25)';
        ctx.lineWidth = 1.5;

        let started = false;
        for (const pt of sim.nominalTrajectory) {
            const s = this.worldToScreen(pt.x, pt.y);
            if (!started) { ctx.moveTo(s.x, s.y); started = true; }
            else ctx.lineTo(s.x, s.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    renderTrajectory(ctx, sim) {
        if (sim.trajectory.length < 2) return;

        // Draw with gradient from green to cyan
        const len = sim.trajectory.length;
        for (let i = 1; i < len; i++) {
            const p0 = this.worldToScreen(sim.trajectory[i - 1].x, sim.trajectory[i - 1].y);
            const p1 = this.worldToScreen(sim.trajectory[i].x, sim.trajectory[i].y);
            const t = i / len;

            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.strokeStyle = `rgba(0,229,255,${0.1 + t * 0.7})`;
            ctx.lineWidth = 1 + t * 1.5;
            ctx.stroke();
        }
    }

    renderSmokeParticles(ctx) {
        for (const p of this.smokeParticles) {
            const s = this.worldToScreen(p.x, p.y);
            ctx.beginPath();
            ctx.arc(s.x, s.y, p.size * this.scale * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(150,150,160,${p.alpha})`;
            ctx.fill();
        }
    }

    renderFlameParticles(ctx) {
        for (const p of this.particles) {
            const s = this.worldToScreen(p.x, p.y);
            const lifeRatio = p.life / p.maxLife;
            const alpha = 1 - lifeRatio;
            const size = p.size * (1 - lifeRatio * 0.5) * Math.min(this.scale * 0.5, 3);

            ctx.beginPath();
            ctx.arc(s.x, s.y, size, 0, Math.PI * 2);

            // Color fades from white-yellow to orange to red
            const hue = p.hue - lifeRatio * 20;
            const lightness = 70 - lifeRatio * 30;
            ctx.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${alpha})`;
            ctx.fill();

            // Glow
            if (size > 2) {
                ctx.beginPath();
                ctx.arc(s.x, s.y, size * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${alpha * 0.15})`;
                ctx.fill();
            }
        }
    }

    renderEMWaves(ctx, sim) {
        for (const signal of sim.em.activeSignals) {
            const fromS = this.worldToScreen(signal.fromX, signal.fromY);
            const toS = this.worldToScreen(signal.toX, signal.toY);

            // Current position of the signal front
            const t = signal.progress;
            const cx = fromS.x + (toS.x - fromS.x) * t;
            const cy = fromS.y + (toS.y - fromS.y) * t;

            // Concentric ripples
            for (let ring = 0; ring < 3; ring++) {
                const ringT = Math.max(0, t - ring * 0.08);
                if (ringT <= 0) continue;
                const rx = fromS.x + (toS.x - fromS.x) * ringT;
                const ry = fromS.y + (toS.y - fromS.y) * ringT;
                const radius = 5 + ring * 4;
                const alpha = (1 - t) * (1 - ring * 0.25) * 0.6;

                ctx.beginPath();
                ctx.arc(rx, ry, radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(124, 77, 255, ${alpha})`;
                ctx.lineWidth = 2 - ring * 0.5;
                ctx.stroke();

                // Inner glow
                ctx.beginPath();
                ctx.arc(rx, ry, radius * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(124, 77, 255, ${alpha * 0.5})`;
                ctx.fill();
            }

            // Connecting line (faint)
            ctx.beginPath();
            ctx.moveTo(fromS.x, fromS.y);
            ctx.lineTo(cx, cy);
            ctx.strokeStyle = `rgba(124, 77, 255, ${(1 - t) * 0.15})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    renderRocket(ctx, sim) {
        const pos = this.worldToScreen(sim.x, sim.y);
        const angle = -sim.angle; // Canvas Y is inverted
        const rocketLen = Math.min(30, 10 + sim.params.length * 3);
        const rocketWidth = Math.min(10, 4 + sim.params.diameter * 8);

        // --- Parachute (Rendered above the rocket) ---
        if (sim.parachuteDeployed) {
            ctx.save();
            ctx.translate(pos.x, pos.y);
            const chuteSize = 25 * sim.parachuteInflation;
            const chuteHeight = 45 * sim.parachuteInflation;
            
            // Suspension lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(-chuteSize, -chuteHeight);
            ctx.moveTo(0, 0); ctx.lineTo(-chuteSize * 0.33, -chuteHeight);
            ctx.moveTo(0, 0); ctx.lineTo(chuteSize * 0.33, -chuteHeight);
            ctx.moveTo(0, 0); ctx.lineTo(chuteSize, -chuteHeight);
            ctx.stroke();
            
            // Canopy
            ctx.beginPath();
            ctx.arc(0, -chuteHeight, chuteSize, Math.PI, 0, false);
            ctx.fillStyle = '#ff1744'; // Red base
            ctx.fill();
            
            // White stripes overlays
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(0, -chuteHeight);
            ctx.arc(0, -chuteHeight, chuteSize, Math.PI * 1.25, Math.PI * 1.45);
            ctx.lineTo(0, -chuteHeight);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(0, -chuteHeight);
            ctx.arc(0, -chuteHeight, chuteSize, Math.PI * 1.55, Math.PI * 1.75);
            ctx.lineTo(0, -chuteHeight);
            ctx.fill();
            
            ctx.restore();
        }

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);

        // --- Main body ---
        ctx.beginPath();
        ctx.roundRect(-rocketLen * 0.4, -rocketWidth / 2, rocketLen * 0.8, rocketWidth, 2);
        ctx.fillStyle = '#c0c8d8';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Body stripe
        ctx.fillStyle = 'rgba(255,60,0,0.6)';
        ctx.fillRect(-rocketLen * 0.1, -rocketWidth / 2, rocketLen * 0.15, rocketWidth);

        // --- Nose cone ---
        ctx.beginPath();
        ctx.moveTo(rocketLen * 0.4, -rocketWidth / 2);
        ctx.lineTo(rocketLen * 0.4 + rocketLen * 0.25, 0);
        ctx.lineTo(rocketLen * 0.4, rocketWidth / 2);
        ctx.closePath();
        ctx.fillStyle = '#e0384f';
        ctx.fill();

        // --- Fins ---
        const finLen = rocketWidth * 0.8;
        // Top fin
        ctx.beginPath();
        ctx.moveTo(-rocketLen * 0.35, -rocketWidth / 2);
        ctx.lineTo(-rocketLen * 0.45, -rocketWidth / 2 - finLen);
        ctx.lineTo(-rocketLen * 0.15, -rocketWidth / 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,60,0,0.7)';
        ctx.fill();

        // Bottom fin
        ctx.beginPath();
        ctx.moveTo(-rocketLen * 0.35, rocketWidth / 2);
        ctx.lineTo(-rocketLen * 0.45, rocketWidth / 2 + finLen);
        ctx.lineTo(-rocketLen * 0.15, rocketWidth / 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,60,0,0.7)';
        ctx.fill();

        // --- Flaps (movable) ---
        const flapAngle = sim.flapDeflection * 3; // exaggerate for visibility
        ctx.save();
        ctx.translate(rocketLen * 0.1, -rocketWidth / 2);
        ctx.rotate(flapAngle);
        ctx.fillStyle = 'rgba(0,229,255,0.6)';
        ctx.fillRect(-2, -finLen * 0.5, 4, finLen * 0.5);
        ctx.restore();

        ctx.save();
        ctx.translate(rocketLen * 0.1, rocketWidth / 2);
        ctx.rotate(-flapAngle);
        ctx.fillStyle = 'rgba(0,229,255,0.6)';
        ctx.fillRect(-2, 0, 4, finLen * 0.5);
        ctx.restore();

        // --- Thrust vectoring indicator ---
        if (sim.burning && Math.abs(sim.thrustVectorAngle) > 0.001) {
            const tvAngle = sim.thrustVectorAngle * 5; // exaggerate
            ctx.save();
            ctx.translate(-rocketLen * 0.4, 0);
            ctx.rotate(tvAngle);
            ctx.fillStyle = 'rgba(255,165,0,0.5)';
            ctx.beginPath();
            ctx.moveTo(0, -rocketWidth * 0.4);
            ctx.lineTo(-rocketLen * 0.2, 0);
            ctx.lineTo(0, rocketWidth * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // --- Engine nozzle ---
        ctx.beginPath();
        ctx.moveTo(-rocketLen * 0.4, -rocketWidth * 0.35);
        ctx.lineTo(-rocketLen * 0.5, -rocketWidth * 0.5);
        ctx.lineTo(-rocketLen * 0.5, rocketWidth * 0.5);
        ctx.lineTo(-rocketLen * 0.4, rocketWidth * 0.35);
        ctx.closePath();
        ctx.fillStyle = '#555';
        ctx.fill();

        // --- Flame (when burning) ---
        if (sim.burning) {
            const flameLen = rocketLen * 0.5 + Math.random() * rocketLen * 0.3;
            const flameWidth = rocketWidth * 0.4;

            // Outer flame (orange/red)
            ctx.beginPath();
            ctx.moveTo(-rocketLen * 0.5, -flameWidth);
            ctx.quadraticCurveTo(-rocketLen * 0.5 - flameLen * 0.5, 0, -rocketLen * 0.5 - flameLen, (Math.random() - 0.5) * 4);
            ctx.quadraticCurveTo(-rocketLen * 0.5 - flameLen * 0.5, 0, -rocketLen * 0.5, flameWidth);
            ctx.closePath();
            const flameGrad = ctx.createLinearGradient(-rocketLen * 0.5, 0, -rocketLen * 0.5 - flameLen, 0);
            flameGrad.addColorStop(0, 'rgba(255,200,50,0.9)');
            flameGrad.addColorStop(0.3, 'rgba(255,120,0,0.8)');
            flameGrad.addColorStop(0.7, 'rgba(255,50,0,0.5)');
            flameGrad.addColorStop(1, 'rgba(255,20,0,0)');
            ctx.fillStyle = flameGrad;
            ctx.fill();

            // Inner flame (white-yellow)
            const innerLen = flameLen * 0.5;
            ctx.beginPath();
            ctx.moveTo(-rocketLen * 0.5, -flameWidth * 0.4);
            ctx.quadraticCurveTo(-rocketLen * 0.5 - innerLen * 0.5, 0, -rocketLen * 0.5 - innerLen, 0);
            ctx.quadraticCurveTo(-rocketLen * 0.5 - innerLen * 0.5, 0, -rocketLen * 0.5, flameWidth * 0.4);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255,255,220,0.6)';
            ctx.fill();

            // Flame glow
            ctx.beginPath();
            ctx.arc(-rocketLen * 0.5, 0, rocketLen * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,150,50,0.08)';
            ctx.fill();
        }

        ctx.restore();

        // --- Altitude / velocity labels near rocket ---
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(0,229,255,0.7)';
        ctx.textAlign = 'left';
        ctx.fillText(`${sim.y.toFixed(0)}m`, pos.x + 20, pos.y - 10);
    }

    renderLandedRocket(ctx, sim) {
        const pos = this.worldToScreen(sim.x, 0);
        const rocketLen = 20;
        const rocketWidth = 6;
        const crashAge = sim.crashedOnLanding ? Math.max(0, sim.time - sim.crashTime) : 999;

        if (sim.crashedOnLanding && crashAge < 2.2) {
            const burst = 1 - crashAge / 2.2;
            const ringRadius = 12 + burst * 90;

            ctx.save();
            ctx.translate(pos.x, pos.y);

            // Flash / shock ring
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 229, 255, ${0.65 * burst})`;
            ctx.lineWidth = 3 + burst * 6;
            ctx.shadowColor = 'rgba(0, 229, 255, 0.7)';
            ctx.shadowBlur = 18;
            ctx.stroke();

            // Fireball haze
            const flare = ctx.createRadialGradient(0, 0, 4, 0, 0, ringRadius * 1.1);
            flare.addColorStop(0, `rgba(255, 245, 180, ${0.9 * burst})`);
            flare.addColorStop(0.3, `rgba(255, 170, 40, ${0.7 * burst})`);
            flare.addColorStop(0.7, `rgba(255, 70, 0, ${0.35 * burst})`);
            flare.addColorStop(1, 'rgba(255, 70, 0, 0)');
            ctx.fillStyle = flare;
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius * 1.05, 0, Math.PI * 2);
            ctx.fill();

            // Sparks
            for (let i = 0; i < 14; i++) {
                const angle = (Math.PI * 2 * i) / 14 + crashAge * 4;
                const len = 18 + burst * 120;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len * 0.6);
                ctx.strokeStyle = `rgba(255, 180, 0, ${0.55 * burst})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // Smoke plume
            ctx.beginPath();
            ctx.arc(0, -ringRadius * 0.3, 28 + burst * 30, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(120, 120, 130, ${0.22 * burst})`;
            ctx.fill();

            ctx.restore();
        }

        ctx.save();
        ctx.translate(pos.x, pos.y);

        // Rocket lying on ground / standing
        ctx.rotate(-Math.PI / 2);

        ctx.beginPath();
        ctx.roundRect(-rocketLen * 0.4, -rocketWidth / 2, rocketLen * 0.8, rocketWidth, 2);
        ctx.fillStyle = 'rgba(150,155,170,0.6)';
        ctx.fill();

        // Nose
        ctx.beginPath();
        ctx.moveTo(rocketLen * 0.4, -rocketWidth / 2);
        ctx.lineTo(rocketLen * 0.55, 0);
        ctx.lineTo(rocketLen * 0.4, rocketWidth / 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(200,60,80,0.6)';
        ctx.fill();

        ctx.restore();

        // Landing marker
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = sim.crashedOnLanding ? 'rgba(255,109,0,0.9)' : 'rgba(0,230,118,0.8)';
        ctx.fill();

        ctx.font = '11px "Orbitron", monospace';
        ctx.fillStyle = sim.crashedOnLanding ? 'rgba(255,109,0,0.9)' : 'rgba(0,230,118,0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(sim.crashedOnLanding ? `CRASH: ${sim.x.toFixed(1)}m` : `LANDED: ${sim.x.toFixed(1)}m`, pos.x, pos.y + 20);
    }

    renderWindIndicator(ctx, w, h, sim) {
        const windVec = sim.wind.getWind(sim.y, sim.time);
        const indicatorX = w - 70;
        const indicatorY = 50;
        const maxLen = 35;

        // Background
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, 30, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Wind arrow
        const windMag = Math.sqrt(windVec.wx * windVec.wx + windVec.wy * windVec.wy);
        const windAngle = Math.atan2(-windVec.wy, windVec.wx); // screen coords
        const arrowLen = Math.min(windMag / sim.params.windSpeed * 20, maxLen);

        if (windMag > 0.1) {
            ctx.save();
            ctx.translate(indicatorX, indicatorY);
            ctx.rotate(windAngle);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(arrowLen, 0);
            ctx.strokeStyle = 'rgba(0,229,255,0.7)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Arrow head
            ctx.beginPath();
            ctx.moveTo(arrowLen, 0);
            ctx.lineTo(arrowLen - 6, -4);
            ctx.lineTo(arrowLen - 6, 4);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0,229,255,0.7)';
            ctx.fill();

            ctx.restore();
        }

        // Label
        ctx.font = '8px "Orbitron", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.textAlign = 'center';
        ctx.fillText('WIND', indicatorX, indicatorY + 42);
        ctx.fillText(`${windMag.toFixed(1)} m/s`, indicatorX, indicatorY + 52);
    }

    /**
     * Render telemetry chart
     */
    renderChart(sim) {
        const ctx = this.chartCtx;
        const w = this.chartWidth;
        const h = this.chartHeight;

        if (!w || !h) return;

        if (!w || !h) return;

        if (this.activeChart === 'globe') {
            this.renderGlobe(sim);
            return;
        }

        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, w, h);

        let data, color, label;
        switch (this.activeChart) {
            case 'altitude':
                data = sim.history.altitude;
                color = '#00e5ff';
                label = 'Alt (m)';
                break;
            case 'velocity':
                data = sim.history.velocity;
                color = '#00e676';
                label = 'Vel (m/s)';
                break;
            case 'deviation':
                data = sim.history.deviation;
                color = '#ff6d00';
                label = 'Dev (m)';
                break;
            default:
                data = sim.history.altitude;
                color = '#00e5ff';
                label = 'Alt (m)';
        }

        if (data.length < 2) {
            ctx.font = '10px "Inter", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.textAlign = 'center';
            ctx.fillText('In attesa dei dati...', w / 2, h / 2);
            return;
        }

        const padding = { top: 15, right: 10, bottom: 20, left: 45 };
        const plotW = w - padding.left - padding.right;
        const plotH = h - padding.top - padding.bottom;

        // Find data range
        let minVal = Infinity, maxVal = -Infinity;
        for (const v of data) {
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
        }
        if (this.activeChart === 'deviation') {
            const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal), 1);
            minVal = -absMax;
            maxVal = absMax;
        } else {
            minVal = Math.min(minVal, 0);
        }
        if (maxVal === minVal) maxVal = minVal + 1;

        const timeData = sim.history.time;
        const tMin = timeData[0];
        const tMax = timeData[timeData.length - 1];
        const tRange = Math.max(tMax - tMin, 0.1);

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const gy = padding.top + plotH * i / 4;
            ctx.beginPath();
            ctx.moveTo(padding.left, gy);
            ctx.lineTo(padding.left + plotW, gy);
            ctx.stroke();
        }

        // Y-axis labels
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const val = maxVal - (maxVal - minVal) * i / 4;
            const gy = padding.top + plotH * i / 4;
            ctx.fillText(val.toFixed(val > 100 ? 0 : 1), padding.left - 4, gy + 3);
        }

        // Chart label
        ctx.font = '9px "Orbitron", monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.fillText(label, padding.left, padding.top - 4);

        // Zero line for deviation
        if (this.activeChart === 'deviation') {
            const zeroY = padding.top + plotH * (maxVal / (maxVal - minVal));
            ctx.beginPath();
            ctx.moveTo(padding.left, zeroY);
            ctx.lineTo(padding.left + plotW, zeroY);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Data line
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
            const px = padding.left + ((timeData[i] - tMin) / tRange) * plotW;
            const py = padding.top + plotH * (1 - (data[i] - minVal) / (maxVal - minVal));
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Fill under line
        const lastIdx = data.length - 1;
        const lastPx = padding.left + ((timeData[lastIdx] - tMin) / tRange) * plotW;
        ctx.lineTo(lastPx, padding.top + plotH);
        ctx.lineTo(padding.left, padding.top + plotH);
        ctx.closePath();
        ctx.fillStyle = color.replace(')', ',0.08)').replace('rgb', 'rgba');
        ctx.fill();

        // Time axis
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.textAlign = 'center';
        const numTicks = 5;
        for (let i = 0; i <= numTicks; i++) {
            const t = tMin + tRange * i / numTicks;
            const px = padding.left + plotW * i / numTicks;
            ctx.fillText(t.toFixed(1) + 's', px, h - 4);
        }
    }

    /**
     * Mouse drag handlers for 3D Globe
     */
    initGlobeEvents() {
        const canvas = this.chartCanvas;
        
        canvas.addEventListener('mousedown', (e) => {
            if (this.activeChart !== 'globe') return;
            this.isDraggingGlobe = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDraggingGlobe || this.activeChart !== 'globe') return;
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.globeRotationY += dx * 0.007;
            this.globeRotationX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.globeRotationX + dy * 0.007));
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            
            // Dispatch event to allow app.js to trigger a redraw if idle
            const redrawEvent = new CustomEvent('globe-drag');
            canvas.dispatchEvent(redrawEvent);
        });

        window.addEventListener('mouseup', () => {
            this.isDraggingGlobe = false;
        });
        
        window.addEventListener('mouseleave', () => {
            this.isDraggingGlobe = false;
        });
    }

    /**
     * Project a 3D point (x, y, z) orthographically onto the 2D screen
     */
    project3D(x, y, z, cx, cy, R) {
        // Rotate around Y-axis (yaw)
        const cosY = Math.cos(this.globeRotationY);
        const sinY = Math.sin(this.globeRotationY);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        
        // Rotate around X-axis (pitch)
        const cosX = Math.cos(this.globeRotationX);
        const sinX = Math.sin(this.globeRotationX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        
        return {
            x: cx + x1,
            y: cy - y2,
            z: z2 // Positive z points towards the viewer (visible)
        };
    }

    /**
     * Render the interactive 3D Globe showing trajectory
     */
    renderGlobe(sim) {
        const ctx = this.chartCtx;
        const w = this.chartWidth;
        const h = this.chartHeight;
        
        // Clear background
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, w, h);
        
        const cx = w / 2;
        const cy = h / 2;
        const R = Math.min(w, h) * 0.42;
        
        // Oceans shading (radial gradient for 3D sphere look)
        const oceanGrad = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.2, R * 0.1, cx, cy, R);
        oceanGrad.addColorStop(0, '#0a2140');
        oceanGrad.addColorStop(0.7, '#051124');
        oceanGrad.addColorStop(1, '#02060e');
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = oceanGrad;
        ctx.fill();
        
        // Grid lines (parallels)
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
        ctx.lineWidth = 0.5;
        const latitudes = [-60, -30, 0, 30, 60];
        for (const lat of latitudes) {
            const latRad = lat * Math.PI / 180;
            const rLat = R * Math.cos(latRad);
            const yLat = R * Math.sin(latRad);
            
            ctx.beginPath();
            let drawing = false;
            for (let lon = 0; lon <= 360; lon += 6) {
                const lonRad = lon * Math.PI / 180;
                const x = rLat * Math.sin(lonRad);
                const z = rLat * Math.cos(lonRad);
                
                const p = this.project3D(x, yLat, z, cx, cy, R);
                if (p.z > 0) {
                    if (!drawing) {
                        ctx.moveTo(p.x, p.y);
                        drawing = true;
                    } else {
                        ctx.lineTo(p.x, p.y);
                    }
                } else {
                    drawing = false;
                }
            }
            ctx.stroke();
        }
        
        // Grid lines (meridians)
        const longitudes = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
        for (const lon of longitudes) {
            const lonRad = lon * Math.PI / 180;
            ctx.beginPath();
            let drawing = false;
            for (let lat = -90; lat <= 90; lat += 6) {
                const latRad = lat * Math.PI / 180;
                const x = R * Math.cos(latRad) * Math.sin(lonRad);
                const y = R * Math.sin(latRad);
                const z = R * Math.cos(latRad) * Math.cos(lonRad);
                
                const p = this.project3D(x, y, z, cx, cy, R);
                if (p.z > 0) {
                    if (!drawing) {
                        ctx.moveTo(p.x, p.y);
                        drawing = true;
                    } else {
                        ctx.lineTo(p.x, p.y);
                    }
                } else {
                    drawing = false;
                }
            }
            ctx.stroke();
        }
        
        // Continents (vector outlines)
        ctx.strokeStyle = 'rgba(0, 230, 118, 0.45)';
        ctx.lineWidth = 1;
        
        const LANDMASSES = [
            // Africa
            [[-15, 35], [15, 30], [35, 10], [50, 10], [40, -20], [20, -35], [10, -35], [-10, 5], [-15, 15]],
            // Eurasia
            [[-10, 60], [30, 70], [60, 75], [100, 75], [140, 70], [140, 40], [120, 20], [100, 10], [80, 10], [60, 25], [35, 30], [15, 30], [-10, 40], [-10, 50]],
            // North America
            [[-160, 65], [-100, 70], [-60, 60], [-55, 50], [-80, 25], [-90, 18], [-100, 15], [-105, 20], [-110, 30], [-125, 48]],
            // South America
            [[-80, 10], [-50, -5], [-40, -10], [-45, -25], [-60, -45], [-75, -50], [-80, -40], [-80, -20], [-80, -5]],
            // Australia
            [[113, -22], [130, -15], [143, -15], [150, -25], [150, -34], [140, -38], [115, -35]],
            // Antarctica
            [[-180, -75], [180, -75], [180, -85], [-180, -85]]
        ].map(poly => poly.map(([lon, lat]) => [lon * Math.PI / 180, lat * Math.PI / 180]));
        
        for (const poly of LANDMASSES) {
            ctx.beginPath();
            let drawing = false;
            for (let i = 0; i <= poly.length; i++) {
                const [lonRad, latRad] = poly[i % poly.length];
                const x = R * Math.cos(latRad) * Math.sin(lonRad);
                const y = R * Math.sin(latRad);
                const z = R * Math.cos(latRad) * Math.cos(lonRad);
                
                const p = this.project3D(x, y, z, cx, cy, R);
                if (p.z > 0) {
                    if (!drawing) {
                        ctx.moveTo(p.x, p.y);
                        drawing = true;
                    } else {
                        ctx.lineTo(p.x, p.y);
                    }
                } else {
                    drawing = false;
                }
            }
            ctx.stroke();
        }
        
        // Border boundary limb
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        
        // Launch and Trajectory Projection Math
        const lonStart = -20 * Math.PI / 180;
        const latStart = 12 * Math.PI / 180;
        
        // Launch point 3D coordinates on sphere
        const P0 = {
            x: R * Math.cos(latStart) * Math.sin(lonStart),
            y: R * Math.sin(latStart),
            z: R * Math.cos(latStart) * Math.cos(lonStart)
        };
        
        // Local East and North tangent vectors
        const E = {
            x: Math.cos(lonStart),
            y: 0,
            z: -Math.sin(lonStart)
        };
        const N = {
            x: -Math.sin(latStart) * Math.sin(lonStart),
            y: Math.cos(latStart),
            z: -Math.sin(latStart) * Math.cos(lonStart)
        };
        
        // Launch heading direction vector (25 degrees North of East)
        const heading = 25 * Math.PI / 180;
        const D = {
            x: E.x * Math.cos(heading) + N.x * Math.sin(heading),
            y: E.y * Math.cos(heading) + N.y * Math.sin(heading),
            z: E.z * Math.cos(heading) + N.z * Math.sin(heading)
        };
        
        // Projection scaling function
        const mapTrajectoryPoint = (xVal, yVal, maxAlt) => {
            // max nominal horizontal distance (ensure at least 100)
            const maxNomDist = sim.nominalTrajectory.length > 0 ? 
                sim.nominalTrajectory[sim.nominalTrajectory.length - 1].x : 1000;
            
            // Map nominal range to a 32-degree angular span
            const maxAngle = 32 * Math.PI / 180;
            const alpha = (xVal / Math.max(maxNomDist, 1)) * maxAngle;
            
            // Interpolate position along the great circle on the unit sphere
            const Sx = P0.x * Math.cos(alpha) + D.x * R * Math.sin(alpha);
            const Sy = P0.y * Math.cos(alpha) + D.y * R * Math.sin(alpha);
            const Sz = P0.z * Math.cos(alpha) + D.z * R * Math.sin(alpha);
            
            // Height scale
            const altitudeRatio = yVal / Math.max(maxAlt, 100);
            const rPoint = R * (1 + 0.28 * Math.max(0, altitudeRatio));
            
            const sLen = Math.sqrt(Sx * Sx + Sy * Sy + Sz * Sz);
            return {
                x: (Sx / sLen) * rPoint,
                y: (Sy / sLen) * rPoint,
                z: (Sz / sLen) * rPoint
            };
        };
        
        const maxAltVal = Math.max(sim.maxAltitude, 100);
        
        // 1. Draw Nominal Trajectory
        if (sim.nominalTrajectory.length > 1) {
            ctx.beginPath();
            ctx.setLineDash([3, 4]);
            ctx.strokeStyle = 'rgba(0, 230, 118, 0.35)';
            ctx.lineWidth = 0.8;
            let drawing = false;
            for (const pt of sim.nominalTrajectory) {
                const worldPt = mapTrajectoryPoint(pt.x, pt.y, maxAltVal);
                const scrPt = this.project3D(worldPt.x, worldPt.y, worldPt.z, cx, cy, R);
                if (scrPt.z > 0) {
                    if (!drawing) {
                        ctx.moveTo(scrPt.x, scrPt.y);
                        drawing = true;
                    } else {
                        ctx.lineTo(scrPt.x, scrPt.y);
                    }
                } else {
                    drawing = false;
                }
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // 2. Draw Actual Trajectory
        if (sim.trajectory.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = '#ff9100'; // neon orange
            ctx.lineWidth = 1.6;
            let drawing = false;
            for (const pt of sim.trajectory) {
                const worldPt = mapTrajectoryPoint(pt.x, pt.y, maxAltVal);
                const scrPt = this.project3D(worldPt.x, worldPt.y, worldPt.z, cx, cy, R);
                if (scrPt.z > 0) {
                    if (!drawing) {
                        ctx.moveTo(scrPt.x, scrPt.y);
                        drawing = true;
                    } else {
                        ctx.lineTo(scrPt.x, scrPt.y);
                    }
                } else {
                    drawing = false;
                }
            }
            ctx.stroke();
        }
        
        // 3. Draw START marker
        const startScr = this.project3D(P0.x, P0.y, P0.z, cx, cy, R);
        if (startScr.z > 0) {
            ctx.beginPath();
            ctx.arc(startScr.x, startScr.y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#00e676';
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            
            ctx.font = '8px "Orbitron", sans-serif';
            ctx.fillStyle = '#00e676';
            ctx.textAlign = 'right';
            ctx.fillText('START', startScr.x - 6, startScr.y + 3);
        }
        
        // 4. Draw LAND marker
        if (sim.landed) {
            const endWorld = mapTrajectoryPoint(sim.x, 0, maxAltVal);
            const endScr = this.project3D(endWorld.x, endWorld.y, endWorld.z, cx, cy, R);
            if (endScr.z > 0) {
                ctx.beginPath();
                ctx.arc(endScr.x, endScr.y, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = '#ff1744';
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 0.5;
                ctx.stroke();
                
                ctx.font = '8px "Orbitron", sans-serif';
                ctx.fillStyle = '#ff1744';
                ctx.textAlign = 'left';
                ctx.fillText('LAND', endScr.x + 6, endScr.y + 3);
            }
        }
        
        // 5. Draw Rocket position dot
        if (sim.launched && !sim.landed) {
            const rWorld = mapTrajectoryPoint(sim.x, sim.y, maxAltVal);
            const rScr = this.project3D(rWorld.x, rWorld.y, rWorld.z, cx, cy, R);
            if (rScr.z > 0) {
                const pulse = 3 + Math.abs(Math.sin(this.animTime * 6)) * 4;
                ctx.beginPath();
                ctx.arc(rScr.x, rScr.y, pulse, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 23, 68, 0.35)';
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(rScr.x, rScr.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#ff1744';
                ctx.fill();
                
                ctx.font = '8px "JetBrains Mono", monospace';
                ctx.fillStyle = '#ff1744';
                ctx.textAlign = 'left';
                ctx.fillText('ROCKET', rScr.x + pulse + 2, rScr.y + 3);
            }
        }
        
        // Interaction guide HUD
        ctx.font = '7px "Orbitron", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.textAlign = 'center';
        ctx.fillText('DRAG GLOBE TO ROTATE', cx, h - 8);
    }
}
