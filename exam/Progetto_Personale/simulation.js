/* =========================================
   SIMULATION ENGINE
   Physics, PID controller, EM comms, wind
   ========================================= */

/**
 * Runge-Kutta 4th-order integrator for accurate physics
 */


/**
 * PID Controller for trajectory correction
 */class RK4Integrator {
    /**
     * @param {Function} derivs - (state, t) => derivatives
     * @param {number[]} state - current state vector
     * @param {number} t - current time
     * @param {number} dt - timestep
     * @returns {number[]} new state
     */
    static step(derivs, state, t, dt) {
        const k1 = derivs(state, t);
        const s2 = state.map((s, i) => s + 0.5 * dt * k1[i]);

        const k2 = derivs(s2, t + 0.5 * dt);
        //  Sostituito k3[i] con k2[i] per il corretto campionamento intermedio
        const s3 = state.map((s, i) => s + 0.5 * dt * k2[i]);

        const k3 = derivs(s3, t + 0.5 * dt);
        const s4 = state.map((s, i) => s + dt * k3[i]);
        const k4 = derivs(s4, t + dt);

        return state.map((s, i) =>
            s + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
        );
    }
}

class PIDController {
    constructor(kp = 2.0, ki = 0.1, kd = 1.5) {
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        this.integral = 0;
        this.prevError = 0;
        this.output = 0;
    }

    update(error, dt) {
        if (dt <= 0) return 0;
        this.integral += error * dt;
        // Anti-windup: clamp integral
        this.integral = Math.max(-50, Math.min(50, this.integral));
        const derivative = (error - this.prevError) / dt;
        this.prevError = error;
        this.output = this.kp * error + this.ki * this.integral + this.kd * derivative;
        return this.output;
    }

    reset() {
        this.integral = 0;
        this.prevError = 0;
        this.output = 0;
    }
}

/**
 * Wind model with altitude profile and stochastic gusts
 */
class WindModel {
    constructor(baseSpeed = 5, variability = 0.3) {
        this.baseSpeed = baseSpeed;       // m/s lateral
        this.variability = variability;   // 0-1 fraction
        this.gustPhase = Math.random() * Math.PI * 2;
        this.gustFreq = 0.3 + Math.random() * 0.4; // Hz
    }

    /**
     * Get wind velocity at given altitude and time
     * Wind increases with altitude (wind shear)
     * @returns {{ wx: number, wy: number }}
     */
    getWind(altitude, time) {
        // Wind shear: increases logarithmically with altitude
        const refAlt = 10; // reference altitude
        const shearFactor = Math.log(Math.max(altitude, 1) / refAlt + 1) / Math.log(100 / refAlt + 1);
        const altFactor = 0.3 + 0.7 * Math.min(shearFactor, 2);

        // Base wind + gust
        const gust = this.variability * this.baseSpeed * (
            Math.sin(this.gustFreq * time * 2 * Math.PI + this.gustPhase) * 0.6 +
            Math.sin(this.gustFreq * 2.7 * time * 2 * Math.PI + this.gustPhase * 1.3) * 0.3 +
            (Math.random() - 0.5) * 0.4
        );

        const wx = (this.baseSpeed + gust) * altFactor;
        // Small vertical wind component
        const wy = gust * 0.1 * altFactor;

        return { wx, wy };
    }
}

/**
 * EM Communication system between ground and rocket
 */
class EMCommunication {
    constructor() {
        this.c = 299792458; // speed of light m/s
        this.active = true;
        this.lastSendTime = 0;
        this.sendInterval = 0.05; // send commands every 50ms
        this.pendingCommand = null;
        this.commandArrivalTime = 0;
        this.latency = 0;
        this.signalStrength = 1;
        /** @type {{ time: number, fromX: number, fromY: number, toX: number, toY: number, progress: number }[]} */
        this.activeSignals = [];
    }

    /**
     * Calculate communication latency based on distance
     * (Scaled up for visualization — real latency too small)
     */
    calcLatency(distance) {
        // Use exaggerated latency for visual effect
        // Real: distance / c. We scale up by 1e6 for visibility
        this.latency = (distance / this.c) * 1e6; // microseconds scaled to ms
        return this.latency;
    }

    /**
     * Try to send a correction command
     */
    sendCommand(time, correction, rocketPos, groundPos) {
        if (!this.active) return;
        if (time - this.lastSendTime < this.sendInterval) return;

        this.lastSendTime = time;
        const dist = Math.sqrt(
            (rocketPos.x - groundPos.x) ** 2 + (rocketPos.y - groundPos.y) ** 2
        );
        const latency = this.calcLatency(dist);
        this.commandArrivalTime = time + latency / 1000; // convert ms to s

        this.pendingCommand = {
            correction,
            sentTime: time,
            arrivalTime: this.commandArrivalTime
        };

        // Create visual signal
        this.activeSignals.push({
            time: time,
            fromX: groundPos.x,
            fromY: groundPos.y,
            toX: rocketPos.x,
            toY: rocketPos.y,
            progress: 0,
            duration: Math.max(latency / 1000, 0.15) // at least 150ms for visibility
        });
    }

    /**
     * Check if a command has arrived
     */
    receiveCommand(currentTime) {
        if (!this.pendingCommand) return null;
        if (currentTime >= this.pendingCommand.arrivalTime) {
            const cmd = this.pendingCommand;
            this.pendingCommand = null;
            return cmd.correction;
        }
        return null;
    }

    /**
     * Update active signals
     */
    updateSignals(dt) {
        for (let i = this.activeSignals.length - 1; i >= 0; i--) {
            this.activeSignals[i].progress += dt / this.activeSignals[i].duration;
            if (this.activeSignals[i].progress >= 1) {
                this.activeSignals.splice(i, 1);
            }
        }
    }
}

/**
 * Main simulation state and logic
 */
class RocketSimulation {
    constructor() {
        this.reset();
    }

    reset() {
        // Parameters (set before launch)
        this.params = {
            totalMass: 50,         // kg
            fuelMass: 20,          // kg
            thrust: 2000,          // N
            burnTime: 10,          // s
            launchAngle: 85,       // degrees
            diameter: 0.15,        // m
            length: 2,             // m
            coneAngle: 15,         // degrees
            cd: 0.5,
            windSpeed: 5,          // m/s
            windVariability: 0.3,  // fraction
            correctionEnabled: true,
            parachuteEnabled: true,
            pidKp: 2.0,
            pidKi: 0.1,
            pidKd: 1.5,
            timeScale: 1
        };

        // State
        this.time = 0;
        this.x = 0;            // horizontal position (m)
        this.y = 0;            // vertical position / altitude (m)
        this.vx = 0;           // horizontal velocity (m/s)
        this.vy = 0;           // vertical velocity (m/s)
        this.angle = 0;        // rocket pointing angle (rad from horizontal)
        this.angularVel = 0;   // angular velocity (rad/s)
        this.mass = 0;         // current mass
        this.fuelRemaining = 0;
        this.burning = false;
        this.launched = false;
        this.landed = false;
        this.maxAltitude = 0;
        this.maxVelocity = 0;

        // Deceleration & Parachute states
        this.thrustFactor = 1;
        this.burnoutPhase = false;
        this.parachuteDeployed = false;
        this.parachuteInflation = 0;
        this.crashedOnLanding = false;
        this.crashTime = 0;

        // Correction state
        this.thrustVectorAngle = 0;  // rad, deflection from main axis
        this.flapDeflection = 0;     // rad
        this.lateralDeviation = 0;   // m from nominal

        // Nominal trajectory (computed at launch)
        /** @type {{ x: number, y: number, t: number }[]} */
        this.nominalTrajectory = [];

        // Actual trajectory (recorded)
        /** @type {{ x: number, y: number, t: number }[]} */
        this.trajectory = [];

        // Telemetry history for charts
        this.history = {
            time: [],
            altitude: [],
            velocity: [],
            deviation: [],
            acceleration: []
        };

        // Sub-systems
        this.wind = new WindModel();
        this.pid = new PIDController();
        this.em = new EMCommunication();

        // Constants
        this.g = 9.81;           // m/s²
        this.rho0 = 1.225;       // kg/m³ sea level air density
        this.speedOfSound = 343; // m/s

        // Ground station position (fixed)
        this.groundStation = { x: -30, y: 0 };

        // Event log
        /** @type {{ time: number, message: string, type: string }[]} */
        this.eventLog = [];
    }

    /**
     * Initialize with user parameters and start
     */
    launch(params) {
        this.reset();
        Object.assign(this.params, params);

        this.mass = this.params.totalMass;
        this.fuelRemaining = this.params.fuelMass;
        this.burning = true;
        this.launched = true;

        // Convert launch angle to radians
        this.angle = this.params.launchAngle * Math.PI / 180;

        // Init subsystems
        this.wind = new WindModel(this.params.windSpeed, this.params.windVariability);
        this.pid = new PIDController(this.params.pidKp, this.params.pidKi, this.params.pidKd);
        this.em = new EMCommunication();
        this.em.active = this.params.correctionEnabled;

        // Compute nominal trajectory (without wind, no correction needed)
        this.computeNominalTrajectory();

        this.addEvent('Lancio iniziato!', 'success');
        this.addEvent(`Angolo: ${this.params.launchAngle}°, Spinta: ${this.params.thrust}N`, 'info');
    }

    /**
     * Compute the nominal (ideal) trajectory for reference
     */
    computeNominalTrajectory() {
        // Use small fixed timestep for accuracy (RK4 on the nominal — no wind)
        const dt = 0.02;
        let t = 0, x = 0, y = 0, vx = 0, vy = 0;
        let mass = this.params.totalMass;
        let fuel = this.params.fuelMass;
        const launchAngle = this.params.launchAngle * Math.PI / 180;
        const area = Math.PI * (this.params.diameter / 2) ** 2;
        const fuelRate = this.params.fuelMass / this.params.burnTime;
        let currentAngle = launchAngle;
        // Burnout decay state (mirror substep logic)
        let thrustFactor = 1.0;
        let burnoutPhase = false;
        let burning = true;

        this.nominalTrajectory = [{ x: 0, y: 0, t: 0 }];

        const self = this;
        for (let i = 0; i < 30000 && t < 600; i++) {
            t += dt;

            // --- Fuel consumption (mirror substep) ---
            if (burning && !burnoutPhase) {
                if (fuel > 0 && t <= this.params.burnTime) {
                    const consumed = fuelRate * dt;
                    fuel = Math.max(0, fuel - consumed);
                    mass = this.params.totalMass - (this.params.fuelMass - fuel);
                } else {
                    burnoutPhase = true;
                }
            }
            if (burnoutPhase) {
                thrustFactor = Math.max(0, thrustFactor - dt / 0.4);
                if (thrustFactor === 0) {
                    burning = false;
                    burnoutPhase = false;
                    mass = this.params.totalMass - this.params.fuelMass;
                }
            }

            // --- Angle tracking (mirror substep) ---
            const speed = Math.sqrt(vx * vx + vy * vy);
            if (speed > 0.5) {
                const targetAngle = Math.atan2(vy, vx);
                const angleDiff = targetAngle - currentAngle;
                currentAngle += angleDiff * Math.min(1, dt * 3);
            }

            // --- RK4 derivatives (no wind in nominal) ---
            const derivs = (s) => {
                const [px, py, pvx, pvy] = s;
                const sp = Math.sqrt(pvx * pvx + pvy * pvy);
                const rho = self.rho0 * Math.exp(-Math.max(py, 0) / 8500);
                const dragMag = 0.5 * rho * sp * sp * self.params.cd * area;
                const dX = sp > 0.1 ? -dragMag * pvx / sp : 0;
                const dY = sp > 0.1 ? -dragMag * pvy / sp : 0;
                let tX = 0, tY = 0;
                if (burning) {
                    const activeThrust = self.params.thrust * thrustFactor;
                    tX = activeThrust * Math.cos(currentAngle);
                    tY = activeThrust * Math.sin(currentAngle);
                }
                return [pvx, pvy, (tX + dX) / mass, (tY + dY) / mass - self.g];
            };

            const state = [x, y, vx, vy];
            const k1 = derivs(state);
            const k2 = derivs(state.map((s, i) => s + 0.5 * dt * k1[i]));
            const k3 = derivs(state.map((s, i) => s + 0.5 * dt * k2[i]));
            const k4 = derivs(state.map((s, i) => s + dt * k3[i]));
            [x, y, vx, vy] = state.map((s, i) =>
                s + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
            );

            if (y < 0 && t > 1) {
                y = 0;
                break;
            }

            // Sample every ~0.1s
            if (i % 5 === 0) {
                this.nominalTrajectory.push({ x, y, t });
            }
        }
    }

    /**
     * Get air density at altitude
     */
    getAirDensity(altitude) {
        return this.rho0 * Math.exp(-altitude / 8500);
    }

    /**
     * Get reference cross-section area
     */
    getCrossArea() {
        return Math.PI * (this.params.diameter / 2) ** 2;
    }

    /**
     * Get nominal position at a given time
     */
    getNominalPosition(t) {
        if (this.nominalTrajectory.length === 0) return { x: 0, y: 0 };

        // Binary search for closest time
        let lo = 0, hi = this.nominalTrajectory.length - 1;
        while (lo < hi - 1) {
            const mid = (lo + hi) >> 1;
            if (this.nominalTrajectory[mid].t <= t) lo = mid;
            else hi = mid;
        }

        const p0 = this.nominalTrajectory[lo];
        const p1 = this.nominalTrajectory[hi];
        if (p1.t === p0.t) return p0;
        const frac = (t - p0.t) / (p1.t - p0.t);
        return {
            x: p0.x + frac * (p1.x - p0.x),
            y: p0.y + frac * (p1.y - p0.y)
        };
    }

    /**
     * Main simulation step
     */
    step(dt) {
        if (!this.launched || this.landed) return;

        const scaledDt = dt * this.params.timeScale;
        // Sub-step for stability
        const numSubSteps = Math.max(1, Math.ceil(scaledDt / 0.005));
        const subDt = scaledDt / numSubSteps;

        for (let s = 0; s < numSubSteps; s++) {
            this.substep(subDt);
            if (this.landed) break;
        }
    }

    substep(dt) {
        this.time += dt;

        const area = this.getCrossArea();
        const fuelRate = this.params.fuelMass / this.params.burnTime;

        // --- Fuel consumption and Thrust Decay ---
        if (this.burning && !this.burnoutPhase) {
            if (this.fuelRemaining > 0 && this.time <= this.params.burnTime) {
                const consumed = fuelRate * dt;
                this.fuelRemaining = Math.max(0, this.fuelRemaining - consumed);
                this.mass = this.params.totalMass - (this.params.fuelMass - this.fuelRemaining);
            } else {
                this.burnoutPhase = true;
                this.addEvent('Esaurimento carburante — inizio spegnimento motore', 'warning');
            }
        }

        if (this.burnoutPhase) {
            // Decay thrust over 0.4 seconds
            this.thrustFactor = Math.max(0, this.thrustFactor - dt / 0.4);
            if (this.thrustFactor === 0) {
                this.burning = false;
                this.burnoutPhase = false;
                this.mass = this.params.totalMass - this.params.fuelMass;
                this.addEvent('Combustione esaurita — fase di volo libero', 'warning');
            }
        }

        // --- Parachute deployment ---
        if (this.params.parachuteEnabled && !this.burning && !this.landed && this.vy < -0.2 && this.y > 50 && !this.parachuteDeployed) {
            this.parachuteDeployed = true;
            this.addEvent('Apogeo superato — Espulsione paracadute!', 'success');
        }

        if (this.parachuteDeployed && this.parachuteInflation < 1) {
            this.parachuteInflation = Math.min(1, this.parachuteInflation + dt / 1.0);
        }

        // --- Wind ---
        const windVec = this.wind.getWind(this.y, this.time);

        // --- EM correction ---
        if (this.params.correctionEnabled && this.y > 5) {
            // Calculate deviation from nominal
            const nomPos = this.getNominalPosition(this.time);
            this.lateralDeviation = this.x - nomPos.x;

            // PID control
            const correction = this.pid.update(this.lateralDeviation, dt);

            // Send command via EM
            this.em.sendCommand(
                this.time,
                correction,
                { x: this.x, y: this.y },
                this.groundStation
            );

            // Check for received commands
            const receivedCorrection = this.em.receiveCommand(this.time);
            if (receivedCorrection !== null) {
                // Apply thrust vectoring (max ±5°)
                const maxTV = 5 * Math.PI / 180;
                this.thrustVectorAngle = Math.max(-maxTV, Math.min(maxTV, -receivedCorrection * 0.002));

                // Apply flap deflection (max ±15°)
                const maxFlap = 15 * Math.PI / 180;
                this.flapDeflection = Math.max(-maxFlap, Math.min(maxFlap, -receivedCorrection * 0.005));
            }
        }

        this.em.updateSignals(dt);

        // --- Physics integration using RK4 ---
        const self = this;
        const state = [this.x, this.y, this.vx, this.vy];

        const derivs = function (s, t) {
            const [px, py, pvx, pvy] = s;
            const speed = Math.sqrt(pvx * pvx + pvy * pvy);

            // Air density
            const rho = self.getAirDensity(Math.max(py, 0));

            // --- Body drag: opposes rocket's own velocity vector ---
            // This is the primary drag on the rocket body (skin friction + form drag).
            // We apply it on the rocket velocity, not the relative-to-wind velocity,
            // to avoid the wind laterally adding a spurious upward drag component.
            const baseCd = self.params.cd;
            const baseArea = area;
            let bodyDragMag = 0.5 * rho * speed * speed * baseCd * baseArea;

            // Parachute drag (also on rocket's velocity)
            if (self.parachuteDeployed) {
                const chuteCd = 1.75;
                const chuteArea = Math.PI * Math.pow(1.5 / 2, 2); // 1.5m diameter parachute
                bodyDragMag += 0.5 * rho * speed * speed * chuteCd * chuteArea * self.parachuteInflation;
            }

            const dragX = speed > 0.1 ? -bodyDragMag * pvx / speed : 0;
            const dragY = speed > 0.1 ? -bodyDragMag * pvy / speed : 0;

            // --- Lateral wind force: acts perpendicular to rocket axis ---
            // Wind exerts a crosswind force on the rocket body (like a side gust).
            // This is modelled as a force proportional to the dynamic pressure of the
            // wind component perpendicular to the rocket's velocity direction.
            let windForceX = 0, windForceY = 0;
            const crossWindX = windVec.wx - pvx;  // wind relative to rocket, lateral only
            const crossWindY = windVec.wy - pvy;
            const crossWindSpeed = Math.sqrt(crossWindX * crossWindX + crossWindY * crossWindY);
            if (crossWindSpeed > 0.1) {
                // Use a reduced lateral drag coefficient (normal force on cylinder side)
                const lateralCd = baseCd * 0.5;
                const lateralArea = self.params.diameter * self.params.length * 0.5; // projected side area
                const windForceMag = 0.5 * rho * crossWindSpeed * crossWindSpeed * lateralCd * lateralArea;
                windForceX = windForceMag * crossWindX / crossWindSpeed;
                windForceY = windForceMag * crossWindY / crossWindSpeed;
            }

            // --- Thrust ---
            let thrustX = 0, thrustY = 0;
            if (self.burning) {
                const activeThrust = self.params.thrust * self.thrustFactor;
                const thrustAngle = self.angle + self.thrustVectorAngle;
                thrustX = activeThrust * Math.cos(thrustAngle);
                thrustY = activeThrust * Math.sin(thrustAngle);
            }

            // --- Flap force (corrective, lateral only) ---
            // Flaps generate a lateral aerodynamic force. Use a dedicated lift-like
            // coefficient (CL) instead of the body Cd to avoid inflating the force.
            let flapX = 0, flapY = 0;
            if (Math.abs(self.flapDeflection) > 0.001 && speed > 1) {
                const flapCl = 1.2;   // realistic lift coefficient for a deflected surface
                const flapArea = self.params.diameter * 0.1; // flap chord × span estimate
                const flapForceMag = 0.5 * rho * speed * speed * flapCl * flapArea *
                    Math.sin(self.flapDeflection);
                // Lateral: perpendicular to rocket's velocity direction
                const perpAngle = Math.atan2(pvy, pvx) + Math.PI / 2;
                flapX = flapForceMag * Math.cos(perpAngle);
                flapY = flapForceMag * Math.sin(perpAngle);
            }

            // --- Total acceleration ---
            const ax = (thrustX + dragX + windForceX + flapX) / self.mass;
            const ay = (thrustY + dragY + windForceY + flapY) / self.mass - self.g;

            return [pvx, pvy, ax, ay];
        };

        const newState = RK4Integrator.step(derivs, state, this.time, dt);
        [this.x, this.y, this.vx, this.vy] = newState;

        // Update angle to match velocity direction
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 0.5) {
            const targetAngle = Math.atan2(this.vy, this.vx);
            // Smooth angle transition (simulate aerodynamic stability)
            const angleDiff = targetAngle - this.angle;
            this.angle += angleDiff * Math.min(1, dt * 3);
        }

        // --- Landing check ---
        if (this.y <= 0 && this.time > 0.5) {
            this.y = 0;
            this.vy = 0;
            this.vx = 0;
            this.landed = true;
            this.burning = false;
            this.crashedOnLanding = !this.params.parachuteEnabled;
            this.crashTime = this.time;
            this.addEvent(`Atterraggio a T+${this.time.toFixed(1)}s, distanza: ${this.x.toFixed(1)}m`, 'success');
            if (this.crashedOnLanding) {
                this.addEvent('Crash landing: impatto violento senza paracadute!', 'error');
            }
            this.addEvent(`Altitudine massima: ${this.maxAltitude.toFixed(1)}m`, 'info');
            this.addEvent(`Velocità massima: ${this.maxVelocity.toFixed(1)}m/s`, 'info');
        }

        // --- Record ---
        this.maxAltitude = Math.max(this.maxAltitude, this.y);
        this.maxVelocity = Math.max(this.maxVelocity, speed);

        // Sample trajectory and history
        if (this.trajectory.length === 0 ||
            this.time - this.trajectory[this.trajectory.length - 1].t >= 0.02) {
            this.trajectory.push({ x: this.x, y: this.y, t: this.time });

            const accel = Math.sqrt(
                ((this.vx - (this.history.velocity.length > 0 ? this.history.velocity[this.history.velocity.length - 1] * Math.cos(this.angle) : 0))) ** 2 +
                ((this.vy - (this.history.velocity.length > 0 ? this.history.velocity[this.history.velocity.length - 1] * Math.sin(this.angle) : 0))) ** 2
            ) / Math.max(dt, 0.001);

            this.history.time.push(this.time);
            this.history.altitude.push(this.y);
            this.history.velocity.push(speed);
            this.history.deviation.push(this.lateralDeviation);
            this.history.acceleration.push(speed > 0 ? accel : 0);
        }
    }

    /**
     * Get current telemetry data
     */
    getTelemetry() {
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const mach = speed / this.speedOfSound;
        const angleDeg = this.angle * 180 / Math.PI;
        const lastAccel = this.history.acceleration.length > 0 ?
            this.history.acceleration[this.history.acceleration.length - 1] : 0;

        return {
            time: this.time,
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy,
            speed,
            mach,
            altitude: this.y,
            angle: angleDeg,
            acceleration: lastAccel,
            mass: this.mass,
            fuelRemaining: this.fuelRemaining,
            burning: this.burning,
            lateralDeviation: this.lateralDeviation,
            thrustVectorAngle: this.thrustVectorAngle * 180 / Math.PI,
            flapDeflection: this.flapDeflection * 180 / Math.PI,
            emLatency: this.em.latency,
            emActive: this.em.active,
            maxAltitude: this.maxAltitude,
            maxVelocity: this.maxVelocity,
            landed: this.landed,
            launched: this.launched,
            parachuteDeployed: this.parachuteDeployed,
            parachuteInflation: this.parachuteInflation,
            crashedOnLanding: this.crashedOnLanding,
            crashTime: this.crashTime
        };
    }

    addEvent(message, type = 'info') {
        this.eventLog.push({ time: this.time, message, type });
    }
}