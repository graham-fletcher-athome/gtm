function main_evaluation(pos) {
    var mg = middle_game_evaluation(pos);
    var eg = end_game_evaluation(pos);
    var p = phase(pos), rule50 = rule50(pos);
    eg = eg * scale_factor(pos, eg) / 64;
    var v = (((mg * p + ((eg * (128 - p)) << 0)) / 128) << 0);
    if (arguments.length == 1) v = ((v / 16) << 0) * 16;
    v += tempo(pos);
    v = (v * (100 - rule50) / 100) << 0;
    return v;
  }

  function phase(pos) {
    var midgameLimit = 15258, endgameLimit  = 3915;
    var npm = non_pawn_material(pos) + non_pawn_material(colorflip(pos));
    npm = Math.max(endgameLimit, Math.min(npm, midgameLimit));
    return (((npm - endgameLimit) * 128) / (midgameLimit - endgameLimit)) << 0;
  }

  function non_pawn_material(pos, square) {
    if (square == null) return sum(pos, non_pawn_material);
    var i = "NBRQ".indexOf(board(pos, square.x, square.y));
    if (i >= 0) return piece_value_bonus(pos, square, true);
    return 0;
  }

  function piece_value_bonus(pos, square, mg) {
    if (square == null) return sum(pos, piece_value_bonus);
    var a = mg ? [124, 781, 825, 1276, 2538]
               : [206, 854, 915, 1380, 2682];
    var i = "PNBRQ".indexOf(board(pos, square.x, square.y));
    if (i >= 0) return a[i];
    return 0;
  }

  function rule50(pos, square) {
    if (square != null) return 0;
    return pos.m[0];
  }

  function scale_factor(pos, eg) {
    if (eg == null) eg = end_game_evaluation(pos);
    var pos2 = colorflip(pos);
    var pos_w = eg > 0 ? pos : pos2;
    var pos_b = eg > 0 ? pos2 : pos;
    var sf = 64;
    var pc_w = pawn_count(pos_w), pc_b = pawn_count(pos_b);
    var qc_w = queen_count(pos_w), qc_b = queen_count(pos_b);
    var bc_w = bishop_count(pos_w), bc_b = bishop_count(pos_b);
    var nc_w = knight_count(pos_w), nc_b = knight_count(pos_b);
    var npm_w = non_pawn_material(pos_w), npm_b = non_pawn_material(pos_b);
    var bishopValueMg = 825, bishopValueEg = 915, rookValueMg = 1276;
    if (pc_w == 0 && npm_w - npm_b <= bishopValueMg) sf = npm_w < rookValueMg ? 0 : npm_b <= bishopValueMg ? 4 : 14;
    if (sf == 64) {
      var ob = opposite_bishops(pos);
      if (ob && npm_w == bishopValueMg && npm_b == bishopValueMg) {
        sf = 22 + 4 * candidate_passed(pos_w);
      } else if (ob) {
        sf = 22 + 3 * piece_count(pos_w);
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

  function tempo(pos, square) {
    if (square != null) return 0;
    return 28 * (pos.w ? 1 : -1);
  }