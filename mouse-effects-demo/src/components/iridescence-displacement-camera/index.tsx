"use client"

import { useEffect, useRef } from "react"

export default function IridescenceDisplacementCamera({ amount }: { amount: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const amountRef = useRef(amount)
  amountRef.current = amount

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl2", { antialias: false })
    if (!gl) return

    const video = document.createElement("video")
    video.autoplay = true
    video.muted = true
    video.playsInline = true

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return shader
    }
    const vertex = `#version 300 es
      in vec2 position; out vec2 uv;
      void main(){ uv=position*.5+.5; gl_Position=vec4(position,0.,1.); }`
    const fragment = `#version 300 es
      precision highp float; in vec2 uv; out vec4 outColor;
      uniform sampler2D camera; uniform float time; uniform float amount;
      void main(){
        vec2 p=uv-.5;
        float dx=sin(p.x*14.+sin(p.y*8.+time)*2.)*.035;
        float dy=cos(p.y*17.-sin(p.x*6.-time*.8)*2.)*.035;
        vec2 displaced=vec2(uv.x,1.-uv.y)+vec2(dx,dy)*(amount/.08);
        vec3 color=texture(camera,clamp(displaced,vec2(.002),vec2(.998))).rgb;
        float ir=.5+.5*sin((p.x+p.y)*18.+sin(p.y*7.+time)*2.);
        vec3 chrome=mix(vec3(.2,.12,.5),vec3(.5,.85,1.),ir);
        color=mix(color,color*chrome*1.8,.22);
        outColor=vec4(color,1.);
      }`
    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment))
    gl.linkProgram(program)
    gl.useProgram(program)

    const buffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, "position")
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const timeLocation = gl.getUniformLocation(program, "time")
    const amountLocation = gl.getUniformLocation(program, "amount")
    const texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    let stream: MediaStream | undefined
    let raf = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(innerWidth * dpr)
      canvas.height = Math.floor(innerHeight * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    const frame = (now: number) => {
      if (video.readyState >= 2) {
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
        gl.uniform1i(gl.getUniformLocation(program, "camera"), 0)
        gl.uniform1f(timeLocation, now * .001)
        gl.uniform1f(amountLocation, amountRef.current)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      raf = requestAnimationFrame(frame)
    }
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        video.srcObject = stream
        await video.play()
      } catch (error) {
        console.error("No se pudo acceder a la cámara", error)
      }
    }
    resize()
    addEventListener("resize", resize)
    start()
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener("resize", resize)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
}
