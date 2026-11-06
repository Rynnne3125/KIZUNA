import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def create_kizuna_proposal():
    doc = docx.Document()

    # Page setup - Standard A4 with 1 inch (72pt) margins
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        
        # Configure Header & Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("KIZUNA (絆) - Project Proposal & Interactive Prototype | Academic Term 2026-2027")
        hrun.font.name = "Arial"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(140, 140, 140)
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun1 = fp.add_run("Cross-Platform Mobile App Development • Page ")
        frun1.font.name = "Arial"
        frun1.font.size = Pt(9)
        frun1.font.color.rgb = RGBColor(120, 120, 120)
        
        # Add dynamic page number XML
        fldChar1 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls('w'))
        instrText = parse_xml(r'<w:instrText %s xml:space="preserve"> PAGE </w:instrText>' % nsdecls('w'))
        fldChar2 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls('w'))
        fldChar3 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls('w'))
        frun2 = fp.add_run()
        frun2._r.append(fldChar1)
        frun2._r.append(instrText)
        frun2._r.append(fldChar2)
        frun2._r.append(fldChar3)
        frun2.font.name = "Arial"
        frun2.font.size = Pt(9)
        frun2.font.color.rgb = RGBColor(120, 120, 120)

    # Styles setup
    style_normal = doc.styles['Normal']
    font = style_normal.font
    font.name = 'Arial'
    font.size = Pt(10.5)
    font.color.rgb = RGBColor(31, 41, 55) # Dark gray #1F2937

    # Helper functions
    def set_cell_background(cell, hex_color):
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        cell._tc.get_or_add_tcPr().append(shd)

    def set_cell_margins(cell, top=120, bottom=120, left=180, right=180):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    def set_table_borders(table, color="D1D5DB", sz="4", val="single"):
        tblPr = table._tbl.tblPr
        tblBorders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:left w:val="none"/>'
            f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:right w:val="none"/>'
            f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:insideV w:val="none"/>'
            f'</w:tblBorders>'
        )
        tblPr.append(tblBorders)

    def add_hyperlink(paragraph, url, text, color="1D4ED8", underline=True):
        part = paragraph.part
        r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
        hyperlink = parse_xml(f'<w:hyperlink {nsdecls("w")} r:id="{r_id}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>')
        new_run = parse_xml(f'<w:r {nsdecls("w")}><w:rPr><w:color w:val="{color}"/>' + 
                            ('<w:u w:val="single"/>' if underline else '') + 
                            f'</w:rPr><w:t xml:space="preserve">{text}</w:t></w:r>')
        hyperlink.append(new_run)
        paragraph._p.append(hyperlink)

    def add_callout(text, title="THÔNG TIN TRỌNG TÂM", border_color="DC2626", bg_color="FEF2F2"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        cell.width = Inches(6.27)
        set_cell_background(cell, bg_color)
        set_cell_margins(cell, top=140, bottom=140, left=200, right=160)
        
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(
            f'<w:tcBorders {nsdecls("w")}>'
            f'<w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>'
            f'<w:top w:val="none"/>'
            f'<w:right w:val="none"/>'
            f'<w:bottom w:val="none"/>'
            f'</w:tcBorders>'
        )
        tcPr.append(borders)
        
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(4)
        run_title = p.add_run(f"📌 {title}: ")
        run_title.font.name = "Arial"
        run_title.font.size = Pt(10)
        run_title.font.bold = True
        run_title.font.color.rgb = RGBColor(185, 28, 28) if border_color=="DC2626" else RGBColor(67, 56, 202)
        
        run_text = p.add_run(text)
        run_text.font.name = "Arial"
        run_text.font.size = Pt(9.5)
        run_text.font.color.rgb = RGBColor(31, 41, 55)
        
        p_after = doc.add_paragraph()
        p_after.paragraph_format.space_before = Pt(0)
        p_after.paragraph_format.space_after = Pt(6)

    def add_title(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(6)
        run = p.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(20)
        run.font.bold = True
        run.font.color.rgb = RGBColor(220, 38, 38) # Crimson Torii Red #DC2626
        return p

    def add_heading1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
        
        # Add decorative subtle bottom border under Heading 1
        pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="4" w:color="DC2626"/></w:pBdr>')
        p._p.get_or_add_pPr().append(pBdr)
        return p

    def add_heading2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = RGBColor(67, 56, 202) # Indigo 700
        return p

    def add_heading3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = RGBColor(55, 65, 81) # Slate 700
        return p

    def add_p(text, bold_prefix="", italic=False):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(5)
        p.paragraph_format.line_spacing = 1.18
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.font.name = "Arial"
            r_pre.font.bold = True
            r_pre.font.color.rgb = RGBColor(15, 23, 42)
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.italic = italic
        r.font.color.rgb = RGBColor(31, 41, 55)
        return p

    def add_bullet(text, bold_prefix=""):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.font.name = "Arial"
            r_pre.font.bold = True
            r_pre.font.color.rgb = RGBColor(15, 23, 42)
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.color.rgb = RGBColor(31, 41, 55)
        return p

    # =========================================================================
    # DOCUMENT HEADER & METADATA
    # =========================================================================
    
    # Header Title Box
    title_tbl = doc.add_table(rows=1, cols=1)
    title_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell_top = title_tbl.cell(0, 0)
    cell_top.width = Inches(6.27)
    set_cell_background(cell_top, "0F172A") # Dark Navy Slate
    set_cell_margins(cell_top, top=200, bottom=200, left=240, right=240)
    
    tp1 = cell_top.paragraphs[0]
    tp1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    tr1 = tp1.add_run("[REPORT TEMPLATE 1]\nPROJECT PROPOSAL & INTERACTIVE WIREFRAME PROTOTYPE")
    tr1.font.name = "Arial"
    tr1.font.size = Pt(13)
    tr1.font.bold = True
    tr1.font.color.rgb = RGBColor(248, 250, 252)
    
    tp2 = cell_top.add_paragraph()
    tp2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    tp2.paragraph_format.space_before = Pt(6)
    tr2 = tp2.add_run("⛩️ KIZUNA (絆) - HÀNH TRÌNH HỌC TIẾNG NHẬT ĐA NỀN TẢNG HỖ TRỢ BỞI AI\n(Cross-Platform AI-Powered Japanese Learning Journey Application)")
    tr2.font.name = "Arial"
    tr2.font.size = Pt(11)
    tr2.font.bold = True
    tr2.font.color.rgb = RGBColor(239, 68, 68) # Red accent

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Academic Metadata Table
    meta_tbl = doc.add_table(rows=6, cols=2)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(meta_tbl, color="E2E8F0", sz="4")
    
    meta_data = [
        ("Học phần / Course:", "Phát triển Ứng dụng Di động Đa nền tảng (Cross-Platform Mobile App Development)"),
        ("Tên dự án / Project Title:", "KIZUNA (絆) - Hành Trình Học Tiếng Nhật Đa Nền Tảng Hỗ Trợ Bởi AI\n(Cross-Platform AI-Powered Japanese Learning Journey Application)"),
        ("Tên nhóm / Team Name:", "KIZUNA Team (Nhóm KIZUNA)"),
        ("Học kỳ & Hạn nộp:", "Học kỳ 1 (Năm học 2026 - 2027) • Deadline: Week 4"),
        ("Thành viên nhóm (3 thành viên):", 
         "1. Trần Thanh Phong - MSSV: 23IT211 (Trưởng nhóm - Backend Architecture & Security)\n"
         "2. Trương Công Thành - MSSV: 23IT251 (Thành viên - Mobile Frontend & UI/UX Design)\n"
         "3. Đặng Long Nhật - MSSV: 23IT201 (Thành viên - On-Device ML & Database Sync)"),
        ("Liên kết Thiết kế & Mã nguồn:", "") # Hyperlink filled below
    ]
    
    col_widths = [Inches(2.1), Inches(4.17)]
    for row_idx, (k, v) in enumerate(meta_data):
        row = meta_tbl.rows[row_idx]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = col_widths[0], col_widths[1]
        set_cell_background(c0, "F8FAFC")
        set_cell_background(c1, "FFFFFF" if row_idx % 2 == 0 else "F8FAFC")
        set_cell_margins(c0, top=90, bottom=90, left=120, right=120)
        set_cell_margins(c1, top=90, bottom=90, left=120, right=120)
        
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = RGBColor(51, 65, 85)
        
        p1 = c1.paragraphs[0]
        p1.paragraph_format.line_spacing = 1.15
        if row_idx == 5:
            r1 = p1.add_run("🔗 Figma Prototype: ")
            r1.font.bold = True
            r1.font.size = Pt(9.5)
            add_hyperlink(p1, "https://www.figma.com/design/3EhAysmeD6aDoRaCFgn1my/Untitled?t=MzghfLDpoLzodS6A-1", "Figma Interactive Wireframe Prototype")
            p1_sub = c1.add_paragraph()
            p1_sub.paragraph_format.space_before = Pt(2)
            r_git = p1_sub.add_run("💻 GitHub Repository: ")
            r_git.font.bold = True
            r_git.font.size = Pt(9.5)
            add_hyperlink(p1_sub, "https://github.com/Rynnne3125/KIZUNA/tree/main", "github.com/Rynnne3125/KIZUNA (Branch: main)")
        else:
            r1 = p1.add_run(v)
            r1.font.size = Pt(9.5)
            r1.font.color.rgb = RGBColor(15, 23, 42)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    
    add_callout(
        "Báo cáo đề xuất dự án này được xây dựng trên cơ sở phân tích nhu cầu thực tiễn của sinh viên đại học kỹ thuật (VKU), tích hợp kiến trúc đa nền tảng hiện đại (React/TypeScript đóng gói Android APK qua Capacitor, Spring Boot 3.4.2 REST API với JWT Stateless Authentication, Google Cloud Firestore) kết hợp cùng Trí tuệ nhân tạo kép: Google ML Kit nhận diện chữ viết tay Kanji/Kana trên thiết bị (On-Device) và Trợ lý AI Sensei (Google Gemini) đánh giá ngữ pháp/sắc thái có kiểm soát bằng Whitelist.",
        title="TÓM TẮT ĐỀ XUẤT DỰ ÁN",
        border_color="DC2626",
        bg_color="FEF2F2"
    )

    # =========================================================================
    # SECTION 1: PROJECT MOTIVATION & PROBLEM STATEMENT
    # =========================================================================
    add_heading1("1. PROJECT MOTIVATION & PROBLEM STATEMENT")
    
    add_heading2("1.1. Context & Practical Problem Space")
    add_p(
        "Trong bối cảnh toàn cầu hóa và xu hướng hợp tác công nghệ thông tin ngày càng sâu rộng giữa Việt Nam và Nhật Bản, "
        "nhu cầu tuyển dụng nhân sự IT biết tiếng Nhật (Kỹ sư Cầu nối - Bridge Software Engineer / BrSE, Kỹ sư phần mềm phát triển cho thị trường Nhật) "
        "tại các trường đại học công nghệ hàng đầu như VKU (Trường Đại học CNTT & Truyền thông Việt - Hàn) đang gia tăng đột biến. "
        "Tuy nhiên, việc tiếp cận và duy trì học tiếng Nhật của sinh viên hiện nay đang gặp phải rào cản cực kỳ nghiêm trọng:"
    )

    add_bullet(
        "Hầu hết các giải pháp hiện hành (như Duolingo, Mazii, Quizlet hay giáo trình Minna no Nihongo dạng PDF) đều áp dụng mô hình danh sách khóa học tĩnh: "
        "Người học vừa mở ứng dụng đã phải đối diện với danh sách dài dằng dặc 50 bài học nặng nề, tạo ra cảm giác 'bị ép cày chứng chỉ' thụ động.",
        bold_prefix="Khủng hoảng từ Mô hình Danh sách Tĩnh (Static Monolithic Curriculum): "
    )
    add_bullet(
        "Theo các khảo sát thực tế trên các diễn đàn và sinh viên năm 2 - năm 3 ngành CNTT định hướng Nhật Bản, có tới hơn 65% học viên bỏ cuộc ngay trong 6 đến 8 tuần đầu tiên. "
        "Nguyên nhân chủ yếu do hiện tượng 'học trước quên sau' (đường cong lãng quên Ebbinghaus), cảm giác mất phương hướng và thiếu tính tương tác thực tế.",
        bold_prefix="Tỷ lệ bỏ cuộc báo động (>65% trong 2 tháng đầu): "
    )
    add_bullet(
        "Người học dù ghi nhớ được mặt chữ Kanji và từ vựng đơn lẻ nhưng hoàn toàn lúng túng khi ghép câu giao tiếp thực tế (ví dụ: cách xin dời lịch hẹn với đồng nghiệp, viết email báo cáo HORENSO, hoặc hỏi đường đi tàu điện tại Tokyo). "
        "Các ứng dụng hiện tại chỉ kiểm tra trắc nghiệm bấm chọn đáp án A-B-C-D khô khan, không rèn luyện được năng lực sản sinh ngôn ngữ tự do.",
        bold_prefix="Khoảng cách giữa Lý thuyết và Phản xạ Thực tế: "
    )
    add_bullet(
        "Các ứng dụng tích hợp LLM hiện nay thường thả nổi cho AI tự do trả lời, dẫn đến hiện tượng 'ảo giác' (hallucination), "
        "sử dụng từ vựng cao cấp (N1/N2) vượt xa trình độ người mới bắt đầu (N5/N4), khiến người học càng thêm hoang mang và quá tải nhận thức.",
        bold_prefix="Nguy cơ Ảo giác và Quá tải Nhận thức từ AI chưa được kiểm soát: "
    )

    add_p(
        "Nhận diện sâu sắc các điểm nghẽn trên, dự án KIZUNA (絆 - mang ý nghĩa 'sợi dây gắn kết bền chặt') ra đời với sứ mệnh định hình lại trải nghiệm học tiếng Nhật thông qua một bước chuyển dịch mô hình căn bản (Paradigm Shift):",
        bold_prefix="Bước đột phá của KIZUNA (Paradigm Shift): "
    )

    add_bullet(
        "Thay vì xem người học là học sinh ngồi nhồi nhét lý thuyết, KIZUNA xem người học là một Lữ khách (Traveler) đang bước vào chuyến hành trình chinh phục đất nước Nhật Bản. "
        "Toàn bộ kiến thức từ bảng chữ cái Hiragana/Katakana đến hội thoại N4/N3 và tiếng Nhật công sở được tinh tuyển thành các Chặng (Stages) và Mốc (Milestones) trực quan trên một Bản đồ uốn lượn phong cách RPG.",
        bold_prefix="1. Mô hình Hành trình Khám phá (Journey-based RPG Learning): "
    )
    add_bullet(
        "Tại mỗi mốc điểm đến, học viên phải trải qua vòng lặp luyện tập 7 bước hoàn chỉnh (Nghe bối cảnh → Nạp từ vựng trọng tâm → Phân biệt sắc thái Lịch sự/Thân mật → Dịch phản xạ → Tự viết câu thực tế → AI Sensei đánh giá tức thời → Thử thách Mini-Boss). "
        "Người học chỉ mở khóa được vùng đất mới khi thực sự dùng được kiến thức đó vào tình huống cụ thể.",
        bold_prefix="2. Gameplay phục vụ việc học (Meaningful Mastery Loop): "
    )
    add_bullet(
        "Hệ thống thiết lập 3 tầng ranh giới: (1) Con người biên soạn và làm chủ 100% Whitelist kiến thức; (2) AI sinh biến thể bài tập và chấm câu tự do; (3) Hàng rào Guardrail tự động chặn các từ ngữ vượt cấp độ.",
        bold_prefix="3. Ranh giới kiểm soát AI nghiêm ngặt (Controlled AI Guardrails): "
    )
    add_bullet(
        "Kết hợp thuật toán SuperMemo SM-2, hệ thống tự động phát hiện các lỗi sai của học viên và biến thành các 'Nhiệm vụ quay lại luyện tập' (Spaced Re-engagement Quest) xuất hiện ngắt quãng trên bản đồ, giúp học viên ôn đúng chỗ hổng mà không phải cày lại cả chặng.",
        bold_prefix="4. Ôn tập ngắt quãng không áp lực (Spaced Re-engagement): "
    )

    # 1.2 Target User Personas
    add_heading2("1.2. Target User Personas")
    
    add_heading3("A. Primary Persona: Sinh viên Đại học định hướng Kỹ sư Cầu nối / Làm việc tại Nhật")
    
    # Persona Table
    p_tbl = doc.add_table(rows=7, cols=2)
    p_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(p_tbl, color="CBD5E1", sz="4")
    
    p_data = [
        ("Họ và tên / Độ tuổi:", "Lê Hoàng Nam • 20 tuổi"),
        ("Nghề nghiệp / Đơn vị:", "Sinh viên năm 2 ngành Công nghệ Thông tin tại Trường ĐH CNTT&TT Việt - Hàn (VKU)"),
        ("Mục tiêu học tập (Goals):", 
         "• Đạt chứng chỉ JLPT N4/N3 trong vòng 9 tháng để đủ điều kiện tham gia phỏng vấn thực tập doanh nghiệp tại Fukuoka/Tokyo vào năm thứ 3.\n"
         "• Nắm vững phản xạ giao tiếp đời sống (mua sắm, bắt tàu điện, đặt phòng) và tiếng Nhật công sở cơ bản (HORENSO, xin phép dời lịch hẹn).\n"
         "• Tự tin viết và nói các câu tiếng Nhật có ngữ điệu và sắc thái tôn kính phù hợp."),
        ("Điểm đau cốt lõi (Pain Points):", 
         "• Mau quên từ vựng và mặt chữ Hán tự (Kanji) chỉ sau 3-4 ngày dù đã chép phạt nhiều lần.\n"
         "• Thấy áp lực và ngợp khi mở sách Minna no Nihongo 50 bài hoặc danh sách bài học tĩnh của các app truyền thống.\n"
         "• Thiếu người sửa lỗi câu viết: Khi tự đặt câu, không biết mình chia thể động từ đúng chưa và trợ từ (に, で, を) có bị nhầm lẫn không.\n"
         "• Bị ức chế khi bị ép làm lại cả một bài dài chỉ vì bấm nhầm 1-2 câu trắc nghiệm."),
        ("Đặc điểm công nghệ & Thói quen:", 
         "• Sở hữu smartphone Android tầm trung và laptop học tập cá nhân.\n"
         "• Thích các ứng dụng có đồ họa đẹp mắt, yếu tố Game hóa (Gamification), theo dõi chuỗi ngày học liên tục (Streak).\n"
         "• Thường tranh thủ học 20-30 phút vào buổi tối hoặc trên xe buýt đến trường."),
        ("Động lực trải nghiệm KIZUNA:", 
         "Cảm giác được 'nhập vai' vào một lữ khách đang tiến dần về đích đến Nhật Bản, mỗi ngày chinh phục một trạm kiểm soát nhỏ và có Trợ lý AI Sensei như một gia sư bản xứ kèm cặp 24/7."),
        ("Thiết bị sử dụng chính:", "Điểm chạm kép: Mobile App (Android APK / PWA) khi di chuyển & Web Desktop khi ngồi bàn học.")
    ]
    
    for r_idx, (k, v) in enumerate(p_data):
        row = p_tbl.rows[r_idx]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = Inches(2.2), Inches(4.07)
        set_cell_background(c0, "F1F5F9")
        set_cell_background(c1, "FFFFFF" if r_idx % 2 == 0 else "F8FAFC")
        set_cell_margins(c0, top=70, bottom=70, left=100, right=100)
        set_cell_margins(c1, top=70, bottom=70, left=100, right=100)
        
        pr0 = c0.paragraphs[0].add_run(k)
        pr0.font.bold = True
        pr0.font.size = Pt(9.5)
        pr0.font.color.rgb = RGBColor(51, 65, 85)
        
        pr1 = c1.paragraphs[0].add_run(v)
        pr1.font.size = Pt(9.5)
        pr1.font.color.rgb = RGBColor(15, 23, 42)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    add_heading3("B. Typical User Story & Kịch bản Trải nghiệm Thực tế (Concrete Workflow)")
    add_p(
        "Dưới đây là kịch bản trải nghiệm người dùng điển hình của học viên Lê Hoàng Nam khi tương tác với phân hệ di động KIZUNA "
        "tại Mốc 3 'Đổi lịch hẹn' (Chặng 3 - Sinh hoạt hằng ngày N4):"
    )

    add_bullet(
        "Nam mở ứng dụng KIZUNA trên điện thoại. Nhờ cơ chế Stateless JWT kết hợp Firebase Auth, hệ thống tự động xác thực và tải ngay Bản đồ Hành trình trong chưa đầy 300ms. "
        "Nam nhìn thấy vị trí hiện tại của mình: Chặng 3 'Sinh hoạt hằng ngày', Mốc 1 và Mốc 2 đã hoàn thành (màu xanh lá), Mốc 3 'Đổi lịch hẹn' đang nhấp nháy phát sáng (Torii Red - UNLOCKED), huy hiệu ngọn lửa Streak báo 7 ngày liên tục.",
        bold_prefix="1. Đăng nhập 1 chạm & Khám phá Bản đồ: "
    )
    add_bullet(
        "Nam bấm vào Mốc 3. Modal thông tin xuất hiện tóm tắt bối cảnh: 'Bạn có hẹn ăn tối với đồng nghiệp Tanaka vào thứ Hai, nhưng có lịch trực khẩn cấp. Hãy nhắn tin xin đổi hẹn sang thứ Tư tuần sau.' "
        "Kèm theo đó là danh sách Whitelist từ vựng cho phép (都合, 変更, 来週) và điểm ngữ pháp (〜ていただけますか).",
        bold_prefix="2. Tiếp nhận Bối cảnh & Whitelist Mốc: "
    )
    add_bullet(
        "Nam lần lượt trải qua các trạm nhỏ: Nghe đoạn audio mẫu giữa hai nhân viên người Nhật; xem giải thích từ vựng cốt lõi; làm bài tập phân biệt cách nói suồng sã với bạn bè và cách nói kính cẩn với cấp trên; dịch câu phản xạ nhanh.",
        bold_prefix="3. Khởi động Vòng lặp Micro-Loop: "
    )
    add_bullet(
        "Tại Bước 5, hệ thống yêu cầu Nam tự gõ tin nhắn tiếng Nhật gửi cho đồng nghiệp. Nam sử dụng bàn phím ảo Kana trên app gõ: '来週の月曜日は都合が悪いですから、火曜日に変更してください。' và nhấn nút 'Gửi cho AI Sensei chấm'.",
        bold_prefix="4. Tự viết câu thực tế (Free-form Production): "
    )
    add_bullet(
        "Chỉ sau 1.2 giây phân tích, khay trượt (Bottom Sheet Drawer) của AI Sensei trượt lên mượt mà với tông màu tím violet hiện đại. AI Sensei phản hồi: "
        "'Đánh giá: 85/100 điểm. Tuyệt vời! Bạn đã sử dụng chính xác từ 都合 (thuận tiện). "
        "Tuy nhiên, cách nói 変更してください (Hãy đổi lịch) hơi mang tính áp đặt với đồng nghiệp. "
        "Trong môi trường công sở Nhật, bạn nên dùng thể nhờ vả lịch sự: 来週の月曜日は都合が悪くなってしまい、火曜日に変更していただけないでしょうか。' "
        "Nam bấm nút nghe phát âm mẫu của câu chuẩn và bấm sao chép vào sổ tay.",
        bold_prefix="5. AI Sensei Phản hồi Tức thời & Định hướng Sắc thái: "
    )
    add_bullet(
        "Nam vượt qua bài kiểm tra Mini-Boss cuối mốc đạt 85% điểm. Màn hình chúc mừng hiện lên: Thưởng +50 XP, Mốc 3 chuyển trạng thái 'COMPLETED', và Mốc 4 'Giải thích lý do' trên bản đồ tự động mở khóa.",
        bold_prefix="6. Chinh phục Mốc & Mở khóa Vùng đất mới: "
    )
    add_bullet(
        "Do Nam từng gõ nhầm trợ từ ở bước phản xạ, thuật toán SM-2 ghi nhận lỗi sai này vào danh sách ôn tập. Ba ngày sau, một biểu tượng 'Trạm Ôn tập Lỗi cũ' màu hổ phách xuất hiện rẽ nhánh từ Mốc 3, "
        "nhắc Nam làm 3 câu ôn luyện ngắn (+15 XP) để củng cố triệt để mà không bắt Nam phải học lại toàn bộ chặng.",
        bold_prefix="7. Kích hoạt Nhiệm vụ Ôn tập Ngắt quãng (Spaced Re-engagement): "
    )

    # =========================================================================
    # SECTION 2: SYSTEM SCOPE & FUNCTIONAL SPECIFICATIONS
    # =========================================================================
    add_heading1("2. SYSTEM SCOPE & FUNCTIONAL SPECIFICATIONS")
    add_p(
        "Bảng ma trận đặc tả phạm vi hệ thống và các yêu cầu chức năng của KIZUNA được thiết kế theo chuẩn CMMI & FURPS+, "
        "phân định rõ mức độ ưu tiên theo mô hình MoSCoW (Must-Have, Should-Have, Could-Have) và ranh giới kỹ thuật chi tiết:"
    )

    # Main Specifications Table
    spec_tbl = doc.add_table(rows=11, cols=5)
    spec_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(spec_tbl, color="CBD5E1", sz="4")
    
    headers = ["#", "Feature Category", "Concrete Feature", "Priority", "Business Logic & Scope"]
    hdr_row = spec_tbl.rows[0]
    hdr_widths = [Inches(0.4), Inches(1.3), Inches(1.6), Inches(0.9), Inches(2.07)]
    for idx, name in enumerate(headers):
        cell = hdr_row.cells[idx]
        cell.width = hdr_widths[idx]
        set_cell_background(cell, "0F172A") # Dark Navy
        set_cell_margins(cell, top=100, bottom=100, left=80, right=80)
        p = cell.paragraphs[0]
        r = p.add_run(name)
        r.font.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(255, 255, 255)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx in [0, 3] else WD_ALIGN_PARAGRAPH.LEFT

    matrix_rows = [
        ("1", "Authentication & Profile", 
         "OAuth Sign-in (Google/Firebase), Profile Management, Role-Based Access Control (RBAC)", 
         "Must-Have", 
         "Xác thực Stateless JWT với thư viện JJWT 0.12.6. Tích hợp Firebase Auth với Custom Claims phân định 2 vai trò: ROLE_ADMIN (toàn quyền quản trị nội dung /api/v1/admin/**) và ROLE_USER (học viên /api/v1/user/**). Tự động theo dõi Daily Streak và tích lũy XP."),
        
        ("2", "Core Business: Journey Map", 
         "Bản đồ Hành trình 5 tầng (Journey, Stage, Milestone, Quests, Spaced Review)", 
         "Must-Have", 
         "Hiển thị bản đồ RPG uốn lượn SVG. Máy trạng thái 4 cấp cho Mốc: LOCKED, UNLOCKED, COMPLETED, REVISIT. Tự động kiểm tra điều kiện tiên quyết (hoàn thành mốc trước và đạt điểm >= 80%) để kích hoạt mở khóa mốc tiếp theo. Dữ liệu lưu trên Firestore user_journey_progress."),
        
        ("3", "Core Business: Micro-Loop", 
         "Vòng lặp Luyện tập 7 bước tại Mốc (Milestone Experience Micro-Loop)", 
         "Must-Have", 
         "Chuỗi nhiệm vụ khép kín tại mốc: 1. Nghe hội thoại thực tế → 2. Nạp từ vựng/mẫu câu → 3. Phân biệt sắc thái Lịch sự/Thân mật → 4. Dịch câu phản xạ → 5. Tự viết tin nhắn thực tế → 6. AI Sensei nhận xét → 7. Thử thách Mini-Boss cuối mốc. Lưu tạm tiến độ câu dở dang."),
        
        ("4", "Artificial Intelligence (On-Device)", 
         "Nhận diện chữ viết tay Kanji/Kana trên thiết bị (Google ML Kit Digital Ink / OCR)", 
         "Must-Have", 
         "Sử dụng Google ML Kit xử lý trực tiếp tọa độ nét vẽ bút cảm ứng trên màn hình di động (On-Device, hoàn toàn không cần kết nối mạng). Đánh giá thứ tự nét (Stroke Order), độ cân đối và nhận diện chính xác mặt chữ Hiragana, Katakana và Kanji N5/N4 với độ trễ < 100ms."),
        
        ("5", "Artificial Intelligence (Cloud GenAI)", 
         "Trợ lý AI Sensei Đánh giá Ngữ pháp & Sắc thái Ngôn ngữ (Google Gemini LLM)", 
         "Must-Have", 
         "Tích hợp mô hình Gemini qua Backend Spring Boot. Kiểm soát chặt chẽ bằng Knowledge Whitelist của mốc: Chấm điểm độ tự nhiên (0-100), bắt lỗi trợ từ/ngữ pháp và sinh câu đề xuất bản xứ (Native Expression). Cơ chế Streaming hiển thị Skeleton loader mượt mà."),
        
        ("6", "AI Dynamic Variation", 
         "Động cơ Tạo Biến thể Bài tập theo Ngữ cảnh (Controlled Variation Engine)", 
         "Should-Have", 
         "Sinh câu hỏi thực hành và tình huống mới từ whitelist từ vựng của mốc (đổi ngữ cảnh từ ăn tối sang họp công việc) để chống học vẹt. Toàn bộ đầu ra được hàng rào Guardrail kiểm duyệt trước khi hiển thị cho người học."),
        
        ("7", "Offline Resilience", 
         "Bộ đệm Caching Cục bộ & Tự động Đồng bộ Ngầm (Background Auto Sync)", 
         "Should-Have", 
         "Khai thác tính năng Offline Persistence của Firestore kết hợp SQLite/Capacitor Local Storage. Cho phép tải trước dữ liệu chặng hiện tại và làm bài khi mất mạng. Hàng đợi (Queue) tự động đồng bộ tiến độ lên đám mây ngay khi có kết nối trở lại (EC-01 recovery)."),
        
        ("8", "Spaced Re-engagement", 
         "Nhiệm vụ Quay lại Luyện tập theo Thuật toán Lặp lại Ngắt quãng (SuperMemo SM-2)", 
         "Should-Have", 
         "Lưu vết toàn bộ từ vựng và cấu trúc người học làm sai. Thuật toán SM-2 tính toán chu kỳ ôn tập tối ưu (1 ngày, 3 ngày, 7 ngày). Tự động kích hoạt các trạm 'Revisit Quest' màu hổ phách trên bản đồ để củng cố lỗ hổng kiến thức mà không làm reset chặng học."),
        
        ("9", "Admin Curriculum Management", 
         "Cổng Quản trị Nội dung Giáo trình & Sandbox Thử nghiệm Prompt AI", 
         "Must-Have", 
         "Giao diện Web Desktop dành riêng cho Giảng viên/Biên tập viên: Quản trị cấu trúc Chặng/Mốc, thiết lập danh mục Whitelist từ vựng cho từng mốc, chạy thử nghiệm prompt AI trong Sandbox và kiểm duyệt chất lượng ngân hàng câu hỏi."),
        
        ("10", "Gamification & Accessibility", 
         "Động cơ Game hóa (Streak, XP, Âm thanh Haptic) & Tiếp cận WCAG 2.1 AA", 
         "Could-Have", 
         "Tích hợp hiệu ứng rung nhẹ (Haptic Feedback) khi hoàn thành câu, âm thanh Chime chúc mừng, huy hiệu chuỗi ngày học Streak. Tối ưu vùng bấm ngón tay cái (Thumb-zone >= 48x48dp), độ tương phản văn bản chuẩn AAA/AA, hỗ trợ phiên âm Furigana trên đầu Kanji.")
    ]

    for row_idx, r_data in enumerate(matrix_rows, start=1):
        row = spec_tbl.rows[row_idx]
        for col_idx, text in enumerate(r_data):
            cell = row.cells[col_idx]
            cell.width = hdr_widths[col_idx]
            set_cell_background(cell, "FFFFFF" if row_idx % 2 != 0 else "F8FAFC")
            set_cell_margins(cell, top=80, bottom=80, left=70, right=70)
            p = cell.paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            r = p.add_run(text)
            r.font.size = Pt(8.5)
            r.font.name = "Arial"
            if col_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r.font.bold = True
            elif col_idx == 1:
                r.font.bold = True
                r.font.color.rgb = RGBColor(15, 23, 42)
            elif col_idx == 3:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r.font.bold = True
                if text == "Must-Have":
                    r.font.color.rgb = RGBColor(220, 38, 38) # Red
                elif text == "Should-Have":
                    r.font.color.rgb = RGBColor(67, 56, 202) # Indigo
                else:
                    r.font.color.rgb = RGBColor(217, 119, 6) # Amber

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 2.2 Deep-dive into Architectural Specifications
    add_heading2("2.2. Phân tích Chi tiết Các Ranh giới Kỹ thuật Trọng yếu")

    add_heading3("A. Ranh giới Kiểm soát AI 3 Lớp (3-Tier AI Boundary & Safety Guardrails)")
    add_p(
        "Điểm tựa học thuật giúp KIZUNA khác biệt hoàn toàn với các ứng dụng học tiếng Nhật thương mại thông thường "
        "chính là kiến trúc Ranh giới AI có kiểm soát. Nhóm sinh viên thiết kế 3 tầng phòng vệ nghiêm ngặt:"
    )

    add_bullet(
        "Chỉ con người (giáo viên, biên tập viên nội dung) mới có quyền định nghĩa mục tiêu mốc học, danh mục từ vựng cho phép (Whitelist Vocabularies) và mẫu ngữ pháp cốt lõi. AI tuyệt đối không được tự ý sửa đổi chuẩn kiến thức.",
        bold_prefix="Lớp 1: Tri thức Chuẩn do Con người Biên soạn (Human-Curated Whitelist): "
    )
    add_bullet(
        "Khi sinh câu hỏi hoặc chấm bài viết của học viên, Backend Spring Boot sẽ nạp Whitelist của mốc đó vào System Prompt dưới dạng ràng buộc cứng (Hard Constraint), bắt buộc AI chỉ được sử dụng các từ ngữ trong danh mục đã học.",
        bold_prefix="Lớp 2: Động cơ Sinh biến thể trong Phạm vi (Scope-Bounded Variation Engine): "
    )
    add_bullet(
        "Toàn bộ câu trả lời do AI tạo ra đều phải đi qua bộ lọc Regex và Token Parser của Backend. Nếu phát hiện có từ vựng thuộc trình độ cao cấp (N1/N2) vượt quá 10% phạm vi cho phép, bộ lọc tự động từ chối và kích hoạt Fallback về đáp án mẫu của giáo trình.",
        bold_prefix="Lớp 3: Hàng rào Kiểm duyệt Tự động (Automated Guardrail & Fallback Filter): "
    )

    add_heading3("B. Kịch bản Xử lý Ngoại lệ Giao diện (Edge Cases & UI Recovery Paths)")
    add_bullet(
        "Khi học viên bấm 'Gửi cho AI Sensei' lúc mất mạng, giao diện hiển thị Toast cảnh báo màu vàng: 'Mất kết nối mạng. Bản nháp của bạn đã được lưu an toàn cục bộ.' Khi có mạng trở lại, hệ thống tự động tái kích hoạt gửi lại.",
        bold_prefix="EC-01 (Mất mạng khi nộp bài): "
    )
    add_bullet(
        "Nếu Backend gọi AI quá 4 giây chưa có kết quả, giao diện chuyển từ Skeleton Shimmer sang thông báo 'AI Sensei đang phân tích kỹ hơn một chút...' kèm nút bấm 'Bỏ qua và dùng đáp án mẫu'. Nếu quá 8 giây, hệ thống tự động đối chiếu với Rule-based Regex để không làm gián đoạn bài học.",
        bold_prefix="EC-02 (AI Sensei phản hồi chậm / Quá tải): "
    )
    add_bullet(
        "Nếu học viên cố tình nhập các câu lệnh phá hoại (Prompt Injection) vào ô viết câu, AI Guardrail sẽ chặn đứng và trả về thông báo nhã nhặn: 'Sensei chỉ có thể hỗ trợ bạn trong phạm vi học tiếng Nhật chủ đề này thôi nhé!', đồng thời giữ nguyên câu nhập để học viên sửa lại.",
        bold_prefix="EC-03 (Phát hiện Prompt Injection / Nội dung ngoài lề): "
    )
    add_bullet(
        "Khi học viên bấm nút [X] thoát giữa chừng ở bước 4/7, ứng dụng hiển thị Confirmation Dialog: 'Bạn có muốn tạm dừng? Tiến độ câu hiện tại sẽ được lưu lại an toàn.' Trạng thái được lưu vào SQLite/localStorage để học tiếp sau.",
        bold_prefix="EC-04 (Thoát giữa chừng trong vòng lặp): "
    )

    # =========================================================================
    # SECTION 3: TECH STACK & INITIAL ARCHITECTURE
    # =========================================================================
    add_heading1("3. TECH STACK & INITIAL ARCHITECTURE")
    
    add_heading2("3.1. Tech Stack Summary & Justification")
    add_p(
        "Hệ thống KIZUNA được xây dựng dựa trên ngăn xếp công nghệ hiện đại, hiệu năng cao, bảo đảm tính sẵn sàng phục vụ "
        "đa nền tảng (Web Browser, Android Native APK, và tương thích kiến trúc Flutter 3.x):"
    )

    # Tech Stack Table
    tech_tbl = doc.add_table(rows=7, cols=3)
    tech_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tech_tbl, color="CBD5E1", sz="4")
    
    t_hdrs = ["Tầng công nghệ (Layer)", "Công nghệ lựa chọn (Technology)", "Lý do lựa chọn & Tính phù hợp kỹ thuật (Justification)"]
    for i, h in enumerate(t_hdrs):
        c = tech_tbl.rows[0].cells[i]
        set_cell_background(c, "4338CA") # Indigo
        set_cell_margins(c, top=90, bottom=90, left=90, right=90)
        p = c.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(255, 255, 255)
    
    t_widths = [Inches(1.8), Inches(1.8), Inches(2.67)]
    for r in tech_tbl.rows:
        for i, w in enumerate(t_widths):
            r.cells[i].width = w

    t_rows = [
        ("Mobile & Frontend Framework", "React 18.3 + TypeScript + Vite 5.4 (Đóng gói Android APK qua Capacitor)", 
         "Tối ưu tốc độ phát triển (HMR tức thì), chia sẻ 100% mã nguồn giữa Web Desktop và Mobile App. Dung lượng bundle nhẹ (< 380KB), thời gian khởi động app < 0.8s trên thiết bị Android."),
        
        ("State Management", "Zustand & Custom React Hooks", 
         "Giải pháp quản lý trạng thái cực kỳ tinh gọn (< 1KB), loại bỏ hoàn toàn boilerplate cồng kềnh của Redux. Hỗ trợ hydration tự động từ LocalStorage/IndexedDB phục vụ khả năng chạy Offline."),
        
        ("Backend Services", "Java 21 + Spring Boot 3.4.2 + Gradle (Cổng: 3000)", 
         "Nền tảng dịch vụ chuẩn doanh nghiệp với khả năng xử lý đồng thời vượt trội. Bộ điều khiển RESTful chuẩn hóa JSON ApiResponse, kiểm thử tích hợp tự động với JUnit 5 và Mockito."),
        
        ("Security & Auth", "Spring Security + JJWT 0.12.6 + Firebase Admin SDK", 
         "Cơ chế xác thực không trạng thái (Stateless Bearer JWT, mã hóa HMAC-SHA256). Phân quyền RBAC chặt chẽ: ROLE_ADMIN quản trị lộ trình, ROLE_USER học viên. Tự động trả mã lỗi chuẩn 401/403."),
        
        ("Cloud Database & Hosting", "Google Cloud Firestore (NoSQL) & Firebase Hosting", 
         "Cơ sở dữ liệu đám mây NoSQL với cấu trúc phân cấp linh hoạt (journeys/stages/milestones). Hỗ trợ Real-time Listener và bộ nhớ đệm Offline tự động. Hosting deploy tĩnh tốc độ cao tại kizuna-6756a."),
        
        ("Artificial Intelligence (AI)", "Google ML Kit (On-Device) & Google Gemini LLM (Cloud)", 
         "• On-Device: Google ML Kit Digital Ink Recognition nhận diện nét viết chữ Hán Kanji/Kana ngoại tuyến với độ trễ < 100ms.\n• Cloud: Gemini API phân tích ngữ pháp, chấm điểm sắc thái theo Whitelist.")
    ]

    for r_idx, r_val in enumerate(t_rows, start=1):
        row = tech_tbl.rows[r_idx]
        for c_idx, val in enumerate(r_val):
            cell = row.cells[c_idx]
            set_cell_background(cell, "FFFFFF" if r_idx % 2 != 0 else "F8FAFC")
            set_cell_margins(cell, top=70, bottom=70, left=80, right=80)
            p = cell.paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            r = p.add_run(val)
            r.font.size = Pt(8.5)
            r.font.name = "Arial"
            if c_idx == 0:
                r.font.bold = True
                r.font.color.rgb = RGBColor(15, 23, 42)
            elif c_idx == 1:
                r.font.bold = True
                r.font.color.rgb = RGBColor(67, 56, 202)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 3.2 Figma Prototype URL & System Architecture
    add_heading2("3.2. Figma Interactive Wireframe Prototype & Bản Mẫu Tương Tác")
    
    # Callout for Figma URL
    p_figma = doc.add_paragraph()
    p_figma.paragraph_format.space_before = Pt(4)
    p_figma.paragraph_format.space_after = Pt(8)
    r_fig1 = p_figma.add_run("🔗 LIÊN KẾT BẢN MẪU FIGMA PROTOTYPE (INTERACTIVE DEMO): ")
    r_fig1.font.bold = True
    r_fig1.font.size = Pt(10.5)
    r_fig1.font.color.rgb = RGBColor(220, 38, 38)
    add_hyperlink(p_figma, "https://www.figma.com/design/3EhAysmeD6aDoRaCFgn1my/Untitled?t=MzghfLDpoLzodS6A-1", "https://www.figma.com/design/3EhAysmeD6aDoRaCFgn1my/Untitled?t=MzghfLDpoLzodS6A-1")

    add_p(
        "Bản mẫu Figma Prototype của dự án KIZUNA được thiết kế theo đúng quy chuẩn Thiết kế Tương tác Di động (Mobile-First 390px × 844px), "
        "tuân thủ triệt để Hệ thống lưới 8 điểm (8-Point Grid System), tối ưu hóa vùng bấm ngón tay cái (Thumb-zone) và "
        "đáp ứng đầy đủ các tiêu chuẩn Tiếp cận Thị giác WCAG 2.1 Level AA:"
    )

    add_bullet(
        "Mô phỏng trục đường uốn lượn SVG Bezier, các node mốc học tập với 4 trạng thái sinh động (Locked có icon ổ khóa; Unlocked màu đỏ Torii phát sáng pulse-glow; Completed màu xanh lá có tích v; Revisit màu hổ phách phân nhánh). "
        "Top bar tích hợp cụm huy hiệu Streak ngọn lửa, cấp độ và thanh tiến độ chặng trực quan.",
        bold_prefix="1. Màn hình Bản đồ Hành trình (Journey Map Screen): "
    )
    add_bullet(
        "Thanh tiến độ bước 5/7, thẻ bối cảnh giao tiếp tiếng Nhật đời sống, thanh phát audio hội thoại thu nhỏ, các Chip từ vựng gợi ý (Whitelist Chips) nằm ngay trên ô nhập liệu Kana, và nút hành động dính đáy màn hình (Sticky Bottom CTA) 'Gửi cho AI Sensei chấm'.",
        bold_prefix="2. Màn hình Vòng lặp Mốc (Milestone Quest Screen): "
    )
    add_bullet(
        "Khay trượt Bottom Sheet với nền trắng ngà viền tím nhạt (#F5F3FF), huy hiệu đánh giá điểm số, các gạch đầu dòng phân tích ngữ pháp/trợ từ, và khung câu bản xứ mẫu (Native Expression) có nút 'Nghe phát âm' và 'Sao chép'.",
        bold_prefix="3. Khung Phản hồi AI Sensei (AI Evaluation Bottom Sheet Drawer): "
    )
    add_bullet(
        "Thiết lập các liên kết tương tác (Smart Animate) cho phép người xem bấm vào mốc Unlocked → chuyển sang làm bài → gõ câu → khay AI trượt lên → bấm Tiếp tục để mở khóa mốc mới trên bản đồ.",
        bold_prefix="4. Luồng Tương tác Hoàn chỉnh (Interactive Prototype Flow): "
    )

    # 3.3 Initial Architecture Diagram & Structure
    add_heading2("3.3. Sơ đồ Kiến trúc Hệ thống Tổng thể (Unified Backend - Dual Frontend)")
    add_p(
        "Hệ thống KIZUNA được tổ chức theo mô hình kiến trúc phân tầng chuẩn mực, bảo đảm tính độc lập, khả năng mở rộng linh hoạt "
        "và tách biệt hoàn toàn giữa giao diện người dùng và lõi nghiệp vụ backend:"
    )

    # Architecture Table Representation
    arch_tbl = doc.add_table(rows=5, cols=2)
    arch_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(arch_tbl, color="CBD5E1", sz="4")
    
    arch_layers = [
        ("TẦNG GIAO DIỆN KHÁCH HÀNG\n(Dual Frontend Clients)", 
         "1. User Multi-Platform Client (Web Browser & Android APK qua Capacitor):\n"
         "   - Trải nghiệm Bản đồ Hành trình 1 chạm, vòng lặp học 7 bước tại Mốc.\n"
         "   - Tích hợp Google ML Kit nhận diện chữ viết tay trên Canvas cảm ứng.\n"
         "   - Bộ nhớ đệm Offline IndexedDB/SQLite và đồng bộ ngầm.\n"
         "2. Admin Portal (Web Desktop / Laptop màn hình lớn):\n"
         "   - Biên soạn Chặng, Mốc, Whitelist từ vựng và cấu hình Prompt AI.\n"
         "   - Giám sát tiến độ học tập và kiểm duyệt dữ liệu câu hỏi."),
        
        ("TẦNG CỔNG BẢO MẬT\n(Security Gateway)", 
         "• Spring Security Filter Chain điều phối toàn bộ HTTP requests tại Cổng 3000.\n"
         "• JwtAuthenticationFilter trích xuất Bearer Token, giải mã claims HMAC-SHA256.\n"
         "• Nạp UserPrincipal vào SecurityContextHolder; phân quyền RBAC:\n"
         "   - /api/v1/admin/**: Yêu cầu quyền ROLE_ADMIN (chặn 403 Forbidden nếu không đủ quyền).\n"
         "   - /api/v1/user/**: Yêu cầu quyền ROLE_USER (chặn 401 Unauthorized nếu thiếu token).\n"
         "   - /api/v1/auth/** & /api/v1/health/**: Public endpoints."),
        
        ("TẦNG DỊCH VỤ NGHIỆP VỤ\n(Spring Boot 3.4 Services)", 
         "• UserService: Xác thực tài khoản, cấp phát Token, quản lý Profile & Streak.\n"
         "• JourneyService: Điều phối cấu trúc Bản đồ, tính toán tỷ lệ hoàn thành chặng.\n"
         "• MilestoneLoopService: Quản lý vòng lặp 7 bước, chấm điểm thử thách mốc.\n"
         "• SpacedRepetitionService: Thuật toán SuperMemo SM-2 sinh 'Revisit Quests'.\n"
         "• AiGatewayService: Quản lý Prompt templates, gọi Gemini API và thực thi Guardrails."),
        
        ("TẦNG DỮ LIỆU & AI ENGINE\n(Cloud Database & AI Models)", 
         "• Google Cloud Firestore (NoSQL): Cấu trúc phân cấp collections: journeys, stages, milestones, user_journey_progress.\n"
         "• Firebase Authentication: Lưu trữ định danh người dùng và Custom Claims.\n"
         "• Google ML Kit (On-Device): Nhận diện chữ viết tay Kanji/Kana ngoại tuyến.\n"
         "• Google Gemini LLM (Cloud): Phân tích ngữ pháp, sắc thái và sinh biến thể bài tập.")
    ]

    for idx, (l_title, l_desc) in enumerate(arch_layers):
        row = arch_tbl.rows[idx]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = Inches(2.2), Inches(4.07)
        set_cell_background(c0, "0F172A" if idx==0 else "F1F5F9")
        set_cell_background(c1, "FFFFFF" if idx%2==0 else "F8FAFC")
        set_cell_margins(c0, top=80, bottom=80, left=90, right=90)
        set_cell_margins(c1, top=80, bottom=80, left=90, right=90)
        
        pr0 = c0.paragraphs[0].add_run(l_title)
        pr0.font.bold = True
        pr0.font.size = Pt(9)
        pr0.font.color.rgb = RGBColor(255, 255, 255) if idx==0 else RGBColor(15, 23, 42)
        
        pr1 = c1.paragraphs[0].add_run(l_desc)
        pr1.font.size = Pt(8.8)
        pr1.font.name = "Arial"
        pr1.font.color.rgb = RGBColor(31, 41, 55)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 3.4 Design System Tokens
    add_heading2("3.4. Đặc tả Design Tokens & Quy chuẩn Giao diện (UI Design System)")
    add_p(
        "KIZUNA sử dụng bảng mã định danh thiết kế (Design Tokens) đồng bộ giữa bản vẽ Figma và mã nguồn Frontend CSS/Tailwind, "
        "kết hợp hài hòa giữa bản sắc văn hóa Nhật Bản (Đỏ Torii, Trắng Washi) và công nghệ số hiện đại:"
    )

    # Tokens Table
    tok_tbl = doc.add_table(rows=9, cols=4)
    tok_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tok_tbl, color="CBD5E1", sz="4")
    
    tok_hdrs = ["Token Name", "Mã Hex", "Ý nghĩa & Ứng dụng trong Giao diện", "Tương phản WCAG"]
    for i, h in enumerate(tok_hdrs):
        c = tok_tbl.rows[0].cells[i]
        set_cell_background(c, "DC2626") # Red
        set_cell_margins(c, top=70, bottom=70, left=70, right=70)
        p = c.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(255, 255, 255)
    
    tok_widths = [Inches(1.6), Inches(0.9), Inches(2.67), Inches(1.1)]
    for r in tok_tbl.rows:
        for i, w in enumerate(tok_widths):
            r.cells[i].width = w

    tok_rows = [
        ("--color-primary-600", "#DC2626", "Màu thương hiệu chính: Cổng Torii, Mốc đang chọn UNLOCKED, nút CTA chính", "5.9:1 (Đạt AA/AAA)"),
        ("--color-primary-700", "#B91C1C", "Trạng thái nút bấm khi Hover/Active/Pressed", "7.4:1 (Đạt AAA)"),
        ("--color-journey-indigo", "#4338CA", "Đường liên kết hành trình, tiêu đề chặng học", "8.6:1 (Đạt AAA)"),
        ("--color-ai-accent", "#8B5CF6", "Huy hiệu Trợ lý AI Sensei, vầng sáng gợi ý thông minh", "4.6:1 (Đạt AA)"),
        ("--color-ai-surface", "#F5F3FF", "Nền khay trượt phản hồi của AI Sensei (Violet Tint)", "Nền phụ dịu mắt"),
        ("--color-success-green", "#059669", "Mốc đã hoàn thành COMPLETED, câu trả lời chính xác", "4.8:1 (Đạt AA)"),
        ("--color-warning-amber", "#D97706", "Trạm ôn tập ngắt quãng REVISIT, lỗi sai cần củng cố", "4.5:1 (Đạt AA)"),
        ("--color-text-primary", "#0F172A", "Tiêu đề, bối cảnh câu hỏi, câu tiếng Nhật người học viết", "15.8:1 (Siêu chuẩn)")
    ]

    for r_idx, r_val in enumerate(tok_rows, start=1):
        row = tok_tbl.rows[r_idx]
        for c_idx, val in enumerate(r_val):
            cell = row.cells[c_idx]
            set_cell_background(cell, "FFFFFF" if r_idx % 2 != 0 else "F8FAFC")
            set_cell_margins(cell, top=60, bottom=60, left=70, right=70)
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(8.2)
            r.font.name = "Arial"
            if c_idx == 0:
                r.font.bold = True
                r.font.color.rgb = RGBColor(15, 23, 42)
            elif c_idx == 1:
                r.font.bold = True
                r.font.color.rgb = RGBColor(220, 38, 38) if "#" in val else RGBColor(15, 23, 42)
            elif c_idx == 3:
                r.font.bold = True
                r.font.color.rgb = RGBColor(5, 150, 105)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # =========================================================================
    # SECTION 4: TEAM RESPONSIBILITY MATRIX & PROJECT ROADMAP
    # =========================================================================
    add_heading1("4. TEAM RESPONSIBILITY MATRIX & PROJECT ROADMAP")
    
    add_heading2("4.1. Phân công Trách nhiệm Thành viên Nhóm")
    add_p(
        "Dự án được thực hiện bởi nhóm gồm 3 thành viên với sự phân chia vai trò và trách nhiệm cụ thể "
        "nhằm đảm bảo tiến độ và chất lượng kỹ thuật cao nhất:"
    )

    # Team Matrix Table
    team_tbl = doc.add_table(rows=4, cols=4)
    team_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(team_tbl, color="CBD5E1", sz="4")
    
    tm_hdrs = ["Thành viên", "MSSV", "Vai trò chính", "Hạng mục phụ trách chi tiết"]
    for i, h in enumerate(tm_hdrs):
        c = team_tbl.rows[0].cells[i]
        set_cell_background(c, "0F172A")
        set_cell_margins(c, top=80, bottom=80, left=80, right=80)
        p = c.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(255, 255, 255)
    
    tm_widths = [Inches(1.5), Inches(0.9), Inches(1.5), Inches(2.37)]
    for r in team_tbl.rows:
        for i, w in enumerate(tm_widths):
            r.cells[i].width = w

    tm_rows = [
        ("Trần Thanh Phong", "23IT211", "Trưởng nhóm / Backend & Security Architect", 
         "• Thiết kế kiến trúc dịch vụ Spring Boot 3.4.2 và cấu hình Gradle.\n"
         "• Xây dựng module bảo mật Stateless JWT Bearer Token (JJWT 0.12.6) và phân quyền RBAC.\n"
         "• Tích hợp Firebase Admin SDK kết nối Google Cloud Firestore.\n"
         "• Xây dựng bộ điều khiển REST APIs: AuthController, HealthController, Admin/User Controllers.\n"
         "• Viết kịch bản kiểm thử bảo mật SecurityIntegrationTest."),
        
        ("Trương Công Thành", "23IT251", "Thành viên / Mobile Frontend & UI/UX Designer", 
         "• Thiết kế toàn bộ Wireframe và Interactive Prototype trên Figma đạt chuẩn WCAG AA.\n"
         "• Xây dựng giao diện Frontend (React 18, TypeScript, Vite) và cấu hình Capacitor đóng gói APK.\n"
         "• Lập trình Component Bản đồ Hành trình (Journey Map) và Vòng lặp Mốc (Milestone Quest).\n"
         "• Tối ưu hóa layout Mobile-First, hệ thống 8pt grid và vùng bấm ngón tay cái (Thumb-zone).\n"
         "• Thiết lập hiệu ứng chuyển cảnh mượt mà và giao diện Bottom Sheet Drawer của AI Sensei."),
        
        ("Đặng Long Nhật", "23IT201", "Thành viên / On-Device ML & Database Sync", 
         "• Nghiên cứu và tích hợp Google ML Kit nhận diện chữ viết tay Kanji/Kana trên thiết bị di động.\n"
         "• Xây dựng thuật toán Lặp lại Ngắt quãng SuperMemo SM-2 cho 'Nhiệm vụ quay lại luyện tập'.\n"
         "• Thiết kế mô hình dữ liệu Firestore (collections journeys, stages, milestones, progress).\n"
         "• Cấu hình bộ nhớ đệm Offline Caching và đồng bộ dữ liệu ngầm khi có mạng lại.\n"
         "• Thực hiện kiểm thử chấp nhận người dùng (User Acceptance Testing - UAT).")
    ]

    for r_idx, r_val in enumerate(tm_rows, start=1):
        row = team_tbl.rows[r_idx]
        for c_idx, val in enumerate(r_val):
            cell = row.cells[c_idx]
            set_cell_background(cell, "FFFFFF" if r_idx % 2 != 0 else "F8FAFC")
            set_cell_margins(cell, top=70, bottom=70, left=70, right=70)
            p = cell.paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            r = p.add_run(val)
            r.font.size = Pt(8.5)
            r.font.name = "Arial"
            if c_idx == 0:
                r.font.bold = True
                r.font.color.rgb = RGBColor(15, 23, 42)
            elif c_idx == 2:
                r.font.bold = True
                r.font.color.rgb = RGBColor(67, 56, 202)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 4.2 Project Roadmap Table
    add_heading2("4.2. Kế hoạch Triển khai Chi tiết theo Học kỳ (Project Roadmap)")
    
    road_tbl = doc.add_table(rows=6, cols=3)
    road_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(road_tbl, color="CBD5E1", sz="4")
    
    rd_hdrs = ["Giai đoạn (Milestones)", "Mục tiêu & Hạng mục Thực hiện Chính", "Kết quả Bàn giao (Deliverables)"]
    for i, h in enumerate(rd_hdrs):
        c = road_tbl.rows[0].cells[i]
        set_cell_background(c, "4338CA")
        set_cell_margins(c, top=80, bottom=80, left=80, right=80)
        p = c.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(255, 255, 255)
    
    rd_widths = [Inches(1.6), Inches(2.8), Inches(1.87)]
    for r in road_tbl.rows:
        for i, w in enumerate(rd_widths):
            r.cells[i].width = w

    rd_rows = [
        ("Tuần 1 - 4\n(Hiện tại - Week 4)", 
         "• Khám phá sản phẩm, lập tài liệu PRD kỹ thuật và phân tích yêu cầu FURPS+.\n"
         "• Thiết kế Wireframe & Interactive Prototype trên Figma đạt chuẩn WCAG AA.\n"
         "• Khởi tạo khung dự án Spring Boot 3.4.2 và React Vite trên Git.\n"
         "• Hoàn thiện báo cáo đề xuất dự án (Project Proposal Report Docx).", 
         "• Tài liệu PRD & SRS hoàn chỉnh.\n• Figma Interactive Prototype URL.\n• Báo cáo Đề xuất Dự án (Tuần 4)."),
        
        ("Tuần 5 - 7\n(Sprint 1: Core Arch)", 
         "• Hiện thực hóa phân hệ bảo mật Spring Security JWT Bearer Token.\n"
         "• Thiết lập kết nối Cloud Firestore và nạp dữ liệu mẫu Chặng 1 & 2.\n"
         "• Xây dựng giao diện Bản đồ Hành trình (Journey Map) tương tác trên React.\n"
         "• Đóng gói thử nghiệm phiên bản Android APK đầu tiên qua Capacitor.", 
         "• Backend API Auth chạy cổng 3000.\n• Màn hình Journey Map tương tác.\n• Bản build Android APK v0.1."),
        
        ("Tuần 8 - 10\n(Sprint 2: AI & Loop)", 
         "• Tích hợp Vòng lặp 7 bước tại Mốc (Milestone Micro-Loop Engine).\n"
         "• Kết nối Google Gemini LLM API và cài đặt bộ lọc Whitelist Guardrails.\n"
         "• Nhúng Google ML Kit nhận diện nét chữ viết tay Kanji/Kana trên thiết bị.\n"
         "• Xây dựng giao diện Khay phản hồi AI Sensei Bottom Sheet Drawer.", 
         "• Vòng lặp Mốc hoàn chỉnh có AI chấm.\n• Nhận diện chữ viết tay On-Device.\n• Bộ lọc Whitelist hoạt động 100%."),
        
        ("Tuần 11 - 13\n(Sprint 3: Offline & SRS)", 
         "• Cài đặt thuật toán lặp lại ngắt quãng SuperMemo SM-2 cho các câu lỗi sai.\n"
         "• Hiển thị 'Trạm Ôn tập Lỗi cũ' (Revisit Quest) phân nhánh trên bản đồ.\n"
         "• Hiện thực hóa cơ chế Offline Persistence và Background Sync hàng đợi.\n"
         "• Hoàn thiện phân hệ Admin Portal quản lý Whitelist từ vựng và xem thống kê.", 
         "• Tính năng học Offline tự sync.\n• Nhiệm vụ quay lại luyện tập SM-2.\n• Phân hệ Admin Web hoàn chỉnh."),
        
        ("Tuần 14 - 15\n(Testing & Defense)", 
         "• Kiểm thử tải, bảo mật, độ trễ AI và khả năng tiếp cận WCAG 2.1 AA.\n"
         "• Tinh chỉnh giao diện dựa trên kết quả AI Design Review và phản hồi người dùng.\n"
         "• Đóng gói bản cài đặt APK hoàn thiện, triển khai Web lên Firebase Hosting.\n"
         "• Chuẩn bị slide thuyết trình và bảo vệ đồ án kết thúc học phần.", 
         "• Bản phát hành APK Production.\n• Live Web trên Firebase Hosting.\n• Slide thuyết trình & Video Demo.")
    ]

    for r_idx, r_val in enumerate(rd_rows, start=1):
        row = road_tbl.rows[r_idx]
        for c_idx, val in enumerate(r_val):
            cell = row.cells[c_idx]
            set_cell_background(cell, "FFFFFF" if r_idx % 2 != 0 else "F8FAFC")
            set_cell_margins(cell, top=70, bottom=70, left=70, right=70)
            p = cell.paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            r = p.add_run(val)
            r.font.size = Pt(8.5)
            r.font.name = "Arial"
            if c_idx == 0:
                r.font.bold = True
                r.font.color.rgb = RGBColor(15, 23, 42)
            elif c_idx == 2:
                r.font.bold = True
                r.font.color.rgb = RGBColor(5, 150, 105)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Conclusion & Sign-off
    add_heading2("5. KẾT LUẬN & CAM KẾT CHẤT LƯỢNG (CONCLUSION & COMMITMENT)")
    add_p(
        "Bản đề xuất dự án KIZUNA (絆) đã xác lập một nền tảng vững chắc cả về lý luận sư phạm ngôn ngữ, "
        "trải nghiệm người dùng tương tác Game hóa và kiến trúc công nghệ đa nền tảng hiện đại. "
        "Với việc làm chủ hoàn toàn mã nguồn (từ Spring Boot 3.4 Backend, Cloud Firestore đến React/Capacitor Mobile Frontend) "
        "và tích hợp Trí tuệ Nhân tạo có trách nhiệm (Google ML Kit on-device + Gemini AI có Whitelist Guardrail), "
        "nhóm tác giả cam kết sẽ hoàn thành dự án đúng hạn theo đúng các tiêu chí xuất sắc của học phần."
    )

    # Save document
    output_filename = "KIZUNA_Project_Proposal_and_Interactive_Wireframe_Prototype.docx"
    doc.save(output_filename)
    print(f"Document saved successfully as '{output_filename}'!")

if __name__ == "__main__":
    create_kizuna_proposal()
