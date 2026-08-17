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

    return texto

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



                        capaUrl = `https://lh3.googleusercontent.com/d/${fotosCapa.data.files[0].id}`;



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

            detalhes: err.message

        });



    }



});



// ===============================

// API GALERIA

// ===============================



app.get('/api/galeria/:id', async (req, res) => {



    try {



        const folderId = req.params.id;



        const subpastas = await drive.files.list({

    q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name != 'Capa' and trashed = false`,

    fields: 'files(id, name, createdTime)',

    orderBy: 'createdTime desc'

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

// OPEN GRAPH / WHATSAPP

// ===============================



app.get('/g/:slug', async (req, res) => {



    try {



        const response = await drive.files.list({

            q: `'${PASTA_RAIZ_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,

            fields: 'files(id, name)',

        });



        let galeria = null;



        for (const folder of response.data.files) {



            const slug = criarSlug(folder.name);



            if (slug === req.params.slug) {



                galeria = folder;

                break;



            }

        }



        if (!galeria) {



            return res.status(404).send('Galeria não encontrada');



        }



        // ===============================

        // PROCURA IMAGEM DE CAPA

        // ===============================



        const capaFolder = await drive.files.list({

            q: `'${galeria.id}' in parents and name = 'Capa' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,

            fields: 'files(id)',

        });



        let imagem = `${SITE_URL}/preview.jpg`;



        if (capaFolder.data.files.length > 0) {



            const fotosCapa = await drive.files.list({

                q: `'${capaFolder.data.files[0].id}' in parents and mimeType contains 'image/' and trashed = false`,

                fields: 'files(id)',

                pageSize: 1

            });



            if (fotosCapa.data.files.length > 0) {



                imagem = `https://lh3.googleusercontent.com/d/${fotosCapa.data.files[0].id}`;



            }

        }



        const titulo = galeria.name;



        const url = `${SITE_URL}/g/${req.params.slug}`;



        // ===============================

        // HTML OPEN GRAPH

        // ===============================



        res.send(`

<!DOCTYPE html>

<html lang="pt-br">



<head>



<meta charset="UTF-8">



<title>${titulo}</title>



<meta property="og:title" content="${titulo}">

<meta property="og:description" content="Galeria de fotos">

<meta property="og:image" content="${imagem}">

<meta property="og:url" content="${url}">

<meta property="og:type" content="website">



<meta name="twitter:card" content="summary_large_image">



<meta property="og:image:width" content="1200">

<meta property="og:image:height" content="630">



<script>

setTimeout(() => {

    window.location.href = "/?galeria=${req.params.slug}";

}, 300);

</script>



</head>



<body>



</body>



</html>

        `);



    } catch (err) {



        console.error('ERRO OPEN GRAPH:', err);



        res.status(500).send(err.message);



    }



});



// ===============================

// FALLBACK SPA

// ===============================



app.get('*', (req, res) => {

    res.sendFile(path.join(__dirname, '..', 'index.html'));

});



// ===============================

// EXPORT

// ===============================



module.exports = app; 

