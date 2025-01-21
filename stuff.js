import {Chess} from "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.13.4/chess.js"
var board = null
var parsers = new Chess()
parsers.load_pgn("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 {giuoco piano} *")
var moves = parsers.history({ verbose: true })
var current_move_index = 0
var game = new Chess()

var $status = $('#status')
var $pgn = $('#pgn')
var $title = $('#title')

var headers={}

function setTitle(x)
{
  
}
function newPGN(txt)
{
  parsers.load_pgn(txt)
  var new_moves = parsers.history({ verbose: true })


  if (new_moves.length > 0)
  {
    headers = parsers.header()
    moves = new_moves
    current_move_index = 0
    game = new Chess()
    setSlow(game.fen())
    updateStatus()
    $('#newPgnText').val( "" )
    return(true)
  }
  else
    return ("Parse error")
} 
function onDragStart (source, piece, position, orientation) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false
  if (fens.length > 0) return false
  if (analysisReady == false) return false

  // only pick up pieces for the side to move
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false
  }
}



function playTopMove()
{
  if (fens.length == 0)
  {
      if ((game.turn() == 'b' && board.orientation() == "white") || (game.turn() == 'w' && board.orientation() == "black"))
      {
        var move = game.move(moves[current_move_index])
        current_move_index += 1
        setSlow(game.fen())
      }
  }
}

function onDrop (source, target) {
  correct_move = this.moves[this.chess.history().length]

  // see if the move mtches the game
  if ((source != correct_move.from)  || (target != correct_move.to))
    return "snapback"

  
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd () {
  setSlow(game.fen())
}
var fens = []
function setSlow(fen)
{
  
  fens.push(fen)
  if (fens.length == 1)
    setFast()
}

function setFast()
{
  
  setTimeout(function(){
    board.position(fens[0])
    fens.shift();
    console.log("time",fens)
    if (fens.length > 0)
      setFast()
    else
      updateStatus()

  }, 1000);
}

function updateStatus () {
  if (fens.length == 0)
    startAnalysis(game.fen())
  var status = ''

  var moveColor = 'White'
  if (game.turn() === 'b') {
    moveColor = 'Black'
  }

  // checkmate?
  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.'
  }

  // draw?
  else if (game.in_draw()) {
    status = 'Game over, drawn position'
  }

  // game still on
  else {

    if (analysisReady == false)
      status = "Analysing"
    else
    {
      status = moveColor + ' to move'

      // check?
      if (game.in_check()) {
        status += ', ' + moveColor + ' is in check'
      }
    }
  }

  setTitle(headers)
  playTopMove()

  if (fens.length == 0)
  {
    $status.html(status)
    $pgn.html(game.pgn())
    
  }
  else
    $status.html("")

  
  
}




</script>

