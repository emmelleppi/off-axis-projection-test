import React, { useRef, useMemo, createRef, useState, useCallback, Suspense } from 'react'
import ReactDOM from 'react-dom'
import * as THREE from 'three'
import { Canvas, createPortal, useFrame, useThree, useLoader } from 'react-three-fiber'
import { Plane, Html, Box, Icosahedron } from 'drei'
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls'
import { Physics, useBox, usePlane, useSphere } from 'use-cannon'
import clamp from 'lodash.clamp'

import 'styled-components/macro'
import './styles.css'

const rotation = createRef()
const betaRef = createRef(0)
const gammaRef = createRef(0)

function Mouse({width, height}) {
  const { viewport } = useThree()

  return useFrame(state => {
    betaRef.current = -clamp((state.mouse.y * viewport.height) *200, -45 * height, 45 * height)
    gammaRef.current = -clamp((state.mouse.x * viewport.width) *200, -45 * width, 45 * width)

    state.camera.lookAt(0, 0, 0)

    state.camera.position.x = -gammaRef.current / 120
    state.camera.position.y = betaRef.current / 120
    state.camera.position.z = 1 - 0.5 * Math.min(Math.abs(state.camera.position.x) + Math.abs(state.camera.position.y), 1)
  })
}


function InstancedBoxes({ number = 15 }) {
  const carbon = useLoader(THREE.TextureLoader, '/carbon.jpeg')

  const positions = useMemo(() => {
    const _positions = []

    for(let index = 0; index <= number - 5; index++) {
      _positions.push([0.2 * Math.cos(Math.PI * index / (number - 5)), -0.1 - 0.2 * Math.sin(Math.PI * index / (number - 5)), -0.25])
    }
    
    _positions.push([-0.1, 0.1, -0.25])
    _positions.push([0.1, 0.1, -0.25])
    _positions.push([-0.1, 0.15, -0.25])
    _positions.push([0.1, 0.15, -0.25])

    return _positions
  }, [number])

  const [ref] = useBox(index => ({
    position: positions[index],
    args: [0.08, 0.08, 0.08]
  }))
  
  return (
    <instancedMesh ref={ref} castShadow receiveShadow args={[null, null, number]}>
      <boxBufferGeometry attach="geometry" args={[0.08, 0.08, 0.08]} />
      <meshPhysicalMaterial
          clearcoat={1}
          clearcoatRoughness={0.1}
          normalScale={[1.4,1.4]}
          normalMap={carbon}
          roughness={0.2}
          metalness={0.2}
          color="purple"
          attach="material"
        />
    </instancedMesh>
  )
}

function PhyPlane({ plain, rotate, rotation = [0, 0, 0], ...props }) {
  const [ref, api] = usePlane(() => ({ ...props, rotation }))

  useFrame(() => {
    if (!rotate) return
    api.rotation.set(clamp(betaRef.current, -10, 10) / 120, clamp(gammaRef.current, -10, 10) / 120, 0)
  })

  return (
    <mesh ref={ref} />
  )
}

function InstancedSpheres() {
  const [map, normal] = useLoader(THREE.TextureLoader, ["/vortex.jpg",'/flakes.png'])

  const [ref] = useSphere(() => ({
    mass: 1,
    position: [0, 0, 1],
    args: 0.05
  }))

  const _materialProps = {
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    metalness: 0.1,
    roughness: 0.2,
    map: map,
    normalMap: normal,
    normalScale: [0.3, 0.3],
    alphaMap: map,
    transmission: 0.6,
    transparent: true
  }

  return (
    <group ref={ref}>
      <Icosahedron receiveShadow castShadow args={[0.05, 4, 4]}>
        <meshPhysicalMaterial {..._materialProps} color="red" side={THREE.BackSide} />
      </Icosahedron>
      <Icosahedron args={[0.05, 4, 4]}>
        <meshPhysicalMaterial {..._materialProps} color="blue"  transmission={0.4} />
      </Icosahedron>
    </group>
  )
}

function Boxes({ width, height }) {
  const [carbon] = useLoader(THREE.TextureLoader, ["/carbon.jpeg"])


  return (
    <group>
      <Box args={[width, height, 0.5]} receiveShadow >
        <meshPhysicalMaterial
          clearcoat={1}
          clearcoatRoughness={0.1}
          normalScale={[1.4,1.4]}
          normalMap={carbon}
          roughness={0.2}
          metalness={0.2}
          side={THREE.BackSide}
          color="pink"
          attachArray="material"
        />
       <meshPhysicalMaterial
          clearcoat={1}
          clearcoatRoughness={0.1}
          normalScale={[1.4,1.4]}
          normalMap={carbon}
          roughness={0.2}
          metalness={0.2}
          side={THREE.BackSide}
          color="pink"
          attachArray="material"
        />
       <meshPhysicalMaterial
          clearcoat={1}
          clearcoatRoughness={0.1}
          normalScale={[1.4,1.4]}
          normalMap={carbon}
          roughness={0.2}
          metalness={0.2}
          side={THREE.BackSide}
          color="pink"
          attachArray="material"
        />
       <meshPhysicalMaterial
          clearcoat={1}
          clearcoatRoughness={0.1}
          normalScale={[1.4,1.4]}
          normalMap={carbon}
          roughness={0.2}
          metalness={0.2}
          side={THREE.BackSide}
          color="pink"
          attachArray="material"
        />
       <meshPhysicalMaterial
          transparent
          opacity={0}
          side={THREE.BackSide}
          attachArray="material"
        />
       <meshPhysicalMaterial
          clearcoat={1}
          clearcoatRoughness={0.1}
          normalScale={[1.4,1.4]}
          normalMap={carbon}
          roughness={0.2}
          metalness={0.2}
          side={THREE.BackSide}
          color="pink"
          attachArray="material"
        />
     </Box>
   </group>
  )
}

function DepthCube({ width, height }) {

  return (
    <>
      <group>
        <Physics gravity={[0, 0, -30]}>
          <PhyPlane rotate position={[0, 0, -0.25]} />
          <PhyPlane position={[-0.5 * width, 0, -0.25]} rotation={[0, Math.PI / 2, 0]} />
          <PhyPlane position={[0.5 * width, 0, -0.25]} rotation={[0, -(Math.PI / 2), 0]} />
          <PhyPlane position={[0, 0.5 * height, -0.25]} rotation={[Math.PI / 2, 0, 0]} />
          <PhyPlane position={[0, -0.5 * height, -0.25]} rotation={[-(Math.PI / 2), 0, 0]} />
          <Suspense fallback={null}>
            <InstancedSpheres />
            <InstancedBoxes />
            <Boxes width={width} height={height}  />
          </Suspense>
        </Physics>

        {/* <Mouse width={width} height={height} /> */}
        <hemisphereLight intensity={0.35} />
        <spotLight
          position={[-1, -1, 1]}
          angle={0.3}
          penumbra={1}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[1, 1, 1]} intensity={0.3} />
      </group>
    </>
  )
}

function PlanePortal({width, height}) {
  const planeRef = useRef()

  const [camera] = useState(new THREE.PerspectiveCamera())

  const { near, scene, target, portalHalfWidth, portalHalfHeight } = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1024, 1024)
    const scene = new THREE.Scene()

    scene.fog = new THREE.Fog(0x000000, 0.5, 3)
    scene.background = new THREE.Color(0x000000)

    const near = 0.1
    const portalHalfWidth = width / 2
    const portalHalfHeight = height / 2

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
      {createPortal(<DepthCube width={width} height={height} />, scene)}
      <Plane ref={planeRef} >
        <meshStandardMaterial attach="material" map={target.texture} />
      </Plane>
    </>
  )
}
 
function InteractionManager(props) {
  const { isMobile } = props

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

  const [clicked, setClicked] = useState(false)

  const handleClick = useCallback(
    function handleClick() {
      setClicked(true)
      rotation.current = new DeviceOrientationControls(new THREE.PerspectiveCamera())
    },
    [setClicked]
  )

  useFrame(({ camera, aspect }) => {
    if (!rotation.current) return

    rotation.current.update()

    if (!rotation.current?.deviceOrientation) return

    const { beta, gamma } = rotation.current.deviceOrientation

    if (!beta || !gamma) return

    betaRef.current = clamp(beta, -45 * height, 45 * height)
    gammaRef.current = clamp(gamma, -45 * width, 45 * width)

    camera.lookAt(0, 0, 0)

    camera.position.x = -gammaRef.current / 90
    camera.position.y = betaRef.current / 90
    camera.position.z = 1 - 0.5 * Math.min(Math.abs(camera.position.x) + Math.abs(camera.position.y), 1)
  })

  return clicked ? (
    <PlanePortal width={width} height={height} />
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
        shadowMap
        colorManagement
        pixelRatio={Math.min(2, isMobile ? window.devicePixelRatio : 1)}
        camera={{ position: [0, 0, 1], far: 100, near: 0.1 }}>
        <InteractionManager isMobile={isMobile} />
      </Canvas>
    </>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
