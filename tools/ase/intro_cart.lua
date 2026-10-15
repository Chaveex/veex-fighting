-- INTRO shopping cart (64x48), faces right: handle on the left. Groceries piled in. See tools/make_intro.py.
local out = app.params["out"]
WW, HH = 64, 48
dofile(app.params["lib"])
seed = 77
local I = newImg()
local function line(im, x0, y0, x1, y1, c)   -- Bresenham
  local dx, dy = math.abs(x1 - x0), -math.abs(y1 - y0); local sx, sy = x0 < x1 and 1 or -1, y0 < y1 and 1 or -1; local e = dx + dy
  while true do px(im, x0, y0, c); if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * e; if e2 >= dy then e = e + dy; x0 = x0 + sx end; if e2 <= dx then e = e + dx; y0 = y0 + sy end end
end
local METAL, METAL2, DARK = "#c8cce8", "#8a90b8", "#14091f"
-- groceries first (behind the front wire)
local function box(x, y, w, h, c, c2) rect(I, x, y, x + w - 1, y + h - 1, C(c)); vline(I, x, y, y + h - 1, C(c2)); hline(I, x, x + w - 1, y, C(c2)); rect(I, x + 1, y + h // 2 - 1, x + w - 2, y + h // 2, C("#f4f0ff")) end
box(14, 6, 8, 12, "#ffe44d", "#fff4a0"); box(23, 8, 8, 10, "#ff2fd0", "#ffb0e8"); box(32, 4, 9, 14, "#27f0ff", "#c0fbff"); box(42, 9, 8, 9, "#3dffa0", "#b8ffe0")
rect(I, 30, 0, 32, 6, C("#8b5cff")); px(I, 31, 0, C("#f4f0ff"))                                   -- bottle neck
for i = 0, 11 do px(I, 18 + i, 5 - i // 3, C("#e0a050")); px(I, 18 + i, 6 - i // 3, C("#c07a30")) end   -- baguette
-- basket: tapered wire box
for y = 12, 31 do
  local t = (y - 12) / 19; local x0 = math.floor(10 + t * 5); local x1 = math.floor(56 - t * 6)
  px(I, x0, y, C(METAL)); px(I, x1, y, C(METAL)); px(I, x0 + 1, y, C(METAL2)); px(I, x1 - 1, y, C(METAL2))
  if y % 4 == 0 then hline(I, x0, x1, y, C(METAL)) end
end
for x = 12, 54, 4 do vline(I, x + math.floor((x - 32) * -0.05), 13, 30, C(METAL2)) end
hline(I, 10, 56, 12, C("#ffffff")); hline(I, 10, 56, 13, C(METAL))
hline(I, 15, 50, 32, C(METAL)); hline(I, 15, 50, 33, C(METAL2))
-- handle (left) + frame + wheels
rect(I, 2, 9, 11, 10, C("#ff2fd0")); rect(I, 2, 10, 3, 14, C(METAL)); line(I, 3, 14, 15, 33, C(METAL))
line(I, 20, 34, 18, 40, C(METAL2)); line(I, 46, 34, 48, 40, C(METAL2)); hline(I, 17, 49, 35, C(METAL2))
local function wheel(cx, cy) rect(I, cx - 3, cy - 3, cx + 3, cy + 3, C(DARK)); rect(I, cx - 2, cy - 2, cx + 2, cy + 2, C("#4a4a78")); px(I, cx, cy, C("#c8cce8")) end
wheel(17, 43); wheel(49, 43)
local spr = saveLayers(out, { { "cart", I } }, {})
print("cart ok")
