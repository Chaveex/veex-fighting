-- VEEX hero workspace for Aseprite.
-- Builds a ready-to-draw project: 128x128 canvas, 16px grid, VEEX palette, one frame per animation frame (same order/names as the game),
-- animation tags with durations, guide lines (ground, head, shoulders, hip, knee, pivot), a hurtbox slice, drawing layers,
-- and one locked reference layer (REF_3D = the generated 3D pose for each frame).
--
-- Run it headless:  aseprite -b --script-param root=F:/Dev/Claude/VeexingForce --script tools/ase/hero_workspace.lua
-- or inside Aseprite:  File > Scripts > Open Scripts Folder, copy this file there, then File > Scripts > hero_workspace
local root = app.params["root"] or "F:/Dev/Claude/VeexingForce"
local out  = app.params["out"]  or (root .. "/assets/hero_workspace.aseprite")

local function readjson(path)
  local f = assert(io.open(path, "r"), "cannot open " .. path); local s = f:read("a"); f:close(); return json.decode(s)
end
local spec = readjson(root .. "/assets/hero_spec.json")
local W, H = spec.w, spec.h
local function col(r, g, b, a) return Color{ r = r, g = g, b = b, a = a or 255 } end

local spr = Sprite(W, H, ColorMode.RGB)
spr:setPalette(Palette{ fromFile = root .. "/assets/palette/veex.gpl" })
spr.gridBounds = Rectangle(0, 0, 16, 16)

-- frames + durations (ms -> s)
for i = 2, #spec.frames do spr:newEmptyFrame() end
for i, f in ipairs(spec.frames) do spr.frames[i].duration = f.duration / 1000 end

-- layers, bottom -> top
local order = { "OMBRE_SOL", "BRAS_ARRIERE", "JAMBE_ARRIERE", "TORSE", "TETE", "JAMBE_AVANT", "BRAS_AVANT", "OMBRAGE", "LISERE_NEON", "GUIDES", "REF_3D" }
local L = {}
spr.layers[1].name = order[1]; L[order[1]] = spr.layers[1]
for i = 2, #order do local l = spr:newLayer(); l.name = order[i]; L[order[i]] = l end

local function setcel(layer, fi, img)
  local c = layer:cel(fi)
  if c then c.image = img; c.position = Point(0, 0) else spr:newCel(layer, fi, img, Point(0, 0)) end
end

-- ground shadow (dithered ellipse) so the feet are anchored from the first stroke
local function shadowImage()
  local img = Image(W, H, ColorMode.RGB); local c = col(36, 18, 48, 150)
  for y = spec.ay - 4, spec.ay + 4 do for x = spec.ax - 18, spec.ax + 18 do
    local dx, dy = (x - spec.ax) / 18, (y - spec.ay) / 4
    if dx * dx + dy * dy <= 1 and ((x + y) % 2 == 0 or dx * dx + dy * dy < 0.45) then img:drawPixel(x, y, c) end
  end end
  return img
end

-- guide lines: ground (solid magenta), proportions (dotted cyan), axis (dotted violet), pivot cross (yellow)
local function guidesImage()
  local img = Image(W, H, ColorMode.RGB)
  local cy, mg, vi, ye = col(39, 240, 255, 120), col(255, 47, 208, 190), col(139, 92, 255, 90), col(255, 228, 77, 255)
  for x = 0, W - 1 do img:drawPixel(x, spec.ay, mg); if x % 2 == 0 then
    for _, y in ipairs(spec.guides) do img:drawPixel(x, y, cy) end
  end end
  for y = 0, H - 1 do if y % 3 == 0 then img:drawPixel(spec.ax, y, vi) end end
  for d = -2, 2 do img:drawPixel(spec.ax + d, spec.ay, ye); img:drawPixel(spec.ax, spec.ay + d, ye) end
  return img
end

local shadow, guides = shadowImage(), guidesImage()
local sheet = Image{ fromFile = root .. "/assets/ref/hero_ref_sheet.png" }
for i = 1, #spec.frames do
  setcel(L["OMBRE_SOL"], i, shadow)
  setcel(L["GUIDES"], i, guides)
  local col0, row0 = (i - 1) % spec.cols, math.floor((i - 1) / spec.cols)
  local ref = Image(W, H, ColorMode.RGB); ref:drawImage(sheet, Point(-col0 * W, -row0 * H))
  setcel(L["REF_3D"], i, ref)
end

L["GUIDES"].opacity = 255; L["GUIDES"].isEditable = false
L["REF_3D"].opacity = 90;  L["REF_3D"].isEditable = false; L["REF_3D"].isVisible = true
L["LISERE_NEON"].opacity = 255

-- animation tags
local function hex(h) return col(tonumber(h:sub(2, 3), 16), tonumber(h:sub(4, 5), 16), tonumber(h:sub(6, 7), 16)) end
for _, t in ipairs(spec.tags) do
  local tag = spr:newTag(t.from + 1, t.to + 1); tag.name = t.name; tag.color = hex(t.color); tag.aniDir = AniDir.FORWARD
end

-- slices: hurtbox (what the game uses for the hero) + pivot (feet anchor)
local hb = spr:newSlice(Rectangle(spec.ax - 12, spec.ay - 86, 24, 86)); hb.name = "hurtbox"
local pv = spr:newSlice(Rectangle(spec.ax - 1, spec.ay - 1, 2, 2)); pv.name = "pivot"; pv.pivot = Point(1, 1)

app.transaction(function() end)
spr:saveAs(out)
print(string.format("workspace ready: %d frames, %d layers, %d tags -> %s", #spr.frames, #spr.layers, #spr.tags, out))
