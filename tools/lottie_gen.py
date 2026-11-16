# -*- coding: utf-8 -*-
"""
Generador de animaciones Lottie (formato Bodymovin 5.x) para la
Guía de Emergencias UMNG Campus Cajicá.

Cada animación es un diagrama instructivo paso a paso:
  1. sismo.json            Agáchate, cúbrete, sujétate + evacuación
  2. rcp.json              Compresiones torácicas a 110/min (rango AHA 100-120)
  3. extintor.json         Método PASS (Jalar, Apuntar, Presionar, Barrer)
  4. humo.json             Desplazamiento a gatas bajo el humo
  5. punto-encuentro.json  Ruta señalizada hacia el punto de encuentro

Uso:  python3 tools/lottie_gen.py   -> escribe lottie/*.json y js/lottie-data.js
"""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------- utilidades
def hexc(h, a=1):
    h = h.lstrip('#')
    return [int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, a]

EASE_O = {"x": [0.42], "y": [0]}
EASE_I = {"x": [0.58], "y": [1]}
LIN_O = {"x": [0], "y": [0]}
LIN_I = {"x": [1], "y": [1]}

def static(v):
    return {"a": 0, "k": v}

def anim(kfs, ease=True, hold=False):
    """kfs: lista de (t, valor). Valor escalar o lista."""
    out = []
    for i, (t, v) in enumerate(kfs):
        v = v if isinstance(v, list) else [v]
        k = {"t": t, "s": v}
        if i < len(kfs) - 1:
            if hold:
                k["h"] = 1
            else:
                k["o"] = EASE_O if ease else LIN_O
                k["i"] = EASE_I if ease else LIN_I
        out.append(k)
    return {"a": 1, "k": out}

def prop(v):
    """Acepta valor estático o ('anim', kfs, ease)."""
    if isinstance(v, dict):
        return v
    return static(v)

def shape_path(pts, closed=False, curve=None):
    """pts: lista de (x,y). curve: tangentes opcionales lista de ((ix,iy),(ox,oy))."""
    n = len(pts)
    if curve is None:
        ii = [[0, 0]] * n
        oo = [[0, 0]] * n
    else:
        ii = [list(c[0]) for c in curve]
        oo = [list(c[1]) for c in curve]
    return {"i": ii, "o": oo, "v": [list(p) for p in pts], "c": closed}

def sh(pts=None, closed=False, kfs=None, curve=None, ease=True):
    if kfs is not None:
        out = []
        for i, (t, p) in enumerate(kfs):
            c = None
            if isinstance(p, tuple) and len(p) == 2 and isinstance(p[1], list) and p[1] and isinstance(p[1][0], tuple) and isinstance(p[1][0][0], tuple):
                p, c = p
            k = {"t": t, "s": [shape_path(p, closed, c)]}
            if i < len(kfs) - 1:
                k["o"] = EASE_O if ease else LIN_O
                k["i"] = EASE_I if ease else LIN_I
            out.append(k)
        return {"ty": "sh", "ks": {"a": 1, "k": out}}
    return {"ty": "sh", "ks": static(shape_path(pts, closed, curve))}

def rect(cx, cy, w, h, r=0, pos=None, size=None):
    return {"ty": "rc", "p": prop(pos if pos is not None else [cx, cy]), "s": prop(size if size is not None else [w, h]), "r": static(r)}

def ell(cx, cy, w, h=None, pos=None, size=None):
    h = w if h is None else h
    return {"ty": "el", "p": prop(pos if pos is not None else [cx, cy]), "s": prop(size if size is not None else [w, h])}

def fill(c, o=100):
    return {"ty": "fl", "c": static(hexc(c)) if isinstance(c, str) else c, "o": prop(o), "r": 1}

def stroke(c, w, o=100, dash=None, lc=2, lj=2):
    s = {"ty": "st", "c": static(hexc(c)) if isinstance(c, str) else c, "o": prop(o), "w": prop(w), "lc": lc, "lj": lj, "ml": 4}
    if dash:
        d, g, off = dash
        s["d"] = [{"n": "d", "nm": "dash", "v": static(d)}, {"n": "g", "nm": "gap", "v": static(g)}, {"n": "o", "nm": "offset", "v": prop(off)}]
    return s

def trim(start=0, end=100, offset=0):
    return {"ty": "tm", "s": prop(start), "e": prop(end), "o": prop(offset), "m": 1}

def tr(p=(0, 0), a=(0, 0), s=(100, 100), r=0, o=100):
    return {"ty": "tr", "p": prop(list(p) if isinstance(p, tuple) else p), "a": prop(list(a) if isinstance(a, tuple) else a),
            "s": prop(list(s) if isinstance(s, tuple) else s), "r": prop(r), "o": prop(o), "sk": static(0), "sa": static(0)}

def grp(items, name="g", **t):
    return {"ty": "gr", "nm": name, "it": items + [tr(**t)]}

class Anim:
    def __init__(self, name, w=400, h=300, fr=30, op=240):
        self.name, self.w, self.h, self.fr, self.op = name, w, h, fr, op
        self.layers = []  # orden: de abajo hacia arriba

    def layer(self, name, shapes, p=(0, 0), a=(0, 0), s=(100, 100), r=0, o=100, ip=0, op=None):
        ks = {"o": prop(o), "r": prop(r),
              "p": prop(list(p) + [0] if isinstance(p, tuple) else p),
              "a": prop(list(a) + [0] if isinstance(a, tuple) else a),
              "s": prop(list(s) + [100] if isinstance(s, tuple) else s)}
        self.layers.append({"ddd": 0, "ty": 4, "nm": name, "sr": 1, "ks": ks, "ao": 0,
                            "shapes": shapes, "ip": ip, "op": op if op is not None else self.op, "st": 0, "bm": 0})

    def json(self):
        layers = list(reversed(self.layers))
        for i, l in enumerate(layers):
            l["ind"] = i + 1
        return {"v": "5.12.2", "fr": self.fr, "ip": 0, "op": self.op, "w": self.w, "h": self.h,
                "nm": self.name, "ddd": 0, "assets": [], "layers": layers,
                "markers": getattr(self, "markers", [])}

# ------------------------------------------------------------- figura humana
SKIN = '#c98b5e'
VEST = '#f2c200'     # chaleco reflectivo
PANTS = '#2b3648'
LIMB = '#1c2431'

def pose_stand(x, g=260):
    return dict(head=(x, g - 112), neck=(x, g - 94), hip=(x, g - 50),
                elL=(x - 11, g - 72), haL=(x - 13, g - 50), elR=(x + 11, g - 72), haR=(x + 13, g - 50),
                knL=(x - 5, g - 26), ftL=(x - 8, g), knR=(x + 5, g - 26), ftR=(x + 8, g))

def pose_walk(x, ph, g=260, d=1):
    """ph alterna -1/1. d dirección (1 derecha)."""
    s = ph * 10
    return dict(head=(x + 3 * d, g - 112), neck=(x + 2 * d, g - 94), hip=(x, g - 50),
                elL=(x - s * 0.8, g - 72), haL=(x - s * 1.3, g - 52), elR=(x + s * 0.8, g - 72), haR=(x + s * 1.3, g - 52),
                knL=(x + s * 0.9, g - 26), ftL=(x + s * 1.4, g), knR=(x - s * 0.9, g - 26), ftR=(x - s * 1.4, g))

def figure_layers(A, name, kfs, base_color=VEST, helmet=None, o=100):
    """kfs: lista (t, pose). Devuelve capas de la figura animada (morph de vértices)."""
    def limb(keys, color, w):
        k = [(t, [p[keys[0]], p[keys[1]], p[keys[2]]] if len(keys) == 3 else [p[keys[0]], p[keys[1]]]) for t, p in kfs]
        return grp([sh(kfs=k), stroke(color, w)], name="-".join(keys))
    back = [limb(("hip", "knR", "ftR"), PANTS, 11), limb(("neck", "elR", "haR"), LIMB, 8)]
    front_legs = [limb(("hip", "knL", "ftL"), PANTS, 11)]
    torso = [grp([sh(kfs=[(t, [p["neck"], p["hip"]]) for t, p in kfs]), stroke(base_color, 17)], name="torso")]
    front_arm = [limb(("neck", "elL", "haL"), LIMB, 8)]
    hands = []
    for hk in ("haL", "haR"):
        hands.append(grp([ell(0, 0, 9, pos=anim([(t, list(p[hk])) for t, p in kfs]) if len(kfs) > 1 else list(kfs[0][1][hk])), fill(SKIN)], name=hk))
    hpos = anim([(t, list(p["head"])) for t, p in kfs]) if len(kfs) > 1 else list(kfs[0][1]["head"])
    head = [grp([ell(0, 0, 22, pos=hpos), fill(SKIN), stroke('#8a5a36', 1.5)], name="cabeza")]
    shapes = head + hands + front_arm + torso + front_legs + back  # primero = arriba
    A.layer(name, shapes, o=o)

def interp_kfs(points, t0, t1, steps, fn):
    out = []
    for i in range(steps + 1):
        t = t0 + (t1 - t0) * i / steps
        out.append((round(t, 3), fn(i, i / steps)))
    return out

# =========================================================== 1. SISMO
def build_sismo():
    A = Anim("Sismo: agáchate, cúbrete y sujétate", op=300)
    G = 260
    # temblor (posición de la habitación)
    shake = [(0, [0, 0]), (30, [0, 0])]
    t = 30
    i = 0
    while t < 165:
        amp = 5 if t < 140 else 2
        shake.append((t, [amp if i % 2 == 0 else -amp, (1 if i % 3 == 0 else -1)]))
        t += 3; i += 1
    shake += [(168, [0, 0]), (300, [0, 0])]
    room_p = anim([(t, v + [0]) for t, v in shake], ease=False)

    # pared y piso
    A.layer("fondo", [grp([sh([(0, 260), (400, 260)]), stroke('#9aa8b8', 3)]),
                      grp([rect(200, 282, 400, 44), fill('#cfd8e3')]),
                      grp([rect(200, 150, 400, 300), fill('#eef2f7')])])
    room = []
    # ventana
    room.append(grp([rect(58, 120, 70, 80, 4), fill('#bfe0f7'), stroke('#6b7c8f', 4),
                     sh([(58, 80), (58, 160)]), sh([(23, 120), (93, 120)]), stroke('#6b7c8f', 3)], name="ventana"))
    # cuadro en la pared
    # mesa
    room.append(grp([rect(240, 204, 104, 9, 3), fill('#8d6e63'),
                     rect(194, 233, 8, 54), rect(286, 233, 8, 54), fill('#6d4c41')], name="mesa"))
    # puerta de salida + señal
    room.append(grp([rect(366, 214, 44, 92, 3), fill('#d7dee8'), stroke('#6b7c8f', 3),
                     ell(354, 216, 6), fill('#6b7c8f')], name="puerta"))
    room.append(grp([rect(366, 152, 50, 18, 3), fill('#1b8a3c'),
                     sh([(350, 152), (380, 152)]), sh([(372, 146), (380, 152), (372, 158)]), stroke('#ffffff', 2.5)], name="senal-salida"))
    # estantería
    room.append(grp([rect(150, 96, 60, 5), fill('#8d6e63'),
                     rect(134, 84, 8, 20), rect(144, 86, 8, 16), fill('#3f6fb5'), rect(156, 82, 8, 24), fill('#c62828')], name="repisa"))
    A.layer("habitacion", room, p=room_p)

    # grietas en el vidrio
    A.layer("grietas", [grp([sh([(40, 92), (52, 110), (46, 124), (60, 140)]), sh([(52, 110), (70, 104)]),
                              stroke('#ffffff', 2), trim(0, anim([(70, 0), (95, 100)]))])], p=room_p)
    # objeto que cae de la repisa (lejos de la mesa)
    A.layer("objeto-cae", [grp([rect(0, 0, 10, 24, 2), fill('#c62828')])],
            p=anim([(0, [160, 82, 0]), (60, [160, 82, 0]), (78, [168, 252, 0]), (300, [168, 252, 0])]),
            r=anim([(0, 0), (60, 0), (78, 90), (300, 90)]))

    # figura: camina a la mesa, se agacha, cubre y se sujeta; luego evacúa
    x0 = 112
    kf = [(0, pose_stand(x0))]
    walk = interp_kfs(None, 30, 54, 4, lambda i, f: pose_walk(x0 + (180 - x0) * f, 1 if i % 2 else -1))
    kf += walk[1:]
    drop = dict(head=(238, 236), neck=(226, 238), hip=(200, 240),
                elL=(236, 220), haL=(244, 226), elR=(240, 250), haR=(262, 244),
                knL=(214, 258), ftL=(188, 258), knR=(210, 258), ftR=(184, 258))
    cover = dict(head=(246, 244), neck=(236, 238), hip=(212, 234), elL=(246, 224), haL=(254, 236),
                 elR=(258, 252), haR=(284, 244), knL=(222, 258), ftL=(196, 258), knR=(218, 258), ftR=(192, 258))
    kf += [(66, drop), (80, cover), (160, cover)]
    # salir por el lado derecho de la mesa y caminar a la puerta
    out1 = dict(cover, head=(300, 230), neck=(290, 236), hip=(270, 246), elL=(300, 252), haL=(310, 258),
                elR=(296, 252), haR=(306, 258), knL=(284, 258), ftL=(262, 258), knR=(280, 258), ftR=(258, 258))
    kf += [(185, out1), (200, pose_stand(305))]
    walk2 = interp_kfs(None, 205, 250, 6, lambda i, f: pose_walk(305 + 45 * f, 1 if i % 2 else -1))
    kf += walk2 + [(262, pose_stand(352)), (300, pose_stand(352))]
    figure_layers(A, "persona", kf)
    # flecha de evacuación
    A.layer("flecha-evacuar", [grp([sh([(250, 190), (320, 190)]), sh([(306, 178), (322, 190), (306, 202)]),
                                     stroke('#1b8a3c', 6), trim(0, anim([(190, 0), (210, 100), (300, 100)]))])],
            o=anim([(185, 0), (190, 100), (300, 100)]))
    # pulsos sísmicos en el suelo
    for k, d in enumerate([0, 14, 28]):
        A.layer(f"onda{k}", [grp([ell(200, 268, 40, 10), stroke('#f29d0b', 3)])],
                a=(200, 268), p=(200, 268),
                s=anim([(30 + d, [30, 30, 100]), (70 + d, [500, 260, 100]), (300, [500, 260, 100])]),
                o=anim([(0, 0), (30 + d, 0), (34 + d, 90), (70 + d, 0), (300, 0)]))
    # marcadores de paso para la interfaz
    A.markers = [{"tm": 0, "cm": "Calma: identifica tu zona segura", "dr": 30},
                 {"tm": 30, "cm": "AGÁCHATE", "dr": 36},
                 {"tm": 66, "cm": "CÚBRETE", "dr": 14},
                 {"tm": 80, "cm": "SUJÉTATE hasta que pare", "dr": 85},
                 {"tm": 165, "cm": "EVACÚA con calma", "dr": 135}]
    return A

# =========================================================== 2. RCP
def build_rcp():
    BPM = 110
    fr = 30
    period = fr * 60 / BPM           # 16.3636 cuadros por compresión
    n = 11
    op = round(period * n, 4)        # 6 s exactos -> 11 compresiones
    A = Anim("RCP: compresiones a 110 por minuto", op=180, fr=fr)
    A.layer("fondo", [grp([rect(200, 283, 400, 40), fill('#d5dde7')]),
                      grp([rect(200, 150, 400, 300), fill('#f3f6fa')])])

    def cyc(down, up):
        k = []
        for c in range(n):
            t = c * period
            k.append((round(t, 3), up))
            k.append((round(t + period * 0.45, 3), down))
        k.append((180, up))
        return k
    D = 9  # px de desplazamiento visual (representa >=5 cm)
    # rescatista (arrodillado detrás del paciente, de perfil mirando a la izquierda)
    up = dict(head=(186, 132), neck=(184, 152), hip=(232, 210), elL=(180, 190), haL=(176, 228),
              elR=(184, 190), haR=(180, 228), knL=(246, 262), ftL=(286, 262), knR=(240, 262), ftR=(280, 262))
    dn = dict(up, head=(186, 132 + D), neck=(184, 152 + D), elL=(178, 190 + D), elR=(182, 190 + D),
              haL=(176, 228 + D * 0.6), haR=(180, 228 + D * 0.6))
    kf = [(t, (dn if v == 'd' else up)) for t, v in cyc('d', 'u')]
    figure_layers(A, "rescatista", kf)
    # paciente acostado (cabeza a la izquierda)
    chest_up = [(130, 246), (176, 232), (230, 240), (300, 246)]
    chest_dn = [(130, 246), (176, 232 + D * 0.6), (230, 241), (300, 246)]
    body_k = []
    for t, v in cyc('d', 'u'):
        pts = chest_dn if v == 'd' else chest_up
        body_k.append((t, pts + [(300, 262), (130, 262)]))
    A.layer("paciente", [
        grp([ell(118, 244, 26, 24), fill(SKIN), stroke('#8a5a36', 1.5)], name="cabeza-paciente"),
        grp([sh(kfs=body_k, closed=True), fill('#4f7cc9')], name="torso-paciente"),
        grp([rect(340, 256, 84, 14, 7), fill(PANTS)], name="piernas"),
    ])
    # manos entrelazadas en el centro del pecho (encima)
    hand_k = [(t, [178, (232 + D * 0.6) if v == 'd' else 232]) for t, v in cyc('d', 'u')]
    A.layer("manos", [grp([ell(0, 0, 18, 12, pos=anim(hand_k, ease=False)), fill(SKIN), stroke('#8a5a36', 1.5)])])
    # flecha de compresión
    A.layer("flecha", [grp([sh([(130, 150), (130, 196)]), sh([(120, 184), (130, 198), (140, 184)]), stroke('#c62828', 5)])],
            o=anim([(t, 100 if v == 'd' else 35) for t, v in cyc('d', 'u')], ease=False))
    # corazón que late con cada compresión
    A.layer("corazon", [grp([sh([(0, 10), (-16, -4), (-14, -14), (-6, -17), (0, -10), (6, -17), (14, -14), (16, -4)], closed=True,
                                curve=[((0, 0), (0, 0)), ((3, 6), (-5, -5)), ((-3, 3), (3, -3)), ((-4, 0), (3, 0)), ((0, -4), (0, -4)), ((-3, 0), (4, 0)), ((-3, -3), (3, 3)), ((5, -5), (-3, 6))]),
                             fill('#e53935')])],
            p=(330, 120), s=anim([(t, [125, 125, 100] if v == 'd' else [95, 95, 100]) for t, v in cyc('d', 'u')], ease=False))
    # barra de profundidad 5-6 cm
    A.layer("profundidad", [grp([rect(60, 0, 12, 60, 6, pos=static([60, 150]), size=anim([(t, [12, 60 if v == 'd' else 12]) for t, v in cyc('d', 'u')], ease=False)), fill('#c62828')]),
                            grp([rect(60, 150, 12, 60, 6), fill('#dfe6ef'), stroke('#b0bccb', 1)])])
    A.markers = [{"tm": 0, "cm": "Talón de la mano en el centro del pecho", "dr": 60},
                 {"tm": 60, "cm": "Brazos rectos: empuja fuerte, al menos 5 cm", "dr": 60},
                 {"tm": 120, "cm": "Ritmo 100-120/min · deja que el pecho regrese", "dr": 60}]
    return A

# =========================================================== 3. EXTINTOR (PASS)
def build_extintor():
    A = Anim("Extintor: método PASS", op=330)
    A.layer("fondo", [grp([rect(200, 283, 400, 40), fill('#d8d2c8')]),
                      grp([rect(200, 150, 400, 300), fill('#f4f1ec')])])
    # extintor
    EX, EY = 110, 205
    lever_r = anim([(0, 0), (120, 0), (140, 16), (330, 16)])
    A.layer("extintor", [
        grp([rect(EX - 4, EY - 8, 30, 5, 2), rect(EX - 7, EY + 2, 24, 4, 2), fill('#c62828')], name="lineas-etiqueta"),
        grp([rect(EX, EY - 3, 50, 24), fill('#ffffff', 90)], name="etiqueta"),
        grp([rect(EX, EY, 52, 106, 18), fill('#d32f2f'), stroke('#8e0000', 2)], name="cilindro"),
        grp([rect(EX, EY - 62, 22, 18, 3), fill('#9e9e9e'), stroke('#616161', 1.5)], name="valvula"),
        grp([sh([(EX - 6, EY - 68), (EX + 38, EY - 74)]), stroke('#424242', 7)], name="manija-fija"),
    ])
    A.layer("palanca", [grp([sh([(0, 0), (44, -14)]), stroke('#212121', 7)])], p=(EX - 6, EY - 76), r=anim([(0, -8), (120, -8), (140, 10), (330, 10)]))
    # manguera: cuelga -> apunta a la base del fuego
    hose_hang = [(EX + 12, EY - 62), (EX + 40, EY - 40), (EX + 42, EY + 10), (EX + 40, EY + 40)]
    hose_aim = [(EX + 12, EY - 62), (EX + 60, EY - 50), (EX + 105, EY + 10), (EX + 140, EY + 30)]
    A.layer("manguera", [grp([sh(kfs=[(0, hose_hang), (60, hose_hang), (95, hose_aim), (330, hose_aim)]), stroke('#212121', 6)])])
    A.layer("boquilla", [grp([rect(0, 0, 22, 10, 3), fill('#111111')])],
            p=anim([(0, [EX + 40, EY + 46, 0]), (60, [EX + 40, EY + 46, 0]), (95, [EX + 146, EY + 34, 0]), (330, [EX + 146, EY + 34, 0])]),
            r=anim([(0, 90), (60, 90), (95, 32), (330, 32)]))
    # pasador con anillo (se retira)
    A.layer("pasador", [grp([ell(-10, 0, 14), stroke('#f2c200', 3.5)]), grp([sh([(-4, 0), (14, 0)]), stroke('#bdbdbd', 3)])],
            p=anim([(0, [EX + 14, EY - 66, 0]), (24, [EX + 14, EY - 66, 0]), (50, [EX - 50, EY - 90, 0]), (330, [EX - 50, EY - 90, 0])]),
            o=anim([(0, 100), (50, 100), (62, 0), (330, 0)]))
    # mano (guante) que jala el pasador y luego presiona la palanca
    hand_p = anim([(0, [EX - 40, EY - 30, 0]), (20, [EX + 4, EY - 66, 0]), (50, [EX - 62, EY - 90, 0]),
                   (110, [EX - 20, EY - 92, 0]), (140, [EX + 10, EY - 80, 0]), (330, [EX + 10, EY - 80, 0])])
    A.layer("mano", [grp([rect(0, 0, 26, 18, 8), fill('#f2c200'), stroke('#9c7c00', 1.5),
                          rect(-14, -2, 8, 12, 4), fill('#f2c200')])], p=hand_p)
    # fuego (base en x 300)
    FX, FY = 305, 262
    fire_s = anim([(0, [100, 100, 100]), (170, [100, 100, 100]), (280, [0, 0, 100]), (330, [0, 0, 100])])
    flick = anim([(i * 6, [100 + (8 if i % 2 else -6), 100 + (10 if i % 2 else -4)]) for i in range(56)], ease=True)
    def flame(w, h, c):
        return grp([sh([(0, 0), (-w, -h * 0.35), (-w * 0.3, -h * 0.7), (0, -h), (w * 0.35, -h * 0.65), (w, -h * 0.3)], closed=True,
                       curve=[((w * 0.5, 0), (-w * 0.6, 0)), ((0, h * 0.2), (0, -h * 0.2)), ((-w * 0.2, h * 0.1), (w * 0.1, -h * 0.15)),
                              ((0, 0), (0, 0)), ((0, -h * 0.15), (0, h * 0.15)), ((0, -h * 0.2), (0, h * 0.25))]), fill(c)], s=flick)
    A.layer("fuego", [flame(16, 46, '#ffe082'), flame(28, 72, '#ffb300'), flame(40, 96, '#e53935')], p=(FX, FY), a=(0, 0), s=fire_s)
    A.layer("papelera", [grp([rect(FX, FY - 12, 60, 24, 3), fill('#6d4c41')])])
    # objetivo: base del fuego
    A.layer("objetivo", [grp([ell(0, 0, 70, 22), stroke('#1565c0', 3, dash=(8, 6, anim([(60, 0), (120, 40)], ease=False)))])],
            p=(FX, FY - 6), o=anim([(0, 0), (60, 0), (70, 100), (115, 100), (125, 0), (330, 0)]))
    # chorro de agente: barrido de lado a lado
    nz = (EX + 154, EY + 40)
    def spray(xc):
        return [(nz[0], nz[1] - 3), (xc - 26, FY - 38), (xc + 34, FY - 30), (xc + 38, FY + 2), (xc - 26, FY + 4), (nz[0], nz[1] + 3)]
    sweep = [(140, spray(FX))]
    t = 170
    for i in range(8):
        sweep.append((t, spray(FX - 34 if i % 2 == 0 else FX + 34)))
        t += 14
    sweep.append((290, spray(FX)))
    sweep.append((330, spray(FX)))
    A.layer("chorro", [grp([sh(kfs=sweep, closed=True), fill('#d6ecff', 88), stroke('#ffffff', 3)])],
            o=anim([(0, 0), (138, 0), (146, 100), (285, 100), (300, 0), (330, 0)]))
    # verificación final
    A.layer("ok", [grp([sh([(-12, 0), (-3, 10), (14, -10)]), stroke('#ffffff', 6), trim(0, anim([(290, 0), (305, 100)]))]), grp([ell(0, 0, 54), fill('#1b8a3c')])],
            p=(FX, 120), o=anim([(0, 0), (285, 0), (290, 100), (330, 100)]), s=anim([(285, [60, 60, 100]), (295, [100, 100, 100])]))
    A.markers = [{"tm": 0, "cm": "P · JALA el pasador", "dr": 60},
                 {"tm": 60, "cm": "A · APUNTA a la base del fuego", "dr": 60},
                 {"tm": 120, "cm": "P · PRESIONA la palanca", "dr": 50},
                 {"tm": 170, "cm": "A · ABANICA de lado a lado", "dr": 160}]
    return A

# =========================================================== 4. HUMO
def build_humo():
    A = Anim("Incendio: avanza a gatas bajo el humo", op=300)
    A.layer("fondo", [grp([rect(200, 283, 400, 40), fill('#c9d1dc')]),
                      grp([rect(200, 150, 400, 300), fill('#e9ecf1')])])
    # puerta de salida
    A.layer("puerta", [grp([rect(368, 214, 46, 92, 3), fill('#d7dee8'), stroke('#6b7c8f', 3), ell(352, 216, 6), fill('#6b7c8f')])],
            a=(345, 214), p=(345, 214), s=anim([(0, [100, 100, 100]), (238, [100, 100, 100]), (252, [12, 100, 100]), (300, [12, 100, 100])]))
    A.layer("senal", [grp([rect(368, 150, 50, 18, 3), fill('#1b8a3c'), sh([(352, 150), (382, 150)]), sh([(374, 144), (382, 150), (374, 156)]), stroke('#ffffff', 2.5)])])
    # flechas fotoluminiscentes en el piso
    for i, x in enumerate([90, 160, 230, 300]):
        A.layer(f"flecha-piso{i}", [grp([sh([(x - 8, 270), (x + 4, 276), (x - 8, 282)]), stroke('#1b8a3c', 4)])],
                o=anim([(0, 30), (i * 8 + 40, 30), (i * 8 + 50, 100), (i * 8 + 70, 30), (300, 30)]))
    # figura: de pie -> a gatas -> avanza -> toca la puerta -> sale
    def crawl(x, ph=0):
        s = ph * 6
        return dict(head=(x + 50, 226), neck=(x + 38, 230), hip=(x, 234),
                    elL=(x + 42 + s, 246), haL=(x + 46 + s, 258), elR=(x + 38 - s, 246), haR=(x + 40 - s, 258),
                    knL=(x + 2 - s, 258), ftL=(x - 24 - s, 258), knR=(x - 2 + s, 258), ftR=(x - 28 + s, 258))
    kf = [(0, pose_stand(50)), (30, pose_stand(50)), (55, crawl(30))]
    kf += interp_kfs(None, 60, 200, 14, lambda i, f: crawl(30 + 250 * f, 1 if i % 2 else -1))
    touch = dict(crawl(280), elL=(328, 232), haL=(340, 218))
    kf += [(212, touch), (232, touch), (240, crawl(282)), (275, crawl(345)), (300, crawl(345))]
    figure_layers(A, "persona", kf, o=anim([(0, 100), (262, 100), (285, 0), (300, 0)]))
    # zona de aire limpio (indicador)
    A.layer("aire-limpio", [grp([rect(200, 247, 400, 30), fill('#4caf50', 14)])], o=anim([(0, 0), (55, 0), (70, 100), (300, 100)]))
    # humo: desciende desde el techo y ondula
    def cloud(y):
        pts = [(0, 0), (400, 0), (400, y), (340, y + 14), (270, y - 4), (200, y + 16), (130, y - 2), (60, y + 12), (0, y)]
        return pts
    A.layer("humo", [grp([sh(kfs=[(0, cloud(10)), (40, cloud(120)), (80, cloud(175)), (300, cloud(185))], closed=True), fill('#5f6773', 72)])],
            p=anim([(0, [0, 0, 0]), (100, [-10, 0, 0]), (200, [8, 0, 0]), (300, [0, 0, 0])]))
    # mano dorso: indicador de calor
    A.layer("calor", [grp([ell(0, 0, 30), stroke('#1565c0', 3, dash=(6, 4, 0))])], p=(342, 218),
            o=anim([(0, 0), (208, 0), (214, 100), (232, 100), (238, 0), (300, 0)]))
    A.markers = [{"tm": 0, "cm": "Da la alarma y sal de inmediato", "dr": 30},
                 {"tm": 30, "cm": "Agáchate: el aire limpio está cerca del piso", "dr": 30},
                 {"tm": 60, "cm": "Avanza a gatas siguiendo la señalización", "dr": 145},
                 {"tm": 205, "cm": "Toca la puerta con el dorso de la mano", "dr": 35},
                 {"tm": 240, "cm": "Si no está caliente, sal y no regreses", "dr": 60}]
    return A

# =========================================================== 5. PUNTO DE ENCUENTRO
def build_punto():
    A = Anim("Ruta al punto de encuentro", op=270)
    A.layer("cesped", [grp([rect(200, 150, 400, 300), fill('#cfe8c4')])])
    A.layer("caminos", [grp([sh([(40, 200), (360, 200)]), sh([(120, 40), (120, 280)]), sh([(120, 200), (300, 90)]), stroke('#f3efe6', 18)])])
    # edificios
    A.layer("edificios", [grp([rect(70, 110, 80, 70, 4), rect(210, 250, 90, 50, 4), rect(320, 250, 60, 40, 4), fill('#36475e')]),
                          grp([rect(70, 110, 80, 70, 4), stroke('#1c2431', 2)])])
    # alerta en el edificio de origen
    A.layer("alerta", [grp([ell(0, 0, 20), fill('#e53935')])], p=(70, 110),
            s=anim([(i * 15, [100, 100, 100] if i % 2 == 0 else [150, 150, 100]) for i in range(19)]))
    # ruta animada (se dibuja) desde la puerta del edificio
    route = [(110, 145), (120, 200), (190, 157), (300, 90)]
    A.layer("ruta", [grp([sh(route), stroke('#1b8a3c', 6, dash=(12, 8, anim([(0, 0), (270, -200)], ease=False))), trim(0, anim([(10, 0), (90, 100)]))])])
    # chevrones que parpadean a lo largo de la ruta
    for i, (x, y, r) in enumerate([(132, 172, 80), (170, 190, -32), (250, 141, -32)]):
        A.layer(f"chevron{i}", [grp([sh([(-7, -9), (5, 0), (-7, 9)]), stroke('#0d5c26', 5)])], p=(x, y), r=r,
                o=anim([(0, 0), (90 + i * 8, 0)] + [(100 + i * 8 + k * 20, 100 if k % 2 == 0 else 20) for k in range(8)]))
    # personas que siguen la ruta
    def along(f):
        segs = list(zip(route[:-1], route[1:]))
        L = [math.dist(a, b) for a, b in segs]
        d = f * sum(L)
        for (a, b), l in zip(segs, L):
            if d <= l:
                u = d / l
                return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 0]
            d -= l
        return [route[-1][0], route[-1][1], 0]
    colors = ['#1565c0', '#c62828', '#6a1b9a', '#ef6c00']
    for k in range(4):
        t0 = 70 + k * 18
        kfs = [(0, along(0)), (t0, along(0))] + [(t0 + 100 * j / 10, along(j / 10)) for j in range(1, 11)] + [(270, along(1))]
        end = along(1)
        off = [(-38, 14), (-36, -16), (38, 18), (-12, 38)][k]
        kfs[-1] = (270, [end[0] + off[0], end[1] + off[1], 0])
        kfs[-2] = (t0 + 100, [end[0] + off[0], end[1] + off[1], 0])
        A.layer(f"persona{k}", [grp([ell(0, 0, 15), fill(colors[k]), stroke('#ffffff', 2.5)])], p=anim(kfs, ease=False),
                o=anim([(0, 0), (t0 - 2, 0), (t0, 100), (270, 100)]))
    # señal estándar de punto de encuentro (4 flechas hacia el centro)
    PX, PY = 300, 90
    arrows = []
    for ang in (0, 90, 180, 270):
        arrows.append(grp([sh([(-17, 0), (-6, 0)]), sh([(-11, -5), (-5, 0), (-11, 5)]), stroke('#ffffff', 3)], r=ang))
    # Pulso en bucle (anillo que crece y se desvanece)
    ring_s, ring_o = [], []
    for k in range(9):
        t = k * 30
        ring_s += [(t, [100, 100, 100]), (t + 29, [200, 200, 100])]
        ring_o += [(t, 90), (t + 29, 0)]
    A.layer("pulso", [grp([ell(0, 0, 50), stroke('#1b8a3c', 4)])], p=(PX, PY), s=anim(ring_s, ease=False), o=anim(ring_o, ease=False))
    A.layer("punto-encuentro", [grp([ell(0, 0, 7), fill('#ffffff')]), *arrows, grp([rect(0, 0, 48, 48, 6), fill('#1b8a3c'), stroke('#ffffff', 2.5)])], p=(PX, PY))
    A.markers = [{"tm": 0, "cm": "Suena la alarma: deja todo y sal caminando", "dr": 70},
                 {"tm": 70, "cm": "Sigue la ruta señalizada (flechas verdes)", "dr": 100},
                 {"tm": 170, "cm": "Reúnete en el punto de encuentro y repórtate", "dr": 100}]
    return A


if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "lottie"), exist_ok=True)
    data = {}
    for key, fn in [("sismo", build_sismo), ("rcp", build_rcp), ("extintor", build_extintor),
                    ("humo", build_humo), ("punto-encuentro", build_punto)]:
        j = fn().json()
        data[key] = j
        with open(os.path.join(ROOT, "lottie", key + ".json"), "w", encoding="utf-8") as f:
            json.dump(j, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(ROOT, "js", "lottie-data.js"), "w", encoding="utf-8") as f:
        f.write("/* Generado por tools/lottie_gen.py — animaciones Lottie (Bodymovin 5) embebidas\n"
                "   para que funcionen también al abrir index.html sin servidor (file://). */\n")
        f.write("window.LOTTIE_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("ok", {k: len(json.dumps(v)) for k, v in data.items()})
