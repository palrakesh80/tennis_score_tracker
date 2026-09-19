import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection, query } from "firebase/firestore";

// --- FIREBASE INITIALIZATION ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'tennis-tracker-app';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("Firebase initialization skipped (expected in local dev without config)");
}

const MATCH_FORMATS = {
  JUNIOR_STANDARD: {
    id: 'junior_standard',
    label: 'Junior Standard (2 Sets to 6, TB at 5-5, 10-pt 3rd)',
    gamesToWin: 6,
    tiebreakAt: 5,
    setTiebreakPoints: 7,
    thirdSet10Pt: true,
    scoringMode: 'ad',
  },
  JUNIOR_SHORT: {
    id: 'junior_short',
    label: 'Junior Short (2 Sets to 4, TB at 3-3, 10-pt 3rd)',
    gamesToWin: 4,
    tiebreakAt: 3,
    setTiebreakPoints: 7,
    thirdSet10Pt: true,
    scoringMode: 'no-ad',
  }
};

const INITIAL_MATCH_SETTINGS = {
  player1Name: 'Kid (Player 1)',
  player2Name: 'Opponent',
  tournament: 'Junior Tournament',
  date: new Date().toISOString().split('T')[0],
  format: 'junior_standard', 
  initialServer: 'p1',
};

const computeMatchState = (points, settings) => {
  const format = MATCH_FORMATS[settings.format] || MATCH_FORMATS.JUNIOR_STANDARD;
  
  let p1Sets = 0;
  let p2Sets = 0;
  let setScores = [{ p1: 0, p2: 0, tiebreak: null }];
  let currentSetIdx = 0;
  let currentServer = settings.initialServer;
  
  let p1GamePoints = 0;
  let p2GamePoints = 0;
  
  let inTiebreak = false;
  let tiebreakTarget = 7;
  let tiebreakP1 = 0;
  let tiebreakP2 = 0;
  let tiebreakServeCounter = 0;
  
  let currentGameServer = settings.initialServer;
  let matchComplete = false;
  let winner = null;

  const switchServer = (fromServer) => (fromServer === 'p1' ? 'p2' : 'p1');

  for (let i = 0; i < points.length; i++) {
    if (matchComplete) break;

    const pt = points[i];
    const ptWinner = pt.pointWinner;

    // Check if we just entered the 3rd set and it should be a 10-pt match tiebreak
    if (currentSetIdx === 2 && format.thirdSet10Pt && !inTiebreak) {
      inTiebreak = true;
      tiebreakTarget = 10;
      tiebreakP1 = 0;
      tiebreakP2 = 0;
      tiebreakServeCounter = 0;
    }

    if (inTiebreak) {
      if (ptWinner === 'p1') tiebreakP1++;
      else tiebreakP2++;

      tiebreakServeCounter++;
      // Switch server after 1st point, then every 2 points
      if (tiebreakServeCounter === 1 || (tiebreakServeCounter > 1 && (tiebreakServeCounter - 1) % 2 === 0)) {
        currentServer = switchServer(currentServer);
      }

      // Check for tiebreak win
      if ((tiebreakP1 >= tiebreakTarget || tiebreakP2 >= tiebreakTarget) && Math.abs(tiebreakP1 - tiebreakP2) >= 2) {
        if (tiebreakP1 > tiebreakP2) {
          if (currentSetIdx === 2 && format.thirdSet10Pt) {
             setScores[currentSetIdx].p1 = 1; // 1-0 for match tiebreak
             setScores[currentSetIdx].tiebreak = `${tiebreakP1}-${tiebreakP2}`;
          } else {
             setScores[currentSetIdx].p1++;
             setScores[currentSetIdx].tiebreak = `${tiebreakP1}-${tiebreakP2}`;
          }
          p1Sets++;
        } else {
          if (currentSetIdx === 2 && format.thirdSet10Pt) {
             setScores[currentSetIdx].p2 = 1; 
             setScores[currentSetIdx].tiebreak = `${tiebreakP2}-${tiebreakP1}`;
          } else {
             setScores[currentSetIdx].p2++;
             setScores[currentSetIdx].tiebreak = `${tiebreakP2}-${tiebreakP1}`;
          }
          p2Sets++;
        }

        inTiebreak = false;
        p1GamePoints = 0;
        p2GamePoints = 0;
        
        // Start next set server (receiver of first game of previous set)
        currentGameServer = switchServer(currentGameServer);
        currentServer = currentGameServer;

        if (p1Sets === 2 || p2Sets === 2) {
          matchComplete = true;
          winner = p1Sets > p2Sets ? 'p1' : 'p2';
        } else {
          currentSetIdx++;
          setScores.push({ p1: 0, p2: 0, tiebreak: null });
        }
      }
    } else {
      // Normal game play
      if (ptWinner === 'p1') p1GamePoints++;
      else p2GamePoints++;

      let gameWon = false;
      let gameWinner = null;

      if (format.scoringMode === 'no-ad') {
        if (p1GamePoints >= 4) { gameWon = true; gameWinner = 'p1'; }
        else if (p2GamePoints >= 4) { gameWon = true; gameWinner = 'p2'; }
      } else {
        // Standard Advantage
        if (p1GamePoints >= 4 && p1GamePoints - p2GamePoints >= 2) { gameWon = true; gameWinner = 'p1'; }
        else if (p2GamePoints >= 4 && p2GamePoints - p1GamePoints >= 2) { gameWon = true; gameWinner = 'p2'; }
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

        // Check for normal set tiebreak
        if (p1G === format.tiebreakAt && p2G === format.tiebreakAt) {
          inTiebreak = true;
          tiebreakTarget = format.setTiebreakPoints;
          tiebreakP1 = 0;
          tiebreakP2 = 0;
          tiebreakServeCounter = 0;
        } 
        // Check for normal set win
        else if ((p1G >= format.gamesToWin || p2G >= format.gamesToWin) && Math.abs(p1G - p2G) >= 2) {
          if (p1G > p2G) p1Sets++;
          else p2Sets++;

          if (p1Sets === 2 || p2Sets === 2) {
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
    p1Sets, p2Sets, setScores, currentSetIdx, currentServer,
    p1GamePoints, p2GamePoints, inTiebreak, tiebreakP1, tiebreakP2,
    gameScoreDisplay, matchComplete, winner, tiebreakTarget
  };
};

export default function App() {
  // Authentication & DB State
  const [user, setUser] = useState(null);
  const [cloudMatches, setCloudMatches] = useState([]);
  
  // Local Active Match State
  const [matchSettings, setMatchSettings] = useState(() => {
    const saved = localStorage.getItem('tennis_match_settings_v2');
    return saved ? JSON.parse(saved) : INITIAL_MATCH_SETTINGS;
  });
  const [points, setPoints] = useState(() => {
    const saved = localStorage.getItem('tennis_match_points_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [serveStatus, setServeStatus] = useState('1st');

  // UI State
  const [activeTab, setActiveTab] = useState('tracker'); 
  const [toastMessage, setToastMessage] = useState(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  
  // Action Sheet (Detailed Point Entry) State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activePointEntry, setActivePointEntry] = useState(null);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      if (initialAuthToken) {
        try { await signInWithCustomToken(auth, initialAuthToken); }
        catch (e) { await signInAnonymously(auth); }
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();

    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const matchesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'saved_matches');
    const q = query(matchesRef);
    const unsub = onSnapshot(q, (snap) => {
      const m = [];
      snap.forEach(doc => m.push({ id: doc.id, ...doc.data() }));
      setCloudMatches(m.sort((a, b) => b.savedTimeMs - a.savedTimeMs));
    }, (err) => console.error("Firestore sync error", err));
    return unsub;
  }, [user]);

  useEffect(() => {
    localStorage.setItem('tennis_match_settings_v2', JSON.stringify(matchSettings));
  }, [matchSettings]);

  useEffect(() => {
    localStorage.setItem('tennis_match_points_v2', JSON.stringify(points));
  }, [points]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const matchState = computeMatchState(points, matchSettings);

  const handleSaveToCloud = async () => {
    if (!user || !db) {
      showToast("⚠️ Cloud storage unavailable. Log in first.");
      return;
    }
    try {
      const matchId = `match_${matchSettings.date}_${matchSettings.player1Name.replace(/\s+/g, '')}`;
      const matchRef = doc(db, 'artifacts', appId, 'users', user.uid, 'saved_matches', matchId);
      
      const payload = {
        savedTimeMs: Date.now(),
        savedDate: new Date().toLocaleDateString(),
        settings: matchSettings,
        points: points,
        scoreSummary: matchState.setScores.map((s) => `${s.p1}-${s.p2}${s.tiebreak ? `(${s.tiebreak})` : ''}`).join(', '),
        isComplete: matchState.matchComplete,
        winnerName: matchState.winner === 'p1' ? matchSettings.player1Name : matchState.winner === 'p2' ? matchSettings.player2Name : null,
      };

      await setDoc(matchRef, payload);
      showToast('☁️ Match seamlessly synced to Cloud!');
    } catch (err) {
      console.error(err);
      showToast('❌ Error saving to cloud.');
    }
  };

  const handleLoadCloudMatch = (matchRecord) => {
    setMatchSettings(matchRecord.settings);
    setPoints(matchRecord.points);
    setActiveTab('tracker');
    showToast(`Loaded match: ${matchRecord.settings.player1Name} vs ${matchRecord.settings.player2Name}`);
  };

  const handleDeleteCloudMatch = async (id) => {
    if (!user || !db) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'saved_matches', id));
      showToast('🗑️ Cloud match deleted.');
    } catch (e) {
      showToast('❌ Error deleting match.');
    }
  };

  const handleUndo = () => {
    if (points.length === 0) return;
    const updated = [...points];
    updated.pop();
    setPoints(updated);
    showToast(`↩️ Undid last point`);
  };

  const handleResetMatch = () => {
    setPoints([]);
    setServeStatus('1st');
    setShowConfirmReset(false);
    showToast('🔄 Match reset entirely.');
  };

  const initiatePointEntry = (winnerId) => {
    if (matchState.matchComplete) {
      showToast('🏆 Match is already completed!');
      return;
    }
    setActivePointEntry({
      pointWinner: winnerId,
      step: 'outcome', // 'outcome' -> 'shot' -> 'location'
      server: matchState.currentServer,
      serveStatus: serveStatus,
      // Data to build up:
      endingPlayer: null,
      endingType: null,
      shotType: null,
      errorLocation: null
    });
    setDetailModalOpen(true);
  };

  const finalizePoint = (pointData) => {
    const newPoint = {
      id: Date.now(),
      ...pointData,
      setIndex: matchState.currentSetIdx,
      inTiebreak: matchState.inTiebreak,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setPoints((prev) => [...prev, newPoint]);
    setServeStatus('1st');
    setDetailModalOpen(false);
    setActivePointEntry(null);
  };

  const handleQuickLog = (winnerId) => {
    if (matchState.matchComplete) {
      showToast('🏆 Match is already completed!');
      return;
    }
    finalizePoint({
      pointWinner: winnerId,
      server: matchState.currentServer,
      serveStatus: serveStatus,
      endingPlayer: winnerId,
      endingType: 'regular',
    });
  };

  const calculateStats = () => {
    const stats = {
      p1: { points: 0, winners: 0, ue: 0, fe: 0, aces: 0, dfs: 0, fhWinners: 0, bhWinners: 0, fhUE: 0, bhUE: 0 },
      p2: { points: 0, winners: 0, ue: 0, fe: 0, aces: 0, dfs: 0, fhWinners: 0, bhWinners: 0, fhUE: 0, bhUE: 0 },
    };

    points.forEach((pt) => {
      if (!pt.pointWinner) return;
      stats[pt.pointWinner].points++;

      if (pt.endingType === 'ace') {
        stats[pt.endingPlayer].aces++;
        stats[pt.endingPlayer].winners++;
      }
      else if (pt.endingType === 'df') {
        stats[pt.endingPlayer].dfs++;
        stats[pt.endingPlayer].ue++;
      }
      else if (pt.endingType === 'winner') {
        stats[pt.endingPlayer].winners++;
        if (pt.shotType === 'Forehand') stats[pt.endingPlayer].fhWinners++;
        if (pt.shotType === 'Backhand') stats[pt.endingPlayer].bhWinners++;
      }
      else if (pt.endingType === 'ue') {
        stats[pt.endingPlayer].ue++;
        if (pt.shotType === 'Forehand') stats[pt.endingPlayer].fhUE++;
        if (pt.shotType === 'Backhand') stats[pt.endingPlayer].bhUE++;
      }
      else if (pt.endingType === 'fe') {
        stats[pt.endingPlayer].fe++;
      }
    });

    return stats;
  };

  const stats = calculateStats();

  const renderTrackerView = () => (
    <div className="space-y-5 max-w-xl mx-auto pb-24 animate-fade-in">
      {/* Dynamic Match Scoreboard */}
      <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {matchSettings.tournament || 'Match In Progress'}
          </span>
          <span className="text-[10px] bg-slate-50 px-2.5 py-1 rounded-full font-bold text-slate-500 border border-slate-200">
            {MATCH_FORMATS[matchSettings.format]?.label.split('(')[0]}
          </span>
        </div>

        <div className="space-y-3">
          {['p1', 'p2'].map((playerId) => (
            <div key={playerId} className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
              matchState.currentServer === playerId ? 'bg-blue-50/50 shadow-sm border border-blue-100' : ''
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${matchState.currentServer === playerId ? 'bg-blue-500' : 'bg-transparent'}`} />
                <span className={`font-semibold text-base ${matchState.currentServer === playerId ? 'text-slate-900' : 'text-slate-600'}`}>
                  {playerId === 'p1' ? matchSettings.player1Name : matchSettings.player2Name}
                </span>
                {matchState.currentServer === playerId && (
                  <span className="text-[9px] font-extrabold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md uppercase">
                    {serveStatus} Serve
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2 text-sm font-semibold text-slate-500">
                  {matchState.setScores.map((s, idx) => (
                    <span key={idx} className={idx === matchState.currentSetIdx ? 'text-slate-900 font-bold' : ''}>
                      {s[playerId]}
                    </span>
                  ))}
                </div>
                <div className="w-11 h-10 flex items-center justify-center bg-slate-900 text-white font-bold text-lg rounded-xl shadow-inner">
                  {matchState.gameScoreDisplay[playerId]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {matchState.matchComplete && (
        <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-5 rounded-3xl text-center shadow-lg text-white space-y-1">
          <p className="text-3xl mb-2">🏆</p>
          <p className="font-extrabold text-xl">
            {matchState.winner === 'p1' ? matchSettings.player1Name : matchSettings.player2Name} Wins!
          </p>
          <p className="text-sm font-medium opacity-90">
            Final Score: {matchState.setScores.map(s => `${s.p1}-${s.p2}${s.tiebreak ? `(${s.tiebreak})` : ''}`).join(', ')}
          </p>
        </div>
      )}

      {/* Point Entry Section */}
      {!matchState.matchComplete && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
               <button onClick={() => initiatePointEntry('p1')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-6 px-4 rounded-3xl shadow-md transition-transform active:scale-95 flex flex-col items-center gap-1">
                  <span className="text-xl truncate w-full text-center">{matchSettings.player1Name}</span>
                  <span className="text-[10px] uppercase tracking-widest opacity-70">Add Details</span>
               </button>
               <button onClick={() => handleQuickLog('p1')} className="w-full bg-white text-slate-600 border border-slate-200 font-semibold py-2.5 rounded-2xl text-xs shadow-sm hover:bg-slate-50 transition-colors">
                 Quick Log +1
               </button>
            </div>
            
            <div className="space-y-2">
               <button onClick={() => initiatePointEntry('p2')} className="w-full bg-white border border-slate-200 text-slate-800 font-bold py-6 px-4 rounded-3xl shadow-sm transition-transform active:scale-95 flex flex-col items-center gap-1">
                  <span className="text-xl truncate w-full text-center">{matchSettings.player2Name}</span>
                  <span className="text-[10px] uppercase tracking-widest opacity-50">Add Details</span>
               </button>
               <button onClick={() => handleQuickLog('p2')} className="w-full bg-white text-slate-600 border border-slate-200 font-semibold py-2.5 rounded-2xl text-xs shadow-sm hover:bg-slate-50 transition-colors">
                 Quick Log +1
               </button>
            </div>
          </div>

          {/* Service Fault Toggle */}
          <div className="flex justify-center pt-2">
            <button
              onClick={() => {
                if (serveStatus === '1st') setServeStatus('2nd');
                else finalizePoint({ pointWinner: matchState.currentServer === 'p1' ? 'p2' : 'p1', endingPlayer: matchState.currentServer, endingType: 'df' });
              }}
              className={`py-3 px-6 rounded-full font-bold text-xs transition-all shadow-sm ${
                serveStatus === '1st'
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
              }`}
            >
              {serveStatus === '1st' ? '⚠️ Fault (Switch to 2nd Serve)' : '❌ Double Fault'}
            </button>
          </div>
        </div>
      )}

      {/* Undo */}
      <div className="pt-4 flex justify-center">
        <button onClick={handleUndo} disabled={points.length === 0} className="text-slate-400 font-semibold text-xs py-2 px-4 rounded-full border border-slate-200 hover:bg-slate-50 disabled:opacity-30">
          ↩️ Undo Last Point
        </button>
      </div>
    </div>
  );

  const renderActionSheet = () => {
    if (!detailModalOpen || !activePointEntry) return null;
    
    const { pointWinner, step, endingPlayer, endingType, shotType } = activePointEntry;
    const winnerName = pointWinner === 'p1' ? matchSettings.player1Name : matchSettings.player2Name;
    const loserId = pointWinner === 'p1' ? 'p2' : 'p1';
    const loserName = loserId === 'p1' ? matchSettings.player1Name : matchSettings.player2Name;

    const handleSelectOutcome = (type, player) => {
      if (type === 'ace') {
        finalizePoint({ ...activePointEntry, endingType: 'ace', endingPlayer: pointWinner });
      } else if (type === 'df') {
         finalizePoint({ ...activePointEntry, endingType: 'df', endingPlayer: loserId });
      } else {
        setActivePointEntry({ ...activePointEntry, step: 'shot', endingType: type, endingPlayer: player });
      }
    };

    const handleSelectShot = (shot) => {
      if (endingType === 'winner') {
        finalizePoint({ ...activePointEntry, shotType: shot });
      } else {
        setActivePointEntry({ ...activePointEntry, step: 'location', shotType: shot });
      }
    };

    const handleSelectLocation = (loc) => {
      finalizePoint({ ...activePointEntry, errorLocation: loc });
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4 animate-fade-in">
        <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-12 sm:pb-6 shadow-2xl transition-transform transform translate-y-0 relative">
          
          <button onClick={() => setDetailModalOpen(false)} className="absolute top-4 right-5 text-slate-400 hover:text-slate-800 font-bold bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center">
            ✕
          </button>

          {step === 'outcome' && (
            <div className="space-y-4 animate-slide-up">
              <h3 className="text-xl font-bold text-slate-900 text-center mb-6">How did {winnerName} win?</h3>
              
              {matchState.currentServer === pointWinner && (
                <button onClick={() => handleSelectOutcome('ace', pointWinner)} className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 py-3.5 rounded-2xl font-bold text-sm">
                  🚀 Ace
                </button>
              )}

              <button onClick={() => handleSelectOutcome('winner', pointWinner)} className="w-full bg-blue-50 text-blue-700 border border-blue-200 py-3.5 rounded-2xl font-bold text-sm">
                💥 {winnerName} hit a Winner
              </button>

              <div className="py-2 flex items-center justify-center">
                <div className="h-px bg-slate-100 flex-1"></div>
                <span className="text-[10px] text-slate-400 uppercase px-3 font-bold">OR</span>
                <div className="h-px bg-slate-100 flex-1"></div>
              </div>

              <button onClick={() => handleSelectOutcome('ue', loserId)} className="w-full bg-rose-50 text-rose-700 border border-rose-200 py-3.5 rounded-2xl font-bold text-sm">
                🤦 {loserName} made an Unforced Error
              </button>
              
              <button onClick={() => handleSelectOutcome('fe', loserId)} className="w-full bg-amber-50 text-amber-700 border border-amber-200 py-3.5 rounded-2xl font-bold text-sm">
                🛡️ {loserName} made a Forced Error
              </button>
            </div>
          )}

          {step === 'shot' && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center gap-2 mb-6 text-slate-400 text-xs font-bold cursor-pointer" onClick={() => setActivePointEntry({...activePointEntry, step: 'outcome'})}>
                ← Back
              </div>
              <h3 className="text-xl font-bold text-slate-900 text-center mb-6">
                Which shot was it?
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {['Forehand', 'Backhand', 'Volley', 'Overhead'].map(shot => (
                  <button key={shot} onClick={() => handleSelectShot(shot)} className="bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 py-5 rounded-2xl font-bold text-sm">
                    {shot}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'location' && (
            <div className="space-y-4 animate-slide-up">
               <div className="flex items-center gap-2 mb-6 text-slate-400 text-xs font-bold cursor-pointer" onClick={() => setActivePointEntry({...activePointEntry, step: 'shot'})}>
                ← Back
              </div>
              <h3 className="text-xl font-bold text-slate-900 text-center mb-6">
                Where did it miss?
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                {['Net 🕸️', 'Long ↗️', 'Wide ↔️'].map(loc => (
                  <button key={loc} onClick={() => handleSelectLocation(loc.split(' ')[0])} className="bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 py-6 rounded-2xl font-bold text-sm flex flex-col items-center gap-2">
                    <span className="text-lg">{loc.split(' ')[1]}</span>
                    <span>{loc.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  const renderStatsView = () => (
    <div className="space-y-4 max-w-xl mx-auto pb-24">
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Detailed Analytics</h2>
        
        {/* Table Header */}
        <div className="grid grid-cols-3 text-center font-bold text-xs pb-3 border-b border-slate-100 text-slate-500">
          <span className="text-left text-blue-600 truncate">{matchSettings.player1Name}</span>
          <span className="uppercase text-[10px] tracking-wider">Stat</span>
          <span className="text-right text-slate-700 truncate">{matchSettings.player2Name}</span>
        </div>

        {/* Rows */}
        <div className="space-y-1">
          <StatRow label="Total Points" v1={stats.p1.points} v2={stats.p2.points} highlight />
          <StatRow label="Aces" v1={stats.p1.aces} v2={stats.p2.aces} />
          <StatRow label="Double Faults" v1={stats.p1.dfs} v2={stats.p2.dfs} color="text-rose-600" />
          
          <div className="pt-3 mt-3 border-t border-slate-50">
             <StatRow label="Total Winners" v1={stats.p1.winners} v2={stats.p2.winners} color="text-emerald-600" highlight />
             <StatRow label="Forehand Winners" v1={stats.p1.fhWinners} v2={stats.p2.fhWinners} text="text-xs text-slate-500" />
             <StatRow label="Backhand Winners" v1={stats.p1.bhWinners} v2={stats.p2.bhWinners} text="text-xs text-slate-500" />
          </div>

          <div className="pt-3 mt-3 border-t border-slate-50">
             <StatRow label="Unforced Errors" v1={stats.p1.ue} v2={stats.p2.ue} color="text-amber-600" highlight />
             <StatRow label="Forehand UEs" v1={stats.p1.fhUE} v2={stats.p2.fhUE} text="text-xs text-slate-500" />
             <StatRow label="Backhand UEs" v1={stats.p1.bhUE} v2={stats.p2.bhUE} text="text-xs text-slate-500" />
          </div>

          <div className="pt-3 mt-3 border-t border-slate-50">
             <StatRow label="Forced Errors" v1={stats.p1.fe} v2={stats.p2.fe} />
          </div>
        </div>
      </div>
    </div>
  );

  const StatRow = ({ label, v1, v2, highlight, color = "text-slate-900", text = "text-sm" }) => (
    <div className={`grid grid-cols-3 text-center py-2 items-center ${highlight ? 'bg-slate-50 rounded-xl px-2' : 'px-2'}`}>
      <span className={`text-left font-bold ${color}`}>{v1}</span>
      <span className={`${text} font-medium text-slate-500`}>{label}</span>
      <span className={`text-right font-bold ${color}`}>{v2}</span>
    </div>
  );

  const renderSetupView = () => (
    <div className="space-y-6 max-w-xl mx-auto pb-24">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
        <div>
           <h2 className="text-xl font-extrabold text-slate-900">Match Setup</h2>
           <p className="text-xs text-slate-500 mt-1">Configure format and players.</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Player 1</label>
                <input type="text" value={matchSettings.player1Name} onChange={(e) => setMatchSettings({...matchSettings, player1Name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
             </div>
             <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Player 2</label>
                <input type="text" value={matchSettings.player2Name} onChange={(e) => setMatchSettings({...matchSettings, player2Name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
             </div>
          </div>

          <div>
             <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Junior Match Format</label>
             <select value={matchSettings.format} onChange={(e) => setMatchSettings({...matchSettings, format: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-semibold focus:outline-none">
                <option value="junior_standard">{MATCH_FORMATS.JUNIOR_STANDARD.label}</option>
                <option value="junior_short">{MATCH_FORMATS.JUNIOR_SHORT.label}</option>
             </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
           <button onClick={() => setActiveTab('tracker')} className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-2xl shadow-md">
             Start Tracking
           </button>
           <button onClick={() => setShowConfirmReset(true)} className="w-full bg-rose-50 text-rose-700 font-semibold py-3 rounded-2xl text-xs">
             Reset Current Match Data
           </button>
        </div>
      </div>
    </div>
  );

  const renderCloudView = () => (
    <div className="space-y-4 max-w-xl mx-auto pb-24">
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
         <div className="flex justify-between items-center mb-4">
            <div>
               <h2 className="text-lg font-bold text-slate-900">Cloud Matches</h2>
               <p className="text-[10px] text-slate-500">{user ? `Syncing as ${user.uid.substring(0,6)}` : 'Not connected'}</p>
            </div>
            <button onClick={handleSaveToCloud} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md">
               ☁️ Push Current
            </button>
         </div>

         {!user ? (
            <div className="text-center py-8 text-sm text-slate-500">Connecting to cloud...</div>
         ) : cloudMatches.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500 bg-slate-50 rounded-2xl">No cloud matches found.</div>
         ) : (
            <div className="space-y-3">
               {cloudMatches.map(m => (
                  <div key={m.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-2">
                     <div className="flex justify-between">
                        <span className="font-bold text-slate-900">{m.settings.player1Name} vs {m.settings.player2Name}</span>
                        {m.isComplete && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Done</span>}
                     </div>
                     <div className="text-xs text-slate-500 font-medium">Score: {m.scoreSummary || 'In Progress'}</div>
                     <div className="text-[10px] text-slate-400">{new Date(m.savedTimeMs).toLocaleString()}</div>
                     <div className="flex gap-2 pt-2">
                        <button onClick={() => handleLoadCloudMatch(m)} className="flex-1 bg-white border border-slate-200 text-slate-700 text-xs py-1.5 rounded-xl font-bold shadow-sm">Load</button>
                        <button onClick={() => handleDeleteCloudMatch(m.id)} className="bg-rose-100 text-rose-700 text-xs px-3 py-1.5 rounded-xl font-bold">Delete</button>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-slate-900 font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
      `}} />

      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white font-semibold text-xs px-5 py-2.5 rounded-full shadow-xl">
          {toastMessage}
        </div>
      )}

      {renderActionSheet()}

      <header className="sticky top-0 z-40 bg-[#F2F2F7]/80 backdrop-blur-md px-4 py-4 pb-2 border-b border-slate-200/50">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <span className="font-extrabold text-xl tracking-tight text-slate-900">Tennis<span className="text-blue-600">Pro</span></span>
          <div className="flex gap-2">
            <button onClick={handleSaveToCloud} className="text-xs bg-white text-blue-600 px-3 py-1.5 rounded-full font-bold shadow-sm border border-slate-200">
              ☁️ Sync
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 pt-6 max-w-xl mx-auto">
        {activeTab === 'tracker' && renderTrackerView()}
        {activeTab === 'stats' && renderStatsView()}
        {activeTab === 'setup' && renderSetupView()}
        {activeTab === 'cloud' && renderCloudView()}
      </main>

      {/* Tab Navigation Menu */}
      <nav className="fixed bottom-6 left-4 right-4 z-40 max-w-sm mx-auto">
        <div className="bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-full grid grid-cols-4 gap-1 shadow-2xl ring-1 ring-white/10">
          {[
            { id: 'tracker', icon: '🎾', label: 'Play' },
            { id: 'stats', icon: '📊', label: 'Stats' },
            { id: 'setup', icon: '⚙️', label: 'Setup' },
            { id: 'cloud', icon: '☁️', label: 'Cloud' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-2 rounded-full transition-all ${
                activeTab === tab.id ? 'bg-white text-slate-900 scale-95 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span className="text-[9px] font-bold mt-0.5">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Reset Confirmation Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl max-w-xs w-full text-center shadow-2xl animate-slide-up">
            <h3 className="font-extrabold text-lg mb-2">Reset Match?</h3>
            <p className="text-xs text-slate-500 mb-6">This will clear all points and start fresh. Saved cloud data won't be deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmReset(false)} className="flex-1 bg-slate-100 text-slate-800 font-bold py-3 rounded-2xl text-xs">Cancel</button>
              <button onClick={handleResetMatch} className="flex-1 bg-rose-600 text-white font-bold py-3 rounded-2xl text-xs shadow-md">Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}