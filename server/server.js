// server.js - Colimobis Express server
// Sert l'appli Angular (fichiers statiques) + API de synchronisation CSV

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const net     = require('net');

const app = express();

// --- Chemins ---
const ROOT_DIR = path.resolve(__dirname, '..');
const CSV_PATH = process.env.CSV_PATH || path.join(ROOT_DIR, 'data', 'regimes.csv');
const WWW_PATH = path.join(ROOT_DIR, 'app', 'www', 'browser');
const PORT_FILE = path.join(ROOT_DIR, 'data', '.port');

// --- Configuration ---
const BASE_PORT = parseInt(process.env.PORT, 10) || 8100;
const MAX_PORT  = BASE_PORT + 10;
const DELIMITER = ';';
const CSV_HEADERS = ['_id', 'requestNumber', 'ot', 'rf', 'label', 'state'];
const BOM = '\uFEFF';

// --- Middleware ---
app.use(express.json({ limit: '1mb' }));

// Fichiers statiques Angular (cache long pour assets hashés Angular)
app.use(express.static(WWW_PATH, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// --- Helpers CSV ---

function escapeField(value) {
    const s = value == null ? '' : String(value);
    if (/[;"\r\n]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

function splitCSVLine(line, delimiter) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') {
                current += '"'; i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === delimiter) {
                fields.push(current); current = '';
            } else {
                current += ch;
            }
        }
    }
    fields.push(current);
    return fields;
}

function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return [];
    const dataLines = lines.slice(1);
    return dataLines.map(line => {
        const fields = splitCSVLine(line, DELIMITER);
        const obj = {};
        CSV_HEADERS.forEach((h, i) => { obj[h] = (fields[i] || '').trim(); });
        return obj;
    });
}

function serializeCSV(regimes) {
    const header = CSV_HEADERS.join(DELIMITER);
    const rows = regimes.map(r =>
        CSV_HEADERS.map(h => escapeField(r[h])).join(DELIMITER)
    );
    return BOM + header + '\r\n' + rows.join('\r\n') + '\r\n';
}

// --- Routes API ---

app.get('/api/regimes', (req, res) => {
    try {
        if (!fs.existsSync(CSV_PATH)) {
            return res.json([]);
        }
        const text = fs.readFileSync(CSV_PATH, 'utf-8');
        const regimes = parseCSV(text);
        res.json(regimes);
    } catch (err) {
        console.error('[API] Erreur lecture CSV:', err.message);
        res.status(500).json({ error: 'Impossible de lire le fichier CSV', details: err.message });
    }
});

app.post('/api/regimes', (req, res) => {
    try {
        const regimes = req.body;
        if (!Array.isArray(regimes)) {
            return res.status(400).json({ error: 'Le body doit etre un tableau JSON de regimes' });
        }

        const dir = path.dirname(CSV_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const csv = serializeCSV(regimes);

        const tmpPath = CSV_PATH + '.tmp';
        try {
            fs.writeFileSync(tmpPath, csv, 'utf-8');
            fs.renameSync(tmpPath, CSV_PATH);
        } catch (writeErr) {
            try {
                fs.writeFileSync(CSV_PATH, csv, 'utf-8');
            } catch (directErr) {
                console.error('[API] CSV verrouille (ouvert dans Excel ?):', directErr.message);
                try { fs.unlinkSync(tmpPath); } catch (_) {}
                return res.status(503).json({
                    error: 'Fichier CSV verrouille (peut-etre ouvert dans Excel)',
                    details: directErr.message
                });
            }
        }

        console.log(`[API] CSV mis a jour (${regimes.length} regimes)`);
        res.json({ ok: true, count: regimes.length });
    } catch (err) {
        console.error('[API] Erreur ecriture CSV:', err.message);
        res.status(500).json({ error: 'Impossible d\'ecrire le fichier CSV', details: err.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', csvPath: CSV_PATH });
});

// --- Fallback SPA ---
app.get('*', (req, res) => {
    const indexPath = path.join(WWW_PATH, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send(
            'Application non construite. Lancez setup.ps1 d\'abord.'
        );
    }
});

// --- Recherche de port libre et demarrage ---

function isPortFree(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port, '127.0.0.1');
    });
}

async function findFreePort(start, max) {
    for (let port = start; port <= max; port++) {
        if (await isPortFree(port)) return port;
    }
    return null;
}

async function startServer() {
    const port = await findFreePort(BASE_PORT, MAX_PORT);

    if (!port) {
        console.error('===========================================');
        console.error('  ERREUR : Aucun port disponible');
        console.error(`  Ports testes : ${BASE_PORT} a ${MAX_PORT}`);
        console.error('  Fermez une instance de Colimobis ou');
        console.error('  liberez un port dans cette plage.');
        console.error('===========================================');
        process.exit(1);
    }

    // Ecrire le port dans un fichier pour que les scripts le retrouvent
    const dataDir = path.dirname(PORT_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(PORT_FILE, String(port), 'utf-8');

    app.listen(port, '127.0.0.1', () => {
        console.log('===========================================');
        console.log('  Colimobis - Serveur demarre');
        console.log(`  URL : http://localhost:${port}`);
        console.log(`  CSV : ${CSV_PATH}`);
        if (port !== BASE_PORT) {
            console.log(`  (port ${BASE_PORT} occupe, utilise ${port})`);
        }
        console.log('===========================================');
    });

    // Nettoyage du fichier .port a l'arret
    process.on('SIGINT', () => {
        try { fs.unlinkSync(PORT_FILE); } catch (_) {}
        process.exit(0);
    });
    process.on('SIGTERM', () => {
        try { fs.unlinkSync(PORT_FILE); } catch (_) {}
        process.exit(0);
    });
}

startServer();
