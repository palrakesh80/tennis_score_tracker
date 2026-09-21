import re

with open('/home/palrakesh/agents_runtime/workspace/palrakesh80__tennis_score_tracker/src/App.jsx', 'r') as f:
    content = f.read()

# Add import './index.css'; at the top
if "import './index.css';" not in content:
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport './index.css';")

new_return = """return (
<div className="min-h-screen bg-[#f1f3f6] pb-32">
  {toastMessage && (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg">
      {toastMessage}
    </div>
  )}

  <header className="flex justify-between items-center p-5">
    <div className="text-2xl font-black tracking-tighter">
      <span className="text-slate-900">Tennis</span><span className="text-blue-500">Pro</span>
    </div>
    <button onClick={handleSaveMatch} className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm text-sm font-bold text-blue-500">
      ☁️ Sync
    </button>
  </header>

  <main className="max-w-xl mx-auto">
    {activeTab === 'tracker' && (
      <div className="space-y-6">
        {/* Scoreboard Card */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm mx-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-slate-400 font-bold text-[13px] tracking-wide uppercase">{matchSettings.tournament || 'JUNIOR TOURNAMENT'}</h2>
            <div className="w-8 h-4 rounded-full border-2 border-slate-100"></div>
          </div>

          <div className="space-y-6">
            {/* Kid (Player 1) */}
            <div className={`flex items-center justify-between p-4 rounded-2xl ${matchState.currentServer === 'p1' ? 'bg-[#f8faff] border border-blue-50/50' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${matchState.currentServer === 'p1' ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                <span className="text-lg font-bold text-slate-800">{matchSettings.player1Name}</span>
                {matchState.currentServer === 'p1' && <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded tracking-wide">1ST SERVE</span>}
              </div>
              <div className="flex items-center gap-5">
                <span className="text-lg font-bold text-slate-800">{matchState.p1Sets}</span>
                <div className="bg-[#111827] text-white font-bold text-xl w-12 h-12 flex items-center justify-center rounded-xl shadow-inner">
                  {matchState.gameScoreDisplay.p1}
                </div>
              </div>
            </div>

            {/* Opponent (Player 2) */}
            <div className={`flex items-center justify-between p-4 rounded-2xl ${matchState.currentServer === 'p2' ? 'bg-[#f8faff] border border-blue-50/50' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${matchState.currentServer === 'p2' ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                <span className="text-lg font-bold text-slate-600">{matchSettings.player2Name}</span>
                {matchState.currentServer === 'p2' && <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded tracking-wide">1ST SERVE</span>}
              </div>
              <div className="flex items-center gap-5">
                <span className="text-lg font-bold text-slate-800">{matchState.p2Sets}</span>
                <div className="bg-[#111827] text-white font-bold text-xl w-12 h-12 flex items-center justify-center rounded-xl shadow-inner">
                  {matchState.gameScoreDisplay.p2}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="grid grid-cols-2 gap-4 px-4">
          <div className="flex flex-col gap-3">
            <button onClick={() => handleRecordPoint('p1')} className="bg-[#131b2f] text-white rounded-[2rem] py-8 flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95">
              <span className="text-xl font-bold mb-1">{matchSettings.player1Name}</span>
              <span className="text-[10px] font-bold text-slate-300 tracking-widest uppercase">Add Details</span>
            </button>
            <button onClick={() => handleRecordPoint('p1', 'REGULAR')} className="bg-white text-slate-600 rounded-full py-4 font-semibold text-sm shadow-sm border border-slate-100 transition-colors active:bg-slate-50">
              Quick Log +1
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            <button onClick={() => handleRecordPoint('p2')} className="bg-white text-slate-800 rounded-[2rem] py-8 flex flex-col items-center justify-center shadow-sm border border-slate-100 transition-transform active:scale-95">
              <span className="text-xl font-bold mb-1">{matchSettings.player2Name}</span>
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Add Details</span>
            </button>
            <button onClick={() => handleRecordPoint('p2', 'REGULAR')} className="bg-white text-slate-600 rounded-full py-4 font-semibold text-sm shadow-sm border border-slate-100 transition-colors active:bg-slate-50">
              Quick Log +1
            </button>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <button onClick={() => setServeStatus('2nd')} className="bg-[#fff1c5] text-[#9c6a14] px-8 py-3 rounded-full font-bold text-sm shadow-sm flex items-center gap-2 active:opacity-80 transition-opacity">
            ⚠️ Fault (Switch to 2nd Serve)
          </button>
        </div>
      </div>
    )}

    {activeTab === 'stats' && (
      <div className="space-y-4 px-4">
        {['p1', 'p2'].map((p) => (
          <div key={p} className="bg-white border rounded-2xl p-4 space-y-1.5 text-sm shadow-sm">
            <div className="font-bold text-slate-900 text-base mb-2">
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
         <div className="bg-white p-6 rounded-2xl shadow-sm text-sm text-center font-bold text-slate-500">
             Setup options would go here
         </div>
      </div>
    )}

    {activeTab === 'saved' && (
      <div className="space-y-4 px-4">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
          <h2 className="text-base font-bold text-slate-900">📁 Saved Matches ({savedMatches.length})</h2>
        </div>
        {savedMatches.map((m) => (
          <div key={m.id} className="bg-white shadow-sm rounded-2xl p-4 space-y-2 text-sm">
            <div className="font-bold text-slate-900">{m.settings.player1Name} vs {m.settings.player2Name}</div>
            <div className="text-slate-500">📅 {m.settings.date} • Score: {m.scoreSummary || 'In Progress'}</div>
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
    <button onClick={handleUndo} disabled={points.length === 0} className="bg-white/30 backdrop-blur-md border border-white/40 text-slate-600 px-6 py-2 rounded-full font-semibold text-sm mb-4 pointer-events-auto shadow-sm active:opacity-70 transition-opacity disabled:opacity-30">
      ↩ Undo Last Point
    </button>
    
    <div className="bg-[#292f41] rounded-full w-full max-w-sm flex justify-between items-center px-2 py-2 relative shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] pointer-events-auto">
      <button onClick={() => setActiveTab('tracker')} className="flex flex-col items-center justify-center w-16 h-12 bg-white rounded-full z-10 shadow-sm transition-transform active:scale-95">
        <span className="text-lg">🎾</span>
        <span className="text-[10px] font-bold text-slate-900 mt-0.5">Play</span>
      </button>
      
      {/* Ask Gemini Button */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-4 z-20">
         <button className="bg-[#1b1f2b] text-white font-semibold text-sm px-6 py-4 rounded-3xl shadow-xl border border-white/5 active:scale-95 transition-transform">
           Ask Gemini
         </button>
      </div>

      {/* Spacers and other nav buttons */}
      <div className="flex flex-1 justify-end items-center pr-2 gap-4">
        <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center w-12 transition-colors ${activeTab === 'stats' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
          <span className="text-lg">📊</span>
          <span className="text-[10px] font-semibold mt-0.5">Stats</span>
        </button>

        <button onClick={() => setActiveTab('setup')} className={`flex flex-col items-center w-12 transition-colors ${activeTab === 'setup' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
          <span className="text-lg">⚙️</span>
          <span className="text-[10px] font-semibold mt-0.5">Setup</span>
        </button>
        
        <button onClick={() => setActiveTab('saved')} className={`flex flex-col items-center w-12 transition-colors ${activeTab === 'saved' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
          <span className="text-lg">☁️</span>
          <span className="text-[10px] font-semibold mt-0.5">Cloud</span>
        </button>
      </div>
    </div>
  </div>
</div>
);
}
"""

start_idx = content.find('return (')
if start_idx != -1:
    content = content[:start_idx] + new_return

with open('/home/palrakesh/agents_runtime/workspace/palrakesh80__tennis_score_tracker/src/App.jsx', 'w') as f:
    f.write(content)
