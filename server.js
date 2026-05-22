import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 로드
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 메일 전송 transporter 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.SENDER_PASSWORD,
  },
});

// 이메일 발송 API
app.post('/api/send-email', async (req, res) => {
  const data = req.body;
  console.log('이메일 전송 요청 수신:', data);

  // 환경변수가 기입되지 않았을 때의 예외 처리
  if (
    !process.env.SENDER_EMAIL ||
    process.env.SENDER_EMAIL === 'your_email@gmail.com' ||
    !process.env.SENDER_PASSWORD ||
    process.env.SENDER_PASSWORD === 'your_app_password'
  ) {
    console.warn('⚠️ .env 파일에 실제 이메일 계정 정보가 등록되지 않았습니다.');
    return res.status(400).json({
      success: false,
      message: '서버 .env 파일에 실제 Gmail 계정 및 앱 비밀번호가 설정되지 않았습니다. 계정 설정을 먼저 완료해주세요.',
    });
  }

  // HTML 형식의 프리미엄 이메일 템플릿 생성
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>설비 정비 지시서</title>
    </head>
    <body style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e1e8ed;">
        <!-- 헤더 영역 (현대자동차 브랜드 컬러) -->
        <div style="background-color: #002C5F; color: #ffffff; padding: 25px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">🚨 설비 이상 감지 및 정비 승인 통보</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">현대자동차 자율 관제 AI 에이전트 자동 발송</p>
        </div>
        
        <div style="padding: 30px;">
          <!-- 경고 메세지 카드 (AI 브리핑 내용) -->
          <div style="background-color: #FFF5F5; border-left: 4px solid #FF3B30; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
            <strong style="color: #FF3B30; font-size: 15px; display: block; margin-bottom: 5px;">⚠️ AI 에이전트 진단 내용:</strong>
            <span style="color: #4A5568; font-size: 14px; line-height: 1.6;">${data.aiDiagnosis}</span>
          </div>

          <!-- 설비 상세 정보 테이블 -->
          <h3 style="font-size: 16px; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-top: 0; margin-bottom: 15px; color: #1A202C;">📊 설비 상세 정보</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; color: #718096; width: 35%;">설비 모델명</td>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; font-weight: bold; color: #2D3748;">${data.machineName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; color: #718096;">위치 (라인)</td>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; font-weight: bold; color: #2D3748;">${data.location}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; color: #718096;">실시간 진동수 (Vibration)</td>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; color: #FF3B30; font-weight: bold;">${data.vibration} mm/s (이상 임계치 초과)</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; color: #718096;">실시간 전류 (Current)</td>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; color: #E53E3E; font-weight: bold;">${data.current} A</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; color: #718096;">온도 (Temperature)</td>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; color: #E53E3E; font-weight: bold;">${data.temperature} °C</td>
            </tr>
          </table>

          <!-- 정비사 매칭 및 자재 정보 테이블 -->
          <h3 style="font-size: 16px; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 15px; color: #1A202C;">🛠️ 자동 수립 조치 및 정비 정보</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; color: #718096; width: 35%;">매칭 정비사</td>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; font-weight: bold; color: #2D3748;">${data.technician}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; color: #718096;">필요 자재 및 예비 부품</td>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; color: #3182CE; font-weight: bold;">${data.sparePart}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7; color: #718096;">상태</td>
              <td style="padding: 10px; border-bottom: 1px solid #EDF2F7;">
                <span style="background-color: #EBF8FF; color: #2B6CB0; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                  최종 승인 완료 (정비 지시 발령)
                </span>
              </td>
            </tr>
          </table>

          <!-- 하단 안내 문구 -->
          <p style="font-size: 13px; color: #4A5568; line-height: 1.6; margin-top: 10px;">
            본 이메일은 로봇 관제 대시보드상에서 관리자의 <strong>[최종 조치 승인]</strong>이 실행됨에 따라 발송되었습니다.<br>
            지정된 정비사는 부품 및 장비를 지참하여 신속하게 현장 점검 및 정비 조치를 취해 주시기 바랍니다.
          </p>
        </div>

        <!-- 푸터 영역 -->
        <div style="background-color: #F7FAFC; border-top: 1px solid #E2E8F0; padding: 20px; text-align: center; font-size: 11px; color: #A0AEC0;">
          본 메일은 시스템에 의해 자동 생성된 발신 전용 메일입니다.<br>
          © 2026 Hyundai Motor Company. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  // 메일 내용 옵션 설정
  const mailOptions = {
    from: `"Hyundai Robot Control" <${process.env.SENDER_EMAIL}>`,
    to: data.recipientEmail,
    subject: `[🚨 설비 이상 감지 및 정비 지시] ${data.machineName} (${data.location})`,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('이메일 발송 완료:', info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Nodemailer 메일 발송 중 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 배포 환경: 빌드된 프론트엔드(dist) 정적 파일 제공
app.use(express.static(path.join(__dirname, 'dist')));

// SPA 라우팅 지원: 정의되지 않은 모든 GET 요청을 index.html로 연결
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 이메일 전송 백엔드 서버가 포트 ${port}에서 작동 중입니다!`);
});
