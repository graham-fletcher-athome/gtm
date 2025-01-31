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
        console.log(this.key)
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

        if (chess.load_pgn(pgn)){
            var history = chess.history()

            
            console.log(evl)

            for(var l = 0; l < evl.length; l++)
            {
                chess.reset()
                for(var x = 0; x < movenumber; x++)
                    chess.move(history[x])
                

                if (pre_moves == "")
                {
                    console.log(2)
                    //All the details about the base position
                    pre_moves = chess.pgn()
                    fen=chess.fen()
                    console.log(self)
                    console.log(self.engine)
                    var p = self.engine.position_descibe(fen)
                    console.log(p)
                    all_prom.push(p)
                }

                var variation =  "" 
                var moves = evl[l]["line"].split(" ")
                for(var y = 0; y < moves.length; y++){
                    var m = chess.move(moves[y], { sloppy: true })
                    if (y <=5)
                        variation = variation+" "+m.san
                }

                //Get the stockfish 11 description
                all_prom.push(self.engine.position_descibe(chess.fen()))

                if (evl[l].stockfish_eval > bestEval)
                    bestEval = evl[l].stockfish_eval

                variations.push({
                    "evaluation":evl[l].stockfish_eval,
                    "move":variation.split(" ")[1],
                    "continuation":variation,
                    "fen_at_end":chess.fen()
                })

            }

            console.log("Best eval",bestEval)

            Promise.allSettled(all_prom).then((descriptions)=>{
                

                var diff_prom = {}
                for(var x = 1; x < descriptions.length; x++)
                    diff_prom[descriptions[x].value.fen] = UCIengine.desc_diff(descriptions[0].value.desc,descriptions[x].value.desc)

                for(var x = 0; x < variations.length; x++)
                {
                    variations[x]["Comments"]=self.comments(diff_prom[variations[x].fen_at_end])
                }
                variations.sort(() => Math.random() - 0.5);

                var vars = []
                for(var x = 0; x < variations.length; x++){
                    console.log(variations[x])
                    if (variations[x].evaluation > bestEval-1)
                        vars.push(variations[x])
                }

                var possible_moves = ""
                for(var x = 0; x < vars.length; x++){
                    possible_moves += vars[x].move+" "
                }
                var pro = `

Answering as if you were are a chess coach.  Given the folloing position:
${fen}

The moves to reach this poition were:
${pre_moves}

Try to explain the pros and cons of the the following possible moves from this position ${possible_moves}.
Do not list any other first moves in your suggestions. 

To help with your analysis here is analysis of continuations after the moves:
${JSON.stringify(vars)}


Give your answer in raw text without formatting or any headings or lists. 
Do not give the position,fen or move history in the answer. Do not give general advice, stick to the options in this position.
Give your answer in a conversational style rather than a list of options. 

Your student has an ELO of ${self.mc.midd("elo").val()}. Write your answer in a style and length to support them.
Below 1000 elo keep your answers to a few hundred words and do not include lines. At 1400 elo you may include short lines of 2 or 3 moves.
At 2000 elo +  you may include longer lines.
Make sure the move with the higest evaluation is in the list. Do not list any option with an eval more than 1.0 worse than the best option.
Do not reveal which one of the options you give is best. Randomise the order of your hints.

            `


                console.log(pro)

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
        console.log(diff)
        const me = (this.mc.moveOnBoard % 2 == 0)?"white":"black"
        const them = (this.mc.moveOnBoard % 2 == 0)?"black":"white"
        const mul = (this.mc.moveOnBoard % 2 == 0)?1:-1
        var res = []
        res.push( "My king safety changes by "+diff["King safety"][me]+".")
        res.push( "Their kings safety changes by "+diff["King safety"][them]+".")
        res.push( "My Initiative changes by "+diff["Initiative"].total*mul+".")
        res.push( "Their Initiative changes by "+-(diff["Initiative"].total*mul)+".")
        res.push( "My space changes by "+diff["Space"][me]+".")
        res.push( "Their space changes by "+diff["Space"][them]+".")
        res.push( "My mobility changes by "+diff["Mobility"][me]+".")
        res.push( "Their mobility changes by "+diff["Mobility"][them]+".")
        res.push( "My passed changes by "+diff["Passed"][me]+".")
        res.push( "Their passed changes by "+diff["Passed"][them]+".")
        res.push( "My pawn structure changes by "+diff["Pawns"][me]+".")
        res.push( "Their pawn structure changes by "+diff["Pawns"][them]+".")
        return res
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
  

   