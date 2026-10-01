-- VEEXING FORCE - STAGE 2 "GALAXY ARCADE" backdrop, drawn pixel by pixel in Aseprite (batch, see tools/make_level_bg.py 2).
-- A giant 80s arcade inside a mall, under a glass dome that shows the galaxy.
-- Layers: sky (static: the dome + galaxy) | far x0.2 (mall galleries, escalators) | mid x0.5 (hanging planets, GALAXY logo, spotlights)
--         facade x1 (arcade back wall: rows of cabinets, landmarks) | floor x1 (cosmic arcade carpet)
--         glow / flicker ("INSERT COIN") / bulbsA-B (laser grid of the LASER ZONE + chaser bulbs), all ADDITIVE.
-- Readability: the wall and the cabinets stay dark violet; screens are dim in the base layer and only glow through the additive light.
-- Level design, one landmark per arena (camera locks at stop-160, centre = stop+160):
--   arena 1 (420)  TOKENS booth + claw machines   | arena 2 (1060) HI-SCORES wall (VEEX on top) + pinballs
--   arena 3 (1660) racing cockpits, air hockey, PRIZES counter | boss (2420) LASER ZONE portal of LADY LASER, animated lasers
local out = app.params["out"]
local metaOut = app.params["meta"]
WW, HH, FLOOR = 3540, 360, 258
local FARW, MIDW = 1110, 1780
dofile(app.params["lib"])
seed = 2002

local P = {
  out = "#0a0614",
  sp0 = "#04021a", sp1 = "#0a0630", sp2 = "#140a48", sp3 = "#22105e", sp4 = "#341470",
  neb1 = "#5a1a7a", neb2 = "#8a2a8a", neb3 = "#1a4a8a", neb4 = "#2a7ab0",
  rib = "#1a1438", rib2 = "#2e2658",
  far0 = "#1c1450", far1 = "#261a62", far2 = "#342276", farL = "#6a5ab0",
  mid0 = "#120c34", mid1 = "#1a1244", mid2 = "#261a58",
  wall0 = "#160c30", wall1 = "#1c1038", wall2 = "#24164a", wallL = "#2e1e58",
  chrome = "#8a8ab0", chrome2 = "#4a4a70",
  cab0 = "#100a20", glass = "#0e0c24",
  car0 = "#0c0820", car1 = "#120c2a", car2 = "#1a1238",
  cyan = "#27f0ff", pink = "#ff2fd0", yellow = "#ffe44d", green = "#3dffa0", orange = "#ff6a3d", violet = "#8b5cff", red = "#ff2a4d", white = "#f4f0ff", blue = "#3a6aff",
}
local SKY, FAR, MID, FAC, FLO = newImg(), newImg(), newImg(), newImg(), newImg()
local FLICK, BULBA, BULBB = newImg(), newImg(), newImg()
local TOP = 112         -- top of the arcade back wall (mezzanine railing above it; the atrium shows above y ~90)
local SPILL = {}

local function disc(im, cx, cy, r, colf)
  for y = math.floor(cy - r), math.ceil(cy + r) do for x = math.floor(cx - r), math.ceil(cx + r) do
    local d = math.sqrt((x - cx) ^ 2 + (y - cy) ^ 2); if d <= r then local c = colf(x, y, d / r); if c then px(im, x, y, C(c)) end end
  end end
end
local function line(im, x0, y0, x1, y1, c)
  local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0))
  for i = 0, n do px(im, math.floor(x0 + (x1 - x0) * i / math.max(1, n) + 0.5), math.floor(y0 + (y1 - y0) * i / math.max(1, n) + 0.5), c) end
end
local function txt(im, s, x, y, col) neonText(im, nil, s, x, y, 1, col, col, 0) end

-- ================================================================== SKY: glass dome over the galaxy
do
  vgrad(SKY, 0, 0, 639, FLOOR - 1, { P.sp0, P.sp1, P.sp2, P.sp3, P.sp4 }, 3)
  -- nebula clouds (dithered, two hues)
  for _, nb in ipairs({ { 150, 70, 120, 40, P.neb1, P.neb2 }, { 470, 120, 140, 46, P.neb3, P.neb4 }, { 330, 40, 90, 26, P.neb2, P.neb1 } }) do
    for y = nb[2] - nb[4], nb[2] + nb[4] do for x = nb[1] - nb[3], nb[1] + nb[3] do
      local d = ((x - nb[1]) / nb[3]) ^ 2 + ((y - nb[2]) / nb[4]) ^ 2 + 0.25 * math.sin(x * 0.07 + y * 0.11)
      if d < 1 and dith(x, y, (1 - d) * 0.7) then px(SKY, x, y, C((d < 0.35 and dith(x, y, 0.5)) and nb[6] or nb[5])) end
    end end
  end
  for i = 1, 220 do local x, y = ri(0, 639), ri(0, 200); local b = rnd(); px(SKY, x, y, C(b > 0.9 and P.white or (b > 0.6 and "#a0a0e0" or "#5a5aa8"))) end
  for _, st in ipairs({ { 90, 40 }, { 560, 30 }, { 250, 150 } }) do local x, y = st[1], st[2]; px(SKY, x, y, C(P.white)); for d = 1, 3 do px(SKY, x + d, y, C(d < 3 and "#c0c0ff" or "#6a6ab0")); px(SKY, x - d, y, C(d < 3 and "#c0c0ff" or "#6a6ab0")); px(SKY, x, y + d, C("#8a8ad0")); px(SKY, x, y - d, C("#8a8ad0")) end end
  -- ringed planet
  local cx, cy, r = 470, 70, 30
  disc(SKY, cx, cy, r, function(x, y, d)
    local band = math.floor((y - cy + r) / 6) % 3
    local c = ({ "#ff8a5a", "#ff5a8a", "#ffb06a" })[band + 1]
    if (x - cx) + (y - cy) * 0.6 > r * 0.45 and dith(x, y, ((x - cx) + (y - cy) * 0.6) / r - 0.3) then c = "#8a2a6a" end
    if d > 0.9 and (x - cx) < 0 then c = "#ffd0a0" end
    return c
  end)
  for a = 0, 359 do
    local t = math.rad(a); local x = cx + math.cos(t) * 52; local y = cy + math.sin(t) * 10 - math.cos(t) * 6
    local front = math.sin(t) > 0
    if front or ((x - cx) ^ 2 + (y - cy) ^ 2 > r * r) then px(SKY, math.floor(x), math.floor(y), C(front and "#ffe0b0" or "#c08a8a")); px(SKY, math.floor(x), math.floor(y) + 1, C("#8a5a7a")) end
  end
  disc(SKY, 120, 190, 9, function(x, y, d) return (x - 120 + y - 190 > 3) and "#2a4a8a" or "#5aa0e0" end)   -- small blue moon
  -- dome ribs: curved steel arches + horizontal ring, so we read "indoors under glass"
  for _, rx in ipairs({ -60, 90, 240, 400, 560, 720 }) do
    for y = 0, FLOOR - 1 do local x = rx + math.floor(((y / FLOOR) ^ 1.6) * (320 - rx) * 0.35); px(SKY, x, y, C(P.rib)); px(SKY, x + 1, y, C(P.rib2)) end
  end
  for x = 0, 639 do local y = 150 + math.floor(math.sin(x / 640 * math.pi) * -14); px(SKY, x, y, C(P.rib)); px(SKY, x, y + 1, C(P.rib2)) end
  for i = 0, 140 do local x, y = 30 + i, 10 + i // 2; if i % 3 ~= 0 then px(SKY, x, y, C("#2a2a6a")) end end   -- glass glint
end

-- ================================================================== FAR: mall galleries across the atrium
do
  for y = 34, FLOOR - 1 do for x = 0, FARW - 1 do px(FAR, x, y, C(dith(x, y, (y - 34) / 260) and P.far1 or P.far0)) end end
  hline(FAR, 0, FARW - 1, 34, C(P.farL))
  for _, fy in ipairs({ 84 }) do                      -- the gallery across the atrium
    rect(FAR, 0, fy, FARW - 1, fy + 5, C(P.far2)); hline(FAR, 0, FARW - 1, fy, C(P.farL)); hline(FAR, 0, FARW - 1, fy - 8, C(P.farL))
    for x = 0, FARW - 1, 6 do vline(FAR, x, fy - 8, fy, C(P.far2)) end
    local x = 4
    while x < FARW - 40 do                             -- shopfronts behind the railing
      local w = ri(30, 58); local col = pick({ P.pink, P.cyan, P.yellow, P.green, P.violet, P.orange })
      rect(FAR, x, fy - 40, x + w, fy - 9, C(P.far0)); rect(FAR, x + 2, fy - 30, x + w - 2, fy - 10, C("#2a2468"))
      hline(FAR, x + 3, x + w - 3, fy - 36, C(col)); hline(FAR, x + 3, x + w - 3, fy - 35, C(col))
      for k = 0, ri(0, 3) do local px_ = x + ri(4, w - 4); rect(FAR, px_, fy - 14, px_ + 1, fy - 9, C("#120a30")); px(FAR, px_, fy - 15, C("#120a30")) end   -- shoppers
      x = x + w + ri(4, 10)
    end
  end
  for _, ex in ipairs({ 140, 520, 900 }) do            -- escalators going up to the gallery
    for k = 0, 40 do local x, y = ex + k, 124 - k; px(FAR, x, y, C(P.farL)); px(FAR, x + 10, y + 4, C(P.farL)); if k % 4 == 0 then line(FAR, x, y, x + 10, y + 4, C(P.far2)) end end
    for k = 0, 40, 8 do px(FAR, ex + k + 5, 126 - k, C(P.cyan)) end
  end
  for x = 0, FARW - 1, 90 do rect(FAR, x, 30, x + 4, FLOOR - 1, C(P.far2)); vline(FAR, x, 30, FLOOR - 1, C(P.farL)) end   -- columns
end

-- ================================================================== MID: hanging planets, GALAXY ARCADE logo, spotlights
do
  local function planet(cx, cy, r, c1, c2, ring)
    vline(MID, cx, 0, cy - r, C("#3a3460"))
    disc(MID, cx, cy, r, function(x, y, d)
      local band = math.floor((y - cy + r) / 5) % 2; local c = band == 0 and c1 or c2
      if (x - cx) * 0.7 + (y - cy) > r * 0.35 and dith(x, y, 0.6) then c = "#1a1040" end
      if (x - cx) < -r * 0.5 and (y - cy) < -r * 0.4 and d > 0.5 then c = P.white end
      return c
    end)
    if ring then for a = 0, 359, 2 do local t = math.rad(a); local x, y = cx + math.cos(t) * r * 1.7, cy + math.sin(t) * r * 0.35; if math.sin(t) > 0 or (x - cx) ^ 2 + (y - cy) ^ 2 > r * r then px(MID, math.floor(x), math.floor(y), C("#d0c0ff")) end end end
  end
  local function logo(x, y)
    rect(MID, x - 4, y - 4, x + 150, y + 42, C("#0a0620")); rect(MID, x - 3, y - 3, x + 149, y + 41, C("#120a30"))
    vline(MID, x + 20, 0, y - 4, C("#3a3460")); vline(MID, x + 126, 0, y - 4, C("#3a3460"))
    -- neon tubes with a baked halo (no world-space glow on parallax planes)
    local function tube(s, tx, ty, sc, col)
      local tmp = {}
      neonText(MID, nil, s, tx, ty, sc, col, P.white, 0)
      for yy = ty - 3, ty + 7 * sc + 3 do for xx = tx - 3, tx + textW(s, sc) + 3 do
        if pc.rgbaA(MID:getPixel(xx, yy)) > 0 and pc.rgbaR(MID:getPixel(xx, yy)) == 18 then
          -- near a lit tube? soft halo by dither
          local near = false
          for dy = -2, 2 do for dx = -2, 2 do local p = MID:getPixel(xx + dx, yy + dy); if pc.rgbaR(p) ~= 18 and pc.rgbaA(p) > 0 and pc.rgbaR(p) + pc.rgbaG(p) > 300 then near = true end end end
          if near and dith(xx, yy, 0.45) then tmp[#tmp + 1] = { xx, yy } end
        end
      end end
      for _, q in ipairs(tmp) do px(MID, q[1], q[2], C(col == P.cyan and "#1a5a7a" or "#6a1a5a")) end
    end
    tube("GALAXY", x + 8, y + 4, 3, P.cyan)
    tube("ARCADE", x + 40, y + 28, 1, P.pink)
    -- rocket
    for k = 0, 10 do px(MID, x + 128 + k // 2, y + 30 - k, C(P.yellow)) end
    rect(MID, x + 132, y + 16, x + 136, y + 22, C(P.white)); px(MID, x + 134, y + 15, C(P.red)); px(MID, x + 131, y + 23, C(P.orange)); px(MID, x + 137, y + 23, C(P.orange))
  end
  local function spot(x, y0, y1, w, col)   -- translucent light shaft
    for y = y0, y1 do local t = (y - y0) / (y1 - y0); local hw = 3 + w * t
      for xx = math.floor(x - hw), math.floor(x + hw) do if dith(xx, y, 0.18 * (1 - t)) then px(MID, xx + math.floor(t * 30), y, C(col, 150)) end end
    end
  end
  for _, s in ipairs({ { 60, "#ff6ad0" }, { 420, "#6ae0ff" }, { 760, "#ffe46a" }, { 1120, "#ff6ad0" }, { 1480, "#6ae0ff" } }) do spot(s[1], 0, 110, 24, s[2]) end
  planet(130, 46, 18, "#ff8a5a", "#ff5a8a", true); planet(520, 30, 12, "#5aa0ff", "#3a6ad0", false)
  planet(880, 50, 20, "#6ae0a0", "#3aa080", true); planet(1260, 28, 13, "#ffd06a", "#ff9a3a", false); planet(1640, 46, 17, "#c07aff", "#8a4ad0", true)
  logo(260, 18); logo(1080, 14)
  -- hanging UFO model with lights
  for _, u in ipairs({ { 700, 30 }, { 1500, 24 } }) do
    vline(MID, u[1], 0, u[2] - 6, C("#3a3460"))
    for yy = -5, 5 do for xx = -22, 22 do if (xx / 22) ^ 2 + (yy / 5) ^ 2 <= 1 then px(MID, u[1] + xx, u[2] + yy, C(yy < 0 and "#9a9ac0" or "#5a5a80")) end end end
    for yy = -10, -3 do for xx = -9, 9 do if (xx / 9) ^ 2 + ((yy + 3) / 8) ^ 2 <= 1 then px(MID, u[1] + xx, u[2] + yy, C("#6ae0ff", 200)) end end end
    for k = -18, 18, 6 do px(MID, u[1] + k, u[2] + 2, C((k // 6) % 2 == 0 and P.yellow or P.pink)) end
  end
end

-- ================================================================== FACADE: arcade back wall
-- wall + mezzanine railing + soffit spots
for y = TOP, FLOOR - 1 do for x = 0, WW - 1 do
  local c = P.wall1
  if (x % 64) == 0 then c = P.wall0 elseif dith(x, y, 0.07) then c = P.wall2 end
  px(FAC, x, y, C(c))
end end
rect(FAC, 0, TOP - 8, WW - 1, TOP - 1, C(P.wall0)); hline(FAC, 0, WW - 1, TOP - 8, C(P.chrome)); hline(FAC, 0, WW - 1, TOP - 7, C(P.chrome2))
for x = 0, WW - 1, 8 do vline(FAC, x, TOP - 22, TOP - 8, C(P.chrome2)) end
hline(FAC, 0, WW - 1, TOP - 22, C(P.chrome)); hline(FAC, 0, WW - 1, TOP - 21, C(P.chrome2))
for x = 40, WW - 1, 120 do rect(FAC, x - 3, TOP, x + 3, TOP + 3, C(P.chrome2)); cone(ACC.main, x, TOP + 4, 190, 2, 26, "#d0c0ff", 0.07) end
-- memphis wall paint: neon trims + muted shapes
hline(FAC, 0, WW - 1, 140, C("#5a1a5a")); hline(FAC, 0, WW - 1, 146, C("#1a4a5a"))
for x = 0, WW - 1 do if x % 3 ~= 0 then emit(ACC.main, x, 140, P.pink, 0.006, 3) end end
for k = 1, 90 do
  local x, y = ri(0, WW - 1), ri(118, 134); local s = ri(0, 2); local col = pick({ "#3a1a5a", "#1a3a5a", "#4a3a1a", "#1a4a3a" })
  if s == 0 then for i = 0, 5 do px(FAC, x + i, y + 5 - i, C(col)); px(FAC, x + i + 6, y + i, C(col)) end
  elseif s == 1 then for i = 0, 16 do px(FAC, x + i, y + math.floor(math.sin(i * 0.8) * 2), C(col)) end
  else for yy = 0, 4 do hline(FAC, x - yy, x + yy, y + yy, C(col)) end end
end
-- baseboard
rect(FAC, 0, FLOOR - 6, WW - 1, FLOOR - 1, C(P.wall0)); hline(FAC, 0, WW - 1, FLOOR - 6, C(P.violet))
for x = 0, WW - 1, 2 do emit(ACC.main, x, FLOOR - 6, P.violet, 0.01, 2) end

-- ---- arcade cabinet (32 wide, 76 tall), kinds = screen content ----
local GAMES = {
  { "ZAP", "#c8203a", "shooter" }, { "MAZE", "#2040c8", "maze" }, { "TURBO", "#e8a020", "race" }, { "BLOX", "#20a060", "puzzle" },
  { "KOMBO", "#8020c0", "fighter" }, { "PONG", "#c0c0d0", "pong" }, { "ROCK", "#d06020", "shooter" }, { "NINJA", "#202020", "fighter" },
}
local function screen(x0, y0, w, h, kind, im, acc)
  im = im or FAC
  rect(im, x0, y0, x0 + w - 1, y0 + h - 1, C("#06061a"))
  if kind == "shooter" then
    for r = 0, 2 do for k = 0, 4 do local ax, ay = x0 + 3 + k * 5, y0 + 3 + r * 4; rect(im, ax, ay, ax + 2, ay + 1, C(({ "#3dffa0", "#ff2fd0", "#ffe44d" })[r + 1])) end end
    rect(im, x0 + w // 2 - 1, y0 + h - 4, x0 + w // 2 + 1, y0 + h - 2, C(P.cyan)); px(im, x0 + w // 2, y0 + h - 8, C(P.white))
  elseif kind == "maze" then
    for yy = y0 + 2, y0 + h - 3, 4 do hline(im, x0 + 2, x0 + w - 3, yy, C("#2a3aff")) end
    for xx = x0 + 2, x0 + w - 3, 6 do vline(im, xx, y0 + 2, y0 + h - 3, C("#2a3aff")) end
    rect(im, x0 + 5, y0 + 4, x0 + 6, y0 + 5, C(P.yellow)); for xx = x0 + 9, x0 + w - 4, 3 do px(im, xx, y0 + 4 + 1, C("#ffd0a0")) end
  elseif kind == "race" then
    for yy = y0 + h // 2, y0 + h - 1 do local t = (yy - y0 - h // 2) / (h // 2); local hw = 2 + t * (w // 2 - 2)
      for xx = x0, x0 + w - 1 do px(im, xx, yy, C(math.abs(xx - (x0 + w // 2)) < hw and "#3a3a4a" or "#1a6a2a")) end end
    rect(im, x0, y0, x0 + w - 1, y0 + h // 2 - 1, C("#ff7a5a")); rect(im, x0 + w // 2 - 2, y0 + h - 5, x0 + w // 2 + 2, y0 + h - 3, C(P.red))
  elseif kind == "puzzle" then
    for k = 1, 14 do local bx, by = x0 + 2 + ri(0, (w - 6) // 3) * 3, y0 + h - 4 - ri(0, 3) * 3; rect(im, bx, by, bx + 2, by + 2, C(pick({ P.cyan, P.yellow, P.pink, P.green }))) end
    rect(im, x0 + w // 2, y0 + 3, x0 + w // 2 + 5, y0 + 5, C(P.orange))
  elseif kind == "fighter" then
    rect(im, x0, y0 + h - 4, x0 + w - 1, y0 + h - 1, C("#3a2a1a")); rect(im, x0, y0, x0 + w - 1, y0 + 3, C("#ffe44d"))
    rect(im, x0 + 5, y0 + h - 12, x0 + 7, y0 + h - 5, C("#e0a080")); rect(im, x0 + w - 9, y0 + h - 12, x0 + w - 7, y0 + h - 5, C("#80a0e0")); hline(im, x0 + 8, x0 + 11, y0 + h - 10, C("#e0a080"))
  else
    vline(im, x0 + 2, y0 + 4, y0 + 9, C(P.white)); vline(im, x0 + w - 3, y0 + h - 10, y0 + h - 5, C(P.white)); px(im, x0 + w // 2, y0 + h // 2, C(P.white))
    for yy = y0, y0 + h - 1, 3 do px(im, x0 + w // 2, yy, C("#6a6a8a")) end
  end
  for yy = y0 + 1, y0 + h - 1, 2 do for xx = x0, x0 + w - 1 do if pc.rgbaR(im:getPixel(xx, yy)) > 40 and dith(xx, yy, 0.5) then px(im, xx, yy, C("#06061a")) end end end   -- scanlines
end
local function cabinet(x, gi)
  local g = GAMES[gi]; local name, body, kind = g[1], g[2], g[3]
  local y0 = 182
  -- body
  rect(FAC, x - 1, y0 - 1, x + 33, FLOOR - 1, C(P.out))
  rect(FAC, x, y0, x + 32, FLOOR - 1, C(P.cab0))
  rect(FAC, x + 29, y0 + 1, x + 32, FLOOR - 2, C(body)); vline(FAC, x + 29, y0 + 1, FLOOR - 2, C(P.out))                -- side art stripe
  for yy = y0 + 4, FLOOR - 4, 7 do px(FAC, x + 31, yy, C(P.white)) end
  -- marquee (lit panel)
  rect(FAC, x + 1, y0 + 1, x + 28, y0 + 12, C(body)); hline(FAC, x + 1, x + 28, y0 + 12, C(P.out))
  local tw = textW(name, 1); txt(FAC, name, x + 1 + (28 - tw) // 2, y0 + 3, P.white)
  for yy = y0 + 1, y0 + 12 do for xx = x + 1, x + 28 do addL(ACC.main, xx, yy, rgb(body), 0.06) end end
  -- bezel + screen
  rect(FAC, x + 2, y0 + 15, x + 27, y0 + 38, C("#0a0818")); screen(x + 4, y0 + 17, 22, 20, kind)
  emit(ACC.main, x + 15, y0 + 27, kind == "maze" and P.blue or (kind == "race" and P.orange or P.cyan), 0.035, 14)
  -- control panel
  rect(FAC, x - 2, y0 + 41, x + 30, y0 + 47, C("#1c1630")); hline(FAC, x - 2, x + 30, y0 + 41, C("#4a4070")); hline(FAC, x - 2, x + 30, y0 + 48, C(P.out))
  vline(FAC, x + 8, y0 + 37, y0 + 41, C("#1a1a1a")); rect(FAC, x + 7, y0 + 35, x + 9, y0 + 37, C(P.red))
  px(FAC, x + 17, y0 + 43, C(P.yellow)); px(FAC, x + 21, y0 + 43, C(P.cyan)); px(FAC, x + 25, y0 + 44, C(P.pink))
  -- coin door
  rect(FAC, x + 9, y0 + 54, x + 21, y0 + 68, C("#1a1428")); hline(FAC, x + 9, x + 21, y0 + 54, C("#3a3058"))
  for _, cx in ipairs({ x + 12, x + 18 }) do vline(FAC, cx, y0 + 57, y0 + 61, C(P.red)); emit(ACC.main, cx, y0 + 59, P.red, 0.05, 3) end
  SPILL[#SPILL + 1] = { x + 15, 14, kind == "maze" and P.blue or P.cyan }
end
local ICONS = {
  alien = { "..#.....#..", "...#...#...", "..#######..", ".##.###.##.", "###########", "#.#.....#.#", "...##.##..." },
  ghost = { "..####..", ".######.", "##.##.##", "########", "########", "#.#..#.#" },
  joy = { "..##..", "..##..", "...#..", "...#..", "######", "#....#", "######" },
  heart = { ".##.##.", "#######", "#######", ".#####.", "..###..", "...#..." },
}
local function wallIcon(cx, y, name, col)
  local m = ICONS[name]; local w = #m[1] * 2
  for gy = 1, #m do for gx = 1, #m[1] do if m[gy]:sub(gx, gx) == "#" then
    local x0, y0 = cx - w // 2 + (gx - 1) * 2, y + (gy - 1) * 2
    rect(FAC, x0, y0, x0 + 1, y0 + 1, C(col)); emit(ACC.main, x0, y0, col, 0.05, 4)
  end end end
end
local function cabRow(x0, x1, start)
  local x, i = x0, start or 1
  local names, cols = { "alien", "ghost", "joy", "heart" }, { P.green, P.pink, P.cyan, P.red }
  for ix = x0 + 40, x1 - 30, 110 do local k = (ix // 110) % 4 + 1; wallIcon(ix, 150, names[k], cols[k]) end
  while x + 32 <= x1 do cabinet(x, (i - 1) % #GAMES + 1); x = x + 38; i = i + 1 end
end
local function sign(cx, y, s, sc, col, board)
  local tw = textW(s, sc); rect(FAC, cx - tw // 2 - 6, y - 4, cx + tw // 2 + 6, y + 7 * sc + 3, C(board or "#0c0820")); hline(FAC, cx - tw // 2 - 6, cx + tw // 2 + 6, y - 4, C(P.chrome2))
  neonText(FAC, ACC.main, s, cx - tw // 2, y, sc, col, P.white, 0.12)
end

-- ---- entrance (0..200): glass doors to the mall corridor ----
do
  rect(FAC, 20, 150, 180, FLOOR - 1, C(P.chrome2)); rect(FAC, 24, 154, 176, FLOOR - 1, C("#3a3478"))
  for y = 154, FLOOR - 1 do for x = 24, 176 do if dith(x, y, 0.3) then px(FAC, x, y, C("#4a4490")) end end end
  for k = 0, 6 do local sx = 34 + k * 20; rect(FAC, sx, 222, sx + 3, 244, C("#1a1640")); rect(FAC, sx, 216, sx + 3, 220, C("#1a1640")) end   -- shoppers outside
  for _, dx in ipairs({ 24, 62, 100, 138 }) do vline(FAC, dx, 154, FLOOR - 1, C(P.chrome)); vline(FAC, dx + 38, 154, FLOOR - 1, C(P.chrome2)) end
  for i = 0, 60 do if i % 3 ~= 2 then px(FAC, 30 + i, 160 + i, C("#6a64b0")); px(FAC, 110 + i // 2, 160 + i, C("#5a54a0")) end end
  sign(100, 126, "WELCOME", 1, P.cyan)
  for y = 154, FLOOR - 1, 4 do for x = 24, 176, 4 do addL(ACC.main, x, y, rgb("#a0a0ff"), 0.025) end end
end
-- ---- arena 1 (centre 420): TOKENS booth + claw machines ----
cabRow(204, 300, 1)
do
  local x0, x1 = 310, 470
  rect(FAC, x0, 150, x1, FLOOR - 1, C("#1a1238")); hline(FAC, x0, x1, 150, C(P.chrome))
  sign((x0 + x1) // 2, 126, "TOKENS", 2, P.yellow)
  rect(FAC, x0 + 20, 170, x1 - 20, 214, C("#2a2060")); rect(FAC, x0 + 22, 172, x1 - 22, 212, C("#3a3080"))
  for y = 172, 212 do for x = x0 + 22, x1 - 22 do if dith(x, y, 0.2) then px(FAC, x, y, C("#4a40a0")) end end end
  rect(FAC, (x0 + x1) // 2 - 6, 182, (x0 + x1) // 2 + 6, 212, C("#120a24")); disc(FAC, (x0 + x1) // 2, 178, 6, function() return "#120a24" end)   -- attendant
  rect(FAC, x0 + 8, 214, x1 - 8, 220, C("#4a3a2a")); hline(FAC, x0 + 8, x1 - 8, 214, C("#8a6a4a"))
  for k = 0, 5 do local tx = x0 + 30 + k * 18; disc(FAC, tx, 218, 2, function() return P.yellow end) end     -- tokens on the counter
  for y = 222, FLOOR - 2, 6 do hline(FAC, x0 + 4, x1 - 4, y, C("#120a28")) end
  emit(ACC.main, (x0 + x1) // 2, 192, "#8a7aff", 0.06, 40); SPILL[#SPILL + 1] = { (x0 + x1) // 2, 60, "#8a7aff" }
  for _, cx in ipairs({ 486, 538 }) do                                    -- claw machines
    rect(FAC, cx - 1, 140, cx + 45, FLOOR - 1, C(P.out)); rect(FAC, cx, 141, cx + 44, FLOOR - 1, C("#3a0e4a"))
    rect(FAC, cx + 2, 143, cx + 42, 154, C(P.pink)); txt(FAC, "CLAW", cx + 11, 145, P.white)
    rect(FAC, cx + 3, 157, cx + 41, 214, C("#1a1438")); for y = 157, 214 do for x = cx + 3, cx + 41 do if dith(x, y, 0.15) then px(FAC, x, y, C("#2a2458")) end end end
    vline(FAC, cx + 22, 157, 176, C(P.chrome)); hline(FAC, cx + 18, cx + 26, 177, C(P.chrome)); px(FAC, cx + 18, 178, C(P.chrome)); px(FAC, cx + 26, 178, C(P.chrome))
    for k = 1, 9 do disc(FAC, cx + 7 + (k * 13) % 32, 210 - (k % 3) * 5, 4, function(x, y, d) return d < 0.5 and "#ffffff" or pick({ "#ff8ad0", "#8ae0ff", "#ffe48a", "#a0ff8a" }) end) end
    rect(FAC, cx + 3, 216, cx + 41, 222, C("#2a0a3a")); rect(FAC, cx + 30, 228, cx + 40, 240, C(P.out))
    for k = 0, 6 do bx = cx + 2 + k * 7; px(FAC, bx, 142, C("#ffd0f0")); end
    for y = 157, 214, 3 do for x = cx + 3, cx + 41, 3 do addL(ACC.main, x, y, rgb(P.pink), 0.03) end end
  end
end
cabRow(592, 860, 3)
-- ---- arena 2 (centre 1060): HI-SCORES wall + pinballs ----
do
  local x0, x1 = 960, 1160
  rect(FAC, x0, 116, x1, 178, C("#05030c")); rect(FAC, x0 + 3, 119, x1 - 3, 175, C("#0a0618"))
  for x = x0 + 1, x1 - 1, 5 do px(FAC, x, 117, C("#3a2a10")); px(FAC, x, 176, C("#3a2a10")) end
  neonText(FAC, ACC.main, "HI-SCORES", (x0 + x1 - textW("HI-SCORES", 2)) // 2, 122, 2, P.yellow, P.white, 0.10)
  local rows = { { "1ST", "VEEX", "999990", P.pink }, { "2ND", "ROXY", "874200", P.cyan }, { "3RD", "AAA", "500000", P.green }, { "4TH", "BOB", "123450", P.violet } }
  for i, r in ipairs(rows) do local y = 140 + (i - 1) * 9
    neonText(FAC, ACC.main, r[1], x0 + 22, y, 1, r[4], r[4], 0.05); neonText(FAC, ACC.main, r[2], x0 + 62, y, 1, P.white, P.white, 0.04); neonText(FAC, ACC.main, r[3], x1 - 22 - textW(r[3], 1), y, 1, r[4], r[4], 0.05)
  end
  for x = x0 + 1, x1 - 1, 5 do rect(BULBA, x, 116, x, 116, C("#ffe0a0")); emit(ACC.bulbA, x, 116, "#ffd27a", 0.12, 3); rect(BULBB, x + 2, 177, x + 2, 177, C("#ffe0a0")); emit(ACC.bulbB, x + 2, 177, "#ffd27a", 0.12, 3) end
  -- pinball machines (side view): backbox + slanted table on legs
  for _, px0 in ipairs({ 900, 1170 }) do
    for k = 0, 1 do
      local x = px0 + k * 34
      rect(FAC, x + 22, 176, x + 31, 214, C(P.out)); rect(FAC, x + 23, 177, x + 30, 213, C(pick({ "#c82060", "#2060c8", "#20a080" })))
      screen(x + 24, 182, 6, 10, "pong")
      for i = 0, 30 do local yy = 214 + math.floor(i * 6 / 30); rect(FAC, x, yy, x + 31 - i // 2, yy + 3, C("#2a1a40")) end
      line(FAC, x, 214, x + 31, 220, C("#c0a0ff"))
      for _, lx in ipairs({ x + 2, x + 26 }) do vline(FAC, lx, 222, FLOOR - 1, C(P.chrome2)) end
      emit(ACC.main, x + 27, 195, P.pink, 0.04, 10)
    end
  end
  SPILL[#SPILL + 1] = { (x0 + x1) // 2, 90, P.yellow }
end
cabRow(1240, 1520, 5)
-- ---- arena 3 (centre 1660): racing cockpits, air hockey, PRIZES counter ----
do
  for _, rx in ipairs({ 1540, 1612 }) do                     -- sit-down racing cockpits
    rect(FAC, rx - 1, 168, rx + 65, FLOOR - 1, C(P.out)); rect(FAC, rx, 169, rx + 64, FLOOR - 1, C("#c02040"))
    for y = 169, 186 do hline(FAC, rx + (y - 169) // 2, rx + 64, y, C("#e83a5a")) end
    txt(FAC, "TURBO", rx + 18, 172, P.white)
    rect(FAC, rx + 6, 188, rx + 44, 214, C("#0a0818")); screen(rx + 8, 190, 34, 22, "race")
    emit(ACC.main, rx + 25, 200, P.orange, 0.05, 18)
    rect(FAC, rx + 46, 200, rx + 64, 240, C("#1a1020")); rect(FAC, rx + 50, 190, rx + 62, 202, C("#1a1020"))            -- seat
    disc(FAC, rx + 30, 222, 6, function(x, y, d) return d > 0.7 and "#2a2a2a" or nil end)                               -- wheel
    for k = 0, 6 do px(FAC, rx + 2 + k * 9, 250, C(P.yellow)) end
  end
  -- air hockey table (low, lit rim)
  local ax0, ax1 = 1692, 1790
  rect(FAC, ax0, 230, ax1, 236, C("#1a3a5a")); hline(FAC, ax0, ax1, 229, C(P.cyan)); for x = ax0, ax1 do emit(ACC.main, x, 229, P.cyan, 0.015, 3) end
  for _, lx in ipairs({ ax0 + 4, ax1 - 4 }) do rect(FAC, lx - 1, 236, lx + 1, FLOOR - 1, C(P.chrome2)) end
  rect(FAC, ax0 + 30, 226, ax0 + 34, 228, C(P.red)); rect(FAC, ax1 - 30, 226, ax1 - 26, 228, C(P.yellow))
  -- PRIZES counter with shelves of plush toys
  local qx0, qx1 = 1800, 1980
  sign((qx0 + qx1) // 2, 126, "PRIZES", 2, P.green)
  for _, sy in ipairs({ 156, 178 }) do hline(FAC, qx0, qx1, sy, C(P.chrome2)); for k = 0, 10 do disc(FAC, qx0 + 8 + k * 16, sy - 6, 6, function(x, y, d) return d < 0.45 and "#fff0f0" or (({ "#ff8ad0", "#8ae0ff", "#ffe48a", "#a0ff8a", "#c08aff" })[k % 5 + 1]) end) end end
  rect(FAC, qx0, 200, qx1, FLOOR - 1, C("#2a2050")); rect(FAC, qx0 + 4, 204, qx1 - 4, 232, C("#3a3478"))
  for k = 0, 14 do local gx = qx0 + 10 + k * 11; rect(FAC, gx, 222, gx + 5, 230, C(pick({ P.yellow, P.pink, P.cyan, P.green, P.orange }))) end
  hline(FAC, qx0, qx1, 200, C(P.chrome))
  for y = 204, 232, 3 do for x = qx0 + 4, qx1 - 4, 3 do addL(ACC.main, x, y, rgb("#c0b0ff"), 0.03) end end
  SPILL[#SPILL + 1] = { (qx0 + qx1) // 2, 80, P.green }
end
cabRow(1992, 2240, 2)
-- ---- boss (centre 2420): LASER ZONE portal, lasers in bulbsA / bulbsB ----
do
  local cx = 2420; local x0, x1 = cx - 130, cx + 130
  rect(FAC, x0, TOP, x1, FLOOR - 1, C("#080414"))
  for y = TOP, FLOOR - 1 do for x = x0, x1 do if ((x - x0) % 16 == 0 or (y - TOP) % 16 == 0) then px(FAC, x, y, C("#14082a")) end end end
  -- hexagonal portal frame
  local hx0, hx1, hy0, hy1 = cx - 70, cx + 70, 138, FLOOR - 1
  local function frame(col, w)
    for y = hy0, hy1 do
      local t = (y - hy0) / (hy1 - hy0); local inset = math.floor(math.abs(t - 0.35) < 0.35 and 0 or 0) + (y < hy0 + 24 and (24 - (y - hy0)) or 0)
      for k = 0, w - 1 do px(FAC, hx0 + inset + k, y, C(col)); px(FAC, hx1 - inset - k, y, C(col)) end
      if y % 2 == 0 then emit(ACC.main, hx0 + inset, y, col, 0.05, 6); emit(ACC.main, hx1 - inset, y, col, 0.05, 6) end
    end
    for x = hx0 + 24, hx1 - 24 do for k = 0, w - 1 do px(FAC, x, hy0 + k, C(col)) end; if x % 2 == 0 then emit(ACC.main, x, hy0, col, 0.05, 6) end end
  end
  frame(P.cyan, 3)
  for y = hy0 + 3, hy1 do for x = hx0 + 3, hx1 - 3 do
    local inset = (y < hy0 + 24) and (24 - (y - hy0)) or 0
    if x > hx0 + inset + 2 and x < hx1 - inset - 2 then px(FAC, x, y, C(dith(x, y, (y - hy0) / 200) and "#0a0a20" or "#06061a")) end
  end end
  neonText(FAC, ACC.main, "LASER ZONE", cx - textW("LASER ZONE", 2) // 2, TOP + 6, 2, P.red, P.white, 0.14)
  -- chevrons on both sides
  for k = 0, 4 do for _, sx in ipairs({ x0 + 14, x1 - 34 }) do local y = 150 + k * 18
    for i = 0, 8 do px(FAC, sx + i, y + i, C(P.yellow)); px(FAC, sx + 18 - i, y + i, C(P.yellow)) end
  end end
  -- lasers: two alternating patterns of beams across the portal and the wall
  local function beam(im, acc, xa, ya, xb, yb, col)
    local n = math.max(math.abs(xb - xa), math.abs(yb - ya))
    for i = 0, n do local x, y = math.floor(xa + (xb - xa) * i / n + 0.5), math.floor(ya + (yb - ya) * i / n + 0.5); px(im, x, y, C(P.white)); if i % 2 == 0 then emit(acc, x, y, col, 0.09, 3) end end
  end
  for k = 0, 4 do beam(BULBA, ACC.bulbA, hx0 + 6, 150 + k * 22, hx1 - 6, 140 + k * 22 + 18, P.red) end
  for k = 0, 4 do beam(BULBB, ACC.bulbB, hx0 + 6, 160 + k * 20, hx1 - 6, 166 + k * 20 - 18, P.green) end
  beam(BULBA, ACC.bulbA, x0 + 4, 110, x0 + 60, FLOOR - 4, P.red); beam(BULBB, ACC.bulbB, x1 - 4, 110, x1 - 60, FLOOR - 4, P.green)
  -- posters LADY LASER
  for _, pxx in ipairs({ x0 + 36, x1 - 92 }) do
    rect(FAC, pxx, 168, pxx + 56, 226, C(P.cyan)); rect(FAC, pxx + 2, 170, pxx + 54, 224, C("#0a1430"))
    txt(FAC, "LADY", pxx + 6, 174, P.pink); txt(FAC, "LASER", pxx + 6, 184, P.pink)
    disc(FAC, pxx + 40, 206, 7, function(x, y, d) return (y < 203) and "#ff9ae9" or "#f0c0a0" end); rect(FAC, pxx + 34, 214, pxx + 46, 224, C(P.cyan))
    emit(ACC.main, pxx + 28, 196, P.cyan, 0.04, 22)
  end
  SPILL[#SPILL + 1] = { cx, 70, P.cyan }
end
cabRow(2560, 3540, 4)
-- INSERT COIN blinking on one cabinet screen near arena 1 (flicker layer)
do
  local x = 204 + 38 * 1; local sx, sy = x + 4, 182 + 17
  rect(FAC, sx, sy, sx + 21, sy + 19, C("#06061a"))
  neonText(FAC, nil, "OUT", sx + 3, sy + 2, 1, "#2a2a3a", nil, 0, true)
  txt(FLICK, "INS", sx + 2, sy + 2, P.yellow); txt(FLICK, "COIN", sx + 0, sy + 11, P.yellow); emit(ACC.flick, sx + 10, sy + 10, P.yellow, 0.05, 12)
end

-- ================================================================== FLOOR: cosmic arcade carpet
do
  local TILE = 64
  local motifs = {}
  local tr = seed; seed = 777
  for k = 1, 8 do motifs[k] = { ri(2, TILE - 3), ri(2, TILE - 3), ri(1, 5), pick({ "#8a2a8a", "#2a7a92", "#8a7a2a", "#2a8a5a", "#5a3aa8" }) } end
  seed = tr
  for y = FLOOR, HH - 1 do for x = 0, WW - 1 do
    local c = P.car1; if dith(x, y, 0.15) then c = P.car0 end; if ((x * 7 + y * 13) % 23 == 0) then c = P.car2 end
    FLO:drawPixel(x, y, C(c))
  end end
  for tx = 0, WW - 1, TILE do for ty = FLOOR + 4, HH - 1, TILE do
    for _, m in ipairs(motifs) do
      local x, y, kind, col = tx + m[1], ty + m[2], m[3], m[4]
      local cc = C(col)
      if kind == 1 then px(FLO, x, y, cc); px(FLO, x + 1, y, cc); px(FLO, x - 1, y, cc); px(FLO, x, y + 1, cc); px(FLO, x, y - 1, cc)           -- star
      elseif kind == 2 then for i = 0, 7 do px(FLO, x + i, y + ((i // 2) % 2 == 0 and 0 or 2), cc) end                                        -- zigzag
      elseif kind == 3 then for a = 0, 330, 30 do local t = math.rad(a); px(FLO, x + math.floor(math.cos(t) * 3 + 0.5), y + math.floor(math.sin(t) * 3 + 0.5), cc) end   -- ring
      elseif kind == 4 then for i = 0, 6 do px(FLO, x + i, y + math.floor(math.sin(i * 0.9) * 1.5 + 0.5), cc) end                             -- squiggle
      else for i = -3, 3 do px(FLO, x + i, y, cc) end; px(FLO, x, y - 1, cc); px(FLO, x - 1, y + 1, cc); px(FLO, x + 1, y + 1, cc) end     -- planet + ring
    end
  end end
  for y = FLOOR, HH - 1 do for x = 0, WW - 1 do if pc.rgbaR(FLO:getPixel(x, y)) + pc.rgbaG(FLO:getPixel(x, y)) > 70 and dith(x, y, 0.15 + (y - FLOOR) / 160) then FLO:drawPixel(x, y, C(P.car2)) end end end   -- fade motifs near the camera
  for _, s in ipairs(SPILL) do cone(ACC.main, s[1], FLOOR, FLOOR + 40, s[2], s[2] + 14, s[3], 0.12) end
end

-- ================================================================== save
local GLOW = bake(ACC.main, nil, 2.2)
bake(ACC.flick, FLICK, 1.8); bake(ACC.bulbA, BULBA, 1.6); bake(ACC.bulbB, BULBB, 1.6)
local spr = saveLayers(out, { { "sky", SKY }, { "far", FAR }, { "mid", MID }, { "floor", FLO }, { "facade", FAC }, { "glow", GLOW }, { "flicker", FLICK }, { "bulbsA", BULBA }, { "bulbsB", BULBB } },
  { glow = true, flicker = true, bulbsA = true, bulbsB = true })
if metaOut then
  local f = io.open(metaOut, "w")
  f:write(string.format('{"width":%d,"height":%d,"floor":%d,"farW":%d,"midW":%d,"far":0.2,"mid":0.5,"facadeH":%d,"stops":[260,900,1500,2260],"antennas":[]}', WW, HH, FLOOR, FARW, MIDW, FLOOR))
  f:close()
end
print("level2: " .. #spr.layers .. " layers -> " .. out)
