// Referensi dokumen; tidak mengubah ambang aktif.
const references: Record<string, Record<string, string[]>> = {
  "1": {
    "oilPressure": [
      "low: 23 Psi [D69]",
      "lowTrip: 21 Psi [D70]"
    ],
    "oilTemperature": [
      "high: 120 Deg F [D71]",
      "highTrip: 140 Deg F [D72]",
      "low: 70 Deg F [D73]",
      "lowTrip: 65 Deg F [D74]"
    ],
    "bearingDE": [
      "high: 194 Deg F [D59]",
      "highTrip: 203 Deg F [D60]"
    ],
    "bearingNDE": [
      "high: 194 Deg F [D61]",
      "highTrip: 203 Deg F [D62]"
    ],
    "stageTemp1": [
      "high: 120 Deg F [D63]",
      "highTrip: 140 Deg F [D64]"
    ],
    "stageVib1X": [
      "high: 0.85 Mils [D31]",
      "highTrip: 1.05 Mils [D32]"
    ],
    "stageVib1Y": [
      "high: 0.85 Mils [D33]",
      "highTrip: 1.05 Mils [D34]"
    ],
    "stageTemp2": [
      "high: 120 Deg F [D65]",
      "highTrip: 140 Deg F [D66]"
    ],
    "stageVib2X": [
      "high: 0.85 Mils [D35]",
      "highTrip: 1.05 Mils [D36]"
    ],
    "stageVib2Y": [
      "high: 0.85 Mils [D37]",
      "highTrip: 1.05 Mils [D38]"
    ],
    "phaseA": [
      "high: 310 Deg F [D53]",
      "highTrip: 340 Deg F [D54]"
    ]
  },
  "2": {
    "oilPressure": [
      "low: 24 Psi [F69]",
      "lowTrip: 22 Psi [F70]"
    ],
    "oilTemperature": [
      "high: 120 Deg F [F71]",
      "highTrip: 125 Deg F [F72]",
      "low: 95 Deg F [F73]",
      "lowTrip: 90 Deg F [F74]"
    ],
    "bearingDE": [
      "high: 194 Deg F [F59]",
      "highTrip: 203 Deg F [F60]"
    ],
    "bearingNDE": [
      "high: 194 Deg F [F61]",
      "highTrip: 203 Deg F [F62]"
    ],
    "stageTemp1": [
      "high: 120 Deg F [F63]",
      "highTrip: 125 Deg F [F64]"
    ],
    "stageVib1X": [
      "high: 1.11 Mils [F31]",
      "highTrip: 1.26 Mils [F32]"
    ],
    "stageVib1Y": [
      "high: 1.11 Mils [F33]",
      "highTrip: 1.26 Mils [F34]"
    ],
    "stageTemp2": [
      "high: 120 Deg F [F65]",
      "highTrip: 125 Deg F [F66]"
    ],
    "stageVib2X": [
      "high: 0.91 Mils [F35]",
      "highTrip: 0.99 Mils [F36]"
    ],
    "stageVib2Y": [
      "high: 0.91 Mils [F37]",
      "highTrip: 0.99 Mils [F38]"
    ],
    "stageTemp3": [
      "high: 120 Deg F [F67]",
      "highTrip: 125 Deg F [F68]"
    ],
    "stageVib3X": [
      "high: 0.9 Mils [F39]",
      "highTrip: 0.99 Mils [F40]"
    ],
    "stageVib3Y": [
      "high: 0.9 Mils [F41]",
      "highTrip: 0.99 Mils [F42]"
    ],
    "phaseA": [
      "high: 311 Deg F [F53]",
      "highTrip: 338 Deg F [F54]"
    ],
    "phaseB": [
      "high: 311 Deg F [F55]",
      "highTrip: 338 Deg F [F56]"
    ],
    "phaseC": [
      "high: 311 Deg F [F57]",
      "highTrip: 339 Deg F [F58]"
    ]
  },
  "3": {},
  "4": {
    "oilPressure": [
      "low: 23 Psi [H69]",
      "lowTrip: 21 Psi [H70]"
    ],
    "oilTemperature": [
      "high: 130 Deg F [H71]",
      "highTrip: 135 Deg F [H72]",
      "low: 70 Deg F [H73]",
      "lowTrip: 65 Deg F [H74]"
    ],
    "bearingDE": [
      "high: 194 Deg F [H59]",
      "highTrip: 203 Deg F [H60]"
    ],
    "bearingNDE": [
      "high: 194 Deg F [H61]",
      "highTrip: 203 Deg F [H62]"
    ],
    "stageTemp1": [
      "high: 120 Deg F [H63]",
      "highTrip: 135 Deg F [H64]"
    ],
    "stageVib1X": [
      "high: 0.75 Mils [H31]",
      "highTrip: 0.95 Mils [H32]"
    ],
    "stageVib1Y": [
      "high: 0.75 Mils [H33]",
      "highTrip: 0.95 Mils [H34]"
    ],
    "stageTemp2": [
      "high: 120 Deg F [H65]",
      "highTrip: 135 Deg F [H66]"
    ],
    "stageVib2X": [
      "high: 0.85 Mils [H35]",
      "highTrip: 1.05 Mils [H36]"
    ],
    "stageVib2Y": [
      "high: 0.85 Mils [H37]",
      "highTrip: 1.05 Mils [H38]"
    ],
    "phaseA": [
      "high: 310 Deg F [H53]",
      "highTrip: 340 Deg F [H54]"
    ]
  },
  "7": {
    "oilPressure": [
      "low: 23 Psi [K69]",
      "lowTrip: 21 Psi [K70]"
    ],
    "oilTemperature": [
      "high: 120 Deg F [K71]",
      "highTrip: 135 Deg F [K72]",
      "low: 80 Deg F [K73]",
      "lowTrip: 65 Deg F [K74]"
    ],
    "bearingDE": [
      "high: 194 Deg F [K59]",
      "highTrip: 203 Deg F [K60]"
    ],
    "bearingNDE": [
      "high: 194 Deg F [K61]",
      "highTrip: 203 Deg F [K62]"
    ],
    "stageTemp1": [
      "high: 120 Deg F [K63]",
      "highTrip: 125 Deg F [K64]"
    ],
    "stageVib1X": [
      "high: 0.85 Mils [K31]",
      "highTrip: 1.05 Mils [K32]"
    ],
    "stageVib1Y": [
      "high: 0.85 Mils [K33]",
      "highTrip: 1.05 Mils [K34]"
    ],
    "stageTemp2": [
      "high: 120 Deg F [K65]",
      "highTrip: 125 Deg F [K66]"
    ],
    "stageVib2X": [
      "high: 0.75 Mils [K35]",
      "highTrip: 0.95 Mils [K36]"
    ],
    "stageVib2Y": [
      "high: 0.75 Mils [K37]",
      "highTrip: 0.95 Mils [K38]"
    ],
    "phaseA": [
      "high: 310 Deg F [K53]",
      "highTrip: 340 Deg F [K54]"
    ]
  },
  "8": {
    "oilPressure": [
      "low: 23 Psi [L69]",
      "lowTrip: 21 Psi [L70]"
    ],
    "oilTemperature": [
      "high: 125 Deg F [L71]",
      "highTrip: 130 Deg F [L72]",
      "low: 78 Deg F [L73]",
      "lowTrip: 75 Deg F [L74]"
    ],
    "bearingDE": [
      "high: 194 Deg F [L59]",
      "highTrip: 203 Deg F [L60]"
    ],
    "bearingNDE": [
      "high: 194 Deg F [L61]",
      "highTrip: 203 Deg F [L62]"
    ],
    "stageTemp1": [
      "high: 125 Deg F [L63]",
      "highTrip: 135 Deg F [L64]"
    ],
    "stageVib1X": [
      "high: 0.95 Mils [L31]",
      "highTrip: 1.15 Mils [L32]"
    ],
    "stageVib1Y": [
      "high: 0.95 Mils [L33]",
      "highTrip: 1.15 Mils [L34]"
    ],
    "stageTemp2": [
      "high: 125 Deg F [L65]",
      "highTrip: 135 Deg F [L66]"
    ],
    "stageVib2X": [
      "high: 0.85 Mils [L35]",
      "highTrip: 1.1 Mils [L36]"
    ],
    "stageVib2Y": [
      "high: 0.85 Mils [L37]",
      "highTrip: 1.1 Mils [L38]"
    ],
    "stageTemp3": [
      "high: 125 Deg F [L67]",
      "highTrip: 135 Deg F [L68]"
    ],
    "stageVib3X": [
      "high: 0.85 Mils [L39]",
      "highTrip: 1.1 Mils [L40]"
    ],
    "stageVib3Y": [
      "high: 0.85 Mils [L41]",
      "highTrip: 1.1 Mils [L42]"
    ],
    "phaseA": [
      "high: 310 Deg F [L53]",
      "highTrip: 340 Deg F [L54]"
    ]
  },
  "9": {
    "oilPressure": [
      "low: 23 Psi [M69]",
      "lowTrip: 21 Psi [M70]"
    ],
    "oilTemperature": [
      "high: 130 Deg F [M71]",
      "highTrip: 135 Deg F [M72]",
      "low: 80 Deg F [M73]",
      "lowTrip: 75 Deg F [M74]"
    ],
    "bearingDE": [
      "high: 194 Deg F [M59]",
      "highTrip: 203 Deg F [M60]"
    ],
    "bearingNDE": [
      "high: 194 Deg F [M61]",
      "highTrip: 203 Deg F [M62]"
    ],
    "stageTemp1": [
      "high: 125 Deg F [M63]",
      "highTrip: 135 Deg F [M64]"
    ],
    "stageVib1X": [
      "high: 0.85 Mils [M31]",
      "highTrip: 1.05 Mils [M32]"
    ],
    "stageVib1Y": [
      "high: 0.85 Mils [M33]",
      "highTrip: 1.05 Mils [M34]"
    ],
    "stageTemp2": [
      "high: 125 Deg F [M65]",
      "highTrip: 135 Deg F [M66]"
    ],
    "stageVib2X": [
      "high: 0.85 Mils [M35]",
      "highTrip: 1.05 Mils [M36]"
    ],
    "stageVib2Y": [
      "high: 0.85 Mils [M37]",
      "highTrip: 1.05 Mils [M38]"
    ],
    "stageTemp3": [
      "high: 125 Deg F [M67]",
      "highTrip: 135 Deg F [M68]"
    ],
    "stageVib3X": [
      "high: 0.85 Mils [M39]",
      "highTrip: 1.05 Mils [M40]"
    ],
    "stageVib3Y": [
      "high: 0.85 Mils [M41]",
      "highTrip: 1.05 Mils [M42]"
    ],
    "phaseA": [
      "high: 310 Deg F [M53]",
      "highTrip: 340 Deg F [M54]"
    ]
  },
  "10": {
    "oilPressure": [
      "low: 18 Psi [N69]",
      "lowTrip: 16 Psi [N70]"
    ],
    "oilTemperature": [
      "high: 125 Deg F [N71]",
      "highTrip: 130 Deg F [N72]",
      "low: 78 Deg F [N73]",
      "lowTrip: 75 Deg F [N74]"
    ],
    "bearingDE": [
      "high: 194 Deg F [N59]",
      "highTrip: 203 Deg F [N60]"
    ],
    "bearingNDE": [
      "high: 194 Deg F [N61]",
      "highTrip: 203 Deg F [N62]"
    ],
    "stageTemp1": [
      "high: 120 Deg F [N63]",
      "highTrip: 125 Deg F [N64]"
    ],
    "stageVib1X": [
      "high: 0.95 Mils [N31]",
      "highTrip: 1.15 Mils [N32]"
    ],
    "stageVib1Y": [
      "high: 0.95 Mils [N33]",
      "highTrip: 1.15 Mils [N34]"
    ],
    "stageTemp2": [
      "high: 120 Deg F [N65]",
      "highTrip: 125 Deg F [N66]"
    ],
    "stageVib2X": [
      "high: 0.85 Mils [N35]",
      "highTrip: 1.05 Mils [N36]"
    ],
    "stageVib2Y": [
      "high: 0.85 Mils [N37]",
      "highTrip: 1.05 Mils [N38]"
    ],
    "stageTemp3": [
      "high: 120 Deg F [N67]",
      "highTrip: 125 Deg F [N68]"
    ],
    "stageVib3X": [
      "high: 0.85 Mils [N39]",
      "highTrip: 1.05 Mils [N40]"
    ],
    "stageVib3Y": [
      "high: 0.85 Mils [N41]",
      "highTrip: 1.05 Mils [N42]"
    ],
    "phaseA": [
      "high: 310 Deg F [N53]",
      "highTrip: 340 Deg F [N54]"
    ]
  },
  "11": {
    "oilPressure": [
      "low: 23 Psi [O69]",
      "lowTrip: 21 Psi [O70]"
    ],
    "oilTemperature": [
      "high: 125 Deg F [O71]",
      "highTrip: 135 Deg F [O72]",
      "low: 70 Deg F [O73]",
      "lowTrip: 65 Deg F [O74]"
    ],
    "bearingDE": [
      "high: 194 Deg F [O59]",
      "highTrip: 203 Deg F [O60]"
    ],
    "bearingNDE": [
      "high: 194 Deg F [O61]",
      "highTrip: 203 Deg F [O62]"
    ],
    "stageTemp1": [
      "high: 125 Deg F [O63]",
      "highTrip: 135 Deg F [O64]"
    ],
    "stageVib1X": [
      "high: 0.95 Mils [O31]",
      "highTrip: 1.15 Mils [O32]"
    ],
    "stageVib1Y": [
      "high: 0.95 Mils [O33]",
      "highTrip: 1.15 Mils [O34]"
    ],
    "stageTemp2": [
      "high: 125 Deg F [O65]",
      "highTrip: 135 Deg F [O66]"
    ],
    "stageVib2X": [
      "high: 0.85 Mils [O35]",
      "highTrip: 1.05 Mils [O36]"
    ],
    "stageVib2Y": [
      "high: 0.85 Mils [O37]",
      "highTrip: 1.05 Mils [O38]"
    ],
    "stageTemp3": [
      "high: 125 Deg F [O67]",
      "highTrip: 130 Deg F [O68]"
    ],
    "stageVib3X": [
      "high: 0.85 Mils [O39]",
      "highTrip: 1.05 Mils [O40]"
    ],
    "stageVib3Y": [
      "high: 0.85 Mils [O41]",
      "highTrip: 1.05 Mils [O42]"
    ],
    "phaseA": [
      "high: 310 Deg F [O53]",
      "highTrip: 340 Deg F [O54]"
    ]
  },
  "12": {
    "oilPressure": [
      "low: 23 Psi [P69]",
      "lowTrip: 21 Psi [P70]"
    ],
    "oilTemperature": [
      "high: 120 Deg F [P71]",
      "highTrip: 125 Deg F [P72]",
      "low: 64.2 Deg F [P73]",
      "lowTrip: 62.7 Deg F [P74]"
    ],
    "bearingDE": [
      "high: 194 Deg F [P59]",
      "highTrip: 203 Deg F [P60]"
    ],
    "bearingNDE": [
      "high: 194 Deg F [P61]",
      "highTrip: 203 Deg F [P62]"
    ],
    "stageTemp1": [
      "high: 120 Deg F [P63]",
      "highTrip: 135 Deg F [P64]"
    ],
    "stageVib1X": [
      "high: 0.95 Mils [P31]",
      "highTrip: 1.15 Mils [P32]"
    ],
    "stageTemp2": [
      "high: 120 Deg F [P65]",
      "highTrip: 135 Deg F [P66]"
    ],
    "stageVib2X": [
      "high: 0.85 Mils [P35]",
      "highTrip: 1.05 Mils [P36]"
    ],
    "stageTemp3": [
      "high: 120 Deg F [P67]",
      "highTrip: 135 Deg F [P68]"
    ],
    "stageVib3X": [
      "high: 0.85 Mils [P39]",
      "highTrip: 1.05 Mils [P40]"
    ],
    "phaseA": [
      "high: 311 Deg F [P53]",
      "highTrip: 338 Deg F [P54]"
    ],
    "phaseB": [
      "high: 311 Deg F [P55]",
      "highTrip: 338 Deg F [P56]"
    ],
    "phaseC": [
      "high: 311 Deg F [P57]",
      "highTrip: 338 Deg F [P58]"
    ]
  },
  "13": {
    "oilPressure": [
      "low: 18 Psi [Q69]",
      "lowTrip: 16 Psi [Q70]"
    ],
    "oilTemperature": [
      "high: 120 Deg F [Q71]",
      "highTrip: 125 Deg F [Q72]",
      "low: 68.5 Deg F [Q73]",
      "lowTrip: 64 Deg F [Q74]"
    ],
    "bearingDE": [
      "high: 194 Deg F [Q59]",
      "highTrip: 203 Deg F [Q60]"
    ],
    "bearingNDE": [
      "high: 194 Deg F [Q61]",
      "highTrip: 203 Deg F [Q62]"
    ],
    "stageTemp1": [
      "high: 125 Deg F [Q63]",
      "highTrip: 135 Deg F [Q64]"
    ],
    "stageVib1X": [
      "high: 0.95 Mils [Q31]",
      "highTrip: 1.15 Mils [Q32]"
    ],
    "stageTemp2": [
      "high: 125 Deg F [Q65]",
      "highTrip: 135 Deg F [Q66]"
    ],
    "stageVib2X": [
      "high: 0.85 Mils [Q35]",
      "highTrip: 1.05 Mils [Q36]"
    ],
    "stageTemp3": [
      "high: 125 Deg F [Q67]",
      "highTrip: 139 Deg F [Q68]"
    ],
    "stageVib3X": [
      "high: 0.85 Mils [Q39]",
      "highTrip: 1.05 Mils [Q40]"
    ],
    "phaseA": [
      "high: 311 Deg F [Q53]",
      "highTrip: 338 Deg F [Q54]"
    ],
    "phaseB": [
      "high: 311 Deg F [Q55]",
      "highTrip: 338 Deg F [Q56]"
    ],
    "phaseC": [
      "high: 311 Deg F [Q57]",
      "highTrip: 338 Deg F [Q58]"
    ]
  },
  "14": {
    "oilPressure": [
      "low: 24 Psi [R69]",
      "lowTrip: 22 Psi [R70]"
    ],
    "oilTemperature": [
      "high: 120 Deg F [R71]",
      "highTrip: 125 Deg F [R72]",
      "low: 95 Deg F [R73]",
      "lowTrip: 90 Deg F [R74]"
    ],
    "bearingDE": [
      "high: 194 Deg F [R59]",
      "highTrip: 203 Deg F [R60]"
    ],
    "bearingNDE": [
      "high: 194 Deg F [R61]",
      "highTrip: 203 Deg F [R62]"
    ],
    "stageTemp1": [
      "high: 120 Deg F [R63]",
      "highTrip: 125 Deg F [R64]"
    ],
    "stageVib1X": [
      "high: 1.11 Mils [R31]",
      "highTrip: 1.26 Mils [R32]"
    ],
    "stageVib1Y": [
      "high: 1.11 Mils [R33]",
      "highTrip: 1.26 Mils [R34]"
    ],
    "stageTemp2": [
      "high: 120 Deg F [R65]",
      "highTrip: 125 Deg F [R66]"
    ],
    "stageVib2X": [
      "high: 0.91 Mils [R35]",
      "highTrip: 0.99 Mils [R36]"
    ],
    "stageVib2Y": [
      "high: 0.91 Mils [R37]",
      "highTrip: 0.99 Mils [R38]"
    ],
    "stageTemp3": [
      "high: 120 Deg F [R67]",
      "highTrip: 126 Deg F [R68]"
    ],
    "stageVib3X": [
      "high: 0.9 Mils [R39]",
      "highTrip: 0.99 Mils [R40]"
    ],
    "stageVib3Y": [
      "high: 0.9 Mils [R41]",
      "highTrip: 0.99 Mils [R42]"
    ],
    "phaseA": [
      "high: 311 Deg F [R53]",
      "highTrip: 338 Deg F [R54]"
    ],
    "phaseB": [
      "high: 311 Deg F [R55]",
      "highTrip: 338 Deg F [R56]"
    ],
    "phaseC": [
      "high: 311 Deg F [R57]",
      "highTrip: 339 Deg F [R58]"
    ]
  },
  "15": {
    "oilTemperature": [
      "high: 123.8 Deg F [S71]",
      "highTrip: 127.8 Deg F [S72]",
      "low: 95 Deg F [S73]",
      "lowTrip: 95 Deg F [S74]"
    ],
    "stageTemp1": [
      "high: 125.6 Deg F [S63]",
      "highTrip: 129.2 Deg F [S64]"
    ],
    "stageTemp2": [
      "high: 125.6 Deg F [S65]",
      "highTrip: 129.2 Deg F [S66]"
    ],
    "stageTemp3": [
      "high: 125.6 Deg F [S67]",
      "highTrip: 129.2 Deg F [S68]"
    ]
  }
}
export function excelReference(tag: string, key: string | null): string[] {
 const match = /^U-SAC(\d+)-/i.exec(tag.trim())
 if (!match || !key) return []
 const lines = references[match[1]]?.[key]
 if (!lines) return []
 return ['Referensi pembanding: Centac Setting.xlsx / Centac All (belum diaktifkan)',
 ...(match[1] === '2' ? ['Kolom 2B - New: pemetaan ke SAC#2 perlu dikonfirmasi.'] : []),
 ...lines, 'Acuan dokumen memerlukan validasi revisi dan satuan; bukan pembacaan Live.']
}
