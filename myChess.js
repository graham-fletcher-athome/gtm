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
            if (this.moves[x].comment)
                ch.set_comment(this.moves[x].comment)
        }

        var pgn = ch.pgn()
        
        return pgn
    }

    loadPGN(pgn,secret){
        var chess = new Chess()
        this.gem.secret = secret
        if (chess.load_pgn(pgn) != null)
        {
            
            this.moves = chess.history({ verbose: true })
            var x = chess.header()
            var comments = chess.get_comments()
            
            chess.reset()

            for (var i = 0; i < this.moves.length; i++){
                this.moves[i].fen_before = chess.fen()
                this.moves[i].pgn_before = chess.pgn()
                this.moves[i].eval_before = null
                chess.move(this.moves[i])
                this.moves[i].fen_after  = chess.fen()
                this.moves[i].pgn_after = chess.pgn()
                this.moves[i].eval_after = null
                if ( i >=9 )
                    analyse(this.moves[i].fen_after, this.analysisReturn)

                for (var j = 0; j < comments.length; j++){
                    if (comments[j].fen == this.moves[i].fen_after)
                        this.moves[i].comment = comments[j].comment

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
        console.log("smod",x)
        console.log(this.chess.history())
        if (x > this.chess.history().length)
            x = this.chess.history().length
        if (x==0)
        {
            this.board.position(this.moves[x].fen_before)
            console.log(this.moves[x])
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
        
        for(var j = 0; j < self.moves.length; j++){
            if (self.moves[j].fen_before == fen)
            {
                self.moves[j].eval_before = ca
                self.moveorrequest()
            }
            if (self.moves[j].fen_after == fen)
            {
                self.moves[j].eval_after = ca
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
                    '<div id="'+this.mid("myChess_status")+'" style="height: 20px; font-size: 14px;"></div>'+
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
                    html = html + '<a href="javascript:" class="'+this.mid("item_dlg_class")+'">'+decodeURI(parts[1])+'</a>';
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

        console.log("snm",self.snm)

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
        console.log(("mor"))

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
        console.log("mnm")
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
        console.log("----")
        var correct_move = this.moves[this.chess.history().length]
        console.log(correct_move)
        if ((move.from == correct_move.from) && ((move.to) == correct_move.to))
        {
            
            self.score += 3
            self.score_message = "Correct Move. Current Score "+String(self.score)
        }
        else
        {
            var correct_score = null
            var actual_score = null
            for (var x =0; x< 5;x++)
            {

                if ((correct_move.eval_before[x] != null) && (correct_move.eval_before[x].san == move.from+move.to))
                    actual_score = correct_move.eval_before[x].eval

                if ((correct_move.eval_before[x] != null) && (correct_move.eval_before[x].san == correct_move.from+correct_move.to))
                {
                    correct_score = correct_move.eval_before[x].eval
                }

            }
            if ((actual_score == null) || (actual_score < (correct_score -5)))
            {
                self.score -= 2
                if (self.score < 0)
                    self.score = 0
                self.score_message = "Your move "+move.san+" was incorrect. Sorry you lost 2 points. Current Score "+String(self.score)
                return
            }

            if ((correct_score == null) || (actual_score >= (correct_score +5)))
            {
                self.score += 10
                self.score_message = "Your move "+move.san+" was much better. Wow 10 points. Current Score "+String(self.score)
                return
            }

            if (actual_score >= correct_score +0.5)
                {
                    self.score += 5
                    self.score_message = "Your move "+move.san+" was better than the masters move. You got 5 points. Current Score "+String(self.score)
                    return
                }

            if (actual_score >= correct_score )
            {
                self.score += 3
                self.score_message = "Your move "+move.san+" was as good as the masters move. You got 3 points. Current Score "+String(self.score)
                return
            }

            if (actual_score >= correct_score - 1 )
            {
                self.score += 2
                self.score_message = "Your move "+move.san+" was as nearly as good as the masters move. You got 2 points. Current Score "+String(self.score)
                return
            }

            if (actual_score >= correct_score - 3 )
            {
                self.score += 1
                self.score_message = "Your move "+move.san+" was ok. You got 1 point. Current Score "+String(self.score)
                return
            }

            self.score_message = "You didnt get any points, but you didnt go down either!. Current Score "+String(self.score)
                return
        }
    }


}

