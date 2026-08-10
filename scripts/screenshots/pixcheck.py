import sys
from PIL import Image, ImageStat

p = sys.argv[1]
img = Image.open(p).convert('RGB')
stat = ImageStat.Stat(img)
px = img.getdata()
n = len(px)
black = sum(1 for r, g, b in px if r < 10 and g < 10 and b < 10) / n
white = sum(1 for r, g, b in px if r > 245 and g > 245 and b > 245) / n
mean = tuple(round(v, 1) for v in stat.mean)
std = tuple(round(v, 1) for v in stat.stddev)
print(f'{p}')
print(f'  size={img.size} mean={mean} std={std} black={black:.1%} white={white:.1%}')
if std[0] < 12 and std[1] < 12 and std[2] < 12:
    print('  RISULTATO: VISTA PIATTA (possibile schermata vuota/rotta)')
elif black > 0.8:
    print('  RISULTATO: SCHERMO NERO')
elif white > 0.9:
    print('  RISULTATO: SCHERMO BIANCO')
else:
    print('  RISULTATO: OK (contenuto vario)')
