import { test } from "node:test"
import assert from "node:assert/strict"
import { Model } from "./helpers/load.mjs"

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
