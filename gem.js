import showdown from 'https://cdn.jsdelivr.net/npm/showdown@2.1.0/+esm'
import {Chess} from "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.13.4/chess.min.js"
import { UCIengine } from './engine.js'
var cvt = new showdown.Converter()

export class gem{
    
    constructor(ID,mc){

        this.ID=ID
        this.parent = $("#"+ID) 
        this.html()
        this.move=null
        this.mc=mc
        this.engine=new UCIengine("./stockfish.js")
        
    }

    mid(x){
        return(x+"_"+this.ID)
    }
    midd(x){
        return $("#"+this.mid(x))
    }

    setMove(move){
        this.move=move
    }

    setComment(text){
        this.midd('notes_txt').val(text)
    }

    updateComment(){
        this.mc.moves[this.mc.moveOnBoard-1].comment = this.midd('notes_txt').val()
    }

    html(){
        var self=this
        this.parent.html(`
            <div class="gem_container" style="">
                <div id="${this.mid('context')}" style="text-align: left; width: 100%;"></div>
                <div id="${this.mid('notes')}" style="text-align: left; width: 100%;">
                    <textarea name="newPGNtext" id="${this.mid('notes_txt')}" cols="46" rows="38"></textarea>
                </div>
            </div>
        `)

        
        self.midd("notes_txt").on("keyup",(e)=>{
            self.updateComment()
        })
        self.showNotes()
        
    }

    showNotes()
    {
        this.midd('context').hide()
        this.midd('notes').show()  
    }

    showReport()
    {
        this.midd('context').show()
        this.midd('notes').hide()
    }

    secret_update(event){
        this.key = midd("key").val()

    }

    

    

    context(pgn){
        var self=this
        self.midd("context").html("");
        self.showNotes()
        self.pgn=pgn
        if ((self.secret) && (self.secret.length > 4))
            gemCall({prompt:`
                Identify the game in the pgn below and, if relivant, any historical context. 
                List any published analyses by human authors.
                Summerise the published analyses of the game.
                Your answer should be in an essay style and approximatly 500 words long. 
                Give the essay a title.

                The pgn file is:   
                ${pgn}
            `},self.mc.midd("secret").val())
            .then(data => {
                self.midd("context").html(data);
                self.showReport()
        
            })
            .catch(error =>{
                console.error("Error:", error);
            })
        else
            self.midd("context").html("");
    }

    position_feedback(pgn, movenumber, evl){

        /*Get the feedback from gemini on a position*/
        var self = this
        var variations = []
        var pre_moves = ""
        var fen = ""
        var chess = new Chess()
        var all_prom = []
        var bestEval = -9999
        var sndbest = -9999

        if (chess.load_pgn(pgn)){
            var history = chess.history()

            
  

            for(var l = 0; l < evl.length; l++)
            {
                chess.reset()
                for(var x = 0; x < movenumber; x++)
                    chess.move(history[x])
                

                if (pre_moves == "")
                {
                    //All the details about the base position
                    pre_moves = chess.pgn()
                    fen=chess.fen()

                    var p = self.engine.position_descibe(fen)

                    all_prom.push(p)
                }

                var variation =  "" 
                var moves = evl[l]["line"].split(" ")
                for(var y = 0; y < moves.length; y++){
                    var m = chess.move(moves[y], { sloppy: true })
                    if (y <=5)
                        variation = gem.getvariation(pre_moves,chess.pgn())
                }

                //Get the stockfish 11 description
                all_prom.push(self.engine.position_descibe(chess.fen()))

                if (evl[l].stockfish_eval > bestEval){
                    sndbest = bestEval
                    bestEval = evl[l].stockfish_eval
                } else if (evl[l].stockfish_eval > sndbest) 
                    sndbest = evl[l].stockfish_eval
                

                variations.push({
                    "evaluation":evl[l].stockfish_eval,
                    "move":variation.split(" ")[1],
                    "continuation":variation,
                    "fen_at_end":chess.fen()
                })

            }

            

            var evallmt = Math.min(sndbest-0.01 , bestEval-1.0)


            Promise.allSettled(all_prom).then((descriptions)=>{


                var diff_prom = {}
                for(var x = 1; x < descriptions.length; x++)
                {

                
                    diff_prom[descriptions[x].value.fen] = UCIengine.desc_diff(descriptions[0].value.desc,descriptions[x].value.desc)
                }

                for(var x = 0; x < variations.length; x++)
                {
                    variations[x]["Comments"]=self.comments(diff_prom[variations[x].fen_at_end])
                }
                

                var vars = []
                for(var x = 0; x < Math.max(2,Math.min(variations.length,Math.floor((self.mc.midd("elo").val()-400)/400)+2)); x++){
                    if (variations[x].evaluation > evallmt)
                        vars.push({"move": variations[x].move,
                                   "continuation": variations[x].continuation,
                                   "comments":variations[x].Comments,
                                   "evaluation":variations[x].evaluation
                        })
                }

                vars.sort(() => Math.random() - 0.5);

                var possible_moves = ""
                for(var x = 0; x < vars.length; x++){
                    possible_moves += vars[x].move+" "
                }

                var pro = `



Given the chess position after the moves:
${pre_moves}

Give any opening or end game theory relivant to this position.

The following statements explain change between the starting position and the end position of some variations. 
Reword the comments into a converstaional style. The units are in pawns. Assume your student 
understands the terms. Only discuss the more important canhes in each variation.

${JSON.stringify(vars,null,2)}

Give your answer in raw text without formatting or any headings or lists. 
The student will not have acces to the comments directly. 
Say "black has more space" rather than the "computer analysis shows" or "the comments say that black has more space".

Your student has an ELO of ${self.mc.midd("elo").val()}. Write your answer in a 
style to support them. Aim for an answer length of ${Math.min(100+(self.mc.midd("elo").val()/10),1000)} words.

            `


   

        gemCall({prompt:pro},self.mc.midd("secret").val())
        .then(data => {
            var raw_answer = $('<div>').html(data).text()
            this.midd('notes_txt').val(this.midd('notes_txt').val()+`
Hints by Gemini
---------------
${raw_answer}

---------------
`)
        self.updateComment()
        /*self.check_answer(pro,raw_answer,fen)*/
    
        })
        .catch(error =>{
            console.error("Error:", error);
        })
            })
        }

        
    }


    comments(diff){
        const me = (this.mc.moveOnBoard % 2 == 0)?"white":"black"
        const them = (this.mc.moveOnBoard % 2 == 0)?"black":"white"
        var res = []
        for (const [key, value] of Object.entries(diff)){
            if (me in value){
                if (Math.abs(value[me])>0.3)
                    res.push(`My ${key} has changed by ${value[me]} between the start and end of the variation.`)
                if (Math.abs(value[them])>0.3)
                    res.push(`Their ${key} has changed by ${value[them]} between the start and end of the variation.`)
            }
            else
            {
                if (Math.abs(value.total)>0.5)
                    if (value.total*(me=="white"?1:-1) >0 )
                        res.push(`I gain ${value.total} of ${key} between the start and end of the variation.`)
                    else
                        res.push(`I lose ${value.total*(me=="white"?-1:1)} of ${key} between the start and end of the variation.`)
                else
                res.push(`${key} does not change.`)
                
            }
        }
        return res
    }


    static getvariation(basepgn,varpgn){
        if (basepgn.length > 0)
            return varpgn.slice(basepgn.length+1)
        else
            return varpgn
    }

    
}
async function gemCall(parameters,secret) {
    const cloudFunctionUrl = 'https://europe-west2-bipuk-gpf-dev.cloudfunctions.net/gtm-lypu'; // Replace with your actual URL
    parameters['secret'] = secret
    try {
      const response = await fetch(cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Set the Content-Type header
        },
        body: JSON.stringify(parameters), // Convert your data to JSON
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
      }
  
      const responseData = await response.text();

      return cvt.makeHtml(responseData);
  
    } catch (error) {
      console.error('Error calling Cloud Function:', error);
      throw error  
    }
  }
  

   