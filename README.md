# What makes a quantum computer different? · math-of-quantum

An interactive explainer on the mathematics of quantum computing, published at
**https://toniferr.github.io/math-of-quantum/** in English and Spanish ([/es/](https://toniferr.github.io/math-of-quantum/es/)).
Companion site of [Math of AI](https://toniferr.github.io/math-of-ai/).

Ten chapters build quantum computing from the classical bit to error correction, with the emphasis on mathematical
theory: every chapter states its results as theorems, most with a foldable proof, plus history and interactive figures
that simulate the quantum states exactly in the browser.

| # | Chapter | Theorems and results | Interactive figures |
| --- | --- | --- | --- |
| 00 | Bits | Universality of NAND, Landauer, Toffoli, isometries of ℓp, no stochastic √NOT | 1-norm vs 2-norm |
| 01 | Qubits | Born rule, global phase, Bloch sphere, Holevo bound | Draggable Bloch sphere with phasors |
| 02 | Interference | Unitarity, interference term, H² = I, Mach–Zehnder, quantum walks | Interferometer, quantum vs classical walk |
| 03 | Measurement | Spectral theorem, Robertson uncertainty, density matrices, no-cloning | Stern–Gerlach chain |
| 04 | Entanglement | Product criterion, Schmidt decomposition, CHSH, Tsirelson, no-signalling | Entanglement meter, CHSH game |
| 05 | Gates and circuits | Unitaries, Euler ZYZ, universality, Solovay–Kitaev, Gottesman–Knill, BQP | Three-qubit circuit simulator |
| 06 | Quantum Fourier transform | Unitarity, product representation, periodic states, phase estimation | QFT of periodic states, Bernstein–Vazirani |
| 07 | Shor's algorithm | Euler, reduction to order finding, Legendre's theorem, Shor | Step-by-step factoring |
| 08 | Grover's algorithm | Two reflections = rotation, optimal iterations, BBBV lower bound | Amplitudes, success curve, 2D plane |
| 09 | Errors and decoherence | Kraus, discretization of errors, Knill–Laflamme, threshold theorem | Decoherence channels, repetition code |

Plus a home page with a draggable qubit and a filterable timeline from Planck (1900) to today.

## Principles

- **No frameworks, no dependencies.** Hand-written HTML, CSS and JavaScript. The generator (`build.py`) uses only the
  Python 3.10+ standard library.
- **Native MathML.** Chapters are written with `$TeX$` (including Dirac notation: `\ket`, `\bra`, `\braket`,
  `\ketbra`) and `texmath.py` converts it to MathML at build time: no MathJax, no KaTeX, no downloaded fonts.
- **Exact simulation.** `src/js/qlib.js` holds a small state-vector simulator, complex arithmetic, a Bloch-sphere
  renderer and phase-coloured amplitude charts shared by all the figures.
- **Secure by default.** Strict CSP (own resources only, no inline JavaScript or styles), no CDN or analytics, and the
  workflow's actions pinned by SHA.
- **Bilingual.** English is the default language at the site root and Spanish lives under `/es/`; every page links to
  its counterpart and declares `hreflang` alternates.

## Running locally

```powershell
python build.py --serve        # builds dist/ and serves it at http://127.0.0.1:8000
python build.py --release      # strict mode (the one CI uses): any warning fails the build
```

The build warns about broken internal links and anchors, formulas that do not compile, demos without a script or not
registered, strings used by the demos but missing from `i18n`, and keys present in one language but not the other.

## Structure

```text
content/
├── site.json                  base URL, languages and chapter order
├── i18n/{en,es}.json          interface and interactive-figure strings (same keys in both)
└── {en,es}/
    ├── home.html              home page (<!--chain--> is replaced by the contents)
    ├── timeline.json          eras and events of the timeline
    └── chapters/<id>.html     one chapter: <!--meta {json} --> block + HTML with $TeX$
src/
├── template.html, favicon.svg
├── css/main.css               editorial (Distill-like) style, light and dark themes
└── js/
    ├── theme.js               flicker-free theme (synchronous in <head>)
    ├── core.js                demo registry and helpers (controls, canvas, axes…)
    ├── qlib.js                quantum toolkit: complex numbers, state vectors, Bloch sphere, amplitude charts
    └── demos/<group>.js       interactive figures for each chapter
texmath.py                     TeX → MathML converter
build.py                       generator → dist/ (English) and dist/es/ (Spanish)
```

## Writing a chapter

- Formulas: `$...$` inline and `$$...$$` for display. `\class{k1}{...}` colours a term (k1–k4), just like
  `<span class="k1">` in the text.
- Internal links: `href="@ch:<id>#anchor"`, `href="@timeline"` and `href="@home"`.
- Boxes: `<div class="theorem">`, `definition` or `idea`, with a `<span class="th-title">`; proofs go in
  `<details class="proof"><summary>…</summary><div>…</div></details>`.
- Margin notes: `<aside class="note">`.
- Interactive figures: `<figure class="demo" data-demo="group/name"><figcaption>…</figcaption></figure>`; the script
  `src/js/demos/group.js` registers it with `MOA.register("group/name", init)` and takes its texts from the `demos`
  section of `i18n`.
