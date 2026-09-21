// Adding in a comment to trigger build
import React, { useState, useEffect } from 'react';
import './index.css';

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

setPoints((prev) => [...prev, newPoint]);
setServeStatus('1st');
showToast(`Point logged for ${pointWinner === 'p1' ? matchSettings.player1Name : matchSettings.player2Name}`);


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


};

const stats = calculateStats();

return (
<div className="min-h-screen bg-blue-50 pb-32">
  {toastMessage && (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-900 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg">
      {toastMessage}
    </div>
  )}

  <header className="flex justify-between items-center p-5">
    <div className="text-2xl font-black tracking-tighter">
      <span className="text-blue-900">Tennis</span><span className="text-blue-600">Pro</span>
    </div>
    <button onClick={handleSaveMatch} className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-blue-200 shadow-sm text-sm font-bold text-blue-600">
      ☁️ Sync
    </button>
  </header>

  <main className="max-w-xl mx-auto">
    {activeTab === 'tracker' && (
      <div className="space-y-6">
        {/* Scoreboard Card */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm mx-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-blue-400 font-bold text-[13px] tracking-wide uppercase">{matchSettings.tournament || 'JUNIOR TOURNAMENT'}</h2>
            <div className="w-8 h-4 rounded-full border-2 border-blue-100"></div>
          </div>

          <div className="space-y-6">
            {/* Kid (Player 1) */}
            <div className={`flex items-center justify-between p-4 rounded-2xl ${matchState.currentServer === 'p1' ? 'bg-blue-100 border border-blue-200' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${matchState.currentServer === 'p1' ? 'bg-blue-600' : 'bg-transparent'}`}></div>
                <span className="text-lg font-bold text-blue-900">{matchSettings.player1Name}</span>
                {matchState.currentServer === 'p1' && <span className="bg-blue-200 text-blue-800 text-[10px] font-black px-2 py-1 rounded tracking-wide">1ST SERVE</span>}
              </div>
              <div className="flex items-center gap-5">
                <span className="text-lg font-bold text-blue-900">{matchState.p1Sets}</span>
                <div className="bg-blue-900 text-white font-bold text-xl w-12 h-12 flex items-center justify-center rounded-xl shadow-inner">
                  {matchState.gameScoreDisplay.p1}
                </div>
              </div>
            </div>

            {/* Opponent (Player 2) */}
            <div className={`flex items-center justify-between p-4 rounded-2xl ${matchState.currentServer === 'p2' ? 'bg-blue-100 border border-blue-200' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${matchState.currentServer === 'p2' ? 'bg-blue-600' : 'bg-transparent'}`}></div>
                <span className="text-lg font-bold text-blue-800">{matchSettings.player2Name}</span>
                {matchState.currentServer === 'p2' && <span className="bg-blue-200 text-blue-800 text-[10px] font-black px-2 py-1 rounded tracking-wide">1ST SERVE</span>}
              </div>
              <div className="flex items-center gap-5">
                <span className="text-lg font-bold text-blue-900">{matchState.p2Sets}</span>
                <div className="bg-blue-900 text-white font-bold text-xl w-12 h-12 flex items-center justify-center rounded-xl shadow-inner">
                  {matchState.gameScoreDisplay.p2}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="grid grid-cols-2 gap-4 px-4">
          <div className="flex flex-col gap-3">
            <button onClick={() => handleRecordPoint('p1')} className="bg-blue-700 text-white rounded-[2rem] py-8 flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95">
              <span className="text-xl font-bold mb-1">{matchSettings.player1Name}</span>
              <span className="text-[10px] font-bold text-blue-200 tracking-widest uppercase">Add Details</span>
            </button>
            <button onClick={() => handleRecordPoint('p1', 'REGULAR')} className="bg-white text-blue-700 rounded-full py-4 font-semibold text-sm shadow-sm border border-blue-200 transition-colors active:bg-blue-50">
              Quick Log +1
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            <button onClick={() => handleRecordPoint('p2')} className="bg-white text-blue-900 rounded-[2rem] py-8 flex flex-col items-center justify-center shadow-md border-2 border-blue-700 transition-transform active:scale-95">
              <span className="text-xl font-bold mb-1">{matchSettings.player2Name}</span>
              <span className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">Add Details</span>
            </button>
            <button onClick={() => handleRecordPoint('p2', 'REGULAR')} className="bg-white text-blue-700 rounded-full py-4 font-semibold text-sm shadow-sm border border-blue-200 transition-colors active:bg-blue-50">
              Quick Log +1
            </button>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <button onClick={() => setServeStatus('2nd')} className="bg-blue-50 text-blue-700 border-2 border-blue-200 px-8 py-3 rounded-full font-bold text-sm shadow-sm flex items-center gap-2 active:bg-blue-100 transition-colors">
            ⚠️ Fault (Switch to 2nd Serve)
          </button>
        </div>
      </div>
    )}

    {activeTab === 'stats' && (
      <div className="space-y-4 px-4">
        {['p1', 'p2'].map((p) => (
          <div key={p} className="bg-white border border-blue-100 rounded-2xl p-4 space-y-1.5 text-sm shadow-sm text-blue-900">
            <div className="font-bold text-blue-900 text-base mb-2">
              {p === 'p1' ? matchSettings.player1Name : matchSettings.player2Name}
            </div>
            <div className="flex justify-between"><span>Total Points Won</span><span className="font-bold">{stats[p].totalPoints}</span></div>
            <div className="flex justify-between"><span>Aces</span><span className="font-bold">{stats[p].aces}</span></div>
            <div className="flex justify-between"><span>Double Faults</span><span className="font-bold">{stats[p].dfs}</span></div>
            <div className="flex justify-between"><span>Winners</span><span className="font-bold">{stats[p].winners}</span></div>
            <div className="flex justify-between"><span>Unforced Errors</span><span className="font-bold">{stats[p].totalUE}</span></div>
            <div className="flex justify-between"><span>Serve Points Won</span><span className="font-bold">{stats[p].servePointsWon}/{stats[p].servePoints}</span></div>
            <div className="flex justify-between"><span>Return Points Won</span><span className="font-bold">{stats[p].returnPointsWon}/{stats[p].returnPoints}</span></div>
          </div>
        ))}
      </div>
    )}

    {activeTab === 'setup' && (
      <div className="px-4">
         <div className="bg-white border border-blue-100 p-6 rounded-2xl shadow-sm text-sm text-center font-bold text-blue-500">
             Setup options would go here
         </div>
      </div>
    )}

    {activeTab === 'saved' && (
      <div className="space-y-4 px-4">
        <div className="flex justify-between items-center bg-white border border-blue-100 p-4 rounded-2xl shadow-sm">
          <h2 className="text-base font-bold text-blue-900">📁 Saved Matches ({savedMatches.length})</h2>
        </div>
        {savedMatches.map((m) => (
          <div key={m.id} className="bg-white border border-blue-100 shadow-sm rounded-2xl p-4 space-y-2 text-sm">
            <div className="font-bold text-blue-900">{m.settings.player1Name} vs {m.settings.player2Name}</div>
            <div className="text-blue-500">📅 {m.settings.date} • Score: {m.scoreSummary || 'In Progress'}</div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => handleLoadSavedMatch(m)} className="flex-1 bg-blue-50 text-blue-700 py-2 rounded-lg font-bold">📂 Load</button>
              <button onClick={() => handleDeleteSavedMatch(m.id)} className="bg-rose-50 text-rose-700 px-4 py-2 rounded-lg font-bold">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    )}
  </main>

  {/* Floating Bottom Nav Area */}
  <div className="fixed bottom-6 left-0 right-0 px-4 flex flex-col items-center z-50 pointer-events-none">
    <button onClick={handleUndo} disabled={points.length === 0} className="bg-white/90 backdrop-blur-md border border-blue-200 text-blue-700 px-6 py-2 rounded-full font-semibold text-sm mb-4 pointer-events-auto shadow-sm active:opacity-70 transition-opacity disabled:opacity-30">
      ↩ Undo Last Point
    </button>
    
    <div className="bg-blue-900 rounded-full w-full max-w-sm flex justify-between items-center px-2 py-2 relative shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] pointer-events-auto">
      <button onClick={() => setActiveTab('tracker')} className="flex flex-col items-center justify-center w-16 h-12 bg-white rounded-full z-10 shadow-sm transition-transform active:scale-95">
        <span className="text-lg">🎾</span>
        <span className="text-[10px] font-bold text-blue-900 mt-0.5">Play</span>
      </button>
      
      {/* Ask Gemini Button */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-4 z-20">
         <button className="bg-blue-700 text-white font-semibold text-sm px-6 py-4 rounded-3xl shadow-xl border border-blue-400/30 active:scale-95 transition-transform">
           Ask Gemini
         </button>
      </div>

      {/* Spacers and other nav buttons */}
      <div className="flex flex-1 justify-end items-center pr-2 gap-4">
        <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center w-12 transition-colors ${activeTab === 'stats' ? 'text-white' : 'text-blue-300 hover:text-white'}`}>
          <span className="text-lg">📊</span>
          <span className="text-[10px] font-semibold mt-0.5">Stats</span>
        </button>

        <button onClick={() => setActiveTab('setup')} className={`flex flex-col items-center w-12 transition-colors ${activeTab === 'setup' ? 'text-white' : 'text-blue-300 hover:text-white'}`}>
          <span className="text-lg">⚙️</span>
          <span className="text-[10px] font-semibold mt-0.5">Setup</span>
        </button>
        
        <button onClick={() => setActiveTab('saved')} className={`flex flex-col items-center w-12 transition-colors ${activeTab === 'saved' ? 'text-white' : 'text-blue-300 hover:text-white'}`}>
          <span className="text-lg">☁️</span>
          <span className="text-[10px] font-semibold mt-0.5">Cloud</span>
        </button>
      </div>
    </div>
  </div>
</div>
);
}
