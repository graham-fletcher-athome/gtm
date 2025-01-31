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

  position_descibe(fen){
    var self=this
    var resolver
    console.log("desc................")
    /* Returns the description for a fen if it exists or adds it to the analysis queue if it doesnt*/

    var prom = new Promise(function(resolve, reject) {
      resolver = resolve
      if (fen in self.__savedDesc) 
        resolve(self.__savedDesc[fen] )  
    })
    prom.resolve = resolver
    if (!(fen in self.__descQueue)){
      self.__descQueue.push({"p":fen,"cb":prom})
      self.__nextAnalysis()
    } 

    return prom
  }

  clearAnalysisQueue(){
    var self=this
    self.__analysisQueue = []
    self.__descQueue = []
   

  }

  constructor(engine){
    var self=this
    self.__stockfishWorker = null
    self.__savedAnalysis = {}
    self.__savedDesc = {}
    self.__analysisQueue = []
    self.__descQueue = []
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
        if ((self.__analysisRunning == null) && (self.__descQueue.length > 0)){
          var x = self.__descQueue.shift()
          self.__analysisRunning = x["p"]
          self.__currentCB=x['cb']
          self.__description = ""
  
          self.__stockfishWorker.postMessage(`position fen `+ this.__analysisRunning);
          self.__description = ""
          self.__stockfishWorker.postMessage(`eval`);
        }
          

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
    var processed = false
    if( message.match("^bestmove.*$") !== null)
    {
      processed = true
      self.__savedAnalysis[self.__analysisRunning] = self.__currentAnalysis
      self.__currentCB.resolve(self.__currentAnalysis)
      self.__currentAnalysis = []
      self.__analysisRunning = null
      self.__nextAnalysis()
    }

    var m= message.match("^info depth (?<depth>[0123456789]+) .+?(?= multipv) multipv (?<mpv>[0123456789]+) score (?<sct>[cpmate]*) (?<sc>[-0123456789]+) .+?(?= pv) pv (?<m>[12345678abcdefgh\+\=RQBN#]+)(?<rem>.*)")
    if (m!== null)
    {
      processed = true
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

    if (message.match("^Total evaluation.*$") !== null)
    {
      processed = true
      self.__savedDesc[self.__analysisRunning] = self.__description
      self.__currentCB.resolve({
        "fen":self.__analysisRunning,
        "desc":UCIengine.extractfromDesc(self.__description,self.__analysisRunning)
      })
      self.__description = ""
      self.__analysisRunning = null
      self.__nextAnalysis()
    }

    if (self.__stockfishReady == false)
    {
      self.__stockfishReady = true
      console.log("Engine ready")
      self.__nextAnalysis()
    }

    if (!processed)
      this.__description = this.__description + message +"\n"
      
  }

  static extractfromDesc(Desc,fen){
    var rv = {}
    var lines = Desc.split("\n")
    for(var y = 3; y <lines.length-2; y++){
      var cells = lines[y].split('|')
      if (cells.length == 4){
        var key = cells[0].trim()
        if((key !="Total") && (key != "Variant"))
        if (cells[1].trim() == "----  ----"){
          rv[key] = {"total":UCIengine.mgeg(fen,cells[3].trim())}
        }
        else
        {
          rv[key] = {
              "white":UCIengine.mgeg(fen,cells[1].trim()),
              "black":UCIengine.mgeg(fen,cells[2].trim())
          }
        }
      }
    }
    return rv
  }

  static mgeg(fen,st){
    var values = st.replace(/\s+/g, " ").split(" ");
    var mg = Number(values[0])
    var eg = Number(values[1])

    var phase = UCIengine.phase(fen)

    return (((256-phase) * mg) + (phase*eg))/256

  }
  static phase(fen){
    const PawnPhase = 0
    const KnightPhase = 1
    const BishopPhase = 1
    const RookPhase = 2
    const QueenPhase = 4
    var total_phase = PawnPhase*16 + KnightPhase*4 + BishopPhase*4 + RookPhase*4 + QueenPhase*2
    var phase = total_phase
    phase -= UCIengine.peicecount(fen,"p") * PawnPhase
    phase -= UCIengine.peicecount(fen,"r") * RookPhase
    phase -= UCIengine.peicecount(fen,"n") * KnightPhase
    phase -= UCIengine.peicecount(fen,"b") * BishopPhase
    phase -= UCIengine.peicecount(fen,"q") * QueenPhase
    phase -= UCIengine.peicecount(fen,"P") * PawnPhase
    phase -= UCIengine.peicecount(fen,"R") * RookPhase
    phase -= UCIengine.peicecount(fen,"N") * KnightPhase
    phase -= UCIengine.peicecount(fen,"B") * BishopPhase
    phase -= UCIengine.peicecount(fen,"Q") * QueenPhase


    phase = (phase * 256 + (total_phase / 2)) / total_phase
    return phase
  }

  static peicecount(fen,p){
    fen=fen.split(" ")[0]
    var total = 0
    for(var x =0; x < fen.length; x++){
      if (fen[x] == p)
        total = total +1
    }
    return total
  }

  static desc_diff(base,after){

    var res = {}
    for (const [key, value] of Object.entries(base)) {
      res[key] = {}
      for (const [k,v] of Object.entries(value))
        res[key][k] = after[key][k] - v
    }
    return res
  }
}




