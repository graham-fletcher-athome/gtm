import showdown from 'https://cdn.jsdelivr.net/npm/showdown@2.1.0/+esm'
import {Chess} from "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.13.4/chess.min.js"
import {eval_description} from "./SFeval.js"
import{quiet_point} from "./engine.js"
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

    position_feedback(move,colour){

        //Get the feedback from gemini on a position
        var self = this
        var qb = quiet_point(move.eval_before)
        var qa = quiet_point(move.eval_after)
        qa.ql.unshift(move.san)

        var diff = diff_descriptions(eval_description(qb.qf), eval_description(qa.qf))
        var diff_expected = diff_descriptions(eval_description(move.fen_after), eval_description(qa.qf))

        var pro = `

        The changes in the componenets of an evaluation for a chess position due to 1 move are shown below. 
        Paraphrase the changes to the evaluation into plain english. 
        Give your answer in a conversational style as if you were analysing a chess game.

        Do not refer to the evaluation terms or to stockfish.

        Aim for a 250 word answer.

        Before the move the FEN was ${move.fen_before}.  After the move the FEN was ${move.fen_after}

        The move made was ${move.san}.

        The expected continuation has changed from ${JSON.stringify(qb.ql)} to ${JSON.stringify(qa.ql)}

        The expected evaluation at the end of the continuations has changed from White's perspective
        ${diff_descriptions_to_text(diff.white)}

        The expected evaluation at the end of the continuations has changed from Black's perspective
        ${diff_descriptions_to_text(diff.black)}

        Remember that the changes in the evaluations are a comparison of what is expected at the end of the 
        two contunuations, They are not immedate changes due to this move.

        Also descibe the currrent position and how the games is expected to unfold over the next few moves. The change between the evaluation 
        of the current position and the one at the end of the expected continuation is:

        Current Position:
        ${JSON.stringify(eval_description(move.fen_after),null,2)}

        From white's perspective the position is is expected to change by:
        ${diff_descriptions_to_text(diff_expected.white)}

        From black's perspective the position is is expected to change by:
        ${diff_descriptions_to_text(diff_expected.black)}
        `

        gemCall({prompt:pro},self.mc.midd("secret").val())
        .then(data => {
            var raw_answer = $('<div>').html(data).text()
            this.midd('notes_txt').val(this.midd('notes_txt').val()+`

---------------
${raw_answer}

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
  
function acc_description(acc,delta,sgn){
    for (const [k,v] of Object.entries(delta)){
        if (!(k in acc))
            acc[k] = {}
        for (const [func,vv] of Object.entries(v)){
            if (func in acc[k])
                acc[k][func] += sgn* vv
            else
                acc[k][func] = sgn* vv

        }
    }
    return acc
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



function diff_descriptions_to_text(d)
{
    var text = ""

    if (!("piece_value" in d))
        text += `Material value of peices has not changed. `
    else
        text += `Material value of peices has changed by ${d.piece_value/100}. `

    if ("psqt" in d)
        text += `The position of the peices has ${d.psqt > 0 ? "improved" : "got worse"} by ${Math.abs(d.psqt/100)}.`
        
    if ("imbalance" in d)
        text += `The positions' imbalance has changed by ${d.imbalance/100}. `
    
    if ("pawns" in d)
        text += `The overall strength of the pawns has changed by ${d.pawns/100}. `

    if ("isolated_pawns" in d )
        text += `The number of isolated pawns has changed by ${d.isolated_pawns}. `
    if ("backward_pawns" in d )
        text += `The number of backward pawns has changed by ${d.backward_pawns}. `
    if ("doubled_pawns" in d )
        text += `The number of doubled pawns has changed by ${d.doubled_pawns}. `
    if ("connected_pawns" in d )
        text += `The number of connected pawns has changed by ${d.connected_pawns}. `
    if ("doubled_and_isolated_pawns" in d )
        text += `The number of doubled and isolated pawns has changed by ${d.doubled_and_isolated_pawns}. `

          

    if ("pieces" in d)
        text += `The overall strength of the pieces has changed by ${d.pieces/100}. `

    if ("mobility" in d)
        text += `The overall mobility has changed by ${d.mobility/100}. `

    if ("passed" in d)
        text += `The strength of the passed pawns has changed by ${d.passed/100}. `

    if ("space" in d)
        text += `The amount of space has changed by ${d.space/100}. `

    if ("king" in d)
        text += `The safety pf the king has changed by ${d.king/100}. `

    return text
}


