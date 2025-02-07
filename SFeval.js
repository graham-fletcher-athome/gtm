export function FEN2Messages(fen){
  messages_on()
  var pos = parseFEN(fen)
  $main_evaluation(pos)
  return messages_off()
}
export function evalFEN(fen){
  messages_off()
  var pos = parseFEN(fen)
  return $main_evaluation(pos)
}
function bounds(x, y) {
  return x >= 0 && x <= 7 && y >= 0 && y <= 7;
}
function parseFEN(fen) {
  var board = new Array(8);
  for (var i = 0; i < 8; i++) board[i] = new Array(8);
  var a = fen.replace(/^\s+/,'').split(' '), s = a[0], x, y;
  for (x = 0; x < 8; x++) for (y = 0; y < 8; y++) {
    board[x][y] = '-';
  }
  x = 0, y = 0;
  for (var i = 0; i < s.length; i++) {
    if (s[i] == ' ') break;
    if (s[i] == '/') {
      x = 0;
      y++;
    } else {
      if (!bounds(x, y)) continue;
      if ('KQRBNP'.indexOf(s[i].toUpperCase()) != -1) {
        board[x][y] = s[i];
        x++;
      } else if ('0123456789'.indexOf(s[i]) != -1) {
        x += parseInt(s[i]);
      } else x++;
    }
  }
  var castling, enpassant, whitemove = !(a.length > 1 && a[1] == 'b');
  if (a.length > 2) {
    castling = [ a[2].indexOf('K') != -1, a[2].indexOf('Q') != -1,
                 a[2].indexOf('k') != -1, a[2].indexOf('q') != -1];
  } else {
    castling = [ true, true, true, true ];
  }
  if (a.length > 3 && a[3].length == 2) {
    var ex = 'abcdefgh'.indexOf(a[3][0]);
    var ey = '87654321'.indexOf(a[3][1]);
    enpassant = (ex >= 0 && ey >= 0) ? [ex, ey] : null;
  } else {
    enpassant = null;
  }
  var movecount = [(a.length > 4 && !isNaN(a[4]) && a[4] != '') ? parseInt(a[4]) : 0,
                   (a.length > 5 && !isNaN(a[5]) && a[5] != '') ? parseInt(a[5]) : 1];
  return {b:board, c:castling, e:enpassant, w:whitemove, m:movecount, i:false};
}

function board(pos, x, y) {
  if (x >= 0 && x <= 7 && y >= 0 && y <= 7) return pos.b[x][y];
  return "x";
}
function colorflip(pos) {
  var board = new Array(8);
  for (var i = 0; i < 8; i++) board[i] = new Array(8);
  for (var x = 0; x < 8; x++) for (var y = 0; y < 8; y++) {
    board[x][y] = pos.b[x][7-y];
    var color = board[x][y].toUpperCase() == board[x][y];
    board[x][y] = color ? board[x][y].toLowerCase() : board[x][y].toUpperCase();
  }
  return {b:board, c:[pos.c[2],pos.c[3],pos.c[0],pos.c[1]], e:pos.e == null ? null : [pos.e[0],7-pos.e[1]], w:!pos.w, m:[pos.m[0],pos.m[1]], i:!pos.i};
}

function sum(pos, func, param) {
  var sum = 0;
  const m = String(func).match("^[^\\$]*\\$([^\\(]*)\\(.*")
  for (var x = 0; x < 8; x++) for(var y = 0; y < 8; y++) {
    const result = func(pos, {x:x, y:y}, param);
    sum += result
    if (result != 0){
      
      if(m)
        
         
          store_message1({"colour":(pos.i  ? "black" : "white"),
            "peice":peice(pos,x,y),
            "square":("abcdefgh"[x]+String(pos.i ? y+1: 8-y)),
            "function":m[1],
            "score":result,
            "pos":pos})

        
    }
  }
  if(m){
    store_message1({"colour":(pos.i  ? "black" : "white"),
                    "peice":null,
                    "square":null,
                    "function":m[1],
                    "score":sum,
                    "pos":pos})
  }
 

  return sum;
}


export function eval_vector(fen){
  var pos = parseFEN(fen)
  var mgl = $balance_evaluation($middle_game_evaluation_list(pos),[],pos)
  var egl = $balance_evaluation([],$end_game_evaluation_list(pos),pos)
  var result =  mgl.concat(egl)
  if (!pos.w)
    for(var x = 0; x <  result.length; x++)
      result[x] = -result[x]
  
  return result
}


/*$main_evaluation
---------------------*/
function $main_evaluation(pos) {
  if (!pos.w)
    pos = colorflip(pos)
  return $balance_evaluation(
    $middle_game_evaluation(pos),
    $end_game_evaluation(pos),
    pos
  )
}
var allow_messages = false

export function messages_on(){
  allow_messages = true
}
export function messages_off(){
  var x = get_messages()
  all_messages={}
  allow_messages = false
  return x
}

function store_message(str,inverted,replace){
}

var all_messages={}
function store_message1(p){
  if (!allow_messages)
    return

  if (p.score == 0)
    return

  var key = null
  if (p.square){
    if (p.peice != "-")
    {
      key = p.colour+" "+p.peice+" on " + p.square
      var m = key.match("^([^ ]*) ([^ ]*)(.*)")
      if (m && m[2]=="my")
        key = m[1]+m[3]
      if (m && m[2]=="th")
        key = (m[1]=="white"?"black":"white")+m[3]
    }
  }
  else
    key = p.colour

  

  if (key)
  {
    if (!(key in all_messages)){
      all_messages[key] = {}
    }

    var func = p.function
    var phase = "all"
    if (p.function.slice(-3)== "_mg"){
      func = p.function.slice(0,p.function.length-3)
      phase = "mg"
    }
    if (p.function.slice(-3)== "_eg"){
      func = p.function.slice(0,p.function.length-3)
      phase = "eg"
    }

    if (!(func in all_messages[key]))
      all_messages[key][func]={pos:p.pos}

    if (!(phase in all_messages[key][func]))
      all_messages[key][func][phase] = 0

    all_messages[key][func][phase] = p.score
  }

}

export function deltaMessages(m1,m2){

  console.log("delta",m1,m2)
  var result = {}
  var keys1 = Object.keys(m1)
  var keys2 = Object.keys(m2)
  var keys = []

  for (const x of keys2){
    if (keys.indexOf(x) == -1)
      keys.push(x)
  }
  for (const x of keys1){
    if (keys.indexOf(x) == -1)
      keys.push(x)
  }

  console.log("All keys ", keys)

  for (const x of keys1){
    console.log(x,m1[x],m2[x])
    var v1 = (keys1.indexOf(x)>-1)?m1[x]: (isNaN(m2[x])?{}:0)
    var v2 = (keys2.indexOf(x)>-1)?m2[x]: (isNaN(m1[x])?{}:0)
    console.log(v1,v2)
    result[x] = isNaN(v1)?  deltaMessages(v1,v2) : v2-v1
  }

  return result
}

function get_messages(){

  var messages = {}
  for(const [k,v] of Object.entries(all_messages)){

    var mes = {}
    for (const [func,val] of Object.entries(v)){

      mes[func] = null
      if (("eg" in val) && ("mg" in val))  
        mes[func] = $balance_evaluation(val.mg,val.eg,val.pos)
      else
        mes[func] = val.all
    }
    messages[k] = mes

  }
  return messages
}

function peice(pos,x,y){
  if (board(pos, x, y) == 'P') return "my pawn"
  if (board(pos, x, y) == 'K') return "my king"
  if (board(pos, x, y) == 'Q') return "my queen"
  if (board(pos, x, y) == 'R') return "my rook"
  if (board(pos, x, y) == 'B') return "my bishop"
  if (board(pos, x, y) == 'N') return "my knight"
  if (board(pos, x, y) == 'p') return "th pawn"
  if (board(pos, x, y) == 'k') return "th king"
  if (board(pos, x, y) == 'q') return "th queen"
  if (board(pos, x, y) == 'r') return "th rook"
  if (board(pos, x, y) == 'b') return "th bishop"
  if (board(pos, x, y) == 'n') return "th knight"
  return "-"
}

function $balance_evaluation(mg,eg,pos) {
  if (mg.constructor !== Array){
    var p = $phase(pos)
    eg = eg * $scale_factor(pos, eg) / 64;
    var v = (((mg * p + ((eg * (128 - p)) << 0)) / 128) << 0);
    return v;
  }
  else
  {
    v = []
    for (var x =0; x < Math.max(mg.length,eg.length); x++)
    {
      var v1 = (x < mg.length) ? mg[x] : 0
      var v2 = (x < eg.length) ? eg[x] : 0
      v.push($balance_evaluation(v1,v2,pos))
    }
    return v;
  }
}






/*
$isolated
---------------------*/
function $isolated(pos, square) {
  if (square == null) return sum(pos, $isolated);
  if (board(pos, square.x, square.y) != "P") return 0;
  for (var y = 0 ; y < 8; y++) {
    if (board(pos, square.x - 1, y) == "P") return 0;
    if (board(pos, square.x + 1, y) == "P") return 0;
  }
  store_message("The ${colour} pawn on ${square} is isolated",pos.i,{"colour":"white","square":square})
  return 1;
}





/*
$opposed
---------------------*/
function $opposed(pos, square) {
  if (square == null) return sum(pos, $opposed);
  if (board(pos, square.x, square.y) != "P") return 0;
  for (var y = 0; y < square.y; y++) {
    if (board(pos, square.x, y) == "p") return 1;
  }
  return 0;
}





/*
$rank
---------------------*/
function $rank(pos, square) {
  if (square == null) return sum(pos, $rank);
  return 8 - square.y;
}





/*
$file
---------------------*/
function $file(pos, square) {
  if (square == null) return sum(pos, $file);
  return 1 + square.x;
}





/*
$phalanx
---------------------*/
function $phalanx(pos, square) {
  if (square == null) return sum(pos, $phalanx);
  if (board(pos, square.x, square.y) != "P") return 0;
  if (board(pos, square.x - 1, square.y) == "P") return 1;
  if (board(pos, square.x + 1, square.y) == "P") return 1;
  return 0;
}





/*
$supported
---------------------*/
function $supported(pos, square) {
  if (square == null) return sum(pos, $supported);
  if (board(pos, square.x, square.y) != "P") return 0;
  return (board(pos, square.x - 1, square.y + 1) == "P" ? 1 : 0)
       + (board(pos, square.x + 1, square.y + 1) == "P" ? 1 : 0);
}





/*
$backward
---------------------*/
function $backward(pos, square) {
  if (square == null) return sum(pos, $backward);
  if (board(pos, square.x, square.y) != "P") return 0;
  for (var y = square.y; y < 8; y++) {
    if (board(pos, square.x - 1, y) == "P"
     || board(pos, square.x + 1, y) == "P") return 0;
  }
  if (board(pos, square.x - 1, square.y - 2) == "p"
   || board(pos, square.x + 1, square.y - 2) == "p"
   || board(pos, square.x    , square.y - 1) == "p") {
    store_message("The ${colour} pawn on ${square} is backward." , pos.i, {"colour":"white","square":square})
    return 1;
   }
  return 0;
}





/*
$doubled
---------------------*/
function $doubled(pos, square) {
  if (square == null) return sum(pos, $doubled);
  if (board(pos, square.x, square.y) != "P") return 0;
  if (board(pos, square.x, square.y + 1) != "P") return 0;
  if (board(pos, square.x - 1, square.y + 1) == "P") return 0;
  if (board(pos, square.x + 1, square.y + 1) == "P") return 0;
  store_message("The ${colour} pawn on ${square} is doubled." , pos.i, {"colour":"white","square":square})

  return 1;
}





/*
$connected
---------------------*/
function $connected(pos, square) {
  if (square == null) return sum(pos, $connected);
  if ($supported(pos, square) || $phalanx(pos, square)){

    store_message("The ${colour} pawn on ${square} is connected." , pos.i, {"colour":"white","square":square})
    return 1;
  }
  return 0;
}





/*
$middle_game_evaluation
---------------------*/
function $middle_game_evaluation(pos, nowinnable) {
  var v = 0;
  var ev = $middle_game_evaluation_list(pos)
  for (var x =0; x < ev.length; x++)
    v += ev[x]
  if (!nowinnable) v += $winnable_total_mg(pos, v);
  return v;
}

function $middle_game_evaluation_list(pos) {
  var v = [];
  v.push( $piece_value_mg(pos) - $piece_value_mg(colorflip(pos)));
  v.push( $psqt_mg(pos) - $psqt_mg(colorflip(pos)));
  v.push( $imbalance_total(pos));
  v.push( $pawns_mg(pos) - $pawns_mg(colorflip(pos)));
  v.push( $pieces_mg(pos) - $pieces_mg(colorflip(pos)));
  v.push( $mobility_mg(pos) - $mobility_mg(colorflip(pos)));
  v.push( $threats_mg(pos) - $threats_mg(colorflip(pos)));
  v.push( $passed_mg(pos) - $passed_mg(colorflip(pos)));
  v.push( $space(pos) - $space(colorflip(pos)));
  v.push( $king_mg(pos) - $king_mg(colorflip(pos)));
  return v
}






/*
$end_game_evaluation
---------------------*/
function $end_game_evaluation(pos, nowinnable) {
  var v = 0;
  var ev = $end_game_evaluation_list(pos)
  for (var x = 0; x < ev.length; x++)
    v += ev[x]
  if (!nowinnable) v += $winnable_total_eg(pos, v);
  return v;
}

function $end_game_evaluation_list(pos) {
  var v = [];
  v.push( $piece_value_eg(pos) - $piece_value_eg(colorflip(pos)));
  v.push( $psqt_eg(pos) - $psqt_eg(colorflip(pos)));
  v.push( $imbalance_total(pos));
  v.push( $pawns_eg(pos) - $pawns_eg(colorflip(pos)));
  v.push( $pieces_eg(pos) - $pieces_eg(colorflip(pos)));
  v.push( $mobility_eg(pos) - $mobility_eg(colorflip(pos)));
  v.push( $threats_eg(pos) - $threats_eg(colorflip(pos)));
  v.push( $passed_eg(pos) - $passed_eg(colorflip(pos)));
  v.push( $king_eg(pos) - $king_eg(colorflip(pos)));
  
  return v;
}





/*
$scale_factor
---------------------*/
function $scale_factor(pos, eg) {
  if (eg == null) eg = $end_game_evaluation(pos);
  var pos2 = colorflip(pos);
  var pos_w = eg > 0 ? pos : pos2;
  var pos_b = eg > 0 ? pos2 : pos;
  var sf = 64;
  var pc_w = $pawn_count(pos_w), pc_b = $pawn_count(pos_b);
  var qc_w = $queen_count(pos_w), qc_b = $queen_count(pos_b);
  var bc_w = $bishop_count(pos_w), bc_b = $bishop_count(pos_b);
  var nc_w = $knight_count(pos_w), nc_b = $knight_count(pos_b);
  var npm_w = $non_pawn_material(pos_w), npm_b = $non_pawn_material(pos_b);
  var bishopValueMg = 825, bishopValueEg = 915, rookValueMg = 1276;
  if (pc_w == 0 && npm_w - npm_b <= bishopValueMg) sf = npm_w < rookValueMg ? 0 : npm_b <= bishopValueMg ? 4 : 14;
  if (sf == 64) {
    var ob = $opposite_bishops(pos);
    if (ob && npm_w == bishopValueMg && npm_b == bishopValueMg) {
      sf = 22 + 4 * $candidate_passed(pos_w);
    } else if (ob) {
      sf = 22 + 3 * $piece_count(pos_w);
    } else {
      if (npm_w == rookValueMg && npm_b == rookValueMg && pc_w - pc_b <= 1) {
        var pawnking_b = 0, pcw_flank = [0, 0];
        for (var x = 0; x < 8; x++) {
          for (var y = 0; y < 8; y++) {
            if (board(pos_w, x, y) == "P") pcw_flank[(x < 4)?1:0] = 1;
            if (board(pos_b, x, y) == "K") {
              for (var ix = -1; ix <= 1; ix++) {
                for (var iy = -1; iy <= 1; iy++) {
                  if (board(pos_b, x + ix, y + iy) == "P") pawnking_b = 1;
                }
              }
            }
          }
        }
        if (pcw_flank[0] != pcw_flank[1] && pawnking_b) return 36;
      }
      if (qc_w + qc_b == 1) {
        sf = 37 + 3 * (qc_w == 1 ? bc_b + nc_b : bc_w + nc_w);
      } else {
        sf = Math.min(sf, 36 + 7 * pc_w);
      }
    }
  }
  return sf;
}





/*
$phase
---------------------*/
function $phase(pos) {
  var midgameLimit = 15258, endgameLimit  = 3915;
  var npm = $non_pawn_material(pos) + $non_pawn_material(colorflip(pos));
  npm = Math.max(endgameLimit, Math.min(npm, midgameLimit));
  return (((npm - endgameLimit) * 128) / (midgameLimit - endgameLimit)) << 0;
}





/*
$imbalance
---------------------*/
function $imbalance(pos, square) {
  if (square == null) return sum(pos, $imbalance);
  var qo = [[0],[40,38],[32,255,-62],[0,104,4,0],[-26,-2,47,105,-208],[-189,24,117,133,-134,-6]];
  var qt = [[0],[36,0],[9,63,0],[59,65,42,0],[46,39,24,-24,0],[97,100,-42,137,268,0]];
  var j = "XPNBRQxpnbrq".indexOf(board(pos, square.x, square.y));
  if (j < 0 || j > 5) return 0;
  var bishop = [0, 0], v = 0;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      var i = "XPNBRQxpnbrq".indexOf(board(pos, x, y));
      if (i < 0) continue;
      if (i == 9) bishop[0]++;
      if (i == 3) bishop[1]++;
      if (i % 6 > j) continue;
      if (i > 5) v += qt[j][i-6];
            else v += qo[j][i];
    }
  }
  if (bishop[0] > 1) v += qt[j][0];
  if (bishop[1] > 1) v += qo[j][0];
  return v;
}





/*
$bishop_count
---------------------*/
function $bishop_count(pos, square) {
  if (square == null) return sum(pos, $bishop_count);
  if (board(pos, square.x, square.y) == "B") return 1;
  return 0;
}





/*
$bishop_pair
---------------------*/
function $bishop_pair(pos, square) {
  if ($bishop_count(pos) < 2) return 0;
  if (square == null){
    store_message("${colour} has a biphop pair.",pos.i,{"colour":"white"})
    return 1438;
  }
  return board(pos, square.x, square.y) == "B" ? 1 : 0;
  
}





/*
$pinned_direction
---------------------*/
function $pinned_direction(pos, square) {
  if (square == null) return sum(pos, $pinned_direction);
  if ("PNBRQK".indexOf(board(pos, square.x, square.y).toUpperCase()) < 0) return 0;
  var color = 1;
  if ("PNBRQK".indexOf(board(pos, square.x, square.y)) < 0) color = -1;
  for (var i = 0; i < 8; i++) {
    var ix = (i + (i > 3)) % 3 - 1;
    var iy = (((i + (i > 3)) / 3) << 0) - 1;
    var king = false;
    for (var d = 1; d < 8; d++) {
      var b = board(pos, square.x + d * ix, square.y + d * iy);
      if (b == "K") king = true;
      if (b != "-") break;
    }
    if (king) {
      for (var d = 1; d < 8; d++) {
        var b = board(pos, square.x - d * ix, square.y - d * iy);
        if (b == "q"
         || b == "b" && ix * iy != 0
         || b == "r" && ix * iy == 0) return Math.abs(ix + iy * 3) * color;
        if (b != "-") break;
      }
    }
  }
  return 0;
}





/*
$mobility
---------------------*/
function $mobility(pos, square) {
  if (square == null) return sum(pos, $mobility);
  var v = 0;  
  var b = board(pos, square.x, square.y);
  if ("NBRQ".indexOf(b) < 0) return 0;
  for (var x = 0; x < 8; x++) {
    for(var y = 0; y < 8; y++) {
      var s2 = {x:x, y:y};
      if (!$mobility_area(pos, s2)) continue;
      if (b == "N" && $knight_attack(pos, s2, square) && board(pos, x, y) != 'Q') v++;
      if (b == "B" && $bishop_xray_attack(pos, s2, square) && board(pos, x, y) != 'Q') v++;
      if (b == "R" && $rook_xray_attack(pos, s2, square)) v++;
      if (b == "Q" && $queen_attack(pos, s2, square)) v++;
    }
  }
  return v;
}





/*
$mobility_area
---------------------*/
function $mobility_area(pos, square) {
  if (square == null) return sum(pos, $mobility_area);
  if (board(pos, square.x, square.y) == "K") return 0;
  if (board(pos, square.x, square.y) == "Q") return 0;
  if (board(pos, square.x - 1, square.y - 1) == "p") return 0;
  if (board(pos, square.x + 1, square.y - 1) == "p") return 0;
  if (board(pos, square.x, square.y) == "P" &&
     ($rank(pos, square) < 4 || board(pos, square.x, square.y - 1) != "-")) return 0;
  if ($blockers_for_king(colorflip(pos), {x:square.x,y:7-square.y})) return 0;
  return 1;
}





/*
$mobility_bonus
---------------------*/
function $mobility_bonus(pos, square, mg) {
  if (square == null) return sum(pos, $mobility_bonus, mg);
  var bonus = mg ? [
    [-62,-53,-12,-4,3,13,22,28,33],
    [-48,-20,16,26,38,51,55,63,63,68,81,81,91,98],
    [-60,-20,2,3,3,11,22,31,40,40,41,48,57,57,62],
    [-30,-12,-8,-9,20,23,23,35,38,53,64,65,65,66,67,67,72,72,77,79,93,108,108,108,110,114,114,116]
  ] : [
    [-81,-56,-31,-16,5,11,17,20,25],
    [-59,-23,-3,13,24,42,54,57,65,73,78,86,88,97],
    [-78,-17,23,39,70,99,103,121,134,139,158,164,168,169,172],
    [-48,-30,-7,19,40,55,59,75,78,96,96,100,121,127,131,133,136,141,147,150,151,168,168,171,182,182,192,219]
  ];
  var i = "NBRQ".indexOf(board(pos, square.x, square.y));
  if (i < 0) return 0;
  return bonus[i][$mobility(pos, square)];
}





/*
$knight_attack
---------------------*/
function $knight_attack(pos, square, s2) {
  if (square == null) return sum(pos, $knight_attack);
  var v = 0;
  for (var i = 0; i < 8; i++) {
    var ix = ((i > 3) + 1) * (((i % 4) > 1) * 2 - 1);
    var iy = (2 - (i > 3)) * ((i % 2 == 0) * 2 - 1);
    var b = board(pos, square.x + ix, square.y + iy);
    if (b == "N"
    && (s2 == null || s2.x == square.x + ix && s2.y == square.y + iy)
    && !$pinned(pos, {x:square.x + ix, y:square.y + iy})) v++;
  }
  return v;
}





/*
$bishop_xray_attack
---------------------*/
function $bishop_xray_attack(pos, square, s2) {
  if (square == null) return sum(pos, $bishop_xray_attack);
  var v = 0;
  for (var i = 0; i < 4; i++) {
    var ix = ((i > 1) * 2 - 1);
    var iy = ((i % 2 == 0) * 2 - 1);
    for (var d = 1; d < 8; d++) {
      var b = board(pos, square.x + d * ix, square.y + d * iy);
      if (b == "B"
      && (s2 == null || s2.x == square.x + d * ix && s2.y == square.y + d * iy)) {
        var dir = $pinned_direction(pos, {x:square.x+d*ix, y:square.y+d*iy});
        if (dir == 0 || Math.abs(ix+iy*3) == dir) v++;
      }
      if (b != "-" && b != "Q" && b != "q") break;
    }
  }
  return v;
}





/*
$rook_xray_attack
---------------------*/
function $rook_xray_attack(pos, square, s2) {
  if (square == null) return sum(pos, $rook_xray_attack);
  var v = 0;
  for (var i = 0; i < 4; i++) {
    var ix = (i == 0 ? -1 : i == 1 ? 1 : 0);
    var iy = (i == 2 ? -1 : i == 3 ? 1 : 0);
    for (var d = 1; d < 8; d++) {
      var b = board(pos, square.x + d * ix, square.y + d * iy);
      if (b == "R"
      && (s2 == null || s2.x == square.x + d * ix && s2.y == square.y + d * iy)) {
        var dir = $pinned_direction(pos, {x:square.x+d*ix, y:square.y+d*iy});
        if (dir == 0 || Math.abs(ix+iy*3) == dir) v++;
      }
      if (b != "-" && b != "R" && b != "Q" && b != "q") break;
    }
  }

  return v;
}





/*
$queen_attack
---------------------*/
function $queen_attack(pos, square, s2) {
  if (square == null) return sum(pos, $queen_attack);
  var v = 0;
  for (var i = 0; i < 8; i++) {
    var ix = (i + (i > 3)) % 3 - 1;
    var iy = (((i + (i > 3)) / 3) << 0) - 1;
    for (var d = 1; d < 8; d++) {
      var b = board(pos, square.x + d * ix, square.y + d * iy);
      if (b == "Q"
      && (s2 == null || s2.x == square.x + d * ix && s2.y == square.y + d * iy)) {
        var dir = $pinned_direction(pos, {x:square.x+d*ix, y:square.y+d*iy});
        if (dir == 0 || Math.abs(ix+iy*3) == dir) v++;
      }
      if (b != "-") break;
    }
  }
  return v;
}





/*
$outpost
---------------------*/
function $outpost(pos, square) {
  if (square == null) return sum(pos, $outpost);
  if (board(pos, square.x, square.y) != "N"
   && board(pos, square.x, square.y) != "B") return 0;
  if (!$outpost_square(pos, square)) return 0;

  var peice = board(pos, square.x, square.y) == "N" ? "knight" : "bishop"
  store_message("The ${colour} "+peice+" is in an outpost at ${square}.",pos.i, {"colour":"white","square":square})
  return 1;
}





/*
$outpost_square
---------------------*/
function $outpost_square(pos, square) {
  if (square == null) return sum(pos, $outpost_square);
  if ($rank(pos, square) < 4 || $rank(pos, square) > 6) return 0;
  if (board(pos, square.x - 1, square.y + 1) != "P"
   && board(pos, square.x + 1, square.y + 1) != "P") return 0;
  if ($pawn_attacks_span(pos, square)) return 0;
  
  store_message("${square} is an outpost for ${colour}.",pos.i, {"colour":"white","square":square})

  return 1;
}





/*
$reachable_outpost
---------------------*/
function $reachable_outpost(pos, square) {
  if (square == null) return sum(pos, $reachable_outpost);
  if (board(pos, square.x, square.y) != "B"
   && board(pos, square.x, square.y) != "N") return 0;
  var v = 0;
  for (var x = 0; x < 8; x++) {
    for (var y = 2; y < 5; y++) {
      if ((board(pos, square.x, square.y) == "N"
        && "PNBRQK".indexOf(board(pos, x, y)) < 0
        && $knight_attack(pos, {x:x,y:y}, square)
        && $outpost_square(pos, {x:x,y:y}))
       || (board(pos, square.x, square.y) == "B"
        && "PNBRQK".indexOf(board(pos, x, y)) < 0
        && $bishop_xray_attack(pos, {x:x,y:y}, square)
        && $outpost_square(pos, {x:x,y:y}))) {
        var support = board(pos, x - 1, y + 1) == "P" || board(pos, x + 1, y + 1) == "P" ? 2 : 1;
        v = Math.max(v, support);
      }
    }
  }
  return v;
}





/*
$minor_behind_pawn
---------------------*/
function $minor_behind_pawn(pos, square) {
  if (square == null) return sum(pos, $minor_behind_pawn);
  if (board(pos, square.x, square.y) != "B"
   && board(pos, square.x, square.y) != "N") return 0;
  if (board(pos, square.x, square.y - 1).toUpperCase() != "P") return 0;

  var peice = board(pos, square.x, square.y) == "N" ? "knight" : "bishop"
  store_message("The ${colour} "+peice+" at ${square} is behind the pawns.",pos.i, {"colour":"white","square":square})

  return 1;
}





/*
$bishop_pawns
---------------------*/
function $bishop_pawns(pos, square) {
  if (square == null) {
    var s = sum(pos, $bishop_pawns);
    store_message("The bishop_pawns stockfish evaluation term for ${colour} is "+String(s)+".",pos.i, {"colour":"white","square":square})
    return s
  }
  if (board(pos, square.x, square.y) != "B") return 0;
  var c = (square.x + square.y) % 2, v = 0;
  var blocked = 0;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y) == "P" && c == (x + y) % 2) v++;
      if (board(pos, x, y) == "P"
       && x > 1 && x < 6
       && board(pos, x, y - 1) != "-") blocked++;
    }
  }
  return v * (blocked + ($pawn_attack(pos, square) > 0 ? 0 : 1));
}





/*
$rook_on_file
---------------------*/
function $rook_on_file(pos, square) {
  if (square == null) return sum(pos, $rook_on_file);
  if (board(pos, square.x, square.y) != "R") return 0;
  var open = 1;
  for (var y = 0; y < 8; y++) {
    if (board(pos, square.x, y) == "P") return 0;
    if (board(pos, square.x, y) == "p") open = 0;
  }
  if (open == 0)
    store_message("The ${colour} rook at ${square} is on an open file.",pos.i, {"colour":"white","square":square})
  if (open == 1)
    store_message("The ${colour} rook at ${square} is on a semi-open file.",pos.i, {"colour":"white","square":square})

  return open + 1;
}





/*
$trapped_rook
---------------------*/
function $trapped_rook(pos, square) {
  if (square == null) return sum(pos, $trapped_rook);
  if (board(pos, square.x, square.y) != "R") return 0;
  if ($rook_on_file(pos, square)) return 0;
  if ($mobility(pos, square)> 3) return 0;
  var kx = 0, ky = 0;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y) == "K") { kx = x; ky = y; }
    }
  }
  if ((kx < 4) != (square.x < kx)) return 0;
  store_message("The ${colour} rook at ${square} is blocked in by the king.",pos.i, {"colour":"white","square":square})

  return 1;
}





/*
$weak_queen
---------------------*/
function $weak_queen(pos, square) {
  if (square == null) return sum(pos, $weak_queen);
  if (board(pos, square.x, square.y) != "Q") return 0;
  for (var i = 0; i < 8; i++) {
    var ix = (i + (i > 3)) % 3 - 1;
    var iy = (((i + (i > 3)) / 3) << 0) - 1;
    var count = 0;
    for (var d = 1; d < 8; d++) {
      var b = board(pos, square.x + d * ix, square.y + d * iy);
      if (b == "r" && (ix == 0 || iy == 0) && count == 1) return 1;
      if (b == "b" && (ix != 0 && iy != 0) && count == 1) return 1;
      if (b != "-") count++;
    }
  }
  return 0;
}





/*
$space_area
---------------------*/
function $space_area(pos, square) {
  if (square == null) return sum(pos, $space_area);
  var v = 0;
  var rank = $rank(pos, square);
  var file = $file(pos, square);
  if ((rank >= 2 && rank <= 4 && file >= 3 && file <= 6)
   && (board(pos, square.x ,square.y) != "P")
   && (board(pos, square.x - 1 ,square.y - 1) != "p")
   && (board(pos, square.x + 1 ,square.y - 1) != "p")) {
    v++;
    if ((board(pos, square.x, square.y - 1) == "P"
      || board(pos, square.x, square.y - 2) == "P"
      || board(pos, square.x, square.y - 3) == "P")
      && !$attack(colorflip(pos), {x:square.x, y:7-square.y})) v++;
  }   
  return v;
}





/*
$pawn_attack
---------------------*/
function $pawn_attack(pos, square) {
  if (square == null) return sum(pos, $pawn_attack);
  var v = 0;
  if (board(pos, square.x - 1, square.y + 1) == "P") v++;
  if (board(pos, square.x + 1, square.y + 1) == "P") v++;
  return v;
}





/*
$king_attack
---------------------*/
function $king_attack(pos, square) {
  if (square == null) return sum(pos, $king_attack);
  for (var i = 0; i < 8; i++) {
    var ix = (i + (i > 3)) % 3 - 1;
    var iy = (((i + (i > 3)) / 3) << 0) - 1;
    if (board(pos, square.x + ix, square.y + iy) == "K") return 1;
  }
  
 
  return 0;
}





/*
$attack
---------------------*/
function $attack(pos, square) {
  if (square == null) return sum(pos, $attack);
  var v = 0;
  v += $pawn_attack(pos, square);
  v += $king_attack(pos, square);
  v += $knight_attack(pos, square);
  v += $bishop_xray_attack(pos, square);
  v += $rook_xray_attack(pos, square);
  v += $queen_attack(pos, square);
  return v;
}





/*
$non_pawn_material
---------------------*/
function $non_pawn_material(pos, square) {
  if (square == null) return sum(pos, $non_pawn_material);
  var i = "NBRQ".indexOf(board(pos, square.x, square.y));
  if (i >= 0) return $piece_value_bonus(pos, square, true);
  return 0;
}





/*
$safe_pawn
---------------------*/
function $safe_pawn(pos, square) {
  if (square == null) return sum(pos, $safe_pawn);
  if (board(pos, square.x, square.y) != "P") return 0;
  if ($attack(pos, square)) return 1;
  if (!$attack(colorflip(pos), {x:square.x,y:7-square.y})) return 1;
  return 0;
}





/*
$threat_safe_pawn
---------------------*/
function $threat_safe_pawn(pos, square) {
  if (square == null) return sum(pos, $threat_safe_pawn);
  if ("nbrq".indexOf(board(pos, square.x, square.y)) < 0) return 0;
  if (!$pawn_attack(pos, square)) return 0;
  if ($safe_pawn(pos, {x:square.x - 1, y:square.y + 1})
   || $safe_pawn(pos, {x:square.x + 1, y:square.y + 1})) return 1;
  return 0;
}





/*
$weak_enemies
---------------------*/
function $weak_enemies(pos, square) {
  if (square == null) return sum(pos, $weak_enemies);
  if ("pnbrqk".indexOf(board(pos, square.x, square.y)) < 0) return 0;
  if (board(pos, square.x - 1, square.y - 1) == "p") return 0;
  if (board(pos, square.x + 1, square.y - 1) == "p") return 0;
  if (!$attack(pos, square)) return 0;
  if ($attack(pos, square) <= 1
   && $attack(colorflip(pos),{x:square.x,y:7-square.y}) > 1) return 0
  return 1;
}





/*
$minor_threat
---------------------*/
function $minor_threat(pos, square) {
  if (square == null) return sum(pos, $minor_threat);
  var type = "pnbrqk".indexOf(board(pos, square.x, square.y));
  if (type < 0) return 0;
  if (!$knight_attack(pos, square) && !$bishop_xray_attack(pos, square)) return 0;
  if ((board(pos, square.x, square.y) == "p"
       || !(board(pos, square.x - 1, square.y - 1) == "p"
         || board(pos, square.x + 1, square.y - 1) == "p"
         || ($attack(pos, square) <= 1 && $attack(colorflip(pos),{x:square.x,y:7-square.y}) > 1)))
    && !$weak_enemies(pos, square)) return 0;
  return type + 1;
}





/*
$rook_threat
---------------------*/
function $rook_threat(pos, square) {
  if (square == null) return sum(pos, $rook_threat);
  var type = "pnbrqk".indexOf(board(pos, square.x, square.y));
  if (type < 0) return 0;
  if (!$weak_enemies(pos, square)) return 0;
  if (!$rook_xray_attack(pos, square)) return 0;
  return type + 1;
}





/*
$hanging
---------------------*/
function $hanging(pos, square) {
  if (square == null) return sum(pos, $hanging);
  if (!$weak_enemies(pos, square)) return 0;
  if (board(pos, square.x, square.y) != "p" && $attack(pos, square) > 1) return 1;
  if (!$attack(colorflip(pos), {x:square.x,y:7-square.y})) return 1;
  return 0;
}





/*
$king_threat
---------------------*/
function $king_threat(pos, square) {
  if (square == null) return sum(pos, $king_threat);
  if ("pnbrq".indexOf(board(pos, square.x, square.y)) < 0) return 0;
  if (!$weak_enemies(pos, square)) return 0;
  if (!$king_attack(pos, square)) return 0;
  return 1;
}





/*
$pawn_push_threat
---------------------*/
function $pawn_push_threat(pos, square) {
  if (square == null) return sum(pos, $pawn_push_threat);
  if ("pnbrqk".indexOf(board(pos, square.x, square.y)) < 0) return 0;
  for (var ix = -1; ix <= 1; ix += 2) {
    if (board(pos, square.x + ix, square.y + 2) == "P"
     && board(pos, square.x + ix, square.y + 1) == "-"
     && board(pos, square.x + ix - 1, square.y) != "p"
     && board(pos, square.x + ix + 1, square.y) != "p"
     && ($attack(pos, {x:square.x+ix,y:square.y+1})
         || !$attack(colorflip(pos),{x:square.x+ix,y:6-square.y}))
     ) return 1;

    if (square.y == 3
     && board(pos, square.x + ix, square.y + 3) == "P"
     && board(pos, square.x + ix, square.y + 2) == "-"
     && board(pos, square.x + ix, square.y + 1) == "-"
     && board(pos, square.x + ix - 1, square.y) != "p"
     && board(pos, square.x + ix + 1, square.y) != "p"
     && ($attack(pos, {x:square.x+ix,y:square.y+1})
         || !$attack(colorflip(pos),{x:square.x+ix,y:6-square.y}))
     ) return 1;
  }
  return 0;
}





/*
$candidate_passed
---------------------*/
function $candidate_passed(pos, square) {
  if (square == null) return sum(pos, $candidate_passed);
  if (board(pos, square.x, square.y) != "P") return 0;
  var ty1 = 8, ty2 = 8, oy = 8;
  for (var y = square.y - 1; y >= 0; y--) {
    if (board(pos, square.x    , y) == "P") return 0;
    if (board(pos, square.x    , y) == "p") ty1 = y;
    if (board(pos, square.x - 1, y) == "p"
     || board(pos, square.x + 1, y) == "p") ty2 = y;
  }
  if (ty1 == 8 && ty2 >= square.y - 1) return 1;
  if (ty2 < square.y - 2 || ty1 < square.y - 1) return 0;
  if (ty2 >= square.y && ty1 == square.y - 1 && square.y < 4) {
    if (board(pos, square.x - 1, square.y + 1) == "P"
     && board(pos, square.x - 1, square.y    ) != "p"
     && board(pos, square.x - 2, square.y - 1) != "p") return 1;
    if (board(pos, square.x + 1, square.y + 1) == "P"
     && board(pos, square.x + 1, square.y    ) != "p"
     && board(pos, square.x + 2, square.y - 1) != "p") return 1;
  }
  if (board(pos, square.x, square.y - 1) == "p") return 0;
  var lever = (board(pos, square.x - 1, square.y - 1) == "p" ? 1 : 0)
             + (board(pos, square.x + 1, square.y - 1) == "p" ? 1 : 0);
  var leverpush = (board(pos, square.x - 1, square.y - 2) == "p" ? 1 : 0)
                + (board(pos, square.x + 1, square.y - 2) == "p" ? 1 : 0);
  var phalanx = (board(pos, square.x - 1, square.y) == "P" ? 1 : 0)
              + (board(pos, square.x + 1, square.y) == "P" ? 1 : 0);
  if (lever - $supported(pos, square) > 1) return 0;
  if (leverpush - phalanx  > 0) return 0;
  if (lever > 0 && leverpush > 0) return 0;
  return 1;
}





/*
$king_proximity
---------------------*/
function $king_proximity(pos, square) {
  if (square == null) return sum(pos, $king_proximity);
  if (!$passed_leverable(pos, square)) return 0;
  var r = $rank(pos, square)-1;
  var w = r > 2 ? 5 * r - 13 : 0;
  var v = 0;
  if (w <= 0) return 0;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y) == "k") {
        v += ((Math.min(Math.max(Math.abs(y - square.y + 1),
                        Math.abs(x - square.x)),5) * 19 / 4) << 0) * w;
      }
      if (board(pos, x, y) == "K") {
        v -= Math.min(Math.max(Math.abs(y - square.y + 1),
                      Math.abs(x - square.x)),5) * 2 * w;
        if (square.y > 1) {
          v -= Math.min(Math.max(Math.abs(y - square.y + 2),
                      Math.abs(x - square.x)),5) * w;
        }
      }
    }
  }
  return v;
}





/*
$passed_block
---------------------*/
function $passed_block(pos, square) {
  if (square == null) return sum(pos, $passed_block);
  if (!$passed_leverable(pos, square)) return 0;
  if ($rank(pos, square) < 4) return 0;
  if (board(pos, square.x, square.y - 1) != "-") return 0;
  var r = $rank(pos, square) - 1;
  var w = r > 2 ? 5 * r - 13 : 0;
  var pos2 = colorflip(pos);
  var defended = 0, unsafe = 0, wunsafe = 0, defended1 = 0, unsafe1 = 0;
  for (var y = square.y - 1; y >= 0; y--) {
    if ($attack(pos, {x:square.x,y:y})) defended++;
    if ($attack(pos2, {x:square.x,y:7-y})) unsafe++;
    if ($attack(pos2, {x:square.x-1,y:7-y})) wunsafe++;
    if ($attack(pos2, {x:square.x+1,y:7-y})) wunsafe++;
    if (y == square.y - 1) {
      defended1 = defended;
      unsafe1 = unsafe;
    }
  }
  for (var y = square.y + 1; y < 8; y++) {
    if (board(pos, square.x, y) == "R"
     || board(pos, square.x, y) == "Q") defended1 = defended = square.y;
    if (board(pos, square.x, y) == "r"
     || board(pos, square.x, y) == "q") unsafe1 = unsafe = square.y;
  }
  var k = (unsafe == 0 && wunsafe == 0 ? 35 : unsafe == 0 ? 20 : unsafe1 == 0 ? 9 : 0)
        + (defended1 != 0 ? 5 : 0);
  return k * w;
}





/*
$passed_file
---------------------*/
function $passed_file(pos, square) {
  if (square == null) return sum(pos, $passed_file);
  if (!$passed_leverable(pos, square)) return 0;
  var file = $file(pos, square);
  return Math.min(file - 1, 8 - file);
}





/*
$passed_rank
---------------------*/
function $passed_rank(pos, square) {
  if (square == null) return sum(pos, $passed_rank);
  if (!$passed_leverable(pos, square)) return 0;
  return $rank(pos, square) - 1;
}





/*
$pawnless_flank
---------------------*/
function $pawnless_flank(pos) {
  var pawns=[0,0,0,0,0,0,0,0], kx = 0;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y).toUpperCase() == "P") pawns[x]++;
      if (board(pos, x, y) == "k") kx = x;
    }
  }
  var sum;
  if (kx == 0) sum = pawns[0] + pawns[1] + pawns[2];
  else if (kx < 3) sum = pawns[0] + pawns[1] + pawns[2] + pawns[3];
  else if (kx < 5) sum = pawns[2] + pawns[3] + pawns[4] + pawns[5];
  else if (kx < 7) sum = pawns[4] + pawns[5] + pawns[6] + pawns[7];
  else  sum = pawns[5] + pawns[6] + pawns[7];
  return sum == 0 ? 1 : 0;
}





/*
$strength_square
---------------------*/
function $strength_square(pos, square) {
  if (square == null) return sum(pos, $strength_square);
  var v = 5;
  var kx = Math.min(6, Math.max(1, square.x));
  var weakness =
      [[-6,81,93,58,39,18,25],
      [-43,61,35,-49,-29,-11,-63],
      [-10,75,23,-2,32,3,-45],
      [-39,-13,-29,-52,-48,-67,-166]];
  for (var x = kx - 1; x <= kx +1; x++) {
    var us = 0;
    for (var y = 7; y >= square.y; y--) {
      if (board(pos, x, y) == "p"
       && board(pos, x-1, y+1) != "P"
       && board(pos, x+1, y+1) != "P") us = y;
    }
    var f = Math.min(x, 7 - x);
    v += weakness[f][us] || 0;
  }
  return v;
}





/*
$storm_square
---------------------*/
function $storm_square(pos, square, eg) {
  if (square == null) return sum(pos, $storm_square);
  var v = 0, ev = 5;
  var kx = Math.min(6, Math.max(1, square.x));
  var unblockedstorm = [
    [85,-289,-166,97,50,45,50],
    [46,-25,122,45,37,-10,20],
    [-6,51,168,34,-2,-22,-14],
    [-15,-11,101,4,11,-15,-29]];
  var blockedstorm = [
    [0,0,76,-10,-7,-4,-1],
    [0,0,78,15,10,6,2]];
  for (var x = kx - 1; x <= kx +1; x++) {
    var us = 0, them = 0;
    for (var y = 7; y >= square.y; y--) {
      if (board(pos, x, y) == "p"
       && board(pos, x-1, y+1) != "P"
       && board(pos, x+1, y+1) != "P") us = y;
      if (board(pos, x, y) == "P") them = y;
    }
    var f = Math.min(x, 7 - x);
    if (us > 0 && them == us + 1) {
      v += blockedstorm[0][them];
      ev += blockedstorm[1][them];
    }
    else v += unblockedstorm[f][them];
  }
  return eg ? ev : v;
}





/*
$shelter_strength
---------------------*/
function $shelter_strength(pos, square) {
  var w = 0, s = 1024, tx = null;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y) == "k"
       || pos.c[2] && x == 6 && y == 0
       || pos.c[3] && x == 2 && y == 0) {
        var w1 = $strength_square(pos, {x:x,y:y});
        var s1 = $storm_square(pos, {x:x,y:y});
        if (s1 - w1 < s - w) { w = w1; s = s1; tx=Math.max(1,Math.min(6,x)); }
      }
    }
  }
  if (square == null) return w;
  if (tx != null && board(pos, square.x, square.y) == "p" && square.x >= tx-1 && square.x <= tx+1) {
    for (var y = square.y-1; y >= 0; y--) if (board(pos, square.x, y) == "p") return 0;
    return 1;
  }
  return 0;
}





/*
$shelter_storm
---------------------*/
function $shelter_storm(pos, square) {
  var w = 0, s = 1024, tx = null;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y) == "k"
       || pos.c[2] && x == 6 && y == 0
       || pos.c[3] && x == 2 && y == 0) {
        var w1 = $strength_square(pos, {x:x,y:y});
        var s1 = $storm_square(pos, {x:x,y:y});
        if (s1 - w1 < s - w) { w = w1; s = s1; tx=Math.max(1,Math.min(6,x)); }
      }
    }
  }
  if (square == null) return s;
  if (tx != null && board(pos, square.x, square.y).toUpperCase() == "P" && square.x >= tx-1 && square.x <= tx+1) {
    for (var y = square.y-1; y >= 0; y--) if (board(pos, square.x, y) == board(pos, square.x, square.y)) return 0;
    return 1;
  }
  return 0;
}





/*
$king_pawn_distance
---------------------*/
function $king_pawn_distance(pos, square) {
  var v = 6, kx = 0, ky = 0, px = 0, py = 0;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y) == "K") {
        kx = x;
        ky = y;
      }
    }
  }
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      var dist = Math.max(Math.abs(x-kx),Math.abs(y-ky));
      if (board(pos, x, y) == "P" && dist < v) { px = x; py = y; v = dist; }
    }
  }
  if (square == null || square.x == px && square.y == py) return v;
  return 0;
}





/*
$check
---------------------*/
function $check(pos, square, type) {
  if (square == null) return sum(pos, $check);
  if ($rook_xray_attack(pos, square)
  && (type == null || type == 2 || type == 4)
   || $queen_attack(pos, square)
  && (type == null || type == 3)) {
    for (var i = 0; i < 4; i++) {
      var ix = (i == 0 ? -1 : i == 1 ? 1 : 0);
      var iy = (i == 2 ? -1 : i == 3 ? 1 : 0);
      for (var d = 1; d < 8; d++) {
        var b = board(pos, square.x + d * ix, square.y + d * iy);
        if (b == "k") return 1;
        if (b != "-" && b != "q") break;
      }
    }
  }
  if ($bishop_xray_attack(pos, square)
  && (type == null || type == 1 || type == 4)
   || $queen_attack(pos, square)
  && (type == null || type == 3)) {
    for (var i = 0; i < 4; i++) {
      var ix = ((i > 1) * 2 - 1);
      var iy = ((i % 2 == 0) * 2 - 1);
      for (var d = 1; d < 8; d++) {
        var b = board(pos, square.x + d * ix, square.y + d * iy);
        if (b == "k") return 1;
        if (b != "-" && b != "q") break;
      }
    }
  }
  if ($knight_attack(pos, square)
  && (type == null || type == 0 || type == 4)) {
    if (board(pos, square.x + 2, square.y + 1) == "k"
     || board(pos, square.x + 2, square.y - 1) == "k"
     || board(pos, square.x + 1, square.y + 2) == "k"
     || board(pos, square.x + 1, square.y - 2) == "k"
     || board(pos, square.x - 2, square.y + 1) == "k"
     || board(pos, square.x - 2, square.y - 1) == "k"
     || board(pos, square.x - 1, square.y + 2) == "k"
     || board(pos, square.x - 1, square.y - 2) == "k") return 1;
  }
  return 0;
}





/*
$safe_check
---------------------*/
function $safe_check(pos, square, type) {
  if (square == null) return sum(pos, $safe_check, type);
  if ("PNBRQK".indexOf(board(pos, square.x, square.y)) >= 0) return 0;
  if (!$check(pos, square, type)) return 0;
  var pos2 = colorflip(pos);
  if (type == 3 && $safe_check(pos, square, 2)) return 0;
  if (type == 1 && $safe_check(pos, square, 3)) return 0;
  if ((!$attack(pos2, {x:square.x,y:7-square.y})
    || ($weak_squares(pos, square) && $attack(pos, square) > 1))
    && (type != 3 || !$queen_attack(pos2, {x:square.x,y:7-square.y}))) return 1;
  return 0;
}





/*
$queen_count
---------------------*/
function $queen_count(pos, square) {
  if (square == null) return sum(pos, $queen_count);
  if (board(pos, square.x, square.y) == "Q") return 1;
  return 0;
}





/*
$king_attackers_count
---------------------*/
function $king_attackers_count(pos, square) {
  if (square == null) return sum(pos, $king_attackers_count);
  if ("PNBRQ".indexOf(board(pos, square.x, square.y)) < 0) return 0;
  if (board(pos, square.x, square.y) == "P") {
    var v = 0;
    for (var dir = -1; dir <= 1; dir += 2) {
      var fr = board(pos, square.x + dir * 2, square.y) == "P";
      if (square.x + dir >= 0 && square.x + dir <= 7
       && $king_ring(pos, {x:square.x+dir,y:square.y-1}, true)) v = v + (fr ? 0.5 : 1);
    }
    return v;
  }
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      var s2 = {x:x,y:y};
      if ($king_ring(pos, s2)) {
        if ($knight_attack(pos, s2, square)
         || $bishop_xray_attack(pos, s2, square)
         || $rook_xray_attack(pos, s2, square)
         || $queen_attack(pos, s2, square)) return 1;
      }
    }
  }
  return 0;
}





/*
$king_attackers_weight
---------------------*/
function $king_attackers_weight(pos, square) {
  if (square == null) return sum(pos, $king_attackers_weight);
  if ($king_attackers_count(pos, square)) {
    return [0,81,52,44,10]["PNBRQ".indexOf(board(pos, square.x, square.y))];
  }
  return 0;
}





/*
$king_attacks
---------------------*/
function $king_attacks(pos, square) {
  if (square == null) return sum(pos, $king_attacks);
  if ("NBRQ".indexOf(board(pos, square.x, square.y)) < 0) return 0;
  if ($king_attackers_count(pos, square) == 0) return 0;
  var kx = 0, ky = 0, v = 0;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y) == "k") { kx = x; ky = y; }
    }
  }
  for (var x = kx - 1; x <= kx + 1; x++) {
    for (var y = ky - 1; y <= ky + 1; y++) {
      var s2 = {x:x,y:y};
      if (x >= 0 && y >= 0 && x <= 7 && y <= 7 && (x != kx || y != ky)) {
        v += $knight_attack(pos, s2, square);
        v += $bishop_xray_attack(pos, s2, square);
        v += $rook_xray_attack(pos, s2, square);
        v += $queen_attack(pos, s2, square);
      }
    }
  }
  return v;
}





/*
$weak_bonus
---------------------*/
function $weak_bonus(pos, square) {
  if (square == null) return sum(pos, $weak_bonus);
  if (!$weak_squares(pos, square)) return 0;
  if (!$king_ring(pos, square)) return 0;
  return 1;
}





/*
$weak_squares
---------------------*/
function $weak_squares(pos, square) {
  if (square == null) return sum(pos, $weak_squares);
  if ($attack(pos, square)) {
    var pos2 = colorflip(pos);
    var attack = $attack(pos2, {x:square.x,y:7-square.y});
    if (attack >= 2) return 0;
    if (attack == 0) return 1;
    if ($king_attack(pos2, {x:square.x,y:7-square.y})
     || $queen_attack(pos2, {x:square.x,y:7-square.y})) return 1;
  }
  return 0;
}





/*
$winnable
---------------------*/
function $winnable(pos, square) {
  if (square != null) return 0;
  var pawns = 0, kx = [0, 0], ky = [0, 0], flanks = [0, 0];
  for (var x = 0; x < 8; x++) {
    var open = [0, 0];
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y).toUpperCase() == "P" ) {
        open[board(pos, x, y) == "P" ? 0 : 1] = 1;
        pawns++
      }
      if (board(pos, x, y).toUpperCase() == "K" ) {
        kx[board(pos, x, y) == "K" ? 0 : 1] = x;
        ky[board(pos, x, y) == "K" ? 0 : 1] = y;
      }
    }
    if (open[0] + open[1] > 0) flanks[x < 4 ? 0 : 1] = 1;
  }
  var pos2 = colorflip(pos);
  var passedCount = $candidate_passed(pos) + $candidate_passed(pos2);
  var bothFlanks = flanks[0] && flanks[1] ? 1 : 0;
  var outflanking = Math.abs(kx[0] - kx[1]) - Math.abs(ky[0] - ky[1]);
  var purePawn = ($non_pawn_material(pos) + $non_pawn_material(pos2)) == 0 ? 1 : 0;
  var almostUnwinnable = outflanking < 0 && bothFlanks == 0;
  var infiltration = ky[0] < 4 || ky[1] > 3 ? 1 : 0;
  return 9 * passedCount
       + 12 * pawns
       + 9 * outflanking
       + 21 * bothFlanks
       + 24 * infiltration
       + 51 * purePawn
       - 43 * almostUnwinnable
       - 110;
}





/*
$unsafe_checks
---------------------*/
function $unsafe_checks(pos, square) {
  if (square == null) return sum(pos, $unsafe_checks);
  if ($check(pos, square, 0) && $safe_check(pos, null, 0) == 0) return 1;
  if ($check(pos, square, 1) && $safe_check(pos, null, 1) == 0) return 1;
  if ($check(pos, square, 2) && $safe_check(pos, null, 2) == 0) return 1;
  return 0;
}





/*
$tempo
---------------------*/
function $tempo(pos, square) {
  if (square != null) return 0;
  return 28 * (pos.w ? 1 : -1);
}





/*
$pawn_count
---------------------*/
function $pawn_count(pos, square) {
  if (square == null) return sum(pos, $pawn_count);
  if (board(pos, square.x, square.y) == "P") return 1;
  return 0;
}





/*
$connected_bonus
---------------------*/
function $connected_bonus(pos, square) {
  if (square == null) return sum(pos, $connected_bonus);
  if (!$connected(pos, square)) return 0;
  var seed = [0, 7, 8, 12, 29, 48, 86];
  var op = $opposed(pos, square);
  var ph = $phalanx(pos, square);
  var su = $supported(pos, square);
  var bl = board(pos, square.x, square.y - 1) == "p" ? 1 : 0;
  var r = $rank(pos, square);
  if (r < 2 || r > 7) return 0;
  return seed[r - 1] * (2 + ph - op) + 21 * su;
}





/*
$mobility_mg
---------------------*/
function $mobility_mg(pos, square) {
  if (square == null) return sum(pos, $mobility_mg);
  return $mobility_bonus(pos, square, true);
}





/*
$mobility_eg
---------------------*/
function $mobility_eg(pos, square) {
  if (square == null) return sum(pos, $mobility_eg);
  return $mobility_bonus(pos, square, false);
}





/*
$piece_value_bonus
---------------------*/
function $piece_value_bonus(pos, square, mg) {
  if (square == null) return sum(pos, $piece_value_bonus);
  var a = mg ? [124, 781, 825, 1276, 2538]
             : [206, 854, 915, 1380, 2682];
  var i = "PNBRQ".indexOf(board(pos, square.x, square.y));
  if (i >= 0) return a[i];
  return 0;
}





/*
$psqt_bonus
---------------------*/
function $psqt_bonus(pos, square, mg) {
  if (square == null) return sum(pos, $psqt_bonus, mg);
  var bonus = mg ? [
    [[-175,-92,-74,-73],[-77,-41,-27,-15],[-61,-17,6,12],[-35,8,40,49],[-34,13,44,51],[-9,22,58,53],[-67,-27,4,37],[-201,-83,-56,-26]],
    [[-53,-5,-8,-23],[-15,8,19,4],[-7,21,-5,17],[-5,11,25,39],[-12,29,22,31],[-16,6,1,11],[-17,-14,5,0],[-48,1,-14,-23]],
    [[-31,-20,-14,-5],[-21,-13,-8,6],[-25,-11,-1,3],[-13,-5,-4,-6],[-27,-15,-4,3],[-22,-2,6,12],[-2,12,16,18],[-17,-19,-1,9]],
    [[3,-5,-5,4],[-3,5,8,12],[-3,6,13,7],[4,5,9,8],[0,14,12,5],[-4,10,6,8],[-5,6,10,8],[-2,-2,1,-2]],
    [[271,327,271,198],[278,303,234,179],[195,258,169,120],[164,190,138,98],[154,179,105,70],[123,145,81,31],[88,120,65,33],[59,89,45,-1]]
  ] : [
    [[-96,-65,-49,-21],[-67,-54,-18,8],[-40,-27,-8,29],[-35,-2,13,28],[-45,-16,9,39],[-51,-44,-16,17],[-69,-50,-51,12],[-100,-88,-56,-17]],
    [[-57,-30,-37,-12],[-37,-13,-17,1],[-16,-1,-2,10],[-20,-6,0,17],[-17,-1,-14,15],[-30,6,4,6],[-31,-20,-1,1],[-46,-42,-37,-24]],
    [[-9,-13,-10,-9],[-12,-9,-1,-2],[6,-8,-2,-6],[-6,1,-9,7],[-5,8,7,-6],[6,1,-7,10],[4,5,20,-5],[18,0,19,13]],
    [[-69,-57,-47,-26],[-55,-31,-22,-4],[-39,-18,-9,3],[-23,-3,13,24],[-29,-6,9,21],[-38,-18,-12,1],[-50,-27,-24,-8],[-75,-52,-43,-36]],
    [[1,45,85,76],[53,100,133,135],[88,130,169,175],[103,156,172,172],[96,166,199,199],[92,172,184,191],[47,121,116,131],[11,59,73,78]]
  ];
  var pbonus = mg ? 
    [[0,0,0,0,0,0,0,0],[3,3,10,19,16,19,7,-5],[-9,-15,11,15,32,22,5,-22],[-4,-23,6,20,40,17,4,-8],[13,0,-13,1,11,-2,-13,5],
     [5,-12,-7,22,-8,-5,-15,-8],[-7,7,-3,-13,5,-16,10,-8],[0,0,0,0,0,0,0,0]]:
    [[0,0,0,0,0,0,0,0],[-10,-6,10,0,14,7,-5,-19],[-10,-10,-10,4,4,3,-6,-4],[6,-2,-8,-4,-13,-12,-10,-9],[10,5,4,-5,-5,-5,14,9],
     [28,20,21,28,30,7,6,13],[0,-11,12,21,25,19,4,7],[0,0,0,0,0,0,0,0]];
  var i = "PNBRQK".indexOf(board(pos, square.x, square.y));
  if (i < 0) return 0;
  if (i == 0) return pbonus[7 - square.y][square.x];
  else return bonus[i-1][7 - square.y][Math.min(square.x, 7 - square.x)];
}





/*
$piece_value_mg
---------------------*/
function $piece_value_mg(pos, square) {
  if (square == null) return sum(pos, $piece_value_mg);
  return $piece_value_bonus(pos, square, true);
}





/*
$piece_value_eg
---------------------*/
function $piece_value_eg(pos, square) {
  if (square == null) return sum(pos, $piece_value_eg);
  return $piece_value_bonus(pos, square, false);
}





/*
$psqt_mg
---------------------*/
function $psqt_mg(pos, square) {
  if (square == null) return sum(pos, $psqt_mg);
  return $psqt_bonus(pos, square, true);
}





/*
$psqt_eg
---------------------*/
function $psqt_eg(pos, square) {
  if (square == null) return sum(pos, $psqt_eg);
  return $psqt_bonus(pos, square, false);
}







/*
$king_protector
---------------------*/
function $king_protector(pos, square) {
  if (square == null) return sum(pos, $king_protector);
  if (board(pos, square.x, square.y) != "N"
   && board(pos, square.x, square.y) != "B") return 0;
  const piece = board(pos, square.x, square.y) == "N" ? "knight" : "bishop"
  const kd = $king_distance(pos, square);
  if (kd < 3)
    store_message("the ${colour} "+piece+" on ${square} is protecting the king",pos.i,{"colour":"white","square":square})
  return kd
}





/*
$knight_count
---------------------*/
function $knight_count(pos, square) {
  if (square == null) return sum(pos, $knight_count);
  if (board(pos, square.x, square.y) == "N") return 1;
  return 0;
}





/*
$imbalance_total
---------------------*/
function $imbalance_total(pos, square) {
  var v = 0;
  v += $imbalance(pos) - $imbalance(colorflip(pos));
  v += $bishop_pair(pos) - $bishop_pair(colorflip(pos));
  return (v / 16) << 0;
}





/*
$weak_unopposed_pawn
---------------------*/
function $weak_unopposed_pawn(pos, square) {
  if (square == null) return sum(pos, $weak_unopposed_pawn);
  if ($opposed(pos, square)) return 0;
  var v = 0;
  if ($isolated(pos, square)) v++;
  else if ($backward(pos, square)) v++;
  return v;
}





/*
$rook_count
---------------------*/
function $rook_count(pos, square) {
  if (square == null) return sum(pos, $rook_count);
  if (board(pos, square.x, square.y) == "R") return 1;
  return 0;
}





/*
$opposite_bishops
---------------------*/
function $opposite_bishops(pos) {
  if ($bishop_count(pos) != 1) return 0;
  if ($bishop_count(colorflip(pos)) != 1) return 0;
  var color = [0, 0];
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y) == "B") color[0] = (x + y) % 2;
      if (board(pos, x, y) == "b") color[1] = (x + y) % 2;
    }
  }
  return color[0] == color[1] ? 0 : 1;
}





/*
$king_distance
---------------------*/
function $king_distance(pos, square) {
  if (square == null) return sum(pos, $king_distance);
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y) == "K") {
        return Math.max(Math.abs(x - square.x), Math.abs(y - square.y));
      }
    }
  }
  return 0;
}





/*
$long_diagonal_bishop
---------------------*/
function $long_diagonal_bishop(pos, square) {
  if (square == null) return sum(pos, $long_diagonal_bishop);
  if (board(pos, square.x, square.y) != "B") return 0;
  
  if (square.x - square.y != 0 && square.x - (7 - square.y) != 0){
    store_message("There is a ${colour} bishop on ${square}.",pos.i,{"colour":"white","square":square})
    return 0;
  }
  var x1 = square.x, y1 = square.y;
  if (Math.min(x1,7-x1) > 2) {
    store_message("The ${colour} bishop on ${square}is on a long diagonal.",pos.i,{"colour":"white","square":square})
    return 0;
  }
  for (var i = Math.min(x1,7-x1); i < 4; i++) {
    if (board(pos, x1, y1) == "p"){
      store_message("The ${colour} bishop on ${square} is on the long diaganol, but blocked by the ${colour2} pawn on ${square2}",pos.i,{"colour":"white","colour2":"black","square":square,"square2":{x:x1,y:y1}})
      return 0;
    } 
    if (board(pos, x1, y1) == "P"){
      store_message("The ${colour} bishop on ${square} is on the long diaganol, but blocked by the ${colour} pawn on ${square2}",pos.i,{"colour":"white","colour2":"black","square":square,"square2":{x:x1,y:y1}})
      return 0;
    } 
    if (x1 < 4) x1++; else x1--;
    if (y1 < 4) y1++; else y1--;
  }
  store_message("The ${colour} bishop on ${square} is on the long diaganol and attacking the centre of the board",pos.i,{"colour":"white","square":square})
  return 1;
}





/*
$queen_attack_diagonal
---------------------*/
function $queen_attack_diagonal(pos, square, s2) {
  if (square == null) return sum(pos, $queen_attack_diagonal);
  var v = 0;
  for (var i = 0; i < 8; i++) {
    var ix = (i + (i > 3)) % 3 - 1;
    var iy = (((i + (i > 3)) / 3) << 0) - 1;
    if (ix == 0 || iy == 0) continue;
    for (var d = 1; d < 8; d++) {
      var b = board(pos, square.x + d * ix, square.y + d * iy);
      if (b == "Q"
      && (s2 == null || s2.x == square.x + d * ix && s2.y == square.y + d * iy)) {
        var dir = $pinned_direction(pos, {x:square.x+d*ix, y:square.y+d*iy});
        if (dir == 0 || Math.abs(ix+iy*3) == dir) v++;
      }
      if (b != "-") break;
    }
  }
  return v;
}





/*
$pinned
---------------------*/
function $pinned(pos, square) {
  if (square == null) return sum(pos, $pinned);
  if ("PNBRQK".indexOf(board(pos, square.x, square.y)) < 0) return 0;
  return $pinned_direction(pos, square) > 0 ? 1 : 0;
}





/*
$king_ring
---------------------*/
function $king_ring(pos, square, full) {
  if (square == null) return sum(pos, $king_ring);
  if (!full
   && board(pos, square.x + 1, square.y - 1) == "p"
   && board(pos, square.x - 1, square.y - 1) == "p") return 0;
  for (var ix = -2; ix <= 2; ix++) {
    for (var iy = -2; iy <= 2; iy++) {
      if (board(pos, square.x + ix, square.y + iy) == "k"
      && (ix >= -1 && ix <= 1 || square.x + ix == 0 || square.x + ix == 7)
      && (iy >= -1 && iy <= 1 || square.y + iy == 0 || square.y + iy == 7)) return 1;
    }
  }
  return 0;
}





/*
$slider_on_queen
---------------------*/
function $slider_on_queen(pos, square) {
  if (square == null) return sum(pos, $slider_on_queen);
  var pos2 = colorflip(pos);
  if ($queen_count(pos2) != 1) return 0;
  if (board(pos, square.x, square.y) == "P") return 0;
  if (board(pos, square.x - 1, square.y - 1) == "p") return 0;
  if (board(pos, square.x + 1, square.y - 1) == "p") return 0;
  if ($attack(pos, square) <= 1) return 0;
  if (!$mobility_area(pos, square)) return 0;
  var diagonal = $queen_attack_diagonal(pos2, {x:square.x, y:7-square.y});
  var v = $queen_count(pos) == 0 ? 2 : 1;
  if (diagonal && $bishop_xray_attack(pos, square)) return v;
  if (!diagonal
   && $rook_xray_attack(pos, square)
   && $queen_attack(pos2, {x:square.x, y:7-square.y})) return v;
  return 0;
}





/*
$knight_on_queen
---------------------*/
function $knight_on_queen(pos, square) {
  if (square == null) return sum(pos, $knight_on_queen);
  var pos2 = colorflip(pos);
  var qx = -1, qy = -1;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y) == "q") {
        if (qx >= 0 || qy >= 0) return 0;
        qx = x;
        qy = y;
      }
    }
  }
  if ($queen_count(pos2) != 1) return 0;
  if (board(pos, square.x, square.y) == "P") return 0;
  if (board(pos, square.x - 1, square.y - 1) == "p") return 0;
  if (board(pos, square.x + 1, square.y - 1) == "p") return 0;
  if ($attack(pos, square) <= 1 && $attack(pos2, {x:square.x, y:7-square.y}) > 1) return 0;
  if (!$mobility_area(pos, square)) return 0;
  if (!$knight_attack(pos, square)) return 0;
  var v = $queen_count(pos) == 0 ? 2 : 1;
  if (Math.abs(qx-square.x) == 2 && Math.abs(qy-square.y) == 1) return v;
  if (Math.abs(qx-square.x) == 1 && Math.abs(qy-square.y) == 2) return v;
  return 0;
}





/*
$outpost_total
---------------------*/
function $outpost_total(pos, square) {
  if (square == null) return sum(pos, $outpost_total);
  if (board(pos, square.x, square.y) != "N"
   && board(pos, square.x, square.y) != "B") return 0;
  var knight = board(pos, square.x, square.y) == "N";
  var reachable = 0;
  if (!$outpost(pos, square)) {
    if (!knight) return 0;
    reachable = $reachable_outpost(pos, square);
    if (!reachable) return 0;
    return 1;
  }
  if (knight && (square.x < 2 || square.x > 5)) {
    var ea = 0, cnt = 0;
    for (var x = 0; x < 8; x++) {
      for (var y = 0; y < 8; y++) {
        if ((Math.abs(square.x - x) == 2 && Math.abs(square.y - y) == 1
          || Math.abs(square.x - x) == 1 && Math.abs(square.y - y) == 2)
          && "nbrqk".indexOf(board(pos, x, y)) >= 0) ea = 1;
        if ((x < 4 && square.x < 4 || x >= 4 && square.x >= 4)
          && "nbrqk".indexOf(board(pos, x, y)) >= 0) cnt++;
      }
    }
    if (!ea && cnt <= 1) return 2;
  }
  return knight ? 4 : 3;
}





/*
$restricted
---------------------*/
function $restricted(pos, square) {
  if (square == null) return sum(pos, $restricted);
  if ($attack(pos, square) == 0) return 0;
  var pos2 = colorflip(pos);
  if (!$attack(pos2, {x:square.x,y:7-square.y})) return 0;
  if ($pawn_attack(pos2, {x:square.x,y:7-square.y}) > 0) return 0;
  if ($attack(pos2, {x:square.x,y:7-square.y}) > 1 && $attack(pos, square) == 1) return 0;
  return 1;
}





/*
$knight_defender
---------------------*/
function $knight_defender(pos, square) {
  if (square == null) return sum(pos, $knight_defender);
  if ($knight_attack(pos, square) && $king_attack(pos, square)) return 1;
  return 0;
}





/*
$endgame_shelter
---------------------*/
function $endgame_shelter(pos, square) {
  var w = 0, s = 1024, tx = null;
  var e = null
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y) == "k"
       || pos.c[2] && x == 6 && y == 0
       || pos.c[3] && x == 2 && y == 0) {
        var w1 = $strength_square(pos, {x:x,y:y});
        var s1 = $storm_square(pos, {x:x,y:y});
        var e1 = $storm_square(pos, {x:x,y:y}, true);
        if (s1 - w1 < s - w) { w = w1; s = s1; e = e1; }
      }
    }
  }
  if (square == null) return e;
  return 0;
}





/*
$space
---------------------*/
function $space(pos, square) {
  if ($non_pawn_material(pos) + $non_pawn_material(colorflip(pos)) < 12222) return 0;
  var pieceCount = 0, blockedCount = 0;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if ("PNBRQK".indexOf(board(pos, x, y)) >= 0) pieceCount++;
      if (board(pos, x, y) == "P" && (board(pos, x, y - 1) == "p" || (board(pos, x - 1, y - 2) == "p" && board(pos, x + 1, y - 2) == "p"))) blockedCount++;
      if (board(pos, x, y) == "p" && (board(pos, x, y + 1) == "P" || (board(pos, x - 1, y + 2) == "P" && board(pos, x + 1, y + 2) == "P"))) blockedCount++;
    }
  }
  var weight = pieceCount - 3 + Math.min(blockedCount, 9);
  return (($space_area(pos, square) * weight * weight / 16) << 0);
}





/*
$weak_lever
---------------------*/
function $weak_lever(pos, square) {
  if (square == null) return sum(pos, $weak_lever);
  if (board(pos, square.x, square.y) != "P") return 0;
  if (board(pos, square.x - 1, square.y - 1) != "p") return 0;
  if (board(pos, square.x + 1, square.y - 1) != "p") return 0;
  if (board(pos, square.x - 1, square.y + 1) == "P") return 0;
  if (board(pos, square.x + 1, square.y + 1) == "P") return 0;
  return 1;
}





/*
$blockers_for_king
---------------------*/
function $blockers_for_king(pos, square) {
  if (square == null) return sum(pos, $blockers_for_king);
  if ($pinned_direction(colorflip(pos), {x:square.x,y:7-square.y})) return 1;
  return 0;
}





/*
$rook_on_queen_file
---------------------*/
function $rook_on_queen_file(pos, square) {
  if (square == null) return sum(pos, $rook_on_queen_file);
  if (board(pos, square.x, square.y) != "R") return 0;
  for (var y = 0; y < 8; y++) {
    if (board(pos, square.x, y).toUpperCase() == "Q") return 1;
  }
  return 0;
}





/*
$winnable_total_mg
---------------------*/
function $winnable_total_mg(pos, v) {
  if (v == null) v = $middle_game_evaluation(pos, true);
  return (v > 0 ? 1 : v < 0 ? -1 : 0)
         * Math.max(Math.min($winnable(pos)+50, 0), -Math.abs(v));
}





/*
$winnable_total_eg
---------------------*/
function $winnable_total_eg(pos, v) {
  if (v == null) v = $end_game_evaluation(pos, true);
  return (v > 0 ? 1 : v < 0 ? -1 : 0)
         * Math.max($winnable(pos), -Math.abs(v));
}





/*
$flank_attack
---------------------*/
function $flank_attack(pos, square) {
  if (square == null) return sum(pos, $flank_attack);
  if (square.y > 4) return 0;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y) == "k") {
        if (x == 0 && square.x > 2) return 0;
        if (x < 3 && square.x > 3) return 0;
        if (x >= 3 && x < 5 && (square.x < 2 || square.x > 5)) return 0;
        if (x >= 5 && square.x < 4) return 0;
        if (x == 7 && square.x < 5) return 0;
      }
    }
  }
  var a = $attack(pos, square);
  if (!a) return 0;
  return a > 1 ? 2 : 1;
}





/*
$flank_defense
---------------------*/
function $flank_defense(pos, square) {
  if (square == null) return sum(pos, $flank_defense);
  if (square.y > 4) return 0;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y) == "k") {
        if (x == 0 && square.x > 2) return 0;
        if (x < 3 && square.x > 3) return 0;
        if (x >= 3 && x < 5 && (square.x < 2 || square.x > 5)) return 0;
        if (x >= 5 && square.x < 4) return 0;
        if (x == 7 && square.x < 5) return 0;
      }
    }
  }
  return $attack(colorflip(pos), {x:square.x,y:7-square.y}) > 0 ? 1 : 0;
}





/*
$king_danger
---------------------*/
function $king_danger(pos) {
  var count = $king_attackers_count(pos);
  var weight = $king_attackers_weight(pos);
  var kingAttacks = $king_attacks(pos);
  var weak = $weak_bonus(pos);
  var unsafeChecks = $unsafe_checks(pos);
  var blockersForKing = $blockers_for_king(pos);
  var kingFlankAttack = $flank_attack(pos);
  var kingFlankDefense = $flank_defense(pos);
  var noQueen = ($queen_count(pos) > 0 ? 0 : 1);
  var v = count * weight
        +  69 * kingAttacks
        + 185 * weak
        - 100 * ($knight_defender(colorflip(pos)) > 0)
        + 148 * unsafeChecks
        +  98 * blockersForKing
        -   4 * kingFlankDefense
        + ((3 * kingFlankAttack * kingFlankAttack / 8) << 0)
        - 873 * noQueen
        - ((6 * ($shelter_strength(pos) - $shelter_storm(pos)) / 8) << 0)
        + $mobility_mg(pos) - $mobility_mg(colorflip(pos))
        + 37
        +  ((772 * Math.min($safe_check(pos, null, 3), 1.45)) << 0)
        + ((1084 * Math.min($safe_check(pos, null, 2), 1.75)) << 0)
        +  ((645 * Math.min($safe_check(pos, null, 1), 1.50)) << 0)
        +  ((792 * Math.min($safe_check(pos, null, 0), 1.62)) << 0);
  if (v > 100) return v;
  return 0;
}





/*
$king_mg
---------------------*/
function $king_mg(pos) {
  var v = 0;
  var kd = $king_danger(pos);
  v -= $shelter_strength(pos);
  v += $shelter_storm(pos);
  v += (kd * kd / 4096) << 0;
  v += 8 * $flank_attack(pos);
  v += 17 * $pawnless_flank(pos);
  return v;
}





/*
$king_eg
---------------------*/
function $king_eg(pos) {
  var v = 0;
  v -= 16 * $king_pawn_distance(pos);
  v += $endgame_shelter(pos);
  v += 95 * $pawnless_flank(pos);
  v += ($king_danger(pos) / 16) << 0;
  return v;
}





/*
$weak_queen_protection
---------------------*/
function $weak_queen_protection(pos, square) {
  if (square == null) return sum(pos, $weak_queen_protection);
  if (!$weak_enemies(pos, square)) return 0;
  if (!$queen_attack(colorflip(pos), {x:square.x,y:7-square.y})) return 0;
  return 1;
}





/*
$threats_mg
---------------------*/
function $threats_mg(pos) {
  var v = 0;
  v += 69 * $hanging(pos);
  v += $king_threat(pos) > 0 ? 24 : 0;
  v += 48 * $pawn_push_threat(pos);
  v += 173 * $threat_safe_pawn(pos);
  v += 60 * $slider_on_queen(pos);
  v += 16 * $knight_on_queen(pos);
  v += 7 * $restricted(pos);
  v += 14 * $weak_queen_protection(pos);
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      var s = {x:x,y:y};
      v += [0,5,57,77,88,79,0][$minor_threat(pos, s)];
      v += [0,3,37,42,0,58,0][$rook_threat(pos, s)];
    }
  }
  return v;
}





/*
$threats_eg
---------------------*/
function $threats_eg(pos) {
  var v = 0;
  v += 36 * $hanging(pos);
  v += $king_threat(pos) > 0 ? 89 : 0;
  v += 39 * $pawn_push_threat(pos);
  v += 94 * $threat_safe_pawn(pos);
  v += 18 * $slider_on_queen(pos);
  v += 11 * $knight_on_queen(pos);
  v += 7 * $restricted(pos);
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      var s = {x:x,y:y};
      v += [0,32,41,56,119,161,0][$minor_threat(pos, s)];
      v += [0,46,68,60,38,41,0][$rook_threat(pos, s)];
    }
  }
  return v;
}





/*
$passed_leverable
---------------------*/
function $passed_leverable(pos, square) {
  if (square == null) return sum(pos, $passed_leverable);
  if (!$candidate_passed(pos, square)) return 0;
  if (board(pos, square.x, square.y - 1) != "p") return 1;
  var pos2 = colorflip(pos);
  for (var i = -1; i <=1; i+=2) {
    var s1 = {x:square.x + i, y:square.y};
    var s2 = {x:square.x + i, y:7-square.y};
    if (board(pos, square.x + i, square.y + 1) == "P"
     && "pnbrqk".indexOf(board(pos, square.x + i, square.y)) < 0
     && ($attack(pos, s1) > 0 || $attack(pos2, s2) <= 1)
    ) return 1;
  }
  return 0;
}





/*
$passed_mg
---------------------*/
function $passed_mg(pos, square) {
  if (square == null) return sum(pos, $passed_mg);
  if (!$passed_leverable(pos, square)) return 0;
  var v = 0;
  v += [0,10,17,15,62,168,276][$passed_rank(pos, square)];
  v += $passed_block(pos, square);
  v -= 11 * $passed_file(pos, square);
  return v;
}





/*
$passed_eg
---------------------*/
function $passed_eg(pos, square) {
  if (square == null) return sum(pos, $passed_eg);
  if (!$passed_leverable(pos, square)) return 0;
  var v = 0;
  v += $king_proximity(pos, square);
  v += [0,28,33,41,72,177,260][$passed_rank(pos, square)];
  v += $passed_block(pos, square);
  v -= 8 * $passed_file(pos, square);
  return v;
}





/*
$piece_count
---------------------*/
function $piece_count(pos, square) {
  if (square == null) return sum(pos, $piece_count);
  var i = "PNBRQK".indexOf(board(pos, square.x, square.y));
  return i >= 0 ? 1 : 0;
}





/*
$bishop_xray_pawns
---------------------*/
function $bishop_xray_pawns(pos, square) {
  if (square == null) return sum(pos, $bishop_xray_pawns);
  if (board(pos, square.x, square.y) != "B") return 0;
  var count = 0;
  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      if (board(pos, x, y) == "p"
       && Math.abs(square.x-x) == Math.abs(square.y-y)) count++;
    }
  }
  return count;
}





/*
$rook_on_king_ring
---------------------*/
function $rook_on_king_ring(pos, square) {
  if (square == null) return sum(pos, $rook_on_king_ring);
  if (board(pos, square.x, square.y) != "R") return 0;
  if ($king_attackers_count(pos, square) > 0) return 0;
  for (var y = 0; y < 8; y++) {
    if ($king_ring(pos, {x:square.x, y:y})) return 1;
  }
  return 0;
}





/*
$bishop_on_king_ring
---------------------*/
function $bishop_on_king_ring(pos, square) {
  if (square == null) return sum(pos, $bishop_on_king_ring);
  if (board(pos, square.x, square.y) != "B") return 0;
  if ($king_attackers_count(pos, square) > 0) return 0;
  for (var i = 0; i < 4; i++) {
    var ix = ((i > 1) * 2 - 1);
    var iy = ((i % 2 == 0) * 2 - 1);
    for (var d = 1; d < 8; d++) {
      var x = square.x + d * ix, y = square.y + d * iy;
      if (board(pos, x, y) == "x") break;
      if ($king_ring(pos, {x:x, y:y})) return 1;
      if (board(pos, x, y).toUpperCase() == "P") break;
    }
  }
  return 0;
}





/*
$queen_infiltration
---------------------*/
function $queen_infiltration(pos, square) {
  if (square == null) return sum(pos, $queen_infiltration);
  if (board(pos, square.x, square.y) != "Q") return 0;
  if (square.y > 3) return 0;
  if (board(pos, square.x + 1, square.y - 1) == "p") return 0;
  if (board(pos, square.x - 1, square.y - 1) == "p") return 0;
  if ($pawn_attacks_span(pos, square)) return 0;
  return 1;
}





/*
$pieces_mg
---------------------*/
function $pieces_mg(pos, square) {
  if (square == null) return sum(pos, $pieces_mg);
  if ("NBRQ".indexOf(board(pos, square.x, square.y)) < 0) return 0;
  var v = 0;
  v += [0,31,-7,30,56][$outpost_total(pos, square)];
  v += 18 * $minor_behind_pawn(pos, square);
  v -= 3 * $bishop_pawns(pos, square);
  v -= 4 * $bishop_xray_pawns(pos, square);
  v += 6 * $rook_on_queen_file(pos, square);
  v += 16 * $rook_on_king_ring(pos, square);
  v += 24 * $bishop_on_king_ring(pos, square);
  v += [0,19,48][$rook_on_file(pos, square)];
  v -= $trapped_rook(pos, square) * 55 * (pos.c[0] || pos.c[1] ? 1 : 2);
  v -= 56 * $weak_queen(pos, square);
  v -= 2 * $queen_infiltration(pos, square);
  v -= (board(pos, square.x, square.y) == "N" ? 8 : 6) * $king_protector(pos, square);
  v += 45 * $long_diagonal_bishop(pos, square);
  return v;
}





/*
$pieces_eg
---------------------*/
function $pieces_eg(pos, square) {
  if (square == null) return sum(pos, $pieces_eg);
  if ("NBRQ".indexOf(board(pos, square.x, square.y)) < 0) return 0;
  var v = 0;
  v += [0,22,36,23,36][$outpost_total(pos, square)];
  v += 3 * $minor_behind_pawn(pos, square);
  v -= 7 * $bishop_pawns(pos, square);
  v -= 5 * $bishop_xray_pawns(pos, square);
  v += 11 * $rook_on_queen_file(pos, square);
  v += [0,7,29][$rook_on_file(pos, square)];
  v -= $trapped_rook(pos, square) * 13 * (pos.c[0] || pos.c[1] ? 1 : 2);
  v -= 15 * $weak_queen(pos, square);
  v += 14 * $queen_infiltration(pos, square);
  v -= 9 * $king_protector(pos, square);
  return v;
}





/*
$blocked
---------------------*/
function $blocked(pos, square) {
  if (square == null) return sum(pos, $blocked);
  if (board(pos, square.x, square.y) != "P") return 0;
  if (square.y != 2 && square.y != 3) return 0;
  if (board(pos, square.x, square.y - 1) != "p") return 0;
  return 4 - square.y;
}





/*
$pawn_attacks_span
---------------------*/
function $pawn_attacks_span(pos, square) {
  if (square == null) return sum(pos, $pawn_attacks_span);
  var pos2 = colorflip(pos);
  for (var y = 0; y < square.y; y++) {
    if (board(pos, square.x - 1, y) == "p"
     && (y == square.y - 1
     || (board(pos, square.x - 1, y + 1) != "P" 
     && !$backward(pos2,{x:square.x-1,y:7-y})))) return 1;
    if (board(pos, square.x + 1, y) == "p"
     && (y == square.y - 1
     || (board(pos, square.x + 1, y + 1) != "P"
      && !$backward(pos2,{x:square.x+1,y:7-y})))) return 1;
  }
  return 0;
}





/*
$doubled_isolated
---------------------*/
function $doubled_isolated(pos, square) {
  if (square == null) return sum(pos, $doubled_isolated);
  if (board(pos, square.x, square.y) != "P") return 0;
  if ($isolated(pos, square)) {
    var obe=0,eop=0,ene=0;
    for (var y = 0; y < 8; y++) {
      if (y > square.y && board(pos, square.x, y) == "P") obe++;
      if (y < square.y && board(pos, square.x, y) == "p") eop++;
      if (board(pos, square.x - 1, y) == "p"
       || board(pos, square.x + 1, y) == "p") ene++;
    }
    if (obe > 0 && ene == 0 && eop > 0) return 1;
  }
  return 0;

}





/*
$pawns_mg
---------------------*/
function $pawns_mg(pos, square) {
  if (square == null) return sum(pos, $pawns_mg);
  var v = 0;
  if ($doubled_isolated(pos, square)) v -= 11;
  else if ($isolated(pos, square)) v -= 5;
  else if ($backward(pos, square)) v -= 9;
  v -= $doubled(pos, square) * 11;
  v += $connected(pos, square) ?  $connected_bonus(pos, square) : 0;
  v -= 13 * $weak_unopposed_pawn(pos, square);
  v += [0,-11,-3][$blocked(pos, square)];
  return v;
}





/*
$pawns_eg
---------------------*/
function $pawns_eg(pos, square) {
  if (square == null) return sum(pos, $pawns_eg);
  var v = 0;
  if ($doubled_isolated(pos, square)) v -= 56;
  else if ($isolated(pos, square)) v -= 15;
  else if ($backward(pos, square)) v -= 24;
  v -= $doubled(pos, square) * 56;
  v += $connected(pos, square) ?  $connected_bonus(pos, square) * ($rank(pos, square) - 3) / 4 << 0 : 0;
  v -= 27 * $weak_unopposed_pawn(pos, square);
  v -= 56 * $weak_lever(pos, square);
  v += [0,-4,4][$blocked(pos, square)];
  return v;
}





/*
$rule50
---------------------*/
function $rule50(pos, square) {
  if (square != null) return 0;
  return pos.m[0];
}





