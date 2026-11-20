import { useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

type Point = {
  time: number
  label: string
  values: Record<string, number | null>
}

type Series = {
  tag: string
  label: string
  unit: string
  color: string
  dashed: boolean
}

type Props = {
  points: Point[]
  series: Series[]
  start: number
  end: number
  title: string
  timeZone?: string
}

type Hover = {
  fraction: number
  x: number
  y: number
}

const LEFT = 85
const RIGHT = 970
const TOP = 24
const BOTTOM = 300
const WIDTH = RIGHT - LEFT

function format(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('id-ID', {
        maximumFractionDigits: 3,
      })
    : '—'
}

function formatChartTime(time: number, timeZone?: string) {
  if (timeZone) return new Intl.DateTimeFormat("sv-SE", {timeZone, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23"}).format(time)
  return new Date(time)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export default function InteractiveTrendChart(props: Props) {
  const identity = [
    props.start,
    props.end,
    ...props.series.map((item) => item.tag),
  ].join('|')

  if (
    !Number.isFinite(props.start) ||
    !Number.isFinite(props.end) ||
    props.end <= props.start
  ) {
    return <p role="alert">Rentang waktu grafik tidak valid.</p>
  }

  return <ChartContent key={identity} {...props} />
}

function ChartContent({
  points,
  series,
  start,
  end,
  title,
  timeZone,
}: Props) {
  const timeLabel = (time: number) => formatChartTime(time, timeZone)
  const plotRef = useRef<HTMLDivElement>(null)

  const [view, setView] = useState({ start, end })
  const [hover, setHover] = useState<Hover | null>(null)
  const [drag, setDrag] = useState<{
    from: number
    to: number
  } | null>(null)

  const duration = view.end - view.start
  const fullDuration = end - start
  const minimumDuration = Math.min(60_000, fullDuration)
  const zoomed = view.start !== start || view.end !== end

  const visible = useMemo(
    () =>
      points
        .filter(
          (point) =>
            point.time >= view.start &&
            point.time < view.end &&
            series.some((item) =>
              Object.prototype.hasOwnProperty.call(
                point.values,
                item.tag,
              ),
            ),
        )
        .sort((a, b) => a.time - b.time),
    [points, series, view.start, view.end],
  )

  const scale = useMemo(() => {
    let min = Infinity
    let max = -Infinity

    for (const point of visible) {
      for (const item of series) {
        const value = point.values[item.tag]

        if (value == null || !Number.isFinite(value)) {
          continue
        }

        min = Math.min(min, value)
        max = Math.max(max, value)
      }
    }

    if (!Number.isFinite(min)) {
      return { low: 0, high: 1, valid: false }
    }

    const padding =
      min === max
        ? Math.max(Math.abs(min) * 0.02, 0.1)
        : (max - min) * 0.08

    return {
      low: min - padding,
      high: max + padding,
      valid: true,
    }
  }, [visible, series])

  const x = (time: number) =>
    LEFT + ((time - view.start) / duration) * WIDTH

  const y = (value: number) =>
    BOTTOM -
    ((value - scale.low) / (scale.high - scale.low)) *
      (BOTTOM - TOP)

  function nearest(target: number): Point | undefined {
    if (!visible.length) return undefined

    let left = 0
    let right = visible.length - 1

    while (left < right) {
      const middle = Math.floor((left + right) / 2)

      if (visible[middle].time < target) {
        left = middle + 1
      } else {
        right = middle
      }
    }

    const after = visible[left]
    const before = visible[Math.max(0, left - 1)]

    return Math.abs(before.time - target) <=
      Math.abs(after.time - target)
      ? before
      : after
  }

  const active = hover
    ? nearest(view.start + hover.fraction * duration)
    : undefined

  function pointerPosition(
    event: PointerEvent<SVGSVGElement>,
  ) {
    const matrix = event.currentTarget.getScreenCTM()
    const box = plotRef.current?.getBoundingClientRect()

    if (!matrix || !box) return null

    const location = new DOMPoint(
      event.clientX,
      event.clientY,
    ).matrixTransform(matrix.inverse())

    return {
      fraction: clamp((location.x - LEFT) / WIDTH, 0, 1),
      x: clamp(event.clientX - box.left, 0, box.width),
      y: clamp(event.clientY - box.top, 0, box.height),
      inside:
        location.x >= LEFT &&
        location.x <= RIGHT &&
        location.y >= TOP &&
        location.y <= BOTTOM,
    }
  }

  function zoom(factor: number) {
    const nextDuration = clamp(
      duration * factor,
      minimumDuration,
      fullDuration,
    )

    const center = view.start + duration / 2
    const nextStart = clamp(
      center - nextDuration / 2,
      start,
      end - nextDuration,
    )

    setView({
      start: nextStart,
      end: nextStart + nextDuration,
    })

    setHover(null)
  }

  function finishDrag(event: PointerEvent<SVGSVGElement>) {
    const position = pointerPosition(event)

    if (drag && position) {
      const distance = Math.abs(position.fraction - drag.from)

      if (
        distance > 0.015 &&
        distance * duration >= minimumDuration
      ) {
        setView({
          start:
            view.start +
            Math.min(drag.from, position.fraction) * duration,
          end:
            view.start +
            Math.max(drag.from, position.fraction) * duration,
        })
      }

      setHover(position.inside ? position : null)
    }

    setDrag(null)

    if (
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const plotWidth = plotRef.current?.clientWidth ?? 1000
  const plotHeight = plotRef.current?.clientHeight ?? 350

  const tooltipWidth = Math.min(
    340,
    Math.max(180, plotWidth - 24),
  )

  const estimatedHeight = 62 + series.length * 36

  const tooltipLeft = hover
    ? clamp(
        hover.x + tooltipWidth + 18 > plotWidth
          ? hover.x - tooltipWidth - 16
          : hover.x + 16,
        8,
        Math.max(8, plotWidth - tooltipWidth - 8),
      )
    : 0

  const tooltipTop = hover
    ? clamp(
        hover.y - 22,
        8,
        Math.max(8, plotHeight - estimatedHeight - 8),
      )
    : 0

  return (
    <div className="sac-chart">
      <div className="sac-chart__header">
        <div>
          <strong>{title}</strong>
          <span>
            Arahkan kursor untuk melihat nilai
          </span>
        </div>

        <div className="sac-chart__actions">
          <button
            type="button"
            onClick={() => zoom(0.5)}
            disabled={duration <= minimumDuration}
            aria-label="Perbesar grafik"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => zoom(2)}
            disabled={!zoomed}
            aria-label="Perkecil grafik"
          >
            −
          </button>

          <button
            type="button"
            disabled={!zoomed}
            onClick={() => {
              setView({ start, end })
              setHover(null)
              setDrag(null)
            }}
          >
            Reset zoom
          </button>
        </div>
      </div>

      <div ref={plotRef} className="sac-chart__plot">
        <svg
          viewBox="0 0 1000 345"
          role="img"
          aria-label={`Grafik ${title}`}
          onPointerMove={(event) => {
            const position = pointerPosition(event)
            if (!position) return

            if (drag) {
              setDrag({
                from: drag.from,
                to: position.fraction,
              })
              setHover(position)
            } else {
              setHover(position.inside ? position : null)
            }
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return

            const position = pointerPosition(event)
            if (!position?.inside) return

            event.currentTarget.setPointerCapture(
              event.pointerId,
            )

            setHover(position)
            setDrag({
              from: position.fraction,
              to: position.fraction,
            })
          }}
          onPointerUp={finishDrag}
          onPointerCancel={() => {
            setDrag(null)
            setHover(null)
          }}
          onPointerLeave={() => {
            if (!drag) setHover(null)
          }}
        >
          {Array.from({ length: 5 }, (_, index) => {
            const value =
              scale.low +
              ((scale.high - scale.low) * index) / 4

            return (
              <g key={index}>
                <line
                  x1={LEFT}
                  x2={RIGHT}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="#293e52"
                  strokeDasharray="3 5"
                />

                <text
                  x={LEFT - 12}
                  y={y(value) + 4}
                  textAnchor="end"
                  fill="#8fa6bc"
                  fontSize="11"
                >
                  {format(value)}
                </text>
              </g>
            )
          })}

          {Array.from({ length: 5 }, (_, index) => {
            const time = view.start + (duration * index) / 4
            const label = timeLabel(time)
            const position = LEFT + (WIDTH * index) / 4

            return (
              <g key={index}>
                <line
                  x1={position}
                  x2={position}
                  y1={TOP}
                  y2={BOTTOM}
                  stroke="#203347"
                  strokeDasharray="3 5"
                />

                <text
                  x={position}
                  y="326"
                  textAnchor={
                    index === 0
                      ? 'start'
                      : index === 4
                        ? 'end'
                        : 'middle'
                  }
                  fill="#8fa6bc"
                  fontSize="11"
                >
                  {duration > 24 * 60 * 60 * 1000
                    ? label.slice(5, 16)
                    : label.slice(11, 19)}
                </text>
              </g>
            )
          })}

          {series.map((item) => {
            let path = ''
            let penDown = false
            let first: Point | undefined

            for (const point of visible) {
              if (!(item.tag in point.values)) continue

              const value = point.values[item.tag]

              if (value == null || !Number.isFinite(value)) {
                penDown = false
                continue
              }

              first ??= point

              path +=
                `${penDown ? 'L' : 'M'}` +
                `${x(point.time)} ${y(value)} `

              penDown = true
            }

            return (
              <g key={item.tag}>
                <path
                  d={path}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray={
                [undefined, '7 4', '2 5', '10 4 2 4', '4 3', '12 5'][
                    series.findIndex((entry) => entry.tag === item.tag) % 6
                ]
                }
                />

                {first && (
                  <circle
                    cx={x(first.time)}
                    cy={y(first.values[item.tag] as number)}
                    r="2"
                    fill={item.color}
                  />
                )}
              </g>
            )
          })}

          {!scale.valid && (
            <text
              x="530"
              y="165"
              textAnchor="middle"
              fill="#9eb2c5"
              fontSize="13"
            >
              Tidak ada nilai valid pada rentang ini.
            </text>
          )}

          {drag && (
            <rect
              x={LEFT + Math.min(drag.from, drag.to) * WIDTH}
              y={TOP}
              width={Math.abs(drag.to - drag.from) * WIDTH}
              height={BOTTOM - TOP}
              fill="#38bdf8"
              fillOpacity="0.12"
              stroke="#38bdf8"
              strokeOpacity="0.6"
              pointerEvents="none"
            />
          )}

          {active && (
            <g pointerEvents="none">
              <line
                x1={x(active.time)}
                x2={x(active.time)}
                y1={TOP}
                y2={BOTTOM}
                stroke="#bfd1df"
                strokeWidth="1"
                strokeDasharray="4 4"
              />

              {series.map((item) => {
                const value = active.values[item.tag]
                if (value == null) return null

                return (
                  <circle
                    key={item.tag}
                    cx={x(active.time)}
                    cy={y(value)}
                    r="4"
                    fill={item.color}
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                )
              })}
            </g>
          )}
        </svg>

        {active && hover && !drag && (
          <div
            className="sac-chart__tooltip"
            style={{
              left: tooltipLeft,
              top: tooltipTop,
              width: tooltipWidth,
              maxHeight: Math.max(100, plotHeight - 16),
            }}
          >
            <div className="sac-chart__tooltip-time">
              {active.label}
            </div>

            {series.map((item) => (
              <div
                key={item.tag}
                className="sac-chart__tooltip-row"
              >
                <i style={{ background: item.color }} />

                <span
                  className="sac-chart__tooltip-name"
                  style={{ color: item.color }}
                >
                  {item.label}
                </span>

                <strong>
                  {format(active.values[item.tag])}
                  <small>{item.unit}</small>
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sac-chart__footer">
        <span>
          {timeLabel(view.start)} — {timeLabel(view.end)}
        </span>

        <span>
          {zoomed ? 'Zoom aktif · ' : ''}
          Klik dan tarik untuk memperbesar rentang
        </span>
      </div>
    </div>
  )
}