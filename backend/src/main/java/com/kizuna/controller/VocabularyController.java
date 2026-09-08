package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.request.VocabularyCreateRequest;
import com.kizuna.dto.response.VocabularyResponse;
import com.kizuna.service.VocabularyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Vocabulary", description = "Endpoints for searching, learning and managing Japanese Vocabulary")
@RestController
@RequestMapping("/api/v1/vocabularies")
@RequiredArgsConstructor
public class VocabularyController {

    private final VocabularyService vocabularyService;

    @Operation(summary = "Get vocabulary list with optional JLPT level filter (e.g. N5, N4)")
    @GetMapping
    public ResponseEntity<ApiResponse<List<VocabularyResponse>>> getVocabularies(
            @RequestParam(required = false) String jlptLevel,
            @RequestParam(defaultValue = "50") int limit) {
        List<VocabularyResponse> vocabs = vocabularyService.getVocabulariesByJlpt(jlptLevel, limit);
        return ResponseEntity.ok(ApiResponse.success(vocabs));
    }

    @Operation(summary = "Get vocabularies belonging to a specific lesson")
    @GetMapping("/lesson/{lessonId}")
    public ResponseEntity<ApiResponse<List<VocabularyResponse>>> getVocabulariesByLesson(
            @PathVariable String lessonId) {
        List<VocabularyResponse> vocabs = vocabularyService.getVocabulariesByLesson(lessonId);
        return ResponseEntity.ok(ApiResponse.success(vocabs));
    }

    @Operation(summary = "Get details of a specific vocabulary word")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<VocabularyResponse>> getVocabularyById(@PathVariable String id) {
        VocabularyResponse vocab = vocabularyService.getVocabularyById(id);
        return ResponseEntity.ok(ApiResponse.success(vocab));
    }

    @Operation(summary = "Create a new vocabulary entry (Requires Authentication)")
    @SecurityRequirement(name = "FirebaseBearerAuth")
    @PostMapping
    public ResponseEntity<ApiResponse<VocabularyResponse>> createVocabulary(
            @Valid @RequestBody VocabularyCreateRequest request) {
        VocabularyResponse created = vocabularyService.createVocabulary(request);
        return new ResponseEntity<>(ApiResponse.success("Vocabulary created successfully", created), HttpStatus.CREATED);
    }

    @Operation(summary = "Delete a vocabulary word by ID (Requires Authentication)")
    @SecurityRequirement(name = "FirebaseBearerAuth")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteVocabulary(@PathVariable String id) {
        vocabularyService.deleteVocabulary(id);
        return ResponseEntity.ok(ApiResponse.success("Vocabulary deleted successfully", null));
    }
}
