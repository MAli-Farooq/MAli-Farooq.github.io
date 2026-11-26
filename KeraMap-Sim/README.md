# Keratoconus repair scenario simulator

Open `index.html` in a web browser. No installation or internet connection is needed.

**Illustrative only.** There is no patient or laboratory data, and no result shows that a protein or treatment works.

## 3D eye view

`eye3d.js` draws a procedurally generated eye (WebGL). It is not a photograph, scan or patient-specific model.

- Only the corneal front and back surfaces come from the simulation. Globe, vessels, iris and lens are generic and not anatomically measured.
- The difference from the healthy cornea is magnified (default 4×). Set the slider to 1× for the true shape, and state the magnification in any figure.
- Reflected rings are a visual aid computed from the magnified surface, not a Placido or topography measurement.

## Model and its simplifications

| Part | What is computed | Simplification |
|---|---|---|
| Geometry | Proposal Figures 1-3: R = 7.8 mm, Gaussian cone at (0.6, -0.7) mm | Prescribed, not reconstructed from images. Posterior height = anterior minus axial thickness |
| Mechanics | Linear shallow shell with variable modulus and thickness, pressure tension, held at 5.75 mm radius; finite differences, 0.25 mm grid | Not finite element, isotropic, no collagen directions or large deformation. Poisson coupling in bending is omitted. The prescribed shape applies at 15 mmHg; repair changes it through the difference in deflection |
| Optics | Thin-element wavefront (n = 1.376 cornea, 1.336 aqueous), 0.55 µm, piston/tilt and chosen spectacle terms removed; geometric MTF times diffraction limit | No full ray trace, wave-optics PSF or scatter. The healthy cornea is the error-free reference |
| Transport (mode B) | 1D depth diffusion, reversible binding, activity loss, surface permeability, 0.5 mm stroma | Lateral spread is a Gaussian blur; its diffusion term is scaled by an assumed 0.1. Uniform delivery is not blurred |
| Response (mode B) | Added factor = Emax·u/(u + u50), u = time-averaged depth-mean exposure | Entirely hypothetical; depth of effect is ignored |
| Matching | Mode A: equal thickness-weighted added stiffness within 4 mm radius. Mode B: equal total applied protein | |
| Optimised pattern | Single Gaussian (centre and width, width 0.4-3.5 mm) with the lowest RMS wavefront error | Local search, so not proven globally best. It optimises RMS error, not the proposal's primary MTF-area outcome |
| Uncertainty | 60 random samples, fixed seed, with the optimised footprint held fixed | Ranges are assumed (see `runUncertainty` in `app.js`) |

Default transport and material values are placeholders chosen for demonstration, not taken from literature. Replace them with cited or measured values before quoting any number.

## Checks run (default cone, 26 November 2026)

Untreated, uniform and cone-centred cases, mode A:

- Grid 0.25 vs 0.125 mm: apex displacement differs by under 0.1%, RMS error by up to about 2%, MTF area by up to about 3.5%.
- Grid 0.125 vs 0.083 mm: RMS error and MTF area differ by under 1%. Two of the 0.083 mm solves hit the iteration limit.
- The 0.25 mm grid therefore does not clearly meet the proposal's 2% target; use a finer grid for reported results.
- Uniform shell centre deflection is within 2% of the membrane solution.
- With no activity loss, protein amount stays constant after the reservoir is removed.
- The healthy reference gives zero wavefront error.

The optics and transport have not been compared with an independent implementation.
