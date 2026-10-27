"use client"

import { useRef, useMemo, useEffect, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

// ============================================
// SHADERS FOR FLUID SIMULATION (PING-PONG)
// ============================================

const quadVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// Fluid simulation with ripple injection
const fluidUpdateShader = `
  uniform sampler2D uPrevState;
  uniform sampler2D uCurrentState;
  uniform vec2 uResolution;
  uniform float uViscosity;
  uniform float uDecay;
  uniform float uPaintPersistence;

  // Ripple uniforms
  uniform vec2 uMouse;
  uniform vec2 uPrevMouse;
  uniform float uRadius;
  uniform float uIntensity;
  uniform float uMouseVelocity;
  uniform float uPointerDown;

  varying vec2 vUv;

  void main() {
    vec2 texel = 1.0 / uResolution;

    float current = texture2D(uCurrentState, vUv).r;
    float prev = texture2D(uPrevState, vUv).r;
    float paint = texture2D(uCurrentState, vUv).g;
    float paintLeft = texture2D(uCurrentState, vUv + vec2(-texel.x, 0.0)).g;
    float paintRight = texture2D(uCurrentState, vUv + vec2(texel.x, 0.0)).g;
    float paintTop = texture2D(uCurrentState, vUv + vec2(0.0, texel.y)).g;
    float paintBottom = texture2D(uCurrentState, vUv + vec2(0.0, -texel.y)).g;

    float left = texture2D(uCurrentState, vUv + vec2(-texel.x, 0.0)).r;
    float right = texture2D(uCurrentState, vUv + vec2(texel.x, 0.0)).r;
    float top = texture2D(uCurrentState, vUv + vec2(0.0, texel.y)).r;
    float bottom = texture2D(uCurrentState, vUv + vec2(0.0, -texel.y)).r;

    // Wave equation with viscosity
    float neighbors = (left + right + top + bottom) * 0.25;
    float wave = neighbors * 2.0 - prev;
    wave = mix(current, wave, uViscosity);
    wave *= uDecay;
    // El canal R queda reservado para el ripple corto.
    wave = wave * 0.92;

    // La pintura también se difunde: nace pequeña y se abre orgánicamente.
    float paintNeighbors = (paintLeft + paintRight + paintTop + paintBottom) * 0.25;
    paint = mix(paint, paintNeighbors, 0.34);

    // Add ripple at mouse position
    if (uPointerDown > 0.5 && uMouseVelocity > 0.0001) {
      vec2 mousePos = uMouse;
      float dist = distance(vUv, mousePos);

      float ripple = smoothstep(uRadius * 0.62, 0.0, dist);
      ripple = pow(ripple, 3.5);

      // Trail effect
      vec2 prevMousePos = uPrevMouse;
      for(float i = 0.0; i < 8.0; i++) {
        float t = i / 8.0;
        vec2 trailPos = mix(prevMousePos, mousePos, t);
        float d = distance(vUv, trailPos);
        float trailRipple = smoothstep(uRadius * 0.7, 0.0, d);
        ripple = max(ripple, pow(trailRipple, 2.0));
      }

      float finalRipple = ripple * uIntensity * min(uMouseVelocity * 10.0, 1.0);
      wave += finalRipple;
      // El canal G es la pintura persistente del reveal.
      paint = max(paint, ripple * uIntensity * 0.95);
    }

    paint *= exp(-1.0 / max(1.0, uPaintPersistence * 60.0));
    gl_FragColor = vec4(wave, paint, 0.0, 1.0);
  }
`

// ============================================
// SHADER FOR LIQUID MASK REVEAL
// ============================================

const maskVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const maskFragmentShader = `
  uniform sampler2D uBaseTexture;
  uniform sampler2D uRevealTexture;
  uniform sampler2D uDisplacement;
  uniform float uDistortionStrength;
  uniform float uAmbientDisplacement;
  uniform float uRevealDisplacement;
  uniform float uRevealSize;
  uniform float uEdgeSoftness;
  uniform float uLightIntensity;
  uniform float uSpecularPower;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uBaseImageAspect;
  uniform float uRevealImageAspect;
  uniform float uPlaneAspect;

  varying vec2 vUv;

  // Cover fit - maintains aspect ratio while filling the plane
  vec2 coverUv(vec2 uv, float imageAspect, float planeAspect) {
    vec2 ratio = vec2(
      min(planeAspect / imageAspect, 1.0),
      min(imageAspect / planeAspect, 1.0)
    );
    return vec2(
      uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      uv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
  }

  vec3 calculateNormal(vec2 uv, float strength) {
    vec2 texel = 1.0 / uResolution;

    float left = texture2D(uDisplacement, uv + vec2(-texel.x, 0.0)).r;
    float right = texture2D(uDisplacement, uv + vec2(texel.x, 0.0)).r;
    float top = texture2D(uDisplacement, uv + vec2(0.0, texel.y)).r;
    float bottom = texture2D(uDisplacement, uv + vec2(0.0, -texel.y)).r;

    vec3 normal;
    normal.x = (left - right) * strength;
    normal.y = (bottom - top) * strength;
    normal.z = 1.0;

    return normalize(normal);
  }

  vec3 iridescence(vec2 uv) {
    vec2 p = uv - 0.5;
    float pattern = sin((p.x + p.y) * 18.0 + sin(p.y * 7.0 + uTime * 0.95) * 2.0);
    float t = 0.5 + 0.5 * pattern;
    vec3 violet = vec3(0.6588, 0.3333, 0.9686); // #a855f7
    vec3 cyan = vec3(0.45, 0.85, 1.0);
    vec3 tint = mix(violet, cyan, t);
    float luma = dot(tint, vec3(0.2126, 0.7152, 0.0722));
    tint = mix(vec3(luma), tint, 1.5);
    tint = (tint - 0.5) * 0.85 + 0.5;
    return tint;
  }

  vec2 iridescenceDisplacement(vec2 uv) {
    vec2 p = uv - 0.5;
    float dx = sin(p.x * 14.0 + sin(p.y * 8.0) * 2.0) * 0.035;
    float dy = cos(p.y * 17.0 - sin(p.x * 6.0) * 2.0) * 0.035;
    return vec2(dx, dy);
  }

  void main() {
    // Get displacement value for mask
    // G = pintura persistente para el reveal; R = agua transitoria para normales.
    float displacement = texture2D(uDisplacement, vUv).g;

    // Calculate normal for distortion and lighting
    vec3 normal = calculateNormal(vUv, 50.0);
    float normalDeviation = length(normal.xy);

    // Liquid distortion offset
    vec2 distortion = normal.xy * uDistortionStrength;

    // Distorsión ambiental continua: agrega movimiento aunque el cursor esté quieto.
    vec2 ambientWater = vec2(
      sin(vUv.x * 9.0 + sin(vUv.y * 5.0 + uTime * 0.55) * 1.5 + uTime * 0.35),
      cos(vUv.y * 11.0 - sin(vUv.x * 4.0 - uTime * 0.42) * 1.4 + uTime * 0.28)
    ) * uAmbientDisplacement;

    // Apply aspect ratio correction
    vec2 baseUv = coverUv(vUv + distortion, uBaseImageAspect, uPlaneAspect);
    vec2 revealUv = coverUv(vUv + distortion + ambientWater, uRevealImageAspect, uPlaneAspect);

    // Clamp UVs
    baseUv = clamp(baseUv, 0.001, 0.999);
    revealUv = clamp(revealUv, 0.001, 0.999);

    // Sample both textures
    vec4 baseColor = texture2D(uBaseTexture, baseUv);
    vec2 revealDisplacement = iridescenceDisplacement(revealUv);
    // Desplazamiento directo del reveal, igual que iridescence-displacement.
    // El slider Reveal Displacement controla esta operación UV.
    vec2 cameraRevealUv = clamp(
      revealUv + revealDisplacement * (uRevealDisplacement / 0.04),
      vec2(0.001), vec2(0.999)
    );
    vec4 revealCamera = texture2D(uRevealTexture, cameraRevealUv);
    vec3 revealTint = iridescence(revealUv);
    vec4 revealColor = vec4(mix(revealCamera.rgb, revealCamera.rgb * revealTint * 1.55, 0.20), 1.0);

    // Create mask from displacement with adjustable size and softness
    float mask = displacement * uRevealSize;
    mask = smoothstep(0.0, uEdgeSoftness, mask);
    mask = clamp(mask, 0.0, 1.0);

    // Mix between base and reveal based on mask
    vec3 color = mix(baseColor.rgb, revealColor.rgb, mask);

    // Add liquid highlights only on the distorted areas
    float rippleMask = smoothstep(0.01, 0.1, normalDeviation);

    vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfDir = normalize(lightDir + viewDir);

    float specular = pow(max(dot(normal, halfDir), 0.0), uSpecularPower);
    specular *= uLightIntensity * rippleMask;

    color += vec3(specular);

    // Fresnel edge glow
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
    color += vec3(fresnel * uLightIntensity * 0.15 * rippleMask);

    gl_FragColor = vec4(color, 1.0);
  }
`

// ============================================
// EFFECT SETTINGS INTERFACE
// ============================================

export interface MaskCursorSettings {
  intensity: number
  scale: number
  viscosity: number
  decay: number
  paintPersistence: number
  waterDisplacement: number
  normalDisplacement: number
  revealDisplacement: number
  revealSize: number
  edgeSoftness: number
  lightIntensity: number
  specularPower: number
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MaskCursorEffect({
  baseImage,
  revealImage,
  settings
}: {
  baseImage: string
  revealImage: string
  settings: MaskCursorSettings
}) {
  const { gl, viewport, size } = useThree()
  const [cameraTexture, setCameraTexture] = useState<THREE.VideoTexture | null>(null)
  useEffect(() => {
    const video = document.createElement("video")
    video.autoplay = true; video.muted = true; video.playsInline = true
    let stream: MediaStream | null = null
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "user" }, audio: false }).then((result) => {
      stream = result
      video.srcObject = result
      video.onloadedmetadata = () => {
        if (video.videoWidth && video.videoHeight) {
          const aspect = video.videoWidth / video.videoHeight
          baseImageAspectRef.current = aspect
          revealImageAspectRef.current = aspect
        }
      }
      video.play()
      const texture = new THREE.VideoTexture(video)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter
      setCameraTexture(texture)
    }).catch((error) => console.error("Camera unavailable", error))
    return () => stream?.getTracks().forEach((track) => track.stop())
  }, [])
  const mouseRef = useRef({ x: 0.5, y: 0.5 })
  const prevMouseRef = useRef({ x: 0.5, y: 0.5 })
  const mouseVelocityRef = useRef(0)
  const pointerDownRef = useRef(false)
  const timeRef = useRef(0)

  const RESOLUTION = 512

  // Ping-pong render targets
  const renderTargets = useMemo(() => {
    const options = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    }
    return [
      new THREE.WebGLRenderTarget(RESOLUTION, RESOLUTION, options),
      new THREE.WebGLRenderTarget(RESOLUTION, RESOLUTION, options),
      new THREE.WebGLRenderTarget(RESOLUTION, RESOLUTION, options),
    ]
  }, [])

  const pingPongRef = useRef(0)

  // Offscreen scene for fluid simulation
  const quadGeometry = useMemo(() => new THREE.PlaneGeometry(2, 2), [])
  const offscreenScene = useMemo(() => new THREE.Scene(), [])
  const offscreenCamera = useMemo(() => {
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    return cam
  }, [])

  // Fluid update material
  const fluidUpdateMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: quadVertexShader,
      fragmentShader: fluidUpdateShader,
      uniforms: {
        uPrevState: { value: null },
        uCurrentState: { value: null },
        uResolution: { value: new THREE.Vector2(RESOLUTION, RESOLUTION) },
        uViscosity: { value: settings.viscosity },
        uDecay: { value: settings.decay },
        uPaintPersistence: { value: settings.paintPersistence },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uPrevMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uRadius: { value: settings.scale },
        uIntensity: { value: settings.intensity },
        uMouseVelocity: { value: 0 },
        uPointerDown: { value: 0 },
      },
    })
  }, [])

  const quadMeshRef = useRef<THREE.Mesh | null>(null)

  // Clear render targets on mount to avoid residual data from previous effects
  useEffect(() => {
    renderTargets.forEach(rt => {
      gl.setRenderTarget(rt)
      gl.clearColor()
    })
    gl.setRenderTarget(null)
  }, [gl, renderTargets])

  useEffect(() => {
    const mesh = new THREE.Mesh(quadGeometry, fluidUpdateMaterial)
    quadMeshRef.current = mesh
    offscreenScene.add(mesh)

    return () => {
      offscreenScene.remove(mesh)
    }
  }, [quadGeometry, fluidUpdateMaterial, offscreenScene])

  // Track image aspect ratios
  const baseImageAspectRef = useRef(1)
  const revealImageAspectRef = useRef(1)

  // Start with black textures so the old template images never flash before
  // the camera stream is ready.
  const textures = useMemo(() => {
    const blackPixel = new Uint8Array([0, 0, 0, 255])
    const createBlackTexture = () => {
      const texture = new THREE.DataTexture(blackPixel, 1, 1, THREE.RGBAFormat)
      texture.needsUpdate = true
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      return texture
    }
    return { base: createBlackTexture(), reveal: createBlackTexture() }
  }, [])

  // Main material for the mask effect
  const maskMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: maskVertexShader,
      fragmentShader: maskFragmentShader,
      uniforms: {
        uBaseTexture: { value: cameraTexture || textures.base },
        uRevealTexture: { value: cameraTexture || textures.reveal },
        uDisplacement: { value: renderTargets[0].texture },
        uDistortionStrength: { value: settings.normalDisplacement },
        uAmbientDisplacement: { value: settings.waterDisplacement },
        uRevealDisplacement: { value: settings.revealDisplacement },
        uRevealSize: { value: settings.revealSize },
        uEdgeSoftness: { value: settings.edgeSoftness },
        uLightIntensity: { value: settings.lightIntensity },
        uSpecularPower: { value: settings.specularPower },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(RESOLUTION, RESOLUTION) },
        uBaseImageAspect: { value: cameraTexture ? 16 / 9 : baseImageAspectRef.current },
        uRevealImageAspect: { value: cameraTexture ? 16 / 9 : revealImageAspectRef.current },
        uPlaneAspect: { value: 1 },
      },
    })
  }, [textures, renderTargets, cameraTexture])

  // Track mouse
  useEffect(() => {
    const updatePointer = (clientX: number, clientY: number) => {
      mouseRef.current.x = clientX / window.innerWidth
      mouseRef.current.y = 1.0 - clientY / window.innerHeight
    }

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownRef.current = true
      updatePointer(e.clientX, e.clientY)
    }

    const handlePointerMove = (e: PointerEvent) => {
      // For mouse, buttons === 0 is a hover. Never keep painting in that state.
      if (e.pointerType === "mouse" && e.buttons === 0) {
        pointerDownRef.current = false
        return
      }
      if (pointerDownRef.current) updatePointer(e.clientX, e.clientY)
    }

    const handlePointerUp = () => {
      pointerDownRef.current = false
      mouseVelocityRef.current = 0
    }

    const handleWindowBlur = () => {
      pointerDownRef.current = false
      mouseVelocityRef.current = 0
    }

    window.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)
    window.addEventListener("blur", handleWindowBlur)
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
      window.removeEventListener("blur", handleWindowBlur)
    }
  }, [])

  // Calculate plane size to fill viewport
  const planeSize = useMemo(() => {
    return {
      width: viewport.width,
      height: viewport.height,
      aspect: viewport.width / viewport.height
    }
  }, [viewport.width, viewport.height])

  // Animation loop
  useFrame(() => {
    if (!quadMeshRef.current) return
    timeRef.current += 1 / 60

    // Calculate mouse velocity
    const dx = mouseRef.current.x - prevMouseRef.current.x
    const dy = mouseRef.current.y - prevMouseRef.current.y
    const velocity = Math.sqrt(dx * dx + dy * dy)
    if (!pointerDownRef.current) {
      // Follow the pointer position without creating any accumulated paint.
      prevMouseRef.current.x = mouseRef.current.x
      prevMouseRef.current.y = mouseRef.current.y
    }
    mouseVelocityRef.current = pointerDownRef.current ? velocity : 0

    // Update fluid uniforms
    fluidUpdateMaterial.uniforms.uViscosity.value = settings.viscosity
    fluidUpdateMaterial.uniforms.uDecay.value = settings.decay
    fluidUpdateMaterial.uniforms.uPaintPersistence.value = settings.paintPersistence
    fluidUpdateMaterial.uniforms.uRadius.value = settings.scale
    fluidUpdateMaterial.uniforms.uIntensity.value = settings.intensity
    fluidUpdateMaterial.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y)
    fluidUpdateMaterial.uniforms.uPrevMouse.value.set(prevMouseRef.current.x, prevMouseRef.current.y)
    fluidUpdateMaterial.uniforms.uMouseVelocity.value = mouseVelocityRef.current
    fluidUpdateMaterial.uniforms.uPointerDown.value = pointerDownRef.current ? 1 : 0

    // Ping-pong indices
    const current = pingPongRef.current
    const prev = (current + 2) % 3
    const next = (current + 1) % 3

    // Update fluid simulation
    fluidUpdateMaterial.uniforms.uPrevState.value = renderTargets[prev].texture
    fluidUpdateMaterial.uniforms.uCurrentState.value = renderTargets[current].texture

    quadMeshRef.current.material = fluidUpdateMaterial

    gl.setRenderTarget(renderTargets[next])
    gl.render(offscreenScene, offscreenCamera)
    gl.setRenderTarget(null)

    // Update mask material
    maskMaterial.uniforms.uDisplacement.value = renderTargets[next].texture
    maskMaterial.uniforms.uDistortionStrength.value = settings.normalDisplacement
    maskMaterial.uniforms.uAmbientDisplacement.value = settings.waterDisplacement
    maskMaterial.uniforms.uRevealDisplacement.value = settings.revealDisplacement
    maskMaterial.uniforms.uRevealSize.value = settings.revealSize
    maskMaterial.uniforms.uEdgeSoftness.value = settings.edgeSoftness
    maskMaterial.uniforms.uLightIntensity.value = settings.lightIntensity
    maskMaterial.uniforms.uSpecularPower.value = settings.specularPower
    maskMaterial.uniforms.uTime.value = timeRef.current
    maskMaterial.uniforms.uBaseImageAspect.value = baseImageAspectRef.current
    maskMaterial.uniforms.uRevealImageAspect.value = revealImageAspectRef.current
    maskMaterial.uniforms.uPlaneAspect.value = planeSize.aspect

    // Advance ping-pong
    pingPongRef.current = next

    // Store previous mouse
    prevMouseRef.current.x = mouseRef.current.x
    prevMouseRef.current.y = mouseRef.current.y
  })

  // Cleanup
  useEffect(() => {
    return () => {
      renderTargets.forEach(rt => rt.dispose())
      quadGeometry.dispose()
      fluidUpdateMaterial.dispose()
      maskMaterial.dispose()
      textures.base.dispose()
      textures.reveal.dispose()
    }
  }, [])

  return (
    <mesh>
      <planeGeometry args={[planeSize.width, planeSize.height, 1, 1]} />
      <primitive object={maskMaterial} attach="material" />
    </mesh>
  )
}

export default MaskCursorEffect
