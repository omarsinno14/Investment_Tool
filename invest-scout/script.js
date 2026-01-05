const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function compoundValue(principal, monthly, annualReturn, years) {
  const monthlyRate = annualReturn / 100 / 12;
  const months = years * 12;
  let balance = principal;

  for (let i = 0; i < months; i += 1) {
    balance = (balance + monthly) * (1 + monthlyRate);
  }

  return balance;
}

function updateProjection() {
  const starting = Number(document.getElementById('starting-balance').value) || 0;
  const monthly = Number(document.getElementById('monthly-contribution').value) || 0;
  const annualReturn = Number(document.getElementById('expected-return').value) || 0;
  const years = Number(document.getElementById('years').value) || 0;

  const total = compoundValue(starting, monthly, annualReturn, years);
  const contributions = starting + monthly * 12 * years;
  const profit = Math.max(0, total - contributions);

  document.getElementById('calc-total').textContent = formatter.format(total);
  document.getElementById('calc-contributions').textContent = formatter.format(contributions);
  document.getElementById('calc-profit').textContent = formatter.format(profit);

  const growthPreview = formatter.format(total * 1.05);
  document.getElementById('projected-growth').textContent = growthPreview;
}

function handleRiskSelection(button) {
  document.querySelectorAll('.chip').forEach((chip) => chip.classList.remove('active'));
  button.classList.add('active');

  const expectedReturn = document.getElementById('expected-return');
  const presets = {
    conservative: 6,
    balanced: 8,
    aggressive: 11,
  };

  const chosenRate = presets[button.dataset.risk] ?? 8;
  expectedReturn.value = chosenRate;
  updateProjection();
}

function bindEvents() {
  document.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', updateProjection);
  });

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => handleRiskSelection(chip));
  });

  const form = document.querySelector('.cta__form');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    form.reset();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = 'Request received — our team will reach out soon!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  });

  const optimizeButton = document.getElementById('optimize-btn');
  optimizeButton?.addEventListener('click', () => {
    const allocations = document.querySelector('.allocation');
    allocations?.classList.add('pulse');
    setTimeout(() => allocations?.classList.remove('pulse'), 1200);
  });
}

bindEvents();
updateProjection();
