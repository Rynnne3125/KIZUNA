package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.request.GameplayConfigRequest;
import com.kizuna.dto.request.MilestoneStatusRequest;
import com.kizuna.model.*;
import com.kizuna.service.CurriculumService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminCurriculumController {

    private final CurriculumService curriculumService;

    public AdminCurriculumController(CurriculumService curriculumService) {
        this.curriculumService = curriculumService;
    }

    // --- STAGES CRUD ---
    @GetMapping("/stages")
    public ResponseEntity<ApiResponse<List<Stage>>> getAllStages() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách chặng thành công (Admin)", curriculumService.getAllStages()));
    }

    @PostMapping("/stages")
    public ResponseEntity<ApiResponse<Stage>> createStage(@RequestBody Stage stage) {
        Stage created = curriculumService.createStage(stage);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo chặng mới thành công", created));
    }

    @PutMapping("/stages/{id}")
    public ResponseEntity<ApiResponse<Stage>> updateStage(@PathVariable String id, @RequestBody Stage stage) {
        Stage updated = curriculumService.updateStage(id, stage);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật chặng thành công", updated));
    }

    @DeleteMapping("/stages/{id}")
    public ResponseEntity<ApiResponse<String>> deleteStage(@PathVariable String id) {
        curriculumService.deleteStage(id);
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
    public ResponseEntity<ApiResponse<Milestone>> createMilestone(@RequestBody Milestone milestone) {
        Milestone created = curriculumService.createMilestone(milestone);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo mốc học mới thành công", created));
    }

    @PutMapping("/milestones/{id}")
    public ResponseEntity<ApiResponse<Milestone>> updateMilestone(@PathVariable String id, @RequestBody Milestone milestone) {
        Milestone updated = curriculumService.updateMilestone(id, milestone);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật mốc học thành công", updated));
    }

    @DeleteMapping("/milestones/{id}")
    public ResponseEntity<ApiResponse<String>> deleteMilestone(@PathVariable String id) {
        curriculumService.deleteMilestone(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa mốc học thành công", id));
    }

    @PatchMapping("/milestones/{id}/status")
    public ResponseEntity<ApiResponse<Milestone>> toggleMilestoneStatus(
            @PathVariable String id,
            @Valid @RequestBody MilestoneStatusRequest request) {
        Milestone updated = curriculumService.updateMilestoneStatus(id, request.getActive());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái hiển thị mốc thành công", updated));
    }

    @PutMapping("/milestones/{id}/gameplay-config")
    public ResponseEntity<ApiResponse<Milestone>> updateGameplayConfig(
            @PathVariable String id,
            @Valid @RequestBody GameplayConfigRequest request) {
        Milestone updated = curriculumService.updateMilestoneGameplayConfig(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cân bằng gameplay cho mốc học thành công", updated));
    }

    // --- QUESTS CRUD ---
    @GetMapping("/quests")
    public ResponseEntity<ApiResponse<List<MilestoneQuest>>> getQuests(@RequestParam String milestoneId) {
        List<MilestoneQuest> quests = curriculumService.getQuestsByMilestone(milestoneId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách bài học thành công (Admin)", quests));
    }

    @PostMapping("/quests")
    public ResponseEntity<ApiResponse<MilestoneQuest>> createQuest(@RequestBody MilestoneQuest quest) {
        MilestoneQuest created = curriculumService.createQuest(quest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo bài học mới thành công", created));
    }

    @PutMapping("/quests/{id}")
    public ResponseEntity<ApiResponse<MilestoneQuest>> updateQuest(@PathVariable String id, @RequestBody MilestoneQuest quest) {
        MilestoneQuest updated = curriculumService.updateQuest(id, quest);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật bài học thành công", updated));
    }

    @DeleteMapping("/quests/{id}")
    public ResponseEntity<ApiResponse<String>> deleteQuest(@PathVariable String id) {
        curriculumService.deleteQuest(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa bài học thành công", id));
    }

    // --- VOCABULARY CRUD ---
    @GetMapping("/vocabulary")
    public ResponseEntity<ApiResponse<List<VocabularyItem>>> getVocabulary(@RequestParam(required = false) String milestoneId) {
        List<VocabularyItem> list = (milestoneId != null && !milestoneId.isBlank())
                ? curriculumService.getVocabularyByMilestone(milestoneId)
                : curriculumService.getAllVocabulary();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh mục từ vựng thành công (Admin)", list));
    }

    @PostMapping("/vocabulary")
    public ResponseEntity<ApiResponse<VocabularyItem>> createVocabulary(@RequestBody VocabularyItem item) {
        VocabularyItem created = curriculumService.createVocabulary(item);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo từ vựng mới thành công", created));
    }

    @PutMapping("/vocabulary/{id}")
    public ResponseEntity<ApiResponse<VocabularyItem>> updateVocabulary(@PathVariable String id, @RequestBody VocabularyItem item) {
        VocabularyItem updated = curriculumService.updateVocabulary(id, item);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật từ vựng thành công", updated));
    }

    @DeleteMapping("/vocabulary/{id}")
    public ResponseEntity<ApiResponse<String>> deleteVocabulary(@PathVariable String id) {
        curriculumService.deleteVocabulary(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa từ vựng thành công", id));
    }

    // --- KANJI CRUD ---
    @GetMapping("/kanji")
    public ResponseEntity<ApiResponse<List<KanjiItem>>> getKanji(@RequestParam(required = false) String milestoneId) {
        List<KanjiItem> list = (milestoneId != null && !milestoneId.isBlank())
                ? curriculumService.getKanjiByMilestone(milestoneId)
                : curriculumService.getAllKanji();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh mục chữ Hán thành công (Admin)", list));
    }

    @PostMapping("/kanji")
    public ResponseEntity<ApiResponse<KanjiItem>> createKanji(@RequestBody KanjiItem item) {
        KanjiItem created = curriculumService.createKanji(item);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo chữ Hán mới thành công", created));
    }

    @PutMapping("/kanji/{id}")
    public ResponseEntity<ApiResponse<KanjiItem>> updateKanji(@PathVariable String id, @RequestBody KanjiItem item) {
        KanjiItem updated = curriculumService.updateKanji(id, item);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật chữ Hán thành công", updated));
    }

    @DeleteMapping("/kanji/{id}")
    public ResponseEntity<ApiResponse<String>> deleteKanji(@PathVariable String id) {
        curriculumService.deleteKanji(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa chữ Hán thành công", id));
    }

    // --- WHITELIST MANAGEMENT ---
    @GetMapping("/milestones/{id}/whitelist")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMilestoneWhitelist(@PathVariable String id) {
        Map<String, Object> whitelist = curriculumService.getWhitelistByMilestone(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy whitelist tri thức mốc thành công", whitelist));
    }

    @PostMapping("/milestones/{id}/whitelist/item")
    public ResponseEntity<ApiResponse<VocabularyItem>> addWhitelistItem(@PathVariable String id, @RequestBody VocabularyItem item) {
        VocabularyItem created = curriculumService.addWhitelistItem(id, item);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm từ vựng vào whitelist mốc thành công", created));
    }
}
