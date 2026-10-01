-- VEEXING FORCE - STAGE 4 "CYBER TOWER" backdrop, drawn pixel by pixel in Aseprite (batch, see tools/make_level_bg.py 4).
-- A high floor of the megacorp tower at night. Floor-to-ceiling windows show the city far below; the ceiling (light strips) and the
-- technical wall band frame the view so it reads "indoors". Cold palette (navy / cyan), red kept for MR. CHROME.
-- Layers: sky (static: night sky + wireframe moon) | far x0.2 (megacity below, blinking antennas) | mid x0.5 (closer towers, hologram ads)
--         facade x1 (window frames + rooms) | floor x1 (polished metal tiles)
--         glow / flicker ("ACCESS DENIED") / bulbsA-B (server LEDs + CRT wall: face <-> static), ADDITIVE.
-- Level design, one landmark per arena (centre = stop + 160):
--   440 SECURITY lobby (SYNTH CORP hologram, turnstiles, CCTV wall) | 1040 SERVER FARM | 1660 LAB (cryo pods with androids, robot arm)
--   2260 DATA CORE (hologram globe, consoles) | boss 2820 MR. CHROME office (CRT wall, THE MACHINE)
local out = app.params["out"]
local metaOut = app.params["meta"]
WW, HH, FLOOR = 3940, 360, 258
local FARW, MIDW = 1190, 1990
dofile(app.params["lib"])
seed = 4004

local P = {
  out = "#02040c",
  k0 = "#01020a", k1 = "#030818", k2 = "#06102a", k3 = "#0a1a3a", k4 = "#0e2a4a", k5 = "#123a5a",
  far0 = "#0a1630", far1 = "#0e1c3a", far2 = "#142648",
  mid0 = "#060c1e", mid1 = "#0a1428", mid2 = "#10203a",
  steel0 = "#0c1424", steel1 = "#1a2840", steel2 = "#2a3c5a", steel3 = "#5a7aa0",
  wall0 = "#070c1a", wall1 = "#0c1426", wall2 = "#121e36",
  cyan = "#27f0ff", pink = "#ff2fd0", yellow = "#ffe44d", green = "#3dffa0", orange = "#ff6a3d", violet = "#8b5cff", red = "#ff2a4d", white = "#f4f0ff",
}
local SKY, FAR, MID, FAC, FLO = newImg(), newImg(), newImg(), newImg(), newImg()
local FLICK, BULBA, BULBB = newImg(), newImg(), newImg()
local CEIL, SILL = 34, 172            -- window zone between the ceiling and the sill
local SPILL, ANT = {}, {}

local function disc(im, cx, cy, r, colf)
  for y = math.floor(cy - r), math.ceil(cy + r) do for x = math.floor(cx - r), math.ceil(cx + r) do
    local d = math.sqrt((x - cx) ^ 2 + (y - cy) ^ 2); if d <= r then local c = colf(x, y, d / r); if c then px(im, x, y, C(c)) end end
  end end
end
local function line(im, x0, y0, x1, y1, c)
  local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0), 1)
  for i = 0, n do px(im, math.floor(x0 + (x1 - x0) * i / n + 0.5), math.floor(y0 + (y1 - y0) * i / n + 0.5), c) end
end
local function txt(im, s, x, y, col) neonText(im, nil, s, x, y, 1, col, col, 0) end
local function glowText(s, x, y, sc, col, g) neonText(FAC, ACC.main, s, x, y, sc, col, P.white, g or 0.10) end

-- ================================================================== SKY: night, wireframe moon, scan lines
do
  vgrad(SKY, 0, 0, 639, FLOOR - 1, { P.k0, P.k1, P.k2, P.k3, P.k4, P.k5 }, 3)
  for i = 1, 120 do local x, y = ri(0, 639), ri(0, 140); px(SKY, x, y, C(rnd() > 0.8 and "#a0e0ff" or "#3a5a8a")) end
  local cx, cy, r = 180, 76, 40
  disc(SKY, cx, cy, r, function(x, y, d) return dith(x, y, 0.25) and "#0a2a4a" or nil end)
  for a = 0, 359 do local t = math.rad(a); px(SKY, math.floor(cx + math.cos(t) * r + 0.5), math.floor(cy + math.sin(t) * r + 0.5), C(P.cyan)) end
  for k = -3, 3 do local yy = cy + k * 10; local hw = math.sqrt(math.max(0, r * r - (yy - cy) ^ 2)); for x = math.floor(cx - hw), math.floor(cx + hw) do if x % 2 == 0 then px(SKY, x, yy, C("#1a8aa0")) end end end
  for k = -2, 2 do local w = math.abs(k) * 0.33; for a = 0, 359, 2 do local t = math.rad(a); local x = cx + math.cos(t) * r * (1 - w) * (k < 0 and -1 or 1) * math.abs(math.cos(t) ~= 0 and 1 or 1); px(SKY, math.floor(cx + math.sin(t) * r * (k / 3)), math.floor(cy + math.cos(t) * r), C("#1a8aa0")) end end
  for y = 0, FLOOR - 1, 4 do for x = 0, 639 do if dith(x, y, 0.08) then px(SKY, x, y, C("#0e3a5a")) end end end
  -- distant city glow on the horizon
  for y = 200, FLOOR - 1 do for x = 0, 639 do if dith(x, y, (y - 200) / 70) then px(SKY, x, y, C("#1a4a6a")) end end end
end

-- ================================================================== FAR: the megacity below (towers, light bands, antennas, traffic lanes)
do
  local x = 0
  while x < FARW do
    local w, h = ri(18, 50), ri(80, 210); local top = FLOOR - h
    for y = top, FLOOR - 1 do for xx = x, x + w - 1 do px(FAR, xx, y, C(dith(xx, y, (y - top) / h - 0.2) and P.far1 or P.far0)) end end
    vline(FAR, x, top, FLOOR - 1, C(P.far2))
    local band = pick({ P.cyan, P.pink, P.violet, "#3a8aff" })
    if rnd() > 0.5 then for y = top + 4, FLOOR - 1, 9 do hline(FAR, x + 2, x + w - 3, y, C(band, 120)) end
    else for xx = x + 3, x + w - 4, 5 do for y = top + 4, FLOOR - 1, 3 do if rnd() > 0.7 then px(FAR, xx, y, C("#6ab0e0")) end end end end
    if rnd() > 0.5 then local ax = x + w // 2; vline(FAR, ax, top - ri(8, 24), top, C(P.far2)); ANT[#ANT + 1] = { ax, top - 12 } end
    if rnd() > 0.7 then rect(FAR, x + 2, top - 4, x + w - 3, top - 1, C(P.far2)) end
    x = x + w + ri(1, 6)
  end
  for _, ly in ipairs({ 150, 186 }) do for x = 0, FARW - 1, 7 do if rnd() > 0.35 then px(FAR, x, ly + (x // 7) % 2, C(rnd() > 0.5 and "#ffe0a0" or "#ff6a6a")) end end end   -- air traffic
end

-- ================================================================== MID: closer towers with hologram billboards
do
  local x = 0
  local ads = { "SYNTH", "NET", "CHROME", "0101", "CORP" }
  local ai = 0
  while x < MIDW do
    local w, h = ri(70, 130), ri(150, 230); local top = FLOOR - h
    for y = top, FLOOR - 1 do for xx = x, x + w - 1 do px(MID, xx, y, C(dith(xx, y, 0.2) and P.mid1 or P.mid0)) end end
    vline(MID, x, top, FLOOR - 1, C(P.mid2)); vline(MID, x + w - 1, top, FLOOR - 1, C("#1a3a5a")); hline(MID, x, x + w - 1, top, C("#2a5a7a"))
    for y = top + 6, FLOOR - 1, 6 do for xx = x + 4, x + w - 6, 6 do if rnd() > 0.82 then rect(MID, xx, y, xx + 2, y + 2, C(rnd() > 0.5 and "#1a5a7a" or "#4a3a7a")) end end end
    if rnd() > 0.4 then   -- hologram billboard (translucent)
      ai = ai + 1; local s = ads[(ai - 1) % #ads + 1]; local col = pick({ P.cyan, P.pink, P.green })
      local bw = textW(s, 2) + 16; local bx, by = x + math.max(4, (w - bw) // 2), top + 20
      for yy = by, by + 30 do for xx = bx, bx + bw do if dith(xx, yy, 0.22) then px(MID, xx, yy, C(col, 90)) end end end
      for xx = bx, bx + bw do px(MID, xx, by, C(col, 200)); px(MID, xx, by + 30, C(col, 200)) end
      neonText(MID, nil, s, bx + 8, by + 8, 2, col, P.white, 0)
      for yy = by, by + 30, 2 do for xx = bx, bx + bw do if pc.rgbaA(MID:getPixel(xx, yy)) > 200 and dith(xx, yy, 0.5) then px(MID, xx, yy, C(col, 140)) end end end   -- holo scanlines
    end
    x = x + w + ri(20, 70)
  end
  for _, ly in ipairs({ 96, 128 }) do for x = 0, MIDW - 1, 13 do if rnd() > 0.5 then rect(MID, x, ly, x + 3, ly + 1, C("#2a3a5a")); px(MID, x + 3, ly, C(rnd() > 0.5 and "#ffe0a0" or "#ff4a4a")) end end end   -- flying cars
end

-- ================================================================== FACADE: ceiling, windows, technical wall band
-- ceiling with light strips
for y = 0, CEIL - 1 do for x = 0, WW - 1 do px(FAC, x, y, C(dith(x, y, y / CEIL * 0.6) and P.steel1 or P.steel0)) end end
for x = 0, WW - 1, 64 do vline(FAC, x, 0, CEIL - 1, C(P.wall0)) end
for x = 10, WW - 1, 64 do for k = 0, 40 do px(FAC, x + k, CEIL - 6, C("#bff8ff")); if k % 3 == 0 then emit(ACC.main, x + k, CEIL - 6, P.cyan, 0.03, 5) end end; cone(ACC.main, x + 20, CEIL - 4, SILL, 18, 40, "#a0f0ff", 0.025) end
hline(FAC, 0, WW - 1, CEIL - 1, C(P.steel3)); hline(FAC, 0, WW - 1, CEIL, C(P.steel2))
-- window zone: tinted glass + mullions + transom (glass = translucent pixels so the city shows through)
for y = CEIL + 1, SILL - 1 do for x = 0, WW - 1 do
  if dith(x, y, 0.10) then px(FAC, x, y, C("#2a6a8a", 70)) end
end end
for k = 0, WW // 96 do
  local mx = k * 96
  rect(FAC, mx - 3, CEIL, mx + 3, SILL, C(P.steel1)); vline(FAC, mx - 3, CEIL, SILL, C(P.steel3)); vline(FAC, mx + 3, CEIL, SILL, C(P.steel0))
  for i = 0, 40 do if i % 4 ~= 3 then px(FAC, mx + 10 + i, CEIL + 10 + i * 2, C("#6ab0d0", 90)); px(FAC, mx + 18 + i, CEIL + 10 + i * 2, C("#6ab0d0", 50)) end end   -- reflections
end
hline(FAC, 0, WW - 1, 104, C(P.steel1)); hline(FAC, 0, WW - 1, 105, C(P.steel0))
-- sill + technical wall band (y SILL..FLOOR)
for y = SILL, FLOOR - 1 do for x = 0, WW - 1 do
  local c = P.wall1; if (x % 48) == 0 then c = P.wall0 elseif dith(x, y, 0.08) then c = P.wall2 end
  px(FAC, x, y, C(c))
end end
rect(FAC, 0, SILL, WW - 1, SILL + 3, C(P.steel2)); hline(FAC, 0, WW - 1, SILL, C(P.steel3))
for x = 0, WW - 1 do px(FAC, x, 214, C("#0e4a6a")); if x % 4 == 0 then emit(ACC.main, x, 214, P.cyan, 0.008, 3) end end
for x = 20, WW - 1, 48 do rect(FAC, x, 226, x + 18, 236, C(P.wall0)); for gx = x + 2, x + 16, 3 do vline(FAC, gx, 228, 234, C(P.steel1)) end end   -- vent grilles
rect(FAC, 0, FLOOR - 4, WW - 1, FLOOR - 1, C(P.steel0)); hline(FAC, 0, WW - 1, FLOOR - 4, C(P.cyan)); for x = 0, WW - 1, 2 do emit(ACC.main, x, FLOOR - 4, P.cyan, 0.01, 2) end

-- solid full-height wall section (rooms) between x0..x1
local function solid(x0, x1, col)
  for y = CEIL + 1, FLOOR - 1 do for x = x0, x1 do px(FAC, x, y, C(dith(x, y, 0.06) and P.wall2 or (col or P.wall1))) end end
  vline(FAC, x0, CEIL, FLOOR - 1, C(P.steel2)); vline(FAC, x1, CEIL, FLOOR - 1, C(P.steel0))
end
local function monitor(x, y, w, h, kind, im)
  im = im or FAC
  rect(im, x - 1, y - 1, x + w, y + h, C(P.steel1)); rect(im, x, y, x + w - 1, y + h - 1, C("#020a14"))
  if kind == "graph" then for i = 0, w - 3 do local v = math.floor((math.sin(i * 0.5) + math.sin(i * 0.17) + 2) / 4 * (h - 4)); px(im, x + 1 + i, y + h - 2 - v, C(P.green)) end
  elseif kind == "code" then for yy = y + 1, y + h - 2, 2 do local l = ri(2, w - 3); hline(im, x + 1, x + l, yy, C(pick({ "#2ae0a0", "#1a8a6a" }))) end
  elseif kind == "cam" then for yy = y, y + h - 1 do for xx = x, x + w - 1 do if dith(xx, yy, 0.35) then px(im, xx, yy, C("#1a3a3a")) end end end; rect(im, x + w // 2 - 1, y + h - 5, x + w // 2 + 1, y + h - 2, C("#4a8a7a")); px(im, x + 1, y + 1, C(P.red))
  elseif kind == "radar" then for a = 0, 359, 10 do local t = math.rad(a); px(im, x + w // 2 + math.floor(math.cos(t) * (h // 2 - 1)), y + h // 2 + math.floor(math.sin(t) * (h // 2 - 1)), C(P.green)) end; line(im, x + w // 2, y + h // 2, x + w - 2, y + 2, C(P.green))
  end
  emit(ACC.main, x + w // 2, y + h // 2, kind == "cam" and "#4a9a8a" or P.green, 0.03, math.max(w, h) // 2 + 4)
end

-- ---- elevators (0..300) ----
solid(0, 300)
for _, ex in ipairs({ 40, 170 }) do
  rect(FAC, ex - 4, 110, ex + 84, FLOOR - 1, C(P.steel1)); rect(FAC, ex, 116, ex + 80, FLOOR - 1, C(P.steel2))
  vline(FAC, ex + 40, 116, FLOOR - 1, C(P.steel0)); for x = ex + 4, ex + 76, 6 do vline(FAC, x, 120, FLOOR - 4, C("#3a5070")) end
  rect(FAC, ex + 24, 88, ex + 56, 102, C("#020610")); glowText("88", ex + 30, 92, 1, P.orange, 0.12); px(FAC, ex + 46, 92, C(P.orange)); px(FAC, ex + 45, 93, C(P.orange)); px(FAC, ex + 47, 93, C(P.orange))
  rect(FAC, ex + 88, 170, ex + 92, 180, C(P.steel2)); px(FAC, ex + 90, 172, C(P.cyan)); px(FAC, ex + 90, 177, C(P.cyan))
end
-- ---- arena 1 SECURITY (300..600, centre 440) ----
do
  -- SYNTH CORP hologram floating in front of the window
  local hx, hy = 446, 60
  for k = 0, 24 do local r = 22 - k * 0.3; for a = 0, 359, 6 do local t = math.rad(a); if (a // 6 + k) % 3 == 0 then px(FAC, math.floor(hx + math.cos(t) * r * 1.6), math.floor(hy + math.sin(t) * r * 0.5 + k * 0.2), C(P.cyan, 110)) end end end
  glowText("SYNTH CORP", hx - textW("SYNTH CORP", 2) // 2, hy + 14, 2, P.cyan, 0.12)
  for y = hy + 32, SILL - 2 do local hw = (y - hy - 32) * 0.4; for x = math.floor(hx - hw), math.floor(hx + hw) do if dith(x, y, 0.12) then px(FAC, x, y, C(P.cyan, 70)) end end end
  -- reception desk
  rect(FAC, 380, 200, 516, FLOOR - 1, C(P.steel1)); hline(FAC, 380, 516, 200, C(P.steel3)); for x = 380, 516 do px(FAC, x, 206, C(P.cyan)); if x % 3 == 0 then emit(ACC.main, x, 206, P.cyan, 0.02, 3) end end
  monitor(400, 186, 16, 12, "code"); monitor(480, 186, 16, 12, "graph")
  -- CCTV wall on a solid panel
  solid(526, 598)
  for r = 0, 3 do for c = 0, 2 do monitor(532 + c * 22, 64 + r * 18, 18, 14, "cam") end end
  -- turnstiles with laser gate
  for k = 0, 2 do local tx = 312 + k * 22; rect(FAC, tx, 214, tx + 6, FLOOR - 1, C(P.steel2)); hline(FAC, tx, tx + 6, 214, C(P.steel3)); for x = tx + 7, tx + 20, 2 do px(FAC, x, 226, C(P.red)); emit(ACC.main, x, 226, P.red, 0.03, 3) end end
  -- ACCESS DENIED sign: unlit tubes + lit version in the flicker layer
  local sx, sy = 312, 190
  rect(FAC, sx - 3, sy - 3, sx + textW("ACCESS DENIED", 1) + 3, sy + 9, C("#0a0208"))
  neonText(FAC, nil, "ACCESS DENIED", sx, sy, 1, "#3a1018", nil, 0, true)
  neonText(FLICK, ACC.flick, "ACCESS DENIED", sx, sy, 1, P.red, "#ffb0b0", 0.14)
  SPILL[#SPILL + 1] = { 446, 80, P.cyan }
end
-- ---- office desks (600..860) ----
for k = 0, 3 do local dx = 620 + k * 60; rect(FAC, dx, 220, dx + 44, 224, C(P.steel2)); vline(FAC, dx + 4, 224, FLOOR - 1, C(P.steel1)); vline(FAC, dx + 40, 224, FLOOR - 1, C(P.steel1)); monitor(dx + 12, 204, 20, 14, k % 2 == 0 and "code" or "graph"); rect(FAC, dx + 18, 230, dx + 28, 248, C("#0a1020")) end
-- ---- arena 2 SERVER FARM (860..1240, centre 1040) ----
do
  solid(860, 1240, P.wall0)
  glowText("SERVER FARM", 1050 - textW("SERVER FARM", 2) // 2, 44, 2, P.green, 0.10)
  for k = 0, 8 do
    local rx = 872 + k * 40
    rect(FAC, rx, 66, rx + 32, FLOOR - 1, C("#04080f")); rect(FAC, rx + 1, 67, rx + 31, FLOOR - 2, C("#0a1222")); vline(FAC, rx + 31, 67, FLOOR - 2, C(P.steel2))
    for y = 72, FLOOR - 10, 6 do
      hline(FAC, rx + 3, rx + 29, y, C("#16243a")); hline(FAC, rx + 3, rx + 29, y + 4, C("#04080f"))
      for lx = rx + 4, rx + 24, 4 do
        local c = pick({ P.green, P.cyan, P.green, P.orange, "#1a3a2a" })
        px(FAC, lx, y + 2, C("#0a2a1a"))
        if c ~= "#1a3a2a" then local im, acc = rnd() > 0.5 and BULBA or BULBB, nil; acc = (im == BULBA) and ACC.bulbA or ACC.bulbB; px(im, lx, y + 2, C(c)); emit(acc, lx, y + 2, c, 0.05, 2) end
      end
    end
  end
  for x = 860, 1240 do px(FAC, x, 62, C(P.steel3)) end                      -- cable tray
  for k = 0, 30 do local x = 870 + k * 12; line(FAC, x, 62, x + 6, 66, C(P.steel1)) end
  for y = FLOOR - 26, FLOOR - 1 do for x = 860, 1240 do if dith(x, y, (y - FLOOR + 26) / 40) then px(FAC, x, y, C("#2a4a6a", 120)) end end end   -- cold mist
  SPILL[#SPILL + 1] = { 1050, 180, P.green }
end
-- ---- maintenance drone dock (1240..1480) ----
do
  rect(FAC, 1300, 196, 1420, 202, C(P.steel2)); hline(FAC, 1300, 1420, 196, C(P.steel3))
  for k = 0, 2 do local dx = 1316 + k * 38; rect(FAC, dx, 182, dx + 20, 192, C("#1a2a40")); hline(FAC, dx - 6, dx + 26, 180, C(P.steel3)); px(FAC, dx + 10, 186, C(P.red)); emit(ACC.main, dx + 10, 186, P.red, 0.05, 4) end
end
-- ---- arena 3 LAB (1480..1840, centre 1660): cryo pods + robot arm ----
do
  solid(1480, 1840, P.wall0)
  glowText("LAB 04", 1660 - textW("LAB 04", 2) // 2, 44, 2, P.cyan, 0.10)
  for k = 0, 3 do
    local px0 = 1500 + k * 82; local cx = px0 + 30
    rect(FAC, px0, 64, px0 + 60, 74, C(P.steel2)); rect(FAC, px0, FLOOR - 22, px0 + 60, FLOOR - 1, C(P.steel2)); hline(FAC, px0, px0 + 60, 64, C(P.steel3))
    for y = 75, FLOOR - 23 do for x = px0 + 6, px0 + 54 do
      local c = dith(x, y, 0.5) and "#0a4a3a" or "#0e5a46"; if (x == px0 + 6 or x == px0 + 54) then c = "#6ae0c0" end
      px(FAC, x, y, C(c))
    end end
    -- android silhouette floating in the liquid
    disc(FAC, cx, 98, 8, function() return "#06201a" end); rect(FAC, cx - 9, 108, cx + 9, 150, C("#06201a")); rect(FAC, cx - 14, 110, cx - 10, 144, C("#06201a")); rect(FAC, cx + 10, 110, cx + 14, 144, C("#06201a"))
    rect(FAC, cx - 8, 151, cx - 3, FLOOR - 30, C("#06201a")); rect(FAC, cx + 3, 151, cx + 8, FLOOR - 30, C("#06201a"))
    rect(FAC, cx - 5, 96, cx + 5, 98, C(k == 2 and P.red or P.cyan))
    for b = 1, 8 do local bx, by = px0 + ri(10, 50), ri(80, FLOOR - 30); px(FAC, bx, by, C("#9affe0")); px(FAC, bx, by - 1, C("#4ac0a0")) end
    for y = 75, FLOOR - 23, 3 do emit(ACC.main, px0 + 30, y, P.green, 0.012, 22) end
    rect(FAC, px0 + 22, FLOOR - 18, px0 + 38, FLOOR - 10, C("#020a14")); txt(FAC, "0" .. (k + 1), px0 + 25, FLOOR - 17, P.green)
  end
  SPILL[#SPILL + 1] = { 1660, 170, P.green }
end
-- robot arm by the lab door
do
  local bx = 1870
  rect(FAC, bx - 8, FLOOR - 12, bx + 8, FLOOR - 1, C(P.steel2)); line(FAC, bx, FLOOR - 12, bx + 18, 180, C(P.steel3)); line(FAC, bx + 1, FLOOR - 12, bx + 19, 180, C(P.steel2))
  disc(FAC, bx + 18, 180, 4, function() return P.steel2 end); line(FAC, bx + 18, 180, bx + 40, 196, C(P.steel3)); line(FAC, bx + 18, 181, bx + 40, 197, C(P.steel2))
  rect(FAC, bx + 40, 194, bx + 46, 200, C(P.yellow)); for x = bx - 8, bx + 8, 4 do px(FAC, x, FLOOR - 12, C(P.yellow)) end
end
-- ---- arena 4 DATA CORE (2080..2440, centre 2260) ----
do
  -- hologram globe floating in front of the window
  local gx, gy, r = 2260, 96, 44
  for a = 0, 359, 3 do local t = math.rad(a); px(FAC, math.floor(gx + math.cos(t) * r + 0.5), math.floor(gy + math.sin(t) * r + 0.5), C(P.cyan, 220)); if a % 6 == 0 then emit(ACC.main, math.floor(gx + math.cos(t) * r), math.floor(gy + math.sin(t) * r), P.cyan, 0.04, 4) end end
  for k = -3, 3 do local yy = gy + k * 12; local hw = math.sqrt(math.max(0, r * r - (yy - gy) ^ 2)); for x = math.floor(gx - hw), math.floor(gx + hw), 2 do px(FAC, x, yy, C(P.cyan, 150)) end end
  for k = -3, 3 do local sx = k / 3.5; for a = 0, 359, 4 do local t = math.rad(a); px(FAC, math.floor(gx + math.sin(t) * r * sx), math.floor(gy + math.cos(t) * r), C(P.cyan, 130)) end end
  for k = 1, 14 do local t = rnd() * 6.28; local rr = r * rnd(); disc(FAC, gx + math.cos(t) * rr, gy + math.sin(t) * rr * 0.9, 1.5, function() return P.pink end) end   -- data points
  for y = gy + r, SILL + 30 do local hw = (SILL + 30 - y) * 0.15 + 4; for x = math.floor(gx - hw), math.floor(gx + hw) do if dith(x, y, 0.15) then px(FAC, x, y, C(P.cyan, 80)) end end end
  rect(FAC, gx - 24, 202, gx + 24, FLOOR - 1, C(P.steel1)); hline(FAC, gx - 24, gx + 24, 202, C(P.steel3)); disc(FAC, gx, 204, 10, function(x, y, d) return d > 0.6 and P.cyan or nil end)
  emit(ACC.main, gx, gy, P.cyan, 0.05, 50)
  -- operator consoles + big screens
  for _, cx in ipairs({ 2110, 2350 }) do
    rect(FAC, cx, 212, cx + 70, FLOOR - 1, C(P.steel1)); line(FAC, cx, 212, cx + 70, 206, C(P.steel3))
    monitor(cx + 6, 186, 26, 18, "graph"); monitor(cx + 38, 186, 26, 18, "radar")
    for x = cx + 4, cx + 66, 3 do px(FAC, x, 216, C(pick({ P.cyan, P.green, P.orange, P.pink }))) end
  end
  glowText("DATA CORE", 2260 - textW("DATA CORE", 2) // 2, 44, 2, P.violet, 0.10)
  SPILL[#SPILL + 1] = { 2260, 150, P.cyan }
end
-- ---- boss MR. CHROME office (2620..3020, centre 2820): CRT wall face <-> static ----
do
  solid(2620, 3020, "#0e0610")
  for y = CEIL + 1, FLOOR - 1 do for x = 2620, 3020 do if (x - 2620) % 40 == 0 then px(FAC, x, y, C("#1a0a18")) end end end
  glowText("THE MACHINE", 2820 - textW("THE MACHINE", 2) // 2, 42, 2, P.red, 0.14)
  local FACE = { "..#####..", ".#.....#.", "#..#.#..#", "#.......#", "#.#####.#", "#..###..#", ".#.....#.", "..#####.." }
  for r = 0, 2 do for c = 0, 5 do
    local tx, ty = 2700 + c * 42, 66 + r * 36
    rect(FAC, tx - 3, ty - 3, tx + 34, ty + 28, C("#2a2a34")); hline(FAC, tx - 3, tx + 34, ty - 3, C("#5a5a6a")); rect(FAC, tx, ty, tx + 31, ty + 24, C("#020208"))
    px(FAC, tx + 30, ty + 26, C(P.red))
    -- A: Mr Chrome's face on the screen, B: static
    for yy = 1, #FACE do for xx = 1, 9 do if FACE[yy]:sub(xx, xx) == "#" then rect(BULBA, tx + 6 + (xx - 1) * 2, ty + 2 + (yy - 1) * 2, tx + 7 + (xx - 1) * 2, ty + 3 + (yy - 1) * 2, C("#c0e8ff")) end end end
    emit(ACC.bulbA, tx + 15, ty + 12, "#6ad0ff", 0.05, 16)
    for yy = ty, ty + 24 do for xx = tx, tx + 31 do if rnd() > 0.55 then px(BULBB, xx, yy, C(rnd() > 0.5 and "#c8c8d8" or "#6a6a80")) end end end
    emit(ACC.bulbB, tx + 15, ty + 12, "#a0a0c0", 0.04, 16)
  end end
  -- chrome desk + red light
  rect(FAC, 2760, 210, 2880, 222, C("#c8d0e0")); hline(FAC, 2760, 2880, 210, C("#ffffff")); rect(FAC, 2768, 222, 2872, FLOOR - 1, C("#5a6478")); for x = 2770, 2870, 6 do vline(FAC, x, 224, FLOOR - 2, C("#8a94a8")) end
  for y = 176, FLOOR - 1, 3 do for x = 2630, 3010, 3 do addL(ACC.main, x, y, rgb(P.red), 0.02) end end
  SPILL[#SPILL + 1] = { 2820, 180, P.red }
end
-- ---- the rest: windows, plants, another elevator bank (3020..3940) ----
for _, px0 in ipairs({ 640, 1290, 1960, 2500, 3100, 3300 }) do   -- planters with tech-palms
  rect(FAC, px0, 236, px0 + 18, FLOOR - 1, C(P.steel2)); hline(FAC, px0, px0 + 18, 236, C(P.steel3))
  for k = -3, 3 do line(FAC, px0 + 9, 236, px0 + 9 + k * 5, 210 + math.abs(k) * 3, C("#1a5a4a")) end
end
solid(3500, 3939)
for _, ex in ipairs({ 3540, 3680 }) do
  rect(FAC, ex - 4, 110, ex + 84, FLOOR - 1, C(P.steel1)); rect(FAC, ex, 116, ex + 80, FLOOR - 1, C(P.steel2)); vline(FAC, ex + 40, 116, FLOOR - 1, C(P.steel0))
  rect(FAC, ex + 24, 88, ex + 56, 102, C("#020610")); glowText("99", ex + 30, 92, 1, P.orange, 0.12)
end

-- ================================================================== FLOOR: polished metal tiles, cyan grid, glossy reflections
do
  for y = FLOOR, HH - 1 do for x = 0, WW - 1 do
    local c = "#0a1222"; if dith(x, y, 0.12) then c = "#0c1628" end
    if (x % 64 == 0) or ((y - FLOOR) % 26 == 0) then c = "#14223a" end
    FLO:drawPixel(x, y, C(c))
  end end
  for x = 0, WW - 1, 64 do for y = FLOOR, HH - 1 do if (y - FLOOR) % 26 ~= 0 then end end; for d = -1, 1 do px(FLO, x + d, FLOOR + 26, C("#1a6a8a")) end end   -- grid nodes
  for y = FLOOR + 2, HH - 1, 26 do for x = 0, WW - 1, 2 do if dith(x, y, 0.3) then px(FLO, x, y, C("#123a5a")) end end end
  -- glossy reflections of the window mullions and the light strips
  for k = 0, WW // 96 do local mx = k * 96; for y = FLOOR + 3, FLOOR + 40 do if dith(mx, y, 0.5 - (y - FLOOR) / 80) then px(FLO, mx, y, C("#1a2c48")) end end end
  for _, s in ipairs(SPILL) do cone(ACC.main, s[1], FLOOR, FLOOR + 50, s[2] * 0.6, s[2] * 0.6 + 16, s[3], 0.10) end
  -- hazard stripes along the wall base
  for x = 0, WW - 1 do if ((x // 6) % 2 == 0) then px(FLO, x, FLOOR, C("#6a5a10")); px(FLO, x, FLOOR + 1, C("#6a5a10")) else px(FLO, x, FLOOR, C("#0a0a0a")); px(FLO, x, FLOOR + 1, C("#0a0a0a")) end end
end

-- ================================================================== save
local GLOW = bake(ACC.main, nil, 2.2)
bake(ACC.flick, FLICK, 1.8); bake(ACC.bulbA, BULBA, 1.4); bake(ACC.bulbB, BULBB, 1.4)
local spr = saveLayers(out, { { "sky", SKY }, { "far", FAR }, { "mid", MID }, { "floor", FLO }, { "facade", FAC }, { "glow", GLOW }, { "flicker", FLICK }, { "bulbsA", BULBA }, { "bulbsB", BULBB } },
  { glow = true, flicker = true, bulbsA = true, bulbsB = true })
if metaOut then
  local f = io.open(metaOut, "w"); local parts = {}
  for _, a in ipairs(ANT) do parts[#parts + 1] = string.format("[%d,%d]", a[1], a[2]) end
  f:write(string.format('{"width":%d,"height":%d,"floor":%d,"farW":%d,"midW":%d,"far":0.2,"mid":0.5,"facadeH":%d,"stops":[280,880,1500,2100,2660],"antennas":[%s]}', WW, HH, FLOOR, FARW, MIDW, FLOOR, table.concat(parts, ",")))
  f:close()
end
print("level4: " .. #spr.layers .. " layers -> " .. out)
