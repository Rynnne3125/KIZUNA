package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.request.GameplayConfigRequest;
import com.kizuna.dto.request.MilestoneStatusRequest;
import com.kizuna.model.*;
import com.kizuna.repository.AdminActivityLogRepository;
import com.kizuna.security.UserPrincipal;
import com.kizuna.service.CurriculumService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminCurriculumController {

    private final CurriculumService curriculumService;
    private final AdminActivityLogRepository activityLogRepository;

    public AdminCurriculumController(CurriculumService curriculumService,
                                     AdminActivityLogRepository activityLogRepository) {
        this.curriculumService = curriculumService;
        this.activityLogRepository = activityLogRepository;
    }

    private String actor(UserPrincipal principal) {
        return principal != null ? principal.getUsername() : "admin";
    }

    // --- STAGES CRUD ---
    @GetMapping("/stages")
    public ResponseEntity<ApiResponse<List<Stage>>> getAllStages() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách chặng thành công (Admin)", curriculumService.getAllStages()));
    }

    @PostMapping("/stages")
    public ResponseEntity<ApiResponse<Stage>> createStage(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Stage stage) {
        Stage created = curriculumService.createStage(stage);
        activityLogRepository.record(actor(principal), "STAGE_CREATE", "STAGE", created.getId(), "Tạo chặng mới: " + created.getTitle());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo chặng mới thành công", created));
    }

    @PutMapping("/stages/{id}")
    public ResponseEntity<ApiResponse<Stage>> updateStage(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody Stage stage) {
        Stage updated = curriculumService.updateStage(id, stage);
        activityLogRepository.record(actor(principal), "STAGE_UPDATE", "STAGE", id, "Cập nhật chặng: " + updated.getTitle());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật chặng thành công", updated));
    }

    @DeleteMapping("/stages/{id}")
    public ResponseEntity<ApiResponse<String>> deleteStage(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id) {
        curriculumService.deleteStage(id);
        activityLogRepository.record(actor(principal), "STAGE_DELETE", "STAGE", id, "Xóa chặng học");
        return ResponseEntity.ok(ApiResponse.success("Xóa chặng thành công", id));
    }

    // --- MILESTONES CRUD & CONFIG ---
    @GetMapping("/milestones")
    public ResponseEntity<ApiResponse<List<Milestone>>> getAllMilestones(@RequestParam(required = false) String stageId) {
        List<Milestone> milestones = (stageId != null && !stageId.isBlank())
                ? curriculumService.getMilestonesByStage(stageId)
                : curriculumService.getAllMilestones();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mốc học thành công (Admin)", milestones));
    }

    @PostMapping("/milestones")
    public ResponseEntity<ApiResponse<Milestone>> createMilestone(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Milestone milestone) {
        Milestone created = curriculumService.createMilestone(milestone);
        activityLogRepository.record(actor(principal), "MILESTONE_CREATE", "MILESTONE", created.getId(), "Tạo mốc mới: " + created.getTitle());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo mốc học mới thành công", created));
    }

    @PutMapping("/milestones/{id}")
    public ResponseEntity<ApiResponse<Milestone>> updateMilestone(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody Milestone milestone) {
        Milestone updated = curriculumService.updateMilestone(id, milestone);
        activityLogRepository.record(actor(principal), "MILESTONE_UPDATE", "MILESTONE", id, "Cập nhật mốc: " + updated.getTitle());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật mốc học thành công", updated));
    }

    @DeleteMapping("/milestones/{id}")
    public ResponseEntity<ApiResponse<String>> deleteMilestone(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id) {
        curriculumService.deleteMilestone(id);
        activityLogRepository.record(actor(principal), "MILESTONE_DELETE", "MILESTONE", id, "Xóa cột mốc");
        return ResponseEntity.ok(ApiResponse.success("Xóa mốc học thành công", id));
    }

    @PatchMapping("/milestones/{id}/status")
    public ResponseEntity<ApiResponse<Milestone>> toggleMilestoneStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @Valid @RequestBody MilestoneStatusRequest request) {
        Milestone updated = curriculumService.updateMilestoneStatus(id, request.getActive());
        activityLogRepository.record(actor(principal), "MILESTONE_TOGGLE", "MILESTONE", id,
                "Đổi trạng thái hiển thị -> " + (Boolean.TRUE.equals(request.getActive()) ? "ACTIVE" : "HIDDEN"));
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái hiển thị mốc thành công", updated));
    }

    @PutMapping("/milestones/{id}/gameplay-config")
    public ResponseEntity<ApiResponse<Milestone>> updateGameplayConfig(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @Valid @RequestBody GameplayConfigRequest request) {
        Milestone updated = curriculumService.updateMilestoneGameplayConfig(id, request);
        activityLogRepository.record(actor(principal), "MILESTONE_GAMEPLAY", "MILESTONE", id,
                String.format("Cân bằng gameplay: XP=%d, AP=%d", updated.getXpReward(), updated.getActivePointsReward()));
        return ResponseEntity.ok(ApiResponse.success("Cân bằng gameplay cho mốc học thành công", updated));
    }

    // --- QUESTS CRUD ---
    @GetMapping("/quests")
    public ResponseEntity<ApiResponse<List<MilestoneQuest>>> getQuests(@RequestParam String milestoneId) {
        List<MilestoneQuest> quests = curriculumService.getQuestsByMilestone(milestoneId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách bài học thành công (Admin)", quests));
    }

    @PostMapping("/quests")
    public ResponseEntity<ApiResponse<MilestoneQuest>> createQuest(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody MilestoneQuest quest) {
        MilestoneQuest created = curriculumService.createQuest(quest);
        activityLogRepository.record(actor(principal), "QUEST_CREATE", "QUEST", created.getId(), "Tạo quest: " + created.getTitle());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo bài học mới thành công", created));
    }

    @PutMapping("/quests/{id}")
    public ResponseEntity<ApiResponse<MilestoneQuest>> updateQuest(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody MilestoneQuest quest) {
        MilestoneQuest updated = curriculumService.updateQuest(id, quest);
        activityLogRepository.record(actor(principal), "QUEST_UPDATE", "QUEST", id, "Cập nhật quest: " + updated.getTitle());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật bài học thành công", updated));
    }

    @DeleteMapping("/quests/{id}")
    public ResponseEntity<ApiResponse<String>> deleteQuest(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id) {
        curriculumService.deleteQuest(id);
        activityLogRepository.record(actor(principal), "QUEST_DELETE", "QUEST", id, "Xóa quest");
        return ResponseEntity.ok(ApiResponse.success("Xóa bài học thành công", id));
    }

    // --- VOCABULARY CRUD & BULK ---
    @GetMapping("/vocabulary")
    public ResponseEntity<ApiResponse<List<VocabularyItem>>> getVocabulary(@RequestParam(required = false) String milestoneId) {
        List<VocabularyItem> list = (milestoneId != null && !milestoneId.isBlank())
                ? curriculumService.getVocabularyByMilestone(milestoneId)
                : curriculumService.getAllVocabulary();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh mục từ vựng thành công (Admin)", list));
    }

    @PostMapping("/vocabulary")
    public ResponseEntity<ApiResponse<VocabularyItem>> createVocabulary(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody VocabularyItem item) {
        VocabularyItem created = curriculumService.createVocabulary(item);
        activityLogRepository.record(actor(principal), "VOCAB_CREATE", "VOCABULARY", created.getId(), "Thêm từ vựng: " + created.getTerm());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo từ vựng mới thành công", created));
    }

    @PostMapping("/vocabulary/bulk")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkImportVocabulary(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody List<VocabularyItem> items) {
        List<VocabularyItem> saved = curriculumService.bulkImportVocabulary(items);
        activityLogRepository.record(actor(principal), "VOCAB_BULK_IMPORT", "VOCABULARY", "bulk",
                "Nhập hàng loạt " + saved.size() + " từ vựng từ CSV");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Nhập hàng loạt từ vựng thành công", Map.of(
                        "importedCount", saved.size(),
                        "items", saved
                )));
    }

    @PutMapping("/vocabulary/{id}")
    public ResponseEntity<ApiResponse<VocabularyItem>> updateVocabulary(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody VocabularyItem item) {
        VocabularyItem updated = curriculumService.updateVocabulary(id, item);
        activityLogRepository.record(actor(principal), "VOCAB_UPDATE", "VOCABULARY", id, "Cập nhật từ vựng: " + updated.getTerm());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật từ vựng thành công", updated));
    }

    @DeleteMapping("/vocabulary/{id}")
    public ResponseEntity<ApiResponse<String>> deleteVocabulary(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id) {
        curriculumService.deleteVocabulary(id);
        activityLogRepository.record(actor(principal), "VOCAB_DELETE", "VOCABULARY", id, "Xóa từ vựng");
        return ResponseEntity.ok(ApiResponse.success("Xóa từ vựng thành công", id));
    }

    // --- KANJI CRUD & BULK ---
    @GetMapping("/kanji")
    public ResponseEntity<ApiResponse<List<KanjiItem>>> getKanji(@RequestParam(required = false) String milestoneId) {
        List<KanjiItem> list = (milestoneId != null && !milestoneId.isBlank())
                ? curriculumService.getKanjiByMilestone(milestoneId)
                : curriculumService.getAllKanji();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh mục chữ Hán thành công (Admin)", list));
    }

    @PostMapping("/kanji")
    public ResponseEntity<ApiResponse<KanjiItem>> createKanji(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody KanjiItem item) {
        KanjiItem created = curriculumService.createKanji(item);
        activityLogRepository.record(actor(principal), "KANJI_CREATE", "KANJI", created.getId(), "Thêm Kanji: " + created.getKanji());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo chữ Hán mới thành công", created));
    }

    @PostMapping("/kanji/bulk")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkImportKanji(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody List<KanjiItem> items) {
        List<KanjiItem> saved = curriculumService.bulkImportKanji(items);
        activityLogRepository.record(actor(principal), "KANJI_BULK_IMPORT", "KANJI", "bulk",
                "Nhập hàng loạt " + saved.size() + " chữ Hán từ CSV");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Nhập hàng loạt chữ Hán thành công", Map.of(
                        "importedCount", saved.size(),
                        "items", saved
                )));
    }

    @PutMapping("/kanji/{id}")
    public ResponseEntity<ApiResponse<KanjiItem>> updateKanji(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody KanjiItem item) {
        KanjiItem updated = curriculumService.updateKanji(id, item);
        activityLogRepository.record(actor(principal), "KANJI_UPDATE", "KANJI", id, "Cập nhật Kanji: " + updated.getKanji());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật chữ Hán thành công", updated));
    }

    @DeleteMapping("/kanji/{id}")
    public ResponseEntity<ApiResponse<String>> deleteKanji(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id) {
        curriculumService.deleteKanji(id);
        activityLogRepository.record(actor(principal), "KANJI_DELETE", "KANJI", id, "Xóa Kanji");
        return ResponseEntity.ok(ApiResponse.success("Xóa chữ Hán thành công", id));
    }

    // --- GRAMMAR CRUD ---
    @GetMapping("/grammar")
    public ResponseEntity<ApiResponse<List<GrammarItem>>> getGrammar(@RequestParam(required = false) String milestoneId) {
        List<GrammarItem> list = (milestoneId != null && !milestoneId.isBlank())
                ? curriculumService.getGrammarByMilestone(milestoneId)
                : curriculumService.getAllGrammar();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh mục ngữ pháp thành công (Admin)", list));
    }

    @PostMapping("/grammar")
    public ResponseEntity<ApiResponse<GrammarItem>> createGrammar(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody GrammarItem item) {
        GrammarItem created = curriculumService.createGrammar(item);
        activityLogRepository.record(actor(principal), "GRAMMAR_CREATE", "GRAMMAR", created.getId(), "Thêm ngữ pháp: " + created.getPattern());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo mẫu ngữ pháp thành công", created));
    }

    @PutMapping("/grammar/{id}")
    public ResponseEntity<ApiResponse<GrammarItem>> updateGrammar(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody GrammarItem item) {
        GrammarItem updated = curriculumService.updateGrammar(id, item);
        activityLogRepository.record(actor(principal), "GRAMMAR_UPDATE", "GRAMMAR", id, "Cập nhật ngữ pháp: " + updated.getPattern());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật mẫu ngữ pháp thành công", updated));
    }

    @DeleteMapping("/grammar/{id}")
    public ResponseEntity<ApiResponse<String>> deleteGrammar(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id) {
        curriculumService.deleteGrammar(id);
        activityLogRepository.record(actor(principal), "GRAMMAR_DELETE", "GRAMMAR", id, "Xóa mẫu ngữ pháp");
        return ResponseEntity.ok(ApiResponse.success("Xóa mẫu ngữ pháp thành công", id));
    }

    // --- EXAMS CRUD ---
    @GetMapping("/exams")
    public ResponseEntity<ApiResponse<List<JlptExam>>> getExams() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đề thi thành công (Admin)", curriculumService.getAllExams()));
    }

    @PostMapping("/exams")
    public ResponseEntity<ApiResponse<JlptExam>> createExam(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody JlptExam exam) {
        JlptExam created = curriculumService.createExam(exam);
        activityLogRepository.record(actor(principal), "EXAM_CREATE", "EXAM", created.getId(), "Tạo đề thi: " + created.getLabel());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo đề thi thành công", created));
    }

    @PutMapping("/exams/{id}")
    public ResponseEntity<ApiResponse<JlptExam>> updateExam(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody JlptExam exam) {
        JlptExam updated = curriculumService.updateExam(id, exam);
        activityLogRepository.record(actor(principal), "EXAM_UPDATE", "EXAM", id, "Cập nhật đề thi: " + updated.getLabel());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật đề thi thành công", updated));
    }

    @DeleteMapping("/exams/{id}")
    public ResponseEntity<ApiResponse<String>> deleteExam(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id) {
        curriculumService.deleteExam(id);
        activityLogRepository.record(actor(principal), "EXAM_DELETE", "EXAM", id, "Xóa đề thi");
        return ResponseEntity.ok(ApiResponse.success("Xóa đề thi thành công", id));
    }

    // --- WHITELIST MANAGEMENT ---
    @GetMapping("/milestones/{id}/whitelist")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMilestoneWhitelist(@PathVariable String id) {
        Map<String, Object> whitelist = curriculumService.getWhitelistByMilestone(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy whitelist tri thức mốc thành công", whitelist));
    }

    @PostMapping("/milestones/{id}/whitelist/item")
    public ResponseEntity<ApiResponse<VocabularyItem>> addWhitelistItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody VocabularyItem item) {
        VocabularyItem created = curriculumService.addWhitelistItem(id, item);
        activityLogRepository.record(actor(principal), "WHITELIST_ADD", "MILESTONE", id, "Thêm từ vào Whitelist: " + created.getTerm());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm từ vựng vào whitelist mốc thành công", created));
    }

    // --- BACKUP & SEED RESTORE (Group 4: Content Ops) ---
    @GetMapping("/curriculum/backup")
    public ResponseEntity<ApiResponse<Map<String, Object>>> exportCurriculumBackup(
            @AuthenticationPrincipal UserPrincipal principal) {
        Map<String, Object> backup = curriculumService.exportBackup();
        activityLogRepository.record(actor(principal), "CURRICULUM_BACKUP", "SYSTEM", "backup", "Xuất bản sao lưu toàn bộ giáo trình JSON");
        return ResponseEntity.ok(ApiResponse.success("Xuất bản sao lưu giáo trình thành công", backup));
    }

    @PostMapping("/curriculum/restore-seed")
    public ResponseEntity<ApiResponse<Map<String, Object>>> restoreCurriculumSeed(
            @AuthenticationPrincipal UserPrincipal principal) {
        Map<String, Object> counts = curriculumService.restoreSeedData();
        activityLogRepository.record(actor(principal), "CURRICULUM_RESTORE_SEED", "SYSTEM", "seed_data",
                "Khôi phục giáo trình từ KIZUNA_NEJ_SEED_DATA.json: " + counts);
        return ResponseEntity.ok(ApiResponse.success("Khôi phục dữ liệu giáo trình chuẩn gốc thành công", counts));
    }
}
