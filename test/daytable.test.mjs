import { test } from "node:test"
import assert from "node:assert/strict"
import { Model } from "./helpers/load.mjs"

// Local-day aggregation: pin the zone (node --test runs each file in its own process).
process.env.TZ = "Europe/Stockholm"

// A synthetic series: hourly for the first 48 h, then six-hourly, in UTC.
function series(startIso, hourly, sixHourly) {
  const out = []
  let t = Date.parse(startIso)
  const push = (hours, mm, code) => {
    out.push({ time: new Date(t).toISOString(), data: {
      instant: { details: { air_temperature: (t / 3.6e6) % 7 - 3, wind_speed: 4 } },
      ...(hours === 1 ? { next_1_hours: { summary: { symbol_code: code }, details: { precipitation_amount: mm } } } : {}),
      next_6_hours: { summary: { symbol_code: code }, details: { precipitation_amount: hours === 1 ? mm * 6 : mm } }
    } })
    t += hours * 3.6e6
  }
  for (let i = 0; i < hourly; i++) push(1, 0.5, "rain")
  for (let i = 0; i < sixHourly; i++) push(6, 2, "cloudy")
  return { properties: { timeseries: out } }
}

test("dayTable: up to ten days from today, four periods, precipitation without overlap", () => {
  const doc = series("2026-11-23T00:00:00Z", 48, 40)
  const today = Model.localDateKey(new Date(doc.properties.timeseries[0].time))
  const rows = Model.dayTable(doc, today, 10)
  assert.equal(rows.length, 10)
  assert.equal(rows[0].date, today)
  assert.ok(rows[0].isToday)
  for (const r of rows) {
    assert.equal(r.periods.length, 4)
    assert.ok(r.minC <= r.maxC)
    assert.ok(r.precipMm === null || r.precipMm >= 0)
  }
  // The whole series' rain, counted once: 48 h × 0.5 mm + 40 × 2 mm, minus what
  // falls after the tenth day.
  const total = rows.reduce((s, r) => s + (r.precipMm || 0), 0)
  assert.ok(total <= 48 * 0.5 + 40 * 2 + 0.01, String(total))
  assert.ok(rows.slice(2).every(r => r.periods.some(p => p && p.symbolCode === "cloudy")))
  assert.deepEqual(Model.dayTable(null, today, 10), [])
})

test("dayTable: periods without a six-hour window stay blank", () => {
  const doc = series("2026-11-23T20:00:00Z", 4, 0)
  const today = Model.localDateKey(new Date(doc.properties.timeseries[0].time))
  const rows = Model.dayTable(doc, today, 10)
  assert.ok(rows.length >= 1)
  assert.ok(rows[0].periods.filter(p => p === null).length >= 2)
})

test("table cell formatting", () => {
  assert.equal(Model.barePrecip(2.44, "metric"), "2.4")
  assert.equal(Model.barePrecip(25.4, "imperial"), "1")
  assert.equal(Model.bareWind(4.6, "metric"), "5")
  assert.equal(Model.bareWind(10, "imperial"), "22")
})

// ---- oma.yr 1.1.0: the table must agree with yr.no's own daily values.
// Fixtures fetched at the same moment (2026-11-23 22:15 CET): MET
// Locationforecast complete for 57.7747,14.2644 and yr.no's dayIntervals for
// Öxnehaga Kyrka (2-8131272).
import { fixture } from "./helpers/load.mjs"

test("dayTable matches yr.no's daily table for Öxnehaga (complete)", () => {
  const prevTz = process.env.TZ
  process.env.TZ = "Europe/Stockholm"
  try {
    const doc = JSON.parse(fixture("locationforecast-complete-oxnehaga.json"))
    const yr = JSON.parse(fixture("yr-dayintervals-oxnehaga.json")).dayIntervals
    const rows = Model.dayTable(doc, "2026-11-23", 10)
    assert.equal(rows.length, 10)
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i], y = yr[i]
      assert.equal(r.date, y.start.slice(0, 10))
      assert.equal(r.precipMm, y.precipitation.value, r.date + " precipitation")
      assert.equal(r.windMs, y.wind.max, r.date + " wind")
      assert.equal(r.minC, y.temperature.min, r.date + " min")
      // Today's max comes from the instants of the evening hours, which
      // MET's later nowcast run had nudged by 0.4° for yr.no.
      if (i === 0) assert.ok(Math.abs(r.maxC - y.temperature.max) <= 0.5, r.date + " max")
      else assert.equal(r.maxC, y.temperature.max, r.date + " max")
      assert.equal(Model.bareTemp(r.maxC, "metric"), Model.bareTemp(y.temperature.max, "metric"), r.date + " shown max")
      assert.equal(Model.bareTemp(r.minC, "metric"), Model.bareTemp(y.temperature.min, "metric"), r.date + " shown min")
    }
  } finally {
    if (prevTz === undefined) delete process.env.TZ
    else process.env.TZ = prevTz
  }
})

test("dayTable: six-hour amounts on period boundaries, hours only before the first one", () => {
  const prevTz = process.env.TZ
  process.env.TZ = "UTC"
  try {
    const out = []
    const start = Date.parse("2026-11-24T22:00:00Z")
    for (let h = 0; h < 30; h++) {
      const t = new Date(start + h * 3.6e6)
      out.push({ time: t.toISOString(), data: {
        instant: { details: { air_temperature: 1, wind_speed: 2 } },
        next_1_hours: { summary: { symbol_code: "rain" }, details: { precipitation_amount: 0.1 } },
        next_6_hours: { summary: { symbol_code: "rain" }, details: { precipitation_amount: 1.0, air_temperature_max: 3, air_temperature_min: -2 } }
      } })
    }
    const rows = Model.dayTable({ properties: { timeseries: out } }, "2026-11-24", 10)
    // 22:00 and 23:00 are hourly (0.1 each); the next day is four six-hour windows.
    assert.equal(rows[0].precipMm, 0.2)
    assert.equal(rows[0].maxC, 1)
    assert.equal(rows[1].precipMm, 4)
    assert.equal(rows[1].maxC, 3)
    assert.equal(rows[1].minC, -2)
  } finally {
    if (prevTz === undefined) delete process.env.TZ
    else process.env.TZ = prevTz
  }
})

test("dayTable: compact (no six-hour max/min) falls back to instants", () => {
  const prevTz = process.env.TZ
  process.env.TZ = "UTC"
  try {
    const out = [0, 6, 12, 18].map(h => ({ time: `2026-11-25T${String(h).padStart(2, "0")}:00:00Z`, data: {
      instant: { details: { air_temperature: h / 6, wind_speed: h } },
      next_6_hours: { summary: { symbol_code: "cloudy" }, details: { precipitation_amount: 0.5 } }
    } }))
    const [row] = Model.dayTable({ properties: { timeseries: out } }, "2026-11-25", 10)
    assert.equal(row.maxC, 3)
    assert.equal(row.minC, 0)
    assert.equal(row.precipMm, 2)
    assert.equal(row.windMs, 18)
  } finally {
    if (prevTz === undefined) delete process.env.TZ
    else process.env.TZ = prevTz
  }
})

test("temperatures round half away from zero, like yr.no, and never show -0", () => {
  assert.equal(Model.roundedTemp(-0.5), "-1")
  assert.equal(Model.roundedTemp(0.5), "1")
  assert.equal(Model.roundedTemp(-0.3), "0")
  assert.equal(Model.roundedTemp(-1.5), "-2")
  assert.equal(Model.roundedTemp(2.4), "2")
})
