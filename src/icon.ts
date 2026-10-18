// Dev-only: draws the home-screen icon so it can be saved as public/icon.svg and the PNGs.
import './art/art.css'
import { kipperBody } from './art/kipper'

document.body.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#cde4ee"/>
  <path d="M0 360 C120 330 260 350 512 320 L512 512 L0 512Z" fill="#a9cf7c"/>
  <g transform="translate(-462 -70) scale(3.45)">${kipperBody()}</g>
</svg>`
