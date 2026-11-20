import LiveTrends from './LiveTrends';
import { useLiveFleet } from './useLiveFleet';
import { useEffect, useState } from 'react';
import HistoricalData from './HistoricalData';
import UnitTrends from './UnitTrends';
import { useHistoricalFleet } from './useHistoricalFleet';
import { useSystemHistory } from './useSystemHistory';
import ParameterAlarm from './ParameterAlarm';
import { ACTIVE_UNIT_NUMBERS, TOTAL_UNITS, isActiveUnit, } from './fleetConfig';
import type { DynamicParameter, FleetStatus, FleetUnit, } from './useHistoricalFleet';
import valeLogo from './assets/vale-logo.png';
import './App.css';
import './HistoricalFleet.css';
type DataMode = 'historical' | 'live';
type SystemMetric = 'flow' | 'pressure' | 'dewPoint';
const menus = [
    'Compressor Overview',
    'Unit Compressor',
    'Process & trends',
    'Alarms & events',
    'Historical Data',
] as const;
type Menu = (typeof menus)[number];
const statuses = [
    'Running',
    'Standby',
    'Isolate',
    'Trip',
] as const;
const sensorDefinitions = [
    {
        field: 'airTempStg1',
        title: 'Air Temperature Stage 1',
        shortLabel: 'AIR TEMP 1',
        suffix: 'AIR-TEMP-STG1-AI-MS',
        unit: '°C',
        category: 'temperature',
    },
    {
        field: 'airTempStg2',
        title: 'Air Temperature Stage 2',
        shortLabel: 'AIR TEMP 2',
        suffix: 'AIR-TEMP-STG2-AI-MS',
        unit: '°C',
        category: 'temperature',
    },
    {
        field: 'pressureStg1',
        title: 'Discharge Pressure Stage 1',
        shortLabel: 'PRESS STG 1',
        suffix: 'DSCH-PRESSURE-STG1-AI-MS',
        unit: 'psi',
        category: 'pressure',
    },
    {
        field: 'pressureStg2',
        title: 'Discharge Pressure Stage 2',
        shortLabel: 'PRESS STG 2',
        suffix: 'DSCH-PRESSURE-STG2-AI-MS',
        unit: 'psi',
        category: 'pressure',
    },
    {
        field: 'bearingDeTemp',
        title: 'Bearing DE Temperature',
        shortLabel: 'BEARING DE',
        suffix: 'BRG-DE-TEMP-AI-MS',
        unit: '°C',
        category: 'mechanical',
    },
    {
        field: 'bearingNdeTemp',
        title: 'Bearing NDE Temperature',
        shortLabel: 'BEARING NDE',
        suffix: 'BRG-NDE-TEMP-AI-MS',
        unit: '°C',
        category: 'mechanical',
    },
    {
        field: 'ctInput',
        title: 'CT Input',
        shortLabel: 'CT INPUT',
        suffix: 'CT-INPUT-AI-MS',
        unit: 'A',
        category: 'electrical',
    },
    {
        field: 'motorWindingTemp',
        title: 'Average Motor Winding Temperature',
        shortLabel: 'MOTOR WINDING',
        suffix: 'AVERAGE MOTOR WINDING TEMPERATURE-AI',
        unit: 'Belum ditentukan',
        category: 'temperature',
    },
] as const;
function formatReading(value: number | null | undefined, decimals = 2) {
    return typeof value === 'number' && Number.isFinite(value)
        ? value.toLocaleString('id-ID', {
            maximumFractionDigits: decimals,
        })
        : '—';
}
function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Makassar',
        hour12: false,
    });
}
function statusLabel(status: FleetStatus) {
    return status === 'Unknown' ? 'Belum diketahui' : status;
}
function compactUnit(unit: string) {
    const unknown = [
        '',
        'raw',
        'belum ditentukan',
        'satuan belum ditentukan',
    ];
    return unknown.includes(unit.trim().toLowerCase())
        ? '—'
        : unit;
}
function NavIcon({ index }: {
    index: number;
}) {
    const paths = [
        'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
        'M4 18a9 9 0 1 1 16 0 M12 13l5-5 M11 16h2',
        'M3 20h18 M5 17v-4 M10 17V9 M15 17v-6 M20 17V5 M4 9l5-5 5 3 6-5',
        'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4',
        'M4 6c0-2 16-2 16 0s-16 2-16 0 M4 6v12c0 3 16 3 16 0V6 M4 12c0 3 16 3 16 0',
    ];
    return (<svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[index]}/>
    </svg>);
}
function MetricIcon({ index }: {
    index: number;
}) {
    const paths = [
        'M3 8h12a3 3 0 1 0-3-3 M3 12h16a3 3 0 1 1-3 3 M3 16h5',
        'M4 18a9 9 0 1 1 16 0 M12 13l5-5 M10 18h4',
        'M12 3l6 8a7 7 0 1 1-12 0z',
        'M3 4h18v13H3z M8 21h8 M12 17v4',
    ];
    return (<svg className="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[index]}/>
    </svg>);
}
function StatusBadge({ status }: {
    status: FleetStatus;
}) {
    return (<span className={`equipment-status status-${status.toLowerCase()}`}>
      <span className="equipment-dot" aria-hidden="true"/>
      <span>{statusLabel(status)}</span>
    </span>);
}
function EmptyPanel({ title, message, }: {
    title: string;
    message: string;
}) {
    return (<section className="panel">
      <div className="empty-state">
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
    </section>);
}
export default function App() {
    const [mode, setMode] = useState<DataMode>('historical');
    const [activeMenu, setActiveMenu] = useState<Menu>(menus[0]);
    const [selectedUnitId, setSelectedUnitId] = useState('SAC#14');
    const [trendTag, setTrendTag] = useState('');
    const [fleetFilter, setFleetFilter] = useState<'All' | FleetStatus>('All');
    const [fleetSearch, setFleetSearch] = useState('');
    const [day, setDay] = useState('2026-01-01');
    const [time, setTime] = useState('00:00');
    const [clock, setClock] = useState(() => new Date());
    const [systemRefreshKey, setSystemRefreshKey] = useState(0);
    const historicalMode = mode === 'historical';
    const live = useLiveFleet(mode === 'live');
    const history = useHistoricalFleet(historicalMode, day, time);
    const systemHistory = useSystemHistory(historicalMode, day, time, systemRefreshKey);
    const historyBusy = historicalMode && (history.loading || systemHistory.loading);
    const compressors: FleetUnit[] = (historicalMode
        ? history.compressors
        :
            live.units).filter((unit) => isActiveUnit(unit.id));
    const counts = {
        Running: compressors.filter((u) => u.status === 'Running').length,
        Standby: compressors.filter((u) => u.status === 'Standby').length,
        Isolate: compressors.filter((u) => u.status === 'Isolate').length,
        Trip: compressors.filter((u) => u.status === 'Trip').length,
        Unknown: compressors.filter((u) => u.status === 'Unknown').length,
    };
    const availableUnits = compressors.filter((unit) => Boolean(unit.sourceTime)).length;
    const selectedUnit = compressors.find((unit) => unit.id === selectedUnitId) ?? null;
    const visibleCompressors = compressors.filter((unit) => {
        const matchesStatus = fleetFilter === 'All' || unit.status === fleetFilter;
        const matchesSearch = unit.id
            .toLowerCase()
            .includes(fleetSearch.trim().toLowerCase());
        return matchesStatus && matchesSearch;
    });
    const modeLabel = historicalMode
        ? 'HISTORICAL'
        : `LIVE · ${live.connection.toUpperCase()}`;
    const sourceDescription = historicalMode
        ? 'Historical'
        : live.message;
    const displayedTime = historicalMode
        ? history.sourceTime
        :
            live.units.map(unit => unit.sourceTime).filter(Boolean).sort().at(-1) ?? '—';
    useEffect(() => {
        const timer = window.setInterval(() => {
            setClock(new Date());
        }, 1000);
        return () => window.clearInterval(timer);
    }, []);
    function refreshAllHistory() {
        history.refresh();
        setSystemRefreshKey((value) => value + 1);
    }
    function systemDescription(metric: SystemMetric) {
        if (mode === 'live')
            return live.system ? `Live · ${live.system.sourceTime}` : 'Menunggu parameter sistem Live';
        if (systemHistory.loading) {
            return 'Memuat data historis…';
        }
        if (systemHistory.error) {
            return 'Gagal memuat parameter sistem';
        }
        const item = systemHistory.values[metric];
        if (!item.sourceFile) {
            return 'Tidak ada sampel pada waktu pilihan';
        }
        if (item.value === null) {
            return 'Nilai tidak tersedia pada file sumber';
        }
        return `Historical · ${systemHistory.sourceTime}`;
    }
    function systemValue(metric: SystemMetric) {
        if (mode === 'live')
            return formatReading(live.system?.[metric] ?? null);
        if (!historicalMode ||
            systemHistory.loading ||
            systemHistory.error) {
            return '—';
        }
        return formatReading(systemHistory.values[metric].value);
    }
    const metrics = [
        {
            title: 'Total Air Flow',
            value: systemValue('flow'),
            unit: 'SCFM',
            category: 'flow',
            description: systemDescription('flow'),
            source: historicalMode
                ? systemHistory.values.flow.sourceFile
                : '',
        },
        {
            title: 'Header System Pressure',
            value: systemValue('pressure'),
            unit: 'psi',
            category: 'pressure',
            description: systemDescription('pressure'),
            source: historicalMode
                ? systemHistory.values.pressure.sourceFile
                : '',
        },
        {
            title: 'Dew Point Temperature',
            value: systemValue('dewPoint'),
            unit: '°C',
            category: 'dewpoint',
            description: systemDescription('dewPoint'),
            source: historicalMode
                ? systemHistory.values.dewPoint.sourceFile
                : '',
        },
        {
            title: 'Compressor Operating Status',
            value: (counts.Unknown < TOTAL_UNITS)
                ? `${counts.Running} / ${TOTAL_UNITS}`
                : '—',
            unit: 'Units Running',
            category: 'fleet',
            description: `${counts.Standby} Standby · ${counts.Isolate} Isolate · ${counts.Trip} Trip · ${counts.Unknown} Belum diketahui`,
            source: '',
        },
    ];
    function changeMode(value: string) {
        if (value !== 'historical' &&
            value !== 'live') {
            return;
        }
        setMode(value);
        setFleetFilter('All');
    }
    function openTrends(id: string, suffix = '') {
        setSelectedUnitId(id);
        setTrendTag(suffix);
        setActiveMenu(menus[2]);
    }
    function unitSourceLabel(unit: FleetUnit) {
        if (mode === 'live')
            return unit.sourceTime ? `Live · ${unit.sourceTime}` : unit.issue ?? 'Menunggu data Live';
        if (historicalMode) {
            return unit.sourceTime
                ? `Historical · ${unit.sourceTime}`
                : unit.issue ?? 'Data tidak tersedia';
        }
        return unit.acquisitionActive
            ? 'Data simulasi tersedia'
            : 'Data simulasi tidak tersedia';
    }
    function parametersFor(unit: FleetUnit): DynamicParameter[] {
        if (historicalMode) {
            return unit.customParameters ?? [];
        }
        return unit.customParameters ?? [];
    }

    function highlightsFor(unit: FleetUnit): DynamicParameter[] {
        if (historicalMode) {
            const available = unit.cardHighlights?.length
                ? unit.cardHighlights.slice(0, 3)
                : parametersFor(unit).slice(0, 3);
            if (available.length > 0)
                return available;
            return [
                sensorDefinitions[0],
                sensorDefinitions[3],
                sensorDefinitions[6],
            ].map((sensor) => ({
                tag: `U-${unit.id.replace('#', '')}-${sensor.suffix}`,
                suffix: sensor.suffix,
                label: sensor.title,
                shortLabel: sensor.shortLabel,
                unit: '',
                category: sensor.category,
                value: null,
            }));
        }
        const parameters = parametersFor(unit);
        return parameters.slice(0, 3);
    }
    // Live cards use only metadata supplied by the source API.
    const detailParameters = selectedUnit
        ? parametersFor(selectedUnit)
        : [];
    const parameterGroups = [
        {
            title: 'Suhu dan Tekanan Proses',
            label: 'PROSES UTAMA',
            categories: ['temperature', 'pressure'],
        },
        {
            title: 'Mekanikal, Elektrikal, Aliran dan Status',
            label: 'PARAMETER LAINNYA',
            categories: ['mechanical', 'electrical', 'flow', 'status', 'other'],
        },
    ];
    return (<div className="dashboard">
      <aside className="sidebar">
        <div className="vale-brand">
          <div className="vale-logo-frame">
            <img className="vale-logo" src={valeLogo} alt="Vale" width={755} height={373}/>
          </div>
          <div className="vale-brand-caption">
            <strong>SERVICE AIR</strong>
            <span>MONITORING SYSTEM</span>
          </div>
        </div>

        <div className="department">
          <span className="eyebrow">PT VALE INDONESIA</span>
          <p>
            Energy &amp; Logistics
            <br />
            Department
          </p>
        </div>

        <span className="eyebrow navigation-label">
          OPERATIONS WORKSPACE
        </span>

        <nav aria-label="Navigasi utama">
          {menus.map((menu, index) => (<button key={menu} type="button" className={`nav-button ${activeMenu === menu ? 'active' : ''}`} aria-current={activeMenu === menu ? 'page' : undefined} onClick={() => setActiveMenu(menu)}>
              <NavIcon index={index}/>
              <span>{menu}</span>
            </button>))}
        </nav>

        <div className="sidebar-summary">
          <div className="sidebar-summary-header">
            <span className="eyebrow">COMPRESSOR RUNNING</span>
            <span className="fleet-live-pill">{modeLabel}</span>
          </div>

          <div className="fleet-count">
            <strong>
              {(counts.Unknown < TOTAL_UNITS) ? counts.Running : '—'}
            </strong>
            <small> / {TOTAL_UNITS} Units Running</small>
          </div>

          <div className="fleet-bar">
            {statuses.map((status) => (<div key={status} className={`fleet-bar-seg seg-${status.toLowerCase()}`} style={{
                width: `${(counts[status] / TOTAL_UNITS) * 100}%`,
            }}/>))}
          </div>

          <div className="fleet-status-chips">
            {statuses.map((status) => (<span key={status} className={`chip-item chip-${status.toLowerCase()}`}>
                <span className={`dot dot-${status.toLowerCase()}`}/>
                {' '}{counts[status]} {status}
              </span>))}
          </div>

          {historicalMode && (<p className="fleet-history-note">
              {history.loading
                ? 'Memuat sampel historis…'
                : `${availableUnits}/${TOTAL_UNITS} unit memiliki sampel`}
            </p>)}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title-wrap">
            <div className="plant-tag">
              <span className="plant-pulse"/>
              <span>THERMAL PLANT · UTILITY SYSTEMS</span>
            </div>

            <h1>
              Service Air Compressor Online Dashboard Monitoring System
            </h1>

            <p className="breadcrumb">
              UTILITY SYSTEMS / SERVICE AIR / OPERATIONS MONITORING
            </p>
          </div>

          <div className="clock-card" aria-label="Jam komputer dalam WITA">
            <div className="clock-top">
              <strong className="clock-time">
                {formatTime(clock.getTime())}
              </strong>
              <span className="clock-tz">UTC+08:00</span>
            </div>

            <div className="clock-bottom">
              <span>
                {clock.toLocaleDateString('id-ID', {
            timeZone: 'Asia/Makassar',
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })}
              </span>
            </div>
          </div>
        </header>

        <div className="statusbar">
          {!historicalMode && (<div className="connection-status" role="status">
            <span className={`status-dot ${historicalMode
                ? 'history-dot'
                : 'live-dot'}`} style={{backgroundColor: live.connection === 'connected' ? '#10b981' : live.connection === 'partial' || live.connection === 'stale' ? '#f59e0b' : '#94a3b8'}} aria-hidden="true"/>
            <span>{sourceDescription}</span>
          </div>)}

          <div className="mode-control" style={{ marginLeft: 'auto' }}>
            <label htmlFor="data-source-mode">Sumber data</label>
            <select id="data-source-mode" className="history-select" value={mode} onChange={(event) => changeMode(event.target.value)}>
              <option value="historical">Historical</option>
              <option value="live">Live</option>
            </select>
          </div>
        </div>

        <div className="content">
          <div className="page-heading">
            <div>
              <h2>{activeMenu}</h2>
              {activeMenu === menus[4] && (<p className="muted">Kelola impor data historis kompresor</p>)}
            </div>

            <span className="mode-badge">
              {activeMenu === menus[4]
            ? 'HISTORICAL'
            : modeLabel}
            </span>
          </div>

          {historicalMode && activeMenu !== menus[4] && (<section className="history-controls" aria-label="Pengaturan waktu historis">
              <div className="history-toolbar">
                <label>
                  Tanggal data
                  <input type="date" value={day} onChange={(event) => {
                if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) {
                    setDay(event.target.value);
                }
            }}/>
                </label>

                <label>
                  Jam
                  <select className="history-select" value={time.slice(0, 2)} onChange={(event) => setTime(`${event.target.value}:${time.slice(3, 5)}`)}>
                    {Array.from({ length: 24 }, (_, index) => {
                const hour = String(index).padStart(2, '0');
                return <option key={hour}>{hour}</option>;
            })}
                  </select>
                </label>

                <label>
                  Menit
                  <select className="history-select" value={time.slice(3, 5)} onChange={(event) => setTime(`${time.slice(0, 2)}:${event.target.value}`)}>
                    {Array.from({ length: 60 }, (_, index) => {
                const minute = String(index).padStart(2, '0');
                return <option key={minute}>{minute}</option>;
            })}
                  </select>
                </label>

                <button type="button" className="secondary-button" disabled={historyBusy} onClick={refreshAllHistory}>
                  {historyBusy ? 'Memuat…' : 'Muat ulang data'}
                </button>


              </div>

              <p className="history-help">
                Kartu mengikuti waktu pilihan. Grafik menampilkan data pada tanggal tersebut.
              </p>

              {history.error && (<p className="history-error" role="alert">
                  {history.error}
                </p>)}

              {history.warnings.map((message, index) => (<p className="history-error" key={`${index}-${message}`}>
                  {message}
                </p>))}
            </section>)}

          {historicalMode && activeMenu === menus[0] && (<>
              {systemHistory.error && (<p className="history-error" role="alert">
                  Parameter sistem: {systemHistory.error}
                </p>)}

              {systemHistory.warning && (<p className="history-error" role="status">
                  {systemHistory.warning}
                </p>)}
            </>)}

          {activeMenu === menus[0] && (<>
              <section className="metrics" aria-label="Ringkasan sistem">
                {metrics.map((metric, index) => (<article key={metric.title} className={`metric-card metric-card-${metric.category}`} title={metric.source
                    ? `Sumber: ${metric.source}`
                    : undefined}>
                    <div className="kpi-header">
                      <h3>{metric.title}</h3>
                      <div className="kpi-icon-wrap">
                        <MetricIcon index={index}/>
                      </div>
                    </div>

                    <div className="kpi-reading" style={{ flexWrap: 'wrap' }}>
                      <strong>{metric.value}</strong>
                      <span className="kpi-unit">{metric.unit}</span>
                    </div>

                    <p className="kpi-desc">{metric.description}</p>
                  </article>))}
              </section>

              <section className="panel">
                <div className="panel-header fleet-panel-header">
                  <div>
                    <h3>Unit Compressor <span className="muted">({TOTAL_UNITS} unit)</span></h3>
                    <p className="panel-subtitle">
                      {historicalMode
                ? `HISTORICAL · ${history.sourceTime}`
                :
                    live.message}
                    </p>
                  </div>

                  <div className="fleet-controls">
                    <div className="fleet-filter-pills">
                      <button type="button" className={`fleet-pill ${fleetFilter === 'All' ? 'is-active' : ''}`} onClick={() => setFleetFilter('All')}>
                        Semua ({compressors.length})
                      </button>

                      {statuses.map((status) => (<button key={status} type="button" className={`fleet-pill fleet-pill-${status.toLowerCase()} ${fleetFilter === status ? 'is-active' : ''}`} onClick={() => setFleetFilter(status)}>
                          <span className={`pill-dot ${status.toLowerCase()}-dot`}/>
                          {status} ({counts[status]})
                        </button>))}

                      {(<button type="button" className={`fleet-pill ${fleetFilter === 'Unknown' ? 'is-active' : ''}`} onClick={() => setFleetFilter('Unknown')}>
                          Belum diketahui ({counts.Unknown})
                        </button>)}
                    </div>

                    <div className="fleet-search-wrap">
                      <input type="search" aria-label="Cari kompresor" placeholder="Cari kompresor..." value={fleetSearch} onChange={(event) => setFleetSearch(event.target.value)}/>
                    </div>
                  </div>
                </div>

                {visibleCompressors.length ? (<div className="compressor-grid">
                    {visibleCompressors.map((unit) => {
                    const highlights = highlightsFor(unit);
                    return (<button key={unit.id} type="button" className={`compressor-card compressor-link compressor-${unit.status.toLowerCase()}`} onClick={() => openTrends(unit.id)} aria-label={`Lihat tren ${unit.id}`}>
                          <div className="compressor-heading">
                            <div className="compressor-name-wrap">
                              <strong className="compressor-name">
                                {unit.id}
                              </strong>
                              <span className="compressor-type-badge">
                                CENTAC
                              </span>
                            </div>

                            <StatusBadge status={unit.status}/>
                          </div>

                          <span className="acquisition-label">
                            {unitSourceLabel(unit)}
                          </span>

                          <div className="card-values">
                            {highlights.map((parameter) => (<div className="val-box" key={parameter.tag}>
                                <div className="val-header">
                                  <span className="val-label" title={parameter.label}>
                                    {parameter.shortLabel || parameter.label}
                                  </span>

                                  <span className="val-unit" title={parameter.unit || 'Belum ditentukan'}>
                                    {compactUnit(parameter.unit)}
                                  </span>
                                </div>

                                <b className="val-number">
                                  {formatReading(parameter.value)}
                                </b>
                              </div>))}
                          </div>

                          <div className="card-footer-action">
                            <span>Lihat tren unit</span>
                            <span aria-hidden="true">→</span>
                          </div>
                        </button>);
                })}
                  </div>) : (<div className="empty-state">
                    <h3>Tidak ada unit yang sesuai</h3>
                    <p>Pilih filter Semua dan kosongkan pencarian.</p>
                  </div>)}
              </section>

              <p className="overview-note">
                Waktu sumber: {displayedTime} · Klik kartu untuk membuka tren.
              </p>
            </>)}

          {activeMenu === menus[1] && (<>
              <div className="unit-nav-bar">
                <div className="unit-nav-left">
                  <button type="button" className="secondary-button" onClick={() => setActiveMenu(menus[0])}>
                    ← Compressor Overview
                  </button>

                  <button type="button" className="secondary-button" onClick={() => openTrends(selectedUnitId)}>
                    Lihat tren {selectedUnitId} →
                  </button>
                </div>

                <div className="unit-selector-strip">
                    {ACTIVE_UNIT_NUMBERS.map((number) => {
                const id = `SAC#${number}`;
                const unit = compressors.find((item) => item.id === id);
                return (<button key={id} type="button" className={`unit-strip-btn unit-strip-${(unit?.status ?? 'Unknown').toLowerCase()} ${selectedUnitId === id ? 'is-active' : ''}`} aria-pressed={selectedUnitId === id} onClick={() => setSelectedUnitId(id)}>
                        <span className="unit-strip-dot"/>
                        <span className="unit-strip-name">{id}</span>
                      </button>);
            })}
                </div>
              </div>

              {selectedUnit ? (<>
                  <section className="panel unit-detail-panel">
                    <div className="unit-detail-heading">
                      <div className="unit-heading-left">
                        <div className="unit-asset-badge">
                          <span>CENTAC</span>
                        </div>

                        <h3>
                          {selectedUnit.id} — Service Air Compressor
                        </h3>

                        {!historicalMode && <p className="muted">{sourceDescription}</p>}
                      </div>

                      <StatusBadge status={selectedUnit.status}/>
                    </div>

                    <dl className="unit-information">
                      <div>
                        <dt>Status operasi</dt>
                        <dd>{statusLabel(selectedUnit.status)}</dd>
                      </div>

                      <div>
                        <dt>Ketersediaan data</dt>
                        <dd>{unitSourceLabel(selectedUnit)}</dd>
                      </div>

                      <div>
                        <dt>Sumber data</dt>
                        <dd>
                          {historicalMode
                    ? selectedUnit.sourceFile
                        ? `${selectedUnit.sourceFile} · Impor #${selectedUnit.importId}`
                        : '—'
                    : 'API Live · melalui backend'}
                        </dd>
                      </div>

                      <div>
                        <dt>Waktu sumber</dt>
                        <dd>
                          {selectedUnit.sourceTime ?? '—'}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  {parameterGroups.map((group) => {
                    const parameters = detailParameters.filter((parameter) => group.categories.includes(parameter.category));
                    if (!parameters.length)
                        return null;
                    return (<div key={group.label}>
                        <div className="telemetry-section-header">
                          <span className="section-pill">
                            {group.label}
                          </span>
                          <h4>{group.title}</h4>
                        </div>

                        <section className="metrics telemetry-metrics-4col" aria-label={group.title}>
                          {parameters.map((parameter) => (<article key={parameter.tag} className={`metric-card telemetry-card telemetry-${parameter.category}`}>
                              <div className="metric-tag-row">
                                <code className="metric-tag-code" title={parameter.tag}>
                                  {parameter.tag}
                                </code>
                              </div>

                              <div className="kpi-header">
                                <h3>{parameter.label}</h3>
                              </div>

                              <div className="kpi-reading">
                                <strong>
                                  {formatReading(parameter.value)}
                                </strong>
                                <span className="kpi-unit">
                                  {parameter.unit || 'Belum ditentukan'}
                                </span>
                              </div>

                              <ParameterAlarm parameter={parameter} enabled={historicalMode}/>

                              <div className="telemetry-footer-status">
                                <span>
                                  {parameter.value == null
                                ? 'Nilai tidak tersedia'
                                : historicalMode
                                    ? 'Data historis · nilai dari file sumber'
                                    : mode === 'live' ? 'Data Live · waktu pengukuran sumber' : 'Data simulasi'}
                                </span>
                              </div>

                              <button type="button" className="secondary-button" style={{ marginTop: 14 }} onClick={() => openTrends(selectedUnit.id, parameter.suffix)}>
                                Lihat tren →
                              </button>
                            </article>))}
                        </section>
                      </div>);
                })}

                  {!detailParameters.length && (<EmptyPanel
                    title={historicalMode ? "Parameter belum tersedia pada waktu pilihan" : "Parameter Live belum dikonfigurasi"}
                    message={historicalMode ? "Pilih tanggal dan jam yang sesuai dengan periode data impor." : "Menunggu konfigurasi parameter dari sumber perusahaan."}
                  />)}

                  <div className="unit-explanation">
                    <p>
                      {historicalMode
                    ? 'Nilai mengikuti data sumber. Satuan mengikuti metadata yang tersedia. Status mesin tidak disimpulkan dari nilai suhu atau arus.'
                    : 'Status operasi mengikuti adapter sumber. Ambang parameter Live belum diaktifkan.'}
                    </p>

                    {selectedUnit.issue && (<p>{selectedUnit.issue}</p>)}
                  </div>
                </>) : (<EmptyPanel title="Data unit belum tersedia" message="Pilih unit yang tersedia untuk membuka detail."/>)}
            </>)}

          {activeMenu === menus[2] && (mode === 'live' ? (<LiveTrends units={live.units} initialTag={trendTag} history={live.history} unitId={selectedUnitId} onUnitChange={setSelectedUnitId} message={live.message}/>) : (<UnitTrends mode={historicalMode ? 'historical' : 'live'} unitId={selectedUnitId} initialTag={trendTag} day={day} imports={history.imports} loading={historicalMode && history.loading} error={historicalMode ? history.error : ''} onUnitChange={(id) => {
                setSelectedUnitId(id);
                setTrendTag('');
            }} onDetail={() => setActiveMenu(menus[1])}/>))}

          {activeMenu === menus[3] && ((<EmptyPanel title="Data alarm belum tersedia" message="Sinyal Trip dan ambang batas setiap parameter belum dihubungkan ke halaman ini."/>))}

          {activeMenu === menus[4] && (<HistoricalData onImported={() => {
                setMode('historical');
                refreshAllHistory();
            }}/>)}
        </div>
      </main>
    </div>);
}
