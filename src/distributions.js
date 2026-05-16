// ----- Math helpers -----

function gamma(z) {
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

function lnGamma(z) {
  return Math.log(gamma(z));
}

function beta(a, b) {
  return (gamma(a) * gamma(b)) / gamma(a + b);
}

function factorial(n) {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function comb(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

function erf(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function regularizedIncompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const maxIter = 200;
  const eps = 1e-14;
  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;
  let f = 1, c = 1, d = 0;
  for (let i = 0; i <= maxIter; i++) {
    let m = i / 2;
    let numerator;
    if (i === 0) {
      numerator = 1;
    } else if (i % 2 === 0) {
      numerator = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    } else {
      m = (i - 1) / 2;
      numerator = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    }
    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    f *= c * d;
    if (Math.abs(c * d - 1) < eps) break;
  }
  return front * f;
}

function lowerIncompleteGamma(s, x) {
  if (x < 0) return 0;
  let sum = 0, term = 1 / s;
  for (let n = 0; n < 200; n++) {
    if (n > 0) term *= x / (s + n);
    sum += term;
    if (Math.abs(term) < 1e-14 * Math.abs(sum)) break;
  }
  return Math.pow(x, s) * Math.exp(-x) * sum;
}

function regularizedGamma(s, x) {
  return lowerIncompleteGamma(s, x) / gamma(s);
}


// ----- Distribution definitions -----

export const distributions = [
  // ===== DISCRETE =====
  {
    id: 'bernoulli',
    name: 'Bernoulli',
    type: 'discrete',
    description: 'Models a single trial with two outcomes (success/failure). The building block of many other discrete distributions.',
    params: [{ name: 'p', label: 'p (probability)', min: 0.01, max: 0.99, step: 0.01, default: 0.5 }],
    domain: () => [0, 1],
    pmf: (x, { p }) => (x === 0 ? 1 - p : x === 1 ? p : 0),
    cdf: (x, { p }) => (x < 0 ? 0 : x < 1 ? 1 - p : 1),
  },
  {
    id: 'binomial',
    name: 'Binomial',
    type: 'discrete',
    description: 'Counts the number of successes in n independent Bernoulli trials, each with probability p.',
    params: [
      { name: 'n', label: 'n (trials)', min: 1, max: 50, step: 1, default: 10 },
      { name: 'p', label: 'p (probability)', min: 0.01, max: 0.99, step: 0.01, default: 0.5 },
    ],
    domain: ({ n }) => [0, n],
    pmf: (k, { n, p }) => comb(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k),
    cdf: (k, { n, p }) => {
      let s = 0;
      for (let i = 0; i <= Math.floor(k); i++) s += comb(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i);
      return s;
    },
  },
  {
    id: 'poisson',
    name: 'Poisson',
    type: 'discrete',
    description: 'Models the number of events in a fixed interval when events occur at a constant average rate λ.',
    params: [{ name: 'lambda', label: 'λ (rate)', min: 0.1, max: 30, step: 0.1, default: 5 }],
    domain: ({ lambda }) => [0, Math.max(20, Math.ceil(lambda + 4 * Math.sqrt(lambda)))],
    pmf: (k, { lambda }) => Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k),
    cdf: (k, { lambda }) => {
      let s = 0;
      for (let i = 0; i <= Math.floor(k); i++) s += Math.pow(lambda, i) / factorial(i);
      return s * Math.exp(-lambda);
    },
  },
  {
    id: 'geometric',
    name: 'Geometric',
    type: 'discrete',
    description: 'Models the number of trials until the first success in a sequence of Bernoulli trials.',
    params: [{ name: 'p', label: 'p (probability)', min: 0.01, max: 0.99, step: 0.01, default: 0.3 }],
    domain: ({ p }) => [1, Math.max(10, Math.ceil(5 / p))],
    pmf: (k, { p }) => (k >= 1 ? p * Math.pow(1 - p, k - 1) : 0),
    cdf: (k, { p }) => (k >= 1 ? 1 - Math.pow(1 - p, Math.floor(k)) : 0),
  },
  {
    id: 'negative_binomial',
    name: 'Negative Binomial (Pascal)',
    type: 'discrete',
    description: 'Counts the number of failures before the r-th success. Generalizes the Geometric distribution.',
    params: [
      { name: 'r', label: 'r (successes)', min: 1, max: 20, step: 1, default: 5 },
      { name: 'p', label: 'p (probability)', min: 0.01, max: 0.99, step: 0.01, default: 0.5 },
    ],
    domain: ({ r, p }) => [0, Math.max(20, Math.ceil(r * (1 - p) / p + 4 * Math.sqrt(r * (1 - p) / (p * p))))],
    pmf: (k, { r, p }) => comb(k + r - 1, k) * Math.pow(p, r) * Math.pow(1 - p, k),
    cdf: (k, { r, p }) => {
      let s = 0;
      for (let i = 0; i <= Math.floor(k); i++) s += comb(i + r - 1, i) * Math.pow(p, r) * Math.pow(1 - p, i);
      return s;
    },
  },
  {
    id: 'hypergeometric',
    name: 'Hypergeometric',
    type: 'discrete',
    description: 'Models draws without replacement. Given N items with K successes, counts successes in n draws.',
    params: [
      { name: 'N', label: 'N (population)', min: 2, max: 100, step: 1, default: 50 },
      { name: 'K', label: 'K (success states)', min: 1, max: 100, step: 1, default: 25 },
      { name: 'n', label: 'n (draws)', min: 1, max: 100, step: 1, default: 10 },
    ],
    domain: ({ N, K, n }) => [Math.max(0, n + K - N), Math.min(n, K)],
    pmf: (k, { N, K, n }) => {
      const lo = Math.max(0, n + K - N), hi = Math.min(n, K);
      if (k < lo || k > hi) return 0;
      return (comb(K, k) * comb(N - K, n - k)) / comb(N, n);
    },
    cdf: (k, { N, K, n }) => {
      const lo = Math.max(0, n + K - N);
      let s = 0;
      for (let i = lo; i <= Math.floor(k); i++) s += (comb(K, i) * comb(N - K, n - i)) / comb(N, n);
      return s;
    },
  },
  {
    id: 'discrete_uniform',
    name: 'Discrete Uniform',
    type: 'discrete',
    description: 'Each of the integers from a to b has equal probability. The simplest discrete distribution.',
    params: [
      { name: 'a', label: 'a (min)', min: 0, max: 20, step: 1, default: 1 },
      { name: 'b', label: 'b (max)', min: 1, max: 30, step: 1, default: 6 },
    ],
    domain: ({ a, b }) => [a, b],
    pmf: (k, { a, b }) => (k >= a && k <= b ? 1 / (b - a + 1) : 0),
    cdf: (k, { a, b }) => (k < a ? 0 : k > b ? 1 : (Math.floor(k) - a + 1) / (b - a + 1)),
  },
  {
    id: 'zipf',
    name: 'Zipf',
    type: 'discrete',
    description: 'Probability is inversely proportional to rank raised to power s. Models word frequencies and city sizes.',
    params: [
      { name: 's', label: 's (exponent)', min: 1.01, max: 5, step: 0.01, default: 2 },
      { name: 'N', label: 'N (elements)', min: 2, max: 50, step: 1, default: 20 },
    ],
    domain: ({ N }) => [1, N],
    pmf: (k, { s, N }) => {
      if (k < 1 || k > N) return 0;
      let H = 0;
      for (let i = 1; i <= N; i++) H += 1 / Math.pow(i, s);
      return 1 / (Math.pow(k, s) * H);
    },
    cdf: (k, { s, N }) => {
      let H = 0;
      for (let i = 1; i <= N; i++) H += 1 / Math.pow(i, s);
      let c = 0;
      for (let i = 1; i <= Math.min(Math.floor(k), N); i++) c += 1 / Math.pow(i, s);
      return c / H;
    },
  },

  // ===== CONTINUOUS =====
  {
    id: 'normal',
    name: 'Normal (Gaussian)',
    type: 'continuous',
    description: 'The bell curve. Arises from the Central Limit Theorem — sums of independent random variables tend toward it.',
    params: [
      { name: 'mu', label: 'μ (mean)', min: -10, max: 10, step: 0.1, default: 0 },
      { name: 'sigma', label: 'σ (std dev)', min: 0.1, max: 5, step: 0.1, default: 1 },
    ],
    range: ({ mu, sigma }) => [mu - 4 * sigma, mu + 4 * sigma],
    pdf: (x, { mu, sigma }) => Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI)),
    cdf: (x, { mu, sigma }) => 0.5 * (1 + erf((x - mu) / (sigma * Math.sqrt(2)))),
  },
  {
    id: 'uniform',
    name: 'Uniform (Continuous)',
    type: 'continuous',
    description: 'Equal probability over the interval [a, b]. The continuous analogue of the discrete uniform.',
    params: [
      { name: 'a', label: 'a (min)', min: -10, max: 10, step: 0.1, default: 0 },
      { name: 'b', label: 'b (max)', min: -9, max: 20, step: 0.1, default: 1 },
    ],
    range: ({ a, b }) => [a - 0.5, b + 0.5],
    pdf: (x, { a, b }) => (x >= a && x <= b ? 1 / (b - a) : 0),
    cdf: (x, { a, b }) => (x < a ? 0 : x > b ? 1 : (x - a) / (b - a)),
  },
  {
    id: 'exponential',
    name: 'Exponential',
    type: 'continuous',
    description: 'Models time between Poisson events. Has the memoryless property — the only continuous distribution with this trait.',
    params: [{ name: 'lambda', label: 'λ (rate)', min: 0.1, max: 5, step: 0.1, default: 1 }],
    range: ({ lambda }) => [0, Math.max(5, 5 / lambda)],
    pdf: (x, { lambda }) => (x >= 0 ? lambda * Math.exp(-lambda * x) : 0),
    cdf: (x, { lambda }) => (x >= 0 ? 1 - Math.exp(-lambda * x) : 0),
  },
  {
    id: 'gamma_dist',
    name: 'Gamma',
    type: 'continuous',
    description: 'Sum of k independent Exponential(λ) variables. Generalizes the Exponential and Chi-squared distributions.',
    params: [
      { name: 'k', label: 'k (shape)', min: 0.1, max: 20, step: 0.1, default: 2 },
      { name: 'theta', label: 'θ (scale)', min: 0.1, max: 5, step: 0.1, default: 2 },
    ],
    range: ({ k, theta }) => [0, Math.max(10, k * theta + 4 * Math.sqrt(k) * theta)],
    pdf: (x, { k, theta }) => (x > 0 ? Math.pow(x, k - 1) * Math.exp(-x / theta) / (Math.pow(theta, k) * gamma(k)) : 0),
    cdf: (x, { k, theta }) => (x > 0 ? regularizedGamma(k, x / theta) : 0),
  },
  {
    id: 'beta_dist',
    name: 'Beta',
    type: 'continuous',
    description: 'Defined on [0,1], extremely flexible shape. Models proportions, probabilities, and is the conjugate prior for Bernoulli/Binomial.',
    params: [
      { name: 'alpha', label: 'α (shape)', min: 0.1, max: 20, step: 0.1, default: 2 },
      { name: 'beta_p', label: 'β (shape)', min: 0.1, max: 20, step: 0.1, default: 5 },
    ],
    range: () => [0, 1],
    pdf: (x, { alpha, beta_p }) => {
      if (x <= 0 || x >= 1) return 0;
      return Math.pow(x, alpha - 1) * Math.pow(1 - x, beta_p - 1) / beta(alpha, beta_p);
    },
    cdf: (x, { alpha, beta_p }) => regularizedIncompleteBeta(x, alpha, beta_p),
  },
  {
    id: 'chi_squared',
    name: 'Chi-Squared',
    type: 'continuous',
    description: 'Sum of k squared standard normals. Fundamental in hypothesis testing and confidence intervals.',
    params: [{ name: 'k', label: 'k (degrees of freedom)', min: 1, max: 30, step: 1, default: 3 }],
    range: ({ k }) => [0, Math.max(10, k + 4 * Math.sqrt(2 * k))],
    pdf: (x, { k }) => (x > 0 ? Math.pow(x, k / 2 - 1) * Math.exp(-x / 2) / (Math.pow(2, k / 2) * gamma(k / 2)) : 0),
    cdf: (x, { k }) => (x > 0 ? regularizedGamma(k / 2, x / 2) : 0),
  },
  {
    id: 't_dist',
    name: 'Student\'s t',
    type: 'continuous',
    description: 'Arises when estimating the mean of a normal population with unknown variance. Heavier tails than Normal; approaches Normal as ν → ∞.',
    params: [{ name: 'nu', label: 'ν (degrees of freedom)', min: 1, max: 50, step: 1, default: 5 }],
    range: ({ nu }) => {
      const w = nu <= 2 ? 8 : 5;
      return [-w, w];
    },
    pdf: (x, { nu }) => {
      return (gamma((nu + 1) / 2) / (Math.sqrt(nu * Math.PI) * gamma(nu / 2))) *
        Math.pow(1 + x * x / nu, -(nu + 1) / 2);
    },
    cdf: (x, { nu }) => {
      const t2 = x * x;
      const bx = nu / (nu + t2);
      const ib = regularizedIncompleteBeta(bx, nu / 2, 0.5);
      return x >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
    },
  },
  {
    id: 'f_dist',
    name: 'F',
    type: 'continuous',
    description: 'Ratio of two Chi-squared variables divided by their degrees of freedom. Used in ANOVA and regression F-tests.',
    params: [
      { name: 'd1', label: 'd₁ (df numerator)', min: 1, max: 50, step: 1, default: 5 },
      { name: 'd2', label: 'd₂ (df denominator)', min: 1, max: 50, step: 1, default: 10 },
    ],
    range: ({ d1, d2 }) => [0, Math.max(5, d2 / (d2 - 2) + 4 * Math.sqrt(2) * (d2 > 4 ? 1 : 2))],
    pdf: (x, { d1, d2 }) => {
      if (x <= 0) return 0;
      const num = Math.pow(d1 * x, d1) * Math.pow(d2, d2);
      const den = Math.pow(d1 * x + d2, d1 + d2);
      return Math.sqrt(num / den) / (x * beta(d1 / 2, d2 / 2));
    },
    cdf: (x, { d1, d2 }) => {
      if (x <= 0) return 0;
      return regularizedIncompleteBeta((d1 * x) / (d1 * x + d2), d1 / 2, d2 / 2);
    },
  },
  {
    id: 'cauchy',
    name: 'Cauchy',
    type: 'continuous',
    description: 'A heavy-tailed distribution with no defined mean or variance. The ratio of two independent standard normals.',
    params: [
      { name: 'x0', label: 'x₀ (location)', min: -10, max: 10, step: 0.1, default: 0 },
      { name: 'gamma_p', label: 'γ (scale)', min: 0.1, max: 5, step: 0.1, default: 1 },
    ],
    range: ({ x0, gamma_p }) => [x0 - 10 * gamma_p, x0 + 10 * gamma_p],
    pdf: (x, { x0, gamma_p }) => 1 / (Math.PI * gamma_p * (1 + Math.pow((x - x0) / gamma_p, 2))),
    cdf: (x, { x0, gamma_p }) => 0.5 + Math.atan((x - x0) / gamma_p) / Math.PI,
  },
  {
    id: 'lognormal',
    name: 'Log-Normal',
    type: 'continuous',
    description: 'If X is Normal, then eˣ is Log-Normal. Models multiplicative processes — incomes, stock prices, organism sizes.',
    params: [
      { name: 'mu', label: 'μ (log mean)', min: -2, max: 3, step: 0.1, default: 0 },
      { name: 'sigma', label: 'σ (log std dev)', min: 0.1, max: 2, step: 0.1, default: 1 },
    ],
    range: ({ mu, sigma }) => [0, Math.exp(mu + 3 * sigma)],
    pdf: (x, { mu, sigma }) => {
      if (x <= 0) return 0;
      return Math.exp(-Math.pow(Math.log(x) - mu, 2) / (2 * sigma * sigma)) / (x * sigma * Math.sqrt(2 * Math.PI));
    },
    cdf: (x, { mu, sigma }) => (x <= 0 ? 0 : 0.5 * (1 + erf((Math.log(x) - mu) / (sigma * Math.sqrt(2))))),
  },
  {
    id: 'weibull',
    name: 'Weibull',
    type: 'continuous',
    description: 'Generalizes the Exponential. Models failure times — k<1 means decreasing failure rate, k>1 means increasing.',
    params: [
      { name: 'k', label: 'k (shape)', min: 0.1, max: 5, step: 0.1, default: 1.5 },
      { name: 'lambda', label: 'λ (scale)', min: 0.1, max: 5, step: 0.1, default: 1 },
    ],
    range: ({ k, lambda }) => [0, lambda * Math.pow(-Math.log(0.001), 1 / k)],
    pdf: (x, { k, lambda }) => {
      if (x < 0) return 0;
      if (x === 0) return k < 1 ? Infinity : k === 1 ? 1 / lambda : 0;
      return (k / lambda) * Math.pow(x / lambda, k - 1) * Math.exp(-Math.pow(x / lambda, k));
    },
    cdf: (x, { k, lambda }) => (x >= 0 ? 1 - Math.exp(-Math.pow(x / lambda, k)) : 0),
  },
  {
    id: 'pareto',
    name: 'Pareto',
    type: 'continuous',
    description: 'A power-law distribution. Models wealth distribution, file sizes, and the 80/20 rule.',
    params: [
      { name: 'xm', label: 'xₘ (scale)', min: 0.1, max: 5, step: 0.1, default: 1 },
      { name: 'alpha', label: 'α (shape)', min: 0.1, max: 10, step: 0.1, default: 2 },
    ],
    range: ({ xm, alpha }) => [xm * 0.8, xm * Math.pow(0.001, -1 / alpha)],
    pdf: (x, { xm, alpha }) => (x >= xm ? alpha * Math.pow(xm, alpha) / Math.pow(x, alpha + 1) : 0),
    cdf: (x, { xm, alpha }) => (x >= xm ? 1 - Math.pow(xm / x, alpha) : 0),
  },
  {
    id: 'laplace',
    name: 'Laplace',
    type: 'continuous',
    description: 'Also called the double Exponential. Like a Normal but with heavier tails and a sharper peak.',
    params: [
      { name: 'mu', label: 'μ (location)', min: -10, max: 10, step: 0.1, default: 0 },
      { name: 'b', label: 'b (scale)', min: 0.1, max: 5, step: 0.1, default: 1 },
    ],
    range: ({ mu, b }) => [mu - 6 * b, mu + 6 * b],
    pdf: (x, { mu, b }) => Math.exp(-Math.abs(x - mu) / b) / (2 * b),
    cdf: (x, { mu, b }) => (x <= mu ? 0.5 * Math.exp((x - mu) / b) : 1 - 0.5 * Math.exp(-(x - mu) / b)),
  },
  {
    id: 'triangular',
    name: 'Triangular',
    type: 'continuous',
    description: 'Defined by a minimum, maximum, and mode. Often used in simulations when only rough estimates are available.',
    params: [
      { name: 'a', label: 'a (min)', min: -10, max: 5, step: 0.1, default: 0 },
      { name: 'c', label: 'c (mode)', min: -5, max: 8, step: 0.1, default: 3 },
      { name: 'b', label: 'b (max)', min: -2, max: 15, step: 0.1, default: 7 },
    ],
    range: ({ a, b }) => [a - 0.5, b + 0.5],
    pdf: (x, { a, b, c }) => {
      if (x < a || x > b) return 0;
      if (x <= c) return 2 * (x - a) / ((b - a) * (c - a));
      return 2 * (b - x) / ((b - a) * (b - c));
    },
    cdf: (x, { a, b, c }) => {
      if (x <= a) return 0;
      if (x >= b) return 1;
      if (x <= c) return Math.pow(x - a, 2) / ((b - a) * (c - a));
      return 1 - Math.pow(b - x, 2) / ((b - a) * (b - c));
    },
  },
  {
    id: 'erlang',
    name: 'Erlang',
    type: 'continuous',
    description: 'Sum of k independent Exponential(λ) variables (integer k). A special case of Gamma; models wait times in queuing theory.',
    params: [
      { name: 'k', label: 'k (shape, integer)', min: 1, max: 20, step: 1, default: 3 },
      { name: 'lambda', label: 'λ (rate)', min: 0.1, max: 5, step: 0.1, default: 1 },
    ],
    range: ({ k, lambda }) => [0, (k + 4 * Math.sqrt(k)) / lambda],
    pdf: (x, { k, lambda }) => (x >= 0 ? Math.pow(lambda, k) * Math.pow(x, k - 1) * Math.exp(-lambda * x) / factorial(k - 1) : 0),
    cdf: (x, { k, lambda }) => {
      if (x < 0) return 0;
      let sum = 0;
      for (let i = 0; i < k; i++) sum += Math.pow(lambda * x, i) / factorial(i);
      return 1 - Math.exp(-lambda * x) * sum;
    },
  },
  {
    id: 'logistic',
    name: 'Logistic',
    type: 'continuous',
    description: 'Similar shape to Normal but heavier tails. Its CDF is the logistic function used in logistic regression.',
    params: [
      { name: 'mu', label: 'μ (location)', min: -10, max: 10, step: 0.1, default: 0 },
      { name: 's', label: 's (scale)', min: 0.1, max: 5, step: 0.1, default: 1 },
    ],
    range: ({ mu, s }) => [mu - 6 * s, mu + 6 * s],
    pdf: (x, { mu, s }) => {
      const e = Math.exp(-(x - mu) / s);
      return e / (s * Math.pow(1 + e, 2));
    },
    cdf: (x, { mu, s }) => 1 / (1 + Math.exp(-(x - mu) / s)),
  },
  {
    id: 'rayleigh',
    name: 'Rayleigh',
    type: 'continuous',
    description: 'The magnitude of a 2D vector with independent Normal components. Models wind speed and wave heights.',
    params: [{ name: 'sigma', label: 'σ (scale)', min: 0.1, max: 5, step: 0.1, default: 1 }],
    range: ({ sigma }) => [0, sigma * 5],
    pdf: (x, { sigma }) => (x >= 0 ? (x / (sigma * sigma)) * Math.exp(-x * x / (2 * sigma * sigma)) : 0),
    cdf: (x, { sigma }) => (x >= 0 ? 1 - Math.exp(-x * x / (2 * sigma * sigma)) : 0),
  },
];

// ----- Relationships between distributions -----

export const relationships = [
  { from: 'bernoulli', to: 'binomial', label: 'Sum of n Bernoulli trials' },
  { from: 'bernoulli', to: 'geometric', label: 'Trials until first success' },
  { from: 'binomial', to: 'poisson', label: 'n→∞, p→0, np=λ' },
  { from: 'binomial', to: 'normal', label: 'CLT: n→∞' },
  { from: 'binomial', to: 'negative_binomial', label: 'Count failures instead of successes' },
  { from: 'geometric', to: 'negative_binomial', label: 'Sum of r Geometric trials' },
  { from: 'geometric', to: 'exponential', label: 'Continuous analogue' },
  { from: 'hypergeometric', to: 'binomial', label: 'N→∞ (with replacement)' },
  { from: 'discrete_uniform', to: 'uniform', label: 'Continuous analogue' },
  { from: 'poisson', to: 'normal', label: 'CLT: λ→∞' },
  { from: 'poisson', to: 'exponential', label: 'Time between events' },
  { from: 'exponential', to: 'gamma_dist', label: 'Sum of k Exponentials' },
  { from: 'exponential', to: 'weibull', label: 'Weibull with k=1' },
  { from: 'exponential', to: 'laplace', label: 'Difference of two Exponentials' },
  { from: 'exponential', to: 'erlang', label: 'Sum of k Exponentials (integer k)' },
  { from: 'gamma_dist', to: 'chi_squared', label: 'k=ν/2, θ=2' },
  { from: 'gamma_dist', to: 'erlang', label: 'Integer shape parameter' },
  { from: 'gamma_dist', to: 'beta_dist', label: 'Ratio of two Gammas' },
  { from: 'normal', to: 'chi_squared', label: 'Sum of squared Normals' },
  { from: 'normal', to: 'lognormal', label: 'eˣ where X~Normal' },
  { from: 'normal', to: 't_dist', label: 'Normal/√(χ²/ν)' },
  { from: 'normal', to: 'cauchy', label: 't with ν=1' },
  { from: 'normal', to: 'logistic', label: 'Similar shape, heavier tails' },
  { from: 'normal', to: 'laplace', label: 'Sharper peak, heavier tails' },
  { from: 'normal', to: 'rayleigh', label: '√(X²+Y²) for X,Y~Normal' },
  { from: 'chi_squared', to: 'f_dist', label: 'Ratio of two χ²' },
  { from: 'chi_squared', to: 't_dist', label: 'Normal/√(χ²/ν)' },
  { from: 't_dist', to: 'cauchy', label: 'ν=1' },
  { from: 't_dist', to: 'normal', label: 'ν→∞' },
  { from: 'beta_dist', to: 'uniform', label: 'α=β=1' },
  { from: 'weibull', to: 'rayleigh', label: 'k=2' },
  { from: 'pareto', to: 'exponential', label: 'log(X/xₘ) ~ Exponential' },
  { from: 'triangular', to: 'uniform', label: 'a=c or c=b' },
  { from: 'zipf', to: 'pareto', label: 'Continuous analogue' },
];

export function getDistribution(id) {
  return distributions.find((d) => d.id === id);
}

export function getRelated(id) {
  const related = [];
  for (const r of relationships) {
    if (r.from === id) related.push({ id: r.to, label: r.label, direction: 'to' });
    else if (r.to === id) related.push({ id: r.from, label: r.label, direction: 'from' });
  }
  return related;
}
