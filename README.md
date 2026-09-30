# LLM-ACES: Closed-Loop Discovery of Dynamical Systems with LLM-Guided Adaptive Search (NeurIPS 2026)

## About

LLM-ACES (LLM-guided Active Closed-loop Equation Search) recovers governing ordinary differential equations by letting the symbolic hypothesis space and the acquired data co-evolve. An LLM proposes operator priors that constrain symbolic regression, the fitted candidate equations decide which initial condition to query next, and the new trajectories refine both the equations and the next round of priors.

## Key Features

- **LLM-induced operator priors:** the LLM shapes the symbolic search space instead of writing final equations
- **Predictive-divergence acquisition:** new initial conditions are chosen where candidate equations disagree most
- **Feedback-driven refinement:** best and worst candidates are fed back as demonstrations and failure cases
- **Evaluated on 122 ODE systems:** ODEBench (63) and ODEBase (59), with anonymized variables for every LLM method

## Results

- Highest symbolic accuracy on both benchmarks: 46.2% on ODEBench and 52.4% on ODEBase
- Lowest median NMSE in reconstruction, generalization, and out-of-distribution evaluation, by several orders of magnitude
- With 100 samples, lower error than every baseline given up to 1,000
- 30 LLM calls per system, versus 125 for the LLM baselines

## Links

- 📄 [Paper (arXiv)](https://arxiv.org/abs/2606.25039)
- 💻 [Code (GitHub)](https://github.com/scientific-discovery/LLM-ACES)

## Acknowledgments
Parts of this project page were adopted from the [Nerfies](https://nerfies.github.io/) page.

## Website License
<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.
