"""Tiny Aseprite toolkit: write a real .aseprite file (RGBA, N layers, frames with durations, tags, per-frame cels)
following aseprite/docs/ase-file-specs.md, plus a JSON in Aseprite's export format.
    write_ase(path, w, h, frames, tags)
      frames = [ {'layers': [PIL RGBA image per layer], 'duration': ms}, ... ]
      tags   = [ {'name': str, 'from': int, 'to': int, 'direction': 0} ]"""
import struct, zlib

def _w(v): return struct.pack('<H', v)
def _d(v): return struct.pack('<I', v)
def _s(s): b = s.encode('utf8'); return _w(len(b)) + b
def _chunk(t, body): return _d(len(body) + 6) + _w(t) + body

def write_ase(path, w, h, frames, tags, layer_names=('sprite',)):
    out = []
    for i, fr in enumerate(frames):
        chunks = []
        if i == 0:
            chunks.append(_chunk(0x2007, _w(1) + _w(0) + struct.pack('<i', 0) + bytes(8)))                     # sRGB colour profile
            for name in layer_names:
                chunks.append(_chunk(0x2004, _w(3) + _w(0) + _w(0) + _w(0) + _w(0) + _w(0) + bytes([255, 0, 0, 0]) + _s(name)))
        for li, im in enumerate(fr['layers']):
            assert im.size == (w, h) and im.mode == 'RGBA'
            chunks.append(_chunk(0x2005, _w(li) + struct.pack('<hh', 0, 0) + bytes([255]) + _w(2) + struct.pack('<h', 0) + bytes(5)
                                 + _w(w) + _w(h) + zlib.compress(im.tobytes(), 9)))
        if i == 0 and tags:
            body = _w(len(tags)) + bytes(8)
            for t in tags:
                body += _w(t['from']) + _w(t['to']) + bytes([t.get('direction', 0)]) + _w(0) + bytes(6) + bytes([0, 0, 0]) + bytes([0]) + _s(t['name'])
            chunks.append(_chunk(0x2018, body))
        body = b''.join(chunks); n = len(chunks)
        out.append(_d(len(body) + 16) + _w(0xF1FA) + _w(n) + _w(fr.get('duration', 100)) + bytes(2) + _d(n) + body)
    blob = b''.join(out)
    header = (_d(128 + len(blob)) + _w(0xA5E0) + _w(len(frames)) + _w(w) + _w(h) + _w(32) + _d(1) + _w(100) + _d(0) + _d(0)
              + bytes([0]) + bytes(3) + _w(0) + bytes([1, 1]) + struct.pack('<hhHH', 0, 0, 16, 16) + bytes(84))
    assert len(header) == 128
    open(path, 'wb').write(header + blob)

def check_ase(path):
    """independent re-parse; returns (frames, layers, tags, cels). raises if the structure is inconsistent"""
    b = open(path, 'rb').read()
    size, magic, nframes, w, h, depth = struct.unpack_from('<IHHHHH', b, 0)
    assert size == len(b) and magic == 0xA5E0 and depth == 32
    off, layers, tags, cels = 128, [], [], 0
    for f in range(nframes):
        fsize, fmagic, old, dur, _, new = struct.unpack_from('<IHHH2sI', b, off); assert fmagic == 0xF1FA
        p = off + 16
        for _c in range(new):
            csize, ctype = struct.unpack_from('<IH', b, p); body = b[p + 6:p + csize]
            if ctype == 0x2004: layers.append(body[18:18 + struct.unpack_from('<H', body, 16)[0]].decode())
            if ctype == 0x2005:
                cw, ch = struct.unpack_from('<HH', body, 16); assert len(zlib.decompress(body[20:])) == cw * ch * 4; cels += 1
            if ctype == 0x2018:
                n = struct.unpack_from('<H', body, 0)[0]; q = 10
                for _t in range(n):
                    fr, to = struct.unpack_from('<HH', body, q); q += 7 + 6 + 3 + 1
                    ln = struct.unpack_from('<H', body, q)[0]; tags.append((body[q + 2:q + 2 + ln].decode(), fr, to)); q += 2 + ln
            p += csize
        assert p == off + fsize; off += fsize
    assert off == len(b)
    return nframes, layers, tags, cels
