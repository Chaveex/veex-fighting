-- VEEXING FORCE - L1 trash can (breakable prop), drawn pixel by pixel in Aseprite (batch, see tools/make_prop_sprites.py):
--   aseprite -b --script-param out=<...>/assets/props/bin.aseprite --script tools/ase/bin.lua
-- Sprite 32x44, anchor for the game = (16, 40) = bottom centre.
-- Plain galvanised steel: no stickers / coloured stripes any more (they read as a pink + cyan band on the can).
-- Tags (one frame each): bin0 intact | bin1 dented | bin2 wrecked (lid ajar, junk poking out) | lid (loose lid, spare)
local out = app.params["out"] or "bin.aseprite"
local W, H = 32, 44
local pc = app.pixelColor
local CX = 16

local function hex(h, a)
  return pc.rgba(tonumber(h:sub(2, 3), 16), tonumber(h:sub(4, 5), 16), tonumber(h:sub(6, 7), 16), a or 255)
end

local OUT = "#1a0b2e"
local M = { "#eef0fa", "#c2c8de", "#9199b8", "#656d90", "#3f4466", "#2a2d48" }  -- steel ramp, light -> dark (index 1 = M[1])

local spr = Sprite(W, H, ColorMode.RGB)
spr.filename = out
local layer = spr.layers[1]; layer.name = "poubelle"
for i = 2, 4 do spr:newEmptyFrame() end
for i = 1, #spr.frames do spr.frames[i].duration = 0.1 end

local function blank() local im = Image(W, H, ColorMode.RGB); im:clear(pc.rgba(0, 0, 0, 0)); return im end
local function px(im, x, y, h)
  x = math.floor(x); y = math.floor(y)
  if x >= 0 and y >= 0 and x < W and y < H then im:drawPixel(x, y, hex(h)) end
end
local function get(im, x, y)
  if x < 0 or y < 0 or x >= W or y >= H then return 0 end
  return pc.rgbaA(im:getPixel(x, y))
end
local function rect(im, x0, y0, x1, y1, h) for y = y0, y1 do for x = x0, x1 do px(im, x, y, h) end end end

-- one-pixel dark outline around everything drawn so far
local function outline(im)
  local mark = {}
  for y = 0, H - 1 do for x = 0, W - 1 do
    if get(im, x, y) == 0 and (get(im, x - 1, y) > 0 or get(im, x + 1, y) > 0 or get(im, x, y - 1) > 0 or get(im, x, y + 1) > 0) then
      mark[#mark + 1] = { x, y }
    end
  end end
  for _, p in ipairs(mark) do px(im, p[1], p[2], OUT) end
end

-- ------------------------------------------------------------------ body: tapered steel drum, light from the upper left
local TOP, BOT = 18, 40
local function body(im)
  for y = TOP, BOT do
    local hw = 11 - (y - TOP) * 2 / (BOT - TOP)
    for x = math.ceil(CX - hw), math.floor(CX + hw - 1) do
      local u = (x + 0.5 - CX) / hw
      local i
      if u < -0.78 then i = 3 elseif u < -0.55 then i = 2 elseif u < -0.3 then i = 1 elseif u < -0.1 then i = 2
      elseif u < 0.25 then i = 3 elseif u < 0.6 then i = 4 else i = 5 end
      if (x - CX) % 4 == 0 and u > -0.6 then i = math.min(6, i + 1) end          -- vertical ribs
      px(im, x, y, M[i])
    end
  end
  -- two rolled bands (a dark groove under a bright lip)
  for _, by in ipairs({ 25, 34 }) do
    local hw = 11 - (by - TOP) * 2 / (BOT - TOP)
    for x = math.ceil(CX - hw), math.floor(CX + hw - 1) do
      px(im, x, by, M[5]); px(im, x, by + 1, M[2])
    end
  end
  -- bottom edge
  for x = CX - 9, CX + 8 do px(im, x, BOT, M[5]) end
  px(im, CX - 9, BOT, M[4]); px(im, CX + 8, BOT, M[6])
end

-- ------------------------------------------------------------------ rim (open top, seen slightly from above)
local function rim(im, open)
  for y = TOP - 3, TOP + 1 do
    local dy = (y - (TOP - 1)) / 2.6
    local hw = 12.5 * math.sqrt(math.max(0, 1 - dy * dy))
    for x = math.ceil(CX - hw), math.floor(CX + hw - 1) do
      px(im, x, y, (x < CX - 3 and y <= TOP - 2) and M[1] or M[3])
    end
  end
  if open then   -- dark inside of the can
    for y = TOP - 2, TOP do
      local dy = (y - (TOP - 1)) / 2.6
      local hw = 10.5 * math.sqrt(math.max(0, 1 - dy * dy))
      for x = math.ceil(CX - hw), math.floor(CX + hw - 1) do px(im, x, y, M[6]) end
    end
  end
end

-- ------------------------------------------------------------------ closed lid: low dome + handle
local function lid(im, dx, dy, tilt)
  -- dome
  for y = 0, 5 do
    local hw = 12.5 - y * 0.55
    for x = math.ceil(-hw), math.floor(hw - 1) do
      local X = CX + x + dx + math.floor(tilt * (5 - y) / 5 + 0.5)
      local Y = 12 + y + dy
      local i = (x < -5 and 2) or (x < -1 and 1) or (x < 5 and 3) or 4
      if y == 0 then i = 1 end
      if y >= 4 then i = math.min(5, i + 1) end
      px(im, X, Y, M[i])
    end
  end
  -- handle
  local hx = CX + dx + math.floor(tilt + 0.5)
  rect(im, hx - 3, 8 + dy, hx + 2, 8 + dy, M[1])
  rect(im, hx - 4, 9 + dy, hx - 3, 12 + dy, M[3]); rect(im, hx + 2, 9 + dy, hx + 3, 12 + dy, M[4])
  rect(im, hx - 3, 9 + dy, hx + 2, 9 + dy, M[2])
end

-- ------------------------------------------------------------------ damage
local function dent(im, x0, y0, w, h)        -- shallow dent: shadowed pit, lit lower edge
  for y = 0, h - 1 do
    local inset = math.abs(y - (h - 1) / 2) * 0.9
    for x = math.floor(inset), w - 1 - math.floor(inset) do px(im, x0 + x, y0 + y, y < h / 2 and M[5] or M[4]) end
  end
  for x = 1, w - 2 do px(im, x0 + x, y0 + h, M[1]) end
end

local function frame(level, f)
  local im = blank()
  body(im)
  if level >= 1 then
    dent(im, CX - 9, 27, 7, 5)
    dent(im, CX + 3, 20, 5, 4)
    for i = 0, 4 do px(im, CX - 6 + i, 37, M[5]) end                               -- scratch
  end
  if level >= 2 then
    -- torn hole + folded flap
    for y = 0, 6 do for x = 0, 5 do
      if (x + y * 0.55) < 6.2 and (x + y) > 0 then px(im, CX + 1 + x, 27 + y, M[6]) end
    end end
    for i = 0, 5 do px(im, CX + 1 + i, 26 + (i > 3 and 1 or 0), M[1]) end
    for i = 0, 6 do px(im, CX + i, 34, M[4]) end
    for i = 0, 7 do px(im, CX - 5 + i, 21 + i, M[5]) end                           -- crack
    for i = 0, 7 do px(im, CX - 4 + i, 21 + i, M[2]) end
    dent(im, CX - 10, 28, 5, 5)
  end
  rim(im, level >= 2)
  if level >= 2 then
    lid(im, 7, -1, 3)                                  -- lid knocked askew, resting on the rim
    rect(im, CX - 2, 14, CX + 4, 15, M[5])
    -- junk poking out of the top (drawn after the lid so it stays visible)
    local junk = { { -7, 13, "#ff6a3d" }, { -6, 12, "#ff6a3d" }, { -7, 14, "#c24a24" }, { -3, 11, "#3dffa0" }, { -2, 12, "#3dffa0" },
                   { -9, 14, "#ffe44d" }, { -4, 13, "#e6e6f0" }, { -5, 12, "#e6e6f0" }, { -4, 11, "#9aa0c0" }, { -8, 15, "#e6e6f0" } }
    for _, j in ipairs(junk) do px(im, CX + j[1], j[2], j[3]) end
  else
    lid(im, 0, 0, 0)
  end
  outline(im)
  return im
end

local function put(fr, im) spr:newCel(layer, spr.frames[fr], im, Point(0, 0)) end
put(1, frame(0)); put(2, frame(1)); put(3, frame(2))

-- loose lid (spare frame, not used by the game right now)
do
  local im = blank()
  lid(im, 0, 10, 0)
  outline(im)
  put(4, im)
end

local function tag(name, a, b) local t = spr:newTag(a, b); t.name = name end
tag("bin0", 1, 1); tag("bin1", 2, 2); tag("bin2", 3, 3); tag("lid", 4, 4)
spr:saveAs(out)
print("bin: " .. #spr.frames .. " frames -> " .. out)
