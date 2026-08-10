from PIL import Image, ImageDraw, ImageFont
import math

F = "/System/Library/Fonts/Hiragino Sans GB.ttc"
def f(sz, idx=3):
    try: return ImageFont.truetype(F, sz, index=idx)
    except Exception: return ImageFont.truetype(F, sz, index=0)

RED=(203,52,43); AMBER=(196,132,16); GREEN=(29,92,58); BLUE=(31,58,95); DARK=(30,36,48)
SC = 3370/2000.0   # 表示座標(2000幅) → 実ピクセル

def S(v): return int(round(v*SC))

class Fig:
    """表示座標(2000幅基準)で切り出し・注釈を書く。"""
    def __init__(self, src, crop):
        x1,y1,x2,y2 = [S(v) for v in crop]
        self.im = Image.open(src).convert("RGB").crop((x1,y1,x2,y2))
        self.ox, self.oy = x1, y1
        self.d = ImageDraw.Draw(self.im)
    def _p(self, x, y): return (S(x)-self.ox, S(y)-self.oy)
    def box(self, xy, color=RED, w=5):
        x1,y1 = self._p(xy[0],xy[1]); x2,y2 = self._p(xy[2],xy[3])
        self.d.rectangle([x1,y1,x2,y2], outline=color, width=S(w/1.0)//1 or 4)
    def badge(self, x, y, n, color=RED, r=19):
        cx,cy = self._p(x,y); rr = S(r)
        self.d.ellipse([cx-rr,cy-rr,cx+rr,cy+rr], fill=color)
        ft = f(S(20))
        bb = self.d.textbbox((0,0), str(n), font=ft)
        self.d.text((cx-(bb[2]-bb[0])/2, cy-(bb[3]-bb[1])/2-S(3)), str(n), font=ft, fill="white")
    def label(self, x, y, text, color=RED, size=19, bg=None):
        px,py = self._p(x,y); ft = f(S(size))
        if bg:
            bb = self.d.textbbox((px,py), text, font=ft)
            pad = S(5)
            self.d.rectangle([bb[0]-pad,bb[1]-pad,bb[2]+pad,bb[3]+pad], fill=bg)
        self.d.text((px,py), text, font=ft, fill=color)
    def arrow(self, p1, p2, color=RED, w=5):
        a=self._p(*p1); b=self._p(*p2); wd=S(w)//1 or 4
        self.d.line([a,b], fill=color, width=wd)
        ang=math.atan2(b[1]-a[1], b[0]-a[0]); L=S(13)
        for s in (2.6,-2.6):
            self.d.line([b,(b[0]+L*math.cos(ang+s), b[1]+L*math.sin(ang+s))], fill=color, width=wd)
    def save(self, out, maxw=1700):
        im=self.im
        if im.width>maxw:
            im=im.resize((maxw, int(im.height*maxw/im.width)), Image.LANCZOS)
        im.save(out, optimize=True)
        print(out, im.size)


# ---------- ① 在庫販売：商品ページ ----------
g = Fig("crop_p1_stock.png", (1008, 395, 1720, 945))
g.box((1055, 535, 1676, 728), AMBER, 5); g.badge(1032, 540, 1, AMBER)
g.box((1148, 742, 1318, 800), RED, 5);   g.badge(1125, 748, 2)
g.box((1055, 818, 1678, 880), RED, 5);   g.badge(1032, 824, 3)
g.save("fig_stock_1_product.png")

# ---------- ② 在庫販売：カート ----------
g = Fig("crop_p3_cart.png", (268, 555, 1720, 945))
g.box((318, 592, 1002, 700), RED, 5);    g.badge(294, 598, 1)
g.box((1245, 620, 1420, 682), RED, 5);   g.badge(1222, 626, 2)
g.box((1243, 862, 1676, 925), RED, 5);   g.badge(1220, 868, 3)
g.save("fig_stock_2_cart.png")

# ---------- ③ 在庫販売：チェックアウト上部 ----------
g = Fig("crop_p4_checkout_top.png", (330, 75, 1670, 945))
g.box((415, 105, 1012, 225), GREEN, 5);  g.badge(391, 111, 1, GREEN)
g.box((415, 285, 1012, 430), RED, 5);    g.badge(391, 291, 2)
g.box((415, 460, 1012, 910), RED, 5);    g.badge(391, 466, 3)
g.box((1090, 110, 1600, 345), BLUE, 5);  g.badge(1066, 116, 4, BLUE)
g.save("fig_stock_3_checkout.png")

# ---------- ④ 在庫販売：配送・支払い ----------
g = Fig("crop_p5_checkout_pay.png", (330, 0, 1670, 900))
g.box((418, 35, 1012, 118), AMBER, 5);   g.badge(394, 41, 1, AMBER)
g.box((418, 232, 1012, 480), RED, 5);    g.badge(394, 238, 2)
g.box((418, 748, 1012, 798), BLUE, 5);   g.badge(394, 754, 3, BLUE)
g.box((418, 818, 1012, 878), RED, 5);    g.badge(394, 824, 4)
g.save("fig_stock_4_pay.png")

# ---------- サブスク：商品ページ ----------
g = Fig("crop_p2_sub.png", (1008, 380, 1720, 900))
g.box((1058, 408, 1676, 470), RED, 5);   g.badge(1034, 414, 1)
g.box((1058, 482, 1676, 544), GREEN, 5); g.badge(1034, 488, 2, GREEN)
g.box((1058, 705, 1676, 765), RED, 5);   g.badge(1034, 711, 3)
g.save("fig_sub_1_product.png")

# ---------- サブスク：チェックアウト（支払い不可） ----------
g = Fig("crop_p6_sub_checkout.png", (330, 110, 1670, 900))
g.box((418, 165, 1012, 285), GREEN, 5);  g.badge(394, 171, 1, GREEN)
g.box((418, 295, 1012, 385), GREEN, 5);  g.badge(394, 301, 2, GREEN)
g.box((418, 490, 1012, 645), RED, 6);    g.badge(394, 496, 3)
g.box((418, 818, 1012, 878), RED, 5);    g.badge(394, 824, 4)
g.box((1090, 270, 1600, 315), BLUE, 5);  g.badge(1066, 276, 5, BLUE)
g.save("fig_sub_2_checkout.png")

print("done")
