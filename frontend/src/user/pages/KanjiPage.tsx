import React, { useEffect, useState, useMemo, useRef } from 'react';
import { kizunaService } from '../services/kizunaService';
import { KanjiItem, KanjiBook, KanjiUnit, KanjiCatalog } from '../types/kizuna';

type JlptLevelKey = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
type StudyMode = 'list' | 'flip' | 'quiz';

// Phân cấp danh xưng tiếng Nhật truyền thống cho từng bậc N
const LEVEL_LABELS: Record<JlptLevelKey, { kanji: string; vi: string; desc: string }> = {
  N5: { kanji: '入門', vi: 'Nhập môn', desc: '128 chữ Hán cơ bản nhất cho giao tiếp đời thường' },
  N4: { kanji: '初級', vi: 'Sơ cấp', desc: '264 chữ Hán sinh hoạt, mua sắm & công việc căn bản' },
  N3: { kanji: '中級', vi: 'Trung cấp', desc: '430 chữ Hán thường nhật, biển báo & giao tiếp công sở' },
  N2: { kanji: '中上級', vi: 'Trung thượng cấp', desc: '513 chữ Hán thương mại, báo chí & xã luận' },
  N1: { kanji: '上級', vi: 'Thượng cấp', desc: '881 chữ Hán văn kiện chuyên sâu & học thuật cao cấp' }
};

// Từ điển 120 bộ thủ thông dụng nhất kèm âm Hán Việt và ý nghĩa biểu tượng
const RADICAL_INFO: Record<string, { sino: string; meaning: string }> = {
  '一': { sino: 'Nhất', meaning: 'Một, bắt đầu, đồng nhất' },
  '丨': { sino: 'Cổn', meaning: 'Nét sổ dọc' },
  '丶': { sino: 'Điểm', meaning: 'Dấu chấm, giọt nước nhỏ' },
  '丿': { sino: 'Phiệt', meaning: 'Nét phẩy chéo' },
  '乙': { sino: 'Ất', meaning: 'Vị trí thứ hai' },
  '亅': { sino: 'Quyết', meaning: 'Móc câu' },
  '二': { sino: 'Nhị', meaning: 'Số hai' },
  '亠': { sino: 'Đầu', meaning: 'Phần nắp phía trên' },
  '人': { sino: 'Nhân', meaning: 'Con người' },
  '亻': { sino: 'Nhân đứng', meaning: 'Con người, hành vi của con người' },
  '儿': { sino: 'Nhân đi', meaning: 'Đôi chân người đang bước đi' },
  '入': { sino: 'Nhập', meaning: 'Đi vào trong' },
  '八': { sino: 'Bát', meaning: 'Số tám, tách chia sang hai bên' },
  '冂': { sino: 'Quynh', meaning: 'Vùng đất xa xôi, biên cảnh' },
  '冖': { sino: 'Mịch', meaning: 'Khăn trùm, che phủ bên trên' },
  '冫': { sino: 'Băng', meaning: 'Băng tuyết, giá lạnh' },
  '几': { sino: 'Kỷ', meaning: 'Cái bàn trà nhỏ, ghế dựa' },
  '凵': { sino: 'Khảm', meaning: 'Hố sâu, vật chứa lõm' },
  '刀': { sino: 'Đao', meaning: 'Con dao, vũ khí chém' },
  '刂': { sino: 'Đao đứng', meaning: 'Cắt gọt, chém đứt' },
  '力': { sino: 'Lực', meaning: 'Sức mạnh, cơ bắp cuồn cuộn' },
  '勹': { sino: 'Bao', meaning: 'Bao bọc, ôm ấp' },
  '匕': { sino: 'Chủy', meaning: 'Cái thìa, mũi nhọn sắc' },
  '匚': { sino: 'Phương', meaning: 'Hòm chứa đồ' },
  '十': { sino: 'Thập', meaning: 'Số mười, hoàn hảo trọn vẹn' },
  '卜': { sino: 'Bốc', meaning: 'Bói toán, rạn nứt mai rùa' },
  '卩': { sino: 'Tiết', meaning: 'Đốt tre, con dấu ấn tín' },
  '厂': { sino: 'Hán', meaning: 'Vách đá dốc, bờ sườn núi' },
  '厶': { sino: 'Khứ', meaning: 'Riêng tư, bản ngã' },
  '又': { sino: 'Hựu', meaning: 'Lại nữa, bàn tay phải' },
  '口': { sino: 'Khẩu', meaning: 'Cái miệng, lời nói, ăn uống' },
  '囗': { sino: 'Vi', meaning: 'Bao quanh khép kín, biên giới' },
  '土': { sino: 'Thổ', meaning: 'Đất đai, thổ nhưỡng' },
  '士': { sino: 'Sĩ', meaning: 'Kẻ sĩ, người tài trí' },
  '夂': { sino: 'Truy', meaning: 'Bước chân theo sau' },
  '夕': { sino: 'Tịch', meaning: 'Hoàng hôn, buổi chiều tối' },
  '大': { sino: 'Đại', meaning: 'To lớn, người dang rộng tay chân' },
  '女': { sino: 'Nữ', meaning: 'Người phụ nữ, nữ tính' },
  '子': { sino: 'Tử', meaning: 'Đứa con nhỏ, con cái' },
  '宀': { sino: 'Miên', meaning: 'Mái nhà che chở, nơi ở' },
  '寸': { sino: 'Thốn', meaning: 'Tấc đo, quy củ gang tay' },
  '小': { sino: 'Tiểu', meaning: 'Nhỏ bé, giản lược' },
  '尸': { sino: 'Thi', meaning: 'Thân xác, chỗ nằm' },
  '山': { sino: 'Sơn', meaning: 'Núi non trùng điệp' },
  '巛': { sino: 'Xuyên', meaning: 'Dòng sông uốn lượn' },
  '工': { sino: 'Công', meaning: 'Công cụ thợ, khéo léo' },
  '己': { sino: 'Kỷ', meaning: 'Bản thân mình' },
  '巾': { sino: 'Cân', meaning: 'Khăn vải, tấm màn' },
  '干': { sino: 'Can', meaning: 'Can thiệp, khô ráo' },
  '广': { sino: 'Quảng', meaning: 'Ngôi nhà rộng lớn tựa vách núi' },
  '弓': { sino: 'Cung', meaning: 'Cây cung uốn cong' },
  '心': { sino: 'Tâm', meaning: 'Trái tim, suy nghĩ, cảm xúc' },
  '忄': { sino: 'Tâm đứng', meaning: 'Tâm trạng, tình cảm nội tâm' },
  '戈': { sino: 'Qua', meaning: 'Cây giáo dài, chiến tranh' },
  '手': { sino: 'Thủ', meaning: 'Bàn tay con người' },
  '扌': { sino: 'Thủ gảy', meaning: 'Động tác dùng tay cầm nắm' },
  '支': { sino: 'Chi', meaning: 'Cành cây, chống đỡ' },
  '文': { sino: 'Văn', meaning: 'Văn chương, hình xăm đẹp' },
  '斤': { sino: 'Cân', meaning: 'Cái rìu đẵn gỗ' },
  '方': { sino: 'Phương', meaning: 'Phương hướng, chiếc bè' },
  '日': { sino: 'Nhật', meaning: 'Mặt trời, ban ngày, thời gian' },
  '月': { sino: 'Nguyệt', meaning: 'Mặt trăng, tháng, da thịt' },
  '木': { sino: 'Mộc', meaning: 'Cây cối, gỗ rừng' },
  '止': { sino: 'Chỉ', meaning: 'Dừng chân lại' },
  '歹': { sino: 'Đãi', meaning: 'Xương tàn, chết chóc' },
  '殳': { sino: 'Thù', meaning: 'Binh khí đánh giặc' },
  '母': { sino: 'Mẫu', meaning: 'Người mẹ hiền từ' },
  '比': { sino: 'Tỷ', meaning: 'So sánh cạnh tranh' },
  '毛': { sino: 'Mao', meaning: 'Lông mao, tóc sợi' },
  '气': { sino: 'Khí', meaning: 'Hơi thở, mây trời' },
  '水': { sino: 'Thủy', meaning: 'Nước, chất lỏng' },
  '氵': { sino: 'Ba chấm thủy', meaning: 'Nước, sông hồ, đại dương' },
  '火': { sino: 'Hỏa', meaning: 'Ngọn lửa đỏ rực' },
  '灬': { sino: 'Hỏa dưới', meaning: 'Nhiệt lượng bốc lên, đun nấu' },
  '父': { sino: 'Phụ', meaning: 'Người cha nghiêm khắc' },
  '牛': { sino: 'Ngưu', meaning: 'Con trâu bò, cần mẫn' },
  '犬': { sino: 'Khuyển', meaning: 'Con chó trung thành' },
  '犭': { sino: 'Khuyển đứng', meaning: 'Loài thú hoang dã' },
  '玉': { sino: 'Ngọc', meaning: 'Viên ngọc quý có chấm' },
  '王': { sino: 'Vương', meaning: 'Vua thống trị thiên địa' },
  '田': { sino: 'Điền', meaning: 'Thửa ruộng trồng lúa vuông vức' },
  '目': { sino: 'Mục', meaning: 'Đôi mắt mở to quan sát' },
  '矢': { sino: 'Thỉ', meaning: 'Mũi tên bay thẳng' },
  '石': { sino: 'Thạch', meaning: 'Hòn đá rắn rỏi dưới vách núi' },
  '示': { sino: 'Thị', meaning: 'Bàn thờ tổ tiên, biểu thị điềm báo' },
  '礻': { sino: 'Thị đứng', meaning: 'Thần thánh, nghi lễ tế tự, phước lành' },
  '禾': { sino: 'Hòa', meaning: 'Bông lúa trĩu hạt' },
  '穴': { sino: 'Huyệt', meaning: 'Hang hốc, lỗ sâu' },
  '立': { sino: 'Lập', meaning: 'Đứng vững vàng trên mặt đất' },
  '竹': { sino: 'Trúc', meaning: 'Cây tre xanh đốt rỗng' },
  '米': { sino: 'Mễ', meaning: 'Hạt gạo trắng, lương thực' },
  '糸': { sino: 'Mịch', meaning: 'Cuộn tơ tằm, sợi chỉ bền chặt' },
  '缶': { sino: 'Phẫu', meaning: 'Bình sành, đồ gốm' },
  '羊': { sino: 'Dương', meaning: 'Con dê, điềm lành' },
  '羽': { sino: 'Vũ', meaning: 'Đôi cánh chim lông vũ' },
  '老': { sino: 'Lão', meaning: 'Người già tóc bạc lưng còng' },
  '耳': { sino: 'Nhĩ', meaning: 'Vành tai lắng nghe' },
  '肉': { sino: 'Nhục', meaning: 'Da thịt, thể xác' },
  '臣': { sino: 'Thần', meaning: 'Bầy tôi cúi mắt nhìn vua' },
  '自': { sino: 'Tự', meaning: 'Bản thân mình, chiếc mũi' },
  '至': { sino: 'Chí', meaning: 'Đi đến tận cùng' },
  '舌': { sino: 'Thiệt', meaning: 'Chiếc lưỡi nếm vị' },
  '舟': { sino: 'Chu', meaning: 'Con thuyền độc mộc lướt sóng' },
  '艮': { sino: 'Cấn', meaning: 'Ranh giới ngoảnh nhìn' },
  '色': { sino: 'Sắc', meaning: 'Màu sắc, vẻ mặt' },
  '艹': { sino: 'Thảo đầu', meaning: 'Cỏ cây hoa lá, thảo mộc' },
  '虫': { sino: 'Trùng', meaning: 'Sâu bọ, côn trùng nhỏ' },
  '血': { sino: 'Huyết', meaning: 'Dòng máu đỏ trong chén' },
  '行': { sino: 'Hành', meaning: 'Ngã tư đường, đi lại hành động' },
  '衣': { sino: 'Y', meaning: 'Áo quần mặc ngoài' },
  '衤': { sino: 'Y đứng', meaning: 'Trang phục, vải vóc' },
  '西': { sino: 'Tây', meaning: 'Phương tây chim về tổ' },
  '見': { sino: 'Kiến', meaning: 'Mắt mở to nhìn ngắm' },
  '角': { sino: 'Giác', meaning: 'Cái sừng thú góc cạnh' },
  '言': { sino: 'Ngôn', meaning: 'Lời nói thốt ra từ miệng' },
  '讠': { sino: 'Ngôn đứng', meaning: 'Nói năng, trò chuyện' },
  '谷': { sino: 'Cốc', meaning: 'Thung lũng có dòng suối' },
  '豆': { sino: 'Đậu', meaning: 'Hạt đậu, đài đựng thức ăn tế' },
  '豕': { sino: 'Thỉ', meaning: 'Con lợn đuôi ngắn' },
  '貝': { sino: 'Bối', meaning: 'Vỏ sò biển, tiền tài của cải' },
  '赤': { sino: 'Xích', meaning: 'Màu đỏ rực của lửa đất' },
  '走': { sino: 'Tẩu', meaning: 'Chạy vội vã' },
  '足': { sino: 'Túc', meaning: 'Bàn chân bước, đầy đủ' },
  '身': { sino: 'Thân', meaning: 'Thân thể con người' },
  '車': { sino: 'Xa', meaning: 'Cỗ xe có hai bánh' },
  '辛': { sino: 'Tân', meaning: 'Vị cay đắng, hình cụ' },
  '辰': { sino: 'Thần', meaning: 'Thời khắc, con rồng' },
  '辶': { sino: 'Quai sước', meaning: 'Đường đi xa, bước chân di chuyển' },
  '阝': { sino: 'Phụ / Ấp', meaning: 'Gò đồi (trái), làng ấp xóm làng (phải)' },
  '酉': { sino: 'Dậu', meaning: 'Vò rượu ủ lên men' },
  '里': { sino: 'Lý', meaning: 'Làng quê ruộng đất, dặm đường' },
  '金': { sino: 'Kim', meaning: 'Kim loại quý giá, tiền vàng' },
  '钅': { sino: 'Kim đứng', meaning: 'Đồ dùng kim loại, sắt thép' },
  '長': { sino: 'Trường', meaning: 'Tóc dài, người lớn tuổi' },
  '門': { sino: 'Môn', meaning: 'Hai cánh cổng lớn của phủ' },
  '隹': { sino: 'Chuy', meaning: 'Loài chim đuôi ngắn' },
  '雨': { sino: 'Vũ', meaning: 'Mưa rơi từ vòm mây' },
  '青': { sino: 'Thanh', meaning: 'Màu xanh non tơ, trong sạch' },
  '非': { sino: 'Phi', meaning: 'Hai cánh ngược chiều, sai quấy' },
  '面': { sino: 'Diện', meaning: 'Khuôn mặt' },
  '革': { sino: 'Cách', meaning: 'Tấm da thú căng phẳng lột xác' },
  '音': { sino: 'Âm', meaning: 'Âm thanh phát ra từ miệng' },
  '頁': { sino: 'Hiệt', meaning: 'Cái đầu, trang giấy' },
  '風': { sino: 'Phong', meaning: 'Ngọn gió cuốn sâu bọ' },
  '飛': { sino: 'Phi', meaning: 'Cánh chim dang bay' },
  '食': { sino: 'Thực', meaning: 'Món ăn, đậy nắp chén cơm' },
  '饣': { sino: 'Thực đứng', meaning: 'Ăn uống, lương thực' },
  '首': { sino: 'Thủ', meaning: 'Cái đầu có bờm tóc' },
  '香': { sino: 'Hương', meaning: 'Mùi hương hạt kê' },
  '馬': { sino: 'Mã', meaning: 'Con ngựa bờm dài phi nhanh' },
  '骨': { sino: 'Cốt', meaning: 'Bộ xương nâng đỡ cơ thể' },
  '高': { sino: 'Cao', meaning: 'Lầu gác cao vút' },
  '鬼': { sino: 'Quỷ', meaning: 'Quỷ thần, bóng ma' },
  '魚': { sino: 'Ngư', meaning: 'Con cá bơi dưới nước' },
  '鳥': { sino: 'Điểu', meaning: 'Loài chim có móng vuốt' },
  '鹵': { sino: 'Lỗ', meaning: 'Đất mặn, muối' },
  '鹿': { sino: 'Lộc', meaning: 'Con hươu sao sừng nhọn' },
  '麦': { sino: 'Mạch', meaning: 'Cây lúa mạch có râu' },
  '麻': { sino: 'Ma', meaning: 'Cây gai lanh trong kho' },
  '黄': { sino: 'Hoàng', meaning: 'Màu vàng của đất đai' },
  '黒': { sino: 'Hắc', meaning: 'Màu đen khói bếp' },
  '歯': { sino: 'Xỉ', meaning: 'Hàm răng trắng đều' }
};

interface KanjiQuizOption {
  kanji: string;
  sino: string;
  isCorrect: boolean;
}

interface KanjiQuizQuestion {
  item: KanjiItem;
  promptSino: string;
  promptMeaning: string;
  hintCompound?: { word: string; reading: string; meaning: string };
  options: KanjiQuizOption[];
}

// Component Animation Hoa anh đào rơi động chuẩn phong cách Nhật Bản
const SakuraFallingBackground: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0
      }}
    >
      {[
        { left: '6%', delay: '0s', duration: '6.5s', size: 14, rotate: 25 },
        { left: '22%', delay: '1.8s', duration: '7.8s', size: 18, rotate: -35 },
        { left: '38%', delay: '3.5s', duration: '6.2s', size: 13, rotate: 45 },
        { left: '54%', delay: '0.8s', duration: '8.2s', size: 16, rotate: 15 },
        { left: '69%', delay: '4.2s', duration: '7.1s', size: 15, rotate: -25 },
        { left: '83%', delay: '2.1s', duration: '6.6s', size: 17, rotate: 50 },
        { left: '94%', delay: '5.0s', duration: '8.4s', size: 12, rotate: -15 }
      ].map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: p.left,
            top: '-20px',
            width: p.size,
            height: p.size * 1.3,
            animation: `sakuraFall ${p.duration} linear infinite`,
            animationDelay: p.delay,
            opacity: 0.75,
            display: 'block'
          }}
        >
          <svg viewBox="0 0 30 40" width="100%" height="100%" style={{ transform: `rotate(${p.rotate}deg)` }}>
            <path
              d="M 15 2 C 22 10, 30 22, 24 32 C 18 40, 8 38, 4 30 C 0 20, 8 10, 15 2 Z"
              fill="#fda4af"
              opacity="0.8"
            />
          </svg>
        </span>
      ))}
    </div>
  );
};

// Component Tập viết nét & Xem thứ tự nét chữ Hán trên giấy ô chữ điền (田字格)
const KanjiStrokeBox: React.FC<{ kanji: string; strokeCount: number }> = ({ kanji, strokeCount }) => {
  const [tab, setTab] = useState<'diagram' | 'canvas'>('diagram');
  const [svgUrl, setSvgUrl] = useState<string>('');
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loadingSvg, setLoadingSvg] = useState<boolean>(true);
  const [showGhost, setShowGhost] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Lấy mã hex unicode của chữ Hán (ví dụ: 日 -> 065e5)
  const hex = useMemo(() => {
    if (!kanji) return '';
    return kanji.charCodeAt(0).toString(16).padStart(5, '0');
  }, [kanji]);

  useEffect(() => {
    if (!hex) return;
    const url = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${hex}.svg`;
    setSvgUrl(url);
    setLoadingSvg(true);

    fetch(url)
      .then(res => {
        if (res.ok) return res.text();
        throw new Error('Not found');
      })
      .then(svgText => {
        // Tối ưu màu sắc SVG cho phong cách Nhật Bản: nét đen bút mực, số nét màu đỏ son (Hanko red)
        const customized = svgText
          .replace(/<style>[\s\S]*?<\/style>/gi, '')
          .replace(/kvg:element=".*?"/g, '')
          .replace(/font-size:8pt;/g, 'font-size:10pt; font-weight:900; fill:#c53d32;')
          .replace(/stroke:#000000;/g, 'stroke:#1c2536; stroke-width:3.2; stroke-linecap:round; stroke-linejoin:round;');
        setSvgContent(customized);
      })
      .catch(() => {
        setSvgContent(null);
      })
      .finally(() => {
        setLoadingSvg(false);
      });
  }, [hex]);

  // Vẽ nền ô chữ mễ (米字格) lên canvas tập viết
  const drawCanvasBackground = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Kẻ đường chấm chữ mễ
    ctx.save();
    ctx.strokeStyle = '#e2dcd2';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Trục ngang giữa
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Trục dọc giữa
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Hai đường chéo góc
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width, 0);
    ctx.lineTo(0, canvas.height);
    ctx.stroke();

    ctx.restore();
  };

  useEffect(() => {
    if (tab === 'canvas') {
      setTimeout(() => drawCanvasBackground(), 50);
    }
  }, [tab]);

  // Xử lý vẽ nét cọ tay trên canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const drawStroke = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1c2536';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  return (
    <div style={{
      background: '#faf8f5',
      borderRadius: 12,
      border: '1px solid #ebe7df',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Nút chuyển đổi: Thứ tự nét vs Tự luyện viết */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button
          onClick={() => setTab('diagram')}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: tab === 'diagram' ? '#c53d32' : '#ffffff',
            color: tab === 'diagram' ? '#ffffff' : '#78716c',
            borderBottom: tab === 'diagram' ? '2px solid #a82e24' : '1px solid #d6d3d1'
          }}
        >
          Thứ tự từng nét vẽ ({strokeCount} nét)
        </button>

        <button
          onClick={() => setTab('canvas')}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: tab === 'canvas' ? '#1c2536' : '#ffffff',
            color: tab === 'canvas' ? '#ffffff' : '#78716c',
            borderBottom: tab === 'canvas' ? '2px solid #0f172a' : '1px solid #d6d3d1'
          }}
        >
          Luyện viết tay
        </button>
      </div>

      {/* Khung vẽ ô giấy điền (Genkouyoushi) */}
      <div style={{
        position: 'relative',
        width: 200,
        height: 200,
        background: '#fffefc',
        borderRadius: 8,
        border: '2px solid #d6cebf',
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.03)',
        overflow: 'hidden'
      }}>
        {/* Đường lưới nét đứt chữ mễ chuẩn thư pháp */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(to right, transparent 49.5%, #f1ebe1 49.5%, #f1ebe1 50.5%, transparent 50.5%),
            linear-gradient(to bottom, transparent 49.5%, #f1ebe1 49.5%, #f1ebe1 50.5%, transparent 50.5%)
          `
        }} />

        {tab === 'diagram' ? (
          loadingSvg ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#a8a29e' }}>
              Đang tải nét vẽ...
            </div>
          ) : svgContent ? (
            <div
              style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            /* Fallback khi không có SVG nét vẽ */
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 100,
              fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
              color: '#1c2536'
            }}>
              {kanji}
            </div>
          )
        ) : (
          /* Bảng tương tác vẽ nét cọ tay */
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {showGhost && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 120,
                fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
                color: 'rgba(0, 0, 0, 0.08)',
                pointerEvents: 'none',
                userSelect: 'none'
              }}>
                {kanji}
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={200}
              height={200}
              onMouseDown={startDrawing}
              onMouseMove={drawStroke}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={drawStroke}
              onTouchEnd={stopDrawing}
              style={{ width: 200, height: 200, cursor: 'crosshair', touchAction: 'none' }}
            />
          </div>
        )}
      </div>

      {/* Điều khiển bảng vẽ */}
      {tab === 'canvas' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={() => setShowGhost(!showGhost)}
            style={{
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              background: showGhost ? '#e0f2fe' : '#ffffff',
              color: showGhost ? '#0284c7' : '#78716c',
              border: '1px solid #bae6fd',
              cursor: 'pointer'
            }}
          >
            {showGhost ? 'Ẩn chữ mờ' : 'Hiện chữ mờ'}
          </button>

          <button
            onClick={drawCanvasBackground}
            style={{
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              background: '#fdf2f0',
              color: '#c53d32',
              border: '1px solid #fecaca',
              cursor: 'pointer'
            }}
          >
            Xóa viết lại
          </button>
        </div>
      )}

      {tab === 'diagram' && (
        <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 8, textAlign: 'center' }}>
          Số màu đỏ biểu thị vị trí và thứ tự bắt đầu của từng nét
        </div>
      )}
    </div>
  );
};

export const KanjiPage: React.FC = () => {
  // Navigation State
  const [catalog, setCatalog] = useState<KanjiCatalog | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<JlptLevelKey>('N5');
  const [selectedBook, setSelectedBook] = useState<KanjiBook | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<KanjiUnit | null>(null);

  // Unit Kanji Data
  const [unitKanjiList, setUnitKanjiList] = useState<KanjiItem[]>([]);
  const [loadingUnit, setLoadingUnit] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKanji, setSelectedKanji] = useState<KanjiItem | null>(null);

  // Study Mode State
  const [currentMode, setCurrentMode] = useState<StudyMode>('list');

  // Hướng lướt khi chuyển thẻ: 'next' (lướt sang trái) hoặc 'prev' (lướt sang phải)
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');

  // --- State Dạng 1: Flashcard Lật 3D SRS ---
  const [flipActiveIndex, setFlipActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [learningIds, setLearningIds] = useState<Set<string>>(new Set());
  const [flipStudyList, setFlipStudyList] = useState<KanjiItem[]>([]);
  const [flipFinished, setFlipFinished] = useState(false);

  // --- State Dạng 2: Bài tập Luyện Ghi Nhớ (Nhìn Hán Việt/Nghĩa chọn chữ Hán) ---
  const [quizQuestions, setQuizQuestions] = useState<KanjiQuizQuestion[]>([]);
  const [quizActiveIndex, setQuizActiveIndex] = useState(0);
  const [quizSelectedOptionIndex, setQuizSelectedOptionIndex] = useState<number | null>(null);
  const [quizAnswerChecked, setQuizAnswerChecked] = useState(false);
  const [quizIsCorrect, setQuizIsCorrect] = useState(false);
  const [quizIsSkipped, setQuizIsSkipped] = useState(false);
  const [quizWrongQuestions, setQuizWrongQuestions] = useState<KanjiQuizQuestion[]>([]);
  const [quizSkippedQuestions, setQuizSkippedQuestions] = useState<KanjiQuizQuestion[]>([]);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Thứ tự học: sắp xếp ngẫu nhiên hoặc theo thứ tự mặc định
  const [isShuffle, setIsShuffle] = useState(false);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Tạo bộ câu hỏi trắc nghiệm nhìn âm Hán Việt/Nghĩa chọn chữ Hán (4 lựa chọn hoặc ít hơn tùy bài)
  const buildQuizQuestions = (items: KanjiItem[]): KanjiQuizQuestion[] => {
    return items.map(item => {
      const otherItems = items.filter(it => it.id !== item.id);
      const shuffledOthers = shuffleArray(otherItems);
      const maxDistractors = Math.min(3, shuffledOthers.length);
      const distractors = shuffledOthers.slice(0, maxDistractors);

      const options: KanjiQuizOption[] = shuffleArray([
        { kanji: item.kanji, sino: item.sinoVietnamese, isCorrect: true },
        ...distractors.map(d => ({ kanji: d.kanji, sino: d.sinoVietnamese, isCorrect: false }))
      ]);

      const hintCompound = item.exampleCompounds && item.exampleCompounds.length > 0
        ? {
            word: item.exampleCompounds[0].word || item.exampleCompounds[0].compound || '',
            reading: item.exampleCompounds[0].reading,
            meaning: item.exampleCompounds[0].meaning
          }
        : undefined;

      return {
        item,
        promptSino: item.sinoVietnamese,
        promptMeaning: item.vietnameseMeaning || item.meaning_vi || '',
        hintCompound,
        options
      };
    });
  };

  // Tải catalog lúc mount
  useEffect(() => {
    kizunaService.getKanjiCatalog().then(cat => {
      if (cat) {
        setCatalog(cat);
      }
    });
  }, []);

  // Tải chữ Hán khi chọn Unit
  useEffect(() => {
    if (!selectedUnit) {
      setUnitKanjiList([]);
      return;
    }

    async function loadUnitKanji() {
      setLoadingUnit(true);
      try {
        const items = await kizunaService.getKanjiByUnit(selectedUnit!.unitId);
        setUnitKanjiList(items);

        const studyItems = isShuffle ? shuffleArray(items) : items;

        // Reset Dạng 1: Flashcard
        setFlipStudyList(studyItems);
        setFlipActiveIndex(0);
        setIsFlipped(false);
        setMasteredIds(new Set());
        setLearningIds(new Set());
        setFlipFinished(false);

        // Reset Dạng 2: Trắc nghiệm
        const questions = buildQuizQuestions(studyItems);
        setQuizQuestions(questions);
        setQuizActiveIndex(0);
        setQuizSelectedOptionIndex(null);
        setQuizAnswerChecked(false);
        setQuizIsCorrect(false);
        setQuizIsSkipped(false);
        setQuizWrongQuestions([]);
        setQuizSkippedQuestions([]);
        setQuizCorrectCount(0);
        setQuizFinished(false);

        // Chọn chữ Hán đầu tiên để xem chi tiết
        if (items.length > 0) {
          setSelectedKanji(items[0]);
        }
      } finally {
        setLoadingUnit(false);
      }
    }

    loadUnitKanji();
  }, [selectedUnit]);

  // Phát âm tiếng Nhật (Web Speech API)
  const speakJapanese = (text: string) => {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech error:', e);
    }
  };

  const handleSelectLevel = (lvl: JlptLevelKey) => {
    setSelectedLevel(lvl);
    setSelectedBook(null);
    setSelectedUnit(null);
    setCurrentMode('list');
  };

  const handleSelectBook = (book: KanjiBook) => {
    setSelectedBook(book);
    setSelectedUnit(null);
    setCurrentMode('list');
  };

  const handleSelectUnit = (unit: KanjiUnit) => {
    setSelectedUnit(unit);
    setCurrentMode('list');
    setSearchTerm('');
  };

  const handleBackToBooks = () => {
    setSelectedBook(null);
    setSelectedUnit(null);
    setCurrentMode('list');
  };

  const handleBackToUnits = () => {
    setSelectedUnit(null);
    setCurrentMode('list');
  };

  // --- LOGIC CHO DẠNG 1: LẬT THẺ 3D ---
  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const handleMarkFlipResult = (mastered: boolean) => {
    if (flipStudyList.length === 0) return;
    const currentItem = flipStudyList[flipActiveIndex];
    if (!currentItem) return;

    if (mastered) {
      setMasteredIds(prev => new Set(prev).add(currentItem.id));
      setLearningIds(prev => {
        const next = new Set(prev);
        next.delete(currentItem.id);
        return next;
      });
    } else {
      setLearningIds(prev => new Set(prev).add(currentItem.id));
    }

    setSlideDirection('next');
    if (flipActiveIndex + 1 < flipStudyList.length) {
      setFlipActiveIndex(flipActiveIndex + 1);
      setIsFlipped(false);
    } else {
      setFlipFinished(true);
    }
  };

  const restartAllFlip = () => {
    const list = isShuffle ? shuffleArray(unitKanjiList) : unitKanjiList;
    setFlipStudyList(list);
    setFlipActiveIndex(0);
    setIsFlipped(false);
    setMasteredIds(new Set());
    setLearningIds(new Set());
    setFlipFinished(false);
  };

  const restartUnlearnedFlip = () => {
    let unlearned = unitKanjiList.filter(item => learningIds.has(item.id));
    if (unlearned.length === 0) {
      restartAllFlip();
      return;
    }
    if (isShuffle) {
      unlearned = shuffleArray(unlearned);
    }
    setFlipStudyList(unlearned);
    setFlipActiveIndex(0);
    setIsFlipped(false);
    setFlipFinished(false);
  };

  // --- LOGIC CHO DẠNG 2: BÀI TẬP TRẮC NGHIỆM CHỮ HÁN ---
  const handleSelectQuizOption = (optionIndex: number) => {
    if (quizAnswerChecked || quizQuestions.length === 0) return;

    const currentQuestion = quizQuestions[quizActiveIndex];
    if (!currentQuestion) return;

    const selectedOpt = currentQuestion.options[optionIndex];
    if (!selectedOpt) return;

    const isCorrect = selectedOpt.isCorrect;

    setQuizSelectedOptionIndex(optionIndex);
    setQuizIsCorrect(isCorrect);
    setQuizIsSkipped(false);
    setQuizAnswerChecked(true);

    if (isCorrect) {
      setQuizCorrectCount(prev => prev + 1);
    } else {
      setQuizWrongQuestions(prev => [...prev, currentQuestion]);
    }
  };

  const handleSkipQuizCard = () => {
    if (quizAnswerChecked || quizQuestions.length === 0) return;
    const currentQuestion = quizQuestions[quizActiveIndex];
    if (!currentQuestion) return;

    setQuizIsSkipped(true);
    setQuizIsCorrect(false);
    setQuizAnswerChecked(true);
    setQuizSkippedQuestions(prev => [...prev, currentQuestion]);
  };

  const handleNextQuizQuestion = () => {
    setSlideDirection('next');
    if (quizActiveIndex + 1 < quizQuestions.length) {
      setQuizActiveIndex(quizActiveIndex + 1);
      setQuizSelectedOptionIndex(null);
      setQuizAnswerChecked(false);
      setQuizIsCorrect(false);
      setQuizIsSkipped(false);
    } else {
      setQuizFinished(true);
    }
  };

  const restartAllQuiz = () => {
    const list = isShuffle ? shuffleArray(unitKanjiList) : unitKanjiList;
    const questions = buildQuizQuestions(list);
    setQuizQuestions(questions);
    setQuizActiveIndex(0);
    setQuizSelectedOptionIndex(null);
    setQuizAnswerChecked(false);
    setQuizIsCorrect(false);
    setQuizIsSkipped(false);
    setQuizWrongQuestions([]);
    setQuizSkippedQuestions([]);
    setQuizCorrectCount(0);
    setQuizFinished(false);
  };

  const restartWrongOrSkippedQuiz = () => {
    const combinedMap = new Map<string, KanjiQuizQuestion>();
    [...quizWrongQuestions, ...quizSkippedQuestions].forEach(q => combinedMap.set(q.item.id, q));
    let retryQuestions = Array.from(combinedMap.values());
    if (retryQuestions.length === 0) {
      restartAllQuiz();
      return;
    }
    const retryItems = retryQuestions.map(q => q.item);
    const rebuilt = buildQuizQuestions(isShuffle ? shuffleArray(retryItems) : retryItems);

    setQuizQuestions(rebuilt);
    setQuizActiveIndex(0);
    setQuizSelectedOptionIndex(null);
    setQuizAnswerChecked(false);
    setQuizIsCorrect(false);
    setQuizIsSkipped(false);
    setQuizWrongQuestions([]);
    setQuizSkippedQuestions([]);
    setQuizCorrectCount(0);
    setQuizFinished(false);
  };

  // Chức năng chuyển đổi sắp xếp ngẫu nhiên hoặc theo thứ tự
  const handleToggleShuffle = () => {
    const nextShuffle = !isShuffle;
    setIsShuffle(nextShuffle);

    if (currentMode === 'flip') {
      const nextList = nextShuffle ? shuffleArray(unitKanjiList) : [...unitKanjiList];
      setFlipStudyList(nextList);
      setFlipActiveIndex(0);
      setIsFlipped(false);
      setFlipFinished(false);
    } else if (currentMode === 'quiz') {
      const nextList = nextShuffle ? shuffleArray(unitKanjiList) : [...unitKanjiList];
      const questions = buildQuizQuestions(nextList);
      setQuizQuestions(questions);
      setQuizActiveIndex(0);
      setQuizSelectedOptionIndex(null);
      setQuizAnswerChecked(false);
      setQuizIsCorrect(false);
      setQuizIsSkipped(false);
      setQuizWrongQuestions([]);
      setQuizSkippedQuestions([]);
      setQuizCorrectCount(0);
      setQuizFinished(false);
    }
  };

  // Tự động chuyển thẻ tiếp theo sau 5 giây hiển thị kết quả ở Dạng 2
  useEffect(() => {
    if (!quizAnswerChecked || quizFinished) return;

    const timer = setTimeout(() => {
      handleNextQuizQuestion();
    }, 5000);

    return () => clearTimeout(timer);
  }, [quizAnswerChecked, quizActiveIndex, quizFinished, quizQuestions.length]);

  // Lắng nghe tương tác phím
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput) return;

      if (currentMode === 'flip' && !flipFinished && flipStudyList.length > 0) {
        if (e.key === 'Tab') {
          e.preventDefault();
          handleMarkFlipResult(false);
          return;
        }

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (!isFlipped) {
            setIsFlipped(true);
          } else {
            handleMarkFlipResult(true);
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (isFlipped) {
            setIsFlipped(false);
          } else {
            if (flipActiveIndex > 0) {
              setSlideDirection('prev');
              setFlipActiveIndex(prev => prev - 1);
              setIsFlipped(false);
            }
          }
        } else if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          handleFlipCard();
        }
      } else if (currentMode === 'quiz' && !quizFinished && quizQuestions.length > 0) {
        const currentQ = quizQuestions[quizActiveIndex];
        const numOptions = currentQ ? currentQ.options.length : 0;

        if (e.key === 'Tab') {
          e.preventDefault();
          if (!quizAnswerChecked) {
            handleSkipQuizCard();
          } else {
            handleNextQuizQuestion();
          }
          return;
        }

        if (quizAnswerChecked && e.key === 'Enter') {
          e.preventDefault();
          handleNextQuizQuestion();
          return;
        }

        if (!quizAnswerChecked) {
          if ((e.key === '1' || e.key.toLowerCase() === 'a') && numOptions >= 1) {
            e.preventDefault();
            handleSelectQuizOption(0);
          } else if ((e.key === '2' || e.key.toLowerCase() === 'b') && numOptions >= 2) {
            e.preventDefault();
            handleSelectQuizOption(1);
          } else if ((e.key === '3' || e.key.toLowerCase() === 'c') && numOptions >= 3) {
            e.preventDefault();
            handleSelectQuizOption(2);
          } else if ((e.key === '4' || e.key.toLowerCase() === 'd') && numOptions >= 4) {
            e.preventDefault();
            handleSelectQuizOption(3);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMode, isFlipped, flipActiveIndex, flipStudyList, flipFinished, quizAnswerChecked, quizActiveIndex, quizQuestions, quizFinished]);

  // Filter chữ Hán
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return unitKanjiList;
    const q = searchTerm.toLowerCase();
    return unitKanjiList.filter(item =>
      item.kanji.toLowerCase().includes(q) ||
      item.sinoVietnamese.toLowerCase().includes(q) ||
      item.vietnameseMeaning.toLowerCase().includes(q) ||
      (item.onyomi && item.onyomi.toLowerCase().includes(q)) ||
      (item.kunyomi && item.kunyomi.toLowerCase().includes(q))
    );
  }, [unitKanjiList, searchTerm]);

  const currentLevelBooks = (catalog && catalog[selectedLevel]) || [];
  const currentQuizQuestion = quizQuestions[quizActiveIndex];

  return (
    <div style={{
      maxWidth: 1040,
      margin: '0 auto',
      paddingBottom: 64,
      fontFamily: '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>{`
        @keyframes sakuraFall {
          0% {
            top: -8%;
            transform: translateX(0) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 0.8;
          }
          50% {
            transform: translateX(22px) rotate(180deg);
          }
          85% {
            opacity: 0.8;
          }
          100% {
            top: 108%;
            transform: translateX(-15px) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes autoCountdown5s {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        @keyframes cardSlideInNext {
          0% {
            opacity: 0;
            transform: translateX(36px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes cardSlideInPrev {
          0% {
            opacity: 0;
            transform: translateX(-36px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes resultSlideUp {
          0% {
            opacity: 0;
            transform: translateY(14px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* 1. HEADER MANG PHONG CÁCH NHẬT BẢN HIỆN ĐẠI (和の美学) */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16,
          paddingBottom: 16,
          borderBottom: '1px solid #ebe7df'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              {/* Dấu triện Hanko đỏ (印鑑) KIZUNA */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                border: '1.5px solid #c53d32',
                borderRadius: 4,
                color: '#c53d32',
                fontSize: 13,
                fontWeight: 900,
                fontFamily: 'serif',
                lineHeight: 1,
                background: '#fffcfb'
              }}>
                絆
              </span>
              <h1 style={{ fontSize: 23, fontWeight: 900, color: '#1c2536', margin: 0, letterSpacing: '-0.3px' }}>
                漢字帳 <span style={{ fontSize: 17, fontWeight: 700, color: '#475569' }}>· Chữ Hán Tiếng Nhật</span>
              </h1>
            </div>
            <p style={{ color: '#78716c', fontSize: 13, margin: 0 }}>
              Học <strong>2,216 chữ Hán</strong> chuẩn JLPT qua mẹo tượng hình, bộ thủ chiết tự & tập viết từng nét.
            </p>
          </div>

          {/* Thanh chuyển cấp độ N phong cách Thẻ bài Nhật Bản (札 - Fuda) */}
          <div style={{
            display: 'flex',
            background: '#f4f2ee',
            padding: 3,
            borderRadius: 10,
            border: '1px solid #e5e0d8',
            gap: 2
          }}>
            {(['N5', 'N4', 'N3', 'N2', 'N1'] as JlptLevelKey[]).map(lvl => {
              const isActive = selectedLevel === lvl;
              const meta = LEVEL_LABELS[lvl];
              return (
                <button
                  key={lvl}
                  onClick={() => handleSelectLevel(lvl)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 7,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: isActive ? '#c53d32' : 'transparent',
                    color: isActive ? '#ffffff' : '#57534e',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    lineHeight: 1.15
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.5px' }}>{lvl}</span>
                  <span style={{ fontSize: 10, opacity: isActive ? 0.95 : 0.7, fontWeight: 600 }}>{meta.kanji}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Breadcrumb Navigation phong cách chỉ mục Nhật */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: '#78716c',
          padding: '8px 14px',
          background: '#faf8f5',
          borderRadius: 8,
          border: '1px solid #ebe7df'
        }}>
          <span
            onClick={handleBackToBooks}
            style={{
              cursor: selectedBook ? 'pointer' : 'default',
              color: selectedBook ? '#2563eb' : '#1c2536',
              fontWeight: 700
            }}
          >
            【 {selectedLevel} · {LEVEL_LABELS[selectedLevel].kanji} 】
          </span>
          {selectedBook && (
            <>
              <span style={{ color: '#d6d3d1' }}>／</span>
              <span
                onClick={handleBackToUnits}
                style={{
                  cursor: selectedUnit ? 'pointer' : 'default',
                  color: selectedUnit ? '#2563eb' : '#1c2536',
                  fontWeight: 600
                }}
              >
                {selectedBook.bookName}
              </span>
            </>
          )}
          {selectedUnit && (
            <>
              <span style={{ color: '#d6d3d1' }}>／</span>
              <span style={{ color: '#1c2536', fontWeight: 700 }}>
                {selectedUnit.unitTitle}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2. CHỌN GIÁO TRÌNH CHỮ HÁN CỦA CẤP ĐỘ HIỆN TẠI */}
      {!selectedBook && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {currentLevelBooks.map(book => {
            const spineColor = '#c53d32';
            return (
              <div
                key={book.bookId}
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid #ebe7df',
                  borderLeft: `5px solid ${spineColor}`,
                  padding: 24,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => handleSelectBook(book)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = spineColor;
                  e.currentTarget.style.borderLeftColor = spineColor;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#ebe7df';
                  e.currentTarget.style.borderLeftColor = spineColor;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.03)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 14,
                      fontSize: 12,
                      fontWeight: 700,
                      background: '#fdf2f0',
                      color: spineColor,
                      border: '1px solid #f3d5d2'
                    }}>
                      『漢字体系 · Tự Điển Hán Tự』
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#c53d32' }}>
                      {selectedLevel} · {LEVEL_LABELS[selectedLevel].kanji}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1c2536', marginBottom: 6 }}>
                    {book.bookName}
                  </h3>

                  <p style={{ color: '#78716c', fontSize: 13, lineHeight: 1.5, marginBottom: 18 }}>
                    {book.description}
                  </p>

                  <div style={{
                    display: 'flex',
                    gap: 16,
                    background: '#faf8f5',
                    padding: '10px 14px',
                    borderRadius: 8,
                    marginBottom: 16,
                    border: '1px solid #f0ece3'
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#a8a29e', fontWeight: 600 }}>課 (Số bài)</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1c2536' }}>{book.units.length} bài</div>
                    </div>
                    <div style={{ width: 1, background: '#e7e3da' }} />
                    <div>
                      <div style={{ fontSize: 11, color: '#a8a29e', fontWeight: 600 }}>漢字 (Số chữ)</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#2d6d4b' }}>{book.totalItems.toLocaleString()} chữ</div>
                    </div>
                  </div>
                </div>

                <button
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    background: '#1c2536',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#c53d32'}
                  onMouseLeave={e => e.currentTarget.style.background = '#1c2536'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectBook(book);
                  }}
                >
                  開く (Mở sách) ➔
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. DANH SÁCH BÀI HỌC (UNITS) CHỮ HÁN */}
      {selectedBook && !selectedUnit && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1c2536', margin: '0 0 2px 0' }}>
                {selectedBook.bookName}
              </h2>
              <div style={{ color: '#78716c', fontSize: 13 }}>
                Tổng cộng {selectedBook.units.length} bài học · {selectedBook.totalItems.toLocaleString()} chữ Hán
              </div>
            </div>

            <button
              onClick={handleBackToBooks}
              style={{
                background: '#ffffff',
                border: '1px solid #d6d3d1',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#57534e',
                cursor: 'pointer'
              }}
            >
              ⬅️ Chọn giáo trình khác
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 14
          }}>
            {selectedBook.units.map(unit => {
              return (
                <div
                  key={unit.unitId}
                  onClick={() => handleSelectUnit(unit)}
                  style={{
                    background: '#ffffff',
                    borderRadius: 10,
                    border: '1px solid #ebe7df',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#c53d32';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#ebe7df';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2d6d4b' }}>
                        {unit.itemCount} 漢字
                      </span>
                      {unit.lessonNumber && (
                        <span style={{ fontSize: 11, color: '#78716c', background: '#faf8f5', padding: '2px 8px', borderRadius: 4, border: '1px solid #f0ece3' }}>
                          Bài {unit.lessonNumber}
                        </span>
                      )}
                    </div>

                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1c2536', margin: '4px 0 6px 0', lineHeight: 1.4 }}>
                      {unit.unitTitle}
                    </h4>

                    {/* Preview các chữ Hán trong bài */}
                    {unit.kanjiPreview && unit.kanjiPreview.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {unit.kanjiPreview.map((kp, ki) => (
                          <span
                            key={ki}
                            style={{
                              background: '#faf8f5',
                              border: '1px solid #ebe7df',
                              borderRadius: 4,
                              padding: '2px 6px',
                              fontSize: 13,
                              fontWeight: 800,
                              color: '#1c2536'
                            }}
                          >
                            {kp.kanji}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #f0ece3', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#c53d32' }}>
                      Vào học bài →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. KHÔNG GIAN HỌC UNIT (DANH SÁCH + 2 BÀI TẬP: ÔN TẬP & LUYỆN GHI NHỚ) */}
      {selectedBook && selectedUnit && (
        <div>
          {/* Header của bài học */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #ebe7df',
            padding: '18px 22px',
            marginBottom: 20,
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1c2536', margin: '0 0 3px 0' }}>
                  {selectedUnit.unitTitle}
                </h2>
                <div style={{ fontSize: 13, color: '#78716c' }}>
                  {selectedBook.bookName} · {unitKanjiList.length} chữ Hán
                </div>
              </div>

              <button
                onClick={handleBackToUnits}
                style={{
                  background: '#faf8f5',
                  border: '1px solid #d6d3d1',
                  padding: '6px 12px',
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#44403c',
                  cursor: 'pointer'
                }}
              >
                ⬅️ Danh sách bài
              </button>
            </div>

            {/* Tabs chuyển chế độ: Danh sách + 2 bài tập */}
            <div style={{
              display: 'flex',
              gap: 8,
              borderTop: '1px solid #f2eee8',
              paddingTop: 12,
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setCurrentMode('list')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: currentMode === 'list' ? '#1c2536' : '#faf8f5',
                  color: currentMode === 'list' ? '#ffffff' : '#78716c',
                  borderBottom: currentMode === 'list' ? '2px solid #1c2536' : '1px solid #e7e3da',
                  transition: 'all 0.15s ease'
                }}
              >
                Danh sách chữ Hán
              </button>

              {/* DẠNG 1: ÔN TẬP (Thẻ lật) */}
              <button
                onClick={() => {
                  setCurrentMode('flip');
                  restartAllFlip();
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: currentMode === 'flip' ? '#c53d32' : '#faf8f5',
                  color: currentMode === 'flip' ? '#ffffff' : '#78716c',
                  borderBottom: currentMode === 'flip' ? '2px solid #c53d32' : '1px solid #e7e3da',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{
                  background: currentMode === 'flip' ? 'rgba(255,255,255,0.25)' : '#ede7de',
                  padding: '2px 7px',
                  borderRadius: 5,
                  fontSize: 12,
                  fontWeight: 900
                }}>1</span>
                <span>Ôn tập</span>
              </button>

              {/* DẠNG 2: LUYỆN GHI NHỚ (Nhìn nghĩa chọn chữ Hán) */}
              <button
                onClick={() => {
                  setCurrentMode('quiz');
                  restartAllQuiz();
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: currentMode === 'quiz' ? '#2563eb' : '#faf8f5',
                  color: currentMode === 'quiz' ? '#ffffff' : '#78716c',
                  borderBottom: currentMode === 'quiz' ? '2px solid #2563eb' : '1px solid #e7e3da',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{
                  background: currentMode === 'quiz' ? 'rgba(255,255,255,0.25)' : '#ede7de',
                  padding: '2px 7px',
                  borderRadius: 5,
                  fontSize: 12,
                  fontWeight: 900
                }}>2</span>
                <span>Luyện ghi nhớ</span>
              </button>
            </div>
          </div>

          {loadingUnit ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#78716c', fontSize: 14 }}>
              ⏳ Đang nạp chữ Hán bài học...
            </div>
          ) : (
            <>
              {/* CHẾ ĐỘ 0: DANH SÁCH CHỮ HÁN + CHI TIẾT NÉT VẼ & BỘ THỦ */}
              {currentMode === 'list' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#57534e' }}>
                      {filteredList.length} chữ Hán trong bài:
                    </div>
                    <div style={{ minWidth: 260 }}>
                      <input
                        type="text"
                        placeholder="🔍 Tìm chữ Hán, Hán Việt hoặc nghĩa..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 12px',
                          borderRadius: 7,
                          border: '1px solid #d6d3d1',
                          fontSize: 13,
                          outline: 'none',
                          background: '#ffffff'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 20 }}>
                    {/* Cột trái: Lưới các ô chữ Hán */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))',
                      gap: 10,
                      alignContent: 'start'
                    }}>
                      {filteredList.map(item => {
                        const isSelected = selectedKanji?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedKanji(item)}
                            style={{
                              background: isSelected ? '#fdf2f0' : '#ffffff',
                              borderRadius: 10,
                              border: isSelected ? '2px solid #c53d32' : '1px solid #ebe7df',
                              padding: '12px 6px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 4px 10px rgba(197, 61, 50, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{
                              fontSize: 32,
                              fontWeight: 900,
                              color: isSelected ? '#c53d32' : '#1c2536',
                              fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                            }}>
                              {item.kanji}
                            </div>
                            <div style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: isSelected ? '#c53d32' : '#78716c',
                              marginTop: 4,
                              letterSpacing: '0.5px'
                            }}>
                              {item.sinoVietnamese}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Cột phải: Bảng chi tiết toàn diện (Nét vẽ, Bộ thủ, Mẹo nhớ, Âm On/Kun, Từ ghép) */}
                    {selectedKanji && (
                      <div style={{
                        background: '#ffffff',
                        borderRadius: 14,
                        border: '1px solid #ebe7df',
                        padding: 24,
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 20
                      }}>
                        {/* 1. Header chữ Hán & Phát âm */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                            <div style={{
                              width: 80,
                              height: 80,
                              background: '#fffefc',
                              border: '2px solid #e2dcd2',
                              borderRadius: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 50,
                              fontWeight: 900,
                              color: '#1c2536',
                              fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
                              boxShadow: 'inset 0 0 8px rgba(0,0,0,0.03)'
                            }}>
                              {selectedKanji.kanji}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <h3 style={{ fontSize: 24, fontWeight: 900, color: '#c53d32', margin: 0 }}>
                                  {selectedKanji.sinoVietnamese}
                                </h3>
                                <button
                                  onClick={() => speakJapanese(selectedKanji.kanji)}
                                  title="Phát âm chữ Hán"
                                  style={{
                                    background: '#faf8f5',
                                    border: '1px solid #d6d3d1',
                                    borderRadius: 16,
                                    padding: '3px 10px',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    color: '#44403c'
                                  }}
                                >
                                  🔊 Phát âm
                                </button>
                              </div>
                              <div style={{ fontSize: 16, color: '#2d6d4b', fontWeight: 700, marginTop: 4 }}>
                                {selectedKanji.vietnameseMeaning || selectedKanji.meaning_vi}
                              </div>
                              <div style={{ fontSize: 12, color: '#78716c', marginTop: 3 }}>
                                Cấp độ: <strong>{selectedKanji.jlptLevel || selectedLevel}</strong> · Số nét: <strong>{selectedKanji.strokeCount} nét</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 2. Cách viết chữ Hán & Thứ tự từng nét vẽ (KanjiStrokeBox) */}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#78716c', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
                            ✍️ Cách Viết & Thứ Tự Từng Nét:
                          </div>
                          <KanjiStrokeBox kanji={selectedKanji.kanji} strokeCount={selectedKanji.strokeCount} />
                        </div>

                        {/* 3. Bộ thủ chuẩn & Mẹo ghi nhớ chi tiết */}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#78716c', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
                            🧩 Bộ Thủ & Mẹo Nhớ Tượng Hình:
                          </div>
                          <div style={{
                            background: '#faf8f5',
                            border: '1px solid #ebe7df',
                            borderRadius: 10,
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10
                          }}>
                            {selectedKanji.radicals && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                  background: '#fdf2f0',
                                  color: '#c53d32',
                                  border: '1px solid #f3d5d2',
                                  padding: '3px 10px',
                                  borderRadius: 6,
                                  fontSize: 13,
                                  fontWeight: 800
                                }}>
                                  Bộ thủ: {selectedKanji.radicals}
                                </span>
                                {RADICAL_INFO[selectedKanji.radicals] && (
                                  <span style={{ fontSize: 13, color: '#57534e' }}>
                                    〔 {RADICAL_INFO[selectedKanji.radicals].sino} · {RADICAL_INFO[selectedKanji.radicals].meaning} 〕
                                  </span>
                                )}
                              </div>
                            )}

                            {selectedKanji.mnemonicStory && (
                              <div style={{
                                background: '#ffffff',
                                border: '1px solid #e7e3da',
                                borderLeft: '3px solid #2d6d4b',
                                borderRadius: 6,
                                padding: '10px 12px',
                                fontSize: 13,
                                color: '#334155',
                                lineHeight: 1.5
                              }}>
                                💡 <strong>Mẹo nhớ:</strong> {selectedKanji.mnemonicStory}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 4. Âm On (Katakana) & Âm Kun (Hiragana) */}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#78716c', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
                            🗣️ Cách Đọc Âm On & Âm Kun:
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {/* Âm On */}
                            <div style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: 8,
                              padding: '12px 14px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>音読み · ÂM ON</div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: '#1e40af', marginTop: 3 }}>
                                  {selectedKanji.onyomi || '—'}
                                </div>
                              </div>
                              {selectedKanji.onyomi && selectedKanji.onyomi !== '—' && (
                                <button
                                  onClick={() => speakJapanese(selectedKanji.onyomi!.replace(/[\,\s]/g, '、'))}
                                  title="Nghe âm On"
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}
                                >
                                  🔊
                                </button>
                              )}
                            </div>

                            {/* Âm Kun */}
                            <div style={{
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              borderRadius: 8,
                              padding: '12px 14px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#166534' }}>訓読み · ÂM KUN</div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: '#15803d', marginTop: 3 }}>
                                  {selectedKanji.kunyomi || '—'}
                                </div>
                              </div>
                              {selectedKanji.kunyomi && selectedKanji.kunyomi !== '—' && (
                                <button
                                  onClick={() => speakJapanese(selectedKanji.kunyomi!.replace(/[\,\s\.]/g, '、'))}
                                  title="Nghe âm Kun"
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}
                                >
                                  🔊
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 5. Từ ghép thực tế (Example Compounds) */}
                        {selectedKanji.exampleCompounds && selectedKanji.exampleCompounds.length > 0 && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#78716c', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
                              📚 Từ Ghép Thực Tế Chứa Chữ Này:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {selectedKanji.exampleCompounds.map((comp, ci) => {
                                const wordText = comp.word || comp.compound || '';
                                return (
                                  <div
                                    key={ci}
                                    style={{
                                      background: '#faf8f5',
                                      border: '1px solid #ebe7df',
                                      borderRadius: 8,
                                      padding: '8px 12px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      gap: 12
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: 15, fontWeight: 900, color: '#1c2536' }}>
                                        {wordText}
                                      </span>
                                      <span style={{ fontSize: 13, color: '#2d6d4b', fontWeight: 700 }}>
                                        【 {comp.reading} 】
                                      </span>
                                      <span style={{ fontSize: 13, color: '#57534e' }}>
                                        : {comp.meaning}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => speakJapanese(wordText || comp.reading)}
                                      title="Phát âm từ ghép"
                                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13 }}
                                    >
                                      🔊
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CHẾ ĐỘ 1: DẠNG 1 - ÔN TẬP (Thẻ lật Flashcard 3D) */}
              {currentMode === 'flip' && (
                <div>
                  {!flipFinished ? (
                    <div style={{ maxWidth: 640, margin: '0 auto' }}>
                      {/* Tiến trình và chế độ sắp xếp */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, color: '#78716c', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 600 }}>Thẻ {flipActiveIndex + 1} / {flipStudyList.length}</span>
                          <button
                            onClick={handleToggleShuffle}
                            style={{
                              padding: '3px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              borderRadius: 16,
                              border: '1px solid #d6d3d1',
                              background: isShuffle ? '#f3f4f6' : '#ffffff',
                              color: isShuffle ? '#1c2536' : '#78716c',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              transition: 'all 0.15s ease'
                            }}
                            title="Chuyển đổi giữa theo thứ tự và ngẫu nhiên"
                          >
                            {isShuffle ? 'Ngẫu nhiên' : 'Theo thứ tự'}
                          </button>
                        </div>
                        <div>
                          Đã thuộc: <strong style={{ color: '#2d6d4b' }}>{masteredIds.size}</strong> | Chưa thuộc: <strong style={{ color: '#c53d32' }}>{learningIds.size}</strong>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: 4, background: '#e7e3da', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                        <div style={{
                          width: `${((flipActiveIndex + 1) / flipStudyList.length) * 100}%`,
                          height: '100%',
                          background: '#c53d32',
                          transition: 'width 0.2s ease'
                        }} />
                      </div>

                      {/* Hiệu ứng lướt thẻ mượt mà & lật 3D */}
                      {flipStudyList[flipActiveIndex] && (
                        <div
                          key={flipActiveIndex}
                          style={{
                            perspective: 1000,
                            width: '100%',
                            minHeight: 380,
                            animation: `${slideDirection === 'next' ? 'cardSlideInNext' : 'cardSlideInPrev'} 0.32s cubic-bezier(0.22, 1, 0.36, 1) both`
                          }}
                        >
                          <div
                            onClick={handleFlipCard}
                            style={{
                              position: 'relative',
                              width: '100%',
                              minHeight: 380,
                              cursor: 'pointer',
                              transformStyle: 'preserve-3d',
                              transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                            }}
                          >
                            {/* MẶT TRƯỚC: Chữ Hán to, số nét, bộ thủ */}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(150deg, #ffffff 0%, #fdfbf7 100%)',
                                borderRadius: 20,
                                border: '1.5px solid #e7dfd5',
                                padding: '40px 32px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                boxShadow: '0 12px 30px -4px rgba(44, 30, 20, 0.06), 0 4px 10px -2px rgba(44, 30, 20, 0.03)',
                                overflow: 'hidden'
                              }}
                            >
                              <SakuraFallingBackground />

                              <span style={{
                                position: 'absolute',
                                top: 16,
                                left: 16,
                                fontSize: 11,
                                fontWeight: 900,
                                color: '#c53d32',
                                background: 'rgba(253, 242, 240, 0.85)',
                                border: '1px solid #f3d5d2',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontFamily: 'serif',
                                zIndex: 2
                              }}>
                                1 · 復習 (ÔN TẬP KANJI)
                              </span>

                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  speakJapanese(flipStudyList[flipActiveIndex].kanji);
                                }}
                                title="Phát âm chữ Hán"
                                style={{
                                  position: 'absolute',
                                  top: 16,
                                  right: 16,
                                  background: '#faf8f5',
                                  border: '1px solid #d6d3d1',
                                  padding: '5px 12px',
                                  borderRadius: 20,
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#44403c',
                                  zIndex: 2
                                }}
                              >
                                Phát âm
                              </button>

                              <div style={{ position: 'relative', zIndex: 2 }}>
                                <div style={{
                                  fontSize: 78,
                                  fontWeight: 900,
                                  color: '#1c2536',
                                  marginBottom: 10,
                                  fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                                }}>
                                  {flipStudyList[flipActiveIndex].kanji}
                                </div>

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                  <span style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#78716c',
                                    background: '#faf8f5',
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #e7e3da'
                                  }}>
                                    Số nét: {flipStudyList[flipActiveIndex].strokeCount}
                                  </span>

                                  {flipStudyList[flipActiveIndex].radicals && (
                                    <span style={{
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color: '#c53d32',
                                      background: '#fdf2f0',
                                      padding: '4px 10px',
                                      borderRadius: 6,
                                      border: '1px solid #f3d5d2'
                                    }}>
                                      Bộ thủ: {flipStudyList[flipActiveIndex].radicals}
                                    </span>
                                  )}
                                </div>

                                <div style={{ fontSize: 12, color: '#a8a29e', marginTop: 18 }}>
                                  Chạm vào thẻ hoặc bấm phím Space để lật xem cách đọc & mẹo nhớ
                                </div>
                              </div>
                            </div>

                            {/* MẶT SAU: Âm Hán Việt, Nghĩa, On/Kun & Mẹo nhớ */}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(150deg, #fdfbf7 0%, #ffffff 100%)',
                                borderRadius: 20,
                                border: '1.5px solid #e7dfd5',
                                padding: '30px 26px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                textAlign: 'left',
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)',
                                boxShadow: '0 12px 30px -4px rgba(44, 30, 20, 0.06), 0 4px 10px -2px rgba(44, 30, 20, 0.03)',
                                overflowY: 'auto'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <span style={{
                                  fontSize: 11,
                                  fontWeight: 900,
                                  color: '#2d6d4b',
                                  background: 'rgba(241, 248, 243, 0.85)',
                                  border: '1px solid #c6e2ce',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontFamily: 'serif'
                                }}>
                                  意味 · Ý NGHĨA
                                </span>

                                <span style={{ fontSize: 18, fontWeight: 900, color: '#1c2536', fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }}>
                                  {flipStudyList[flipActiveIndex].kanji}
                                </span>
                              </div>

                              <div style={{ fontSize: 20, fontWeight: 900, color: '#c53d32', marginBottom: 2 }}>
                                {flipStudyList[flipActiveIndex].sinoVietnamese}
                              </div>

                              <div style={{ fontSize: 14, fontWeight: 700, color: '#2d6d4b', marginBottom: 12 }}>
                                {flipStudyList[flipActiveIndex].vietnameseMeaning || flipStudyList[flipActiveIndex].meaning_vi}
                              </div>

                              {/* Âm On & Kun */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 8,
                                background: '#faf8f5',
                                padding: '8px 12px',
                                borderRadius: 8,
                                marginBottom: 12,
                                border: '1px solid #ebe7df'
                              }}>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b' }}>ÂM ON:</div>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1e40af' }}>
                                    {flipStudyList[flipActiveIndex].onyomi || '—'}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: '#166534' }}>ÂM KUN:</div>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: '#15803d' }}>
                                    {flipStudyList[flipActiveIndex].kunyomi || '—'}
                                  </div>
                                </div>
                              </div>

                              {/* Mẹo nhớ */}
                              {flipStudyList[flipActiveIndex].mnemonicStory && (
                                <div style={{
                                  background: '#fef3c7',
                                  border: '1px solid #fde68a',
                                  borderRadius: 6,
                                  padding: '8px 10px',
                                  fontSize: 12,
                                  color: '#78350f',
                                  marginBottom: 10,
                                  lineHeight: 1.4
                                }}>
                                  💡 {flipStudyList[flipActiveIndex].mnemonicStory}
                                </div>
                              )}

                              {/* 1 Từ ghép tiêu biểu */}
                              {flipStudyList[flipActiveIndex].exampleCompounds && flipStudyList[flipActiveIndex].exampleCompounds!.length > 0 && (
                                <div style={{ fontSize: 12, color: '#57534e' }}>
                                  Ví dụ: <strong>{flipStudyList[flipActiveIndex].exampleCompounds![0].word || flipStudyList[flipActiveIndex].exampleCompounds![0].compound}</strong> ({flipStudyList[flipActiveIndex].exampleCompounds![0].reading}): {flipStudyList[flipActiveIndex].exampleCompounds![0].meaning}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Các nút điều hướng kiểu Nhật */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, gap: 12 }}>
                        <button
                          onClick={() => handleMarkFlipResult(false)}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            background: '#fdf2f0',
                            color: '#c53d32',
                            border: '1px solid #f3d5d2',
                            borderRadius: 10,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Chưa thuộc
                        </button>

                        <button
                          onClick={handleFlipCard}
                          style={{
                            padding: '12px 24px',
                            background: '#ffffff',
                            color: '#44403c',
                            border: '1px solid #d6d3d1',
                            borderRadius: 10,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Lật thẻ
                        </button>

                        <button
                          onClick={() => handleMarkFlipResult(true)}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            background: '#f1f8f3',
                            color: '#2d6d4b',
                            border: '1px solid #c6e2ce',
                            borderRadius: 10,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Đã thuộc
                        </button>
                      </div>

                      {/* Hướng dẫn phím bấm */}
                      <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#a8a29e' }}>
                        Dùng phím mũi tên trái và phải để lật và chuyển thẻ · Phím Tab để bỏ qua
                      </div>
                    </div>
                  ) : (
                    /* Tổng kết Dạng 1 */
                    <div style={{
                      maxWidth: 480,
                      margin: '0 auto',
                      background: '#ffffff',
                      borderRadius: 14,
                      border: '1px solid #ebe7df',
                      padding: 32,
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        background: '#f1f8f3',
                        color: '#2d6d4b',
                        fontSize: 22,
                        marginBottom: 10
                      }}>
                        完
                      </div>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1c2536', marginBottom: 6 }}>
                        Hoàn thành bài học chữ Hán
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '20px 0' }}>
                        <div style={{ background: '#f1f8f3', border: '1px solid #c6e2ce', borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#2d6d4b' }}>覚えた · ĐÃ THUỘC</div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: '#2d6d4b', marginTop: 4 }}>
                            {masteredIds.size}
                          </div>
                        </div>

                        <div style={{ background: '#fdf2f0', border: '1px solid #f3d5d2', borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#c53d32' }}>まだ · CHƯA THUỘC</div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: '#c53d32', marginTop: 4 }}>
                            {learningIds.size}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {learningIds.size > 0 && (
                          <button
                            onClick={restartUnlearnedFlip}
                            style={{
                              padding: '11px 0',
                              background: '#c53d32',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 8,
                              fontWeight: 700,
                              fontSize: 14,
                              cursor: 'pointer'
                            }}
                          >
                            🔄 Làm lại các thẻ chưa thuộc ({learningIds.size} chữ)
                          </button>
                        )}

                        <button
                          onClick={restartAllFlip}
                          style={{
                            padding: '11px 0',
                            background: '#1c2536',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer'
                          }}
                        >
                          🔁 Làm lại tất cả ({unitKanjiList.length} chữ)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CHẾ ĐỘ 2: DẠNG 2 - LUYỆN GHI NHỚ (Nhìn Hán Việt & Nghĩa chọn chữ Hán) */}
              {currentMode === 'quiz' && (
                <div>
                  {!quizFinished && currentQuizQuestion ? (
                    <div style={{ maxWidth: 640, margin: '0 auto' }}>
                      {/* Tiến trình và chế độ sắp xếp */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, color: '#78716c', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 600 }}>Câu {quizActiveIndex + 1} / {quizQuestions.length}</span>
                          <button
                            onClick={handleToggleShuffle}
                            style={{
                              padding: '3px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              borderRadius: 16,
                              border: '1px solid #d6d3d1',
                              background: isShuffle ? '#f3f4f6' : '#ffffff',
                              color: isShuffle ? '#1c2536' : '#78716c',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              transition: 'all 0.15s ease'
                            }}
                            title="Chuyển đổi giữa theo thứ tự và ngẫu nhiên"
                          >
                            {isShuffle ? 'Ngẫu nhiên' : 'Theo thứ tự'}
                          </button>
                        </div>
                        <div>
                          Đúng: <strong style={{ color: '#2d6d4b' }}>{quizCorrectCount}</strong> | Sai & Bỏ qua: <strong style={{ color: '#c53d32' }}>{quizWrongQuestions.length + quizSkippedQuestions.length}</strong>
                        </div>
                      </div>
                      <div style={{ width: '100%', height: 4, background: '#e7e3da', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                        <div style={{
                          width: `${((quizActiveIndex + 1) / quizQuestions.length) * 100}%`,
                          height: '100%',
                          background: '#2563eb',
                          transition: 'width 0.2s ease'
                        }} />
                      </div>

                      {/* Khung thẻ câu hỏi trắc nghiệm */}
                      <div
                        key={quizActiveIndex}
                        style={{
                          background: 'linear-gradient(150deg, #ffffff 0%, #fdfbf7 100%)',
                          borderRadius: 20,
                          border: '1.5px solid #e7dfd5',
                          minHeight: 380,
                          padding: '36px 28px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          position: 'relative',
                          boxShadow: '0 12px 30px -4px rgba(44, 30, 20, 0.06), 0 4px 10px -2px rgba(44, 30, 20, 0.03)',
                          overflow: 'hidden',
                          animation: `${slideDirection === 'next' ? 'cardSlideInNext' : 'cardSlideInPrev'} 0.32s cubic-bezier(0.22, 1, 0.36, 1) both`
                        }}
                      >
                        <SakuraFallingBackground />

                        <span style={{
                          position: 'absolute',
                          top: 16,
                          left: 16,
                          fontSize: 11,
                          fontWeight: 900,
                          color: '#2563eb',
                          background: 'rgba(239, 246, 255, 0.9)',
                          border: '1px solid #bfdbfe',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontFamily: 'serif',
                          zIndex: 2
                        }}>
                          2 · 記憶 (LUYỆN GHI NHỚ)
                        </span>

                        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 520 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#78716c', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
                            ÂM HÁN VIỆT & Ý NGHĨA
                          </div>

                          <div style={{
                            fontSize: 32,
                            fontWeight: 900,
                            color: '#c53d32',
                            marginBottom: 6,
                            letterSpacing: '1px'
                          }}>
                            {currentQuizQuestion.promptSino}
                          </div>

                          <div style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#2d6d4b',
                            marginBottom: 14
                          }}>
                            {currentQuizQuestion.promptMeaning}
                          </div>

                          {currentQuizQuestion.hintCompound && (
                            <div style={{
                              fontSize: 13,
                              color: '#57534e',
                              background: '#faf8f5',
                              padding: '6px 12px',
                              borderRadius: 6,
                              display: 'inline-block',
                              marginBottom: 20,
                              border: '1px solid #ebe7df'
                            }}>
                              Từ ghép gợi ý: <strong>{currentQuizQuestion.hintCompound.reading}</strong> ({currentQuizQuestion.hintCompound.meaning})
                            </div>
                          )}

                          <div style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#78716c',
                            marginBottom: 16
                          }}>
                            Chọn chữ Hán đúng tương ứng:
                          </div>

                          {/* 4 Lựa chọn chữ Hán (Thuần chữ Hán, không hiển thị tiếng Việt trước) */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: currentQuizQuestion.options.length <= 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(110px, 1fr))',
                            gap: 12,
                            width: '100%',
                            marginBottom: 16
                          }}>
                            {currentQuizQuestion.options.map((opt, optIdx) => {
                              const optionLetter = String.fromCharCode(65 + optIdx);
                              const isSelected = quizSelectedOptionIndex === optIdx;

                              let optBg = '#ffffff';
                              let optBorder = '1.5px solid #e2e8f0';
                              let optTextColor = '#1c2536';
                              let badgeBg = '#f1f5f9';
                              let badgeColor = '#475569';

                              if (quizAnswerChecked) {
                                if (opt.isCorrect) {
                                  optBg = '#f0fdf4';
                                  optBorder = '1.5px solid #22c55e';
                                  optTextColor = '#15803d';
                                  badgeBg = '#22c55e';
                                  badgeColor = '#ffffff';
                                } else if (isSelected && !opt.isCorrect) {
                                  optBg = '#fef2f2';
                                  optBorder = '1.5px solid #ef4444';
                                  optTextColor = '#b91c1c';
                                  badgeBg = '#ef4444';
                                  badgeColor = '#ffffff';
                                } else {
                                  optBg = '#fafafa';
                                  optBorder = '1.5px solid #f1f5f9';
                                  optTextColor = '#94a3b8';
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  disabled={quizAnswerChecked}
                                  onClick={() => handleSelectQuizOption(optIdx)}
                                  style={{
                                    background: optBg,
                                    border: optBorder,
                                    borderRadius: 10,
                                    padding: '14px 10px',
                                    textAlign: 'center',
                                    cursor: quizAnswerChecked ? 'default' : 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 6
                                  }}
                                  onMouseEnter={e => {
                                    if (!quizAnswerChecked) {
                                      e.currentTarget.style.borderColor = '#2563eb';
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                    }
                                  }}
                                  onMouseLeave={e => {
                                    if (!quizAnswerChecked) {
                                      e.currentTarget.style.borderColor = '#e2e8f0';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                    }
                                  }}
                                >
                                  <span style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 4,
                                    background: badgeBg,
                                    color: badgeColor,
                                    fontSize: 11,
                                    fontWeight: 900,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {optionLetter}
                                  </span>

                                  <span style={{
                                    fontSize: 34,
                                    fontWeight: 900,
                                    color: optTextColor,
                                    fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                                  }}>
                                    {opt.kanji}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Khi CHƯA kiểm tra: Nút Bỏ qua */}
                          {!quizAnswerChecked && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                              <button
                                type="button"
                                onClick={handleSkipQuizCard}
                                style={{
                                  padding: '8px 20px',
                                  background: '#faf8f5',
                                  color: '#78716c',
                                  border: '1px solid #d6d3d1',
                                  borderRadius: 8,
                                  fontWeight: 700,
                                  fontSize: 12,
                                  cursor: 'pointer'
                                }}
                              >
                                Bỏ qua (Tab)
                              </button>
                            </div>
                          )}

                          {/* Khi ĐÃ kiểm tra: Khung kết quả chi tiết & Thanh đếm ngược 5s */}
                          {quizAnswerChecked && (
                            <div style={{
                              width: '100%',
                              padding: '16px 20px',
                              borderRadius: 12,
                              background: quizIsCorrect ? '#f1f8f3' : quizIsSkipped ? '#fffbeb' : '#fdf2f0',
                              border: `1.5px solid ${quizIsCorrect ? '#c6e2ce' : quizIsSkipped ? '#fde68a' : '#f3d5d2'}`,
                              textAlign: 'center',
                              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                              animation: 'resultSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) both'
                            }}>
                              <div style={{
                                display: 'inline-block',
                                padding: '3px 12px',
                                borderRadius: 12,
                                fontWeight: 800,
                                fontSize: 12,
                                background: quizIsCorrect ? 'rgba(45, 109, 75, 0.12)' : quizIsSkipped ? 'rgba(217, 119, 6, 0.12)' : 'rgba(197, 61, 50, 0.12)',
                                color: quizIsCorrect ? '#2d6d4b' : quizIsSkipped ? '#b45309' : '#c53d32',
                                marginBottom: 6
                              }}>
                                {quizIsCorrect ? 'Chính xác' : quizIsSkipped ? 'Đã bỏ qua' : 'Chưa chính xác'}
                              </div>

                              <div style={{ fontSize: 26, fontWeight: 900, color: '#1c2536', fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }}>
                                {currentQuizQuestion.item.kanji} · <span style={{ color: '#c53d32' }}>{currentQuizQuestion.item.sinoVietnamese}</span>
                              </div>

                              <div style={{ fontSize: 14, fontWeight: 700, color: '#2d6d4b', marginTop: 2 }}>
                                {currentQuizQuestion.item.vietnameseMeaning || currentQuizQuestion.item.meaning_vi}
                              </div>

                              {currentQuizQuestion.item.mnemonicStory && (
                                <div style={{ fontSize: 13, color: '#57534e', marginTop: 6, fontStyle: 'italic' }}>
                                  💡 {currentQuizQuestion.item.mnemonicStory}
                                </div>
                              )}

                              <div style={{ marginTop: 12 }}>
                                <button
                                  type="button"
                                  onClick={handleNextQuizQuestion}
                                  style={{
                                    padding: '8px 26px',
                                    background: '#1c2536',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    borderRadius: 8,
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Tiếp theo (Enter)
                                </button>

                                <div style={{
                                  height: 3,
                                  background: 'rgba(0,0,0,0.06)',
                                  borderRadius: 2,
                                  marginTop: 10,
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    height: '100%',
                                    background: quizIsCorrect ? '#2d6d4b' : '#c53d32',
                                    animation: 'autoCountdown5s 5s linear forwards'
                                  }} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hướng dẫn phím bấm */}
                      <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#a8a29e' }}>
                        Bấm phím 1, 2, 3, 4 hoặc A, B, C, D để chọn đáp án · Phím Tab để bỏ qua · Phím Enter để chuyển tiếp
                      </div>
                    </div>
                  ) : (
                    /* Tổng kết Dạng 2 */
                    <div style={{
                      maxWidth: 480,
                      margin: '0 auto',
                      background: '#ffffff',
                      borderRadius: 14,
                      border: '1px solid #ebe7df',
                      padding: 32,
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        background: '#f1f8f3',
                        color: '#2d6d4b',
                        fontSize: 22,
                        marginBottom: 10
                      }}>
                        完
                      </div>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1c2536', marginBottom: 6 }}>
                        Hoàn thành bài luyện ghi nhớ chữ Hán
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '20px 0' }}>
                        <div style={{ background: '#f1f8f3', border: '1px solid #c6e2ce', borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#2d6d4b' }}>正解 · ĐÚNG</div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: '#2d6d4b', marginTop: 4 }}>
                            {quizCorrectCount}
                          </div>
                        </div>

                        <div style={{ background: '#fdf2f0', border: '1px solid #f3d5d2', borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#c53d32' }}>要復習 · SAI & BỎ QUA</div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: '#c53d32', marginTop: 4 }}>
                            {quizWrongQuestions.length + quizSkippedQuestions.length}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(quizWrongQuestions.length > 0 || quizSkippedQuestions.length > 0) && (
                          <button
                            onClick={restartWrongOrSkippedQuiz}
                            style={{
                              padding: '11px 0',
                              background: '#c53d32',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 8,
                              fontWeight: 700,
                              fontSize: 14,
                              cursor: 'pointer'
                            }}
                          >
                            🔄 Làm lại các câu sai & bỏ qua ({quizWrongQuestions.length + quizSkippedQuestions.length} câu)
                          </button>
                        )}

                        <button
                          onClick={restartAllQuiz}
                          style={{
                            padding: '11px 0',
                            background: '#1c2536',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer'
                          }}
                        >
                          🔁 Làm lại tất cả ({unitKanjiList.length} câu)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
