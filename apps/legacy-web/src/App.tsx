import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, request, supabase } from './api';
import type { BusinessProfile, MeResponse } from './api';

type Section = 'overview' | 'products' | 'sales' | 'purchases' | 'expenses' | 'payables';
type Row = Record<string, unknown>;

const sectionTitles: Record<Section, string> = {
  overview: 'Overview',
  products: 'Products',
  sales: 'Sales',
  purchases: 'Purchases',
  expenses: 'Expenses',
  payables: 'Payables',
};

const endpoints: Record<Exclude<Section, 'overview'>, string> = {
  products: '/products?limit=100',
  sales: '/sales?limit=100',
  purchases: '/purchases?limit=100',
  expenses: '/expenses?limit=100',
  payables: '/payables',
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function displayValue(value: unknown, currency: string, key: string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number' && key.endsWith('_cents')) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value / 100);
  }
  if (typeof value === 'object') return '';
  return String(value);
}

function dateInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function AuthForm({ onLogin }: { onLogin: (me: MeResponse) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [businessSize, setBusinessSize] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup') {
        await request<{ message: string }>('/auth/signup', {
          method: 'POST',
          body: {
            full_name: fullName,
            email,
            password,
            business_name: businessName,
            ...(industry ? { industry } : {}),
            ...(businessSize ? { business_size: businessSize } : {}),
          },
        });
        setNotice('If signup succeeded, check your email for a confirmation link. After confirming, return here and sign in. If you already have an account, try signing in.');
        setMode('signin');
        setPassword('');
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      onLogin(await request<MeResponse>('/auth/me'));
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand-mark">B</div>
        <p className="eyebrow">BUSINESSIQ</p>
        <h1>{mode === 'signin' ? 'Welcome back' : 'Create your workspace'}</h1>
        <p className="muted">{mode === 'signin' ? 'Sign in to your business workspace.' : 'Set up your business account to get started.'}</p>
        {mode === 'signup' && <>
          <label>Your name<input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} minLength={2} maxLength={120} required /></label>
          <label>Business name<input autoComplete="organization" value={businessName} onChange={(event) => setBusinessName(event.target.value)} minLength={2} maxLength={120} required /></label>
          <label>Industry <span className="optional-label">Optional</span><input value={industry} onChange={(event) => setIndustry(event.target.value)} maxLength={60} /></label>
          <label>Business size <span className="optional-label">Optional</span>
            <select value={businessSize} onChange={(event) => setBusinessSize(event.target.value)}>
              <option value="">Select a size</option>
              <option value="micro">Micro</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
            </select>
          </label>
        </>}
        <label>Email address<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Password<input autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === 'signup' ? 8 : undefined} maxLength={128} required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        {notice && <p className="success-message" role="status">{notice}</p>}
        <button className="primary-button full-width" type="submit" disabled={busy}>{busy ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : (mode === 'signin' ? 'Sign in' : 'Create account')}</button>
        <p className="auth-switch">
          {mode === 'signin' ? 'New to BusinessIQ?' : 'Already have a BusinessIQ account?'}
          {' '}
          <button type="button" className="text-button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice(''); }}>
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </form>
    </main>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Dashboard({ organization }: { organization: BusinessProfile }) {
  const [data, setData] = useState<{
    inventory: Row;
    receivables: Row;
    payables: Row;
    expenses: Row;
    sales: Row[];
  } | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const today = dateInTimezone(organization.timezone);
      const [inventory, receivables, payables, expenses, sales] = await Promise.all([
        request<Row>('/inventory/summary', { organizationId: organization.id }),
        request<Row>('/receivables', { organizationId: organization.id }),
        request<Row>('/payables', { organizationId: organization.id }),
        request<Row>('/expenses/summary', { organizationId: organization.id }),
        request<Row[]>(`/sales?date_from=${today}&date_to=${today}&limit=100`, { organizationId: organization.id }),
      ]);
      setData({ inventory, receivables, payables, expenses, sales });
    } catch (reason) {
      setError(messageOf(reason));
    }
  }, [organization.id]);

  useEffect(() => { void load(); }, [load]);
  const currency = organization.currency.toUpperCase();
  const revenueCents = data?.sales.reduce((total, sale) => total + Number(sale.total_cents ?? 0), 0) ?? 0;
  const money = (cents: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);

  if (error) return <ErrorPanel message={error} retry={() => void load()} />;
  if (!data) return <p className="loading">Loading your business summary…</p>;

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">BUSINESS SUMMARY</p><h1>Good business starts with clarity.</h1><p className="muted">Your latest figures are calculated from recorded transactions.</p></div><button className="secondary-button" onClick={() => void load()}>Refresh</button></div>
      <section className="metric-grid">
        <Metric label="Today's sales" value={money(revenueCents)} note={`${data.sales.length} recorded transactions`} />
        <Metric label="Receivables" value={money(Number(data.receivables.total_outstanding_cents ?? 0))} note="Open customer balances" />
        <Metric label="Payables" value={money(Number(data.payables.total_outstanding_cents ?? 0))} note="Open supplier balances" />
        <Metric label="Inventory value" value={money(Number(data.inventory.inventory_value_cents ?? 0))} note={`Valuation: ${String(data.inventory.valuation_method ?? '—')}`} />
        <Metric label="Expenses" value={money(Number(data.expenses.total_cents ?? 0))} note={`${data.expenses.count ?? 0} recorded expenses`} />
        <Metric label="Stock alerts" value={String(data.inventory.low_stock ?? 0)} note={`${data.inventory.out_of_stock ?? 0} products out of stock`} />
      </section>
    </>
  );
}

function ErrorPanel({ message, retry }: { message: string; retry: () => void }) {
  return <div className="error-panel"><p>{message}</p><button className="secondary-button" onClick={retry}>Try again</button></div>;
}

function DataTable({ rows, currency }: { rows: Row[]; currency: string }) {
  const columns = useMemo(() => rows.length ? Object.keys(rows[0]).filter((key) => typeof rows[0][key] !== 'object') : [], [rows]);
  if (!rows.length) return <div className="empty-state"><strong>No records yet</strong><span>New business activity will appear here.</span></div>;
  return (
    <div className="table-scroll">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={String(row.id ?? row.supplier_id ?? index)}>{columns.map((column) => <td key={column}>{displayValue(row[column], currency, column)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Records({ section, organization }: { section: Exclude<Section, 'overview'>; organization: BusinessProfile }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const result = await request<unknown>(endpoints[section], { organizationId: organization.id });
      const values = Array.isArray(result)
        ? result as Row[]
        : section === 'payables' && typeof result === 'object' && result !== null && 'suppliers' in result
          ? (result.suppliers as Row[])
          : [];
      setRows(values);
    } catch (reason) {
      setError(messageOf(reason));
    }
  }, [organization.id, section]);
  useEffect(() => { void load(); }, [load]);
  if (error) return <ErrorPanel message={error} retry={() => void load()} />;
  if (!rows) return <p className="loading">Loading {sectionTitles[section].toLowerCase()}…</p>;
  return <DataTable rows={rows} currency={organization.currency.toUpperCase()} />;
}

function Workspace({ me, onSignOut }: { me: MeResponse; onSignOut: () => void }) {
  const [section, setSection] = useState<Section>('overview');
  const sections: Section[] = ['overview', 'sales', 'products', 'purchases', 'expenses', 'payables'];
  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">B</div><div><strong>BusinessIQ</strong><small>Business workspace</small></div></div>
        <nav aria-label="Main navigation">
          {sections.map((item) => <button key={item} className={section === item ? 'nav-item active' : 'nav-item'} onClick={() => setSection(item)}>{sectionTitles[item]}</button>)}
        </nav>
        <div className="sidebar-bottom"><span className="user-initial">{me.user.full_name.slice(0, 1).toUpperCase()}</span><div className="user-info"><strong>{me.user.full_name}</strong><small>{me.organization.name}</small></div><button className="sign-out" onClick={onSignOut} aria-label="Sign out">↗</button></div>
      </aside>
      <main className="main-content">
        <header className="mobile-header"><span>BusinessIQ</span><button onClick={onSignOut}>Sign out</button></header>
        {section === 'overview'
          ? <Dashboard organization={me.organization} />
          : <><div className="page-heading"><div><p className="eyebrow">{me.organization.name}</p><h1>{sectionTitles[section]}</h1></div></div><Records section={section} organization={me.organization} /></>}
      </main>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState('');

  const loadMe = useCallback(async () => {
    try {
      setMe(await request<MeResponse>('/auth/me'));
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        setAuthError('');
        await supabase.auth.signOut();
      } else {
        setAuthError(messageOf(reason));
      }
      setMe(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) void loadMe();
      else setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && active) {
        setMe(null);
        setChecking(false);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadMe]);

  async function signOut() {
    await supabase.auth.signOut();
    setAuthError('');
    setMe(null);
  }

  if (checking) return <main className="auth-page"><p className="loading">Loading BusinessIQ…</p></main>;
  if (!me && authError) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark">B</div>
          <p className="eyebrow">BUSINESSIQ</p>
          <h1>Workspace unavailable</h1>
          <p className="error" role="alert">{authError}</p>
          <button className="primary-button full-width" onClick={() => { setChecking(true); void loadMe(); }}>Try again</button>
          <button className="secondary-button" onClick={() => void signOut()}>Sign out</button>
        </section>
      </main>
    );
  }
  if (!me) return <><AuthForm onLogin={setMe} />{authError && <p className="auth-error" role="alert">{authError}</p>}</>;
  return <Workspace me={me} onSignOut={() => void signOut()} />;
}
