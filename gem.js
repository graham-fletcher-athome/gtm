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

        if ((move.eval_after == null) || (move.eval_before == null))
        {
            window.alert("Position analysis is not availible yet. Please wait a few more seconds");       
            return
        }
        var elo = Number(self.mc.midd("elo").val())
        if ((elo == 0) || isNaN(elo))
            elo = 1500
        if (elo < 500)
            elo = 500
        if (elo > 2500)
            elo = 2500

        var qb = quiet_point(move.eval_before[0])
        var qa = quiet_point(move.eval_after[0])

        var diff = diff_descriptions(eval_description(qb.qf), eval_description(qa.qf))
        var diff_expected = diff_descriptions(eval_description(move.fen_after), eval_description(qa.qf))

        var pro = `The move ${continuation_to_string(move.move_number,[move.san])} has been made by ${move.color == "w" ?"white":"black"}.
        Before the move the FEN was ${move.fen_before}.  After the move the FEN was ${move.fen_after}
        `

        if (qa.qf == qb.qf)
            pro += `The expected continuation has not changed because of this move.
            The expected continuation is ${continuation_to_string(move.move_number,qb.ql)}.
            `
        else{
            qa.ql.unshift(move.san)
            pro += `The expected continuation has changed from ${continuation_to_string(move.move_number,qb.ql)} to ${continuation_to_string(move.move_number,qa.ql)}.
            Because of this change,  the evaluation has changed:
            From White's perspective: " ${diff_descriptions_to_text(diff.white)}"
            From Black's perspective: "${diff_descriptions_to_text(diff.black)}"

            Paraphrase the changes to the evaluation into plain english to explain the strategic impact of the move.`

        }


        pro = pro + `Descibe the  position after the move and how the games is expected to unfold over the next few moves. 

        The Position after the move from white's perspective is:
        "${descriptions_to_text(eval_description(move.fen_after).white)}"

        The Position after the move from blacks's perspective is:
        "${descriptions_to_text(eval_description(move.fen_after).black)}"

        From white's perspective the position is is expected to change by:
        "${diff_descriptions_to_text(diff_expected.white)}"

        From black's perspective the position is is expected to change by:
        "${diff_descriptions_to_text(diff_expected.black)}"

        Answer as if you are a chess coach to a player with an ELO of ${elo}.
        This information has been provided to allow you to form your own insights.  The student
        has not seen this information.  Present your insights as your own rather than refering to the 
        information provided.



        `
        console.log(pro)
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
            if (String(error).includes("Secret is not valid."))
                {
                    window.alert("The API secret provided on the PGN popup is not valid. Set it to the value expected by the API")
                    return
                }
            console.error("Error:", error);
        })
    }



    position_hint(move,colour){

        //Get the feedback from gemini on a position
        var self = this
        if ((move.eval_after == null) || (move.eval_before == null))
        {
            window.alert("Position analysis is not availible yet. Please wait a few more seconds");       
            return
        }
        var elo = Number(self.mc.midd("elo").val())
        if ((elo == 0) || isNaN(elo))
            elo = 1500
        if (elo < 500)
            elo = 500
        if (elo > 2500)
            elo = 2500
        var base_desc = eval_description(move.fen_after)

        var eva = []
        for (var x of move.eval_after)
            if (x.stockfish_eval > move.eval_after[0].stockfish_eval - 0.5)
                eva.push(x)

        if (eva.length < 2)
            eva.push(move.eval_after[1])

        eva = eva
                .map(value => ({ value, sort: Math.random() }))
                .sort((a, b) => a.sort - b.sort)
                .map(({ value }) => value)

        for( var x of eva)
            if (!x.quiet)
            {
                x.quiet = quiet_point(x)
                x.diff_desc = diff_descriptions(base_desc, eval_description(x.quiet.qf))
            }

        var pro = `

        Below are a number of possible moves from a chess position. For each one the expected outcome
        in evaluation is given for both white and black. Descibe the differences bwteen the possible moves.
        HIghlight the relative advantages and disadvantages.

        Answer as if you are a chess coach to a player with an ELO of ${elo}. Help them select between the 
        options. Do not give a recomendation.
        
        This information has been provided to allow you to form your own insights.  The student
        has not seen this information.  Present your insights as your own rather than refering to the 
        information provided.

        The FEN of the base position is ${move.fen_after}

        The last move made was ${continuation_to_string(move.move_number,[move.san])} by ${move.color == "w" ?"white":"black"}.

        `
        for (var x of eva)
            pro += `
        move: ${x.quiet.ql[0]}
        expected continuation: ${x.quiet.ql}
        expected changes for white : ${diff_descriptions_to_text(x.diff_desc.white)}
        expected changes for black : ${diff_descriptions_to_text(x.diff_desc.white)}


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
            if (String(error).includes("Secret is not valid."))
            {
                window.alert("The API secret provided on the PGN popup is not valid. Set it to the value expected by the API")
                return
            }
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
            diff[colour][p] = (d2[colour][p] - v)
        }
    }

    return diff
    
}


export function descriptions_to_text(d)
{
    var text = ""
    for (var [k,v] of Object.entries(d))
    {
        const nt = descriptions_to_text_one(k,v)
        text = text + nt
    }
    return text

}
function descriptions_to_text_one(k,v){
    if (v==0)
        return ""

    if (k =="piece_value")
        return `Material value of peices is ${v/100}. `

    if (k == "psqt")
        return `The position quality the peices is ${Math.abs(v/100)}.`
    
    if (k == "pawns")
        return `The overall strength of the pawns is ${Math.abs(v/100)}.`

    if (k == "pieces")
        return `The overall strength of the pieces is ${v/100}. `

    if (k == "mobility")
        return `The overall mobility is ${v/100}. `

    if (k == "passed")
        return `The strength of the passed pawns is ${v/100}. `

    if (k == "space")
        return `The amount of space is ${v/100}. `

    if (k == "king")
        return `The safety of the king is ${v/100}. `

    if (k == "isolated")
        return `The number of isolated pawns is ${v}. `
    if (k == "backward")
        return`The number of backward pawns is ${v}. `
    if (k == "doubled")
        return`The number of doubled pawns is ${v}. `
    if (k == "connected")
        return `The number of connected pawns is ${v}. `
    if (k == "doubled_and_isolated")
        return`The number of doubled and isolated pawns is ${v}. `
    
    if (k == "kingside_attack_control")
        return (v>0) ? `Control of the attacking squares on the kingside is ${v}. `:""
    if (k == "queenside_attack_control")
        return (v>0) ? `Control of the attacking squares on the Queenside is ${v}. `:""
    if (k == "kingside_defence_control") 
        return (v>0) ? `Control of the defensive squares on the kingside is ${v}. `:""
    if (k == "queenside_defence_control") 
        return (v>0) ? `Control of the defensive squares on the Queenside is ${v}. `:""
    if (k == "central_control") 
        return (v>0) ? `Control of the centre of he board is ${v}. `:""
    

    return `The position's ${k} is ${v}. `




}





function diff_descriptions_to_text(d)
{
    var text = ""
    for (var [k,v] of Object.entries(d))
        text += diff_descriptions_to_text_one(k,v)
    return text

}

function diff_descriptions_to_text_one(k,v){
    if (k =="piece_value")
        if ( v == 0)
            return `Material value of peices has not changed. `
        else
            return `Material value of peices has changed by ${v/100}. `

    if (v == 0)
        return ""

    if (k == "isolated")
        return `The number of isolated pawns has changed by ${v}. `
    if (k == "backward")
        return`The number of backward pawns has changed by ${v}. `
    if (k == "doubled")
        return`The number of doubled pawns has changed by ${v}. `
    if (k == "connected")
        return `The number of connected pawns has changed by ${v}. `
    if (k == "doubled_and_isolated")
        return`The number of doubled and isolated pawns has changed by ${v}. `

    if (k == "kingside_attack_control")
        return `Control of the attacking squares on the kingside is ${v>0?"improving":"reducing"} by ${Math.abs(v)}. `
    if (k == "queenside_attack_control")
        return `Control of the attacking squares on the Queenside is ${v>0?"improving":"reducing"} by ${Math.abs(v)}. `
    if (k == "kingside_defence_control") 
        return `Control of the defensive squares on the kingside is ${v>0?"improving":"reducing"} by ${Math.abs(v)}. `
    if (k == "queenside_defence_control") 
        return `Control of the defensive squares on the Queenside is ${v>0?"improving":"reducing"} by ${Math.abs(v)}. `
    if (k == "central_control") 
        return `Control of the centre of he board is is ${v>0?"improving":"reducing"} by ${Math.abs(v)}. `

    if (["psqt","pawns","mobility","passed","space","king"].indexOf(k) != -1)
    {
        if (v<15)
            return ""

        if (k == "psqt")
            return `The position of the peices has ${v > 0 ? "improved" : "got worse"} by ${Math.abs(v/100)}. `
        
        if (k == "pawns")
            return `The overall strength of the pawns has ${v > 0 ? "improved" : "got worse"} by ${Math.abs(v/100)}. `
        if (k == "pieces")
            return `The overall strength of the pieces has changed by ${v/100}. `

        if (k == "mobility")
            return `The overall mobility has changed by ${v/100}. `

        if (k == "passed")
            return `The strength of the passed pawns has changed by ${v/100}. `

        if (k == "space")
            return `The amount of space has changed by ${v/100}. `

        if (k == "king")
            return `The safety pf the king has changed by ${v/100}. `

    }

    return `The position's ${k} has changed by ${v}. `




}

function continuation_to_string(mn,conntinuation){
    var result = ""
    if ((mn % 2) == 0)
        result += `${String((mn)/2)}. ...`

    for (const x of conntinuation){
        if ((mn % 2) == 1)
            result += ` ${String((mn+1)/2)}. `
        else
            result += ` `

        result += x
        mn += 1

    }
    return result
        
}


