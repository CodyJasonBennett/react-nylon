import * as React from 'react'
import { createRoot } from './react-dom'
import { extend, useThree, useFrame, Canvas } from './react-three'
import { OrbitControls as OrbitControlsImpl } from 'three/addons'

const context = React.createContext(null)

function OrbitControls(props) {
  extend({ OrbitControls: OrbitControlsImpl })
  const controls = React.useRef()
  const { camera, gl } = useThree()
  useFrame(() => controls.current.update())
  return <orbitControls enableDamping {...props} ref={controls} args={[camera, gl.domElement]} />
}

function Scene() {
  console.log(React.useContext(context))
  return (
    <>
      <gridHelper />
      <OrbitControls />
    </>
  )
}

createRoot(root).render(
  <context.Provider value={Math.acos(-1)}>
    <Canvas>
      <Scene />
    </Canvas>
  </context.Provider>,
)
