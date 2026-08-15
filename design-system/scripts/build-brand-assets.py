#!/usr/bin/env python3
"""Build portable Schemami SVG logo assets from the approved identity source.

The wordmark is shaped with HarfBuzz, instantiated from Fraunces Variable, and
converted to outlines. Generated SVGs therefore do not depend on an installed
font. Run from the repository root with the dependencies in requirements.txt.
"""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


ROOT = Path(__file__).resolve().parents[2]
FONT = ROOT / "design-system/assets/fonts/fraunces-latin-variable.woff2"
OUT = ROOT / "design-system/assets/logos"

PAGE = "#FBF7EF"
INK = "#231A20"
MARINE = "#235D73"
CLAY = "#A94436"
BRASS = "#D09A22"


def svg(title: str, description: str, view_box: str, body: str) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" role="img" aria-labelledby="title desc">
  <title id="title">{escape(title)}</title>
  <desc id="desc">{escape(description)}</desc>
{body}
</svg>
'''


def mark_body(mode: str = "color", background: bool = False) -> str:
    if mode == "color":
        bracket, structure, first, middle, last = INK, MARINE, BRASS, CLAY, BRASS
    elif mode == "ink":
        bracket = structure = first = middle = last = INK
    elif mode == "reversed":
        bracket = structure = first = middle = last = PAGE
    else:
        raise ValueError(f"unknown mark mode: {mode}")

    lines = []
    if background:
        lines.append(f'  <rect width="128" height="128" rx="24" fill="{PAGE}"/>')
    lines.extend(
        [
            f'  <path d="M31 20H18v88h13M97 20h13v88H97" fill="none" stroke="{bracket}" stroke-width="7" stroke-linecap="round"/>',
            f'  <path d="M43 37h42M43 37v27h42v27H43" fill="none" stroke="{structure}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>',
            f'  <circle cx="43" cy="37" r="6" fill="{first}"/>',
            f'  <circle cx="85" cy="64" r="6" fill="{middle}"/>',
            f'  <circle cx="43" cy="91" r="6" fill="{last}"/>',
        ]
    )
    return "\n".join(lines)


def optical_icon(size: int) -> str:
    scale = size / 128
    bracket_width = {16: 1.05, 24: 1.45, 32: 1.9}[size]
    structure_width = {16: 1.85, 24: 2.55, 32: 3.35}[size]
    radius = {16: 0.95, 24: 1.30, 32: 1.70}[size]

    def n(value: float) -> str:
        return f"{value * scale:.3f}".rstrip("0").rstrip(".")

    body = f'''  <rect width="{size}" height="{size}" rx="{size * 0.1875:g}" fill="{PAGE}"/>
  <path d="M{n(31)} {n(20)}H{n(18)}v{n(88)}h{n(13)}M{n(97)} {n(20)}h{n(13)}v{n(88)}H{n(97)}" fill="none" stroke="{INK}" stroke-width="{bracket_width}" stroke-linecap="round"/>
  <path d="M{n(43)} {n(37)}h{n(42)}M{n(43)} {n(37)}v{n(27)}h{n(42)}v{n(27)}H{n(43)}" fill="none" stroke="{MARINE}" stroke-width="{structure_width}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="{n(43)}" cy="{n(37)}" r="{radius}" fill="{BRASS}"/>
  <circle cx="{n(85)}" cy="{n(64)}" r="{radius}" fill="{CLAY}"/>
  <circle cx="{n(43)}" cy="{n(91)}" r="{radius}" fill="{BRASS}"/>'''
    return svg(
        f"Schemami {size}-pixel optical icon",
        "An optically adjusted bracketed S with three connection nodes.",
        f"0 0 {size} {size}",
        body,
    )


def wordmark_path() -> tuple[str, tuple[float, float, float, float]]:
    variable = TTFont(FONT)
    font = instantiateVariableFont(
        variable,
        {"opsz": 90, "wght": 700, "SOFT": 78, "WONK": 1},
        inplace=False,
    )
    font.flavor = None
    binary = BytesIO()
    font.save(binary)
    font_bytes = binary.getvalue()

    face = hb.Face(font_bytes)
    shaper = hb.Font(face)
    upem = font["head"].unitsPerEm
    shaper.scale = (upem, upem)
    buffer = hb.Buffer()
    buffer.add_str("schemami")
    buffer.guess_segment_properties()
    hb.shape(shaper, buffer, {"kern": True, "liga": True})

    glyph_set = font.getGlyphSet()
    paths: list[str] = []
    bounds: list[tuple[float, float, float, float]] = []
    cursor = 0
    tracking = -95

    for info, position in zip(buffer.glyph_infos, buffer.glyph_positions):
        name = font.getGlyphName(info.codepoint)
        glyph = glyph_set[name]
        x = cursor + position.x_offset
        y = position.y_offset

        path_pen = SVGPathPen(glyph_set)
        glyph.draw(TransformPen(path_pen, (1, 0, 0, -1, x, -y)))
        command = path_pen.getCommands()
        if command:
            paths.append(command)

        bounds_pen = BoundsPen(glyph_set)
        glyph.draw(TransformPen(bounds_pen, (1, 0, 0, -1, x, -y)))
        if bounds_pen.bounds:
            bounds.append(bounds_pen.bounds)

        cursor += position.x_advance + tracking

    if not bounds:
        raise RuntimeError("wordmark produced no outline bounds")
    min_x = min(item[0] for item in bounds)
    min_y = min(item[1] for item in bounds)
    max_x = max(item[2] for item in bounds)
    max_y = max(item[3] for item in bounds)
    return " ".join(paths), (min_x, min_y, max_x, max_y)


def wordmark_svg(path: str, bounds: tuple[float, float, float, float], fill: str) -> str:
    min_x, min_y, max_x, max_y = bounds
    pad = 60
    view_box = f"{min_x-pad:g} {min_y-pad:g} {max_x-min_x+pad*2:g} {max_y-min_y+pad*2:g}"
    return svg(
        "Schemami wordmark",
        "The name Schemami set in the approved warm Fraunces construction.",
        view_box,
        f'  <path d="{path}" fill="{fill}"/>',
    )


def lockup_svg(
    path: str,
    bounds: tuple[float, float, float, float],
    mode: str,
) -> str:
    min_x, min_y, max_x, max_y = bounds
    word_height = max_y - min_y
    word_scale = 62 / word_height
    word_width = (max_x - min_x) * word_scale
    width = 120 + word_width
    y = (96 - word_height * word_scale) / 2 - min_y * word_scale
    x = 120 - min_x * word_scale
    fill = PAGE if mode == "reversed" else INK
    mark = mark_body(mode=mode, background=False)
    body = f'''  <g transform="scale(.75)">
{mark}
  </g>
  <path d="{path}" fill="{fill}" transform="translate({x:g} {y:g}) scale({word_scale:g})"/>'''
    return svg(
        "Schemami horizontal lockup",
        "The bracket-and-node S symbol followed by the outlined Schemami wordmark.",
        f"0 0 {width:g} 96",
        body,
    )


def write(name: str, content: str) -> None:
    path = OUT / name
    path.write_text(content, encoding="utf-8")
    print(path.relative_to(ROOT))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    word_path, bounds = wordmark_path()

    write(
        "schemami-mark-color.svg",
        svg(
            "Schemami full-color mark",
            "A marine S made from connected rows and three colored nodes inside open ink brackets.",
            "0 0 128 128",
            mark_body("color", background=False),
        ),
    )
    write(
        "schemami-mark-tile.svg",
        svg(
            "Schemami full-color tile",
            "The full-color Schemami mark on its approved Page background.",
            "0 0 128 128",
            mark_body("color", background=True),
        ),
    )
    write(
        "schemami-mark-ink.svg",
        svg(
            "Schemami one-color mark",
            "The bracket-and-node S rendered in one Ink color.",
            "0 0 128 128",
            mark_body("ink", background=False),
        ),
    )
    write(
        "schemami-mark-reversed.svg",
        svg(
            "Schemami reversed mark",
            "The bracket-and-node S rendered in Page for dark approved backgrounds.",
            "0 0 128 128",
            mark_body("reversed", background=False),
        ),
    )
    for size in (16, 24, 32):
        write(f"schemami-icon-{size}.svg", optical_icon(size))

    write("schemami-wordmark-ink.svg", wordmark_svg(word_path, bounds, INK))
    write("schemami-wordmark-reversed.svg", wordmark_svg(word_path, bounds, PAGE))
    write("schemami-lockup-color.svg", lockup_svg(word_path, bounds, "color"))
    write("schemami-lockup-ink.svg", lockup_svg(word_path, bounds, "ink"))
    write("schemami-lockup-reversed.svg", lockup_svg(word_path, bounds, "reversed"))


if __name__ == "__main__":
    main()
