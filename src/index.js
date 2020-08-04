import React, { useRef, useMemo, createRef, useState, useCallback, Suspense } from 'react'
import ReactDOM from 'react-dom'
import * as THREE from 'three'
import { Canvas, createPortal, useFrame, useThree } from 'react-three-fiber'
import { Plane, Html, Box } from 'drei'
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls'
import { Physics, usePlane, useSphere } from 'use-cannon'
import clamp from 'lodash.clamp'

import { addBarycentricCoordinates, unindexBufferGeometry } from './geom'
import vert from './shader/shader.vert'
import frag from './shader/shader.frag'

import 'styled-components/macro'
import './styles.css'

const rotation = createRef()
const betaRef = createRef(0)
const gammaRef = createRef(0)

function PhyPlane({ plain, rotate, rotation = [0, 0, 0], ...props }) {
  const [ref, api] = usePlane(() => ({ ...props, rotation }))

  useFrame(() => {
    if (!rotate) return
    api.rotation.set(clamp(betaRef.current, -10, 10) / 120, clamp(gammaRef.current, -10, 10) / 120, 0)
  })

  return <mesh ref={ref} />
}

function InstancedSpheres() {
  const [ref] = useSphere(() => ({
    mass: 1,
    position: [0, 0, 1],
    args: 0.07
  }))

  const materialProps = useMemo(
    () => ({
      extensions: {
        // needed for anti-alias smoothstep, aastep()
        derivatives: true
      },
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        
        fill: { value: new THREE.Color(0xa7f000) },
        stroke: { value: new THREE.Color(0xf2003c) },
        
        noiseA: { value: false },
        noiseB: { value: false },
        
        dualStroke: { value: false },
        
        seeThrough: { value: true },
        
        insideAltColor: { value: true },
        
        thickness: { value: 0.2 },
        secondThickness: { value: 0.5 },
        
        dashEnabled: { value: true },
        dashRepeats: { value: 10.0 },
        dashOverlap: { value: false },
        dashLength: { value: 0.5 },
        dashAnimate: { value: false },

        squeeze: { value: true },
        squeezeMin: { value: 0.3 },
        squeezeMax: { value: 1.0 }
      },
      fragmentShader: frag,
      vertexShader: vert
    }),
    []
  )

  const geometry = useMemo(() => {
    const geometry = new THREE.IcosahedronBufferGeometry(0.07, 1, 1)
    const edgeRemoval = false
    unindexBufferGeometry(geometry)
    addBarycentricCoordinates(geometry, edgeRemoval)
    return geometry
  }, [])

  return (
    <mesh ref={ref} geometry={geometry}>
      <shaderMaterial {...materialProps} />
    </mesh>
  )
}

function DepthCube({ scene, camera }) {
  const { aspect } = useThree()

  const { width, height } = useMemo(
    () =>
      aspect > 1
        ? {
            width: 1,
            height: 1 / aspect
          }
        : {
            width: aspect,
            height: 1
          },

    [aspect]
  )

  return (
    <>
      <group position={[0, 0, -0.15]}>
        <Physics gravity={[0, 0, -30]}>
          <Suspense fallback={null}>
            <PhyPlane rotate position={[0, 0, 0]} />
            <PhyPlane position={[-0.5 * width, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
            <PhyPlane position={[0.5 * width, 0, 0]} rotation={[0, -(Math.PI / 2), 0]} />
            <PhyPlane position={[0, 0.5 * height, 0]} rotation={[Math.PI / 2, 0, 0]} />
            <PhyPlane position={[0, -0.5 * height, 0]} rotation={[-(Math.PI / 2), 0, 0]} />
            <group scale={[1 / width, 1 / height, 1]}>
              <InstancedSpheres />
            </group>
          </Suspense>
        </Physics>
        <Box position={[0, 0, 0.5]} args={[1, 1, 1, 8, 8, 32]}>
          <meshBasicMaterial wireframe attachArray="material" />
          <meshBasicMaterial wireframe attachArray="material" />
          <meshBasicMaterial wireframe attachArray="material" />
          <meshBasicMaterial wireframe attachArray="material" />
          <meshBasicMaterial wireframe transparent opacity={0} attachArray="material" />
          <meshBasicMaterial wireframe attachArray="material" />
        </Box>
        <ambientLight intensity={1} />
      </group>
    </>
  )
}

function PlanePortal() {
  const planeRef = useRef()

  const [camera] = useState(new THREE.PerspectiveCamera())

  const { near, scene, target, portalHalfWidth, portalHalfHeight } = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1024, 1024)
    const scene = new THREE.Scene()

    scene.fog = new THREE.Fog(0x000000, 0.0, 1.5)
    scene.background = new THREE.Color(0x000000)

    const near = 0.1
    const portalHalfWidth = 1 / 2
    const portalHalfHeight = 1 / 2

    return { near, scene, target, portalHalfWidth, portalHalfHeight }
  }, [])

  useFrame(state => {
    camera.position.copy(state.camera.position)
    camera.quaternion.copy(planeRef.current.quaternion)

    const portalPosition = new THREE.Vector3().copy(planeRef.current.position)

    camera.updateMatrixWorld()
    camera.worldToLocal(portalPosition)

    const left = portalPosition.x - portalHalfWidth
    const right = portalPosition.x + portalHalfWidth
    const top = portalPosition.y + portalHalfHeight
    const bottom = portalPosition.y - portalHalfHeight

    const distance = Math.abs(portalPosition.z)
    const scale = near / distance

    const scaledLeft = left * scale
    const scaledRight = right * scale
    const scaledTop = top * scale
    const scaledBottom = bottom * scale

    camera.projectionMatrix.makePerspective(scaledLeft, scaledRight, scaledTop, scaledBottom, near, 100)

    state.gl.render(scene, camera)
  }, 1)

  return (
    <>
      {createPortal(<DepthCube scene={scene} camera={camera} />, scene)}
      <Plane ref={planeRef}>
        <meshStandardMaterial attach="material" map={target.texture} />
      </Plane>
    </>
  )
}

function InteractionManager(props) {
  const { isMobile } = props

  const [clicked, setClicked] = useState(false)

  const handleClick = useCallback(
    function handleClick() {
      setClicked(true)
      rotation.current = new DeviceOrientationControls(new THREE.PerspectiveCamera())
    },
    [setClicked]
  )

  useFrame(({ camera }) => {
    if (!rotation.current) return

    rotation.current.update()

    if (!rotation.current?.deviceOrientation) return

    const { beta, gamma } = rotation.current.deviceOrientation

    if (!beta || !gamma) return

    betaRef.current = clamp(beta, -45, 45)
    gammaRef.current = clamp(gamma, -45, 45)

    camera.lookAt(0, 0, 0)

    camera.position.x = -gammaRef.current / 90
    camera.position.y = betaRef.current / 90
    camera.position.z = 1 - 0.5 * Math.min(Math.abs(camera.position.x) + Math.abs(camera.position.y), 1)
  })

  return clicked ? (
    <PlanePortal />
  ) : (
    <Plane material-transparent material-opacity={0} onClick={handleClick}>
      <Html center scaleFactor={10}>
        <div style={{ color: 'black', fontFamily: 'Fredoka One' }}>Click Here</div>
      </Html>
    </Plane>
  )
}

function App() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  return (
    <>
      <Canvas
        concurrent
        colorManagement
        pixelRatio={Math.min(2, isMobile ? window.devicePixelRatio : 1)}
        camera={{ position: [0, 0, 1], far: 100, near: 0.1 }}>
        <InteractionManager isMobile={isMobile} />
      </Canvas>
      <div
        css={`
          position: fixed;
          top: 0;
          right: 0;
          margin: 1rem;
          color: white;
          font-size: 3rem;
          font-family: 'Fredoka One';
        `}>
        <div>{`10 ❤️`}</div>
      </div>
    </>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
