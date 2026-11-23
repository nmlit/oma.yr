# oma.yr

Väder från yr.no (MET Norway) i Omarchy-baren, med en tiodagarstabell i
yr.no-stil där kommande nederbörd syns tydligt.

oma.yr är en fork av [Yr.no (unofficial)](https://github.com/Knutsi/omarchy-yr-plugin)
(`io.github.knutsi.yr`) av Knut Åbjørsbråten. Den ursprungliga dokumentationen
finns kvar i [docs/UPSTREAM-README.md](docs/UPSTREAM-README.md).

## Popupen

Uppifrån och ner:

1. **Nuläge** – ikon, temperatur, plats, vind, luftfuktighet, soluppgång och
   solnedgång (som i originalet).
2. **Varningar** (farevarsel) när MET har några för platsen.
3. **NEXT 24 HOURS** – timgraf med temperaturkurva och små mm-staplar (som i
   originalet). Shift+←/→ flyttar timmarkören.
4. **NEXT 10 DAYS** – ny lodrät dagstabell, ungefär som yr.no:s ”daglig tabell”.
   En rad per dag (från i dag och så många dagar som MET:s prognos räcker, högst
   tio):
   - veckodag och datum
   - väderikoner för natt (00–06), morgon (06–12), eftermiddag (12–18) och
     kväll (18–24), från MET:s sextimmarssymboler. Perioder utan data lämnas tomma
     (t.ex. det som redan passerat i dag).
   - max / min-temperatur
   - **nederbörd i mm för hela dygnet**, i blått och fetstil med en stapel som
     skalas mot den blötaste dagen. Torra dagar visas som en dämpad `0`.
   - starkaste medelvind (m/s, eller mph med °F)
5. **Inställningar** – °C/°F/K, Location och ”Data from MET Norway”.

Rutan **TEKSTVARSEL** är borttagen helt, liksom hämtningen av textprognosen
och inställningarna `textForecast`/`textForecastArea`.

## Installation

```bash
omarchy plugin add https://github.com/nmlit/oma.yr.git --enable
```

## Uppdatering

```bash
omarchy plugin update oma.yr --yes
omarchy-restart-shell
```

## Inställningar och data

- Platsen delas med Omarchys väder (`~/.local/state/omarchy/settings/weather.json`),
  så den följer med automatiskt. Sparade platser (`places`) och enhet (`unit`)
  ligger på pluginets post i `~/.config/omarchy/shell.json`.
- Data kommer från MET Norways [Locationforecast 2.0](https://api.met.no/weatherapi/locationforecast/2.0/documentation)
  (compact) och MetAlerts, enligt [MET:s användarvillkor](https://api.met.no/doc/TermsOfService):
  anropen identifierar sig som `oma.yr/<version> github.com/nmlit/oma.yr`,
  koordinater avrundas till fyra decimaler, uppdatering sker högst var tionde
  minut och med `If-Modified-Since`. Data licensieras av MET Norway under
  CC BY 4.0 / NLOD.

## IPC

```bash
omarchy-shell oma.yr status        # JSON med plats, antal dagar, fel m.m.
omarchy-shell oma.yr refresh
omarchy-shell oma.yr toggleUnit
```

## Licens och kreditering

MIT. Originalkoden är © 2026 Knut Åbjørsbråten
([Knutsi/omarchy-yr-plugin](https://github.com/Knutsi/omarchy-yr-plugin), MIT),
med delar från Omarchys egna väderplugin (© 2025 Omarchy contributors, MIT).
Den ursprungliga licenstexten finns oförändrad i [LICENSE](LICENSE). Ändringarna
i oma.yr (tiodagarstabellen, borttagen tekstvarsel) är gjorda av nmlit under
samma licens.

## Ändringar i 1.0.1

- Kolumnrubriken ”mm” i dagstabellen är nu grå som de andra rubrikerna.
- Den blå stapeln bakom nederbördsvärdet är borttagen; värdet visas fortfarande i blått och fetstil när det blir nederbörd.
