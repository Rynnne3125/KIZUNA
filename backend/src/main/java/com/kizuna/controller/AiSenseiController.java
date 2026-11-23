package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.request.AiAppealCreateRequest;
import com.kizuna.dto.request.AiSenseiEvaluateRequest;
import com.kizuna.model.AiAuditEntry;
import com.kizuna.model.GrammarItem;
import com.kizuna.model.VocabularyItem;
import com.kizuna.repository.AiAuditRepository;
import com.kizuna.repository.CurriculumRepository;
import com.kizuna.security.UserPrincipal;
import com.kizuna.service.AiRuntimeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai")
public class AiSenseiController {

    private final AiRuntimeService aiRuntimeService;
    private final AiAuditRepository aiAuditRepository;
    private final CurriculumRepository curriculumRepository;

    public AiSenseiController(AiRuntimeService aiRuntimeService,
                              AiAuditRepository aiAuditRepository,
                              CurriculumRepository curriculumRepository) {
        this.aiRuntimeService = aiRuntimeService;
        this.aiAuditRepository = aiAuditRepository;
        this.curriculumRepository = curriculumRepository;
    }

    /**
     * Stage 3 (P2): Chấm câu tiếng Nhật viết tự do của học viên tại Quest 4 dựa theo Whitelist từ vựng & ngữ pháp của cột mốc.
     */
    @PostMapping("/sensei/evaluate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> evaluateSentence(
            @Valid @RequestBody AiSenseiEvaluateRequest request) {

        // Tự động bổ sung Whitelist từ kho giáo trình nếu client gửi lên thiếu
        if (request.getMilestoneId() != null && !request.getMilestoneId().isBlank()) {
            if (request.getWhitelistVocabulary() == null || request.getWhitelistVocabulary().isEmpty()) {
                List<String> vocabTerms = curriculumRepository.getVocabularyByMilestoneId(request.getMilestoneId())
                        .stream()
                        .map(VocabularyItem::getTerm)
                        .filter(t -> t != null && !t.isBlank())
                        .limit(40)
                        .toList();
                request.setWhitelistVocabulary(vocabTerms);
            }
            if (request.getWhitelistGrammar() == null || request.getWhitelistGrammar().isEmpty()) {
                List<String> grammarPatterns = curriculumRepository.getGrammarByMilestoneId(request.getMilestoneId())
                        .stream()
                        .map(GrammarItem::getPattern)
                        .filter(p -> p != null && !p.isBlank())
                        .limit(15)
                        .toList();
                request.setWhitelistGrammar(grammarPatterns);
            }
        }

        Map<String, Object> evaluation = aiRuntimeService.evaluateSenseiSentence(request, null);
        return ResponseEntity.ok(ApiResponse.success("AI Sensei đã hoàn tất chấm bài viết", evaluation));
    }

    /**
     * Stage 3 (P2): Học viên gửi khiếu nại AI chấm sai -> Tạo bản ghi PENDING thực tế vào ai_evaluation_audits để Admin phúc khảo.
     */
    @PostMapping("/appeals")
    public ResponseEntity<ApiResponse<AiAuditEntry>> submitAppeal(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AiAppealCreateRequest request) {

        String userId = principal != null ? principal.getId()
                : (request.getUserId() != null && !request.getUserId().isBlank() ? request.getUserId() : "anonymous");
        String username = principal != null ? principal.getUsername()
                : (request.getUsername() != null && !request.getUsername().isBlank() ? request.getUsername() : "hocvien");

        AiAuditEntry entry = new AiAuditEntry(
                null,
                userId,
                username,
                request.getMilestoneId() != null ? request.getMilestoneId() : "unknown_milestone",
                request.getPromptText() != null ? request.getPromptText() : "Thực hành viết câu Quest 4",
                request.getStudentInput().trim(),
                request.getAiFeedback() != null ? request.getAiFeedback() : "",
                request.getAiScore(),
                request.getStudentReason().trim()
        );
        if (request.getMilestoneTitle() != null && !request.getMilestoneTitle().isBlank()) {
            entry.setMilestoneTitle(request.getMilestoneTitle());
        }
        if (request.getQuestTitle() != null && !request.getQuestTitle().isBlank()) {
            entry.setQuestTitle(request.getQuestTitle());
        }

        AiAuditEntry saved = aiAuditRepository.save(entry);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã gửi khiếu nại lên ban quản trị KIZUNA để phúc khảo", saved));
    }
}
