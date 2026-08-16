import { useMemo } from 'react'
import { ResponsiveSankey } from '@nivo/sankey'
import { useState, useEffect } from 'react'
import ContentMotionDIV from '../../../ContentMotionDIV'

function buildNivoData(clos = [], activityGroups = []) {
  if (!Array.isArray(clos) || clos.length === 0) return null
  const nodes = new Map()
  const links = []
  const activityMap = new Map()

  const activityLookup = new Map()

  activityGroups.forEach((group) => {
    group.activities?.forEach((a) => {
      activityLookup.set(a.activity_id, {
        color: a.color || group.color,
        description: a.description,
        total_score: a.total_score,
        category: a.score_category,
      })
    })
  })

  clos.forEach((clo) => {
    const cloId = `CLO ${clo.clo_number}`

    // CLO node
    nodes.set(cloId, {
      id: cloId,
      label: 'ทดสอบ',
      color: clo.color || '#777',
      clo_detail: clo.clo_detail,
      type: 'clo',
    })

    clo.indicators?.forEach((ind) => {
      const actID = ind.activity_id
      const actName = ind.activity_name

      const actInfo = activityLookup.get(actID) || {}

      if (!activityMap.has(actName)) {
        activityMap.set(actName, {
          id: actName,
          label: actName,
          color: actInfo.color || '#aaa',
          description: actInfo.description,
          total_score: actInfo.total_score,
          category: actInfo.category,
          type: 'activity',
        })
      }

      links.push({
        source: cloId,
        target: actName,
        value: Number(ind.weight) || 1,
        weight: ind.weight,
        clo_detail: clo.clo_detail,
        activity_name: actName,
        total_score: actInfo.total_score,
        description: actInfo.description,
      })
    })
  })
  // console.log('Sankey Data:', { nodes, links, activityMap })
  return {
    nodes: [...nodes.values(), ...activityMap.values()],
    links,
  }
}

export default function ThinSankey({ OutcomeData = [], ActivityGroups = [] }) {
  const data = useMemo(() => buildNivoData(OutcomeData, ActivityGroups), [
    OutcomeData,
    ActivityGroups,
  ])
  const [showLoader, setShowLoader] = useState(true)
  const width = window.innerWidth
  const margin = {
    top: 20,
    bottom: 40,
    left: width < 768 ? 10 : 100,
    right: width < 768 ? 60 : 300,
  }

  useEffect(() => {
    const t = setTimeout(() => setShowLoader(false), 2000)
    return () => clearTimeout(t)
  }, [])

  if (!data || showLoader)
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
        <span className="text-sm text-gray-400">กำลังสร้าง Sankey Chart</span>
      </div>
    )

  if (data.nodes.length === 0 || data.links.length === 0)
    return (
      <ContentMotionDIV className="flex min-h-[200px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 p-8 transition-all">
        {/* Icon Placeholder */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
          <svg
            className="h-6 w-6 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        <div className="text-center">
          <h3 className="text-sm  text-primary">ไม่พบข้อมูลการเชื่อมโยง</h3>
          <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-slate-400">
            ขณะนี้ยังไม่มีข้อมูล Nodes หรือ Links <br />{' '}
            สำหรับการประเมินในส่วนนี้
          </p>
        </div>
      </ContentMotionDIV>
    )

  return (
    <div
      style={{
        height: 540,
        width: '100%',
        maxWidth: 1000,
        minWidth: 320,
        margin: '0 auto',
      }}
    >
      <ResponsiveSankey
        key="sankey-chart"
        data={data}
        align="justify"
        nodeThickness={65}
        margin={{ top: 20, right: 300, bottom: 40, left: 150 }}
        nodeBorderWidth={0}
        nodeSpacing={28}
        colors={(n) => n.color}
        linkOpacity={0.5}
        linkHoverOthersOpacity={0.1}
        enableLinkGradient={false}
        linkBlendMode="multiply"
        labelPosition="outside"
        // labelPadding={12}
        layers={[
          'links',
          'nodes',
          ({ nodes }) => {
            return nodes.map((node) => {
              const isLeft = node.depth === 0

              // แก้ไข: ตัดข้อความที่ 50 ตัวอักษร
              const displayLabel = isLeft
                ? node.label
                : node.label.length > 36
                ? node.label.slice(0, 36) + '...'
                : node.label

              const boxWidth = isLeft ? 80 : 280

              const nodeHeight = node.y1 - node.y0
              const paddingY = 6
              const h = Math.min(nodeHeight + paddingY * 3, 54)

              const x = isLeft ? node.x0 - boxWidth + 60 : node.x1 - 60

              return (
                <g
                  key={node.id}
                  transform={`translate(${x},${(node.y0 + node.y1) / 2})`}
                  pointerEvents="none"
                >
                  <rect
                    x={0}
                    y={-h / 2}
                    rx={6}
                    ry={6}
                    width={boxWidth}
                    height={h}
                    fill={node.color}
                    opacity={1}
                  />
                  <text
                    dy="0.35em"
                    fill="#fff"
                    fontSize={14}
                    textAnchor={isLeft ? 'middle' : 'start'}
                    x={isLeft ? boxWidth / 2 : 10}
                  >
                    {displayLabel}
                  </text>
                </g>
              )
            })
          },
        ]}
        // layers={[
        //   'links',
        //   'nodes',
        //   ({ nodes }) => {
        //     const leftNodes = nodes.filter((n) => n.depth === 0)
        //     const rightNodes = nodes.filter((n) => n.depth > 0)

        //     const paddingX = 10

        //     const leftMax =
        //       Math.max(...leftNodes.map((n) => n.label.length)) || 1
        //     const rightMax =
        //       Math.max(...rightNodes.map((n) => n.label.length)) || 1

        //     const leftWidth = leftMax * 8 + paddingX * 2
        //     const rightWidth = rightMax * 8 + paddingX * 2

        //     return nodes.map((node) => {
        //       const isLeft = node.depth === 0
        //       const boxWidth = isLeft ? leftWidth : rightWidth

        //       const nodeHeight = node.y1 - node.y0
        //       const paddingY = 6
        //       const h = Math.min(nodeHeight + paddingY * 3, 48)

        //       const x = isLeft ? node.x0 - boxWidth + 50 : node.x1 - 50

        //       return (
        //         <g
        //           key={node.id}
        //           transform={`translate(${x},${(node.y0 + node.y1) / 2})`}
        //           pointerEvents="none"
        //         >
        //           <rect
        //             x={0}
        //             y={-h / 2}
        //             rx={6}
        //             ry={6}
        //             width={boxWidth}
        //             height={h}
        //             fill={node.color}
        //             opacity={1}
        //           />

        //           <text
        //             dy="0.35em"
        //             fill="#fff"
        //             fontSize={12}
        //             textAnchor={isLeft ? 'middle' : 'start'}
        //             x={isLeft ? boxWidth / 2 : paddingX}
        //           >
        //             {node.label}
        //           </text>
        //         </g>
        //       )
        //     })
        //   },
        // ]}
        theme={{
          tooltip: {
            container: {
              background: '#ffffff',
              color: '#333',
              fontSize: 13,
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
          },
        }}
        tooltipPosition="cursor"
        tooltipOffset={[0, 0]}
        linkTooltip={({ link }) => (
          <div style={box}>
            <b style={md}>
              {link.source.label} → {link.target.label}
            </b>
            <hr />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                fontSize: 16,
                color: '#666',
                marginTop: 6,
                marginBottom: 6,
              }}
            >
              <span>Weight: {link.weight}%</span>
              <span>คะแนนเต็ม: {link.total_score}</span>
            </div>
            <hr />
            <div style={sm}>รายละเอียดกิจกรรม : </div>
            {link.description && <div style={sm}>{link.description}</div>}
            <hr />
            <div style={sm}>รายละเอียดผลการเรียนรู้ : </div>
            <div style={sm}>{link.clo_detail}</div>
          </div>
        )}
        nodeTooltip={({ node }) => {
          if (node.type === 'clo')
            return (
              <div style={box}>
                <b style={md}>{node.label}</b>
                <hr />
                <div style={sm}>{node.clo_detail}</div>
              </div>
            )

          if (node.type === 'activity')
            return (
              <div style={box}>
                <b style={md}>{node.label}</b>
                <hr />
                {node.total_score && (
                  <div style={md}>คะแนนเต็ม: {node.total_score}</div>
                )}
                <hr />
                {node.description && <div style={sm}>{node.description}</div>}
              </div>
            )

          return null
        }}
      />
    </div>
  )
}

const box = {
  background: 'rgba(255,255,255,0.95)',
  padding: '14px 18px',
  borderRadius: 12,
  maxWidth: 600,
  minWidth: 400,
  color: '#222',

  transform: 'translate(24px, -24px)',
  pointerEvents: 'none',

  boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
  backdropFilter: 'blur(4px)',
  border: '1px solid rgba(0,0,0,0.06)',
}

const sm = {
  fontSize: 12,
  color: '#666',
  marginTop: 6,
  marginBottom: 6,
}

const md = {
  fontSize: 16,
  color: '#666',
  marginTop: 6,
  marginBottom: 6,
}
