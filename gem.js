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

                var variation = "[(%eval "+evl[l]["reval"]+")"
                var moves = evl[l]["line"].split(" ")
               for(var y = 0; y < moves.length; y++){
                    var m = chess.move(moves[y], { sloppy: true })
                    variation = variation+" "+m.san
                }
                variation = variation + "]"

                if (Math.random() > 0.5)
                    variations = variations+variation+"\n"
                else
                    variations = variation+"\n"+variations

            }
        }


        gemCall({prompt:`

Answering as if you were are a chess coach.
Give hints to help your student identify possible moves in the chess position in the FEN:
${fen}

The moves to reach this poition were:
${pre_moves}

To help with your analysis here are some continuations:
${variations}

Do not list these continuations in your answer, but you may use the first moves and descibe their concequences if you wish.

Give your answer in raw text without formatting or any headings or lists. Aim for 200 to 300 word answer.
Do not give the position,fen or move history in the answer. Do not give general advice, stick to the options in this position.
The student already has this game details and general advice..



        `},self.mc.midd("secret").val())
        .then(data => {
            this.midd('notes_txt').val(this.midd('notes_txt').val()+`
Hints by Gemini
---------------
${$('<div>').html(data).text()}

---------------
`)
        self.updateComment()
    
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
  

   