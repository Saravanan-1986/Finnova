/* FINNOVA e2e smoke test — exercises Part A-F endpoints against a running server. */
const BASE = 'http://localhost:5000/api';
const EMAIL = `test-${Date.now()}@finnova.dev`;

const j = (r) => r.json();
const ok = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} | ${label}${extra ? ` | ${extra}` : ''}`);
  if (!cond) process.exitCode = 1;
};

// 1. Signup
const signup = await fetch(`${BASE}/auth/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Aarav Sharma', email: EMAIL, password: 'test1234', confirmPassword: 'test1234',
    age: 34, gender: 'male', occupationType: 'professional', sector: 'IT',
    monthlyIncome: 90000, region: 'Tamil Nadu', currency: 'INR',
  }),
});
const signupData = await j(signup);
const token = signupData.token;
ok('signup returns JWT', !!token);
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
const post = (path, body) => fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
const patch = (path, body) => fetch(`${BASE}${path}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
const get = (path) => fetch(`${BASE}${path}`, { headers });

// 2. Seed supporting data
const dep1 = await j(await post('/dependents', { name: 'Priya', relation: 'spouse', age: 31, gender: 'female' }));
const dep2 = await j(await post('/dependents', { name: 'Ayaan', relation: 'child', age: 8, gender: 'male' }));
ok('create dependents', dep1.success && dep2.success);

await post('/bills-emi', { type: 'emi', title: 'Car EMI', amount: 25000, dueDate: new Date(Date.now() + 5 * 864e5).toISOString(), recurring: true });
await post('/bills-emi', { type: 'bill', title: 'Electricity', amount: 3000, dueDate: new Date(Date.now() + 10 * 864e5).toISOString(), recurring: true });

const goal = await j(await post('/goals', { title: 'Europe Trip', targetAmount: 200000, targetDate: new Date(Date.now() + 365 * 864e5).toISOString() }));
ok('create goal', goal.success);
const gid = goal.goal?._id;
if (gid) await post(`/goals/${gid}/contribute`, { amount: 30000 });

const ef = await j(await patch('/emergency-fund/contribute', { amount: 50000 }));
ok('emergency fund contribution', ef.success);

await post('/expenses', { amount: 18500, category: 'Food & Dining', description: 'Groceries', date: new Date().toISOString() });
await post('/expenses', { amount: 12000, category: 'Shopping', description: 'Clothes', date: new Date().toISOString() });

// 3. Dependents CRUD
const deps = await j(await get('/dependents'));
ok('GET /api/dependents', deps.success && deps.dependents.length === 2, `count=${deps.dependents.length}`);
const depUp = await j(await fetch(`${BASE}/dependents/${dep1.dependent._id}`, { method: 'PUT', headers, body: JSON.stringify({ age: 32 }) }));
ok('PUT /api/dependents', depUp.success && depUp.dependent.age === 32);

// 4. Schemes
const recSchemes = await j(await get('/schemes/recommended?includeFamily=true'));
ok('GET /api/schemes/recommended (family)', recSchemes.success && recSchemes.schemes.length > 0, `count=${recSchemes.schemes.length}`);
const top = recSchemes.schemes[0];
ok('recommended scheme has score + reasons', typeof top.matchScore === 'number' && Array.isArray(top.matchedReasons));

const schemesCat = await j(await get('/schemes?category=health'));
ok('GET /api/schemes?category=health', schemesCat.success && schemesCat.schemes.length > 0, `count=${schemesCat.schemes.length}`);

const schemeDetail = await j(await get(`/schemes/${top._id}`));
ok('GET /api/schemes/:id (scored)', schemeDetail.success && typeof schemeDetail.scheme.matchScore === 'number');

// 5. Insurance products & coverage calculator
const products = await j(await get('/insurance-products'));
ok('GET /api/insurance-products (19 seeded)', products.success && products.products.length === 19, `count=${products.products.length}`);

const calculator = await j(await get('/insurance/coverage-calculator'));
ok('coverage-calc pulls liabilities from Bills/EMI',
  calculator.success && calculator.liabilities === 28000 && typeof calculator.savings === 'number',
  `health=${calculator.health?.amount}, life=${calculator.life?.amount}, liabilities=${calculator.liabilities}`);
ok('health floor applied for minor dependent', calculator.health?.amount >= 1000000);

const prodDetail = await j(await get(`/insurance-products/${products.products[0]._id}`));
ok('GET /api/insurance-products/:id', prodDetail.success);