-- Shared helpers for the Aseprite backdrop scripts (tools/ase/level<N>_bg.lua). Load with dofile(app.params["lib"])
-- after setting the globals WW, HH (canvas size). Everything here is global on purpose (one script = one run).
pc = app.pixelColor

-- ------------------------------------------------------------------ rng (deterministic)
seed = 1987
function rnd() seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 end
function ri(a, b) return a + math.floor(rnd() * (b - a + 1)) end
function pick(t) return t[ri(1, #t)] end

-- ------------------------------------------------------------------ palette
function rgb(h) return { tonumber(h:sub(2, 3), 16), tonumber(h:sub(4, 5), 16), tonumber(h:sub(6, 7), 16) } end
CACHE = {}
function C(h, a)
  local k = h .. (a or 255); local v = CACHE[k]
  if not v then local c = rgb(h); v = pc.rgba(c[1], c[2], c[3], a or 255); CACHE[k] = v end
  return v
end

-- ------------------------------------------------------------------ images (one per layer) + light accumulators
function newImg() local im = Image(WW, HH, ColorMode.RGB); im:clear(pc.rgba(0, 0, 0, 0)); return im end
ACC = { main = {}, flick = {}, bulbA = {}, bulbB = {} }


function px(im, x, y, c) if x >= 0 and y >= 0 and x < WW and y < HH then im:drawPixel(x, y, c) end end
function rect(im, x0, y0, x1, y1, c)
  x0 = math.max(0, math.floor(x0)); y0 = math.max(0, math.floor(y0)); x1 = math.min(WW - 1, math.floor(x1)); y1 = math.min(HH - 1, math.floor(y1))
  for y = y0, y1 do for x = x0, x1 do im:drawPixel(x, y, c) end end
end
function hline(im, x0, x1, y, c) rect(im, x0, y, x1, y, c) end
function vline(im, x, y0, y1, c) rect(im, x, y0, x, y1, c) end
function getA(im, x, y) if x < 0 or y < 0 or x >= WW or y >= HH then return 0 end; return pc.rgbaA(im:getPixel(x, y)) end

BAYER = { { 0, 8, 2, 10 }, { 12, 4, 14, 6 }, { 3, 11, 1, 9 }, { 15, 7, 13, 5 } }
function dith(x, y, t) return (BAYER[y % 4 + 1][x % 4 + 1] + 0.5) / 16 < t end

-- vertical banded gradient (list of hex), dithered only near the band edges (crisp pixel-art bands)
function vgrad(im, x0, y0, x1, y1, cols, soft)
  local n = #cols; soft = soft or 3
  for y = y0, y1 do
    local f = (y - y0) / math.max(1, y1 - y0) * (n - 1); local i = math.floor(f); local t = f - i
    local tt = math.max(0, math.min(1, (t - 0.5) * soft + 0.5))
    for x = x0, x1 do
      local c = cols[math.min(n, i + 1)]
      if i + 2 <= n and dith(x, y, tt) then c = cols[i + 2] end
      px(im, x, y, C(c))
    end
  end
end

-- light: radial emitter into an accumulator (additive layer)
function addL(acc, x, y, c, a)
  if x < 0 or y < 0 or x >= WW or y >= HH or a <= 0 then return end
  local k = y * WW + x; local g = acc[k]
  if not g then g = { 0, 0, 0 }; acc[k] = g end
  g[1] = g[1] + c[1] * a; g[2] = g[2] + c[2] * a; g[3] = g[3] + c[3] * a
end
function emit(acc, x, y, hexc, str, rad)
  local c = rgb(hexc)
  for dy = -rad, rad do for dx = -rad, rad do
    local d = math.sqrt(dx * dx + dy * dy)
    if d <= rad then local f = 1 - d / (rad + 0.5); addL(acc, x + dx, y + dy, c, str * f * f) end
  end end
end
-- downward light cone (lamps, shop windows): from (x, y0) widening to half-width hw at y1
function cone(acc, x, y0, y1, hw0, hw1, hexc, str)
  local c = rgb(hexc)
  for y = y0, y1 do
    local t = (y - y0) / math.max(1, y1 - y0); local hw = hw0 + (hw1 - hw0) * t
    for dx = -math.floor(hw), math.floor(hw) do
      local e = 1 - math.abs(dx) / (hw + 1)
      local a = str * (1 - t) ^ 1.3 * e ^ 0.8
      if dith(x + dx, y, math.min(1, a * 3)) then addL(acc, x + dx, y, c, a) end
    end
  end
end

-- ------------------------------------------------------------------ pixel font 5x7
FONT = {
  A = { ".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#" }, B = { "####.", "#...#", "#...#", "####.", "#...#", "#...#", "####." },
  C = { ".####", "#....", "#....", "#....", "#....", "#....", ".####" }, D = { "####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####." },
  E = { "#####", "#....", "#....", "####.", "#....", "#....", "#####" }, F = { "#####", "#....", "#....", "####.", "#....", "#....", "#...." },
  G = { ".####", "#....", "#....", "#.###", "#...#", "#...#", ".###." }, H = { "#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#" },
  I = { "#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####" }, K = { "#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#" },
  L = { "#....", "#....", "#....", "#....", "#....", "#....", "#####" }, M = { "#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#" },
  N = { "#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#" }, O = { ".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###." },
  P = { "####.", "#...#", "#...#", "####.", "#....", "#....", "#...." }, R = { "####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#" },
  S = { ".####", "#....", "#....", ".###.", "....#", "....#", "####." }, T = { "#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.." },
  U = { "#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###." }, V = { "#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.." },
  W = { "#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#" }, X = { "#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#" },
  Y = { "#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.." }, Z = { "#####", "....#", "...#.", "..#..", ".#...", "#....", "#####" },
  ["2"] = { ".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####" }, ["4"] = { "#..#.", "#..#.", "#..#.", "#####", "...#.", "...#.", "...#." },
  J = { "....#", "....#", "....#", "....#", "#...#", "#...#", ".###." }, Q = { ".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#" },
  ["0"] = { ".###.", "#..##", "#.#.#", "#.#.#", "#.#.#", "##..#", ".###." }, ["1"] = { "..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###." },
  ["3"] = { "####.", "....#", "....#", ".###.", "....#", "....#", "####." }, ["5"] = { "#####", "#....", "####.", "....#", "....#", "#...#", ".###." },
  ["6"] = { ".###.", "#....", "#....", "####.", "#...#", "#...#", ".###." }, ["7"] = { "#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..." },
  ["8"] = { ".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###." }, ["9"] = { ".###.", "#...#", "#...#", ".####", "....#", "....#", ".###." },
  ["?"] = { ".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.." }, ["."] = { ".....", ".....", ".....", ".....", ".....", ".....", "..#.." },
  ["&"] = { ".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#" },
  ["-"] = { ".....", ".....", ".....", "#####", ".....", ".....", "....." }, ["!"] = { "..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.." },
}
function textW(s, sc) local w = 0; for i = 1, #s do w = w + ((s:sub(i, i) == " ") and 4 or 6) end; return (w - 1) * sc end

-- neon tube lettering: tube colour, bright core on the inner pixel, halo in the accumulator. offOnly = unlit tubes (for flicker signs)
function neonText(im, acc, s, x, y, sc, tube, core, gstr, offOnly)
  local cx = x
  for i = 1, #s do
    local ch = s:sub(i, i)
    if ch == " " then cx = cx + 4 * sc else
      local g = FONT[ch]
      if g then
        for gy = 1, 7 do for gx = 1, 5 do
          if g[gy]:sub(gx, gx) == "#" then
            local bx, by = cx + (gx - 1) * sc, y + (gy - 1) * sc
            if offOnly then rect(im, bx, by, bx + sc - 1, by + sc - 1, C(tube, 255))
            else
              if im then rect(im, bx, by, bx + sc - 1, by + sc - 1, C(tube)); if sc > 1 then px(im, bx, by, C(core)) end end
              if acc then emit(acc, bx + sc // 2, by + sc // 2, tube, sc > 1 and gstr or gstr * 0.4, sc > 1 and 3 + sc * 2 or 3) end
            end
          end
        end end
      end
      cx = cx + 6 * sc
    end
  end
end

-- ================================================================== accumulators -> additive layers
function bake(acc, im, gain)
  im = im or newImg(); gain = gain or 1
  for k, g0 in pairs(acc) do
    local g = { g0[1] * gain, g0[2] * gain, g0[3] * gain }
    local x, y = k % WW, k // WW
    local a = math.min(255, math.max(g[1], g[2], g[3]))
    if a >= 2 then
      local s = 255 / math.max(g[1], g[2], g[3])
      local base = im:getPixel(x, y)
      if pc.rgbaA(base) > 0 then   -- keep drawn pixels (sign tubes) on top of the halo
      else im:drawPixel(x, y, pc.rgba(math.floor(math.min(255, g[1] * s)), math.floor(math.min(255, g[2] * s)), math.floor(math.min(255, g[3] * s)), math.floor(a))) end
    end
  end
  return im
end

-- save: order = { {name, image}, ... }; additive = layer names drawn in ADDITION mode
function saveLayers(out, order, additive)
  local spr = Sprite(WW, HH, ColorMode.RGB)
  spr.filename = out
  local first = spr.layers[1]
  for i, l in ipairs(order) do
    local layer = (i == 1) and first or spr:newLayer()
    layer.name = l[1]
    spr:newCel(layer, spr.frames[1], l[2], Point(0, 0))
    if additive[l[1]] then layer.blendMode = BlendMode.ADDITION end
  end
  spr:saveAs(out)
  return spr
end
