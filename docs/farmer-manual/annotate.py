from PIL import Image, ImageDraw, ImageFont
F = "/System/Library/Fonts/Hiragino Sans GB.ttc"
def f(sz, idx=1):
    try: return ImageFont.truetype(F, sz, index=idx)
    except Exception: return ImageFont.truetype(F, sz, index=0)

RED=(214,45,45); GREY=(120,120,120); DARK=(40,40,40)

def canvas(src, pad_t=150, pad_b=70, pad_x=60):
    im = Image.open(src).convert("RGB")
    out = Image.new("RGB", (im.width+pad_x*2, im.height+pad_t+pad_b), "white")
    out.paste(im, (pad_x, pad_t))
    return out, ImageDraw.Draw(out), pad_x, pad_t

def box(d, xy, color=RED, w=6, dash=False):
    x1,y1,x2,y2 = xy
    d.rectangle([x1,y1,x2,y2], outline=color, width=w)

def badge(d, x, y, n, color=RED, r=26):
    d.ellipse([x-r,y-r,x+r,y+r], fill=color)
    ft=f(30,3)
    tw=d.textbbox((0,0), str(n), font=ft)
    d.text((x-(tw[2]-tw[0])/2, y-(tw[3]-tw[1])/2-4), str(n), font=ft, fill="white")

def label(d, x, y, text, color=RED, size=30, anchor="lt"):
    d.text((x,y), text, font=f(size,3), fill=color, anchor=anchor)

def arrow(d, p1, p2, color=RED, w=6):
    d.line([p1,p2], fill=color, width=w)
    import math
    ang=math.atan2(p2[1]-p1[1], p2[0]-p1[0]); L=22
    for s in (2.6,-2.6):
        d.line([p2,(p2[0]+L*math.cos(ang+s), p2[1]+L*math.sin(ang+s))], fill=color, width=w)

# ---------- 図1: 入荷入力 ----------
im,d,px,pt = canvas("manual/grid.png", pad_t=170, pad_b=110)
box(d, (px+22, pt+4, px+840, pt+266), RED, 7)
box(d, (px+840, pt+4, px+1248, pt+266), GREY, 7)
badge(d, px+60, pt-44, 1); label(d, px+96, pt-66, "ここに書く（この4つだけ）", RED, 34)
badge(d, px+880, pt-44, 2, GREY); label(d, px+916, pt-66, "自動で入る／触らない", GREY, 34)
arrow(d, (px+980, pt+290), (px+900, pt+120))
label(d, px+930, pt+296, "「OK」と出たら反映ずみ", DARK, 30)
im.save("manual/fig1_input.png")

# ---------- 図2: 商品一覧 ----------
im,d,px,pt = canvas("manual/list.png", pad_t=170, pad_b=110)
box(d, (px+22, pt+4, px+232, pt+250), RED, 7)
box(d, (px+435, pt+4, px+640, pt+250), (0,130,90), 7)
badge(d, px+60, pt-44, 1); label(d, px+96, pt-66, "SKUはここを見てコピー", RED, 34)
badge(d, px+470, pt-44, 2, (0,130,90)); label(d, px+506, pt-66, "今の在庫（自動）", (0,130,90), 34)
label(d, px+22, pt+266, "※ 自分の商品しか出ません", DARK, 28)
im.save("manual/fig2_list.png")

# ---------- 図3: タブ ----------
im,d,px,pt = canvas("manual/tabs.png", pad_t=150, pad_b=120, pad_x=60)
box(d, (px+205, pt-6, px+400, pt+72), RED, 7)
box(d, (px+415, pt-6, px+1085, pt+72), GREY, 7)
badge(d, px+240, pt-52, 1); label(d, px+276, pt-74, "書くのはここだけ", RED, 34)
badge(d, px+450, pt-52, 2, GREY); label(d, px+486, pt-74, "見るだけ（編集できません）", GREY, 34)
label(d, px+205, pt+92, "🔒 の付いたタブは自動で作られます。触らなくて大丈夫です。", DARK, 28)
im.save("manual/fig3_tabs.png")
print("figures done")
