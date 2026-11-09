'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getData } from '@/lib/api';

type Block = {
  _id: string;
  blockId: string;
  location: string;
  areaAcres: number;
  plantingDate?: string;
  cloneOrProvenance?: string;
  initialTrees?: number;
  latestLiveTrees?: number;
  survivalRatePercent: number | null;
  treeLossCount: number | null;
  growthSampleCount: number;
  latestGrowthSample?: {
    sampleDate: string;
    averageHeightM: number;
    averageDbhCm: number;
    treeCount: number;
  } | null;
  nextAction?: string;
  nextActionDue?: string;
  notes?: string;
};

type Data = {
  generatedAt: string;
  blocks: Block[];
  totals: {
    blocks: number;
    areaAcres: number;
    initialTreesRecorded: number;
    liveTreesRecorded: number;
    blocksMissingTreeCounts: number;
  };
  warnings: string[];
};

export default function PlantationIntelligence() {
  const [d, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getData<Data>('/plantations/intelligence')
      .then(setData)
      .catch(e =>
        setError(e instanceof Error ? e.message : 'Could not load plantation intelligence')
      );
  }, []);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">🌳 ForestOS</div>
        <div className="sub">Masulita Green Farms</div>
        <nav className="nav">
          {[
            ['/', 'Dashboard'],
            ['/plantations', 'Plantation register'],
            ['/plantation-intelligence', 'Plantation intelligence'],
            ['/growth', 'Growth samples'],
            ['/inspections', 'Inspections'],
            ['/executive', 'Executive intelligence'],
          ].map(([u, l]) => (
            <Link key={u} href={u}>
              {l}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 8,
          }}
        >
          <h1 style={{ margin: 0 }}>Plantation intelligence</h1>
          <Link className="btn" href="/growth">
            + Record growth sample
          </Link>
        </div>
        <p className="muted" style={{ marginBottom: 24 }}>
          Summarises registered blocks and recorded tree counts. These figures are not
          independently verified.
        </p>

        {error && <p className="error">{error}</p>}

        {d && (
          <>
            <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
              Generated {new Date(d.generatedAt).toLocaleString()}
            </p>

            {/* Metric cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <MetricCard
                label="Registered blocks"
                value={String(d.totals.blocks)}
                detail="Block records"
              />
              <MetricCard
                label="Registered area"
                value={`${d.totals.areaAcres.toFixed(1)} ac`}
                detail="Sum of block records"
              />
              <MetricCard
                label="Initial trees recorded"
                value={d.totals.initialTreesRecorded.toLocaleString()}
                detail="Only blocks with counts contribute"
              />
              <MetricCard
                label="Live trees recorded"
                value={d.totals.liveTreesRecorded.toLocaleString()}
                detail={
                  d.totals.initialTreesRecorded
                    ? `${(
                        (100 * d.totals.liveTreesRecorded) /
                        d.totals.initialTreesRecorded
                      ).toFixed(1)}% survival overall`
                    : 'No survival baseline'
                }
              />
              <MetricCard
                label="Blocks missing counts"
                value={String(d.totals.blocksMissingTreeCounts)}
                detail={
                  d.totals.blocksMissingTreeCounts > 0
                    ? 'Needs initial + live counts'
                    : 'All blocks complete'
                }
                warn={d.totals.blocksMissingTreeCounts > 0}
              />
            </div>

            {/* Block detail table */}
            <section className="panel" style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 16,
                }}
              >
                <h2 style={{ margin: 0 }}>Block health and growth records</h2>
                <span className="muted" style={{ fontSize: 14 }}>
                  {d.blocks.length} {d.blocks.length === 1 ? 'block' : 'blocks'}
                </span>
              </div>

              {d.blocks.length === 0 ? (
                <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
                  No blocks recorded yet.{' '}
                  <Link href="/plantations">Create a plantation block</Link> to get started.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={thLeft}>Block</th>
                        <th style={thRight}>Area</th>
                        <th style={thLeft}>Planted</th>
                        <th style={thRight}>Initial</th>
                        <th style={thRight}>Live</th>
                        <th style={thRight}>Survival</th>
                        <th style={thRight}>Loss</th>
                        <th style={thLeft}>Latest sample</th>
                        <th style={thLeft}>Next action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.blocks.map(b => (
                        <tr
                          key={b._id}
                          style={{ borderBottom: '1px solid #f3f4f6' }}
                          onMouseEnter={e =>
                            (e.currentTarget.style.backgroundColor = '#f9fafb')
                          }
                          onMouseLeave={e =>
                            (e.currentTarget.style.backgroundColor = '')
                          }
                        >
                          <td style={tdLeft}>
                            <div style={{ fontWeight: 500 }}>{b.blockId}</div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {b.location}
                            </div>
                          </td>
                          <td style={tdRight}>{b.areaAcres.toFixed(1)} ac</td>
                          <td style={tdLeft}>{b.plantingDate?.slice(0, 10) ?? '—'}</td>
                          <td style={tdRight}>
                            {b.initialTrees !== undefined ? (
                              b.initialTrees.toLocaleString()
                            ) : (
                              <span className="muted">Missing</span>
                            )}
                          </td>
                          <td style={tdRight}>
                            {b.latestLiveTrees !== undefined ? (
                              b.latestLiveTrees.toLocaleString()
                            ) : (
                              <span className="muted">Missing</span>
                            )}
                          </td>
                          <td style={tdRight}>
                            {b.survivalRatePercent === null ? (
                              <span className="muted">—</span>
                            ) : (
                              <span
                                style={{
                                  color:
                                    b.survivalRatePercent >= 95
                                      ? '#15803d'
                                      : b.survivalRatePercent >= 85
                                      ? '#a16207'
                                      : '#b91c1c',
                                  fontWeight: 600,
                                }}
                              >
                                {b.survivalRatePercent.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td style={tdRight}>
                            {b.treeLossCount !== null ? (
                              b.treeLossCount.toLocaleString()
                            ) : (
                              '—'
                            )}
                          </td>
                          <td style={tdLeft}>
                            {b.latestGrowthSample ? (
                              <div style={{ fontSize: 13 }}>
                                <div>{b.latestGrowthSample.sampleDate?.slice(0, 10)}</div>
                                <div className="muted" style={{ fontSize: 12 }}>
                                  {b.latestGrowthSample.averageHeightM.toFixed(2)} m ·{' '}
                                  {b.latestGrowthSample.averageDbhCm.toFixed(2)} cm ·{' '}
                                  {b.latestGrowthSample.treeCount} trees
                                </div>
                              </div>
                            ) : (
                              <span className="muted">No sample</span>
                            )}
                          </td>
                          <td style={tdLeft}>
                            {b.nextAction ? (
                              <div>
                                <div>{b.nextAction}</div>
                                {b.nextActionDue && (
                                  <div className="muted" style={{ fontSize: 12 }}>
                                    Due {b.nextActionDue.slice(0, 10)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="muted">Not recorded</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Data quality warnings callout */}
            <section
              className="panel"
              style={{
                borderLeft: '4px solid #f59e0b',
                backgroundColor: '#fffbeb',
              }}
            >
              <strong style={{ display: 'block', marginBottom: 10 }}>
                ⚠️ Data quality notes
              </strong>
              <ul style={{ margin: '0 0 12px 20px', padding: 0 }}>
                {d.warnings.map(w => (
                  <li key={w} style={{ marginBottom: 6 }}>
                    {w}
                  </li>
                ))}
              </ul>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Live tree counts should be updated from a dated field count. Survival rate is
                calculated only when both initial and live tree counts exist and the initial
                count is non-zero.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

// --- Small presentational helpers ---

function MetricCard({
  label,
  value,
  detail,
  warn,
}: {
  label: string;
  value: string;
  detail: string;
  warn?: boolean;
}) {
  return (
    <div
      className="card"
      style={{
        padding: 16,
        borderLeft: warn ? '3px solid #f59e0b' : undefined,
      }}
    >
      <div className="muted" style={{ fontSize: 13 }}>
        {label}
      </div>
      <div
        className="metric"
        style={{ fontSize: 28, fontWeight: 600, margin: '6px 0' }}
      >
        {value}
      </div>
      <div className="muted" style={{ fontSize: 12 }}>
        {detail}
      </div>
    </div>
  );
}

const thLeft: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 8px',
  fontWeight: 600,
  fontSize: 13,
};
const thRight: React.CSSProperties = {
  textAlign: 'right',
  padding: '10px 8px',
  fontWeight: 600,
  fontSize: 13,
};
const tdLeft: React.CSSProperties = { padding: '10px 8px' };
const tdRight: React.CSSProperties = { padding: '10px 8px', textAlign: 'right' };