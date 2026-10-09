-- VEEXING FORCE - ENDING backdrop "OCEAN DRIVE, LAST LIGHT", drawn pixel by pixel in Aseprite (batch, see tools/make_ending_bg.py).
-- Same hand as the stage 3 backdrop (tools/ase/level3_bg.lua): banded + dithered sky, striped sun, pastel art deco hotels with a warm rim,
-- palms, terrazzo sidewalk. The hero rides along the road with the ocean on the far side:
--   sky (static) | sun (own layer, sinks) | clouds x0.12 | far x0.2 (ships, sails) | sea (static: water, sun glitter, foam, sand)
--   mid x0.5 (hotels + beach huts + palms, all standing on the SAND) | front x1 (sea wall, lamps, big palms, sidewalk, road) | glow x1 (lamps, additive)
-- Tiled layers are 1280 px wide and wrap seamlessly (every object is drawn at x, x-1280 and x+1280).
local out = app.params["out"]
local metaOut = app.params["meta"]
WW, HH = 1280, 360
dofile(app.params["lib"])
seed = 1987 + 9

local HZ = 188            -- horizon
local FOAM = 224          -- waterline
local GY = 246            -- beach / sea wall base line: everything on the sand stands here
local FLOOR = 250         -- sidewalk top (same as the fight stages)
local CURB = 268
local SUNX, SUNY, SUNR = 430, 156, 46

local P = {
  out = "#140818",
  s0 = "#1e0850", s1 = "#3a0e66", s2 = "#6a1a80", s3 = "#a02a8a", s4 = "#e0408a", s5 = "#ff6a7a", s6 = "#ff9a6a", s7 = "#ffc26a", s8 = "#ffe48a",
  cyan = "#27f0ff", pink = "#ff2fd0", yellow = "#ffe44d", red = "#ff2a4d", white = "#f4f0ff", warm = "#ffc46a", palm = "#1a0a28", palm2 = "#2e1440",
}
local SCH = {
  pink = { "#8a3e72", "#ffb0d0", "#5e2456" }, mint = { "#366e72", "#a0ffe0", "#224e52" }, lav = { "#54428e", "#d0b8ff", "#382a66" },
  peach = { "#7e4250", "#ffd0a0", "#5e303e" }, aqua = { "#34609a", "#a0e8ff", "#223e70" },
}

local SKY, SUN, CLD, FAR, SEA, MID, FRO = newImg(), newImg(), newImg(), newImg(), newImg(), newImg(), newImg()
local GLOW = {}

-- every drawing function takes the x offset ox so a tiled object is stamped three times
local function wrap(fn) fn(0); fn(-WW); fn(WW) end

local function disc(im, cx, cy, r, colf)
  for y = math.floor(cy - r), math.ceil(cy + r) do for x = math.floor(cx - r), math.ceil(cx + r) do
    local d = math.sqrt((x - cx) ^ 2 + (y - cy) ^ 2); if d <= r then local c = colf(x, y, d / r); if c then px(im, x, y, C(c)) end end
  end end
end
local function line(im, x0, y0, x1, y1, c, th)
  local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0), 1)
  for i = 0, n do local x, y = math.floor(x0 + (x1 - x0) * i / n + 0.5), math.floor(y0 + (y1 - y0) * i / n + 0.5); px(im, x, y, c); if th then px(im, x, y + 1, c) end end
end
local function shade(im, x0, y0, x1, y1, hex, d)   -- dithered veil (texture / ambient occlusion)
  for y = y0, y1 do for x = x0, x1 do if dith(x, y, d(x, y)) then px(im, x, y, C(hex)) end end end
end

-- ================================================================== SKY: dusk gradient, stars, haze at the horizon
vgrad(SKY, 0, 0, 639, HZ - 1, { P.s0, P.s1, P.s2, P.s3, P.s4, P.s5, P.s6, P.s7, P.s8 }, 3)
for i = 1, 70 do local x, y = ri(0, 639), ri(0, 70); if rnd() < 1 - y / 80 then px(SKY, x, y, C(pick({ "#f4f0ff", "#ffd8f0", "#a0e8ff" }))) end end
for i = 1, 8 do local x, y = ri(20, 620), ri(4, 50); px(SKY, x, y, C("#ffffff")); px(SKY, x - 1, y, C("#c8b8ff")); px(SKY, x + 1, y, C("#c8b8ff")); px(SKY, x, y - 1, C("#c8b8ff")); px(SKY, x, y + 1, C("#c8b8ff")) end

-- ================================================================== SUN: halo (dithered rings) + striped disc, sinks in game
for y = SUNY - 100, SUNY + 100 do for x = SUNX - 100, SUNX + 100 do
  local d = math.sqrt((x - SUNX) ^ 2 + (y - SUNY) ^ 2)
  if d > SUNR and d < 98 and y < HZ then
    local f = (1 - (d - SUNR) / (98 - SUNR)); if dith(x, y, f * f * 0.62) then px(SUN, x, y, C(d < 70 and P.s8 or P.s7)) end
  end
end end
disc(SUN, SUNX, SUNY, SUNR, function(x, y, t)
  local v = (y - (SUNY - SUNR)) / (2 * SUNR)
  local rel = y - SUNY
  if rel > 4 then   -- retro stripes: slats cut out of the lower half, wider toward the bottom
    local k = (rel - 4) % 8; local gap = 1 + math.floor((rel - 4) / 8)
    if k < gap and gap < 6 then return nil end
  end
  local cols = { "#fff6a8", "#ffe46a", "#ffc24a", "#ff9a4a", "#ff6a5a", "#ff3f8a" }
  local f = v * (#cols - 1); local i = math.floor(f); local tt = f - i
  local c = cols[i + 1]; if i + 2 <= #cols and dith(x, y, math.max(0, math.min(1, (tt - 0.5) * 3 + 0.5))) then c = cols[i + 2] end
  if t > 0.93 then c = "#ffb06a" end
  return c
end)

-- ================================================================== CLOUDS: long streaks lit from below by the sun (warm underside, violet top)
local function cloud(ox, cx, cy, len, thick)
  for x = -len, len do
    local t = x / len; local th = thick * math.sqrt(math.max(0, 1 - t * t)) * (0.7 + 0.3 * math.sin(x * 0.21 + cx))
    for dy = -math.floor(th), math.floor(th * 0.6) do
      local rel = dy / math.max(1, th)
      local c = (rel > 0.25) and "#ffb06a" or (rel > -0.2) and "#e0508a" or "#8a2a8e"
      if (rel > 0.55) and dith(x + cx, dy + cy, 0.5) then c = "#ffe48a" end
      px(CLD, cx + x + ox, cy + dy, C(c))
    end
    if th > 1 and dith(cx + x, cy - math.floor(th) - 1, 0.45) then px(CLD, cx + x + ox, cy - math.floor(th) - 1, C("#b04aa0")) end
  end
end
for _, c in ipairs({ { 110, 52, 110, 4 }, { 330, 92, 150, 5 }, { 520, 40, 90, 3 }, { 700, 70, 130, 5 }, { 905, 112, 160, 5 }, { 1120, 58, 100, 4 }, { 240, 138, 120, 3 }, { 810, 150, 90, 3 }, { 1180, 128, 80, 3 }, { 30, 118, 70, 3 } }) do
  wrap(function(ox) cloud(ox, c[1], c[2], c[3], c[4]) end)
end

-- ================================================================== FAR: things that really float / fly on the horizon (ships, sails, gulls)
local function ship(ox, x, w, h)
  rect(FAR, x + ox, HZ - h, x + w + ox, HZ - 1, C("#4a1a62")); rect(FAR, x + ox - 3, HZ - 3, x + w + ox + 3, HZ - 1, C("#3a1252"))
  for i = 0, 3 do rect(FAR, x + ox + 3 + i * (w // 4), HZ - h - 3 - i % 2 * 2, x + ox + 6 + i * (w // 4), HZ - h, C("#4a1a62")) end   -- funnels
  for k = 0, w - 4, 3 do if rnd() < 0.5 then px(FAR, x + ox + 2 + k, HZ - h + 3, C(P.s8)) end end                                       -- lit portholes
  hline(FAR, x + ox, x + w + ox, HZ - h, C("#c0508a"))                                                                                   -- warm rim
end
local function sail(ox, x, h)
  for i = 0, h do rect(FAR, x + ox, HZ - 2 - i, x + ox + math.floor(i * 0.35), HZ - 2 - i, C("#fff0c8")) end
  for i = 0, h - 3 do px(FAR, x + ox - 1 - math.floor(i * 0.2), HZ - 2 - i, C("#e0508a")) end
  rect(FAR, x + ox - 5, HZ - 2, x + ox + 8, HZ - 1, C("#4a1a62"))
end
wrap(function(ox) ship(ox, 180, 54, 9); ship(ox, 760, 40, 7); sail(ox, 520, 14); sail(ox, 560, 10); sail(ox, 1010, 12) end)
for i = 1, 14 do local gx, gy = ri(0, 1279), ri(60, 150); px(FAR, gx, gy, C("#2a0a40")); px(FAR, gx - 1, gy - 1, C("#2a0a40")); px(FAR, gx + 1, gy - 1, C("#2a0a40")); px(FAR, gx - 2, gy - 1, C("#2a0a40")); px(FAR, gx + 2, gy - 1, C("#2a0a40")) end

-- ================================================================== SEA (static 640 px): water gradient, sun glitter, foam line, wet and dry sand
local WAT = { "#ff9a6a", "#e0508a", "#a02a8a", "#6a1a80", "#3a0e66", "#2a0a56" }
vgrad(SEA, 0, HZ, 639, FOAM - 1, WAT, 3)
for y = HZ, FOAM - 1 do for x = 0, 639 do   -- ripples: horizontal dithered dashes, denser and wider toward the viewer
  local t = (y - HZ) / (FOAM - HZ)
  if rnd() < 0.05 + t * 0.07 then local l = 2 + math.floor(t * 8); for k = 0, l do if rnd() < 0.8 then px(SEA, x + k, y, C(t < 0.4 and "#ff7a8a" or "#7a2a96")) end end end
end end
for y = HZ, FOAM - 1 do   -- sun glitter column under the sun: broken bright dashes that widen toward the viewer
  local t = (y - HZ) / (FOAM - HZ); local hw = 6 + t * 46
  for x = SUNX - math.floor(hw), SUNX + math.floor(hw) do
    local a = 1 - math.abs(x - SUNX) / hw
    if dith(x, y, a * (1 - t * 0.35)) and ((x + y * 3) % 7 < 4) then px(SEA, x, y, C(t < 0.3 and "#fff6a8" or t < 0.65 and "#ffc26a" or "#ff8a7a")) end
  end
end
hline(SEA, 0, 639, HZ, C("#ffd88a"))                                              -- the horizon line itself
for x = 0, 639 do   -- surf: broken foam, wet sand just behind it
  local wob = math.floor(math.sin(x * 0.07) * 1.5 + 0.5)
  px(SEA, x, FOAM + wob, C("#fff0f8")); if x % 3 ~= 0 then px(SEA, x, FOAM + wob - 1, C("#ffb0d8")) end
  px(SEA, x, FOAM + wob + 1, C("#d0a0c0"))
end
local SAND = { "#caa08a", "#e0b496", "#f0c8a4" }
for y = FOAM + 2, GY + 6 do for x = 0, 639 do
  local t = (y - FOAM) / (GY - FOAM); local c = (y < FOAM + 6) and "#a87a82" or (t < 0.5 and SAND[1] or SAND[2])
  if y >= FOAM + 6 and dith(x, y, 0.3) then c = SAND[3] end
  if rnd() < 0.03 then c = "#8a5a6a" end
  px(SEA, x, y, C(c))
end end
shade(SEA, 0, FOAM + 2, 639, FOAM + 9, "#ff9ac0", function(x, y) return 0.4 * (1 - (y - FOAM) / 8) end)   -- sunset sheen on the wet sand

-- ================================================================== MID x0.5: hotels, beach huts, palms - ALL standing on the sand line GY
local function palm(im, ox, bx, by, h, lean, tc, lc1, lc2, scale)
  local tx, ty = bx, by
  for i = 0, h do
    local t = i / h; local x = bx + math.floor(lean * t * t + 0.5); local y = by - i; local w = (t < 0.25) and 3 or 2
    rect(im, x - w // 2 + ox, y, x + (w - 1) // 2 + ox + 1, y, C(tc)); if i % 4 == 0 then px(im, x + ox, y, C(P.palm2)) end
    tx, ty = x, y
  end
  for k = 0, 9 do
    local a = -math.pi * 0.98 + k * (math.pi * 0.96 / 9); local len = (24 + (k % 3) * 7) * scale
    for i = 0, len do
      local t = i / len; local x = tx + math.cos(a) * i; local y = ty + math.sin(a) * i * 0.5 + t * t * 14 * scale
      px(im, math.floor(x) + ox, math.floor(y), C(lc1)); px(im, math.floor(x) + ox, math.floor(y) + 1, C(lc1)); if t < 0.7 then px(im, math.floor(x) + ox, math.floor(y) + 2, C(lc1)) end
      if i % 2 == 0 and t > 0.2 then px(im, math.floor(x) + ox, math.floor(y) + 2, C(lc2)); if math.cos(a) < 0 then px(im, math.floor(x) + ox - 1, math.floor(y) + 3, C(lc2)) end end
    end
  end
  px(im, tx + ox, ty + 1, C("#6a3a1a")); px(im, tx + ox + 1, ty + 1, C("#6a3a1a"))
end

local function hotel(ox, x, w, h, sch, name)
  local S = SCH[sch]; local top = GY - h
  -- stepped art deco crown (2 tiers) + body
  rect(MID, x + ox + 6, top - 8, x + w + ox - 6, top - 1, C(S[3])); rect(MID, x + ox + 3, top - 4, x + w + ox - 3, top - 1, C(S[1]))
  rect(MID, x + ox, top, x + w + ox, GY - 1, C(S[1]))
  shade(MID, x + ox, top, x + w + ox, GY - 1, S[3], function(xx, yy) return 0.1 + 0.5 * (yy - top) / h + 0.22 * (xx - x - ox) / w end)   -- backlit: darker toward the base / sun-side
  rect(MID, x + ox, top, x + w + ox, top, C(P.warm)); rect(MID, x + ox + 3, top - 4, x + w + ox - 3, top - 4, C(P.warm)); rect(MID, x + ox + 6, top - 8, x + w + ox - 6, top - 8, C(P.warm))
  vline(MID, x + w + ox, top, GY - 1, C(P.warm)); vline(MID, x + ox, top - 1, GY - 1, C(S[2]))                  -- warm rim on the sun side, pastel on the other
  hline(MID, x + ox, x + w + ox, top + 6, C(S[2])); hline(MID, x + ox, x + w + ox, top + 7, C(S[3]))             -- deco band
  for y = top + 12, GY - 18, 11 do
    hline(MID, x + ox, x + w + ox, y + 8, C(S[3]))                                                              -- balcony slab
    for xx = x + 6, x + w - 9, 10 do
      rect(MID, xx + ox, y, xx + 4 + ox, y + 6, C(rnd() < 0.4 and "#ffb04a" or "#2a1a40"))
      if getA(MID, xx + ox, y) > 0 and rnd() < 0.5 then px(MID, xx + ox + 4, y + 6, C(P.warm)) end
    end
  end
  -- ground floor: dark lobby with a canopy and steps
  rect(MID, x + ox + 4, GY - 14, x + w + ox - 4, GY - 1, C("#1c0e2a")); hline(MID, x + ox + 2, x + w + ox - 2, GY - 15, C(S[2])); hline(MID, x + ox + 2, x + w + ox - 2, GY - 14, C(S[3]))
  for xx = x + 8, x + w - 10, 9 do rect(MID, xx + ox, GY - 10, xx + 3 + ox, GY - 2, C(rnd() < 0.5 and "#ffb04a" or "#3a2250")) end
  rect(MID, x + ox + 2, GY, x + w + ox - 2, GY, C("#6a4a5a"))
  -- neon name on a vertical blade sign (the glow layer picks it up)
  local sx = x + w - 10; rect(MID, sx + ox, top - 22, sx + 6 + ox, top + 18, C("#1c0e2a"))
  for i = 1, #name do local ch = name:sub(i, i); local yy = top - 20 + (i - 1) * 6; if ch ~= " " then rect(MID, sx + 2 + ox, yy, sx + 4 + ox, yy + 3, C(sch == "mint" and P.cyan or P.pink)) end end
  -- long shadow on the sand, toward the viewer's left (sun is behind-right)
  for y = GY + 1, GY + 5 do for xx = x - 26 - (y - GY) * 4, x + w do if dith(xx, y, 0.55) then px(MID, xx + ox, y, C("#8a5a6a")) end end end
end

local function lifeguard(ox, x)
  rect(MID, x + ox + 2, GY - 12, x + ox + 3, GY, C("#6a3a2a")); rect(MID, x + ox + 16, GY - 12, x + ox + 17, GY, C("#6a3a2a"))   -- stilts
  rect(MID, x + ox, GY - 24, x + ox + 19, GY - 12, C("#ff6a8a")); rect(MID, x + ox, GY - 24, x + ox + 19, GY - 22, C("#ffe48a"))
  rect(MID, x + ox + 4, GY - 20, x + ox + 14, GY - 15, C("#2a1a40")); rect(MID, x + ox - 2, GY - 27, x + ox + 21, GY - 24, C("#fff0c8"))
  hline(MID, x + ox - 2, x + ox + 21, GY - 27, C(P.warm))
  line(MID, x + ox + 19, GY - 27, x + ox + 19, GY - 38, C("#3a2a2a")); rect(MID, x + ox + 14, GY - 38, x + ox + 19, GY - 34, C(P.red))
  for k = 3, 12 do px(MID, x + ox + 10, GY - 12 + (k - 3), C("#6a3a2a")) end                                                      -- ladder
end
local function umbrella(ox, x, c1, c2)
  line(MID, x + ox, GY - 20, x + ox, GY, C("#d8c8d8"))
  for i = -10, 10 do local h = math.floor((10 - math.abs(i)) * 0.45); for j = 0, h do px(MID, x + ox + i, GY - 22 + (10 - math.abs(i)) // 3 + j - h, C(((i + 10) // 3) % 2 == 0 and c1 or c2)) end end
  rect(MID, x + ox - 10, GY - 21, x + ox + 10, GY - 20, C(c1))
  rect(MID, x + ox + 5, GY - 3, x + ox + 14, GY - 1, C("#ffffff")); rect(MID, x + ox + 5, GY - 3, x + ox + 14, GY - 3, C(c2))   -- towel
end
local function volley(ox, x)
  rect(MID, x + ox, GY - 24, x + ox + 1, GY, C("#d8c8d8")); rect(MID, x + ox + 36, GY - 24, x + ox + 37, GY, C("#d8c8d8"))
  for xx = x + 2, x + 35 do for y = GY - 22, GY - 14 do if (xx + y) % 3 == 0 then px(MID, xx + ox, y, C("#f0e8ff")) end end end
  hline(MID, x + ox, x + ox + 37, GY - 22, C("#ffffff")); px(MID, x + ox + 18, GY - 30, C("#fff0c8"))
end

local HOT = {
  { 40, 104, 62, "pink", "BAYSIDE" }, { 696, 92, 54, "mint", "AQUA" }, { 1010, 86, 48, "lav", "ORCHID" },
}
wrap(function(ox)
  for _, h in ipairs(HOT) do hotel(ox, h[1], h[2], h[3], h[4], h[5]) end
  lifeguard(ox, 420); lifeguard(ox, 1180)
  umbrella(ox, 560, "#ff6a8a", "#fff0c8"); umbrella(ox, 596, "#27c8d0", "#fff0c8"); umbrella(ox, 880, "#ffe44d", "#ff6a8a")
  volley(ox, 330)
  palm(MID, ox, 190, GY, 52, -8, P.palm, "#3a1850", "#5a2a6a", 1.0); palm(MID, ox, 640, GY, 46, 7, P.palm, "#3a1850", "#5a2a6a", 0.9)
  palm(MID, ox, 840, GY, 58, -9, P.palm, "#3a1850", "#5a2a6a", 1.05); palm(MID, ox, 970, GY, 44, 6, P.palm, "#3a1850", "#5a2a6a", 0.9)
  palm(MID, ox, 1130, GY, 54, -7, P.palm, "#3a1850", "#5a2a6a", 1.0)
end)
-- sea-grape / dune grass tufts along the waterline side of the sand
for i = 1, 40 do local gx = ri(0, 1279); for k = 0, 3 do line(MID, gx + k, GY, gx + k + ri(-2, 2), GY - ri(3, 6), C(pick({ "#4a2a5a", "#2a1438" }))) end end

-- ================================================================== FRONT x1: sea wall with neon stripe, lamps, big palms, terrazzo sidewalk, asphalt
local lamps = {}
rect(FRO, 0, GY + 1, WW - 1, FLOOR - 1, C("#e8c8d0"))                                                                  -- sea wall (art deco low wall)
hline(FRO, 0, WW - 1, GY + 1, C("#fff0f4")); hline(FRO, 0, WW - 1, GY + 2, C("#ffd0e0"))
shade(FRO, 0, GY + 3, WW - 1, FLOOR - 1, "#9a6a8a", function(x, y) return 0.25 + 0.2 * (y - GY) / 4 end)
hline(FRO, 0, WW - 1, FLOOR - 3, C(P.pink)); hline(FRO, 0, WW - 1, FLOOR - 2, C("#ff9ae8"))                            -- neon stripe on the wall
for x = 0, WW - 1, 40 do vline(FRO, x, GY + 3, FLOOR - 4, C("#b88aa0")) end                                            -- wall joints
-- sidewalk: warm terrazzo with flecks and expansion joints, then kerb, then asphalt with a pastel dusk gradient
for y = FLOOR, CURB - 1 do for x = 0, WW - 1 do
  local c = (y == FLOOR) and "#ffd8ec" or (y == FLOOR + 1) and "#e0a8cc" or "#c08ab8"
  if y > FLOOR + 1 and dith(x, y, 0.2) then c = "#d49ac8" end
  if x % 80 == 0 then c = "#8a5a86" end
  if rnd() < 0.02 then c = pick({ "#fff0c8", "#ff9ac8", "#8ae0ff" }) end
  px(FRO, x, y, C(c))
end end
hline(FRO, 0, WW - 1, CURB, C("#f0e0f0")); hline(FRO, 0, WW - 1, CURB + 1, C("#9a7aa0")); hline(FRO, 0, WW - 1, CURB + 2, C("#4a3050"))
for y = CURB + 3, HH - 1 do for x = 0, WW - 1 do
  local t = (y - CURB) / (HH - CURB); local c = (t < 0.15) and "#4a2a5a" or (t < 0.55) and "#3a2048" or "#2a1636"
  if dith(x, y, 0.28) then c = (t < 0.35) and "#5a3a6a" or "#4a2a58" end
  if rnd() < 0.015 then c = "#7a5a8a" end
  px(FRO, x, y, C(c))
end end
shade(FRO, 0, CURB + 3, WW - 1, CURB + 22, "#ff8a9a", function(x, y) return 0.34 * (1 - (y - CURB) / 20) end)           -- sunset sheen on the asphalt near the kerb
for k = 1, 90 do local x, y = ri(0, WW - 1), ri(CURB + 6, HH - 3); line(FRO, x, y, x + ri(4, 12), y + ri(-1, 1), C("#241230")) end   -- tar cracks
-- lamps: art deco double lamps on the wall; their halo goes to the glow layer
local function lamp(ox, x)
  rect(FRO, x + ox - 1, GY - 38, x + ox + 1, FLOOR - 2, C("#2a1832")); rect(FRO, x + ox - 3, FLOOR - 6, x + ox + 3, FLOOR - 2, C("#1c0e2a"))
  hline(FRO, x + ox - 6, x + ox + 6, GY - 40, C("#2a1832")); rect(FRO, x + ox - 7, GY - 46, x + ox - 4, GY - 41, C("#fff0c8")); rect(FRO, x + ox + 4, GY - 46, x + ox + 7, GY - 41, C("#fff0c8"))
  rect(FRO, x + ox - 8, GY - 47, x + ox - 3, GY - 47, C("#2a1832")); rect(FRO, x + ox + 3, GY - 47, x + ox + 8, GY - 47, C("#2a1832"))
  if ox == 0 then lamps[#lamps + 1] = x end
  for _, d in ipairs({ -5, 5 }) do emit(GLOW, x + ox + d, GY - 43, "#ffc46a", 0.9, 16) end
  cone(GLOW, x + ox, GY - 41, FLOOR + 6, 3, 22, "#ffc46a", 0.14)
end
wrap(function(ox) lamp(ox, 250); lamp(ox, 640); lamp(ox, 1060) end)
-- big foreground palms (they pass in front of the beach, behind the bike)
wrap(function(ox)
  palm(FRO, ox, 330, FLOOR - 1, 128, -16, "#12061c", "#241038", "#3a1c50", 1.5)
  palm(FRO, ox, 900, FLOOR - 1, 148, 14, "#12061c", "#241038", "#3a1c50", 1.7)
end)

-- ================================================================== save
local glow = bake(GLOW, nil, 2.0)
local spr = saveLayers(out, { { "sky", SKY }, { "sun", SUN }, { "clouds", CLD }, { "far", FAR }, { "sea", SEA }, { "mid", MID }, { "front", FRO }, { "glow", glow } }, { glow = true })
if metaOut then
  local f = io.open(metaOut, "w")
  f:write(string.format('{"width":%d,"height":%d,"horizon":%d,"foam":%d,"floor":%d,"sunX":%d,"sunY":%d,"sunR":%d}', WW, HH, HZ, FOAM, FLOOR, SUNX, SUNY, SUNR))
  f:close()
end
print("ending: " .. #spr.layers .. " layers -> " .. out)
