package com.kizuna.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static com.kizuna.controller.PlacementAssessmentController.*;
import static org.junit.jupiter.api.Assertions.*;

class PlacementAssessmentControllerTest {
    private final ObjectMapper json = new ObjectMapper();
    private final Candidate lesson = new Candidate("n5_lesson_2", Level.N5, "Stage 1", "Lesson 2", "Choose demonstratives");

    private static LevelScore score(Level level, int correct, int total) {
        return new LevelScore(level, correct, total, List.of(new SkillScore(Category.grammar, correct, total)));
    }

    @Test
    void acceptsConsecutiveLevelsAndRejectsImpossibleScores() {
        assertEquals(1, validateRequest(new AssessmentRequest(
                List.of(score(Level.N5, 3, 4), score(Level.N4, 1, 4)), List.of(lesson))).size());
        assertThrows(ResponseStatusException.class, () -> validateRequest(new AssessmentRequest(
                List.of(score(Level.N5, 2, 4), score(Level.N4, 4, 4)), List.of(lesson))));
        assertThrows(ResponseStatusException.class, () -> validateRequest(new AssessmentRequest(
                List.of(score(Level.N5, 4, 3)), List.of(lesson))));
        assertThrows(ResponseStatusException.class, () -> validateRequest(new AssessmentRequest(
                List.of(score(Level.N4, 4, 4)), List.of(lesson))));
        var aboveLevel = new Candidate("n4_lesson", Level.N4, "Stage 2", "Lesson 8", "");
        assertThrows(ResponseStatusException.class, () -> validateRequest(new AssessmentRequest(
                List.of(score(Level.N5, 4, 4)), List.of(aboveLevel))));
        assertThrows(ResponseStatusException.class, () -> validateRequest(new AssessmentRequest(
                List.of(new LevelScore(Level.N5, 4, 4, List.of(new SkillScore(Category.grammar, 3, 4)))), List.of(lesson))));
    }

    @Test
    void parsesOnlyAllowedConfidenceValues() throws Exception {
        String body = "{\"candidates\":[{\"content\":{\"parts\":[{\"thought\":true,\"text\":\"ignore\"}," +
                "{\"text\":\"{\\\"confidence\\\":\\\"MODERATE\\\",\\\"milestoneId\\\":\\\"n5_lesson_2\\\"}\"}]}}]}";
        assertEquals(new Recommendation(Confidence.MODERATE, "n5_lesson_2"), parseRecommendation(json, body));
        assertThrows(IllegalArgumentException.class, () -> parseRecommendation(json, body.replace("MODERATE", "UNKNOWN")));
        assertThrows(IllegalArgumentException.class, () -> parseRecommendation(json, "{\"candidates\":[]}"));
    }

    @Test
    void missingKeyAndZeroBudgetFailWithoutMakingNetworkRequests() {
        var request = new AssessmentRequest(List.of(score(Level.N5, 4, 4)), List.of(lesson));
        var disabled = new PlacementAssessmentController(json, "", "gemini-3.5-flash-lite", 10);
        var zeroBudget = new PlacementAssessmentController(json, "unused-test-value", "gemini-3.5-flash-lite", 0);
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> disabled.assess(request)).getStatusCode().value());
        assertEquals(429, assertThrows(ResponseStatusException.class, () -> zeroBudget.assess(request)).getStatusCode().value());
    }
}
