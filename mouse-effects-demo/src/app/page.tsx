"use client"

import dynamic from "next/dynamic"
import { useControls, folder } from "leva"

const MaskCursorCanvas = dynamic(
  () => import("./mask-cursor/canvas").then((mod) => mod.MaskCursorCanvas),
  { ssr: false }
)

export default function Home() {
  const settings = useControls("Mask Reveal", {
    waterDisplacement: { value: 0.008, min: 0, max: 0.05, step: 0.001, label: "Subtle Water Waves" },
    normalDisplacement: { value: 0.04, min: 0, max: 0.2, step: 0.001, label: "Normal Water Displacement" },
    revealDisplacement: { value: 0.04, min: 0, max: 0.2, step: 0.001, label: "Reveal Displacement" },
    WaterDistortion: folder({
      intensity: { value: 0.73, min: 0.5, max: 1, step: 0.01 },
      scale: { value: 0.1, min: 0.05, max: 0.25, step: 0.01 },
      viscosity: { value: 0.59, min: 0.5, max: 0.75, step: 0.01 },
      decay: { value: 0.96, min: 0.8, max: 0.99, step: 0.01 },
      paintPersistence: { value: 3, min: 1, max: 10, step: 0.5, label: "Paint Duration (s)" },
      aberration: { value: 0.003, min: 0, max: 0.02, step: 0.001 },
      lightIntensity: { value: 0.09, min: 0, max: 0.3, step: 0.001 },
      specularPower: { value: 8.1, min: 1, max: 10, step: 0.1 },
    }, { collapsed: false }),
    Mask: folder({
      revealSize: { value: 1.9, min: 0.5, max: 10, step: 0.1 },
      edgeSoftness: { value: 0.1, min: 0.01, max: 1, step: 0.01 },
    }, { collapsed: true }),
  })

  return (
    <main className="relative w-full h-screen overflow-hidden touch-none">
      <MaskCursorCanvas
        baseImage="/art-render-final.jpg"
        revealImage="/art-wire-final.jpg"
        settings={settings}
      />
    </main>
  )
}
