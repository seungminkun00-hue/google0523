import React, { useRef, useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Factory, Activity, Zap, ThermometerSun, Droplets, Bell,
  Bot, Wind, BarChart3, User, ChevronRight, AlertTriangle, CheckCircle2
} from 'lucide-react';

// --- 로봇팔 부모 노드 이름 목록 ---
const ARM_PARENT_NAMES = [
  'Arm', 'Arm_2.001', 'Arm_4.001', 'Arm_6.001',
  'Arm_8', 'Arm_10', 'Arm_12', 'Arm_14'
];

// 상수 제거됨 (컴포넌트 내부로 이동)

// --- 3D 공장 모델 컴포넌트 ---
const FactoryModel = ({ onArmClick, isAnomaly }) => {
  const { scene } = useGLTF(import.meta.env.BASE_URL + 'factory.glb');
  const groupRef = useRef();
  const [hoveredArm, setHoveredArm] = useState(null);
  const originalMaterials = useRef(new Map());

  // 모델 스케일 및 위치 조정
  const { adjustedPosition, modelScale } = useMemo(() => {
    // 핫 리로드(새로고침) 시 이미 변형된 객체의 바운딩 박스를 중복 계산하여 
    // 화면 밖으로 날아가는 현상을 방지하기 위해 트랜스폼을 항상 초기화합니다.
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);
    scene.scale.set(1, 1, 1);
    scene.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 32;
    const s = targetSize / maxDim;
    const yOffset = -box.min.y * s;
    return {
      adjustedPosition: [-center.x * s, yOffset, -center.z * s],
      modelScale: s
    };
  }, [scene]);

  // ARM 그룹 노드 찾기
  const armGroups = useMemo(() => {
    const groups = [];
    scene.traverse((child) => {
      if (ARM_PARENT_NAMES.includes(child.name)) {
        groups.push(child);
      }
    });
    return groups;
  }, [scene]);

  // 전체 재질 초기화 (1회 실행)
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        const name = child.name.toLowerCase();

        // 1. acryl 및 panel 투명화 처리
        if (name.includes('acryl') || name.includes('panel')) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.1;
          child.material.side = THREE.DoubleSide;
          child.raycast = () => null; // 마우스 이벤트 통과
          return;
        }

        // 2. 로봇팔인지 판별
        let isArm = false;
        let current = child;
        while (current) {
          if (armGroups.includes(current)) {
            isArm = true;
            break;
          }
          current = current.parent;
        }

        if (isArm) {
          // 로봇팔 기본 스킨 (발광 효과 제거, 메탈 오렌지)
          if (!originalMaterials.current.has(child.uuid)) {
            const customMat = child.material.clone();
            customMat.color = new THREE.Color('#F5A623');
            customMat.emissive = new THREE.Color('#000000');
            customMat.metalness = 0.5;
            customMat.roughness = 0.3;
            originalMaterials.current.set(child.uuid, customMat);
            child.material = customMat;
          }
        } else {
          // 3. 나머지 모든 공장 오브젝트 (은은한 은색)
          child.material = child.material.clone();
          child.material.color = new THREE.Color('#b0b5b9');
          child.material.metalness = 0.5;
          child.material.roughness = 0.4;
          child.material.emissive = new THREE.Color('#000000');
        }
      }
    });
  }, [scene, armGroups]);

  const dangerMaterials = useRef([]);

  // 호버 및 위험환경 하이라이트
  useEffect(() => {
    dangerMaterials.current = [];
    armGroups.forEach((armGroup, idx) => {
      armGroup.traverse((child) => {
        if (child.isMesh) {
          const name = child.name.toLowerCase();
          if (!name.includes('acryl') && !name.includes('panel')) {
            if (isAnomaly && idx === 0) { // 1번째 로봇 (HD-6X-200) 붉은 발광
              child.material = child.material.clone();
              child.material.color = new THREE.Color('#FF3B30');
              child.material.emissive = new THREE.Color('#FF3B30');
              child.material.emissiveIntensity = 1.5;
              dangerMaterials.current.push(child.material);
            } else if (hoveredArm === idx) {
              child.material = child.material.clone();
              child.material.emissive = new THREE.Color('#00F0FF'); // 호버 시 더 밝은 청록색
              child.material.emissiveIntensity = 0.8;
            } else {
              const orig = originalMaterials.current.get(child.uuid);
              if (orig) {
                child.material = orig.clone();
              }
            }
          }
        }
      });
    });
  }, [hoveredArm, armGroups, isAnomaly]);

  // 클릭 핸들러 - ARM 파트 클릭 감지
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    const clickedObj = e.object;
    // 클릭된 오브젝트의 부모 체인에서 ARM 그룹을 찾기
    let current = clickedObj;
    while (current) {
      const armIndex = armGroups.indexOf(current);
      if (armIndex !== -1) {
        onArmClick(armIndex + 1); // 1-indexed
        return;
      }
      // 이름으로도 체크
      if (ARM_PARENT_NAMES.includes(current.name)) {
        const idx = ARM_PARENT_NAMES.indexOf(current.name);
        onArmClick(idx + 1);
        return;
      }
      current = current.parent;
    }
  }, [armGroups, onArmClick]);

  const handlePointerOver = useCallback((e) => {
    e.stopPropagation();
    let current = e.object;
    while (current) {
      const armIndex = armGroups.indexOf(current);
      if (armIndex !== -1) {
        setHoveredArm(armIndex);
        document.body.style.cursor = 'pointer';
        return;
      }
      if (ARM_PARENT_NAMES.includes(current.name)) {
        setHoveredArm(ARM_PARENT_NAMES.indexOf(current.name));
        document.body.style.cursor = 'pointer';
        return;
      }
      current = current.parent;
    }
  }, [armGroups]);

  const handlePointerOut = useCallback(() => {
    setHoveredArm(null);
    document.body.style.cursor = 'default';
  }, []);

  // 로봇팔 관절 애니메이션용 노드 수집
  const armJoints = useMemo(() => {
    const joints = [];
    armGroups.forEach(group => {
      const rig = {};
      group.traverse(child => {
        const name = child.name || '';
        // 기본 회전축 및 관절들 찾기
        if (name.includes('Arm_1.') || (name.startsWith('Arm_1') && !name.includes('bolt'))) rig.base = child;
        if (name.startsWith('Rig_Arm_2')) rig.joint2 = child;
        if (name.startsWith('Rig_Arm_3')) rig.joint3 = child;
        if (name.startsWith('Rig_Arm_4')) rig.joint4 = child;
      });
      joints.push(rig);
    });
    return joints;
  }, [armGroups]);

  // 애니메이션 적용
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    armJoints.forEach((rig, i) => {
      const phase = i * (Math.PI / 4); // 로봇마다 움직임 위상차
      
      // 베이스 회전 (Yaw)
      if (rig.base) {
        rig.base.rotation.y = Math.sin(t * 0.8 + phase) * 0.6;
      }
      // 관절 1 (Pitch)
      if (rig.joint2) {
        rig.joint2.rotation.z = Math.sin(t * 1.2 + phase) * 0.3 - 0.2;
      }
      // 관절 2 (Pitch)
      if (rig.joint3) {
        rig.joint3.rotation.z = Math.cos(t * 1.0 + phase) * 0.4 + 0.1;
      }
      // 손목 회전 (Roll/Pitch)
      if (rig.joint4) {
        rig.joint4.rotation.x = Math.sin(t * 1.5 + phase) * 0.5;
      }
    });

    // 위험 환경 깜빡임 효과 (Blink)
    if (dangerMaterials.current.length > 0) {
      // 강한 깜빡임을 위해 0 ~ 2.0 사이로 진동
      const intensity = Math.max(0, Math.sin(t * 10)) * 2.0; 
      dangerMaterials.current.forEach(mat => {
        mat.emissiveIntensity = intensity;
      });
    }
  });

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        scale={modelScale}
        position={adjustedPosition}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
    </group>
  );
};

// --- 바닥 그리드 ---
const GroundPlane = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
    <planeGeometry args={[60, 60]} />
    <meshStandardMaterial color="#060d1f" transparent opacity={0.5} />
  </mesh>
);

// --- 위젯 카드 컴포넌트 ---
const WidgetCard = ({ children, delay = '0s', onClick, style = {} }) => (
  <div
    className="card animate-slide-up"
    style={{ animationDelay: delay, cursor: onClick ? 'pointer' : 'default', ...style }}
    onClick={onClick}
  >
    {children}
  </div>
);

// --- 메인 공장 맵 컴포넌트 ---
const FactoryMap = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scale, setScale] = useState(1);
  const [isAnomaly, setIsAnomaly] = useState(() => sessionStorage.getItem('isAnomaly') === 'true');

  useEffect(() => {
    sessionStorage.setItem('isAnomaly', isAnomaly);
  }, [isAnomaly]);

  // 실시간 데이터 시뮬레이션
  const [simData, setSimData] = useState({
    totalPower: 142,
    activeLines: 4,
    totalLines: 4,
    todayProduction: 847,
    targetProduction: 900,
    temperature: 23.4,
    humidity: 45,
    dust: 12,
    avgUptime: 91.2,
  });

  // 상태 데이터 조합
  const factoryData = {
    ...simData,
    normalCount: isAnomaly ? 7 : 8,
    warningCount: 0,
    dangerCount: isAnomaly ? 1 : 0,
  };

  const ALERTS = isAnomaly ? [
    { type: 'danger', msg: '1라인 HD-6X-200 모터 온도 급격 상승 (98°C)', time: '방금 전' },
    { type: 'danger', msg: '1라인 HD-6X-200 비정상 진동 감지', time: '1분 전' },
    { type: 'info', msg: '2라인 정기 점검 완료', time: '15분 전' },
    { type: 'info', msg: '4라인 생산 목표 달성 (100%)', time: '1시간 전' },
  ] : [
    { type: 'info', msg: '1라인 정상 가동 중', time: '방금 전' },
    { type: 'info', msg: '2라인 정기 점검 완료', time: '15분 전' },
    { type: 'info', msg: '4라인 생산 목표 달성 (100%)', time: '1시간 전' },
  ];

  const ROBOT_LIST = [
    { id: 1, name: 'HD-6X-200', line: '1라인', status: isAnomaly ? 'danger' : 'normal', task: 'Palletizing', uptime: '94.2%' },
    { id: 2, name: 'HD-6X-201', line: '1라인', status: 'normal', task: 'Welding', uptime: '91.8%' },
    { id: 3, name: 'HD-6X-202', line: '2라인', status: 'normal', task: 'Assembly', uptime: '87.3%' },
    { id: 4, name: 'HD-6X-203', line: '2라인', status: 'normal', task: 'Painting', uptime: '96.1%' },
    { id: 5, name: 'HD-6X-204', line: '3라인', status: 'normal', task: 'Inspection', uptime: '93.5%' },
    { id: 6, name: 'HD-6X-205', line: '3라인', status: 'normal', task: 'Welding', uptime: '78.2%' },
    { id: 7, name: 'HD-6X-206', line: '4라인', status: 'normal', task: 'Palletizing', uptime: '95.7%' },
    { id: 8, name: 'HD-6X-207', line: '4라인', status: 'normal', task: 'Assembly', uptime: '92.4%' },
  ];

  // 스케일러
  useEffect(() => {
    const handleResize = () => {
      const wScale = window.innerWidth / 1920;
      const hScale = window.innerHeight / 1080;
      setScale(Math.min(wScale, hScale));
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 실시간 데이터 변동
  useEffect(() => {
    const interval = setInterval(() => {
      setSimData(prev => ({
        ...prev,
        totalPower: 142 + (Math.random() - 0.5) * 10,
        todayProduction: prev.todayProduction + (Math.random() > 0.7 ? 1 : 0),
        temperature: 23.4 + (Math.random() - 0.5) * 2,
        humidity: 45 + (Math.random() - 0.5) * 4,
        dust: 12 + (Math.random() - 0.5) * 3,
        avgUptime: 91.2 + (Math.random() - 0.5) * 1,
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // ARM 클릭 → 로봇 상세 페이지 이동
  const handleArmClick = useCallback((armId) => {
    navigate(`/machine/${armId}`, { state: { isAnomaly } });
  }, [navigate, isAnomaly]);

  const productionRate = ((factoryData.todayProduction / factoryData.targetProduction) * 100).toFixed(1);

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#020712',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {/* 배경 글로우 */}
      <div style={{
        position: 'absolute', top: '5%', left: '10%', width: '700px', height: '700px',
        borderRadius: '50%', background: '#001443', filter: 'blur(80px)', zIndex: 0,
        animation: 'float1 20s infinite ease-in-out'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%', width: '900px', height: '900px',
        borderRadius: '50%', background: '#006FF5', filter: 'blur(117px)', opacity: 0.4, zIndex: 0,
        animation: 'float2 25s infinite ease-in-out'
      }} />
      <div style={{
        position: 'absolute', top: '40%', left: '30%', width: '500px', height: '500px',
        borderRadius: '50%', background: '#001443', filter: 'blur(90px)', opacity: 0.5, zIndex: 0,
        animation: 'float1 22s infinite ease-in-out reverse'
      }} />

      {/* 1920x1080 컨테이너 */}
      <div style={{
        width: '1920px',
        height: '1080px',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: '0 40px 30px 40px'
      }}>
        {/* --- 헤더 --- */}
        <div style={{
          height: '90px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src={import.meta.env.BASE_URL + "hyundai_logo.png"} alt="Hyundai" style={{ height: '36px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          </div>

          <div style={{ display: 'flex', backgroundColor: '#0B1A30', padding: '6px', borderRadius: '30px', gap: '5px' }}>
            {['Map', 'Machine', 'Mechanic', 'Stock'].map((item) => (
              <button
                key={item}
                onClick={() => {
                  if (item === 'Machine') navigate('/machine/1', { state: { isAnomaly } });
                }}
                style={{
                  background: item === 'Map' ? '#1E3A8A' : 'transparent',
                  color: item === 'Map' ? '#fff' : '#718096',
                  border: 'none',
                  padding: '10px 28px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <button
              className={`yellow-btn ${isAnomaly ? 'danger' : ''}`}
              onClick={() => setIsAnomaly(!isAnomaly)}
            >
              {isAnomaly ? '상태 초기화 (Normal)' : '가상 위험환경 변환'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>송승민</span>
                <span style={{ fontSize: '0.75rem', color: '#718096' }}>Manager</span>
              </div>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={24} color="#CBD5E1" />
              </div>
            </div>
          </div>
        </div>

        {/* --- 콘텐츠 영역 --- */}
        <div style={{ display: 'flex', flex: 1, gap: '20px', minHeight: 0 }}>

          {/* 좌측 위젯 패널 */}
          <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>

            {/* 공장 가동 현황 */}
            <WidgetCard delay="0.1s">
              <div className="card-title"><Factory size={18} color="#007AFF" /> 공장 가동 현황</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flex: 1, padding: '5px 0' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#007AFF" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - factoryData.avgUptime / 100)}
                      transform="rotate(-90 50 50)"
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{factoryData.avgUptime.toFixed(1)}</div>
                    <div style={{ fontSize: '0.65rem', color: '#718096' }}>%</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#718096' }}>가동 라인</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{factoryData.activeLines}<span style={{ fontSize: '0.8rem', color: '#718096' }}>/{factoryData.totalLines}</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#718096' }}>총 장비</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>8<span style={{ fontSize: '0.8rem', color: '#718096' }}>대</span></div>
                  </div>
                </div>
              </div>
            </WidgetCard>

            {/* 금일 생산량 */}
            <WidgetCard delay="0.2s">
              <div className="card-title"><BarChart3 size={18} color="#34C759" /> 금일 생산량</div>
              <div style={{ padding: '5px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '2rem', fontWeight: 800 }}>{factoryData.todayProduction}</span>
                    <span style={{ fontSize: '0.9rem', color: '#718096', marginLeft: '4px' }}>/ {factoryData.targetProduction}</span>
                  </div>
                  <span style={{
                    fontSize: '0.85rem', fontWeight: 700,
                    color: parseFloat(productionRate) >= 90 ? '#34C759' : '#F5A623'
                  }}>
                    {productionRate}%
                  </span>
                </div>
                <div className="progress-bg" style={{ height: '8px', borderRadius: '4px' }}>
                  <div className="progress-fill" style={{
                    width: `${Math.min(parseFloat(productionRate), 100)}%`,
                    background: parseFloat(productionRate) >= 90 ? '#34C759' : '#F5A623',
                    borderRadius: '4px',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: '#718096' }}>
                  <span>전일 대비 +12대</span>
                  <span>목표 {factoryData.targetProduction}대</span>
                </div>
              </div>
            </WidgetCard>

            {/* 장비 상태 요약 */}
            <WidgetCard delay="0.3s">
              <div className="card-title"><Activity size={18} color="#00F0FF" /> 장비 상태 요약</div>
              <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(52,199,89,0.12)', border: '1px solid rgba(52,199,89,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                    <CheckCircle2 size={22} color="#34C759" />
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34C759' }}>{factoryData.normalCount}</div>
                  <div style={{ fontSize: '0.7rem', color: '#718096' }}>정상</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                    <AlertTriangle size={22} color="#F5A623" />
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F5A623' }}>{factoryData.warningCount}</div>
                  <div style={{ fontSize: '0.7rem', color: '#718096' }}>주의</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                    <AlertTriangle size={22} color="#FF3B30" />
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FF3B30' }}>{factoryData.dangerCount}</div>
                  <div style={{ fontSize: '0.7rem', color: '#718096' }}>위험</div>
                </div>
              </div>
            </WidgetCard>

            {/* 에너지 소비 */}
            <WidgetCard delay="0.4s" style={{ flex: 1 }}>
              <div className="card-title"><Zap size={18} color="#F5A623" /> 에너지 소비</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '5px 0' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#718096', marginBottom: '4px' }}>현재 총 전력</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                    {factoryData.totalPower.toFixed(0)} <span style={{ fontSize: '0.9rem', color: '#718096', fontWeight: 400 }}>kW</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '0.65rem', color: '#718096' }}>일간 평균</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>138 kW</div>
                  </div>
                  <div style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '0.65rem', color: '#718096' }}>일간 피크</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>168 kW</div>
                  </div>
                </div>
              </div>
            </WidgetCard>
          </div>

          {/* 중앙 3D 공장 모델 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
            <div className="card no-hover animate-slide-up" style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              padding: 0,
              animationDelay: '0.2s',
              background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {/* 글로우 */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '80%', height: '80%',
                background: 'radial-gradient(circle, rgba(0, 122, 255, 0.2) 0%, transparent 70%)',
                filter: 'blur(50px)', zIndex: 0, pointerEvents: 'none'
              }} />

              {/* 라벨 오버레이 */}
              <div style={{
                position: 'absolute', top: '24px', left: '28px', zIndex: 10,
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <Factory size={20} color="#007AFF" />
                <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>공장 3D 뷰</span>
                <span style={{ fontSize: '0.75rem', color: '#718096', marginLeft: '8px' }}>로봇팔을 클릭하면 상세 페이지로 이동합니다</span>
              </div>

              {/* 라인 라벨 */}
              <div className="floating-overlay" style={{ position: 'absolute', bottom: '24px', left: '28px', zIndex: 10 }}>
                <div style={{ fontSize: '0.75rem', color: '#718096' }}>생산 라인</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>4개 라인 · 8대 로봇</div>
              </div>

              <div className="floating-overlay" style={{ position: 'absolute', bottom: '24px', right: '28px', zIndex: 10 }}>
                <div style={{ fontSize: '0.75rem', color: '#718096' }}>실시간 상태</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34C759' }}>● 정상 가동</div>
              </div>

              {/* 3D Canvas */}
              <Canvas
                camera={{ position: [15, 12, 15], fov: 45 }}
                gl={{ alpha: true, antialias: true }}
                resize={{ offsetSize: true }}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}
              >
                <ambientLight intensity={1.0} color="#ffffff" />
                <directionalLight position={[20, 20, 10]} intensity={1.8} color="#e0eaff" />
                <directionalLight position={[-15, 10, -10]} intensity={0.6} color="#0088ff" />
                <pointLight position={[0, 15, 0]} intensity={0.5} color="#007AFF" />
                <Suspense fallback={null}>
                  <FactoryModel onArmClick={handleArmClick} isAnomaly={isAnomaly} />
                  <GroundPlane />
                </Suspense>
                <OrbitControls
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  minDistance={5}
                  maxDistance={40}
                  maxPolarAngle={Math.PI / 2.2}
                  target={[0, 2, 0]}
                />
              </Canvas>
            </div>

            {/* 하단 상태 바 */}
            <div className="animate-slide-up" style={{
              display: 'flex', gap: '16px', animationDelay: '0.6s'
            }}>
              {[
                { label: '가동 라인', value: `${factoryData.activeLines}/${factoryData.totalLines}`, color: '#007AFF' },
                { label: '금일 생산', value: `${factoryData.todayProduction}대`, color: '#34C759' },
                { label: '평균 가동률', value: `${factoryData.avgUptime.toFixed(1)}%`, color: '#00F0FF' },
                { label: '총 전력', value: `${factoryData.totalPower.toFixed(0)} kW`, color: '#F5A623' },
                { label: '정상 장비', value: `${factoryData.normalCount}/8`, color: '#34C759' },
                { label: '환경 온도', value: `${factoryData.temperature.toFixed(1)}°C`, color: '#8ab4f8' },
              ].map((item, i) => (
                <div key={i} style={{
                  flex: 1, padding: '14px 16px',
                  background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)',
                  backdropFilter: 'blur(45px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                  <div style={{ fontSize: '0.68rem', color: '#718096' }}>{item.label}</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 우측 위젯 패널 */}
          <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>

            {/* 알림/이벤트 */}
            <WidgetCard delay="0.3s">
              <div className="card-title"><Bell size={18} color="#F5A623" /> 알림</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ALERTS.map((alert, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px',
                    background: alert.type === 'danger' ? 'rgba(255,59,48,0.06)' : 'rgba(255,255,255,0.03)',
                    borderRadius: '10px',
                    border: `1px solid ${alert.type === 'danger' ? 'rgba(255,59,48,0.15)' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                      background: alert.type === 'danger' ? '#FF3B30' : '#007AFF'
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.msg}</div>
                      <div style={{ fontSize: '0.65rem', color: '#718096' }}>{alert.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </WidgetCard>

            {/* 로봇 목록 */}
            <WidgetCard delay="0.4s" style={{ flex: 1, overflow: 'hidden' }}>
              <div className="card-title"><Bot size={18} color="#007AFF" /> 로봇 목록</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1 }}>
                {ROBOT_LIST.map((robot) => (
                  <div
                    key={robot.id}
                    onClick={() => navigate(`/machine/${robot.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(0,122,255,0.08)';
                      e.currentTarget.style.borderColor = 'rgba(0,122,255,0.2)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                    }}
                  >
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                      background: robot.status === 'normal' ? '#34C759' : robot.status === 'warning' ? '#F5A623' : '#FF3B30'
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{robot.name}</div>
                      <div style={{ fontSize: '0.65rem', color: '#718096' }}>{robot.line} · {robot.task}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#718096' }}>{robot.uptime}</div>
                    <ChevronRight size={14} color="#718096" />
                  </div>
                ))}
              </div>
            </WidgetCard>

            {/* 환경 모니터링 */}
            <WidgetCard delay="0.5s">
              <div className="card-title"><Wind size={18} color="#8ab4f8" /> 환경 모니터링</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
                  <ThermometerSun size={20} color="#F5A623" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{factoryData.temperature.toFixed(1)}°</div>
                  <div style={{ fontSize: '0.65rem', color: '#718096' }}>온도</div>
                </div>
                <div style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
                  <Droplets size={20} color="#007AFF" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{factoryData.humidity.toFixed(0)}%</div>
                  <div style={{ fontSize: '0.65rem', color: '#718096' }}>습도</div>
                </div>
                <div style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
                  <Wind size={20} color="#8ab4f8" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{factoryData.dust.toFixed(0)}</div>
                  <div style={{ fontSize: '0.65rem', color: '#718096' }}>미세먼지</div>
                </div>
              </div>
            </WidgetCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FactoryMap;
