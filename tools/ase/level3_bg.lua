-- VEEXING FORCE - STAGE 3 "SUNSET BOULEVARD" (Miami 1987) backdrop, drawn pixel by pixel in Aseprite (batch, see tools/make_level_bg.py 3).
-- Ocean Drive at sunset. The sun sets BEHIND the art deco hotels: facades are backlit (cool pastel shadow + warm rim on the top edges)
-- and the neon is coming on. Readability: white / pastel enemy suits pop against the shadowed facades; the bright sky stays above them.
-- Layers: sky (static sunset + striped sun) | far x0.2 (hazy condo skyline) | mid x0.5 (backlit towers + palm silhouettes)
--         facade x1 (art deco hotels, palms, landmarks) | floor x1 (terrazzo sidewalk, road, crosswalk)
--         glow / flicker (the "NO" of NO VACANCY) / bulbsA-B (cafe string lights + Pastel Palace marquee chaser), ADDITIVE.
-- Level design, one landmark per arena (centre = stop + 160):
--   440 OCEAN CAFE terrace | 1040 FLAMINGO hotel (neon flamingo, NO VACANCY) | 1660 beach gap (ocean, lifeguard tower, volleyball, crosswalk)
--   2260 SURF & SKATE shop | boss 2620 PASTEL PALACE of Don Pastel (marquee, fountain, columns, red carpet)
local out = app.params["out"]
local metaOut = app.params["meta"]
WW, HH, FLOOR = 3740, 360, 258
local FARW, MIDW = 1150, 1890
dofile(app.params["lib"])
seed = 1987 + 3

local P = {
  out = "#140818",
  s0 = "#2a0a5a", s1 = "#4a1270", s2 = "#7a1a84", s3 = "#b02a8a", s4 = "#e8408a", s5 = "#ff6a7a", s6 = "#ff9a6a", s7 = "#ffc26a", s8 = "#ffe48a",
  far0 = "#b2508e", far1 = "#c25e92", far2 = "#d27098",
  mid0 = "#5a2266", mid1 = "#6a2a72", midR = "#ff9a6a",
  palm = "#2a0f36", palm2 = "#3a1a46",
  cyan = "#27f0ff", pink = "#ff2fd0", yellow = "#ffe44d", green = "#3dffa0", orange = "#ff6a3d", violet = "#8b5cff", red = "#ff2a4d", white = "#f4f0ff",
  warm = "#ffc46a", warmd = "#b0703a", glass = "#2a1a40",
}
local SCH = {
  pink = { "#9a4a7e", "#ffb0d0", "#6a2a5e", P.pink }, mint = { "#3e7e7e", "#a0ffe0", "#245656", P.cyan },
  lav = { "#5e4a9a", "#d0b8ff", "#3e2e72", P.violet }, peach = { "#8a4a56", "#ffd0a0", "#6a3a46", P.orange },
  aqua = { "#3a6a9a", "#a0e8ff", "#244a72", P.cyan }, yel = { "#76684a", "#fff0a0", "#5e4e36", P.yellow },
  white = { "#7a7090", "#ffffff", "#544a66", P.pink },
}
local SKY, FAR, MID, FAC, FLO = newImg(), newImg(), newImg(), newImg(), newImg()
local FLICK, BULBA, BULBB = newImg(), newImg(), newImg()
local GF = 176
local SPILL = {}

local function disc(im, cx, cy, r, colf)
  for y = math.floor(cy - r), math.ceil(cy + r) do for x = math.floor(cx - r), math.ceil(cx + r) do
    local d = math.sqrt((x - cx) ^ 2 + (y - cy) ^ 2); if d <= r then local c = colf(x, y, d / r); if c then px(im, x, y, C(c)) end end
  end end
end
local function line(im, x0, y0, x1, y1, c, th)
  local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0), 1)
  for i = 0, n do local x, y = math.floor(x0 + (x1 - x0) * i / n + 0.5), math.floor(y0 + (y1 - y0) * i / n + 0.5); px(im, x, y, c); if th then px(im, x, y + 1, c) end end
end
-- palm tree: curved trunk + drooping fronds (silhouette colours given)
local function palm(im, bx, by, h, lean, ctrunk, cleaf, ring)
  local tx, ty = bx, by
  for i = 0, h do
    local t = i / h; local x = bx + math.floor(lean * t * t + 0.5); local y = by - i
    local w = (t < 0.2) and 3 or 2
    rect(im, x - w // 2, y, x + (w - 1) // 2 + 1, y, C(ctrunk))
    if ring and i % 4 == 0 then px(im, x, y, C(ring)) end
    tx, ty = x, y
  end
  for k = 0, 8 do
    local a = -math.pi * 0.95 + k * (math.pi * 0.9 / 8) + (k > 4 and 0.1 or 0)
    local len = 18 + (k % 3) * 4
    for i = 0, len do
      local t = i / len; local x = tx + math.cos(a) * i; local y = ty + math.sin(a) * i * 0.55 + t * t * 14
      px(im, math.floor(x), math.floor(y), C(cleaf)); px(im, math.floor(x), math.floor(y) + 1, C(cleaf))
      if i % 3 == 0 and t > 0.2 then px(im, math.floor(x), math.floor(y) + 2 + math.floor(t * 3), C(cleaf)) end
    end
  end
  disc(im, tx + 1, ty + 3, 2, function() return "#3a1a20" end); disc(im, tx - 2, ty + 2, 2, function() return "#3a1a20" end)
end

-- ================================================================== SKY: sunset + striped sun + lit clouds + gulls
do
  vgrad(SKY, 0, 0, 639, FLOOR - 1, { P.s0, P.s1, P.s2, P.s3, P.s4, P.s5, P.s6, P.s7, P.s8 }, 3)
  local cx, cy, r = 400, 150, 64
  for y = cy - r - 40, cy + r do for x = cx - r - 40, cx + r + 40 do
    local d = math.sqrt((x - cx) ^ 2 + (y - cy) ^ 2)
    if d > r and d < r + 40 and dith(x, y, (1 - (d - r) / 40) * 0.5) then px(SKY, x, y, C(d < r + 14 and "#ffd88a" or "#ffb07a")) end
  end end
  local bands = { "#fff6a0", "#ffe27a", "#ffc860", "#ffa850", "#ff8a5a", "#ff6a7a", "#ff4f9a" }
  for y = cy - r, cy + r do for x = cx - r, cx + r do
    if (x - cx) ^ 2 + (y - cy) ^ 2 <= r * r then
      local t = (y - (cy - r)) / (2 * r); local f = t * (#bands - 1); local i = math.floor(f); local c = bands[i + 1]
      if i + 2 <= #bands and dith(x, y, math.max(0, (f - i - 0.6) * 2.5)) then c = bands[i + 2] end
      local cut = false
      if y > cy - 6 then local k = y - (cy - 6); cut = (k % 9) < (1 + math.floor(k / 12)) end
      if not cut then px(SKY, x, y, C(c)) end
    end
  end end
  for _, cl in ipairs({ { 40, 60, 160 }, { 260, 40, 120 }, { 470, 84, 150 }, { 120, 110, 110 }, { 520, 122, 110 }, { 300, 96, 90 } }) do
    for x = cl[1], cl[1] + cl[3] do
      local e = math.min(x - cl[1], cl[1] + cl[3] - x); local th = math.min(3, e // 10)
      for k = 0, th do px(SKY, x, cl[2] + k, C(k == th and "#ffb07a" or (k == 0 and "#7a2a7a" or "#a03a80"))) end
    end
  end
  for _, g in ipairs({ { 120, 70 }, { 140, 62 }, { 160, 74 }, { 560, 50 }, { 585, 58 } }) do
    px(SKY, g[1], g[2], C("#3a0f40")); px(SKY, g[1] - 1, g[2] - 1, C("#3a0f40")); px(SKY, g[1] - 2, g[2] - 1, C("#3a0f40")); px(SKY, g[1] + 1, g[2] - 1, C("#3a0f40")); px(SKY, g[1] + 2, g[2] - 1, C("#3a0f40"))
  end
end

-- ================================================================== FAR: hazy condo skyline (low contrast, warm haze)
do
  local x = 0
  while x < FARW do
    local w, h = ri(20, 44), ri(60, 140)
    local top = FLOOR - h
    for y = top, FLOOR - 1 do for xx = x, x + w - 1 do
      local c = P.far0; if dith(xx, y, (y - top) / h * 1.2 - 0.3) then c = P.far1 end; if dith(xx, y, (y - top) / h * 2 - 1.2) then c = P.far2 end
      px(FAR, xx, y, C(c))
    end end
    hline(FAR, x, x + w - 1, top, C("#ffb0a0"))
    for wy = top + 6, FLOOR - 10, 5 do for wx = x + 3, x + w - 4, 4 do if rnd() > 0.85 then px(FAR, wx, wy, C("#ffd0a0")) end end end
    if rnd() > 0.7 then vline(FAR, x + w // 2, top - 10, top, C(P.far1)) end
    x = x + w + ri(2, 10)
  end
end

-- ================================================================== MID: backlit hotel towers + palm silhouettes
do
  local x = 0
  while x < MIDW do
    local w, h = ri(50, 96), ri(100, 180); local top = FLOOR - h
    for y = top, FLOOR - 1 do for xx = x, x + w - 1 do px(MID, xx, y, C(dith(xx, y, 0.3) and P.mid1 or P.mid0)) end end
    hline(MID, x, x + w - 1, top, C(P.midR)); hline(MID, x, x + w - 1, top + 1, C("#c05a6a"))
    for st = 1, 2 do local sw = w // 2 - st * 10; if sw > 6 then rect(MID, x + w // 2 - sw, top - st * 6, x + w // 2 + sw, top - (st - 1) * 6 - 1, C(P.mid0)); hline(MID, x + w // 2 - sw, x + w // 2 + sw, top - st * 6, C(P.midR)) end end
    for wy = top + 10, FLOOR - 30, 10 do for wx = x + 6, x + w - 10, 8 do if rnd() > 0.6 then rect(MID, wx, wy, wx + 3, wy + 4, C(rnd() > 0.5 and "#c07a4a" or "#3a1a4a")) end end end
    for k = 0, 2 do hline(MID, x + 2, x + 12, top + 20 + k * 4, C("#7a3a7a")) end
    x = x + w + ri(8, 40)
  end
  for px_ = 30, MIDW, ri(70, 110) do palm(MID, px_ + ri(-10, 10), FLOOR - 1, ri(90, 140), ri(-14, 14), P.palm, P.palm) end
end

-- ================================================================== FACADE helpers: art deco hotels
local function eyebrow(x0, x1, y, sch) hline(FAC, x0 - 2, x1 + 2, y, C(sch[2])); hline(FAC, x0 - 2, x1 + 2, y + 1, C(sch[3])); hline(FAC, x0 - 1, x1 + 1, y + 2, C(sch[3])) end
local function warmWin(x, y, w, h)
  local r = rnd()
  if r < 0.32 then for yy = y, y + h - 1 do for xx = x, x + w - 1 do px(FAC, xx, yy, C(dith(xx, yy, (yy - y) / h) and P.warmd or P.warm)) end end; emit(ACC.main, x + w // 2, y + h // 2, P.warm, 0.03, 5)
  else rect(FAC, x, y, x + w - 1, y + h - 1, C(P.glass)); px(FAC, x + w - 2, y + 1, C("#5a3a7a")) end
end
local function porthole(cx, cy, sch)
  disc(FAC, cx, cy, 4, function(x, y, d) return d > 0.75 and sch[2] or ((x + y) % 5 == 0 and "#6a5a9a" or P.glass) end)
end
local function vtext(cx, y, s, col)                 -- vertical neon name on a fin
  for i = 1, #s do local ch = s:sub(i, i); neonText(FAC, ACC.main, ch, cx - 2, y + (i - 1) * 9, 1, col, P.white, 0.10) end
end
local function decoHotel(x0, x1, top, sk, name, opts)
  opts = opts or {}; local sch = SCH[sk]
  for y = top, GF - 1 do for x = x0, x1 do px(FAC, x, y, C(dith(x, y, (y - top) / (GF - top) * 0.5) and sch[3] or sch[1])) end end
  hline(FAC, x0, x1, top, C(sch[2])); hline(FAC, x0, x1, top + 1, C(sch[2]))
  -- stepped ziggurat parapet in the middle
  local cx = (x0 + x1) // 2
  for st = 1, 3 do local sw = (x1 - x0) // 2 - 14 - st * 12; if sw > 8 then
    rect(FAC, cx - sw, top - st * 7, cx + sw, top - (st - 1) * 7 - 1, C(sch[1])); hline(FAC, cx - sw, cx + sw, top - st * 7, C(sch[2]))
  end end
  -- neon trim along the parapet
  for x = x0, x1 do px(FAC, x, top + 3, C(sch[4])); if x % 2 == 0 then emit(ACC.main, x, top + 3, sch[4], 0.03, 3) end end
  -- floors: eyebrow ledges + windows (+ portholes, speed lines)
  local fy = top + 12
  while fy + 18 < GF - 6 do
    local wx = x0 + 10
    while wx + 24 < x1 - 8 do
      if opts.port and (wx // 30) % 3 == 1 then porthole(wx + 8, fy + 8, sch) else for k = 0, 2 do warmWin(wx + k * 8, fy + 3, 6, 12) end end
      wx = wx + 30
    end
    eyebrow(x0 + 6, x1 - 6, fy, sch)
    fy = fy + 24
  end
  for k = 0, 2 do hline(FAC, x0 + 2, x0 + 8, top + 14 + k * 4, C(sch[2])) end            -- speed lines at the corner
  -- vertical fin with the name
  if name then
    local fx = opts.finX or cx; local fyT = top - 34
    rect(FAC, fx - 6, fyT, fx + 6, GF - 20, C(sch[1])); vline(FAC, fx - 6, fyT, GF - 20, C(sch[2])); vline(FAC, fx + 6, fyT, GF - 20, C(sch[3])); hline(FAC, fx - 6, fx + 6, fyT, C(sch[2]))
    vtext(fx, fyT + 6, name, opts.nameCol or sch[4])
  end
  -- ground floor: lobby band
  rect(FAC, x0, GF, x1, FLOOR - 1, C("#1a0e24")); hline(FAC, x0, x1, GF, C(sch[2]))
  rect(FAC, x0 - 2, GF - 4, x1 + 2, GF - 1, C(sch[1])); hline(FAC, x0 - 2, x1 + 2, GF - 4, C(sch[2])); for x = x0, x1 do px(FAC, x, GF - 2, C(sch[4])); if x % 3 == 0 then emit(ACC.main, x, GF - 2, sch[4], 0.02, 3) end end
end
local function lobby(x0, x1, col)
  rect(FAC, x0 - 2, GF + 8, x1 + 2, FLOOR - 1, C("#0e0818"))
  for y = GF + 10, FLOOR - 1 do for x = x0, x1 do px(FAC, x, y, C(dith(x, y, 0.25 + (y - GF) / 160) and "#2e1a2a" or "#4a2c32")) end end
  for x = x0, x1, 14 do vline(FAC, x, GF + 10, FLOOR - 1, C("#1a0e18")) end
  for x = x0 + 6, x1 - 6, 28 do rect(FAC, x, GF + 16, x + 3, GF + 22, C("#ffd08a")); emit(ACC.main, x + 1, GF + 19, P.warm, 0.05, 6) end   -- lobby sconces
  for y = GF + 10, FLOOR - 1, 3 do for x = x0, x1, 3 do addL(ACC.main, x, y, rgb(col or P.warm), 0.02) end end
  SPILL[#SPILL + 1] = { (x0 + x1) // 2, (x1 - x0) // 2, col or P.warm }
end
local function neonSignBoard(cx, y, s, sc, col, board)
  local tw = textW(s, sc); rect(FAC, cx - tw // 2 - 5, y - 4, cx + tw // 2 + 5, y + 7 * sc + 3, C(board or "#1a0a24")); hline(FAC, cx - tw // 2 - 5, cx + tw // 2 + 5, y - 4, C("#5a3a6a"))
  neonText(FAC, ACC.main, s, cx - tw // 2, y, sc, col, P.white, 0.12)
end
local function streetPalm(x, h, lean) palm(FAC, x, FLOOR + 6, h, lean, "#4a2a3a", "#1e3a3a", "#6a4a4a"); rect(FAC, x - 6, FLOOR - 2, x + 6, FLOOR + 8, C("#6a5a7a")); hline(FAC, x - 6, x + 6, FLOOR - 2, C("#b0a0c0")) end

-- ================================================================== FACADE: the boulevard, left to right
-- 0..300 : aqua hotel "TIDES" with portholes
decoHotel(0, 296, 86, "aqua", "TIDES", { port = true, finX = 60 })
lobby(120, 280)
-- 300..600 : OCEAN CAFE (arena 1, centre 440): low pink building, terrace with umbrellas + string lights
decoHotel(304, 590, 120, "pink", nil, {})
do
  neonSignBoard(447, 130, "OCEAN CAFE", 2, P.cyan)
  lobby(320, 576, "#ffb07a")
  -- terrace: umbrellas, tables, chairs in front of the window
  for k = 0, 3 do
    local ux = 340 + k * 64
    vline(FAC, ux, 210, FLOOR - 4, C("#e8e0f0"))
    for i = 0, 22 do local yy = 202 + math.floor((i / 22) ^ 1.6 * 8); local c = ((i // 4) % 2 == 0) and (k % 2 == 0 and "#ff6a9a" or "#4ad0c0") or "#f4f0ff"; hline(FAC, ux - i, ux + i, yy, C(c)) end
    hline(FAC, ux - 22, ux + 22, 202, C("#ffffff"))
    rect(FAC, ux - 8, 236, ux + 8, 238, C("#e8e0f0")); vline(FAC, ux, 238, FLOOR - 2, C("#c0b0d0"))
    for _, ch in ipairs({ -14, 14 }) do rect(FAC, ux + ch - 2, 240, ux + ch + 2, 242, C("#c0b0d0")); vline(FAC, ux + ch + (ch > 0 and 2 or -2), 228, 248, C("#c0b0d0")); vline(FAC, ux + ch - 2, 242, FLOOR - 2, C("#c0b0d0")) end
  end
  -- string lights between the umbrellas (chaser)
  for x = 316, 584, 6 do
    local y = 196 + math.floor(math.sin((x - 316) / 268 * math.pi * 4) ^ 2 * 6)
    px(FAC, x, y, C("#5a4a3a"))
    local im, acc = ((x // 6) % 2 == 0) and BULBA or BULBB, ((x // 6) % 2 == 0) and ACC.bulbA or ACC.bulbB
    px(im, x, y, C("#fff0c0")); emit(acc, x, y, "#ffd27a", 0.10, 4)
  end
end
streetPalm(300, 150, 10)
-- 600..860 : lavender hotel "BREAKWATER"
decoHotel(604, 856, 70, "lav", "BREAKWATER", { finX = 730, port = false, nameCol = P.cyan })
lobby(620, 700); lobby(760, 840)
streetPalm(862, 140, -12)
-- 870..1210 : FLAMINGO hotel (arena 2, centre 1040): neon flamingo, NO VACANCY
decoHotel(870, 1206, 64, "peach", "FLAMINGO", { finX = 1180, nameCol = P.pink })
do
  -- giant neon flamingo on the facade (outline)
  local FL = {
    ".........###....", "........#####...", "........##.###..", ".........#...##.", ".........#....#.", ".........#......", "........##......",
    ".......##.......", "......##........", "......#.........", "......##........", ".......##.......", ".....######.....", "...##########...",
    "..############..", "..#############.", "...###########..", ".....######.....", ".......#........", ".......#........", ".......#..#.....",
    ".......#.#......", ".......##.......", ".......#........", ".......#........", "......###.......",
  }
  local ox, oy, sc = 922, 70, 2
  for y = 1, #FL do for x = 1, #FL[y] do if FL[y]:sub(x, x) == "#" then
    local X, Y = ox + (x - 1) * sc, oy + (y - 1) * sc
    local edge = (FL[y]:sub(x - 1, x - 1) ~= "#") or (FL[y]:sub(x + 1, x + 1) ~= "#") or (y == 1 or FL[y - 1]:sub(x, x) ~= "#") or (y == #FL or FL[y + 1]:sub(x, x) ~= "#")
    rect(FAC, X, Y, X + sc - 1, Y + sc - 1, C(edge and P.pink or "#ff8ad8")); if (x + y) % 2 == 0 then emit(ACC.main, X, Y, P.pink, 0.07, 6) end
  end end end
  px(FAC, ox + 10 * sc, oy + 2 * sc, C(P.white)); rect(FAC, ox + 13 * sc, oy + 3 * sc, ox + 14 * sc, oy + 4 * sc, C("#2a1a20"))
  -- VACANCY sign (always on) + "NO" in the flicker layer
  local vx, vy = 1060, 120
  rect(FAC, vx - 4, vy - 4, vx + 92, vy + 11, C("#1a0a24")); hline(FAC, vx - 4, vx + 92, vy - 4, C("#5a3a6a"))
  neonText(FAC, nil, "NO", vx, vy, 1, "#3a2a3a", nil, 0, true)
  neonText(FAC, ACC.main, "VACANCY", vx + 18, vy, 1, P.cyan, P.white, 0.10)
  neonText(FLICK, ACC.flick, "NO", vx, vy, 1, P.red, P.white, 0.16)
  lobby(900, 1150, "#ffc08a")
  -- revolving door + canopy
  rect(FAC, 1000, GF + 4, 1060, GF + 8, C("#d0a0a0")); hline(FAC, 1000, 1060, GF + 4, C("#ffe0e0"))
  for x = 1002, 1058, 4 do emit(ACC.main, x, GF + 9, P.warm, 0.03, 4) end
end
streetPalm(1216, 156, 8)
-- 1220..1480 : mint hotel "SEABREEZE"
decoHotel(1224, 1476, 92, "mint", "SEABREEZE", { finX = 1250, port = true })
lobby(1290, 1460)
-- 1480..1840 : beach gap (arena 3, centre 1660): ocean, lifeguard tower, volleyball net
do
  local x0, x1 = 1482, 1836; local HZ = 168
  for y = HZ, 214 do for x = x0, x1 do                     -- ocean, darker far, sun glitter
    local t = (y - HZ) / 46; local c = dith(x, y, t) and "#3a5a9a" or "#5a3a8a"
    if (x + y * 3) % 17 == 0 and dith(x, y, 1 - t) then c = "#ffc87a" end
    if math.abs(x - 1660) < 30 - t * 20 and (y % 3 == 0) and dith(x, y, 0.6) then c = "#ffe08a" end
    px(FAC, x, y, C(c))
  end end
  hline(FAC, x0, x1, HZ, C("#ffb07a"))
  for y = 214, FLOOR - 1 do for x = x0, x1 do                -- sand
    local c = dith(x, y, (y - 214) / 60) and "#b07a6a" or "#c8907a"; if (x * 7 + y * 5) % 19 == 0 then c = "#e0aa8a" end; px(FAC, x, y, C(c))
  end end
  for x = x0, x1 do local y = 214 + math.floor(math.sin(x * 0.15) * 1.5); px(FAC, x, y, C("#f0e0ff")); px(FAC, x, y - 1, C("#8a9ac0")) end   -- surf line
  -- lifeguard tower (pastel, stilts, ramp)
  local lx = 1560
  for _, sx in ipairs({ lx, lx + 34 }) do vline(FAC, sx, 202, FLOOR - 2, C("#6a5a6a")); vline(FAC, sx + 1, 202, FLOOR - 2, C("#8a7a8a")) end
  line(FAC, lx, 230, lx + 34, 210, C("#6a5a6a")); line(FAC, lx, 210, lx + 34, 230, C("#6a5a6a"))
  rect(FAC, lx - 6, 196, lx + 40, 202, C("#e8d8c0")); hline(FAC, lx - 6, lx + 40, 196, C("#fff8e0"))
  rect(FAC, lx - 2, 170, lx + 36, 195, C("#ffd0a0")); for x = lx - 2, lx + 36 do if ((x - lx) // 4) % 2 == 0 then vline(FAC, x, 170, 195, C("#ff9ac8")) end end
  rect(FAC, lx + 6, 176, lx + 28, 186, C("#3a5a8a")); for x = lx + 6, lx + 28, 2 do px(FAC, x, 177, C("#a0e0ff")) end
  for y = 158, 170 do hline(FAC, lx - 6 + (y - 158) // 3, lx + 40 - (y - 158) // 3, y, C(y == 158 and "#ffffff" or "#4ad0c0")) end
  rect(FAC, lx + 15, 146, lx + 16, 158, C("#6a5a6a")); rect(FAC, lx + 17, 146, lx + 26, 151, C(P.red))
  line(FAC, lx + 40, 200, lx + 66, FLOOR - 2, C("#c8b8a0"), true)
  -- volleyball net
  local nx = 1700
  vline(FAC, nx, 196, FLOOR - 2, C("#e8e0f0")); vline(FAC, nx + 90, 196, FLOOR - 2, C("#e8e0f0"))
  for y = 198, 216, 3 do hline(FAC, nx, nx + 90, y, C("#a0a0c0")) end; for x = nx, nx + 90, 4 do vline(FAC, x, 198, 216, C("#a0a0c0")) end
  hline(FAC, nx, nx + 90, 197, C("#ffffff"))
  -- towel + boombox + surfboard stuck in the sand
  rect(FAC, 1630, 246, 1660, 252, C("#ff6a9a")); for x = 1630, 1660, 4 do vline(FAC, x, 246, 252, C("#ffe48a")) end
  for y = 214, 250 do local hw = math.floor(math.sin((y - 214) / 36 * math.pi) * 5); hline(FAC, 1810 - hw, 1810 + hw, y, C(y < 232 and "#4ad0c0" or "#ffe48a")) end
  vline(FAC, 1810, 216, 248, C(P.white))
  -- sea wall in front (low balustrade) so the beach reads as "beyond the promenade"
  for x = x0, x1 do px(FAC, x, 238, C("#d8c8e0")); px(FAC, x, 239, C("#a090b0")) end
  for x = x0 + 2, x1, 8 do vline(FAC, x, 240, FLOOR - 1, C("#b0a0c0")); vline(FAC, x + 1, 240, FLOOR - 1, C("#8a7a9a")) end
  emit(ACC.main, 1660, 175, "#ffb07a", 0.05, 40)
end
streetPalm(1478, 170, 14); streetPalm(1842, 160, -10)
-- 1850..2110 : yellow hotel "MARLIN"
decoHotel(1850, 2106, 78, "yel", "MARLIN", { finX = 1876 })
lobby(1910, 2090)
-- 2110..2420 : SURF & SKATE shop (arena 4, centre 2260)
decoHotel(2110, 2416, 110, "mint", nil, {})
do
  neonSignBoard(2263, 122, "SURF & SKATE", 2, P.yellow)
  rect(FAC, 2124, GF + 6, 2404, FLOOR - 1, C("#0e0818"))
  for y = GF + 8, FLOOR - 2 do for x = 2126, 2402 do px(FAC, x, y, C(dith(x, y, 0.4) and "#2a3a5a" or "#3a4a7a")) end end
  -- surfboards rack
  local cols = { "#ff6a9a", "#4ad0c0", "#ffe48a", "#8a6aff", "#ff9a5a", "#6ae0ff", "#ff6a9a", "#a0ff8a" }
  for k = 0, 7 do
    local bx = 2140 + k * 20; local c = cols[k + 1]
    for y = 186, 250 do local t = (y - 186) / 64; local hw = math.floor(math.sin(t * math.pi) ^ 0.6 * 6); hline(FAC, bx - hw, bx + hw, y, C(c)) end
    vline(FAC, bx, 190, 246, C(P.white)); px(FAC, bx - 2, 200, C("#ffffff"))
  end
  -- roller skates on a shelf + skateboard wall
  hline(FAC, 2310, 2396, 200, C("#c0b0d0"))
  for k = 0, 3 do local sx = 2316 + k * 20; rect(FAC, sx, 190, sx + 8, 198, C(k % 2 == 0 and "#ff6a9a" or "#ffffff")); rect(FAC, sx + 8, 194, sx + 11, 198, C(k % 2 == 0 and "#ff6a9a" or "#ffffff")); disc(FAC, sx + 2, 199, 1.5, function() return P.yellow end); disc(FAC, sx + 9, 199, 1.5, function() return P.yellow end) end
  for k = 0, 2 do local sy = 212 + k * 14; rect(FAC, 2316, sy, 2390, sy + 4, C(({ "#4ad0c0", "#ff9a5a", "#8a6aff" })[k + 1])); disc(FAC, 2322, sy + 6, 2, function() return "#e8e0f0" end); disc(FAC, 2384, sy + 6, 2, function() return "#e8e0f0" end) end
  for y = GF + 8, FLOOR - 2, 3 do for x = 2126, 2402, 3 do addL(ACC.main, x, y, rgb("#8ae0ff"), 0.03) end end
  SPILL[#SPILL + 1] = { 2263, 130, "#8ae0ff" }
end
streetPalm(2420, 150, 12)
-- 2430..2820 : PASTEL PALACE (boss, centre 2620)
decoHotel(2430, 2816, 40, "white", "PALACE", { finX = 2623, nameCol = P.yellow })
do
  local cx = 2623
  -- marquee with chaser bulbs
  local mx0, mx1, my0, my1 = cx - 120, cx + 120, 150, 172
  rect(FAC, mx0, my0, mx1, my1, C("#2a1030")); rect(FAC, mx0 + 4, my0 + 4, mx1 - 4, my1 - 4, C("#120818"))
  neonText(FAC, ACC.main, "PASTEL PALACE", cx - textW("PASTEL PALACE", 1) // 2, my0 + 8, 1, P.pink, P.white, 0.10)
  local i = 0
  for x = mx0 + 2, mx1 - 2, 6 do for _, y in ipairs({ my0 + 1, my1 - 1 }) do
    i = i + 1; px(FAC, x, y, C("#6a5040")); local im, acc = (i % 2 == 0) and BULBA or BULBB, (i % 2 == 0) and ACC.bulbA or ACC.bulbB
    px(im, x, y, C(P.white)); emit(acc, x, y, "#ffd27a", 0.16, 4)
  end end
  -- columns + grand entrance + red carpet
  for _, c0 in ipairs({ cx - 110, cx - 70, cx + 62, cx + 102 }) do
    rect(FAC, c0, GF + 2, c0 + 8, FLOOR - 1, C("#d8d0e0")); vline(FAC, c0, GF + 2, FLOOR - 1, C("#ffffff")); vline(FAC, c0 + 8, GF + 2, FLOOR - 1, C("#9a90aa"))
    for x = c0 + 2, c0 + 6, 2 do vline(FAC, x, GF + 6, FLOOR - 6, C("#b8b0c8")) end
    rect(FAC, c0 - 2, GF + 2, c0 + 10, GF + 5, C("#ffffff")); rect(FAC, c0 - 2, FLOOR - 5, c0 + 10, FLOOR - 1, C("#b8b0c8"))
  end
  rect(FAC, cx - 50, GF + 10, cx + 50, FLOOR - 1, C("#1a0a10"))
  for y = GF + 12, FLOOR - 1 do for x = cx - 46, cx + 46 do px(FAC, x, y, C(dith(x, y, 0.3) and "#c08a4a" or "#ffc87a")) end end
  rect(FAC, cx - 2, GF + 12, cx + 2, FLOOR - 1, C("#8a5a2a"))
  for y = GF + 12, FLOOR - 1, 3 do for x = cx - 46, cx + 46, 3 do addL(ACC.main, x, y, rgb(P.warm), 0.05) end end
  for k = 0, 3 do rect(FAC, cx - 60 - k * 4, FLOOR - 4 - k * 3, cx + 60 + k * 4, FLOOR - 4 - k * 3 + 2, C(k % 2 == 0 and "#e8e0f0" or "#b8b0c8")) end
  rect(FAC, cx - 18, 236, cx + 18, FLOOR - 1, C("#b01a3a")); vline(FAC, cx - 18, 236, FLOOR - 1, C("#ff4a6a"))
  -- fountain on the left, flamingo statues on the right
  local fx = 2470
  rect(FAC, fx - 22, 238, fx + 22, FLOOR - 1, C("#d8d0e0")); hline(FAC, fx - 22, fx + 22, 238, C("#ffffff")); rect(FAC, fx - 3, 214, fx + 3, 238, C("#d8d0e0"))
  for k = -1, 1, 2 do for i = 0, 20 do local x = fx + k * i; local y = 212 + math.floor(((i - 9) / 9) ^ 2 * 18) - 18; px(FAC, x, y, C("#a0f0ff")); if i % 2 == 0 then emit(ACC.main, x, y, P.cyan, 0.04, 3) end end end
  for x = fx - 20, fx + 20 do px(FAC, x, 240, C("#6ae0ff")) end
  for _, sx in ipairs({ 2760, 2790 }) do
    vline(FAC, sx, 232, FLOOR - 3, C("#ff7ab0")); vline(FAC, sx + 3, 232, FLOOR - 3, C("#ff7ab0"))
    disc(FAC, sx + 2, 226, 6, function() return "#ff8ac0" end); line(FAC, sx + 6, 224, sx + 8, 206, C("#ff8ac0"), true); disc(FAC, sx + 10, 205, 2, function() return "#ff8ac0" end); px(FAC, sx + 13, 206, C("#2a1a20"))
  end
  SPILL[#SPILL + 1] = { cx, 60, P.warm }
end
streetPalm(2826, 160, -8)
-- 2830..3740 : more hotels after the boss
decoHotel(2840, 3110, 84, "lav", "SURFSIDE", { finX = 2870, port = true, nameCol = P.cyan }); lobby(2900, 3090)
streetPalm(3120, 150, 10)
decoHotel(3130, 3420, 96, "pink", "CORAL", { finX = 3400 }); lobby(3150, 3380)
decoHotel(3430, 3739, 72, "aqua", nil, { port = true }); lobby(3450, 3720)

-- art deco street lamps
for _, lx in ipairs({ 210, 760, 1380, 2000, 2540, 3000, 3600 }) do
  rect(FAC, lx - 1, 140, lx + 1, 272, C("#2a1a30")); rect(FAC, lx - 3, 266, lx + 3, 274, C("#2a1a30"))
  disc(FAC, lx, 136, 5, function(x, y, d) return d < 0.6 and "#fff0c0" or "#e0b0a0" end); emit(ACC.main, lx, 136, P.warm, 0.18, 10)
  cone(ACC.main, lx, 142, 300, 3, 34, P.warm, 0.08)
end

-- ================================================================== FLOOR: terrazzo sidewalk, aqua curb, warm asphalt, crosswalk
do
  local SW_END, CURB = 280, 284
  for y = FLOOR, HH - 1 do for x = 0, WW - 1 do
    local c
    if y < SW_END then
      c = "#7a4a7a"; local n = (x * 31 + y * 57) % 23
      if n == 0 then c = "#c08ab0" elseif n == 7 then c = "#4a2a5a" elseif n == 13 then c = "#a06a90" end
      if x % 40 == 0 or y == FLOOR then c = "#5a3060" end
    elseif y < CURB then c = (y == SW_END) and "#a0f0e0" or ((y == SW_END + 1) and "#4a9a9a" or "#2a5a6a")
    elseif y == CURB then c = "#1a0a20"
    else
      local n = ((x * 73 + y * 151) % 97) / 97
      c = "#3a2240"; if n > 0.86 then c = "#4a2c4e" elseif n < 0.1 then c = "#2a1832" end
      if dith(x, y, (y - CURB) / 160) and n < 0.45 then c = "#2a1832" end
    end
    FLO:drawPixel(x, y, C(c))
  end end
  for x = 0, WW - 1, 64 do if x + 30 < 1596 or x > 1724 then rect(FLO, x, 318, x + 30, 319, C("#e8c88a")); hline(FLO, x, x + 30, 320, C("#8a6a5a")) end end   -- no lane dash across the crosswalk
  -- crosswalk in front of the beach gap
  -- zebra bars run along the road (horizontal), stacked across it; slightly wider toward the camera (perspective)
  for y = CURB + 5, HH - 7, 11 do
    local t = (y - CURB) / (HH - CURB); local bx0, bx1 = math.floor(1612 - t * 8), math.floor(1708 + t * 8); local bh = 5 + math.floor(t * 2)
    rect(FLO, bx0, y, bx1, y + bh, C("#c8b8d0")); hline(FLO, bx0, bx1, y + bh, C("#8a7a9a"))
    for yy = y, y + bh - 1 do for x = bx0, bx1 do if dith(x, yy, 0.12) then px(FLO, x, yy, C("#a090b0")) end end end
  end
  -- sand drifting onto the sidewalk near the beach, palm shadows across the sidewalk
  for y = FLOOR, SW_END - 1 do for x = 1480, 1840 do if dith(x, y, 0.35 - math.abs(x - 1660) / 600) then px(FLO, x, y, C("#c8907a")) end end end
  for _, sx in ipairs({ 300, 862, 1216, 1478, 1842, 2420, 2826, 3120 }) do for y = FLOOR, SW_END - 1 do local off = (y - FLOOR) * 2; for k = 0, 4 do if dith(sx + off + k, y, 0.5) then px(FLO, sx + off + k, y, C("#4a2a52")) end end end end
  for k = 1, 40 do local lx, ly = ri(0, WW - 1), ri(FLOOR + 2, HH - 4); px(FLO, lx, ly, C(pick({ "#e8e0c0", "#ff9ac8", "#8ae0ff" }))) end
  for _, s in ipairs(SPILL) do cone(ACC.main, s[1], FLOOR, FLOOR + 40, s[2], s[2] + 16, s[3], 0.12) end
end

-- ================================================================== save
local GLOW = bake(ACC.main, nil, 2.0)
bake(ACC.flick, FLICK, 1.8); bake(ACC.bulbA, BULBA, 1.6); bake(ACC.bulbB, BULBB, 1.6)
local spr = saveLayers(out, { { "sky", SKY }, { "far", FAR }, { "mid", MID }, { "floor", FLO }, { "facade", FAC }, { "glow", GLOW }, { "flicker", FLICK }, { "bulbsA", BULBA }, { "bulbsB", BULBB } },
  { glow = true, flicker = true, bulbsA = true, bulbsB = true })
if metaOut then
  local f = io.open(metaOut, "w")
  f:write(string.format('{"width":%d,"height":%d,"floor":%d,"farW":%d,"midW":%d,"far":0.2,"mid":0.5,"facadeH":%d,"stops":[280,880,1500,2100,2460],"antennas":[]}', WW, HH, FLOOR, FARW, MIDW, 290))
  f:close()
end
print("level3: " .. #spr.layers .. " layers -> " .. out)
