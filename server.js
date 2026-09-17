const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// DB Integration: In-Memory SQLite Database
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run(`CREATE TABLE patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        age INTEGER,
        symptoms TEXT,
        heart_rate INTEGER,
        spo2 INTEGER,
        temp REAL,
        risk_level TEXT,
        score INTEGER,
        reason TEXT,
        action TEXT,
        eta TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed Data for Demo Presentation
    const stmt = db.prepare(`INSERT INTO patients (name, age, symptoms, heart_rate, spo2, temp, risk_level, score, reason, action, eta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run("John Doe", 68, "Chest tightness and severe shortness of breath", 115, 89, 38.2, "Emergency", 95, "Low Oxygen (SpO2 < 90%) and severe cardiac warning indicators.", "Transfer directly to ICU Bay 1", "Immediate");
    stmt.run("Sarah Smith", 24, "Mild fever and sore throat", 72, 98, 37.5, "Normal", 15, "Normal vitals with low-risk routine symptoms.", "Prescribe outpatient rest & fluids", "45 mins");
    stmt.finalize();
});

// Advanced Algorithmic Risk Scoring Engine
function evaluateTriageEngine(symptoms, age, heartRate, spo2, temp) {
    let score = 10;
    let reasons = [];
    let risk = "Normal";
    let action = "Schedule standard outpatient consultation.";
    let eta = "30-60 mins";

    const text = symptoms.toLowerCase();

    // Vitals Evaluation
    if (spo2 < 90) { score += 40; reasons.push("Critical SpO2 (<90%)"); }
    else if (spo2 < 95) { score += 15; reasons.push("Low SpO2 (<95%)"); }

    if (heartRate > 120 || heartRate < 50) { score += 25; reasons.push("Abnormal Heart Rate"); }
    if (temp > 39.0) { score += 15; reasons.push("High Fever"); }
    if (age > 65) { score += 10; reasons.push("High-risk Age Group (>65)"); }

    // Symptom Text Evaluation
    if (text.includes("chest pain") || text.includes("breath") || text.includes("unconscious") || text.includes("bleeding")) {
        score += 35;
        reasons.push("Critical Symptom Keywords Detected");
    }

    // Risk Classification based on Score
    if (score >= 60) {
        risk = "Emergency";
        action = "Immediate ER / ICU Admission required.";
        eta = "Immediate";
    } else if (score >= 35) {
        risk = "Urgent";
        action = "Priority doctor evaluation required.";
        eta = "10-15 mins";
    }

    const reasonStr = reasons.length > 0 ? reasons.join(" | ") : "Routine physical condition within normal limits.";
    return { risk, score, reason: reasonStr, action, eta };
}

// API: Fetch All Patients
app.get('/api/patients', (req, res) => {
    db.all("SELECT * FROM patients ORDER BY score DESC, id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API: Submit Triage Assessment
app.post('/api/patients', (req, res) => {
    const { name, age, symptoms, heart_rate, spo2, temp } = req.body;
    
    const hRate = parseInt(heart_rate) || 75;
    const oxygen = parseInt(spo2) || 98;
    const temperature = parseFloat(temp) || 37.0;
    const pAge = parseInt(age) || 30;

    const triage = evaluateTriageEngine(symptoms, pAge, hRate, oxygen, temperature);

    db.run(
        `INSERT INTO patients (name, age, symptoms, heart_rate, spo2, temp, risk_level, score, reason, action, eta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, pAge, symptoms, hRate, oxygen, temperature, triage.risk, triage.score, triage.reason, triage.action, triage.eta],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, name, age: pAge, symptoms, ...triage });
        }
    );
});

app.listen(3000, () => console.log('Triage Server running on http://localhost:3000'));