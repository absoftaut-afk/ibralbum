const express = require('express');
const { google } = require('googleapis');
const path = require('path');

const app = express();

// Definição dos Escopos
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// CONFIGURAÇÃO DINÂMICA: Lê da Vercel (Variável de Ambiente)
const auth = new google.auth.GoogleAuth({
    credentials: process.env.GOOGLE_CREDENTIALS 
        ? JSON.parse(process.env.GOOGLE_CREDENTIALS) 
        : undefined,
    keyFile: process.env.GOOGLE_CREDENTIALS 
        ? undefined 
        : path.join(__dirname, '../credentials.json'), // Caminho ajustado caso teste local
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

// ID DA PASTA RAIZ
const PASTA_RAIZ_ID = '1V0UxuAbra8hN7MnLkjY8ylbdP5jw_59R';

// Rotas da API
app.get('/api/galerias', async (req, res) => {
    try {
        const response = await drive.files.list({
            q: `'${PASTA_RAIZ_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });

        const pastas = await Promise.all(response.data.files.map(async (folder) => {
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
                    // Link corrigido com ${id}
                    capaUrl = `https://lh3.googleusercontent.com/d/$${fotosCapa.data.files[0].id}`;
                }
            }
            return { id: folder.id, nome: folder.name, capaUrl: capaUrl };
        }));
        res.json(pastas);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

app.get('/api/galeria/:id', async (req, res) => {
    try {
        const folderId = req.params.id;
        const subpastas = await drive.files.list({
            q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name != 'Capa' and trashed = false`,
            fields: 'files(id, name)',
        });

        const secoes = await Promise.all(subpastas.data.files.map(async (sub) => {
            const fotos = await drive.files.list({
                q: `'${sub.id}' in parents and mimeType contains 'image/' and trashed = false`,
                fields: 'files(id)',
            });
            return {
                titulo: sub.name,
                // Link corrigido com ${f.id}
                fotos: fotos.data.files.map(f => `https://lh3.googleusercontent.com/d/$${f.id}`)
            };
        }));
        res.json({ secoes });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// IMPORTANTE PARA VERCEL: Exportar o app em vez de usar app.listen
module.exports = app;
