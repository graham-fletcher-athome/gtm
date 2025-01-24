
export function analyse(fen,cb) {
  /* Returns the analysis for a fen if it exists or adds it to the analysis queue if it doesnt*/

    if (fen in __savedAnalysis) 
      cb( fen, __savedAnalysis[fen] )  
      
    if (!(fen in __analysisQueue))
    {
      __analysisQueue.push({"p":fen,"cb":cb})
      __nextAnalysis()
    }
    return null
}

function clearAnalysisQueue(){

  /* Clears the analysis queue */

  __stockfishWorker.postMessage(`stop`);
  analyisQueue = []
  analysisRunning = null
}

var __stockfishWorker = null
var __savedAnalysis = {}
var __analysisQueue = []
var __analysisRunning = null
var __currentAnalysis = []
var __stockfishReady = false
var __currentCB = null

$(window).on("beforeunload", function() {
  if (__stockfishWorker != null)
  {
    __stockfishWorker.terminate()
    __stockfishWorker == null
  }
});

function __nextAnalysis()
{

    if (__stockfishWorker == null)
    {
      __stockfishReady = false
      __stockfishWorker = new Worker("./stockfish-16.1-single.js");
      __stockfishWorker.onmessage = __processMessages
    }

    if (__stockfishReady)
    {
      if ((__analysisRunning == null) && (__analysisQueue.length > 0))
      {
          var x = __analysisQueue.shift()
          
          __analysisRunning = x["p"]
          __currentAnalysis=[]
          __currentCB=x['cb']
          
          __stockfishWorker.postMessage(`position fen `+ __analysisRunning);
          __stockfishWorker.postMessage(`setoption name MultiPV value 5`)
          __stockfishWorker.postMessage("go depth 12")
      }
    }
    else
      setTimeout(__nextAnalysis, 1000);
}

// Listen for messages from Stockfish
function __processMessages(event){
  const message = event.data;
  __stockfishReady = true
  if( message.match("^bestmove.*$") !== null)
  {
    __savedAnalysis[__analysisRunning] = __currentAnalysis
    __currentCB(__analysisRunning, __currentAnalysis)
    __currentAnalysis = []
    __analysisRunning = null
    __nextAnalysis()
  }

  var m= message.match("^info depth (?<depth>[0123456789]+) .+?(?= multipv) multipv (?<mpv>[0123456789]+) score (?<sct>[cpmate]*) (?<sc>[-0123456789]+) .+?(?= pv) pv (?<m>[12345678abcdefgh\+\=RQBN#]+)(?<rem>.*)")
  if (m!== null)
  {
    var x = m[3]=="cp"?Number(m[4]):(Number(m[4])<0?-2000:2000)
    var prob = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * x)) - 1)
    __currentAnalysis[Number(m[2]-1)] = {
      depth: Number(m[1]),
      eval : prob,
      san : m[5],
      line: m[5]+m[6],
      reval: m[3]+" "+m[4]
    }
  }
};





