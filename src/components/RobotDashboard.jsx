import React, { useRef, useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useGLTF, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Circle, ShieldAlert, User, MapPin, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

// --- 부품 정보 데이터베이스 ---
const PART_INFO_DB = [
  { name: '감속기 베어링', partNo: 'BRG-6X-001', status: '마모 경고', lastMaint: '2026-04-15', remainLife: '12시간', desc: '진동 수치 초과 감지. 즉각 교체 권장.' },
  { name: 'Z축 서보모터', partNo: 'MTR-Z6-003', status: '과열 주의', lastMaint: '2026-05-01', remainLife: '48시간', desc: '온도 센서 85°C 초과. 냉각 계통 점검 필요.' },
  { name: '그리스 주입구', partNo: 'GRS-INJ-007', status: '윤활 부족', lastMaint: '2026-03-20', remainLife: '24시간', desc: '윤활유 잔량 5% 미만. 보충 필요.' },
  { name: '손목 관절 기어', partNo: 'GER-WR-012', status: '기어 마모', lastMaint: '2026-04-28', remainLife: '72시간', desc: '기어 치면 마모율 78%. 교체 일정 수립 필요.' },
  { name: '케이블 하네스', partNo: 'CBL-HRN-005', status: '피복 손상', lastMaint: '2026-05-10', remainLife: '96시간', desc: '외피 마모 감지. 차기 정비 시 교체 예정.' },
];

// --- 위젯 상세 모달 더미 데이터 ---
const WIDGET_DETAILS = {
  power: {
    title: '전력 소모량 상세',
    items: [
      { label: '현재 소비 전력', value: '25 kW' },
      { label: '오늘 평균', value: '23.4 kW' },
      { label: '주간 평균', value: '22.8 kW' },
      { label: '월간 최대', value: '42.1 kW (05/03)' },
      { label: '전력 효율 등급', value: 'A등급 (우수)' },
      { label: '예상 월간 요금', value: '₩ 1,240,000' },
    ],
    note: '이전 대비 전력 소모량 3.2% 감소. 에너지 절감 모드 적용 중.'
  },
  temp: {
    title: '온도 모니터링 상세',
    items: [
      { label: '현재 온도', value: '64.2 °C' },
      { label: '오늘 최고', value: '71.8 °C' },
      { label: '오늘 최저', value: '58.3 °C' },
      { label: '경고 임계치', value: '85 °C' },
      { label: '냉각 시스템', value: '정상 작동' },
      { label: '환경 온도', value: '22.1 °C' },
    ],
    note: '온도 추이 안정적. 냉각수 순환 시스템 05/18 점검 완료.'
  },
  motor: {
    title: '4번 모터 회전률 상세',
    items: [
      { label: '현재 RPM', value: '1,420 RPM' },
      { label: '정격 RPM', value: '1,500 RPM' },
      { label: '회전 효율', value: '94.7%' },
      { label: '누적 가동', value: '8,420 시간' },
      { label: '베어링 상태', value: '양호' },
      { label: '다음 점검일', value: '2026-06-15' },
    ],
    note: 'RPM 편차 ±2% 이내 정상 범위. 이전 부하 테스트 05/14 통과.'
  },
  maintenance: {
    title: '수리 정비 이력 상세',
    items: [
      { label: '2026-05-12', value: '정기 점검 - 초음파 진단, 이상 없음' },
      { label: '2026-04-28', value: '부품 교체 - Z축 베어링 교체' },
      { label: '2026-04-15', value: '정기 점검 - 그리스 보충' },
      { label: '2026-03-20', value: '정기 점검 - 케이블 및 커넥터 점검' },
      { label: '2026-03-05', value: '긴급 수리 - 엔코더 오류 수정' },
      { label: '2026-02-18', value: '정기 점검 - 전체 종합 점검' },
    ],
    note: '정비 주기: 2주 1회. 다음 예정일: 2026-05-26'
  },
  mechanic: {
    title: '담당 정비사 상세',
    items: [
      { label: '담당자 1', value: '김호진 (주간)' },
      { label: '자격증', value: '로봇공학기사 1급' },
      { label: '담당 기간', value: '2024-03 ~ 현재' },
      { label: '담당자 2', value: '이철민 (야간)' },
      { label: '자격증', value: '메카트로닉스기사 2급' },
      { label: '비상 연락', value: '010-XXXX-4582' },
    ],
    note: '긴급 상황 시 관제실 내선 1577 또는 비상 연락망 사용'
  },
  aiHealth: {
    title: 'AI 진단 건강도 상세',
    items: [
      { label: '종합 건강도', value: '95%' },
      { label: '모터 상태', value: '양호 (97%)' },
      { label: '감속기 상태', value: '주의 (82%)' },
      { label: '전장 상태', value: '양호 (99%)' },
      { label: '예측 고장일', value: '2026-07-22 (예상)' },
      { label: 'AI 모델 버전', value: 'v3.2.1 (2026-05-01)' },
    ],
    note: '지난 30일 기반 학습 데이터 반영. 감속기 베어링 마모 트렌드 감지.'
  },
  robot: {
    title: 'HD-6X-200 상세 스펙',
    items: [
      { label: '모델명', value: 'HD-6X-200' },
      { label: '시리얼', value: 'HRC-2024-00482' },
      { label: '최대 가반 하중', value: '200 kg' },
      { label: '최대 도달 반경', value: '2,850 mm' },
      { label: '반복 정밀도', value: '±0.05 mm' },
      { label: '설치일', value: '2024-02-15' },
    ],
    note: '누적 가동 1,334시간. 가동률 94.2%, 현재 작업: Palletizing'
  },
  consumables: {
    title: '주요 소모품 잔여 수명 상세',
    items: [
      { label: 'Grease (윤활유)', value: '75% 남음 - 2026-08예상 교체' },
      { label: 'Z-6 Motor', value: '82% 남음 - 2026-09 예상 교체' },
      { label: 'Over Roller', value: '96% 남음 - 2027-01 예상 교체' },
      { label: '쿠링팬', value: '88% 남음 - 2026-11 예상 교체' },
      { label: '전원 케이블', value: '91% 남음 - 2026-12 예상 교체' },
      { label: '신호 케이블', value: '94% 남음 - 2027-02 예상 교체' },
    ],
    note: '소모품 자동 발주 시스템 연동 중. 잔량 20% 이하 시 자동 발주.'
  }
};

// --- 3D 로봇 암 컴포넌트 (무광 회색, 이상 시 파트별 깜박) ---
const RobotArm = ({ isAnomaly, onPartClick }) => {
  const { scene: obj } = useGLTF('/Rmk3.glb');
  const groupRef = useRef(null);
  const meshesRef = useRef([]);
  const flashingPartsRef = useRef([]);
  const clockRef = useRef(0);

  // 모델 로드 후 바닥에 정렬 (bounding box 기반)
  const { adjustedPosition, modelScale } = useMemo(() => {
    // 핫 리로드(새로고침) 시 이미 변형된 객체의 바운딩 박스를 중복 계산하여 
    // 화면 밖으로 날아가는 현상을 방지하기 위해 트랜스폼을 항상 초기화합니다.
    obj.position.set(0, 0, 0);
    obj.rotation.set(0, 0, 0);
    obj.scale.set(1, 1, 1);
    obj.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 2.5;
    const s = targetSize / maxDim;
    const yOffset = -box.min.y * s - 0.15;
    return {
      adjustedPosition: [-center.x * s, yOffset, -center.z * s],
      modelScale: s
    };
  }, [obj]);

  // 원본 재질을 무시하고, 고품질 물리 기반 렌더링(PBR) 재질로 강제 덮어씌움
  useEffect(() => {
    const meshes = [];
    obj.traverse((child) => {
      if (child.isMesh) {
        // 모델의 각진 폴리곤(저폴리곤 느낌)을 부드럽게 깎아주는 스무딩(Smooth Shading) 강제 적용
        if (child.geometry) {
          child.geometry.computeVertexNormals();
        }

        // 조명에 뚜렷하게 반응하도록 너무 높은 금속성을 낮추고, 
        // 텍스처 없이도 조명 명암이 잘 보이게 설정
        child.material = new THREE.MeshStandardMaterial({
          color: 0x94a3b8, // 약간 푸른빛이 도는 세련된 은회색 (string 대신 hex 사용)
          roughness: 0.4,  // 너무 거칠지 않게 하여 빛 반사(명암) 유도
          metalness: 0.3,  // 환경맵 로드 실패 시 새까매지지 않도록 적당히 낮춤
        });
        
        child.castShadow = true;
        child.receiveShadow = true;

        child.userData.originalColor = new THREE.Color(0x94a3b8);
        child.userData.originalEmissive = new THREE.Color(0x000000);
        
        child.userData.partIndex = meshes.length;
        meshes.push(child);
      }
    });
    meshesRef.current = meshes;
  }, [obj]);

  // 위험환경 전환 시 무작위 파트 선택 (최대 2부위)
  useEffect(() => {
    if (isAnomaly && meshesRef.current.length > 0) {
      const meshes = meshesRef.current;
      const numFlashing = Math.min(meshes.length, 2);
      const shuffled = [...meshes].sort(() => Math.random() - 0.5);
      flashingPartsRef.current = shuffled.slice(0, numFlashing);
      // 비깜박 파트는 원래 색 유지
      meshes.forEach(mesh => {
        if (!flashingPartsRef.current.includes(mesh) && mesh.material) {
          if (mesh.userData.originalColor) mesh.material.color.copy(mesh.userData.originalColor);
          if (mesh.userData.originalEmissive) mesh.material.emissive.copy(mesh.userData.originalEmissive);
        }
      });
    } else {
      flashingPartsRef.current = [];
      clockRef.current = 0;
      meshesRef.current.forEach(mesh => {
        if (mesh.material) {
          if (mesh.userData.originalColor) mesh.material.color.copy(mesh.userData.originalColor);
          if (mesh.userData.originalEmissive) mesh.material.emissive.copy(mesh.userData.originalEmissive);
        }
      });
    }
  }, [isAnomaly]);

  // 깜박임 애니메이션 (useFrame)
  useFrame((state, delta) => {
    if (isAnomaly && flashingPartsRef.current.length > 0) {
      clockRef.current += delta;
      flashingPartsRef.current.forEach((mesh, idx) => {
        const phase = clockRef.current * 3 + idx * 1.2;
        const flash = Math.sin(phase) > 0;
        if (flash && mesh.material) {
          mesh.material.color.set('#FF3B30');
          mesh.material.emissive.set(new THREE.Color('#660000'));
        } else if (mesh.material) {
          if (mesh.userData.originalColor) mesh.material.color.copy(mesh.userData.originalColor);
          if (mesh.userData.originalEmissive) mesh.material.emissive.copy(mesh.userData.originalEmissive);
        }
      });
    }
  });

  // 클릭 핸들러 - 깜박이는 파트 클릭 시 모달
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (isAnomaly && e.object && flashingPartsRef.current.includes(e.object)) {
      const partIdx = e.object.userData.partIndex % PART_INFO_DB.length;
      onPartClick({ ...PART_INFO_DB[partIdx], point: e.point });
    }
  }, [isAnomaly, onPartClick]);

  // 마우스 커서 변경 (클릭 가능 파트 위에서)
  const handlePointerOver = useCallback((e) => {
    if (isAnomaly && e.object && flashingPartsRef.current.includes(e.object)) {
      document.body.style.cursor = 'pointer';
    }
  }, [isAnomaly]);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = 'default';
  }, []);

  return (
    <group ref={groupRef}>
      <primitive
        object={obj}
        scale={modelScale}
        position={adjustedPosition}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
    </group>
  );
};

// --- 바닥 그리드 평면 컴포넌트 ---
const GroundPlane = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial
        color="#0a1628"
        transparent
        opacity={0.6}
      />
    </mesh>
  );
};

// --- 위치 맵 그리드 컴포넌트 (피그마 시안 완벽 재현) ---
const LocationMap = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: '10px 0' }}>
      <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        {/* 공장 구역 그리드 시뮬레이션 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 15px)', gap: '10px' }}>
          {Array.from({ length: 24 }).map((_, i) => {
            const isTarget = i === 11; // 피그마 시안의 파란색 타깃 점 위치
            return (
              <div
                key={i}
                style={{
                  width: '15px',
                  height: '15px',
                  borderRadius: '3px',
                  backgroundColor: isTarget ? '#007AFF' : 'rgba(255,255,255,0.1)',
                  boxShadow: isTarget ? '0 0 10px #007AFF' : 'none'
                }}
              />
            );
          })}
        </div>
        {/* 공장 도면 라인 아트 스타일 */}
        <div style={{ width: '200px', height: '100px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', position: 'relative', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ position: 'absolute', top: '10px', left: '10px', width: '40px', height: '80px', borderRight: '1px dashed rgba(255,255,255,0.2)' }} />
          <div style={{ position: 'absolute', top: '40px', right: '10px', width: '120px', height: '40px', borderTop: '1px dashed rgba(255,255,255,0.2)' }} />
          <div style={{ position: 'absolute', top: '25px', left: '70px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#007AFF', boxShadow: '0 0 8px #007AFF' }} />
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: '0.95rem', fontWeight: 700, color: '#A0B0C0' }}>
        의장 2부 3라인 L/B2
      </div>
    </div>
  );
};

// --- 메인 대시보드 컴포넌트 ---
const RobotDashboard = () => {
  const navigate = useNavigate();
  const [isAnomaly, setIsAnomaly] = useState(() => sessionStorage.getItem('isAnomaly') === 'true');

  useEffect(() => {
    sessionStorage.setItem('isAnomaly', isAnomaly);
  }, [isAnomaly]);
  const [scale, setScale] = useState(1);

  // 데이터 수치
  const [power, setPower] = useState(25);
  const [aiHealth, setAiHealth] = useState(95);
  const [vibration, setVibration] = useState(1.2);
  const [current, setCurrent] = useState(15.4);
  const [workflowStep, setWorkflowStep] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(''); // 이메일 입력 상태 추가

  // 부품 클릭 모달 상태
  const [selectedPart, setSelectedPart] = useState(null);

  // 위젯 상세 모달 상태
  const [widgetModal, setWidgetModal] = useState(null);

  // 모터 선택 상태 (1~6번)
  const [selectedMotor, setSelectedMotor] = useState(4);

  // 위험환경 시 문제 영역 랜덤 선택 (power, temp, motor, aiHealth 중 1~2개)
  const [anomalyTargets, setAnomalyTargets] = useState([]);

  // 모달 포털용 컨테이너
  const modalContainerRef = useRef(null);

  // 모터별 더미 데이터
  const motorBaseData = useMemo(() => ({
    1: { rpm: 1520, base: 78 },
    2: { rpm: 1480, base: 74 },
    3: { rpm: 1450, base: 70 },
    4: { rpm: 1420, base: 72 },
    5: { rpm: 1390, base: 68 },
    6: { rpm: 1500, base: 76 },
  }), []);

  // 차트용 데이터 (30포인트 - 주식 그래프 스타일)
  const [tempData, setTempData] = useState(
    Array.from({ length: 30 }, (_, i) => ({ val: 60 + Math.sin(i * 0.5) * 8 + (Math.random() - 0.5) * 4 }))
  );
  const [motorData, setMotorData] = useState(
    Array.from({ length: 30 }, (_, i) => ({ val: 72 + Math.cos(i * 0.4) * 10 + (Math.random() - 0.5) * 5 }))
  );
  const [currentTemp, setCurrentTemp] = useState(64);
  const [currentMotorRpm, setCurrentMotorRpm] = useState(1420);

  // 화면 크기에 맞춘 1920x1080 스케일러
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

  // 실시간 난수 변동 효과 + 차트 데이터 실시간 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setVibration(prev => {
        const base = isAnomaly ? 4.8 : 1.2;
        return base + (Math.random() - 0.5) * 0.2;
      });
      setCurrent(prev => {
        const base = isAnomaly ? 35.2 : 15.4;
        return base + (Math.random() - 0.5) * 0.5;
      });
      setPower(prev => {
        const base = (isAnomaly && anomalyTargets.includes('power')) ? 85 : 25;
        return base + (Math.random() - 0.5) * 2;
      });
      setAiHealth(prev => {
        const base = (isAnomaly && anomalyTargets.includes('aiHealth')) ? 32 : 95;
        return base + (Math.random() - 0.5) * 1;
      });

      // 온도 차트 데이터 실시간 업데이트
      setTempData(prev => {
        const isT = isAnomaly && anomalyTargets.includes('temp');
        const baseTemp = isT ? 88 : 64;
        const newVal = baseTemp + (Math.random() - 0.5) * 12;
        setCurrentTemp(newVal);
        const next = [...prev.slice(1), { val: newVal }];
        return next;
      });

      // 모터 회전률 차트 데이터 실시간 업데이트
      setMotorData(prev => {
        const isM = isAnomaly && anomalyTargets.includes('motor');
        const mBase = motorBaseData[selectedMotor]?.base || 72;
        const baseMotor = isM ? 45 : mBase;
        const newVal = baseMotor + (Math.random() - 0.5) * 20;
        setCurrentMotorRpm(Math.round((motorBaseData[selectedMotor]?.rpm || 1420) + (Math.random() - 0.5) * 40));
        const next = [...prev.slice(1), { val: newVal }];
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isAnomaly, anomalyTargets, selectedMotor, motorBaseData]);

  // 위험환경 전환 시 랜덤하게 문제 영역 선택 + 워크플로우 타이머
  useEffect(() => {
    if (isAnomaly) {
      // 문제 영역 랜덤 선택 (1~2개)
      const allTargets = ['power', 'temp', 'motor', 'aiHealth'];
      const shuffled = allTargets.sort(() => Math.random() - 0.5);
      const numTargets = Math.random() > 0.5 ? 2 : 1;
      setAnomalyTargets(shuffled.slice(0, numTargets));

      setWorkflowStep(0);
      setTimeout(() => setWorkflowStep(1), 1500);
      setTimeout(() => setWorkflowStep(2), 3000);
      setTimeout(() => setWorkflowStep(3), 4500);
    } else {
      setAnomalyTargets([]);
      setWorkflowStep(0);
    }
  }, [isAnomaly]);

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
      {/* 떠다니는 은은한 배경 블러 효과 */}
      <div style={{
        position: 'absolute', top: '5%', left: '10%', width: '700px', height: '700px',
        borderRadius: '50%', background: '#001443', filter: 'blur(80.04px)', zIndex: 0,
        animation: 'float1 20s infinite ease-in-out'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%', width: '900px', height: '900px',
        borderRadius: '883.89px', background: '#006FF5', filter: 'blur(117.43px)', opacity: 0.4, zIndex: 0,
        animation: 'float2 25s infinite ease-in-out'
      }} />
      <div style={{
        position: 'absolute', top: '40%', left: '30%', width: '500px', height: '500px',
        borderRadius: '50%', background: '#001443', filter: 'blur(90px)', opacity: 0.5, zIndex: 0,
        animation: 'float1 22s infinite ease-in-out reverse'
      }} />

      {/* 1920x1080 비율 고정 컨테이너 */}
      <div style={{
        width: '1920px',
        height: '1080px',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        position: 'absolute',
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: '0 40px 40px 40px'
      }}>

        {/* --- 헤더 영역 --- */}
        <div style={{
          height: '100px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          marginBottom: '30px'
        }}>
          {/* 현대 로고 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="/hyundai_logo.png" alt="Hyundai" style={{ height: '36px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          </div>

          {/* 중앙 세그먼트 버튼 */}
          <div style={{ display: 'flex', backgroundColor: '#0B1A30', padding: '6px', borderRadius: '30px', gap: '5px' }}>
            {['Map', 'Machine', 'Mechanic', 'Stock'].map((item) => (
              <button
                key={item}
                className={`segment-btn ${item === 'Machine' ? 'active' : ''}`}
                onClick={() => {
                  if (item === 'Map') navigate('/', { state: { isAnomaly } });
                }}
                style={{
                  background: item === 'Machine' ? '#1E3A8A' : 'transparent',
                  color: item === 'Machine' ? '#fff' : '#718096',
                  border: 'none',
                  padding: '10px 28px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {item}
              </button>
            ))}
          </div>

          {/* 우측 프로필 및 가상 변환 버튼 */}
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
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#475569', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={24} color="#CBD5E1" />
              </div>
            </div>
          </div>
        </div>

        {/* --- 대시보드 콘텐츠 레이아웃 --- */}
        <div style={{ display: 'flex', flex: 1, gap: '30px', minHeight: 0 }}>

          {/* 좌측 패널 (그리드 카드 영역) */}
          <div style={{ flex: 1.1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: '260px 280px 1fr', gap: '25px', minHeight: 0 }}>

            {/* 1행 1열: 전력 소모량 */}
            <div className="card animate-slide-up" style={{ animationDelay: '0.1s' }} onClick={() => setWidgetModal('power')}>
              <div className="card-title">전력 소모량</div>
              <div style={{ position: 'relative', width: '100%', height: '160px', marginTop: '0px' }}>
                <svg width="100%" height="100%" viewBox="0 0 200 120">
                  {/* 배경 호 */}
                  <path d="M 20 105 A 80 80 0 0 1 180 105" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />
                  {/* 눈금 (0, 25, 50, 75, 100) */}
                  {[0, 25, 50, 75, 100].map((val) => {
                    const angle = Math.PI + (val / 100) * Math.PI;
                    const cx = 100, cy = 105, r1 = 72, r2 = 82, rLabel = 92;
                    const x1 = cx + r1 * Math.cos(angle);
                    const y1 = cy + r1 * Math.sin(angle);
                    const x2 = cx + r2 * Math.cos(angle);
                    const y2 = cy + r2 * Math.sin(angle);
                    const lx = cx + rLabel * Math.cos(angle);
                    const ly = cy + rLabel * Math.sin(angle);
                    return (
                      <g key={val}>
                        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                        <text x={lx} y={ly} fill="rgba(255,255,255,0.5)" fontSize="9" textAnchor="middle" dominantBaseline="middle">{val}</text>
                      </g>
                    );
                  })}
                  {/* 세부 눈금 */}
                  {Array.from({ length: 21 }, (_, i) => i * 5).filter(v => v % 25 !== 0).map((val) => {
                    const angle = Math.PI + (val / 100) * Math.PI;
                    const cx = 100, cy = 105, r1 = 75, r2 = 80;
                    const x1 = cx + r1 * Math.cos(angle);
                    const y1 = cy + r1 * Math.sin(angle);
                    const x2 = cx + r2 * Math.cos(angle);
                    const y2 = cy + r2 * Math.sin(angle);
                    return <line key={val} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />;
                  })}
                  {/* 값 호 */}
                  {(() => {
                    const isPowerAnomaly = isAnomaly && anomalyTargets.includes('power');
                    const arcLen = Math.PI * 80;
                    return <path d="M 20 105 A 80 80 0 0 1 180 105" fill="none" stroke={isPowerAnomaly ? '#FF3B30' : '#34C759'} strokeWidth="14" strokeLinecap="round" strokeDasharray={arcLen} strokeDashoffset={arcLen - (arcLen * (power / 100))} style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }} />;
                  })()}
                  {/* 니들 인디케이터 */}
                  {(() => {
                    const isPowerAnomaly = isAnomaly && anomalyTargets.includes('power');
                    const angle = Math.PI + (power / 100) * Math.PI;
                    const nx = 100 + 80 * Math.cos(angle);
                    const ny = 105 + 80 * Math.sin(angle);
                    return <circle cx={nx} cy={ny} r="6" fill={isPowerAnomaly ? '#FF3B30' : '#34C759'} stroke="#fff" strokeWidth="2.5" style={{ transition: 'cx 0.8s ease, cy 0.8s ease, fill 0.5s ease' }} />;
                  })()}
                </svg>
                <div style={{ position: 'absolute', bottom: '5px', width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: (isAnomaly && anomalyTargets.includes('power')) ? '#FF3B30' : '#fff' }}>
                    {power.toFixed(0)} <span style={{ fontSize: '1.2rem', fontWeight: 'normal', color: '#A0B0C0' }}>kW</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 1행 2열: 온도 */}
            {(() => {
              const isTempAnomaly = isAnomaly && anomalyTargets.includes('temp');
              return (
                <div className="card animate-slide-up" style={{ animationDelay: '0.2s', padding: '20px 0 0 0', borderRadius: '33px' }} onClick={() => setWidgetModal('temp')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '20px', paddingRight: '20px' }}>
                    <div className="card-title" style={{ marginBottom: 0 }}>온도</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isTempAnomaly ? '#FF3B30' : '#007AFF' }}>
                      {currentTemp.toFixed(1)}<span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#A0B0C0' }}> °C</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, width: '100%', height: '120px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={tempData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isTempAnomaly ? "#FF3B30" : "#007AFF"} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={isTempAnomaly ? "#FF3B30" : "#007AFF"} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke={isTempAnomaly ? "#FF3B30" : "#007AFF"} strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}

            {/* 1행 3열: 모터 회전률 (선택식) */}
            {(() => {
              const isMotorAnomaly = isAnomaly && anomalyTargets.includes('motor');
              return (
                <div className="card animate-slide-up" style={{ animationDelay: '0.3s', padding: '16px 0 0 0', borderRadius: '33px' }} onClick={() => setWidgetModal('motor')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '20px', paddingRight: '16px' }}>
                    <div className="card-title" style={{ marginBottom: 0 }}>{selectedMotor}번 모터</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isMotorAnomaly ? '#FF3B30' : '#00F0FF' }}>
                      {currentMotorRpm}<span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#A0B0C0' }}> RPM</span>
                    </div>
                  </div>
                  {/* 모터 선택 탭 */}
                  <div style={{ display: 'flex', gap: '4px', padding: '8px 16px 0 16px' }} onClick={e => e.stopPropagation()}>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <button key={n} onClick={() => setSelectedMotor(n)} style={{
                        flex: 1, padding: '4px 0', fontSize: '0.72rem', fontWeight: 700,
                        border: selectedMotor === n ? '1px solid rgba(0,240,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px', cursor: 'pointer',
                        background: selectedMotor === n ? 'rgba(0,240,255,0.12)' : 'rgba(255,255,255,0.03)',
                        color: selectedMotor === n ? '#00F0FF' : '#718096',
                        transition: 'all 0.15s'
                      }}>{n}번</button>
                    ))}
                  </div>
                  <div style={{ flex: 1, width: '100%', height: '95px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={motorData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorMotor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isMotorAnomaly ? "#FF3B30" : "#00F0FF"} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={isMotorAnomaly ? "#FF3B30" : "#00F0FF"} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke={isMotorAnomaly ? "#FF3B30" : "#00F0FF"} strokeWidth={3} fillOpacity={1} fill="url(#colorMotor)" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}

            {/* 2행 1열: 수리 정비 이력 */}
            <div className="card animate-slide-up" style={{ animationDelay: '0.4s' }} onClick={() => setWidgetModal('maintenance')}>
              <div className="card-title">수리 정비 이력</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', overflowY: 'auto' }}>
                {['정기 점검', '부품 교체', '정기 점검', '정기 점검'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <span style={{ fontWeight: 500 }}>{item}</span>
                    <span style={{ color: '#718096' }}>2026-05-12</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2행 2열: 담당 정비사 */}
            <div className="card animate-slide-up" style={{ animationDelay: '0.5s' }} onClick={() => setWidgetModal('mechanic')}>
              <div className="card-title">담당 정비사</div>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flex: 1 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', border: '2px solid #007AFF' }}>
                    <User size={24} color="#007AFF" />
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#34C759', border: '2px solid #0B192C' }} />
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>김호진</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', border: '2px solid #007AFF' }}>
                    <User size={24} color="#007AFF" />
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#34C759', border: '2px solid #0B192C' }} />
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>이철민</div>
                </div>
              </div>
            </div>

            {/* 2행 3열: AI 진단 건강도 */}
            <div className="card animate-slide-up" style={{ animationDelay: '0.6s' }} onClick={() => setWidgetModal('aiHealth')}>
              <div className="card-title">AI 진단 건강도</div>
              <div style={{ position: 'relative', width: '100%', height: '140px', marginTop: '10px' }}>
                <svg width="100%" height="100%" viewBox="0 0 160 100">
                  <path d="M 20 90 A 60 60 0 0 1 140 90" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 20 90 A 60 60 0 0 1 140 90" fill="none" stroke={(isAnomaly && anomalyTargets.includes('aiHealth')) ? '#FF3B30' : '#007AFF'} strokeWidth="12" strokeLinecap="round" strokeDasharray="377" strokeDashoffset={377 - (377 * (aiHealth / 100))} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                </svg>
                <div style={{ position: 'absolute', bottom: '15px', width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800 }}>
                    {aiHealth.toFixed(0)}<span style={{ fontSize: '1.2rem', fontWeight: 'normal', color: '#A0B0C0' }}>%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3행 (2열 너비): 위치 / AI 브리핑 룸 동적 스왑 영역 */}
            <div className="card animate-slide-up" style={{
              gridColumn: '1 / span 3',
              animationDelay: '0.7s',
              border: isAnomaly ? '1px solid rgba(255, 59, 48, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
              transition: 'border 0.5s ease',
              padding: '24px'
            }}>
              {!isAnomaly ? (
                // 정상 상태: 피그마 시안의 '위치' 카드 출력
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div className="card-title"><MapPin size={18} color="#007AFF" /> 위치</div>
                  <div style={{ flex: 1 }}>
                    <LocationMap />
                  </div>
                </div>
              ) : (
                // 위험/이상 감지 상태: "AI 에이전트 브리핑 룸" 전환
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div className="card-title" style={{ color: '#FF3B30', margin: 0 }}>
                    <ShieldAlert size={20} /> 자율 관제 AI 에이전트 브리핑 룸
                  </div>

                  <div style={{ display: 'flex', gap: '30px', flex: 1, alignItems: 'center', marginTop: '15px' }}>
                    <div style={{ flex: 1.2, background: 'rgba(255, 59, 48, 0.08)', padding: '20px', borderRadius: '10px', fontSize: '1.05rem', lineHeight: 1.6, borderLeft: '4px solid #FF3B30' }}>
                      <span style={{ color: '#FF8A80', fontWeight: '600' }}>⚠️ 진동 파형 및 온도 상승 패턴 분석 결과, 12시간 이내에 '감속기 베어링' 파손이 예상됩니다.</span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', opacity: workflowStep >= 1 ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                        {workflowStep >= 1 ? <CheckCircle2 color="#34C759" size={20} /> : <Circle color="#718096" size={20} />}
                        <span style={{ fontSize: '0.95rem' }}>부품 재고 조회 (사내 ERP) {workflowStep >= 1 && <strong style={{ color: '#34C759' }}>- 창고 B-4 재고 1개</strong>}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', opacity: workflowStep >= 2 ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                        {workflowStep >= 2 ? <CheckCircle2 color="#34C759" size={20} /> : <Circle color="#718096" size={20} />}
                        <span style={{ fontSize: '0.95rem' }}>정비 엔지니어 매칭 (HR) {workflowStep >= 2 && <strong style={{ color: '#34C759' }}>- 오후 3시 김 대리</strong>}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', opacity: workflowStep >= 3 ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                        {workflowStep >= 3 ? <CheckCircle2 color="#34C759" size={20} /> : <Circle color="#718096" size={20} />}
                        <span style={{ fontSize: '0.95rem' }}>외부 공급망(SCM) 발주 {workflowStep >= 3 && <strong style={{ color: '#34C759' }}>- 초안 작성 완료</strong>}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                      <input
                        type="email"
                        placeholder="승인 요청받을 이메일 주소 입력"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        style={{
                          padding: '10px 15px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.2)',
                          background: 'rgba(0,0,0,0.4)',
                          color: '#fff',
                          width: '250px',
                          fontSize: '0.95rem',
                          outline: 'none'
                        }}
                      />
                      <button
                        className={`confirm-btn ${workflowStep >= 3 && !isSending && recipientEmail ? 'pulse' : ''}`}
                        disabled={workflowStep < 3 || isSending || !recipientEmail}
                        onClick={async () => {
                          if (!recipientEmail.includes('@')) {
                            alert('올바른 이메일 주소를 입력해주세요.');
                            return;
                          }
                          setIsSending(true);
                          const emailData = {
                            machineName: 'HD-6X-200',
                            location: '의장 2부 3라인 L/B2',
                            vibration: vibration.toFixed(2),
                            current: current.toFixed(1),
                            temperature: currentTemp.toFixed(1),
                            aiDiagnosis: "진동 파형 및 온도 상승 패턴 분석 결과, 12시간 이내에 '감속기 베어링' 파손이 예상됩니다.",
                            technician: '오후 3시 김 대리',
                            sparePart: '창고 B-4 재고 1개',
                            recipientEmail: recipientEmail // 입력받은 이메일 주소 사용
                          };

                          try {
                            // 배포 및 로컬 프록시를 위해 상대 경로 사용
                            const response = await fetch('/api/send-email', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify(emailData),
                            });

                            const result = await response.json();

                            if (response.ok) {
                              alert('정비 발주 승인 및 관정비사에게 이메일(HTML) 전송이 완료되었습니다.');
                              setIsAnomaly(false);
                            } else {
                              alert(`메일 전송 실패: ${result.message || '서버 오류'}`);
                            }
                          } catch (error) {
                            console.error('메일 전송 API 오류:', error);
                            alert('백엔드 서버(Port 5000) 연결에 실패했습니다. 서버가 실행 중인지 확인하세요.');
                          } finally {
                            setIsSending(false);
                          }
                        }}
                        style={{ padding: '15px 30px', fontSize: '1rem', borderRadius: '8px' }}
                      >
                        {isSending ? '이메일 전송 중...' : '최종 조치 승인 (Confirm)'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* 우측 패널 (3D 로봇암 & 주요 소집품/스펙 카드) */}
          <div style={{ flex: 0.9, display: 'flex', flexDirection: 'column', gap: '25px', minHeight: 0, zIndex: 50 }}>

            {/* 3D 로봇암 영역 */}
            <div className="card no-hover animate-slide-up" style={{ flex: 1, position: 'relative', overflow: 'visible', padding: 0, background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)', border: '1px solid rgba(255,255,255,0.08)', zIndex: 50 }}>

              {/* 뒷면 글로우 효과 */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80%',
                height: '80%',
                background: isAnomaly ? 'radial-gradient(circle, rgba(255, 59, 48, 0.2) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(0, 122, 255, 0.25) 0%, transparent 70%)',
                filter: 'blur(50px)',
                zIndex: 0,
                pointerEvents: 'none',
                transition: 'background 0.5s ease'
              }}></div>

              {/* 진동 & 전류 수치 오버레이 */}
              <div className="floating-overlay" style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 10 }}>
                <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: '2px' }}>Vibration (진동)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isAnomaly ? '#FF3B30' : '#00F0FF' }}>
                  {vibration.toFixed(2)} mm/s
                </div>
              </div>

              <div className="floating-overlay" style={{ position: 'absolute', top: '40px', right: '40px', zIndex: 10 }}>
                <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: '2px' }}>Current (전류)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isAnomaly ? '#FF3B30' : '#F5A623' }}>
                  {current.toFixed(1)} A
                </div>
              </div>

              {/* 3D 캔버스 */}
              <Canvas
                camera={{ position: [6, 4, 7], fov: 40 }}
                gl={{ alpha: true, antialias: true }}
                shadows
                resize={{ offsetSize: true }}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}
              >
                  {/* 전체적인 밝기 확보 */}
                  <ambientLight intensity={1.2} color="#ffffff" />
                  
                  {/* 주 조명 (명암과 그림자 생성) */}
                  <directionalLight 
                    position={[10, 15, 10]} 
                    intensity={2.5} 
                    color="#ffffff" 
                    castShadow
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                    shadow-bias={-0.001}
                  />
                  {/* 보조 조명 1 (어두운 부분 채우기) */}
                  <directionalLight position={[-10, 10, -5]} intensity={1.5} color="#e0eaff" />
                  {/* 보조 조명 2 (하단 반사광 느낌) */}
                  <directionalLight position={[0, -5, 5]} intensity={1.0} color="#007aff" />
                  <Suspense fallback={null}>
                    {/* 환경 맵 */}
                    <Environment preset="city" />
                    <RobotArm isAnomaly={isAnomaly} onPartClick={setSelectedPart} />
                    {/* 부드러운 그림자 추가 */}
                    <ContactShadows position={[0, -0.01, 0]} opacity={0.7} scale={15} blur={2} far={10} color="#000000" />
                    <GroundPlane />
                    {/* 부품 정보 모달 (3D 앵커 기반) */}
                    {selectedPart && selectedPart.point && (
                      <Html portal={modalContainerRef} position={selectedPart.point} style={{ pointerEvents: 'none' }} zIndexRange={[100, 0]}>
                        <div style={{ position: 'relative', width: 0, height: 0 }}>
                          {/* 붉은 점 */}
                          <div style={{ position: 'absolute', width: '12px', height: '12px', background: '#FF3B30', borderRadius: '50%', transform: 'translate(-6px, -6px)', boxShadow: '0 0 10px #FF3B30' }} />

                          {/* 연결 선 */}
                          <svg style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '120px', overflow: 'visible' }}>
                            <path d="M 0 0 L -40 60 L -180 60" fill="none" stroke="#FF3B30" strokeWidth="2" />
                            <circle cx="-180" cy="60" r="3" fill="#FF3B30" />
                          </svg>

                          {/* 모달 본체 */}
                          <div style={{
                            position: 'absolute',
                            top: '60px',
                            right: '180px',
                            pointerEvents: 'auto',
                            background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.97) 19.41%, rgba(10, 14, 35, 0.85) 76.65%)',
                            border: '1px solid rgba(255,59,48,0.4)',
                            borderRadius: '24px',
                            padding: '24px',
                            width: '380px',
                            boxShadow: '0 15px 40px rgba(0,0,0,0.6), 0 0 30px rgba(255,59,48,0.15)',
                            backdropFilter: 'blur(45px)',
                            transform: 'translate(0, -50%)',
                          }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedPart(null)}
                              style={{
                                position: 'absolute', top: '16px', right: '16px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px', padding: '6px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              <X size={16} color="#718096" />
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                              <ShieldAlert size={18} color="#FF3B30" />
                              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FF3B30' }}>이상 부품 정보</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <span style={{ color: '#718096', fontSize: '0.85rem' }}>부품명</span>
                                <strong style={{ fontSize: '0.9rem', fontWeight: 700 }}>{selectedPart.name}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <span style={{ color: '#718096', fontSize: '0.85rem' }}>부품 번호</span>
                                <strong style={{ fontSize: '0.9rem', fontFamily: 'monospace', fontWeight: 700 }}>{selectedPart.partNo}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <span style={{ color: '#718096', fontSize: '0.85rem' }}>상태</span>
                                <strong style={{ color: '#FF3B30', fontSize: '0.9rem', fontWeight: 700 }}>{selectedPart.status}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <span style={{ color: '#718096', fontSize: '0.85rem' }}>최근 정비일</span>
                                <strong style={{ fontSize: '0.9rem', fontWeight: 700 }}>{selectedPart.lastMaint}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <span style={{ color: '#718096', fontSize: '0.85rem' }}>잔여 수명</span>
                                <strong style={{ color: '#FFA726', fontSize: '0.9rem', fontWeight: 700 }}>{selectedPart.remainLife}</strong>
                              </div>
                              <div style={{ padding: '12px', background: 'rgba(255,59,48,0.08)', borderRadius: '8px', borderLeft: '3px solid #FF3B30', marginTop: '4px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '4px', fontWeight: 700 }}>AI 진단 메모</div>
                                <div style={{ fontSize: '0.85rem', color: '#FF8A80', lineHeight: 1.5, fontWeight: 500 }}>{selectedPart.desc}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Html>
                    )}
                  </Suspense>
                  <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={3}
                    maxDistance={15}
                    maxPolarAngle={Math.PI / 2.1}
                    target={[0, 2, 0]}
                  />
                </Canvas>

              {/* 모달 포털 (Vibration/Current 오버레이보다 높은 z-index) */}
              <div ref={modalContainerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 999 }} />
            </div>

            {/* 하단 카드 2개 */}
            <div style={{ display: 'flex', gap: '25px', height: '220px' }}>

              {/* HD-6X-200 */}
              <div className="card animate-slide-up" style={{ flex: 1, animationDelay: '0.5s' }} onClick={() => setWidgetModal('robot')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>HD-6X-200</span>
                  <span style={{
                    fontSize: '0.8rem',
                    background: isAnomaly ? 'rgba(255,59,48,0.15)' : 'rgba(52,199,89,0.15)',
                    color: isAnomaly ? '#FF3B30' : '#34C759',
                    border: `1px solid ${isAnomaly ? 'rgba(255,59,48,0.3)' : 'rgba(52,199,89,0.3)'}`,
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontWeight: 800
                  }}>
                    {isAnomaly ? '경고' : '가동 중'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#718096' }}>가동률:</span>
                    <strong>94.2%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#718096' }}>현재 작업:</span>
                    <strong>Palletizing</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#718096' }}>누적 가동 시간:</span>
                    <strong>1,334 hrs</strong>
                  </div>
                </div>
              </div>

              {/* 주요 소모품 잔여 수명 */}
              <div className="card animate-slide-up" style={{ flex: 1.3, animationDelay: '0.6s' }} onClick={() => setWidgetModal('consumables')}>
                <div className="card-title" style={{ marginBottom: '20px' }}>주요 소모품 잔여 수명</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: '100px', fontSize: '0.85rem', color: '#A0B0C0' }}>Grease</span>
                    <span style={{ width: '45px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'right', marginRight: '15px', color: isAnomaly ? '#FF3B30' : '#fff' }}>{isAnomaly ? '5%' : '75%'}</span>
                    <div className="progress-bg" style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: isAnomaly ? '5%' : '75%', background: isAnomaly ? '#FF3B30' : '#007AFF' }}></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: '100px', fontSize: '0.85rem', color: '#A0B0C0' }}>Z-6 Motor</span>
                    <span style={{ width: '45px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'right', marginRight: '15px' }}>82%</span>
                    <div className="progress-bg" style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: '82%' }}></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: '100px', fontSize: '0.85rem', color: '#A0B0C0' }}>Over Roller</span>
                    <span style={{ width: '45px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'right', marginRight: '15px' }}>96%</span>
                    <div className="progress-bg" style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: '96%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* 위젯 상세 모달 */}
      {widgetModal && WIDGET_DETAILS[widgetModal] && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }} onClick={() => setWidgetModal(null)}>
          <div style={{
            background: 'linear-gradient(127deg, rgba(6, 11, 40, 0.97) 19.41%, rgba(10, 14, 35, 0.85) 76.65%)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '33px',
            padding: '36px',
            width: '480px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0, 122, 255, 0.08)',
            position: 'relative',
            animation: 'slideUpFade 0.3s ease',
            backdropFilter: 'blur(45px)',
          }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setWidgetModal(null)}
              style={{
                position: 'absolute', top: '20px', right: '20px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={18} color="#718096" />
            </button>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '28px', color: '#fff' }}>
              {WIDGET_DETAILS[widgetModal].title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {WIDGET_DETAILS[widgetModal].items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <span style={{ color: '#718096', fontSize: '0.9rem' }}>{item.label}</span>
                  <strong style={{ fontSize: '0.9rem', textAlign: 'right', maxWidth: '60%' }}>{item.value}</strong>
                </div>
              ))}
            </div>
            {WIDGET_DETAILS[widgetModal].note && (
              <div style={{
                marginTop: '18px',
                padding: '14px 16px',
                background: 'rgba(0, 122, 255, 0.06)',
                borderRadius: '12px',
                borderLeft: '3px solid #007AFF',
                fontSize: '0.88rem',
                color: '#8ab4f8',
                lineHeight: 1.6
              }}>
                📌 {WIDGET_DETAILS[widgetModal].note}
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
};

export default RobotDashboard;
