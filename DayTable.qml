import QtQuick
import qs.Commons
import "Model.js" as Model

// oma.yr: the coming days as a vertical table, like yr.no's "daglig tabell".
// One row per day: weekday/date, symbols for night · morning · afternoon ·
// evening (blank where MET has no six-hour window), max / min, the day's
// precipitation (blue, the point of the table) and the strongest mean wind.
Item {
  id: root

  required property var weather
  property color foreground: Color.foreground
  property color muted: Qt.darker(foreground, 1.5)
  property color faded: Qt.darker(foreground, 1.9)
  property string fontFamily: Style.font.family
  property real gutter: Style.space(16)
  property int placeholderRows: 10
  readonly property color rainColor: "#4DA3FF"

  readonly property var days: weather && weather.dayRows && weather.dayRows.length > 0 ? weather.dayRows : []
  readonly property string unit: weather ? weather.unit : "metric"

  readonly property real inner: width - 2 * gutter
  readonly property real dayW: inner * 0.25
  readonly property real periodW: inner * 0.085
  readonly property real tempW: inner * 0.17
  readonly property real precipW: inner * 0.16
  readonly property real windW: inner - dayW - 4 * periodW - tempW - precipW
  readonly property real rowH: Style.space(30)

  implicitHeight: column.implicitHeight

  function dayLabel(row) {
    if (!row) return "—"
    if (row.isToday) return "Today"
    var d = new Date(row.date + "T12:00:00")
    return Qt.formatDate(d, "ddd d MMM")
  }

  Column {
    id: column
    x: root.gutter
    width: root.inner

    // Column captions
    Row {
      height: Style.space(18)
      Item { width: root.dayW; height: parent.height }
      Repeater {
        model: ["00–06", "06–12", "12–18", "18–24"]
        Text {
          required property var modelData
          width: root.periodW
          height: parent.height
          horizontalAlignment: Text.AlignHCenter
          verticalAlignment: Text.AlignVCenter
          textFormat: Text.PlainText
          text: modelData
          color: root.faded
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption * 0.85
        }
      }
      Text {
        width: root.tempW; height: parent.height
        horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter
        textFormat: Text.PlainText
        text: "max / min"
        color: root.faded
        font.family: root.fontFamily
        font.pixelSize: Style.font.caption * 0.85
      }
      Text {
        width: root.precipW; height: parent.height
        horizontalAlignment: Text.AlignRight; verticalAlignment: Text.AlignVCenter
        rightPadding: Style.space(6)
        textFormat: Text.PlainText
        text: root.unit === "imperial" ? "in" : "mm"
        color: root.faded
        font.family: root.fontFamily
        font.pixelSize: Style.font.caption * 0.85
      }
      Text {
        width: root.windW; height: parent.height
        horizontalAlignment: Text.AlignRight; verticalAlignment: Text.AlignVCenter
        textFormat: Text.PlainText
        text: root.unit === "imperial" ? "mph" : "m/s"
        color: root.faded
        font.family: root.fontFamily
        font.pixelSize: Style.font.caption * 0.85
      }
    }

    Repeater {
      model: root.days.length > 0 ? root.days : root.placeholderRows

      Item {
        id: rowItem
        required property var modelData
        required property int index
        readonly property var day: typeof modelData === "object" ? modelData : null
        readonly property bool wet: !!day && day.precipMm !== null && day.precipMm > 0
        width: column.width
        height: root.rowH
        opacity: day ? 1 : 0.35

        Rectangle {
          anchors.fill: parent
          radius: Style.space(4)
          color: Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, rowItem.index % 2 === 0 ? 0.04 : 0)
        }

        Row {
          anchors.fill: parent

          Text {
            width: root.dayW; height: parent.height
            verticalAlignment: Text.AlignVCenter
            leftPadding: Style.space(6)
            elide: Text.ElideRight
            textFormat: Text.PlainText
            text: root.dayLabel(rowItem.day)
            color: root.foreground
            font.family: root.fontFamily
            font.pixelSize: Style.font.bodySmall
            font.bold: !!rowItem.day && rowItem.day.isToday
          }

          Repeater {
            model: 4
            Text {
              required property int index
              readonly property var period: rowItem.day ? rowItem.day.periods[index] : null
              width: root.periodW; height: rowItem.height
              horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter
              textFormat: Text.PlainText
              text: period ? period.icon : ""
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.title
            }
          }

          Row {
            width: root.tempW; height: parent.height
            Item { width: (root.tempW - tempRow.width) / 2; height: 1 }
            Row {
              id: tempRow
              anchors.verticalCenter: parent.verticalCenter
              spacing: Style.space(5)
              Text {
                textFormat: Text.PlainText
                text: rowItem.day ? Model.bareTemp(rowItem.day.maxC, root.unit) : "—"
                color: root.foreground
                font.family: root.fontFamily
                font.pixelSize: Style.font.body
              }
              Text {
                textFormat: Text.PlainText
                text: rowItem.day ? Model.bareTemp(rowItem.day.minC, root.unit) : "—"
                color: root.muted
                font.family: root.fontFamily
                font.pixelSize: Style.font.body
              }
            }
          }

          Item {
            width: root.precipW; height: parent.height
            Text {
              anchors.fill: parent
              horizontalAlignment: Text.AlignRight; verticalAlignment: Text.AlignVCenter
              rightPadding: Style.space(6)
              textFormat: Text.PlainText
              text: rowItem.day && rowItem.day.precipMm !== null ? Model.barePrecip(rowItem.day.precipMm, root.unit) : (rowItem.day ? "" : "—")
              color: rowItem.wet ? root.rainColor : root.faded
              font.family: root.fontFamily
              font.pixelSize: Style.font.body
              font.bold: rowItem.wet
            }
          }

          Text {
            width: root.windW; height: parent.height
            horizontalAlignment: Text.AlignRight; verticalAlignment: Text.AlignVCenter
            rightPadding: Style.space(6)
            textFormat: Text.PlainText
            text: rowItem.day && rowItem.day.windMs !== null ? Model.bareWind(rowItem.day.windMs, root.unit) : (rowItem.day ? "" : "—")
            color: root.muted
            font.family: root.fontFamily
            font.pixelSize: Style.font.bodySmall
          }
        }
      }
    }
  }
}
