import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    push,
    update,
    get,
    onValue,
    runTransaction,
    serverTimestamp,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "INSERISCI_API_KEY",
    authDomain: "INSERISCI_AUTH_DOMAIN",
    databaseURL: "INSERISCI_DATABASE_URL",
    projectId: "INSERISCI_PROJECT_ID",
    storageBucket: "INSERISCI_STORAGE_BUCKET",
    messagingSenderId: "INSERISCI_SENDER_ID",
    appId: "INSERISCI_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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
        // Mostra modale stanza d'attesa con lista giocatori e bottone "Avvia partita" per l'host
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

    // Recupera la parola salvata disponibile con punteggio più alto (se presente)
    const miglioreSalvata = trovaMiglioreParolaSalvataDisponibile();
    const puntiTurno = miglioreSalvata ? miglioreSalvata.punteggio : 0;

    if (!miglioreSalvata) {
        // Nessuna parola salvata: rimescola tutte le tessere sulla board
        if (typeof rimescolaTessere === "function") {
            rimescolaTessere();
        }
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

    // Se tutti hanno già finito, l'host può far passare a "round_end" o cliccare direttamente "Prossimo round"
    const snap = await get(ref(db, `rooms/${currentRoomId}/players`));
    const allPlayers = Object.values(snap.val() || {});
    if (allPlayers.length > 0 && allPlayers.every(p => p.roundFinished)) {
        await update(ref(db, `rooms/${currentRoomId}/meta`), { status: "round_end" });
    }
}