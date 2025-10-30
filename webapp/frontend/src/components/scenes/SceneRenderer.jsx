import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * SceneObject - Renders a single 3D object from a scene
 */
export const SceneObject = ({ object, onLoad, onError }) => {
  const [model, setModel] = useState(null);
  const groupRef = useRef();

  useEffect(() => {
    // Check if model uses a URL or is a procedural geometry
    if (object.model && object.model.endsWith('.glb') || object.model && object.model.endsWith('.gltf')) {
      // Try to load GLTF/GLB model
      try {
        const { scene } = useGLTF(object.model);
        setModel(scene.clone());
        onLoad?.(object.id);
      } catch (error) {
        console.error(`Failed to load model ${object.model}:`, error);
        onError?.(object.id, error);
        // Fallback to procedural geometry
        setModel(null);
      }
    }
  }, [object.model, object.id, onLoad, onError]);

  // Animation for animated objects
  useFrame((state) => {
    if (groupRef.current && object.properties?.animated) {
      const t = state.clock.getElapsedTime();
      
      // Different animations based on object type
      if (object.type === 'metro_train' || object.type === 'train') {
        // Train moves back and forth
        groupRef.current.position.z = object.position[2] + Math.sin(t * 0.2) * 20;
      } else if (object.type === 'escalator') {
        // Escalator subtle movement
        groupRef.current.children.forEach((child, i) => {
          if (child.isMesh) {
            child.position.y += Math.sin(t * 2 + i) * 0.001;
          }
        });
      }
    }
  });

  // Render procedural geometry as fallback
  const renderProceduralGeometry = () => {
    switch (object.type) {
      case 'platform':
        return (
          <mesh position={[0, 0, 0]} receiveShadow>
            <boxGeometry args={[object.properties?.width || 10, 0.5, object.properties?.length || 200]} />
            <meshStandardMaterial color={object.properties?.color || '#cccccc'} />
          </mesh>
        );
      
      case 'track':
        return (
          <group>
            {/* Rails */}
            <mesh position={[-0.7, 0, 0]} castShadow>
              <boxGeometry args={[0.1, 0.15, object.properties?.length || 200]} />
              <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0.7, 0, 0]} castShadow>
              <boxGeometry args={[0.1, 0.15, object.properties?.length || 200]} />
              <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Sleepers */}
            {Array.from({ length: 40 }).map((_, i) => (
              <mesh key={i} position={[0, -0.1, -100 + i * 5]} castShadow>
                <boxGeometry args={[2, 0.2, 0.3]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
            ))}
          </group>
        );
      
      case 'metro_train':
      case 'train':
        const trainLength = (object.properties?.carriages || 6) * 20;
        return (
          <group>
            {Array.from({ length: object.properties?.carriages || 6 }).map((_, i) => (
              <mesh key={i} position={[0, 2, i * 20 - trainLength/2]} castShadow>
                <boxGeometry args={[2.8, 3.5, 18]} />
                <meshStandardMaterial 
                  color={object.properties?.color || '#0066cc'} 
                  metalness={0.6} 
                  roughness={0.4} 
                />
              </mesh>
            ))}
            {/* Front of train */}
            <mesh position={[0, 2, -trainLength/2 - 10]} castShadow>
              <boxGeometry args={[2.8, 3.5, 2]} />
              <meshStandardMaterial color={object.properties?.color || '#0066cc'} />
            </mesh>
          </group>
        );
      
      case 'escalator':
        return (
          <group>
            {/* Escalator structure */}
            <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 6, 0, 0]} castShadow>
              <boxGeometry args={[1.2, 0.1, 10]} />
              <meshStandardMaterial color="#888888" metalness={0.7} />
            </mesh>
            {/* Steps */}
            {Array.from({ length: 20 }).map((_, i) => (
              <mesh 
                key={i} 
                position={[0, 0.3 + i * 0.15, -4.5 + i * 0.5]} 
                rotation={[Math.PI / 6, 0, 0]}
                castShadow
              >
                <boxGeometry args={[1, 0.05, 0.4]} />
                <meshStandardMaterial color="#666666" />
              </mesh>
            ))}
          </group>
        );
      
      case 'electric_pole':
        return (
          <group>
            {/* Pole */}
            <mesh position={[0, object.properties?.height/2 || 4, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.2, object.properties?.height || 8, 8]} />
              <meshStandardMaterial color="#777777" metalness={0.5} />
            </mesh>
            {/* Crossbar */}
            <mesh position={[0, object.properties?.height || 8, 0]} castShadow>
              <boxGeometry args={[3, 0.2, 0.2]} />
              <meshStandardMaterial color="#888888" metalness={0.6} />
            </mesh>
            {/* Wires */}
            {[-1, 0, 1].map((offset, i) => (
              <mesh key={i} position={[offset, object.properties?.height || 8, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 50, 6]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
            ))}
          </group>
        );
      
      case 'building':
      case 'station_building':
        const floors = object.properties?.floors || 2;
        return (
          <mesh position={[0, floors * 1.5, 0]} castShadow>
            <boxGeometry args={[20, floors * 3, 30]} />
            <meshStandardMaterial color="#d4d4d4" />
          </mesh>
        );
      
      case 'canopy':
        return (
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[12, 0.1, 220]} />
            <meshStandardMaterial 
              color="#88ccff" 
              transparent 
              opacity={0.4} 
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      
      default:
        // Default fallback box
        return (
          <mesh castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#ff00ff" wireframe />
          </mesh>
        );
    }
  };

  return (
    <group
      ref={groupRef}
      position={object.position || [0, 0, 0]}
      rotation={object.rotation || [0, 0, 0]}
      scale={object.scale || [1, 1, 1]}
    >
      {model ? (
        <primitive object={model} />
      ) : (
        renderProceduralGeometry()
      )}
    </group>
  );
};

/**
 * SceneRenderer - Main component that renders a complete scene
 */
export const SceneRenderer = ({ scene, visible = true }) => {
  const [loadedModels, setLoadedModels] = useState(new Set());
  const [failedModels, setFailedModels] = useState(new Set());

  const handleModelLoad = (objectId) => {
    setLoadedModels(prev => new Set([...prev, objectId]));
  };

  const handleModelError = (objectId, error) => {
    console.warn(`Model ${objectId} failed to load, using fallback geometry`);
    setFailedModels(prev => new Set([...prev, objectId]));
  };

  if (!visible || !scene) return null;

  return (
    <group name={`scene-${scene.id}`}>
      {/* Ambient Light */}
      {scene.lighting?.ambient && (
        <ambientLight 
          intensity={scene.lighting.ambient.intensity} 
          color={scene.lighting.ambient.color} 
        />
      )}

      {/* Directional Light */}
      {scene.lighting?.directional && (
        <directionalLight
          intensity={scene.lighting.directional.intensity}
          color={scene.lighting.directional.color}
          position={scene.lighting.directional.position}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
      )}

      {/* Point Lights */}
      {scene.lighting?.point_lights?.map((light, index) => (
        <pointLight
          key={`point-light-${index}`}
          position={light.position}
          intensity={light.intensity}
          color={light.color}
          distance={50}
          castShadow
        />
      ))}

      {/* Scene Objects */}
      {scene.objects?.map((obj) => (
        <SceneObject
          key={obj.id}
          object={obj}
          onLoad={handleModelLoad}
          onError={handleModelError}
        />
      ))}

      {/* Ground plane for shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <shadowMaterial opacity={0.3} />
      </mesh>
    </group>
  );
};

export default SceneRenderer;
