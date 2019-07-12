for %%i in (equivtex\*.tex) do (
  echo equivtex\%%~ni.tex
  pandoc "equivtex\%%~ni.tex" -s --mathjax -o "equiv\%%~ni.html"
)