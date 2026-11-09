'use client';
import type { CSSProperties, ReactNode } from 'react';

// ---------- Table styles ----------
export const thLeft: CSSProperties = {
  textAlign: 'left',
  padding: '10px 8px',
  fontWeight: 600,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
  color: '#6b7280',
};
export const thRight: CSSProperties = {
  ...thLeft,
  textAlign: 'right',
};
export const tdLeft: CSSProperties = { padding: '10px 8px' };
export const tdRight: CSSProperties = { padding: '10px 8px', textAlign: 'right' };
export const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse' };
export const theadRow: CSSProperties = { borderBottom: '2px solid #e5e7eb' };
export const bodyRow: CSSProperties = { borderBottom: '1px solid #f3f4f6' };
export const footerRow: CSSProperties = { borderTop: '2px solid #e5e7eb', fontWeight: 600 };
export const mono: CSSProperties = { fontFamily: 'ui-monospace, monospace', fontSize: 13 };

// ---------- MetricCard ----------
export function MetricCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'neutral' | 'warn' | 'danger' | 'success';
}) {
  const accent =
    tone === 'danger'
      ? '#dc2626'
      : tone === 'warn'
      ? '#d97706'
      : tone === 'success'
      ? '#16a34a'
      : undefined;
  const style: CSSProperties = { padding: 16 };
  if (accent) style.boxShadow = `inset 4px 0 0 ${accent}`;
  return (
    <div className="card" style={style}>
      <div className="muted" style={{ fontSize: 13 }}>
        {label}
      </div>
      <div
        className="metric"
        style={{ fontSize: 26, fontWeight: 600, margin: '6px 0', color: accent }}
      >
        {value}
      </div>
      {detail && (
        <div className="muted" style={{ fontSize: 12 }}>
          {detail}
        </div>
      )}
    </div>
  );
}

// ---------- Segmented control ----------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        border: '1px solid #d1d5db',
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: 'white',
      }}
    >
      {options.map((o, i) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            style={{
              padding: '6px 14px',
              fontSize: 14,
              border: 'none',
              borderLeft: i > 0 ? '1px solid #d1d5db' : undefined,
              backgroundColor: active ? '#1f2937' : 'white',
              color: active ? 'white' : '#374151',
              cursor: 'pointer',
              fontWeight: active ? 600 : 400,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- StatusBadge ----------
type BadgeTone = 'ok' | 'warn' | 'danger' | 'neutral' | 'info';

const badgePalette: Record<BadgeTone, { bg: string; fg: string }> = {
  ok: { bg: '#dcfce7', fg: '#166534' },
  warn: { bg: '#fef3c7', fg: '#92400e' },
  danger: { bg: '#fee2e2', fg: '#991b1b' },
  neutral: { bg: '#f3f4f6', fg: '#374151' },
  info: { bg: '#dbeafe', fg: '#1e40af' },
};

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: BadgeTone;
}) {
  const p = badgePalette[tone];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.5,
        color: p.fg,
        backgroundColor: p.bg,
      }}
    >
      {label}
    </span>
  );
}

// ---------- FormSection ----------
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3
        style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: '#6b7280',
          margin: '0 0 12px',
          paddingBottom: 6,
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {title}
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ---------- CollapsibleSection ----------
export function CollapsibleSection({
  title,
  open,
  onToggle,
  actionLabel,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  actionLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel" style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={onToggle}
      >
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>{open ? '▾' : '▸'}</span>
          {title}
        </h2>
        {!open && actionLabel && (
          <button
            className="btn"
            type="button"
            onClick={e => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
      {open && <div style={{ marginTop: 20 }}>{children}</div>}
    </section>
  );
}

// ---------- NoticeBanner ----------
export function NoticeBanner({ message }: { message: string }) {
  return (
    <p className="panel" style={{ borderColor: '#4ade80', color: '#15803d', marginBottom: 16 }}>
      ✓ {message}
    </p>
  );
}

// ---------- Callout ----------
export function Callout({
  title,
  tone = 'warn',
  children,
}: {
  title: string;
  tone?: 'warn' | 'info';
  children: ReactNode;
}) {
  const borderColor = tone === 'warn' ? '#f59e0b' : '#3b82f6';
  const bgColor = tone === 'warn' ? '#fffbeb' : '#eff6ff';
  const icon = tone === 'warn' ? '⚠️' : 'ℹ️';
  return (
    <section
      className="panel"
      style={{
        borderLeft: `4px solid ${borderColor}`,
        backgroundColor: bgColor,
      }}
    >
      <strong style={{ display: 'block', marginBottom: 8 }}>
        {icon} {title}
      </strong>
      <div className="muted" style={{ fontSize: 14 }}>
        {children}
      </div>
    </section>
  );
}