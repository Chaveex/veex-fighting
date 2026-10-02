-- VEEXING FORCE pickups, drawn pixel by pixel in Aseprite (batch):
--   aseprite -b --script-param out=F:/Dev/Claude/VeexingForce/assets/props/pickups.aseprite --script tools/ase/pickups.lua
-- One sprite 24x28, 3 tags (soda / pizza / tape) x 6 frames, 3 layers:
--   objet  : the object (hand-made pixel maps below, one letter = one pixel; edit them to retouch)
--   vapeur : pizza steam
--   eclat  : sparkles / glints (animated)
-- Anchor for the game = (12, 26): bottom centre of the object.
local out = app.params["out"] or "pickups.aseprite"
local W, H = 24, 28
local NF = 6
local pc = app.pixelColor

local function hex(h, a)
  return pc.rgba(tonumber(h:sub(2, 3), 16), tonumber(h:sub(4, 5), 16), tonumber(h:sub(6, 7), 16), a or 255)
end

-- shared colours
local OUT = "#1a0b2e"

-- ================================================================ SODA (VEEX COLA can, 12x18)
local SODA_PAL = {
  O = OUT,
  ["1"] = "#f4f6ff", ["2"] = "#bcc2da", ["3"] = "#7e84a6", ["4"] = "#4c4e72",   -- aluminium
  r = "#ff6f6a", R = "#e8323c", D = "#b01e3a", X = "#6e1236",                       -- red can
  h = "#ffffff",                                                                     -- specular
  W = "#ffffff", w = "#cfc8e4",                                                      -- label
  C = "#27f0ff", q = "#1497c0",                                                      -- cyan wave
}
local SODA = {
  "...OOOOOO...",
  ".OO111111OO.",
  "O1122222211O",
  "O1223443221O",
  "O3111111113O",
  "OXDDRRRrhRDO",
  "OXDDRRRrhRDO",
  "OwwWWWWWWWwO",
  "OwCCWWWWWCwO",
  "OqwwCCWWCCqO",
  "OwwWWWCCWWwO",
  "OwwWWWWWWWwO",
  "OXDDRRRrhRDO",
  "OXDDRRRrhRDO",
  "OXDDRRRrhRDO",
  "O3322222113O",
  ".O43333333O.",
  "..OOOOOOOO..",
}

-- ================================================================ PIZZA (slice, 18x18)
local PIZZA_PAL = {
  O = OUT,
  K = "#f6c070", k = "#d0843a", j = "#8a4a22",                                      -- crust
  Y = "#fff58a", y = "#ffcc3a", z = "#e8902a",                                      -- cheese
  P = "#e0303c", p = "#951836", h = "#ff9a8a",                                      -- pepperoni
  G = "#3dbf5a",                                                                     -- green pepper
}
local PIZZA = {
  "..OOOOOOOOOOOOOO..",
  ".OKKKKKKKKKKKKKKO.",
  "OKkkKkkkkKkkkkKkjO",
  "OjkkkkkkkkkkkkkkjO",
  "OjjjjjjjjjjjjjjjjO",
  ".OYYyyPPyyyyYYyzO.",
  ".OYyyPhPpyyGyyyzO.",
  "..OyyPPpyyGGyyzO..",
  "..OYyypyyyyPPPzO..",
  "...OyyyyyyPhPzO...",
  "...OYyGyyyPPpzO...",
  "....OyGGyyyyzO....",
  "....OYyyyyyyzO....",
  ".....OyPPyyzO.....",
  ".....OyPpyzO......",
  "......OyyzO.......",
  "......OyzO........",
  ".......OO.........",
}

-- ================================================================ MIXTAPE (cassette, 20x13)
local TAPE_PAL = {
  O = OUT,
  M = "#ff86e6", m = "#ff2fd0", n = "#b4189e", N = "#6c0e66",                       -- pink shell
  L = "#ffffff", l = "#d8d0ec",                                                      -- label
  s = "#27f0ff", t = "#ffe44d",                                                      -- label stripes
  V = "#2a1650", b = "#6a3a2a",                                                      -- window + tape
  R = "#f4f0ff", r = "#9a90c0", x = "#1a0b2e",                                      -- reels
  ["+"] = "#c8c4dc",                                                                 -- screws
}
local TAPE = {
  ".OOOOOOOOOOOOOOOOOO.",
  "OMMMMMMMMMMMMMMMMMmO",
  "OM+LLLLLLLLLLLLLL+nO",
  "OmLssssssssssssssLnO",
  "OmLtttttttttttttlLnO",
  "OmLLVVVVVVVVVVVVLLnO",
  "OmLLV...VVVV...VLLnO",
  "OmLLV...bbbb...VLLnO",
  "OmLLV...VVVV...VLLnO",
  "OmLLVVVVVVVVVVVVLLnO",
  "OnnnnnnnnnnnnnnnnnNO",
  "ONnn+nnnnnnnnnn+nNNO",
  ".OOOOOOOOOOOOOOOOOO.",
}
-- reel patterns (3x3), alternated so the reels turn
local REEL = { { "rRr", "RxR", "rRr" }, { "RrR", "rxr", "RrR" } }

-- ================================================================ helpers
local spr = Sprite(W, H, ColorMode.RGB)
spr.filename = out
local L_obj = spr.layers[1]; L_obj.name = "objet"
local L_steam = spr:newLayer(); L_steam.name = "vapeur"
local L_fx = spr:newLayer(); L_fx.name = "eclat"
for i = 2, NF * 4 do spr:newEmptyFrame() end
for i = 1, #spr.frames do spr.frames[i].duration = 0.1 end

local function blank() local im = Image(W, H, ColorMode.RGB); im:clear(pc.rgba(0, 0, 0, 0)); return im end

local function stamp(im, rows, pal, ox, oy)
  for y = 1, #rows do
    local row = rows[y]
    for x = 1, #row do
      local ch = row:sub(x, x)
      local col = pal[ch]
      if ch ~= "." and col then im:drawPixel(ox + x - 1, oy + y - 1, hex(col)) end
    end
  end
end

local function px(im, x, y, h, a) if x >= 0 and y >= 0 and x < W and y < H then im:drawPixel(x, y, hex(h, a)) end end

-- 4-point sparkle: size 1 = plus, 2 = long star
local function sparkle(im, cx, cy, size, col)
  px(im, cx, cy, "#ffffff")
  for d = 1, size do
    local a = (d == size) and 170 or 255
    px(im, cx + d, cy, col, a); px(im, cx - d, cy, col, a); px(im, cx, cy + d, col, a); px(im, cx, cy - d, col, a)
  end
end

local function put(layer, frame, im) spr:newCel(layer, spr.frames[frame], im, Point(0, 0)) end

-- sparkle timeline shared by the 3 objects: (frame -> size)
local SPARK = { 0, 1, 2, 1, 0, 0 }

-- ================================================================ SODA frames: glint slides down the can + sparkle
for f = 1, NF do
  local fr = f
  local im = blank(); local ox, oy = 6, 26 - #SODA
  stamp(im, SODA, SODA_PAL, ox, oy)
  put(L_obj, fr, im)
  local fx = blank()
  -- vertical glint on the highlight column, travelling down then gone
  local gy = oy + 4 + (f - 1) * 3
  if f <= 4 then for d = 0, 2 do px(fx, ox + 8, gy + d, "#ffffff", 230 - d * 60) end; px(fx, ox + 7, gy + 1, "#ffd0d0", 160) end
  if SPARK[f] > 0 then sparkle(fx, ox + 10, oy + 1, SPARK[f], "#27f0ff") end
  put(L_fx, fr, fx)
end

-- ================================================================ PIZZA frames: steam rising + cheese drip at the tip
for f = 1, NF do
  local fr = NF + f
  local im = blank(); local ox, oy = 3, 26 - #PIZZA
  stamp(im, PIZZA, PIZZA_PAL, ox, oy)
  -- melting cheese: a drop grows under the tip, falls, then restarts
  local tipx, tipy = ox + 7, oy + #PIZZA - 1
  local len = ({ 0, 1, 1, 2, 2, 0 })[f]
  for d = 1, len do px(im, tipx, tipy + d - 1, d == len and "#ffcc3a" or "#e8902a") end
  if len > 0 then px(im, tipx - 1, tipy + len - 1, "#1a0b2e"); px(im, tipx + 1, tipy + len - 1, "#1a0b2e"); px(im, tipx, tipy + len, "#1a0b2e") end
  put(L_obj, fr, im)
  -- steam: two wavy wisps above the crust, rising and fading
  local st = blank()
  for w = 0, 1 do
    local bx = ox + 5 + w * 7
    for i = 0, 4 do
      local rise = (f + w * 3) % 3
      local yy = oy - 1 - i - rise
      local xx = bx + math.floor(math.sin(i * 0.8 + (f + w * 3) * 1.05) + 0.5)
      local a = 190 - (i + rise) * 34
      if yy >= 0 and a > 0 then px(st, xx, yy, i < 2 and "#ffffff" or "#e8dcff", a) end
    end
  end
  put(L_steam, fr, st)
  local fx = blank()
  if SPARK[f] > 0 then sparkle(fx, ox + 15, oy + 2, SPARK[f], "#ffe44d") end
  put(L_fx, fr, fx)
end

-- ================================================================ TAPE frames: reels turn + label glint
for f = 1, NF do
  local fr = 2 * NF + f
  local im = blank(); local ox, oy = 2, 26 - #TAPE
  stamp(im, TAPE, TAPE_PAL, ox, oy)
  local rp = REEL[(f % 2) + 1]
  for _, rx in ipairs({ 5, 12 }) do
    for y = 1, 3 do
      for x = 1, 3 do
        local ch = rp[y]:sub(x, x); im:drawPixel(ox + rx + x - 1, oy + 5 + y, hex(TAPE_PAL[ch]))
      end
    end
  end
  put(L_obj, fr, im)
  local fx = blank()
  -- diagonal glint sweeping across the shell
  local gx = ox + 1 + (f - 1) * 4
  if f <= 5 then for d = 0, 3 do px(fx, gx + d, oy + 1 + d, "#ffffff", 150) end end
  if SPARK[f] > 0 then sparkle(fx, ox + 18, oy, SPARK[f], "#ff2fd0") end
  put(L_fx, fr, fx)
end

-- ================================================================ tags + save
-- ================================================================ 1UP: green arcade token spinning on itself, "1UP" stamped on it
local GLYPH = { ["1"] = { ".#.", "##.", ".#.", ".#.", "###" }, U = { "#.#", "#.#", "#.#", "#.#", "###" }, P = { "##.", "#.#", "##.", "#..", "#.." } }
for f = 1, NF do
  local fr = 3 * NF + f
  local im = blank(); local cx, cy, R = 12, 15, 10
  local sx = math.cos((f - 1) / NF * math.pi)                     -- spin: the coin gets thin, flips, comes back
  local w = math.max(1.2, math.abs(sx) * R)
  for y = cy - R, cy + R do for x = math.floor(cx - w - 1), math.ceil(cx + w + 1) do
    local d = ((x + 0.5 - cx) / w) ^ 2 + ((y + 0.5 - cy) / R) ^ 2
    if d <= 1 then
      local col = d > 0.78 and "#1a0b2e" or (d > 0.6 and "#1e8a5a" or ((x + 0.5 - cx) * (sx >= 0 and 1 or -1) < -w * 0.3 and "#2ac87a" or "#3dffa0"))
      if d > 0.6 and d <= 0.78 and (y < cy - R * 0.4) then col = "#7affc0" end      -- rim highlight
      px(im, x, y, col)
    end
  end end
  for x = math.floor(cx - w - 1), math.ceil(cx + w) do px(im, x, cy + R + 1, "#0a0414", 120) end
  if sx > 0.95 then                                                -- stamp only when the coin faces us (unreadable when squeezed)
    local s = "1UP"; local ox = cx - 5
    for i = 1, 3 do local g = GLYPH[s:sub(i, i)]; for gy = 1, 5 do for gx = 1, 3 do if g[gy]:sub(gx, gx) == "#" then
      local X = ox + (i - 1) * 4 + gx - 1; X = math.floor(cx + (X - cx) * (sx >= 0 and 1 or -1) * math.abs(sx) + 0.5)
      px(im, X, cy - 2 + gy - 1, "#0a3a20")
    end end end end
  end
  put(L_obj, fr, im)
  local fx = blank()
  if SPARK[f] > 0 then sparkle(fx, cx + 8, cy - 9, SPARK[f], "#3dffa0") end
  put(L_fx, fr, fx)
end

local function tag(name, a, b) local t = spr:newTag(a, b); t.name = name end
tag("soda", 1, NF); tag("pizza", NF + 1, 2 * NF); tag("tape", 2 * NF + 1, 3 * NF); tag("life", 3 * NF + 1, 4 * NF)
spr:saveAs(out)
print("pickups: " .. #spr.frames .. " frames, " .. #spr.layers .. " layers, " .. #spr.tags .. " tags -> " .. out)
