"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Procedural anime-style user character
// ---------------------------------------------------------------------------

function UserCharacter() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
      groupRef.current.position.y =
        Math.sin(Date.now() * 0.001) * 0.03;
    }
  });

  const skin = "#ffe0bd";
  const hair = "#3b2f2f";
  const shirt = "#4f8ef7";
  const pants = "#2d3748";
  const shoe = "#1a1a2e";

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 1.7, -0.02]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color={hair} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.045, 1.63, 0.12]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.045, 1.63, 0.12]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* Eye highlights */}
      <mesh position={[-0.04, 1.64, 0.135]}>
        <sphereGeometry args={[0.007, 6, 6]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.05, 1.64, 0.135]}>
        <sphereGeometry args={[0.007, 6, 6]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
      </mesh>
      {/* Mouth */}
      <mesh position={[0, 1.585, 0.12]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.04, 0.008, 0.01]} />
        <meshStandardMaterial color="#c97878" />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.46, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.05, 8]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 1.28, 0]}>
        <boxGeometry args={[0.28, 0.32, 0.16]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.2, 1.28, 0]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.08, 0.3, 0.08]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      <mesh position={[-0.22, 1.1, 0]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.2, 1.28, 0]} rotation={[0, 0, -0.15]}>
        <boxGeometry args={[0.08, 0.3, 0.08]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      <mesh position={[0.22, 1.1, 0]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* Left leg */}
      <mesh position={[-0.08, 0.92, 0]}>
        <boxGeometry args={[0.1, 0.38, 0.1]} />
        <meshStandardMaterial color={pants} />
      </mesh>
      <mesh position={[-0.08, 0.71, 0.02]}>
        <boxGeometry args={[0.1, 0.06, 0.14]} />
        <meshStandardMaterial color={shoe} />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.08, 0.92, 0]}>
        <boxGeometry args={[0.1, 0.38, 0.1]} />
        <meshStandardMaterial color={pants} />
      </mesh>
      <mesh position={[0.08, 0.71, 0.02]}>
        <boxGeometry args={[0.1, 0.06, 0.14]} />
        <meshStandardMaterial color={shoe} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Procedural lobster character
// ---------------------------------------------------------------------------

function LobsterCharacter() {
  const groupRef = useRef<THREE.Group>(null);
  const leftClawRef = useRef<THREE.Group>(null);
  const rightClawRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.25;
      groupRef.current.position.y = Math.sin(Date.now() * 0.0015) * 0.04;
    }
    if (leftClawRef.current) {
      leftClawRef.current.rotation.z =
        -0.3 + Math.sin(Date.now() * 0.003) * 0.15;
    }
    if (rightClawRef.current) {
      rightClawRef.current.rotation.z =
        0.3 - Math.sin(Date.now() * 0.003 + 1) * 0.15;
    }
  });

  const shell = "#c0392b";
  const shellDark = "#922b21";
  const belly = "#e8a87c";
  const eye = "#222";
  const eyeWhite = "#f5f5dc";

  return (
    <group ref={groupRef} position={[0, 0.9, 0]}>
      {/* Main body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.14, 0.22, 8, 16]} />
        <meshStandardMaterial color={shell} />
      </mesh>
      {/* Belly */}
      <mesh position={[0, -0.02, 0.08]}>
        <capsuleGeometry args={[0.1, 0.16, 8, 16]} />
        <meshStandardMaterial color={belly} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.22, 0.04]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={shell} />
      </mesh>
      {/* Eye stalks */}
      <mesh position={[-0.07, 0.34, 0.06]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.015, 0.015, 0.06, 6]} />
        <meshStandardMaterial color={shellDark} />
      </mesh>
      <mesh position={[0.07, 0.34, 0.06]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.015, 0.015, 0.06, 6]} />
        <meshStandardMaterial color={shellDark} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.085, 0.37, 0.06]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color={eyeWhite} />
      </mesh>
      <mesh position={[-0.09, 0.375, 0.08]}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshStandardMaterial color={eye} />
      </mesh>
      <mesh position={[0.085, 0.37, 0.06]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color={eyeWhite} />
      </mesh>
      <mesh position={[0.09, 0.375, 0.08]}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshStandardMaterial color={eye} />
      </mesh>
      {/* Antennae */}
      <mesh position={[-0.04, 0.35, 0.12]} rotation={[0.8, -0.3, 0]}>
        <cylinderGeometry args={[0.005, 0.002, 0.2, 4]} />
        <meshStandardMaterial color={shellDark} />
      </mesh>
      <mesh position={[0.04, 0.35, 0.12]} rotation={[0.8, 0.3, 0]}>
        <cylinderGeometry args={[0.005, 0.002, 0.2, 4]} />
        <meshStandardMaterial color={shellDark} />
      </mesh>

      {/* Left claw arm */}
      <group ref={leftClawRef} position={[-0.16, 0.12, 0.04]}>
        <mesh rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.03, 0.025, 0.18, 6]} />
          <meshStandardMaterial color={shell} />
        </mesh>
        {/* Claw */}
        <group position={[-0.08, -0.1, 0]}>
          <mesh position={[0, 0, 0.015]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.08, 0.04, 0.025]} />
            <meshStandardMaterial color={shellDark} />
          </mesh>
          <mesh position={[0, 0, -0.015]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.08, 0.04, 0.025]} />
            <meshStandardMaterial color={shellDark} />
          </mesh>
        </group>
      </group>

      {/* Right claw arm */}
      <group ref={rightClawRef} position={[0.16, 0.12, 0.04]}>
        <mesh rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.03, 0.025, 0.18, 6]} />
          <meshStandardMaterial color={shell} />
        </mesh>
        <group position={[0.08, -0.1, 0]}>
          <mesh position={[0, 0, 0.015]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.08, 0.04, 0.025]} />
            <meshStandardMaterial color={shellDark} />
          </mesh>
          <mesh position={[0, 0, -0.015]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.08, 0.04, 0.025]} />
            <meshStandardMaterial color={shellDark} />
          </mesh>
        </group>
      </group>

      {/* Tail segments */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[0, -0.18 - i * 0.06, -0.04 - i * 0.03]}
          rotation={[0.2 * (i + 1), 0, 0]}
        >
          <capsuleGeometry args={[0.1 - i * 0.018, 0.03, 6, 8]} />
          <meshStandardMaterial color={i % 2 === 0 ? shell : shellDark} />
        </mesh>
      ))}
      {/* Tail fan */}
      <mesh position={[0, -0.42, -0.18]} rotation={[1.2, 0, 0]}>
        <coneGeometry args={[0.06, 0.08, 6]} />
        <meshStandardMaterial color={shellDark} />
      </mesh>

      {/* Legs (3 pairs) */}
      {[-1, 1].map((side) =>
        [0, 1, 2].map((i) => (
          <mesh
            key={`${side}-${i}`}
            position={[side * 0.13, -0.05 - i * 0.07, 0.02 + i * 0.01]}
            rotation={[0.3, 0, side * (0.6 + i * 0.15)]}
          >
            <cylinderGeometry args={[0.012, 0.008, 0.14, 4]} />
            <meshStandardMaterial color={shellDark} />
          </mesh>
        ))
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Scene wrapper
// ---------------------------------------------------------------------------

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 7]} intensity={1} />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
    </>
  );
}

interface CharacterViewerProps {
  type: "user" | "lobster";
  className?: string;
}

export function CharacterViewer({ type, className = "" }: CharacterViewerProps) {
  const cameraPos: [number, number, number] =
    type === "user" ? [0, 1.3, 2.2] : [0, 1.1, 2];
  const target: [number, number, number] =
    type === "user" ? [0, 1.2, 0] : [0, 0.9, 0];

  return (
    <div className={className}>
      <Canvas
        camera={{ position: cameraPos, fov: 35 }}
        style={{ width: "100%", height: "100%" }}
      >
        <SceneLighting />
        {type === "user" ? <UserCharacter /> : <LobsterCharacter />}
        <OrbitControls
          target={target}
          enablePan={false}
          minDistance={1.5}
          maxDistance={4}
        />
      </Canvas>
    </div>
  );
}
