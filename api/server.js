const express = require('express');
const { google } = require('googleapis');
const path = require('path');

const app = express();

app.use(express.json());

// SERVE ARQUIVOS ESTÁTICOS (index.html, style.css, script.js)
app.use(express.static(path.join(__dirname, '..')));

// ===============================
// GOOGLE DRIVE AUTH
// ===============================

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

const auth = new google.auth.GoogleAuth({
    credentials: process.env.GOOGLE_CREDENTIALS
        ? JSON.parse(process.env.GOOGLE_CREDENTIALS)
        : undefined,

    keyFile: process.env.GOOGLE_CREDENTIALS
        ? undefined
        : path.join(__dirname, '../credentials.json'),

    scopes: SCOPES,
});

const drive = google.drive({
    version: 'v3',
    auth
});

// ===============================
// ID DA PASTA RAIZ
// ===============================

const PASTA_RAIZ_ID = '1V0UxuAbra8hN7MnLkjY8ylbdP5jw_59R';

// ===============================
// ROTA PRINCIPAL
// ===============================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ===============================
// API - GALERIAS
// ===============================

app.get('/api/galerias', async (req, res) => {
    try {

        const response = await drive.files.list({
            q: `'${PASTA_RAIZ_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });

        const galerias = await Promise.all(
            response.data.files.map(async (folder) => {

                // PROCURA PASTA "CAPA"
                const capaFolder = await drive.files.list({
                    q: `'${folder.id}' in parents and name = 'Capa' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                    fields: 'files(id)',
                });

                let capaUrl = null;

                if (capaFolder.data.files.length > 0) {

                    const fotosCapa = await drive.files.list({
                        q: `'${capaFolder.data.files[0].id}' in parents and mimeType contains 'image/' and trashed = false`,
                        fields: 'files(id)',
                        pageSize: 1
                    });

                    if (fotosCapa.data.files.length > 0) {

                        // URL DIRETA GOOGLE
                        capaUrl = `https://lh3.googleusercontent.com/d/${fotosCapa.data.files[0].id}`;

                    }
                }

                return {
                    id: folder.id,
                    nome: folder.name,
                    capaUrl
                };
            })
        );

        res.json(galerias);

    } catch (err) {

        console.error('ERRO /api/galerias:', err);

        res.status(500).json({
            erro: 'Erro ao carregar galerias',
            detalhes: err.message
        });
    }
});

// ===============================
// API - GALERIA INTERNA
// ===============================

app.get('/api/galeria/:id', async (req, res) => {

    try {

        const folderId = req.params.id;

        // LISTA SUBPASTAS
        const subpastas = await drive.files.list({
            q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name != 'Capa' and trashed = false`,
            fields: 'files(id, name)',
        });

        const secoes = await Promise.all(

            subpastas.data.files.map(async (sub) => {

                const fotos = await drive.files.list({
                    q: `'${sub.id}' in parents and mimeType contains 'image/' and trashed = false`,
                    fields: 'files(id)',
                });

                return {
                    titulo: sub.name,

                    fotos: fotos.data.files.map(
                        f => `https://lh3.googleusercontent.com/d/${f.id}`
                    )
                };
            })
        );

        res.json({ secoes });

    } catch (err) {

        console.error('ERRO /api/galeria/:id:', err);

        res.status(500).json({
            erro: 'Erro ao carregar galeria',
            detalhes: err.message
        });
    }
});

// ===============================
// FALLBACK SPA
// ===============================

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ===============================
// EXPORT VERCEL
// ===============================

module.exports = app;
