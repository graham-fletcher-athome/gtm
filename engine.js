export class UCIengine{

  analyse(fen) {

    var self=this
    var resolver
    /* Returns the analysis for a fen if it exists or adds it to the analysis queue if it doesnt*/

    var prom = new Promise(function(resolve, reject) {
      resolver = resolve
      if (fen in self.__savedAnalysis) 
        resolve(self.__savedAnalysis[fen] )  
    })
    prom.resolve = resolver
    if (!(fen in self.__analysisQueue)){
      self.__analysisQueue.push({"p":fen,"cb":prom})
      self.__nextAnalysis()
    } 

    return prom
  }

  clearAnalysisQueue(){
    var self=this
    self.__analysisQueue = []
  }

  constructor(engine){
    var self=this
    self.__stockfishWorker = null
    self.__savedAnalysis = {}
    self.__analysisQueue = []
    self.__analysisRunning = null
    self. __currentAnalysis = []
    self.__stockfishReady = false
    self.__currentCB = null
    self.engine = engine
    if (self.__stockfishWorker == null)
      {
        self.__stockfishReady = false
        self.__stockfishWorker = new Worker(self.engine);
        self.__stockfishWorker.onmessage = ((e)=>{self.__processMessages(e)})
      }
    
    $(window).on("beforeunload", function() {
      if (__stockfishWorker != null)
      {
        __stockfishWorker.terminate()
        __stockfishWorker == null
      }
    });
  }



  __nextAnalysis()
  {
      var self=this

      if (self.__stockfishReady)
      {
        if ((self.__analysisRunning == null) && (self.__analysisQueue.length > 0))
        {

            var x = self.__analysisQueue.shift()
            
            self.__analysisRunning = x["p"]
            self.__currentAnalysis=[]
            self.__currentCB=x['cb']
            self.__stockfishWorker.postMessage(`position fen `+ self.__analysisRunning);
            self.__stockfishWorker.postMessage(`setoption name MultiPV value 5`)
            self.__stockfishWorker.postMessage("go depth 5")
        }
      }
      else
        setTimeout((e)=>{self.__nextAnalysis()}, 1000);
  }

  // Listen for messages from Stockfish
  __processMessages(event){
    var self = this
    const message = event.data;

    if( message.match("^bestmove.*$") !== null)
    {
      self.__savedAnalysis[self.__analysisRunning] = self.__currentAnalysis
      self.__currentCB.resolve(self.__currentAnalysis)
      self.__currentAnalysis = []
      self.__analysisRunning = null
      self.__nextAnalysis()
    }

    var m= message.match("^info depth (?<depth>[0123456789]+) .+?(?= multipv) multipv (?<mpv>[0123456789]+) score (?<sct>[cpmate]*) (?<sc>[-0123456789]+) .+?(?= pv) pv (?<m>[12345678abcdefgh\+\=RQBN#]+)(?<rem>.*)")
    if (m!== null)
    {
      var x = m[3]=="cp"?Number(m[4]):(Number(m[4])<0?-2000:2000)
      var prob = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * x)) - 1)
      self.__currentAnalysis[Number(m[2]-1)] = {
        depth: Number(m[1]),
        eval : prob,
        san : m[5],
        line: m[5]+m[6],
        reval: m[3]+" "+m[4],
        stockfish_eval:x/100
      }
    }

    if (self.__stockfishReady == false)
    {
      self.__stockfishReady = true
      console.log("Engine ready")
      self.__nextAnalysis()
    }
  }
}




