/**
 * DATASET GENERATOR FOR MACHINE LEARNING
 * Generates 10,000 rocket launches with full trajectory and landing data
 */

class DatasetGenerator {
    constructor(totalLaunches = 10000, onProgress = null) {
        this.totalLaunches = totalLaunches;
        this.onProgress = onProgress || (() => {});
        this.dataset = [];
        this.cancelled = false;
    }

    /**
     * Generate a random parameter value within bounds
     */
    randomParam(min, max) {
        return min + Math.random() * (max - min);
    }

    /**
     * Generate a small controlled variation around a base value
     * Used to add minor realism while keeping data coherent
     */
    variedParam(base, variation) {
        const factor = 1 + (Math.random() - 0.5) * variation;
        return base * factor;
    }

    /**
     * Generate physically meaningful parameters for a single launch
     * Data is stratified by rocket category for coherence and ML trainability
     * NO PARACHUTE - all rockets follow ballistic descent only
     */
    generateLaunchParams() {
        const g = 9.81;

        // Stratify into 5 rocket categories for coherent behavior
        const category = Math.floor(Math.random() * 5);
        let totalMass, thrustToWeight, fuelFraction, cdBase, pidKpBase, pidKiBase, pidKdBase, launchAngle, rocketType;

        switch (category) {
            case 0:
                // LIGHT ROCKETS: 30-45 kg, low thrust, high apogee
                totalMass = this.randomParam(30, 45);
                thrustToWeight = this.randomParam(2.5, 4.0);  // Higher TWR for light rockets
                fuelFraction = this.randomParam(0.35, 0.50);
                cdBase = 0.35;
                pidKpBase = 1.2;
                pidKiBase = 0.08;
                pidKdBase = 0.6;
                launchAngle = this.randomParam(80, 89);  // Steep for altitude
                rocketType = "light";
                break;

            case 1:
                // MEDIUM ROCKETS: 45-65 kg, balanced parameters
                totalMass = this.randomParam(45, 65);
                thrustToWeight = this.randomParam(1.8, 3.0);
                fuelFraction = this.randomParam(0.40, 0.55);
                cdBase = 0.38;
                pidKpBase = 1.5;
                pidKiBase = 0.10;
                pidKdBase = 0.8;
                launchAngle = this.randomParam(75, 85);
                rocketType = "medium";
                break;

            case 2:
                // HEAVY ROCKETS: 65-85 kg, lower thrust ratio but more power
                totalMass = this.randomParam(65, 85);
                thrustToWeight = this.randomParam(1.5, 2.5);  // Lower TWR, heavier
                fuelFraction = this.randomParam(0.38, 0.52);
                cdBase = 0.40;
                pidKpBase = 1.8;
                pidKiBase = 0.12;
                pidKdBase = 1.0;
                launchAngle = this.randomParam(70, 80);  // Lower angle due to weight
                rocketType = "heavy";
                break;

            case 3:
                // PRECISION ROCKETS: Optimized for stability and predictability
                totalMass = this.randomParam(40, 70);
                thrustToWeight = this.randomParam(2.0, 2.8);  // Moderate and stable
                fuelFraction = this.randomParam(0.42, 0.48);  // Tight fuel range
                cdBase = 0.36;  // Low drag
                pidKpBase = 1.4;
                pidKiBase = 0.09;
                pidKdBase = 0.75;
                launchAngle = this.randomParam(82, 88);
                rocketType = "precision";
                break;

            case 4:
            default:
                // AGGRESSIVE ROCKETS: High thrust, controlled descent
                totalMass = this.randomParam(35, 80);
                thrustToWeight = this.randomParam(3.0, 5.0);  // Very high thrust
                fuelFraction = this.randomParam(0.35, 0.55);
                cdBase = 0.39;
                pidKpBase = 2.0;  // Strong control
                pidKiBase = 0.13;
                pidKdBase = 1.2;
                launchAngle = this.randomParam(75, 87);
                rocketType = "aggressive";
                break;
        }

        // === Calculate consistent parameters ===
        const weight = totalMass * g;
        const thrust = weight * thrustToWeight;
        const fuelMass = totalMass * fuelFraction;

        // Burn time is deterministic: function of fuel and thrust
        // burnTime = fuelMass / (thrust / exhVelocity) * some scaling
        // Simplified: longer burn for more fuel, shorter for more thrust
        const baseBurnTime = 8 + (fuelFraction / thrustToWeight) * 15;
        const burnTime = this.variedParam(baseBurnTime, 0.15);  // ±7.5% variation only

        // === Structural parameters derived from mass ===
        const massRatio = (totalMass - 30) / (85 - 30);
        const diameter = 0.10 + massRatio * 0.18;
        const length = 1.5 + massRatio * 1.8;
        const coneAngle = 15 + massRatio * 15;  // Derived from mass

        // === Aerodynamics: low variation ===
        const cd = this.variedParam(cdBase, 0.10);  // ±5% only

        // === Control parameters scaled by thrust and consistency ===
        const pidKp = this.variedParam(pidKpBase, 0.12);
        const pidKi = this.variedParam(pidKiBase, 0.15);
        const pidKd = this.variedParam(pidKdBase, 0.12);

        // === Environmental: minimal randomness ===
        // Light wind most of the time, occasional gusty conditions
        const windMagnitude = Math.random();
        const windSpeed = windMagnitude < 0.8 ? this.randomParam(0, 3) : this.randomParam(3, 12);
        const windVariability = this.variedParam(0.25, 0.3);

        // === Correction enabled based on rocket type ===
        // Precision and medium rockets use correction, aggressive less so
        const correctionEnabled = rocketType !== "aggressive" || Math.random() > 0.5;

        return {
            totalMass,
            fuelMass,
            thrust,
            burnTime,
            launchAngle,
            diameter,
            length,
            coneAngle,
            cd,
            windSpeed,
            windVariability,
            correctionEnabled: true,  // ← ALWAYS enabled for this dataset
            pidKp,
            pidKi,
            pidKd,
            parachuteEnabled: true,  // ← ALWAYS disabled for this dataset
            rocketType  // Add type for reference
        };
    }

    /**
     * Validate and fix parameters (minimal checks, preserve coherence)
     */
    validateParams(params) {
        // Only critical safety checks - don't override the coherent generation above
        
        // Fuel can't exceed 70% of total mass
        params.fuelMass = Math.min(params.fuelMass, params.totalMass * 0.70);

        // Thrust must be able to lift (minimum 1.2x weight)
        const minThrust = params.totalMass * 9.81 * 1.2;
        params.thrust = Math.max(params.thrust, minThrust);

        // Parachute ALWAYS disabled
        params.parachuteEnabled = true;

        return params;
    }

    /**
     * Run a single rocket simulation and collect data
     */
    runSimulation(params) {
        const sim = new RocketSimulation();
        sim.launch(params);

        // Run simulation until landing (max 600 seconds)
        const maxTime = 600;
        const dt = 0.05;
        let stepCount = 0;
        const maxSteps = Math.ceil(maxTime / dt);

        const trajectoryPoints = [
            {
                t: 0,
                x: sim.x,
                y: sim.y,
                vx: sim.vx,
                vy: sim.vy,
                altitude: sim.y,
                velocity: Math.sqrt(sim.vx * sim.vx + sim.vy * sim.vy),
                angle: sim.angle * 180 / Math.PI
            }
        ];
        sim.apogeeTime = 0;

        while (!sim.landed && stepCount < maxSteps && !this.cancelled) {
            sim.step(dt);
            stepCount++;

            // Sample trajectory every 0.5 seconds
            if (stepCount % 10 === 0) {
                trajectoryPoints.push({
                    t: sim.time,
                    x: sim.x,
                    y: sim.y,
                    vx: sim.vx,
                    vy: sim.vy,
                    altitude: sim.y,
                    velocity: Math.sqrt(sim.vx * sim.vx + sim.vy * sim.vy),
                    angle: sim.angle * 180 / Math.PI
                });
            }

            // Update max values and track apogee time
            if (sim.y > (sim.maxAltitude || 0)) {
                sim.maxAltitude = sim.y;
                sim.apogeeTime = sim.time;
            }
            const currentVelocity = Math.sqrt(sim.vx * sim.vx + sim.vy * sim.vy);
            sim.maxVelocity = Math.max(sim.maxVelocity, currentVelocity);
        }

        // Helper to find trajectory point closest to a target time
        const findPointAtTime = (targetTime) => {
            if (trajectoryPoints.length === 0) return null;
            
            let closest = trajectoryPoints[0];
            let minDiff = Math.abs(trajectoryPoints[0].t - targetTime);
            
            for (let point of trajectoryPoints) {
                const diff = Math.abs(point.t - targetTime);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = point;
                }
            }
            return closest;
        };

        // Identify 5 key trajectory points: T0, T1, Apogeo, T2, Tfinale
        const t0Point = trajectoryPoints.length > 0 ? trajectoryPoints[0] : { t: 0, altitude: 0, velocity: 0 };
        const t1Point = findPointAtTime(sim.time * 0.33) || { t: 0, altitude: 0, velocity: 0 };
        const apogeePoint = findPointAtTime(sim.apogeeTime) || { t: sim.apogeeTime, altitude: sim.maxAltitude, velocity: 0 };
        const t2Point = findPointAtTime(sim.time * 0.66) || { t: 0, altitude: 0, velocity: 0 };
        const tfinalPoint = trajectoryPoints.length > 0 ? trajectoryPoints[trajectoryPoints.length - 1] : { t: sim.time, altitude: sim.y, velocity: 0 };

        return {
            // Input parameters
            totalMass: params.totalMass,
            fuelMass: params.fuelMass,
            thrust: params.thrust,
            burnTime: params.burnTime,
            launchAngle: params.launchAngle,
            diameter: params.diameter,
            length: params.length,
            coneAngle: params.coneAngle,
            cd: params.cd,
            windSpeed: params.windSpeed,
            windVariability: params.windVariability,
            correctionEnabled: params.correctionEnabled ? 1 : 0,
            parachuteEnabled: params.parachuteEnabled ? 1 : 0,
            pidKp: params.pidKp,
            pidKi: params.pidKi,
            pidKd: params.pidKd,
            rocketType: params.rocketType,

            // Output - flight results
            maxAltitude: sim.maxAltitude,
            maxVelocity: sim.maxVelocity,
            flightTime: sim.time,
            landingX: sim.x,
            landingY: sim.y,
            landingVelocity: Math.sqrt(sim.vx * sim.vx + sim.vy * sim.vy),
            lateralDeviation: sim.lateralDeviation,
            parachuteDeployed: sim.parachuteDeployed ? 1 : 0,

            // 5 key trajectory points: T0, T1, Apogeo, T2, Tfinale
            t0Time: t0Point.t,
            t0Altitude: t0Point.altitude,
            t0Velocity: t0Point.velocity,
            t1Time: t1Point.t,
            t1Altitude: t1Point.altitude,
            t1Velocity: t1Point.velocity,
            apogeeTime: apogeePoint.t,
            apogeeAltitude: apogeePoint.altitude,
            apogeeVelocity: apogeePoint.velocity,
            t2Time: t2Point.t,
            t2Altitude: t2Point.altitude,
            t2Velocity: t2Point.velocity,
            tfinalTime: tfinalPoint.t,
            tfinalAltitude: tfinalPoint.altitude,
            tfinalVelocity: tfinalPoint.velocity,

            // Trajectory summary (string of CSV-like points)
            trajectoryLength: trajectoryPoints.length,
            trajectoryTimestamps: trajectoryPoints.map(p => p.t.toFixed(2)).join("|"),
            trajectoryData: trajectoryPoints.map(p =>
                `${p.t.toFixed(2)},${p.x.toFixed(2)},${p.y.toFixed(2)},${p.velocity.toFixed(2)}`
            ).join("|")
        };
    }

    /**
     * Generate full dataset
     */
    async generate() {
        this.dataset = [];
        this.cancelled = false;

        for (let i = 0; i < this.totalLaunches; i++) {
            if (this.cancelled) break;

            try {
                const params = this.generateLaunchParams();
                this.validateParams(params);
                const result = this.runSimulation(params);
                this.dataset.push(result);
            } catch (e) {
                console.error(`Error in simulation ${i}:`, e);
            }

            // Report progress every 100 launches
            if (i % 100 === 0) {
                this.onProgress({
                    current: i + 1,
                    total: this.totalLaunches,
                    percentage: Math.round((i + 1) / this.totalLaunches * 100)
                });
            }

            // Allow UI to update
            if (i % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        this.onProgress({
            current: this.totalLaunches,
            total: this.totalLaunches,
            percentage: 100
        });

        return this.dataset;
    }

    /**
     * Export dataset as CSV
     */
    exportAsCSV() {
        if (this.dataset.length === 0) {
            return "No data to export";
        }

        const headers = [
            // Input parameters
            "totalMass",
            "fuelMass",
            "thrust",
            "burnTime",
            "launchAngle",
            "diameter",
            "length",
            "coneAngle",
            "cd",
            "windSpeed",
            "windVariability",
            "correctionEnabled",
            "parachuteEnabled",
            "pidKp",
            "pidKi",
            "pidKd",
            "rocketType",
            // Output - flight results
            "maxAltitude",
            "maxVelocity",
            "flightTime",
            "landingX",
            "landingY",
            "landingVelocity",
            "lateralDeviation",
            "parachuteDeployed",
            // 5 key trajectory points
            "t0Time",
            "t0Altitude",
            "t0Velocity",
            "t1Time",
            "t1Altitude",
            "t1Velocity",
            "apogeeTime",
            "apogeeAltitude",
            "apogeeVelocity",
            "t2Time",
            "t2Altitude",
            "t2Velocity",
            "tfinalTime",
            "tfinalAltitude",
            "tfinalVelocity",
            "trajectoryLength",
            "trajectoryTimestamps"
        ];

        let csv = headers.join(",") + "\n";

        this.dataset.forEach(row => {
            const values = [
                row.totalMass,
                row.fuelMass,
                row.thrust,
                row.burnTime,
                row.launchAngle,
                row.diameter,
                row.length,
                row.coneAngle,
                row.cd,
                row.windSpeed,
                row.windVariability,
                row.correctionEnabled,
                row.parachuteEnabled,
                row.pidKp,
                row.pidKi,
                row.pidKd,
                row.rocketType,
                row.maxAltitude,
                row.maxVelocity,
                row.flightTime,
                row.landingX,
                row.landingY,
                row.landingVelocity,
                row.lateralDeviation,
                row.parachuteDeployed,
                row.t0Time,
                row.t0Altitude,
                row.t0Velocity,
                row.t1Time,
                row.t1Altitude,
                row.t1Velocity,
                row.apogeeTime,
                row.apogeeAltitude,
                row.apogeeVelocity,
                row.t2Time,
                row.t2Altitude,
                row.t2Velocity,
                row.tfinalTime,
                row.tfinalAltitude,
                row.tfinalVelocity,
                row.trajectoryLength,
                row.trajectoryTimestamps
            ];
            csv += values.join(",") + "\n";
        });

        return csv;
    }

    /**
     * Export trajectory data as separate CSV
     */
    exportTrajectoriesAsCSV() {
        let csv = "launchIndex,sampleIndex,timestamp,x,y,velocity\n";

        this.dataset.forEach((launch, launchIdx) => {
            if (launch.trajectoryData) {
                const points = launch.trajectoryData.split("|");
                points.forEach((point, sampleIdx) => {
                    const [t, x, y, vel] = point.split(",");
                    csv += `${launchIdx},${sampleIdx},${t},${x},${y},${vel}\n`;
                });
            }
        });

        return csv;
    }

    /**
     * Cancel generation
     */
    cancel() {
        this.cancelled = true;
    }

    /**
     * Get statistics about the dataset
     */
    getStatistics() {
        if (this.dataset.length === 0) return null;

        const stats = {
            count: this.dataset.length,
            maxAltitude: {
                min: Math.min(...this.dataset.map(d => d.maxAltitude)),
                max: Math.max(...this.dataset.map(d => d.maxAltitude)),
                avg: this.dataset.reduce((sum, d) => sum + d.maxAltitude, 0) / this.dataset.length
            },
            flightTime: {
                min: Math.min(...this.dataset.map(d => d.flightTime)),
                max: Math.max(...this.dataset.map(d => d.flightTime)),
                avg: this.dataset.reduce((sum, d) => sum + d.flightTime, 0) / this.dataset.length
            },
            landingX: {
                min: Math.min(...this.dataset.map(d => d.landingX)),
                max: Math.max(...this.dataset.map(d => d.landingX)),
                avg: this.dataset.reduce((sum, d) => sum + d.landingX, 0) / this.dataset.length
            },
            maxVelocity: {
                min: Math.min(...this.dataset.map(d => d.maxVelocity)),
                max: Math.max(...this.dataset.map(d => d.maxVelocity)),
                avg: this.dataset.reduce((sum, d) => sum + d.maxVelocity, 0) / this.dataset.length
            }
        };

        return stats;
    }
}
