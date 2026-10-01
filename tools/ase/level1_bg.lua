-- VEEXING FORCE - STAGE 1 "NEON DOWNTOWN" backdrop, drawn pixel by pixel in Aseprite (batch):
--   aseprite -b --script-param out=<...>/assets/levels/level1.aseprite --script-param meta=<...>/assets/levels/level1_meta.json --script tools/ase/level1_bg.lua
-- One sprite 3340x360 (= level width + one screen), one layer per parallax plane:
--   sky (static, 640 wide) | far (x0.2) | mid (x0.5) | facade (x1, street-level buildings) | floor (x1, sidewalk + road)
--   glow    : ADDITIVE light (neon halos, window spill, lamp cones, puddle reflections)
--   flicker : ADDITIVE "24H" sign, switched on/off by the game (broken neon)
--   bulbsA / bulbsB : ADDITIVE marquee bulbs of the BOOMBOX club, alternated by the game (chaser)
-- Art direction: limited night palette, dithered gradients, warm lights / violet shadows. The band behind the fighters
-- (y 150..258) stays dark and low-contrast so the characters read; strong contrast lives in signs, sky and puddles.
-- Level design: one landmark per arena so progression reads at a glance:
--   arena 1 VIDEO CLUB  ->  arena 2 PIZZA  ->  arena 3 METRO + VEEX graffiti wall  ->  boss BOOMBOX club (Big Boomer).
local out = app.params["out"]
local metaOut = app.params["meta"]
WW, HH, FLOOR = 3340, 360, 258
local FARW, MIDW = 1100, 1720
dofile(app.params["lib"])

local P = {
  out = "#0a0614",
  -- sky
  sky0 = "#0b0524", sky1 = "#160939", sky2 = "#260e52", sky3 = "#3d1166", sky4 = "#5e1777", sky5 = "#88207f", sky6 = "#b0307f",
  -- far skyline (hazy)
  far0 = "#2a1258", far1 = "#341766", far2 = "#45207a", farw = "#6a4aaa", farw2 = "#b070c8",
  -- mid buildings
  mid0 = "#170a36", mid1 = "#1f0f44", mid2 = "#2b1656", midoff = "#120830",
  -- near facades
  br0 = "#2e1230", br1 = "#3a1838", br2 = "#4a2242", brm = "#220c26",
  co0 = "#221c40", co1 = "#2c2450", co2 = "#3a3262", cod = "#18142e",
  te0 = "#13283e", te1 = "#1a3450", te2 = "#244663", ted = "#0e1c2c",
  bk0 = "#0e0a18", bk1 = "#16101f", bk2 = "#221a30",                       -- black glossy (club)
  frame = "#100818", glass = "#1a1236", glass2 = "#241a48", refl = "#3a2e6a",
  warm = "#ffc46a", warmd = "#b07840", cool = "#6ad0ff", coold = "#3a7aa8", pinkw = "#ff86d0", pinkd = "#a04a8a",
  iron = "#0c0716", iron2 = "#2a1f40",
  -- street
  side0 = "#3a2c5c", side1 = "#33264f", side2 = "#2a1f44", curb0 = "#7d6ca6", curb1 = "#4a3a72", curb2 = "#211640",
  road0 = "#1d1232", road1 = "#231739", road2 = "#170d29", lane = "#a48a52", lane2 = "#6e5a46",
  pud0 = "#120a24", pud1 = "#2a1e4c",
  -- neon
  cyan = "#27f0ff", pink = "#ff2fd0", yellow = "#ffe44d", green = "#3dffa0", orange = "#ff6a3d", violet = "#8b5cff", red = "#ff2a4d", white = "#f4f0ff",
}

local SKY, FAR, MID, FAC, FLO = newImg(), newImg(), newImg(), newImg(), newImg()

-- ================================================================== SKY (640 x 258, static)
vgrad(SKY, 0, 0, 639, FLOOR - 1, { P.sky0, P.sky1, P.sky2, P.sky3, P.sky4, P.sky5, P.sky6 }, 4)
for i = 1, 140 do
  local x, y = ri(0, 639), ri(0, 150); local b = rnd()
  px(SKY, x, y, C(b > 0.85 and P.white or (b > 0.5 and "#b8a8e8" or "#6a5aa8")))
  if b > 0.96 then px(SKY, x - 1, y, C("#6a5aa8")); px(SKY, x + 1, y, C("#6a5aa8")); px(SKY, x, y - 1, C("#6a5aa8")); px(SKY, x, y + 1, C("#6a5aa8")) end
end
-- synthwave moon: banded yellow -> magenta, horizontal cuts, dithered halo
do
  local mx, my, r = 470, 84, 38
  for y = my - r - 30, my + r + 30 do for x = mx - r - 30, mx + r + 30 do
    local d = math.sqrt((x - mx) ^ 2 + (y - my) ^ 2)
    if d > r and d < r + 30 then
      local t = 1 - (d - r) / 30
      if dith(x, y, t * 0.55) then px(SKY, x, y, C(d < r + 10 and "#c03a90" or "#8a2488")) end
    end
  end end
  local bands = { "#fff07a", "#ffd25a", "#ffaa4a", "#ff7a5a", "#ff4f8a", "#ff2fb0", "#e020c0" }
  for y = my - r, my + r do for x = mx - r, mx + r do
    if (x - mx) ^ 2 + (y - my) ^ 2 <= r * r then
      local t = (y - (my - r)) / (2 * r); local f = t * (#bands - 1); local i = math.floor(f); local tt = f - i
      local c = bands[i + 1]; if i + 2 <= #bands and dith(x, y, math.max(0, (tt - 0.6) * 2.5)) then c = bands[i + 2] end
      local cut = false
      if y > my - 2 then local k = y - (my - 2); local per = 7; local w = 1 + math.floor(k / 9); cut = (k % per) < w end
      if not cut then px(SKY, x, y, C(c)) end
    end
  end end
  -- thin clouds crossing the moon
  for _, cl in ipairs({ { 380, 70, 70 }, { 430, 98, 110 }, { 520, 62, 60 }, { 120, 120, 140 }, { 250, 46, 90 } }) do
    for x = cl[1], cl[1] + cl[3] do
      local e = math.min(x - cl[1], cl[1] + cl[3] - x)
      px(SKY, x, cl[2], C(e > 6 and "#4a1670" or "#3a1262")); if e > 14 then px(SKY, x, cl[2] + 1, C("#2c0e56")) end
    end
  end
end

-- ================================================================== FAR skyline (x0.2): hazy silhouettes, VEEX TOWER, antenna lights
local ANT = {}
do
  local x = 0
  while x < FARW do
    local w, h = ri(18, 46), ri(50, 130)
    if rnd() > 0.85 then h = h + ri(20, 40) end
    local top = FLOOR - h
    for y = top, FLOOR - 1 do
      local t = (y - top) / h
      for xx = x, x + w - 1 do
        local c = P.far0
        if dith(xx, y, (t - 0.55) * 1.8) then c = P.far1 end
        if dith(xx, y, (t - 0.82) * 3) then c = P.far2 end
        px(FAR, xx, y, C(c))
      end
    end
    vline(FAR, x + w - 1, top, FLOOR - 1, C(P.far1))
    for wy = top + 5, FLOOR - 14, 6 do for wx = x + 3, x + w - 4, 4 do
      local r = rnd(); if r > 0.78 then px(FAR, wx, wy, C(r > 0.97 and P.farw2 or P.farw)); px(FAR, wx, wy + 1, C(P.far2)) end
    end end
    if rnd() > 0.6 then local ax = x + ri(3, w - 4); vline(FAR, ax, top - ri(6, 16), top - 1, C(P.far1)); ANT[#ANT + 1] = { ax, top - 8 } end
    x = x + w + ri(0, 4)
  end
  -- VEEX TOWER: tall stepped spire with a lit crown, visible during the whole stage
  for _, tw in ipairs({ { 160, 40 }, { 760, 34 } }) do
    local tx, tw2 = tw[1], tw[2]; local top = 40
    for y = top, FLOOR - 1 do
      local step = (y < top + 30) and 10 or ((y < top + 70) and 5 or 0)
      for xx = tx + step, tx + tw2 - step do px(FAR, xx, y, C(dith(xx, y, (y - top) / (FLOOR - top) - 0.3) and P.far1 or P.far0)) end
    end
    vline(FAR, tx + tw2 // 2, top - 26, top, C(P.far2)); ANT[#ANT + 1] = { tx + tw2 // 2, top - 26 }
    for y = top + 4, top + 26, 3 do hline(FAR, tx + 12, tx + tw2 - 12, y, C(P.farw)) end
    for y = top + 34, FLOOR - 20, 5 do for xx = tx + 7, tx + tw2 - 7, 3 do if rnd() > 0.55 then px(FAR, xx, y, C(P.farw)) end end end
  end
end

-- ================================================================== MID buildings (x0.5) + billboards
do
  local x = 0
  local function billboard(bx, by, kind)
    rect(MID, bx, by, bx + 70, by + 30, C(P.out)); rect(MID, bx + 1, by + 1, bx + 69, by + 29, C(kind == "cola" and "#5a0e2a" or "#10264a"))
    for lx = bx + 6, bx + 64, 14 do vline(MID, lx, by + 31, by + 44, C(P.mid0)) end
    hline(MID, bx - 2, bx + 72, by + 32, C(P.mid2))
    if kind == "cola" then
      -- VEEX COLA ad: can + wave
      rect(MID, bx + 6, by + 6, bx + 15, by + 25, C("#e8323c")); rect(MID, bx + 6, by + 12, bx + 15, by + 17, C(P.white)); hline(MID, bx + 6, bx + 15, by + 6, C("#bcc2da"))
      vline(MID, bx + 13, by + 7, by + 24, C("#ff9a9a"))
      neonText(MID, nil, "VEEX", bx + 22, by + 5, 1, P.white, P.white, 0.05)
      neonText(MID, nil, "COLA", bx + 22, by + 16, 1, P.red, "#ffb0b0", 0.07)
    else
      neonText(MID, nil, "NEON", bx + 8, by + 5, 1, P.cyan, P.white, 0.06)
      neonText(MID, nil, "NIGHTS", bx + 8, by + 16, 1, P.pink, P.white, 0.06)
    end
  end
  local boards = { [1] = "cola", [5] = "nights", [9] = "cola", [13] = "nights" }
  local n = 0
  while x < MIDW do
    n = n + 1
    local w, h = ri(56, 120), ri(96, 170)
    local top = FLOOR - h
    local base = pick({ P.mid0, P.mid1 })
    for y = top, FLOOR - 1 do
      local t = (y - top) / h
      for xx = x, x + w - 1 do
        local c = base
        if dith(xx, y, (t - 0.80) * 4) then c = P.mid2 end            -- haze at the street
        px(MID, xx, y, C(c))
      end
    end
    hline(MID, x, x + w - 1, top, C(P.mid2)); vline(MID, x, top, FLOOR - 1, C(P.mid2))
    -- windows: lit in clusters (people at home), most dark
    local warmCluster = rnd()
    for wy = top + 8, FLOOR - 30, 11 do
      local rowOn = rnd() > 0.35
      for wx = x + 5, x + w - 9, 9 do
        local on = rowOn and rnd() > 0.45
        local c = on and pick({ P.warmd, P.warmd, P.coold, P.pinkd }) or P.midoff
        rect(MID, wx, wy, wx + 4, wy + 6, C(c))
        if on then hline(MID, wx, wx + 4, wy, C(c == P.warmd and "#d89a5a" or (c == P.coold and "#5aa0d0" or "#c06aa8"))) end
      end
    end
    -- roof clutter: water tower / antenna / AC
    local r = rnd()
    if r < 0.35 then
      local tx = x + ri(8, w - 24)
      rect(MID, tx, top - 16, tx + 14, top - 6, C(P.mid1)); hline(MID, tx - 1, tx + 15, top - 17, C(P.mid2))
      for lx = tx + 1, tx + 13, 4 do vline(MID, lx, top - 6, top - 1, C(P.mid0)) end
      for ly = top - 15, top - 7, 3 do hline(MID, tx, tx + 14, ly, C(P.mid0)) end
    elseif r < 0.6 then
      local ax = x + ri(6, w - 6); vline(MID, ax, top - 22, top - 1, C(P.mid2)); hline(MID, ax - 4, ax + 4, top - 14, C(P.mid2))
    else
      rect(MID, x + 6, top - 5, x + 18, top - 1, C(P.mid1)); rect(MID, x + w - 22, top - 4, x + w - 10, top - 1, C(P.mid1))
    end
    if boards[n] then billboard(x + (w - 70) // 2, top - 50, boards[n]) end
    x = x + w + ri(4, 14)
  end
end

-- ================================================================== FACADES (x1)
local GF = 168          -- ground-floor line (shops below, flats above)
local function brick(x0, x1, top)
  for y = top, GF - 1 do
    local course = (y - top) // 4
    for x = x0, x1 do
      local c = P.br1
      if (y - top) % 4 == 3 then c = P.brm
      elseif ((x + (course % 2) * 5) % 10) == 0 then c = P.brm
      elseif dith(x, y, 0.06) and ((x * 7 + course * 13) % 11 == 0) then c = P.br2
      elseif dith(x, y, 0.08) then c = P.br0 end
      px(FAC, x, y, C(c))
    end
  end
end
local function concrete(x0, x1, top)
  for y = top, GF - 1 do for x = x0, x1 do
    local c = P.co1
    if (y - top) % 26 == 0 then c = P.cod elseif ((x - x0) % 44) == 0 then c = P.cod
    elseif dith(x, y, 0.10) and ((x * 3 + y * 5) % 7 == 0) then c = P.co0 end
    px(FAC, x, y, C(c))
  end end
end
local function teal(x0, x1, top)
  for y = top, GF - 1 do for x = x0, x1 do
    local c = P.te1
    if (y % 4 == 0) or (x % 4 == 0) then c = P.ted elseif dith(x, y, 0.1) then c = P.te2 end
    px(FAC, x, y, C(c))
  end end
end
local function blackTile(x0, x1, top)
  for y = top, GF - 1 do for x = x0, x1 do
    local c = P.bk1
    if (y % 12 == 0) or ((x - x0) % 16 == 0) then c = P.bk0 elseif ((x + y) % 23 == 0) then c = P.bk2 end
    px(FAC, x, y, C(c))
  end end
end
local function cornice(x0, x1, top, mat)
  local hi = ({ brick = P.br2, concrete = P.co2, teal = P.te2, black = P.bk2 })[mat]
  rect(FAC, x0 - 2, top - 4, x1 + 2, top - 1, C(hi)); hline(FAC, x0 - 2, x1 + 2, top - 4, C("#5a4a7a")); hline(FAC, x0, x1, top, C(P.out))
  for x = x0, x1, 6 do px(FAC, x, top + 1, C(P.out)) end    -- dentils
end
local function window(x, y, w, h, mat)
  rect(FAC, x - 1, y - 1, x + w, y + h, C(P.frame))
  local r = rnd(); local state = r < 0.62 and "off" or (r < 0.84 and "warm" or (r < 0.94 and "tv" or "pink"))
  if state == "off" then
    rect(FAC, x, y, x + w - 1, y + h - 1, C(P.glass))
    for i = 0, math.min(w, h) - 1 do if i % 3 ~= 2 then px(FAC, x + w - 1 - i, y + i, C(P.glass2)) end end
  else
    local c, cd = P.warmd, "#8a5a36"
    if state == "tv" then c, cd = P.coold, "#24507a" elseif state == "pink" then c, cd = P.pinkd, "#6a2a5a" end
    vgradRect = nil
    for yy = y, y + h - 1 do for xx = x, x + w - 1 do px(FAC, xx, yy, C(dith(xx, yy, (yy - y) / h) and cd or c)) end end
    if rnd() > 0.5 then rect(FAC, x, y, x + w // 3, y + h - 1, C(cd)) end                         -- curtain
    if rnd() > 0.7 then rect(FAC, x + w // 2, y + h - 6, x + w // 2 + 2, y + h - 1, C(P.frame)); px(FAC, x + w // 2 + 1, y + h - 8, C(P.frame)) end   -- someone home
    emit(ACC.main, x + w // 2, y + h // 2, state == "tv" and P.cool or (state == "pink" and P.pink or P.warm), 0.035, 6)
  end
  hline(FAC, x - 2, x + w + 1, y + h + 1, C(mat == "brick" and P.br2 or P.co2))                     -- sill
  hline(FAC, x - 1, x + w, y + h + 2, C(P.out))
  vline(FAC, x + w // 2, y, y + h - 1, C(P.frame))
end
local function windows(x0, x1, top, mat)
  local ww, wh, gx, gy = 10, 14, 24, 24
  local cols = math.floor((x1 - x0 - 12) / gx)
  local mx = x0 + ((x1 - x0) - (cols - 1) * gx - ww) // 2
  local rows = {}
  for y = top + 12, GF - 26, gy do rows[#rows + 1] = y end
  for _, y in ipairs(rows) do for i = 0, cols - 1 do window(mx + i * gx, y, ww, wh, mat) end end
  return mx, cols, gx, rows
end
local function fireEscape(x0, x1, rows)
  for i, y in ipairs(rows) do
    local py = y + 16
    rect(FAC, x0, py, x1, py + 1, C(P.iron)); hline(FAC, x0, x1, py - 6, C(P.iron))
    for x = x0, x1, 3 do vline(FAC, x, py - 6, py, C(P.iron)) end
    if i < #rows then   -- ladder to the next platform
      local ny = rows[i + 1] + 16; local lx = (i % 2 == 0) and x0 + 4 or x1 - 18
      for k = 0, ny - py do px(FAC, lx + math.floor(k * 14 / (ny - py)), py + k, C(P.iron)); px(FAC, lx + 3 + math.floor(k * 14 / (ny - py)), py + k, C(P.iron)) end
    end
  end
  vline(FAC, x0, rows[1] + 10, GF - 6, C(P.iron)); hline(FAC, x0, x0 + 3, GF - 6, C(P.iron))
end
local function roofStuff(x0, x1, top)
  local r = rnd()
  if r < 0.4 then          -- water tower
    local tx = x0 + ri(10, math.max(11, x1 - x0 - 34))
    rect(FAC, tx, top - 30, tx + 22, top - 12, C("#2a1a2a")); for yy = top - 29, top - 13, 4 do hline(FAC, tx, tx + 22, yy, C("#1a0e1e")) end
    for k = 0, 4 do px(FAC, tx + 11 - k * 3, top - 31 - k, C("#2a1a2a")); px(FAC, tx + 11 + k * 3, top - 31 - k, C("#2a1a2a")) end
    rect(FAC, tx + 5, top - 35, tx + 17, top - 31, C("#2a1a2a"))
    for lx = tx + 2, tx + 20, 6 do vline(FAC, lx, top - 12, top - 5, C(P.iron)) end
  elseif r < 0.75 then     -- AC units
    for k = 0, ri(1, 3) do local ax = x0 + 8 + k * 26; rect(FAC, ax, top - 10, ax + 16, top - 5, C(P.co0)); hline(FAC, ax, ax + 16, top - 10, C(P.co2)); for gx = ax + 2, ax + 14, 3 do vline(FAC, gx, top - 8, top - 6, C(P.cod)) end end
  else                     -- antenna + red light
    local ax = x0 + ri(10, x1 - x0 - 10); vline(FAC, ax, top - 34, top - 5, C(P.iron2)); hline(FAC, ax - 6, ax + 6, top - 24, C(P.iron2)); hline(FAC, ax - 4, ax + 4, top - 16, C(P.iron2))
  end
end

-- ---- ground floor pieces ----
local SPILL = {}
local function shopWindow(x0, x1, y0, y1, glowc, content)
  rect(FAC, x0 - 2, y0 - 2, x1 + 2, y1 + 2, C(P.frame))
  local gl = rgb(glowc)
  for y = y0, y1 do for x = x0, x1 do
    local t = (y - y0) / (y1 - y0)
    local c = (t < 0.5) and P.glass2 or P.glass
    if dith(x, y, 0.25 - math.abs(t - 0.55) * 0.4) then c = P.refl end
    px(FAC, x, y, C(c))
  end end
  if content then content(x0, x1, y0, y1) end
  for i = 0, (y1 - y0) do     -- two diagonal glass reflections
    local xa = x0 + 6 + i // 2; if xa <= x1 and i % 2 == 0 then px(FAC, xa, y1 - i, C("#4a3e7a")) end
    local xb = x0 + 16 + i // 2; if xb <= x1 then px(FAC, xb, y1 - i, C("#3a2e6a")) end
  end
  for y = y0, y1, 2 do for x = x0, x1, 2 do addL(ACC.main, x, y, gl, 0.05) end end
  SPILL[#SPILL + 1] = { (x0 + x1) // 2, (x1 - x0) // 2, glowc }
end
local function door(x, y0, w)
  rect(FAC, x - 1, y0 - 1, x + w, FLOOR - 1, C(P.out)); rect(FAC, x, y0, x + w - 1, FLOOR - 1, C("#1a1028"))
  rect(FAC, x + 2, y0 + 3, x + w - 3, y0 + 26, C(P.glass)); px(FAC, x + w - 4, y0 + 40, C(P.yellow))
  hline(FAC, x, x + w - 1, y0 + 30, C(P.frame))
end
local function awning(x0, x1, y, c1, c2)
  for yy = y, y + 10 do
    local shade = (yy - y) / 10
    for x = x0, x1 do
      local stripe = ((x - x0) // 5) % 2 == 0
      local c = stripe and c1 or c2
      if yy - y >= 8 then c = stripe and "#4a1030" or "#6a6080" end
      px(FAC, x, yy, C(c))
    end
  end
  hline(FAC, x0, x1, y, C(P.white))
  for x = x0, x1 do local k = (x - x0) % 10; if k > 1 and k < 8 then px(FAC, x, y + 11, C(((x - x0) // 5) % 2 == 0 and c1 or c2)) end end   -- scallops
  for x = x0, x1 do if (x - x0) % 10 == 0 then px(FAC, x, y + 11, C(P.out)) end end
end
local function signBoard(x0, x1, y0, y1, text, tube, sc, board)
  rect(FAC, x0, y0, x1, y1, C(board or "#140a22")); hline(FAC, x0, x1, y0, C(P.iron2)); hline(FAC, x0, x1, y1, C(P.out))
  local tw = textW(text, sc); neonText(FAC, ACC.main, text, (x0 + x1 - tw) // 2 + 1, (y0 + y1) // 2 - (7 * sc) // 2 + 1, sc, tube, P.white, 0.11)
end
local function kick(x0, x1, c) rect(FAC, x0, 240, x1, FLOOR - 1, C(c or P.frame)); hline(FAC, x0, x1, 240, C(P.iron2)) end

local function building(x0, x1, top, mat, opts)
  opts = opts or {}
  local fill = ({ brick = brick, concrete = concrete, teal = teal, black = blackTile })[mat]
  fill(x0, x1, top); cornice(x0, x1, top, mat)
  if not opts.noWindows then
    local mx, cols, gx, rows = windows(x0, x1, top, mat)
    if opts.fire and #rows >= 2 then fireEscape(mx - 4, mx + gx + 14, rows) end
  end
  if not opts.noRoof then roofStuff(x0, x1, top) end
  -- ground-floor frame
  rect(FAC, x0, GF, x1, FLOOR - 1, C(P.bk1)); hline(FAC, x0, x1, GF, C(P.out))
  rect(FAC, x0, GF, x0 + 4, FLOOR - 1, C(P.frame)); rect(FAC, x1 - 4, GF, x1, FLOOR - 1, C(P.frame))
  vline(FAC, x0 + 4, GF, FLOOR - 1, C(P.iron2))
end

-- generic shop: sign + optional awning + window + door
local function shop(x0, x1, name, tube, opts)
  opts = opts or {}
  signBoard(x0 + 8, x1 - 8, GF + 2, GF + 18, name, tube, opts.sc or 1)
  if opts.awn then awning(x0 + 6, x1 - 6, GF + 20, opts.awn[1], opts.awn[2]) end
  local dw = 22; local dx = opts.doorLeft and x0 + 12 or x1 - 12 - dw
  local wx0, wx1 = opts.doorLeft and dx + dw + 8 or x0 + 12, opts.doorLeft and x1 - 12 or dx - 8
  shopWindow(wx0, wx1, GF + 36, 234, opts.glow or tube, opts.content)
  door(dx, GF + 34, dw); kick(wx0 - 2, wx1 + 2, opts.kick)
end

-- ---- the street, left to right ----
local function alley(x0, x1)
  for y = 40, FLOOR - 1 do for x = x0, x1 do px(FAC, x, y, C(dith(x, y, (y - 40) / 260) and "#0e0818" or "#08040e")) end end
  -- chain-link fence
  for y = 196, FLOOR - 1 do for x = x0 + 2, x1 - 2 do if (x + y) % 6 == 0 or (x - y) % 6 == 0 then px(FAC, x, y, C("#2a2440")) end end end
  hline(FAC, x0 + 2, x1 - 2, 196, C("#3a3458")); for x = x0 + 2, x1 - 2, 20 do vline(FAC, x, 196, FLOOR - 1, C("#3a3458")) end
  -- dumpster + bags
  local dx = x0 + 6; rect(FAC, dx, 226, dx + 30, FLOOR - 2, C("#1a3a2a")); hline(FAC, dx - 1, dx + 31, 225, C("#2a5a40")); hline(FAC, dx, dx + 30, 240, C("#12281e"))
  for k = 0, 2 do local bx = dx + 34 + k * 8; rect(FAC, bx, 246 - k % 2 * 3, bx + 8, FLOOR - 1, C("#14101c")); px(FAC, bx + 3, 246 - k % 2 * 3, C("#2a2438")) end
  -- a cat in the dark
  px(FAC, x1 - 12, 214, C(P.yellow)); px(FAC, x1 - 9, 214, C(P.yellow))
  emit(ACC.main, x1 - 10, 214, P.yellow, 0.04, 2)
end

-- 0..56 alley
alley(0, 56)
-- 60..300 : brick, 24H store (sign flickers: unlit tubes in the facade, lit version in the flicker layer)
building(60, 300, 70, "brick", { fire = true })
do
  local x0, x1 = 60, 300
  rect(FAC, x0 + 8, GF + 2, x1 - 8, GF + 18, C("#140a22")); hline(FAC, x0 + 8, x1 - 8, GF + 18, C(P.out))
  local s, sc = "24H MARKET", 1; local tw = textW(s, sc); local tx, ty = (x0 + x1 - tw) // 2, GF + 7
  neonText(FAC, nil, s, tx, ty, sc, "#4a2a3a", nil, 0, true)
  local FL = newImg(); FLICK = FL
  neonText(FL, ACC.flick, s, tx, ty, sc, P.orange, "#ffd0b0", 0.16)
  awning(x0 + 6, x1 - 6, GF + 20, "#2a8a5a", "#e8e0f0")
  shopWindow(x0 + 12, x1 - 44, GF + 36, 234, "#d8f0ff", function(a, b, c, d)
    for sy = c + 8, d - 6, 12 do hline(FAC, a + 2, b - 2, sy, C(P.iron2)); for sx = a + 4, b - 6, 5 do local cc = pick({ P.red, P.yellow, P.cool, P.green, P.white }); rect(FAC, sx, sy - 4, sx + 2, sy - 1, C(cc)) end end
  end)
  door(x1 - 34, GF + 34, 22); kick(x0 + 10, x1 - 42)
end
-- 300..320 pillar
rect(FAC, 300, 60, 320, FLOOR - 1, C(P.co0)); vline(FAC, 300, 60, FLOOR - 1, C(P.co2)); vline(FAC, 320, 60, FLOOR - 1, C(P.out))
-- 320..580 : VIDEO CLUB (arena 1)
building(320, 580, 50, "concrete", {})
do
  local x0, x1 = 320, 580
  -- big projecting sign above the shop
  rect(FAC, x0 + 30, GF - 30, x1 - 30, GF - 2, C("#0c0a1c")); hline(FAC, x0 + 30, x1 - 30, GF - 30, C(P.iron2)); rect(FAC, x0 + 30, GF - 31, x1 - 30, GF - 31, C(P.out))
  neonText(FAC, ACC.main, "VIDEO", x0 + 30 + ((x1 - x0 - 60) - textW("VIDEO", 2)) // 2 - 22, GF - 24, 2, P.cyan, P.white, 0.14)
  neonText(FAC, ACC.main, "CLUB", x0 + 30 + ((x1 - x0 - 60) - textW("VIDEO", 2)) // 2 + textW("VIDEO", 2) - 14, GF - 22, 2, P.pink, P.white, 0.14)
  signBoard(x0 + 8, x1 - 8, GF + 2, GF + 16, "VHS - BETA - LASER", P.yellow, 1)
  shopWindow(x0 + 12, x1 - 50, GF + 24, 234, P.violet, function(a, b, c, d)
    -- rows of VHS covers
    for sy = c + 6, d - 16, 14 do for sx = a + 4, b - 8, 8 do
      local cc = pick({ "#a02a6a", "#2a6aa0", "#a07a2a", "#3a8a5a", "#6a3aa0", "#a03a3a" })
      rect(FAC, sx, sy, sx + 5, sy + 10, C(cc)); hline(FAC, sx, sx + 5, sy + 2, C("#e8e0f0")); hline(FAC, sx, sx + 5, sy + 11, C(P.frame))
    end end
  end)
  door(x1 - 40, GF + 22, 24)
  neonText(FAC, ACC.main, "OPEN", x1 - 38, GF + 30, 1, P.red, "#ffb0b0", 0.10)
  kick(x0 + 10, x1 - 48)
end
-- 580..640 alley
alley(580, 640)
-- 640..860 : teal, HI-FI records
building(640, 860, 82, "teal", { fire = false })
shop(640, 860, "HI-FI RECORDS", P.green, { awn = { "#1a6a8a", "#e8e0f0" }, doorLeft = true, glow = P.cyan, content = function(a, b, c, d)
  for sx = a + 6, b - 20, 22 do   -- records on display
    local cy = c + 22; for yy = -8, 8 do for xx = -8, 8 do if xx * xx + yy * yy <= 64 then px(FAC, sx + 8 + xx, cy + yy, C((xx * xx + yy * yy <= 6) and P.orange or "#0a0610")) end end end
    px(FAC, sx + 6, cy - 5, C("#4a4060"))
  end
end })
-- 860..900 narrow building
building(860, 900, 96, "brick", { noRoof = true })
-- 900..1140 : PIZZA (arena 2)
building(900, 1140, 60, "brick", { fire = true })
do
  local x0, x1 = 900, 1140
  signBoard(x0 + 8, x1 - 8, GF + 2, GF + 20, "PIZZA", P.yellow, 2, "#2a0a14")
  -- neon slice icon left of the sign
  local sx, sy = x0 + 26, GF + 4
  local SL = { "#########", ".#.....#.", "..#..#.#.", "..#....#.", "...#.#.#.", "....#.#..", ".....##..", "......#..", "........." }
  for yy = 1, #SL do for xx = 1, 9 do if SL[yy]:sub(xx, xx) == "#" then px(FAC, sx + xx, sy + yy, C(yy == 1 and P.orange or P.yellow)); emit(ACC.main, sx + xx, sy + yy, P.orange, 0.09, 4) end end end
  awning(x0 + 6, x1 - 6, GF + 22, "#c8203a", "#f4f0ff")
  shopWindow(x0 + 40, x1 - 12, GF + 38, 234, P.orange, function(a, b, c, d)
    -- the oven glow + a pizzaiolo silhouette + counter
    for yy = c + 10, c + 30 do for xx = b - 50, b - 14 do local d2 = ((xx - (b - 32)) / 18) ^ 2 + ((yy - (c + 30)) / 20) ^ 2; if d2 < 1 then px(FAC, xx, yy, C(d2 < 0.35 and "#ff8a3a" or "#a04a2a")) end end end
    rect(FAC, a + 20, c + 14, a + 30, d - 14, C("#100818")); rect(FAC, a + 22, c + 6, a + 28, c + 13, C("#100818")); rect(FAC, a + 20, c + 4, a + 30, c + 6, C("#e8e0f0"))
    rect(FAC, a, d - 12, b, d, C("#3a1a1a")); hline(FAC, a, b, d - 12, C("#6a3a2a"))
  end)
  door(x0 + 12, GF + 36, 22)
  -- checkered kickplate
  for y = 240, FLOOR - 1 do for x = x0 + 38, x1 - 10 do px(FAC, x, y, C(((x // 4) + (y // 4)) % 2 == 0 and "#e8e0f0" or "#1a1028")) end end
end
-- 1140..1200 alley
alley(1140, 1200)
-- 1200..1420 : concrete, SUSHI
building(1200, 1420, 44, "concrete", {})
shop(1200, 1420, "SUSHI BAR", P.pink, { awn = { "#1a1a3a", "#a02a4a" }, glow = P.pinkw, content = function(a, b, c, d)
  for k = 0, 3 do local lx = a + 14 + k * 34; rect(FAC, lx, c + 4, lx + 10, c + 18, C("#c83a3a")); hline(FAC, lx, lx + 10, c + 4, C(P.out)); hline(FAC, lx, lx + 10, c + 18, C(P.out)); emit(ACC.main, lx + 5, c + 11, P.orange, 0.07, 6) end
end })
-- 1420..1540 : brick narrow, TATTOO
building(1420, 1540, 76, "brick", { fire = false })
shop(1420, 1540, "TATTOO", P.violet, { glow = P.violet, doorLeft = true })
-- 1540..1800 : METRO (arena 3): concrete building with a tiled arch going underground
building(1540, 1800, 66, "concrete", {})
do
  local x0, x1 = 1540, 1800; local cx = (x0 + x1) // 2
  -- big station sign + globe lamps
  rect(FAC, cx - 70, GF - 26, cx + 70, GF - 4, C("#0e2a5a")); hline(FAC, cx - 70, cx + 70, GF - 26, C(P.white)); hline(FAC, cx - 70, cx + 70, GF - 4, C(P.out))
  neonText(FAC, ACC.main, "METRO", cx - textW("METRO", 2) // 2, GF - 22, 2, P.white, P.white, 0.10)
  for _, gx in ipairs({ cx - 86, cx + 86 }) do
    vline(FAC, gx, GF - 20, FLOOR - 1, C("#1a4a2a")); for yy = -4, 4 do for xx = -4, 4 do if xx * xx + yy * yy <= 16 then px(FAC, gx + xx, GF - 24 + yy, C((xx + yy < -2) and "#d0ffe0" or P.green)) end end end
    emit(ACC.main, gx, GF - 24, P.green, 0.16, 12); cone(ACC.main, gx, GF - 18, FLOOR + 20, 2, 18, P.green, 0.10)
  end
  -- arch opening with stairs going down
  local ax0, ax1, ay = cx - 54, cx + 54, GF + 14
  for y = ay, FLOOR - 1 do for x = ax0, ax1 do
    local inside = (y > ay + 18) or ((x - cx) ^ 2 / 54 ^ 2 + (y - (ay + 18)) ^ 2 / 18 ^ 2 <= 1)
    if inside then
      local t = (y - ay) / (FLOOR - ay)
      local c = ((x // 3 + y // 3) % 2 == 0) and "#6a8a88" or "#4e6a6e"     -- white subway tiles, darker deeper
      if t > 0.25 then c = dith(x, y, (t - 0.25) * 2.2) and "#0a0812" or c end
      px(FAC, x, y, C(c))
    end
  end end
  for k = 0, 7 do local sy = FLOOR - 4 - k * 6; hline(FAC, ax0 + 6 + k * 2, ax1 - 6 - k * 2, sy, C("#3a3458")); hline(FAC, ax0 + 6 + k * 2, ax1 - 6 - k * 2, sy + 1, C("#120c1e")) end
  -- green railings
  for _, rx in ipairs({ ax0 - 18, ax1 + 2 }) do
    hline(FAC, rx, rx + 16, 226, C("#2a8a5a")); hline(FAC, rx, rx + 16, 238, C("#1a5a3a")); for x = rx, rx + 16, 4 do vline(FAC, x, 226, FLOOR - 1, C("#1a5a3a")) end
  end
  for y = ay, FLOOR - 1 do px(FAC, ax0 - 1, y, C(P.out)); px(FAC, ax1 + 1, y, C(P.out)) end
  emit(ACC.main, cx, ay + 24, "#c0ffe0", 0.05, 30)
end
-- 1800..1990 : graffiti wall (low brick wall, the city behind shows above it)
do
  local x0, x1, top = 1800, 1990, 150
  for y = top, FLOOR - 1 do
    local course = (y - top) // 4
    for x = x0, x1 do
      local c = P.br1
      if (y - top) % 4 == 3 then c = P.brm elseif ((x + (course % 2) * 5) % 10) == 0 then c = P.brm elseif dith(x, y, 0.08) then c = P.br0 end
      px(FAC, x, y, C(c))
    end
  end
  rect(FAC, x0 - 2, top - 4, x1 + 2, top - 1, C(P.co1)); hline(FAC, x0 - 2, x1 + 2, top - 4, C(P.co2)); hline(FAC, x0, x1, top, C(P.out))
  -- big bubble-letter VEEX piece: dark outline, pink->yellow fill, white shine, drips
  local s, sc = "VEEX", 5; local tw = textW(s, sc); local gx0, gy0 = (x0 + x1 - tw) // 2, top + 22
  local function glyphs(off, colf)
    local cx = gx0
    for i = 1, #s do
      local g = FONT[s:sub(i, i)]
      for gy = 1, 7 do for gxx = 1, 5 do if g[gy]:sub(gxx, gxx) == "#" then
        for yy = 0, sc - 1 do for xx = 0, sc - 1 do
          local X, Y = cx + (gxx - 1) * sc + xx, gy0 + (gy - 1) * sc + yy
          for oy = -off, off do for ox = -off, off do colf(X + ox, Y + oy, gy) end end
        end end
      end end end
      cx = cx + 6 * sc
    end
  end
  glyphs(3, function(X, Y) px(FAC, X + 2, Y + 2, C("#120818")) end)                 -- drop shadow
  glyphs(2, function(X, Y) px(FAC, X, Y, C("#1a0a2a")) end)                         -- outline
  glyphs(0, function(X, Y, gy)
    local t = (Y - gy0) / (7 * sc)
    local c = t < 0.33 and P.pink or (t < 0.66 and (dith(X, Y, (t - 0.33) * 3) and "#ff8a6a" or P.pink) or (dith(X, Y, (t - 0.66) * 3) and P.yellow or "#ff8a6a"))
    px(FAC, X, Y, C(c))
  end)
  glyphs(0, function(X, Y, gy) if gy == 1 and (X + Y) % 7 == 0 then px(FAC, X, Y, C(P.white)) end end)
  for k = 1, 9 do local dx = gx0 + ri(4, tw - 4); local dy = gy0 + 7 * sc; local l = ri(3, 12); vline(FAC, dx, dy - 1, dy + l, C(P.pink)); px(FAC, dx, dy + l + 1, C("#a0207a")) end
  -- small tags + a crown above the piece
  for k = 0, 2 do local cx2 = gx0 + tw // 2 - 10 + k * 10; vline(FAC, cx2, gy0 - 14, gy0 - 6, C(P.yellow)); px(FAC, cx2 - 1, gy0 - 14, C(P.yellow)); px(FAC, cx2 + 1, gy0 - 14, C(P.yellow)) end
  hline(FAC, gx0 + tw // 2 - 12, gx0 + tw // 2 + 12, gy0 - 6, C(P.yellow))
  for k = 1, 5 do local tx, ty = x0 + ri(6, x1 - x0 - 30), ri(top + 70, 236); for i = 0, ri(10, 22) do px(FAC, tx + i, ty + math.floor(math.sin(i * 0.9 + k) * 2), C(pick({ P.cyan, P.green, P.white, P.violet }))) end end
  -- posters
  for k = 0, 2 do local pxx = x0 + 10 + k * 64; rect(FAC, pxx, 214, pxx + 18, 240, C(pick({ "#e8e0c0", "#c8d8f0", "#f0c8d8" }))); rect(FAC, pxx + 3, 218, pxx + 15, 226, C(pick({ P.red, P.violet, P.orange }))); for ly = 229, 237, 3 do hline(FAC, pxx + 3, pxx + 15, ly, C("#6a6080")) end end
end
-- 1990..2060 alley
alley(1990, 2060)
-- 2060..2460 : BOOMBOX club (boss arena), black glossy tiles, neon strips, giant boombox, marquee with chaser bulbs
building(2060, 2460, 20, "black", { noWindows = true, noRoof = true })
do
  local x0, x1 = 2060, 2460; local cx = (x0 + x1) // 2
  for _, sx in ipairs({ x0 + 10, x0 + 16, x1 - 16, x1 - 10 }) do
    for y = 26, GF - 4 do px(FAC, sx, y, C(P.pink)); if y % 2 == 0 then emit(ACC.main, sx, y, P.pink, 0.05, 5) end end
  end
  -- giant neon boombox outline
  local bx0, bx1, by0, by1 = cx - 80, cx + 80, 44, 112
  local function tube(x, y, col) px(FAC, x, y, C(col)); emit(ACC.main, x, y, col, 0.07, 6) end
  for x = bx0, bx1 do tube(x, by0, P.cyan); tube(x, by1, P.cyan) end
  for y = by0, by1 do tube(bx0, y, P.cyan); tube(bx1, y, P.cyan) end
  for x = cx - 40, cx + 40 do tube(x, by0 - 14, P.cyan) end; for y = by0 - 14, by0 do tube(cx - 40, y, P.cyan); tube(cx + 40, y, P.cyan) end
  for _, sx in ipairs({ bx0 + 34, bx1 - 34 }) do
    for a = 0, 359, 3 do local r = math.rad(a); tube(sx + math.floor(math.cos(r) * 24 + 0.5), (by0 + by1) // 2 + 4 + math.floor(math.sin(r) * 24 + 0.5), P.pink) end
    for a = 0, 359, 6 do local r = math.rad(a); tube(sx + math.floor(math.cos(r) * 11 + 0.5), (by0 + by1) // 2 + 4 + math.floor(math.sin(r) * 11 + 0.5), P.pink) end
    tube(sx, (by0 + by1) // 2 + 4, P.white)
  end
  for x = cx - 22, cx + 22 do tube(x, by0 + 12, P.yellow); tube(x, by0 + 30, P.yellow) end; for y = by0 + 12, by0 + 30 do tube(cx - 22, y, P.yellow); tube(cx + 22, y, P.yellow) end
  for k = -2, 2 do tube(cx + k * 8, by1 - 10, P.green) end
  -- marquee
  local mx0, mx1, my0, my1 = cx - 120, cx + 120, 124, 162
  rect(FAC, mx0, my0, mx1, my1, C("#1a0a22")); rect(FAC, mx0 + 6, my0 + 6, mx1 - 6, my1 - 6, C("#0a0610"))
  neonText(FAC, ACC.main, "BOOMBOX", cx - textW("BOOMBOX", 2) // 2, my0 + 9, 2, P.pink, P.white, 0.14)
  neonText(FAC, ACC.main, "LIVE TONIGHT", cx - textW("LIVE TONIGHT", 1) // 2, my0 + 27, 1, P.yellow, P.white, 0.08)
  local BA, BB = newImg(), newImg(); BULBA, BULBB = BA, BB
  local i = 0
  local function bulb(x, y)
    i = i + 1
    rect(FAC, x - 1, y - 1, x + 1, y + 1, C("#5a4030")); px(FAC, x, y, C("#a08050"))
    local im, acc = (i % 2 == 0) and BA or BB, (i % 2 == 0) and ACC.bulbA or ACC.bulbB
    rect(im, x - 1, y - 1, x + 1, y + 1, C("#ffe0a0")); px(im, x, y, C(P.white)); emit(acc, x, y, "#ffd27a", 0.22, 5)
  end
  for x = mx0 + 3, mx1 - 3, 6 do bulb(x, my0 + 3); bulb(x, my1 - 3) end
  for y = my0 + 9, my1 - 9, 6 do bulb(mx0 + 3, y); bulb(mx1 - 3, y) end
  -- doors (tufted), stanchions + velvet rope
  local dx0, dx1 = cx - 34, cx + 34
  rect(FAC, dx0 - 4, GF + 4, dx1 + 4, FLOOR - 1, C("#2a1a10")); hline(FAC, dx0 - 4, dx1 + 4, GF + 4, C("#c8a050"))
  for y = GF + 8, FLOOR - 1 do for x = dx0, dx1 do
    local c = "#4a0e24"; if ((x - dx0) + (y - GF)) % 8 == 0 or ((x - dx0) - (y - GF)) % 8 == 0 then c = "#2a0614" end
    if (x == cx) then c = P.out end
    px(FAC, x, y, C(c))
  end end
  px(FAC, cx - 3, 216, C(P.yellow)); px(FAC, cx + 3, 216, C(P.yellow))
  for _, sx in ipairs({ dx0 - 26, dx1 + 26 }) do vline(FAC, sx, 230, FLOOR - 1, C("#c8a050")); rect(FAC, sx - 1, 228, sx + 1, 230, C("#ffe080")); rect(FAC, sx - 3, FLOOR - 2, sx + 3, FLOOR - 1, C("#c8a050")) end
  for x = dx0 - 26, dx0 - 4 do px(FAC, x, 234 + math.floor(math.sin((x - dx0 + 26) / 22 * math.pi) * 5), C("#c8203a")) end
  for x = dx1 + 4, dx1 + 26 do px(FAC, x, 234 + math.floor(math.sin((x - dx1 - 4) / 22 * math.pi) * 5), C("#c8203a")) end
  -- posters either side: "BIG BOOMER"
  for _, pxx in ipairs({ x0 + 40, x1 - 100 }) do
    rect(FAC, pxx, 188, pxx + 58, 236, C("#ff2fd0")); rect(FAC, pxx + 2, 190, pxx + 56, 234, C("#1a0a2a"))
    neonText(FAC, nil, "BIG", pxx + 6, 194, 1, P.yellow, P.yellow, 0)
    neonText(FAC, nil, "BOOMER", pxx + 6, 204, 1, P.yellow, P.yellow, 0)
    for yy = 0, 14 do for xx = 0, 10 do if (xx - 5) ^ 2 + (yy - 9) ^ 2 < 30 then px(FAC, pxx + 40 + xx, 212 + yy, C("#9c6444")) end end end   -- boss silhouette head
    rect(FAC, pxx + 36, 226, pxx + 54, 234, C("#ff2fd0"))
    emit(ACC.main, pxx + 29, 212, P.pink, 0.05, 20)
  end
  SPILL[#SPILL + 1] = { cx, 60, P.pink }
end
-- 2460..2700 : brick, BAR
building(2460, 2700, 64, "brick", { fire = true })
shop(2460, 2700, "COCKTAILS BAR", P.violet, { awn = { "#3a1a6a", "#e8e0f0" }, glow = P.violet, content = function(a, b, c, d)
  for k = 0, 5 do local gx = a + 10 + k * 16; rect(FAC, gx, d - 22, gx + 4, d - 12, C(pick({ P.green, P.orange, P.cool, P.pink }))); px(FAC, gx + 2, d - 24, C(P.white)) end
  rect(FAC, a, d - 10, b, d, C("#2a1428")); hline(FAC, a, b, d - 10, C("#5a3a50"))
end })
-- 2700..3340 : laundromat + more street (beyond the boss arena, seen only while scrolling in)
building(2700, 2960, 54, "teal", {})
shop(2700, 2960, "LAUNDRY", P.cyan, { glow = P.cool, content = function(a, b, c, d)
  for k = 0, 4 do local mx = a + 14 + k * 34; rect(FAC, mx, c + 20, mx + 24, d - 4, C("#c8c4dc")); for yy = -7, 7 do for xx = -7, 7 do if xx * xx + yy * yy <= 49 then px(FAC, mx + 12 + xx, c + 36 + yy, C(xx * xx + yy * yy <= 25 and "#2a6aa0" or "#4a4a6a")) end end end end
end })
alley(2960, 3010)
building(3010, 3340, 70, "brick", { fire = true })
shop(3010, 3340, "HOTEL", P.red, { glow = P.warm })

-- ================================================================== FLOOR (sidewalk + curb + road)
do
  local SW_END, CURB = 278, 282
  for y = FLOOR, HH - 1 do
    for x = 0, WW - 1 do
      local c
      if y < SW_END then                            -- paving slabs
        c = P.side1
        if (x % 32 == 0) or (y == FLOOR + 9) then c = P.side2 elseif dith(x, y, 0.12) then c = P.side0 end
        if y == FLOOR then c = P.side2 end
      elseif y < CURB then                          -- curb stone
        c = (y == SW_END) and P.curb0 or ((y == SW_END + 1) and P.curb1 or P.curb2)
        if y > SW_END and x % 48 == 0 then c = P.curb2 end
      elseif y == CURB then c = "#0e0820"            -- gutter
      else                                          -- asphalt, darker toward the bottom edge? no: lighter far, darker near
        local t = (y - CURB) / (HH - CURB)
        c = P.road1
        local n = ((x * 73 + y * 151) % 97) / 97
        if n > 0.86 then c = P.road0 elseif n < 0.10 then c = P.road2 end
        if dith(x, y, t * 0.45) and n < 0.5 then c = P.road2 end
      end
      FLO:drawPixel(x, y, C(c))
    end
  end
  -- lane dashes (perspective: slightly thicker lower)
  for x = 0, WW - 1, 64 do rect(FLO, x, 318, x + 30, 319, C(P.lane)); hline(FLO, x, x + 30, 320, C(P.lane2)) end
  -- cracks, drains, litter
  for k = 1, 60 do local cx, cy = ri(0, WW - 1), ri(CURB + 3, HH - 3); for i = 0, ri(4, 14) do px(FLO, cx + i, cy + math.floor(math.sin(i * 1.7 + k) * 1.2), C(P.road2)) end end
  for x = 120, WW - 1, 300 do rect(FLO, x, SW_END + 1, x + 14, CURB, C("#0a0614")); for gx = x + 2, x + 12, 3 do vline(FLO, gx, SW_END + 1, CURB, C("#3a3058")) end end
  for k = 1, 40 do local lx, ly = ri(0, WW - 1), ri(FLOOR + 2, HH - 4); px(FLO, lx, ly, C(pick({ "#e8e0c0", "#8a7a9a", P.red }))) end
  -- puddles with neon reflections
  for k = 1, 18 do
    local cx, cy, rx, ry = ri(40, WW - 40), ri(292, 350), ri(14, 34), ri(3, 6)
    local col = pick({ P.pink, P.cyan, P.yellow, P.violet })
    for y = cy - ry, cy + ry do for x = cx - rx, cx + rx do
      local d = ((x - cx) / rx) ^ 2 + ((y - cy) / ry) ^ 2 + math.sin(x * 0.5 + k) * 0.08
      if d <= 1 then
        FLO:drawPixel(x, y, C(d > 0.75 and P.pud1 or P.pud0))
        if (x + k * 3) % 5 < 2 and d < 0.8 then addL(ACC.main, x, y, rgb(col), 0.16 * (1 - d)) end
        if y == cy - ry + 1 and d < 0.9 then addL(ACC.main, x, y, rgb(P.white), 0.08) end
      end
    end end
  end
  -- light spill from shop windows onto the sidewalk and the road
  for _, s in ipairs(SPILL) do cone(ACC.main, s[1], FLOOR, FLOOR + 46, s[2], s[2] + 18, s[3], 0.16) end
  -- street lamps (sodium / pink), standing on the sidewalk edge
  for _, l in ipairs({ { 200, "#ffb050" }, { 620, "#ff7ad0" }, { 1180, "#ffb050" }, { 1520, "#ffb050" }, { 2000, "#ff7ad0" }, { 2560, "#ffb050" }, { 3000, "#ffb050" } }) do
    local lx = l[1]
    rect(FAC, lx - 1, 108, lx + 1, 274, C("#120a20")); vline(FAC, lx + 1, 108, 274, C("#2a2040")); rect(FAC, lx - 3, 266, lx + 3, 275, C("#120a20"))
    hline(FAC, lx - 1, lx + 14, 106, C("#120a20")); hline(FAC, lx - 1, lx + 14, 107, C("#2a2040"))
    rect(FAC, lx + 8, 108, lx + 18, 111, C("#2a2040")); hline(FAC, lx + 9, lx + 17, 112, C(l[2]))
    emit(ACC.main, lx + 13, 112, l[2], 0.25, 8)
    cone(ACC.main, lx + 13, 113, 300, 3, 40, l[2], 0.12)
  end
end

-- ================================================================== save
local GLOW = bake(ACC.main, nil, 2.2)
bake(ACC.flick, FLICK, 1.8); bake(ACC.bulbA, BULBA, 1.6); bake(ACC.bulbB, BULBB, 1.6)
local spr = saveLayers(out, { { "sky", SKY }, { "far", FAR }, { "mid", MID }, { "floor", FLO }, { "facade", FAC }, { "glow", GLOW }, { "flicker", FLICK }, { "bulbsA", BULBA }, { "bulbsB", BULBB } },
  { glow = true, flicker = true, bulbsA = true, bulbsB = true })

if metaOut then
  local f = io.open(metaOut, "w")
  local parts = {}
  for _, a in ipairs(ANT) do parts[#parts + 1] = string.format("[%d,%d]", a[1], a[2]) end
  f:write(string.format('{"width":%d,"height":%d,"floor":%d,"farW":%d,"midW":%d,"far":0.2,"mid":0.5,"stops":[260,860,1500,2060],"antennas":[%s]}', WW, HH, FLOOR, FARW, MIDW, table.concat(parts, ",")))
  f:close()
end
print("level1: " .. #spr.layers .. " layers -> " .. out)
