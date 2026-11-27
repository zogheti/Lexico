import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    push,
    update,
    get,
    child,
    onValue,
    runTransaction,
    serverTimestamp,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyD9bxKUB6P6pCocb8JUS36V5kEIW9Zo3wo",
    authDomain: "lexico-79b03.firebaseapp.com",
    databaseURL: "https://lexico-79b03-default-rtdb.firebaseio.com",
    projectId: "lexico-79b03",
    storageBucket: "lexico-79b03.firebasestorage.app",
    messagingSenderId: "600833182058",
    appId: "1:600833182058:web:919de1056c1d560f3abd13"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db);

// ==========================================
// CLASSIFICA ONLINE (PARTITE & TOP PAROLE)
// ==========================================
window.sincronizzaPartitaFirebase = async function (partita) {
    if (!partita || !partita.id || !partita.difficolta) return;
    try {
        await set(ref(db, `leaderboard/partite/${partita.difficolta}/${partita.id}`), partita);
    } catch (err) {
        console.warn("⚠️ Errore salvataggio partita su Firebase:", err);
    }
};

window.sincronizzaParolaTopFirebase = async function (voceParola) {
    if (!voceParola || !voceParola.id) return;
    try {
        await set(ref(db, `leaderboard/paroleTop/${voceParola.id}`), voceParola);
    } catch (err) {
        console.warn("⚠️ Errore salvataggio parola top su Firebase:", err);
    }
};

window.caricaClassificaFirebase = async function () {
    try {
        const [partiteSnap, paroleSnap] = await Promise.all([
            get(child(dbRef, "leaderboard/partite")),
            get(child(dbRef, "leaderboard/paroleTop"))
        ]);

        const partiteRemote = [];
        if (partiteSnap.exists()) {
            const perDifficolta = partiteSnap.val();
            Object.values(perDifficolta).forEach(mappaPartite => {
                if (mappaPartite && typeof mappaPartite === "object") {
                    partiteRemote.push(...Object.values(mappaPartite));
                }
            });
        }

        const paroleRemote = paroleSnap.exists()
            ? Object.values(paroleSnap.val())
            : [];

        const partiteLocali = JSON.parse(localStorage.getItem("classificaPartite")) || [];
        const paroleLocali = JSON.parse(localStorage.getItem("paroleTop")) || [];

        const partiteUnite = typeof unisciClassifiche === "function"
            ? unisciClassifiche(partiteLocali, partiteRemote, "id")
                .sort((a, b) => (b.punteggioTotale || 0) - (a.punteggioTotale || 0))
                .slice(0, 50)
            : partiteRemote;

        const paroleUnite = typeof unisciClassifiche === "function"
            ? unisciClassifiche(paroleLocali, paroleRemote, "id")
            : paroleRemote;

        const modal = document.getElementById("leaderboard-modal");
        if (modal && modal.style.display !== "none" && typeof renderizzaClassificaConDati === "function") {
            renderizzaClassificaConDati(partiteUnite, paroleUnite);
        }
    } catch (err) {
        console.warn("⚠️ Impossibile leggere la classifica da Firebase (uso dati locali):", err);
    }
};

// ==========================================
// MULTIPLAYER ONLINE
// ==========================================
const MAX_GIOCATORI_STANZA = 10;
const ROUND_TOTALI = 10;
const DURATA_ROUND_SEC = 120;
const STORAGE_NOME_KEY = "scarabeo_nome_giocatore_online";

const playerId =
    sessionStorage.getItem("scarabeo_online_player_id") ||
    `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
sessionStorage.setItem("scarabeo_online_player_id", playerId);

let currentRoomId = null;
let unsubscribeRoom = null;
let roomData = null;
let timerInterval = null;
let roundCompletionSubmitted = false;

function getNomeGiocatore() {
    const input = document.getElementById("online-player-name");
    const nome = (input?.value || localStorage.getItem(STORAGE_NOME_KEY) || "").trim();
    if (nome) {
        localStorage.setItem(STORAGE_NOME_KEY, nome);
    }
    return nome;
}

function caricaNomeSalvato() {
    const input = document.getElementById("online-player-name");
    const salvato = localStorage.getItem(STORAGE_NOME_KEY) || "";
    if (input && salvato) {
        input.value = salvato;
    }
}

function creaSacchettoMescolato() {
    const sacchetto = generaSacchetto();
    shuffleArray(sacchetto);
    return sacchetto;
}

async function creaStanza() {
    const nome = getNomeGiocatore();
    if (!nome) {
        alert("⚠️ Inserisci obbligatoriamente il nome del giocatore prima di creare una stanza.");
        document.getElementById("online-player-name")?.focus();
        return;
    }

    const roomsRef = ref(db, "rooms");
    const newRoomRef = push(roomsRef);
    const roomId = newRoomRef.key;
    const deck = creaSacchettoMescolato();

    await set(newRoomRef, {
        meta: {
            hostId: playerId,
            status: "lobby",
            currentRound: 1,
            maxRounds: ROUND_TOTALI,
            maxPlayers: MAX_GIOCATORI_STANZA,
            roundDuration: DURATA_ROUND_SEC,
            roundStartAt: null,
            createdAt: serverTimestamp()
        },
        deck,
        players: {
            [playerId]: {
                name: nome,
                isHost: true,
                totalScore: 0,
                currentRoundScore: 0,
                roundFinished: false,
                rematch: false,
                joinedAt: Date.now()
            }
        }
    });

    onDisconnect(ref(db, `rooms/${roomId}/players/${playerId}`)).remove();
    ascoltaStanza(roomId);
}

async function entraInStanza(roomId) {
    const nome = getNomeGiocatore();
    if (!nome) {
        alert("⚠️ Inserisci obbligatoriamente il nome del giocatore prima di entrare in una stanza.");
        document.getElementById("online-player-name")?.focus();
        return;
    }

    const roomRef = ref(db, `rooms/${roomId}`);
    const snap = await get(roomRef);
    if (!snap.exists()) {
        alert("Stanza non più disponibile.");
        return;
    }

    const data = snap.val();
    const players = data.players || {};
    const numPlayers = Object.keys(players).length;

    if (!players[playerId] && numPlayers >= MAX_GIOCATORI_STANZA) {
        alert(`La stanza ha già raggiunto il limite di ${MAX_GIOCATORI_STANZA} giocatori.`);
        return;
    }

    await set(ref(db, `rooms/${roomId}/players/${playerId}`), {
        name: nome,
        isHost: data.meta?.hostId === playerId,
        totalScore: players[playerId]?.totalScore ?? 0,
        currentRoundScore: players[playerId]?.currentRoundScore ?? 0,
        roundFinished: players[playerId]?.roundFinished ?? false,
        rematch: false,
        joinedAt: players[playerId]?.joinedAt ?? Date.now()
    });

    onDisconnect(ref(db, `rooms/${roomId}/players/${playerId}`)).remove();
    ascoltaStanza(roomId);
}

async function pescaTessereCondivise(quantita) {
    if (!currentRoomId) return [];

    const deckRef = ref(db, `rooms/${currentRoomId}/deck`);
    let pescate = [];

    await runTransaction(deckRef, currentDeck => {
        const deck = Array.isArray(currentDeck) ? [...currentDeck] : creaSacchettoMescolato();
        if (deck.length < quantita) {
            const extra = creaSacchettoMescolato();
            deck.push(...extra);
        }
        pescate = deck.splice(0, quantita);
        return deck;
    });

    return pescate;
}

async function inserisciBonusTraPrime10(tessereBonus) {
    if (!currentRoomId || !Array.isArray(tessereBonus) || tessereBonus.length === 0) return;

    const deckRef = ref(db, `rooms/${currentRoomId}/deck`);
    await runTransaction(deckRef, currentDeck => {
        const deck = Array.isArray(currentDeck) ? [...currentDeck] : [];
        tessereBonus.forEach(bonusTile => {
            const maxIdx = Math.min(10, deck.length);
            const insertIdx = Math.floor(Math.random() * (maxIdx + 1));
            deck.splice(insertIdx, 0, bonusTile);
        });
        return deck;
    });
}

async function avviaPartitaOnline() {
    if (!currentRoomId || roomData?.meta?.hostId !== playerId) return;

    await update(ref(db, `rooms/${currentRoomId}/meta`), {
        status: "playing",
        currentRound: 1,
        roundStartAt: serverTimestamp()
    });
}

async function avviaProssimoRoundOnline() {
    if (!currentRoomId || roomData?.meta?.hostId !== playerId) return;

    const currentRound = roomData?.meta?.currentRound || 1;
    const players = roomData?.players || {};
    const updates = {};

    Object.keys(players).forEach(pid => {
        updates[`players/${pid}/roundFinished`] = false;
        updates[`players/${pid}/currentRoundScore`] = 0;
    });

    if (currentRound >= ROUND_TOTALI) {
        updates["meta/status"] = "finished";
    } else {
        updates["meta/currentRound"] = currentRound + 1;
        updates["meta/roundStartAt"] = serverTimestamp();
        updates["meta/status"] = "playing";
    }

    await update(ref(db, `rooms/${currentRoomId}`), updates);
}

async function votaRivincita() {
    if (!currentRoomId) return;
    await set(ref(db, `rooms/${currentRoomId}/players/${playerId}/rematch`), true);

    const snap = await get(ref(db, `rooms/${currentRoomId}`));
    if (!snap.exists()) return;
    const data = snap.val();
    const players = Object.values(data.players || {});
    if (players.length > 0 && players.every(p => p.rematch === true)) {
        const updates = {
            deck: creaSacchettoMescolato(),
            "meta/status": "playing",
            "meta/currentRound": 1,
            "meta/roundStartAt": serverTimestamp()
        };
        Object.keys(data.players || {}).forEach(pid => {
            updates[`players/${pid}/totalScore`] = 0;
            updates[`players/${pid}/currentRoundScore`] = 0;
            updates[`players/${pid}/roundFinished`] = false;
            updates[`players/${pid}/rematch`] = false;
        });
        await update(ref(db, `rooms/${currentRoomId}`), updates);
    }
}

function ascoltaStanzeAttive() {
    const roomsRef = ref(db, "rooms");
    onValue(roomsRef, snapshot => {
        const container = document.getElementById("rooms-list");
        if (!container) return;

        const val = snapshot.val() || {};
        const entries = Object.entries(val).filter(([, r]) => r?.meta?.status === "lobby");

        if (entries.length === 0) {
            container.innerHTML = `<p class="info">Nessuna stanza attiva al momento. Creane una!</p>`;
            return;
        }

        container.innerHTML = entries
            .map(([id, r]) => {
                const count = Object.keys(r.players || {}).length;
                const hostName = Object.values(r.players || {}).find(p => p.isHost)?.name || "Host";
                const piena = count >= MAX_GIOCATORI_STANZA;
                return `
                    <div class="online-room-row">
                        <div>
                            <strong>Stanza di ${hostName}</strong>
                            <span>(${count}/${MAX_GIOCATORI_STANZA} giocatori)</span>
                        </div>
                        <button type="button" class="game-button" data-room-id="${id}" ${piena ? "disabled" : ""}>
                            ${piena ? "Piena" : "Entra"}
                        </button>
                    </div>
                `;
            })
            .join("");

        container.querySelectorAll("button[data-room-id]").forEach(btn => {
            btn.addEventListener("click", () => entraInStanza(btn.dataset.roomId));
        });
    });
}

function ascoltaStanza(roomId) {
    if (unsubscribeRoom) unsubscribeRoom();
    currentRoomId = roomId;

    const roomRef = ref(db, `rooms/${roomId}`);
    unsubscribeRoom = onValue(roomRef, snapshot => {
        if (!snapshot.exists()) return;
        roomData = snapshot.val();
        sincronizzaInterfacciaStanza();
    });
}

function sincronizzaInterfacciaStanza() {
    if (!roomData) return;
    const status = roomData.meta?.status;
    const players = Object.entries(roomData.players || {});
    const isHost = roomData.meta?.hostId === playerId;
    const allFinished = players.length > 0 && players.every(([, p]) => p.roundFinished === true);

    if (status === "lobby") {
        aggiornaListaGiocatoriAttesa(players, isHost);
    } else if (status === "playing") {
        roundCompletionSubmitted = false;
        avviaTimerRound(roomData.meta?.roundStartAt, roomData.meta?.roundDuration || DURATA_ROUND_SEC);
    } else if (status === "round_end") {
        fermaTimerRound();
        mostraModaleIntermediaRound(players, isHost, allFinished);
    } else if (status === "finished") {
        fermaTimerRound();
        mostraModaleFinePartitaOnline(players);
    }
}

function avviaTimerRound(roundStartAt, durationSec) {
    fermaTimerRound();
    const timerEl = document.getElementById("online-timer");
    const roundEl = document.getElementById("online-round-indicator");
    if (roundEl) {
        roundEl.textContent = `Round ${roomData.meta.currentRound} / ${ROUND_TOTALI}`;
    }

    const tick = () => {
        if (!roundStartAt) return;
        const elapsedSec = Math.floor((Date.now() - roundStartAt) / 1000);
        const remaining = Math.max(0, durationSec - elapsedSec);
        if (timerEl) {
            timerEl.textContent = `⏱️ ${remaining}s`;
        }
        if (remaining <= 0 && !roundCompletionSubmitted) {
            gestisciScadenzaTimerRound();
        }
    };

    tick();
    timerInterval = setInterval(tick, 500);
}

function fermaTimerRound() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

async function gestisciScadenzaTimerRound() {
    if (roundCompletionSubmitted || !currentRoomId) return;
    roundCompletionSubmitted = true;
    fermaTimerRound();

    const miglioreSalvata = typeof trovaMiglioreParolaSalvataDisponibile === "function"
        ? trovaMiglioreParolaSalvataDisponibile()
        : null;
    const puntiTurno = miglioreSalvata ? miglioreSalvata.punteggio : 0;

    if (!miglioreSalvata && typeof rimescolaTessere === "function") {
        rimescolaTessere();
    }

    await completaRoundGiocatore(puntiTurno);
}

async function completaRoundGiocatore(puntiOttenutiNelRound) {
    if (!currentRoomId) return;
    const playerRef = ref(db, `rooms/${currentRoomId}/players/${playerId}`);

    await runTransaction(playerRef, curr => {
        if (!curr) return curr;
        return {
            ...curr,
            currentRoundScore: (curr.currentRoundScore || 0) + puntiOttenutiNelRound,
            roundFinished: true
        };
    });

    const snap = await get(ref(db, `rooms/${currentRoomId}/players`));
    const allPlayers = Object.values(snap.val() || {});
    if (allPlayers.length > 0 && allPlayers.every(p => p.roundFinished)) {
        await update(ref(db, `rooms/${currentRoomId}/meta`), { status: "round_end" });
    }
}