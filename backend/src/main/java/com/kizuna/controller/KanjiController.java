package com.kizuna.controller;

import com.kizuna.common.ApiResponse;
import com.kizuna.dto.request.KanjiCreateRequest;
import com.kizuna.dto.response.KanjiResponse;
import com.kizuna.service.KanjiService;
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

@Tag(name = "Kanji", description = "Endpoints for searching, learning and managing Japanese Kanji")
@RestController
@RequestMapping("/api/v1/kanji")
@RequiredArgsConstructor
public class KanjiController {

    private final KanjiService kanjiService;

    @Operation(summary = "Get Kanji list with optional JLPT level filter (e.g. N5, N4)")
    @GetMapping
    public ResponseEntity<ApiResponse<List<KanjiResponse>>> getKanjiList(
            @RequestParam(required = false) String jlptLevel,
            @RequestParam(defaultValue = "50") int limit) {
        List<KanjiResponse> kanjis = kanjiService.getKanjiByJlpt(jlptLevel, limit);
        return ResponseEntity.ok(ApiResponse.success(kanjis));
    }

    @Operation(summary = "Get details of a specific Kanji by character or ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<KanjiResponse>> getKanjiById(@PathVariable String id) {
        KanjiResponse kanji = kanjiService.getKanjiById(id);
        return ResponseEntity.ok(ApiResponse.success(kanji));
    }

    @Operation(summary = "Create a new Kanji entry (Requires Authentication)")
    @SecurityRequirement(name = "FirebaseBearerAuth")
    @PostMapping
    public ResponseEntity<ApiResponse<KanjiResponse>> createKanji(
            @Valid @RequestBody KanjiCreateRequest request) {
        KanjiResponse created = kanjiService.createKanji(request);
        return new ResponseEntity<>(ApiResponse.success("Kanji created successfully", created), HttpStatus.CREATED);
    }

    @Operation(summary = "Delete a Kanji by ID (Requires Authentication)")
    @SecurityRequirement(name = "FirebaseBearerAuth")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteKanji(@PathVariable String id) {
        kanjiService.deleteKanji(id);
        return ResponseEntity.ok(ApiResponse.success("Kanji deleted successfully", null));
    }
}
