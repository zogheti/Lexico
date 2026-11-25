// ==========================================
// 1. CONFIGURAZIONE E STATO DI GIOCO
// ==========================================
const LETTERE = {
    A: { quantità: 14, punteggio: 1 },
    B: { quantità: 3, punteggio: 5 },
    C: { quantità: 6, punteggio: 2 },
    D: { quantità: 3, punteggio: 5 },
    E: { quantità: 11, punteggio: 1 },
    F: { quantità: 3, punteggio: 5 },
    G: { quantità: 2, punteggio: 8 },
    H: { quantità: 1, punteggio: 8 },
    I: { quantità: 12, punteggio: 1 },
    L: { quantità: 5, punteggio: 3 },
    M: { quantità: 5, punteggio: 3 },
    N: { quantità: 5, punteggio: 3 },
    O: { quantità: 15, punteggio: 1 },
    P: { quantità: 3, punteggio: 5 },
    Q: { quantità: 1, punteggio: 9 },
    R: { quantità: 6, punteggio: 2 },
    S: { quantità: 6, punteggio: 2 },
    T: { quantità: 6, punteggio: 2 },
    U: { quantità: 5, punteggio: 3 },
    V: { quantità: 3, punteggio: 5 },
    Z: { quantità: 2, punteggio: 8 }
};

const VOCALI = ["A", "E", "I", "O", "U"];
const DIFFICOLTA_VALIDE = ["facile", "medio", "difficile", "estremo"];
const BONUS_LETTERA = {
    4: "+5",
    6: "*3",
    9: "x3",
    10: "x2",
    11: "x2"
};
const MAX_SLOT = 12;
const OBIETTIVO_INIZIALE = 100;
const RIMESCOLA_MAX = 3;
const TURNI_INIZIALI = 7;
const MAX_PAROLE_SALVATE = 5;

let sacchetto = [];
let tessereDisponibili = [];
let parolaCostruita = new Array(MAX_SLOT).fill(null);
let punteggioTotale = 0;
let punteggioRound = 0;
let turniRimasti = TURNI_INIZIALI;
let turniUsatiQuestoRound = 0;
let roundPassati = 0;
let obiettivo = OBIETTIVO_INIZIALE;
let lettereUsateQuestoLivello = 0;
let scarti = [];
let parolePerRound = [];
let parolaPunteggioMassimo = { parola: "", punteggio: 0 };
let rimescolaUsato = 0;
let numeroBonusTurno = 0;
let sogliaProssimoTurnoBonus = 50;
let turniPerRound = TURNI_INIZIALI;
let difficolta = "facile";
let incrementoSogliaTurno = 10;
let base = 50;
let soglieBonus = [];
let livelloBonusCorrente = 0;
let parolaSalvata = null;
let paroleSalvate = [];
let punteggioParolaSalvata = 0;

// ==========================================
// 2. INIZIALIZZAZIONE E PERSISTENZA
// ==========================================
function aggiornaStatoPulsanteCaricaMenu() {
    const btnCarica = document.getElementById("menu-load-game");
    if (!btnCarica) return;

    const esisteSalvataggio = Boolean(localStorage.getItem("statoPartita"));
    btnCarica.disabled = !esisteSalvataggio;
    btnCarica.title = esisteSalvataggio
        ? "Riprendi la partita salvata"
        : "Nessuna partita salvata disponibile";
}

function mostraSchermataIniziale() {
    const startScreen = document.getElementById("start-screen");
    const gameContainer = document.getElementById("game-container");
    if (startScreen) startScreen.style.display = "flex";
    if (gameContainer) gameContainer.style.display = "none";
    aggiornaStatoPulsanteCaricaMenu();
}

function mostraAreaDiGioco() {
    const startScreen = document.getElementById("start-screen");
    const gameContainer = document.getElementById("game-container");
    if (startScreen) startScreen.style.display = "none";
    if (gameContainer) gameContainer.style.display = "block";
}

function inizializzaPulsanteRimescola() {
    const rimescolaBtn = document.getElementById("rimescola");
    if (!rimescolaBtn) return;

    rimescolaBtn.innerHTML = "";

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";

    const counterSpan = document.createElement("span");
    counterSpan.id = "rimescola-counter";
    counterSpan.textContent = RIMESCOLA_MAX - rimescolaUsato;
    counterSpan.style.fontSize = "16px";
    counterSpan.style.fontWeight = "bold";

    const iconSpan = document.createElement("span");
    iconSpan.classList.add("rimescola-icon");
    iconSpan.textContent = "⟳";
    iconSpan.style.fontSize = "18px";
    iconSpan.style.marginTop = "2px";

    container.append(counterSpan, iconSpan);
    rimescolaBtn.appendChild(container);
}

function avviaNuovaPartita() {
    roundPassati = 0;
    punteggioTotale = 0;
    parolePerRound = [];
    parolaPunteggioMassimo = { parola: "", punteggio: 0 };
    sacchetto = [];
    tessereDisponibili = [];
    parolaCostruita = new Array(MAX_SLOT).fill(null);
    punteggioRound = 0;
    turniUsatiQuestoRound = 0;
    turniPerRound = TURNI_INIZIALI;
    turniRimasti = TURNI_INIZIALI;
    obiettivo = OBIETTIVO_INIZIALE;
    lettereUsateQuestoLivello = 0;
    scarti = [];
    rimescolaUsato = 0;
    numeroBonusTurno = 0;
    soglieBonus = generaSoglieBonus(difficolta);
    livelloBonusCorrente = 0;
    paroleSalvate = [];

    mostraAreaDiGioco()
    generaSacchetto();
    mostraSlot();
    pescaTessere();
    mostraTessere();
    aggiornaInfoGioco();
    aggiornaRimescolaBtn();
}

function impostaDifficolta(d) {
    difficolta = d;

    const configurazioni = {
        facile: { base: 6000, incremento: 1500 },
        medio: { base: 7000, incremento: 2000 },
        difficile: { base: 8000, incremento: 2500 },
        estremo: { base: 10000, incremento: 3000 }
    };

    const config = configurazioni[difficolta] || configurazioni.difficile;
    base = config.base;
    sogliaProssimoTurnoBonus = config.base;
    incrementoSogliaTurno = config.incremento;
    numeroBonusTurno = 0;

    document.getElementById("difficulty-modal").style.display = "none";
    avviaNuovaPartita();
}

function selezionaDifficolta(livello) {
    impostaDifficolta(livello);
    document.getElementById("difficulty-modal").style.display = "none";
    avviaNuovaPartita();
}

function salvaStatoPartita() {
    const stato = {
        roundPassati,
        punteggioTotale,
        parolePerRound,
        parolaPunteggioMassimo,
        sacchetto,
        tessereDisponibili,
        parolaCostruita,
        punteggioRound,
        turniRimasti,
        turniUsatiQuestoRound,
        obiettivo,
        lettereUsateQuestoLivello,
        scarti,
        rimescolaUsato,
        sogliaProssimoTurnoBonus,
        turniPerRound,
        difficolta,
        livelloBonusCorrente,
        paroleSalvate
    };
    localStorage.setItem("statoPartita", JSON.stringify(stato));
}

function caricaStatoPartita() {
    const statoJSON = localStorage.getItem("statoPartita");
    if (!statoJSON) return false;

    const stato = JSON.parse(statoJSON);

    roundPassati = stato.roundPassati ?? 0;
    punteggioTotale = stato.punteggioTotale ?? 0;
    parolePerRound = stato.parolePerRound ?? [];
    parolaPunteggioMassimo = stato.parolaPunteggioMassimo ?? { parola: "", punteggio: 0 };
    sacchetto = stato.sacchetto ?? [];
    tessereDisponibili = stato.tessereDisponibili ?? [];
    parolaCostruita = stato.parolaCostruita ?? new Array(MAX_SLOT).fill(null);
    punteggioRound = stato.punteggioRound ?? 0;
    turniRimasti = stato.turniRimasti ?? 0;
    turniUsatiQuestoRound = stato.turniUsatiQuestoRound ?? 0;
    obiettivo = stato.obiettivo ?? OBIETTIVO_INIZIALE;
    lettereUsateQuestoLivello = stato.lettereUsateQuestoLivello ?? 0;
    scarti = stato.scarti ?? [];
    rimescolaUsato = stato.rimescolaUsato ?? 0;
    sogliaProssimoTurnoBonus = stato.sogliaProssimoTurnoBonus ?? 5000;
    turniPerRound = stato.turniPerRound ?? TURNI_INIZIALI;
    difficolta = stato.difficolta ?? "facile";
    soglieBonus = generaSoglieBonus(difficolta);
    livelloBonusCorrente = stato.livelloBonusCorrente ?? 0;
    paroleSalvate = stato.paroleSalvate ?? [];

    aggiornaInterfacciaDaStato();
    mostraAreaDiGioco();
    return true;
}

function aggiornaInterfacciaDaStato() {
    mostraSlot();
    mostraTessere();
    aggiornaInfoGioco();
    aggiornaRimescolaBtn();
}

let audioCtx = null;

const STORAGE_AUDIO_KEY = "scarabeo_audio_abilitato";
let audioAbilitato = localStorage.getItem(STORAGE_AUDIO_KEY) !== "false";
function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => { });
    }
    return audioCtx;
}

function playSuonoClick() {
    if (!audioAbilitato) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.045);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.055);
}

function playSuonoLettera(slotIndex = 0) {
    if (!audioAbilitato) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Leggera progressione intonata in base allo slot (0..11)
    const freqBase = 440 * Math.pow(2, (slotIndex % 12) / 18);

    osc.type = "sine";
    osc.frequency.setValueAtTime(freqBase, now);
    osc.frequency.exponentialRampToValueAtTime(freqBase * 1.12, now + 0.07);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.085);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
}

function playSuonoConfermaParola() {
    if (!audioAbilitato) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Arpeggio maggiore vivace (C5, E5, G5, C6)
    const note = [523.25, 659.25, 783.99, 1046.5];

    note.forEach((freq, idx) => {
        const start = now + idx * 0.065;
        const duration = idx === note.length - 1 ? 0.22 : 0.11;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx === note.length - 1 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + duration + 0.02);
    });
}



function aggiornaPulsanteAudio() {
    const btn = document.getElementById("toggle-sound");
    if (!btn) return;

    btn.textContent = audioAbilitato ? "🔊" : "🔇";
    btn.title = audioAbilitato ? "Disattiva audio" : "Attiva audio";
    btn.setAttribute("aria-pressed", String(!audioAbilitato));
    btn.classList.toggle("muted", !audioAbilitato);
}

function toggleAudio() {
    audioAbilitato = !audioAbilitato;
    localStorage.setItem(STORAGE_AUDIO_KEY, String(audioAbilitato));
    aggiornaPulsanteAudio();

    if (audioAbilitato) {
        playSuonoClick();
    }
}

// ==========================================
// 3. SACCHETTO, TESSERE E SLOT
// ==========================================
function generaSacchetto() {
    sacchetto = [];
    for (const [lettera, info] of Object.entries(LETTERE)) {
        for (let i = 0; i < info.quantità; i++) {
            sacchetto.push(lettera);
        }
    }
}

function reintegraScarti() {
    if (sacchetto.length < 40 && scarti.length > 0) {
        sacchetto.push(...scarti);
        scarti = [];
        console.log("♻️ Scarti reintegrati nel sacchetto.");
    }
}

function getSimboloTessera(tessera) {
    return typeof tessera === "string" ? tessera : tessera?.lettera || "";
}

function contaDistribuzione(tessere) {
    let contaVocali = 0;
    let contaConsonanti = 0;

    tessere.forEach(tessera => {
        const lettera = getSimboloTessera(tessera);
        if (!lettera) return;

        if (VOCALI.includes(lettera)) {
            contaVocali++;
        } else {
            contaConsonanti++;
        }
    });

    return { vocali: contaVocali, consonanti: contaConsonanti };
}

function pescaTessere(isAutomatic = false) {
    if (!isAutomatic) reintegraScarti();

    tessereDisponibili = [];
    for (let i = 0; i < 16 && sacchetto.length > 0; i++) {
        const index = Math.floor(Math.random() * sacchetto.length);
        tessereDisponibili.push(sacchetto.splice(index, 1)[0]);
    }

    console.log("🎲 Nuove tessere pescate:", tessereDisponibili.map(getSimboloTessera).join(", "));
}

function pescaSoloVuotiConControllo() {
    parolaCostruita.forEach(item => {
        if (item && sacchetto.length > 0) {
            const nuovaIndex = Math.floor(Math.random() * sacchetto.length);
            tessereDisponibili[item.indiceTessera] = sacchetto.splice(nuovaIndex, 1)[0];
        }
    });

    const { vocali, consonanti } = contaDistribuzione(tessereDisponibili);
    console.log("Set attuale:", tessereDisponibili.map(getSimboloTessera).join(", "));
    console.log(`→ Vocali: ${vocali}, Consonanti: ${consonanti}`);

    if (vocali < 3 || consonanti < 3) {
        console.warn("❌ Distribuzione non valida. Attivazione rimescolo automatico.");
        rimescolaTessereAutomatico();
        mostraModaleRimescoloAutomatico(vocali, consonanti);
    } else {
        console.log("✅ Distribuzione valida. Nessun rimescolo necessario.");
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function rimescolaTessere() {
    if (rimescolaUsato >= RIMESCOLA_MAX) return;

    sacchetto.push(...tessereDisponibili, ...scarti);
    tessereDisponibili = [];
    scarti = [];

    shuffleArray(sacchetto);
    pescaTessere();
    mostraTessere();
    svuotaParoleSalvate();
    salvaStatoPartita();

    rimescolaUsato++;
    aggiornaRimescolaBtn();
}

function mostraModaleRimescoloAutomatico(vocali, consonanti) {
    const messaggioEl = document.getElementById("auto-shuffle-message");
    if (messaggioEl) {
        messaggioEl.innerHTML = `⚠️ Combinazione sfortunata: solo <strong>${vocali}</strong> vocale/i e <strong>${consonanti}</strong> consonante/i.<br>Le tessere sono state rimescolate automaticamente.`;
    }
    document.getElementById("auto-shuffle-modal").style.display = "flex";
}

function rimescolaTessereAutomatico() {
    sacchetto.push(...tessereDisponibili);
    tessereDisponibili = [];
    pescaTessere(true);
    mostraTessere();
}

function getInfoTesseraPerSlot(tessera, letteraFallback) {
    const isOggettoBonus = typeof tessera === "object" && tessera !== null;
    const lettera = isOggettoBonus ? tessera.lettera : letteraFallback;

    if (isOggettoBonus) {
        if (tessera.tipoBonus === "additivo") {
            return {
                lettera,
                puntiLabel: `${tessera.valore}`,
                classeBonus: "bonus-additivo"
            };
        }
        if (tessera.tipoBonus === "moltiplicatore") {
            return {
                lettera,
                puntiLabel: `x${tessera.moltiplicatore}`,
                classeBonus: "bonus-moltiplicatore"
            };
        }
    }

    return {
        lettera,
        puntiLabel: String(LETTERE[lettera]?.punteggio ?? ""),
        classeBonus: null
    };
}

function renderizzaContenutoSlot(slot, index) {
    slot.classList.remove("occupato", "bonus-additivo", "bonus-moltiplicatore");
    delete slot.dataset.punti;

    const letteraSpan = slot.querySelector(".slot-lettera");
    const bonusSpan = slot.querySelector(".slot-bonus");
    const elem = parolaCostruita[index];

    if (!elem) {
        if (letteraSpan) letteraSpan.textContent = "";
        if (bonusSpan) bonusSpan.textContent = BONUS_LETTERA[index] || "";
        return;
    }

    const tessera = tessereDisponibili[elem.indiceTessera];
    const info = getInfoTesseraPerSlot(tessera, elem.lettera);

    slot.classList.add("occupato");
    if (info.classeBonus) {
        slot.classList.add(info.classeBonus);
    }
    if (info.puntiLabel !== "") {
        slot.dataset.punti = info.puntiLabel;
    }

    if (letteraSpan) letteraSpan.textContent = info.lettera;
    if (bonusSpan) bonusSpan.textContent = BONUS_LETTERA[index] || "";
}

function mostraSlot() {
    const container = document.getElementById("word-slots");
    container.innerHTML = "";

    for (let i = 0; i < MAX_SLOT; i++) {
        const slot = document.createElement("div");
        slot.className = "slot";
        slot.dataset.index = i;

        const letteraSpan = document.createElement("span");
        letteraSpan.className = "slot-lettera";

        const bonusSpan = document.createElement("span");
        bonusSpan.className = "slot-bonus bonus";

        slot.append(letteraSpan, bonusSpan);
        renderizzaContenutoSlot(slot, i);
        container.appendChild(slot);
    }
}

function inserisciLettera(lettera, indiceTessera, elementoDiv) {
    if (parolaCostruita.some(p => p?.indiceTessera === indiceTessera)) return;

    const indexSlot = parolaCostruita.findIndex(el => el === null);
    if (indexSlot !== -1) {
        parolaCostruita[indexSlot] = { lettera, indiceTessera };
        const slot = document.querySelector(`.slot[data-index='${indexSlot}']`);
        if (slot) renderizzaContenutoSlot(slot, indexSlot);
        elementoDiv.classList.add("usata");
    }

    aggiornaPunteggioLive();
    playSuonoLettera(indexSlot);
}

function rimuoviUltimaLettera() {
    const lastIndex = parolaCostruita
        .map((el, idx) => ({ el, idx }))
        .filter(obj => obj.el !== null)
        .map(obj => obj.idx)
        .pop();

    if (lastIndex !== undefined) {
        parolaCostruita[lastIndex] = null;
        const slot = document.querySelector(`.slot[data-index='${lastIndex}']`);
        if (slot) renderizzaContenutoSlot(slot, lastIndex);
        mostraTessere();
    }

    aggiornaPunteggioLive();
    playSuonoLettera(indexSlot);
}

function mostraTessere() {
    const griglia = document.getElementById("tiles-grid");
    griglia.innerHTML = "";

    tessereDisponibili.forEach((tessera, index) => {
        const div = document.createElement("div");
        div.className = "tile";

        const isOggettoBonus = typeof tessera === "object" && tessera !== null;
        const lettera = isOggettoBonus ? tessera.lettera : tessera;
        div.textContent = lettera;

        if (isOggettoBonus) {
            div.dataset.punti = tessera.valore;
            if (tessera.tipoBonus === "additivo") {
                div.classList.add("bonus-additivo");
                div.dataset.punti = tessera.valore;
            } else if (tessera.tipoBonus === "moltiplicatore") {
                div.classList.add("bonus-moltiplicatore");
                div.dataset.punti = `x${tessera.moltiplicatore}`;
            }
        } else {
            div.dataset.punti = LETTERE[lettera]?.punteggio || 0;
        }

        const giaUsata = parolaCostruita.some(p => p?.indiceTessera === index);
        if (giaUsata) {
            div.classList.add("usata");
        } else {
            div.addEventListener("click", () => inserisciLettera(lettera, index, div));
        }

        griglia.appendChild(div);
    });
}

function getParolaDaSlot() {
    return parolaCostruita.map(obj => (obj ? obj.lettera : "")).join("");
}

// ==========================================
// 4. PUNTEGGIO E VALIDAZIONE PAROLA
// ==========================================
function getBonusLunghezzaAdditivi(lettereUsate, haSlot9, haSlot10, haSlot11) {
    const bonus = [];
    if (lettereUsate >= 10 || haSlot9) bonus.push(3);
    if (haSlot10) bonus.push(2);
    if (haSlot11) bonus.push(2);
    return bonus;
}

function calcolaPunteggio() {
    let sommaLettere = 0;
    let moltiplicatoreLettere = 0;
    let lettereUsate = 0;
    let haSlot9 = false;
    let haSlot10 = false;
    let haSlot11 = false;

    parolaCostruita.forEach((elem, i) => {
        if (!elem) return;

        lettereUsate++;
        if (i === 9) haSlot9 = true;
        if (i === 10) haSlot10 = true;
        if (i === 11) haSlot11 = true;

        const { lettera, indiceTessera } = elem;
        let punti = LETTERE[lettera]?.punteggio || 0;
        const tessera = tessereDisponibili[indiceTessera];

        if (typeof tessera === "object" && tessera !== null) {
            if (tessera.tipoBonus === "additivo") {
                punti = tessera.valore || punti;
            } else if (tessera.tipoBonus === "moltiplicatore") {
                moltiplicatoreLettere += tessera.moltiplicatore;
            }
        }

        if (i === 4) punti += 5;
        if (i === 6) punti *= 3;

        sommaLettere += punti;
    });

    if (moltiplicatoreLettere === 0) moltiplicatoreLettere = 1;

    const bonusAdditivi = getBonusLunghezzaAdditivi(lettereUsate, haSlot9, haSlot10, haSlot11);
    const moltiplicatoreBonusLunghezza = bonusAdditivi.length > 0
        ? bonusAdditivi.reduce((acc, val) => acc + val, 0)
        : 1;

    return sommaLettere * lettereUsate * moltiplicatoreLettere * moltiplicatoreBonusLunghezza;
}

function calcolaPunteggioConDettagli() {
    let sommaLettere = 0;
    let lettereUsate = 0;
    let haSlot9 = false;
    let haSlot10 = false;
    let haSlot11 = false;
    const bonusLettere = [];
    const dettagliLettere = [];
    const dettagliBonus = [];

    parolaCostruita.forEach((elem, i) => {
        if (!elem) return;

        const { lettera, indiceTessera } = elem;
        lettereUsate++;
        if (i === 9) haSlot9 = true;
        if (i === 10) haSlot10 = true;
        if (i === 11) haSlot11 = true;

        const tessera = tessereDisponibili[indiceTessera];
        const isOggettoBonus = typeof tessera === "object" && tessera !== null;

        // 1. Valore di partenza (valore verde se additiva, altrimenti punteggio base lettera)
        let punti = isOggettoBonus && tessera.tipoBonus === "additivo"
            ? (tessera.valore ?? LETTERE[lettera]?.punteggio ?? 0)
            : (LETTERE[lettera]?.punteggio ?? 0);

        // 2. Bonus posizionali dello slot
        if (i === 4) punti += 5;
        if (i === 6) punti *= 3;

        // 3. Eventuale tessera moltiplicatrice (gialla)
        if (isOggettoBonus && tessera.tipoBonus === "moltiplicatore") {
            const moltiplicatore = tessera.moltiplicatore || 1;
            bonusLettere.push(moltiplicatore);
            dettagliBonus.push(`x${moltiplicatore}`);
        }

        dettagliLettere.push(punti);
        sommaLettere += punti;
    });

    const sommaMoltiplicatori = bonusLettere.length > 0
        ? bonusLettere.reduce((acc, val) => acc + val, 0)
        : 1;

    const bonusAdditivi = getBonusLunghezzaAdditivi(lettereUsate, haSlot9, haSlot10, haSlot11);
    const sommaBonusLunghezza = bonusAdditivi.length > 0
        ? bonusAdditivi.reduce((acc, val) => acc + val, 0)
        : 1;

    const punteggioFinale = sommaLettere * lettereUsate * sommaMoltiplicatori * sommaBonusLunghezza;

    let formula = `(${dettagliLettere.join(" + ")}) x ${lettereUsate}`;
    if (dettagliBonus.length > 0) {
        formula += ` x (${dettagliBonus.join(" + ")})`;
    }
    if (bonusAdditivi.length === 1) {
        formula += ` x ${bonusAdditivi[0]}`;
    } else if (bonusAdditivi.length > 1) {
        formula += ` x (${bonusAdditivi.join(" + ")})`;
    }

    return { punteggio: punteggioFinale, formula };
}
function aggiornaPunteggioLive() {
    const risultato = document.getElementById("result");
    const parola = getParolaDaSlot().trim().toLowerCase();
    const parolaMaiuscola = parola.toUpperCase();

    const { formula } = calcolaPunteggioConDettagli();
    document.getElementById("formula-live").innerHTML = `
        ${formula}<br>
        <strong>Formula:</strong> (Punti lettere) × Lunghezza parola × (Bonus lettere)
    `;

    if (parola === "") {
        risultato.textContent = "📝 Componi una parola...";
        risultato.className = "info";
        return;
    }

    const punteggio = calcolaPunteggio();

    if (typeof parole !== "undefined" && parole.includes(parola)) {
        risultato.innerHTML = `✅ Parola valida: <strong>${parolaMaiuscola}</strong> - Punteggio: <strong>${punteggio}</strong>`;
        risultato.className = "success";
    } else {
        risultato.innerHTML = `❌ Parola non valida: <strong>${parolaMaiuscola}</strong> - Punteggio: <strong>${punteggio}</strong>`;
        risultato.className = "error";
    }
}

function controllaParola() {
    const parola = getParolaDaSlot();
    const risultato = document.getElementById("result");
    playSuonoConfermaParola();
    if (parola.trim() === "") {
        risultato.textContent = "❗ Nessuna parola composta.";
        risultato.className = "error";
        return;
    }

    if (typeof parole === "undefined" || !parole.includes(parola.toLowerCase())) {
        risultato.innerHTML = `❌ <strong>${parola}</strong> non è una parola valida.`;
        risultato.className = "error";
        salvaStatoPartita();
        return;
    }

    const punteggio = calcolaPunteggio(parola);
    salvaParolaAlta(parola, punteggio);
    svuotaParoleSalvate();

    lettereUsateQuestoLivello += parola.length;
    punteggioTotale += punteggio;
    punteggioRound += punteggio;
    turniUsatiQuestoRound++;
    turniRimasti--;

    risultato.innerHTML = `✅ Parola valida: <strong>${parola}</strong> - Punti ottenuti: <strong>${punteggio}</strong>`;
    risultato.className = "success";

    if (punteggio > parolaPunteggioMassimo.punteggio) {
        parolaPunteggioMassimo = { parola, punteggio };
    }

    if (!parolePerRound[roundPassati]) {
        parolePerRound[roundPassati] = [];
    }
    parolePerRound[roundPassati].push({ parola, punteggio });

    parolaCostruita.forEach(item => {
        if (item) scarti.push(tessereDisponibili[item.indiceTessera]);
    });

    if (punteggioRound >= obiettivo) {
        gestisciSuperamentoRound();
        return;
    }

    if (turniRimasti === 0) {
        risultato.innerHTML += punteggioRound >= obiettivo
            ? "<br>🎉 Obiettivo del round raggiunto! Hai vinto!"
            : "<br>❌ Obiettivo non raggiunto. Ritenta!";
        mostraRiepilogoPartita();
    }

    aggiornaInfoGioco();
    reintegraScarti();
    pescaSoloVuotiConControllo();

    parolaCostruita = new Array(MAX_SLOT).fill(null);
    mostraTessere();
    mostraSlot();

    salvaStatoPartita();
    console.log(`📦 Sacchetto attuale: ${sacchetto.length} lettere`);
    logStatoBonus(punteggioTotale, soglieBonus);
}

function verificaDisponibilitaParolaSalvata(voce) {
    if (!Array.isArray(voce.slots) || voce.slots.length === 0) return false;

    return voce.slots.every(item => {
        const tesseraAttuale = tessereDisponibili[item.indiceTessera];
        if (!tesseraAttuale) return false;
        return getSimboloTessera(tesseraAttuale) === item.lettera;
    });
}

function salvaParolaCorrenteInMemoria() {
    const slotsAttivi = parolaCostruita
        .map((elem, slotIndex) => (elem ? { ...elem, slotIndex } : null))
        .filter(Boolean);

    if (slotsAttivi.length === 0) {
        apriModaleParoleSalvate("⚠️ Componi prima una parola negli slot per salvarla.", "error");
        return;
    }

    const parola = getParolaDaSlot().toUpperCase();
    const punteggio = calcolaPunteggio();

    if (paroleSalvate.length >= MAX_PAROLE_SALVATE) {
        apriModaleParoleSalvate(
            `⚠️ Memoria piena (massimo ${MAX_PAROLE_SALVATE} parole). Eliminane una per salvarne altre.`,
            "error"
        );
        return;
    }

    const firmaNuova = slotsAttivi.map(s => `${s.slotIndex}:${s.indiceTessera}`).join("|");
    const giaPresente = paroleSalvate.some(
        v => v.slots.map(s => `${s.slotIndex}:${s.indiceTessera}`).join("|") === firmaNuova
    );

    if (giaPresente) {
        apriModaleParoleSalvate(`ℹ️ La parola "${parola}" con queste tessere è già salvata.`, "info");
        return;
    }

    paroleSalvate.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        parola,
        punteggio,
        slots: slotsAttivi
    });

    salvaStatoPartita();
    apriModaleParoleSalvate(`✅ Parola "${parola}" (${punteggio} pt) salvata in memoria!`, "success");
}

function applicaParolaSalvata(id) {
    const voce = paroleSalvate.find(item => item.id === id);
    if (!voce) return;

    if (!verificaDisponibilitaParolaSalvata(voce)) {
        apriModaleParoleSalvate(
            "⚠️ Alcune tessere di questa parola non sono più disponibili nella griglia.",
            "error"
        );
        return;
    }

    parolaCostruita = new Array(MAX_SLOT).fill(null);

    voce.slots.forEach(({ lettera, indiceTessera, slotIndex }) => {
        if (slotIndex < MAX_SLOT) {
            parolaCostruita[slotIndex] = { lettera, indiceTessera };
        }
    });

    mostraSlot();
    mostraTessere();
    aggiornaPunteggioLive();
    chiudiModaleParoleSalvate();
}

function eliminaParolaSalvata(id) {
    paroleSalvate = paroleSalvate.filter(item => item.id !== id);
    salvaStatoPartita();
    renderizzaListaParoleSalvate("🗑️ Parola rimossa dalla memoria.", "info");
}

function apriModaleParoleSalvate(messaggio = "", tipo = "info") {
    renderizzaListaParoleSalvate(messaggio, tipo);
    document.getElementById("saved-words-modal").style.display = "flex";
}

function chiudiModaleParoleSalvate() {
    document.getElementById("saved-words-modal").style.display = "none";
}

function renderizzaListaParoleSalvate(messaggio = "", tipo = "info") {
    const titleEl = document.getElementById("saved-words-title");
    const feedbackEl = document.getElementById("saved-words-feedback");
    const container = document.getElementById("saved-words-list-container");

    titleEl.textContent = `Parole salvate (${paroleSalvate.length}/${MAX_PAROLE_SALVATE})`;
    feedbackEl.textContent = messaggio;
    feedbackEl.className = `saved-words-feedback ${tipo}`;

    if (paroleSalvate.length === 0) {
        container.innerHTML = `<p class="info">Nessuna parola salvata in memoria.</p>`;
        return;
    }

    const itemsHTML = paroleSalvate
        .map(voce => {
            const disponibile = verificaDisponibilitaParolaSalvata(voce);
            const statoLabel = disponibile
                ? `${voce.punteggio} punti`
                : `${voce.punteggio} punti • Tessere non più disponibili`;

            return `
                <li class="saved-word-item ${disponibile ? "" : "non-disponibile"}">
                    <div class="saved-word-info">
                        <span class="saved-word-text">${voce.parola}</span>
                        <span class="saved-word-meta">${statoLabel}</span>
                    </div>
                    <div class="saved-word-actions">
                        <button
                            type="button"
                            class="btn-use-saved"
                            data-id="${voce.id}"
                            title="Inserisci negli slot"
                            ${disponibile ? "" : "disabled"}
                        >Usa</button>
                        <button
                            type="button"
                            class="btn-delete-saved"
                            data-id="${voce.id}"
                            title="Elimina parola"
                        >🗑️</button>
                    </div>
                </li>
            `;
        })
        .join("");

    container.innerHTML = `<ul class="saved-words-list">${itemsHTML}</ul>`;

    container.querySelectorAll(".btn-use-saved").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = Number(btn.dataset.id);
            applicaParolaSalvata(id);
        });
    });

    container.querySelectorAll(".btn-delete-saved").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = Number(btn.dataset.id);
            eliminaParolaSalvata(id);
        });
    });
}

function svuotaParoleSalvate() {
    paroleSalvate = [];
}

// ==========================================
// 5. ROUND, SOGLIE BONUS E MODALE BONUS
// ==========================================
function getIncrementoObiettivo(round) {
    switch (difficolta) {
        case "medio": return round * 25;
        case "difficile": return round * 30;
        case "estremo": return round * 50;
        default: return round * 20;
    }
}

function generaSoglieBonus(livelloDifficolta) {
    const mapConfig = {
        facile: { base: 6000, incrementoBase: 1500, turniIniziali: 7 },
        medio: { base: 7000, incrementoBase: 2000, turniIniziali: 7 },
        difficile: { base: 8000, incrementoBase: 2500, turniIniziali: 7 },
        estremo: { base: 10000, incrementoBase: 3000, turniIniziali: 7 }
    };

    const { base: baseSoglia, incrementoBase, turniIniziali } = mapConfig[livelloDifficolta] || mapConfig.facile;
    const soglie = [];
    let sogliaCorrente = baseSoglia;
    let turni = turniIniziali;

    for (let i = 1; i <= 10; i++) {
        turni++;
        soglie.push({ soglia: sogliaCorrente, turni });
        const incremento = baseSoglia + (turni - turniIniziali) * incrementoBase;
        sogliaCorrente += incremento;
    }

    return soglie;
}

function calcolaTurniDaSoglie(punteggio, soglie) {
    let turniAssegnati = soglie[0].turni;
    let livelloSuperato = 0;

    for (let i = 0; i < soglie.length; i++) {
        if (punteggio >= soglie[i].soglia) {
            turniAssegnati = soglie[i].turni;
            livelloSuperato = i + 1;
        } else {
            break;
        }
    }

    return { turni: turniAssegnati, livello: livelloSuperato };
}

function calcolaSogliaProssima(punteggio, soglie) {
    for (let i = 0; i < soglie.length; i++) {
        if (punteggio < soglie[i].soglia) {
            return soglie[i].soglia;
        }
    }
    return soglie[soglie.length - 1].soglia;
}

function gestisciSuperamentoRound() {
    roundPassati++;

    const bonusGrezzo = lettereUsateQuestoLivello / ((turniUsatiQuestoRound / 2) + 0.5);
    const bonus = Math.round(bonusGrezzo * turniRimasti * (roundPassati * 0.5 + 0.5));
    punteggioTotale += bonus;

    const turniPrima = turniPerRound;
    const { turni: nuoviTurni, livello: nuovoLivelloBonus } = calcolaTurniDaSoglie(punteggioTotale, soglieBonus);

    if (nuovoLivelloBonus > livelloBonusCorrente) {
        turniPerRound = nuoviTurni;
        sogliaProssimoTurnoBonus = calcolaSogliaProssima(punteggioTotale, soglieBonus);
        livelloBonusCorrente = nuovoLivelloBonus;
    }

    const turnoBonusSbloccato = turniPerRound > turniPrima;
    obiettivo += getIncrementoObiettivo(roundPassati);

    apriBonusModal(bonus, obiettivo, turnoBonusSbloccato);

    reintegraScarti();
    pescaSoloVuotiConControllo();

    turniRimasti = turniPerRound;
    punteggioRound = 0;
    lettereUsateQuestoLivello = 0;
    turniUsatiQuestoRound = 0;

    aggiornaInfoGioco();

    parolaCostruita = new Array(MAX_SLOT).fill(null);
    mostraSlot();
    mostraTessere();
    salvaStatoPartita();
}

function generaTesseraBonus() {
    const lettere = Object.keys(LETTERE);
    const lettera = lettere[Math.floor(Math.random() * lettere.length)];
    const valoreBase = LETTERE[lettera].punteggio;
    const tipoCasuale = Math.random();

    if (tipoCasuale < 0.85) {
        const bonus = Math.floor(Math.random() * 5) + 1;
        return {
            lettera,
            valore: valoreBase + bonus,
            tipoBonus: "additivo"
        };
    }

    const moltiplicatore = tipoCasuale < 0.95 ? 2 : 3;
    return {
        lettera,
        valore: valoreBase,
        tipoBonus: "moltiplicatore",
        moltiplicatore
    };
}

function apriBonusModal(bonus, prossimoObiettivo, turnoBonusSbloccato = false) {
    const modal = document.getElementById("bonus-modal");
    const messaggio = document.getElementById("bonus-message");

    let html = `🎯 Obiettivo del round raggiunto!<br>Bonus: <strong>${bonus}</strong> punti<br>🚀 Prossimo obiettivo: <strong>${prossimoObiettivo}</strong>`;
    if (turnoBonusSbloccato) {
        html += `<br>➕ Hai guadagnato un <strong>turno extra</strong> per ogni round! 🎁`;
    }
    html += `<br>📈 Prossimo turno bonus a <strong>${sogliaProssimoTurnoBonus}</strong> punti totali`;

    messaggio.innerHTML = html;
    modal.style.display = "flex";

    riempiGrigliaBonus();
    mostraRiepilogoSacchetto();
}

function riempiGrigliaBonus() {
    const caselle = document.querySelectorAll("#bonus-triplette-container .bonus-tile-slot");

    caselle.forEach(slot => {
        slot.innerHTML = "";
        slot.classList.remove("bonus-additivo", "bonus-moltiplicatore");

        const tesseraBonus = generaTesseraBonus();
        if (tesseraBonus.tipoBonus === "additivo") {
            slot.classList.add("bonus-additivo");
        } else if (tesseraBonus.tipoBonus === "moltiplicatore") {
            slot.classList.add("bonus-moltiplicatore");
        }

        const letteraSpan = document.createElement("span");
        letteraSpan.textContent = tesseraBonus.lettera;
        letteraSpan.style.fontWeight = "bold";

        const bonusSpan = document.createElement("span");
        bonusSpan.style.fontSize = "0.8em";
        bonusSpan.style.marginLeft = "4px";
        bonusSpan.style.color = "inherit";
        bonusSpan.textContent = tesseraBonus.tipoBonus === "additivo"
            ? `+${tesseraBonus.valore}`
            : `x${tesseraBonus.moltiplicatore}`;

        slot.append(letteraSpan, bonusSpan);
    });
}

function gestisciClickTripletta(event) {
    let group = event.target;
    while (group && !group.classList.contains("triplette-group")) {
        group = group.parentElement;
    }
    if (!group) return;

    const tessereBonus = Array.from(group.querySelectorAll(".bonus-tile-slot"))
        .map(slot => {
            const letteraSpan = slot.querySelector("span:nth-child(1)");
            if (!letteraSpan || letteraSpan.textContent.trim().length === 0) return null;

            const lettera = letteraSpan.textContent.trim();
            const tipoBonus = slot.classList.contains("bonus-additivo")
                ? "additivo"
                : slot.classList.contains("bonus-moltiplicatore")
                    ? "moltiplicatore"
                    : null;

            let valore = 0;
            let moltiplicatore = 1;
            const bonusSpanText = slot.querySelector("span:nth-child(2)")?.textContent.trim() || "";

            if (tipoBonus === "additivo") {
                valore = parseInt(bonusSpanText.replace("+", ""), 10);
            } else if (tipoBonus === "moltiplicatore") {
                moltiplicatore = parseInt(bonusSpanText.replace("x", ""), 10);
            }

            return { lettera, tipoBonus, valore, moltiplicatore };
        })
        .filter(Boolean);

    if (tessereBonus.length > 0) {
        sacchetto.push(...tessereBonus);
    }

    document.getElementById("bonus-modal").style.display = "none";
    document.querySelectorAll(".bonus-tile-slot").forEach(slot => slot.classList.remove("selected"));
}

// ==========================================
// 6. RIEPILOGO, CLASSIFICA E PAROLE TOP
// ==========================================
function creaOggettoPartita(puntiTotali, livelloDifficolta) {
    return {
        id: Date.now() + Math.floor(Math.random() * 10000),
        timestamp: new Date().toISOString(),
        data: new Date().toISOString().split("T")[0],
        punteggioTotale: puntiTotali,
        roundSuperati: roundPassati,
        parolaTop: parolaPunteggioMassimo.parola || "-",
        puntiTop: parolaPunteggioMassimo.punteggio || 0,
        difficolta: livelloDifficolta,
        dettagliRound: parolePerRound.map((paroleRound, i) => ({
            round: i + 1,
            parole: paroleRound.map(p => ({ parola: p.parola, punti: p.punti }))
        }))
    };
}

function generaHTMLDettagliRound(dettagliRound = []) {
    return dettagliRound
        .map(r => {
            const voci = r.parole.map(p => `<li>${p.parola} - ${p.punti} punti</li>`).join("");
            return `<p><strong>Round ${r.round}:</strong></p><ul>${voci}</ul>`;
        })
        .join("");
}

function mostraRiepilogoPartita() {
    salvaPartitaInClassifica(punteggioTotale, difficolta);

    const partita = creaOggettoPartita(punteggioTotale, difficolta);
    const riepilogoHTML = `
        <p><strong>Punti totali:</strong> ${partita.punteggioTotale}</p>
        <p><strong>Round superati:</strong> ${partita.roundSuperati}</p>
        <p><strong>Parola con punteggio più alto:</strong> ${partita.parolaTop} (${partita.puntiTop} punti)</p>
        <hr>
        <h3>Dettaglio round:</h3>
        ${generaHTMLDettagliRound(partita.dettagliRound)}
    `;

    document.getElementById("summary").innerHTML = riepilogoHTML;
    document.getElementById("game-over-modal").style.display = "flex";
}

function salvaPartitaInClassifica(puntiTotali, livelloDifficolta) {
    let classifica = JSON.parse(localStorage.getItem("classificaPartite")) || [];
    classifica.push(creaOggettoPartita(puntiTotali, livelloDifficolta));
    classifica.sort((a, b) => b.punteggioTotale - a.punteggioTotale);
    localStorage.setItem("classificaPartite", JSON.stringify(classifica.slice(0, 15)));
}

function normalizzaClassifica(classifica) {
    let modificato = false;

    classifica.forEach(p => {
        if (!Object.prototype.hasOwnProperty.call(p, "id")) {
            p.id = Date.now() + Math.floor(Math.random() * 10000);
            modificato = true;
        }
        if (!Object.prototype.hasOwnProperty.call(p, "punteggioTotale") && p.punteggio !== undefined) {
            p.punteggioTotale = p.punteggio;
            modificato = true;
        }
        if (!Object.prototype.hasOwnProperty.call(p, "parolaTop")) {
            p.parolaTop = "-";
            p.puntiTop = 0;
            modificato = true;
        }
    });

    if (modificato) {
        localStorage.setItem("classificaPartite", JSON.stringify(classifica));
    }

    return classifica.filter(p => DIFFICOLTA_VALIDE.includes(p.difficolta));
}

function generaSezioneClassifica(classifica, livello, etichetta) {
    const top10 = classifica
        .filter(p => p.difficolta === livello)
        .sort((a, b) => b.punteggioTotale - a.punteggioTotale)
        .slice(0, 10);

    const items = top10
        .map(({ id, punteggioTotale: punti, timestamp, roundSuperati }) => {
            const dataPartita = timestamp ? new Date(timestamp).toLocaleDateString() : "-";
            const roundTesto = roundSuperati !== undefined ? `round:${roundSuperati}` : "";
            return `<li data-id="${id}" class="classifica-voce" style="cursor:pointer;">
                <strong>${punti}</strong> punti - ${dataPartita} - ${roundTesto}
            </li>`;
        })
        .join("");

    return `<h3>📊 Classifica ${etichetta} - Top 10</h3><ol id="classifica-${livello}">${items}</ol>`;
}

function generaHTMLParoleTop(paroleTop) {
    return paroleTop
        .map(({ parola, punteggio, bonus }) => {
            const bonusText = Array.isArray(bonus) ? `(${bonus.join(", ")})` : "No Bonus";
            return `<li><strong>${parola}</strong> - ${punteggio} punti ${bonusText}</li>`;
        })
        .join("");
}

function mostraClassifica() {
    const rawClassifica = JSON.parse(localStorage.getItem("classificaPartite")) || [];
    const classifica = normalizzaClassifica(rawClassifica);

    const etichette = {
        facile: "Facile",
        medio: "Medio",
        difficile: "Difficile",
        estremo: "Estremo"
    };

    let html = DIFFICOLTA_VALIDE
        .map(livello => generaSezioneClassifica(classifica, livello, etichette[livello]))
        .join("");

    const paroleTop = JSON.parse(localStorage.getItem("paroleTop")) || [];
    html += `<hr><h3>🔠 Top parole</h3><ol id="paroleTop-list">${generaHTMLParoleTop(paroleTop.slice(0, 10))}</ol>`;

    if (paroleTop.length > 10) {
        html += `<button id="mostra-piu-parole" class="game-button">Più parole</button>`;
    }

    html += `<div id="dettaglio-partita" style="margin-top:20px;"></div>`;

    document.getElementById("leaderboard-content").innerHTML = html;
    document.getElementById("leaderboard-modal").style.display = "flex";

    document.querySelectorAll(".classifica-voce").forEach(li => {
        li.addEventListener("click", () => {
            const id = li.getAttribute("data-id");
            const partita = classifica.find(p => String(p.id) === String(id));
            if (partita) mostraDettaglioPartita(partita);
        });
    });

    const btnPiuParole = document.getElementById("mostra-piu-parole");
    if (btnPiuParole) {
        btnPiuParole.addEventListener("click", () => {
            document.getElementById("paroleTop-list").innerHTML = generaHTMLParoleTop(paroleTop.slice(0, 50));
            btnPiuParole.style.display = "none";
        });
    }
}

function mostraDettaglioPartita(partita) {
    const container = document.getElementById("dettaglio-partita");
    if (!container || !partita) return;

    container.innerHTML = `
        <hr><h4>📋 Dettagli partita</h4>
        <p><strong>Punteggio totale:</strong> ${partita.punteggioTotale}</p>
        <p><strong>Round superati:</strong> ${partita.roundSuperati}</p>
        <p><strong>Parola migliore:</strong> ${partita.parolaTop} (${partita.puntiTop} punti)</p>
        <h5>🧩 Dettagli per round:</h5>
        ${generaHTMLDettagliRound(partita.dettagliRound)}
    `;
}

function salvaParolaAlta(parola, punteggio) {
    let paroleSalvate = JSON.parse(localStorage.getItem("paroleTop")) || [];

    const bonusUsati = parolaCostruita
        .map(slot => {
            if (!slot) return null;
            const tessera = tessereDisponibili[slot.indiceTessera];
            if (typeof tessera === "object" && tessera !== null) {
                if (tessera.tipoBonus === "additivo") return `+${tessera.valore}`;
                if (tessera.tipoBonus === "moltiplicatore") return `x${tessera.moltiplicatore}`;
            }
            return null;
        })
        .filter(Boolean);

    paroleSalvate.push({
        parola,
        punteggio,
        bonus: bonusUsati.length > 0 ? bonusUsati : ["No Bonus"]
    });

    paroleSalvate.sort((a, b) => b.punteggio - a.punteggio);
    localStorage.setItem("paroleTop", JSON.stringify(paroleSalvate.slice(0, 50)));
}

function mostraRiepilogoSacchetto() {
    const container = document.getElementById("sacchetto-stats");
    if (!container) return;

    const htmlSacchetto = generaRiepilogoLettere(sacchetto, "Sacchetto");
    const htmlScarti = generaRiepilogoLettere(scarti, "Scarti");
    container.innerHTML = `<div class="sacchetto-riepilogo">${htmlSacchetto}${htmlScarti}</div>`;
}

function generaRiepilogoLettere(lista, titolo) {
    const conteggio = {};
    lista.forEach(item => {
        const simbolo = getSimboloTessera(item);
        if (simbolo) conteggio[simbolo] = (conteggio[simbolo] || 0) + 1;
    });

    const consonantiPresenti = Object.keys(conteggio).filter(l => !VOCALI.includes(l)).sort();
    const sommaVocali = VOCALI.reduce((acc, v) => acc + (conteggio[v] || 0), 0);
    const sommaConsonanti = consonantiPresenti.reduce((acc, c) => acc + conteggio[c], 0);

    const dimensioneColonna = Math.max(1, Math.ceil(consonantiPresenti.length / 2));
    const consonantiChunked = [];
    for (let i = 0; i < consonantiPresenti.length; i += dimensioneColonna) {
        consonantiChunked.push(consonantiPresenti.slice(i, i + dimensioneColonna));
    }

    const vocaliHTML = VOCALI
        .filter(v => conteggio[v])
        .map(v => `<li>${v}: ${conteggio[v]}</li>`)
        .join("");

    const consonantiHTML = consonantiChunked
        .map(chunk => `<ul>${chunk.map(c => `<li>${c}: ${conteggio[c]}</li>`).join("")}</ul>`)
        .join("");

    return `
        <div class="riepilogo-blocco">
            <h3>${titolo}</h3>
            <div class="riepilogo-contenuto">
                <div class="sacchetto-colonna">
                    <h4>🔤 Vocali (${sommaVocali})</h4>
                    <ul>${vocaliHTML}</ul>
                </div>
                <div class="sacchetto-colonna consonanti-container">
                    <h4>🧱 Consonanti (${sommaConsonanti})</h4>
                    <div class="consonanti-lists">${consonantiHTML}</div>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// 7. AGGIORNAMENTO UI, DEBUG E LISTENER
// ==========================================
function aggiornaInfoGioco() {
    document.getElementById("turns-display").textContent = `Turni rimanenti: ${turniRimasti}`;
    document.getElementById("goal-display").textContent = `Round ${roundPassati + 1}: ${punteggioRound} / ${obiettivo}`;
    document.getElementById("score-display").textContent = `Punteggio totale: ${punteggioTotale}`;

    const progressPercent = Math.min(100, (punteggioRound / obiettivo) * 100);
    document.getElementById("progress-bar").style.width = `${progressPercent}%`;
}

function aggiornaRimescolaBtn() {
    const rimescolaBtn = document.getElementById("rimescola");
    const counterSpan = document.getElementById("rimescola-counter");
    if (counterSpan) {
        counterSpan.textContent = RIMESCOLA_MAX - rimescolaUsato;
    }
    rimescolaBtn.disabled = rimescolaUsato >= RIMESCOLA_MAX;
}

function mostraSelezioneDifficolta() {
    document.getElementById("difficulty-modal").style.display = "flex";
}

function isSchermoInteroAttivo() {
    return Boolean(document.fullscreenElement);
}

function aggiornaPulsanteSchermoIntero() {
    const btn = document.getElementById("toggle-fullscreen");
    if (!btn) return;

    const attivo = isSchermoInteroAttivo();
    btn.textContent = attivo ? "🗗" : "⛶";
    btn.title = attivo ? "Esci da schermo intero" : "Attiva schermo intero";
    btn.setAttribute("aria-pressed", String(attivo));
}

async function toggleSchermoIntero() {
    try {
        if (!isSchermoInteroAttivo()) {
            await document.documentElement.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    } catch (err) {
        console.warn("Schermo intero non supportato o bloccato dal browser:", err);
    }
}

function stampaSacchetto() {
    console.log("Contenuto sacchetto:");
    sacchetto.forEach((tessera, index) => {
        console.log(`Tessera ${index + 1}: Letter: ${tessera.lettera}, Valore: ${tessera.valore}`);
    });
}

function logStatoBonus(punteggio, soglie) {
    let sogliaCorrente = null;
    let turniCorrenti = null;
    let sogliaSuccessiva = null;
    let turniSuccessivi = null;

    for (let i = 0; i < soglie.length; i++) {
        if (punteggio < soglie[i].soglia) {
            sogliaSuccessiva = soglie[i].soglia;
            turniSuccessivi = soglie[i].turni;
            break;
        }
        sogliaCorrente = soglie[i].soglia;
        turniCorrenti = soglie[i].turni;
    }

    console.log("=== Stato bonus ===");
    console.log("Punteggio totale:", punteggio);
    console.log("Soglia corrente superata:", sogliaCorrente);
    console.log("Turni attuali associati:", turniCorrenti);
    console.log("Prossima soglia da superare:", sogliaSuccessiva);
    console.log("Turni al prossimo bonus:", turniSuccessivi);
    console.log("==================");
}

function registraEventi() {
    document.getElementById("menu-new-game").addEventListener("click", () => {
        const statoSalvato = localStorage.getItem("statoPartita");
        if (statoSalvato) {
            document.getElementById("load-game-modal").style.display = "flex";
        } else {
            mostraSelezioneDifficolta();
        }
    });

    document.getElementById("menu-load-game").addEventListener("click", () => {
        if (!localStorage.getItem("statoPartita")) return;
        mostraAreaDiGioco();
        caricaStatoPartita();
    });

    document.getElementById("menu-multiplayer").addEventListener("click", () => {
        document.getElementById("open-online-modal")?.click();
    });

    document.getElementById("menu-leaderboard").addEventListener("click", () => {
        mostraClassifica();
    });

    document.getElementById("check-word").addEventListener("click", controllaParola);
    document.getElementById("backspace").addEventListener("click", rimuoviUltimaLettera);
    document.getElementById("rimescola").addEventListener("click", rimescolaTessere);

    document.getElementById("bonus-triplette-container").addEventListener("click", gestisciClickTripletta);

    document.getElementById("show-leaderboard").addEventListener("click", mostraClassifica);
    document.getElementById("close-leaderboard").addEventListener("click", () => {
        document.getElementById("leaderboard-modal").style.display = "none";
    });

    document.getElementById("reset-leaderboard").addEventListener("click", () => {
        if (confirm("Sei sicuro di voler azzerare la classifica?")) {
            localStorage.removeItem("classificaPartite");
            localStorage.removeItem("classifica");
            localStorage.removeItem("paroleTop");
            mostraClassifica();
        }
    });

    document.getElementById("chiudi-difficulty-modal").addEventListener("click", () => {
        document.getElementById("difficulty-modal").style.display = "none";
    });

    document.getElementById("save-word").addEventListener("click", salvaParolaCorrenteInMemoria);
    document.getElementById("show-saved-word").addEventListener("click", () => apriModaleParoleSalvate());
    document.getElementById("close-saved-words-modal").addEventListener("click", chiudiModaleParoleSalvate);

    document.getElementById("confirm-load-game").addEventListener("click", () => {
        document.getElementById("load-game-modal").style.display = "none";
        mostraAreaDiGioco();
        caricaStatoPartita();
    });

    document.getElementById("decline-load-game").addEventListener("click", () => {
        document.getElementById("load-game-modal").style.display = "none";
        mostraSelezioneDifficolta();
    });

    document.getElementById("close-auto-shuffle-modal").addEventListener("click", () => {
        document.getElementById("auto-shuffle-modal").style.display = "none";
    });

    const fullscreenBtn = document.getElementById("toggle-fullscreen");
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener("click", toggleSchermoIntero);
    }

    const savedWordsModal = document.getElementById("saved-words-modal");
    if (savedWordsModal) {
        savedWordsModal.addEventListener("click", (e) => {
            if (e.target === savedWordsModal) {
                chiudiModaleParoleSalvate();
            }
        });
    }

    document.addEventListener("fullscreenchange", aggiornaPulsanteSchermoIntero);
    aggiornaPulsanteSchermoIntero();
    document.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn || btn.classList.contains("tile")) return;
        playSuonoClick();
    });

    const soundBtn = document.getElementById("toggle-sound");
    if (soundBtn) {
        soundBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleAudio();
        });
    }
    aggiornaPulsanteAudio();
}

window.addEventListener("DOMContentLoaded", () => {
    inizializzaPulsanteRimescola();
    registraEventi();
    mostraSchermataIniziale();
});