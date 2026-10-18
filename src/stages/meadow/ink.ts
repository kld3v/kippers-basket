import * as THREE from 'three'

/** Render layers: the 3D land gets ink outlines; the paper cut-outs already have their own. */
export const LAND = 1
export const PAPER = 2

/**
 * Three passes a frame:
 *  1. the land into an offscreen buffer (colour + depth),
 *  2. a full-screen pass that draws it to the canvas with ink wherever depth jumps (hill edges),
 *     writing the land's depth back so the canvas can still hide things behind hills,
 *  3. the paper cut-outs straight onto the canvas, depth-tested against the land.
 */
export class InkPass {
  readonly rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, depthTexture: new THREE.DepthTexture(1, 1) })
  private scene = new THREE.Scene()
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  readonly uniforms = {
    tColor: { value: this.rt.texture as THREE.Texture },
    tDepth: { value: this.rt.depthTexture as THREE.Texture },
    uTexel: { value: new THREE.Vector2(1, 1) },
    uNear: { value: 0.1 },
    uFar: { value: 400 },
    uInkW: { value: 1.5 },
    uNight: { value: 0 },
  }

  constructor() {
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      depthTest: true,
      depthWrite: true,
      depthFunc: THREE.AlwaysDepth,
      blending: THREE.NoBlending,
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tColor; uniform sampler2D tDepth;
        uniform vec2 uTexel; uniform float uNear, uFar, uInkW, uNight;
        varying vec2 vUv;
        float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
        void main() {
          vec4 c = texture2D(tColor, vUv);
          float d = texture2D(tDepth, vUv).r;
          float z0 = lin(d);
          // 1/z changes linearly across any flat surface on screen, so its second difference is
          // zero on slopes seen edge-on and only spikes at real silhouettes. Keeping just the
          // positive side puts the line on the nearer shape, like a pen tracing its outline.
          vec2 o = uTexel * uInkW;
          float w0 = 1.0 / z0;
          float wl = 1.0 / lin(texture2D(tDepth, vUv - vec2(o.x, 0.0)).r);
          float wr = 1.0 / lin(texture2D(tDepth, vUv + vec2(o.x, 0.0)).r);
          float wd = 1.0 / lin(texture2D(tDepth, vUv - vec2(0.0, o.y)).r);
          float wu = 1.0 / lin(texture2D(tDepth, vUv + vec2(0.0, o.y)).r);
          float e = (max(0.0, 2.0 * w0 - wl - wr) + max(0.0, 2.0 * w0 - wd - wu)) / w0;
          float edge = smoothstep(0.03, 0.09, e) * (1.0 - smoothstep(80.0, 160.0, z0)) * step(d, 0.99999);
          vec3 col = mix(c.rgb, vec3(0.24, 0.20, 0.19), edge * 0.85);
          col *= mix(vec3(1.0), vec3(0.6, 0.62, 0.8), uNight);
          float a = max(c.a, edge);
          gl_FragColor = vec4(col * a, a);
          gl_FragDepth = d;
        }`,
    })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
    quad.frustumCulled = false
    this.scene.add(quad)
  }

  setSize(w: number, h: number, dpr: number) {
    if (this.rt.width === w && this.rt.height === h) return
    this.rt.setSize(w, h)
    this.uniforms.uTexel.value.set(1 / w, 1 / h)
    this.uniforms.uInkW.value = Math.max(1, dpr * 0.85)
  }

  render(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.uniforms.uNear.value = camera.near
    this.uniforms.uFar.value = camera.far
    gl.autoClear = false
    gl.setClearColor(0x000000, 0)
    gl.setRenderTarget(this.rt)
    gl.clear()
    camera.layers.set(LAND)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    gl.clear()
    gl.render(this.scene, this.cam)
    camera.layers.set(PAPER)
    gl.render(scene, camera)
    camera.layers.enableAll()
  }

  dispose() {
    this.rt.dispose()
  }
}

/**
 * Paper cut-outs are sorted by where they touch the ground, then by layer, so a character's
 * pieces (legs, body, head) always stack the right way however the camera looks at them.
 */
export function paperSort(a: THREE.RenderItem, b: THREE.RenderItem) {
  if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder
  if (a.renderOrder !== b.renderOrder) return a.renderOrder - b.renderOrder
  const da = a.object.userData.anchorZ ?? a.z
  const db = b.object.userData.anchorZ ?? b.z
  if (da !== db) return db - da
  const la = a.object.userData.layer ?? 0
  const lb = b.object.userData.layer ?? 0
  if (la !== lb) return la - lb
  return a.id - b.id
}
