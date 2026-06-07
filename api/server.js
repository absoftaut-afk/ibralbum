const express = require('express');
const { google } = require('googleapis');
const path = require('path');

const app = express();

app.use(express.json());

// ===============================
// SERVE ARQUIVOS ESTÁTICOS
// ===============================

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
// CONFIG
// ===============================

const PASTA_RAIZ_ID = '1V0UxuAbra8hN7MnLkjY8ylbdP5jw_59R';

const SITE_URL = 'https://ibralbum.vercel.app';

// ===============================
// FUNÇÃO SLUG
// ===============================

function criarSlug(texto) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ===============================
// HOME
// ===============================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ===============================
// API GALERIAS
// ===============================

app.get('/api/galerias', async (req, res) => {

    try {

        const response = await drive.files.list({
            q: `'${PASTA_RAIZ_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });

        const galerias = await Promise.all(

            response.data.files.map(async (folder) => {

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

                        // CORREÇÃO: Adicionado o $ antes das chaves para processar a variável corretamente
                        capaUrl = `http://googleusercontent.com/profile/picture/${fotosCapa.data.files[0].id}`;

                    }
                }

                return {
                    id: folder.id,
                    nome: folder.name,
                    slug: criarSlug(folder.name),
                    capaUrl
                };

            })
        );

        res.json(galerias);

    } catch (err) {

        console.error('ERRO /api/galerias:', err);

        res.status(500).json({
            erro: 'Erro ao carregar galerias',
            detalhes: err.
