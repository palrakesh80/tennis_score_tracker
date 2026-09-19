import React, { useState, useEffect } from 'react';

const POINT_TYPES = {
REGULAR: { id: 'regular', label: 'Standard Point 🎾', category: 'regular' },
ACE: { id: 'ace', label: 'Ace 🎾', category: 'winner', serveRelated: true },
DOUBLE_FAULT: { id: 'double_fault', label: 'Double Fault ⚠️', category: 'error', serveRelated: true },
WINNER_FH: { id: 'winner_fh', label: 'Forehand Winner 💥', category: 'winner' },
WINNER_BH: { id: 'winner_bh', label: 'Backhand Winner 💥', category: 'winner' },
WINNER_VOLLEY: { id: 'winner_volley', label: 'Volley Winner 🖐️', category: 'winner' },
WINNER_OVERHEAD: { id: 'winner_overhead', label: 'Smash/Overhead 🔨', category: 'winner' },
UE_NET: { id: 'ue_net', label: 'UE - Net 🕸️', category: 'unforced_error', errorType: 'net' },
UE_LONG: { id: 'ue_long', label: 'UE - Missed Long ↗️', category: 'unforced_error', errorType: 'long' },
UE_WIDE: { id: 'ue_wide', label: 'UE - Missed Wide ↔️', category: 'unforced_error', errorType: 'wide' },
FORCED_ERROR: { id: 'forced_error', label: 'Forced Error 🛡️', category: 'forced_error' },
};

const INITIAL_MATCH_SETTINGS = {
player1Name: 'Player 1 (Kid)',
player2Name: 'Opponent',
tournament: 'Junior Tennis Event',
date: new Date().toISOString().split('T')[0],
surface: 'Hard',
setsToWin: 2,
setFormat: 'short',
scoringMode: 'no-ad',
initialServer: 'p1',
tiebreakPoints: 7,
finalSetTiebreak: true,
};

const computeMatchState = (points, settings) => {
let p1Sets = 0;
let p2Sets = 0;
let setScores = [{ p1: 0, p2: 0, tiebreak: null }];
let currentSetIdx = 0;
let currentServer = settings.initialServer;
let p1GamePoints = 0;
let p2GamePoints = 0;
let inTiebreak = false;
let tiebreakP1 = 0;
let tiebreakP2 = 0;
let currentGameServer = settings.initialServer;
let matchComplete = false;
let winner = null;
let tiebreakServeCounter = 0;

const switchServer = (fromServer) => (fromServer === 'p1' ? 'p2' : 'p1');

for (let i = 0; i < points.length; i++) {
if (matchComplete) break;
const pt = points[i];
const ptWinner = pt.winner;

```
if (inTiebreak) {
  if (ptWinner === 'p1') tiebreakP1++;
  else tiebreakP2++;

  tiebreakServeCounter++;
  if (tiebreakServeCounter === 1 || (tiebreakServeCounter > 1 && (tiebreakServeCounter - 1) % 2 === 0)) {
    currentServer = switchServer(currentServer);
  }

  const targetTB = settings.tiebreakPoints || 7;
  if ((tiebreakP1 >= targetTB || tiebreakP2 >= targetTB) && Math.abs(tiebreakP1 - tiebreakP2) >= 2) {
    if (tiebreakP1 > tiebreakP2) {
      setScores[currentSetIdx].p1++;
      setScores[currentSetIdx].tiebreak = `${tiebreakP1}-${tiebreakP2}`;
      p1Sets++;
    } else {
      setScores[currentSetIdx].p2++;
      setScores[currentSetIdx].tiebreak = `${tiebreakP2}-${tiebreakP1}`;
      p2Sets++;
    }

    inTiebreak = false;
    tiebreakP1 = 0;
    tiebreakP2 = 0;
    p1GamePoints = 0;
    p2GamePoints = 0;
    currentGameServer = switchServer(currentGameServer);
    currentServer = currentGameServer;

    if (p1Sets === settings.setsToWin || p2Sets === settings.setsToWin) {
      matchComplete = true;
      winner = p1Sets > p2Sets ? 'p1' : 'p2';
    } else {
      currentSetIdx++;
      setScores.push({ p1: 0, p2: 0, tiebreak: null });
    }
  }
} else {
  if (ptWinner === 'p1') p1GamePoints++;
  else p2GamePoints++;

  let gameWon = false;
  let gameWinner = null;

  if (settings.scoringMode === 'no-ad') {
    if (p1GamePoints >= 4) {
      gameWon = true;
      gameWinner = 'p1';
    } else if (p2GamePoints >= 4) {
      gameWon = true;
      gameWinner = 'p2';
    }
  } else {
    if (p1GamePoints >= 4 && p1GamePoints - p2GamePoints >= 2) {
      gameWon = true;
      gameWinner = 'p1';
    } else if (p2GamePoints >= 4 && p2GamePoints - p1GamePoints >= 2) {
      gameWon = true;
      gameWinner = 'p2';
    }
  }

  if (gameWon) {
    if (gameWinner === 'p1') setScores[currentSetIdx].p1++;
    else setScores[currentSetIdx].p2++;

    p1GamePoints = 0;
    p2GamePoints = 0;
    currentGameServer = switchServer(currentGameServer);
    currentServer = currentGameServer;

    const p1G = setScores[currentSetIdx].p1;
    const p2G = setScores[currentSetIdx].p2;
    const targetGames = settings?.setFormat === 'short' ? 4 : 6;
    const tiebreakTrigger = settings?.setFormat === 'short' ? 3 : 6;

    if (p1G === tiebreakTrigger && p2G === tiebreakTrigger && settings.finalSetTiebreak) {
      inTiebreak = true;
      tiebreakP1 = 0;
      tiebreakP2 = 0;
      tiebreakServeCounter = 0;
    } else if ((p1G >= targetGames || p2G >= targetGames) && Math.abs(p1G - p2G) >= 2) {
      if (p1G > p2G) p1Sets++;
      else p2Sets++;

      if (p1Sets === settings.setsToWin || p2Sets === settings.setsToWin) {
        matchComplete = true;
        winner = p1Sets > p2Sets ? 'p1' : 'p2';
      } else {
        currentSetIdx++;
        setScores.push({ p1: 0, p2: 0, tiebreak: null });
      }
    }
  }
}

```

}

let gameScoreDisplay = { p1: '0', p2: '0' };
if (inTiebreak) {
gameScoreDisplay = { p1: tiebreakP1.toString(), p2: tiebreakP2.toString() };
} else {
if (p1GamePoints >= 3 && p2GamePoints >= 3) {
if (p1GamePoints === p2GamePoints) gameScoreDisplay = { p1: '40', p2: '40' };
else if (p1GamePoints === p2GamePoints + 1) gameScoreDisplay = { p1: 'AD', p2: '40' };
else if (p2GamePoints === p1GamePoints + 1) gameScoreDisplay = { p1: '40', p2: 'AD' };
} else {
const tennisPointsMap = ['0', '15', '30', '40'];
gameScoreDisplay = {
p1: tennisPointsMap[p1GamePoints] || '0',
p2: tennisPointsMap[p2GamePoints] || '0',
};
}
}

return {
p1Sets, p2Sets, setScores, currentSetIdx, currentServer, p1GamePoints, p2GamePoints, inTiebreak, gameScoreDisplay, matchComplete, winner
};
};

export default function App() {
const [matchSettings, setMatchSettings] = useState(() => {
const saved = localStorage.getItem('tennis_match_settings');
return saved ? JSON.parse(saved) : INITIAL_MATCH_SETTINGS;
});

const [points, setPoints] = useState(() => {
const saved = localStorage.getItem('tennis_match_points');
return saved ? JSON.parse(saved) : [];
});

const [customNotes, setCustomNotes] = useState(() => {
const saved = localStorage.getItem('tennis_match_notes');
return saved ? JSON.parse(saved) : '';
});

const [savedMatches, setSavedMatches] = useState(() => {
const saved = localStorage.getItem('tennis_saved_matches');
return saved ? JSON.parse(saved) : [];
});

const [activeTab, setActiveTab] = useState('tracker');
const [selectedPointType, setSelectedPointType] = useState('REGULAR');
const [serveStatus, setServeStatus] = useState('1st');
const [editingPointIndex, setEditingPointIndex] = useState(null);
const [showConfirmReset, setShowConfirmReset] = useState(false);
const [toastMessage, setToastMessage] = useState(null);

useEffect(() => {
localStorage.setItem('tennis_match_settings', JSON.stringify(matchSettings));
}, [matchSettings]);

useEffect(() => {
localStorage.setItem('tennis_match_points', JSON.stringify(points));
}, [points]);

useEffect(() => {
localStorage.setItem('tennis_match_notes', JSON.stringify(customNotes));
}, [customNotes]);

useEffect(() => {
localStorage.setItem('tennis_saved_matches', JSON.stringify(savedMatches));
}, [savedMatches]);

const showToast = (msg) => {
setToastMessage(msg);
setTimeout(() => setToastMessage(null), 2500);
};

const matchState = computeMatchState(points, matchSettings);

const handleSaveMatch = () => {
const existingIndex = savedMatches.findIndex(
(m) =>
m.settings.date === matchSettings.date &&
m.settings.player1Name === matchSettings.player1Name &&
m.settings.player2Name === matchSettings.player2Name
);

```
const matchSnapshot = {
  id: existingIndex >= 0 ? savedMatches[existingIndex].id : Date.now(),
  savedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  savedDate: new Date().toLocaleDateString(),
  settings: { ...matchSettings },
  points: [...points],
  notes: customNotes,
  scoreSummary: matchState.setScores.map(s => `${s.p1}-${s.p2}${s.tiebreak ? `(${s.tiebreak})` : ''}`).join(', '),
  isComplete: matchState.matchComplete,
  winnerName: matchState.winner === 'p1' ? matchSettings.player1Name : matchState.winner === 'p2' ? matchSettings.player2Name : null,
  totalPoints: points.length,
};

if (existingIndex >= 0) {
  const updated = [...savedMatches];
  updated[existingIndex] = matchSnapshot;
  setSavedMatches(updated);
} else {
  setSavedMatches((prev) => [matchSnapshot, ...prev]);
}

showToast('💾 Match & Setup successfully saved!');

```

};

const handleLoadSavedMatch = (matchRecord) => {
setMatchSettings(matchRecord.settings);
setPoints(matchRecord.points);
setCustomNotes(matchRecord.notes || '');
setActiveTab('tracker');
showToast(`Loaded match: ${matchRecord.settings.player1Name} vs ${matchRecord.settings.player2Name}`);
};

const handleDeleteSavedMatch = (id) => {
setSavedMatches((prev) => prev.filter((m) => m.id !== id));
showToast('Saved match removed.');
};

const handleRecordPoint = (pointWinner, customType = null) => {
if (matchState.matchComplete) {
showToast('Match is already completed!');
return;
}
const typeKey = customType || selectedPointType;
const newPoint = {
id: Date.now(),
winner: pointWinner,
type: typeKey,
server: matchState.currentServer,
serveStatus: serveStatus,
setIndex: matchState.currentSetIdx,
timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
};

```
setPoints((prev) => [...prev, newPoint]);
setServeStatus('1st');
showToast(`Point logged for ${pointWinner === 'p1' ? matchSettings.player1Name : matchSettings.player2Name}`);

```

};

const handleUndo = () => {
if (points.length === 0) return;
const updated = [...points];
const removed = updated.pop();
setPoints(updated);
showToast(`Cancelled last point (${removed.winner === 'p1' ? matchSettings.player1Name : matchSettings.player2Name})`);
};

const calculateStats = () => {
const stats = {
p1: { totalPoints: 0, aces: 0, dfs: 0, winners: 0, ueNet: 0, ueLong: 0, ueWide: 0, totalUE: 0, forcedErrors: 0, servePoints: 0, servePointsWon: 0, returnPoints: 0, returnPointsWon: 0 },
p2: { totalPoints: 0, aces: 0, dfs: 0, winners: 0, ueNet: 0, ueLong: 0, ueWide: 0, totalUE: 0, forcedErrors: 0, servePoints: 0, servePointsWon: 0, returnPoints: 0, returnPointsWon: 0 },
};

```
points.forEach((pt) => {
  const winner = pt.winner;
  const loser = winner === 'p1' ? 'p2' : 'p1';
  const server = pt.server;
  const receiver = server === 'p1' ? 'p2' : 'p1';

  stats[winner].totalPoints++;
  stats[server].servePoints++;
  if (winner === server) stats[server].servePointsWon++;
  stats[receiver].returnPoints++;
  if (winner === receiver) stats[receiver].returnPointsWon++;

  const typeInfo = POINT_TYPES[pt.type];
  if (!typeInfo) return;

  if (typeInfo.id === 'ace') {
    stats[winner].aces++;
    stats[winner].winners++;
  } else if (typeInfo.id === 'double_fault') {
    stats[server].dfs++;
    stats[server].totalUE++;
  } else if (typeInfo.category === 'winner') {
    stats[winner].winners++;
  } else if (typeInfo.category === 'unforced_error') {
    stats[loser].totalUE++;
    if (typeInfo.errorType === 'net') stats[loser].ueNet++;
    if (typeInfo.errorType === 'long') stats[loser].ueLong++;
    if (typeInfo.errorType === 'wide') stats[loser].ueWide++;
  }
});

return stats;

```

};

const stats = calculateStats();

return (

{toastMessage && (

{toastMessage}

)}

```
  <header className="sticky top-0 z-40 bg-[#aed3fb] text-slate-900 border-b border-blue-200 px-4 py-3 shadow-xs">
    <div className="max-w-xl mx-auto flex justify-between items-center">
      <div className="flex items-center gap-2">
        <span className="text-lg">🎾</span>
        <span className="font-extrabold text-base tracking-tight">Tennis Score Tracker</span>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSaveMatch} className="text-xs bg-white text-slate-900 px-3 py-1.5 rounded-lg border border-blue-300 font-extrabold shadow-xs">
          💾 Save
        </button>
        <button onClick={() => setActiveTab('setup')} className="text-xs bg-white/80 text-slate-800 px-3 py-1.5 rounded-lg border border-blue-200 font-bold">
          ⚙️ Setup
        </button>
      </div>
    </div>
  </header>

  <main className="p-4 pt-5 max-w-xl mx-auto pb-24">
    {activeTab === 'tracker' && (
      <div className="space-y-4">
        <div className="bg-[#aed3fb] rounded-2xl border border-blue-300 p-4 shadow-md text-slate-900">
          <div className="flex justify-between items-center mb-3 border-b border-blue-200/80 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-widest">{matchSettings.tournament}</span>
            <span className="text-[11px] bg-white/80 px-2.5 py-1 rounded-full font-semibold">
              {matchSettings.setFormat === 'short' ? '4G Short Set' : '6G Standard'} • {matchSettings.scoringMode === 'no-ad' ? 'No-Ad' : 'Advantage'}
            </span>
          </div>
          <div className="space-y-2">
            <div className={`flex items-center justify-between p-2.5 rounded-xl ${matchState.currentServer === 'p1' ? 'bg-white/90 border-2 border-blue-500' : 'bg-white/50'}`}>
              <span className="font-bold">{matchState.currentServer === 'p1' && '🎾 '}{matchSettings.player1Name}</span>
              <div className="w-12 text-center bg-slate-900 text-white font-black text-xl py-1 rounded-lg">{matchState.gameScoreDisplay.p1}</div>
            </div>
            <div className={`flex items-center justify-between p-2.5 rounded-xl ${matchState.currentServer === 'p2' ? 'bg-white/90 border-2 border-blue-500' : 'bg-white/50'}`}>
              <span className="font-bold">{matchState.currentServer === 'p2' && '🎾 '}{matchSettings.player2Name}</span>
              <div className="w-12 text-center bg-slate-900 text-white font-black text-xl py-1 rounded-lg">{matchState.gameScoreDisplay.p2}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleRecordPoint('p1')} className="bg-[#aed3fb] hover:bg-[#9cc4f5] text-slate-900 font-extrabold py-5 px-3 rounded-2xl border-2 border-blue-300 flex flex-col items-center">
            <span className="text-xs uppercase">Point Won By</span>
            <span className="text-lg font-bold truncate w-full text-center">{matchSettings.player1Name}</span>
          </button>
          <button onClick={() => handleRecordPoint('p2')} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold py-5 px-3 rounded-2xl border-2 border-slate-300 flex flex-col items-center">
            <span className="text-xs uppercase">Point Won By</span>
            <span className="text-lg font-bold truncate w-full text-center">{matchSettings.player2Name}</span>
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={handleUndo} disabled={points.length === 0} className="flex-1 bg-amber-50 text-amber-900 border border-amber-300 font-bold py-3 rounded-xl text-xs">
            ↩️ Undo Last Ball
          </button>
        </div>
      </div>
    )}

    {activeTab === 'saved' && (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
          <h2 className="text-base font-bold text-slate-900">📁 Saved Matches Archive ({savedMatches.length})</h2>
          <button onClick={handleSaveMatch} className="bg-[#aed3fb] text-slate-900 border border-blue-300 text-xs px-3 py-1.5 rounded-xl font-bold">
            💾 Save Match
          </button>
        </div>
        {savedMatches.map((m) => (
          <div key={m.id} className="bg-white border rounded-2xl p-4 space-y-2 text-xs">
            <div className="font-bold text-slate-900 text-sm">{m.settings.player1Name} vs {m.settings.player2Name}</div>
            <div className="text-slate-500">📅 {m.settings.date} • Score: {m.scoreSummary || 'In Progress'}</div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => handleLoadSavedMatch(m)} className="flex-1 bg-[#aed3fb] text-slate-900 py-1.5 rounded-lg font-bold">📂 Load</button>
              <button onClick={() => handleDeleteSavedMatch(m.id)} className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg font-bold border border-rose-200">🗑️ Delete</button>
            </div>
          </div>
        ))}
      </div>
    )}
  </main>

  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t py-2 px-4">
    <div className="max-w-xl mx-auto grid grid-cols-4 gap-1 text-center text-xs font-bold">
      <button onClick={() => setActiveTab('tracker')} className={`py-2 rounded-xl ${activeTab === 'tracker' ? 'bg-[#aed3fb]' : ''}`}>🎾 Tracker</button>
      <button onClick={() => setActiveTab('stats')} className={`py-2 rounded-xl ${activeTab === 'stats' ? 'bg-[#aed3fb]' : ''}`}>📊 Stats</button>
      <button onClick={() => setActiveTab('history')} className={`py-2 rounded-xl ${activeTab === 'history' ? 'bg-[#aed3fb]' : ''}`}>📜 Log</button>
      <button onClick={() => setActiveTab('saved')} className={`py-2 rounded-xl ${activeTab === 'saved' ? 'bg-[#aed3fb]' : ''}`}>📁 Saved</button>
    </div>
  </nav>
</div>

```

);
}
