"""Gera artes originais (poster 2:3 e backdrop 16:9) para o catálogo demo da Lanterna.

Cada título recebe uma cena procedural (skyline, paisagem, floresta, espaço, água,
bokeh, céu de anime, místico) com paleta própria. Não há texto nas imagens: o título
é renderizado pela interface.

Uso: python3 scripts/generate_art.py  -> grava em src/assets/art/
"""
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "art")
os.makedirs(OUT, exist_ok=True)


def hex2rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def vgrad(w, h, stops):
    """Gradiente vertical com paradas [(pos, hex)]."""
    ys = np.linspace(0, 1, h)
    out = np.zeros((h, w, 3), np.float32)
    for c in range(3):
        xs = [s[0] for s in stops]
        vs = [hex2rgb(s[1])[c] for s in stops]
        out[:, :, c] = np.interp(ys, xs, vs)[:, None]
    return out


def radial(w, h, cx, cy, r, color, strength=1.0):
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r
    a = np.clip(1 - d, 0, 1) ** 2 * strength
    return a[:, :, None] * hex2rgb(color)[None, None, :], a


def blend_glow(img, w, h, cx, cy, r, color, strength=0.8):
    g, _ = radial(w, h, cx, cy, r, color, strength)
    return img + g


def to_img(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def vignette(img, amount=0.55):
    w, h = img.size
    arr = np.asarray(img).astype(np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    m = 1 - np.clip(d - 0.55, 0, 1) * amount
    return to_img(arr * m[:, :, None])


def ridge(rng, w, base, amp, rough, n=7):
    pts = []
    phase = [rng.random() * 6.28 for _ in range(n)]
    for x in range(0, w + 8, 8):
        y = base
        for i in range(n):
            f = (i + 1) * rough
            y += math.sin(x / w * f * 6.28 + phase[i]) * amp / (i + 1)
        pts.append((x, y))
    return pts


def draw_poly_layer(img, pts, h, color, blur=0):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.polygon(pts + [(img.size[0], h), (0, h)], fill=color)
    if blur:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(layer)


def rgba(hexc, a=255):
    c = hex2rgb(hexc).astype(int)
    return (int(c[0]), int(c[1]), int(c[2]), a)


# ---------------------------------------------------------------- cenas

def scene_skyline(w, h, rng, p):
    sky = vgrad(w, h, [(0, p["sky0"]), (0.6, p["sky1"]), (1, p["sky2"])])
    sky = blend_glow(sky, w, h, w * p.get("gx", 0.7), h * 0.62, w * 0.55, p["glow"], 0.9)
    img = to_img(sky).convert("RGBA")
    d = ImageDraw.Draw(img)
    for layer, (shade, hmin, hmax, lit) in enumerate([
        (p["far"], 0.25, 0.45, 0.04), (p["mid"], 0.35, 0.6, 0.08), (p["near"], 0.45, 0.78, 0.12)
    ]):
        x = -rng.randint(0, 40)
        while x < w:
            bw = rng.randint(int(w * 0.04), int(w * 0.11))
            bh = h * rng.uniform(hmin, hmax)
            top = h - bh
            d.rectangle([x, top, x + bw, h], fill=rgba(shade))
            if rng.random() < 0.25:
                d.rectangle([x + bw * 0.4, top - h * 0.04, x + bw * 0.5, top], fill=rgba(shade))
            step = max(5, int(w * 0.012))
            for wy in range(int(top + step), h, step):
                for wx in range(int(x + step * 0.6), int(x + bw - step * 0.6), step):
                    if rng.random() < lit:
                        c = p["win"] if rng.random() < 0.8 else p["glow"]
                        d.rectangle([wx, wy, wx + step * 0.45, wy + step * 0.55], fill=rgba(c, 230))
            x += bw + rng.randint(0, 6)
    if p.get("haze"):
        haze = Image.new("RGBA", img.size, (0, 0, 0, 0))
        hd = ImageDraw.Draw(haze)
        hd.rectangle([0, h * 0.72, w, h], fill=rgba(p["haze"], 90))
        img.alpha_composite(haze.filter(ImageFilter.GaussianBlur(h * 0.05)))
    return img


def scene_landscape(w, h, rng, p):
    sky = vgrad(w, h, [(0, p["sky0"]), (0.55, p["sky1"]), (1, p["sky2"])])
    sx, sy = w * p.get("sx", 0.62), h * p.get("sy", 0.45)
    sky = blend_glow(sky, w, h, sx, sy, w * 0.45, p["glow"], 0.85)
    img = to_img(sky).convert("RGBA")
    d = ImageDraw.Draw(img)
    r = min(w, h) * p.get("sr", 0.08)
    d.ellipse([sx - r, sy - r, sx + r, sy + r], fill=rgba(p["sun"]))
    for i, col in enumerate(p["layers"]):
        base = h * (0.5 + i * 0.12)
        pts = ridge(rng, w, base, h * p.get("amp", 0.09) * (1 - i * 0.12), p.get("rough", 1.4) + i * 0.4)
        draw_poly_layer(img, pts, h, rgba(col), blur=1 if i == 0 else 0)
    return img


def scene_forest(w, h, rng, p):
    sky = vgrad(w, h, [(0, p["sky0"]), (0.6, p["sky1"]), (1, p["sky2"])])
    mx, my = w * p.get("mx", 0.68), h * 0.3
    sky = blend_glow(sky, w, h, mx, my, w * 0.4, p["glow"], 0.9)
    img = to_img(sky).convert("RGBA")
    d = ImageDraw.Draw(img)
    r = min(w, h) * 0.11
    d.ellipse([mx - r, my - r, mx + r, my + r], fill=rgba(p["moon"]))
    for li, (col, scale) in enumerate([(p["far"], 0.55), (p["near"], 1.0)]):
        x = -10
        while x < w + 20:
            th = h * rng.uniform(0.35, 0.7) * scale
            tw = w * rng.uniform(0.025, 0.05) * (0.7 + scale * 0.5)
            base = h * (0.82 + li * 0.08)
            d.polygon([(x, base), (x + tw / 2, base - th), (x + tw, base)], fill=rgba(col))
            d.rectangle([x + tw * 0.45, base - 4, x + tw * 0.55, h], fill=rgba(col))
            x += tw * rng.uniform(0.45, 0.9)
        d.rectangle([0, h * (0.82 + li * 0.08), w, h], fill=rgba(col))
    fog = Image.new("RGBA", img.size, (0, 0, 0, 0))
    fd = ImageDraw.Draw(fog)
    for _ in range(6):
        fy = h * rng.uniform(0.6, 0.9)
        x0 = rng.uniform(-w * 0.3, w * 0.5)
        fd.ellipse([x0, fy, max(x0 + w * 0.2, rng.uniform(w * 0.5, w * 1.3)), fy + h * 0.12],
                   fill=rgba(p["fog"], 70))
    img.alpha_composite(fog.filter(ImageFilter.GaussianBlur(h * 0.04)))
    return img


def scene_space(w, h, rng, p):
    sky = vgrad(w, h, [(0, p["sky0"]), (1, p["sky1"])])
    sky = blend_glow(sky, w, h, w * 0.25, h * 0.3, w * 0.6, p["nebula"], 0.55)
    sky = blend_glow(sky, w, h, w * 0.8, h * 0.8, w * 0.5, p["nebula2"], 0.45)
    img = to_img(sky).convert("RGBA")
    d = ImageDraw.Draw(img)
    for _ in range(int(w * h / 900)):
        x, y = rng.random() * w, rng.random() * h
        s = rng.choice([0.6, 0.8, 1.0, 1.6])
        a = rng.randint(90, 255)
        d.ellipse([x, y, x + s, y + s], fill=(255, 255, 255, a))
    if p.get("planet"):
        px, py = w * p.get("px", 0.66), h * p.get("py", 0.62)
        pr = min(w, h) * p.get("pr", 0.34)
        planet = Image.new("RGBA", img.size, (0, 0, 0, 0))
        pd = ImageDraw.Draw(planet)
        steps = 40
        for i in range(steps):
            t = i / steps
            c = hex2rgb(p["planet"]) * (1 - t) + hex2rgb(p["planet2"]) * t
            rr = pr * (1 - t * 0.35)
            ox, oy = -pr * 0.35 * t, -pr * 0.35 * t
            pd.ellipse([px + ox - rr, py + oy - rr, px + ox + rr, py + oy + rr],
                       fill=(int(c[0]), int(c[1]), int(c[2]), 255))
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).ellipse([px - pr, py - pr, px + pr, py + pr], fill=255)
        planet.putalpha(mask)
        shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(shadow).ellipse([px - pr * 0.6, py - pr * 0.6, px + pr * 1.5, py + pr * 1.5],
                                       fill=(0, 0, 8, 190))
        shadow = shadow.filter(ImageFilter.GaussianBlur(pr * 0.25))
        sm = Image.new("L", img.size, 0)
        ImageDraw.Draw(sm).ellipse([px - pr, py - pr, px + pr, py + pr], fill=255)
        planet.alpha_composite(Image.composite(shadow, Image.new("RGBA", img.size, (0, 0, 0, 0)), sm))
        glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(glow).ellipse([px - pr * 1.08, py - pr * 1.08, px + pr * 1.08, py + pr * 1.08],
                                     outline=rgba(p["rim"], 160), width=max(2, int(pr * 0.03)))
        img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(pr * 0.04)))
        img.alpha_composite(planet)
        if p.get("ring"):
            ring = Image.new("RGBA", img.size, (0, 0, 0, 0))
            ImageDraw.Draw(ring).ellipse([px - pr * 1.9, py - pr * 0.32, px + pr * 1.9, py + pr * 0.32],
                                         outline=rgba(p["rim"], 200), width=max(2, int(pr * 0.05)))
            img.alpha_composite(ring.rotate(-14, center=(px, py)))
    if p.get("tower"):
        tx = w * 0.3
        d.polygon([(tx - w * 0.05, h), (tx, h * 0.35), (tx + w * 0.05, h)], fill=rgba("#05060a"))
        d.ellipse([tx - 5, h * 0.35 - 5, tx + 5, h * 0.35 + 5], fill=rgba(p["rim"]))
        img = img.convert("RGBA")
        pts = ridge(rng, w, h * 0.88, h * 0.04, 1.2)
        draw_poly_layer(img, pts, h, rgba("#04050a"))
    if p.get("grid"):
        gl = Image.new("RGBA", img.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(gl)
        hz = h * 0.62
        for i in range(-20, 21):
            gd.line([(w / 2 + i * w * 0.02, hz), (w / 2 + i * w * 0.25, h)], fill=rgba(p["rim"], 120), width=1)
        y = hz
        k = 1
        while y < h:
            gd.line([(0, y), (w, y)], fill=rgba(p["rim"], 110), width=1)
            y += k
            k *= 1.35
        img.alpha_composite(gl)
    return img


def scene_water(w, h, rng, p):
    if p.get("under"):
        arr = vgrad(w, h, [(0, p["sky0"]), (0.5, p["sky1"]), (1, p["sky2"])])
        img = to_img(arr).convert("RGBA")
        rays = Image.new("RGBA", img.size, (0, 0, 0, 0))
        rd = ImageDraw.Draw(rays)
        for _ in range(9):
            x = rng.uniform(0, w)
            sp = rng.uniform(w * 0.03, w * 0.1)
            rd.polygon([(x, 0), (x + sp, 0), (x + sp * 3 - w * 0.2, h), (x - w * 0.2, h)], fill=rgba(p["glow"], 40))
        img.alpha_composite(rays.filter(ImageFilter.GaussianBlur(w * 0.01)))
        d = ImageDraw.Draw(img)
        for _ in range(40):
            x, y, s = rng.uniform(0, w), rng.uniform(0, h), rng.uniform(1, min(w, h) * 0.012)
            d.ellipse([x, y, x + s, y + s], outline=rgba("#d8f3ff", 120))
        whale = Image.new("RGBA", img.size, (0, 0, 0, 0))
        wd = ImageDraw.Draw(whale)
        cx, cy = w * 0.55, h * 0.62
        wd.ellipse([cx - w * 0.28, cy - h * 0.07, cx + w * 0.2, cy + h * 0.07], fill=rgba("#06202e", 220))
        wd.polygon([(cx + w * 0.18, cy), (cx + w * 0.3, cy - h * 0.09), (cx + w * 0.28, cy + h * 0.06)], fill=rgba("#06202e", 220))
        img.alpha_composite(whale.filter(ImageFilter.GaussianBlur(3)))
        return img
    hz = p.get("hz", 0.55)
    sky = vgrad(w, h, [(0, p["sky0"]), (hz, p["sky1"]), (1, p["sea"])])
    sx = w * p.get("sx", 0.5)
    sky = blend_glow(sky, w, h, sx, h * hz, w * 0.5, p["glow"], 0.9)
    img = to_img(sky).convert("RGBA")
    d = ImageDraw.Draw(img)
    r = min(w, h) * 0.09
    d.ellipse([sx - r, h * hz - r * 1.2, sx + r, h * hz + r * 0.8], fill=rgba(p["sun"]))
    d.rectangle([0, h * hz, w, h], fill=rgba(p["sea"]))
    sea = np.asarray(img).astype(np.float32)
    for y in range(int(h * hz), h):
        t = (y - h * hz) / (h * (1 - hz))
        for _ in range(int(3 + t * 5)):
            x = rng.gauss(sx, w * (0.04 + t * 0.12))
            lw = rng.uniform(4, 30) * (0.5 + t)
            x0, x1 = int(max(0, x - lw)), int(min(w, x + lw))
            if x1 > x0:
                sea[y, x0:x1, :3] = sea[y, x0:x1, :3] * 0.4 + hex2rgb(p["sun"]) * 0.6
    img = Image.fromarray(np.clip(sea, 0, 255).astype(np.uint8), "RGBA")
    if p.get("banks"):
        pts = ridge(rng, w, h * (hz - 0.02), h * 0.03, 2.0)
        draw_poly_layer(img, [(x, min(y, h * hz)) for x, y in pts][: len(pts) // 3] + [(w * 0.33, h * hz)], h * hz + 1, rgba(p["banks"]))
    return img


def scene_bokeh(w, h, rng, p):
    arr = vgrad(w, h, [(0, p["sky0"]), (1, p["sky1"])])
    img = to_img(arr).convert("RGBA")
    if p.get("beams"):
        bl = Image.new("RGBA", img.size, (0, 0, 0, 0))
        bd = ImageDraw.Draw(bl)
        for i, x in enumerate([0.2, 0.5, 0.8]):
            c = p["colors"][i % len(p["colors"])]
            bd.polygon([(w * x - w * 0.015, 0), (w * x + w * 0.015, 0), (w * x + w * 0.22, h), (w * x - w * 0.22, h)], fill=rgba(c, 55))
        img.alpha_composite(bl.filter(ImageFilter.GaussianBlur(w * 0.02)))
        d = ImageDraw.Draw(img)
        d.rectangle([0, h * 0.85, w, h], fill=rgba(p["floor"]))
        d.rectangle([0, 0, w * 0.08, h], fill=rgba(p["curtain"]))
        d.rectangle([w * 0.92, 0, w, h], fill=rgba(p["curtain"]))
    for layer, (count, rmin, rmax, alpha, blur) in enumerate([(26, 0.03, 0.08, 70, 6), (14, 0.05, 0.12, 110, 3)]):
        lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        for _ in range(count):
            x, y = rng.uniform(0, w), rng.uniform(0, h * 0.8)
            r = min(w, h) * rng.uniform(rmin, rmax)
            ld.ellipse([x - r, y - r, x + r, y + r], fill=rgba(rng.choice(p["colors"]), alpha))
        img.alpha_composite(lay.filter(ImageFilter.GaussianBlur(blur)))
    return img


def scene_anime(w, h, rng, p):
    sky = vgrad(w, h, [(0, p["sky0"]), (0.6, p["sky1"]), (1, p["sky2"])])
    sky = blend_glow(sky, w, h, w * 0.3, h * 0.25, w * 0.5, "#fff3c4", 0.5)
    img = to_img(sky).convert("RGBA")
    cl = Image.new("RGBA", img.size, (0, 0, 0, 0))
    cd = ImageDraw.Draw(cl)
    for _ in range(14):
        cx, cy = rng.uniform(-w * 0.1, w * 1.1), rng.uniform(h * 0.15, h * 0.55)
        for _ in range(6):
            r = min(w, h) * rng.uniform(0.04, 0.1)
            ox, oy = rng.uniform(-r * 1.5, r * 1.5), rng.uniform(-r * 0.4, r * 0.3)
            cd.ellipse([cx + ox - r, cy + oy - r, cx + ox + r, cy + oy + r], fill=rgba("#ffffff", 210))
    img.alpha_composite(cl.filter(ImageFilter.GaussianBlur(2)))
    for i, col in enumerate(p["layers"]):
        pts = ridge(rng, w, h * (0.62 + i * 0.12), h * 0.07, 1.1 + i * 0.5)
        draw_poly_layer(img, pts, h, rgba(col))
    d = ImageDraw.Draw(img)
    for _ in range(int(w / 6)):
        x, y = rng.uniform(0, w), rng.uniform(h * 0.15, h * 0.85)
        d.line([(x, y), (x + w * 0.03, y - h * 0.008)], fill=rgba("#ffffff", 90), width=1)
    return img


def scene_mystic(w, h, rng, p):
    arr = vgrad(w, h, [(0, p["sky0"]), (1, p["sky1"])])
    arr = blend_glow(arr, w, h, w * 0.5, h * 0.5, min(w, h) * 0.7, p["glow"], 0.9)
    img = to_img(arr).convert("RGBA")
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(lay)
    cx, cy = w * 0.5, h * 0.5
    for i in range(7):
        r = min(w, h) * (0.12 + i * 0.07)
        ld.ellipse([cx - r, cy - r, cx + r, cy + r], outline=rgba(p["line"], 170 - i * 18), width=max(1, int(min(w, h) * 0.004)))
        teeth = 12 + i * 6
        for k in range(teeth):
            a = k / teeth * 6.283 + i * 0.2
            x0, y0 = cx + math.cos(a) * r, cy + math.sin(a) * r
            x1, y1 = cx + math.cos(a) * (r + min(w, h) * 0.015), cy + math.sin(a) * (r + min(w, h) * 0.015)
            ld.line([(x0, y0), (x1, y1)], fill=rgba(p["line"], 150 - i * 15), width=max(1, int(min(w, h) * 0.004)))
    ld.line([(cx, cy), (cx + min(w, h) * 0.2, cy - min(w, h) * 0.1)], fill=rgba(p["line"], 230), width=max(2, int(min(w, h) * 0.008)))
    ld.line([(cx, cy), (cx - min(w, h) * 0.05, cy - min(w, h) * 0.28)], fill=rgba(p["line"], 230), width=max(2, int(min(w, h) * 0.006)))
    img.alpha_composite(lay.filter(ImageFilter.GaussianBlur(0.6)))
    d = ImageDraw.Draw(img)
    for _ in range(140):
        x, y = rng.gauss(cx, w * 0.25), rng.gauss(cy, h * 0.25)
        s = rng.uniform(0.8, 2.6)
        d.ellipse([x, y, x + s, y + s], fill=rgba(p["line"], rng.randint(80, 220)))
    return img


SCENES = {
    "skyline": scene_skyline, "landscape": scene_landscape, "forest": scene_forest,
    "space": scene_space, "water": scene_water, "bokeh": scene_bokeh,
    "anime": scene_anime, "mystic": scene_mystic,
}

P = {
    "city-night": ("skyline", dict(sky0="#060a18", sky1="#1d2547", sky2="#e0663a", glow="#ff7a3d", far="#151a33", mid="#0d1024", near="#05060d", win="#ffd38a", haze="#ff8a4d")),
    "neon": ("skyline", dict(sky0="#0a0418", sky1="#2a0b45", sky2="#ff2f8e", glow="#ff3fa4", far="#1d0f3a", mid="#120828", near="#060310", win="#4ff0ff", haze="#a02bd6", gx=0.35)),
    "golden-city": ("skyline", dict(sky0="#2c3e63", sky1="#e8a061", sky2="#ffd9a0", glow="#ffcf7a", far="#7d5a5a", mid="#4a3342", near="#22161f", win="#fff1c2")),
    "industrial": ("skyline", dict(sky0="#121416", sky1="#3b3f43", sky2="#b9b1a0", glow="#ffb36b", far="#2a2d30", mid="#1b1d20", near="#0a0b0c", win="#ffbf6b", haze="#7b7a75", gx=0.3)),
    "windows": ("skyline", dict(sky0="#020305", sky1="#0b1016", sky2="#1a2229", glow="#5a7a6a", far="#0a0d10", mid="#06080a", near="#020203", win="#c8ffcf")),
    "mountains-dusk": ("landscape", dict(sky0="#1a1433", sky1="#7a3b5e", sky2="#f08a5d", glow="#ffb27a", sun="#ffe2b0", layers=["#5b2f52", "#3a1f3f", "#1f1226", "#0c0710"], sy=0.48)),
    "ice": ("landscape", dict(sky0="#0d1b2e", sky1="#5f8fb5", sky2="#dcecf7", glow="#e8f6ff", sun="#ffffff", layers=["#9fbfd9", "#6d93b4", "#3c5f80", "#14263a"], rough=2.2, amp=0.14, sr=0.05, sy=0.3)),
    "savanna": ("landscape", dict(sky0="#3a1d0e", sky1="#d9622b", sky2="#ffc46b", glow="#ffd27a", sun="#fff0c8", layers=["#8a4a24", "#5e2f16", "#2e170b"], amp=0.04, rough=0.8, sr=0.12, sy=0.58)),
    "fields": ("landscape", dict(sky0="#6f8fa8", sky1="#e9cf9c", sky2="#f4e2b8", glow="#fff3cf", sun="#fffaf0", layers=["#b79a52", "#8f7a3a", "#5d5226", "#2f2b16"], amp=0.03, rough=0.6, sr=0.07, sy=0.38)),
    "dunes": ("landscape", dict(sky0="#4a1c12", sky1="#c2452b", sky2="#f29a52", glow="#ffb36b", sun="#fff0d0", layers=["#d97a3f", "#b0532b", "#7a321a", "#3c170c"], amp=0.07, rough=0.7, sr=0.06, sy=0.36, sx=0.3)),
    "forest-moon": ("forest", dict(sky0="#07040a", sky1="#2a0a12", sky2="#4a0e14", glow="#c4152b", moon="#ff5a4a", far="#1a0609", near="#040102", fog="#7a1c26")),
    "fog": ("forest", dict(sky0="#0b0f12", sky1="#2b3438", sky2="#56625f", glow="#a3b5ad", moon="#dfe8e2", far="#1e2528", near="#080a0b", fog="#b5c2bc", mx=0.3)),
    "planet": ("space", dict(sky0="#02030a", sky1="#0b0f24", nebula="#3a3fbf", nebula2="#bf4a8a", planet="#f2b36b", planet2="#7a3a2a", rim="#ffd9a0", ring=True)),
    "tower-stars": ("space", dict(sky0="#02040a", sky1="#0f1a33", nebula="#1f5c8a", nebula2="#2a2a5a", tower=True, rim="#ff4d4d")),
    "tech": ("space", dict(sky0="#030409", sky1="#0b1022", nebula="#1b7f9e", nebula2="#5b2bd6", rim="#4fe3ff", grid=True)),
    "pale-planet": ("space", dict(sky0="#03040a", sky1="#152238", nebula="#3a9ac0", nebula2="#8a3f9f", planet="#e6f7ff", planet2="#5a8ac0", rim="#e6fbff", px=0.3, py=0.55, pr=0.3)),
    "sea": ("water", dict(sky0="#1b2a4a", sky1="#e48a6a", sea="#1c2f4f", glow="#ffb48a", sun="#ffe0b8", hz=0.56)),
    "river": ("water", dict(sky0="#20354a", sky1="#9fb6a5", sea="#22413f", glow="#e9f0c9", sun="#fbfbe9", hz=0.5, sx=0.35, banks="#16251f")),
    "underwater": ("water", dict(sky0="#3fb4d1", sky1="#0f5a7a", sky2="#03192a", glow="#c9f6ff", under=True)),
    "pastel": ("bokeh", dict(sky0="#ffd1dc", sky1="#ffb38a", colors=["#ffffff", "#fff2a8", "#ff8fb1", "#ffd6a5"])),
    "bokeh": ("bokeh", dict(sky0="#2a1018", sky1="#5a2a2a", colors=["#ffcf8a", "#ff9a7a", "#fff0c4", "#ffb0b0"])),
    "stage": ("bokeh", dict(sky0="#0b0610", sky1="#2a0f2a", colors=["#ffd27a", "#ff7ab8", "#7ad0ff"], beams=True, floor="#1a0c14", curtain="#5a0f1f")),
    "anime-sky": ("anime", dict(sky0="#2a7fe0", sky1="#7fc4ff", sky2="#cfeeff", layers=["#6aa7d6", "#3f7d6a", "#1f4a3a"])),
    "anime-dusk": ("anime", dict(sky0="#4a3aa8", sky1="#f08ab0", sky2="#ffd2a8", layers=["#8a6ab8", "#5a3f7a", "#2a1a3f"])),
    "windows-red": ("skyline", dict(sky0="#050203", sky1="#1a0707", sky2="#4a0f0f", glow="#b0201f", far="#120505", mid="#0a0303", near="#030101", win="#ff6a4a")),
    "sea-teal": ("water", dict(sky0="#0f3b4a", sky1="#f2c27a", sea="#0d3340", glow="#ffd27a", sun="#fff4d6", hz=0.6, sx=0.7)),
    "fog-blue": ("forest", dict(sky0="#050a14", sky1="#14243a", sky2="#2c4a66", glow="#5d8fc4", moon="#cfe6ff", far="#0f1a28", near="#03060b", fog="#8fb3d9", mx=0.75)),
    "neon-cyan": ("skyline", dict(sky0="#020818", sky1="#062a4a", sky2="#00a8e0", glow="#29d3ff", far="#0a1e38", mid="#061226", near="#020610", win="#ff4fd8", haze="#1a8ac4", gx=0.6)),
    "pastel-mint": ("bokeh", dict(sky0="#bff0dc", sky1="#ffe0a0", colors=["#ffffff", "#9ff0c8", "#ffd27a", "#ff9fb8"])),
    "savanna-green": ("landscape", dict(sky0="#1f4f6a", sky1="#86b9a0", sky2="#f2d08a", glow="#fff0b0", sun="#fffbe6", layers=["#5f8a4a", "#3f6a35", "#244522", "#0f2410"], amp=0.05, rough=0.9, sr=0.06, sy=0.34, sx=0.25)),
    "industrial-blue": ("skyline", dict(sky0="#070b14", sky1="#1d2a3d", sky2="#6c7d95", glow="#9fc3ff", far="#18212f", mid="#0f151f", near="#05070b", win="#cfe3ff", haze="#4a5c78", gx=0.25)),
    "city-rain": ("skyline", dict(sky0="#03121a", sky1="#0d3644", sky2="#38a7b8", glow="#7fe3f0", far="#0c2a33", mid="#071a21", near="#02080b", win="#e9fbff", haze="#3a8a99", gx=0.45)),
    "city-sunset": ("skyline", dict(sky0="#2a1438", sky1="#c2532f", sky2="#ffb35a", glow="#ffa34a", far="#5a2a3a", mid="#341726", near="#140910", win="#ffe0a0", haze="#d0683a", gx=0.6)),
    "sertao-night": ("landscape", dict(sky0="#070d1f", sky1="#1d2c55", sky2="#7a5a6a", glow="#c9a0b0", sun="#f4ead2", layers=["#3a2a3a", "#26192a", "#140c17"], amp=0.03, rough=0.7, sr=0.05, sy=0.3, sx=0.72)),
    "dunes-pale": ("landscape", dict(sky0="#b9a07a", sky1="#e8d2a6", sky2="#f6e6c4", glow="#fff4dc", sun="#fffaf0", layers=["#d8b98a", "#c49a66", "#a07448", "#6e4a2a"], amp=0.06, rough=0.6, sr=0.04, sy=0.28, sx=0.7)),
    "granite": ("landscape", dict(sky0="#22304d", sky1="#c98a5a", sky2="#f2c89a", glow="#ffd2a0", sun="#fff3dc", layers=["#8c8a8f", "#6a676f", "#45434c", "#1f1e24"], amp=0.2, rough=1.8, sr=0.05, sy=0.32, sx=0.25)),
    "desert-blue": ("landscape", dict(sky0="#1f6fb2", sky1="#7fb6d9", sky2="#e8d2a6", glow="#fff6dc", sun="#ffffff", layers=["#c9a46a", "#a87d4a", "#6e4f2c"], amp=0.05, rough=0.9, sr=0.05, sy=0.25, sx=0.78)),
    "hills-green": ("landscape", dict(sky0="#2b1b3f", sky1="#d0704a", sky2="#ffc07a", glow="#ffb070", sun="#fff0d0", layers=["#3f6a3a", "#2c4f2a", "#1a321a", "#0b1a0b"], amp=0.1, rough=1.2, sr=0.07, sy=0.42)),
    "mystic": ("mystic", dict(sky0="#0a0612", sky1="#1a1024", glow="#c78a2a", line="#ffd58a")),
    "mystic-violet": ("mystic", dict(sky0="#07060f", sky1="#140c22", glow="#6a3fd6", line="#cdb8ff")),
}

# id -> preset (mantido em sincronia com src/data/catalog.ts)
# Cenas genéricas e originais: são ilustrações de clima, não reproduções de pôsteres.
TITLES = {
    "cidade-de-deus": "city-sunset", "ainda-estou-aqui": "sea", "central-do-brasil": "savanna",
    "auto-da-compadecida": "fields", "tropa-de-elite": "windows", "bacurau": "sertao-night",
    "interestelar": "planet", "duna-parte-dois": "dunes-pale", "a-origem": "golden-city",
    "tudo-em-todo-lugar": "neon", "batman-cavaleiro-das-trevas": "industrial-blue",
    "mad-max-estrada-da-furia": "dunes", "parasita": "city-rain", "entre-facas-e-segredos": "bokeh",
    "corra": "fog", "hereditario": "forest-moon", "o-iluminado": "ice", "um-lugar-silencioso": "river",
    "oppenheimer": "mountains-dusk", "whiplash": "stage", "grande-hotel-budapeste": "pastel",
    "superbad": "pastel-mint", "a-viagem-de-chihiro": "anime-dusk", "your-name": "anime-sky",
    "free-solo": "granite", "professor-polvo": "underwater",
    "breaking-bad": "desert-blue", "stranger-things": "windows-red", "dark": "fog-blue",
    "chernobyl": "industrial", "narcos": "hills-green", "sherlock": "city-night", "arcane": "neon-cyan",
    "fullmetal-alchemist-brotherhood": "mystic", "planeta-terra-ii": "savanna-green", "cosmos": "pale-planet",
}

TITLES.update({
    "o-pagador-de-promessas": "golden-city", "que-horas-ela-volta": "windows", "tropa-de-elite-2": "city-night",
    "carandiru": "industrial", "o-som-ao-redor": "city-rain", "aquarius": "sea-teal", "bingo-o-rei-das-manhas": "stage",
    "minha-mae-e-uma-peca": "pastel", "lisbela-e-o-prisioneiro": "bokeh", "o-menino-e-o-mundo": "anime-sky", "marte-um": "planet",
    "o-poderoso-chefao": "windows-red", "um-sonho-de-liberdade": "industrial-blue", "pulp-fiction": "neon", "clube-da-luta": "industrial",
    "matrix": "tech", "senhor-dos-aneis-sociedade-do-anel": "hills-green", "senhor-dos-aneis-retorno-do-rei": "mountains-dusk",
    "gladiador": "dunes", "forrest-gump": "fields", "a-lista-de-schindler": "fog", "o-silencio-dos-inocentes": "fog-blue",
    "de-volta-para-o-futuro": "city-sunset", "a-vida-e-bela": "golden-city", "amelie-poulain": "bokeh", "os-infiltrados": "city-rain",
    "seven": "city-rain", "coringa": "city-sunset", "john-wick": "neon-cyan", "top-gun-maverick": "desert-blue",
    "blade-runner-2049": "neon", "a-chegada": "fog", "alien-o-oitavo-passageiro": "pale-planet", "invocacao-do-mal": "forest-moon",
    "it-a-coisa": "forest-moon", "titanic": "sea", "la-la-land": "city-sunset", "diario-de-uma-paixao": "river",
    "questao-de-tempo": "pastel-mint", "se-beber-nao-case": "neon", "roma": "city-night", "toy-story": "anime-sky",
    "viva-a-vida-e-uma-festa": "stage", "divertida-mente": "pastel", "aranhaverso": "neon-cyan", "meu-amigo-totoro": "savanna-green",
    "princesa-mononoke": "hills-green", "akira": "neon", "senna": "granite", "apollo-11": "pale-planet",
    "game-of-thrones": "ice", "the-last-of-us": "savanna-green", "better-call-saul": "desert-blue", "round-6": "pastel-mint",
    "black-mirror": "tech", "the-crown": "golden-city", "attack-on-titan": "mountains-dusk", "death-note": "mystic-violet",
    "avatar-a-lenda-de-aang": "anime-sky", "true-detective": "sertao-night", "the-wire": "windows", "band-of-brothers": "fields",
    "the-office": "windows", "friends": "city-sunset", "hora-de-aventura": "anime-dusk",
})


def shift_hue(img, deg):
    """Gira o matiz para diferenciar títulos que usam o mesmo tipo de cena."""
    if not deg:
        return img
    hsv = np.asarray(img.convert("HSV")).copy()
    hsv[..., 0] = (hsv[..., 0].astype(int) + int(deg / 360 * 255)) % 256
    return Image.fromarray(hsv, "HSV").convert("RGB")


USED = {}


def render(tid, preset):
    scene, params = P[preset]
    seed = sum(ord(c) * (i + 1) for i, c in enumerate(tid))
    nth = USED.get(preset, 0)
    USED[preset] = nth + 1
    hue = 0 if nth == 0 else [28, -26, 52, -48, 75][(nth - 1) % 5]
    for kind, (w, h) in (("backdrop", (1024, 576)), ("poster", (340, 510))):
        rng = random.Random(seed + (0 if kind == "backdrop" else 7))
        img = SCENES[scene](w, h, rng, params).convert("RGB")
        img = shift_hue(vignette(img, 0.45 if kind == "backdrop" else 0.6), hue)
        q = 66 if kind == "backdrop" else 72
        img.save(os.path.join(OUT, f"{tid}-{kind}.jpg"), "JPEG", quality=q, optimize=True, progressive=True)


if __name__ == "__main__":
    for tid, preset in TITLES.items():
        render(tid, preset)
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f"{len(TITLES)} títulos, {total/1024/1024:.2f} MB")
