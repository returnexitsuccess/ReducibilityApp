import subprocess
from os import listdir
from os.path import isfile, join

TEXPATH = "equivtex/"
HTMLPATH = "equiv/"

texfiles = [f for f in listdir(TEXPATH) if isfile(join(TEXPATH, f)) and f[-4:] == ".tex"]
#print(texfiles)

for f in texfiles:
    fhtml = f[0:-3] + "html"
    if fhtml not in listdir(HTMLPATH):
        subprocess.run(["pandoc", TEXPATH + f, "-s", "--mathjax", "-o", HTMLPATH + fhtml])
        print(fhtml + " written")
    else:
        print(fhtml + " already exists")




