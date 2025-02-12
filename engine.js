import {Chess} from "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.13.4/chess.min.js"
import {eval_description,cs_difference} from "./SFeval.js"

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
            self.__stockfishWorker.postMessage("go depth 18")
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
      self.analysis_complete_message()
    }

    var m= message.match("^info depth (?<depth>[0123456789]+) .+?(?= multipv) multipv (?<mpv>[0123456789]+) score (?<sct>[cpmate]*) (?<sc>[-0123456789]+) .+?(?= pv) pv (?<m>[12345678abcdefgh\+\=RQBN#]+)(?<rem>.*)")
    if (m!== null)
    {
      processed = true
      var x = m[3]=="cp"?Number(m[4]):(Number(m[4])<0?-2000:2000)
      var prob = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * x)) - 1)
      self.__currentAnalysis[Number(m[2]-1)] = {
        depth: Number(m[1]),
        fen : self.__analysisRunning,
        eval : prob,
        san : m[5],
        line: m[5]+m[6],
        cont: m[6],
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

    if (!processed)
      this.__description = this.__description + message +"\n"
      
  }

  analysis_complete_message(){
    var self=this
    

    
    self.__savedAnalysis[self.__analysisRunning] = self.__currentAnalysis
    self.__currentCB.resolve(self.__currentAnalysis)
    self.__currentAnalysis = []
    self.__analysisRunning = null
    self.__nextAnalysis()
  }

  
}

export function quiet_point(evl){

  //Follow each line of the analysis and find the next quiet position

      var desc_before  = eval_description(evl.fen)
      var desc_after = desc_before
      var quiet_line = []    
      var quiet_fens = []
      var quiet_log = []

        var line = evl
        var cb = new Chess()
        cb.load(evl.fen)
        var quiet = 0
        
        for(var move of line.line.split(" ")){
          if (move != "")
          {
            desc_before = desc_after
            var mv = cb.move(move, { sloppy: true })
            desc_after = eval_description(cb.fen())
            quiet_line.push ( mv.san )
            quiet_fens.push ( cb.fen())
            quiet_log.push(sizediff(diff_descriptions(desc_before,desc_after)))
            if(((desc_after.white.piece_value - desc_before.white.piece_value) == 0) &&
               ((desc_after.black.piece_value - desc_before.black.piece_value) == 0) &&
               !cb.in_check() && 
               (sizediff(diff_descriptions(desc_before,desc_after)) < 1.5 ))
            {
              quiet += 1
            } 
            else
              quiet = 0

            if (quiet == 3)
              break
          }

        }

        return({"ql":quiet_line,"qf":quiet_fens[quiet_line.length-1]})

}

function sizediff(d){
  var tot = 0
  for (const colour of ["black","white"]){
    for (const [k,v] of Object.entries(d[colour])){
        if (["isolated_pawns",
            "backward_pawns",
            "doubled_pawns",
            "connected_pawns",
            "doubled_and_isolated_pawns"].indexOf(k) == -1)
            tot += v*v/10000
    }
  }
  return Math.sqrt(tot)
}

function diff_descriptions(d1,d2)
{
    var diff = {}
    for (const colour of ["black","white"]){
        diff[colour] = {}
        for (const [p,v] of Object.entries(d1[colour])){
            if (d2[colour][p] != v)
                diff[colour][p] = (d2[colour][p] - v)
        }
    }

    return diff
    
}


