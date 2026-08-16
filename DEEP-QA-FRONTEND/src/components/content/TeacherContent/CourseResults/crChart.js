// import { Radar } from 'react-chartjs-2'
// import {
//   Chart as ChartJS,
//   RadialLinearScale,
//   PointElement,
//   LineElement,
//   Filler,
//   Tooltip,
//   Legend,
// } from 'chart.js'

// ChartJS.register(
//   RadialLinearScale,
//   PointElement,
//   LineElement,
//   Filler,
//   Tooltip,
//   Legend
// )

// export default function CrChart({ data }) {
//   if (!data || data.length === 0) {
//     return <div>ไม่มีข้อมูลสำหรับแสดงผล</div>
//   }

//   const chartData = {
//     labels: data.map(d => `CLO-${d.clo_number}`),
//     datasets: [
//       {
//         label: 'ผลลัพธ์การเรียนรู้รายวิชา',
//         data: data.map(d => d.earned_score),
//         backgroundColor: 'rgba(34,197,94,0.3)',
//         borderColor: 'rgba(22,163,74,1)',
//         borderWidth: 2,
//         fill: true,
//         pointBackgroundColor: 'rgba(22,163,74,1)',
//         pointBorderColor: '#fff',
//         pointRadius: 5,
//       },
//     ],
//   }

//   const options = {
//     responsive: true,
//     maintainAspectRatio: true,
//     aspectRatio: 1,
//     elements: {
//       line: { tension: 0 },
//     },
//     scales: {
//       r: {
//         beginAtZero: true,
//         min: 0,
//         max: 5, // full_score
//         ticks: {
//           stepSize: 1,
//           backdropColor: 'transparent',
//         },
//         angleLines: { color: 'rgba(0,0,0,0.2)' },
//         grid: { color: 'rgba(0,0,0,0.1)' },
//         pointLabels: {
//           font: { size: 14 },
//           color: '#333',
//         },
//       },
//     },
//     plugins: {
//       legend: {
//         position: 'top',
//       },
//       tooltip: {
//         callbacks: {
//           label: context => {
//             const clo = data[context.dataIndex]
//             return [
//               `คะแนน: ${clo.earned_score} / ${clo.full_score}`,
//               '',
//               ...wrapText(clo.clo_detail),
//             ]
//           },
//         },
//       },
//     },
//   }

//   return <Radar data={chartData} options={options} />
// }

// const wrapText = (text, maxLength = 60) => {
//   const words = text.split(' ')
//   let lines = []
//   let current = ''

//   words.forEach(w => {
//     if ((current + w).length > maxLength) {
//       lines.push(current)
//       current = w
//     } else {
//       current += (current ? ' ' : '') + w
//     }
//   })

//   if (current) lines.push(current)
//   return lines
// }

import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
)

const colorPalette = [
  { border: '#6366F1', bg: 'rgba(99,102,241,0.2)' },
  { border: '#F59E0B', bg: 'rgba(245,158,11,0.2)' },
  { border: '#EF4444', bg: 'rgba(239,68,68,0.2)' },
  { border: '#10B981', bg: 'rgba(16,185,129,0.2)' },
  { border: '#8B5CF6', bg: 'rgba(139,92,246,0.2)' },
]

export default function CrChart({ data, otherYears, ListPLO }) {
  if (!data || data.length === 0) {
    return <div>ไม่มีข้อมูลสำหรับแสดงผล</div>
  }

  const buildPloMap = (ploData) => {
    const map = {}

    ploData.forEach((plo) => {
      map[plo.outcome_id] = {
        code: plo.outcome_code,
        title: plo.outcome_title,
      }
    })

    return map
  }

  const basePloIds = data.map((d) => d.plo_id)
  const ploMap = buildPloMap(ListPLO || [])
  // console.log(ploMap)

  // 🔹 dataset หลัก (ปีปัจจุบัน)
  const baseDataset = {
    label: 'ปีปัจจุบัน',
    data: data.map((d) => d.earned_score),
    backgroundColor: 'rgba(34,197,94,0.3)',
    borderColor: 'rgba(22,163,74,1)',
    borderWidth: 2,
    fill: true,
    pointBackgroundColor: 'rgba(22,163,74,1)',
    pointBorderColor: '#fff',
    pointRadius: 5,
  }

  const otherDatasets = (otherYears || [])
    .filter((y) => y && y.data)
    .map((y, index) => {
      const color = colorPalette[index % colorPalette.length]
      const alignedData = basePloIds.map((ploId) => {
        const found = y.data.find((d) => d.plo_id === ploId)
        return found ? found.earned_score : 0 // ไม่เจอใส่ 0
      })

      return {
        label: `ข้อมูลย้อนหลัง ปี ${y.year}`,
        data: alignedData,
        borderWidth: 2,
        fill: true,
        borderDash: [6, 4],
        pointRadius: 3,
        borderColor: color.border,
        backgroundColor: color.bg,
        pointBackgroundColor: color.border,
      }
    })

  const chartData = {
    labels: data.map((d) => `CLO-${d.clo_number}`),
    datasets: [baseDataset, ...otherDatasets],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    elements: {
      line: { tension: 0 },
    },
    scales: {
      r: {
        beginAtZero: true,
        min: 0,
        max: 5,
        ticks: {
          stepSize: 1,
          backdropColor: 'transparent',
        },
        angleLines: { color: 'rgba(0,0,0,0.2)' },
        grid: { color: 'rgba(0,0,0,0.1)' },
        pointLabels: {
          font: { size: 14 },
          color: '#333',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const dataset = context.dataset
            const value = context.raw
            const clo = data[context.dataIndex]

            const plo = ploMap[clo.plo_id]

            return [
              // 🔹 CLO ก่อน
              `${dataset.label}: ${value} / ${clo.full_score}`,
              ...wrapText(clo.clo_detail),

              // 🔹 เส้นคั่น
              '────────────',

              // 🔹 PLO
              `เชื่อมโยงกับ: ${plo?.code || '-'}`,
              ...(plo?.title ? wrapText(plo.title) : []),
            ]
          },
        },
      },
    },
  }

  return <Radar data={chartData} options={options} />
}

const wrapText = (text, maxLength = 60) => {
  if (!text) return []

  const words = text.split(' ')
  let lines = []
  let current = ''

  words.forEach((w) => {
    if ((current + w).length > maxLength) {
      lines.push(current)
      current = w
    } else {
      current += (current ? ' ' : '') + w
    }
  })

  if (current) lines.push(current)
  return lines
}
