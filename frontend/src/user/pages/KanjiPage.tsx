import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  Volume2, 
  Search, 
  PenTool, 
  Layers, 
  Lightbulb, 
  BookOpen, 
  Sparkles, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Check, 
  X, 
  FastForward, 
  ArrowRight 
} from 'lucide-react';
import { kizunaService } from '../services/kizunaService';
import { KanjiItem } from '../types/kizuna';

type JlptLevelKey = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
type StudyMode = 'list' | 'flip' | 'quiz';

const PAGE_SIZE = 40;

// Phân cấp danh xưng tiếng Nhật truyền thống và số lượng chữ theo cấp độ JLPT
const LEVEL_LABELS: Record<JlptLevelKey, { kanji: string; vi: string; desc: string; count: number }> = {
  N5: { kanji: '入門', vi: 'Nhập môn', desc: '128 chữ Hán căn bản cho sinh hoạt đời thường', count: 128 },
  N4: { kanji: '初級', vi: 'Sơ cấp', desc: '264 chữ Hán giao tiếp, mua sắm & công việc cơ bản', count: 264 },
  N3: { kanji: '中級', vi: 'Trung cấp', desc: '430 chữ Hán thường nhật, biển báo & công sở', count: 430 },
  N2: { kanji: '中上級', vi: 'Trung thượng cấp', desc: '513 chữ Hán thương mại, báo chí & xã luận', count: 513 },
  N1: { kanji: '上級', vi: 'Thượng cấp', desc: '881 chữ Hán chuyên sâu & học thuật cao cấp', count: 881 }
};

// Từ điển bộ thủ thông dụng nhất kèm âm Hán Việt và ý nghĩa biểu tượng
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
  '亻': { sino: 'Nhân đứng', meaning: 'Con người, hành vi con người' },
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

interface StrokeData {
  id: string;
  num: number;
  d: string;
}

interface StrokeNumberData {
  num: number;
  transform: string;
  text: string;
}

// Component Animation Hoa anh đào rơi động phong cách Nhật Bản
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

// Component Tập viết nét & Xem thứ tự nét chữ Hán:
// - Phóng to khung hiển thị (260px x 260px), nét chữ thanh mảnh (slender) tinh tế
// - XÓA BỎ HOÀN TOÀN các đường kẻ giữa gây chướng mắt
// - Vẽ ĐƯỜNG ĐỎ CHẠY TỪ ĐIỂM ĐẦU ĐẾN ĐIỂM KẾT của từng nét theo đúng quỹ đạo viết
// - TỰ ĐỘNG CHẠY LIÊN TỤC LẶP LẠI (Continuous Loop) không cần người dùng phải bấm nút
const KanjiStrokeBox: React.FC<{ kanji: string; strokeCount: number }> = ({ kanji, strokeCount }) => {
  const [tab, setTab] = useState<'diagram' | 'canvas'>('diagram');
  const [loadingSvg, setLoadingSvg] = useState<boolean>(true);
  const [strokes, setStrokes] = useState<StrokeData[]>([]);
  const [numbers, setNumbers] = useState<StrokeNumberData[]>([]);
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState<number>(0);
  const [loopCount, setLoopCount] = useState<number>(0);
  const [showGhost, setShowGhost] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Lấy mã hex unicode của chữ Hán (ví dụ: 休 -> 04f11)
  const hex = useMemo(() => {
    if (!kanji) return '';
    return kanji.charCodeAt(0).toString(16).padStart(5, '0');
  }, [kanji]);

  // Tải và phân tích cú pháp SVG từ KanjiVG
  useEffect(() => {
    if (!hex) return;
    setCurrentStrokeIndex(0);
    setLoopCount(0);
    setLoadingSvg(true);

    const url = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${hex}.svg`;
    fetch(url)
      .then(res => {
        if (res.ok) return res.text();
        throw new Error('SVG not found');
      })
      .then(svgText => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');

        // Lấy tất cả thẻ path biểu thị các nét vẽ
        const pathEls = Array.from(doc.querySelectorAll('path[id*="-s"]'));
        const parsedStrokes: StrokeData[] = pathEls.map((el, idx) => {
          const id = el.getAttribute('id') || `s${idx + 1}`;
          const numMatch = id.match(/-s(\d+)$/);
          const num = numMatch ? parseInt(numMatch[1], 10) : idx + 1;
          const d = el.getAttribute('d') || '';
          return { id, num, d };
        });

        // Lấy vị trí số thứ tự nét
        const textEls = Array.from(doc.querySelectorAll('g[id*="StrokeNumbers"] text'));
        const parsedNumbers: StrokeNumberData[] = textEls.map((el, idx) => {
          const text = el.textContent || `${idx + 1}`;
          const num = parseInt(text, 10) || idx + 1;
          const transform = el.getAttribute('transform') || '';
          return { num, transform, text };
        });

        setStrokes(parsedStrokes);
        setNumbers(parsedNumbers);
      })
      .catch(() => {
        setStrokes([]);
        setNumbers([]);
      })
      .finally(() => {
        setLoadingSvg(false);
      });
  }, [hex]);

  // Thời gian vẽ nét mượt mà
  const drawDuration = 550; // ms để vẽ 1 nét từ đầu đến cuối
  const pauseBetween = 100; // ms nghỉ giữa 2 nét
  const pauseEnd = 1600;    // ms ngắm chữ hoàn thiện trước khi lặp lại

  // Bộ lặp tự động liên tục (Continuous Loop): Tự động vẽ từng nét từ điểm đầu đến điểm kết
  useEffect(() => {
    if (tab !== 'diagram' || strokes.length === 0) return;

    let timer: NodeJS.Timeout;

    if (currentStrokeIndex < strokes.length) {
      // Đang vẽ nét thứ currentStrokeIndex: đợi vẽ xong + nghỉ giữa nét
      timer = setTimeout(() => {
        setCurrentStrokeIndex(prev => prev + 1);
      }, drawDuration + pauseBetween);
    } else {
      // Đã vẽ xong toàn bộ các nét: ngắm chữ hoàn chỉnh rồi tự động lặp lại từ nét 1
      timer = setTimeout(() => {
        setCurrentStrokeIndex(0);
        setLoopCount(c => c + 1);
      }, pauseEnd);
    }

    return () => clearTimeout(timer);
  }, [tab, strokes.length, currentStrokeIndex, loopCount, drawDuration, pauseBetween, pauseEnd]);

  const totalStrokes = strokes.length > 0 ? strokes.length : strokeCount;

  // Canvas vẽ nét cọ tay
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

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

    ctx.lineWidth = 5.5; // Nét vẽ thanh mảnh thanh thoát
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
      borderRadius: 14,
      border: '1px solid #ebe7df',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Nút chuyển đổi Tab: Thứ tự nét vs Tự luyện viết */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => setTab('diagram')}
          style={{
            padding: '6px 14px',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            background: tab === 'diagram' ? '#c53d32' : '#ffffff',
            color: tab === 'diagram' ? '#ffffff' : '#78716c',
            borderBottom: tab === 'diagram' ? '2px solid #a82e24' : '1px solid #d6d3d1',
            transition: 'all 0.15s ease'
          }}
        >
          Thứ tự từng nét vẽ ({totalStrokes} nét)
        </button>

        <button
          onClick={() => setTab('canvas')}
          style={{
            padding: '6px 14px',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            background: tab === 'canvas' ? '#1c2536' : '#ffffff',
            color: tab === 'canvas' ? '#ffffff' : '#78716c',
            borderBottom: tab === 'canvas' ? '2px solid #0f172a' : '1px solid #d6d3d1',
            transition: 'all 0.15s ease'
          }}
        >
          Luyện viết tay
        </button>
      </div>

      {/* Khung vẽ nét 260px x 260px - HOÀN TOÀN KHÔNG CÓ ĐƯỜNG KẺ GIỮA - NÉT MẢNH KHẢNH */}
      <div style={{
        position: 'relative',
        width: 260,
        height: 260,
        background: '#ffffff',
        borderRadius: 12,
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {tab === 'diagram' ? (
          loadingSvg ? (
            <div style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Đang tải nét vẽ...</span>
            </div>
          ) : strokes.length > 0 ? (
            <svg
              key={`kanji-svg-${kanji}-${loopCount}`}
              viewBox="0 0 109 109"
              width={240}
              height={240}
              style={{ overflow: 'visible' }}
            >
              {/* 1. Lớp nét mờ dẫn đường phía dưới (Faint ghost guide) - Nét mảnh khảnh 1.6px */}
              {strokes.map((st) => (
                <path
                  key={`ghost-${st.id}`}
                  d={st.d}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* 2. Lớp nét foreground: Nét đã vẽ (đen mực thanh mảnh 2.4px), Nét đang vẽ (đỏ thanh mảnh 2.8px chạy từ đầu đến kết) */}
              {strokes.map((st, i) => {
                const isCompleted = i < currentStrokeIndex || currentStrokeIndex === strokes.length;
                const isDrawingNow = i === currentStrokeIndex;

                if (isCompleted) {
                  // Nét đã hoàn thành: Nét thanh mảnh 2.4px màu đen mực
                  return (
                    <path
                      key={`done-${st.id}`}
                      d={st.d}
                      pathLength="100"
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: 100,
                        strokeDashoffset: 0
                      }}
                    />
                  );
                }

                if (isDrawingNow) {
                  // NÉT ĐANG VẼ: Đường ĐỎ thanh mảnh 2.8px vẽ từ điểm đầu đến điểm kết
                  return (
                    <path
                      key={`active-${st.id}-${loopCount}`}
                      d={st.d}
                      pathLength="100"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={2.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: 100,
                        strokeDashoffset: 100,
                        animation: `drawKvgStroke ${drawDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1) forwards`
                      }}
                    />
                  );
                }

                return null;
              })}

              {/* 3. Vị trí số thứ tự nét vẽ */}
              {numbers.map((numItem, ni) => {
                const strokeIdx = numItem.num - 1;
                const isCurrent = strokeIdx === currentStrokeIndex;
                const isDrawn = strokeIdx < currentStrokeIndex || currentStrokeIndex === strokes.length;

                return (
                  <text
                    key={ni}
                    transform={numItem.transform}
                    style={{
                      fontSize: isCurrent ? '10px' : '7.5px',
                      fontWeight: isCurrent ? 900 : 700,
                      fill: isCurrent ? '#ef4444' : (isDrawn ? '#94a3b8' : '#cbd5e1'),
                      opacity: isCurrent ? 1 : (isDrawn ? 0.8 : 0.4),
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {numItem.text}
                  </text>
                );
              })}
            </svg>
          ) : (
            <div style={{
              fontSize: 120,
              fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
              color: '#1c2536',
              fontWeight: 600
            }}>
              {kanji}
            </div>
          )
        ) : (
          /* Bảng luyện viết tay không ô kẻ giữa */
          <div style={{ position: 'relative', width: 260, height: 260 }}>
            {showGhost && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 140,
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
              width={260}
              height={260}
              onMouseDown={startDrawing}
              onMouseMove={drawStroke}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={drawStroke}
              onTouchEnd={stopDrawing}
              style={{ width: 260, height: 260, cursor: 'crosshair', touchAction: 'none' }}
            />
          </div>
        )}
      </div>



      {/* Điều khiển bảng vẽ tay */}
      {tab === 'canvas' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => setShowGhost(!showGhost)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
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
            onClick={clearCanvas}
            style={{
              padding: '4px 12px',
              fontSize: 12,
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
    </div>
  );
};

export const KanjiPage: React.FC = () => {
  // Navigation State theo cấp độ JLPT trực tiếp (N5 -> N1)
  const [selectedLevel, setSelectedLevel] = useState<JlptLevelKey>('N5');
  const [levelKanjiList, setLevelKanjiList] = useState<KanjiItem[]>([]);
  const [loadingLevel, setLoadingLevel] = useState<boolean>(true);

  // Pagination State: 40 từ một trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedKanji, setSelectedKanji] = useState<KanjiItem | null>(null);

  // Study Mode State: 0 · Danh sách, 1 · Ôn tập (Flashcard), 2 · Luyện ghi nhớ (Quiz)
  const [currentMode, setCurrentMode] = useState<StudyMode>('list');
  const [studyScope, setStudyScope] = useState<'page' | 'all'>('page');

  // Hướng lướt khi chuyển thẻ: 'next' (lướt sang trái) hoặc 'prev' (lướt sang phải)
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');

  // --- State Dạng 1: Flashcard Lật 3D SRS ---
  const [flipActiveIndex, setFlipActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [learningIds, setLearningIds] = useState<Set<string>>(new Set());
  const [flipStudyList, setFlipStudyList] = useState<KanjiItem[]>([]);
  const [flipFinished, setFlipFinished] = useState(false);

  // --- State Dạng 2: Bài tập Luyện Ghi Nhớ (Nhìn Hán Việt & Nghĩa chọn chữ Hán) ---
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

  // Sắp xếp ngẫu nhiên hoặc theo thứ tự
  const [isShuffle, setIsShuffle] = useState(false);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Tạo bộ câu hỏi trắc nghiệm nhìn âm Hán Việt/Nghĩa chọn chữ Hán (4 lựa chọn thuần chữ Hán, không hiện tiếng Việt)
  const buildQuizQuestions = (items: KanjiItem[], fullPool: KanjiItem[]): KanjiQuizQuestion[] => {
    return items.map(item => {
      const otherItems = fullPool.filter(it => it.id !== item.id);
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

  // Tải danh sách chữ Hán trực tiếp theo cấp độ JLPT
  useEffect(() => {
    async function loadLevelKanji() {
      setLoadingLevel(true);
      try {
        const items = await kizunaService.getKanjiByLevel(selectedLevel);
        setLevelKanjiList(items);
        setCurrentPage(1);
        if (items.length > 0) {
          setSelectedKanji(items[0]);
        }
      } finally {
        setLoadingLevel(false);
      }
    }

    loadLevelKanji();
  }, [selectedLevel]);

  // Bộ lọc tìm kiếm
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return levelKanjiList;
    const q = searchTerm.toLowerCase();
    return levelKanjiList.filter(item =>
      item.kanji.toLowerCase().includes(q) ||
      item.sinoVietnamese.toLowerCase().includes(q) ||
      item.vietnameseMeaning.toLowerCase().includes(q) ||
      (item.onyomi && item.onyomi.toLowerCase().includes(q)) ||
      (item.kunyomi && item.kunyomi.toLowerCase().includes(q))
    );
  }, [levelKanjiList, searchTerm]);

  // Phân trang: 40 từ / trang
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);

  const currentPageItems = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, activePage]);

  // Khi danh sách trang thay đổi, tự động chọn chữ Hán đầu tiên của trang nếu chưa có hoặc ngoài phạm vi
  useEffect(() => {
    if (currentPageItems.length > 0) {
      const exists = currentPageItems.some(item => item.id === selectedKanji?.id);
      if (!exists) {
        setSelectedKanji(currentPageItems[0]);
      }
    }
  }, [currentPageItems, selectedKanji]);

  // Thiết lập danh sách học cho Chế độ Ôn tập & Luyện ghi nhớ
  const activeStudyPool = useMemo(() => {
    return studyScope === 'page' ? currentPageItems : filteredList;
  }, [studyScope, currentPageItems, filteredList]);

  // Khởi tạo Dạng 1: Flashcard khi đổi bài/chế độ
  const initFlipMode = () => {
    const list = isShuffle ? shuffleArray(activeStudyPool) : activeStudyPool;
    setFlipStudyList(list);
    setFlipActiveIndex(0);
    setIsFlipped(false);
    setMasteredIds(new Set());
    setLearningIds(new Set());
    setFlipFinished(false);
  };

  // Khởi tạo Dạng 2: Trắc nghiệm khi đổi bài/chế độ
  const initQuizMode = () => {
    const list = isShuffle ? shuffleArray(activeStudyPool) : activeStudyPool;
    const questions = buildQuizQuestions(list, levelKanjiList);
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
    setCurrentMode('list');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handlePageChange = (p: number) => {
    setCurrentPage(p);
    window.scrollTo({ top: 120, behavior: 'smooth' });
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
    initFlipMode();
  };

  const restartUnlearnedFlip = () => {
    let unlearned = activeStudyPool.filter(item => learningIds.has(item.id));
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
    initQuizMode();
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
    const rebuilt = buildQuizQuestions(isShuffle ? shuffleArray(retryItems) : retryItems, levelKanjiList);

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

  // Đổi sắp xếp ngẫu nhiên hoặc tuần tự
  const handleToggleShuffle = () => {
    const nextShuffle = !isShuffle;
    setIsShuffle(nextShuffle);

    if (currentMode === 'flip') {
      const nextList = nextShuffle ? shuffleArray(activeStudyPool) : [...activeStudyPool];
      setFlipStudyList(nextList);
      setFlipActiveIndex(0);
      setIsFlipped(false);
      setFlipFinished(false);
    } else if (currentMode === 'quiz') {
      const nextList = nextShuffle ? shuffleArray(activeStudyPool) : [...activeStudyPool];
      const questions = buildQuizQuestions(nextList, levelKanjiList);
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

  // Tự động chuyển thẻ sau 5 giây hiển thị kết quả ở Dạng 2
  useEffect(() => {
    if (!quizAnswerChecked || quizFinished) return;

    const timer = setTimeout(() => {
      handleNextQuizQuestion();
    }, 5000);

    return () => clearTimeout(timer);
  }, [quizAnswerChecked, quizActiveIndex, quizFinished, quizQuestions.length]);

  // Phím tắt bàn phím
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

        @keyframes drawKvgStroke {
          0% {
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes kanjiSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* 1. HEADER CHỮ HÁN PHONG CÁCH NHẬT BẢN HIỆN ĐẠI (和の美学) */}
      <div style={{ marginBottom: 20 }}>
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
                width: 28,
                height: 28,
                border: '1.5px solid #c53d32',
                borderRadius: 4,
                color: '#c53d32',
                fontSize: 14,
                fontWeight: 900,
                fontFamily: 'serif',
                lineHeight: 1,
                background: '#fffcfb'
              }}>
                絆
              </span>
              <h1 style={{ fontSize: 23, fontWeight: 900, color: '#1c2536', margin: 0, letterSpacing: '-0.3px' }}>
                漢字帳 <span style={{ fontSize: 17, fontWeight: 700, color: '#475569' }}>· Chữ Hán Theo Cấp Độ</span>
              </h1>
            </div>
            <p style={{ color: '#78716c', fontSize: 13, margin: 0 }}>
              Học <strong>2,216 chữ Hán</strong> chuẩn JLPT theo cấp độ (N5 → N1), phân trang 40 chữ/trang, thứ tự nét đỏ & mẹo nhớ chiết tự bộ thủ.
            </p>
          </div>

          {/* Thanh chuyển cấp độ N5 -> N1 phong cách Thẻ bài Nhật Bản (札 - Fuda) */}
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
                  <span style={{ fontSize: 10, opacity: isActive ? 0.95 : 0.7, fontWeight: 600 }}>
                    {meta.count} chữ
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Thanh trạng thái cấp độ & Chế độ học tập */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #ebe7df',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: '#fdf2f0',
              color: '#c53d32',
              border: '1px solid #f3d5d2',
              padding: '3px 10px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 900
            }}>
              【 {selectedLevel} · {LEVEL_LABELS[selectedLevel].kanji} 】
            </span>
            <span style={{ fontSize: 13, color: '#57534e', fontWeight: 600 }}>
              {LEVEL_LABELS[selectedLevel].desc} ({levelKanjiList.length} chữ Hán)
            </span>
          </div>

          {/* 3 Tabs chuyển chế độ học tập */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setCurrentMode('list')}
              style={{
                padding: '6px 14px',
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
              0 · Danh sách chữ Hán
            </button>

            <button
              onClick={() => {
                setCurrentMode('flip');
                initFlipMode();
              }}
              style={{
                padding: '6px 14px',
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
                gap: 6,
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{
                background: currentMode === 'flip' ? 'rgba(255,255,255,0.25)' : '#ede7de',
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 900
              }}>1</span>
              <span>Ôn tập ({studyScope === 'page' ? currentPageItems.length : filteredList.length} thẻ)</span>
            </button>

            <button
              onClick={() => {
                setCurrentMode('quiz');
                initQuizMode();
              }}
              style={{
                padding: '6px 14px',
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
                gap: 6,
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{
                background: currentMode === 'quiz' ? 'rgba(255,255,255,0.25)' : '#ede7de',
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 900
              }}>2</span>
              <span>Luyện ghi nhớ</span>
            </button>
          </div>
        </div>
      </div>

      {loadingLevel ? (
        <div style={{ padding: '80px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32,
            height: 32,
            border: '3px solid #e5e0d8',
            borderTopColor: '#c53d32',
            borderRadius: '50%',
            animation: 'kanjiSpin 0.8s linear infinite'
          }} />
          <div style={{ color: '#78716c', fontSize: 14, fontWeight: 600 }}>
            Đang nạp danh mục chữ Hán cấp độ {selectedLevel}...
          </div>
        </div>
      ) : (
        <>
          {/* CHẾ ĐỘ 0: DANH SÁCH CHỮ HÁN THEO PHÂN TRANG (40 CHỮ / TRANG) */}
          {currentMode === 'list' && (
            <div>
              {/* Thanh điều khiển phân trang & Tìm kiếm */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #ebe7df',
                borderRadius: 12,
                padding: '12px 18px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ minWidth: 260, flex: 1, position: 'relative', maxWidth: 380 }}>
                  <Search style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 15,
                    height: 15,
                    color: '#94a3b8',
                    pointerEvents: 'none'
                  }} />
                  <input
                    type="text"
                    placeholder="Tìm chữ Hán, Hán Việt, nghĩa (ví dụ: 休, HƯU, Nghỉ ngơi)..."
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 32px 8px 36px',
                      borderRadius: 8,
                      border: '1px solid #d6d3d1',
                      fontSize: 13,
                      outline: 'none',
                      background: '#faf8f5',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease'
                    }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setCurrentPage(1);
                      }}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 2,
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Xóa tìm kiếm"
                    >
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>

                {/* Phân trang: Hiển thị 40 từ / trang */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#78716c', fontWeight: 600, marginRight: 6 }}>
                    Trang <strong>{activePage}</strong> / {totalPages} (Chữ {(activePage - 1) * PAGE_SIZE + 1} - {Math.min(activePage * PAGE_SIZE, filteredList.length)} / {filteredList.length})
                  </span>

                  <button
                    disabled={activePage <= 1}
                    onClick={() => handlePageChange(1)}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 6,
                      border: '1px solid #d6d3d1',
                      background: activePage <= 1 ? '#f5f5f4' : '#ffffff',
                      color: activePage <= 1 ? '#a8a29e' : '#1c2536',
                      cursor: activePage <= 1 ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Trang đầu"
                  >
                    <ChevronsLeft style={{ width: 14, height: 14 }} />
                  </button>

                  <button
                    disabled={activePage <= 1}
                    onClick={() => handlePageChange(activePage - 1)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: '1px solid #d6d3d1',
                      background: activePage <= 1 ? '#f5f5f4' : '#ffffff',
                      color: activePage <= 1 ? '#a8a29e' : '#1c2536',
                      cursor: activePage <= 1 ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <ChevronLeft style={{ width: 14, height: 14 }} />
                    <span>Trước</span>
                  </button>

                  {/* Nút bấm số trang */}
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - activePage) <= 1)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      return (
                        <React.Fragment key={p}>
                          {prev && p - prev > 1 && <span style={{ color: '#a8a29e', fontSize: 12 }}>...</span>}
                          <button
                            onClick={() => handlePageChange(p)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: p === activePage ? 'none' : '1px solid #d6d3d1',
                              background: p === activePage ? '#c53d32' : '#ffffff',
                              color: p === activePage ? '#ffffff' : '#1c2536',
                              fontWeight: p === activePage ? 900 : 600,
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    disabled={activePage >= totalPages}
                    onClick={() => handlePageChange(activePage + 1)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: '1px solid #d6d3d1',
                      background: activePage >= totalPages ? '#f5f5f4' : '#ffffff',
                      color: activePage >= totalPages ? '#a8a29e' : '#1c2536',
                      cursor: activePage >= totalPages ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>Sau</span>
                    <ChevronRight style={{ width: 14, height: 14 }} />
                  </button>

                  <button
                    disabled={activePage >= totalPages}
                    onClick={() => handlePageChange(totalPages)}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 6,
                      border: '1px solid #d6d3d1',
                      background: activePage >= totalPages ? '#f5f5f4' : '#ffffff',
                      color: activePage >= totalPages ? '#a8a29e' : '#1c2536',
                      cursor: activePage >= totalPages ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Trang cuối"
                  >
                    <ChevronsRight style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>

              {/* Bố cục 2 Cột: Cột trái lưới 40 chữ Hán · Cột phải Chi tiết nét vẽ & Mẹo nhớ */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 20 }}>
                {/* Cột trái: Lưới 40 chữ Hán của trang hiện tại */}
                <div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))',
                    gap: 8,
                    alignContent: 'start'
                  }}>
                    {currentPageItems.map((item, index) => {
                      const isSelected = selectedKanji?.id === item.id;
                      const globalIndex = (activePage - 1) * PAGE_SIZE + index + 1;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedKanji(item)}
                          style={{
                            background: isSelected ? '#fdf2f0' : '#ffffff',
                            borderRadius: 10,
                            border: isSelected ? '2px solid #c53d32' : '1px solid #ebe7df',
                            padding: '10px 4px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            boxShadow: isSelected ? '0 4px 10px rgba(197, 61, 50, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                            transition: 'all 0.15s ease',
                            position: 'relative'
                          }}
                        >
                          <span style={{
                            position: 'absolute',
                            top: 3,
                            left: 5,
                            fontSize: 9,
                            color: isSelected ? '#c53d32' : '#a8a29e',
                            fontWeight: 700
                          }}>
                            {globalIndex}
                          </span>
                          <div style={{
                            fontSize: 32,
                            fontWeight: 600,
                            color: isSelected ? '#c53d32' : '#1c2536',
                            fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                          }}>
                            {item.kanji}
                          </div>
                          <div style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: isSelected ? '#c53d32' : '#57534e',
                            marginTop: 2,
                            letterSpacing: '0.3px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            padding: '0 4px'
                          }}>
                            {item.sinoVietnamese}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cột phải: Bảng chi tiết toàn diện (Nét vẽ, Bộ thủ, Mẹo nhớ chiết tự, Âm On/Kun, Từ ghép) */}
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
                          fontWeight: 600,
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
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
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
                              <Volume2 style={{ width: 14, height: 14 }} />
                              <span>Phát âm</span>
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

                    {/* 2. Cách viết chữ Hán & Thứ tự từng nét vẽ (KanjiStrokeBox phóng to 260px, không kẻ nét giữa, đường đỏ nổi bật) */}
                    <div>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        marginBottom: 10,
                        letterSpacing: '0.6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <PenTool style={{ width: 14, height: 14, color: '#c53d32' }} />
                        <span>Cách Viết & Thứ Tự Từng Nét Vẽ</span>
                      </div>
                      <KanjiStrokeBox kanji={selectedKanji.kanji} strokeCount={selectedKanji.strokeCount} />
                    </div>

                    {/* 3. Bộ thủ chuẩn & Mẹo ghi nhớ chiết tự (Theo đúng phong cách: Chữ ghép từ các bộ thủ) */}
                    <div>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        marginBottom: 10,
                        letterSpacing: '0.6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <Layers style={{ width: 14, height: 14, color: '#c53d32' }} />
                        <span>Bộ Thủ & Mẹo Nhớ Chiết Tự</span>
                      </div>
                      <div style={{
                        background: '#faf8f5',
                        border: '1px solid #ebe7df',
                        borderRadius: 12,
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}>
                        {/* Huy hiệu bộ thủ */}
                        {selectedKanji.radicals && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{
                              background: '#fdf2f0',
                              color: '#c53d32',
                              border: '1px solid #f3d5d2',
                              padding: '4px 12px',
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 800
                            }}>
                              Bộ thủ chính: {selectedKanji.radicals}
                            </span>
                            {RADICAL_INFO[selectedKanji.radicals] && (
                              <span style={{ fontSize: 13, color: '#44403c', fontWeight: 600 }}>
                                〔 Bộ {RADICAL_INFO[selectedKanji.radicals].sino} · {RADICAL_INFO[selectedKanji.radicals].meaning} 〕
                              </span>
                            )}
                          </div>
                        )}

                        {/* Mẹo nhớ chiết tự logic chuẩn câu chuyện */}
                        {selectedKanji.mnemonicStory && (
                          <div style={{
                            background: '#fffdfa',
                            border: '1.5px solid #fed7aa',
                            borderLeft: '5px solid #ea580c',
                            borderRadius: 10,
                            padding: '14px 16px',
                            boxShadow: '0 2px 8px rgba(234, 88, 12, 0.05)'
                          }}>
                            <div style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: '#ea580c',
                              marginBottom: 6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}>
                              <Lightbulb style={{ width: 14, height: 14, color: '#ea580c' }} />
                              <span>Mẹo Chiết Tự Bộ Thủ & Câu Chuyện Liên Tưởng</span>
                            </div>
                            <div style={{
                              fontSize: 14.5,
                              color: '#1c2536',
                              lineHeight: 1.7,
                              fontWeight: 500
                            }}>
                              {selectedKanji.mnemonicStory}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. Âm On (Katakana) & Âm Kun (Hiragana) */}
                    <div>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        marginBottom: 10,
                        letterSpacing: '0.6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <BookOpen style={{ width: 14, height: 14, color: '#c53d32' }} />
                        <span>Cách Đọc Âm On & Âm Kun</span>
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
                              style={{
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '50%',
                                width: 28,
                                height: 28,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#1e40af'
                              }}
                            >
                              <Volume2 style={{ width: 14, height: 14 }} />
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
                              style={{
                                background: '#ffffff',
                                border: '1px solid #bbf7d0',
                                borderRadius: '50%',
                                width: 28,
                                height: 28,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#15803d'
                              }}
                            >
                              <Volume2 style={{ width: 14, height: 14 }} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 5. Từ ghép thực tế cùng cấp độ JLPT */}
                    {selectedKanji.exampleCompounds && selectedKanji.exampleCompounds.length > 0 && (
                      <div>
                        <div style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          marginBottom: 10,
                          letterSpacing: '0.6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Sparkles style={{ width: 14, height: 14, color: '#c53d32' }} />
                            <span>Từ Ghép Tiêu Biểu ({selectedKanji.jlptLevel || selectedLevel})</span>
                          </div>
                          <span style={{
                            background: '#fdf2f0',
                            color: '#c53d32',
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontWeight: 700
                          }}>
                            {selectedKanji.exampleCompounds.length} từ cùng cấp độ
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {selectedKanji.exampleCompounds.map((comp, ci) => {
                            const wordText = comp.word || comp.compound || '';
                            const compLvl = comp.level || selectedKanji.jlptLevel || selectedLevel;
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
                                  <span style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    padding: '2px 6px',
                                    borderRadius: 4
                                  }}>
                                    {compLvl}
                                  </span>
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
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '50%',
                                    width: 26,
                                    height: 26,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                    flexShrink: 0
                                  }}
                                >
                                  <Volume2 style={{ width: 13, height: 13 }} />
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

          {/* CHẾ ĐỘ 1: DẠNG 1 - ÔN TẬP (Flashcard Lật 3D SRS) */}
          {currentMode === 'flip' && (
            <div>
              {/* Lựa chọn phạm vi học: 40 từ của trang hiện tại vs Toàn bộ cấp độ */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
                <button
                  onClick={() => {
                    setStudyScope('page');
                    setTimeout(() => initFlipMode(), 50);
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    border: '1px solid #d6d3d1',
                    background: studyScope === 'page' ? '#c53d32' : '#ffffff',
                    color: studyScope === 'page' ? '#ffffff' : '#57534e',
                    cursor: 'pointer'
                  }}
                >
                  Trang hiện tại ({currentPageItems.length} chữ)
                </button>
                <button
                  onClick={() => {
                    setStudyScope('all');
                    setTimeout(() => initFlipMode(), 50);
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    border: '1px solid #d6d3d1',
                    background: studyScope === 'all' ? '#c53d32' : '#ffffff',
                    color: studyScope === 'all' ? '#ffffff' : '#57534e',
                    cursor: 'pointer'
                  }}
                >
                  Toàn bộ {selectedLevel} ({filteredList.length} chữ)
                </button>
              </div>

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
                          gap: 4
                        }}
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
                      width: `${((flipActiveIndex + 1) / Math.max(1, flipStudyList.length)) * 100}%`,
                      height: '100%',
                      background: '#c53d32',
                      transition: 'width 0.2s ease'
                    }} />
                  </div>

                  {/* Hiệu ứng lướt thẻ mượt mà & Lật 3D */}
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
                        {/* MẶT TRƯỚC: Chữ Hán to, số nét, âm đọc */}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backfaceVisibility: 'hidden',
                            background: 'linear-gradient(150deg, #ffffff 0%, #fdfbf7 100%)',
                            borderRadius: 20,
                            border: '1.5px solid #e7dfd5',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 32,
                            textAlign: 'center',
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
                            background: 'rgba(253, 242, 240, 0.9)',
                            border: '1px solid #f3d5d2',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontFamily: 'serif',
                            zIndex: 2
                          }}>
                            1 · 復習 (ÔN TẬP CHỮ HÁN)
                          </span>

                          <span style={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            fontSize: 12,
                            color: '#78716c',
                            background: 'rgba(244, 242, 238, 0.9)',
                            padding: '2px 8px',
                            borderRadius: 12,
                            zIndex: 2
                          }}>
                            {flipStudyList[flipActiveIndex].strokeCount} nét
                          </span>

                          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                              fontSize: 104,
                              fontWeight: 600,
                              color: '#1c2536',
                              fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
                              lineHeight: 1.1,
                              marginBottom: 10
                            }}>
                              {flipStudyList[flipActiveIndex].kanji}
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                speakJapanese(flipStudyList[flipActiveIndex].kanji);
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.9)',
                                border: '1px solid #d6d3d1',
                                borderRadius: 20,
                                padding: '5px 14px',
                                fontSize: 13,
                                color: '#1c2536',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                marginBottom: 16,
                                fontWeight: 600
                              }}
                            >
                              <Volume2 style={{ width: 14, height: 14 }} />
                              <span>Nghe phát âm</span>
                            </button>

                            <div style={{ fontSize: 12, color: '#a8a29e', marginTop: 12 }}>
                              Nhấp chuột hoặc nhấn phím Space để lật xem nghĩa & mẹo nhớ
                            </div>
                          </div>
                        </div>

                        {/* MẶT SAU: Âm Hán Việt, Nghĩa, Mẹo nhớ chiết tự bộ thủ, On/Kun & Từ ghép */}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            background: '#ffffff',
                            borderRadius: 20,
                            border: '1.5px solid #fed7aa',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            padding: 24,
                            boxShadow: '0 12px 30px -4px rgba(44, 30, 20, 0.06)',
                            overflowY: 'auto'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#c53d32' }}>
                                Cấp độ: {selectedLevel}
                              </span>
                              <span style={{ fontSize: 12, color: '#78716c' }}>
                                Bộ: <strong>{flipStudyList[flipActiveIndex].radicals || '—'}</strong>
                              </span>
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: 12 }}>
                              <div style={{ fontSize: 26, fontWeight: 900, color: '#c53d32' }}>
                                {flipStudyList[flipActiveIndex].sinoVietnamese}
                              </div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#2d6d4b', marginTop: 2 }}>
                                {flipStudyList[flipActiveIndex].vietnameseMeaning || flipStudyList[flipActiveIndex].meaning_vi}
                              </div>
                            </div>

                            {/* Mẹo nhớ chiết tự bộ thủ */}
                            {flipStudyList[flipActiveIndex].mnemonicStory && (
                              <div style={{
                                background: '#faf8f5',
                                border: '1px solid #fed7aa',
                                borderLeft: '3px solid #ea580c',
                                borderRadius: 8,
                                padding: '10px 12px',
                                fontSize: 13,
                                color: '#1e293b',
                                lineHeight: 1.5,
                                marginBottom: 12,
                                textAlign: 'left'
                              }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#ea580c', fontWeight: 800 }}>
                                  <Lightbulb style={{ width: 14, height: 14 }} />
                                  <span>Mẹo nhớ: </span>
                                </span>
                                {' '}{flipStudyList[flipActiveIndex].mnemonicStory}
                              </div>
                            )}

                            {/* On/Kun */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 6, fontSize: 12 }}>
                                <span style={{ color: '#64748b', fontWeight: 700 }}>On: </span>
                                <strong style={{ color: '#1e40af' }}>{flipStudyList[flipActiveIndex].onyomi || '—'}</strong>
                              </div>
                              <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: 6, fontSize: 12 }}>
                                <span style={{ color: '#166534', fontWeight: 700 }}>Kun: </span>
                                <strong style={{ color: '#15803d' }}>{flipStudyList[flipActiveIndex].kunyomi || '—'}</strong>
                              </div>
                            </div>

                            {/* Từ ghép */}
                            {flipStudyList[flipActiveIndex].exampleCompounds && flipStudyList[flipActiveIndex].exampleCompounds!.length > 0 && (
                              <div style={{ background: '#faf8f5', padding: '8px 10px', borderRadius: 6, fontSize: 12, textAlign: 'left' }}>
                                <div style={{ fontWeight: 700, color: '#78716c', marginBottom: 4 }}>Từ ghép tiêu biểu:</div>
                                <div style={{ color: '#1c2536' }}>
                                  <strong>{flipStudyList[flipActiveIndex].exampleCompounds![0].word}</strong> 【{flipStudyList[flipActiveIndex].exampleCompounds![0].reading}】: {flipStudyList[flipActiveIndex].exampleCompounds![0].meaning}
                                </div>
                              </div>
                            )}
                          </div>

                          <div style={{ textAlign: 'center', fontSize: 11, color: '#a8a29e', marginTop: 10 }}>
                            Nhấn chuột hoặc phím Space để lật lại mặt trước
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nút hành động đánh giá kết quả ôn tập */}
                  <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                    <button
                      onClick={() => handleMarkFlipResult(false)}
                      style={{
                        flex: 1,
                        padding: '12px 0',
                        background: '#ffffff',
                        border: '1.5px solid #fecaca',
                        color: '#c53d32',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Chưa thuộc (Học lại)
                    </button>

                    <button
                      onClick={() => handleMarkFlipResult(true)}
                      style={{
                        flex: 1,
                        padding: '12px 0',
                        background: '#2d6d4b',
                        border: 'none',
                        color: '#ffffff',
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

                  <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#a8a29e' }}>
                    Dùng phím mũi tên trái và phải để lật và chuyển thẻ · Phím Tab để bỏ qua
                  </div>
                </div>
              ) : (
                /* Tổng kết hoàn thành Dạng 1 */
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
                    Hoàn thành đợt ôn tập chữ Hán
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
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <RotateCcw style={{ width: 15, height: 15 }} />
                        <span>Làm lại các thẻ chưa thuộc ({learningIds.size} chữ)</span>
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
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <RotateCcw style={{ width: 15, height: 15 }} />
                      <span>Làm lại tất cả ({activeStudyPool.length} chữ)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHẾ ĐỘ 2: DẠNG 2 - LUYỆN GHI NHỚ (Nhìn Âm Hán Việt & Nghĩa chọn Chữ Hán) */}
          {currentMode === 'quiz' && (
            <div>
              {/* Lựa chọn phạm vi bài tập trắc nghiệm */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
                <button
                  onClick={() => {
                    setStudyScope('page');
                    setTimeout(() => initQuizMode(), 50);
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    border: '1px solid #d6d3d1',
                    background: studyScope === 'page' ? '#2563eb' : '#ffffff',
                    color: studyScope === 'page' ? '#ffffff' : '#57534e',
                    cursor: 'pointer'
                  }}
                >
                  Trang hiện tại ({currentPageItems.length} câu)
                </button>
                <button
                  onClick={() => {
                    setStudyScope('all');
                    setTimeout(() => initQuizMode(), 50);
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    border: '1px solid #d6d3d1',
                    background: studyScope === 'all' ? '#2563eb' : '#ffffff',
                    color: studyScope === 'all' ? '#ffffff' : '#57534e',
                    cursor: 'pointer'
                  }}
                >
                  Toàn bộ {selectedLevel} ({filteredList.length} câu)
                </button>
              </div>

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
                          gap: 4
                        }}
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
                      width: `${((quizActiveIndex + 1) / Math.max(1, quizQuestions.length)) * 100}%`,
                      height: '100%',
                      background: '#2563eb',
                      transition: 'width 0.2s ease'
                    }} />
                  </div>

                  {/* Thẻ câu hỏi trắc nghiệm */}
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
                          Gợi ý từ ghép: <strong>{currentQuizQuestion.hintCompound.reading}</strong> ({currentQuizQuestion.hintCompound.meaning})
                        </div>
                      )}

                      <div style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#78716c',
                        marginBottom: 16
                      }}>
                        Chọn chữ Hán tương ứng:
                      </div>

                      {/* 4 Lựa chọn chữ Hán thuần túy (Không hiển thị tiếng Việt ở các lựa chọn) */}
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
                            >
                              <span style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                background: badgeBg,
                                color: badgeColor,
                                fontSize: 11,
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {optionLetter}
                              </span>

                              <span style={{
                                fontSize: 34,
                                fontWeight: 600,
                                color: optTextColor,
                                fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif"
                              }}>
                                {opt.kanji}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Giải thích sau khi trả lời kèm Mẹo nhớ chiết tự */}
                      {quizAnswerChecked && (
                        <div style={{
                          background: quizIsCorrect ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${quizIsCorrect ? '#bbf7d0' : '#fecaca'}`,
                          borderRadius: 10,
                          padding: '14px 16px',
                          textAlign: 'left',
                          marginTop: 8
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: 14,
                              color: quizIsCorrect ? '#15803d' : (quizIsSkipped ? '#d97706' : '#b91c1c'),
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}>
                              {quizIsCorrect ? (
                                <>
                                  <Check style={{ width: 16, height: 16 }} />
                                  <span>Chính xác!</span>
                                </>
                              ) : quizIsSkipped ? (
                                <>
                                  <FastForward style={{ width: 16, height: 16 }} />
                                  <span>Đã bỏ qua</span>
                                </>
                              ) : (
                                <>
                                  <X style={{ width: 16, height: 16 }} />
                                  <span>Chưa chính xác</span>
                                </>
                              )}
                            </span>
                            <button
                              onClick={() => speakJapanese(currentQuizQuestion.item.kanji)}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #d6d3d1',
                                borderRadius: 12,
                                padding: '3px 10px',
                                fontSize: 11,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                color: '#44403c',
                                fontWeight: 600
                              }}
                            >
                              <Volume2 style={{ width: 13, height: 13 }} />
                              <span>Nghe chữ Hán</span>
                            </button>
                          </div>

                          {currentQuizQuestion.item.mnemonicStory && (
                            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginTop: 4 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#ea580c', fontWeight: 800 }}>
                                <Lightbulb style={{ width: 14, height: 14 }} />
                                <span>Mẹo nhớ: </span>
                              </span>
                              {' '}{currentQuizQuestion.item.mnemonicStory}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                            <button
                              onClick={handleNextQuizQuestion}
                              style={{
                                padding: '7px 16px',
                                background: '#1c2536',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: 6,
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <span>Tiếp theo</span>
                              <ArrowRight style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thanh điều khiển phụ & Phím tắt */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                    <button
                      onClick={handleSkipQuizCard}
                      disabled={quizAnswerChecked}
                      style={{
                        padding: '8px 16px',
                        background: '#ffffff',
                        border: '1px solid #d6d3d1',
                        borderRadius: 8,
                        fontSize: 13,
                        color: '#78716c',
                        cursor: quizAnswerChecked ? 'default' : 'pointer'
                      }}
                    >
                      Bỏ qua thẻ này (Phím Tab)
                    </button>

                    <div style={{ fontSize: 12, color: '#a8a29e' }}>
                      Nhấn phím 1, 2, 3, 4 hoặc A, B, C, D để chọn đáp án
                    </div>
                  </div>
                </div>
              ) : (
                /* Tổng kết hoàn thành Dạng 2 */
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
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontSize: 22,
                    marginBottom: 10
                  }}>
                    達
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1c2536', marginBottom: 6 }}>
                    Hoàn thành bài luyện ghi nhớ
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '20px 0' }}>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>正解 · ĐÚNG</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#15803d', marginTop: 4 }}>
                        {quizCorrectCount} / {quizQuestions.length}
                      </div>
                    </div>

                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b' }}>不正解 · SAI / BỎ QUA</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#dc2626', marginTop: 4 }}>
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
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <RotateCcw style={{ width: 15, height: 15 }} />
                        <span>Ôn lại các câu chưa đúng ({quizWrongQuestions.length + quizSkippedQuestions.length} câu)</span>
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
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <RotateCcw style={{ width: 15, height: 15 }} />
                      <span>Luyện tập lại từ đầu ({quizQuestions.length} câu)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
