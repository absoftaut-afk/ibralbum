let fotosDaGaleria = [];
let indiceAtual = 0;

// ==========================================
// FUNÇÃO SLUG
// ==========================================

function criarSlug(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ==========================================
// INICIAR SITE
// ==========================================

async function iniciarSite() {

    const container = document.querySelector('.grid-passgallery');

    if (!container) return;

    try {

        const resposta = await fetch('/api/galerias');

        const galerias = await resposta.json();

        container.innerHTML = '';

        galerias.forEach(galeria => {

            if (galeria.capaUrl) {

                const card = document.createElement('div');

                card.className = 'galeria-card';

                card.innerHTML = `
                    <div class="capa-container">
                        <img src="${galeria.capaUrl}">
                    </div>

                    <div class="galeria-titulo">
                        <h3>${galeria.nome}</h3>
                    </div>
                `;

                card.onclick = () => abrirGaleria(
                    galeria.id,
                    galeria.nome
                );

                container.appendChild(card);

            }

        });

    } catch (e) {

        console.error("Erro ao iniciar site:", e);

    }

}

// ==========================================
// ABRIR GALERIA
// ==========================================

window.abrirGaleria = async function(id, nome) {

    const slug = criarSlug(nome);

    // ALTERA URL
    window.history.pushState(
        {},
        '',
        `/?galeria=${slug}`
    );

    const mainArea = document.getElementById('conteudo-dinamico');

    mainArea.innerHTML = `
        <div style="text-align:center; padding:100px; letter-spacing:3px;">
            CARREGANDO ${nome}...
        </div>
    `;

    window.scrollTo(0, 0);

    try {

        const res = await fetch(`/api/galeria/${id}`);

        if (!res.ok) {
            throw new Error('Erro na resposta do servidor');
        }

        const dados = await res.json();

        fotosDaGaleria = [];

        let html = `
            <nav class="galeria-interna-nav">

                <a href="/" style="color:black; font-weight:bold;">
                    &larr; VOLTAR
                </a>
        `;

        // MENU SEÇÕES
        if (dados.secoes && dados.secoes.length > 0) {

            dados.secoes.forEach((s, i) => {

                html += `
                    <a href="#s-${i}">
                        ${s.titulo}
                    </a>
                `;

            });

            html += `</nav>`;

            // SEÇÕES
            dados.secoes.forEach((secao, i) => {

                // MODIFICAÇÃO AQUI: Inverte o array de fotos da seção para as mais recentes virem primeiro
                const fotosInvertidas = secao.fotos ? [...secao.fotos].reverse() : [];

                const startIndex = fotosDaGaleria.length;

                fotosDaGaleria.push(...fotosInvertidas);

                html += `
                    <section id="s-${i}" class="secao-fotos">

                        <h2 class="secao-titulo">
                            ${secao.titulo}
                        </h2>

                        <div class="lista-fotos-mosaico">

                            ${fotosInvertidas.map((url, imgIdx) => `

                                <img
                                    src="${url}"
                                    loading="lazy"
                                    onclick="abrirLightbox(${startIndex + imgIdx})"
                                >

                            `).join('')}

                        </div>

                    </section>
                `;

            });

        } else {

            html += `
                </nav>

                <div style="text-align:center; padding:50px;">
                    Nenhuma subpasta de fotos encontrada.
                </div>
            `;

        }

        mainArea.innerHTML = html;

    } catch (e) {

        console.error("Erro ao abrir galeria:", e);

        mainArea.innerHTML = `
            <div style="text-align:center; padding:100px;">
                Erro ao carregar fotos desta galeria.
            </div>
        `;

    }

}

// ==========================================
// LIGHTBOX
// ==========================================

function abrirLightbox(index) {

    indiceAtual = index;

    const lb = document.getElementById('lightbox');

    const lbImg = document.getElementById('lightbox-img');

    lbImg.src = fotosDaGaleria[indiceAtual];

    lb.style.display = 'flex';

    document.body.style.overflow = 'hidden';

}

function fecharLightbox() {

    document.getElementById('lightbox').style.display = 'none';

    document.body.style.overflow = 'auto';

}

function mudarFoto(direcao) {

    indiceAtual += direcao;

    if (indiceAtual < 0) {
        indiceAtual = fotosDaGaleria.length - 1;
    }

    if (indiceAtual >= fotosDaGaleria.length) {
        indiceAtual = 0;
    }

    document.getElementById('lightbox-img').src =
        fotosDaGaleria[indiceAtual];

}

// ==========================================
// DOM READY
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {

    await iniciarSite();

    // LIGHTBOX
    document.getElementById('close-btn').onclick = fecharLightbox;

    document.getElementById('prev-btn').onclick = () => mudarFoto(-1);

    document.getElementById('next-btn').onclick = () => mudarFoto(1);

    // TECLADO
    document.addEventListener('keydown', (e) => {

        if (
            document.getElementById('lightbox').style.display === 'flex'
        ) {

            if (e.key === "ArrowLeft") {
                mudarFoto(-1);
            }

            if (e.key === "ArrowRight") {
                mudarFoto(1);
            }

            if (e.key === "Escape") {
                fecharLightbox();
            }

        }

    });

    // FECHAR LIGHTBOX
    const lb = document.getElementById('lightbox');

    if (lb) {

        lb.onclick = (e) => {

            if (e.target.id === 'lightbox') {

                fecharLightbox();

            }

        };

    }

    // ==========================================
    // ABRIR GALERIA VIA URL
    // ==========================================

    const params = new URLSearchParams(window.location.search);

    const galeriaSlug = params.get('galeria');

    if (galeriaSlug) {

        try {

            const response = await fetch('/api/galerias');

            const galerias = await response.json();

            const galeria = galerias.find(g => {

                return criarSlug(g.nome) === galeriaSlug;

            });

            if (galeria) {

                await abrirGaleria(
                    galeria.id,
                    galeria.nome
                );

            }

        } catch (err) {

            console.error(
                'ERRO AO ABRIR GALERIA:',
                err
            );

        }

    }

});
