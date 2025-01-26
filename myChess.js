import "https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/chessboard-1.0.0.js"
import {Chess} from "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.13.4/chess.min.js"
import {analyse} from "./engine.js"
import {gem} from "./gem.js"

var board

export class myChess{
    mid(c){
        return(this.divId+"_"+c)
    }
    midd(c){
        return $("#"+this.mid(c))
    }

    loadPGNfromlibrary(fn){
        
        fetch("./pgn_lib/"+fn+".pgn")
        .then(response => response.text())
        .then(data => {
            
            this.loadPGN(data)
        })
        .catch(error => {
                console.error('Error loading the text file:', error);
        });
    }

    exportPGN(){
        var ch = new Chess()

        for (let k in this.header)
            ch.header(k,this.header[k])

        for (var x = 0; x < this.moves.length; x++)
        {
            ch.move(this.moves[x])
            var cmt=""
            if (this.moves[x].machine_comment)
                cmt = cmt + "[" + this.moves[x].machine_comment + "]"
            if (this.moves[x].comment)
                cmt = cmt + this.moves[x].comment.replace("{","(").replace("}",")")
            if (cmt != "")
                ch.set_comment(cmt)
        }

        var pgn = ch.pgn()
        
        return pgn
    }

    loadPGN(pgn,secret){
        var chess = new Chess()
        this.gem.secret = secret
        if (chess.load_pgn(pgn) != null)
        {
            this.orig_pgn = pgn
            
            this.moves = chess.history({ verbose: true })
            var x = chess.header()
            var comments = chess.get_comments()
            for (var i = 0; i < comments.length;i++)
            {
                
                var match = "^[ ]*\\[(?<m1>(.*)?)\\](?<m2>.*)$" 
                var m = comments[i].comment.match(match)
                if (m != null)
                {
                    comments[i].machine_comment = m[1]
                    comments[i].comment=m[3]
                }
                else
                    comments[i].machine_comment = null
              
            }
            
            chess.reset()

            for (var i = 0; i < this.moves.length; i++){
                this.moves[i].fen_before = chess.fen()
                this.moves[i].pgn_before = chess.pgn()
                this.moves[i].eval_before = null
                chess.move(this.moves[i])
                this.moves[i].fen_after  = chess.fen()
                this.moves[i].pgn_after = chess.pgn()
                this.moves[i].eval_after = null
                if ( i >=8 )
                    analyse(this.moves[i].fen_after, this.analysisReturn)

                for (var j = 0; j < comments.length; j++){
                    if (comments[j].fen == this.moves[i].fen_after)
                    {
                        this.moves[i].comment = comments[j].comment
                        this.moves[i].machine_comment = comments[j].machine_comment
                    }

                } 
            }
            chess.reset()

            
            if ("Event" in x)
                this.midd('title_event').html(x["Event"])
            else
                this.midd('title_event').html("Chess Game from PGN")
        
            if ("Date" in x)
                this.midd('title_date').html(x["Date"])
            else
                this.midd('title_date').html("<br>")
        
            if ("Site" in x)
                this.midd('title_site').html(x["Site"])
            else
                this.midd('title_site').html("<br>")
        
            var pl
            var plElo

            if ("Black" in x)
                pl = x["Black"]
            else
                pl = "Black Unknown"
        
            if ("BlackElo" in x)
                plElo = x["BlackElo"]
            else
                plElo = "-"
        
            this.midd('black_details').html(pl+"<br>"+plElo)
        
            if ("White" in x)
                pl = x["White"]
            else
                pl = "White Unknown"
        
            if ("WhiteElo" in x)
                plElo = x["WhiteElo"]
            else
                plElo = "-"
        
            this.midd('white_details').html(pl+"<br>"+plElo)
            this.header = x
            this.chess = chess
            this.setMoveOnBoard(0)
            this.moveorrequest()
            this.gem.context(pgn)

            return true
        }
        else
            return false
    }

    

    setMoveOnBoard(x){
        
        if (x > this.chess.history().length)
            x = this.chess.history().length
        if (x==0)
        {
            this.board.position(this.moves[x].fen_before)
            this.gem.setComment("Your notes")
            
        }
        else
        {
            this.board.position(this.moves[x-1].fen_after)
            this.gem.setComment(this.moves[x-1].comment)
            
        }
        this.moveOnBoard = x
    }

    analysisReturn(fen,ca)
    {
        console.log(ca)
        
        for(var j = 0; j < self.moves.length; j++){
            if (self.moves[j].fen_before == fen)
            {
                self.moves[j].eval_before = ca
                self.moveorrequest()
            }
            if (self.moves[j].fen_after == fen)
            {
                self.moves[j].eval_after = ca

                //If the actual move isnt in the before analysis then add it
               
                var actual_move=self.moves[j].from+self.moves[j].to

                if (self.moves[j].eval_before){
                    var actual_move_found = false
                    for (var i = 0; i <self.moves[j].eval_before.length; i++){

                        if (actual_move == self.moves[j].eval_before[i].san)
                            actual_move_found = true
                    }
                    if (actual_move_found == false){

                        var am_anal = {
                            depth: Number(ca[0].depth+1),
                            eval : 100-((ca[0].eval)),
                            san : actual_move,
                            line: actual_move+" "+(ca[0].line),
                            reval: ca[0].reval.split(" ")[0]+" "+String(-Number(ca[0].reval.split(" ")[1]))
                        }
                        
                        self.moves[j].eval_before.push(am_anal)


                    }
                }
            }

        }
    }



    makeHTML(){
        var self = this
        this.parent.html(
             '<div id="'+this.mid("container")+'" class="container">'+
                '<div id="'+this.mid("title")+'" class="myChess_title">'+
                    '<div id="'+this.mid("title_event")+'" >Event</div>'+
                    '<div id="'+this.mid("title_site")+'"></div>'+
                    '<div id="'+this.mid("title_date")+'"></div>'+
                    '<hr>'+
                    '<div id="'+this.mid("myChess_status")+'" style="height: 30px; font-size: 14px;"></div>'+
                '</div>'+

                '<div id="'+this.mid("myBoard")+'" style="width: 400px" class="myChess_board"></div>'+
                '<div id="'+this.mid("details")+'" class="myChess_details">'+
                    '<div id = "'+this.mid("top_details")+'" class="dtls"><div id="'+this.mid("black_details")+'" class="ct">Black details</div></div>'+
                    '<div id = "'+this.mid("pgn")+'" style="height:70%"></div>'+
                    '<div id = "'+this.mid("bottom_details")+'" class="dtls"><div id="'+this.mid("white_details")+'" class="ct">White details</div></div>'+
                '</div>'+
                '<div id="'+this.mid("controls")+'" class="myChess_controls">'+
                    '<button id="'+this.mid("flip_control")+'" style="width:15%"> Flip board </button>'+
                    '<button id="'+this.mid("load_control")+'" style="width:15%">  PGN </button>'+
                    '<button id="'+this.mid("first_control")+'">  \<\< </button>'+
                    '<button id="'+this.mid("back_control")+'">  \< </button>'+
                    '<button id="'+this.mid("forward_control")+'" >  \> </button>'+
                    '<button id="'+this.mid("last_control")+'" >  \>\> </button>'+
                    '<button id="'+this.mid("reportButton")+'" >Report</button>'+
                    '<button id="'+this.mid("notesButton")+'" >Notes</button>'+
                    '<button id="'+this.mid("feedbackButton")+'" >Hint</button>'+
                '</div>'+
                '<div id="'+this.mid("mygem")+'"class="myChess_gem"> '+
                '</div>'+
            '</div>' +
            '<div id="'+this.mid("myModal")+'" class="modal">'+
                '<div class="modal-content" style="width: 350px;">'+      
                    '<table>'+
                        '<tr> <th colspan="2" align="center">Copy/Paste PGN file here</th></tr>'+
                        '<tr> <th colspan="2" align="center" id = "modalMessage"></th> </tr>'+
                        '<tr> <td colspan="2"> <textarea name="newPGNtext" id="'+this.mid("newPgnText")+'" cols="40" rows="5"></textarea> </td> </tr>'+
                        '<tr> <td colspan="2"> <input type="text" id ="'+this.mid("secret")+'"></td></tr>'+
                        '<tr> <td colspan="2"> <div id ="'+this.mid("dlg_items")+'" style="font-size: 10px" ></div></tr>'+
                        '<tr> <td align="center" style="width: 50%"> <button id="'+this.mid("dlg_load")+'" style="width: 90%" >Start</button></td>'+
                             '<td align="center" style="width: 50%"> <button id="'+this.mid("dlg_close")+'" style="width: 90%">Close</button></td></tr>'+
                    '</table>'+
                '</div>'+
            '</div>'

            
        )
        this.gem=new gem(this.mid("mygem"),this)

        this.midd("feedbackButton").on("click",(event) =>{
            console.log("p")
            var p = self.moveOnBoard-1
            console.log(p)
            if (p >=0)
            {
                console.log(self.moves[p])
                if (self.moves[p].eval_after != null)
                    self.gem.position_feedback(self.orig_pgn,self.moveOnBoard,self.moves[p].eval_after)
            }
        })
        this.midd("flip_control").on("click",(event) => {
            self.flip_board()
        })

        this.midd("load_control").on("click",(event) => {
            self.open_pgn_dlg()
        })

        this.midd("dlg_close").on("click",(event)=>{
            self.close_pgn_dlg()
        })

        this.midd("dlg_load").on("click",(event)=>{
            self.load_pgn_dlg()
        })

        this.midd("back_control").on("click",(event_=>{
            if (self.moveOnBoard > 0)
                self.setMoveOnBoard(self.moveOnBoard-1)
        }))

        this.midd("first_control").on("click",(event_=>{
            self.setMoveOnBoard(0)
        }))

        this.midd("forward_control").on("click",(event_=>{
            if (self.moveOnBoard < self.chess.history().length)
                self.setMoveOnBoard(self.moveOnBoard+1)
        }))

        this.midd("last_control").on("click",(event_=>{
            self.setMoveOnBoard(self.chess.history().length)
        }))

        this.midd("notesButton").on("click",(e)=>{
            self.gem.showNotes()
        })

        this.midd("reportButton").on("click",(e)=>{
            self.gem.showReport()
        })
    }

    open_pgn_dlg(){
        var self = this
        var x = this.exportPGN()
        this.midd("newPgnText").val(x)
        this.midd("myModal").show()
        fetch("./pgn_lib/")
        .then(response => response.text())
        .then(data => {
            var lines = data.split(/\r?\n|\r|\n/g);
            var html = ""
            for(var x= 0; x < lines.length; x++){
                var parts = lines[x].split('"')
                if (parts[0] == "<li><a href=")
                    html = html + '<a href="javascript:" class="'+this.mid("item_dlg_class")+'">'+decodeURI(parts[1])+'</a><br>';
            }
            
            self.midd("dlg_items").html(html)
            $("."+self.mid("item_dlg_class")).on("click",(e)=>{


                fetch("./pgn_lib/"+e.target.text)
                .then(response => response.text())
                .then(data => {
                    self.midd("newPgnText").val(data)
                })
                .catch(error => {
                        console.error('Error loading the text file:', error);
                });




            })
        })
        .catch(error => {
                console.error('Error loading the text file:', error);
        });

        
        console.log($("."+this.mid("item_dlg_class")))
    }

    close_pgn_dlg(){
        this.midd("myModal").hide()
    }

    load_pgn_dlg(){
        
        if (this.loadPGN(this.midd("newPgnText").val(), this.midd("secret").val()))
            this.close_pgn_dlg()
    }

    setStatus(x){
        self.midd("myChess_status").html(x+"<br>"+self.score_message)
    }

    flip_board(){
        this.board.flip()
  
        if (this.board.orientation()=="white")
        {
            this.midd("black_details").detach().appendTo("#"+this.mid("top_details"));
            this.midd("white_details").detach().appendTo("#"+this.mid("bottom_details"));
        }
        else
        {
            this.midd("black_details").detach().appendTo("#"+this.mid("bottom_details"));
            this.midd("white_details").detach().appendTo("#"+this.mid("top_details"));
        }

        self.moveorrequest()
    }

    scheduleNextMove(){

        if (self.snm == false){
            if (self.chess.history().length < self.moves.length){
                self.snm = true
                setTimeout(()=>{
                    self.snm = false
                    self.makeNextMove()
                    self.setMoveOnBoard(9999)
                },1000)
            }
        }
    }

    moveorrequest(){
        

        if (self.chess.history().length == self.moves.length)
        {
            self.setStatus("Game is over")
            self.rtm=false
            return
        }

        if (self.chess.history().length < 10 )
            {
                self.setStatus("Opening replay")
                self.rtm=false
                self.scheduleNextMove()
                return
            }
        
        if ((self.chess.turn() === 'w' && self.board.orientation() == "black") ||
            (self.chess.turn() === 'b' && self.board.orientation() == "white")) {
            self.rtm = false
            self.setStatus("")
            self.scheduleNextMove()
            return
        }
        if (self.moves[self.chess.history().length].eval_before == null)
        {
            self.setStatus("Please wait .  Evaluating Position")
            self.rtm=false
            return
        }
                
        self.setStatus("Make the next move for "+ (self.chess.turn() === 'w' ? "white" : "black"))
        self.rtm=true
    }

    makeNextMove(){
        
        this.chess.move(this.moves[this.chess.history().length])
        this.moveOnBoard += 1
        this.midd("pgn").html(this.chess.pgn())

        this.moveorrequest()

        
    }
    constructor(boardID){
        self = this
        this.divId = boardID
        this.parent = $("#"+boardID) 
        this.chess = new Chess()
        this.makeHTML()
        var config = {
            draggable: true,
            position: 'start',
            onDragStart: this.onDragStart,
            onDrop: this.onDrop,
            onSnapEnd: this.onSnapEnd
          }
        this.board = new Chessboard(this.mid("myBoard"), config)
    
        this.moves = []
        this.moveOnBoard = 0
        this.snm = false
        self.score = 0
        self.score_message = ""
        

    }

    onDragStart (source, piece, position, orientation) {
        

        // only pick up pieces for the side to move
        if ((self.chess.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (self.chess.turn() === 'b' && piece.search(/^w/) !== -1)) {
          return false
        }

        //Only pick up peices if the board is showing the current position
        if (self.moveOnBoard != self.chess.history().length)
            return false

        return self.rtm
      }

    onDrop (source, target) {
        var correct_move = self.moves[self.chess.history().length]
        
        //See if it was a legal move
        var move = self.chess.move({
            from: source,
            to: target,
            promotion: 'q' // NOTE: always promote to a queen for example simplicity
          })

        if (move==null)
            return "snapback"

        //Undo the move to allow the later systems to make the correct move
        self.chess.undo()

        // see if the move mtches the game
        if ((source != correct_move.from)  || (target != correct_move.to))
        {
            self.score_move(move)
            self.scheduleNextMove()
            return "snapback"
        }
        
        self.score_move(self.moves[self.chess.history().length])
        self.makeNextMove()
    }

    onSnapEnd () {
        self.board.position(self.chess.fen())
    }
      
    score_move(move){
        
        var correct_move = this.moves[this.chess.history().length]
        
        if ((move.from == correct_move.from) && ((move.to) == correct_move.to))
        {
            
            self.score += 6
            self.score_message = "Correct Move. You got 6 points for this move. Current Score "+String(self.score)
        }
        else
        {
            var correct_score = null
            var actual_score = null
            var best_score = -9999
            var worst_score = 9999

            for (var x =0; x< correct_move.eval_before.length;x++)
            {

                if ((correct_move.eval_before[x] != null) && (correct_move.eval_before[x].san == move.from+move.to))
                    actual_score = correct_move.eval_before[x].eval

                if ((correct_move.eval_before[x] != null) && (correct_move.eval_before[x].san == correct_move.from+correct_move.to))
                    correct_score = correct_move.eval_before[x].eval

                if (correct_move.eval_before[x].eval < worst_score)
                    worst_score = correct_move.eval_before[x].eval 

                if (correct_move.eval_before[x].eval > best_score)
                    best_score = correct_move.eval_before[x].eval 
            }

            if (actual_score == null)
                actual_score = worst_score - 5

            if (correct_score == null)
                correct_score = worst_score - 5



            var score_delta = actual_score - correct_score
            var display_score = Math.round(score_delta)

            if (display_score < 0)
                self.score_message = "Your chances of winning were "+-display_score+" % worse than the actual move<br>"
           
            if (display_score > 0)
                self.score_message = "Your chances of winning were "+display_score+" % better than the actual move<br>"
        
            if (display_score == 0)
                self.score_message = "Your chances of winning are the same as the actual move<br>"
           
            var pts = 0
            if (score_delta>=0)
                pts = 4+((score_delta)*(score_delta))
            if (score_delta<0)
                pts = 4+(score_delta)

            if (pts > 30)
                pts = 30
            if (pts < -2)
                pts = -2

            pts = (Math.floor(pts*10))/10
            self.score += pts
            self.score_message=self.score_message+("You scored "+String(pts)+" for this move. Your score is now "+self.score)
            

            
        }
    }


}

