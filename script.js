let fotosDaGaleria = []; 
let indiceAtual = 0;

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
                    <div class="capa-container"><img src="${galeria.capaUrl}"></div>
                    <div class="galeria-titulo"><h3>${galeria.nome}</h3></div>
                `;
                card.onclick = () => abrirGaleria(galeria.id, galeria.nome);
                container.appendChild(card);
            }
        });
    } catch (e) { console.error("Erro ao iniciar site:", e); }
}

async function abrirGaleria(id, nome) {

    const slug = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

window.history.pushState({}, '', `/g/${slug}`);
    
    const mainArea = document.getElementById('conteudo-dinamico');
    mainArea.innerHTML = `<div style="text-align:center; padding:100px; letter-spacing:3px;">CARREGANDO ${nome}...</div>`;
    window.scrollTo(0, 0);

    try {
        const res = await fetch(`/api/galeria/${id}`);
        if (!res.ok) throw new Error('Erro na resposta do servidor');
        
        const dados = await res.json();
        fotosDaGaleria = [];

        let html = `<nav class="galeria-interna-nav">
                        <a href="javascript:location.reload()" style="color:black; font-weight:bold;">← VOLTAR</a>`;
        
        if(dados.secoes && dados.secoes.length > 0) {
            dados.secoes.forEach((s, i) => html += `<a href="#s-${i}">${s.titulo}</a>`);
            html += `</nav>`;

            dados.secoes.forEach((secao, i) => {
                const startIndex = fotosDaGaleria.length;
                fotosDaGaleria.push(...secao.fotos);

                html += `
                    <section id="s-${i}" class="secao-fotos">
                        <h2 class="secao-titulo">${secao.titulo}</h2>
                        <div class="lista-fotos-mosaico">
                            ${secao.fotos.map((url, imgIdx) => `
                                <img src="${url}" onclick="abrirLightbox(${startIndex + imgIdx})" loading="lazy">
                            `).join('')}
                        </div>
                    </section>`;
            });
        } else {
            html += `</nav><div style="text-align:center; padding:50px;">Nenhuma subpasta de fotos encontrada.</div>`;
        }

        mainArea.innerHTML = html;
    } catch (e) { 
        console.error("Erro ao abrir galeria:", e);
        mainArea.innerHTML = `<div style="text-align:center; padding:100px;">Erro ao carregar fotos desta galeria.</div>`;
    }
}

// --- FUNÇÕES DO LIGHTBOX ---
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
    if (indiceAtual < 0) indiceAtual = fotosDaGaleria.length - 1;
    if (indiceAtual >= fotosDaGaleria.length) indiceAtual = 0;
    document.getElementById('lightbox-img').src = fotosDaGaleria[indiceAtual];
}

document.addEventListener('DOMContentLoaded', () => {
    iniciarSite();
    document.getElementById('close-btn').onclick = fecharLightbox;
    document.getElementById('prev-btn').onclick = () => mudarFoto(-1);
    document.getElementById('next-btn').onclick = () => mudarFoto(1);
    
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('lightbox').style.display === 'flex') {
            if (e.key === "ArrowLeft") mudarFoto(-1);
            if (e.key === "ArrowRight") mudarFoto(1);
            if (e.key === "Escape") fecharLightbox();
        }
    });

    const lb = document.getElementById('lightbox');
    if(lb) lb.onclick = (e) => { if (e.target.id === 'lightbox') fecharLightbox(); };
});
