import showdown from 'https://cdn.jsdelivr.net/npm/showdown@2.1.0/+esm'
import {Chess} from "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.13.4/chess.min.js"
var cvt = new showdown.Converter()

export class gem{
    
    constructor(ID,mc){

        this.ID=ID
        this.parent = $("#"+ID) 
        this.html()
        this.move=null
        this.mc=mc
        
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

    check_answer(prompt,raw_answer,fen){
        var self=this
        var new_prompt = `
        In the following anaysis of a chess position made by an unreliable source. 

        List all peice locations, stated or implied, for the current position only. Use the form "Peice is on square"
        List all the candidate moves discussed. Use the form SAN is a candidate move.

        The analysis was done from white's perspective

        Give your answer in plain text 
        

        analysis:
        ${raw_answer}

        `
        gemCall({prompt:new_prompt},self.mc.midd("secret").val())
        .then(data => {
            console.log(data)
    
        })
        .catch(error =>{
            console.error("Error:", error);
        })
    }

    position_feedback(pgn, movenumber, evl){

        /*Get the feedback from gemini on a position*/
        var self = this
        var variations = ""
        var pre_moves = ""
        var fen = ""
        var chess = new Chess()
        if (chess.load_pgn(pgn)){
            var history = chess.history()

            for(var l = 0; l < evl.length; l++)
            {
                chess.reset()
                for(var x = 0; x < movenumber; x++)
                    chess.move(history[x])

                if (pre_moves == "")
                {
                    pre_moves = chess.pgn()
                    fen=chess.fen()
                }

                var variation =  "" 
                var moves = evl[l]["line"].split(" ")
               for(var y = 0; y < Math.min(moves.length,5); y++){
                    var m = chess.move(moves[y], { sloppy: true })
                    variation = variation+" "+m.san
                }
                variation = JSON.stringify({
                    "evaluation":evl[l].stockfish_eval,
                    "move":variation.split(" ")[1],
                    "continuation":variation,
                })

                if (Math.random() > 0.5)
                    variations = variations+variation+"\n"
                else
                    variations = variation+"\n"+variations

            }
        }

        var pro = `

Answering as if you were are a chess coach.
Give hints based on the variations listed below. Try to explain the pros and cons of the better options.


${fen}

The moves to reach this poition were:
${pre_moves}

To help with your analysis here are some continuations:
${variations}


Give your answer in raw text without formatting or any headings or lists. 
Do not give the position,fen or move history in the answer. Do not give general advice, stick to the options in this position.
Give your answer in a conversational style rather than a list of options.

Your student an 11 year old with an ELO of 800. Write your answer in a style to support them.
Keep the number of options to 2 or 3 and aim for an under 300 word answer.
Make sure the move with the higest evaluation is in the list. Do not reveal which one of the options you
give is best.

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
    }


    



    
}
async function gemCall(parameters,secret) {
    console.log("sectret is",secret)
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
  

   